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
    availableForSale
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

export const PRODUCT_CARD_FRAGMENT = /* GraphQL */ `
  fragment ProductCard on Product {
    id
    title
    handle
    vendor
    availableForSale
    featuredImage {
      ...ImageFields
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
    variants(first: 1) {
      edges {
        node {
          id
          availableForSale
        }
      }
    }
  }
`;

export const CART_FRAGMENT = /* GraphQL */ `
  fragment CartFields on Cart {
    id
    checkoutUrl
    totalQuantity
    note
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
            amountPerQuantity {
              ...Money
            }
          }
          merchandise {
            ... on ProductVariant {
              id
              title
              availableForSale
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
export const CARD_FRAGMENTS = [MONEY_FRAGMENT, IMAGE_FRAGMENT, PRODUCT_CARD_FRAGMENT].join('\n');
