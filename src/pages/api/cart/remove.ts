// POST /api/cart/remove — { lineId }  or  { lineIds: [...] }
import type { APIRoute } from 'astro';
import { clientIp, json, jsonError, removeLines } from '~/lib/cart-server';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const lineIds: string[] = body?.lineIds ?? (body?.lineId ? [body.lineId] : []);

    if (!lineIds.length) {
      return json({ cart: null, userErrors: [{ message: 'lineId(s) required' }] }, 400);
    }

    const { cart, userErrors } = await removeLines(cookies, lineIds, clientIp(request));
    return json({ cart, userErrors });
  } catch (err) {
    return jsonError(err, 500, 'cart/remove');
  }
};
