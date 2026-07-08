import clsx, { type ClassValue } from 'clsx';

/** Tailwind-friendly conditional class joiner. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

/** Format a money value using the buyer's currency. */
export function formatMoney(
  amount: string | number | null | undefined,
  currencyCode = 'USD',
  locale = 'en-US',
): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    // Render the currency's own symbol (৳, €, ¥, ₹, £) instead of the ISO code
    // that en-US falls back to for non-US currencies (e.g. "BDT 520" → "৳520").
    // Falls back to the code when a currency has no narrow symbol (e.g. AED).
    currencyDisplay: 'narrowSymbol',
    // Keep cents only when the amount actually has them.
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
  }).format(n);
}

/** True when compareAtPrice is a real, higher price (Shopify returns "0.0"/null otherwise). */
export function isOnSale(
  price?: { amount: string } | null,
  compareAt?: { amount: string } | null,
): boolean {
  const p = Number(price?.amount);
  const c = Number(compareAt?.amount);
  return Number.isFinite(p) && Number.isFinite(c) && c > p;
}

/** Discount percentage as a rounded integer, or null when not a meaningful (>=1%) markdown. */
export function discountPercent(
  price?: { amount: string } | null,
  compareAt?: { amount: string } | null,
): number | null {
  if (!isOnSale(price, compareAt)) return null;
  const p = Number(price!.amount);
  const c = Number(compareAt!.amount);
  const pct = Math.round(((c - p) / c) * 100);
  return pct >= 1 ? pct : null;
}

/** Extract the numeric id from a Shopify gid:// global id. */
export function parseGid(gid: string): string {
  return gid?.split('/').pop() ?? gid;
}
