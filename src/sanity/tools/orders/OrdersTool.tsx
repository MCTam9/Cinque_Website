import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useClient, type SanityClient } from 'sanity';
import { IntentLink } from 'sanity/router';
import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Select,
  Spinner,
  Stack,
  Text,
  TextInput,
  useToast,
} from '@sanity/ui';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CopyIcon,
  DocumentPdfIcon,
  DocumentSheetIcon,
  LaunchIcon,
  SearchIcon,
  WarningOutlineIcon,
} from '@sanity/icons';
import { CARRIERS, carrierLabel, trackingUrl } from '@/lib/fulfillment/tracking';
import {
  KIND_TITLE,
  LISTEN_QUERY,
  ORDER_STATUSES,
  TABLE_QUERY,
  TABS,
  inTab,
  lineExtras,
  money,
  pendingStatus,
  toRows,
  when,
  type Customer,
  type OrderStatus,
  type Row,
  type TabId,
  type TableData,
} from './data';
import { downloadCsv, printOrders } from './export';

const API_VERSION = '2024-10-01';
/** The route caps one request at this many sessions. */
const CUSTOMER_BATCH = 150;
const COLUMNS = 11;

const KIND_TONE: Record<Row['kind'], 'default' | 'primary' | 'caution' | 'positive'> = {
  order: 'primary',
  bespokeOrder: 'primary',
  unpaid: 'caution',
  link: 'default',
};

const cell: React.CSSProperties = {
  padding: '10px 8px',
  verticalAlign: 'top',
  borderBottom: '1px solid var(--card-border-color)',
};

function stripeUrl(sessionId: string): string {
  const test = sessionId.startsWith('cs_test_') ? 'test/' : '';
  return `https://dashboard.stripe.com/${test}search?query=${encodeURIComponent(sessionId)}`;
}

/**
 * The Admin's Orders table: every order, unpaid checkout and open bespoke link
 * in one place, refreshed live as they change. Customer names, emails and
 * addresses are read from Stripe when the table opens (/api/admin/customers)
 * and are never saved to Sanity. Status and tracking can be changed in place;
 * marking an order Shipped with tracking still sends the customer their
 * shipping email through the usual Sanity webhook.
 */
