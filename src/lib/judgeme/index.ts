// ============================================================
//  Judge.me reviews — server-side reader (REST API v1).
// ============================================================
// The store collects reviews in Judge.me (review-request emails,
// moderation, etc.); here we READ them via the REST API and render
// them in the PDP's own UI. Works on the free plan — unlike the
// hosted "platform-independent widget", which needs the Awesome plan.
//
// The private token grants read access and is used here ONLY (server
// code), so it never reaches the browser. Imported solely by SSR
// frontmatter / API routes.

const BASE = 'https://judge.me/api/v1';

/** Read an env var: build-time inline (dev) or runtime process.env (prod node). */
function env(key: string): string | undefined {
  const meta = (import.meta.env as Record<string, string | undefined>)[key];
  if (meta) return meta;
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return proc?.env?.[key];
}

const SHOP = env('PUBLIC_JUDGEME_SHOP_DOMAIN') ?? env('SHOPIFY_SHOP_DOMAIN');
const TOKEN = env('JUDGEME_PRIVATE_TOKEN');

export const JUDGEME_CONFIGURED = Boolean(SHOP && TOKEN);

export interface JudgeMeReview {
  id: number;
  name: string;
  rating: number;
  title: string;
  body: string;
  /** ISO date. */
  createdAt: string;
  verified: boolean;
  pictures: string[];
}

export interface JudgeMeData {
  average: number;
  count: number;
  /** Star → count, for 5,4,3,2,1. */
  histogram: Record<1 | 2 | 3 | 4 | 5, number>;
  /** % of reviews rated 4★ or higher. */
  recommendPct: number;
  reviews: JudgeMeReview[];
}

// ── Raw API shapes (only the fields we read) ────────────────
interface RawPicture {
  urls?: Record<string, string | undefined>;
}
interface RawReview {
  id: number;
  rating: number;
  title?: string;
  body?: string;
  created_at: string;
  published?: boolean;
  hidden?: boolean;
  curated?: string;
  verified?: string;
  pictures?: RawPicture[];
  reviewer?: { name?: string };
}

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: {
        accept: 'application/json',
        // Some WAFs reject requests without a browser-like UA (Node sends none).
        'user-agent': 'Mozilla/5.0 (compatible; LEditionStorefront/1.0)',
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Map a Shopify product (numeric external id) to its internal Judge.me id. */
async function getInternalId(externalId: string): Promise<number | null> {
  const url = `${BASE}/products/-1?api_token=${TOKEN}&shop_domain=${SHOP}&external_id=${externalId}`;
  const data = await getJson<{ product?: { id?: number } }>(url);
  return data?.product?.id ?? null;
}

function firstPictureUrl(p: RawPicture): string | null {
  const u = p.urls ?? {};
  return u.original ?? u.huge ?? u.compact ?? u.small ?? u.avatar ?? null;
}

/**
 * Fetch published reviews for a product (by numeric Shopify id) plus a
 * computed summary. Returns null when Judge.me is unconfigured/unreachable
 * or the product isn't in Judge.me; an empty list (count 0) is a valid result.
 */
export async function getProductReviews(externalId: string): Promise<JudgeMeData | null> {
  if (!JUDGEME_CONFIGURED || !externalId) return null;

  const internalId = await getInternalId(externalId);
  if (!internalId) return null;

  // per_page max is 100 — plenty for a single product; summary is computed
  // from what we fetch (revisit pagination if any product exceeds 100).
  const url = `${BASE}/reviews?api_token=${TOKEN}&shop_domain=${SHOP}&product_id=${internalId}&per_page=100`;
  const data = await getJson<{ reviews?: RawReview[] }>(url);
  if (!data) return null;

  const reviews: JudgeMeReview[] = (data.reviews ?? [])
    .filter((r) => r.published && !r.hidden && r.curated !== 'spam')
    .map((r) => ({
      id: r.id,
      name: r.reviewer?.name?.trim() || 'Anonymous',
      rating: Math.max(1, Math.min(5, Math.round(r.rating))),
      title: r.title?.trim() ?? '',
      body: r.body?.trim() ?? '',
      createdAt: r.created_at,
      verified: Boolean(r.verified && r.verified !== 'nothing'),
      pictures: (r.pictures ?? []).map(firstPictureUrl).filter((u): u is string => Boolean(u)),
    }))
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  const count = reviews.length;
  const histogram: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;
  let recommend = 0;
  for (const r of reviews) {
    histogram[r.rating as 1 | 2 | 3 | 4 | 5]++;
    sum += r.rating;
    if (r.rating >= 4) recommend++;
  }

  return {
    average: count ? Math.round((sum / count) * 10) / 10 : 0,
    count,
    histogram,
    recommendPct: count ? Math.round((recommend / count) * 100) : 0,
    reviews,
  };
}
