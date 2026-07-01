# Shopify Headless Storefront — GraphQL API Reference (`2026-04`)

> **Purpose:** Complete, up-to-date GraphQL reference for building a **headless Shopify storefront with Astro** (or any framework).
> **API version:** `2026-04` (Storefront API + Customer Account API).
> **Status:** Every query/mutation here was searched against the live Shopify schema and the core ones were schema-validated against `2026-04`.
> **Last researched:** 2026-06-17.

This project was originally built in 2021 on the **legacy Checkout API + legacy Storefront customer mutations**. Both are now deprecated. This document is the migration target — copy it into your Astro project as the canonical API contract.

---

## Table of Contents

1. [Architecture & the 2 APIs you need](#1-architecture--the-2-apis-you-need)
2. [⚠️ What changed since 2021 — Deprecation map](#2-️-what-changed-since-2021--deprecation-map)
3. [Endpoints, headers & authentication](#3-endpoints-headers--authentication)
4. [Astro client setup](#4-astro-client-setup)
5. [Reusable GraphQL fragments](#5-reusable-graphql-fragments)
6. [Products](#6-products)
7. [Collections](#7-collections)
8. [Search](#8-search)
9. [Cart (this is your checkout)](#9-cart-this-is-your-checkout)
10. [Checkout](#10-checkout)
11. [Customer Account API (login, orders, addresses)](#11-customer-account-api-login-orders-addresses)
12. [Content: menus, shop, pages, blogs](#12-content-menus-shop-pages-blogs)
13. [Rate limits & cost](#13-rate-limits--cost)
14. [Implementation TODO checklist](#14-implementation-todo-checklist)
15. [Sources](#15-sources)

---

## 1. Architecture & the 2 APIs you need

A 2026 headless storefront uses **two distinct GraphQL APIs**:

| API | Use for | Auth | Endpoint |
|-----|---------|------|----------|
| **Storefront API** | Products, collections, search, cart, checkout, content | Public/private storefront access token | `https://{shop}.myshopify.com/api/2026-04/graphql.json` |
| **Customer Account API** | Login, customer profile, order history, addresses | OAuth 2.0 (PKCE) | `https://{shop}/customer/api/2026-04/graphql` |

> **Key mental model for 2026:** There is **no `checkoutCreate` mutation anymore**. You build a **Cart** with the Storefront API, then redirect the buyer to `cart.checkoutUrl` (Shopify-hosted web checkout). Customer login/orders are **not** part of the Storefront API — they live in the separate **Customer Account API**.

---

## 2. ⚠️ What changed since 2021 — Deprecation map

Your 2021 codebase almost certainly uses several things that are now removed or legacy. Replace them:

| ❌ Old (2021) | ✅ New (2026-04) | Notes |
|--------------|------------------|-------|
| `checkoutCreate`, `checkoutLineItemsAdd`, `checkoutLineItemsUpdate`, `checkoutCustomerAssociateV2`, `Checkout` object | **Cart API** (`cartCreate` + `cart.checkoutUrl`) | The entire legacy Checkout API is **removed**. Migrate all cart/checkout logic to the Cart API. |
| `productByHandle(handle:)` | `product(handle:)` | `productByHandle` is **deprecated**. The `product` query now accepts `handle` OR `id`. |
| `collectionByHandle(handle:)` | `collection(handle:)` | `collectionByHandle` is **deprecated**. The `collection` query now accepts `handle` OR `id`. |
| `customerAccessTokenCreate`, `customerCreate`, `customerUpdate`, `customer(customerAccessToken:)` (Storefront API) | **Customer Account API** (OAuth 2.0 + PKCE) | Storefront customer mutations are **"legacy customer accounts only."** Legacy customer accounts were deprecated **Feb 2026**. New builds **must** use the Customer Account API. |
| `Product.variants` flat usage | `Product.variants` (paginated) + `Product.options { optionValues }` | `Product.options` now exposes structured `optionValues { id name }`. |
| `CartCost.totalTaxAmount` / `estimatedCost` | `cost.subtotalAmount` / `cost.totalAmount` only | **Tax & duty amounts were removed** from the Storefront Cart API. `totalTaxAmount` is deprecated and returns nothing — taxes are computed at checkout. Don't render them client-side. |
| Pinned to old version (e.g. `2021-07`) | Pin to `2026-04` | Always pin a version; never use unversioned URLs. Shopify supports each version ~12 months. |

> Shopify has **stopped publishing formal per-version release notes** — the canonical source for changes is now the developer changelog at `shopify.dev/changelog`.

---

## 3. Endpoints, headers & authentication

### Storefront API

```
POST https://{shop}.myshopify.com/api/2026-04/graphql.json
Content-Type: application/json
X-Shopify-Storefront-Access-Token: {public_or_private_token}
```

- **Public token** (`X-Shopify-Storefront-Access-Token`): safe to expose in the browser; for buyer-facing reads/cart.
- **Private token** (`Shopify-Storefront-Private-Token`): server-only (delegate access); use from Astro server endpoints / SSR.
- Optionally send `Shopify-Storefront-Buyer-IP` (the real buyer's IP) on **server-side** requests so Shopify's bot rate-limiting applies correctly.

### Customer Account API

```
POST https://{shop}/customer/api/2026-04/graphql
Content-Type: application/json
Authorization: {customer_access_token}   # token from the OAuth flow (NOT prefixed with "Bearer")
```

- OAuth 2.0 with **PKCE** for public (browser/mobile) clients; **confidential** (server) clients use `client_id:client_secret`.
- Required scope: `openid email customer-account-api:full`.
- Discover endpoints dynamically via `https://{shop}/.well-known/openid-configuration` (the discovered GraphQL endpoint already embeds the current stable version).
- Access tokens are **short-lived (~1 hour)**; use the refresh token to renew.

---

## 4. Astro client setup

**`.env`** (use `import.meta.env` in Astro; never ship the private/admin token to the client):

```bash
PUBLIC_SHOPIFY_STORE_DOMAIN=your-shop.myshopify.com
PUBLIC_SHOPIFY_STOREFRONT_API_VERSION=2026-04
PUBLIC_SHOPIFY_STOREFRONT_PUBLIC_TOKEN=xxxxxxxxxxxxxxxxxxxx   # client-safe reads/cart
SHOPIFY_STOREFRONT_PRIVATE_TOKEN=shpat_xxxxxxxx                # server-only (optional, delegate)
```

**`src/lib/shopify.js`** — minimal fetch client (no SDK required):

```js
const DOMAIN = import.meta.env.PUBLIC_SHOPIFY_STORE_DOMAIN;
const VERSION = import.meta.env.PUBLIC_SHOPIFY_STOREFRONT_API_VERSION; // 2026-04
const TOKEN = import.meta.env.PUBLIC_SHOPIFY_STOREFRONT_PUBLIC_TOKEN;

const ENDPOINT = `https://${DOMAIN}/api/${VERSION}/graphql.json`;

export async function shopifyFetch(query, variables = {}) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json();
  if (json.errors) {
    throw new Error(json.errors.map((e) => e.message).join("\n"));
  }
  return json.data;
}
```

> For mutations that need to stay server-side (or to pass the buyer IP), make the same call from an Astro endpoint (`src/pages/api/*.js`) using the **private** token + `Shopify-Storefront-Buyer-IP`.

---

## 5. Reusable GraphQL fragments

Define once, reuse everywhere. (Concatenate the fragment string before the operation when sending.)

```graphql
fragment Money on MoneyV2 {
  amount
  currencyCode
}

fragment ImageFields on Image {
  id
  url
  altText
  width
  height
}

fragment VariantFields on ProductVariant {
  id
  title
  availableForSale
  quantityAvailable
  selectedOptions { name value }
  price { ...Money }
  compareAtPrice { ...Money }
  image { ...ImageFields }
}

fragment ProductCard on Product {
  id
  title
  handle
  vendor
  availableForSale
  featuredImage { ...ImageFields }
  priceRange {
    minVariantPrice { ...Money }
    maxVariantPrice { ...Money }
  }
  compareAtPriceRange {
    minVariantPrice { ...Money }
  }
}
```

---

## 6. Products

### 6.1 Product list (paginated, sorted, filtered)

`sortKey` is a `ProductSortKeys` enum: `TITLE`, `PRICE`, `BEST_SELLING`, `CREATED_AT`, `UPDATED_AT`, `RELEVANCE`, `ID`, `VENDOR`, `PRODUCT_TYPE`.

```graphql
query ProductList($first: Int = 12, $after: String, $sortKey: ProductSortKeys = BEST_SELLING, $reverse: Boolean = false, $query: String) {
  products(first: $first, after: $after, sortKey: $sortKey, reverse: $reverse, query: $query) {
    pageInfo { hasNextPage hasPreviousPage endCursor startCursor }
    edges {
      cursor
      node { ...ProductCard }
    }
  }
}
```

**`query` filter examples** (Shopify search syntax): `title:Snowboard`, `tag:sale`, `vendor:Snowdevil OR vendor:Icedevil`, `available_for_sale:true`, `variants.price:>50`, `product_type:Chair`, `updated_at:>'2026-01-01'`.

### 6.2 Single product by handle

> Use `product(handle:)` — **not** the deprecated `productByHandle`. ✅ Schema-validated.

```graphql
query ProductByHandle($handle: String!) {
  product(handle: $handle) {
    id
    title
    handle
    description
    descriptionHtml
    productType
    vendor
    tags
    availableForSale
    featuredImage { ...ImageFields }
    images(first: 20) { edges { node { ...ImageFields } } }
    priceRange {
      minVariantPrice { ...Money }
      maxVariantPrice { ...Money }
    }
    options { id name optionValues { id name } }
    variants(first: 100) { edges { node { ...VariantFields } } }
    seo { title description }
  }
}
```

### 6.3 Product recommendations

```graphql
query ProductRecommendations($productId: ID!) {
  productRecommendations(productId: $productId) {
    ...ProductCard
  }
}
```

---

## 7. Collections

### 7.1 Single collection + its products (by handle)

> Use `collection(handle:)` — **not** the deprecated `collectionByHandle`.

```graphql
query CollectionByHandle($handle: String!, $first: Int = 12, $after: String, $sortKey: ProductCollectionSortKeys = COLLECTION_DEFAULT, $reverse: Boolean = false, $filters: [ProductFilter!]) {
  collection(handle: $handle) {
    id
    title
    handle
    description
    descriptionHtml
    image { ...ImageFields }
    seo { title description }
    products(first: $first, after: $after, sortKey: $sortKey, reverse: $reverse, filters: $filters) {
      pageInfo { hasNextPage endCursor }
      filters {
        id
        label
        type
        values { id label count input }
      }
      edges { node { ...ProductCard } }
    }
  }
}
```

`ProductCollectionSortKeys`: `COLLECTION_DEFAULT`, `BEST_SELLING`, `CREATED`, `ID`, `MANUAL`, `PRICE`, `RELEVANCE`, `TITLE`.
`filters` accept faceted filtering: `[{ available: true }, { price: { min: 10, max: 100 } }, { productVendor: "Acme" } ]`.

### 7.2 All collections (for nav / sitemap)

```graphql
query Collections($first: Int = 50, $after: String) {
  collections(first: $first, after: $after, sortKey: TITLE) {
    pageInfo { hasNextPage endCursor }
    edges {
      node { id title handle description image { ...ImageFields } }
    }
  }
}
```

---

## 8. Search

### 8.1 Full search (products + content)

```graphql
query Search($query: String!, $first: Int = 20, $after: String, $types: [SearchType!] = [PRODUCT], $sortKey: SearchSortKeys = RELEVANCE) {
  search(query: $query, first: $first, after: $after, types: $types, sortKey: $sortKey) {
    totalCount
    pageInfo { hasNextPage endCursor }
    edges {
      node {
        ... on Product { ...ProductCard }
        ... on Article { id title handle }
        ... on Page { id title handle }
      }
    }
  }
}
```

### 8.2 Predictive search (autocomplete / instant search)

`types` is `[PredictiveSearchType!]`: `ARTICLE`, `COLLECTION`, `PAGE`, `PRODUCT`, `QUERY`. `limitScope` (`PredictiveSearchLimitScope`): `ALL` or `EACH`.

```graphql
query PredictiveSearch($query: String!, $limit: Int = 6, $types: [PredictiveSearchType!] = [PRODUCT, COLLECTION, QUERY], $limitScope: PredictiveSearchLimitScope = EACH) {
  predictiveSearch(query: $query, limit: $limit, types: $types, limitScope: $limitScope) {
    queries { text styledText }
    products { ...ProductCard }
    collections { id title handle image { ...ImageFields } }
    pages { id title handle }
    articles { id title handle }
  }
}
```

---

## 9. Cart (this is your checkout)

The **Cart API replaces the old Checkout API**. A cart always exposes a `checkoutUrl`. Persist `cart.id` in a cookie/localStorage to rehydrate the buyer's session.

> **Note (2026-04):** `CartCost.totalTaxAmount` is **deprecated** — taxes/duties are no longer returned by the Storefront Cart API and are calculated at checkout. Use only `subtotalAmount` and `totalAmount`.

### 9.1 Reusable cart fragment

```graphql
fragment CartFields on Cart {
  id
  checkoutUrl
  totalQuantity
  note
  cost {
    subtotalAmount { ...Money }
    totalAmount { ...Money }
  }
  discountCodes { code applicable }
  lines(first: 100) {
    edges {
      node {
        id
        quantity
        cost { totalAmount { ...Money } amountPerQuantity { ...Money } }
        merchandise {
          ... on ProductVariant {
            id
            title
            availableForSale
            selectedOptions { name value }
            price { ...Money }
            image { ...ImageFields }
            product { id title handle featuredImage { ...ImageFields } }
          }
        }
        attributes { key value }
      }
    }
  }
}
```

### 9.2 Create cart — `cartCreate` ✅ Schema-validated

```graphql
mutation CartCreate($input: CartInput!) {
  cartCreate(input: $input) {
    cart { ...CartFields }
    userErrors { field message }
    warnings { code message target }
  }
}
```

Variables:
```json
{
  "input": {
    "lines": [{ "merchandiseId": "gid://shopify/ProductVariant/123", "quantity": 1 }],
    "buyerIdentity": { "countryCode": "US" },
    "attributes": [{ "key": "source", "value": "astro-storefront" }]
  }
}
```

### 9.3 Get cart — `cart` query

```graphql
query GetCart($id: ID!) {
  cart(id: $id) { ...CartFields }
}
```

### 9.4 Add lines — `cartLinesAdd`

```graphql
mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
  cartLinesAdd(cartId: $cartId, lines: $lines) {
    cart { ...CartFields }
    userErrors { field message }
    warnings { code message target }
  }
}
```
Variables: `{ "cartId": "...", "lines": [{ "merchandiseId": "gid://shopify/ProductVariant/123", "quantity": 2 }] }`

### 9.5 Update lines (quantity / swap variant) — `cartLinesUpdate`

Accepts up to **250** lines per request. `CartLineUpdateInput`: `id` (line id, required), `quantity`, `merchandiseId` (to swap variant), `attributes`, `sellingPlanId`.

```graphql
mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
  cartLinesUpdate(cartId: $cartId, lines: $lines) {
    cart { ...CartFields }
    userErrors { field message }
    warnings { code message target }
  }
}
```
Variables: `{ "cartId": "...", "lines": [{ "id": "gid://shopify/CartLine/abc", "quantity": 3 }] }`

### 9.6 Remove lines — `cartLinesRemove`

Accepts up to **250** line IDs per request.

```graphql
mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
  cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
    cart { ...CartFields }
    userErrors { field message }
    warnings { code message target }
  }
}
```

### 9.7 "Clear cart"

> **There is no `cartClear` mutation.** Two patterns:
> 1. **Empty it:** call `cartLinesRemove` with **all** current line IDs (query the cart first to get them), or
> 2. **Discard it:** drop the stored `cart.id` and call `cartCreate` again for a fresh empty cart (simplest for a "start over" button).

### 9.8 Other cart mutations

| Mutation | Purpose |
|----------|---------|
| `cartBuyerIdentityUpdate` | Attach a logged-in customer (`customerAccessToken`), set `countryCode` for international pricing, B2B company location, delivery preferences. |
| `cartNoteUpdate` | Set/clear the order note. |
| `cartAttributesUpdate` | Set custom key/value attributes on the cart. |
| `cartDiscountCodesUpdate` | Apply/replace discount codes (`discountCodes: ["SAVE10"]`; pass `[]` to clear). |
| `cartGiftCardCodesUpdate` | Apply gift card codes. |
| `cartSelectedDeliveryOptionsUpdate` | Pre-select delivery options. |

Example — apply a discount code:
```graphql
mutation CartDiscountCodesUpdate($cartId: ID!, $discountCodes: [String!]!) {
  cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
    cart { ...CartFields }
    userErrors { field message }
  }
}
```

Example — attach the logged-in customer to the cart:
```graphql
mutation CartBuyerIdentityUpdate($cartId: ID!, $buyerIdentity: CartBuyerIdentityInput!) {
  cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
    cart { ...CartFields }
    userErrors { field message }
  }
}
```
Variables: `{ "cartId": "...", "buyerIdentity": { "customerAccessToken": "...", "countryCode": "US" } }`

---

## 10. Checkout

There is **no GraphQL checkout mutation** in 2026. The flow is:

1. Build/maintain a cart with the Cart API (section 9).
2. Read `cart.checkoutUrl`.
3. Redirect the buyer to that URL — Shopify hosts the secure, PCI-compliant, fully-featured web checkout (payments, shipping, taxes, Shop Pay).

```js
// after cartCreate / cartLinesAdd
window.location.href = data.cartCreate.cart.checkoutUrl;
```

To pre-fill checkout for a known customer, call `cartBuyerIdentityUpdate` with the `customerAccessToken` (section 9.8) **before** redirecting.

> **Plus only:** As of `2026-04`, the new **Checkout And Accounts Configuration API** replaces the deprecated Checkout Profile API and Checkout Branding API (relevant only if you customize the hosted checkout; Shopify Plus required).

---

## 11. Customer Account API (login, orders, addresses)

> This is a **separate API** from the Storefront API. Endpoint: `https://{shop}/customer/api/2026-04/graphql`. Auth: OAuth 2.0 access token in the `Authorization` header (no `Bearer` prefix). Scope: `openid email customer-account-api:full`.

### 11.1 OAuth 2.0 (PKCE) flow — summary

1. **Discover** endpoints: `GET https://{shop}/.well-known/openid-configuration` → returns `authorization_endpoint`, `token_endpoint`, and the versioned GraphQL endpoint.
2. **Authorize:** redirect the buyer to `authorization_endpoint` with `client_id`, `redirect_uri`, `scope=openid email customer-account-api:full`, `response_type=code`, and a PKCE `code_challenge` (S256).
3. **Callback:** Shopify redirects back with `?code=...`.
4. **Token exchange:** `POST token_endpoint` with the `code` + PKCE `code_verifier` → receive `access_token` (≈1h), `refresh_token`, `id_token`.
5. **Query:** call the Customer Account GraphQL endpoint with `Authorization: {access_token}`.
6. **Refresh** with the `refresh_token` before expiry; **logout** by clearing tokens (and hitting the end-session endpoint).

> In Astro, run the token exchange + storage in **server endpoints** (`src/pages/api/auth/*.js`) and keep tokens in an HTTP-only cookie or server session — never expose `client_secret` or the refresh token to the browser.

### 11.2 Current customer profile

```graphql
query CustomerProfile {
  customer {
    id
    firstName
    lastName
    displayName
    emailAddress { emailAddress }
    phoneNumber { phoneNumber }
    creationDate
    defaultAddress { id formatted }
  }
}
```

### 11.3 Order history

```graphql
query CustomerOrders($first: Int = 10, $after: String) {
  customer {
    orders(first: $first, after: $after, sortKey: PROCESSED_AT, reverse: true) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          id
          name
          processedAt
          financialStatus
          fulfillments(first: 5) { edges { node { status } } }
          totalPrice { amount currencyCode }
          lineItems(first: 50) {
            edges {
              node {
                title
                quantity
                image { url altText }
                price { amount currencyCode }
              }
            }
          }
        }
      }
    }
  }
}
```

### 11.4 Addresses — CRUD

```graphql
# List
query CustomerAddresses {
  customer {
    addresses(first: 10) {
      edges { node { id firstName lastName address1 address2 city zoneCode territoryCode zip phoneNumber } }
    }
  }
}

# Create
mutation AddressCreate($address: CustomerAddressInput!, $defaultAddress: Boolean) {
  customerAddressCreate(address: $address, defaultAddress: $defaultAddress) {
    customerAddress { id }
    userErrors { field message code }
  }
}

# Update
mutation AddressUpdate($addressId: ID!, $address: CustomerAddressInput!, $defaultAddress: Boolean) {
  customerAddressUpdate(addressId: $addressId, address: $address, defaultAddress: $defaultAddress) {
    customerAddress { id }
    userErrors { field message code }
  }
}

# Delete
mutation AddressDelete($addressId: ID!) {
  customerAddressDelete(addressId: $addressId) {
    deletedAddressId
    userErrors { field message code }
  }
}
```

### 11.5 Update profile

```graphql
mutation CustomerUpdate($input: CustomerUpdateInput!) {
  customerUpdate(input: $input) {
    customer { id firstName lastName }
    userErrors { field message code }
  }
}
```

> **Do not** use the Storefront API's `customerCreate` / `customerAccessTokenCreate` / `customerUpdate` for new builds — they only serve **legacy customer accounts**, which Shopify deprecated in **Feb 2026**. Field names in the Customer Account API differ from the legacy Storefront customer object (e.g. `emailAddress { emailAddress }` instead of a flat `email`) — verify each field against `shopify.dev/docs/api/customer/2026-04` while implementing.

---

## 12. Content: menus, shop, pages, blogs

### 12.1 Navigation menu (header / footer)

`menu(handle:)` — items nest up to 3 levels. Common handles: `main-menu`, `footer`.

```graphql
query Menu($handle: String!) {
  menu(handle: $handle) {
    id
    title
    items {
      id title url type
      items {
        id title url type
        items { id title url type }
      }
    }
  }
}
```
`MenuItem.type` is a `MenuItemType` enum (`COLLECTION`, `PRODUCT`, `PAGE`, `BLOG`, `ARTICLE`, `FRONTPAGE`, `HTTP`, `CATALOG`, `SHOP_POLICY`, …). Use `url` directly, or parse the resource for internal routing.

### 12.2 Shop info & policies

```graphql
query Shop {
  shop {
    name
    description
    primaryDomain { url host }
    brand { logo { image { ...ImageFields } } shortDescription }
    paymentSettings { currencyCode acceptedCardBrands countryCode }
    shippingPolicy { title body url }
    refundPolicy { title body url }
    privacyPolicy { title body url }
    termsOfService { title body url }
  }
}
```

### 12.3 Page by handle

```graphql
query Page($handle: String!) {
  page(handle: $handle) { id title handle body bodySummary seo { title description } }
}
```

### 12.4 Blog & articles

```graphql
query Blog($handle: String!, $first: Int = 10) {
  blog(handle: $handle) {
    title
    articles(first: $first, sortKey: PUBLISHED_AT, reverse: true) {
      edges {
        node {
          id title handle excerpt publishedAt
          image { ...ImageFields }
          author: authorV2 { name }
          contentHtml
        }
      }
    }
  }
}
```

---

## 13. Rate limits & cost

- The **Storefront API does not assign per-query cost** the way the Admin API does. There is **no fixed requests-per-minute cap for genuine buyer traffic**.
- **Tokenless / public** access has a **query complexity limit of ~1,000** per request.
- Automated traffic (bots/crawlers) **is** rate-limited. Send `Shopify-Storefront-Buyer-IP` from your server so legitimate buyer requests are correctly attributed.
- Keep queries lean (request only fields you render) — good for both performance and complexity budget.
- **Customer Account API** tokens are short-lived (~1h); cache the customer session, refresh proactively.

---

## 14. Implementation TODO checklist

Port this into your Astro project board.

### Phase 0 — Setup & config
- [ ] Create a custom app / Headless channel in Shopify admin; generate **Storefront API** public + private tokens.
- [ ] Pin API version to **`2026-04`** in env (`PUBLIC_SHOPIFY_STOREFRONT_API_VERSION`).
- [ ] Add `.env` vars (section 4); ensure private/admin tokens are **server-only**.
- [ ] Build the `shopifyFetch` client (`src/lib/shopify.js`).
- [ ] Add the shared GraphQL fragments (section 5) as importable strings.

### Phase 1 — Catalog (Storefront API)
- [ ] Home / PLP: `products` list with pagination + `sortKey`.
- [ ] Collection pages: `collection(handle:)` + faceted `filters`.
- [ ] PDP: `product(handle:)` with variants, options, images, SEO.
- [ ] Related products: `productRecommendations`.
- [ ] Search page: `search`; header autocomplete: `predictiveSearch`.
- [ ] Navigation: `menu(handle:)`; shop/policies: `shop`.
- [ ] Content: `page`, `blog`/`article`.

### Phase 2 — Cart & checkout (Cart API)
- [ ] `cartCreate` on first add-to-cart; persist `cart.id` (cookie/localStorage).
- [ ] `cart` query to rehydrate on load.
- [ ] `cartLinesAdd`, `cartLinesUpdate` (qty + variant swap), `cartLinesRemove`.
- [ ] "Clear cart" = remove all line IDs **or** discard `cart.id` + recreate.
- [ ] `cartDiscountCodesUpdate`, `cartNoteUpdate`, `cartAttributesUpdate` as needed.
- [ ] Checkout button → redirect to `cart.checkoutUrl`.
- [ ] Render only `subtotalAmount` / `totalAmount` (no client-side tax — removed).

### Phase 3 — Customer accounts (Customer Account API)
- [ ] Register the headless app for the **Customer Account API**; configure redirect URIs + JS origins; scope `openid email customer-account-api:full`.
- [ ] Implement OAuth 2.0 **PKCE** flow in Astro server endpoints (`/api/auth/*`).
- [ ] Store tokens in HTTP-only cookie/session; implement refresh + logout.
- [ ] Account dashboard: `customer` profile query.
- [ ] Order history: `customer.orders`.
- [ ] Address book CRUD: `customerAddressCreate/Update/Delete`.
- [ ] On login, link cart to customer via `cartBuyerIdentityUpdate(customerAccessToken)`.

### Phase 4 — Migration cleanup (from the 2021 codebase)
- [ ] Delete all `checkout*` mutations/queries → replaced by Cart API.
- [ ] Replace `productByHandle` → `product(handle:)`; `collectionByHandle` → `collection(handle:)`.
- [ ] Remove Storefront `customerAccessTokenCreate`/`customerCreate` → Customer Account API.
- [ ] Remove any `totalTaxAmount`/`estimatedCost` cart fields.
- [ ] Bump every query's version path to `2026-04`; verify against schema.

### Phase 5 — Hardening
- [ ] Server-side proxy + `Shopify-Storefront-Buyer-IP` for buyer requests.
- [ ] Centralized `userErrors` / `warnings` handling on every mutation.
- [ ] Cache catalog reads (ISR/edge) where appropriate; keep queries minimal.
- [ ] Set up i18n/`@inContext` (country/language) directives if selling internationally.

---

## 15. Sources

- [Storefront API reference (latest / 2026-04)](https://shopify.dev/docs/api/storefront/latest) — queries, mutations, objects (validated against `2026-04`).
- [GraphQL Customer Account API](https://shopify.dev/docs/api/customer/latest)
- [Authenticate customers with the Customer Account API](https://shopify.dev/docs/storefronts/headless/building-with-the-customer-account-api/authenticate-customers)
- [Introducing the Customer Account API for headless stores](https://www.shopify.com/partners/blog/introducing-customer-account-api-for-headless-stores)
- [About API versioning](https://shopify.dev/docs/api/usage/versioning) · [API rate limits](https://shopify.dev/docs/api/usage/limits)
- [Shopify Updates April 2026 (Checkout & Accounts Config API, discount tags)](https://www.fudge.ai/blog/shopify-updates-april-2026/)
- [Hydrogen April 2026 release (SF + Customer APIs → 2026-04)](https://hydrogen.shopify.dev/update/april-2026-release)
- [Tax & duties deprecated in Storefront Cart API (changelog)](https://shopify.dev/changelog/tax-and-duties-are-deprecated-in-storefront-cart-api)
- [Headless Shopify with Next.js — 2026 build guide](https://samcheek.com/blog/headless-shopify-nextjs-complete-build-guide-2026)

> ℹ️ Shopify no longer publishes formal per-version release notes — track `shopify.dev/changelog` for ongoing changes. Always re-validate field names against the `2026-04` schema in the GraphiQL explorer before shipping.
