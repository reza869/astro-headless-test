// @ts-check
import { defineConfig } from "astro/config";
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
  adapter: getAdapter(),
  // NOTE: sessions are intentionally left on the adapter default. On
  // Cloudflare that is the KV-backed store bound to the `SESSION` namespace
  // (auto-declared by @astrojs/cloudflare and emitted into
  // dist/server/wrangler.json). Do NOT set an in-memory driver here
  // (e.g. lruCache): on Workers it is per-isolate and ephemeral, so any
  // Astro.session data would be silently lost between requests on the edge.
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
