// POST /api/cart/update — { lineId, quantity }  (quantity 0 removes)
import type { APIRoute } from 'astro';
import { clientIp, isSameOrigin, json, jsonError, updateLine } from '~/lib/cart-server';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!isSameOrigin(request)) return json({ cart: null, error: 'Invalid origin' }, 403);
  try {
    const body = await request.json();
    const lineId = String(body?.lineId ?? '');
    const raw = Number(body?.quantity);

    if (!lineId || !Number.isFinite(raw)) {
      return json({ cart: null, userErrors: [{ message: 'lineId and quantity required' }] }, 400);
    }
    // 0 (or below) removes the line; otherwise coerce to a whole 1..99 so a
    // negative or fractional value never reaches Shopify's Int quantity field.
    const quantity = raw <= 0 ? 0 : Math.min(Math.floor(raw), 99);

    const { cart, userErrors } = await updateLine(cookies, { id: lineId, quantity }, clientIp(request));
    return json({ cart, userErrors });
  } catch (err) {
    return jsonError(err, 500, 'cart/update');
  }
};
