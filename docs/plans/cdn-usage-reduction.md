# Vercel CDN usage: findings and plan

**Status: deferred** (October 2026). Written after Vercel's 75% CDN-request warning on
2026-10-10; set aside once the traffic peak had passed. Pick this up if usage climbs again.

## Situation

- The Vercel team `torq-commerce-ltd` has been on **Hobby** since 2026-10-04, when its Pro
  subscription lapsed.
- Hobby includes **1,000,000 CDN requests a month**, shared by all four projects in the team:
  `cinque-website`, `arch-ive`, `store-offpeak` and `torq-os`.
- On Hobby, going over pauses **every** project for up to 30 days, which would take
  cinque.studio and checkout offline.
- **Hobby is for non-commercial use only**, so a shop taking payments shouldn't run on it
  regardless of traffic.
- **Pro also includes only 1M CDN requests** (with 1 TB of data transfer), and costs $20 a month
  including $20 of usage credit. More capacity comes from the Flat Rate CDN add-on: $20 a month
  for 10M, $100 for 50M. On Pro, going over 1M moves the team to the next tier from the following
  billing cycle. It never pauses the site.
- Hobby also caps Vercel image optimisation at **300K cached image loads a month** (plus 5K new
  resizes and 100K cache writes). Every product photo shown is one cached load, so this is a
  second limit at risk.
- Per-path request metrics need Observability Plus (Pro only). On Hobby, only the dashboard's
  Usage page shows the split by project.

## What a page view costs

Measured on the live site with a headless browser, first visit, scrolled to the bottom.

| Page | Vercel requests | Static scripts and styles | Images (`/_next/image`) | Background page loads |
|---|---|---|---|---|
| Home | 55 | 21 | 18 | 9 |
| Shop | 58 | 25 | 11 | 16 |
| Product | 45 | 25 | 4 | 10 |
| Lookbook | 45 | 22 | 8 | 9 |

- **Static files** are cached by the browser after the first page, so later pages cost less.
- **Background page loads** (Next.js `<Link>` prefetch) download each linked page as its link
  scrolls into view. The footer's Terms, Privacy, Shipping and Accessibility links are loaded on
  almost every page view, yet each got only about 11–94 views in the analytics.

Analytics at the time: about **31K page views**. The top pages were /shop (12K), / (8.5K) and the
two Gimmel rings (4.8K and 3.1K). The time window wasn't recorded; check whether it was 7 or 30
days. Traffic by country: US 40%, UK 11%, Canada 6%, Australia 6%, Japan 1%, and about 19% from
EU countries, which can browse but not currently check out.

## Option A: load images straight from Sanity's CDN

- Images from `cdn.sanity.io` don't count as Vercel requests or against Sanity's API request
  quota. They count only as Sanity bandwidth.
- Sanity Free includes 100 GB of bandwidth a month. These images would add about **5–12 GB**.
  There is no pay-for-overage option on Sanity Free (Growth is $15 per seat per month).
- **Image size:** about the same. Both serve WebP at q75 (one 828px image was 74 KB from Vercel,
  70 KB from Sanity). The desktop shop page was up to 20% heavier from Sanity.
- **Browser caching:** Sanity tells browsers to keep images for a year; Vercel's setting is 30
  days.
- **Speed: largest contentful paint (LCP)**, 7 runs each, measured from the UK:

  | Page | LCP via Vercel | LCP via Sanity |
  |---|---|---|
  | Home, mobile | 428 ms | 424 ms |
  | Shop, mobile | 576 ms | 640 ms |
  | Product, mobile | 420 ms | 468 ms |
  | Home, desktop | 280 ms | 320 ms |
  | Shop, desktop | 460 ms | 484 ms |
  | Product, desktop | 276 ms | 300 ms |

- **Speed: one image from 9 cities** (Globalping probes), warm median:

  | City | Via Vercel | Via Sanity |
  |---|---|---|
  | New York | 64 ms | 35 ms |
  | Los Angeles | 58 ms | 81 ms |
  | Toronto | 60 ms | 114 ms |
  | London | 31 ms | 15 ms |
  | Frankfurt | 32 ms | 12 ms |
  | Paris | 27 ms | 23 ms |
  | Milan | 51 ms | 13 ms |
  | Sydney | 38 ms | 233 ms (a later single check: 416 ms) |
  | Tokyo | 29 ms | 154 ms (first request: 487 ms) |

  Vercel's Sydney edge already held the image (a cache HIT about 4 days old). Sanity's nearby
  edge didn't, and fetched it from its origin abroad. A small shop's traffic doesn't keep Sanity's
  regional caches warm, so Australia and Japan would see the main image arrive **about
  0.15–0.4 s later**.

## Option B: load linked pages on hover/touch instead of on view

- Click to page shown, on a product page:

  | Link | Loaded in advance (now) | Not loaded, fast connection | Not loaded, slow mobile |
  |---|---|---|---|
  | Shipping | 31 ms | 183 ms | about 2.1 s |
  | Terms | 61 ms | 251 ms | about 1.7 s |
  | Shop | 61 ms | 206 ms | about 3.3 s |

  The slow-mobile test used 1.6 Mbps and 150 ms of latency, which is harsher than typical 4G.
- **Without loading in advance**, a click costs one extra round trip to Vercel: about **40–90 ms**
  in most cities and 177 ms in Tokyo, plus the phone network's own delay.
- **Loading on hover** (desktop) or the moment a finger touches the link (phone) starts that
  round trip early. Hover usually comes 200–300 ms before the click; touch gives about 100 ms.
  Only links people actually reach for cost a request.

## Recommendation

1. **Split the images.** Keep the first images on screen (the main product photo and the top of
   the home and shop pages) on Vercel, so the page appears just as fast everywhere, Australia and
   Japan included. Load the rest (lower images and thumbnails) straight from Sanity: a small
   custom `next/image` loader that builds `cdn.sanity.io` URLs with `w`, `q=75` and `auto=format`,
   used only on those images. This saves about **4–14 Vercel requests per page view** and most of
   the image-optimisation allowance.
2. **Load on hover/touch** for the footer links, Press, Studio and Cart: `prefetch={false}` plus
   `router.prefetch()` on `onMouseEnter` / `onTouchStart`, in a small wrapper around `<Link>`.
   Keep loading on view for Shop, Lookbook and the product cards, which are the main path to a
   sale. This saves about **6 requests per page view**.
3. **Upgrade the team to Pro** (needed for commercial use; it never pauses the site). Decide on
   the $20 Flat Rate CDN tier after a month of usage with 1 and 2 in place.
4. **Check the per-project split** on the Vercel Usage page. If `arch-ive`, `store-offpeak` or
   `torq-os` uses a large share, moving it to its own team gives cinque.studio the whole 1M.

**Expected effect:** about **30–35% fewer Vercel requests** per page view (from about 45–58 to
about 30–40), with no visible slowdown anywhere.

## Measurement notes

- **Where the tests ran:** browser tests used playwright-core with the cached Chrome for Testing,
  from the UK. City timings came from Globalping (one probe per city, 1 first request plus 3 warm
  requests) and are noisy: Toronto's Sanity time read 27 ms on the first request and 114 ms warm.
  The Globalping hourly rate limit cut off a repeat of the Sydney and Tokyo tests.
- **The slow-network setting didn't take effect for the mobile image test**, so the image LCPs
  above are on a fast connection. Only the click-to-page timings were throttled.
