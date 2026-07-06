// ============================================================
//  CartView — the full-page shopping bag (designer Cart.html),
//  wired to the REAL Shopify cart via the shared nanostore.
//  Renders the live hero stats, free-shipping progress, line
//  list (qty / save-for-later / remove), order note, saved-for-
//  later, and the order summary (promo codes, delivery estimate,
//  gift wrapping). Everything that affects the total is a REAL
//  Shopify value: lines, quantities, promo codes, the order note
//  (cart.note), gift wrap (a charged variant or a `Gift wrap`
//  attribute) and the total (goods after discount). Shipping and
//  taxes are NOT fabricated here — Shopify computes them at
//  checkout; the delivery selector is an estimate + a saved
//  `Delivery preference` attribute.
// ============================================================
import { useEffect, useRef, useState } from 'react';
import { useStore } from '@nanostores/react';
import {
  Truck,
  ArrowLeft,
  ArrowRight,
  Trash2,
  Bookmark,
  X,
  Plus,
  Minus,
  PenLine,
  Lock,
  Gift,
  ShieldCheck,
  Percent,
  CheckCircle2,
  ShoppingBag,
} from 'lucide-react';
import {
  $cart,
  $busyLines,
  $cartBusy,
  initCart,
  updateItem,
  removeItem,
  addItem,
  applyDiscountCode,
  setCartAttributes,
  checkout,
} from '~/stores/cart';
import type { Cart, CartLine } from '~/lib/shopify/types';
import { formatMoney } from '~/lib/utils';
import { lineDiscount, lineMaxQty, lineLowStock } from '~/lib/cart-pricing';
import { SITE } from '~/config/site';
import { useCartNote } from './useCartNote';
import { useCountUp } from './useCountUp';

// Cart-attribute keys (surface on the Shopify order for the merchant).
const GIFT_WRAP_KEY = 'Gift wrap';
const DELIVERY_KEY = 'Delivery preference';

const DELIVERY = SITE.deliveryOptions;
type ShipKey = (typeof DELIVERY)[number]['key'];

const SAVED_KEY = 'tailored:saved-for-later';

interface SavedItem {
  merchandiseId: string;
  title: string;
  meta: string;
  image: string | null;
  amount: string;
  currency: string;
}

interface Props {
  /** SSR-read cart so the first paint has the real lines (no flash). */
  initialCart: Cart | null;
}

const money = (amount: string | number, currency: string) => formatMoney(amount, currency);

/** Options string for a cart line, dropping Shopify's "Default Title". */
function optionText(line: CartLine): string {
  return line.merchandise.selectedOptions
    .filter((o) => o.value !== 'Default Title')
    .map((o) => o.value)
    .join(' · ');
}

