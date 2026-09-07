import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Shop Cinque jewellery';

export default function Image() {
  return ogImage({ title: 'Shop', subtitle: 'Rings, earrings, necklaces and objects' });
}
