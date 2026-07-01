// GET /api/recommendations?productId=<gid>&limit=<n>
// Product recommendations for the cart drawer's "You may also like".
// Falls back to best-sellers when no productId (or none returned), and
// never throws — an empty list just hides the section in the drawer.
import type { APIRoute } from 'astro';
import { getProductRecommendations, getProducts } from '~/lib/shopify';
import type { ProductCard } from '~/lib/shopify/types';

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

export const GET: APIRoute = async ({ url }) => {
  const productId = url.searchParams.get('productId')?.trim() || null;
  const limit = Math.min(8, Math.max(1, Number(url.searchParams.get('limit')) || 6));

  try {
    let products: ProductCard[] = [];
    if (productId) {
      products = await getProductRecommendations(productId, limit);
    }
    if (!products.length) {
      const best = await getProducts({ pageSize: limit, sortKey: 'BEST_SELLING' });
      products = best.items;
    }
    return json({ products: products.slice(0, limit) });
  } catch (err) {
    console.error('[api/recommendations] failed:', (err as Error).message);
    return json({ products: [] }); // never break the drawer
  }
};
