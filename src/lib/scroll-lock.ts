// ============================================================
//  Reference-counted body scroll lock — shared by every overlay
//  (cart drawer, quick view, predictive search, …).
// ============================================================
// Per-component capture-and-restore of `document.body.style.overflow`
// breaks when two overlays overlap: the one that opens second captures
// the first's "hidden" as the value to restore, so when it closes it
// re-applies "hidden" and the page is stuck unscrollable. A shared
// counter fixes this — we lock on the first open and restore the
// ORIGINAL overflow only once the last overlay has closed.

let count = 0;
let original = '';

/** Lock body scroll. Safe to nest — each call must be paired with unlockScroll(). */
export function lockScroll(): void {
  if (typeof document === 'undefined') return;
  if (count === 0) {
    original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  count += 1;
}

/** Release one lock; restores the original overflow when the last one is released. */
export function unlockScroll(): void {
  if (typeof document === 'undefined' || count === 0) return;
  count -= 1;
  if (count === 0) {
    document.body.style.overflow = original;
  }
}
