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
 * A Home Page section list (LOOKBOOK, PRESS): the default sortable list of
 * references, kept in step with the documents it lists.
 *
 * On open it compares the published documents with the section's `seenField`
 * (a hidden list of every document this input has already offered) and writes
 * one patch:
 *   • a document it has never seen is added at the top — it is the newest;
 *   • one staff removed stays removed, because it is already seen;
 *   • references to deleted documents are dropped.
 * So a new drop or press entry is already listed the first time anyone opens
 * the Home Page, and taking one out hides it from the Home page for good.
 *
 * The seen list is a sibling field, so the patch goes through the document
 * rather than this input's own onChange (which can only touch its own path).
 */

type Ref = Reference & { _key: string };

interface Options {
  /** Document type being listed, e.g. "drop". */
  type: string;
  /** GROQ ordering for newly offered documents, newest first. */
  order: string;
  orderField: string;
  seenField: string;
}

export function syncedOrderInput({ type, order, orderField, seenField }: Options) {
  const query = `*[_type == $type && !(_id in path("drafts.**"))] | order(${order})._id`;

  return function SyncedOrderInput(props: ArrayOfObjectsInputProps) {
    const { readOnly } = props;
    const value = props.value as Ref[] | undefined;
    const seen = useFormValue([seenField]) as string[] | undefined;
    const docId = getPublishedId(String(useFormValue(['_id']) ?? 'homePage'));
    const docType = String(useFormValue(['_type']) ?? 'homePage');
    const { patch } = useDocumentOperation(docId, docType);
    const client = useClient({ apiVersion: '2024-01-01' });

    useEffect(() => {
      if (readOnly) return;
      let cancelled = false;

      client.fetch<string[]>(query, { type }).then((ids) => {
        if (cancelled) return;
        const current = value ?? [];
        const listed = new Set(current.map((r) => r._ref));
        const published = new Set(ids);

        // First run on a list staff already curated (before the seen field
        // existed): treat everything as seen rather than re-adding what they
        // left out. On an empty list, offer everything.
        const known = new Set(seen ?? (current.length ? ids : []));

        const added: Ref[] = ids
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
          patch.execute([{ set: { [orderField]: [...added, ...kept], [seenField]: ids } }]);
        }
      });

      return () => {
        cancelled = true;
      };
      // Once per open: re-running on every edit would fight a drag in progress.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [client]);

    return props.renderDefault(props);
  };
}
