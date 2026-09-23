import { useEffect } from 'react';
import {
  getPublishedId,
  useClient,
  useDocumentOperation,
  useFormValue,
  type ArrayOfObjectsInputProps,
  type Reference,
} from 'sanity';

/**
 * The Home Page's LOOKBOOK list: the default sortable list of drop references,
 * kept in step with Editorial → Drops.
 *
 * On open it compares the published drops with `lookbookSeen` (a hidden list
 * of every drop this input has already offered) and writes one patch:
 *   • a drop it has never seen is added at the top — a new drop is the newest;
 *   • a drop staff removed stays removed, because it is already seen;
 *   • references to deleted drops are dropped.
 * So a new drop is already here the first time anyone opens the Home Page, and
 * taking one out of the list hides it from the Home page for good.
 *
 * `lookbookSeen` is a sibling field, so the patch goes through the document
 * rather than this input's own onChange (which can only touch its own path).
 */

type DropRef = Reference & { _key: string };

const PUBLISHED_DROPS = `*[_type == "drop" && !(_id in path("drafts.**"))] | order(dropNumber desc)._id`;

export function LookbookOrderInput(props: ArrayOfObjectsInputProps) {
  const { readOnly } = props;
  const value = props.value as DropRef[] | undefined;
  const seen = useFormValue(['lookbookSeen']) as string[] | undefined;
  const docId = getPublishedId(String(useFormValue(['_id']) ?? 'homePage'));
  const docType = String(useFormValue(['_type']) ?? 'homePage');
  const { patch } = useDocumentOperation(docId, docType);
  const client = useClient({ apiVersion: '2024-01-01' });

  useEffect(() => {
    if (readOnly) return;
    let cancelled = false;

    client.fetch<string[]>(PUBLISHED_DROPS).then((ids) => {
      if (cancelled) return;
      const current = value ?? [];
      const listed = new Set(current.map((r) => r._ref));
      const published = new Set(ids);

      // First run on a list staff already curated (before `lookbookSeen`
      // existed): treat everything as seen rather than re-adding what they
      // left out. On an empty list, offer every drop.
      const known = new Set(seen ?? (current.length ? ids : []));

      const added: DropRef[] = ids
        .filter((id) => !listed.has(id) && !known.has(id))
        .map((id) => ({
          _type: 'reference',
          _ref: id,
          _key: crypto.randomUUID().replace(/-/g, '').slice(0, 12),
        }));
      const kept = current.filter((r) => published.has(r._ref));
      const seenChanged =
        !seen || ids.some((id) => !seen.includes(id)) || seen.some((id) => !published.has(id));

      if (added.length || kept.length !== current.length || seenChanged) {
        patch.execute([{ set: { lookbookOrder: [...added, ...kept], lookbookSeen: ids } }]);
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
