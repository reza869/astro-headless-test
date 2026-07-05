// ============================================================
//  QuickViewModal — global product preview. Opened by the card's
//  search icon via a window 'quickview:open' CustomEvent; lazy-fetches
//  full product detail from /api/products/:handle, lets the shopper pick
//  options, and adds to cart (closing itself + opening the drawer).
// ============================================================
import { useEffect, useMemo, useState } from 'react';
import { X, Star, Check } from 'lucide-react';
import type { Product, ProductOption, ProductVariant } from '~/lib/shopify/types';
import { formatMoney, isOnSale, discountPercent } from '~/lib/utils';
import { addItem } from '~/stores/cart';
import { lockScroll, unlockScroll } from '~/lib/scroll-lock';
import { useFocusTrap } from './useFocusTrap';
import Spinner from './Spinner';

// Map common colour names to a swatch fill; fall back to the raw value
// (many Shopify colours are valid CSS colour keywords), then to grey.
const COLOR_HEX: Record<string, string> = {
  black: '#151719', white: '#ffffff', ivory: '#f4efe3', cream: '#efe7d6',
  beige: '#d8c4a5', tan: '#c9a87c', camel: '#b58a5a', brown: '#6f4e37',
  green: '#3f7d5c', olive: '#6b7a4a', sage: '#9aa987', coral: '#d95846',
  red: '#c0392b', burgundy: '#7b1e3b', pink: '#e6a4b4', blush: '#e7c4c4',
  blue: '#2f4b7c', navy: '#1f2a44', denim: '#3b5a7a', grey: '#8a8f94',
  gray: '#8a8f94', charcoal: '#3a3d40', yellow: '#e8c468', orange: '#e08a3c',
};
const swatchColor = (name: string) => COLOR_HEX[name.toLowerCase()] ?? name.toLowerCase();
const isColorOption = (name: string) => /colou?r/i.test(name);

function findVariant(variants: ProductVariant[], selected: Record<string, string>) {
  return variants.find((v) => v.selectedOptions.every((o) => selected[o.name] === o.value));
}

