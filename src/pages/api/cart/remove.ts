// POST /api/cart/remove — { lineId }  or  { lineIds: [...] }
import type { APIRoute } from 'astro';
import { clientIp, isSameOrigin, json, jsonError, removeLines } from '~/lib/cart-server';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!isSameOrigin(request)) return json({ cart: null, error: 'Invalid origin' }, 403);
  try {
    const body = await request.json();
    const raw: unknown[] = Array.isArray(body?.lineIds)
      ? body.lineIds
      : body?.lineId
        ? [body.lineId]
        : [];
    // Only accept real cart-line gids, and cap the count to avoid amplification.
    const lineIds = raw
      .filter((x): x is string => typeof x === 'string' && x.startsWith('gid://shopify/CartLine/'))
      .slice(0, 50);

    if (!lineIds.length) {
      return json({ cart: null, userErrors: [{ message: 'lineId(s) required' }] }, 400);
    }

    const { cart, userErrors } = await removeLines(cookies, lineIds, clientIp(request));
    return json({ cart, userErrors });
  } catch (err) {
    return jsonError(err, 500, 'cart/remove');
  }
};
