// ============================================================
//  Product GraphQL operations (Storefront API 2026-04)
// ============================================================
import {
  MONEY_FRAGMENT,
  IMAGE_FRAGMENT,
  VARIANT_FRAGMENT,
  OPTION_SWATCH_FRAGMENT,
  MEDIA_FRAGMENT,
  CARD_FRAGMENTS,
} from './fragments';

/** Paginated, sortable, filterable product list (bidirectional cursors). */
export const PRODUCTS_QUERY = /* GraphQL */ `
  ${CARD_FRAGMENTS}
  query ProductList(
    $first: Int
    $last: Int
    $after: String
    $before: String
    $sortKey: ProductSortKeys = BEST_SELLING
    $reverse: Boolean = false
    $query: String
  ) {
    products(
      first: $first
      last: $last
      after: $after
      before: $before
      sortKey: $sortKey
      reverse: $reverse
      query: $query
    ) {
      pageInfo {
        hasNextPage
        hasPreviousPage
        endCursor
        startCursor
      }
      edges {
        cursor
        node {
          ...ProductCard
        }
      }
    }
  }
`;

/** Enriched catalogue list for the designed /shop page: reuses the lean
 *  ProductCard fragment and adds the facets the control deck + refine panel
 *  need (category, tags, recency, colour swatches). Single forward page —
 *  the page filters / sorts / paginates client-side over the loaded set. */
export const SHOP_PRODUCTS_QUERY = /* GraphQL */ `
  ${CARD_FRAGMENTS}
  query ShopProductList(
    $first: Int = 48
    $after: String
    $sortKey: ProductSortKeys = BEST_SELLING
    $reverse: Boolean = false
    $query: String
  ) {
    products(first: $first, after: $after, sortKey: $sortKey, reverse: $reverse, query: $query) {
      edges {
        node {
          ...ProductCard
          createdAt
          tags
          collections(first: 12) {
            nodes {
              title
              handle
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

/** Single product by handle — full detail for the PDP. */
export const PRODUCT_BY_HANDLE_QUERY = /* GraphQL */ `
  ${MONEY_FRAGMENT}
  ${IMAGE_FRAGMENT}
  ${VARIANT_FRAGMENT}
  ${OPTION_SWATCH_FRAGMENT}
  ${MEDIA_FRAGMENT}
  query ProductByHandle($handle: String!) {
    product(handle: $handle) {
      id
      title
      handle
      description
      descriptionHtml
      productType
      vendor
      tags
      availableForSale
      featuredImage {
        ...ImageFields
      }
      images(first: 20) {
        edges {
          node {
            ...ImageFields
          }
        }
      }
      media(first: 20) {
        edges {
          node {
            ...MediaFields
          }
        }
      }
      priceRange {
        minVariantPrice {
          ...Money
        }
        maxVariantPrice {
          ...Money
        }
      }
      compareAtPriceRange {
        minVariantPrice {
          ...Money
        }
      }
      options {
        ...OptionSwatch
      }
      variants(first: 100) {
        edges {
          node {
            ...VariantFields
          }
        }
      }
      seo {
        title
        description
      }
      metafields(identifiers: [
        { namespace: "reviews", key: "rating" }
        { namespace: "reviews", key: "rating_count" }
        { namespace: "meta", key: "product_new_badge" }
        { namespace: "custom", key: "material" }
        { namespace: "custom", key: "lining" }
        { namespace: "custom", key: "weight" }
        { namespace: "custom", key: "origin" }
        { namespace: "custom", key: "care" }
        { namespace: "custom", key: "model_note" }
        { namespace: "custom", key: "dispatch" }
        { namespace: "custom", key: "units_sold" }
        { namespace: "custom", key: "fit_notes" }
        { namespace: "meta", key: "product_countdown" }
        { namespace: "custom", key: "promo_code" }
        { namespace: "meta", key: "product_size_guide" }
        { namespace: "custom", key: "product_specification" }
        { namespace: "custom", key: "personalization" }
      ]) {
        namespace
        key
        value
      }
    }
  }
`;

/** Related products for the PDP. `intent` selects RELATED (default, "you may
 *  also like") or COMPLEMENTARY ("goes well with") for cross-sell (MP-20). */
export const PRODUCT_RECOMMENDATIONS_QUERY = /* GraphQL */ `
  ${CARD_FRAGMENTS}
  query ProductRecommendations($productId: ID!, $intent: ProductRecommendationIntent = RELATED) {
    productRecommendations(productId: $productId, intent: $intent) {
      ...ProductCard
    }
  }
`;

/** All product handles — for static params / sitemaps if needed. */
export const PRODUCT_HANDLES_QUERY = /* GraphQL */ `
  query ProductHandles($first: Int = 250, $after: String) {
    products(first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          handle
        }
      }
    }
  }
`;
