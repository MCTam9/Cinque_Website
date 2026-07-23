import type { Metadata } from 'next';
import Image from 'next/image';
import Container from '@/components/Container';
import ContactForm from '@/components/ContactForm';
import { H1, H2, P1 } from '@/components/typography';

export const metadata: Metadata = {
  title: 'Studio',
  description:
    'Cinque® founder Cindy Liu — jewellery and object making as a form of memory archive. Handmade and cast in London.',
};

const INSTAGRAM = 'https://www.instagram.com/cinque.made';

export default function StudioPage() {
  return (
    <Container className="py-[40px] md:py-[60px]">
      <H1 className="mb-[10px] border-b border-graphite pb-[10px]">STUDIO</H1>

      {/* About */}
      <H2 className="mb-[30px] border-b border-graphite pb-[10px]">About</H2>
      <section className="mb-[60px] grid grid-cols-1 gap-[30px] md:grid-cols-3">
        <div className="flex flex-col gap-[20px] md:col-span-2">
          <P1 className="text-oslo">[Cinque: five]</P1>
          <P1>
            Cinque founder Cindy Liu, with backgrounds in architecture and metalsmithing, practises
            jewellery and object making as a form of memory archive.
          </P1>
          <P1>
            Through wax and metal forming, Cinque transforms natural and cultural relics into
            tangible, wearable pieces—sealing ephemeral moments into the material permanence of
            metalwork. Each piece evokes new interpretations of memory, activated through the touch
            of skin. Cinque® uses this instinctive, tactile connection to express delicate, transient
            memories through the warmth of the five fingers—hence the name Cinque, meaning “five.”
          </P1>
          <P1>
            Handmade and cast in London, Cinque’s pieces create new connections and tangible
            interpretations of memories, accessed from the touch of skin.
          </P1>
          <P1>
            Cinque works closely with photographer and multi-disciplinary designer Vincent Tam to
            explore the dialogue between object, image and documentation.
          </P1>
          <a
            href={INSTAGRAM}
            target="_blank"
            rel="noopener noreferrer"
            className="type-p1 mt-[10px] w-fit underline underline-offset-4 hover:text-redcurrent"
          >
            Follow us on Instagram
          </a>
        </div>
        <div className="group relative aspect-[5/7] w-full self-start overflow-hidden bg-cloud/30">
          <Image
            src="/figma/lookbook-2-bench-flatlay.png"
            alt="Cinque studio"
            fill
            sizes="(max-width: 768px) 100vw, 25vw"
            className="img-bw object-cover"
          />
        </div>
      </section>

      {/* Full-width studio flatlay band */}
      <div className="group relative mb-[60px] aspect-[16/9] w-full overflow-hidden bg-cloud/30">
        <Image
          src="/figma/home-studio.png"
          alt="Cinque studio flatlay"
          fill
          sizes="(max-width: 768px) 100vw, 900px"
          className="img-bw object-cover"
        />
      </div>

      {/* Contact */}
      <H2 className="mb-[30px] border-b border-graphite pb-[10px]">Contact</H2>
      <section id="contact" className="grid grid-cols-1 gap-[30px] md:grid-cols-3">
        <div className="md:col-span-2">
          <ContactForm />
        </div>
        <div className="flex flex-col gap-[20px]">
          <P1 className="text-oslo">
            For bespoke commissions, custom variations, or general enquiries, please email:
          </P1>
          <a
            href="mailto:cindy@cinque.studio"
            className="type-p1 w-fit underline underline-offset-4 hover:text-redcurrent"
          >
            cindy@cinque.studio
          </a>
          <div className="type-p1 text-graphite">
            <P1 className="text-oslo">For bespoke commissions,</P1>
            <P1 className="mb-[10px] text-oslo">kindly include:</P1>
            <P1>Desired timeline</P1>
            <P1>Budget range (if known)</P1>
            <P1>Any existing stone or piece to incorporate</P1>
          </div>
          <P1 className="text-oslo">We aim to respond within 2–3 working days.</P1>
          <P1 className="text-oslo">
            Cinque® Studio
            <br />
            London, W2
          </P1>
        </div>
      </section>
    </Container>
  );
}
