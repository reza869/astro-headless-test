// ============================================================
//  Collection services — fetch + transform
// ============================================================
import { shopifyFetch } from '../client';
import { COLLECTION_BY_HANDLE_QUERY, COLLECTIONS_QUERY } from '../graphql/collections';
import { cursorVars } from '../pagination';
import { mapCollection, mapProductCard, paginate } from '../transforms';
import type { Collection, CollectionWithProducts } from '../types';

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
  const data = await shopifyFetch<{ collection: any | null }>(COLLECTION_BY_HANDLE_QUERY, {
    handle: params.handle,
    ...cursorVars({ pageSize: params.pageSize ?? 12, after: params.after, before: params.before }),
    sortKey: params.sortKey ?? 'COLLECTION_DEFAULT',
    reverse: params.reverse ?? false,
    filters: params.filters ?? null,
  });
  if (!data.collection) return null;

  const products = paginate(data.collection.products, mapProductCard);
  return {
    ...mapCollection(data.collection),
    products,
    filters: data.collection.products?.filters ?? [],
  };
}

/** Every collection — for the nav and collection index. */
export async function getAllCollections(first = 50): Promise<Collection[]> {
  const data = await shopifyFetch<{ collections: any }>(COLLECTIONS_QUERY, { first });
  return (data.collections?.edges ?? []).map((e: any) => mapCollection(e.node));
}
