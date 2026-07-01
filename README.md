<h1 align="center">L'ÉDITION</h1>

<p align="center">
  <strong>A production-grade, headless Shopify storefront</strong><br />
  Publication-first fashion commerce — built with Astro 6 SSR, React 19 islands, nanostores &amp; Tailwind CSS v4.
</p>

<p align="center">
  <img alt="Astro" src="https://img.shields.io/badge/Astro-6.x-BC52EE?logo=astro&logoColor=white" />
  <img alt="React" src="https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-4.x-38BDF8?logo=tailwindcss&logoColor=white" />
  <img alt="Shopify" src="https://img.shields.io/badge/Shopify-Storefront_API_2026--04-96BF48?logo=shopify&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" />
  <img alt="Node" src="https://img.shields.io/badge/Node-%E2%89%A522.12-5FA04E?logo=node.js&logoColor=white" />
</p>

<p align="center">
  <a href="#-overview">Overview</a> ·
  <a href="#-features">Features</a> ·
  <a href="#-tech-stack">Tech Stack</a> ·
  <a href="#-architecture">Architecture</a> ·
  <a href="#-prerequisites">Prerequisites</a> ·
  <a href="#-installation">Installation</a> ·
  <a href="#-environment-variables">Environment</a> ·
  <a href="#-shopify-setup">Shopify Setup</a> ·
  <a href="#-development-workflow">Development</a> ·
  <a href="#-scripts">Scripts</a> ·
  <a href="#-routes">Routes</a> ·
  <a href="#-project-structure">Structure</a> ·
  <a href="#-deployment">Deployment</a> ·
  <a href="#-troubleshooting">Troubleshooting</a> ·
  <a href="#-contributing">Contributing</a>
</p>

---

## 🧭 Overview

**L'ÉDITION** is a fully-featured **headless e-commerce storefront** that renders on the server (SSR) and talks to Shopify entirely through the **Storefront API** and **Customer Account API**. Shopify remains the source of truth for products, collections, content, cart, checkout, customers, and orders — while the front end is a bespoke, editorial "magazine" experience you fully control.

The whole app is designed around one principle: **secrets never touch the browser.** All Shopify traffic is proxied through same-origin `/api/*` routes using a **private** Storefront token, and the interactive parts of the UI are small **React islands** hydrated on demand over an otherwise static, fast HTML shell.

**Design direction** — *Parisian editorial*: a refined magazine layout with a signal-coral accent, the `Big Shoulders Display` display face for headings and `Manrope` for body copy. Motion is handled with **GSAP** scroll reveals that fully respect `prefers-reduced-motion`.

> [!NOTE]
> The npm package is named `satellite-shell` (the internal codename). The storefront brand rendered site-wide is configured in [`src/config/site.ts`](src/config/site.ts) and can be changed in one place.

---

## ✨ Features

### 🛍️ Storefront &amp; catalogue
- **Home** — editorial hero, value props, new arrivals &amp; best-sellers grids, flash sale, campaign banners, bundle builder, testimonials, and a newsletter CTA.
- **Collections** — a collections index plus per-collection PLPs with **sort** and **bidirectional cursor pagination**.
- **Catalogue** — a full `/collections/all` shop experience (filters, sort, density toggle, load-more) driven by real Shopify data.
- **Product (PDP)** — image gallery with thumbnails/zoom, colour + size variant selector, quantity stepper, **Add to Bag** &amp; **Buy it now**, rich-text details accordions, and "you may also like" recommendations.
- **Search** — a full results page (sort + pagination) **and** an instant/predictive search in the header, backed by the Storefront `search`/`predictiveSearch` queries.

### 🛒 Cart &amp; checkout
- **Slide-over cart drawer** (React island) with a live **free-shipping progress meter**, quantity/remove controls, discount codes, subtotal, and lazy "you may also like" recommendations.
- **Dedicated `/cart` page** and a **wishlist** (`/wishlist`) backed by a shared nanostore.
- **Checkout** hands off to Shopify's secure hosted checkout via `cart.checkoutUrl`.