export function OrdersTool() {
  const client = useClient({ apiVersion: API_VERSION });
  const reader = useMemo(() => client.withConfig({ perspective: 'published' }), [client]);

  const [data, setData] = useState<TableData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>('toFulfil');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Record<string, Customer>>({});
  const [customerNote, setCustomerNote] = useState<string | null>(null);
  // Sessions Stripe has answered for, found or not: export waits on these.
  const [settled, setSettled] = useState<Record<string, true>>({});
  const requested = useRef(new Set<string>());

  const load = useCallback(async () => {
    try {
      setData(await reader.fetch<TableData>(TABLE_QUERY));
      setLoadError(null);
    } catch {
      setLoadError('Could not load orders. Check your connection and reload.');
    }
  }, [reader]);

  // Live: re-read shortly after anything in the table changes.
  useEffect(() => {
    load();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sub = client
      .listen(LISTEN_QUERY, {}, { visibility: 'query', events: ['mutation'] })
      .subscribe(() => {
        clearTimeout(timer);
        timer = setTimeout(load, 800);
      });
    return () => {
      sub.unsubscribe();
      clearTimeout(timer);
    };
  }, [client, load]);

  const rows = useMemo(() => (data ? toRows(data) : []), [data]);

  // Customer details for any session not fetched yet, in batches.
  useEffect(() => {
    const ids = [
      ...new Set(rows.map((r) => r.sessionId).filter((id): id is string => Boolean(id))),
    ].filter((id) => !requested.current.has(id));
    if (!ids.length) return;
    const token = client.config().token;
    if (!token) {
      setCustomerNote('Log out of the Admin and back in to see customer names and emails.');
      return;
    }
    ids.forEach((id) => requested.current.add(id));
    for (let i = 0; i < ids.length; i += CUSTOMER_BATCH) {
      const batch = ids.slice(i, i + CUSTOMER_BATCH);
      fetch('/api/admin/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sessionIds: batch }),
      })
        .then(async (res) => {
          if (!res.ok) {
            throw new Error(
              res.status === 401
                ? 'Customer details are only shown to Admin administrators and editors.'
                : 'Could not load customer details from Stripe.'
            );
          }
          return (await res.json()) as { customers: Record<string, Customer> };
        })
        .then(({ customers: found }) => {
          setCustomers((prev) => ({ ...prev, ...found }));
          setSettled((prev) => ({ ...prev, ...Object.fromEntries(batch.map((id) => [id, true])) }));
          setCustomerNote(null);
        })
        .catch((err: Error) => {
          batch.forEach((id) => requested.current.delete(id));
          setCustomerNote(err.message);
        });
    }
  }, [rows, client]);

  const counts = useMemo(
    () => Object.fromEntries(TABS.map((t) => [t.id, rows.filter((r) => inTab(r, t.id)).length])),
    [rows]
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (!inTab(row, tab)) return false;
      if (!q) return true;
      const c = row.sessionId ? customers[row.sessionId] : undefined;
      const extras = lineExtras(row, c);
      const haystack = [
        row.orderNumber,
        c?.name,
        c?.email,
        row.details,
        row.internalNotes,
        ...row.lines.flatMap((l) => [l.title, l.sku, l.size]),
        ...extras.flatMap((e) => [e.engraving, e.notes]),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, tab, search, customers]);

  // Exports always carry contact details, so they wait until every visible
  // row's customer has come back from Stripe.
  const exportReady =
    visible.length > 0 && visible.every((r) => !r.sessionId || settled[r.sessionId]);
  const exportTitle = !visible.length
    ? 'Nothing to export'
    : exportReady
      ? `Export the ${visible.length} rows shown`
      : 'Waiting for customer details from Stripe…';

  return (
    <Card height="fill" overflow="auto" padding={4}>
      <Stack space={4}>
        <Flex align="center" gap={3} wrap="wrap">
          <Text size={3} weight="semibold">
            Orders
          </Text>
          <Box flex={1} />
          <Box style={{ minWidth: 260 }}>
            <TextInput
              icon={SearchIcon}
              placeholder="Search order, product, size, customer…"
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              fontSize={1}
            />
          </Box>
          <Button
            mode="ghost"
            fontSize={1}
            padding={2}
            icon={DocumentSheetIcon}
            text="Excel"
            title={exportTitle}
            disabled={!exportReady}
            onClick={() => downloadCsv(visible, customers, tab)}
          />
          <Button
            mode="ghost"
            fontSize={1}
            padding={2}
            icon={DocumentPdfIcon}
            text="Print / PDF"
            title={exportTitle}
            disabled={!exportReady}
            onClick={() => printOrders(visible, customers, tab)}
          />
        </Flex>

        <Flex gap={2} wrap="wrap">
          {TABS.map((t) => (
            <Button
              key={t.id}
              mode={tab === t.id ? 'default' : 'ghost'}
              tone={tab === t.id ? 'primary' : 'default'}
              fontSize={1}
              padding={2}
              text={`${t.title} (${counts[t.id] ?? 0})`}
              onClick={() => setTab(t.id)}
            />
          ))}
        </Flex>

        {customerNote && (
          <Card padding={3} radius={2} tone="caution" border>
            <Text size={1}>{customerNote}</Text>
          </Card>
        )}
        {loadError && (
          <Card padding={3} radius={2} tone="critical" border>
            <Text size={1}>{loadError}</Text>
          </Card>
        )}

        {!data && !loadError ? (
          <Flex justify="center" padding={5}>
            <Spinner muted />
          </Flex>
        ) : visible.length === 0 ? (
          <Card padding={4} radius={2} border>
            <Text size={1} muted>
              Nothing here{search ? ' matching your search' : ''}.
            </Text>
          </Card>
        ) : (
          <Card radius={2} border overflow="auto">
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
              <thead>
                <tr>
                  {['', 'Date', 'Type', 'Order', 'Customer', 'Items', 'Notes', 'Total', 'Status', 'Tracking', ''].map(
                    (h, i) => (
                      <th key={i} style={{ ...cell, textAlign: 'left' }}>
                        <Text size={1} weight="semibold" muted>
                          {h}
                        </Text>
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <TableRow
                    key={row.id}
                    row={row}
                    customer={row.sessionId ? customers[row.sessionId] : undefined}
                    customersLoading={Boolean(
                      row.sessionId && !customers[row.sessionId] && !customerNote
                    )}
                    expanded={expanded === row.id}
                    onToggle={() => setExpanded((cur) => (cur === row.id ? null : row.id))}
                    client={client}
                  />
                ))}
              </tbody>
            </table>
          </Card>
        )}
        <Text size={0} muted>
          Shows the latest 150 of each kind. Customer details come from Stripe and are not stored
          in the Admin.
        </Text>
      </Stack>
    </Card>
  );
}

