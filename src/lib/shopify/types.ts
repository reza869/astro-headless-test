// ============================================================
//  Shopify Storefront API — flattened domain types (2026-04)
// ============================================================
// These describe the *clean* shapes our transforms produce, not
// the raw edges/node GraphQL envelopes.

export interface Money {
  amount: string;
  currencyCode: string;
}

export interface Image {
  id?: string;
  url: string;
  altText?: string | null;
  width?: number | null;
  height?: number | null;
}

export interface SelectedOption {
  name: string;
  value: string;
}

/** Purchase quantity rules for a variant (min / max / step) — MP-8. */
export interface QuantityRule {
  minimum: number;
  maximum?: number | null;
  increment: number;
}

export interface ProductVariant {
  id: string;
  title: string;
  sku?: string | null;
  barcode?: string | null;
  availableForSale: boolean;
  quantityAvailable?: number | null;
  /** True when the variant is out of stock but sells on a "continue" policy. */
  currentlyNotInStock?: boolean;
  /** Min/max/increment purchase rules, when the merchant sets them. */
  quantityRule?: QuantityRule | null;
  selectedOptions: SelectedOption[];
  price: Money;
  compareAtPrice?: Money | null;
  image?: Image | null;
}

/** A product media node — image, hosted video, external video, or 3D model. */
export interface ProductMedia {
  type: 'image' | 'video' | 'external_video' | 'model_3d';
  alt?: string | null;
  previewImage?: Image | null;
  /** For image media. */
  image?: Image | null;
  /** For Video / Model3d — playable source files. */
  sources?: { url: string; mimeType?: string | null }[];
  /** For ExternalVideo (YouTube / Vimeo). */
  embeddedUrl?: string | null;
  host?: string | null;
}

/**
 * Optional editorial facts read from Shopify product metafields. Every field
 * is optional — the PDP hides the corresponding element when the merchant
 * hasn't set it (no fabricated defaults). Namespaces:
 *   reviews.rating, meta.product_new_badge, custom.* (the rest).
 */
export interface ProductMetafields {
  rating?: string;
  ratingCount?: string;
  newBadge?: string;
  material?: string;
  lining?: string;
  weight?: string;
  origin?: string;
  care?: string;
  modelNote?: string;
  dispatch?: string;
  unitsSold?: string;
  /** Newline-separated "Details & Fit" bullet points. */
  fitNotes?: string;
  /** ISO datetime the sale/drop countdown ends (MP-22). */
  countdown?: string;
  /** Discount code surfaced in a copy-to-clipboard block (MP-23). */
  promoCode?: string;
  /** Per-product size-guide HTML sourced from a metafield (MP-29). */
  sizeGuide?: string;
  /** "Label: value" lines (one per row) for the spec table (MP-18). */
  specification?: string;
  /** Newline-separated personalization field labels (MP-24). */
  personalization?: string;
}

export interface OptionSwatch {
  /** Merchant-defined hex/CSS colour, when set on the option value. */
  color?: string | null;
  /** Preview image URL for image-based swatches (patterns/textures). */
  image?: string | null;
}

export interface ProductOptionValue {
  id: string;
  name: string;
  /** Real Shopify swatch (colour or image) — preferred over the name→hex map. */
  swatch?: OptionSwatch | null;
}

export interface ProductOption {
  id: string;
  name: string;
  optionValues: ProductOptionValue[];
}

export interface Seo {
  title?: string | null;
  description?: string | null;
}

export interface Product {
  id: string;
  title: string;
  handle: string;
  description?: string;
  descriptionHtml?: string;
  vendor?: string;
  productType?: string;
  tags?: string[];
  availableForSale: boolean;
  featuredImage?: Image | null;
  images: Image[];
  /** Ordered media (images + videos + 3D) — drives video slides on the PDP. */
  media?: ProductMedia[];
  priceRange: {
    minVariantPrice: Money;
    maxVariantPrice: Money;
  };
  compareAtPriceRange?: {
    minVariantPrice: Money;
  };
  options: ProductOption[];
  variants: ProductVariant[];
  seo?: Seo;
  /** Editorial facts from product metafields (all optional; hidden when unset). */
  metafields?: ProductMetafields;
}

