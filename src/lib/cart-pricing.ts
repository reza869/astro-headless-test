// ============================================================
//  Cart line pricing helper (CD-2) — resolves the display price for
//  a cart line, accounting for merchant compare-at (sale) pricing and
//  cart-level line discount allocations, so both cart surfaces can show
//  a consistent strikethrough + per-line discount breakdown.
// ============================================================
import type { CartLine } from '~/lib/shopify/types';

export interface LineAllocationView {
  /** Discount code, automatic title, or a generic "Discount" fallback. */
  label: string;
  amount: string;
  currency: string;
}

export interface LineDiscountView {
  currency: string;
  /** Line total the shopper actually pays (after all discounts). */
  finalTotal: number;
  /** Highest "was" price to strike through (compare-at or pre-discount). */
  original: number;
  /** True when `original` is meaningfully above `finalTotal`. */
  hasStrike: boolean;
  /** Per-line discount allocations (code / automatic), amounts > 0. */
  allocations: LineAllocationView[];
}

/** Hard upper bound on the quantity a shopper can select for a cart line (CP-6),
 *  from live stock and the merchant's max quantity rule. Falls back to 99 when
 *  Shopify tracks neither (the server still rejects true over-ordering). */
export function lineMaxQty(line: CartLine): number {
  const m = line.merchandise;
  const avail =
    typeof m.quantityAvailable === 'number' && m.quantityAvailable > 0 ? m.quantityAvailable : 99;
  const ruleMax = m.quantityRule?.maximum ?? 0;
  const cap = ruleMax > 0 ? Math.min(avail, ruleMax) : avail;
  return Math.max(1, Math.min(cap, 99));
}

/** A small remaining-stock count worth surfacing as urgency ("Only N left"), or
 *  null when stock is untracked / comfortably high. */
export function lineLowStock(line: CartLine, floor = 5): number | null {
  const q = line.merchandise.quantityAvailable;
  return typeof q === 'number' && q > 0 && q <= floor ? q : null;
}

export function lineDiscount(line: CartLine): LineDiscountView {
  const currency = line.cost.totalAmount.currencyCode;
  const finalTotal = Number(line.cost.totalAmount.amount);
  const qty = line.quantity || 1;

  // Pre-cart-discount line price (quantity × unit selling price).
  const sub = line.cost.subtotalAmount ? Number(line.cost.subtotalAmount.amount) : finalTotal;
  // Merchant compare-at ("was") unit price × quantity, when the product is on sale.
  const compareUnit = line.cost.compareAtAmountPerQuantity
    ? Number(line.cost.compareAtAmountPerQuantity.amount)
    : 0;
  const compareTotal = compareUnit > 0 ? compareUnit * qty : 0;

  // Strike the highest "was" price — whichever of compare-at or the
  // pre-cart-discount subtotal is greater — against the final paid total.
  const original = Math.max(compareTotal, sub, finalTotal);

  const allocations: LineAllocationView[] = (line.discountAllocations ?? []).map((d) => ({
    label: d.code ?? d.title ?? 'Discount',
    amount: d.discountedAmount.amount,
    currency: d.discountedAmount.currencyCode,
  }));

  return {
    currency,
    finalTotal,
    original,
    // Guard against float noise so equal prices never render a redundant strike.
    hasStrike: original > finalTotal + 0.01,
    allocations,
  };
}