function TableRow({
  row,
  customer,
  customersLoading,
  expanded,
  onToggle,
  client,
}: {
  row: Row;
  customer?: Customer;
  customersLoading: boolean;
  expanded: boolean;
  onToggle: () => void;
  client: SanityClient;
}) {
  const kind = { title: KIND_TITLE[row.kind], tone: KIND_TONE[row.kind] };
  const extras = lineExtras(row, customer);
  const country = customer?.address?.country ?? row.country;
  const isOrder = row.kind === 'order' || row.kind === 'bespokeOrder';

  return (
    <Fragment>
      <tr>
        <td style={{ ...cell, width: 28 }}>
          <Button
            mode="bleed"
            padding={1}
            icon={expanded ? ChevronDownIcon : ChevronRightIcon}
            onClick={onToggle}
            aria-label={expanded ? 'Hide details' : 'Show details'}
          />
        </td>
        <td style={{ ...cell, whiteSpace: 'nowrap' }}>
          <Text size={1}>{when(row.date)}</Text>
        </td>
        <td style={cell}>
          <Badge tone={kind.tone} fontSize={0}>
            {kind.title}
          </Badge>
        </td>
        <td style={{ ...cell, whiteSpace: 'nowrap' }}>
          <Flex align="center" gap={1}>
            <Text size={1} weight="medium">
              {row.orderNumber ?? '—'}
            </Text>
            {row.addressWarning && (
              <Text size={1} title={row.addressWarning}>
                <WarningOutlineIcon style={{ color: 'var(--card-badge-caution-icon-color, #c98a00)' }} />
              </Text>
            )}
          </Flex>
        </td>
        <td style={cell}>
          <Stack space={2}>
            {row.kind === 'link' ? (
              <Text size={1} muted>
                Not paid yet
              </Text>
            ) : customer ? (
              <>
                <Text size={1} weight="medium">
                  {customer.name ?? '—'}
                </Text>
                <Text size={1} muted>
                  {[customer.email, country, customer.shippingService].filter(Boolean).join(' / ')}
                </Text>
              </>
            ) : customersLoading ? (
              <Spinner muted />
            ) : (
              <Text size={1} muted>
                {country ?? '—'}
              </Text>
            )}
          </Stack>
        </td>
        <td style={cell}>
          <Stack space={3}>
            {row.lines.map((l, i) => {
              const detail = [
                l.size && `Size ${l.size}`,
                l.largerSize && 'larger size',
                extras[i]?.engraving && `Engraved “${extras[i].engraving}”`,
              ].filter(Boolean);
              return (
                <Stack key={l.key} space={2}>
                  <Text size={1}>
                    {l.quantity > 1 ? `${l.quantity} × ` : ''}
                    {l.title}
                  </Text>
                  {detail.length > 0 && (
                    <Text size={1} muted>
                      {detail.join(' / ')}
                    </Text>
                  )}
                  {l.madeToOrder && (
                    <Box>
                      <Badge tone="caution" fontSize={0}>
                        Made to order
                      </Badge>
                    </Box>
                  )}
                </Stack>
              );
            })}
          </Stack>
        </td>
        <td style={{ ...cell, maxWidth: 240 }}>
          <Stack space={2}>
            {extras.map((e, i) =>
              e.notes ? (
                <Text key={i} size={1} style={{ whiteSpace: 'pre-line' }}>
                  {row.lines.length > 1 ? `${row.lines[i].title}: ` : ''}
                  {e.notes}
                </Text>
              ) : null
            )}
            {row.internalNotes && (
              <Text size={1} muted style={{ whiteSpace: 'pre-line' }}>
                Internal: {row.internalNotes}
              </Text>
            )}
            {!extras.some((e) => e.notes) && !row.internalNotes && (
              <Text size={1} muted>
                —
              </Text>
            )}
          </Stack>
        </td>
        <td style={{ ...cell, whiteSpace: 'nowrap' }}>
          <Text size={1}>{money(row.totalGBP)}</Text>
        </td>
        {isOrder ? (
          <OrderEditor row={row} client={client} />
        ) : (
          <>
            <td style={cell}>
              <UnpaidOrLinkStatus row={row} />
            </td>
            <td style={cell}>
              {row.kind === 'link' && row.paymentLinkUrl ? (
                <CopyLinkButton url={row.paymentLinkUrl} />
              ) : (
                <Text size={1} muted>
                  —
                </Text>
              )}
            </td>
          </>
        )}
        <td style={{ ...cell, whiteSpace: 'nowrap' }}>
          <Flex gap={2}>
            <IntentLink
              intent="edit"
              params={{ id: row.id, type: row.docType }}
              style={{ textDecoration: 'none' }}
            >
              <Button as="span" mode="ghost" fontSize={1} padding={2} text="Open" />
            </IntentLink>
            {row.sessionId && (
              <Button
                as="a"
                href={stripeUrl(row.sessionId)}
                target="_blank"
                rel="noopener noreferrer"
                mode="ghost"
                fontSize={1}
                padding={2}
                icon={LaunchIcon}
                text="Stripe"
              />
            )}
          </Flex>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td style={cell} />
          <td colSpan={COLUMNS - 1} style={cell}>
            <Details row={row} customer={customer} />
          </td>
        </tr>
      )}
    </Fragment>
  );
}

