// ============================================================
//  Middleware — bind the selected market/country to the request.
// ============================================================
// Resolves the active market in priority order: the shopper's saved
// choice (cookie) → an edge geo guess (cf-ipcountry) on first visit →
// the shop's primary market. The candidate is validated against the
// shop's REAL markets, so an unsupported or tampered country never
// reaches @inContext (where it would silently price in the wrong
// currency instead of the shop default). The request then runs inside
// that country context so every localised Storefront read matches.
import { defineMiddleware } from 'astro:middleware';
import { COUNTRY_COOKIE, normaliseCountry, withCountry } from '~/lib/shopify/context';
import { getMarketCountries } from '~/lib/shopify';

export const onRequest = defineMiddleware(async (context, next) => {
  const candidate =
    normaliseCountry(context.cookies.get(COUNTRY_COOKIE)?.value) ??
    normaliseCountry(context.request.headers.get('cf-ipcountry'));

  let country = candidate;
  if (candidate) {
    try {
      const markets = await getMarketCountries();
      // Reject a country the shop doesn't sell to → fall back to the default
      // market (no @inContext). Skip the guard only if the list is empty.
      if (markets.size && !markets.has(candidate)) country = undefined;
    } catch {
      // Localization momentarily unavailable — trust the format-valid candidate
      // rather than resetting everyone's currency during a transient outage.
    }
  }

  context.locals.country = country;
  return withCountry(country, () => next());
});
