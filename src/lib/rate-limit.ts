// ============================================================
//  Best-effort in-process rate limiter (fixed window).
// ============================================================
// IMPORTANT: on Cloudflare Workers this state is PER-ISOLATE and ephemeral, so
// it catches naive single-client bursts (a hammering loop usually sticks to one
// isolate) but is NOT a distributed guarantee. For robust protection configure
// **Cloudflare Rate Limiting Rules (WAF)** at the edge — see the README
// "Security" section. This adds defense-in-depth without a new binding.

interface Bucket {
  count: number;
  /** Epoch ms when the window resets. */
  reset: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Register a hit for `key`. Returns `{ ok:false, retryAfter }` once more than
 * `limit` hits occur inside `windowMs`. Keys should include the route + client
 * IP, e.g. `contact:1.2.3.4`.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const b = buckets.get(key);

  if (!b || now >= b.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    // Opportunistic cleanup so the map can't grow unbounded on a long-lived isolate.
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) if (now >= v.reset) buckets.delete(k);
    }
    return { ok: true, retryAfter: 0 };
  }

  b.count += 1;
  if (b.count > limit) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((b.reset - now) / 1000)) };
  }
  return { ok: true, retryAfter: 0 };
}
