// ============================================================
//  Collection GraphQL operations (Storefront API 2026-04)
// ============================================================
import { IMAGE_FRAGMENT, CARD_FRAGMENTS } from './fragments';

/** Single collection + its products (paginated, sortable, faceted). */
export const COLLECTION_BY_HANDLE_QUERY = /* GraphQL */ `
  ${CARD_FRAGMENTS}
  query CollectionByHandle(
    $handle: String!
    $first: Int
    $last: Int
    $after: String
    $before: String
    $sortKey: ProductCollectionSortKeys = COLLECTION_DEFAULT
    $reverse: Boolean = false
    $filters: [ProductFilter!]
  ) {
    collection(handle: $handle) {
      id
      title
      handle
      description
      descriptionHtml
      image {
        ...ImageFields
      }
      seo {
        title
        description
      }
      products(
        first: $first
        last: $last
        after: $after
        before: $before
        sortKey: $sortKey
        reverse: $reverse
        filters: $filters
      ) {
        pageInfo {
          hasNextPage
          hasPreviousPage
          endCursor
          startCursor
        }
        filters {
          id
          label
          type
          values {
            id
            label
            count
            input
          }
        }
        edges {
          cursor
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
  }
`;

/** Lightweight product-count for a collection (ids only). The Storefront API
 *  has no total-count field, so we count one max-size page: exact for stores up
 *  to 250 products in the collection, and `hasMore` flags "250+" beyond that. */
export const COLLECTION_COUNT_QUERY = /* GraphQL */ `
  query CollectionCount($handle: String!) {
    collection(handle: $handle) {
      products(first: 250) {
        edges { node { id } }
        pageInfo { hasNextPage }
      }
    }
  }
`;

/** All collections — for nav / collection index. */
export const COLLECTIONS_QUERY = /* GraphQL */ `
  ${IMAGE_FRAGMENT}
  query Collections($first: Int = 50, $after: String) {
    collections(first: $first, after: $after, sortKey: TITLE) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          title
          handle
          description
          image {
            ...ImageFields
          }
        }
      }
    }
  }
`;
