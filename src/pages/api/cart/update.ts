// POST /api/cart/update — { lineId, quantity }  (quantity 0 removes)
import type { APIRoute } from 'astro';
import { json, updateLine } from '~/lib/cart-server';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  try {
    const body = await request.json();
    const lineId = String(body?.lineId ?? '');
    const quantity = Number(body?.quantity);

    if (!lineId || !Number.isFinite(quantity)) {
      return json({ cart: null, userErrors: [{ message: 'lineId and quantity required' }] }, 400);
    }

    const { cart, userErrors } = await updateLine(cookies, { id: lineId, quantity }, clientAddress);
    return json({ cart, userErrors });
  } catch (err) {
    return json({ cart: null, error: (err as Error).message }, 500);
  }
};
