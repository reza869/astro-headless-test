// ============================================================
//  Public origin resolver — proxy/tunnel aware.
// ============================================================
// Behind a tunnel (cloudflared/ngrok/app.thehriday.com) the dev server
// receives plain HTTP, so Astro.url.protocol is "http". OAuth redirect_uri
// values MUST be the public HTTPS URL and match exactly between the
// authorize request, the token exchange, and what's registered in Shopify.
// We trust the standard reverse-proxy headers, falling back to https for
// any non-localhost host.
export function getPublicOrigin(request: Request, url: URL): string {
  const fwdProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const fwdHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const host = fwdHost || request.headers.get('host') || url.host;
  const isLocal = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  const proto = fwdProto || (isLocal ? 'http' : 'https');
  return `${proto}://${host}`;
}

/**
 * True only for a genuine same-origin, single-slash relative path
 * (e.g. `/account/orders`). Rejects protocol-relative (`//evil.com`),
 * backslash-normalised (`/\evil.com`), and absolute-URL targets so a
 * `return_to` value can never redirect off-origin (open redirect).
 */
export function isSafeReturnPath(path: string | null | undefined): path is string {
  return (
    typeof path === 'string' &&
    path.startsWith('/') &&
    !path.startsWith('//') &&
    !path.startsWith('/\\')
  );
}
