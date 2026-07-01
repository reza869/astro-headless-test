// ============================================================
//  POST /api/contact — contact form handler (Shopify-standard).
// ============================================================
// Forwards the submission to the store's online-store `/contact`
// endpoint with `form_type=contact`, exactly like a Liquid theme's
// contact form. Shopify validates it, emails the store owner, and
// records it under Settings → Notifications. Running it server-side
// keeps the shop domain logic in one place and lets us validate +
// shape the message (subject + order number folded into the body).
import type { APIRoute } from 'astro';

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
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'Invalid request.' }, 400);
  }

  const name = String(body.name ?? '').trim();
  const email = String(body.email ?? '').trim();
  const message = String(body.message ?? '').trim();
  const subject = String(body.subject ?? 'General enquiry').trim();
  const orderNumber = String(body.orderNumber ?? '').trim();
  const consent = Boolean(body.consent);

  // Server-side validation (never trust the client).
  if (!name) return json({ ok: false, error: 'Your name is required.' }, 422);
  if (!EMAIL_RE.test(email)) return json({ ok: false, error: 'A valid email is required.' }, 422);
  if (message.length < 10) return json({ ok: false, error: 'Please add more detail to your message.' }, 422);

  if (!SHOP) {
    return json(
      { ok: false, error: 'Contact is not configured. Please email care@ledition.com.' },
      500,
    );
  }

  // Fold the structured fields the Storefront API can't carry into the body.
  const bodyLines = [
    message,
    '',
    `Subject: ${subject}`,
    orderNumber ? `Order number: ${orderNumber}` : null,
    `Marketing consent: ${consent ? 'yes' : 'no'}`,
  ].filter(Boolean);

  const params = new URLSearchParams({
    form_type: 'contact',
    utf8: '✓',
    'contact[name]': name,
    'contact[email]': email,
    'contact[body]': bodyLines.join('\n'),
  });

  // Friendly fallback when the storefront can't accept the post (a
  // password-protected / unpublished store, or a bot challenge). The
  // visible mailto links on the page remain the working escape hatch.
  const UNREACHABLE =
    'We could not reach our message service right now — please email care@ledition.com and we\'ll reply within 24 hours.';

  try {
    const res = await fetch(`https://${SHOP}/contact`, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        accept: 'text/html',
        // A browser-like UA avoids the request being flagged/blocked.
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      },
      body: params.toString(),
      redirect: 'manual',
    });

    const location = res.headers.get('location') ?? '';

    // Success: Shopify redirects (302/303) to ?contact_posted=true.
    if ((res.status === 302 || res.status === 303) && /contact_posted=true/.test(location)) {
      return json({ ok: true });
    }

    // Anything else means the storefront didn't accept the post. Because we
    // already validated the fields above, a rejection here is environmental
    // — a password-protected / unpublished store, a Cloudflare bot challenge
    // (403), or rate-limiting — never the shopper's data. Surface the email
    // fallback (the visible mailto links keep the page fully functional).
    console.error('[contact] storefront did not accept the post — status', res.status, location);
    return json({ ok: false, error: UNREACHABLE }, 502);
  } catch (err) {
    console.error('[contact] forward failed:', (err as Error).message);
    return json({ ok: false, error: UNREACHABLE }, 502);
  }
};
