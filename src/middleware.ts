// ============================================================
//  Middleware — bind the selected market/country to the request.
// ============================================================
// Reads the country cookie (set by the currency switcher) and runs
// the rest of the request inside that country context, so every
// Storefront read with `@inContext(country:)` returns prices in the
// matching currency. Falls back to the shop's primary market when no
// cookie is present.
import { defineMiddleware } from 'astro:middleware';
import { COUNTRY_COOKIE, normaliseCountry, withCountry } from '~/lib/shopify/context';

export const onRequest = defineMiddleware((context, next) => {
  const country = normaliseCountry(context.cookies.get(COUNTRY_COOKIE)?.value);
  context.locals.country = country;
  return withCountry(country, () => next());
});
