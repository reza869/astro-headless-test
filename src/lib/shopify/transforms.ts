// ============================================================
//  Transforms — flatten Shopify edges/node envelopes into the
//  clean domain shapes defined in types.ts.
// ============================================================
import type {
  Article,
  ArticleCard,
  Cart,
  CartLine,
  Collection,
  PageInfo,
  Paginated,
  Product,
  ProductCard,
  ProductMedia,
  ProductVariant,
} from './types';

interface Edge<T> {
  cursor?: string;
  node: T;
}
interface Connection<T> {
  edges?: Edge<T>[];
  pageInfo?: PageInfo;
}

/** Pull the node list out of a Relay-style connection. Defaults to `any`
 *  nodes so callers mapping raw GraphQL shapes (mapProductCard, etc.) type
 *  cleanly; pass an explicit T for stronger typing. */
export function nodes<T = any>(connection?: Connection<T> | null): T[] {
  return connection?.edges?.map((e) => e.node) ?? [];
}

const EMPTY_PAGE_INFO: PageInfo = {
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
};

/** Flatten a connection into { items, pageInfo }. */
export function paginate<TRaw, TOut>(
  connection: Connection<TRaw> | null | undefined,
  map: (node: TRaw) => TOut,
): Paginated<TOut> {
  return {
    items: nodes(connection).map(map),
    pageInfo: connection?.pageInfo ?? EMPTY_PAGE_INFO,
  };
}

// Raw shapes only need the connection-ish bits typed loosely.
type Raw = Record<string, any>;

/** Normalise a raw Storefront swatch ({ color, image { previewImage { url } } })
 *  into the flat { color, image } domain shape (or null when unset). */
function mapSwatch(raw: Raw | null | undefined) {
  if (!raw) return null;
  const image = raw.image?.previewImage?.url ?? null;
  const color = raw.color ?? null;
  if (!color && !image) return null;
  return { color, image };
}

/** Normalise product options + their swatches to the domain shape. */
function mapOptions(options?: Raw[]) {
  if (!Array.isArray(options)) return [];
  return options.map((o) => ({
    id: o.id,
    name: o.name,
    optionValues: (o.optionValues ?? []).map((v: Raw) => ({
      id: v.id,
      name: v.name,
      swatch: mapSwatch(v.swatch),
    })),
  }));
}

/** Flatten the "Colour" product option to { name, hex }. Returns [] when the
 *  product has no colour option (e.g. a query that omits options). */
function deriveColors(options?: Raw[]): { name: string; hex: string | null }[] {
  if (!Array.isArray(options)) return [];
  const opt = options.find((o) => /colou?r/i.test(o?.name ?? ''));
  if (!Array.isArray(opt?.optionValues)) return [];
  return opt!.optionValues.map((v: Raw) => ({ name: v.name, hex: v.swatch?.color ?? null }));
}

/** True when a variant choice genuinely matters — some real (non-Title) option
 *  exposes more than one value, so blindly adding variant 1 could be wrong. */
function deriveRequiresChoice(options?: Raw[]): boolean {
  if (!Array.isArray(options)) return false;
  return options
    .filter((o) => o?.name && o.name !== 'Title')
    .some((o) => (o.optionValues?.length ?? 0) > 1);
}

/** Fold a card's `metafields(identifiers)` array into the fields the grid needs. */
function cardMetafields(raw: unknown): {
  isNew: boolean;
  rating: number | null;
  ratingCount: number | null;
} {
  const byKey: Record<string, string> = {};
  if (Array.isArray(raw)) {
    for (const m of raw) {
      if (m?.key && typeof m.value === 'string' && m.value.trim()) {
        byKey[`${m.namespace}.${m.key}`] = m.value.trim();
      }
    }
  }
  const newBadge = byKey['meta.product_new_badge'];
  const ratingRaw = Number(byKey['reviews.rating']);
  const countRaw = Number(byKey['reviews.rating_count']);
  return {
    isNew: newBadge === 'true' || newBadge === '1',
    rating: Number.isFinite(ratingRaw) && ratingRaw > 0 ? ratingRaw : null,
    ratingCount: Number.isFinite(countRaw) && countRaw > 0 ? countRaw : null,
  };
}

