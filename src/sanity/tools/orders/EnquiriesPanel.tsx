import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SanityClient } from 'sanity';
import { Badge, Box, Button, Card, Flex, Spinner, Stack, Text, useToast } from '@sanity/ui';
import {
  ENQUIRY_STATUSES,
  ENQUIRY_TOPICS,
  FOLLOW_UP_REASONS,
} from '@/sanity/schemaTypes/documents/enquiry';
import { when } from './data';

/**
 * The Enquiries tab: conversations the inbox agent is keeping track of, so
 * the studio can see who's waiting on whom and when a follow-up is due. The
 * records hold no names; those are read from the mailbox when the tab opens
 * (/api/admin/enquiries). Close stops follow-ups; Snooze pushes one a week.
 */

interface EnquiryRow {
  _id: string;
  status?: string;
  topic?: string;
  firstAt?: string;
  lastCustomerAt?: string;
  lastReplyAt?: string;
  followUpOn?: string;
  followUpReason?: string;
  note?: string;
  followUps?: number;
}

interface Details {
  name: string | null;
  email: string | null;
  subject: string;
}

const QUERY = `*[_type == "enquiry" && _id in path("enquiry.**") && status != "ignored"]
  | order(coalesce(lastCustomerAt, firstAt) desc)[0...300]{
    _id, status, topic, firstAt, lastCustomerAt, lastReplyAt, followUpOn, followUpReason, note, followUps
  }`;

const FILTERS = [
  { id: 'active', title: 'Active', statuses: ['open', 'awaitingCustomer'] },
  { id: 'ordered', title: 'Ordered', statuses: ['ordered'] },
  { id: 'closed', title: 'Closed', statuses: ['closed'] },
] as const;

const STATUS_TONE: Record<string, 'default' | 'primary' | 'caution' | 'positive'> = {
  open: 'caution',
  awaitingCustomer: 'primary',
  ordered: 'positive',
  closed: 'default',
};

const title = (list: { title: string; value: string }[], v?: string) =>
  list.find((x) => x.value === v)?.title ?? v ?? '—';

const cell: React.CSSProperties = {
  padding: '10px 8px',
  verticalAlign: 'top',
  borderBottom: '1px solid var(--card-border-color)',
};

const inDays = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toLocaleDateString('sv-SE', {
    timeZone: 'Europe/London',
  });

