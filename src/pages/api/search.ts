// GET /api/search?q=... — predictive (instant) search proxy.
//
// Backed by the FULL product search with per-term prefix wildcards, so the
// header dropdown returns results as you type ("jack" → "jacket") from the
// very first character. Shopify's native predictiveSearch only matches whole
// terms, so short/partial queries came back empty — this fixes that. It's
// still called for collection/query suggestions in parallel (best-effort).
import type { APIRoute } from 'astro';
import { searchProducts, predictiveSearch } from '~/lib/shopify';

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

export const GET: APIRoute = async ({ url }) => {
  const q = url.searchParams.get('q')?.trim() ?? '';
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
    return json({ error: (err as Error).message }, 500);
  }
};
