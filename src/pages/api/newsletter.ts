// ============================================================
//  POST /api/newsletter — newsletter sign-up (Shopify-standard).
// ============================================================
// Forwards the email to the store's online-store `/contact` endpoint
// with `form_type=customer` and a `newsletter` tag — exactly like a
// Liquid theme's footer newsletter form. Shopify creates/updates the
// customer with email-marketing consent and records it under
// Customers (Shopify Email / marketing automations can then send the
// welcome flow). Running it server-side keeps the shop domain in one
// place and lets us validate the email before forwarding.
import type { APIRoute } from 'astro';
import { clientIp, isSameOrigin } from '~/lib/cart-server';
import { rateLimit } from '~/lib/rate-limit';

export const prerender = false;

function env(key: string): string | undefined {
  const meta = (import.meta.env as Record<string, string | undefined>)[key];
  if (meta) return meta;
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return proc?.env?.[key];
}

const SHOP = env('SHOPIFY_SHOP_DOMAIN');

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const POST: APIRoute = async ({ request }) => {
  // CSRF: reject cross-origin submissions (tunnel/proxy-aware).
  if (!isSameOrigin(request)) return json({ ok: false, error: 'Invalid origin.' }, 403);
  // Throttle hard per IP — this forwards to the store.
  const rl = rateLimit(`newsletter:${clientIp(request) ?? 'anon'}`, 5, 60_000);
  if (!rl.ok) return json({ ok: false, error: 'Too many attempts. Please try again shortly.' }, 429);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'Invalid request.' }, 400);
  }

  // Honeypot: a hidden field real users never fill. Populated ⇒ bot; return a
  // fake success so it doesn't retry, and forward nothing to the store.
  if (String(body.website ?? '').trim()) return json({ ok: true });

  const email = String(body.email ?? '').trim();
  if (!EMAIL_RE.test(email)) return json({ ok: false, error: 'Please enter a valid email address.' }, 422);
  if (email.length > 150) return json({ ok: false, error: 'That email is too long.' }, 422);

  if (!SHOP) {
    return json({ ok: false, error: 'Sign-up is not configured right now.' }, 500);
  }

  const params = new URLSearchParams({
    form_type: 'customer',
    utf8: '✓',
    'contact[email]': email,
    'contact[tags]': 'newsletter',
  });

  const UNREACHABLE =
    'We could not reach our sign-up service right now — please try again in a moment.';

  try {
    const res = await fetch(`https://${SHOP}/contact`, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        accept: 'text/html',
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      },
      body: params.toString(),
      redirect: 'manual',
    });

    const location = res.headers.get('location') ?? '';

    // Success: Shopify redirects (302/303) to ?customer_posted=true.
    if ((res.status === 302 || res.status === 303) && /customer_posted=true/.test(location)) {
      return json({ ok: true });
    }

    // Anything else is environmental (password-protected / unpublished store,
    // a bot challenge, or rate-limiting) — never the shopper's email, which we
    // already validated. Surface a friendly retry.
    console.error('[newsletter] storefront did not accept the post — status', res.status, location);
    return json({ ok: false, error: UNREACHABLE }, 502);
  } catch (err) {
    console.error('[newsletter] forward failed:', (err as Error).message);
    return json({ ok: false, error: UNREACHABLE }, 502);
  }
};
