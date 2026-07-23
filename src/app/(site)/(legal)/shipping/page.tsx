import type { Metadata } from 'next';
import { H1, H2, P1, P2 } from '@/components/typography';

export const metadata: Metadata = {
  title: 'Shipping & Returns',
  description: 'Cinque® shipping destinations, lead times, and returns policy.',
};

export default function ShippingPage() {
  return (
    <>
      <H1 className="font-bold">Shipping &amp; Returns</H1>
      <P2 className="text-oslo">Last updated: July 2026</P2>

      <H2 className="font-bold">Processing &amp; lead times</H2>
      <P1>
        Cinque® pieces are individually made, cast and hallmarked in London. In-stock pieces are
        typically dispatched within 3–5 working days. Made-to-order and commissioned pieces have
        longer lead times, which are confirmed at the time of order.
      </P1>

      <H2 className="font-bold">Destinations &amp; delivery</H2>
      <P1>
        We currently ship to the United Kingdom, United States, France, Germany and Ireland.
        Orders are sent via a tracked, insured service; an estimated delivery window and tracking
        details are provided at checkout and by email once your order ships.
      </P1>

      <H2 className="font-bold">Duties &amp; taxes</H2>
      <P1>
        Orders shipped outside the UK may be subject to import duties and taxes levied by the
        destination country. These charges are the responsibility of the recipient and are not
        included in the order total.
      </P1>

      <H2 className="font-bold">Returns</H2>
      <P1>
        Under the UK Consumer Contracts Regulations, you may cancel an eligible order within 14
        days of receipt for a refund. Items must be returned unworn and in their original
        condition and packaging. Bespoke, commissioned, personalised or altered pieces are made to
        your specification and are not eligible for return unless faulty.
      </P1>

      <H2 className="font-bold">How to return</H2>
      <P1>
        To arrange a return, email{' '}
        <a href="mailto:cindy@cinque.studio" className="underline underline-offset-4 hover:text-redcurrent">
          cindy@cinque.studio
        </a>{' '}
        with your order number. Return postage is the customer’s responsibility unless the item is
        faulty. Refunds are issued to the original payment method within 14 days of us receiving
        the returned item.
      </P1>

      <H2 className="font-bold">Faulty items</H2>
      <P1>
        If a piece arrives damaged or faulty, please contact us within 14 days of receipt with
        photographs so we can arrange a repair, replacement or refund.
      </P1>
    </>
  );
}
