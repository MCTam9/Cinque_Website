import 'server-only';
import { serverEnv } from '@/lib/serverEnv';
import { publicEnv } from '@/lib/env';
import type { OrderContact } from '@/lib/stripe/customer';

/**
 * ─────────────────────────────────────────────────────────────
 * TRANSACTIONAL EMAIL — Postmark
 * ─────────────────────────────────────────────────────────────
 * Five senders: order confirmation, a new-order notification to the studio,
 * shipping confirmation, a public contact-form relay, and an internal
 * low-stock alert. All are best-effort: if
 * Postmark isn't configured (no server token), they log and no-op so local dev
 * and the webhooks still work.
 *
 * Postmark rather than Resend because Resend's domain verification requires an
 * MX record on a `send.` subdomain, and Wix — which hosts this domain's DNS —
 * cannot create subdomain MX records. Postmark verifies with a DKIM TXT and a
 * Return-Path CNAME, both of which Wix supports. If DNS ever moves off Wix
 * that constraint disappears, but there's no reason to switch back.
 *
 * The REST API is called directly with `fetch` rather than via Postmark's SDK —
 * the payload is five fields, so the dependency buys nothing.
 *
 * HTML is assembled server-side as email markup (not browser DOM), and every
 * value that originates from a customer is HTML-escaped before interpolation.
 */

const POSTMARK_ENDPOINT = 'https://api.postmarkapp.com/email';

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const money = (pence: number, currency: string) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency.toUpperCase() }).format(
    pence / 100
  );

/**
 * Brand tokens mirrored from tailwind.config.ts / globals.css so the emails read
 * as the storefront: Letter Gothic is a monospace face, so we fall back to a
 * Courier/monospace stack (web fonts are unreliable in mail clients but the
 * mono character carries the brand). Squared corners, hairline borders, warm
 * off-white ground — matching the site.
 */
const BRAND = {
  cararra: '#F1F0ED', // warm off-white — page ground
  graphite: '#4D4B4A', // primary text
  oslo: '#A6A3A1', // secondary / muted
  cloud: '#C9C8C4', // hairline borders
  redcurrent: '#B35947', // terracotta accent
  font: `'Courier New', Courier, ui-monospace, monospace`,
} as const;

// Absolute URL for the Cinque wordmark logo (PNG rendered from the brand SVG —
// SVG isn't email-safe). Served from /public at the site origin, so it resolves
// in production; on localhost it only loads for a client on the same host.
const LOGO_URL = `${publicEnv.NEXT_PUBLIC_SITE_URL}/figma/cinque-logo.png`;

function shell(title: string, bodyHtml: string): string {
  // Email-client-safe, table-based layout. All styles inline; no web fonts, no
  // rounded corners — an echo of the storefront's minimal monospace look.
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
</head>
<body style="margin:0;padding:0;background:${BRAND.cararra};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.cararra};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:${BRAND.cararra};border:1px solid ${BRAND.cloud};">
          <!-- Masthead — left-aligned logo lockup -->
          <tr>
            <td align="left" style="padding:32px 32px 0 32px;">
              <img src="${LOGO_URL}" alt="Cinque" width="180" style="display:block;width:180px;max-width:62%;height:auto;border:0;outline:none;text-decoration:none;" />
            </td>
          </tr>
          <!-- Title -->
          <tr>
            <td style="padding:28px 32px 0 32px;">
              <h1 style="margin:0;font-family:${BRAND.font};font-size:20px;font-weight:400;letter-spacing:0.5px;color:${BRAND.graphite};">${escapeHtml(title)}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:16px 32px 36px 32px;font-family:${BRAND.font};font-size:14px;line-height:20px;color:${BRAND.graphite};">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:0 32px 32px 32px;">
              <div style="border-top:1px solid ${BRAND.cloud};padding-top:20px;font-family:${BRAND.font};font-size:11px;line-height:18px;color:${BRAND.oslo};">
                <a href="https://www.instagram.com/cinque.made" style="color:${BRAND.graphite};text-decoration:none;">Follow us on Instagram &middot; @cinque.made</a><br><br>
                CINQUE &middot; <a href="https://cinque.studio" style="color:${BRAND.oslo};text-decoration:none;">cinque.studio</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export interface SendEmailResult {
  ok: boolean;
  id?: string;
  error?: string;
}

async function send(args: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<SendEmailResult> {
  const token = serverEnv.POSTMARK_SERVER_TOKEN;
  const from = serverEnv.EMAIL_FROM;
  if (!token || !from) {
    console.info('[email] Postmark not configured — skipping send', {
      to: args.to,
      subject: args.subject,
    });
    return { ok: false, error: 'email not configured' };
  }
  try {
    const res = await fetch(POSTMARK_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Postmark-Server-Token': token,
      },
      body: JSON.stringify({
        From: from,
        To: args.to,
        Subject: args.subject,
        HtmlBody: args.html,
        ReplyTo: args.replyTo,
        MessageStream: 'outbound',
      }),
    });
    // Postmark signals failure two ways: a non-2xx status, or a 200 carrying a
    // non-zero ErrorCode. Check both, or partial failures read as successes.
    const body = (await res.json().catch(() => null)) as
      | { ErrorCode?: number; Message?: string; MessageID?: string }
      | null;
    if (!res.ok || !body || (body.ErrorCode ?? 0) !== 0) {
      const reason = body?.Message ?? `HTTP ${res.status}`;
      console.error('[email] send failed', {
        status: res.status,
        errorCode: body?.ErrorCode,
        message: reason,
      });
      return { ok: false, error: reason };
    }
    return { ok: true, id: body.MessageID };
  } catch (err) {
    console.error('[email] send threw', err);
    return { ok: false, error: 'send exception' };
  }
}

