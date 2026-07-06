// ============================================================
//  POST /api/reviews/create — submit a PDP review to Judge.me (MP-26).
// ============================================================
// The browser posts the shopper's review here; we validate + throttle it
// server-side and forward it to Judge.me via the private token (which
// therefore never reaches the client). Judge.me queues the review as
// UNPUBLISHED pending merchant moderation, so nothing appears on the PDP
// until it's approved. Mirrors the validation/anti-abuse shape of
// /api/contact (same-origin, per-IP rate limit, honeypot, size caps).
import type { APIRoute } from 'astro';
import { clientIp, isSameOrigin } from '~/lib/cart-server';
import { rateLimit } from '~/lib/rate-limit';
import { createReview, JUDGEME_CONFIGURED } from '~/lib/judgeme';

export const prerender = false;

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const POST: APIRoute = async ({ request }) => {
  // CSRF: reject cross-origin submissions (tunnel/proxy-aware).
  if (!isSameOrigin(request)) return json({ ok: false, error: 'Invalid origin.' }, 403);
  // Throttle hard per IP — review creation has no idempotency key on Judge.me's
  // side, so an unbounded client could create duplicate reviews.
  const rl = rateLimit(`review:${clientIp(request) ?? 'anon'}`, 4, 60_000);
  if (!rl.ok) {
    return json({ ok: false, error: 'Too many submissions. Please try again shortly.' }, 429);
  }

  if (!JUDGEME_CONFIGURED) {
    return json({ ok: false, error: 'Reviews are not available right now.' }, 503);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'Invalid request.' }, 400);
  }

  // Honeypot: a hidden field real users never fill. If populated, silently
  // succeed without forwarding so the bot doesn't retry/adapt.
  if (String(body.website ?? '').trim()) return json({ ok: true });

  const externalId = String(body.productId ?? '').trim();
  const name = String(body.name ?? '').trim();
  const email = String(body.email ?? '').trim();
  const title = String(body.title ?? '').trim();
  const reviewBody = String(body.body ?? '').trim();
  const rating = Math.round(Number(body.rating));

  // Server-side validation (never trust the client).
  if (!externalId || !/^\d+$/.test(externalId)) {
    return json({ ok: false, error: 'Missing product reference.' }, 422);
  }
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return json({ ok: false, error: 'Please choose a rating from 1 to 5 stars.' }, 422);
  }
  if (!name) return json({ ok: false, error: 'Your name is required.' }, 422);
  if (!EMAIL_RE.test(email)) return json({ ok: false, error: 'A valid email is required.' }, 422);
  if (reviewBody.length < 10) {
    return json({ ok: false, error: 'Please add a little more detail to your review.' }, 422);
  }
  // Upper bounds — reject oversized payloads outright (abuse / accidental dumps).
  if (name.length > 100 || email.length > 150 || title.length > 150 || reviewBody.length > 5000) {
    return json({ ok: false, error: 'One or more fields is too long.' }, 422);
  }

  const result = await createReview({
    externalId,
    name,
    email,
    rating,
    body: reviewBody,
    title: title || undefined,
    ip: clientIp(request),
  });

  if (result.ok) {
    return json({
      ok: true,
      message: 'Thank you! Your review has been submitted and will appear once approved.',
    });
  }
  return json({ ok: false, error: result.error }, result.status);
};
