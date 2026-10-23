import 'server-only';
import { randomUUID } from 'node:crypto';
import type { Address } from './imap';

/**
 * Text handling for the inbox agent: trimming emails down to what was newly
 * written, and building the plain-text draft that goes into Drafts.
 */

/** Cut quoted history ("On … wrote:", Outlook headers, "> " lines) and phone sign-offs. */
export function newText(body: string, max = 8_000): string {
  let text = body.replace(/\r\n/g, '\n');
  const cuts = [
    // Gmail / Apple Mail, sometimes wrapped onto a second line.
    /\n[ \t]*On [^\n]{0,200}(?:\n[^\n]{0,200})?wrote:[ \t]*\n/,
    /\n[ \t]*-{2,}[ \t]*Original Message[ \t]*-{2,}/i,
    // Outlook: a From: line followed shortly by Sent: or Date:.
    /\n[ \t]*From:[^\n]*\n(?:[^\n]*\n){0,3}?[ \t]*(?:Sent|Date):/,
    /\n_{10,}\n/,
  ];
  for (const re of cuts) {
    const m = re.exec(text);
    if (m) text = text.slice(0, m.index);
  }
  text = text
    .split('\n')
    .filter((l) => !/^\s*>/.test(l))
    .join('\n')
    .replace(/\n\s*Sent from my (iPhone|iPad|Android|Samsung)[^\n]*/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text.length > max ? `${text.slice(0, max)}\n[…cut]` : text;
}

const ASCII = /^[\x20-\x7e]*$/;

/** One header line's value: no line breaks, RFC 2047-encoded when not plain ASCII. */
function headerValue(value: string): string {
  const clean = value.replace(/[\r\n]+/g, ' ').trim();
  return ASCII.test(clean) ? clean : `=?UTF-8?B?${Buffer.from(clean, 'utf8').toString('base64')}?=`;
}

function addressHeader(a: Address): string {
  const address = (a.address ?? '').replace(/[\r\n<>",\s]/g, '');
  const name = a.name?.replace(/[\r\n]+/g, ' ').trim();
  if (!name) return address;
  const display = ASCII.test(name) ? `"${name.replace(/["\\]/g, '')}"` : headerValue(name);
  return `${display} <${address}>`;
}

/** "Re: …", without stacking "Re: Re:". */
export function replySubject(subject: string): string {
  const s = subject.replace(/[\r\n]+/g, ' ').trim();
  return /^re:/i.test(s) ? s : `Re: ${s || 'Your message'}`;
}

/** A plain-text draft, threaded under `inReplyTo`. */
export function draftMime(args: {
  from: Address;
  to: Address;
  subject: string;
  body: string;
  inReplyTo?: string;
  references?: string[];
}): string {
  const domain = (args.from.address ?? 'localhost').split('@')[1] ?? 'localhost';
  const refs = (args.references ?? []).filter((r) => /^<[^<>\s]+>$/.test(r)).slice(-20);
  const inReplyTo = args.inReplyTo && /^<[^<>\s]+>$/.test(args.inReplyTo) ? args.inReplyTo : null;
  const body = Buffer.from(args.body.replace(/\r?\n/g, '\r\n'), 'utf8')
    .toString('base64')
    .replace(/.{76}/g, '$&\r\n');
  return [
    `From: ${addressHeader(args.from)}`,
    `To: ${addressHeader(args.to)}`,
    `Subject: ${headerValue(args.subject)}`,
    `Date: ${new Date().toUTCString().replace('GMT', '+0000')}`,
    `Message-ID: <${randomUUID()}@${domain}>`,
    ...(inReplyTo ? [`In-Reply-To: ${inReplyTo}`] : []),
    ...(refs.length ? [`References: ${refs.join(' ')}`] : []),
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    body,
    '',
  ].join('\r\n');
}
