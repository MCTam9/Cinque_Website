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

// All collections / drops, newest drop first (Lookbook listing).
export const collectionsQuery = groq`
  *[_type == "collection" && defined(slug.current)] | order(dropNumber desc) {
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
  *[_type == "collection" && slug.current == $slug][0]{
    _id, title, "slug": slug.current, dropNumber, releaseDate, narrative,
    heroImage{ alt, asset },
    ${pageContentProjection}
  }
`;

export const collectionSlugsQuery = groq`
  *[_type == "collection" && defined(slug.current)].slug.current
`;

export const exhibitionBySlugQuery = groq`
  *[_type == "exhibition" && slug.current == $slug][0]{
    _id, title, venue, location, startDate, endDate, description,
    "images": images[]{ alt, asset }, externalUrl,
    ${pageContentProjection}
  }
`;

export const exhibitionSlugsQuery = groq`
  *[_type == "exhibition" && defined(slug.current)].slug.current
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

export const exhibitionsQuery = groq`
  *[_type == "exhibition"] | order(startDate desc) {
    _id, title, venue, location, startDate, endDate, description,
    "images": images[]{ alt, asset }, externalUrl
  }
`;

export const pressQuery = groq`
  *[_type == "pressItem"] | order(publishDate desc) {
    _id, headline, publication, publishDate, excerpt, externalUrl,
    coverImage, body
  }
`;
