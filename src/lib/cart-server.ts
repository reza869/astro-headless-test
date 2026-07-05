// ============================================================
//  Cart server helpers — used by the /api/cart/* endpoints.
//  Centralizes "ensure a cart exists", cookie sync, and the
//  self-healing path when a stored cart id has expired.
// ============================================================
import type { AstroCookies } from 'astro';
import {
  addCartLines,
  applyDiscountCodes,
  createCart,
  getCart,
  removeCartLines,
  updateCartLines,
  type CartLineInput,
  type CartLineUpdateInput,
  type CartResult,
} from '~/lib/shopify';
import { clearCartId, getCartId, setCartId } from './cart-cookie';

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // Cart/customer payloads are per-shopper (they carry the cart contents
      // and the one-time checkoutUrl). Never let a shared cache/CDN or proxy
      // store or reuse them across users.
      'cache-control': 'private, no-store',
    },
  });
}

/**
 * Error response for a cart/API route: log the real error server-side and
 * return a generic message so backend/config details never reach the client.
 */
export function jsonError(err: unknown, status = 500, where = 'cart'): Response {
  console.error(`[api/${where}] ${(err as Error)?.message ?? err}`);
  return json({ cart: null, error: 'Something went wrong. Please try again.' }, status);
}

/**
 * Best-effort buyer IP for Shopify cart tax/shipping estimation.
 *
 * We read it from request headers rather than `Astro.clientAddress`, because
 * `clientAddress` is unsupported in the `@astrojs/cloudflare` adapter and throws
 * when accessed. The IP is optional here, so an undefined result is fine.
 */
export function clientIp(request: Request): string | undefined {
  const h = request.headers;
  return (
    h.get('cf-connecting-ip') ||
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-real-ip') ||
    undefined
  );
}

/** Fetch the current cart from the cookie; self-heals stale ids. */
export async function readCart(cookies: AstroCookies, buyerIp?: string): Promise<CartResult> {
  const id = getCartId(cookies);
  if (!id) return { cart: null, userErrors: [] };
  const cart = await getCart(id, { buyerIp });
  if (!cart) clearCartId(cookies); // expired / invalid — forget it
  return { cart, userErrors: [] };
}

/**
 * Add lines, creating a cart on first add (or recreating one when
 * the stored cart has expired). Keeps the cookie in sync.
 */
export async function addLines(
  cookies: AstroCookies,
  lines: CartLineInput[],
  buyerIp?: string,
): Promise<CartResult> {
  const id = getCartId(cookies);
  if (id) {
    const res = await addCartLines(id, lines, { buyerIp });
    if (res.cart) return res;
    // Stored cart vanished — fall through and start a fresh one.
    clearCartId(cookies);
  }
  const created = await createCart(lines, { buyerIp });
  if (created.cart) setCartId(cookies, created.cart.id);
  return created;
}

/** Update a line quantity; quantity 0 removes the line. */
export async function updateLine(
  cookies: AstroCookies,
  line: CartLineUpdateInput,
  buyerIp?: string,
): Promise<CartResult> {
  const id = getCartId(cookies);
  if (!id) return { cart: null, userErrors: [{ message: 'No active cart' }] };
  const res =
    line.quantity !== undefined && line.quantity <= 0
      ? await removeCartLines(id, [line.id], { buyerIp })
      : await updateCartLines(id, [line], { buyerIp });
  if (!res.cart) clearCartId(cookies); // cart expired — forget it so the next GET self-heals
  return res;
}

/** Apply cart-level discount codes (pass [] to clear). No-op without a cart. */
export async function applyDiscount(
  cookies: AstroCookies,
  discountCodes: string[],
  buyerIp?: string,
): Promise<CartResult> {
  const id = getCartId(cookies);
  if (!id) return { cart: null, userErrors: [{ message: 'No active cart' }] };
  const res = await applyDiscountCodes(id, discountCodes, { buyerIp });
  if (!res.cart) clearCartId(cookies); // cart expired — forget it
  return res;
}

/** Remove one or more lines. */
export async function removeLines(
  cookies: AstroCookies,
  lineIds: string[],
  buyerIp?: string,
): Promise<CartResult> {
  const id = getCartId(cookies);
  if (!id) return { cart: null, userErrors: [{ message: 'No active cart' }] };
  const res = await removeCartLines(id, lineIds, { buyerIp });
  if (!res.cart) clearCartId(cookies); // cart expired — forget it so the next GET self-heals
  return res;
}