export default function QuickViewModal() {
  const [handle, setHandle] = useState<string | null>(null);
  const open = handle !== null;
  const closeQuickView = () => setHandle(null);

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);

  const panelRef = useFocusTrap<HTMLDivElement>(open);

  // Open on the global CustomEvent dispatched by any product card. Fully
  // decoupled from the Astro markup — no shared import, so a card can never
  // crash this island (or vice-versa).
  useEffect(() => {
    const onOpen = (e: Event) => {
      const h = (e as CustomEvent<{ handle?: string }>).detail?.handle;
      if (h) setHandle(h);
    };
    window.addEventListener('quickview:open', onOpen);
    return () => window.removeEventListener('quickview:open', onOpen);
  }, []);

  // Fetch full detail whenever a new handle is requested.
  useEffect(() => {
    if (!handle) return;
    let active = true;
    const ctrl = new AbortController();
    setProduct(null);
    setError(null);
    setLoading(true);
    fetch(`/api/products/${encodeURIComponent(handle)}`, {
      headers: { accept: 'application/json' },
      signal: ctrl.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!active) return;
        if (data.product) {
          const p = data.product as Product;
          setProduct(p);
          const base = p.variants.find((v) => v.availableForSale) ?? p.variants[0];
          const map: Record<string, string> = {};
          base?.selectedOptions.forEach((o) => (map[o.name] = o.value));
          setSelected(map);
        } else {
          setError(data.error ?? 'Product unavailable');
        }
      })
      .catch((e: unknown) => {
        if (active && (e as Error)?.name !== 'AbortError') setError('Could not load product');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      ctrl.abort();
    };
  }, [handle]);

  // Esc to close + lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeQuickView();
    document.addEventListener('keydown', onKey);
    lockScroll();
    return () => {
      document.removeEventListener('keydown', onKey);
      unlockScroll();
    };
  }, [open]);

  const variant = useMemo(
    () => (product ? findVariant(product.variants, selected) : undefined),
    [product, selected],
  );
  const singleVariant =
    !product ||
    product.options.length === 0 ||
    (product.options.length === 1 && product.options[0].name === 'Title');

  const available = variant?.availableForSale ?? false;
  const currency = variant?.price.currencyCode ?? product?.priceRange.minVariantPrice.currencyCode ?? 'USD';
  const onSale = isOnSale(variant?.price, variant?.compareAtPrice);
  const off = discountPercent(variant?.price, variant?.compareAtPrice);
  const category = product?.productType || product?.vendor || '';
  const image = product?.featuredImage ?? product?.images?.[0] ?? null;

  const valueAvailable = (optionName: string, value: string) =>
    product?.variants.some(
      (v) =>
        v.availableForSale &&
        v.selectedOptions.some((o) => o.name === optionName && o.value === value),
    ) ?? false;

  const pick = (name: string, value: string) =>
    setSelected((prev) => ({ ...prev, [name]: value }));

  const handleAdd = async () => {
    if (!variant || !available) return;
    setAdding(true);
    await addItem(variant.id, 1); // opens the CartDrawer on success
    setAdding(false);
    closeQuickView();
  };

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center p-4 ${open ? '' : 'pointer-events-none'}`}
      aria-hidden={!open}
      inert={!open}
    >
      {/* Backdrop */}
      <div
        onClick={closeQuickView}
        className={`absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={product?.title ?? 'Quick view'}
        className={`relative grid max-h-[90vh] w-full max-w-[850px] grid-cols-1 gap-8 overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl outline-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:grid-cols-2 md:p-8 ${
          open ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        <button
          type="button"
          onClick={closeQuickView}
          aria-label="Close quick view"
          className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-surface text-text-primary shadow-xs transition-fluid hover:bg-dark hover:text-white"
        >
          <X size={19} strokeWidth={1.8} />
        </button>

        {loading && (
          <div className="col-span-full grid min-h-[360px] place-items-center text-text-muted">
            <Spinner size={28} />
          </div>
        )}

        {error && !loading && (
          <div className="col-span-full grid min-h-[240px] place-items-center text-center text-sm text-text-secondary">
            {error}
          </div>
        )}

        {product && !loading && (
          <>
            {/* Left — image */}
            <div className="overflow-hidden rounded-2xl bg-surface-cool">
              {image ? (
                <img
                  src={image.url}
                  alt={image.altText ?? product.title}
                  className="h-full max-h-[520px] w-full object-cover"
                />
              ) : (
                <div className="grid aspect-[3/4] place-items-center text-text-muted">No image</div>
              )}
            </div>

            {/* Right — meta + buy */}
            <div className="flex flex-col">
              {category && (
                <span className="text-[11px] font-bold uppercase tracking-[1.6px] text-green">
                  {category}
                </span>
              )}
              <h2 className="mt-2 font-heading text-[30px] font-bold leading-[0.98] text-text-primary">
                {product.title}
              </h2>

              {/* Rating (decorative — Storefront API exposes no reviews) */}
              <div className="mt-2 flex items-center gap-1 text-coral" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={15} fill="currentColor" strokeWidth={0} />
                ))}
              </div>

              {/* Price */}
              <div className="mt-4 flex items-center gap-3">
                <span className="text-2xl font-bold tabular text-text-primary">
                  {variant ? formatMoney(variant.price.amount, currency) : '—'}
                </span>
                {onSale && variant?.compareAtPrice && (
                  <>
                    <s className="text-base text-text-muted tabular">
                      {formatMoney(variant.compareAtPrice.amount, currency)}
                    </s>
                    {off != null && (
                      <span className="rounded-sm bg-coral px-2 py-1 text-[11px] font-bold uppercase leading-none tracking-[1px] text-white">
                        −{off}%
                      </span>
                    )}
                  </>
                )}
              </div>

              {product.description && (
                <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-text-secondary">
                  {product.description}
                </p>
              )}

              {/* Options — colour as swatches, everything else as capsules */}
              {!singleVariant &&
                product.options.map((option: ProductOption) => (
                  <fieldset key={option.id} className="mt-6 border-0 p-0">
                    <legend className="mb-2.5 text-[11px] font-bold uppercase tracking-[1.6px] text-text-secondary">
                      {option.name}
                    </legend>
                    <div className="flex flex-wrap gap-2.5">
                      {option.optionValues.map((ov) => {
                        const active = selected[option.name] === ov.name;
                        const possible = valueAvailable(option.name, ov.name);
                        if (isColorOption(option.name)) {
                          return (
                            <button
                              key={ov.id}
                              type="button"
                              onClick={() => pick(option.name, ov.name)}
                              aria-pressed={active}
                              aria-label={ov.name}
                              title={ov.name}
                              className={`relative grid h-8 w-8 place-items-center rounded-full ring-1 ring-inset ring-black/10 transition-fluid ${
                                active ? 'ring-2 ring-dark ring-offset-2' : ''
                              } ${!possible && !active ? 'opacity-40' : ''}`}
                              style={{ backgroundColor: swatchColor(ov.name) }}
                            >
                              {active && (
                                <Check
                                  size={14}
                                  strokeWidth={3}
                                  className="text-white mix-blend-difference"
                                />
                              )}
                            </button>
                          );
                        }
                        return (
                          <button
                            key={ov.id}
                            type="button"
                            onClick={() => pick(option.name, ov.name)}
                            aria-pressed={active}
                            className={`inline-flex h-10 min-w-[44px] items-center justify-center rounded-md border px-3 text-sm font-semibold transition-fluid ${
                              active
                                ? 'border-dark bg-dark text-white'
                                : 'border-border bg-surface text-text-primary hover:border-dark'
                            } ${!possible && !active ? 'text-text-muted line-through decoration-1' : ''}`}
                          >
                            {ov.name}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                ))}

              {/* Add to bag */}
              <button
                type="button"
                onClick={handleAdd}
                disabled={!available || adding}
                className="mt-7 flex h-14 w-full items-center justify-center gap-2 rounded-md bg-coral text-base font-bold uppercase tracking-[1px] text-white transition-fluid hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {adding ? <Spinner size={20} /> : available ? 'Add to Bag' : 'Sold out'}
              </button>

              <a
                href={`/products/${product.handle}`}
                className="mt-3 text-center text-sm text-text-secondary underline-offset-4 transition-fluid hover:text-text-primary hover:underline"
              >
                View full details
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
