// ============================================================
//  Cart store (nanostores) — shared across every React island.
//  Astro mounts islands as separate roots, so a framework-agnostic
//  store is the right tool to keep the header badge, the drawer,
//  and the PDP buttons in sync. All mutations hit same-origin
//  /api/cart/* (server-side Shopify with the private token).
// ============================================================
import { atom, map } from 'nanostores';
import type { Cart } from '~/lib/shopify/types';

export const $cart = atom<Cart | null>(null);
export const $cartOpen = atom<boolean>(false);
/** A network mutation is in flight (drives button spinners). */
export const $cartBusy = atom<boolean>(false);
export const $cartError = atom<string | null>(null);
/** Per-line ids with a request in flight (drawer row spinners). */
export const $busyLines = map<Record<string, boolean>>({});

let initialized = false;

/** Hydrate the cart once on first island mount. */
export async function initCart(): Promise<void> {
  if (initialized) return;
  initialized = true;
  try {
    const res = await fetch('/api/cart', { headers: { accept: 'application/json' } });
    const data = await res.json();
    $cart.set(data.cart ?? null);
  } catch {
    /* offline / first load — leave cart null, surfaces empty state */
  }
}

export function openCart(): void {
  $cartOpen.set(true);
}
export function closeCart(): void {
  $cartOpen.set(false);
}
export function toggleCart(): void {
  $cartOpen.set(!$cartOpen.get());
}

interface MutationResponse {
  cart: Cart | null;
  userErrors?: { message: string }[];
  error?: string;
}

async function post(url: string, body: unknown): Promise<MutationResponse> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    return { cart: null, error: 'Network error. Please try again.' };
  }
  // A non-2xx response may not be JSON (proxy 502, HTML error page) — read it
  // defensively so a SyntaxError can't masquerade as a network drop.
  const data = (await res.json().catch(() => null)) as MutationResponse | null;
  if (!res.ok) {
    return { cart: null, error: data?.error ?? 'Something went wrong. Please try again.' };
  }
  return data ?? { cart: null, error: 'Invalid response from server.' };
}

function applyResult(data: MutationResponse): MutationResponse {
  if (data.cart) $cart.set(data.cart);
  // A server response with no cart and no transient error means the cart
  // expired / no longer exists (the server self-heals the cookie). Reflect the
  // empty state instead of leaving a stale cart — and a dead checkoutUrl — up.
  else if (!data.error) $cart.set(null);
  const message = data.userErrors?.[0]?.message ?? data.error ?? null;
  $cartError.set(message);
  return data;
}

/** Add a variant to the cart; opens the drawer on success by default. */
export async function addItem(
  merchandiseId: string,
  quantity = 1,
  options: { open?: boolean } = {},
): Promise<MutationResponse> {
  const { open = true } = options;
  $cartBusy.set(true);
  $cartError.set(null);
  try {
    const data = applyResult(await post('/api/cart/add', { merchandiseId, quantity }));
    if (open && data.cart) openCart();
    return data;
  } catch {
    $cartError.set('Could not add to cart. Please try again.');
    return { cart: null };
  } finally {
    $cartBusy.set(false);
  }
}

/** Apply (or clear, with []) cart-level discount codes. Opens the drawer
 *  on success so the shopper sees the saving. Shopify only honours codes
 *  that exist as real discounts — invalid codes change nothing. */
export async function applyDiscountCode(
  codes: string[],
  options: { open?: boolean } = {},
): Promise<MutationResponse> {
  const { open = true } = options;
  $cartBusy.set(true);
  $cartError.set(null);
  try {
    const data = applyResult(await post('/api/cart/discount', { codes }));
    if (open && data.cart) openCart();
    return data;
  } catch {
    $cartError.set('Could not apply the discount. Please try again.');
    return { cart: null };
  } finally {
    $cartBusy.set(false);
  }
}

/** Add then redirect straight to Shopify's hosted checkout. */
export async function buyNow(merchandiseId: string, quantity = 1): Promise<void> {
  $cartBusy.set(true);
  $cartError.set(null);
  try {
    const data = applyResult(await post('/api/cart/add', { merchandiseId, quantity }));
    const url = data.cart?.checkoutUrl;
    if (url) {
      window.location.href = url;
    } else {
      $cartError.set('Could not start checkout. Please try again.');
    }
  } catch {
    $cartError.set('Could not start checkout. Please try again.');
  } finally {
    $cartBusy.set(false);
  }
}

export async function updateItem(lineId: string, quantity: number): Promise<void> {
  $busyLines.setKey(lineId, true);
  try {
    applyResult(await post('/api/cart/update', { lineId, quantity }));
  } catch {
    $cartError.set('Could not update the cart.');
  } finally {
    $busyLines.setKey(lineId, false);
  }
}

export async function removeItem(lineId: string): Promise<void> {
  $busyLines.setKey(lineId, true);
  try {
    applyResult(await post('/api/cart/remove', { lineId }));
  } catch {
    $cartError.set('Could not remove the item.');
  } finally {
    $busyLines.setKey(lineId, false);
  }
}

/** Jump to Shopify's hosted checkout for the current cart. */
export function checkout(): void {
  const url = $cart.get()?.checkoutUrl;
  if (url) window.location.href = url;
}
