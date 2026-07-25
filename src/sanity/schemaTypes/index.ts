import { type SchemaTypeDefinition } from 'sanity';

// Objects
import { stoneSpec } from './objects/stoneSpec';
import { productionNotes } from './objects/productionNotes';
import { variant } from './objects/variant';
import { pageBuilderBlocks } from './objects/blocks';

// Documents
import { product } from './documents/product';
import { collection } from './documents/collection';
import { order } from './documents/order';
import { exhibition } from './documents/exhibition';
import { pressItem } from './documents/pressItem';
import { page } from './documents/page';
import { lookbookDrop } from './documents/lookbookDrop';
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
  collection,
  order,
  exhibition,
  pressItem,
  page,
  lookbookDrop,
  homePage,
  studioPage,
  stripeEvent,
];
