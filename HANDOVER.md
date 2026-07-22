# Cinque Website — Session Handover

Working notes for the next session. Covers the current state of the **Figma → build** effort for the Cinque storefront, the extracted design system, what's been fixed, and what's still open.

---

## 1. Project at a glance

- **Repo:** `cinque-storefront` (Next.js 15 App Router · React 18 · TypeScript · Tailwind)
- **CMS:** Sanity (`sanity.config.ts`, Studio embedded at `/studio`). Docs: `product`, `collection`, `exhibition`, `pressItem`, `page`, `order`, `stripeEvent`.
- **Commerce:** Stripe embedded checkout, webhooks, Stripe↔Sanity sync; cart via Zustand (`src/store/cart.ts`); fulfilment email via Resend.
- **Brand:** Cinque® — fine/art jewellery, founder Cindy Liu. London, W2. Works with photographer Vincent Tam.
- ⚠️ **Not a git repo yet** — no version control initialized.

## 2. Figma reference

- **File:** `Cinque_Website` — key `MBkp2RiKXcp6WFAqoKLoLS`
- **URL:** https://www.figma.com/design/MBkp2RiKXcp6WFAqoKLoLS/Cinque_Website
- **Origin:** frames were imported via **html.to.design (FREE)** from an existing site, so the original frames are **absolutely positioned** (`layout mode: none`) — being progressively rebuilt with auto-layout + components.

> **IMPORTANT — Figma is read-only from here.** The connected MCP (`figma-developer-mcp` / Framelink) only exposes `get_figma_data` + `download_figma_images` (Figma REST API = read + export only). **We cannot edit the Figma file** — no resizing, no variant edits, no retyping. Figma work is handed to the user as click-by-click steps; anything we can *build* goes in the **repo** (fully writable).

## 3. Design system (extracted from Figma)

**Colors**
| Token | Hex | Use |
|-------|-----|-----|
| Cararra | `#F1F0ED` | warm off-white background |
| Graphite | `#4D4B4A` | primary text |
| Oslo Gray | `#A6A3A1` | secondary text (was `#BABDBF`, darkened for contrast) |
| Cloud | `#C9C8C4` | tertiary / muted |
| Red Current | `#B35947` | accent / selected nav (terracotta) |

**Type** — single face: **Letter Gothic Std** (monospace)
- H1 32 / medium · H2 32 / bold · H3 (nav) 17 · body 11–13px
- `Word_With_Underscores` styling is intentional brand style.

**Layout** — desktop 1440 canvas, 900px content column inset 270px each side.

## 4. Figma templates present

5 desktop page frames + a product-detail template:
- **Home** — logo, tagline, 4 category blocks (Shop/Lookbook/Exhibition/Studio)
- **Shop** — 3×2 product grid, category sidebar, footer
- **Lookbook** — Drop_00_Archive editorial layout
- **Exhibition** — Date/Location/Description rows (London Craft Week, Blackdot Gallery), Scura Magazine press feature
- **Studio** — About bio + contact/commission form
- **PDP** (product card template) — Lace Fork Pendant, £200, Add to cart

No mobile frames yet.

## 5. Progress — what's been done

### ✅ Nav — DONE (component with variants)
- Component set `nav` (#27:856). Selected-state styling correct: **H3_Selected bold + Red `#B35947` + underline**; default H3 medium / Graphite.
- Per-page mapping correct: Home→Default, Shop→SHOP, Lookbook→LOOKBOOK, Exhibition→EXHIBITION, Studio→STUDIO.
- **Open items on nav:**
  1. **Variant property names inconsistent** — default is `Property 1=Default`, others are `Selected=SHOP/...`. This trips Figma's "conflicting variant properties" warning. Fix: rename the property to `Selected` for all, default value → `Selected=None`.
  2. **Shop's nav instance is loose on the canvas**, not nested inside the Shop frame (all other pages' navs are nested). Drag it into the Shop frame, reset to x:0,y:0.
  3. Minor: two underline tokens (`ts3` vs `ts5`) used for selected text — render identically; consolidate for cleanliness.

