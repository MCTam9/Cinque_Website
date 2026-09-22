import type { InputProps, SchemaType } from 'sanity';

/**
 * Tightens the vertical gap between fields in the Studio form.
 *
 * Sanity's ObjectInput stacks its members with a fixed 52px gap, which spreads
 * a product across several screens. This wraps plain document/object inputs in
 * a marker element that `studio.css` uses to override that gap. Image, file,
 * slug, reference etc. are also objects under the hood but have their own
 * layouts, so they're left alone.
 */

function rootTypeName(type: SchemaType): string {
  let current = type;
  while (current.type) current = current.type;
  return current.name;
}

export function CompactObjectInput(props: InputProps) {
  const root = rootTypeName(props.schemaType);
  if (root !== 'document' && root !== 'object') return props.renderDefault(props);
  return <div data-compact-form="">{props.renderDefault(props)}</div>;
}
