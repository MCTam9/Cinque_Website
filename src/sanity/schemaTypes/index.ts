import { type SchemaTypeDefinition } from 'sanity';

// Objects
import { stoneSpec } from './objects/stoneSpec';
import { productionNotes } from './objects/productionNotes';
import { variant } from './objects/variant';
import { pageBuilderBlocks } from './objects/blocks';

// Documents
import { product } from './documents/product';
import { drop } from './documents/drop';
import { order } from './documents/order';
import { press } from './documents/press';
import { page } from './documents/page';
import { homePage } from './documents/homePage';
import { studioPage } from './documents/studioPage';
import { stripeEvent } from './documents/stripeEvent';

export const schemaTypes: SchemaTypeDefinition[] = [
  // objects
  stoneSpec,
  productionNotes,
  variant,
  ...pageBuilderBlocks,
  // documents
  product,
  drop,
  order,
  press,
  page,
  homePage,
  studioPage,
  stripeEvent,
];
