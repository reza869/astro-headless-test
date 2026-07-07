// ============================================================
//  shop-catalogue — shared flattening for the designed catalogue
//  pages (/collections/all + /collections/[handle]). Turns the
//  enriched ProductCard list from getShopProducts() into the lean,
//  client-friendly shape the control deck + grid consume.
// ============================================================
import { isOnSale, discountPercent } from '~/lib/utils';
import type { ProductCard } from '~/lib/shopify/types';

/** Lean, JSON-serialisable product shape used by the shop controller. */
export interface ShopItem {
  id: string;
  handle: string;
  title: string;
  /** Real collection titles the product belongs to (powers Browse tabs). */
  cats: string[];
  /** Card eyebrow — first collection, else product type / vendor. */
  type: string;
  vendor: string;
  price: number;
  /** Highest variant price — drives the "From $X" range label (PC-4). */
  priceMax: number;
  was: number | null;
  off: number | null;
  img: string;
  /** Second image for the hover swap (PC-1); null when there isn't one. */
  img2: string | null;
  alt: string;
  inStock: boolean;
  variantId: string | null;
  /** A variant choice actually matters → route "Add" to Quick View (PC-6). */
  requiresChoice: boolean;
  isNew: boolean;
  /** Aggregate rating from the reviews metafield (PC-3); null when unset. */
  rating: number | null;
  ratingCount: number | null;
  colors: { name: string; hex: string }[];
  createdAt: string | null;
}

// Resolve hex for a colour value: Shopify swatch first, then a small
// name→hex table for stores that don't configure swatches, else null (skip).
const NAME_HEX: Record<string, string> = {
  black: '#1b1d1f', white: '#f4f4f0', ivory: '#f1e7d6', cream: '#f1e7d6', beige: '#e8dcc5',
  tan: '#c8b89a', camel: '#c2a878', sand: '#cbb68f', brown: '#6b4f3a', chocolate: '#4a3324',
  grey: '#9a9a9a', gray: '#9a9a9a', charcoal: '#3a3d40', slate: '#3a4250', silver: '#c9ccce',
  navy: '#23304d', blue: '#4576e7', teal: '#2f7d75', green: '#5a9761', olive: '#6f7a3a',
  red: '#c0392b', coral: '#d95846', pink: '#e3a1a8', purple: '#6d5b97', lilac: '#b3a6d4',
  yellow: '#e3b94e', gold: '#c9a227', orange: '#d2783c', burgundy: '#6e2230', maroon: '#6e2230',
};
const hexFor = (c: { name: string; hex: string | null }): string | null =>
  c.hex ?? NAME_HEX[c.name?.trim().toLowerCase()] ?? null;

// Never surface internal/demo vendor names ("PARTNERS-DEMO" etc.) — treat them
// as "no vendor" so they don't leak into the card meta, the "Designers" facet,
// or the type eyebrow. A real store's real vendors pass through untouched.
const cleanVendor = (v?: string) => (v && !/demo|partner|sample|test/i.test(v) ? v : '');

// A tag that marks a product as "new" (drives the New badge + Newest sort).
const NEW_RE = /(^|[-\s])new($|[-\s])|new[-\s]?in|new[-\s]?arriv/i;

/** Catch-all collections that would just duplicate the All tab. */
const HIDE_COLLECTION = /^(all|frontpage)$/i;

/** Flatten the enriched card list into the deck's client shape. */
export function toShopItems(raw: ProductCard[]): ShopItem[] {
  return raw.map((p) => {
    const min = p.priceRange.minVariantPrice;
    const max = p.priceRange.maxVariantPrice;
    const compareAt = p.compareAtPriceRange?.minVariantPrice ?? null;
    const onSale = isOnSale(min, compareAt);
    const cats = (p.collections ?? [])
      .filter((c) => !HIDE_COLLECTION.test(c.handle))
      .map((c) => c.title);
    const vendor = cleanVendor(p.vendor);
    return {
      id: p.id,
      handle: p.handle,
      title: p.title,
      cats,
      type: cats[0] || (p.productType && p.productType.trim()) || vendor || 'Catalogue',
      vendor,
      price: Number(min.amount),
      priceMax: Number(max.amount),
      was: onSale ? Number(compareAt!.amount) : null,
      off: onSale ? discountPercent(min, compareAt) : null,
      img: p.featuredImage?.url || '',
      img2: p.secondImage?.url || null,
      alt: p.featuredImage?.altText || p.title,
      inStock: p.availableForSale,
      variantId: p.variantId || null,
      requiresChoice: p.requiresChoice ?? false,
      isNew: p.isNew === true || (p.tags || []).some((t) => NEW_RE.test(t)),
      rating: typeof p.rating === 'number' ? p.rating : null,
      ratingCount: p.ratingCount ?? null,
      colors: (p.colors || [])
        .map((c) => ({ name: c.name, hex: hexFor(c) }))
        .filter((c): c is { name: string; hex: string } => Boolean(c.hex)),
      createdAt: p.createdAt || null,
    };
  });
}

/** Currency code of the catalogue (first product), defaulting to USD. */
export function catalogueCurrency(raw: ProductCard[]): string {
  return raw[0]?.priceRange.minVariantPrice.currencyCode || 'USD';
}
