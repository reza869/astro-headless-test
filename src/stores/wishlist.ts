// ============================================================
//  Wishlist store — lightweight, client-only (no backend). Source of
//  truth is a nanostore mirrored to localStorage so the state persists
//  across page loads and stays in sync between the product cards and the
//  header badge (both subscribe to $wishlist).
// ============================================================
import { atom } from 'nanostores';

const KEY = 'tailored:wishlist';

function load(): string[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export const $wishlist = atom<string[]>(load());

function persist(list: string[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* private mode / quota — state still lives in memory for the session */
  }
}

/** Toggle a product id; returns the new active state (true = now saved). */
export function toggleWishlist(id: string): boolean {
  const list = $wishlist.get();
  const has = list.includes(id);
  const next = has ? list.filter((x) => x !== id) : [...list, id];
  $wishlist.set(next);
  persist(next);
  return !has;
}

/** Empty the whole wishlist (persists + notifies subscribers). */
export function clearWishlist(): void {
  $wishlist.set([]);
  persist([]);
}

export function inWishlist(id: string): boolean {
  return $wishlist.get().includes(id);
}

export function wishlistCount(): number {
  return $wishlist.get().length;
}
