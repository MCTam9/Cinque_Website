import { Fragment } from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import Container, { contentPadY } from '@/components/Container';
import ContactForm from '@/components/ContactForm';
import { PortableText } from '@/components/PortableText';
import { H1, H2, H3, P1 } from '@/components/typography';
import { sanityFetch } from '@/lib/sanity/fetch';
import { studioPageQuery } from '@/lib/sanity/queries';
import { urlFor } from '@/lib/sanity/image';
import JsonLd from '@/components/JsonLd';
import { absoluteUrl, INSTAGRAM_URL, SHIPPING } from '@/lib/seo';
import type { SanityImageRef, StudioPageDoc } from '@/types';

export const revalidate = 60;

const INSTAGRAM = 'https://www.instagram.com/cinque.made';

/**
 * Built-in copy, shown for any text field the Studio Page document leaves blank
 * (or whenever Sanity is unreachable) — so /studio always reads in full.
 * Imagery has no equivalent: an image that hasn't been uploaded simply doesn't
 * render, rather than standing in a photo of something else.
 */
const DEFAULTS = {
  seoDescription:
    'Cinque® founder Cindy Liu — jewellery and object making as a form of memory archive. Handmade and cast in London.',
  label: '[Cinque: five]',
  about: [
    'Cinque founder Cindy Liu, with backgrounds in architecture and metalsmithing, practises jewellery and object making as a form of memory archive.',
    'Through wax and metal forming, Cinque transforms natural and cultural relics into tangible, wearable pieces—sealing ephemeral moments into the material permanence of metalwork. Each piece evokes new interpretations of memory, activated through the touch of skin. Cinque® uses this instinctive, tactile connection to express delicate, transient memories through the warmth of the five fingers—hence the name Cinque, meaning “five.”',
    'Handmade and cast in London, Cinque’s pieces create new connections and tangible interpretations of memories, accessed from the touch of skin.',
    'Cinque works closely with photographer and multi-disciplinary designer Vincent Tam to explore the dialogue between object, image and documentation.',
  ],
  contactIntro:
    'For bespoke commissions, custom variations, or general enquiries, please email:',
  email: 'cindy@cinque.studio',
  commissionNote: 'For bespoke commissions,\nkindly include:',
  commissionChecklist: [
    'Desired timeline',
    'Budget range (if known)',
    'Any existing stone or piece to incorporate',
  ],
  responseTime: 'We aim to respond within 2–3 working days.',
  address: 'Cinque® Studio\nLondon, W2',
  bespokeIntro: [
    'At Cinque, each jewellery piece is conceived as a quiet archive of meaning — shaped with care and made to hold memory in precious metal.',
    'Developed in close dialogue and crafted in London, each piece emerges through drawing, material exploration, and meticulous making.',
  ],
  bespokeProcessLabel: 'Bespoke Commission Process',
  bespokeSteps: [
    {
      number: '01',
      title: 'Conversation',
      body: [
        'Each commission begins with a private consultation, held in London or online. We discuss intention, proportion, material direction, and timeline.',
        'Engagement commissions typically require 8–12 weeks from confirmation.',
      ],
    },
    {
      number: '02',
      title: 'Design Development',
      body: [
        'A proposal is developed through drawing and material study. Stone options are sourced through trusted ethical suppliers and shared alongside considered design variations.',
        'The design is refined in close dialogue until resolved.',
      ],
    },
    {
      number: '03',
      title: 'Making',
      body: [
        'Once approved, the ring is carved, cast, and finished by hand in London. Traditional goldsmithing techniques are combined with digital precision where appropriate.',
        'Each piece is individually hallmarked.',
      ],
    },
    {
      number: '04',
      title: 'Completion',
      body: [
        'The finished piece is presented with relevant documentation and stone certification where applicable — ready to carry forward its next chapter.',
      ],
    },
  ],
};

function getStudioPage() {
  return sanityFetch<StudioPageDoc | null>({
    label: 'studioPage',
    query: studioPageQuery,
    fallback: null,
  });
}

export async function generateMetadata(): Promise<Metadata> {
  const studio = await getStudioPage();
  return {
    title: 'Studio',
    description: studio?.seoDescription?.trim() || DEFAULTS.seoDescription,
    alternates: { canonical: '/studio' },
  };
}

/** A Sanity image at the given frame, or `null` if none is uploaded. */
function cropped(img: SanityImageRef | undefined, w: number, h: number) {
  if (!img?.asset) return null;
  return urlFor(img as never).width(w).height(h).fit('crop').url();
}

