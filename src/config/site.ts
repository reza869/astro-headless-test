// ============================================================
//  Site configuration — brand, nav fallbacks, footer, value props.
//  Single source of truth (DRY) for non-Shopify content.
// ============================================================

export const SITE = {
  name: 'TAILORED',
  tagline: 'Modern Fashion & Everyday Luxury',
  /**
   * Free-shipping threshold in the shop's BASE currency (USD). Used for
   * base-currency policy copy (terms, shipping & returns, FAQ). For the live
   * cart meter — which runs in the shopper's presentment currency — use
   * `freeShipThreshold(currency)` instead, so a JPY cart isn't measured against
   * a USD number.
   */
  freeShippingThreshold: 150,
  /**
   * Free-shipping thresholds per PRESENTMENT currency. Shopify Markets converts
   * a single shipping rule per market, so the qualifying amount differs by
   * currency — a flat 150 would read as "unlocked" the instant a ¥ cart opens.
   * The cart meter reads the active currency here; a currency absent from this
   * map has no honest threshold, so the meter hides rather than lie. Keep these
   * aligned with the free-shipping rules in your Shopify Markets settings.
   */
  freeShippingThresholds: {
    USD: 150,
    EUR: 150,
    GBP: 130,
    CAD: 210,
    AUD: 230,
    JPY: 22000,
    CHF: 140,
    CNY: 1100,
    INR: 12500,
    AED: 550,
  } as Record<string, number>,
  /**
   * Newsletter email-capture popup (modal + backdrop). `enabled` toggles it
   * site-wide; `delaySeconds` is how long after load it appears (it also opens
   * on desktop exit-intent, whichever comes first); `remindDays` is how long a
   * dismissal is remembered before it may show again. The "10% off" discount
   * claim only renders in demo mode (SITE.demoContent) so nothing unbacked
   * ships to a production store — same convention as the Cta newsletter band.
   */
  newsletterPopup: { enabled: true, delaySeconds: 8, remindDays: 30 },
  /**
   * Gift wrapping. When `variantId` is a real ProductVariant gid, toggling gift
   * wrap adds/removes that line so it's actually charged (its real price shows
   * in the subtotal). Otherwise it records a `Gift wrap` cart attribute
   * (complimentary — the merchant fulfils it; nothing is fabricated into the
   * total). Leave `variantId` empty for the attribute-only default.
   */
  giftWrap: {
    enabled: true,
    label: 'Add gift wrapping',
    note: 'Hand-wrapped in signature tissue with a personal note.',
    /** e.g. 'gid://shopify/ProductVariant/1234567890'; empty = attribute-only. */
    variantId: '',
  },
  /**
   * Delivery-speed options shown on the cart as an ESTIMATE. Real shipping is
   * calculated by Shopify at checkout — these carry no fabricated price. The
   * shopper's choice is saved as a `Delivery preference` cart attribute so the
   * merchant sees it. `standard` shows "Free" once the free-shipping threshold
   * is met; everything else shows "Calculated at checkout".
   */
  deliveryOptions: [
    { key: 'standard', label: 'Standard', eta: '3–5 business days', freeOverThreshold: true },
    { key: 'express', label: 'Express', eta: '1–2 business days', freeOverThreshold: false },
    { key: 'pickup', label: 'Boutique pickup', eta: 'Flagship · ready today', free: true },
  ],
  /**
   * "Shop the Look" editorial lookbook.
   *
   * `bundleCode` must be a REAL Shopify discount (a code discount, or an
   * automatic discount surfaced by that code) that grants `bundleDiscountPct`
   * off. When set, "Add All" applies it and the bundle bar previews the saving.
   * Leave `bundleCode` empty (the default) to show the HONEST full sum with no
   * "Save X%" claim — nothing fabricated.
   *
   * `looks` curates each editorial: `handles` are the product handles shown (in
   * order) and `hotspots` are the image marker positions (as % — one per
   * product, sitting on the garment). Leave a look's `handles` empty to fall
   * back to best-sellers, so the section still works before it's curated.
   */
  shopTheLook: {
    bundleCode: '',
    bundleDiscountPct: 10,
    looks: [
      {
        id: '01',
        name: 'The Resort Edit',
        image: '/images/Look 01.png',
        handles: ['striped-silk-blouse', 'navy-sport-jacket', 'ocean-blue-shirt'] as string[],
        hotspots: [
          { x: '26%', y: '34%' },
          { x: '55%', y: '58%' },
          { x: '40%', y: '82%' },
        ],
      },
      {
        id: '02',
        name: 'City Tailoring',
        image: '/images/Look 02.png',
        handles: ['dark-winter-jacket', 'olive-green-jacket', 'striped-skirt-and-top'] as string[],
        hotspots: [
          { x: '42%', y: '30%' },
          { x: '50%', y: '60%' },
          { x: '45%', y: '84%' },
        ],
      },
      {
        id: '03',
        name: 'Evening Soft',
        image: '/images/Look 03.png',
        handles: ['white-cotton-shirt', 'striped-silk-blouse', 'dark-winter-jacket'] as string[],
        hotspots: [
          { x: '34%', y: '38%' },
          { x: '52%', y: '56%' },
          { x: '44%', y: '82%' },
        ],
      },
    ],
  },
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
  /**
   * Demo/marketing figures on the homepage (flash-sale "sold/left" counters,
   * category counts, editorial testimonials, "readers" stat, etc.) are
   * illustrative template content. Leave `true` for the full demo look; set
   * `false` for a production store so no fabricated numbers/claims render.
   */
  demoContent: true,
  /**
   * Homepage bundle builder. `code` MUST exist as a real fixed-percentage
   * discount in Shopify admin (Discounts) for the saving to apply at checkout;
   * `percent` must match it. Leave `code` empty to show the HONEST full sum
   * with no "Save X%" claim (nothing fabricated).
   *
   * `gift` drives the free gift-with-purchase meter. Enable it ONLY when a real
   * Shopify automatic gift (Buy-X-get-Y-free at this spend) is configured — the
   * theme shows the progress + unlock copy, and Shopify adds the actual gift at
   * checkout. Disabled by default so no store ever promises a gift it can't
   * deliver. `threshold` = spend to unlock; `label` = the gift's name in copy.
   */
  bundle: {
    code: 'BUNDLE15',
    percent: 15,
    gift: { enabled: false, threshold: 600, label: 'silk scarf' },
  },
  /**
   * "Compare the Edit" matrix (homepage, demo-only via SITE.demoContent).
   * Curate `handles` with 3 genuinely comparable products — leave empty to fall
   * back to best-sellers. `featuredIndex` is the highlighted "Editor's Pick"
   * column. Price, colours and rating are read from REAL product data
   * (Storefront options + the reviews.rating metafield), and any row hides
   * itself when no product carries that value — nothing is fabricated. `specs`
   * supplies the editorial attributes the Storefront API can't expose
   * (material/fit/lining/water), one entry per handle in the same order; they
   * apply ONLY to curated handles (never to the best-seller fallback). Edit the
   * label/description to match whatever you curate.
   */
  compare: {
    label: 'The Classics',
    subtitle: 'Compare materials, fit & finish',
    description:
      "Three signature everyday styles, side by side — so you can pick the one that's right for you.",
    featuredIndex: 1,
    handles: ['dark-winter-jacket', 'striped-skirt-and-top', 'olive-green-jacket'],
    specs: [
      { material: 'Cotton Poplin', fit: 'Regular', lining: false, water: false },
      { material: 'Cotton Denim', fit: 'Relaxed', lining: true, water: false },
      { material: 'Linen Blend', fit: 'Slim', lining: false, water: false },
    ],
  },
  /**
   * "Shop by Category" tiles. Each `handle` must be a REAL Shopify collection
   * handle (links resolve to /collections/<handle>) so no tile 404s. `count` is
   * an illustrative figure shown only in demo (SITE.demoContent); `image` is a
   * public/ asset. Edit these to your own collections.
   */
  categories: [
    { name: "Women's Fashion", handle: 'women-s-fashion', count: 248, image: '/images/Look 01.png' },
    { name: "Men's Fashion", handle: 'mens-fashion', count: 86, image: '/images/Hero Image 01.png' },
    { name: "Kid's Fashion", handle: 'kid-s-fashion', count: 64, image: '/images/Campaign 01.png' },
    { name: 'New Arrivals', handle: 'new-arrivals', count: 52, image: '/images/Look 02.png' },
    { name: 'Top Sales', handle: 'top-sale-s', count: 38, image: '/images/Hero Image 02.png' },
  ],
  // Rotating announcement bar (top ticker).
  announcements: [
    'Free carbon-neutral shipping on qualifying orders',
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
      body: 'Carbon-neutral delivery on every qualifying order.',
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
 * Free-shipping qualifying amount for a PRESENTMENT currency, or `null` when
 * that currency has no configured threshold. Callers showing a live cart meter
 * must treat `null` as "no meter" rather than fall back to the base number —
 * comparing a presentment subtotal against a USD 150 would misfire in every
 * other currency. See `SITE.freeShippingThresholds`.
 */
export function freeShipThreshold(currency: string | null | undefined): number | null {
  if (!currency) return null;
  const t = SITE.freeShippingThresholds[currency.toUpperCase()];
  return typeof t === 'number' ? t : null;
}

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
  /** Left card — "Shop the Event". Real Shopify collection handle. */
  midSeason: 'top-sale-s',
  /** Right card — "Join the Club". Real Shopify collection handle. */
  members: 'new-arrivals',
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