function Details({ row, customer }: { row: Row; customer?: Customer }) {
  const a = customer?.address;
  const address = a
    ? [a.line1, a.line2, a.city, a.postalCode, a.country].filter(Boolean).join(', ')
    : null;
  return (
    <Stack space={3}>
      {row.kind !== 'link' && (
        <>
          <Text size={1}>
            <strong>Ship to:</strong> {address ?? (customer ? 'No address entered yet' : '—')}
          </Text>
          <Text size={1}>
            <strong>Phone:</strong> {customer?.phone ?? '—'}
          </Text>
        </>
      )}
      {row.details && (
        <Text size={1} style={{ whiteSpace: 'pre-line' }}>
          <strong>Details:</strong> {row.details}
        </Text>
      )}
      {row.addressWarning && (
        <Text size={1}>
          <strong>Check the address:</strong> {row.addressWarning}
        </Text>
      )}
      {row.emailedAt && (
        <Text size={1} muted>
          Shipping email sent {when(row.emailedAt)}
        </Text>
      )}
      {row.kind === 'unpaid' && (
        <Text size={1} muted>
          Value shown is before shipping.
        </Text>
      )}
      {row.kind === 'link' && row.paymentLinkUrl && (
        <Text size={1}>
          <strong>Payment link:</strong> {row.paymentLinkUrl}
        </Text>
      )}
    </Stack>
  );
}

function UnpaidOrLinkStatus({ row }: { row: Row }) {
  const { title, tone } = pendingStatus(row);
  return (
    <Badge tone={tone} fontSize={0}>
      {title}
    </Badge>
  );
}

function CopyLinkButton({ url }: { url: string }) {
  const toast = useToast();
  return (
    <Button
      mode="ghost"
      fontSize={1}
      padding={2}
      icon={CopyIcon}
      text="Copy link"
      onClick={() =>
        navigator.clipboard
          .writeText(url)
          .then(() => toast.push({ status: 'success', title: 'Payment link copied' }))
          .catch(() => toast.push({ status: 'error', title: 'Could not copy the link' }))
      }
    />
  );
}

