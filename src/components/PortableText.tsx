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
  // Extend with custom marks/blocks (links, images) as the design requires.
};

export function PortableText({ value }: { value?: PortableTextBlock[] | null }) {
  if (!value) return null;
  return <PortableTextBase value={value} components={components} />;
}
