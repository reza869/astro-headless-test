// ============================================================
//  Product services — fetch + transform
// ============================================================
import { shopifyFetch } from '../client';
import {
  PRODUCTS_QUERY,
  SHOP_PRODUCTS_QUERY,
  PRODUCT_BY_HANDLE_QUERY,
  PRODUCT_RECOMMENDATIONS_QUERY,
} from '../graphql/products';
import { cursorVars } from '../pagination';
import { mapProduct, mapProductCard, nodes, paginate } from '../transforms';
import type { Paginated, Product, ProductCard } from '../types';

// Edge-cache TTLs (s). Catalogue reads are cacheable — no @inContext, so every
// visitor sees the same shop-primary-market response.
const TTL_LIST = { cacheTtl: 120, cacheSwr: 600 } as const;
/** Storefront hard limit for a single products connection page. */
const MAX_PAGE = 250;

export interface ProductListParams {
  pageSize?: number;
  after?: string | null;
  before?: string | null;
  sortKey?: string;
  reverse?: boolean;
  query?: string | null;
}

/** Paginated storefront product list. */
export async function getProducts(
  params: ProductListParams = {},
): Promise<Paginated<ProductCard>> {
  const data = await shopifyFetch<{ products: any }>(
    PRODUCTS_QUERY,
    {
      ...cursorVars({ pageSize: params.pageSize ?? 12, after: params.after, before: params.before }),
      sortKey: params.sortKey ?? 'BEST_SELLING',
      reverse: params.reverse ?? false,
      query: params.query ?? null,
    },
    TTL_LIST,
  );
  return paginate(data.products, mapProductCard);
}

/** Enriched single-page catalogue for the designed /shop page. Returns a flat
 *  list (with category / tags / colours / recency) for client-side filtering.
 *  `pageSize` is clamped to the Storefront 250 max — use getAllShopProducts to
 *  page beyond that. */
export async function getShopProducts(
  params: { pageSize?: number; sortKey?: string; reverse?: boolean; query?: string | null } = {},
): Promise<ProductCard[]> {
  const data = await shopifyFetch<{ products: any }>(
    SHOP_PRODUCTS_QUERY,
    {
      first: Math.min(params.pageSize ?? 48, MAX_PAGE),
      sortKey: params.sortKey ?? 'BEST_SELLING',
      reverse: params.reverse ?? false,
      query: params.query ?? null,
    },
    TTL_LIST,
  );
  return nodes(data.products).map(mapProductCard);
}

/** Full enriched catalogue — pages through the whole storefront in 250-product
 *  chunks (capped) so stores with >250 products aren't silently truncated.
 *  Used by /collections/all and the shop deck. */
export async function getAllShopProducts(
  params: { max?: number; sortKey?: string; reverse?: boolean; query?: string | null } = {},
): Promise<ProductCard[]> {
  const cap = params.max ?? 1000;
  const all: ProductCard[] = [];
  let after: string | null = null;
  while (all.length < cap) {
    const data: { products: any } = await shopifyFetch<{ products: any }>(
      SHOP_PRODUCTS_QUERY,
      {
        first: Math.min(MAX_PAGE, cap - all.length),
        after,
        sortKey: params.sortKey ?? 'BEST_SELLING',
        reverse: params.reverse ?? false,
        query: params.query ?? null,
      },
      TTL_LIST,
    );
    all.push(...nodes(data.products).map(mapProductCard));
    const pageInfo: { hasNextPage?: boolean; endCursor?: string | null } | undefined =
      data.products?.pageInfo;
    if (!pageInfo?.hasNextPage || !pageInfo?.endCursor) break;
    after = pageInfo.endCursor;
  }
  return all.slice(0, cap);
}

/** Full product detail by handle, or null if not found. */
export async function getProduct(handle: string): Promise<Product | null> {
  const data = await shopifyFetch<{ product: any | null }>(
    PRODUCT_BY_HANDLE_QUERY,
    { handle },
    TTL_LIST,
  );
  return data.product ? mapProduct(data.product) : null;
}

/** Related products for a PDP. `intent` picks Shopify's RELATED ("you may also
 *  like") or COMPLEMENTARY ("goes well with") recommendation set (MP-20). */
export async function getProductRecommendations(
  productId: string,
  limit = 4,
  intent: 'RELATED' | 'COMPLEMENTARY' = 'RELATED',
): Promise<ProductCard[]> {
  const data = await shopifyFetch<{ productRecommendations: any[] | null }>(
    PRODUCT_RECOMMENDATIONS_QUERY,
    { productId, intent },
    TTL_LIST,
  );
  return (data.productRecommendations ?? []).slice(0, limit).map(mapProductCard);
}
