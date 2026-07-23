import type { Config } from 'tailwindcss';

const config: Config = {
  // Only the storefront is styled with Tailwind. The Sanity Studio (/admin)
  // ships its own styling and is intentionally excluded.
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      // Brand palette (from Figma GLOBAL_VARS).
      colors: {
        cararra: '#F1F0ED', // warm off-white — page background
        graphite: '#4D4B4A', // primary text
        oslo: '#A6A3A1', // secondary text / card borders
        cloud: '#C9C8C4', // tertiary / muted
        redcurrent: '#B35947', // terracotta accent / active nav
      },
      fontFamily: {
        // Single face across the whole site. `--font-letter-gothic` is set on
        // <body>; the fallback keeps the monospace character if the licensed
        // font files are not yet present in /public/fonts.
        sans: ['var(--font-letter-gothic)', 'ui-monospace', 'Courier New', 'monospace'],
        mono: ['var(--font-letter-gothic)', 'ui-monospace', 'Courier New', 'monospace'],
      },
      maxWidth: {
        // Canon content column (Figma: 900px centred inside a 1440 canvas).
        content: '900px',
        // Full desktop frame width.
        frame: '1440px',
      },
    },
  },
  plugins: [],
};

export default config;
