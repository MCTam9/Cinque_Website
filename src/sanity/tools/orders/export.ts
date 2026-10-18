/**
 * Export for the Admin's Orders table: a CSV that opens in Excel or Numbers,
 * and a print view (choose "Save as PDF" to keep one). Both take exactly the
 * rows on screen, so the current tab and search decide what goes out.
 *
 * Customer details are joined in from what the table already read from
 * Stripe; nothing new is fetched and nothing leaves the browser except the
 * file the user saves.
 */

import { carrierLabel, trackingUrl } from '@/lib/fulfillment/tracking';
import {
  KIND_TITLE,
  TABS,
  lineExtras,
  money,
  statusText,
  when,
  type Customer,
  type Row,
  type TabId,
} from './data';

export type Customers = Record<string, Customer>;

const CSV_HEADERS = [
  'Date',
  'Type',
  'Order',
  'Status',
  'Name',
  'Email',
  'Phone',
  'Address',
  'Country',
  'Shipping service',
  'Item',
  'SKU',
  'Qty',
  'Size',
  'Larger size',
  'Engraving',
  'Notes',
  'Made to order',
  'Order total (£)',
  'Carrier',
  'Tracking number',
  'Tracking link',
];

/** "2026-10-16 09:54" in UK time: sorts as text and Excel reads it as a date. */
function stamp(iso?: string): string {
  if (!iso) return '';
  return new Date(iso)
    .toLocaleString('sv-SE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/London',
    })
    .replace(',', '');
}

function today(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/London' });
}

/**
 * One CSV cell. Text the customer typed (engraving, notes, address) could
 * start with a formula character, which Excel would run on open; a leading
 * apostrophe keeps it as text. Then RFC 4180 quoting.
 */
