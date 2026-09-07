/**
 * Renders a JSON-LD structured-data block.
 *
 * Deliberately NOT nonce'd, and deliberately synchronous.
 *
 * `<script type="application/ld+json">` is a data block, not a script: the
 * HTML spec classifies the element by type before the CSP inline-script check
 * is reached, so the browser never executes it and `script-src` never gates
 * it. A nonce on it buys nothing. Reading one via `headers()` did have a cost
 * though — it is a dynamic API, so every page rendering structured data was
 * forced out of static rendering and re-rendered on each request.
 *
 * (For search specifically the point is moot twice over: structured data is
 * read out of the DOM, and non-browser crawlers ignore CSP entirely.)
 */
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // Structured data is our own trusted, serialized object — not user HTML.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
