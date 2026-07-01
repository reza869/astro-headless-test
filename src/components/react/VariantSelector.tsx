// ============================================================
//  VariantSelector — the PDP buy box. Option selection, quantity,
//  Add to cart (ink / primary) and Buy now (accent / express).
//  One island so option + qty state stays consistent.
// ============================================================
import { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import type { ProductOption, ProductVariant } from '~/lib/shopify/types';
import { formatMoney, isOnSale, discountPercent } from '~/lib/utils';
import { addItem, buyNow } from '~/stores/cart';
import QuantityStepper from './QuantityStepper';
import Spinner from './Spinner';

interface Props {
  options: ProductOption[];
  variants: ProductVariant[];
  currencyCode: string;
}

const isDefaultOnly = (options: ProductOption[]) =>
  options.length === 1 &&
  options[0].name === 'Title' &&
  options[0].optionValues.every((v) => v.name === 'Default Title');

function findVariant(variants: ProductVariant[], selected: Record<string, string>) {
  return variants.find((v) =>
    v.selectedOptions.every((o) => selected[o.name] === o.value),
  );
}

export default function VariantSelector({ options, variants, currencyCode }: Props) {
  const singleVariant = isDefaultOnly(options) || options.length === 0;

  // Default to the first available variant's options (or the first variant).
  const initial = useMemo(() => {
    const base = variants.find((v) => v.availableForSale) ?? variants[0];
    const map: Record<string, string> = {};
    base?.selectedOptions.forEach((o) => (map[o.name] = o.value));
    return map;
  }, [variants]);

  const [selected, setSelected] = useState<Record<string, string>>(initial);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [buying, setBuying] = useState(false);

  // No fallback to variants[0]: an unmatched option combo must read
  // as unavailable, never silently add a different variant/price.
  const variant = findVariant(variants, selected);
  const available = variant?.availableForSale ?? false;
  const onSale = isOnSale(variant?.price, variant?.compareAtPrice);
  const off = discountPercent(variant?.price, variant?.compareAtPrice);

  // Which option values lead to at least one purchasable variant.
  const valueAvailable = (optionName: string, value: string) =>
    variants.some(
      (v) =>
        v.availableForSale &&
        v.selectedOptions.some((o) => o.name === optionName && o.value === value),
    );

  const pick = (name: string, value: string) =>
    setSelected((prev) => ({ ...prev, [name]: value }));

  const handleAdd = async () => {
    if (!variant || !available) return;
    setAdding(true);
    await addItem(variant.id, quantity);
    setAdding(false);
  };

  const handleBuy = async () => {
    if (!variant || !available) return;
    setBuying(true);
    await buyNow(variant.id, quantity);
    // buyNow redirects; if it fails, clear the spinner.
    setBuying(false);
  };

  return (
    <div className="flex flex-col gap-7">
      {/* Price */}
      <div className="flex items-center gap-3">
        <span className="font-mono text-2xl font-medium tabular text-text-primary">
          {variant ? formatMoney(variant.price.amount, currencyCode) : '—'}
        </span>
        {onSale && variant?.compareAtPrice && (
          <>
            <s className="font-mono text-base text-text-muted tabular">
              {formatMoney(variant.compareAtPrice.amount, currencyCode)}
            </s>
            {off != null && (
              <span className="text-[11px] font-bold uppercase tracking-[1.8px]rounded-sm bg-coral px-2 py-1 leading-none text-white">
                −{off}%
              </span>
            )}
          </>
        )}
      </div>

      {/* Options */}
      {!singleVariant &&
        options.map((option) => (
          <fieldset key={option.id} className="border-0 p-0">
            <legend className="text-[11px] font-bold uppercase tracking-[1.8px]mb-3 flex w-full items-center justify-between text-text-secondary">
              <span>{option.name}</span>
              <span className="text-text-muted normal-case tracking-normal">
                {selected[option.name]}
              </span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {option.optionValues.map((ov) => {
                const active = selected[option.name] === ov.name;
                const possible = valueAvailable(option.name, ov.name);
                return (
                  <button
                    key={ov.id}
                    type="button"
                    onClick={() => pick(option.name, ov.name)}
                    aria-pressed={active}
                    aria-label={!possible && !active ? `${ov.name} (unavailable)` : ov.name}
                    className={[
                      'inline-flex h-11 items-center gap-1.5 rounded-md border px-4 text-sm transition-fluid',
                      active
                        ? 'border-dark bg-dark text-white'
                        : 'border-border bg-surface text-text-primary hover:border-dark',
                      !possible && !active ? 'text-text-muted line-through decoration-1' : '',
                    ].join(' ')}
                  >
                    {active && <Check size={15} strokeWidth={2} />}
                    {ov.name}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}

      {/* Quantity + availability */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-[1.8px]text-text-secondary">Quantity</span>
        <QuantityStepper value={quantity} onChange={setQuantity} min={1} max={20} />
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={handleAdd}
          disabled={!available || adding || buying}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-md bg-dark text-base font-medium text-white transition-fluid hover:bg-dark-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {adding ? <Spinner size={20} /> : available ? 'Add to cart' : 'Sold out'}
        </button>
        <button
          type="button"
          onClick={handleBuy}
          disabled={!available || adding || buying}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-md bg-coral text-base font-medium text-white transition-fluid hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {buying ? <Spinner size={20} /> : 'Buy it now'}
        </button>
      </div>

      <p className="flex items-center gap-2 text-xs text-text-secondary">
        <span
          className={`inline-block h-2 w-2 rounded-full ${available ? 'bg-green' : 'bg-text-muted'}`}
        />
        {available ? 'In stock — ships within 48 hours' : 'Currently out of stock'}
      </p>
    </div>
  );
}
