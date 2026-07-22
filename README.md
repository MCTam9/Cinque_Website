# Cinque Storefront

Headless e-commerce for the Cinque jewelry brand.

**Stack:** Next.js (App Router, TypeScript) · Tailwind · Sanity v3 (embedded Studio) · Stripe Embedded Checkout · Vercel.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in real values
npm run dev
```

- Storefront: http://localhost:3000
- Sanity Studio (dashboard): http://localhost:3000/studio

## Environment

See `.env.example`. Rule: only browser-safe vars use the `NEXT_PUBLIC_` prefix.
Secrets (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SANITY_API_WRITE_TOKEN`)
are server-only and guarded with `server-only` imports.

## Architecture map

| Concern | Location |
| --- | --- |
| Sanity schemas | `src/sanity/schemaTypes/` |
| Studio config / desk | `sanity.config.ts`, `src/sanity/structure.ts` |
| Embedded Studio route | `src/app/studio/[[...tool]]/page.tsx` |
| GROQ queries | `src/lib/sanity/queries.ts` |
| Sanity clients (read / write) | `src/lib/sanity/client.ts`, `writeClient.ts` |
| Stripe SDK (server) | `src/lib/stripe.ts` |
| Create checkout session | `src/app/api/checkout/route.ts` |
| Checkout session status | `src/app/api/checkout/session/route.ts` |
| Stripe webhook (fulfillment) | `src/app/api/webhooks/stripe/route.ts` |
| Sanity → Stripe product/price sync | `src/app/api/sanity/sync-stripe/route.ts`, `src/lib/stripe/sync.ts` |
| Sanity → Next revalidation | `src/app/api/revalidate/route.ts` |
| Cart state (Zustand) | `src/store/cart.ts` |
| Embedded Checkout component | `src/components/checkout/EmbeddedCheckout.tsx` |
| Safe rich text | `src/components/PortableText.tsx` |
| CSP (nonce, /studio-scoped) | `middleware.ts` |
| Post-purchase stubs | `src/lib/fulfillment/{shipping,email}.ts` |

## Security posture

- **CSP** applied in `middleware.ts`: strict nonce-based policy for the
  storefront (scripts only from `'self'` + nonce + `js.stripe.com`, plus the
  Stripe iframe/API), a separate scoped policy for `/studio`.
- **No `dangerouslySetInnerHTML`** anywhere — CMS rich text renders via
  `@portabletext/react`.
- **Raw-body webhook verification** — the Stripe webhook uses `req.text()` and
  verifies the signature before parsing.
- **Price integrity** — checkout ignores client prices and validates against
  Sanity/Stripe server-side.
- **Webhook idempotency** — `stripeEvent` ledger prevents double-processing.

## Stripe product/price sync

When staff create or edit a product in the Studio, a Sanity webhook calls
`/api/sanity/sync-stripe`, which ensures every variant has a matching Stripe
**Product** and an active **Price**, then writes `stripeProductId` /
`stripePriceId` back onto the variant. Checkout then uses those Price IDs.

**One-time setup — create the Sanity webhook** (Manage → *your project* → API →
Webhooks → Create webhook):

- **URL:** `https://<your-domain>/api/sanity/sync-stripe`
- **Trigger on:** Create, Update  ·  **Filter:** `_type == "product"`
- **Projection:**
  ```groq
  {
    _type, _id, title, status,
    variants[]{ _key, sku, metalType, priceGBP, stripeProductId, stripePriceId }
  }
  ```
- **HTTP method:** POST  ·  **Secret:** the value of `SANITY_STRIPE_SYNC_SECRET`.

Notes:
- Stripe Prices are immutable — changing `priceGBP` creates a **new** Price,
  repoints the Product's default price, and archives the old one (in-flight
  checkout sessions keep working).
- The sync is idempotent and loop-safe: it only writes back when a Stripe ID
  actually changed, so the follow-up webhook delivery is a no-op.
- **Backfill existing products:** just re-publish them — the update fires the
  same webhook and syncs them.

## Page builder (staff add pages with images + text)

Non-technical staff compose pages by stacking reorderable blocks in the Studio —
no developer needed:

- **Blocks:** Hero, Image + Text, Gallery, Text (`src/sanity/schemaTypes/objects/blocks.ts`).
- **Where they're available:** every **Collection/Drop** and **Exhibition** has a
  page-content field, and there's a generic **Page** type (About, Stockists, …).
- **Rendered by:** `src/components/PageBuilder.tsx` maps each block to a React
  component — swap each placeholder for the matching **Figma-exported component**
  (keep the props) and the whole CMS→page pipeline just works.
- **Routes:** `/collections/[slug]`, `/exhibitions/[slug]`, `/pages/[slug]`.
  Generic pages only render when marked **Visible on site**.

To add a new drop page: create a Collection, give it a slug, stack blocks, and
publish. It appears at `/collections/<slug>` and revalidates automatically.

## Automations (so the store runs itself)

These remove manual/technical chores for non-technical staff:

| Automation | Trigger | Effect |
| --- | --- | --- |
| **Stripe product/price sync** | Save a product | Creates/updates Stripe Product + Price, writes IDs back |
| **Inventory deduction** | Paid checkout | Decrements the exact variant's stock |
| **Auto sold-out / restock** | Stock hits 0 / rises above 0 | Flips `status` between `active` ⇄ `sold_out` — no manual toggling |
| **Low-stock alert** | Stock ≤ threshold after a sale | Emails the owner a restock reminder (stub) |
| **Refund handling** | Full refund in Stripe | Restocks items + sets order `refunded` automatically |
| **Shipping email** | Staff set order to **Shipped** + tracking | Emails the customer their tracking — one dropdown, sent once |
| **Publish guardrail** | Setting a product **Active** | Blocks it unless it has an image and every variant is priced |
| **Dashboard views** | — | Studio opens on “Orders to fulfil” and “Low / out of stock” |
| **On-demand revalidation** | Any content change | Refreshes only the affected pages (low hosting cost) |

**Two more Sanity webhooks to configure** (same steps as the sync webhook above):

- **Order updates → shipping email:** URL `/api/sanity/order-updated`, trigger
  on Update, filter `_type == "order"`, secret `SANITY_ORDER_WEBHOOK_SECRET`,
  projection:
  ```groq
  {
    _type, _id, orderNumber, status,
    "email": customer.email,
    "carrier": fulfillment.carrier,
    "tracking": fulfillment.trackingNumber,
    "sentAt": fulfillment.shippedEmailSentAt
  }
  ```
- The **refund** and **auto sold-out / low-stock** automations need no setup —
  they run inside the existing Stripe webhook. Just ensure `charge.refunded` is
  among the events your Stripe webhook endpoint subscribes to.

You may reuse a single secret value across all three Sanity webhooks.

## Testing the payment loop locally

```bash
# forward Stripe events to the local webhook
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# in another shell, drive a test checkout, or:
stripe trigger checkout.session.completed
```

Confirm: signature verifies, an `order` doc appears in the Studio, variant
`stockQuantity` decrements exactly once, and re-delivering the same event does
not decrement again.
