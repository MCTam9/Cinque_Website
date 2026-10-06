import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Cinque rings, wedding bands and engagement rings';

export default function Image() {
  return ogImage({ title: 'Rings', subtitle: 'Wedding bands, engagement rings · gold & silver' });
}
