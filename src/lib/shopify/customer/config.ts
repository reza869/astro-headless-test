// ============================================================
//  Customer Account API — configuration & canonical endpoints
// ============================================================
// The Customer Account API is OAuth 2.0 (Authorization Code + PKCE).
// Unlike the Storefront API, its endpoints are hosted on shopify.com
// and keyed by the numeric SHOP ID (not the myshopify domain).
//
// Required Shopify-admin setup (Settings → Customer accounts, and the
// Headless / Hydrogen channel → Customer Account API):
//   1. Enable "New customer accounts".
//   2. Copy the Customer Account API Client ID.
//   3. Register the callback URL  <origin>/account/authorize  and the
//      logout URL  <origin>/account  in the API's settings.

/** Read an env var from build-time inline (dev) or runtime process.env (prod node). */
function env(key: string): string | undefined {
  const meta = (import.meta.env as Record<string, string | undefined>)[key];
  if (meta) return meta;
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return proc?.env?.[key];
}

export const CLIENT_ID = env('CUSTOMER_ACCOUNT_API_CLIENT_ID');
export const SHOP_ID = env('SHOPIFY_SHOP_ID');
export const API_VERSION = env('CUSTOMER_ACCOUNT_API_VERSION') ?? '2025-01';

/** True only when the customer-account env vars are present. */
export const isCustomerAccountConfigured = Boolean(CLIENT_ID && SHOP_ID);

/** Throw a clear, actionable error if someone hits an auth route unconfigured. */
export function assertConfigured(): void {
  if (!isCustomerAccountConfigured) {
    throw new Error(
      'Customer Account API is not configured. Set CUSTOMER_ACCOUNT_API_CLIENT_ID ' +
        'and SHOPIFY_SHOP_ID in .env (see .env.example).',
    );
  }
}

// --- Canonical OAuth + GraphQL endpoints (shop_id based) ------------
export const AUTHORIZE_ENDPOINT = `https://shopify.com/authentication/${SHOP_ID}/oauth/authorize`;
export const TOKEN_ENDPOINT = `https://shopify.com/authentication/${SHOP_ID}/oauth/token`;
export const LOGOUT_ENDPOINT = `https://shopify.com/authentication/${SHOP_ID}/logout`;
export const GRAPHQL_ENDPOINT = `https://shopify.com/${SHOP_ID}/account/customer/api/${API_VERSION}/graphql`;

// OAuth scopes. `customer-account-api:full` grants the GraphQL API access;
// openid + email are needed for the id_token used at logout.
export const SCOPES = 'openid email customer-account-api:full';

// Fixed Shopify constant: the audience for the token-exchange that mints the
// actual Customer Account API access token from the OAuth access token.
export const TOKEN_EXCHANGE_AUDIENCE = '30243aa5-17c1-465a-8493-944bcc4e88aa';
export const TOKEN_EXCHANGE_SCOPE = 'https://api.customers.com/auth/customer.graphql';

// Where to send the buyer after each step.
export const CALLBACK_PATH = '/account/authorize';
export const DEFAULT_REDIRECT = '/account';
