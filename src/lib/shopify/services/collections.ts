// ============================================================
//  Collection services — fetch + transform
// ============================================================
import { shopifyFetch } from '../client';
import {
  COLLECTION_BY_HANDLE_QUERY,
  COLLECTION_COUNT_QUERY,
  COLLECTIONS_QUERY,
} from '../graphql/collections';
import { cursorVars } from '../pagination';
import { mapCollection, mapProductCard, paginate } from '../transforms';
import type { Collection, CollectionWithProducts } from '../types';

// Edge-cache TTLs (s) — catalogue reads are identical for every visitor.
const TTL_LIST = { cacheTtl: 120, cacheSwr: 600 } as const;
const TTL_STATIC = { cacheTtl: 300, cacheSwr: 3600 } as const;

export interface CollectionParams {
  handle: string;
  pageSize?: number;
  after?: string | null;
  before?: string | null;
  sortKey?: string;
  reverse?: boolean;
  filters?: unknown[];
}

/** A collection with one page of its products, or null if not found. */
export async function getCollection(
  params: CollectionParams,
): Promise<CollectionWithProducts | null> {
  const data = await shopifyFetch<{ collection: any | null }>(
    COLLECTION_BY_HANDLE_QUERY,
    {
      handle: params.handle,
      ...cursorVars({ pageSize: params.pageSize ?? 12, after: params.after, before: params.before }),
      sortKey: params.sortKey ?? 'COLLECTION_DEFAULT',
      reverse: params.reverse ?? false,
      filters: params.filters ?? null,
    },
    TTL_LIST,
  );
  if (!data.collection) return null;

  const products = paginate(data.collection.products, mapProductCard);
  return {
    ...mapCollection(data.collection),
    products,
    filters: data.collection.products?.filters ?? [],
  };
}

/** Real product count for a collection (null when the handle doesn't resolve).
 *  `more` is true when the collection has 250+ products (display as "250+"). */
export async function getCollectionCount(
  handle: string,
): Promise<{ count: number; more: boolean } | null> {
  const data = await shopifyFetch<{
    collection: { products: { edges: unknown[]; pageInfo: { hasNextPage: boolean } } } | null;
  }>(COLLECTION_COUNT_QUERY, { handle }, TTL_STATIC);
  if (!data.collection) return null;
  return {
    count: data.collection.products.edges.length,
    more: data.collection.products.pageInfo.hasNextPage,
  };
}

/** Every collection — for the nav and collection index. */
export async function getAllCollections(first = 50): Promise<Collection[]> {
  const data = await shopifyFetch<{ collections: any }>(COLLECTIONS_QUERY, { first }, TTL_STATIC);
  return (data.collections?.edges ?? []).map((e: any) => mapCollection(e.node));
}
