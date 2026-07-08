// ============================================================
//  Reusable GraphQL fragments (Storefront API 2026-04)
// ============================================================
// Concatenate the fragments a query needs ahead of the operation
// string. Defined once, reused everywhere (DRY).

export const MONEY_FRAGMENT = /* GraphQL */ `
  fragment Money on MoneyV2 {
    amount
    currencyCode
  }
`;

export const IMAGE_FRAGMENT = /* GraphQL */ `
  fragment ImageFields on Image {
    id
    url
    altText
    width
    height
  }
`;

export const VARIANT_FRAGMENT = /* GraphQL */ `
  fragment VariantFields on ProductVariant {
    id
    title
    sku
    barcode
    availableForSale
    quantityAvailable
    currentlyNotInStock
    quantityRule {
      minimum
      maximum
      increment
    }
    selectedOptions {
      name
      value
    }
    price {
      ...Money
    }
    compareAtPrice {
      ...Money
    }
    image {
      ...ImageFields
    }
  }
`;

// Product media (Storefront) — images + Video / ExternalVideo / Model3d (MP-5).
// Requires IMAGE_FRAGMENT to be included in the same operation.
export const MEDIA_FRAGMENT = /* GraphQL */ `
  fragment MediaFields on Media {
    mediaContentType
    alt
    ... on MediaImage {
      id
      image {
        ...ImageFields
      }
    }
    ... on Video {
      id
      previewImage {
        ...ImageFields
      }
      sources {
        url
        mimeType
        width
        height
      }
    }
    ... on ExternalVideo {
      id
      host
      embeddedUrl
      previewImage {
        ...ImageFields
      }
    }
    ... on Model3d {
      id
      previewImage {
        ...ImageFields
      }
      sources {
        url
        mimeType
      }
    }
  }
`;

// Reusable option-with-swatch selection (Storefront 2024-07+). Gives real
// merchant-defined colour hexes + image swatches, replacing the brittle
// name→hex fallback map. Shared by the card grid and the PDP.
export const OPTION_SWATCH_FRAGMENT = /* GraphQL */ `
  fragment OptionSwatch on ProductOption {
    id
    name
    optionValues {
      id
      name
      swatch {
        color
        image {
          previewImage {
            url
          }
        }
      }
    }
  }
`;

export const PRODUCT_CARD_FRAGMENT = /* GraphQL */ `
  fragment ProductCard on Product {
    id
    title
    handle
    vendor
    productType
    availableForSale
    featuredImage {
      ...ImageFields
    }
    images(first: 2) {
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
      ...OptionSwatch
    }
    variants(first: 1) {
      edges {
        node {
          id
          availableForSale
        }
      }
    }
    metafields(identifiers: [
      { namespace: "reviews", key: "rating" }
      { namespace: "reviews", key: "rating_count" }
      { namespace: "meta", key: "product_new_badge" }
    ]) {
      namespace
      key
      value
    }
  }
`;

export const CART_FRAGMENT = /* GraphQL */ `
  fragment CartFields on Cart {
    id
    checkoutUrl
    totalQuantity
    note
    buyerIdentity {
      countryCode
    }
    attributes {
      key
      value
    }
    discountCodes {
      applicable
      code
    }
    discountAllocations {
      discountedAmount {
        ...Money
      }
    }
    cost {
      subtotalAmount {
        ...Money
      }
      totalAmount {
        ...Money
      }
    }
    lines(first: 100) {
      edges {
        node {
          id
          quantity
          cost {
            totalAmount {
              ...Money
            }
            subtotalAmount {
              ...Money
            }
            amountPerQuantity {
              ...Money
            }
            compareAtAmountPerQuantity {
              ...Money
            }
          }
          discountAllocations {
            discountedAmount {
              ...Money
            }
            ... on CartCodeDiscountAllocation {
              code
            }
            ... on CartAutomaticDiscountAllocation {
              title
            }
            ... on CartCustomDiscountAllocation {
              title
            }
          }
          attributes {
            key
            value
          }
          merchandise {
            ... on ProductVariant {
              id
              title
              availableForSale
              quantityAvailable
              quantityRule {
                minimum
                maximum
                increment
              }
              selectedOptions {
                name
                value
              }
              price {
                ...Money
              }
              image {
                ...ImageFields
              }
              product {
                id
                title
                handle
                featuredImage {
                  ...ImageFields
                }
              }
            }
          }
        }
      }
    }
  }
`;

/** Fragments the cart operations need, bundled for convenience. */
export const CART_FRAGMENTS = [MONEY_FRAGMENT, IMAGE_FRAGMENT, CART_FRAGMENT].join('\n');

/** Fragments the product-card grids need. */
export const CARD_FRAGMENTS = [
  MONEY_FRAGMENT,
  IMAGE_FRAGMENT,
  OPTION_SWATCH_FRAGMENT,
  PRODUCT_CARD_FRAGMENT,
].join('\n');
