import type { Metadata } from 'next';
import { H1, H3, P1, P2 } from '@/components/typography';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Cinque® collects, uses and protects your personal data.',
};

export default function PrivacyPage() {
  return (
    <>
      <H1>Privacy Policy</H1>
      <P2 className="text-oslo">Last updated: July 2026</P2>

      <P1>
        This policy explains how Cinque® (“we”, “us”) collects and uses your personal data when
        you visit this website, contact us, or place an order. We are the data controller for the
        information you provide.
      </P1>

      <H3 as="h2" className="font-bold">Information we collect</H3>
      <P1>
        We collect the details you give us directly — your name, email address, and any message
        you send via our contact form — and the information needed to fulfil an order, including
        your name, delivery address, and contact details. Payment card details are collected and
        processed by our payment provider; we never see or store full card numbers.
      </P1>

      <H3 as="h2" className="font-bold">How we use it</H3>
      <P1>
        We use your information to respond to enquiries, process and deliver orders, send order and
        shipping confirmations, and meet our legal and accounting obligations. Our legal bases are
        the performance of a contract, our legitimate interests in responding to you, and
        compliance with legal duties.
      </P1>

      <H3 as="h2" className="font-bold">Sharing &amp; processors</H3>
      <P1>
        We share data only with the service providers that help us run the store: Stripe (payment
        processing), Postmark (transactional and enquiry email), and Sanity (content and order
        records). Each processes data on our behalf under its own terms. We do not sell your data.
      </P1>

      <H3 as="h2" className="font-bold">Retention</H3>
      <P1>
        We keep enquiry emails for as long as needed to handle your request, and order records for
        as long as required by tax and accounting law.
      </P1>

      <H3 as="h2" className="font-bold">Your rights</H3>
      <P1>
        Under UK GDPR you have the right to access, correct, or erase your personal data, to
        restrict or object to processing, and to data portability. To exercise any of these rights,
        email{' '}
        <a href="mailto:cindy@cinque.studio" className="underline underline-offset-4 hover:text-redcurrent">
          cindy@cinque.studio
        </a>
        . You may also complain to the Information Commissioner’s Office (ico.org.uk).
      </P1>

      <H3 as="h2" className="font-bold">Cookies</H3>
      <P1>
        This site uses only the cookies and local storage necessary for it to function, such as
        remembering the contents of your cart. We do not use third-party advertising cookies.
      </P1>
    </>
  );
}
