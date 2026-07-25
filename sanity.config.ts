'use client';

import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';

import { schemaTypes } from './src/sanity/schemaTypes';
import { structure } from './src/sanity/structure';

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET!;

export default defineConfig({
  name: 'cinque',
  title: 'Cinque',
  // Studio is served from /admin inside the Next.js app (/studio is the
  // public brand page).
  basePath: '/admin',
  projectId,
  dataset,
  schema: { types: schemaTypes },
  plugins: [
    structureTool({ structure }),
    // Vision lets staff/devs run GROQ queries. Safe to keep; remove for prod-lockdown.
    visionTool({ defaultApiVersion: '2024-10-01' }),
  ],
  // Hide internal, programmatically-managed docs from the global create menu,
  // along with the singletons (Home / Studio) — those are edited in place from
  // the desk, and a second copy would never be read.
  document: {
    newDocumentOptions: (prev) =>
      prev.filter(
        (item) =>
          item.templateId !== 'stripeEvent' &&
          item.templateId !== 'order' &&
          item.templateId !== 'homePage' &&
          item.templateId !== 'studioPage'
      ),
  },
});
