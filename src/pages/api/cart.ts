// GET /api/cart — current cart from the httpOnly cart-id cookie.
import type { APIRoute } from 'astro';
import { json, readCart } from '~/lib/cart-server';

export const prerender = false;

export const GET: APIRoute = async ({ cookies, clientAddress }) => {
  try {
    const { cart } = await readCart(cookies, clientAddress);
    return json({ cart });
  } catch (err) {
    return json({ cart: null, error: (err as Error).message }, 500);
  }
};
