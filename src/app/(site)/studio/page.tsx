import type { Metadata } from 'next';
import Container from '@/components/Container';
import ContactForm from '@/components/ContactForm';
import { H1, H2, P1, P2 } from '@/components/typography';

export const metadata: Metadata = {
  title: 'Studio',
  description:
    'Cinque® founder Cindy Liu — jewellery and object making as a form of memory archive. Handmade and cast in London.',
};

export default function StudioPage() {
  return (
    <Container className="py-12 md:py-16">
      <H1 className="mb-10 font-bold">STUDIO</H1>

      {/* About */}
      <section className="mb-16 grid grid-cols-1 gap-8 md:grid-cols-[1fr_1fr]">
        <H2>About</H2>
        <div className="flex flex-col gap-4 type-p1">
          <P1 className="text-oslo">[Cinque: five]</P1>
          <P1>
            Cinque founder Cindy Liu, with backgrounds in architecture and metalsmithing,
            practises jewellery and object making as a form of memory archive. Through wax and
            metal forming, Cinque transforms natural and cultural relics into tangible, wearable
            pieces—sealing ephemeral moments into the material permanence of metalwork. Each piece
            evokes new interpretations of memory, activated through the touch of skin. Cinque® uses
            this instinctive, tactile connection to express delicate, transient memories through
            the warmth of the five fingers—hence the name Cinque, meaning “five.” Handmade and cast
            in London, Cinque’s pieces create new connections and tangible interpretations of
            memories, accessed from the touch of skin.
          </P1>
          <P1>
            Cinque works closely with photographer and multi-disciplinary designer Vincent Tam to
            explore the dialogue between object, image and documentation.
          </P1>
          <P2 className="text-oslo">
            Read our story on{' '}
            <a
              href="https://scura.co.uk/cinque/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-redcurrent"
            >
              Scura Magazine
            </a>
            .
          </P2>
        </div>
      </section>

      {/* Contact / commissions */}
      <section id="contact" className="grid grid-cols-1 gap-8 md:grid-cols-[1fr_1fr]">
        <div className="flex flex-col gap-4">
          <H2>Contact</H2>
          <P1 className="text-oslo">
            For bespoke commissions, custom variations, or general enquiries.
          </P1>
          <div className="type-p2 text-graphite">
            <P2 className="mb-2">For bespoke commissions, kindly include:</P2>
            <ul className="list-none">
              <li>Desired timeline</li>
              <li>Budget range (if known)</li>
              <li>Any existing stone or piece to incorporate</li>
            </ul>
          </div>
          <P2 className="text-oslo">We aim to respond within 2–3 working days.</P2>
          <P2 className="text-oslo">
            Cinque® Studio
            <br />
            London, W2
          </P2>
        </div>

        <ContactForm />
      </section>
    </Container>
  );
}
