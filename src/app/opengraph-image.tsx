import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Cinque — jewellery and object maker, London';

export default function Image() {
  return ogImage({
    title: 'Jewellery & object maker',
    subtitle: 'Sealing memories into a tactile archive',
  });
}
