# Tailored — Astro Theme for Headless Shopify

A modern, headless Shopify storefront theme built with [Astro](https://astro.build), React islands, and Tailwind CSS. It talks to your store through the Shopify Storefront API, so your content stays in Shopify while the front end stays fast and fully custom.

![Tailored preview](./public/banner.png)

## Why Astro?

Astro ships **zero JavaScript by default** and hydrates only the interactive pieces (cart, search, account) as isolated islands. The result is a storefront that loads fast and scores well where it matters:

- **Server-rendered HTML** streamed from the edge — minimal client-side JS.
- **Excellent Core Web Vitals** (LCP, CLS, INP) and high PageSpeed / Lighthouse scores out of the box.
- **Islands architecture** — React only where you need it, static HTML everywhere else.
- **SEO-ready** — clean markup, JSON-LD structured data, and dynamic sitemap/robots.

## Prerequisites

- [Node.js](https://nodejs.org) **22.12.0 or newer**
- A Shopify store
- The official **[Shopify Headless](https://apps.shopify.com/headless)** sales channel app installed on your store

> The **Headless** app is what exposes the Storefront API to this theme. Install it, create a storefront, and it will generate the Storefront API access token used below. No custom app setup is required.

## Quick Setup

1. **Install the Shopify Headless app** on your store and create a storefront.

2. **Copy the environment file** and fill in your credentials:

   ```bash
   cp .env.example .env
   ```

   At minimum, set your Storefront API values (from the Headless app):

   ```bash
   SHOPIFY_SHOP_DOMAIN=your-shop.myshopify.com
   SHOPIFY_STOREFRONT_PRIVATE_TOKEN=your-storefront-api-token
   SHOPIFY_API_VERSION=2026-04
   ```

   Customer accounts and Judge.me reviews are optional — see the comments in `.env.example` to enable them.

3. **Install dependencies:**

   ```bash
   npm install
   ```

## Development

Start the dev server at `http://localhost:4321`:

```bash
npm run dev
```

## Build

Build for production and preview the output locally:

```bash
npm run build
npm run preview
```

## Command Reference

| Command | Description |
| --- | --- |
| `npm run dev` | Start the local dev server at `http://localhost:4321`. |
| `npm run build` | Build the production site to `dist/`. |
| `npm run preview` | Serve the production build locally to test before deploying. |
| `npm run check` | Run `astro check` for type and diagnostic errors. |
| `npm run astro` | Run any Astro CLI command directly (e.g. `npm run astro -- add`). |

## Project Structure

```
src/
├── assets/       # Images and static assets processed by Astro
├── components/   # UI components (cards, product, sections, global, ui, react islands)
├── config/       # Site config (brand, nav, contact, feature flags)
├── layouts/      # Base and page layout shells
├── lib/          # Shopify Storefront client, Judge.me, cart, and helpers
├── pages/        # Routes, including /api endpoints (cart, search, contact)
├── stores/       # Nanostores state (cart, wishlist)
└── styles/       # Global Tailwind CSS and design tokens
public/           # Static files served as-is (images, favicon, banner)
```

## Troubleshooting

**401 / 403 "Access denied" from the Storefront API**
Your token or scopes are wrong. Confirm `SHOPIFY_STOREFRONT_PRIVATE_TOKEN` comes from the **Headless** app's storefront, and that Storefront API access is enabled. Also check `SHOPIFY_SHOP_DOMAIN` is the `*.myshopify.com` domain (not a custom domain).

**No products show up**
Make sure your products are **published to the Headless sales channel** in Shopify, and that at least one product is active with a price.

**Prices all show as $1 (or the wrong currency)**
This is a Shopify **Markets** configuration issue, not a theme bug. Review your Markets settings and test in a fresh session.

**Customer login redirects fail**
The Customer Account API requires an **HTTPS** origin — it rejects `http://localhost`. Use a tunnel (e.g. Cloudflare Tunnel) and register that HTTPS host in the Headless channel's Customer Account API settings. See `.env.example` for the exact callback/origin/logout URIs.

**Reviews don't appear**
Judge.me is optional. When `JUDGEME_PRIVATE_TOKEN` is unset the PDP simply shows no reviews, and the "Write a review" form is hidden — nothing breaks. With the token set, submitted reviews land in Judge.me as *pending* and appear after you approve them in the moderation queue.

**Back-in-stock notifications**
Not bundled by design. Out-of-stock variants show a disabled "Out of stock" state. A notify-me backend needs a provider (email/marketing service) and persistent storage, which would tie the theme to one host — against its deploy-anywhere goal. Add it with a Shopify "Back in Stock" app, or wire your own provider to a small API route.

## License

See the [LICENSE](./LICENSE) file, or contact support@hasthemes.com.
