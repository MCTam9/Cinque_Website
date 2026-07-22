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
  SANITY_REVALIDATE_SECRET: z.string().optional(),
  // Secret for the Sanity → Stripe product/price sync webhook.
  SANITY_STRIPE_SYNC_SECRET: z.string().optional(),
  // Secret for the Sanity order-update webhook (shipping emails).
  SANITY_ORDER_WEBHOOK_SECRET: z.string().optional(),
  // Transactional email (Resend).
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().optional(), // e.g. "Cinque <orders@cinque.com>"
  OPS_ALERT_EMAIL: z.string().optional(), // where low-stock alerts go
});

const parsed = serverSchema.safeParse({
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  SANITY_API_WRITE_TOKEN: process.env.SANITY_API_WRITE_TOKEN,
  SANITY_REVALIDATE_SECRET: process.env.SANITY_REVALIDATE_SECRET,
  SANITY_STRIPE_SYNC_SECRET: process.env.SANITY_STRIPE_SYNC_SECRET,
  SANITY_ORDER_WEBHOOK_SECRET: process.env.SANITY_ORDER_WEBHOOK_SECRET,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
  OPS_ALERT_EMAIL: process.env.OPS_ALERT_EMAIL,
});

if (!parsed.success) {
  console.error('❌ Invalid server environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid server environment variables. See .env.example.');
}

export const serverEnv = parsed.data;
