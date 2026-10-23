import 'server-only';
import { z } from 'zod';

/**
 * SERVER-ONLY secrets. The `server-only` import makes any accidental client
 * import a hard build error, so these values can never reach the browser bundle.
 */
const serverSchema = z.object({
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  SANITY_API_WRITE_TOKEN: z.string().min(1),
  // Secret for the single unified Sanity webhook (/api/sanity/hook), which
  // covers revalidation + Stripe sync + shipping emails in one delivery —
  // Sanity's free plan allows only two webhooks. The three per-job secrets
  // below still work if you split the jobs across separate webhooks.
  SANITY_WEBHOOK_SECRET: z.string().optional(),
  SANITY_REVALIDATE_SECRET: z.string().optional(),
  // Secret for the Sanity → Stripe product/price sync webhook.
  SANITY_STRIPE_SYNC_SECRET: z.string().optional(),
  // Secret for the Sanity order-update webhook (shipping emails).
  SANITY_ORDER_WEBHOOK_SECRET: z.string().optional(),
  // Transactional email (Postmark) — see src/lib/fulfillment/email.ts for why
  // Postmark rather than Resend.
  POSTMARK_SERVER_TOKEN: z.string().optional(),
  EMAIL_FROM: z.string().optional(), // e.g. "Cindy <cindy@cinque.studio>"
  OPS_ALERT_EMAIL: z.string().optional(), // where low-stock alerts go
  // Inbox agent (src/lib/inbox): the studio mailbox over IMAP, read and
  // drafted into only. An Apple app-specific password, never the Apple ID's.
  ICLOUD_IMAP_USER: z.string().email().optional(),
  ICLOUD_IMAP_PASSWORD: z.string().optional(),
  // The cloud agent's bearer token for /api/agent/*; also keys draft tickets.
  INBOX_AGENT_TOKEN: z.string().min(32).optional(),
});

const parsed = serverSchema.safeParse({
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  SANITY_API_WRITE_TOKEN: process.env.SANITY_API_WRITE_TOKEN,
  SANITY_WEBHOOK_SECRET: process.env.SANITY_WEBHOOK_SECRET,
  SANITY_REVALIDATE_SECRET: process.env.SANITY_REVALIDATE_SECRET,
  SANITY_STRIPE_SYNC_SECRET: process.env.SANITY_STRIPE_SYNC_SECRET,
  SANITY_ORDER_WEBHOOK_SECRET: process.env.SANITY_ORDER_WEBHOOK_SECRET,
  POSTMARK_SERVER_TOKEN: process.env.POSTMARK_SERVER_TOKEN,
  EMAIL_FROM: process.env.EMAIL_FROM,
  OPS_ALERT_EMAIL: process.env.OPS_ALERT_EMAIL,
  ICLOUD_IMAP_USER: process.env.ICLOUD_IMAP_USER || undefined,
  ICLOUD_IMAP_PASSWORD: process.env.ICLOUD_IMAP_PASSWORD || undefined,
  INBOX_AGENT_TOKEN: process.env.INBOX_AGENT_TOKEN || undefined,
});

if (!parsed.success) {
  console.error('❌ Invalid server environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid server environment variables. See .env.example.');
}

export const serverEnv = parsed.data;
