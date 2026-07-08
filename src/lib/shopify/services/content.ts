// ============================================================
//  Content services — menus + shop (2026-04)
// ============================================================
import { shopifyFetch } from '../client';

// Edge-cache TTLs (s). Near-static config (menu/shop/policies/localization) is
// cached longer; editorial/catalogue content shorter. All safe: no @inContext,
// so responses are identical for every visitor.
const TTL_STATIC = { cacheTtl: 300, cacheSwr: 3600 } as const;
const TTL_CONTENT = { cacheTtl: 120, cacheSwr: 600 } as const;
import {
  MENU_QUERY,
  SHOP_QUERY,
  SHOP_POLICIES_QUERY,
  PAGE_QUERY,
  LOCALIZATION_QUERY,
  ARTICLES_QUERY,
  ARTICLE_QUERY,
} from '../graphql/content';
import { mapArticle, mapArticleCard, nodes } from '../transforms';
import type { Article, ArticleCard, Menu, Paginated, Shop } from '../types';

/** A selectable currency for the header switcher. `code` is the
 *  display token (e.g. "USD $"); `label` is the long name. */
export interface CurrencyOption {
  code: string;
  label: string;
  sym: string;
  iso: string;
  /** Representative market country (ISO alpha-2) that yields this currency —
   *  the switcher sets this as the country cookie to price the store in it. */
  country: string;
}
/** A selectable language. `code` is the ISO (e.g. "EN"); `label` the endonym. */
export interface LanguageOption {
  code: string;
  label: string;
}
export interface Localization {
  activeCurrency: string;
  activeLanguage: string;
  currencies: CurrencyOption[];
  languages: LanguageOption[];
}

interface RawCurrency {
  isoCode: string;
  name: string;
  symbol: string;
}
interface RawLocalization {
  localization: {
    country: { isoCode: string; currency: RawCurrency };
    language: { isoCode: string; endonymName: string };
    availableCountries: { isoCode: string; currency: RawCurrency }[];
    availableLanguages: { isoCode: string; endonymName: string }[];
  };
}

/** Active + available currencies and languages from the Storefront API. */
export async function getLocalization(): Promise<Localization> {
  const { localization: l } = await shopifyFetch<RawLocalization>(LOCALIZATION_QUERY, {}, TTL_STATIC);

  // Many countries share a currency — dedupe by ISO, keep first.
  const seen = new Set<string>();
  const currencies: CurrencyOption[] = [];
  for (const c of l.availableCountries) {
    const { isoCode, name, symbol } = c.currency;
    if (seen.has(isoCode)) continue;
    seen.add(isoCode);
    // `c.isoCode` is the country; the first country seen for this currency is a
    // fine representative (e.g. EUR → the first Eurozone market listed).
    currencies.push({ iso: isoCode, code: `${isoCode} ${symbol}`, label: name, sym: symbol, country: c.isoCode });
  }

  const languages: LanguageOption[] = l.availableLanguages.map((lang) => ({
    code: lang.isoCode,
    label: lang.endonymName,
  }));

  return {
    activeCurrency: `${l.country.currency.isoCode} ${l.country.currency.symbol}`,
    activeLanguage: l.language.isoCode,
    currencies,
    languages,
  };
}

export interface ShopifyPage {
  id: string;
  title: string;
  handle: string;
  body: string;
  bodySummary?: string;
  seo?: { title?: string | null; description?: string | null };
}

/** A CMS page by handle, or null if it doesn't exist. */
export async function getPage(handle: string): Promise<ShopifyPage | null> {
  const data = await shopifyFetch<{ page: ShopifyPage | null }>(PAGE_QUERY, { handle }, TTL_CONTENT);
  return data.page ?? null;
}

/** A rendered legal policy from Settings → Policies. `body` is HTML. */
export interface ShopPolicy {
  id: string;
  title: string;
  handle: string;
  body: string;
  url: string;
}
/** Which Settings → Policies document to read. */
export type ShopPolicyKey = 'termsOfService' | 'privacyPolicy' | 'refundPolicy' | 'shippingPolicy';

/**
 * One of the shop's merchant-editable legal policies, or null when it
 * hasn't been written in the Shopify admin (Settings → Policies). Content
 * is authored in Shopify and pulled live, so the storefront always mirrors
 * the current legal text without a redeploy.
 */
export async function getShopPolicy(key: ShopPolicyKey): Promise<ShopPolicy | null> {
  try {
    const data = await shopifyFetch<{ shop: Record<ShopPolicyKey, ShopPolicy | null> }>(
      SHOP_POLICIES_QUERY,
      {},
      TTL_STATIC,
    );
    return data.shop?.[key] ?? null;
  } catch (err) {
    console.error('[policy] load failed:', (err as Error).message);
    return null;
  }
}

/** Navigation menu by handle (e.g. "main-menu", "footer"). Null if missing. */
export async function getMenu(handle: string): Promise<Menu | null> {
  const data = await shopifyFetch<{ menu: Menu | null }>(MENU_QUERY, { handle }, TTL_STATIC);
  return data.menu ?? null;
}

/** Shop name + primary domain. */
export async function getShop(): Promise<Shop> {
  const data = await shopifyFetch<{ shop: Shop }>(SHOP_QUERY, {}, TTL_STATIC);
  return data.shop;
}

// ── Blog / articles ─────────────────────────────────────────

export interface ArticleListParams {
  first?: number;
  after?: string | null;
  /** Shopify search syntax, e.g. `tag:Style`. */
  query?: string | null;
}

/** Newest articles across every blog, paginated. */
export async function getArticles(
  params: ArticleListParams = {},
): Promise<Paginated<ArticleCard>> {
  const data = await shopifyFetch<{ articles: any }>(
    ARTICLES_QUERY,
    {
      first: params.first ?? 12,
      after: params.after ?? null,
      query: params.query ?? null,
    },
    TTL_CONTENT,
  );
  return {
    items: nodes(data.articles).map(mapArticleCard),
    pageInfo: data.articles?.pageInfo ?? {
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: null,
      endCursor: null,
    },
  };
}

/** A single article by handle (resolved across all blogs), or null. */
export async function getArticle(handle: string): Promise<Article | null> {
  const data = await shopifyFetch<{
    blogs: { edges: { node: { handle: string; title: string; articleByHandle: any } }[] };
  }>(ARTICLE_QUERY, { handle });

  for (const { node: blog } of data.blogs?.edges ?? []) {
    if (blog.articleByHandle) {
      return mapArticle(blog.articleByHandle, { handle: blog.handle, title: blog.title });
    }
  }
  return null;
}

/** Up to `limit` other recent articles, excluding `excludeHandle` — used as
 *  the "Keep reading" rail on an article page. */
export async function getRelatedArticles(
  excludeHandle: string,
  limit = 3,
): Promise<ArticleCard[]> {
  const { items } = await getArticles({ first: limit + 1 });
  return items.filter((a) => a.handle !== excludeHandle).slice(0, limit);
}
