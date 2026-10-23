import { NextResponse } from 'next/server';
import { z } from 'zod';
import { bearerToken, isStudioEditor } from '@/lib/adminAuth';
import { rateLimit, clientIp } from '@/lib/rateLimit';
import { Mailbox, inboxConfigured } from '@/lib/inbox/imap';
import { buildIndex } from '@/lib/inbox/threads';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/admin/enquiries — who each tracked enquiry is with, for the
 * Admin's Enquiries tab. The `enquiry` records hold no names (the dataset is
 * public), so this reads them from the mailbox at view time: name, email and
 * subject per thread key. Nothing is stored or logged. Studio editors only,
 * as for /api/admin/customers.
 */

const bodySchema = z.object({ keys: z.array(z.string().regex(/^[a-f0-9]{32}$/)).max(300) });

export interface EnquiryDetails {
  name: string | null;
  email: string | null;
  subject: string;
}

let cache: { at: number; byKey: Record<string, EnquiryDetails> } | null = null;

async function allDetails(): Promise<Record<string, EnquiryDetails>> {
  if (cache && Date.now() - cache.at < 2 * 60_000) return cache.byKey;
  const byKey = await Mailbox.with(async (mb) => {
    const idx = await buildIndex(mb);
    return Object.fromEntries(
      idx.threads.map((t) => [
        t.key,
        {
          name: t.customer?.name || null,
          email: t.customer?.address || null,
          subject: (t.inbound[0] ?? t.messages[0])?.subject ?? '',
        },
      ])
    );
  });
  cache = { at: Date.now(), byKey };
  return byKey;
}

export async function POST(req: Request) {
  if (rateLimit(`admin-enquiries:${clientIp(req)}`, { windowMs: 60_000, max: 20 })) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }
  const token = bearerToken(req);
  if (!token || !(await isStudioEditor(token))) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }
  if (!inboxConfigured()) {
    return NextResponse.json({ error: 'The inbox is not connected.' }, { status: 503 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  try {
    const all = await allDetails();
    const details = Object.fromEntries(
      parsed.data.keys.filter((k) => all[k]).map((k) => [k, all[k]])
    );
    return NextResponse.json({ details }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[admin/enquiries]', err);
    return NextResponse.json({ error: 'Could not read the inbox.' }, { status: 502 });
  }
}
