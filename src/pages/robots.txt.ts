// GET /robots.txt — allow crawling of the storefront, keep private/thin
// routes out, and point crawlers at the dynamic sitemap. Uses the request
// origin so it is correct on any deployment domain without extra config.
import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = ({ url }) => {
  const origin = url.origin;
  const body = `User-agent: *
Allow: /
Disallow: /account
Disallow: /cart
Disallow: /wishlist
Disallow: /search
Disallow: /api/

Sitemap: ${origin}/sitemap.xml
`;
  return new Response(body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
};
