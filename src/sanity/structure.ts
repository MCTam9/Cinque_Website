import type { StructureResolver } from 'sanity/structure';

/**
 * Custom desk structure — action-oriented so a non-technical owner opens the
 * Studio and immediately sees what needs doing (orders to ship, low stock)
 * without writing filters or knowing the data model.
 *
 * Single flat column: the former Orders / Catalog / Editorial folders are now
 * titled dividers (rendered as section headers) with their items stacked
 * directly beneath — no second column to drill through.
 */
export const structure: StructureResolver = (S) =>
  S.list()
    .title('Cinque')
    .items([
      // ── Pages that exist exactly once: singletons, edited in place ──
      S.listItem()
        .title('Home Page')
        .id('homePage')
        .child(
          S.document().schemaType('homePage').documentId('homePage')
        ),
      S.listItem()
        .title('Studio Page')
        .id('studioPage')
        .child(
          S.document().schemaType('studioPage').documentId('studioPage')
        ),

      // ── Orders: what needs action first ──
      S.divider().title('Orders'),
      S.listItem()
        .title('⚑ To fulfil')
        .child(
          S.documentList()
            .title('To fulfil')
            .filter('_type == "order" && status in ["paid", "fulfilling"]')
            .defaultOrdering([{ field: 'createdAt', direction: 'asc' }])
        ),
      S.listItem()
        .title('Shipped')
        .child(
          S.documentList()
            .title('Shipped')
            .filter('_type == "order" && status == "shipped"')
            .defaultOrdering([{ field: 'createdAt', direction: 'desc' }])
        ),
      S.documentTypeListItem('order').title('All orders'),

      // ── Catalog ──
      S.divider().title('Catalog'),
      S.documentTypeListItem('product').title('Products'),
      S.listItem()
        .title('⚠ Low / out of stock')
        .child(
          S.documentList()
            .title('Low / out of stock')
            .filter(
              '_type == "product" && count(variants[!(allowBackorder == true) && stockQuantity <= coalesce(lowStockThreshold, 0)]) > 0'
            )
        ),

      // ── Editorial ──
      // A Drop is entered once here and used by both the Shop catalog
      // (Products link to it) and the Lookbook page.
      S.divider().title('Editorial'),
      S.documentTypeListItem('drop').title('Drops'),
      S.documentTypeListItem('press').title('Press'),
      S.documentTypeListItem('page').title('Pages'),
    ]);
