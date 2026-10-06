import type { Metadata } from 'next';
import JsonLd from '@/components/JsonLd';
import { H1, H3, P1, P2 } from '@/components/typography';
import {
  DUTIES_CALCULATOR,
  EU_PAUSE_NOTICE,
  IMPORT_AUTHORITY,
  SHIPPING_RATES,
  SHIP_COUNTRIES,
  formatPence,
} from '@/lib/shop/shipping';
import { MADE_TO_ORDER_LEAD_TIME } from '@/lib/shop/madeToOrder';

export const metadata: Metadata = {
  title: 'Shipping & Returns',
  description: 'Cinque® shipping costs, destinations, lead times, and returns policy.',
  alternates: { canonical: '/shipping' },
};

/**
 * Plain-text mirror of the sections below, for FAQPage structured data.
 *
 * These are the questions people actually ask an answer engine about a small
 * jewellery brand ("do they ship to the US", "what's the return window"), and
 * marking them up is what lets the answer be quoted with attribution.
 *
 * Each `answer` MUST stay in step with the prose it mirrors — Google requires
 * the marked-up answer to be visible on the page, and a drift between the two
 * is a structured-data violation.
 */
// Built from the same constants checkout charges, so the page can't drift.
const SHIPPING_COSTS = `UK delivery is ${formatPence(SHIPPING_RATES.domesticPence)} and international delivery is ${formatPence(SHIPPING_RATES.internationalPence)}. Orders of ${formatPence(SHIPPING_RATES.freeFromPence)} or more ship free to every country we deliver to.`;

// Shared by the FAQ and the prose below, like SHIPPING_COSTS.
const DESTINATIONS = 'We currently ship to the United Kingdom, United States, Canada, Australia and Japan. Orders are sent via a tracked, insured service; an estimated delivery window and tracking details are provided at checkout and by email once your order ships.';

// Must match IMPORT_CHARGES in lib/shop/shipping.ts (every destination 'buyer').
const DUTIES = 'For orders outside the United Kingdom, our prices and delivery charges do not include import duties, taxes (such as sales tax, GST or consumption tax) or carrier handling fees. These are set by the customs authority of the destination country, collected by the carrier or postal service before or on delivery, and are the recipient’s responsibility. We cannot predict the exact amount, as it depends on the value of your order and your country’s rules; please check with your local customs authority before ordering.';

const LEAD_TIMES = `Cinque® pieces are individually made, cast and hallmarked in London. In-stock pieces are typically dispatched within 3–5 working days. Made-to-order pieces are made to the size you enter at checkout and are dispatched within ${MADE_TO_ORDER_LEAD_TIME}. Commissioned pieces have longer lead times, which are confirmed at the time of order.`;

const RETURNS = 'Under the UK Consumer Contracts Regulations, you may cancel an eligible order within 14 days of receipt for a refund. Items must be returned unworn and in their original condition and packaging. Made-to-order pieces are made to the size you give us, and bespoke, commissioned, personalised or altered pieces are made to your specification; none of these are eligible for return unless faulty. Please check your size against our ring size chart before ordering, or email us if you are unsure.';

const FAQ: { question: string; answer: string }[] = [
  {
    question: 'How long does a Cinque order take to make and dispatch?',
    answer: LEAD_TIMES,
  },
  {
    question: 'Which countries does Cinque ship to?',
    answer: `${DESTINATIONS} ${EU_PAUSE_NOTICE}`,
  },
  {
    question: 'How much does shipping cost?',
    answer: SHIPPING_COSTS,
  },
  {
    question: 'Are import duties and taxes included in the price?',
    answer: DUTIES,
  },
  {
    question: 'What is the returns policy?',
    answer: RETURNS,
  },
  {
    question: 'How do I return an item?',
    answer:
      'To arrange a return, email cindy@cinque.studio with your order number. Return postage is the customer’s responsibility unless the item is faulty. Refunds include the original standard delivery charge and are issued to the original payment method within 14 days of us receiving the returned item.',
  },
  {
    question: 'What if my piece arrives damaged or faulty?',
    answer:
      'If a piece arrives damaged or faulty, please contact us within 14 days of receipt with photographs so we can arrange a repair, replacement or refund.',
  },
];

export default function ShippingPage() {
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: FAQ.map((f) => ({
            '@type': 'Question',
            name: f.question,
            acceptedAnswer: { '@type': 'Answer', text: f.answer },
          })),
        }}
      />
      <H1>Shipping &amp; Returns</H1>
      <P2 className="text-oslo">Last updated: October 2026</P2>

      <H3 as="h2" className="font-bold">Processing &amp; lead times</H3>
      <P1>{LEAD_TIMES}</P1>

      <H3 as="h2" className="font-bold">Destinations &amp; delivery</H3>
      <P1>{DESTINATIONS}</P1>
      <P1>{EU_PAUSE_NOTICE}</P1>

      <H3 as="h2" className="font-bold">Shipping costs</H3>
      <P1>{SHIPPING_COSTS}</P1>

      <H3 as="h2" id="duties" className="scroll-mt-[80px] font-bold">
        Duties &amp; taxes
      </H3>
      <P1>{DUTIES}</P1>
      <P1>Guidance from each destination&rsquo;s customs authority:</P1>
      <ul className="type-p1 flex list-none flex-col gap-[4px]">
        {SHIP_COUNTRIES.map(({ code, name }) => {
          const authority = IMPORT_AUTHORITY[code];
          if (!authority) return null;
          return (
            <li key={code}>
              {name}:{' '}
              <a
                href={authority.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4 hover:text-redcurrent"
              >
                {authority.name.replace(/^the /, '')}
              </a>
            </li>
          );
        })}
      </ul>
      <P1>
        For a rough estimate before you order, you can use a third-party calculator such as{' '}
        <a
          href={DUTIES_CALCULATOR.url}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4 hover:text-redcurrent"
        >
          {DUTIES_CALCULATOR.name}
        </a>
        . Estimates are a guide only; the amount you pay is set by customs.
      </P1>

      <H3 as="h2" className="font-bold">Returns</H3>
      <P1>{RETURNS}</P1>

      <H3 as="h2" className="font-bold">How to return</H3>
      <P1>
        To arrange a return, email{' '}
        <a href="mailto:cindy@cinque.studio" className="underline underline-offset-4 hover:text-redcurrent">
          cindy@cinque.studio
        </a>{' '}
        with your order number. Return postage is the customer’s responsibility unless the item is
        faulty. Refunds include the original standard delivery charge and are issued to the
        original payment method within 14 days of us receiving the returned item.
      </P1>

      <H3 as="h2" className="font-bold">Faulty items</H3>
      <P1>
        If a piece arrives damaged or faulty, please contact us within 14 days of receipt with
        photographs so we can arrange a repair, replacement or refund.
      </P1>
    </>
  );
}
