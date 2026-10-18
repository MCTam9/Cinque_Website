'use client';

import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';

import { schemaTypes } from './src/sanity/schemaTypes';
import { structure } from './src/sanity/structure';
import { CompactObjectInput } from './src/sanity/components/CompactObjectInput';
import { ordersTool } from './src/sanity/tools/orders';

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
  // Token login (kept in this browser) rather than Sanity's cookie, so the
  // Orders table can prove who is signed in when it asks the site for
  // customer details from Stripe (/api/admin/customers).
  auth: { loginMethod: 'token' },
  schema: { types: schemaTypes },
  form: { components: { input: CompactObjectInput } },
  plugins: [
    // Tab reads "Manage"; the tool keeps its name `structure`, so
    // /admin/structure/... links still work.
    structureTool({ structure, title: 'Manage' }),
  ],
  // Orders table: its own tab beside Manage.
  tools: (prev) => [...prev, ordersTool],
  // Hide internal, programmatically-managed docs from the global create menu,
  // along with the singletons (Home / Studio) — those are edited in place from
  // the desk, and a second copy would never be read.
  document: {
    newDocumentOptions: (prev, { creationContext }) =>
      prev.filter(
        (item) =>
          ![
            'stripeEvent',
            'order',
            'abandonedCheckout',
            'reminderOptOut',
            'cartReminder',
          ].includes(item.templateId) &&
          item.templateId !== 'homePage' &&
          item.templateId !== 'studioPage' &&
          // Bespoke entries: only from their own list (its + button), which
          // gives them a private id; not from the global create menu.
          !(item.templateId === 'bespokeOrder' && creationContext.type === 'global')
      ),
    // Duplicate would make a bespoke entry with a plain (public) id.
    actions: (prev, { schemaType }) =>
      schemaType === 'bespokeOrder' ? prev.filter((a) => a.action !== 'duplicate') : prev,
  },
});
