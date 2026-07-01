// POST /api/cart/remove — { lineId }  or  { lineIds: [...] }
import type { APIRoute } from 'astro';
import { json, removeLines } from '~/lib/cart-server';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  try {
    const body = await request.json();
    const lineIds: string[] = body?.lineIds ?? (body?.lineId ? [body.lineId] : []);

    if (!lineIds.length) {
      return json({ cart: null, userErrors: [{ message: 'lineId(s) required' }] }, 400);
    }

    const { cart, userErrors } = await removeLines(cookies, lineIds, clientAddress);
    return json({ cart, userErrors });
  } catch (err) {
    return json({ cart: null, error: (err as Error).message }, 500);
  }
};
