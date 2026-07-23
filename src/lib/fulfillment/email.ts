import 'server-only';
import { Resend } from 'resend';
import { serverEnv } from '@/lib/serverEnv';

/**
 * ─────────────────────────────────────────────────────────────
 * TRANSACTIONAL EMAIL — Resend
 * ─────────────────────────────────────────────────────────────
 * Three senders: order confirmation, shipping confirmation, and an internal
 * low-stock alert. All are best-effort: if Resend isn't configured (no API
 * key), they log and no-op so local dev and the webhooks still work.
 *
 * HTML is assembled server-side as email markup (not browser DOM), and every
 * value that originates from a customer is HTML-escaped before interpolation.
 */

let client: Resend | null = null;
function resend(): Resend | null {
  if (!serverEnv.RESEND_API_KEY) return null;
  if (!client) client = new Resend(serverEnv.RESEND_API_KEY);
  return client;
}

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

function shell(title: string, bodyHtml: string): string {
  // Minimal, email-client-safe wrapper. Restyle to match brand later.
  return `<!doctype html><html><body style="font-family:Helvetica,Arial,sans-serif;color:#111;line-height:1.5;">
    <div style="max-width:560px;margin:0 auto;padding:24px;">
      <h1 style="font-size:20px;font-weight:600;">${escapeHtml(title)}</h1>
      ${bodyHtml}
      <p style="color:#888;font-size:12px;margin-top:32px;">Cinque</p>
    </div>
  </body></html>`;
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
  const r = resend();
  const from = serverEnv.RESEND_FROM_EMAIL;
  if (!r || !from) {
    console.info('[email] Resend not configured — skipping send', {
      to: args.to,
      subject: args.subject,
    });
    return { ok: false, error: 'email not configured' };
  }
  try {
    const { data, error } = await r.emails.send({
      from,
      to: args.to,
      subject: args.subject,
      html: args.html,
      replyTo: args.replyTo,
    });
    if (error) {
      console.error('[email] send failed', error);
      return { ok: false, error: error.message };
    }
    return { ok: true, id: data?.id };
  } catch (err) {
    console.error('[email] send threw', err);
    return { ok: false, error: 'send exception' };
  }
}

// ── Order confirmation ────────────────────────────────────────
export interface OrderConfirmationInput {
  to?: string | null;
  orderNumber: string;
  lines: Array<{ title: string; sku: string; quantity: number; unitPriceGBP: number }>;
  totalGBP: number;
  currency: string;
}

export async function sendOrderConfirmation(
  input: OrderConfirmationInput
): Promise<SendEmailResult> {
  if (!input.to) {
    console.warn('[email] no recipient for order', input.orderNumber);
    return { ok: false, error: 'no recipient' };
  }
  const rows = input.lines
    .map(
      (l) =>
        `<tr>
          <td style="padding:6px 0;">${escapeHtml(l.title)} <span style="color:#888;">(${escapeHtml(l.sku)})</span> × ${l.quantity}</td>
          <td style="padding:6px 0;text-align:right;">${money(l.unitPriceGBP * l.quantity, input.currency)}</td>
        </tr>`
    )
    .join('');
  const html = shell(
    'Thank you for your order',
    `<p>Order <strong>${escapeHtml(input.orderNumber)}</strong> is confirmed.</p>
     <table style="width:100%;border-collapse:collapse;margin:16px 0;">${rows}
       <tr><td style="padding-top:12px;font-weight:600;">Total</td>
       <td style="padding-top:12px;text-align:right;font-weight:600;">${money(input.totalGBP, input.currency)}</td></tr>
     </table>
     <p>We'll email you again when it ships.</p>`
  );
  return send({ to: input.to, subject: `Your Cinque order ${input.orderNumber}`, html });
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
export const CONTACT_RECIPIENT = 'cindy@cinque.studio';

export interface ContactMessageInput {
  name: string;
  email: string;
  message: string;
}

export async function sendContactMessage(
  input: ContactMessageInput
): Promise<SendEmailResult> {
  const html = shell(
    'New enquiry via cinque.studio',
    `<p><strong>From:</strong> ${escapeHtml(input.name)} &lt;${escapeHtml(input.email)}&gt;</p>
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
          <td style="padding:4px 0;">${escapeHtml(i.productTitle)} <span style="color:#888;">(${escapeHtml(i.sku)})</span></td>
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
