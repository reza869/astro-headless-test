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

// ------------------------------------------------------------
//  Single-order detail
// ------------------------------------------------------------
// The Customer Account API has no `customer.order(id:)` root, so a detail
// view is served by fetching the customer's own orders (already scoped to
// them — a buyer can never see another's order) with richer fields, then
// matching by id in the route. Fields verified against the 2025-01 schema:
// Order.{financialStatus,statusPageUrl,subtotal,totalTax,totalShipping,note,
// shippingAddress}, Fulfillment.{status,estimatedDeliveryAt,
// latestShipmentStatus,trackingInformation}, TrackingInformation.{company,
// number,url}. A wrong field throws (client.ts), so keep this list tight.
const ORDER_DETAIL_FIELDS = /* GraphQL */ `
  id
  name
  processedAt
  cancelledAt
  financialStatus
  statusPageUrl
  note
  subtotal { amount currencyCode }
  totalShipping { amount currencyCode }
  totalTax { amount currencyCode }
  totalPrice { amount currencyCode }
  shippingAddress {
    formatted(withName: true, withCompany: true)
  }
  fulfillments(first: 10) {
    nodes {
      status
      estimatedDeliveryAt
      latestShipmentStatus
      trackingInformation {
        company
        number
        url
      }
    }
  }
  lineItems(first: 50) {
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

/** Customer identity (for the account shell) + a bounded list of orders with
 *  full detail. The page finds the requested order within this list. */
export const CUSTOMER_ORDER_DETAIL_QUERY = /* GraphQL */ `
  query CustomerOrderDetail($first: Int!) {
    customer {
      firstName
      lastName
      emailAddress {
        emailAddress
      }
      orders(first: $first, sortKey: PROCESSED_AT, reverse: true) {
        nodes {
          ${ORDER_DETAIL_FIELDS}
        }
      }
    }
  }
`;

export interface OrderTracking {
  company: string | null;
  number: string | null;
  url: string | null;
}

export interface OrderFulfillment {
  status: string | null;
  estimatedDeliveryAt: string | null;
  latestShipmentStatus: string | null;
  trackingInformation: OrderTracking[];
}

export interface CustomerOrderDetail {
  id: string;
  name: string;
  processedAt: string;
  cancelledAt: string | null;
  financialStatus: string | null;
  statusPageUrl: string;
  note: string | null;
  subtotal: { amount: string; currencyCode: string } | null;
  totalShipping: { amount: string; currencyCode: string } | null;
  totalTax: { amount: string; currencyCode: string } | null;
  totalPrice: { amount: string; currencyCode: string } | null;
  shippingAddress: { formatted: string[] } | null;
  fulfillments: { nodes: OrderFulfillment[] };
  lineItems: { nodes: OrderLineItem[] };
}

export interface CustomerOrderDetailResult {
  customer: {
    firstName: string | null;
    lastName: string | null;
    emailAddress: { emailAddress: string } | null;
    orders: { nodes: CustomerOrderDetail[] };
  } | null;
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
