// ============================================================
//  Product GraphQL operations (Storefront API 2026-04)
// ============================================================
import {
  MONEY_FRAGMENT,
  IMAGE_FRAGMENT,
  VARIANT_FRAGMENT,
  PRODUCT_CARD_FRAGMENT,
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
    $sortKey: ProductSortKeys = BEST_SELLING
    $reverse: Boolean = false
    $query: String
  ) {
    products(first: $first, sortKey: $sortKey, reverse: $reverse, query: $query) {
      edges {
        node {
          ...ProductCard
          productType
          createdAt
          tags
          collections(first: 12) {
            nodes {
              title
              handle
            }
          }
          options {
            name
            optionValues {
              name
              swatch {
                color
              }
            }
          }
        }
      }
    }
  }
`;

/** Single product by handle — full detail for the PDP. */
export const PRODUCT_BY_HANDLE_QUERY = /* GraphQL */ `
  ${MONEY_FRAGMENT}
  ${IMAGE_FRAGMENT}
  ${VARIANT_FRAGMENT}
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
        id
        name
        optionValues {
          id
          name
        }
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
    }
  }
`;

/** Related products for the PDP. */
export const PRODUCT_RECOMMENDATIONS_QUERY = /* GraphQL */ `
  ${CARD_FRAGMENTS}
  query ProductRecommendations($productId: ID!) {
    productRecommendations(productId: $productId) {
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
