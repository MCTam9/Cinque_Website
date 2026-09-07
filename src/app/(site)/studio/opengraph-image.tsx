import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'The Cinque studio';

export default function Image() {
  return ogImage({ title: 'Studio', subtitle: 'Cindy Liu — London, W2' });
}
