import 'server-only';
import { randomUUID } from 'node:crypto';
import type { Address } from './imap';

/**
 * Text handling for the inbox agent: trimming emails down to what was newly
 * written, and building the draft that goes into Drafts.
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

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** A web address, less any closing punctuation after it. */
const URL_RE = /https?:\/\/[^\s<>"]*[^\s<>".,;:!?)\]'’]/g;

/** One line as HTML: escaped (so "<a@b.com>" stays visible), web addresses linked. */
function inlineHtml(line: string): string {
  let out = '';
  let at = 0;
  for (const m of line.matchAll(URL_RE)) {
    const url = escapeHtml(m[0]);
    out += `${escapeHtml(line.slice(at, m.index))}<a href="${url}">${url}</a>`;
    at = m.index + m[0].length;
  }
  return out + escapeHtml(line.slice(at));
}

const QUOTE_STYLE = 'margin:0 0 0 0.8ex;border-left:1px solid #ccc;padding-left:1ex';

/**
 * The draft as HTML: blank-line paragraphs, line breaks kept, and "> " lines
 * as (nested) blockquotes. Outlook for iOS edits every draft as HTML and
 * reads a plain-text one without its line breaks, running it together into
 * one paragraph with the "> " left in and "<address>"es swallowed as tags.
 */
export function draftHtml(text: string): string {
  let html = '';
  let depth = 0;
  let para: string[] = [];
  const flush = () => {
    if (para.length) html += `<p>${para.join('<br>')}</p>`;
    para = [];
  };
  for (const raw of text.replace(/\r\n?/g, '\n').split('\n')) {
    const [, marks, line] = /^((?:>[ \t]?)*)(.*)$/.exec(raw)!;
    const level = (marks.match(/>/g) ?? []).length;
    if (level !== depth) {
      flush();
      for (; depth < level; depth++) html += `<blockquote style="${QUOTE_STYLE}">`;
      for (; depth > level; depth--) html += '</blockquote>';
    }
    if (line.trim()) para.push(inlineHtml(line));
    else flush();
  }
  flush();
  html += '</blockquote>'.repeat(depth);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`;
}

/** A MIME part's body as base64, in 76-character lines. */
const base64Body = (text: string) =>
  Buffer.from(text, 'utf8')
    .toString('base64')
    .replace(/.{76}/g, '$&\r\n');

/**
 * A draft threaded under `inReplyTo`, as plain text with an HTML alternative
 * (see draftHtml). The plain text is what the agent reads back and seals.
 */
export function draftMime(args: {
  from: Address;
  to: Address;
  subject: string;
  body: string;
  inReplyTo?: string;
  references?: string[];
  /** The agent's seal (see sealDraft), so it can later replace this draft and nothing else. */
  seal?: string;
}): string {
  const domain = (args.from.address ?? 'localhost').split('@')[1] ?? 'localhost';
  const refs = (args.references ?? []).filter((r) => /^<[^<>\s]+>$/.test(r)).slice(-20);
  const inReplyTo = args.inReplyTo && /^<[^<>\s]+>$/.test(args.inReplyTo) ? args.inReplyTo : null;
  const boundary = `cinque-${randomUUID()}`;
  return [
    `From: ${addressHeader(args.from)}`,
    `To: ${addressHeader(args.to)}`,
    `Subject: ${headerValue(args.subject)}`,
    `Date: ${new Date().toUTCString().replace('GMT', '+0000')}`,
    `Message-ID: <${randomUUID()}@${domain}>`,
    ...(inReplyTo ? [`In-Reply-To: ${inReplyTo}`] : []),
    ...(refs.length ? [`References: ${refs.join(' ')}`] : []),
    ...(args.seal && /^v1\.[A-Za-z0-9_-]+$/.test(args.seal)
      ? [`X-Cinque-Agent-Draft: ${args.seal}`]
      : []),
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    base64Body(args.body.replace(/\r?\n/g, '\r\n')),
    `--${boundary}`,
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    base64Body(draftHtml(args.body)),
    `--${boundary}--`,
    '',
  ].join('\r\n');
}
