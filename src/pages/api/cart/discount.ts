// POST /api/cart/discount — { codes: string[] }  (pass [] to clear)
import type { APIRoute } from 'astro';
import { applyDiscount, clientIp, json, jsonError } from '~/lib/cart-server';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    // Cap count + per-code length; discount codes are short identifiers.
    const codes = Array.isArray(body?.codes)
      ? body.codes
          .map((c: unknown) => String(c).trim().slice(0, 64))
          .filter(Boolean)
          .slice(0, 20)
      : [];
    const { cart, userErrors } = await applyDiscount(cookies, codes, clientIp(request));
    return json({ cart, userErrors });
  } catch (err) {
    return jsonError(err, 500, 'cart/discount');
  }
};