### 👤 Customer accounts
- **Login / logout** through the **Customer Account API** using **OAuth 2.0 + PKCE** — no passwords handled by the app.
- Session persisted in an **httpOnly** cookie; origin is derived from forwarded headers so it works behind tunnels/proxies.

### ⭐ Reviews &amp; content
- **Real Judge.me product reviews** read server-side via the Judge.me REST API and rendered in the PDP's own UI (works on the free plan; degrades gracefully to "no reviews" when unset).
- **Blog / Journal** — Shopify articles listing + article detail with related posts.
- **Legal &amp; support pages** — Terms (pulls the live `shop.termsOfService` policy), Shipping &amp; Returns, Size Guide (reusable chart + PDP modal), Track Order, FAQ, Contact (functional form endpoint), plus generic CMS pages via `/pages/[handle]`.

### 🎯 Experience &amp; quality
- **Server-only secrets** — the Storefront **private** token is never exposed to the client.
- **React islands** — interactivity is isolated and hydrated on demand (`client:idle` / `client:load`) for fast first paint.
- **Responsive** with a mobile bottom tab bar, off-canvas navigation, and focus-trapped overlays.
- **SEO** meta + Open Graph, **structured data** (product review rich snippets), accessibility, and reduced-motion support baked into [`BaseLayout.astro`](src/layouts/BaseLayout.astro).

---

## 🧱 Tech Stack

