import {
  PortableText as PortableTextBase,
  type PortableTextComponents,
} from '@portabletext/react';
import type { PortableTextBlock } from '@portabletext/types';

/**
 * Safe rich-text renderer for Sanity Portable Text.
 *
 * This deliberately renders structured content into React elements and never
 * injects raw HTML strings — satisfying the project's strict no-raw-HTML rule
 * while still supporting formatted CMS content.
 */

const components: PortableTextComponents = {
  marks: {
    // Renders standard link annotations. External links open in a new tab.
    link: ({ value, children }) => {
      const href = (value?.href as string) || '#';
      const external = /^https?:\/\//i.test(href);
      return (
        <a
          href={href}
          className="underline underline-offset-4 hover:text-redcurrent"
          {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        >
          {children}
        </a>
      );
    },
  },
};

export function PortableText({ value }: { value?: PortableTextBlock[] | null }) {
  if (!value) return null;
  return <PortableTextBase value={value} components={components} />;
}
