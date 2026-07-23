import type { Metadata } from 'next';
import { H1, H2, P1, P2 } from '@/components/typography';

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description: 'The terms governing use of the Cinque® website and purchases.',
};

export default function TermsPage() {
  return (
    <>
      <H1 className="font-bold">Terms &amp; Conditions</H1>
      <P2 className="text-oslo">Last updated: July 2026</P2>

      <P1>
        These terms govern your use of this website and any purchase you make from Cinque®. By
        using the site or placing an order you agree to them.
      </P1>

      <H2 className="font-bold">Products</H2>
      <P1>
        All pieces are handmade, cast and hallmarked in London. Because of the handmade nature,
        each piece is unique and slight variations in colour, finish and dimensions are inherent
        and not defects. Images are representative; no exact replicas are produced.
      </P1>

      <H2 className="font-bold">Pricing &amp; payment</H2>
      <P1>
        Prices are shown in pounds sterling (GBP) and include VAT where applicable. Payment is
        processed securely by Stripe. We reserve the right to correct pricing errors and to decline
        or cancel an order affected by an obvious error.
      </P1>

      <H2 className="font-bold">Orders &amp; contract</H2>
      <P1>
        Your order is an offer to buy. A binding contract is formed only when we confirm dispatch
        of your order. If we cannot fulfil an order we will notify you and issue a full refund.
      </P1>

      <H2 className="font-bold">Returns</H2>
      <P1>
        Returns are handled in accordance with our{' '}
        <a href="/shipping" className="underline underline-offset-4 hover:text-redcurrent">
          Shipping &amp; Returns
        </a>{' '}
        policy, which forms part of these terms.
      </P1>

      <H2 className="font-bold">Intellectual property</H2>
      <P1>
        All designs, images, text and branding on this site are the property of Cinque® and may
        not be reproduced without written permission.
      </P1>

      <H2 className="font-bold">Liability</H2>
      <P1>
        Nothing in these terms limits our liability where it would be unlawful to do so, including
        for death or personal injury caused by negligence or for fraud. Subject to that, our
        liability in connection with any order is limited to the price paid for the item.
      </P1>

      <H2 className="font-bold">Governing law</H2>
      <P1>
        These terms are governed by the laws of England and Wales, and disputes are subject to the
        exclusive jurisdiction of its courts. For any questions, email{' '}
        <a href="mailto:cindy@cinque.studio" className="underline underline-offset-4 hover:text-redcurrent">
          cindy@cinque.studio
        </a>
        .
      </P1>
    </>
  );
}
