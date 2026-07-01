# FALL LINE — Headless Shopify Storefront

A production-ready headless e-commerce storefront built with **Astro 6 (SSR)**, **React 19 islands**, **nanostores**, and **Tailwind CSS v4**, powered end-to-end by the **Shopify Storefront API `2026-04`**.

Design direction: *Alpine Technical Catalogue* — cold snow + graphite ink + a single signal-orange accent, an expanded grotesque display (Archivo), and mono spec-sheet labels (JetBrains Mono).

---

## Features

- **Home** — editorial hero, value props, best-sellers grid, editorial banner, featured collections.
- **Collections** — index + per-collection PLP with sort and bidirectional cursor pagination.
- **All products (PLP)** — sort + pagination.
- **Product (PDP)** — image gallery, variant selector, quantity, **Add to cart** + **Buy it now**, rich-text details, recommendations.
- **Cart drawer** — slide-over, live free-shipping progress, quantity/remove, subtotal, **Checkout** → Shopify hosted checkout (`cart.checkoutUrl`).
- **Search** — full results page (sort + pagination) and header predictive/instant search.
- **Navigation** — sticky top header (Shopify `main-menu` with fallback) + mobile bottom tab bar.
- Custom 404, CMS pages (`/pages/[handle]`), SEO meta + Open Graph, accessibility, reduced-motion.

## Architecture

```
Browser ──▶ Astro SSR pages / same-origin /api/cart/* ──▶ Shopify Storefront API (private token)
                                  │
        React islands ◀── nanostores cart store ──▶ /api/cart/* (httpOnly cart-id cookie)
```

- **All Shopify calls are server-side** using the **private** Storefront token (`Shopify-Storefront-Private-Token`). The token never reaches the browser; the client only talks to same-origin `/api/*` routes.
- **Cart state** lives in a framework-agnostic **nanostore** shared across every island (the correct tool for Astro's isolated island roots), backed by an **httpOnly** cart-id cookie.

### Project layout

```
src/
  config/site.ts            Brand, nav fallback, footer, value props (single source of truth)
  lib/
    shopify/
      client.ts             Server fetch client (private token, buyer-IP, error handling)
      graphql/*.ts          GraphQL operations grouped by domain
      services/*.ts         Typed fetch + transform functions
      transforms.ts         edges/node → clean domain shapes
      types.ts, pagination.ts, sort-options.ts
    cart-server.ts, cart-cookie.ts, pagination.ts, utils.ts
  stores/cart.ts            nanostore cart (shared across islands)
  components/
    ui/  layout/  product/  collection/  home/   (.astro)
    react/                  Interactive islands (.tsx)
  pages/
    index, products/, collections/, search, pages/[handle], 404
    api/cart.ts, api/cart/{add,update,remove}.ts, api/search.ts
```

## Getting started

```bash
yarn install
cp .env.example .env   # then fill in your Shopify credentials
yarn dev               # http://localhost:4321
```

### Environment (`.env`)

| Variable | Description |
|---|---|
| `SHOPIFY_SHOP_DOMAIN` | `your-shop.myshopify.com` |
| `SHOPIFY_STOREFRONT_PRIVATE_TOKEN` | Storefront API **private** token (server-only) |
| `SHOPIFY_API_VERSION` | Pinned API version — `2026-04` |

These are **server-only** (no `PUBLIC_` prefix). Read at runtime via `import.meta.env` (dev) with a `process.env` fallback (production).

## Scripts

```bash
yarn dev       # dev server
yarn build     # production build (Node standalone server)
yarn preview   # preview the build
```

## Production

`yarn build` emits a standalone Node server at `dist/server/entry.mjs`:

```bash
HOST=0.0.0.0 PORT=4321 node ./dist/server/entry.mjs
```

Set the three Shopify env vars in the runtime environment.

## Version compatibility (important)

This stack requires a specific, mutually-compatible set:

- `astro@6` ⇄ `@astrojs/node@^10` (v9 targets Astro 5 and **fails the build**) ⇄ `@astrojs/react@^4`
- `react@19` + `react-dom@19`

The Storefront **private** token uses the `Shopify-Storefront-Private-Token` header (the public token uses `X-Shopify-Storefront-Access-Token`).
