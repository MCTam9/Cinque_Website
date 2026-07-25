/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Sanity CDN is the only remote image source. next/image optimizes these.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
        pathname: '/images/**',
      },
    ],
  },
  // Catalog moved from /products to /shop (matches nav wording).
  async redirects() {
    return [
      { source: '/products', destination: '/shop', permanent: true },
      { source: '/products/:slug', destination: '/shop/:slug', permanent: true },
      // Contact lives in the Studio page's #contact section now.
      { source: '/contact', destination: '/studio', permanent: true },
      // Exhibition renamed to Press (and merged with the unused Press Item type).
      { source: '/exhibitions', destination: '/press', permanent: true },
      { source: '/exhibitions/:slug', destination: '/press/:slug', permanent: true },
    ];
  },
  // NOTE: The Content-Security-Policy is intentionally NOT set here.
  // It is applied per-request (with a nonce, and path-scoped for /admin)
  // in middleware.ts. Non-nonce security headers live here as a baseline.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
