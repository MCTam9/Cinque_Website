import type { Metadata } from 'next';
import Container from '@/components/Container';
import ContactForm from '@/components/ContactForm';
import { H1, P1, P2 } from '@/components/typography';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Contact Cinque® for bespoke commissions, custom variations, or general enquiries.',
};

export default function ContactPage() {
  return (
    <Container className="py-12 md:py-16">
      <H1 className="mb-8 font-bold">CONTACT</H1>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-[1fr_1fr]">
        <div className="flex flex-col gap-4">
          <P1 className="text-oslo">
            For bespoke commissions, custom variations, or general enquiries, email{' '}
            <a
              href="mailto:cindy@cinque.studio"
              className="text-graphite underline underline-offset-4 hover:text-redcurrent"
            >
              cindy@cinque.studio
            </a>{' '}
            or use the form.
          </P1>
          <P2 className="text-oslo">We aim to respond within 2–3 working days.</P2>
          <P2 className="text-oslo">
            Cinque® Studio
            <br />
            London, W2
          </P2>
        </div>

        <ContactForm />
      </div>
    </Container>
  );
}
