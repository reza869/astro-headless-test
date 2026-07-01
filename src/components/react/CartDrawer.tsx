// ============================================================
//  CartDrawer — slide-over cart. Mounted once, globally.
//  Reads the shared nanostore so it stays in sync with the
//  header badge and every add-to-cart button on the page.
// ============================================================
import { useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { X, ShoppingBag, ArrowRight, Trash2 } from 'lucide-react';
import { useFocusTrap } from './useFocusTrap';
import {
  $cart,
  $cartOpen,
  $cartBusy,
  $busyLines,
  $cartError,
  closeCart,
  updateItem,
  removeItem,
  checkout,
} from '~/stores/cart';
import type { CartLine } from '~/lib/shopify/types';
import { formatMoney } from '~/lib/utils';
import { SITE } from '~/config/site';
import QuantityStepper from './QuantityStepper';
import Spinner from './Spinner';

export default function CartDrawer() {
  const cart = useStore($cart);
  const open = useStore($cartOpen);
  const busy = useStore($cartBusy);
  const error = useStore($cartError);
  // Focus trap moves focus into the panel on open and restores it on close.
  const panelRef = useFocusTrap<HTMLDivElement>(open);

  // Esc to close + lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeCart();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const lines = cart?.lines ?? [];
  const currency = cart?.cost?.subtotalAmount?.currencyCode ?? 'USD';
  const subtotal = Number(cart?.cost?.subtotalAmount?.amount ?? 0);
  const total = Number(cart?.cost?.totalAmount?.amount ?? subtotal);
  const discount = Math.max(0, subtotal - total);
  const discountCodes = (cart?.discountCodes ?? [])
    .filter((d) => d.applicable)
    .map((d) => d.code);
  const threshold = SITE.freeShippingThreshold;
  const remaining = Math.max(0, threshold - subtotal);
  const progress = Math.min(100, (subtotal / threshold) * 100);

  return (
    <div
      className={`fixed inset-0 z-[100] ${open ? '' : 'pointer-events-none'}`}
      aria-hidden={!open}
      inert={!open}
    >
      {/* Backdrop */}
      <div
        onClick={closeCart}
        className={`absolute inset-0 bg-dark/50 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className={`absolute right-0 top-0 flex h-full w-full max-w-[26rem] flex-col border-l border-border bg-surface/95 shadow-2xl outline-none backdrop-blur-xl transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-baseline gap-2">
            <h2 className="text-lg font-bold tracking-tight">Cart</h2>
            <span className="font-mono text-xs text-text-muted">
              {String(cart?.totalQuantity ?? 0).padStart(2, '0')}
            </span>
          </div>
          <button
            type="button"
            onClick={closeCart}
            className="grid h-10 w-10 place-items-center rounded-md text-text-primary transition-fluid hover:bg-surface-cool"
            aria-label="Close cart"
          >
            <X size={20} strokeWidth={1.6} />
          </button>
        </header>

        {lines.length === 0 ? (
          <EmptyCart />
        ) : (
          <>
            {/* Free-shipping progress */}
            <div className="border-b border-border px-5 py-3">
              {remaining > 0 ? (
                <p className="text-[0.8125rem] text-text-secondary">
                  You're{' '}
                  <span className="font-mono font-medium text-text-primary tabular">
                    {formatMoney(remaining, currency)}
                  </span>{' '}
                  from free shipping.
                </p>
              ) : (
                <p className="text-[0.8125rem] font-medium text-green">
                  Free freight unlocked — nice line.
                </p>
              )}
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-cool">
                <div
                  className="h-full rounded-full bg-coral transition-[width] duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Lines */}
            <ul className="flex-1 divide-y divide-border overflow-y-auto px-5">
              {lines.map((line) => (
                <CartLineRow key={line.id} line={line} currency={currency} />
              ))}
            </ul>

            {/* Footer */}
            <footer className="border-t border-border bg-surface px-5 py-4">
              {error && (
                <p className="mb-3 rounded-md bg-coral-soft px-3 py-2 text-xs text-coral" role="alert">
                  {error}
                </p>
              )}
              {discount > 0 && (
                <>
                  <div className="mb-1 flex items-baseline justify-between text-sm text-text-secondary">
                    <span>Subtotal</span>
                    <span className="font-mono tabular">{formatMoney(subtotal, currency)}</span>
                  </div>
                  <div className="mb-1 flex items-baseline justify-between text-sm font-medium text-coral">
                    <span>
                      Discount{discountCodes.length ? ` · ${discountCodes.join(', ')}` : ''}
                    </span>
                    <span className="font-mono tabular">−{formatMoney(discount, currency)}</span>
                  </div>
                </>
              )}
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-[11px] font-bold uppercase tracking-[1.8px] text-text-secondary">
                  {discount > 0 ? 'Total' : 'Subtotal'}
                </span>
                <span className="font-mono text-lg font-medium tabular">
                  {formatMoney(discount > 0 ? total : subtotal, currency)}
                </span>
              </div>
              <p className="mb-4 text-xs text-text-muted">
                Taxes and shipping calculated at checkout.
              </p>
              <button
                type="button"
                onClick={checkout}
                disabled={busy}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-md bg-coral text-base font-medium text-white transition-fluid hover:brightness-110 disabled:opacity-60"
              >
                {busy ? <Spinner size={20} /> : (
                  <>
                    Checkout
                    <ArrowRight size={18} strokeWidth={1.8} />
                  </>
                )}
              </button>
              <a
                href="/cart"
                onClick={closeCart}
                className="mt-2 flex h-10 w-full items-center justify-center text-sm font-medium text-text-secondary underline-offset-4 transition-fluid hover:text-text-primary hover:underline"
              >
                View full bag
              </a>
              <button
                type="button"
                onClick={closeCart}
                className="mt-1 h-10 w-full text-sm text-text-secondary underline-offset-4 transition-fluid hover:text-text-primary hover:underline"
              >
                Continue shopping
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}

function CartLineRow({ line, currency }: { line: CartLine; currency: string }) {
  const busyLines = useStore($busyLines);
  const busy = !!busyLines[line.id];
  const m = line.merchandise;
  const image = m.image ?? m.product?.featuredImage ?? null;
  const optionText = m.selectedOptions
    .filter((o) => o.value !== 'Default Title')
    .map((o) => o.value)
    .join(' · ');

  return (
    <li className="flex gap-4 py-4">
      <a
        href={`/products/${m.product.handle}`}
        onClick={closeCart}
        className="relative block h-24 w-20 shrink-0 overflow-hidden rounded-md border border-border bg-surface"
      >
        {image ? (
          <img
            src={image.url}
            alt={image.altText ?? m.product.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : null}
        {busy && (
          <span className="absolute inset-0 grid place-items-center bg-surface/60 text-text-primary">
            <Spinner size={18} />
          </span>
        )}
      </a>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <a
            href={`/products/${m.product.handle}`}
            onClick={closeCart}
            className="text-sm font-medium leading-snug text-text-primary hover:text-coral"
          >
            {m.product.title}
          </a>
          <button
            type="button"
            onClick={() => removeItem(line.id)}
            disabled={busy}
            className="-mr-1 grid h-7 w-7 shrink-0 place-items-center rounded text-text-muted transition-fluid hover:text-coral disabled:opacity-40"
            aria-label={`Remove ${m.product.title}`}
          >
            <Trash2 size={15} strokeWidth={1.6} />
          </button>
        </div>

        {optionText && <p className="mt-0.5 font-mono text-[0.7rem] text-text-muted">{optionText}</p>}

        <div className="mt-auto flex items-center justify-between pt-3">
          <QuantityStepper
            value={line.quantity}
            onChange={(q) => updateItem(line.id, q)}
            disabled={busy}
            size="sm"
            min={1}
            ariaLabel={`Quantity for ${m.product.title}`}
          />
          <span className="font-mono text-sm font-medium tabular">
            {formatMoney(line.cost.totalAmount.amount, currency)}
          </span>
        </div>
      </div>
    </li>
  );
}

function EmptyCart() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
      <span className="mb-4 grid h-16 w-16 place-items-center rounded-full border border-border text-text-muted">
        <ShoppingBag size={26} strokeWidth={1.4} />
      </span>
      <p className="text-lg font-bold tracking-tight">Your bag is empty</p>
      <p className="mt-1 text-sm text-text-secondary">Nothing in here yet — let's change that.</p>
      <a
        href="/products"
        onClick={closeCart}
        className="mt-6 inline-flex h-11 items-center gap-2 rounded-md bg-dark px-6 text-sm font-medium text-white transition-fluid hover:bg-dark-hover"
      >
        Shop all products
        <ArrowRight size={17} strokeWidth={1.8} />
      </a>
    </div>
  );
}