export function csvCell(value: string | number | undefined | null): string {
  let s = value == null ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function addressLine(c?: Customer): string {
  const a = c?.address;
  return a ? [a.line1, a.line2, a.city, a.postalCode].filter(Boolean).join(', ') : '';
}

function notesFor(row: Row, lineNotes?: string): string {
  return [lineNotes, row.internalNotes && `Internal: ${row.internalNotes}`]
    .filter(Boolean)
    .join('\n');
}

/** One row per item, with the order's columns repeated on each. */
export function ordersCsv(rows: Row[], customers: Customers): string {
  const out = [CSV_HEADERS];
  for (const row of rows) {
    const c = row.sessionId ? customers[row.sessionId] : undefined;
    const extras = lineExtras(row, c);
    const order = [
      stamp(row.date),
      KIND_TITLE[row.kind],
      row.orderNumber ?? '',
      statusText(row),
      c?.name ?? '',
      c?.email ?? '',
      c?.phone ?? '',
      addressLine(c),
      c?.address?.country ?? row.country ?? '',
      c?.shippingService ?? '',
    ];
    // A plain number on the order's first item only, so the column sums in Excel.
    const total = typeof row.totalGBP === 'number' ? (row.totalGBP / 100).toFixed(2) : '';
    const tail = [
      carrierLabel(row.carrier),
      row.tracking ?? '',
      trackingUrl(row.carrier, row.tracking) ?? '',
    ];
    const lines = row.lines.length ? row.lines : [undefined];
    lines.forEach((l, i) => {
      out.push([
        ...order,
        l?.title ?? '',
        l?.sku ?? '',
        l ? String(l.quantity) : '',
        l?.size ?? '',
        l?.largerSize ? 'Yes' : '',
        extras[i]?.engraving ?? '',
        notesFor(row, extras[i]?.notes),
        l?.madeToOrder ? 'Yes' : '',
        i === 0 ? total : '',
        ...tail,
      ]);
    });
  }
  return out.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

/** Download the rows as cinque-orders-<tab>-<date>.csv. */
export function downloadCsv(rows: Row[], customers: Customers, tab: TabId): void {
  // The BOM tells Excel it is UTF-8, so £ and ¾ come through intact.
  const blob = new Blob(['﻿', ordersCsv(rows, customers)], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cinque-orders-${tab}-${today()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value: string | number | undefined | null): string {
  return (value == null ? '' : String(value)).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

/** Escaped text lines joined with <br>, empty ones dropped. */
function cellHtml(...parts: (string | false | null | undefined)[]): string {
  return parts
    .filter((p): p is string => Boolean(p))
    .map((p) => escapeHtml(p).replace(/\r?\n/g, '<br>'))
    .join('<br>');
}

/** The print view: one row per order, every value HTML-escaped. */
export function ordersPrintHtml(rows: Row[], customers: Customers, tab: TabId): string {
  const tabTitle = TABS.find((t) => t.id === tab)?.title ?? '';
  const body = rows
    .map((row) => {
      const c = row.sessionId ? customers[row.sessionId] : undefined;
      const extras = lineExtras(row, c);
      const items = row.lines
        .map((l, i) => {
          const detail = [
            l.sku,
            l.size && `Size ${l.size}`,
            l.largerSize && 'larger size',
            extras[i]?.engraving && `Engraved “${extras[i].engraving}”`,
            l.madeToOrder && 'Made to order',
          ]
            .filter(Boolean)
            .join(' / ');
          return `<div class="item">${cellHtml(
            `${l.quantity > 1 ? `${l.quantity} × ` : ''}${l.title}`
          )}${detail ? `<div class="muted">${cellHtml(detail)}</div>` : ''}</div>`;
        })
        .join('');
      const notes = row.lines
        .map((l, i) =>
          extras[i]?.notes
            ? cellHtml(`${row.lines.length > 1 ? `${l.title}: ` : ''}${extras[i].notes}`)
            : ''
        )
        .filter(Boolean);
      if (row.internalNotes) notes.push(cellHtml(`Internal: ${row.internalNotes}`));
      const country = c?.address?.country ?? row.country;
      return `<tr>
<td class="nowrap">${cellHtml(when(row.date))}</td>
<td>${cellHtml(row.orderNumber ?? '—', KIND_TITLE[row.kind])}</td>
<td>${cellHtml(c?.name, c?.email, c?.phone)}</td>
<td>${cellHtml(addressLine(c), [country, c?.shippingService].filter(Boolean).join(' · '))}</td>
<td>${items}</td>
<td>${notes.join('<br>')}</td>
<td class="nowrap">${cellHtml(money(row.totalGBP))}</td>
<td>${cellHtml(statusText(row))}</td>
<td>${cellHtml(
        carrierLabel(row.carrier),
        row.tracking,
        row.shippedAt && `Shipped ${when(row.shippedAt)}`
      )}</td>
</tr>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8">
<title>${escapeHtml(`Cinque orders – ${tabTitle} – ${today()}`)}</title>
<style>
@page { size: A4 landscape; margin: 12mm; }
* { box-sizing: border-box; }
body { font: 9pt/1.35 -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif; color: #111; margin: 0; }
h1 { font-size: 12pt; margin: 0 0 8px; }
table { width: 100%; border-collapse: collapse; }
th, td { text-align: left; vertical-align: top; padding: 5px 6px; border-bottom: 1px solid #ccc; }
th { font-weight: 600; border-bottom: 1.5px solid #111; }
thead { display: table-header-group; }
tr { page-break-inside: avoid; break-inside: avoid; }
.muted { color: #555; }
.item + .item { margin-top: 4px; }
.nowrap { white-space: nowrap; }
</style></head><body>
<h1>${escapeHtml(`Cinque orders – ${tabTitle} (${rows.length}) – ${today()}`)}</h1>
<table>
<thead><tr><th>Date</th><th>Order</th><th>Customer</th><th>Ship to</th><th>Items</th><th>Notes</th><th>Total</th><th>Status</th><th>Tracking</th></tr></thead>
<tbody>
${body}
</tbody>
</table>
</body></html>`;
}

/**
 * Print the rows from a hidden iframe. Its document is written in place (no
 * src, no script inside it), so the /admin CSP has nothing to block: no frame
 * navigation, and the inline <style> is covered by style-src 'unsafe-inline'.
 */
export function printOrders(rows: Row[], customers: Customers, tab: TabId): void {
  document.getElementById('cinque-orders-print')?.remove();
  const frame = document.createElement('iframe');
  frame.id = 'cinque-orders-print';
  frame.setAttribute('aria-hidden', 'true');
  // Not display:none: some browsers won't print a frame that isn't rendered.
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(frame);
  const win = frame.contentWindow;
  const doc = frame.contentDocument;
  if (!win || !doc) {
    frame.remove();
    return;
  }
  doc.open();
  doc.write(ordersPrintHtml(rows, customers, tab));
  doc.close();
  const cleanup = () => setTimeout(() => frame.remove(), 500);
  win.addEventListener('afterprint', cleanup, { once: true });
  win.focus();
  win.print();
}
