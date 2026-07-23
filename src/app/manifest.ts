import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Cinque',
    short_name: 'Cinque',
    description:
      'Cinque® — jewellery and object maker. Individually made, cast and hallmarked in London.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F1F0ED',
    theme_color: '#4D4B4A',
  };
}
