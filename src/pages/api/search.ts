// GET /api/search?q=... — predictive (instant) search proxy.
//
// Backed by the FULL product search with per-term prefix wildcards, so the
// header dropdown returns results as you type ("jack" → "jacket") from the
// very first character. Shopify's native predictiveSearch only matches whole
// terms, so short/partial queries came back empty — this fixes that. It's
// still called for collection/query suggestions in parallel (best-effort).
import type { APIRoute } from 'astro';
import { searchProducts, predictiveSearch } from '~/lib/shopify';
import { clientIp } from '~/lib/cart-server';
import { rateLimit } from '~/lib/rate-limit';

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

/** Forgiving prefix search: append "*" to each term ("den jack" → "den* jack*")
 *  so words match as the shopper types. */
function prefixQuery(q: string): string {
  return q
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => `${term}*`)
    .join(' ');
}

export const GET: APIRoute = async ({ url, request }) => {
  const rl = rateLimit(`search:${clientIp(request) ?? 'anon'}`, 120, 60_000);
  if (!rl.ok) return json({ products: [], collections: [], queries: [] }, 429);

  // Cap length — a search term is short; never forward a megabyte query.
  const q = (url.searchParams.get('q')?.trim() ?? '').slice(0, 100);
  if (q.length < 1) {
    return json({ products: [], collections: [], queries: [] });
  }

  try {
    // Products via forgiving prefix search; collections/queries via Shopify's
    // predictive endpoint (best-effort — never let it fail the whole request).
    const [productPage, predictive] = await Promise.all([
      searchProducts({ query: prefixQuery(q), pageSize: 8 }),
      predictiveSearch(q).catch(() => ({ collections: [], queries: [] })),
    ]);

    const products = productPage.items.map((p) => ({
      id: p.id,
      title: p.title,
      handle: p.handle,
      featuredImage: p.featuredImage ?? null,
      priceRange: p.priceRange,
    }));

    return json({
      products,
      collections: predictive.collections ?? [],
      queries: predictive.queries ?? [],
    });
  } catch (err) {
    console.error('[api/search]', (err as Error)?.message);
    return json({ products: [], collections: [], queries: [], error: 'Search is unavailable.' }, 500);
  }
};