// ── Order confirmation ────────────────────────────────────────
export interface OrderConfirmationInput {
  to?: string | null;
  orderNumber: string;
  lines: Array<{
    title: string;
    sku: string;
    quantity: number;
    unitPriceGBP: number;
    imageUrl?: string | null;
  }>;
  /** Shipping charged, in pence; 0 shows as "Free", omitted hides the row. */
  shippingGBP?: number | null;
  totalGBP: number;
  currency: string;
}

/** Line items (with thumbnails), shipping and the total, shared by both order emails. */
function orderTable(
  lines: OrderConfirmationInput['lines'],
  shippingGBP: number | null | undefined,
  totalGBP: number,
  currency: string
): string {
  const rows = lines
    .map((l) => {
      // Left-aligned product thumbnail. Retina: request 2x, display 56px square.
      const thumb = l.imageUrl
        ? `<td width="56" style="padding-right:14px;vertical-align:top;">
             <img src="${escapeHtml(l.imageUrl)}" alt="" width="56" height="56" style="display:block;width:56px;height:56px;border:1px solid ${BRAND.cloud};" />
           </td>`
        : '';
      return `<tr>
          <td style="padding:12px 0;border-bottom:1px solid ${BRAND.cloud};vertical-align:top;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
              ${thumb}
              <td style="vertical-align:top;font-family:${BRAND.font};font-size:14px;line-height:20px;color:${BRAND.graphite};">${escapeHtml(l.title)}<br><span style="color:${BRAND.oslo};font-size:12px;">${escapeHtml(l.sku)} &times; ${l.quantity}</span></td>
            </tr></table>
          </td>
          <td style="padding:12px 0;border-bottom:1px solid ${BRAND.cloud};text-align:right;vertical-align:top;white-space:nowrap;">${money(l.unitPriceGBP * l.quantity, currency)}</td>
        </tr>`;
    })
    .join('');
  const shippingRow =
    shippingGBP == null
      ? ''
      : `<tr>
         <td style="padding:12px 0;border-bottom:1px solid ${BRAND.cloud};">Shipping</td>
         <td style="padding:12px 0;border-bottom:1px solid ${BRAND.cloud};text-align:right;white-space:nowrap;">${shippingGBP === 0 ? 'Free' : money(shippingGBP, currency)}</td>
       </tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
       ${rows}
       ${shippingRow}
       <tr>
         <td style="padding:16px 0 0 0;font-weight:700;">Total</td>
         <td style="padding:16px 0 0 0;text-align:right;font-weight:700;white-space:nowrap;">${money(totalGBP, currency)}</td>
       </tr>
     </table>`;
}

export async function sendOrderConfirmation(
  input: OrderConfirmationInput
): Promise<SendEmailResult> {
  if (!input.to) {
    console.warn('[email] no recipient for order', input.orderNumber);
    return { ok: false, error: 'no recipient' };
  }
  const html = shell(
    'Thank you for your order',
    `<p style="margin:0 0 4px 0;">Order confirmed.</p>
     <p style="margin:0 0 20px 0;color:${BRAND.oslo};font-size:12px;letter-spacing:1px;text-transform:uppercase;">${escapeHtml(input.orderNumber)}</p>
     ${orderTable(input.lines, input.shippingGBP, input.totalGBP, input.currency)}
     <p style="margin:28px 0 0 0;color:${BRAND.oslo};">We&rsquo;ll email you again when your order ships.</p>`
  );
  return send({ to: input.to, subject: `Your Cinque order ${input.orderNumber}`, html });
}

// ── New-order notification (to the studio) ───────────────────
/** The studio's own inbox: new orders and contact-form enquiries land here. */
const STUDIO_INBOX = 'cindy@cinque.studio';

export interface NewOrderNotificationInput extends Omit<OrderConfirmationInput, 'to'> {
  customer: OrderContact;
  /** Stripe dashboard link to the payment, for refunds and full details. */
  dashboardUrl?: string | null;
}

/**
 * Tells the studio an order has been paid, with everything needed to pack and
 * post it. The buyer's details travel in the email only: they are deliberately
 * not stored on the (public) Sanity order document.
 */
