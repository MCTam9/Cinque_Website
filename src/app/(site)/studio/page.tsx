import type { Metadata } from 'next';
import Image from 'next/image';
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
    <>
      <Container className="py-10 md:py-14">
        <H1 className="mb-10 font-bold">STUDIO</H1>

        {/* About: bio left, portrait right */}
        <section className="mb-16">
          <H2 className="mb-4">About</H2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="flex flex-col gap-4 type-p1">
              <P1 className="text-oslo">[Cinque: five]</P1>
              <P1>
                Cinque founder Cindy Liu, with backgrounds in architecture and metalsmithing,
                practises jewellery and object making as a form of memory archive. Through wax and
                metal forming, Cinque transforms natural and cultural relics into tangible, wearable
                pieces—sealing ephemeral moments into the material permanence of metalwork. Each
                piece evokes new interpretations of memory, activated through the touch of skin.
                Cinque® uses this instinctive, tactile connection to express delicate, transient
                memories through the warmth of the five fingers—hence the name Cinque, meaning
                “five.” Handmade and cast in London, Cinque’s pieces create new connections and
                tangible interpretations of memories, accessed from the touch of skin.
              </P1>
              <P1>
                Cinque works closely with photographer and multi-disciplinary designer Vincent Tam
                to explore the dialogue between object, image and documentation.
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
            <div className="group relative aspect-[3/4] w-full overflow-hidden bg-cloud/30">
              <Image
                src="/figma/lookbook-2-bench-flatlay.png"
                alt="Cinque studio"
                fill
                sizes="(max-width: 768px) 100vw, 45vw"
                className="img-bw object-cover"
              />
            </div>
          </div>
        </section>

        {/* Contact: form left, commission info right */}
        <section id="contact">
          <H2 className="mb-4">Contact</H2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <ContactForm />
            <div className="flex flex-col gap-4">
              <P1 className="text-oslo">
                For bespoke commissions, custom variations, or general enquiries, please email{' '}
                <a
                  href="mailto:cindy@cinque.studio"
                  className="text-graphite underline underline-offset-4 hover:text-redcurrent"
                >
                  cindy@cinque.studio
                </a>
                .
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
          </div>
        </section>
      </Container>

      {/* Studio image band (full frame width) */}
      <div className="mx-auto mt-14 w-full max-w-frame px-5 md:px-0">
        <div className="relative aspect-[900/522] w-full overflow-hidden bg-cloud/30">
          <Image
            src="/figma/home-studio.png"
            alt="Cinque studio bench"
            fill
            sizes="100vw"
            className="object-cover"
          />
        </div>
      </div>
    </>
  );
}
