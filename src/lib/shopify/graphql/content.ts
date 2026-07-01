// ============================================================
//  Content GraphQL operations — menus, shop (2026-04)
// ============================================================

/** Navigation menu by handle (e.g. "main-menu", "footer"); nests 3 levels. */
export const MENU_QUERY = /* GraphQL */ `
  query Menu($handle: String!) {
    menu(handle: $handle) {
      id
      title
      items {
        id
        title
        url
        type
        items {
          id
          title
          url
          type
          items {
            id
            title
            url
            type
          }
        }
      }
    }
  }
`;

/** Shop name + primary domain — for SEO and footer. */
export const SHOP_QUERY = /* GraphQL */ `
  query Shop {
    shop {
      name
      description
      primaryDomain {
        url
        host
      }
    }
  }
`;

/** Storefront localization — active + available currencies & languages.
 *  Active country/language reflect the @inContext default (shop primary)
 *  unless a market context is supplied. */
export const LOCALIZATION_QUERY = /* GraphQL */ `
  query Localization {
    localization {
      country {
        isoCode
        currency {
          isoCode
          name
          symbol
        }
      }
      language {
        isoCode
        endonymName
      }
      availableCountries {
        isoCode
        currency {
          isoCode
          name
          symbol
        }
      }
      availableLanguages {
        isoCode
        endonymName
      }
    }
  }
`;

/** Shop legal policies — the merchant-editable Settings → Policies
 *  documents (terms of service, privacy, refund, shipping). Each is a
 *  ShopPolicy with rendered HTML `body`; null when the merchant hasn't
 *  written one. Kept in one query so a page can grab any policy cheaply. */
export const SHOP_POLICIES_QUERY = /* GraphQL */ `
  query ShopPolicies {
    shop {
      termsOfService { id title handle body url }
      privacyPolicy { id title handle body url }
      refundPolicy { id title handle body url }
      shippingPolicy { id title handle body url }
    }
  }
`;

/** A CMS page by handle (about, shipping, etc.). */
export const PAGE_QUERY = /* GraphQL */ `
  query Page($handle: String!) {
    page(handle: $handle) {
      id
      title
      handle
      body
      bodySummary
      seo {
        title
        description
      }
    }
  }
`;

// ── Blog / articles ─────────────────────────────────────────
// `summary` aliases the plain-text body truncated to a card-sized
// teaser, used only when an article has no manual excerpt.

/** Card-sized article fields shared by the listing + related rails. */
const ARTICLE_CARD_FRAGMENT = /* GraphQL */ `
  fragment ArticleCard on Article {
    id
    handle
    title
    excerpt
    bodyText: content(truncateAt: 4000)
    publishedAt
    tags
    image {
      id
      url
      altText
      width
      height
    }
    authorV2 {
      name
    }
    blog {
      handle
      title
    }
  }
`;

/** Newest articles across every blog (top-level connection). The optional
 *  `query` arg supports Shopify's search syntax (e.g. `tag:Style`). */
export const ARTICLES_QUERY = /* GraphQL */ `
  ${ARTICLE_CARD_FRAGMENT}
  query Articles($first: Int!, $after: String, $query: String) {
    articles(first: $first, after: $after, sortKey: PUBLISHED_AT, reverse: true, query: $query) {
      edges {
        cursor
        node {
          ...ArticleCard
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;

/** A single article by handle. The Storefront API has no top-level
 *  articleByHandle, so we resolve it across every blog and keep the
 *  first non-null hit (article handles are unique within a blog). */
export const ARTICLE_QUERY = /* GraphQL */ `
  query Article($handle: String!) {
    blogs(first: 25) {
      edges {
        node {
          handle
          title
          articleByHandle(handle: $handle) {
            id
            handle
            title
            excerpt
            contentHtml
            publishedAt
            tags
            image {
              id
              url
              altText
              width
              height
            }
            authorV2 {
              name
              bio
            }
            seo {
              title
              description
            }
          }
        }
      }
    }
  }
`;