export function mapProductCard(p: Raw): ProductCard {
  const options = Array.isArray(p.options) ? p.options : undefined;
  // Second gallery image for the hover swap — skip it when it's the same asset
  // as the featured image (nothing to cross-fade to).
  const gallery = nodes(p.images);
  const featuredUrl = p.featuredImage?.url;
  const secondImage = gallery.find((i: Raw) => i?.url && i.url !== featuredUrl) ?? null;
  const mf = cardMetafields(p.metafields);
  return {
    id: p.id,
    title: p.title,
    handle: p.handle,
    vendor: p.vendor,
    availableForSale: p.availableForSale ?? true,
    variantId: nodes(p.variants)[0]?.id ?? null,
    featuredImage: p.featuredImage ?? null,
    secondImage,
    priceRange: p.priceRange,
    compareAtPriceRange: p.compareAtPriceRange,
    requiresChoice: options ? deriveRequiresChoice(options) : undefined,
    isNew: mf.isNew || undefined,
    rating: mf.rating,
    ratingCount: mf.ratingCount,
    // Enriched facets — populated only by the shop catalogue query.
    productType: p.productType ?? undefined,
    tags: p.tags ?? undefined,
    createdAt: p.createdAt ?? undefined,
    collections: p.collections
      ? (p.collections.nodes ?? []).map((c: Raw) => ({ title: c.title, handle: c.handle }))
      : undefined,
    colors: options ? deriveColors(options) : undefined,
  };
}

export function mapVariant(v: Raw): ProductVariant {
  return {
    id: v.id,
    title: v.title,
    sku: v.sku ?? null,
    barcode: v.barcode ?? null,
    availableForSale: v.availableForSale ?? false,
    quantityAvailable: v.quantityAvailable ?? null,
    currentlyNotInStock: v.currentlyNotInStock ?? false,
    quantityRule: v.quantityRule
      ? {
          minimum: v.quantityRule.minimum ?? 1,
          maximum: v.quantityRule.maximum ?? null,
          increment: v.quantityRule.increment ?? 1,
        }
      : null,
    selectedOptions: v.selectedOptions ?? [],
    price: v.price,
    compareAtPrice: v.compareAtPrice ?? null,
    image: v.image ?? null,
  };
}

/** Normalise a raw Media node (MediaImage / Video / ExternalVideo / Model3d)
 *  into the flat ProductMedia shape. Returns null for unknown types. */
function mapMedia(m: Raw): ProductMedia | null {
  const preview = m.previewImage ?? null;
  switch (m.mediaContentType) {
    case 'IMAGE':
      return { type: 'image', alt: m.alt ?? null, image: m.image ?? null, previewImage: m.image ?? preview };
    case 'VIDEO':
      return { type: 'video', alt: m.alt ?? null, previewImage: preview, sources: m.sources ?? [] };
    case 'EXTERNAL_VIDEO':
      return { type: 'external_video', alt: m.alt ?? null, previewImage: preview, embeddedUrl: m.embeddedUrl ?? null, host: m.host ?? null };
    case 'MODEL_3D':
      return { type: 'model_3d', alt: m.alt ?? null, previewImage: preview, sources: m.sources ?? [] };
    default:
      return null;
  }
}

export function mapProduct(p: Raw): Product {
  return {
    id: p.id,
    title: p.title,
    handle: p.handle,
    description: p.description ?? '',
    descriptionHtml: p.descriptionHtml ?? '',
    vendor: p.vendor ?? '',
    productType: p.productType ?? '',
    tags: p.tags ?? [],
    availableForSale: p.availableForSale ?? false,
    featuredImage: p.featuredImage ?? null,
    images: nodes(p.images),
    media: nodes(p.media)
      .map(mapMedia)
      .filter((m): m is ProductMedia => m !== null),
    priceRange: p.priceRange,
    compareAtPriceRange: p.compareAtPriceRange,
    options: mapOptions(p.options),
    variants: nodes(p.variants).map(mapVariant),
    seo: p.seo ?? {},
    metafields: mapMetafields(p.metafields),
  };
}

/**
 * Fold the ordered `metafields(identifiers: [...])` array (nullable entries)
 * into a friendly, camelCased object. Only non-empty values survive, so a
 * consumer can treat "absent" and "blank" identically and hide the element.
 */
