// POST /api/cart/attributes — { attributes: [{key,value}] }
// Replaces the cart's attribute set (gift wrap flag, gift message, …).
import type { APIRoute } from 'astro';
import { clientIp, isSameOrigin, json, jsonError, setAttributes, tooMany } from '~/lib/cart-server';
import { rateLimit } from '~/lib/rate-limit';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!isSameOrigin(request)) return json({ cart: null, error: 'Invalid origin' }, 403);
  const rl = rateLimit(`cart-attrs:${clientIp(request) ?? 'anon'}`, 30, 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);
  try {
    const body = await request.json();
    // Sanitise to a small, bounded set of non-empty string key/value pairs;
    // never trust raw client input (mirrors /api/cart/add's attribute handling).
    const attributes = Array.isArray(body?.attributes)
      ? body.attributes
          .filter((a: unknown): a is { key: string; value: string } => {
            const o = a as { key?: unknown; value?: unknown };
            return typeof o?.key === 'string' && typeof o?.value === 'string';
          })
          .map((a: { key: string; value: string }) => ({
            key: a.key.trim().slice(0, 80),
            value: a.value.trim().slice(0, 500),
          }))
          .filter((a: { key: string; value: string }) => a.key && a.value)
          .slice(0, 20)
      : [];
    const { cart, userErrors } = await setAttributes(cookies, attributes, clientIp(request));
    return json({ cart, userErrors });
  } catch (err) {
    return jsonError(err, 500, 'cart/attributes');
  }
};
