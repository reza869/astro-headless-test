// POST /api/cart/discount — { codes: string[] }  (pass [] to clear)
import type { APIRoute } from 'astro';
import { applyDiscount, json } from '~/lib/cart-server';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  try {
    const body = await request.json();
    const codes = Array.isArray(body?.codes)
      ? body.codes.map((c: unknown) => String(c).trim()).filter(Boolean)
      : [];
    const { cart, userErrors } = await applyDiscount(cookies, codes, clientAddress);
    return json({ cart, userErrors });
  } catch (err) {
    return json({ cart: null, error: (err as Error).message }, 500);
  }
};
