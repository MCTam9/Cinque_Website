import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Cinque press';

export default function Image() {
  return ogImage({ title: 'Press', subtitle: 'Shows, installations and publications' });
}
