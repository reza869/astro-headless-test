// ============================================================
//  useCartNote — shared order-note state for the cart surfaces.
//  Seeds from the real Shopify `cart.note`, debounces edits, and
//  persists via the store's setNote (→ cartNoteUpdate). Used by
//  both CartView (/cart) and CartDrawer so the note is the same
//  everywhere and actually reaches checkout (CP-1 / CD-4).
// ============================================================
import { useEffect, useRef, useState } from 'react';
import { useStore } from '@nanostores/react';
import { $cart, setNote as persistNote } from '~/stores/cart';

/** Debounce window before a note edit is saved to Shopify (ms). */
const SAVE_DELAY = 600;

export function useCartNote() {
  const cart = useStore($cart);
  const [note, setNote] = useState('');
  const seeded = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef('');

  // Seed once per cart id from the server note. Keyed on the id (not the note)
  // so our own debounced saves don't clobber the field while the user types.
  useEffect(() => {
    const id = cart?.id ?? null;
    if (id && seeded.current !== id) {
      seeded.current = id;
      const v = cart?.note ?? '';
      setNote(v);
      latest.current = v;
    }
  }, [cart?.id, cart?.note]);

  const onChange = (v: string) => {
    setNote(v);
    latest.current = v;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => persistNote(v), SAVE_DELAY);
  };

  // Flush a pending save on unmount (e.g. navigating to checkout / away) so an
  // in-flight keystroke isn't lost.
  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
        persistNote(latest.current);
      }
    },
    [],
  );

  return { note, onChange };
}
