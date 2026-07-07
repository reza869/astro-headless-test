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

export interface RemovedLine {
  merchandiseId: string;
  quantity: number;
  attributes?: { key: string; value: string }[];
  title: string;
}
/** The most-recently removed line, retained briefly so the UI can offer Undo (CP-13). */
export const $lastRemoved = atom<RemovedLine | null>(null);

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

export interface LineAttribute {
  key: string;
  value: string;
}

/** Add a variant to the cart; opens the drawer on success by default.
 *  `attributes` carries optional line-item personalization (MP-24). */
export async function addItem(
  merchandiseId: string,
  quantity = 1,
  options: { open?: boolean; attributes?: LineAttribute[] } = {},
): Promise<MutationResponse> {
  const { open = true, attributes } = options;
  $cartBusy.set(true);
  $cartError.set(null);
  try {
    const data = applyResult(
      await post('/api/cart/add', { merchandiseId, quantity, attributes }),
    );
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
export async function buyNow(
  merchandiseId: string,
  quantity = 1,
  attributes?: LineAttribute[],
): Promise<void> {
  $cartBusy.set(true);
  $cartError.set(null);
  try {
    const data = applyResult(await post('/api/cart/add', { merchandiseId, quantity, attributes }));
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

/** Persist the order note to the Shopify cart (`cart.note`). Background save —
 *  the UI debounces calls, so this deliberately does NOT toggle the global
 *  busy spinner or surface transient errors (a lost keystroke save is silent). */
export async function setNote(note: string): Promise<void> {
  try {
    const data = await post('/api/cart/note', { note });
    if (data.cart) $cart.set(data.cart);
  } catch {
    /* background save — ignore */
  }
}

/** Replace the cart's attribute set (gift wrap flag, gift message, …). */
export async function setCartAttributes(attributes: LineAttribute[]): Promise<MutationResponse> {
  $cartBusy.set(true);
  $cartError.set(null);
  try {
    return applyResult(await post('/api/cart/attributes', { attributes }));
  } catch {
    $cartError.set('Could not update the cart. Please try again.');
    return { cart: null };
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

export async function removeItem(
  lineId: string,
  opts: { trackUndo?: boolean } = {},
): Promise<void> {
  // Snapshot the line BEFORE removal so an accidental delete is recoverable (CP-13).
  // Only user-initiated "remove" opts in — save-for-later / gift-wrap / empty-bag
  // pass the default so they don't spawn a misleading Undo toast.
  const snap = opts.trackUndo ? $cart.get()?.lines.find((l) => l.id === lineId) : undefined;
  $busyLines.setKey(lineId, true);
  try {
    const data = applyResult(await post('/api/cart/remove', { lineId }));
    if (snap && data.cart) {
      $lastRemoved.set({
        merchandiseId: snap.merchandise.id,
        quantity: snap.quantity,
        attributes: snap.attributes,
        title: snap.merchandise.product.title,
      });
    }
  } catch {
    $cartError.set('Could not remove the item.');
  } finally {
    $busyLines.setKey(lineId, false);
  }
}

/** Re-add the most-recently removed line (CP-13). A no-op if nothing is pending. */
export async function undoRemove(): Promise<void> {
  const last = $lastRemoved.get();
  if (!last) return;
  $lastRemoved.set(null);
  await addItem(last.merchandiseId, last.quantity, { open: false, attributes: last.attributes });
}

/** Dismiss the pending Undo without re-adding. */
export function clearLastRemoved(): void {
  $lastRemoved.set(null);
}

/** Jump to Shopify's hosted checkout for the current cart. */
export function checkout(): void {
  const url = $cart.get()?.checkoutUrl;
  if (url) window.location.href = url;
}
