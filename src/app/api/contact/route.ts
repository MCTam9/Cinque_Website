import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sendContactMessage } from '@/lib/fulfillment/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const contactSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  email: z.string().trim().email('A valid email is required').max(200),
  message: z.string().trim().min(1, 'Message is required').max(5000),
  // Honeypot — must stay empty. Bots fill it; humans never see it.
  company: z.string().optional(),
});

// Best-effort in-memory rate limit (per warm instance). Not a substitute for
// an edge/WAF limiter, but stops trivial floods.
const hits = new Map<string, { count: number; ts: number }>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now - rec.ts > WINDOW_MS) {
    hits.set(ip, { count: 1, ts: now });
    return false;
  }
  rec.count += 1;
  return rec.count > MAX_PER_WINDOW;
}

export async function POST(req: Request) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (rateLimited(ip)) {
    return NextResponse.json(
      { ok: false, error: 'Too many messages. Please try again shortly.' },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request.' }, { status: 400 });
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' },
      { status: 400 }
    );
  }

  // Honeypot tripped — pretend success, send nothing.
  if (parsed.data.company) {
    return NextResponse.json({ ok: true });
  }

  const result = await sendContactMessage({
    name: parsed.data.name,
    email: parsed.data.email,
    message: parsed.data.message,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: 'Could not send your message. Please email cindy@cinque.studio directly.' },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
