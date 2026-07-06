// ============================================================
//  CartDrawer — floating slide-over bag. Mounted once, globally.
//  Reads the shared nanostore so it stays in sync with the header
//  badge and every add-to-cart button on the page. Editorial look:
//  a floating cream panel with white item cards, a free-shipping
//  meter, "you may also like" recommendations, and a pinned
//  subtotal + checkout card.
// ============================================================
import { useEffect, useRef, useState } from 'react';
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
import type { CartLine, ProductCard } from '~/lib/shopify/types';
import { formatMoney } from '~/lib/utils';
import { lockScroll, unlockScroll } from '~/lib/scroll-lock';
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
    lockScroll();
    return () => {
      document.removeEventListener('keydown', onKey);
      unlockScroll();
    };
  }, [open]);

  const lines = cart?.lines ?? [];
  const currency = cart?.cost?.subtotalAmount?.currencyCode ?? 'USD';
  const subtotal = Number(cart?.cost?.subtotalAmount?.amount ?? 0);
  const total = Number(cart?.cost?.totalAmount?.amount ?? subtotal);
  const discount = Math.max(0, subtotal - total);
  const discountCodes = (cart?.discountCodes ?? []).filter((d) => d.applicable).map((d) => d.code);
  const threshold = SITE.freeShippingThreshold;
  const remaining = Math.max(0, threshold - subtotal);
  const unlocked = remaining <= 0 && subtotal > 0;
  const progress = threshold > 0 ? Math.min(100, (subtotal / threshold) * 100) : 100;

  // ── Recommendations — lazy-fetched when the drawer opens, keyed to the
  // first line's product so it only refetches when that changes. Filters out
  // anything already in the bag; failures silently hide the section.
  const [recs, setRecs] = useState<ProductCard[]>([]);
  const recKeyRef = useRef<string>('');
  useEffect(() => {
    if (!open || lines.length === 0) return;
    const seedId = lines[0].merchandise.product.id;
    if (recKeyRef.current === seedId) return;
    recKeyRef.current = seedId;

    let active = true;
    const inBag = new Set(lines.map((l) => l.merchandise.product.handle));
    fetch(`/api/recommendations?productId=${encodeURIComponent(seedId)}&limit=6`)
      .then((r) => (r.ok ? r.json() : { products: [] }))
      .then((data: { products?: ProductCard[] }) => {
        if (!active) return;
        // Keep it to a single, balanced row of two — a tidy nudge, not a
        // second product grid competing with the bag itself.
        const list = (data.products ?? []).filter((p) => !inBag.has(p.handle)).slice(0, 2);
        setRecs(list);
      })
      .catch(() => active && setRecs([]));
    return () => {
      active = false;
    };
  }, [open, lines]);

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

      {/* Sliding wrapper — padding makes the panel float inside it */}
      <div
        className={`absolute inset-y-0 right-0 flex w-full max-w-[27rem] p-2 sm:p-3 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          open ? 'translate-x-0' : 'translate-x-[105%]'
        }`}
      >
        {/* Panel */}
        <div
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label="Shopping bag"
          className="flex h-full w-full flex-col overflow-hidden rounded-3xl bg-bg-light shadow-2xl outline-none"
        >
          {/* Header */}
          <header className="shrink-0 px-5 pt-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-heading text-[26px] font-extrabold leading-none tracking-tight text-text-primary">
                Your Bag{' '}
                <span className="align-baseline text-[18px] font-semibold text-text-muted">
                  ({cart?.totalQuantity ?? 0})
                </span>
              </h2>
              <button
                type="button"
                onClick={closeCart}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-surface text-text-primary shadow-sm ring-1 ring-border transition-fluid hover:bg-surface-cool"
                aria-label="Close bag"
              >
                <X size={19} strokeWidth={1.8} />
              </button>
            </div>

            {lines.length > 0 && (
              <div className="mt-4">
                <p
                  className={`text-[13px] font-semibold ${unlocked ? 'text-green' : 'text-text-secondary'}`}
                >
                  {unlocked ? (
                    "You've unlocked free shipping!"
                  ) : (
                    <>
                      You're{' '}
                      <span className="tabular text-text-primary">
                        {formatMoney(remaining, currency)}
                      </span>{' '}
                      away from free shipping.
                    </>
                  )}
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-cool">
                  <div
                    className={`h-full rounded-full transition-[width] duration-500 ease-out ${
                      unlocked ? 'bg-green' : 'bg-coral'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </header>

          {lines.length === 0 ? (
            <EmptyCart />
          ) : (
            <>
              {/* Scroll region — line items + recommendations */}
              <div className="flex-1 overflow-y-auto px-4 pb-4 pt-4">
                <ul className="flex flex-col gap-3">
                  {lines.map((line) => (
                    <CartLineRow key={line.id} line={line} currency={currency} />
                  ))}
                </ul>

                {recs.length > 0 && (
                  <section className="mt-8 border-t border-border/60 pt-6">
                    <h3 className="mb-4 flex items-center justify-center gap-2.5 text-[11px] font-bold uppercase tracking-[1.8px] text-text-muted">
                      <span className="h-px w-5 bg-border" />
                      You may also like
                      <span className="h-px w-5 bg-border" />
                    </h3>
                    <div className="grid grid-cols-2 gap-3.5">
                      {recs.map((p) => (
                        <RecommendationCard key={p.id} product={p} />
                      ))}
                    </div>
                  </section>
                )}
              </div>

              {/* Footer — pinned subtotal + checkout card */}
              <footer className="shrink-0 px-3 pb-3">
                <div className="rounded-2xl bg-surface p-4 shadow-[0_-2px_24px_rgba(9,10,11,0.08)] ring-1 ring-border/70">
                  {error && (
                    <p
                      className="mb-3 rounded-md bg-coral-soft px-3 py-2 text-xs font-medium text-coral"
                      role="alert"
                    >
                      {error}
                    </p>
                  )}
                  {discount > 0 && (
                    <div className="mb-3 flex items-baseline justify-between text-[13px] font-medium text-coral">
                      <span>Discount{discountCodes.length ? ` · ${discountCodes.join(', ')}` : ''}</span>
                      <span className="tabular">−{formatMoney(discount, currency)}</span>
                    </div>
                  )}

                  <div className="flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-[1.6px] text-text-secondary">
                        {discount > 0 ? 'Total' : 'Subtotal'}
                      </p>
                      <p className="mt-1 text-[12.5px] leading-tight text-text-muted">
                        Shipping &amp; taxes calculated at checkout
                      </p>
                    </div>
                    <span className="shrink-0 font-heading text-[30px] font-extrabold leading-none tabular text-text-primary">
                      {formatMoney(discount > 0 ? total : subtotal, currency)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={checkout}
                    disabled={busy}
                    className="mt-4 flex h-[54px] w-full items-center justify-center gap-2.5 rounded-xl bg-coral text-[13px] font-bold uppercase tracking-[1.5px] text-white shadow-[0_10px_24px_rgba(217,88,70,0.32)] transition-fluid hover:bg-coral-hover disabled:opacity-60"
                  >
                    {busy ? (
                      <Spinner size={20} />
                    ) : (
                      <>
                        Checkout
                        <ArrowRight size={17} strokeWidth={2} />
                      </>
                    )}
                  </button>

                  <a
                    href="/cart"
                    onClick={closeCart}
                    className="mt-2.5 flex h-[50px] w-full items-center justify-center rounded-xl border border-border text-[12.5px] font-bold uppercase tracking-[1.4px] text-text-primary transition-fluid hover:border-dark hover:text-coral"
                  >
                    View Cart
                  </a>
                </div>
              </footer>
            </>
          )}
        </div>
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
    <li className="flex gap-3 rounded-2xl bg-surface p-3 shadow-xs ring-1 ring-border/70">
      <a
        href={`/products/${m.product.handle}`}
        onClick={closeCart}
        className="relative block h-[94px] w-[78px] shrink-0 overflow-hidden rounded-xl bg-surface-cool"
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
          <div className="min-w-0">
            <a
              href={`/products/${m.product.handle}`}
              onClick={closeCart}
              className="block truncate text-[15px] font-bold leading-tight text-text-primary hover:text-coral"
            >
              {m.product.title}
            </a>
            {optionText && (
              <p className="mt-1 text-[12.5px] text-text-muted">{optionText}</p>
            )}
            {line.attributes && line.attributes.length > 0 && (
              <ul className="mt-1 space-y-0.5">
                {line.attributes.map((a) => (
                  <li key={a.key} className="truncate text-[11.5px] text-text-muted">
                    <span className="font-semibold">{a.key}:</span> {a.value}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <span className="shrink-0 text-[15px] font-bold tabular text-text-primary">
            {formatMoney(line.cost.totalAmount.amount, currency)}
          </span>
        </div>

        <div className="mt-auto flex items-end justify-between pt-2">
          <QuantityStepper
            value={line.quantity}
            onChange={(q) => updateItem(line.id, q)}
            disabled={busy}
            size="sm"
            variant="soft"
            min={1}
            ariaLabel={`Quantity for ${m.product.title}`}
          />
          <button
            type="button"
            onClick={() => removeItem(line.id)}
            disabled={busy}
            className="-mb-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-text-muted transition-fluid hover:bg-coral-soft hover:text-coral disabled:opacity-40"
            aria-label={`Remove ${m.product.title}`}
          >
            <Trash2 size={16} strokeWidth={1.7} />
          </button>
        </div>
      </div>
    </li>
  );
}

function RecommendationCard({ product }: { product: ProductCard }) {
  const img = product.featuredImage;
  const price = product.priceRange.minVariantPrice;
  return (
    <a
      href={`/products/${product.handle}`}
      onClick={closeCart}
      className="group block overflow-hidden rounded-2xl bg-surface shadow-xs ring-1 ring-border/70 transition-fluid hover:shadow-md"
    >
      <div className="aspect-[4/5] overflow-hidden bg-surface-cool">
        {img ? (
          <img
            src={img.url}
            alt={img.altText ?? product.title}
            className="h-full w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
            loading="lazy"
          />
        ) : null}
      </div>
      <div className="p-3">
        <p className="truncate text-[13px] font-semibold leading-tight text-text-primary group-hover:text-coral">
          {product.title}
        </p>
        <p className="mt-1 text-[13px] tabular text-text-secondary">
          {formatMoney(price.amount, price.currencyCode)}
        </p>
      </div>
    </a>
  );
}

function EmptyCart() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 pb-10 text-center">
      <span className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-surface text-text-muted ring-1 ring-border">
        <ShoppingBag size={26} strokeWidth={1.4} />
      </span>
      <p className="font-heading text-[22px] font-bold tracking-tight text-text-primary">
        Your bag is empty
      </p>
      <p className="mt-1 text-sm text-text-secondary">Nothing in here yet — let's change that.</p>
      <a
        href="/products"
        onClick={closeCart}
        className="mt-6 inline-flex h-12 items-center gap-2 rounded-xl bg-dark px-6 text-[13px] font-bold uppercase tracking-[1.2px] text-white transition-fluid hover:bg-dark-hover"
      >
        Shop all products
        <ArrowRight size={17} strokeWidth={1.8} />
      </a>
    </div>
  );
}