| Dependency | Version | Purpose |
| --- | --- | --- |
| [Astro](https://astro.build) | `^6.4` | SSR framework &amp; routing (`output: "server"`) |
| [@astrojs/node](https://docs.astro.build/en/guides/integrations-guide/node/) | `^10` | Standalone Node server adapter |
| [@astrojs/react](https://docs.astro.build/en/guides/integrations-guide/react/) | `^4` | React island renderer |
| [React](https://react.dev) / React DOM | `^19` | Interactive islands |
| [Tailwind CSS](https://tailwindcss.com) | `^4.3` | Styling (via `@tailwindcss/vite`) |
| [nanostores](https://github.com/nanostores/nanostores) + `@nanostores/react` | `^0.11` / `^0.8` | Framework-agnostic cart &amp; wishlist state shared across islands |
| [GSAP](https://gsap.com) | `^3.15` | Scroll-reveal animations |
| [lucide-react](https://lucide.dev) | `^1.20` | Icon set for React islands |
| [clsx](https://github.com/lukeed/clsx) | `^2.1` | Conditional class names |
| [TypeScript](https://www.typescriptlang.org) | `5.x` | End-to-end type safety |

**APIs:** Shopify **Storefront API** `2026-04` · Shopify **Customer Account API** `2025-01` · **Judge.me** REST.

---

## 🏗️ Architecture

```
                        ┌──────────────────────────────────────────────┐
   Browser              │                Astro SSR (Node)              │
 ┌─────────┐  HTML/CSS  │  .astro pages ──▶ src/lib/shopify/services   │   HTTPS + private token
 │  Static │◀───────────│                        │                     │ ┌──────────────────────┐
 │  shell  │            │                        └────────────────────────▶│  Shopify Storefront  │
 └────┬────┘            │  same-origin /api/*  ──▶ cart-server / client  │ │        API           │
      │ hydrate         │        ▲                                       │ └──────────────────────┘
      ▼                 │        │ httpOnly cart-id cookie               │ ┌──────────────────────┐
 ┌─────────┐  fetch     │        │                                       │ │ Customer Account API │
 │  React  │────────────┼────────┘   OAuth 2.0 + PKCE (login)  ──────────▶│   (OAuth, orders)    │
 │ islands │            │                                                │ └──────────────────────┘
 └────┬────┘            └──────────────────────────────────────────────┘ ┌──────────────────────┐
      │ nanostore (cart / wishlist) shared across every island           │   Judge.me REST      │
      └─────────────────────────────────────────────────────────────────▶│   (reviews, SSR)     │
                                                                          └──────────────────────┘
```

**Key decisions**

- **The private token stays on the server.** Environment variables have **no `PUBLIC_` prefix**, so they are never bundled into client code. The browser only ever calls same-origin `/api/*` routes, which perform the actual Shopify requests using the `Shopify-Storefront-Private-Token` header.
- **Cart state is a nanostore**, not React context — because Astro renders each island in its own isolated root, a framework-agnostic store is the correct way to share cart/wishlist state across the header button, drawer, PDP, and cart page. It is backed by an **httpOnly cart-id cookie** so the cart survives reloads without exposing the cart ID to scripts.
- **The Shopify layer is cleanly separated:** GraphQL operations (`graphql/*`) → typed fetch + transform (`services/*`) → clean domain shapes (`transforms.ts`, `types.ts`). Pages and API routes only ever import from the tidy `services` layer.

---

## ✅ Prerequisites

| Requirement | Notes |
| --- | --- |
| **Node.js ≥ 22.12.0** | Enforced via `engines` in `package.json`. Use `nvm`/`fnm` to match. |
| **npm** (or yarn / pnpm) | A `package-lock.json` **and** `yarn.lock` are present — pick one and stick with it. |
| **A Shopify store** | Any plan. A development store works. |
| **Storefront API access** | A **private** (delegate) Storefront access token — see [Shopify Setup](#-shopify-setup). |
| **(Optional) Customer Account API** | For customer login. Requires a public **HTTPS** origin (a tunnel in dev). |
| **(Optional) Judge.me account** | For product reviews. The free plan is enough for the REST read used here. |

---

## 📦 Installation

```bash
# 1. Clone
git clone <your-repo-url> ledition
cd ledition

# 2. Install dependencies
npm install
#   or: yarn install   |   pnpm install

# 3. Create your environment file
cp .env.example .env
#   then edit .env with your Shopify credentials (see below)

# 4. Start the dev server
npm run dev
#   → http://localhost:4321
```

> [!TIP]
> The storefront will **run without any Shopify credentials**, but product, cart, and account features will be empty/disabled until you fill in `.env`. Start with the three Storefront variables to bring the catalogue to life.

---

## 🔐 Environment Variables

All variables are **server-side only** (no `PUBLIC_` prefix, except the Judge.me shop domain which is a non-secret identifier). They are read at runtime via `import.meta.env` in dev with a `process.env` fallback in production. A fully-commented template lives in [`.env.example`](.env.example).

### Storefront API — required

| Variable | Example | Description |
| --- | --- | --- |
| `SHOPIFY_SHOP_DOMAIN` | `your-shop.myshopify.com` | Your store's `.myshopify.com` domain. |
| `SHOPIFY_STOREFRONT_PRIVATE_TOKEN` | `shpat_…` | Storefront **private** (delegate) access token. **Server only.** |
| `SHOPIFY_API_VERSION` | `2026-04` | Pinned Storefront API version — never use unversioned URLs. |

### Customer Account API — optional (customer login)

| Variable | Example | Description |
| --- | --- | --- |
| `CUSTOMER_ACCOUNT_API_CLIENT_ID` | `shp_…` | Client ID from the Customer Account API settings. |
| `SHOPIFY_SHOP_ID` | `000000000000` | Your store's numeric Shop ID. |
| `CUSTOMER_ACCOUNT_API_VERSION` | `2025-01` | Customer Account API version (separate from the Storefront version). |

### Judge.me reviews — optional

| Variable | Example | Description |
| --- | --- | --- |
| `PUBLIC_JUDGEME_SHOP_DOMAIN` | `your-shop.myshopify.com` | Same value as `SHOPIFY_SHOP_DOMAIN` (non-secret identifier). |
| `JUDGEME_PRIVATE_TOKEN` | `…` | Judge.me **private** API token (read reviews). **Server only.** |

> [!WARNING]
> Never commit `.env`. Never add a `PUBLIC_` prefix to a secret — that would ship it to the browser. If a token leaks, rotate it in the Shopify/Judge.me admin immediately.

---

## 🛒 Shopify Setup

<details open>
<summary><strong>1 · Storefront API (required — catalogue, cart, checkout)</strong></summary>

<br />

1. In your Shopify admin, go to **Settings → Apps and sales channels → Develop apps** and **Create an app** (e.g. `Headless Storefront`).
2. Open **Configuration → Storefront API** and grant the scopes you need — at minimum:
   `unauthenticated_read_product_listings`, `unauthenticated_read_product_inventory`,
   `unauthenticated_write_checkouts`, `unauthenticated_read_checkouts`,
   `unauthenticated_read_content`, `unauthenticated_read_selling_plans`.
3. **Install** the app, then open **API credentials** and copy the **Storefront API access token**.
4. Put the values into `.env`:
   ```dotenv
   SHOPIFY_SHOP_DOMAIN=your-shop.myshopify.com
   SHOPIFY_STOREFRONT_PRIVATE_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxxxxxx
   SHOPIFY_API_VERSION=2026-04
   ```

> This project uses the **private** Storefront token, sent as the `Shopify-Storefront-Private-Token` header. (The *public* token, which uses `X-Shopify-Storefront-Access-Token`, is **not** what this app expects.)

</details>

<details>
<summary><strong>2 · Navigation menu (optional but recommended)</strong></summary>

<br />

The header can read the Shopify **`main-menu`** (Online Store → Navigation) when `USE_SHOPIFY_MENU` is enabled in [`src/config/site.ts`](src/config/site.ts); otherwise it falls back to the rich static menu defined in the header component. Either way, links resolve to the storefront's own routes.

</details>

<details>
<summary><strong>3 · Customer Account API (optional — login &amp; orders)</strong></summary>

<br />

1. Enable **Settings → Customer accounts → New customer accounts**.
2. Open the **Headless / Hydrogen** channel → **Customer Account API**.
3. Under **Application setup**, register the following using your **public HTTPS origin** (Shopify rejects `http://` and `localhost`, so use a tunnel host in development — see [Development](#-development-workflow)):
   | Field | Value |
   | --- | --- |
   | Callback URI(s) | `https://YOUR_HOST/account/authorize` |
   | JavaScript origin(s) | `https://YOUR_HOST` |
   | Logout URI | `https://YOUR_HOST` |
4. Copy the **Client ID** and your numeric **Shop ID** into `.env` (`CUSTOMER_ACCOUNT_API_CLIENT_ID`, `SHOPIFY_SHOP_ID`).

> The app derives its origin from `X-Forwarded-Proto` / `X-Forwarded-Host` (see [`src/lib/shopify/customer/origin.ts`](src/lib/shopify/customer/origin.ts)), so OAuth works automatically behind tunnels and proxies.

</details>

<details>
<summary><strong>4 · Judge.me reviews (optional)</strong></summary>

<br />

1. In **Judge.me admin → Settings → Integrations → "View API tokens"**, copy your **Private** token.
2. Add `PUBLIC_JUDGEME_SHOP_DOMAIN` (your `.myshopify.com` domain) and `JUDGEME_PRIVATE_TOKEN` to `.env`.
3. When unset, the PDP simply shows no reviews — nothing breaks.

</details>

---

## 🧑‍💻 Development Workflow

```bash
npm run dev      # http://localhost:4321 (HMR)
```

**Editing content** — brand name, tagline, navigation fallback, footer columns, value props, and the free-shipping threshold all live in a single source of truth: [`src/config/site.ts`](src/config/site.ts). Product/collection/article content comes from Shopify.

**Testing customer login locally** — the Customer Account API requires a **public HTTPS origin**. Expose your dev server with a tunnel and register that host in the Shopify Customer Account API settings (step 3 above):

```bash
# example — any HTTPS tunnel works (cloudflared, ngrok, etc.)
cloudflared tunnel --url http://localhost:4321
```

> Vite is configured with `server.allowedHosts: true` so tunnel hosts can reach the dev server. `localhost` is always allowed.

**Adding a page** — drop a `.astro` file in `src/pages/`. For data, import a typed function from `src/lib/shopify/services/*` (never call `shopifyFetch` or hit Shopify directly from a page — go through the services layer).

**Adding interactivity** — create a `.tsx` island in `src/components/react/`, render it from an `.astro` file with a hydration directive (`client:idle`, `client:load`, `client:visible`), and share state through the nanostores in `src/stores/`.

---

## 📜 Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server with HMR at `http://localhost:4321`. |
| `npm run build` | Build the standalone production server into `dist/`. |
| `npm run preview` | Serve the production build locally. |
| `npm run astro` | Run the Astro CLI (`npm run astro -- add`, `-- check`, etc.). |

---

## 🗺️ Routes

### Pages

| Route | Description |
| --- | --- |
| `/` | Home — editorial landing page |
| `/collections` · `/collections/all` · `/collections/[handle]` | Collections index, full catalogue, per-collection PLP |
| `/products` · `/products/[handle]` | Product listing &amp; product detail (PDP) |
| `/search` | Full search results |
| `/cart` · `/wishlist` | Cart page &amp; saved wishlist |
| `/account` | Customer account (login via Customer Account API) |
| `/blog` · `/blog/[handle]` | Journal listing &amp; article detail |
| `/about` · `/contact` · `/faq` | Brand, contact form, help centre |
| `/terms` · `/shipping-returns` · `/size-guide` · `/track-order` | Legal &amp; client-care pages |
| `/pages/[handle]` | Generic Shopify CMS pages |
| `/404` | Custom not-found page |

### API &amp; account endpoints (same-origin)

| Endpoint | Purpose |
| --- | --- |
| `POST /api/cart/add` · `/update` · `/remove` · `/discount` | Cart mutations (proxied to Shopify) |
| `GET /api/cart` | Read the current cart |
| `GET /api/search` | Predictive/instant search |
| `GET /api/recommendations` | "You may also like" products |
| `GET /api/products/[handle]` | Product JSON (quick view) |
| `POST /api/contact` | Contact form handler |
| `/account/login` · `/account/authorize` · `/account/logout` | OAuth 2.0 + PKCE login flow |

---

## 🗂️ Project Structure

```
tailored/
├─ astro.config.mjs          # SSR + Node standalone adapter, React, Tailwind (Vite)
├─ .env.example              # Documented environment template
├─ tsconfig.json             # "~/*" → "src/*" path alias, react-jsx
└─ src/
   ├─ config/
   │  └─ site.ts             # ⭐ Brand, nav fallback, footer, value props (single source of truth)
   ├─ layouts/
   │  └─ BaseLayout.astro    # HTML shell, <head>, SEO/OG meta, GSAP reveals, global chrome
   ├─ pages/                 # File-based routes (see Routes table)
   │  ├─ api/                # Same-origin JSON endpoints (cart, search, contact, …)
   │  └─ account/            # OAuth login / authorize / logout handlers
   ├─ lib/
   │  ├─ shopify/
   │  │  ├─ client.ts        # Server fetch client (private token, buyer-IP, errors)
   │  │  ├─ graphql/*.ts     # GraphQL operations grouped by domain
   │  │  ├─ services/*.ts    # Typed fetch + transform (the layer pages import)
   │  │  ├─ transforms.ts    # edges/node → clean domain shapes
   │  │  ├─ customer/*.ts    # Customer Account API: OAuth, PKCE, session, origin
   │  │  └─ types.ts · pagination.ts · sort-options.ts
   │  ├─ judgeme/            # Judge.me REST reviews (server-side)
   │  ├─ cart-server.ts · cart-cookie.ts   # httpOnly cart-id cookie + server cart
   │  └─ utils.ts · pagination.ts · article-utils.ts · shop-catalogue.ts
   ├─ stores/
   │  ├─ cart.ts             # nanostore cart (shared across islands)
   │  └─ wishlist.ts         # nanostore wishlist
   ├─ components/
   │  ├─ react/              # Interactive islands (.tsx): CartDrawer, PredictiveSearch,
   │  │                      #   ProductGallery, VariantSelector, QuickViewModal, BottomNav…
   │  ├─ ui/ layout/ global/ # Reusable .astro chrome (Header, Footer, Logo, SizeGuide…)
   │  ├─ product/ collection/ shop/ cards/   # Catalogue &amp; PDP building blocks
   │  └─ home/ sections/     # Home-page sections
   ├─ styles/
   │  ├─ global.css          # Design tokens (@theme), base styles, .rte content styles
   │  └─ shop-clone.css      # Scoped styles for the full-catalogue experience
   └─ assets/images/         # Local imagery (astro:assets optimized)
```

---

## 🚀 Deployment

This is an **SSR app** (`output: "server"`), so it deploys as a **long-running Node service**, not static files.

```bash
# 1. Build the standalone server
npm run build          # → dist/server/entry.mjs

# 2. Run it (set the env vars in your runtime)
HOST=0.0.0.0 PORT=4321 node ./dist/server/entry.mjs
```

**Checklist**

- Provide the Storefront env vars (and any optional Customer Account / Judge.me vars) in the **runtime environment**, not a committed file.
- Terminate TLS at a reverse proxy (Nginx, Caddy, a platform load balancer) and forward `X-Forwarded-Proto` / `X-Forwarded-Host` — the Customer Account API origin detection relies on them.
- Use a process manager (`pm2`, systemd) or a container.
- Register your **production HTTPS origin** in the Shopify Customer Account API settings (callback/JS-origin/logout URIs), exactly as you did for the tunnel in development.

Any host that runs Node works — a VPS, a container platform, or a Node-friendly PaaS (Railway, Render, Fly.io, a Dockerized deploy, etc.). For other targets, swap `@astrojs/node` for the matching Astro SSR adapter.

---

## 🩺 Troubleshooting

| Symptom | Cause &amp; fix |
| --- | --- |
| **Build fails on `@astrojs/node`** | Version mismatch. `astro@6` needs `@astrojs/node@^10` (v9 targets Astro 5) and `@astrojs/react@^4`. Keep the React 19 set intact. |
| **Empty catalogue / Shopify 401 / 403** | Missing or wrong Storefront token. Confirm you copied the **private** token and that `.env` has all three `SHOPIFY_*` values. |
| **`X-Shopify-Storefront-Access-Token` errors** | You're using a *public* token. This app expects the **private** token via `Shopify-Storefront-Private-Token`. |
| **Customer login redirect fails / "invalid origin"** | The Customer Account API rejects `http://` and `localhost`. Use an **HTTPS tunnel** and register that exact host (callback `…/account/authorize`, JS origin, logout) in Shopify. |
| **Dev server blocks a tunnel host** | Already handled via `server.allowedHosts: true` in `astro.config.mjs`; restart `npm run dev` after config changes. |
| **No reviews on the PDP** | `JUDGEME_PRIVATE_TOKEN` unset (or the store has no reviews). This is a graceful no-op, not an error. |
| **Node engine warning** | Use **Node ≥ 22.12.0** (`nvm use 22`). |
| **A page 404s that should exist** | This app is **SSR** — do not add `export const prerender = true`; prerendering the catalogue/PDP is unsupported here and breaks the build with the current Vite + Tailwind v4 setup. |
| **Two React copies / hydration errors** | `astro.config.mjs` already dedupes and pre-bundles React; run a clean install (`rm -rf node_modules && npm install`) if this appears. |

---

## 🤝 Contributing

Internal contributions welcome. Please keep the project's conventions:

1. **Branch** off `main` and open a PR — don't commit directly to `main`.
2. **Data flow** — pages/endpoints import from `src/lib/shopify/services/*` only; never call `shopifyFetch` or hit Shopify directly from a component.
3. **Secrets** — never introduce a `PUBLIC_`-prefixed secret; all tokens stay server-side.
4. **State** — share cross-island state through `src/stores/*` (nanostores), not per-island React state.
5. **Styling** — use the design tokens in `src/styles/global.css` and the spacing-scale utilities; avoid ad-hoc magic numbers.
6. **Accessibility &amp; motion** — keep focus traps on overlays and honour `prefers-reduced-motion`.
7. Ensure `npm run build` is **green** before requesting review.

---

## 📄 License

Proprietary — © L'ÉDITION. All rights reserved. No license file is included; contact the maintainers before reusing any part of this codebase.

<p align="center"><sub>Built with ❤️ on <a href="https://astro.build">Astro</a> · Powered by the <a href="https://shopify.dev/docs/api/storefront">Shopify Storefront API</a></sub></p>