export default function CartView({ initialCart }: Props) {
  const storeCart = useStore($cart);
  const busy = useStore($cartBusy);
  // Prefer the live store once hydrated; fall back to the SSR snapshot.
  const cart = storeCart ?? initialCart;

  const [saved, setSaved] = useState<SavedItem[]>([]);
  // Order note — persists to the real Shopify cart.note (CP-1), shared with the drawer.
  const { note: notes, onChange: onNotes } = useCartNote();
  const [shipSel, setShipSel] = useState<ShipKey>(DELIVERY[0].key);
  const [coupon, setCoupon] = useState('');
  const [couponNote, setCouponNote] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  // Seed the store from the SSR cart, then hydrate the live source of truth.
  useEffect(() => {
    if (initialCart && !$cart.get()) $cart.set(initialCart);
    initCart();
  }, [initialCart]);

  // Restore saved-for-later from localStorage (a client-only convenience list;
  // the order note now lives on the real Shopify cart, not localStorage).
  useEffect(() => {
    try {
      const s = localStorage.getItem(SAVED_KEY);
      if (s) setSaved(JSON.parse(s));
    } catch {
      /* storage unavailable — non-critical */
    }
  }, []);

  const persistSaved = (next: SavedItem[]) => {
    setSaved(next);
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const lines = cart?.lines ?? [];
  const currency = cart?.cost?.subtotalAmount?.currencyCode ?? 'USD';
  const subtotal = Number(cart?.cost?.subtotalAmount?.amount ?? 0);
  const cartTotal = Number(cart?.cost?.totalAmount?.amount ?? subtotal);
  const discount = Math.max(0, subtotal - cartTotal);
  const itemCount = cart?.totalQuantity ?? 0;
  const appliedCodes = (cart?.discountCodes ?? []).filter((d) => d.applicable);
  const empty = lines.length === 0;

  const threshold = SITE.freeShippingThreshold;
  const unlocked = subtotal >= threshold && subtotal > 0;

  // ── Gift wrap (CP-3) — real: a configured variant becomes a charged line,
  // otherwise a `Gift wrap` cart attribute. Never a fabricated amount. ──
  const giftVariantId = SITE.giftWrap.variantId;
  const giftLine = giftVariantId ? lines.find((l) => l.merchandise.id === giftVariantId) : undefined;
  const giftWrapOn = giftVariantId
    ? !!giftLine
    : (cart?.attributes ?? []).some((a) => a.key === GIFT_WRAP_KEY && a.value === 'Yes');
  // The gift-wrap product line is represented by the toggle, so hide it from the
  // visible list — it still counts in the real subtotal.
  const visibleLines = giftLine ? lines.filter((l) => l.id !== giftLine.id) : lines;

  // ── Delivery (CP-2) — estimate only; Shopify sets the binding rate at
  // checkout. No fabricated price feeds the total. ──
  const methodFree = (m: (typeof DELIVERY)[number]) => {
    const o = m as { free?: boolean; freeOverThreshold?: boolean };
    return o.free === true || (o.freeOverThreshold === true && subtotal >= threshold);
  };

  // Total is the REAL cart total (goods after discount). Shipping + taxes are
  // added by Shopify at checkout — we never invent them here.
  const grandTotal = cartTotal;
  const displayTotal = useCountUp(grandTotal);
  const heroSave = discount;
  const progress = Math.min(100, threshold > 0 ? (subtotal / threshold) * 100 : 0);
  const remaining = Math.max(0, threshold - subtotal);

  // ── attribute helpers ──
  const mergeAttr = (key: string, value: string | null) => {
    const rest = (cart?.attributes ?? []).filter((a) => a.key !== key);
    return setCartAttributes(value ? [...rest, { key, value }] : rest);
  };

  const onToggleGift = async () => {
    if (giftVariantId) {
      if (giftLine) await removeItem(giftLine.id);
      else await addItem(giftVariantId, 1, { open: false });
    } else {
      await mergeAttr(GIFT_WRAP_KEY, giftWrapOn ? null : 'Yes');
    }
  };

  const onSelectDelivery = (key: ShipKey) => {
    setShipSel(key);
    const opt = DELIVERY.find((o) => o.key === key);
    if (opt) mergeAttr(DELIVERY_KEY, opt.label);
  };

  // Seed the selected delivery option once per cart from the saved attribute.
  const shipSeeded = useRef<string | null>(null);
  useEffect(() => {
    const id = cart?.id ?? null;
    if (!id || shipSeeded.current === id) return;
    shipSeeded.current = id;
    const pref = (cart?.attributes ?? []).find((a) => a.key === DELIVERY_KEY)?.value;
    const match = pref ? DELIVERY.find((o) => o.label === pref) : undefined;
    if (match) setShipSel(match.key);
  }, [cart?.id, cart?.attributes]);

  // ── actions ──
  const onSaveForLater = async (line: CartLine) => {
    const m = line.merchandise;
    const item: SavedItem = {
      merchandiseId: m.id,
      title: m.product.title,
      meta: optionText(line),
      image: (m.image ?? m.product.featuredImage)?.url ?? null,
      amount: m.price.amount,
      currency: m.price.currencyCode,
    };
    persistSaved([...saved.filter((s) => s.merchandiseId !== m.id), item]);
    await removeItem(line.id);
  };

  const onMoveToBag = async (item: SavedItem) => {
    persistSaved(saved.filter((s) => s.merchandiseId !== item.merchandiseId));
    await addItem(item.merchandiseId, 1, { open: false });
  };

  const onEmptyBag = async () => {
    for (const line of lines) await removeItem(line.id);
  };

  const onApplyCoupon = async () => {
    const code = coupon.trim().toUpperCase();
    if (!code) {
      setCouponNote({ tone: 'err', text: 'Enter a promo code.' });
      return;
    }
    const res = await applyDiscountCode([code], { open: false });
    const ok = (res.cart?.discountCodes ?? []).some(
      (d) => d.applicable && d.code.toUpperCase() === code,
    );
    if (ok) {
      setCouponNote({ tone: 'ok', text: 'Code applied — savings added below.' });
      setCoupon('');
    } else {
      setCouponNote({ tone: 'err', text: "That code isn't valid for this bag." });
    }
  };

  const onRemoveCoupon = async () => {
    await applyDiscountCode([], { open: false });
    setCouponNote(null);
  };

  // ── Mobile sticky checkout bar (CP-5) — reveal once the summary's own
  // checkout button scrolls out of view. IntersectionObserver avoids a
  // scroll handler entirely (no throttling needed). ──
  const summaryRef = useRef<HTMLElement | null>(null);
  const [summaryInView, setSummaryInView] = useState(true);
  useEffect(() => {
    const el = summaryRef.current;
    if (!el) {
      setSummaryInView(true);
      return;
    }
    const io = new IntersectionObserver(([e]) => setSummaryInView(e.isIntersecting), {
      threshold: 0,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [empty]);

  return (
    <>
      {/* ===================== CART HERO ===================== */}
      <section className="py-hero">
        <div className="container-mag">
          <span className="mag-label mb-[18px]">Shopping Bag · Issue N°02</span>
          <div className="flex flex-col items-start justify-between gap-10 md:flex-row">
            <h1 className="font-heading text-[clamp(54px,7.2vw,112px)] font-extrabold uppercase leading-[0.8] tracking-[-1.5px]">
              Your <em className="not-italic text-coral">Bag.</em>
            </h1>
            <p className="max-w-[430px] pt-3 text-base leading-[1.65] text-text-secondary">
              Review your selection, apply a code and choose how it ships. Everything updates live —
              no surprises at checkout.
            </p>
          </div>
          <div className="mt-[34px] flex flex-wrap items-start gap-[18px]">
            {[
              { b: String(itemCount), s: 'Items' },
              { b: money(subtotal, currency), s: 'Subtotal' },
              { b: empty ? '—' : unlocked ? 'Free' : '—', s: 'Shipping' },
              { b: money(heroSave, currency), s: 'You Save' },
            ].map((st, i) => (
              <div key={st.s} className={i < 3 ? 'border-r border-border pr-[18px]' : 'pr-[18px]'}>
                <b className="block font-heading text-[34px] font-extrabold leading-[0.9]">{st.b}</b>
                <span className="mt-[7px] block text-[10.5px] font-semibold uppercase tracking-[1.4px] text-text-muted">
                  {st.s}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== CART ===================== */}
      <section className="bg-surface pt-section-sm pb-section-sm">
        <div className="container-mag">
          {empty ? (
            <div className="rounded-xl bg-surface px-6 py-[70px] text-center shadow-xs ring-1 ring-inset ring-border">
              <ShoppingBag size={54} strokeWidth={1.3} className="mx-auto text-text-muted" />
              <h3 className="mb-2 mt-3.5 font-heading text-[38px] font-extrabold">Your bag is empty</h3>
              <p className="mb-[22px] text-sm text-text-secondary">
                Looks like you haven't added anything yet — explore the latest edit.
              </p>
              <a
                href="/products"
                className="btn inline-flex h-[52px] items-center gap-2 rounded-sm bg-coral px-7 text-white transition-fluid hover:bg-coral-hover"
              >
                Start Shopping <ArrowRight size={16} strokeWidth={2} />
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 items-start gap-[30px] lg:grid-cols-[1.55fr_0.85fr] lg:gap-[46px]">
              {/* ---------------- MAIN ---------------- */}
              <div>
                {/* Free-shipping progress */}
                <div className="mb-[22px] flex items-center gap-[18px] rounded-lg bg-surface p-[18px_22px] shadow-xs ring-1 ring-inset ring-border">
                  <span className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-pill bg-green-soft text-green">
                    <Truck size={20} strokeWidth={1.7} />
                  </span>
                  <div className="flex-1">
                    <p className="mb-2 text-[13px] text-text-secondary">
                      {remaining > 0 ? (
                        <>
                          Spend <b className="font-bold text-text-primary">{money(remaining, currency)}</b> more to
                          unlock <b className="font-bold text-text-primary">free standard shipping</b>
                        </>
                      ) : (
                        <b className="font-bold text-text-primary">You've unlocked free standard shipping.</b>
                      )}
                    </p>
                    <div
                      className={`h-[7px] overflow-hidden rounded-pill bg-surface-cool ${
                        unlocked ? 'cart-ship-unlocked' : ''
                      }`}
                    >
                      <div
                        className="h-full rounded-pill bg-green transition-[width] duration-500 ease-[var(--ease-out-soft)]"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* List head */}
                <div className="mb-0.5 flex items-end justify-between border-b border-border px-1 pb-3.5">
                  <h2 className="font-heading text-[30px] font-extrabold">Shopping Bag</h2>
                  <span className="text-[12.5px] font-semibold text-text-secondary">
                    {itemCount} {itemCount === 1 ? 'item' : 'items'}
                  </span>
                </div>

                {/* Lines */}
                <div className="flex flex-col">
                  {visibleLines.map((line) => (
                    <CartRow
                      key={line.id}
                      line={line}
                      currency={currency}
                      onSave={() => onSaveForLater(line)}
                    />
                  ))}
                </div>

                {/* Tools */}
                <div className="flex flex-wrap items-center justify-between gap-4 px-1 pt-[22px]">
                  <a
                    href="/products"
                    className="inline-flex items-center gap-2 text-[13px] font-bold text-text-primary transition-fluid hover:text-coral"
                  >
                    <ArrowLeft size={16} strokeWidth={1.8} /> Continue Shopping
                  </a>
                  <button
                    type="button"
                    onClick={onEmptyBag}
                    className="inline-flex items-center gap-2 text-[13px] font-bold text-text-muted transition-fluid hover:text-coral"
                  >
                    <Trash2 size={16} strokeWidth={1.8} /> Empty bag
                  </button>
                </div>

                {/* Order notes */}
                <div className="mt-[26px] rounded-lg bg-surface p-[22px] shadow-xs ring-1 ring-inset ring-border">
                  <h6 className="mb-3 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[1.6px]">
                    <PenLine size={16} strokeWidth={1.8} /> Order Notes
                  </h6>
                  <textarea
                    value={notes}
                    onChange={(e) => onNotes(e.target.value)}
                    placeholder="Add delivery instructions or a gift message (optional)…"
                    className="min-h-[84px] w-full resize-y rounded-sm bg-bg-light px-[15px] py-[13px] text-sm leading-[1.6] outline-none ring-1 ring-inset ring-border transition-shadow focus:ring-2 focus:ring-coral"
                  />
                </div>

                {/* Saved for later */}
                {saved.length > 0 && (
                  <div className="mt-[30px]">
                    <h6 className="mb-3.5 text-[11px] font-extrabold uppercase tracking-[1.6px] text-text-secondary">
                      Saved for later ({saved.length})
                    </h6>
                    <div className="flex flex-col gap-3">
                      {saved.map((item) => (
                        <div
                          key={item.merchandiseId}
                          className="flex items-center gap-4 rounded-md bg-surface p-[12px_16px] shadow-xs ring-1 ring-inset ring-border"
                        >
                          {item.image && (
                            <img
                              src={item.image}
                              alt={item.title}
                              className="h-16 w-[54px] flex-none rounded-xs object-cover"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <b className="block text-sm font-bold">{item.title}</b>
                            <span className="text-xs text-text-muted">{item.meta}</span>
                          </div>
                          <span className="font-heading text-[18px] font-extrabold">
                            {money(item.amount, item.currency)}
                          </span>
                          <button
                            type="button"
                            onClick={() => onMoveToBag(item)}
                            className="whitespace-nowrap text-xs font-bold text-coral hover:underline"
                          >
                            Move to bag
                          </button>
                          <button
                            type="button"
                            onClick={() => persistSaved(saved.filter((s) => s.merchandiseId !== item.merchandiseId))}
                            aria-label={`Remove ${item.title}`}
                            className="text-text-muted transition-fluid hover:text-coral"
                          >
                            <X size={16} strokeWidth={1.8} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ---------------- SUMMARY ---------------- */}
              <aside
                ref={summaryRef}
                className="overflow-hidden rounded-xl bg-surface shadow-sm ring-1 ring-inset ring-border lg:sticky lg:top-[96px]"
              >
                <div className="p-[28px_26px]">
                  <h3 className="mb-5 font-heading text-[26px] font-extrabold">Order Summary</h3>

                  {/* Coupon */}
                  <div className="mb-2.5 flex gap-2">
                    <input
                      type="text"
                      value={coupon}
                      onChange={(e) => setCoupon(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && onApplyCoupon()}
                      placeholder="Promo code"
                      aria-label="Promo code"
                      className="h-[46px] min-w-0 flex-1 rounded-sm bg-bg-light px-3.5 text-[13px] uppercase tracking-[1px] outline-none ring-1 ring-inset ring-border transition-shadow focus:ring-2 focus:ring-coral"
                    />
                    <button
                      type="button"
                      onClick={onApplyCoupon}
                      disabled={busy}
                      className="h-[46px] flex-none rounded-sm bg-dark px-[18px] text-[11.5px] font-extrabold uppercase tracking-[1px] text-white transition-colors duration-300 hover:bg-dark-hover disabled:opacity-60"
                    >
                      Apply
                    </button>
                  </div>
                  {couponNote && (
                    <div
                      className={`mb-3.5 min-h-[14px] text-xs font-semibold ${
                        couponNote.tone === 'ok' ? 'text-green' : 'text-coral'
                      }`}
                    >
                      {couponNote.text}
                    </div>
                  )}

                  {/* Applied codes */}
                  {appliedCodes.map((d) => (
                    <div
                      key={d.code}
                      className="mb-[18px] flex items-center justify-between rounded-sm bg-green-soft px-[13px] py-[9px] text-[12.5px] font-bold text-green-hover"
                    >
                      <span className="inline-flex items-center gap-[7px]">
                        <Percent size={15} strokeWidth={1.9} /> {d.code} applied
                      </span>
                      <button type="button" onClick={onRemoveCoupon} aria-label="Remove code">
                        <X size={15} strokeWidth={2} />
                      </button>
                    </div>
                  ))}

                  {/* Delivery (estimate — Shopify sets the binding rate at checkout) */}
                  <div className="mb-[18px] border-t border-border pt-[18px]">
                    <div className="mb-3 flex items-center justify-between">
                      <h6 className="text-[10.5px] font-extrabold uppercase tracking-[1.6px]">Delivery</h6>
                      <span className="text-[9.5px] font-bold uppercase tracking-[1.2px] text-text-muted">
                        Estimated
                      </span>
                    </div>
                    {DELIVERY.map((m) => {
                      const free = methodFree(m);
                      const on = m.key === shipSel;
                      return (
                        <button
                          type="button"
                          key={m.key}
                          onClick={() => onSelectDelivery(m.key)}
                          className={`mb-[9px] flex w-full items-center gap-[11px] rounded-sm px-[13px] py-[11px] text-left transition-fluid ring-inset ${
                            on
                              ? 'bg-coral-soft ring-2 ring-coral'
                              : 'ring-1 ring-border hover:ring-text-muted'
                          }`}
                        >
                          <span
                            className={`h-[18px] w-[18px] flex-none rounded-pill ring-inset ${
                              on ? 'ring-[5px] ring-coral' : 'ring-2 ring-border'
                            }`}
                          />
                          <span className="flex-1">
                            <b className="block text-[13px] font-bold">{m.label}</b>
                            <span className="text-[11.5px] text-text-muted">{m.eta}</span>
                          </span>
                          {free ? (
                            <span className="text-[13px] font-extrabold text-green">Free</span>
                          ) : (
                            <span className="text-[10.5px] font-semibold text-text-muted">At checkout</span>
                          )}
                        </button>
                      );
                    })}
                    <p className="text-[11px] text-text-muted">
                      Final shipping is calculated at checkout.
                    </p>
                  </div>

                  {/* Gift wrap — real: attribute (complimentary) or a configured charged variant */}
                  {SITE.giftWrap.enabled && (
                    <div className="mb-[18px] border-t border-border pt-[18px]">
                      <button
                        type="button"
                        onClick={onToggleGift}
                        disabled={busy}
                        aria-pressed={giftWrapOn}
                        className={`flex w-full items-center gap-3 rounded-sm p-[13px] text-left transition-fluid ring-inset disabled:opacity-60 ${
                          giftWrapOn ? 'bg-green-soft ring-2 ring-green' : 'ring-1 ring-border'
                        }`}
                      >
                        <Gift size={22} strokeWidth={1.7} className="text-green" />
                        <span className="flex-1">
                          <b className="block text-[13px] font-bold">{SITE.giftWrap.label}</b>
                          <span className="text-[11.5px] text-text-muted">
                            {SITE.giftWrap.note}
                            {!giftVariantId && ' · Complimentary'}
                          </span>
                        </span>
                        <span
                          className={`relative h-[22px] w-[38px] flex-none rounded-pill transition-colors duration-200 ${
                            giftWrapOn ? 'bg-green' : 'bg-border'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white transition-[left] duration-200 ${
                              giftWrapOn ? 'left-[18px]' : 'left-0.5'
                            }`}
                          />
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Rows — real Shopify values only; shipping + tax at checkout */}
                  <div className="border-t border-border pt-[18px]">
                    <Row label="Subtotal" value={money(subtotal, currency)} />
                    {discount > 0 && (
                      <Row
                        label={appliedCodes[0] ? `${appliedCodes[0].code} discount` : 'Discount'}
                        value={`−${money(discount, currency)}`}
                        accent
                      />
                    )}
                    <Row label="Shipping" value={unlocked ? 'Free' : 'Calculated at checkout'} />
                    <Row label="Taxes" value="Calculated at checkout" />
                  </div>

                  {/* Total */}
                  <div className="mt-1.5 flex items-end justify-between border-t border-border pt-4">
                    <span className="text-[13px] font-bold uppercase tracking-[0.5px]">Total</span>
                    <div className="text-right">
                      <b className="block font-heading text-[34px] font-extrabold leading-[0.9]">
                        {money(displayTotal, currency)}
                      </b>
                      <span className="mt-1 block text-[11px] text-text-muted">
                        Shipping &amp; taxes at checkout
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={checkout}
                    disabled={busy}
                    className="mt-[18px] flex h-14 w-full items-center justify-center gap-2.5 rounded-sm bg-coral text-[13px] font-extrabold uppercase tracking-[1.2px] text-white transition-colors duration-300 hover:bg-coral-hover disabled:opacity-60"
                  >
                    Proceed to Checkout <Lock size={16} strokeWidth={2} />
                  </button>

                  <div className="mt-3.5 flex items-center justify-center gap-[7px] text-xs text-text-muted">
                    <ShieldCheck size={15} strokeWidth={1.8} /> Secure 256-bit SSL checkout
                  </div>
                  <div className="mt-3.5 flex flex-wrap justify-center gap-2">
                    {['VISA', 'MASTERCARD', 'AMEX', 'PAYPAL', 'APPLE PAY'].map((p) => (
                      <span
                        key={p}
                        className="rounded-xs bg-surface-cool px-2.5 py-1.5 text-[9.5px] font-extrabold tracking-[0.5px] text-text-muted"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          )}
        </div>
      </section>

      {/* Mobile sticky checkout bar (CP-5) — sits above the BottomNav; hidden on
          desktop where the summary is sticky. Slides away while the summary's
          own checkout button is on screen. */}
      {!empty && (
        <div
          className={`fixed inset-x-0 bottom-[calc(58px_+_env(safe-area-inset-bottom))] z-40 border-t border-border bg-surface/95 px-4 py-3 shadow-[0_-4px_20px_rgba(9,10,11,0.08)] backdrop-blur-md transition-transform duration-300 md:bottom-0 lg:hidden ${
            summaryInView ? 'translate-y-[135%]' : 'translate-y-0'
          }`}
          aria-hidden={summaryInView}
        >
          <div className="container-mag flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="block text-[9.5px] font-bold uppercase tracking-[1.4px] text-text-muted">
                Total
              </span>
              <b className="font-heading text-[22px] font-extrabold leading-none tabular">
                {money(grandTotal, currency)}
              </b>
            </div>
            <button
              type="button"
              onClick={checkout}
              disabled={busy}
              tabIndex={summaryInView ? -1 : 0}
              className="flex h-12 max-w-[240px] flex-1 items-center justify-center gap-2 rounded-sm bg-coral text-[12.5px] font-extrabold uppercase tracking-[1px] text-white transition-fluid hover:bg-coral-hover disabled:opacity-60"
            >
              Checkout <ArrowRight size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ── Line row ──
function CartRow({
  line,
  currency,
  onSave,
}: {
  line: CartLine;
  currency: string;
  onSave: () => void;
}) {
  const busyLines = useStore($busyLines);
  const busy = !!busyLines[line.id];
  const m = line.merchandise;
  const image = (m.image ?? m.product.featuredImage)?.url ?? null;
  const meta = optionText(line);
  const unit = line.cost.amountPerQuantity?.amount ?? m.price.amount;
  const dp = lineDiscount(line);
  const maxQty = lineMaxQty(line);
  const lowStock = lineLowStock(line);
  const atMax = line.quantity >= maxQty;

  return (
    <div
      className={`grid grid-cols-[80px_1fr] gap-[14px] border-b border-border px-1 py-6 sm:grid-cols-[104px_1fr_auto] sm:gap-5 ${
        busy ? 'opacity-60' : ''
      }`}
    >
      <a
        href={`/products/${m.product.handle}`}
        className="block aspect-[3/4] overflow-hidden rounded-md bg-surface-cool"
      >
        {image && <img src={image} alt={m.product.title} className="h-full w-full object-cover" />}
      </a>

      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="text-[10.5px] font-extrabold uppercase tracking-[1.6px] text-coral">TAILORED</span>
        <a
          href={`/products/${m.product.handle}`}
          className="font-heading text-[22px] font-bold leading-none transition-fluid hover:text-coral"
        >
          {m.product.title}
        </a>
        {meta && <div className="text-[12.5px] text-text-muted">{meta}</div>}
        {line.attributes && line.attributes.length > 0 && (
          <ul className="space-y-0.5">
            {line.attributes.map((a) => (
              <li key={a.key} className="text-[12px] text-text-muted">
                <span className="font-semibold">{a.key}:</span> {a.value}
              </li>
            ))}
          </ul>
        )}
        {dp.allocations.length > 0 && (
          <ul className="space-y-0.5">
            {dp.allocations.map((a, i) => (
              <li key={i} className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-coral">
                <Percent size={12} strokeWidth={2} /> {a.label} −{money(a.amount, a.currency)}
              </li>
            ))}
          </ul>
        )}
        <div
          className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
            lowStock ? 'text-coral' : 'text-green'
          }`}
        >
          <CheckCircle2 size={14} strokeWidth={1.9} />
          {lowStock ? `Only ${lowStock} left` : m.availableForSale ? 'In stock' : 'Made to order'}
        </div>
        <div className="mt-auto flex gap-4 pt-2">
          <button
            type="button"
            onClick={onSave}
            disabled={busy}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary transition-fluid hover:text-coral disabled:opacity-50"
          >
            <Bookmark size={14} strokeWidth={1.8} /> Save for later
          </button>
          <button
            type="button"
            onClick={() => removeItem(line.id)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary transition-fluid hover:text-coral disabled:opacity-50"
          >
            <X size={14} strokeWidth={1.8} /> Remove
          </button>
        </div>
      </div>

      <div className="col-span-2 flex flex-row items-center justify-between gap-3.5 sm:col-span-1 sm:flex-col sm:items-end sm:justify-between">
        <div className="text-right">
          {dp.hasStrike && (
            <s className="block font-body text-[13px] font-medium text-text-muted">
              {money(dp.original, currency)}
            </s>
          )}
          <span
            className={`font-heading text-[22px] font-extrabold ${dp.hasStrike ? 'text-coral' : ''}`}
          >
            {money(dp.finalTotal, currency)}
          </span>
          <span className="block font-body text-[11.5px] font-medium text-text-muted">
            {money(unit, currency)} each
          </span>
        </div>
        <div className="inline-flex items-center rounded-sm bg-surface ring-1 ring-inset ring-border">
          <button
            type="button"
            onClick={() => updateItem(line.id, line.quantity - 1)}
            disabled={busy || line.quantity <= 1}
            aria-label="Decrease quantity"
            className="flex h-10 w-9 items-center justify-center text-[17px] disabled:opacity-40"
          >
            <Minus size={15} strokeWidth={2} />
          </button>
          <span className="min-w-[30px] text-center text-sm font-bold tabular">{line.quantity}</span>
          <button
            type="button"
            onClick={() => updateItem(line.id, line.quantity + 1)}
            disabled={busy || atMax}
            aria-label="Increase quantity"
            title={atMax ? 'No more stock available' : undefined}
            className="flex h-10 w-9 items-center justify-center text-[17px] disabled:opacity-40"
          >
            <Plus size={15} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={`mb-[11px] flex items-center justify-between text-[13.5px] ${
        accent ? 'text-green' : 'text-text-secondary'
      }`}
    >
      <span>{label}</span>
      <b className={`font-semibold ${accent ? 'text-green' : 'text-text-primary'}`}>{value}</b>
    </div>
  );
}
