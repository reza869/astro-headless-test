// ============================================================
//  Cart services — the Cart API is the checkout (2026-04)
// ============================================================
import { shopifyFetch, type ShopifyFetchOptions } from '../client';
import { currentCountry } from '../context';
import {
  CART_CREATE_MUTATION,
  CART_QUERY,
  CART_LINES_ADD_MUTATION,
  CART_LINES_UPDATE_MUTATION,
  CART_LINES_REMOVE_MUTATION,
  CART_DISCOUNT_CODES_UPDATE_MUTATION,
  CART_NOTE_UPDATE_MUTATION,
  CART_ATTRIBUTES_UPDATE_MUTATION,
  CART_BUYER_IDENTITY_UPDATE_MUTATION,
} from '../graphql/cart';
import { mapCart } from '../transforms';
import type { Cart } from '../types';

export interface UserError {
  field?: string[] | null;
  message: string;
}

export interface CartResult {
  cart: Cart | null;
  userErrors: UserError[];
}

export interface CartLineAttribute {
  key: string;
  value: string;
}

export interface CartLineInput {
  merchandiseId: string;
  quantity: number;
  /** Line-item properties — personalization / gift notes (MP-24). */
  attributes?: CartLineAttribute[];
}

export interface CartLineUpdateInput {
  id: string;
  quantity?: number;
  merchandiseId?: string;
}

function result(mutationPayload: any): CartResult {
  return {
    cart: mapCart(mutationPayload?.cart),
    userErrors: mutationPayload?.userErrors ?? [],
  };
}

/** Create a cart, optionally with initial lines. Prices it in the active
 *  market (buyerIdentity.countryCode) so a cart started while browsing a
 *  currency matches that currency through checkout. */
export async function createCart(
  lines: CartLineInput[] = [],
  opts: ShopifyFetchOptions = {},
): Promise<CartResult> {
  const country = currentCountry();
  const input: Record<string, unknown> = {
    lines,
    attributes: [{ key: 'source', value: 'astro-storefront' }],
  };
  if (country) input.buyerIdentity = { countryCode: country };
  const data = await shopifyFetch<{ cartCreate: any }>(CART_CREATE_MUTATION, { input }, opts);
  return result(data.cartCreate);
}

/** Re-price an existing cart into the given market (ISO alpha-2 country). */
export async function updateCartBuyerIdentityCountry(
  cartId: string,
  countryCode: string,
  opts: ShopifyFetchOptions = {},
): Promise<CartResult> {
  const data = await shopifyFetch<{ cartBuyerIdentityUpdate: any }>(
    CART_BUYER_IDENTITY_UPDATE_MUTATION,
    { cartId, buyerIdentity: { countryCode } },
    opts,
  );
  return result(data.cartBuyerIdentityUpdate);
}

/** Fetch a cart by id; returns null when the cart no longer exists. */
export async function getCart(
  cartId: string,
  opts: ShopifyFetchOptions = {},
): Promise<Cart | null> {
  const data = await shopifyFetch<{ cart: any | null }>(CART_QUERY, { id: cartId }, opts);
  return mapCart(data.cart);
}

export async function addCartLines(
  cartId: string,
  lines: CartLineInput[],
  opts: ShopifyFetchOptions = {},
): Promise<CartResult> {
  const data = await shopifyFetch<{ cartLinesAdd: any }>(
    CART_LINES_ADD_MUTATION,
    { cartId, lines },
    opts,
  );
  return result(data.cartLinesAdd);
}

export async function updateCartLines(
  cartId: string,
  lines: CartLineUpdateInput[],
  opts: ShopifyFetchOptions = {},
): Promise<CartResult> {
  const data = await shopifyFetch<{ cartLinesUpdate: any }>(
    CART_LINES_UPDATE_MUTATION,
    { cartId, lines },
    opts,
  );
  return result(data.cartLinesUpdate);
}

export async function removeCartLines(
  cartId: string,
  lineIds: string[],
  opts: ShopifyFetchOptions = {},
): Promise<CartResult> {
  const data = await shopifyFetch<{ cartLinesRemove: any }>(
    CART_LINES_REMOVE_MUTATION,
    { cartId, lineIds },
    opts,
  );
  return result(data.cartLinesRemove);
}

/** Apply (or clear, with []) cart-level discount codes. Shopify only
 *  applies codes that exist as real discounts; invalid ones come back
 *  with applicable:false and no price change. */
export async function applyDiscountCodes(
  cartId: string,
  discountCodes: string[],
  opts: ShopifyFetchOptions = {},
): Promise<CartResult> {
  const data = await shopifyFetch<{ cartDiscountCodesUpdate: any }>(
    CART_DISCOUNT_CODES_UPDATE_MUTATION,
    { cartId, discountCodes },
    opts,
  );
  return result(data.cartDiscountCodesUpdate);
}

/** Set the cart note (persists to the Shopify order). Pass "" to clear. */
export async function updateCartNote(
  cartId: string,
  note: string,
  opts: ShopifyFetchOptions = {},
): Promise<CartResult> {
  const data = await shopifyFetch<{ cartNoteUpdate: any }>(
    CART_NOTE_UPDATE_MUTATION,
    { cartId, note },
    opts,
  );
  return result(data.cartNoteUpdate);
}

/** Replace the cart's attribute set (gift wrap flag, gift message, …). */
export async function updateCartAttributes(
  cartId: string,
  attributes: CartLineAttribute[],
  opts: ShopifyFetchOptions = {},
): Promise<CartResult> {
  const data = await shopifyFetch<{ cartAttributesUpdate: any }>(
    CART_ATTRIBUTES_UPDATE_MUTATION,
    { cartId, attributes },
    opts,
  );
  return result(data.cartAttributesUpdate);
}