export async function sendNewOrderNotification(
  input: NewOrderNotificationInput
): Promise<SendEmailResult> {
  const c = input.customer;
  const address = c.address
    ? [c.address.line1, c.address.line2, c.address.city, c.address.postalCode, c.address.country]
        .filter(Boolean)
        .map((part) => escapeHtml(part as string))
        .join('<br>')
    : '';
  const detail = (label: string, value: string) =>
    value
      ? `<tr>
           <td style="padding:4px 16px 4px 0;vertical-align:top;color:${BRAND.oslo};white-space:nowrap;">${label}</td>
           <td style="padding:4px 0;vertical-align:top;">${value}</td>
         </tr>`
      : '';
  const html = shell(
    'New order',
    `<p style="margin:0 0 20px 0;color:${BRAND.oslo};font-size:12px;letter-spacing:1px;text-transform:uppercase;">${escapeHtml(input.orderNumber)}</p>
     ${orderTable(input.lines, input.shippingGBP, input.totalGBP, input.currency)}
     <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 0 0;border-collapse:collapse;">
       ${detail('Name', escapeHtml(c.name ?? ''))}
       ${detail('Email', escapeHtml(c.email ?? ''))}
       ${detail('Phone', escapeHtml(c.phone ?? ''))}
       ${detail('Ship to', address)}
     </table>
     ${
       input.dashboardUrl
         ? `<p style="margin:28px 0 0 0;"><a href="${escapeHtml(input.dashboardUrl)}" style="color:${BRAND.redcurrent};">View payment in Stripe</a></p>`
         : ''
     }`
  );
  return send({
    to: STUDIO_INBOX,
    subject: `New order ${input.orderNumber}${c.name ? ` from ${c.name}` : ''}`,
    html,
    // Reply goes straight to the buyer.
    replyTo: c.email ?? undefined,
  });
}

// ── Shipping confirmation ─────────────────────────────────────
export interface ShippingConfirmationInput {
  to?: string | null;
  orderNumber: string;
  carrier?: string | null;
  trackingNumber?: string | null;
}

export async function sendShippingConfirmation(
  input: ShippingConfirmationInput
): Promise<SendEmailResult> {
  if (!input.to) {
    console.warn('[email] no recipient for shipping notice', input.orderNumber);
    return { ok: false, error: 'no recipient' };
  }
  const tracking = input.trackingNumber
    ? `<p>Tracking${input.carrier ? ` (${escapeHtml(input.carrier)})` : ''}:
        <strong>${escapeHtml(input.trackingNumber)}</strong></p>`
    : '';
  const html = shell(
    'Your order is on its way',
    `<p>Order <strong>${escapeHtml(input.orderNumber)}</strong> has shipped.</p>${tracking}`
  );
  return send({ to: input.to, subject: `Your Cinque order has shipped`, html });
}

// ── Contact form ──────────────────────────────────────────────
/** Where public contact-form enquiries are delivered. */
export const CONTACT_RECIPIENT = STUDIO_INBOX;

export interface ContactMessageInput {
  name: string;
  email: string;
  message: string;
  phone?: string;
}

export async function sendContactMessage(
  input: ContactMessageInput
): Promise<SendEmailResult> {
  const phoneLine = input.phone
    ? `<p><strong>Phone:</strong> ${escapeHtml(input.phone)}</p>`
    : '';
  const html = shell(
    'New enquiry via cinque.studio',
    `<p><strong>From:</strong> ${escapeHtml(input.name)} &lt;${escapeHtml(input.email)}&gt;</p>
     ${phoneLine}
     <p style="white-space:pre-wrap;">${escapeHtml(input.message)}</p>`
  );
  // reply-to the visitor so Cindy can respond directly from her inbox.
  return send({
    to: CONTACT_RECIPIENT,
    subject: `Cinque enquiry from ${input.name}`,
    html,
    replyTo: input.email,
  });
}

// ── Internal low-stock alert ──────────────────────────────────
export interface LowStockAlertInput {
  items: Array<{ productTitle: string; sku: string; remaining: number; threshold: number }>;
}

export async function sendLowStockAlert(
  input: LowStockAlertInput
): Promise<SendEmailResult> {
  if (input.items.length === 0) return { ok: true };
  const to = serverEnv.OPS_ALERT_EMAIL;
  if (!to) {
    console.info('[email] OPS_ALERT_EMAIL not set — skipping low-stock alert');
    return { ok: false, error: 'no ops recipient' };
  }
  const rows = input.items
    .map(
      (i) =>
        `<tr>
          <td style="padding:4px 0;">${escapeHtml(i.productTitle)} <span style="color:${BRAND.oslo};">(${escapeHtml(i.sku)})</span></td>
          <td style="padding:4px 0;text-align:right;">${i.remaining} left (≤ ${i.threshold})</td>
        </tr>`
    )
    .join('');
  const html = shell(
    'Low stock — restock needed',
    `<table style="width:100%;border-collapse:collapse;">${rows}</table>`
  );
  return send({ to, subject: `Cinque: ${input.items.length} item(s) low on stock`, html });
}
