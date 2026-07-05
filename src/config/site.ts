// ============================================================
//  Site configuration — brand, nav fallbacks, footer, value props.
//  Single source of truth (DRY) for non-Shopify content.
// ============================================================

export const SITE = {
  name: 'TAILORED',
  tagline: 'Modern Fashion & Everyday Luxury',
  /** Free-shipping threshold (matches the value in `announcements`). */
  freeShippingThreshold: 150,
  description:
    'Modern everyday apparel — better materials, cleaner cuts, cut for the way you actually live. A headless Shopify storefront built with Astro.',
  // ─── Business / contact details ───────────────────────────────
  // Placeholders — a store owner replaces these with their own. They are
  // the single source of truth for every email/phone/address in the theme.
  supportEmail: 'care@tailored.com',
  pressEmail: 'press@tailored.com',
  wholesaleEmail: 'wholesale@tailored.com',
  phone: '+1 (212) 555-0100',
  phoneHref: '+12125550100',
  /** Physical flagship / HQ shown in the footer and contact page. */
  flagshipName: 'TAILORED Flagship',
  address: '120 Lafayette Street, New York, NY 10013',
  addressCity: 'New York',
  /** Encoded destination for the "get directions" link. */
  addressMapsQuery: '120+Lafayette+Street+New+York+NY+10013',
  /** Default social-share image (public/, ~1200x630). Buyers replace it. */
  ogImage: '/og-image.png',
  // Rotating announcement bar (top ticker).
  announcements: [
    'Free carbon-neutral shipping over $150',
    'Easy 30-day returns',
    'New season — Drop 01 out now',
  ],
  social: [
    { label: 'Facebook', href: 'https://facebook.com', icon: 'facebook' as const },
    { label: 'Instagram', href: 'https://instagram.com', icon: 'instagram' as const },
    { label: 'YouTube', href: 'https://youtube.com', icon: 'youtube' as const },
    { label: 'TikTok', href: 'https://tiktok.com', icon: 'tiktok' as const },
    { label: 'X', href: 'https://x.com', icon: 'x' as const },
    { label: 'Pinterest', href: 'https://pinterest.com', icon: 'pinterest' as const },
  ],
  /** Trust strip on home + PDP. */
  valueProps: [
    {
      icon: 'truck' as const,
      title: 'Free shipping',
      body: 'Carbon-neutral delivery on every order over $150.',
    },
    {
      icon: 'rotate' as const,
      title: 'Easy 30-day returns',
      body: 'Changed your mind? Send it back within 30 days, no fuss.',
    },
    {
      icon: 'shield' as const,
      title: 'Made to last',
      body: 'Premium materials and honest construction, built for the long haul.',
    },
  ],
  /** Footer link columns (handles resolve to /pages/* or external). */
  footerColumns: [
    {
      title: 'Shop',
      links: [
        { label: 'New Arrivals', href: '/products?sort=newest' },
        { label: 'Ready-to-Wear', href: '/collections/ready-to-wear' },
        { label: 'Accessories', href: '/collections/accessories' },
        { label: 'The Resort Edit', href: '/collections/resort' },
        { label: 'Sale', href: '/collections/on-sale' },
      ],
    },
    {
      title: 'Editorial',
      links: [
        { label: 'The Journal', href: '/blog' },
        { label: 'Cover Stories', href: '/blog' },
        { label: 'Lookbooks', href: '/pages/lookbooks' },
        { label: 'Runway Films', href: '/pages/runway' },
      ],
    },
    {
      title: 'Client Care',
      links: [
        { label: 'Contact Us', href: '/contact' },
        { label: 'FAQ', href: '/faq' },
        { label: 'Wishlist', href: '/wishlist' },
        { label: 'Shipping & Returns', href: '/shipping-returns' },
        { label: 'Size Guide', href: '/size-guide' },
        { label: 'Track Order', href: '/track-order' },
      ],
    },
  ],
} as const;

/**
 * Header navigation source.
 *   true  → pull the menu from Shopify ("main-menu" handle). Parents
 *           listed in MEGA_MENU_PARENTS render as a mega menu (children =
 *           columns, nested children = links); other parents render as a
 *           dropdown; childless items render as plain links.
 *   false → use the rich static NAV in Header.astro (mega + feature banners).
 * Falls back to the static NAV automatically if Shopify is unreachable.
 */
/**
 * Homepage Campaign cards — which Shopify collection each CTA links to.
 * Edit the handle to retarget a button to any collection (this is the
 * Astro equivalent of a Shopify Theme Editor setting). The button links
 * resolve to `/collections/<handle>`.
 */
export const CAMPAIGN_COLLECTIONS = {
  /** Left card — "Shop the Event". */
  midSeason: 'mid-season-sale',
  /** Right card — "Join the Club". */
  members: 'members',
} as const;

export const USE_SHOPIFY_MENU = false;

/**
 * Parent menu titles (from the Shopify menu) that should render as a
 * full-width MEGA menu instead of a compact dropdown. Match is
 * case-insensitive. Each listed parent's children become the mega
 * columns, and their nested children become that column's links.
 * Any parent with children NOT listed here renders as a dropdown.
 * Only applies when USE_SHOPIFY_MENU is true. Example: ['Shop', 'Collections'].
 */
export const MEGA_MENU_PARENTS: string[] = [];

/** Header nav used when the Shopify "main-menu" is unavailable. */
export const FALLBACK_NAV = [
  { title: 'Shop', url: '/products' },
  { title: 'Collections', url: '/collections' },
  { title: 'Journal', url: '/pages/journal' },
];