### ✅ Product card — DONE (real auto-layout + CSS grid)
- Master `#20:681`: column stack → image (fill width, 441h) → padded content → title+divider → spec rows → footer row (`space-between`). Grid container `#28:1184` = `grid, repeat(3,1fr) × repeat(2,1fr), gap 10px`.
- **Open items on card:**
  1. **Content not exposed as component properties** — all 6 cards show identical "Lace Fork Pendant / 01_Metal_Veil / £200". Add Text props (`Title`, `Drop`, `Material`, `Edition`, `Price`) + image swap so instances differ without detaching. **Highest priority for the card.**
  2. **"Add to cart" is plain text**, not a button — no bg/border/padding, ~15px tap target (fails mobile 44px). Give it real button treatment.
  3. **Pure black `#000000`** used for title/price/specs vs site-wide Graphite `#4D4B4A` — align to Graphite unless emphasis intended.
  4. **Fixed heights clip content** — title locked 42px, specs 60px. Set vertical → **Hug**.
  5. **Grid rows fixed `1fr × 2`** hard-codes 6 products. Set rows → **auto/hug**, container vertical → Hug. (Do card-hug first, then grid, or old fixed rows keep forcing height.)
     - Note: card size is currently driven by the **grid cell** (instances set to Fill), which is why resizing the master frame doesn't propagate — change the grid to resize all cards.

### ✅ Content fixes already applied by user
- `01_Shell_Relic` → **`01_Metal_Veil`** (Lookbook + card)
- Shop subtitle grammar → "Contact us if you would like a **bespoke commission**"
- Oslo Gray darkened `#BABDBF` → `#A6A3A1`

## 6. Decisions made this session

- **Footer:** current full-sitemap footer is **redundant** (mirrors nav + triplicated About/Commission/Process placeholders). Plan: trim to 3 lean groups — (1) Legal/utility: Terms · Privacy · Shipping & Returns · Accessibility; (2) Connect: email `cindy@cinque.studio` · Instagram · Stockists; (3) Brand line: Cinque® · tagline · © 2026. Optional newsletter signup. Drop the nav mirror.
  - Legal pages (Terms/Privacy/Shipping/Accessibility) are **needed for Stripe/commerce compliance** and can be Sanity `page` docs.
- **Mobile:** build as a **`Mobile` Section next to `Desktop`** on the same page (not a separate Page, file is small enough to compare side-by-side). **Reuse the same components** — mobile ≈ layout changes: grid `3→2/1` cols, footer columns stack, nav → hamburger (add a `Device` variant or separate `Nav/Mobile`). Frame width 390 (or 375). ~80% reuse.

## 7. Outstanding issues (consolidated)

| # | Area | Issue | Fix |
|---|------|-------|-----|
| 1 | Nav | Variant props inconsistent (`Property 1` vs `Selected`) | rename all to `Selected`, default = `None` |
| 2 | Nav | Shop nav instance loose on canvas | nest into Shop frame |
| 3 | Card | Content not exposed as props (all cards identical) | add Text/image component properties |
| 4 | Card | "Add to cart" not a button | real button + ≥44px target |
| 5 | Card | Black `#000000` vs Graphite | switch to Graphite |
| 6 | Card | Fixed title/spec heights | set vertical Hug |
| 7 | Card | Grid rows fixed `1fr×2` | rows auto/hug |
| 8 | Footer | Redundant sitemap + duplicate columns | trim to legal + connect + brand |
| 9 | Global | Oslo Gray `#A6A3A1` still ~2.6:1 on white | acceptable for de-emphasized labels; darken if important |
| 10 | Global | No mobile frames | build Mobile section, reuse components |
| 11 | Repo | Not under git | `git init` when ready |

## 8. Suggested next steps

1. **User (in Figma):** apply nav fixes #1–2 and card fixes #3–7.
2. **Build in code (repo is writable):** the highest-leverage move is to translate the componentized pieces into real React/Tailwind — `ProductCard` + Shop grid first, then `Nav` (with mobile hamburger) and trimmed `Footer`. Keeps Figma as reference and produces the actual deliverable.
3. **Legal/utility pages** as Sanity `page` documents (Terms, Privacy, Shipping & Returns, Accessibility) — required for checkout anyway.
4. **Mobile** via responsive Tailwind (`grid-cols-2 md:grid-cols-3`, hamburger toggle) rather than a second Figma set.

## 9. How to re-read the Figma file next session

`get_figma_data` on the whole file exceeds the token limit — it saves to a temp file. Either fetch **per-node** (e.g. `nodeId: 8:2` for Shop) or grep the saved dump. Useful node IDs: Shop `8:2`, nav component set `27:856`, product card master `20:681`, product grid `28:1184`.
