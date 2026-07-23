import type { Metadata } from 'next';
import { H1, H2, P1, P2 } from '@/components/typography';

export const metadata: Metadata = {
  title: 'Accessibility Statement',
  description: 'Cinque®’s commitment to an accessible website.',
};

export default function AccessibilityPage() {
  return (
    <>
      <H1>Accessibility Statement</H1>
      <P2 className="text-oslo">Last updated: July 2026</P2>

      <P1>
        Cinque® is committed to making this website usable for as many people as possible,
        regardless of technology or ability.
      </P1>

      <H2 className="font-bold">Standards</H2>
      <P1>
        We aim to meet the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA. We use
        semantic HTML, descriptive alt text for images, keyboard-operable controls, and colour
        contrast intended to remain legible in light conditions.
      </P1>

      <H2 className="font-bold">Measures we take</H2>
      <P1>
        Accessibility is considered as part of design and development, including responsive layouts
        for phones and desktops, visible focus states, and respect for reduced-motion preferences.
      </P1>

      <H2 className="font-bold">Limitations</H2>
      <P1>
        Some content is provided by third parties (for example the embedded checkout) whose
        accessibility we do not fully control. We are working to identify and address any remaining
        barriers.
      </P1>

      <H2 className="font-bold">Feedback</H2>
      <P1>
        If you encounter an accessibility barrier or need information in a different format, please
        email{' '}
        <a href="mailto:cindy@cinque.studio" className="underline underline-offset-4 hover:text-redcurrent">
          cindy@cinque.studio
        </a>{' '}
        and we will do our best to help.
      </P1>
    </>
  );
}