/** Status + carrier + tracking for one order, saved in a single patch. */
function OrderEditor({ row, client }: { row: Row; client: SanityClient }) {
  const toast = useToast();
  const initial = {
    status: (row.status ?? 'paid') as OrderStatus,
    carrier: row.carrier ?? '',
    tracking: row.tracking ?? '',
  };
  const [status, setStatus] = useState<OrderStatus>(initial.status);
  const [carrier, setCarrier] = useState(initial.carrier);
  const [tracking, setTracking] = useState(initial.tracking);
  const [saving, setSaving] = useState(false);
  const savedTrackingUrl = trackingUrl(row.carrier, row.tracking);
  // A carrier typed before the dropdown existed stays selectable as-is.
  const legacyCarrier =
    initial.carrier && !CARRIERS.some((c) => c.value === initial.carrier) ? initial.carrier : null;

  // Pick up changes made elsewhere (another tab, the order form).
  useEffect(() => {
    setStatus(initial.status);
    setCarrier(initial.carrier);
    setTracking(initial.tracking);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.status, row.carrier, row.tracking]);

  const dirty =
    status !== initial.status ||
    carrier.trim() !== initial.carrier ||
    tracking.trim() !== initial.tracking;

  const save = async () => {
    setSaving(true);
    const c = carrier.trim();
    const t = tracking.trim();
    try {
      let patch = client.patch(row.id).setIfMissing({ fulfillment: {} }).set({ status });
      patch = c ? patch.set({ 'fulfillment.carrier': c }) : patch.unset(['fulfillment.carrier']);
      patch = t
        ? patch.set({ 'fulfillment.trackingNumber': t })
        : patch.unset(['fulfillment.trackingNumber']);
      if (status === 'shipped' && !row.shippedAt) {
        patch = patch.set({ 'fulfillment.shippedAt': new Date().toISOString() });
      }
      await patch.commit();
      const emailNote =
        status === 'shipped' && !row.emailedAt
          ? t
            ? ' The customer will be emailed their tracking details.'
            : ' Add tracking to email the customer.'
          : '';
      toast.push({
        status: 'success',
        title: `Order ${row.orderNumber ?? ''} saved`,
        description: emailNote || undefined,
      });
    } catch {
      toast.push({ status: 'error', title: 'Could not save the order' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <td style={cell}>
        <Select
          fontSize={1}
          padding={2}
          value={status}
          onChange={(e) => setStatus(e.currentTarget.value as OrderStatus)}
        >
          {ORDER_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.title}
            </option>
          ))}
        </Select>
        {status === 'shipped' && !tracking.trim() && !row.emailedAt && (
          <Box marginTop={2}>
            <Text size={0} muted>
              Add tracking to email the customer
            </Text>
          </Box>
        )}
      </td>
      <td style={{ ...cell, minWidth: 190 }}>
        <Stack space={2}>
          <Select
            fontSize={1}
            padding={2}
            value={carrier}
            onChange={(e) => setCarrier(e.currentTarget.value)}
          >
            <option value="">Carrier…</option>
            {CARRIERS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.title}
              </option>
            ))}
            {legacyCarrier && (
              <option value={legacyCarrier}>{carrierLabel(legacyCarrier)} (as typed)</option>
            )}
          </Select>
          <TextInput
            fontSize={1}
            padding={2}
            placeholder="Tracking number"
            value={tracking}
            onChange={(e) => setTracking(e.currentTarget.value)}
          />
          {row.tracking && savedTrackingUrl && (
            <Text size={1}>
              <a href={savedTrackingUrl} target="_blank" rel="noopener noreferrer">
                Track {row.tracking}
              </a>
            </Text>
          )}
          {row.shippedAt && (
            <Text size={0} muted>
              Shipped {when(row.shippedAt)}
            </Text>
          )}
          {dirty && (
            <Button
              tone="primary"
              fontSize={1}
              padding={2}
              text={saving ? 'Saving…' : 'Save'}
              disabled={saving}
              onClick={save}
            />
          )}
        </Stack>
      </td>
    </>
  );
}
