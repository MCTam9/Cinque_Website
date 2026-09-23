import { useEffect } from 'react';
import { set, useClient, type ArrayOfObjectsInputProps, type Reference } from 'sanity';

/**
 * The Home Page's LOOKBOOK list: the default sortable list of drop references,
 * kept in step with Editorial → Drops.
 *
 * On open it compares the list with the published drops and, if they differ,
 * writes one patch: drops missing from the list are added at the top (a new
 * drop is the newest), references to deleted drops are dropped, and the order
 * staff have set is otherwise left alone. So a new drop is already here the
 * first time anyone opens the Home Page, ready to be dragged into place.
 */

type DropRef = Reference & { _key: string };

const PUBLISHED_DROPS = `*[_type == "drop" && !(_id in path("drafts.**"))] | order(dropNumber desc)._id`;

export function LookbookOrderInput(props: ArrayOfObjectsInputProps) {
  const { onChange, readOnly } = props;
  const value = props.value as DropRef[] | undefined;
  const client = useClient({ apiVersion: '2024-01-01' });

  useEffect(() => {
    if (readOnly) return;
    let cancelled = false;

    client.fetch<string[]>(PUBLISHED_DROPS).then((ids) => {
      if (cancelled) return;
      const current = value ?? [];
      const listed = new Set(current.map((r) => r._ref));
      const published = new Set(ids);

      const added: DropRef[] = ids
        .filter((id) => !listed.has(id))
        .map((id) => ({
          _type: 'reference',
          _ref: id,
          _key: crypto.randomUUID().slice(0, 12),
        }));
      const kept = current.filter((r) => published.has(r._ref));

      if (added.length || kept.length !== current.length) {
        onChange(set([...added, ...kept]));
      }
    });

    return () => {
      cancelled = true;
    };
    // Once per open: re-running on every edit would fight a drag in progress.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  return props.renderDefault(props);
}
