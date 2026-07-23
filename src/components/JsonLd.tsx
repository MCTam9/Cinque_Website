import { headers } from 'next/headers';

/**
 * Renders a JSON-LD structured-data block. Reads the per-request CSP nonce
 * (set in middleware as `x-nonce`) so the inline script satisfies the strict
 * `script-src` policy. In dev / static contexts the nonce may be absent, which
 * is fine.
 */
export default async function JsonLd({ data }: { data: Record<string, unknown> }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      // Structured data is our own trusted, serialized object — not user HTML.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
