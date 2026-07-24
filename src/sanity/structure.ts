import type { StructureResolver } from 'sanity/structure';

/**
 * Custom desk structure — action-oriented so a non-technical owner opens the
 * Studio and immediately sees what needs doing (orders to ship, low stock)
 * without writing filters or knowing the data model.
 */
export const structure: StructureResolver = (S) =>
  S.list()
    .title('Cinque')
    .items([
      // ── Home page: a singleton, edited in place ──
      S.listItem()
        .title('Home Page')
        .id('homePage')
        .child(
          S.document().schemaType('homePage').documentId('homePage')
        ),
      S.divider(),

      // ── Orders: what needs action first ──
      S.listItem()
        .title('Orders')
        .child(
          S.list()
            .title('Orders')
            .items([
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
            ])
        ),
      S.divider(),

      // ── Catalog ──
      S.listItem()
        .title('Catalog')
        .child(
          S.list()
            .title('Catalog')
            .items([
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
              S.documentTypeListItem('collection').title('Collections / Drops'),
            ])
        ),
      S.divider(),

      // ── Editorial ──
      S.listItem()
        .title('Editorial')
        .child(
          S.list()
            .title('Editorial')
            .items([
              S.documentTypeListItem('lookbookDrop').title('Lookbook Drops'),
              S.documentTypeListItem('exhibition').title('Exhibitions'),
              S.documentTypeListItem('pressItem').title('Press'),
              S.documentTypeListItem('page').title('Pages'),
            ])
        ),
    ]);
