// GET /api/products/:handle — full product detail for the Quick View island.
import type { APIRoute } from 'astro';
import { getProduct } from '~/lib/shopify';

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

export const GET: APIRoute = async ({ params }) => {
  const handle = params.handle?.trim();
  if (!handle) return json({ error: 'Missing handle' }, 400);

  try {
    const product = await getProduct(handle);
    if (!product) return json({ error: 'Not found' }, 404);
    return json({ product });
  } catch (err) {
    console.error('[api/products/:handle]', (err as Error)?.message);
    return json({ error: 'Product is unavailable.' }, 500);
  }
};
