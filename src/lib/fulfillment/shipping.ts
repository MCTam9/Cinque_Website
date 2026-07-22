import 'server-only';

/**
 * ─────────────────────────────────────────────────────────────
 * SHIPPING INTEGRATION — PLACEHOLDER
 * ─────────────────────────────────────────────────────────────
 * Wire up ShipStation (or another carrier API) here. This is called from the
 * Stripe webhook AFTER a successful charge, once the order document exists.
 *
 * Keep this function resilient: it must NEVER throw in a way that fails the
 * webhook, or Stripe will retry and re-run upstream steps. Catch + log.
 *
 * TODO:
 *  - Read SHIPSTATION_API_KEY / SHIPSTATION_API_SECRET from serverEnv.
 *  - POST /orders/createorder to ShipStation with address + line items.
 *  - Persist the returned ShipStation order id onto the Sanity order
 *    (order.fulfillment.shipStationOrderId).
 */

export interface CreateShipmentInput {
  orderId: string; // Sanity order document _id
  orderNumber: string;
  email?: string | null;
  shippingAddress?: {
    name?: string | null;
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    postalCode?: string | null;
    country?: string | null;
  } | null;
  lines: Array<{ sku: string; title: string; quantity: number }>;
}

export interface CreateShipmentResult {
  ok: boolean;
  shipStationOrderId?: string;
  error?: string;
}

export async function createShipment(
  input: CreateShipmentInput
): Promise<CreateShipmentResult> {
  // PLACEHOLDER — no external call yet.
  console.info('[shipping] createShipment placeholder invoked', {
    orderNumber: input.orderNumber,
    lineCount: input.lines.length,
  });
  return { ok: true };
}
