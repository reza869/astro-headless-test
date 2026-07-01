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
  const data = await shopifyFetch<{ products: any }>(PRODUCTS_QUERY, {
    ...cursorVars({ pageSize: params.pageSize ?? 12, after: params.after, before: params.before }),
    sortKey: params.sortKey ?? 'BEST_SELLING',
    reverse: params.reverse ?? false,
    query: params.query ?? null,
  });
  return paginate(data.products, mapProductCard);
}

/** Enriched single-page catalogue for the designed /shop page. Returns a flat
 *  list (with category / tags / colours / recency) for client-side filtering. */
export async function getShopProducts(
  params: { pageSize?: number; sortKey?: string; reverse?: boolean; query?: string | null } = {},
): Promise<ProductCard[]> {
  const data = await shopifyFetch<{ products: any }>(SHOP_PRODUCTS_QUERY, {
    first: params.pageSize ?? 48,
    sortKey: params.sortKey ?? 'BEST_SELLING',
    reverse: params.reverse ?? false,
    query: params.query ?? null,
  });
  return nodes(data.products).map(mapProductCard);
}

/** Full product detail by handle, or null if not found. */
export async function getProduct(handle: string): Promise<Product | null> {
  const data = await shopifyFetch<{ product: any | null }>(PRODUCT_BY_HANDLE_QUERY, { handle });
  return data.product ? mapProduct(data.product) : null;
}

/** Related products for a PDP. */
export async function getProductRecommendations(
  productId: string,
  limit = 4,
): Promise<ProductCard[]> {
  const data = await shopifyFetch<{ productRecommendations: any[] | null }>(
    PRODUCT_RECOMMENDATIONS_QUERY,
    { productId },
  );
  return (data.productRecommendations ?? []).slice(0, limit).map(mapProductCard);
}
