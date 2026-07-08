// ============================================================
//  Request-scoped country context (drives Storefront @inContext)
// ============================================================
// The selected country determines the market → the currency Shopify
// returns. Rather than thread a `country` argument through every
// service call, the middleware stashes it here for the lifetime of
// the request; `shopifyFetch` reads it and injects the `country`
// variable into any query that declares `@inContext(country:)`.
//
// AsyncLocalStorage keeps this concurrency-safe (each in-flight
// request gets its own store) — no shared mutable module state.
import { AsyncLocalStorage } from 'node:async_hooks';

/** ISO 3166-1 alpha-2 (e.g. "GB"), or undefined for the shop default. */
export const countryContext = new AsyncLocalStorage<string | undefined>();

/** The active country for the current request, if one was selected. */
export function currentCountry(): string | undefined {
  return countryContext.getStore() || undefined;
}

/** Run `fn` with `country` as the active request country. */
export function withCountry<T>(country: string | undefined, fn: () => T): T {
  return countryContext.run(country, fn);
}

/** Cookie name the middleware and selector agree on. */
export const COUNTRY_COOKIE = 'tailored_country';

/** Accept only a plausible ISO alpha-2 code (never trust the cookie blindly). */
export function normaliseCountry(raw?: string | null): string | undefined {
  const v = (raw ?? '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(v) ? v : undefined;
}
