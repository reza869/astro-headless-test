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

/** Pull the node list out of a Relay-style connection. */
export function nodes<T>(connection?: Connection<T> | null): T[] {
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

/** Flatten the "Colour" product option to { name, hex }. Returns [] when the
 *  product has no colour option (e.g. the lean card query omits options). */
function deriveColors(options?: Raw[]): { name: string; hex: string | null }[] {
  if (!Array.isArray(options)) return [];
  const opt = options.find((o) => /colou?r/i.test(o?.name ?? ''));
  if (!Array.isArray(opt?.optionValues)) return [];
  return opt!.optionValues.map((v: Raw) => ({ name: v.name, hex: v.swatch?.color ?? null }));
}

export function mapProductCard(p: Raw): ProductCard {
  return {
    id: p.id,
    title: p.title,
    handle: p.handle,
    vendor: p.vendor,
    availableForSale: p.availableForSale ?? true,
    variantId: nodes(p.variants)[0]?.id ?? null,
    featuredImage: p.featuredImage ?? null,
    priceRange: p.priceRange,
    compareAtPriceRange: p.compareAtPriceRange,
    // Enriched facets — populated only by the shop catalogue query.
    productType: p.productType ?? undefined,
    tags: p.tags ?? undefined,
    createdAt: p.createdAt ?? undefined,
    collections: p.collections
      ? (p.collections.nodes ?? []).map((c: Raw) => ({ title: c.title, handle: c.handle }))
      : undefined,
    colors: p.options ? deriveColors(p.options) : undefined,
  };
}

export function mapVariant(v: Raw): ProductVariant {
  return {
    id: v.id,
    title: v.title,
    availableForSale: v.availableForSale ?? false,
    quantityAvailable: v.quantityAvailable ?? null,
    selectedOptions: v.selectedOptions ?? [],
    price: v.price,
    compareAtPrice: v.compareAtPrice ?? null,
    image: v.image ?? null,
  };
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
    priceRange: p.priceRange,
    compareAtPriceRange: p.compareAtPriceRange,
    options: p.options ?? [],
    variants: nodes(p.variants).map(mapVariant),
    seo: p.seo ?? {},
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
    merchandise: {
      id: l.merchandise?.id,
      title: l.merchandise?.title,
      availableForSale: l.merchandise?.availableForSale ?? true,
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
    discountCodes: c.discountCodes ?? [],
    discountAllocations: c.discountAllocations ?? [],
    cost: c.cost,
    lines: nodes(c.lines).map(mapCartLine),
  };
}
