# Tailored — Astro Theme for Headless Shopify

A modern, headless Shopify storefront theme built with [Astro](https://astro.build), React islands, and Tailwind CSS. It talks to your store through the Shopify Storefront API, so your content stays in Shopify while the front end stays fast and fully custom.

![Tailored preview](./public/og-image.png)

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

## License

See the [LICENSE](./LICENSE) file, or contact support@hasthemes.com.
