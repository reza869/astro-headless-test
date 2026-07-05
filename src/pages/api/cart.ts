// GET /api/cart — current cart from the httpOnly cart-id cookie.
import type { APIRoute } from 'astro';
import { clientIp, json, jsonError, readCart } from '~/lib/cart-server';

export const prerender = false;

export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    const { cart } = await readCart(cookies, clientIp(request));
    return json({ cart });
  } catch (err) {
    return jsonError(err, 500, 'cart');
  }
};
