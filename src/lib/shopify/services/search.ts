// ============================================================
//  Search services — full + predictive (2026-04)
// ============================================================
import { shopifyFetch } from '../client';
import { SEARCH_QUERY, SEARCH_ALL_QUERY, PREDICTIVE_SEARCH_QUERY } from '../graphql/search';
import { cursorVars } from '../pagination';
import { mapProductCard, mapArticleCard, paginate } from '../transforms';
import type { ArticleCard, PageInfo, Paginated, ProductCard } from '../types';

export interface SearchParams {
  query: string;
  pageSize?: number;
  after?: string | null;
  before?: string | null;
  sortKey?: string;
  reverse?: boolean;
}

export interface SearchResult extends Paginated<ProductCard> {
  totalCount: number;
}

/** Full product search results page. */
export async function searchProducts(params: SearchParams): Promise<SearchResult> {
  const data = await shopifyFetch<{ search: any }>(SEARCH_QUERY, {
    query: params.query,
    ...cursorVars({ pageSize: params.pageSize ?? 24, after: params.after, before: params.before }),
    sortKey: params.sortKey ?? 'RELEVANCE',
    reverse: params.reverse ?? false,
    types: ['PRODUCT'],
  });
  const page = paginate<any, ProductCard>(data.search, mapProductCard);
  return { ...page, totalCount: data.search?.totalCount ?? page.items.length };
}

// ── Multi-type search (products · journal · pages) ─────────────
export interface SearchPageHit {
  id: string;
  handle: string;
  title: string;
  summary: string;
}

/** One search result, discriminated by `kind`. */
export type SearchHit =
  | { kind: 'product'; item: ProductCard }
  | { kind: 'article'; item: ArticleCard }
  | { kind: 'page'; item: SearchPageHit };

export interface CatalogSearchResult {
  hits: SearchHit[];
  /** Shopify's total across every type (may exceed this page). */
  totalCount: number;
  pageInfo: PageInfo;
  /** Per-page counts for the type filter tabs. */
  counts: { all: number; product: number; article: number; page: number };
}

/** Full search across products, journal articles and CMS pages. Results are
 *  grouped (products → journal → pages) for a tidy, tabbable grid. */
export async function searchCatalog(params: SearchParams): Promise<CatalogSearchResult> {
  const data = await shopifyFetch<{ search: any }>(SEARCH_ALL_QUERY, {
    query: params.query,
    ...cursorVars({ pageSize: params.pageSize ?? 24, after: params.after, before: params.before }),
    sortKey: params.sortKey ?? 'RELEVANCE',
    reverse: params.reverse ?? false,
    types: ['PRODUCT', 'ARTICLE', 'PAGE'],
  });

  const search = data.search ?? {};
  const hits: SearchHit[] = [];
  for (const edge of search.edges ?? []) {
    const n = edge?.node;
    if (!n) continue;
    if (n.__typename === 'Product') hits.push({ kind: 'product', item: mapProductCard(n) });
    else if (n.__typename === 'Article') hits.push({ kind: 'article', item: mapArticleCard(n) });
    else if (n.__typename === 'Page')
      hits.push({
        kind: 'page',
        item: { id: n.id, handle: n.handle, title: n.title, summary: n.bodySummary ?? '' },
      });
  }

  // Stable grouped order so the "All" view reads products → journal → pages.
  const rank = { product: 0, article: 1, page: 2 } as const;
  hits.sort((a, b) => rank[a.kind] - rank[b.kind]);

  const counts = {
    all: hits.length,
    product: hits.filter((h) => h.kind === 'product').length,
    article: hits.filter((h) => h.kind === 'article').length,
    page: hits.filter((h) => h.kind === 'page').length,
  };

  return {
    hits,
    totalCount: search.totalCount ?? hits.length,
    pageInfo: search.pageInfo ?? {
      hasNextPage: false,
      hasPreviousPage: false,
      endCursor: null,
      startCursor: null,
    },
    counts,
  };
}

export interface PredictiveResult {
  queries: { text: string; styledText: string }[];
  products: Array<{
    id: string;
    title: string;
    handle: string;
    featuredImage?: { url: string; altText?: string | null } | null;
    priceRange: { minVariantPrice: { amount: string; currencyCode: string } };
  }>;
  collections: Array<{
    id: string;
    title: string;
    handle: string;
    image?: { url: string; altText?: string | null } | null;
  }>;
}

/** Instant search for the header autocomplete. */
export async function predictiveSearch(query: string): Promise<PredictiveResult> {
  const data = await shopifyFetch<{ predictiveSearch: PredictiveResult }>(
    PREDICTIVE_SEARCH_QUERY,
    { query },
  );
  return {
    queries: data.predictiveSearch?.queries ?? [],
    products: data.predictiveSearch?.products ?? [],
    collections: data.predictiveSearch?.collections ?? [],
  };
}
