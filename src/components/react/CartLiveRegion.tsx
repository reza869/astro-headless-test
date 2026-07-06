// ============================================================
//  CartLiveRegion (CP-16) — a single polite live region that
//  announces cart changes (quantity / subtotal) to screen readers.
//  Rendered once inside the globally-mounted CartDrawer, so it
//  covers add/update/remove from every surface (drawer, /cart, PDP)
//  without duplicate announcements.
// ============================================================
import { useEffect, useRef, useState } from 'react';
import { useStore } from '@nanostores/react';
import { $cart } from '~/stores/cart';
import { formatMoney } from '~/lib/utils';

export default function CartLiveRegion() {
  const cart = useStore($cart);
  const [msg, setMsg] = useState('');
  const first = useRef(true);

  const qty = cart?.totalQuantity ?? 0;
  const sub = cart?.cost?.subtotalAmount;
  const amount = sub?.amount;
  const currency = sub?.currencyCode;

  useEffect(() => {
    // Don't announce the initial hydration — only real changes.
    if (first.current) {
      first.current = false;
      return;
    }
    if (qty === 0) {
      setMsg('Your bag is empty.');
      return;
    }
    const money = amount && currency ? formatMoney(amount, currency) : '';
    setMsg(`Bag updated: ${qty} item${qty === 1 ? '' : 's'}${money ? `, subtotal ${money}` : ''}.`);
  }, [qty, amount, currency]);

  return (
    <div aria-live="polite" role="status" className="sr-only">
      {msg}
    </div>
  );
}
