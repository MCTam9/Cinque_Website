import { z } from 'zod';

/**
 * PUBLIC environment — safe to reference on the client. These are inlined by
 * Next at build time because they use the NEXT_PUBLIC_ prefix.
 *
 * Do NOT put secrets here. Secrets live in ./serverEnv.ts (server-only).
 */
const publicSchema = z.object({
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_SANITY_PROJECT_ID: z.string().min(1),
  NEXT_PUBLIC_SANITY_DATASET: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),
});

// Reference each var explicitly so Next's static replacement picks them up.
const parsed = publicSchema.safeParse({
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SANITY_PROJECT_ID: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  NEXT_PUBLIC_SANITY_DATASET: process.env.NEXT_PUBLIC_SANITY_DATASET,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});

if (!parsed.success) {
  // Fail fast with a readable message during dev/build.
  console.error('❌ Invalid public environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid public environment variables. See .env.example.');
}

export const publicEnv = parsed.data;

// Sanity API version pinned for stable query behavior.
export const SANITY_API_VERSION = '2024-10-01';
