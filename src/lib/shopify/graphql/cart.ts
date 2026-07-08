// ============================================================
//  Cart GraphQL operations (Storefront API 2026-04)
// ============================================================
// The Cart API *is* the checkout: build a cart, then send the
// buyer to cart.checkoutUrl. There is no checkoutCreate anymore.
import { CART_FRAGMENTS } from './fragments';

export const CART_CREATE_MUTATION = /* GraphQL */ `
  ${CART_FRAGMENTS}
  mutation CartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart {
        ...CartFields
      }
      userErrors {
        field
        message
      }
      warnings {
        code
        message
        target
      }
    }
  }
`;

export const CART_QUERY = /* GraphQL */ `
  ${CART_FRAGMENTS}
  query GetCart($id: ID!) {
    cart(id: $id) {
      ...CartFields
    }
  }
`;

export const CART_LINES_ADD_MUTATION = /* GraphQL */ `
  ${CART_FRAGMENTS}
  mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        ...CartFields
      }
      userErrors {
        field
        message
      }
      warnings {
        code
        message
        target
      }
    }
  }
`;

export const CART_LINES_UPDATE_MUTATION = /* GraphQL */ `
  ${CART_FRAGMENTS}
  mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart {
        ...CartFields
      }
      userErrors {
        field
        message
      }
      warnings {
        code
        message
        target
      }
    }
  }
`;

export const CART_LINES_REMOVE_MUTATION = /* GraphQL */ `
  ${CART_FRAGMENTS}
  mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart {
        ...CartFields
      }
      userErrors {
        field
        message
      }
      warnings {
        code
        message
        target
      }
    }
  }
`;

export const CART_DISCOUNT_CODES_UPDATE_MUTATION = /* GraphQL */ `
  ${CART_FRAGMENTS}
  mutation CartDiscountCodesUpdate($cartId: ID!, $discountCodes: [String!]!) {
    cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
      cart {
        ...CartFields
      }
      userErrors {
        field
        message
      }
    }
  }
`;

// Order note → persists to cart.note (surfaces on the Shopify order). `note`
// is nullable; pass "" to clear.
export const CART_NOTE_UPDATE_MUTATION = /* GraphQL */ `
  ${CART_FRAGMENTS}
  mutation CartNoteUpdate($cartId: ID!, $note: String!) {
    cartNoteUpdate(cartId: $cartId, note: $note) {
      cart {
        ...CartFields
      }
      userErrors {
        field
        message
      }
    }
  }
`;

// Cart-level attributes (gift wrap flag, gift message, etc.) → surface on the
// Shopify order for the merchant to fulfil. Replaces the full attribute set.
export const CART_ATTRIBUTES_UPDATE_MUTATION = /* GraphQL */ `
  ${CART_FRAGMENTS}
  mutation CartAttributesUpdate($cartId: ID!, $attributes: [AttributeInput!]!) {
    cartAttributesUpdate(cartId: $cartId, attributes: $attributes) {
      cart {
        ...CartFields
      }
      userErrors {
        field
        message
      }
    }
  }
`;

/** Re-price an existing cart into a market by setting the buyer's country. */
export const CART_BUYER_IDENTITY_UPDATE_MUTATION = /* GraphQL */ `
  ${CART_FRAGMENTS}
  mutation CartBuyerIdentityUpdate($cartId: ID!, $buyerIdentity: CartBuyerIdentityInput!) {
    cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
      cart {
        ...CartFields
      }
      userErrors {
        field
        message
      }
    }
  }
`;