/** Lightweight product shape used in grids/cards. */
export interface ProductCard {
  id: string;
  title: string;
  handle: string;
  vendor?: string;
  availableForSale: boolean;
  /** First variant id — enables quick add-to-cart straight from the grid. */
  variantId?: string | null;
  featuredImage?: Image | null;
  /** Second gallery image — powers the card hover-swap (PC-1). Null when the
   *  product has only one image (or the 2nd equals the featured image). */
  secondImage?: Image | null;
  priceRange: {
    minVariantPrice: Money;
    maxVariantPrice: Money;
  };
  compareAtPriceRange?: {
    minVariantPrice: Money;
  };
  /** True when a variant choice actually matters (some option has >1 value) —
   *  the card routes "Add" to Quick View rather than blindly adding variant 1. */
  requiresChoice?: boolean;
  /** Date-gated "New" flag from the meta.product_new_badge metafield (PC-5). */
  isNew?: boolean;
  /** Aggregate rating from the reviews.rating / rating_count metafields (PC-3);
   *  null when the merchant hasn't synced a rating metafield. */
  rating?: number | null;
  ratingCount?: number | null;
  /** Product type / category label (PC-9). */
  productType?: string;
  tags?: string[];
  createdAt?: string;
  /** Collections this product belongs to — powers the catalogue Browse tabs. */
  collections?: { title: string; handle: string }[];
  /** Colour option values flattened to { name, hex } (hex from the Shopify
   *  swatch when set, else null for the consumer to resolve/skip). */
  colors?: { name: string; hex: string | null }[];
}

export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string | null;
  endCursor?: string | null;
}

/** A flattened paginated list. */
export interface Paginated<T> {
  items: T[];
  pageInfo: PageInfo;
}

export interface CollectionFilterValue {
  id: string;
  label: string;
  count: number;
  input: string;
}

export interface CollectionFilter {
  id: string;
  label: string;
  type: string;
  values: CollectionFilterValue[];
}

export interface Collection {
  id: string;
  title: string;
  handle: string;
  description?: string;
  descriptionHtml?: string;
  image?: Image | null;
  seo?: Seo;
}

export interface CollectionWithProducts extends Collection {
  products: Paginated<ProductCard>;
  filters?: CollectionFilter[];
}

// ── Cart ────────────────────────────────────────────────────

export interface CartLineMerchandise {
  id: string;
  title: string;
  availableForSale: boolean;
  selectedOptions: SelectedOption[];
  price: Money;
  image?: Image | null;
  product: {
    id: string;
    title: string;
    handle: string;
    featuredImage?: Image | null;
  };
}

export interface CartLine {
  id: string;
  quantity: number;
  cost: {
    totalAmount: Money;
    amountPerQuantity: Money;
  };
  merchandise: CartLineMerchandise;
  /** Line-item properties (personalization / gift notes) — MP-24. */
  attributes?: { key: string; value: string }[];
}

export interface Cart {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  note?: string | null;
  discountCodes?: { applicable: boolean; code: string }[];
  discountAllocations?: { discountedAmount: Money }[];
  cost: {
    subtotalAmount: Money;
    totalAmount: Money;
  };
  lines: CartLine[];
}

// ── Navigation / content ────────────────────────────────────

export interface MenuItem {
  id: string;
  title: string;
  url: string;
  type: string;
  items: MenuItem[];
}

export interface Menu {
  id: string;
  title: string;
  items: MenuItem[];
}

export interface Shop {
  name: string;
  description?: string;
  primaryDomain: { url: string; host: string };
}

// ── Blog / articles ─────────────────────────────────────────

export interface ArticleAuthor {
  name: string;
  bio?: string | null;
}

/** Listing/related-rail shape — no body, just the teaser fields. */
export interface ArticleCard {
  id: string;
  handle: string;
  title: string;
  /** Manual excerpt, falling back to a truncated body teaser. */
  excerpt: string;
  publishedAt: string;
  tags: string[];
  image?: Image | null;
  author?: ArticleAuthor | null;
  /** Estimated reading time in minutes (from the body word count). */
  readMinutes: number;
  /** Parent blog — used to build canonical URLs / "filed under" labels. */
  blogHandle: string;
  blogTitle: string;
}

/** Full article — adds the rendered body + SEO for the detail page. */
export interface Article extends ArticleCard {
  contentHtml: string;
  seo?: { title?: string | null; description?: string | null };
}

// ── Sort options surfaced in the UI ─────────────────────────

export interface SortOption {
  label: string;
  value: string;
  sortKey: string;
  reverse: boolean;
}
