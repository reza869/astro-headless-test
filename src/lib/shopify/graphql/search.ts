// ============================================================
//  Search GraphQL operations (Storefront API 2026-04)
// ============================================================
import { IMAGE_FRAGMENT, CARD_FRAGMENTS } from './fragments';

/** Full search results page (products). */
export const SEARCH_QUERY = /* GraphQL */ `
  ${CARD_FRAGMENTS}
  query Search(
    $query: String!
    $first: Int
    $last: Int
    $after: String
    $before: String
    $types: [SearchType!] = [PRODUCT]
    $sortKey: SearchSortKeys = RELEVANCE
    $reverse: Boolean = false
  ) {
    search(
      query: $query
      first: $first
      last: $last
      after: $after
      before: $before
      types: $types
      sortKey: $sortKey
      reverse: $reverse
    ) {
      totalCount
      pageInfo {
        hasNextPage
        hasPreviousPage
        endCursor
        startCursor
      }
      edges {
        node {
          ... on Product {
            ...ProductCard
          }
        }
      }
    }
  }
`;

/** Full multi-type search — products, journal articles and pages in a
 *  single search connection. __typename discriminates each node so the
 *  service can map it to the right card model. */
export const SEARCH_ALL_QUERY = /* GraphQL */ `
  ${CARD_FRAGMENTS}
  query SearchAll(
    $query: String!
    $first: Int
    $last: Int
    $after: String
    $before: String
    $types: [SearchType!] = [PRODUCT, ARTICLE, PAGE]
    $sortKey: SearchSortKeys = RELEVANCE
    $reverse: Boolean = false
  ) {
    search(
      query: $query
      first: $first
      last: $last
      after: $after
      before: $before
      types: $types
      sortKey: $sortKey
      reverse: $reverse
    ) {
      totalCount
      pageInfo {
        hasNextPage
        hasPreviousPage
        endCursor
        startCursor
      }
      edges {
        node {
          __typename
          ... on Product {
            ...ProductCard
          }
          ... on Article {
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
          ... on Page {
            id
            handle
            title
            bodySummary
          }
        }
      }
    }
  }
`;

/** Predictive (instant) search for the header autocomplete. */
export const PREDICTIVE_SEARCH_QUERY = /* GraphQL */ `
  ${IMAGE_FRAGMENT}
  query PredictiveSearch(
    $query: String!
    $limit: Int = 6
    $types: [PredictiveSearchType!] = [PRODUCT, COLLECTION, QUERY]
    $limitScope: PredictiveSearchLimitScope = EACH
  ) {
    predictiveSearch(query: $query, limit: $limit, types: $types, limitScope: $limitScope) {
      queries {
        text
        styledText
      }
      products {
        id
        title
        handle
        featuredImage {
          ...ImageFields
        }
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
      }
      collections {
        id
        title
        handle
        image {
          ...ImageFields
        }
      }
    }
  }
`;
