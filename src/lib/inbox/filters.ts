import 'server-only';
import type { Address, IndexedMessage } from './imap';

/**
 * Which inbox messages are a person writing to the studio, and who that
 * person is. Deliberately cautious: anything automated is left alone, and the
 * agent makes the final "is this a customer?" call on what remains.
 */

/** Services that email the studio and never need a reply. */
const AUTOMATED_DOMAINS = [
  'stripe.com',
  'postmarkapp.com',
  'vercel.com',
  'sanity.io',
  'github.com',
  'apple.com',
  'google.com',
  'instagram.com',
  'facebookmail.com',
  'meta.com',
  'royalmail.com',
  'parcelforce.com',
  'dhl.com',
  'ups.com',
  'fedex.com',
  'klarna.com',
  'paypal.com',
  'shopify.com',
  'mailchimp.com',
  'squarespace.com',
];

const AUTOMATED_LOCAL =
  /^(no-?reply|do-?not-?reply|mailer-daemon|postmaster|bounces?|notifications?|alerts?|newsletter|news|marketing|info-noreply)([+.-]|$)/i;

const domainOf = (address?: string) => address?.split('@')[1]?.toLowerCase() ?? '';

const ownDomain = (own: string) => domainOf(own);

function isAutomatedDomain(domain: string): boolean {
  return AUTOMATED_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`));
}

/** Bulk, list or auto-generated mail, by its headers or sender. */
export function isAutomated(m: IndexedMessage): boolean {
  const h = m.headers;
  if (h['list-unsubscribe'] || h['list-id']) return true;
  if (h['auto-submitted'] && h['auto-submitted'].toLowerCase() !== 'no') return true;
  if (/^(bulk|list|junk|auto_reply)$/i.test(h.precedence ?? '')) return true;
  if (h['x-auto-response-suppress']) return true;
  const from = m.from?.address ?? '';
  if (AUTOMATED_LOCAL.test(from.split('@')[0] ?? '')) return true;
  return isAutomatedDomain(domainOf(from));
}

/**
 * The person to reply to, or null when there isn't one. Mail from the
 * studio's own address is the website's contact form (sent through Postmark
 * with the visitor as Reply-To); anything else from the studio is internal.
 */
export function customerOf(m: IndexedMessage, ownAddress: string): Address | null {
  const own = ownDomain(ownAddress);
  const from = m.from;
  if (!from?.address) return null;
  if (domainOf(from.address) === own) {
    const rt = m.replyTo;
    if (rt?.address && domainOf(rt.address) !== own && !isAutomatedDomain(domainOf(rt.address))) {
      return rt;
    }
    return null;
  }
  return from;
}

/** Contact-form mail (studio → studio, visitor as Reply-To). */
export function isContactForm(m: IndexedMessage, ownAddress: string): boolean {
  return domainOf(m.from?.address) === ownDomain(ownAddress) && Boolean(customerOf(m, ownAddress));
}