/** Renders text with its line breaks intact, as typed in the Studio. */
function Lines({ text, className = '' }: { text: string; className?: string }) {
  return (
    <P1 className={className}>
      {text.split('\n').map((line, i, all) => (
        <Fragment key={i}>
          {line}
          {i < all.length - 1 && <br />}
        </Fragment>
      ))}
    </P1>
  );
}

/** The built-in closing CTA, shown until the Studio sets its own. */
function BespokeClosingFallback() {
  return (
    <P1 className="text-oslo">
      <Link href="/studio#contact" className="underline underline-offset-4 hover:text-redcurrent">
        Contact us
      </Link>{' '}
      to begin a bespoke commission. Further details regarding design, timeline, and quotation
      will follow.
    </P1>
  );
}

export default async function StudioPage() {
  const studio = await getStudioPage();

  const label = studio?.label?.trim() || DEFAULTS.label;
  const instagram = studio?.instagramUrl?.trim() || INSTAGRAM;
  const portrait = cropped(studio?.portrait, 500, 700);
  const band = cropped(studio?.bandImage, 2100, 900);
  const contactIntro = studio?.contactIntro?.trim() || DEFAULTS.contactIntro;
  const email = studio?.email?.trim() || DEFAULTS.email;
  const commissionNote = studio?.commissionNote?.trim() || DEFAULTS.commissionNote;
  const checklist =
    studio?.commissionChecklist?.filter((l) => l?.trim()) ?? [];
  const commissionChecklist =
    checklist.length > 0 ? checklist : DEFAULTS.commissionChecklist;
  const responseTime = studio?.responseTime?.trim() || DEFAULTS.responseTime;
  const address = studio?.address?.trim() || DEFAULTS.address;
  const bespokeProcessLabel =
    studio?.bespokeProcessLabel?.trim() || DEFAULTS.bespokeProcessLabel;
  const bespokeSteps = studio?.bespokeSteps?.length ? studio.bespokeSteps : null;
  const bespokeImage = cropped(studio?.bespokeImage, 500, 700);
  const bespokeImages = (studio?.bespokeImages ?? [])
    .filter((i) => i.asset)
    .slice(0, 4)
    .map((img) => ({
      src: urlFor(img as never).width(600).height(900).fit('crop').url(),
      alt: img.alt || 'Cinque bespoke commission',
    }));

  // The address is free text ("Cinque® Studio\nLondon, W2"); the last line is
  // the locality + outward postcode. Marked up loosely rather than invented —
  // there is no full street address to claim.
  const addressLines = address.split('\n').map((l) => l.trim()).filter(Boolean);

  return (
    <Container className={contentPadY}>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'JewelryStore',
          '@id': absoluteUrl('/studio#studio'),
          name: 'Cinque® Studio',
          url: absoluteUrl('/studio'),
          parentOrganization: { '@id': absoluteUrl('/#organization') },
          email,
          image: portrait ?? undefined,
          description: studio?.seoDescription?.trim() || DEFAULTS.seoDescription,
          founder: { '@type': 'Person', name: 'Cindy Liu' },
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'London',
            addressCountry: 'GB',
            ...(addressLines.at(-1)?.includes(',')
              ? { addressRegion: addressLines.at(-1)!.split(',').pop()!.trim() }
              : {}),
          },
          areaServed: SHIPPING.countries.map((c) => ({
            '@type': 'Country',
            name: c,
          })),
          sameAs: [studio?.instagramUrl?.trim() || INSTAGRAM_URL],
          knowsAbout: [
            'bespoke jewellery commissions',
            'engagement rings',
            'lost-wax casting',
            'London hallmarking',
          ],
        }}
      />
      {bespokeSteps && bespokeSteps.length > 0 && (
        // The bespoke process is already written as ordered steps; marking it
        // up is what lets an answer engine quote the actual process.
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'HowTo',
            name: bespokeProcessLabel,
            description:
              'How a bespoke commission with Cinque® is made, from first conversation to completion.',
            step: bespokeSteps.map((st, i) => ({
              '@type': 'HowToStep',
              position: i + 1,
              name: st.title,
              text: st.body,
            })),
          }}
        />
      )}
      <H1 className="mb-[10px] border-b border-oslo pb-[10px]">STUDIO</H1>

      {/* About */}
      <H2 className="mb-[10px] border-b border-oslo pb-[10px]">About</H2>
      <section className="mb-[40px] grid grid-cols-1 gap-[30px] md:mb-[60px] md:grid-cols-3">
        <div className="flex flex-col gap-[20px] md:col-span-2">
          <P1 className="text-oslo">{label}</P1>
          {/* Rich text from the CMS, or the copy the page shipped with. */}
          <div className="flex flex-col gap-[20px] type-p1">
            {studio?.about ? (
              <PortableText value={studio.about as never} />
            ) : (
              DEFAULTS.about.map((para, i) => <P1 key={i}>{para}</P1>)
            )}
          </div>
          <a
            href={instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="type-p1 mt-[10px] w-fit underline underline-offset-4 hover:text-redcurrent"
          >
            Follow us on Instagram
          </a>
        </div>
        {/* Mobile leads with the portrait, directly under the About rule and
            above the copy; on desktop it returns to the right-hand column. */}
        {portrait && (
          <div className="group relative order-first aspect-[5/7] w-full self-start overflow-hidden bg-cloud/30 md:order-none">
            <Image
              src={portrait}
              alt={studio?.portrait?.alt || 'Cinque studio'}
              fill
              sizes="(max-width: 768px) 100vw, 25vw"
              className="img-bw object-cover"
            />
          </div>
        )}
      </section>

      {/* Contact */}
      <H2 className="mb-[10px] border-b border-oslo pb-[10px]">Contact</H2>
      <section id="contact" className="mb-[40px] grid grid-cols-1 gap-[30px] md:mb-[60px] md:grid-cols-3">
        <div className="md:col-span-2">
          <ContactForm />
        </div>
        <div className="flex flex-col gap-[20px] text-graphite">
          <Lines text={contactIntro} className="text-graphite" />
          <a
            href={`mailto:${email}`}
            className="type-p1 w-fit text-graphite underline underline-offset-4 hover:text-redcurrent"
          >
            {email}
          </a>
          <div className="type-p1 text-graphite">
            <Lines text={commissionNote} className="mb-[10px] text-graphite" />
            {commissionChecklist.map((item, i) => (
              <P1 key={i} className="text-graphite">
                {item}
              </P1>
            ))}
          </div>
          <Lines text={responseTime} className="text-graphite" />
          <Lines text={address} className="text-graphite" />
        </div>
      </section>

      {/* Full-width studio flatlay band, closing the Contact section */}
      {band && (
        <div className="group relative mb-[40px] aspect-[21/9] w-full overflow-hidden bg-cloud/30 md:mb-[60px]">
          <Image
            src={band}
            alt={studio?.bandImage?.alt || 'Cinque studio flatlay'}
            fill
            sizes="(max-width: 768px) 100vw, 900px"
            className="img-bw object-cover"
          />
        </div>
      )}

      {/* Bespoke */}
      <H2 className="mb-[10px] border-b border-oslo pb-[10px]">Bespoke</H2>
      <section className="grid grid-cols-1 gap-[30px] md:grid-cols-3">
        <div className="flex flex-col gap-[30px] md:col-span-2">
          {bespokeImages.length > 0 && (
            <div className="grid grid-cols-4 gap-[10px]">
              {bespokeImages.map((img, i) => (
                <div key={i} className="group relative aspect-[2/3] w-full overflow-hidden bg-cloud/30">
                  <Image
                    src={img.src}
                    alt={img.alt}
                    fill
                    sizes="(max-width: 768px) 25vw, 17vw"
                    className="img-bw object-cover"
                  />
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-col gap-[20px] type-p1">
            {studio?.bespokeIntro ? (
              <PortableText value={studio.bespokeIntro as never} />
            ) : (
              DEFAULTS.bespokeIntro.map((para, i) => <P1 key={i}>{para}</P1>)
            )}
          </div>

          <div className="flex flex-col gap-[20px]">
            <H3 className="font-bold">{bespokeProcessLabel}</H3>
            {(bespokeSteps ?? DEFAULTS.bespokeSteps).map((step, i) => (
              <div key={i} className="flex flex-col gap-[10px]">
                <H3 className="font-bold">
                  {step.number} {step.title}
                </H3>
                <div className="flex flex-col gap-[10px] type-p1">
                  {bespokeSteps ? (
                    <PortableText value={step.body as never} />
                  ) : (
                    (step.body as string[]).map((para, j) => <P1 key={j}>{para}</P1>)
                  )}
                </div>
              </div>
            ))}
          </div>

          {studio?.bespokeClosing ? (
            <div className="type-p1">
              <PortableText value={studio.bespokeClosing as never} />
            </div>
          ) : (
            <BespokeClosingFallback />
          )}
        </div>
        {bespokeImage && (
          <div className="group relative aspect-[5/7] w-full self-start overflow-hidden bg-cloud/30">
            <Image
              src={bespokeImage}
              alt={studio?.bespokeImage?.alt || 'Cinque bespoke commission'}
              fill
              sizes="(max-width: 768px) 100vw, 25vw"
              className="img-bw object-cover"
            />
          </div>
        )}
      </section>
    </Container>
  );
}
