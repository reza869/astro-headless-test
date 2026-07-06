// POST /api/cart/note — { note }  (persists to the Shopify cart.note)
import type { APIRoute } from 'astro';
import { clientIp, isSameOrigin, json, jsonError, setNote, tooMany } from '~/lib/cart-server';
import { rateLimit } from '~/lib/rate-limit';

export const prerender = false;

// Shopify stores the note on the order; keep it to a sane upper bound so an
// oversized payload can never reach the mutation.
const MAX_NOTE = 2000;

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!isSameOrigin(request)) return json({ cart: null, error: 'Invalid origin' }, 403);
  // The note saves on every debounced edit — throttle so it can't be abused.
  const rl = rateLimit(`cart-note:${clientIp(request) ?? 'anon'}`, 30, 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);
  try {
    const body = await request.json();
    const note = String(body?.note ?? '').slice(0, MAX_NOTE);
    const { cart, userErrors } = await setNote(cookies, note, clientIp(request));
    return json({ cart, userErrors });
  } catch (err) {
    return jsonError(err, 500, 'cart/note');
  }
};
