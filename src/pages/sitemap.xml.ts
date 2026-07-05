// GET /sitemap.xml — dynamic sitemap for an SSR storefront. Enumerates the
// static routes plus live Shopify products, collections and journal articles.
// Each Shopify source is fetched defensively: if one fails the sitemap still
// returns with whatever else resolved (never 500s the whole file).
import type { APIRoute } from 'astro';
import { getShopProducts, getAllCollections, getArticles } from '~/lib/shopify';

export const prerender = false;

// Indexable static routes only (cart/wishlist/search/account/track-order are
// noindex — see BaseLayout usages — so they are deliberately excluded).
const STATIC_PATHS = [
  '/',
  '/about',
  '/contact',
  '/faq',
  '/blog',
  '/collections',
  '/collections/all',
  '/products',
  '/shipping-returns',
  '/size-guide',
  '/terms',
];

function xmlEscape(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&#39;',
  );
}

export const GET: APIRoute = async ({ url }) => {
  const origin = url.origin;
  const paths = new Set<string>(STATIC_PATHS);

  // Products, collections, articles — each isolated so a single failure
  // (throttle/network) can't take down the whole sitemap.
  const [products, collections, articles] = await Promise.all([
    getShopProducts({ pageSize: 250 }).catch(() => []),
    getAllCollections(250).catch(() => []),
    getArticles({ first: 100 }).then((r) => r.items).catch(() => []),
  ]);

  for (const p of products) if (p.handle) paths.add(`/products/${p.handle}`);
  for (const c of collections) if (c.handle) paths.add(`/collections/${c.handle}`);
  for (const a of articles) if (a.handle) paths.add(`/blog/${a.handle}`);

  const urls = [...paths]
    .map((p) => `  <url><loc>${xmlEscape(origin + p)}</loc></url>`)
    .join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

  return new Response(body, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
};
