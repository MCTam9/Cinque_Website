import type { Config } from 'tailwindcss';

const config: Config = {
  // Only the storefront is styled with Tailwind. The Sanity Studio (/studio)
  // ships its own styling and is intentionally excluded.
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      // Design tokens will be filled in from the Figma export.
      colors: {},
      fontFamily: {},
    },
  },
  plugins: [],
};

export default config;
