// ============================================================
//  Request-scoped market (country + language) context
// ============================================================
// The selected country determines the market → the currency Shopify
// returns; the language selects translated content. Rather than thread
// a market argument through every service call, the middleware stashes
// it here for the lifetime of the request; `shopifyFetch` reads it and
// injects `country`/`language` into any query that can be localised via
// `@inContext(country:, language:)`.
//
// AsyncLocalStorage keeps this concurrency-safe (each in-flight request
// gets its own store) — no shared mutable module state.
import { AsyncLocalStorage } from 'node:async_hooks';

/** The active market for a request. ISO codes, uppercase; either may be unset. */
export interface Market {
  /** ISO 3166-1 alpha-2 (e.g. "GB"), or undefined for the shop default. */
  country?: string;
  /** ISO 639-1 (e.g. "FR"; may carry a region suffix like PT_BR). */
  language?: string;
}

export const marketContext = new AsyncLocalStorage<Market>();

/** The full active market for the current request. */
export function currentMarket(): Market {
  return marketContext.getStore() ?? {};
}

/** The active country for the current request, if one was selected. */
export function currentCountry(): string | undefined {
  return marketContext.getStore()?.country || undefined;
}

/** The active language for the current request, if one was selected. */
export function currentLanguage(): string | undefined {
  return marketContext.getStore()?.language || undefined;
}

/** Run `fn` with `market` as the active request market. */
export function withMarket<T>(market: Market, fn: () => T): T {
  return marketContext.run(market, fn);
}

/** Cookies the middleware and selector agree on. */
export const COUNTRY_COOKIE = 'tailored_country';
export const LANGUAGE_COOKIE = 'tailored_language';

/** Accept only a plausible ISO alpha-2 country (never trust input blindly). */
export function normaliseCountry(raw?: string | null): string | undefined {
  const v = (raw ?? '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(v) ? v : undefined;
}

/** Accept only a plausible Shopify LanguageCode (e.g. EN, FR, PT_BR). */
export function normaliseLanguage(raw?: string | null): string | undefined {
  const v = (raw ?? '').trim().toUpperCase();
  return /^[A-Z]{2}(_[A-Z]{2})?$/.test(v) ? v : undefined;
}
