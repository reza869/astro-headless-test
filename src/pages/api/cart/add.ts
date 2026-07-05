// POST /api/cart/add — { merchandiseId, quantity? }
import type { APIRoute } from 'astro';
import { addLines, clientIp, isSameOrigin, json, jsonError, tooMany } from '~/lib/cart-server';
import { rateLimit } from '~/lib/rate-limit';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!isSameOrigin(request)) return json({ cart: null, error: 'Invalid origin' }, 403);
  const rl = rateLimit(`cart-add:${clientIp(request) ?? 'anon'}`, 40, 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);
  try {
    const body = await request.json();
    const merchandiseId = String(body?.merchandiseId ?? '');
    // Coerce to a positive integer (1..99); never send NaN/fractional to the Int field.
    const n = Math.floor(Number(body?.quantity));
    const quantity = Number.isFinite(n) && n > 0 ? Math.min(n, 99) : 1;

    if (!merchandiseId.startsWith('gid://shopify/ProductVariant/')) {
      return json({ cart: null, userErrors: [{ message: 'Invalid variant id' }] }, 400);
    }

    const { cart, userErrors } = await addLines(
      cookies,
      [{ merchandiseId, quantity }],
      clientIp(request),
    );
    return json({ cart, userErrors });
  } catch (err) {
    return jsonError(err, 500, 'cart/add');
  }
};
