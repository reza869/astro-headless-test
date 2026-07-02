// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import react from "@astrojs/react";
import cloudflare from "@astrojs/cloudflare";

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
  adapter: cloudflare({
    // Optimize local <Image> imports at build time; remote images pass
    // through untouched (Workers can't run sharp at request time).
    imageService: "compile",
  }),
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
