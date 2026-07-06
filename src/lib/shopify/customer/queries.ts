// ============================================================
//  Customer Account API — GraphQL operations & result types
// ============================================================

/** Per-order node fields, shared by the overview and full-history queries so
 *  both render identical order cards (with product thumbnails). Kept to fields
 *  that exist on the Customer Account API `Order`/`LineItem` types. */
const ORDER_NODE_FIELDS = /* GraphQL */ `
  id
  name
  processedAt
  cancelledAt
  totalPrice {
    amount
    currencyCode
  }
  lineItems(first: 20) {
    nodes {
      id
      title
      variantTitle
      quantity
      image {
        url
        altText
      }
      totalPrice {
        amount
        currencyCode
      }
    }
  }
`;

/** Customer profile + most recent orders, in a single round-trip. */
export const CUSTOMER_OVERVIEW_QUERY = /* GraphQL */ `
  query CustomerOverview($first: Int!) {
    customer {
      id
      firstName
      lastName
      emailAddress {
        emailAddress
      }
      orders(first: $first, sortKey: PROCESSED_AT, reverse: true) {
        nodes {
          ${ORDER_NODE_FIELDS}
        }
      }
    }
  }
`;

export interface OrderLineItem {
  id: string;
  title: string;
  variantTitle: string | null;
  quantity: number;
  image: { url: string; altText: string | null } | null;
  totalPrice: { amount: string; currencyCode: string } | null;
}

export interface CustomerOrder {
  id: string;
  name: string;
  processedAt: string;
  /** ISO timestamp when the order was cancelled; null for active orders. */
  cancelledAt: string | null;
  totalPrice: { amount: string; currencyCode: string } | null;
  lineItems: { nodes: OrderLineItem[] };
}

export interface CustomerOverview {
  customer: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    emailAddress: { emailAddress: string } | null;
    orders: { nodes: CustomerOrder[] };
  } | null;
}

/** Full order history (same fields as the overview, just more of them). */
export const CUSTOMER_ORDERS_QUERY = /* GraphQL */ `
  query CustomerOrders($first: Int!) {
    customer {
      orders(first: $first, sortKey: PROCESSED_AT, reverse: true) {
        nodes {
          ${ORDER_NODE_FIELDS}
        }
      }
    }
  }
`;

export interface CustomerOrdersResult {
  customer: { orders: { nodes: CustomerOrder[] } } | null;
}

/** Saved addresses. `formatted` returns ready-to-render lines, so this stays
 *  resilient to the Customer Account API's address field naming. */
export const CUSTOMER_ADDRESSES_QUERY = /* GraphQL */ `
  query CustomerAddresses($first: Int!) {
    customer {
      defaultAddress {
        id
      }
      addresses(first: $first) {
        nodes {
          id
          formatted(withName: true, withCompany: true)
        }
      }
    }
  }
`;

export interface CustomerAddress {
  id: string;
  formatted: string[];
}

export interface CustomerAddressesResult {
  customer: {
    defaultAddress: { id: string } | null;
    addresses: { nodes: CustomerAddress[] };
  } | null;
}
