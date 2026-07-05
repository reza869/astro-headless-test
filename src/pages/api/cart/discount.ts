// POST /api/cart/discount — { codes: string[] }  (pass [] to clear)
import type { APIRoute } from 'astro';
import { applyDiscount, clientIp, json, jsonError } from '~/lib/cart-server';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const codes = Array.isArray(body?.codes)
      ? body.codes.map((c: unknown) => String(c).trim()).filter(Boolean)
      : [];
    const { cart, userErrors } = await applyDiscount(cookies, codes, clientIp(request));
    return json({ cart, userErrors });
  } catch (err) {
    return jsonError(err, 500, 'cart/discount');
  }
};
