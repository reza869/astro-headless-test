// ============================================================
//  Shopify Storefront API client (server-side, private token)
// ============================================================
// All Shopify traffic flows through here. It is imported only by
// server code (Astro frontmatter + /api routes), so the private
// token never reaches the browser.
//
// Reliability: every request has a timeout; read *queries* (never
// mutations) are retried with jittered backoff on transient errors
// and GraphQL THROTTLED, and may be edge-cached via the Cloudflare
// Cache API when a caller opts in with `cacheTtl`.

/** Read an env var from build-time inline (dev) or runtime process.env (prod node). */
function env(key: string): string | undefined {
  const meta = (import.meta.env as Record<string, string | undefined>)[key];
  if (meta) return meta;
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return proc?.env?.[key];
}

const DOMAIN = env('SHOPIFY_SHOP_DOMAIN');
const VERSION = env('SHOPIFY_API_VERSION') ?? '2026-04';
const TOKEN = env('SHOPIFY_STOREFRONT_PRIVATE_TOKEN');

const ENDPOINT = `https://${DOMAIN}/api/${VERSION}/graphql.json`;

/** Per-request timeout (ms). A hung upstream must never pin a Worker. */
const TIMEOUT_MS = 10_000;
/** Max attempts for retryable read queries (1 initial + retries). */
const MAX_ATTEMPTS = 3;
/** HTTP statuses worth retrying. */
const RETRYABLE_STATUS = new Set([429, 430, 500, 502, 503, 504]);

export class ShopifyError extends Error {
  status?: number;
  details?: unknown;
  constructor(message: string, status?: number, details?: unknown) {
    super(message);
    this.name = 'ShopifyError';
    this.status = status;
    this.details = details;
  }
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string; extensions?: { code?: string } }>;
}

export interface ShopifyFetchOptions {
  /** Real buyer IP — forwarded so Shopify's bot rate-limiting attributes correctly. */
  buyerIp?: string;
  /**
   * Edge-cache this read for N seconds (Cloudflare Cache API). Ignored for
   * mutations and when no Cache API is available (e.g. Node dev). The cache
   * key is the operation + variables; safe because catalogue queries use no
   * @inContext, so prices are the shop's primary market for everyone.
   */
  cacheTtl?: number;
  /** stale-while-revalidate window (s) paired with cacheTtl. Default = cacheTtl. */
  cacheSwr?: number;
}

const isMutation = (query: string): boolean => /^\s*mutation\b/.test(query);
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** A single network attempt with a hard timeout. Returns the parsed envelope. */
async function attemptFetch<T>(
  body: string,
  buyerIp?: string,
): Promise<{ res: Response; json: GraphQLResponse<T> }> {
  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Shopify-Storefront-Private-Token': TOKEN!,
        ...(buyerIp ? { 'Shopify-Storefront-Buyer-IP': buyerIp } : {}),
      },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (cause) {
    const timedOut = (cause as Error)?.name === 'TimeoutError';
    throw new ShopifyError(
      timedOut ? 'Shopify request timed out' : 'Network error talking to Shopify',
      undefined,
      cause,
    );
  }

  let json: GraphQLResponse<T>;
  try {
    json = (await res.json()) as GraphQLResponse<T>;
  } catch (cause) {
    throw new ShopifyError(`Invalid JSON from Shopify (HTTP ${res.status})`, res.status, cause);
  }
  return { res, json };
}

/** Is this failure worth retrying? (retryable HTTP status or GraphQL THROTTLED) */
function isRetryable(res: Response, json: GraphQLResponse<unknown>): boolean {
  if (RETRYABLE_STATUS.has(res.status)) return true;
  return Boolean(json.errors?.some((e) => e.extensions?.code === 'THROTTLED'));
}

/** Validate the envelope and return `data` (keeping partial data on field errors). */
function unwrap<T>(res: Response, json: GraphQLResponse<T>): T {
  // Partial data: the Storefront API returns `data` + field-level `errors` for
  // nullable fields. Keep usable data (log the errors) rather than 500 the page.
  if (json.data != null) {
    if (json.errors?.length) {
      console.warn('[shopify] partial GraphQL errors:', json.errors.map((e) => e.message).join('; '));
    }
    return json.data;
  }
  if (!res.ok) {
    throw new ShopifyError(`Shopify HTTP ${res.status} ${res.statusText}`, res.status, json);
  }
  if (json.errors?.length) {
    throw new ShopifyError(json.errors.map((e) => e.message).join('; '), res.status, json.errors);
  }
  throw new ShopifyError('Empty response from Shopify', res.status);
}

/**
 * Execute a Storefront GraphQL operation. Throws ShopifyError on
 * transport or GraphQL errors; otherwise returns the typed `data`.
 */
export async function shopifyFetch<T>(
  query: string,
  variables: Record<string, unknown> = {},
  options: ShopifyFetchOptions = {},
): Promise<T> {
  if (!DOMAIN || !TOKEN) {
    throw new ShopifyError(
      'Missing Shopify config. Set SHOPIFY_SHOP_DOMAIN and SHOPIFY_STOREFRONT_PRIVATE_TOKEN in .env',
    );
  }

  const body = JSON.stringify({ query, variables });
  const mutation = isMutation(query);
  const cacheApi =
    !mutation && options.cacheTtl && typeof caches !== 'undefined'
      ? (caches as unknown as { default: Cache }).default
      : null;

  // ── Cache lookup ──────────────────────────────────────────
  let cacheKey: Request | null = null;
  if (cacheApi) {
    const hash = await sha256Hex(body);
    cacheKey = new Request(`https://sf-cache.internal/${hash}`);
    const hit = await cacheApi.match(cacheKey);
    if (hit) {
      return unwrap<T>(hit, (await hit.json()) as GraphQLResponse<T>);
    }
  }

  // ── Fetch (mutations: single attempt; queries: retry transient) ──
  let last: { res: Response; json: GraphQLResponse<T> } | null = null;
  for (let attempt = 1; attempt <= (mutation ? 1 : MAX_ATTEMPTS); attempt++) {
    try {
      last = await attemptFetch<T>(body, options.buyerIp);
    } catch (err) {
      // Transport/timeout error: retry queries, otherwise rethrow.
      if (mutation || attempt === MAX_ATTEMPTS) throw err;
      await sleep(200 * 2 ** (attempt - 1) + Math.floor(Math.random() * 100));
      continue;
    }
    if (!mutation && attempt < MAX_ATTEMPTS && isRetryable(last.res, last.json)) {
      const retryAfter = Number(last.res.headers.get('retry-after')) * 1000;
      await sleep(
        Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter
          : 200 * 2 ** (attempt - 1) + Math.floor(Math.random() * 100),
      );
      continue;
    }
    break;
  }

  const { res, json } = last!;
  const data = unwrap<T>(res, json);

  // ── Cache store (only a clean, usable response) ───────────
  if (cacheApi && cacheKey && res.ok && !json.errors?.length) {
    const ttl = options.cacheTtl!;
    const swr = options.cacheSwr ?? ttl;
    await cacheApi.put(
      cacheKey,
      new Response(JSON.stringify({ data }), {
        headers: {
          'content-type': 'application/json',
          'cache-control': `s-maxage=${ttl}, stale-while-revalidate=${swr}`,
        },
      }),
    );
  }

  return data;
}

export const shopifyConfig = { DOMAIN, VERSION, ENDPOINT };
