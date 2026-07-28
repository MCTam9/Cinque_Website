import { groq } from 'next-sanity';

/**
 * GROQ queries for the storefront. Only public fields are projected —
 * internal `productionNotes` are intentionally excluded from public reads.
 */

// All purchasable products for the catalog grid.
export const activeProductsQuery = groq`
  *[_type == "product" && status == "active"] | order(_createdAt desc) {
    _id,
    title,
    "slug": slug.current,
    status,
    category,
    edition,
    "collection": collection->{ title, "slug": slug.current, dropNumber },
    "images": images[]{ alt, asset },
    variants[]{
      _key, sku, metalType, metalFinish, size, priceGBP, stripePriceId,
      stockQuantity, allowBackorder,
      stone
    }
  }
`;

// All drops, newest first (Shop grid cards).
export const collectionsQuery = groq`
  *[_type == "drop" && defined(slug.current)] | order(dropNumber desc) {
    _id, title, "slug": slug.current, dropNumber, releaseDate,
    heroImage{ alt, asset }
  }
`;

// One product by slug (detail page).
export const productBySlugQuery = groq`
  *[_type == "product" && slug.current == $slug][0] {
    _id,
    title,
    "slug": slug.current,
    status,
    category,
    edition,
    description,
    careInstructions,
    "images": images[]{ alt, asset },
    "collection": collection->{ title, "slug": slug.current, dropNumber },
    variants[]{
      _key, sku, metalType, metalFinish, size, priceGBP, stripePriceId,
      weightGrams, stockQuantity, lowStockThreshold, allowBackorder,
      stone
    }
  }
`;

// All product slugs (for generateStaticParams).
export const productSlugsQuery = groq`
  *[_type == "product" && status == "active" && defined(slug.current)].slug.current
`;

// Single variant lookup used by the checkout route for price/stock integrity.
export const variantForCheckoutQuery = groq`
  *[_type == "product" && _id == $productId][0]{
    _id,
    title,
    status,
    "variant": variants[_key == $variantKey][0]{
      _key, sku, priceGBP, stripeProductId, stripePriceId, stockQuantity, allowBackorder
    }
  }
`;

// Shared projection for page-builder blocks (image assets + rich text).
const pageContentProjection = groq`
  content[]{
    ...,
    _type == "galleryBlock" => { ..., images[]{ alt, asset } },
    image{ alt, asset }
  }
`;

export const collectionBySlugQuery = groq`
  *[_type == "drop" && slug.current == $slug][0]{
    _id, title, "slug": slug.current, dropNumber, releaseDate,
    heroImage{ alt, asset },
    ${pageContentProjection}
  }
`;

export const collectionSlugsQuery = groq`
  *[_type == "drop" && defined(slug.current)].slug.current
`;

export const pressBySlugQuery = groq`
  *[_type == "press" && slug.current == $slug][0]{
    _id, title, venue, publication, location, startDate, endDate, description,
    "images": images[]{ alt, asset }, externalUrl,
    ${pageContentProjection}
  }
`;

export const pressSlugsQuery = groq`
  *[_type == "press" && defined(slug.current)].slug.current
`;

export const pageBySlugQuery = groq`
  *[_type == "page" && slug.current == $slug && published == true][0]{
    _id, title, "slug": slug.current, seoDescription,
    ${pageContentProjection}
  }
`;

export const pageSlugsQuery = groq`
  *[_type == "page" && published == true && defined(slug.current)].slug.current
`;

export const pressQuery = groq`
  *[_type == "press"] | order(startDate desc) {
    _id, title, "slug": slug.current, venue, publication, location, startDate, endDate, description,
    "images": images[]{ alt, asset }, externalUrl
  }
`;

// Just enough to point each Home PRESS image at its entry on the Press page.
// Same order as `pressQuery`, so the two lists line up position for position.
export const pressLinksQuery = groq`
  *[_type == "press"] | order(startDate desc) {
    _id, title, "slug": slug.current
  }
`;

// All drops, newest first (Lookbook page + Home drop list).
export const lookbookDropsQuery = groq`
  *[_type == "drop" && defined(slug.current)] | order(dropNumber desc) {
    _id, title, dropNumber, "slug": slug.current, intro,
    "images": images[]{ alt, asset }
  }
`;

// The Home page singleton (tagline + per-section image galleries).
// Matched by _id, not just _type: the Studio edits the fixed `homePage`
// document (src/sanity/structure.ts), so a stray second homePage doc can never
// win the `[0]` pick.
export const homePageQuery = groq`
  *[_id == "homePage"][0]{
    tagline,
    "shopImages": shopImages[]{ alt, asset },
    "lookbookImages": lookbookImages[]{ alt, asset },
    "pressImages": pressImages[]{ alt, asset },
    "studioImages": studioImages[]{ alt, asset }
  }
`;

// The Studio page singleton (/studio). Matched by _id for the same reason as
// homePage above: the Studio edits one fixed document.
export const studioPageQuery = groq`
  *[_id == "studioPage"][0]{
    label,
    about,
    instagramUrl,
    portrait{ alt, asset },
    bandImage{ alt, asset },
    contactIntro,
    email,
    commissionNote,
    commissionChecklist,
    responseTime,
    address,
    bespokeImage{ alt, asset },
    "bespokeImages": bespokeImages[]{ alt, asset },
    bespokeIntro,
    bespokeProcessLabel,
    bespokeSteps[]{ number, title, body },
    bespokeClosing,
    seoDescription
  }
`;