function mapMetafields(raw: unknown): Product['metafields'] {
  const byKey: Record<string, string> = {};
  if (Array.isArray(raw)) {
    for (const m of raw) {
      if (m?.key && typeof m.value === 'string' && m.value.trim()) {
        byKey[`${m.namespace}.${m.key}`] = m.value.trim();
      }
    }
  }
  return {
    rating: byKey['reviews.rating'],
    ratingCount: byKey['reviews.rating_count'],
    newBadge: byKey['meta.product_new_badge'],
    material: byKey['custom.material'],
    lining: byKey['custom.lining'],
    weight: byKey['custom.weight'],
    origin: byKey['custom.origin'],
    care: byKey['custom.care'],
    modelNote: byKey['custom.model_note'],
    dispatch: byKey['custom.dispatch'],
    unitsSold: byKey['custom.units_sold'],
    fitNotes: byKey['custom.fit_notes'],
    countdown: byKey['meta.product_countdown'],
    promoCode: byKey['custom.promo_code'],
    sizeGuide: byKey['meta.product_size_guide'],
    specification: byKey['custom.product_specification'],
    personalization: byKey['custom.personalization'],
  };
}

export function mapCollection(c: Raw): Collection {
  return {
    id: c.id,
    title: c.title,
    handle: c.handle,
    description: c.description ?? '',
    descriptionHtml: c.descriptionHtml ?? '',
    image: c.image ?? null,
    seo: c.seo ?? {},
  };
}

/** Strip HTML tags + collapse whitespace into a plain-text teaser. */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Words → reading minutes (~200 wpm), floored at 1. */
function readingMinutes(text: string): number {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  return Math.max(1, Math.round(words / 200));
}

export function mapArticleCard(a: Raw): ArticleCard {
  const body = (a.bodyText ?? '') as string;
  const excerpt = (a.excerpt?.trim() || body.split(/\s+/).slice(0, 30).join(' ')) as string;
  return {
    id: a.id,
    handle: a.handle,
    title: a.title,
    excerpt,
    publishedAt: a.publishedAt,
    tags: a.tags ?? [],
    image: a.image ?? null,
    author: a.authorV2 ? { name: a.authorV2.name } : null,
    readMinutes: readingMinutes(body),
    blogHandle: a.blog?.handle ?? '',
    blogTitle: a.blog?.title ?? '',
  };
}

export function mapArticle(a: Raw, blog?: { handle: string; title: string }): Article {
  const contentHtml = (a.contentHtml ?? '') as string;
  const plain = stripHtml(contentHtml);
  const excerpt = (a.excerpt?.trim() || plain.slice(0, 200)) as string;
  return {
    id: a.id,
    handle: a.handle,
    title: a.title,
    excerpt,
    contentHtml,
    publishedAt: a.publishedAt,
    tags: a.tags ?? [],
    image: a.image ?? null,
    author: a.authorV2 ? { name: a.authorV2.name, bio: a.authorV2.bio ?? null } : null,
    readMinutes: readingMinutes(plain),
    blogHandle: blog?.handle ?? a.blog?.handle ?? '',
    blogTitle: blog?.title ?? a.blog?.title ?? '',
    seo: a.seo ?? {},
  };
}

function mapCartLine(l: Raw): CartLine {
  return {
    id: l.id,
    quantity: l.quantity,
    cost: l.cost,
    // Keep only allocations that actually reduced the price (defensive).
    discountAllocations: (l.discountAllocations ?? []).filter(
      (d: Raw) => Number(d?.discountedAmount?.amount ?? 0) > 0,
    ),
    // Only keep buyer-facing properties (hide Shopify's `_`-prefixed internals).
    attributes: (l.attributes ?? []).filter((a: Raw) => a?.key && !a.key.startsWith('_')),
    merchandise: {
      id: l.merchandise?.id,
      title: l.merchandise?.title,
      availableForSale: l.merchandise?.availableForSale ?? true,
      quantityAvailable: l.merchandise?.quantityAvailable ?? null,
      quantityRule: l.merchandise?.quantityRule ?? null,
      selectedOptions: l.merchandise?.selectedOptions ?? [],
      price: l.merchandise?.price,
      image: l.merchandise?.image ?? null,
      product: l.merchandise?.product,
    },
  };
}

export function mapCart(c: Raw | null | undefined): Cart | null {
  if (!c) return null;
  return {
    id: c.id,
    checkoutUrl: c.checkoutUrl,
    totalQuantity: c.totalQuantity ?? 0,
    note: c.note ?? null,
    countryCode: c.buyerIdentity?.countryCode ?? null,
    // Hide Shopify's `_`-prefixed internal attributes from the UI.
    attributes: (c.attributes ?? []).filter((a: Raw) => a?.key && !a.key.startsWith('_')),
    discountCodes: c.discountCodes ?? [],
    discountAllocations: c.discountAllocations ?? [],
    cost: c.cost,
    lines: nodes(c.lines).map(mapCartLine),
  };
}
