import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Cinque necklaces';

export default function Image() {
  return ogImage({ title: 'Necklaces', subtitle: 'Pendants and chains cast from found forms' });
}
