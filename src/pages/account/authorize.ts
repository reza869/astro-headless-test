// GET /account/authorize — OAuth callback. Validate state, exchange the
// authorization code for Customer Account API tokens, persist them.
import type { APIRoute } from 'astro';
import {
  assertConfigured,
  CALLBACK_PATH,
  clearAuthState,
  exchangeCodeForTokens,
  getAuthState,
  getPublicOrigin,
  isSafeReturnPath,
  setTokens,
} from '~/lib/shopify/customer';

export const prerender = false;

export const GET: APIRoute = async ({ cookies, url, request, redirect }) => {
  assertConfigured();

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const { verifier, state: savedState, returnTo } = getAuthState(cookies);
  clearAuthState(cookies); // single-use

  // CSRF + integrity check before we trust the code.
  if (!code || !state || !verifier || state !== savedState) {
    return redirect('/account/login?error=state', 302);
  }

  const origin = getPublicOrigin(request, url);
  try {
    const tokens = await exchangeCodeForTokens({
      code,
      codeVerifier: verifier,
      redirectUri: new URL(CALLBACK_PATH, origin).toString(),
      origin,
    });
    setTokens(cookies, tokens);
  } catch (err) {
    const message = (err as Error).message;
    console.error('[account/authorize] token exchange failed:', message);
    // Log the real Shopify error server-side only; show the user a generic
    // notice (don't leak backend/config error strings into the page) while
    // still avoiding a silent loop back into the OAuth flow.
    return redirect('/account/login?error=token', 302);
  }

  const dest = isSafeReturnPath(returnTo) ? returnTo : '/account';
  return redirect(dest, 302);
};
