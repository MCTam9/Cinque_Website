import Container, { contentPadY } from '@/components/Container';

/**
 * Shared prose layout for static legal/utility pages (Shipping, Privacy,
 * Terms, Accessibility). Constrains measure and sets vertical rhythm.
 *
 * NOTE: the copy in these pages is standard boilerplate and must be reviewed
 * by a solicitor before launch — it is not legally binding as written.
 */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <Container className={contentPadY}>
      <article className="mx-auto flex max-w-2xl flex-col gap-[20px] [&_h2]:mt-[20px] [&_p]:text-graphite">
        {children}
      </article>
    </Container>
  );
}