export function EnquiriesPanel({ client }: { client: SanityClient }) {
  const toast = useToast();
  const [rows, setRows] = useState<EnquiryRow[] | null>(null);
  const [details, setDetails] = useState<Record<string, Details>>({});
  const [note, setNote] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('active');

  const load = useCallback(async () => {
    setRows(await client.fetch<EnquiryRow[]>(QUERY));
  }, [client]);

  useEffect(() => {
    load().catch(() => setNote('Could not load enquiries.'));
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sub = client
      .listen(`*[_type == "enquiry"]`, {}, { visibility: 'query', events: ['mutation'] })
      .subscribe(() => {
        clearTimeout(timer);
        timer = setTimeout(() => load().catch(() => undefined), 800);
      });
    return () => {
      sub.unsubscribe();
      clearTimeout(timer);
    };
  }, [client, load]);

  // Names and subjects from the mailbox, once per new set of rows.
  const keys = useMemo(() => (rows ?? []).map((r) => r._id.replace(/^enquiry\./, '')), [rows]);
  useEffect(() => {
    const missing = keys.filter((k) => !details[k]);
    if (!missing.length) return;
    const token = client.config().token;
    if (!token) {
      setNote('Log out of the Admin and back in to see who each enquiry is from.');
      return;
    }
    fetch('/api/admin/enquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ keys: missing.slice(0, 300) }),
    })
      .then(async (res) => {
        if (res.status === 503)
          throw new Error('The inbox isn’t connected yet, so names can’t be shown.');
        if (!res.ok) throw new Error('Could not load names from the inbox.');
        return (await res.json()) as { details: Record<string, Details> };
      })
      .then(({ details: found }) => {
        setDetails((prev) => ({ ...prev, ...found }));
        setNote(null);
      })
      .catch((err: Error) => setNote(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys, client]);

  const statuses: readonly string[] = FILTERS.find((f) => f.id === filter)!.statuses;
  const shown = (rows ?? []).filter((r) => statuses.includes(r.status ?? 'open'));
  const count = (id: (typeof FILTERS)[number]['id']) =>
    (rows ?? []).filter((r) =>
      (FILTERS.find((f) => f.id === id)!.statuses as readonly string[]).includes(r.status ?? 'open')
    ).length;

  const patch = async (row: EnquiryRow, set: Record<string, unknown>, done: string) => {
    try {
      await client.patch(row._id).set(set).commit();
      toast.push({ status: 'success', title: done });
    } catch {
      toast.push({ status: 'error', title: 'Could not save. Check your connection.' });
    }
  };

  return (
    <Stack space={4}>
      <Flex gap={2} wrap="wrap">
        {FILTERS.map((f) => (
          <Button
            key={f.id}
            mode={filter === f.id ? 'default' : 'ghost'}
            tone={filter === f.id ? 'primary' : 'default'}
            fontSize={1}
            padding={2}
            text={`${f.title} (${count(f.id)})`}
            onClick={() => setFilter(f.id)}
          />
        ))}
      </Flex>
      {note && (
        <Card padding={3} radius={2} tone="caution" border>
          <Text size={1}>{note}</Text>
        </Card>
      )}
      {!rows ? (
        <Flex justify="center" padding={5}>
          <Spinner muted />
        </Flex>
      ) : shown.length === 0 ? (
        <Card padding={4} radius={2} border>
          <Text size={1} muted>
            No enquiries here yet. The inbox agent adds them as it drafts replies.
          </Text>
        </Card>
      ) : (
        <Card radius={2} border overflow="auto">
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980 }}>
            <thead>
              <tr>
                {[
                  'Customer',
                  'Subject',
                  'Topic',
                  'Status',
                  'They wrote',
                  'We replied',
                  'Follow-up',
                  'Note',
                  '',
                ].map((h) => (
                  <th key={h} style={{ ...cell, textAlign: 'left' }}>
                    <Text size={1} weight="semibold" muted>
                      {h}
                    </Text>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const d = details[r._id.replace(/^enquiry\./, '')];
                return (
                  <tr key={r._id}>
                    <td style={cell}>
                      <Stack space={2}>
                        <Text size={1} weight="medium">
                          {d?.name || d?.email || '…'}
                        </Text>
                        {d?.name && d.email && (
                          <Text size={0} muted>
                            {d.email}
                          </Text>
                        )}
                      </Stack>
                    </td>
                    <td style={{ ...cell, maxWidth: 220 }}>
                      <Text size={1} textOverflow="ellipsis">
                        {d?.subject || '—'}
                      </Text>
                    </td>
                    <td style={cell}>
                      <Text size={1}>{title(ENQUIRY_TOPICS, r.topic)}</Text>
                    </td>
                    <td style={cell}>
                      <Badge tone={STATUS_TONE[r.status ?? 'open'] ?? 'default'} fontSize={0}>
                        {title(ENQUIRY_STATUSES, r.status ?? 'open')}
                      </Badge>
                    </td>
                    <td style={cell}>
                      <Text size={1}>{when(r.lastCustomerAt)}</Text>
                    </td>
                    <td style={cell}>
                      <Text size={1}>{when(r.lastReplyAt)}</Text>
                    </td>
                    <td style={cell}>
                      <Stack space={2}>
                        <Text size={1}>
                          {r.followUpOn
                            ? `${r.followUpOn}${r.followUpReason ? ` · ${title(FOLLOW_UP_REASONS, r.followUpReason)}` : ''}`
                            : r.status === 'awaitingCustomer'
                              ? 'After a week of no reply'
                              : '—'}
                        </Text>
                        {Boolean(r.followUps) && (
                          <Text size={0} muted>
                            {r.followUps} drafted
                          </Text>
                        )}
                      </Stack>
                    </td>
                    <td style={{ ...cell, maxWidth: 200 }}>
                      <Text size={1} muted>
                        {r.note || ''}
                      </Text>
                    </td>
                    <td style={cell}>
                      <Flex gap={2}>
                        {r.status === 'closed' || r.status === 'ordered' ? (
                          <Button
                            mode="ghost"
                            fontSize={1}
                            padding={2}
                            text="Reopen"
                            onClick={() => patch(r, { status: 'awaitingCustomer' }, 'Reopened')}
                          />
                        ) : (
                          <>
                            <Button
                              mode="ghost"
                              fontSize={1}
                              padding={2}
                              text="Snooze 7 days"
                              title="Follow up a week from today instead"
                              onClick={() =>
                                patch(
                                  r,
                                  { followUpOn: inDays(7), followUpReason: 'other' },
                                  'Snoozed for a week'
                                )
                              }
                            />
                            <Button
                              mode="ghost"
                              tone="critical"
                              fontSize={1}
                              padding={2}
                              text="Close"
                              title="No more follow-ups for this enquiry"
                              onClick={() => patch(r, { status: 'closed' }, 'Closed')}
                            />
                          </>
                        )}
                      </Flex>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
      <Box>
        <Text size={0} muted>
          Names and subjects are read from the mailbox when this opens and are not stored in the
          Admin. Drafts are in Mail → Drafts; nothing is sent automatically.
        </Text>
      </Box>
    </Stack>
  );
}
