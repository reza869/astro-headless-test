// @ts-check
import { defineConfig, sessionDrivers } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import react from "@astrojs/react";
import cloudflare from "@astrojs/cloudflare";
import node from "@astrojs/node";
import vercel from "@astrojs/vercel";
import netlify from "@astrojs/netlify";

function getAdapter() {
  const target = process.env.ASTRO_ADAPTER;
  if (target === "node") {
    return node({ mode: "standalone" });
  }
  if (target === "vercel" || process.env.VERCEL === "1" || process.env.VERCEL === "true") {
    return vercel();
  }
  if (target === "netlify" || process.env.NETLIFY === "true") {
    return netlify();
  }
  if (target === "cloudflare" || process.env.CF_PAGES === "1") {
    return cloudflare({ imageService: "compile" });
  }
  // Default fallback
  return cloudflare({ imageService: "compile" });
}

// Headless Shopify storefront — server-rendered (SSR) on Cloudflare
// Workers so the private Storefront token stays server-side and cart
// cookies work.
//
// Requires the `nodejs_compat` compatibility flag (node:crypto in the
// OAuth PKCE flow + process.env for runtime secrets) — configured in
// wrangler.jsonc. Set the Storefront / Customer Account / Judge.me env
// vars as Worker vars & secrets (Cloudflare dashboard or `wrangler secret`).
// https://astro.build/config
export default defineConfig({
  output: "server",
  // Public production URL. Canonical/OG/sitemap all derive from the live
  // request origin at runtime, so this is optional — set SITE_URL only if you
  // want Astro.site populated for absolute-URL helpers. No wrong default.
  site: process.env.SITE_URL || undefined,
  adapter: getAdapter(),
  // Sessions: this storefront never uses `Astro.session` — customer auth and
  // the cart are httpOnly cookies (see src/lib/shopify/customer/session.ts and
  // src/lib/cart-cookie.ts). Left on the default, @astrojs/cloudflare would
  // auto-enable a KV-backed session store and declare a `SESSION` KV binding in
  // the deploy config, forcing a KV namespace to be created for a feature
  // nothing uses. The `null` (no-op) driver keeps sessions disabled and stops
  // that KV binding from ever being emitted into dist/server/wrangler.json.
  session: { driver: sessionDrivers.null() },
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    // Allow a tunnel host to reach the dev server (otherwise Vite blocks
    // unknown Host headers). localhost is always allowed.
    server: {
      allowedHosts: true,
    },
    // Force Vite to pre-bundle React to ESM so islands get the named
    // `createRoot` export, and dedupe to a single copy.
    optimizeDeps: {
      include: ["react", "react-dom", "react-dom/client", "react/jsx-runtime"],
    },
    resolve: {
      dedupe: ["react", "react-dom"],
    },
  },
});
