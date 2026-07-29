import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sendContactMessage } from '@/lib/fulfillment/email';
import { rateLimit, clientIp } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const contactSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  email: z.string().trim().email('A valid email is required').max(200),
  phone: z.string().trim().max(40).optional(),
  message: z.string().trim().min(1, 'Message is required').max(5000),
  // Honeypot — must stay empty. Bots fill it; humans never see it.
  company: z.string().optional(),
});

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 5;

export async function POST(req: Request) {
  if (rateLimit(`contact:${clientIp(req)}`, { windowMs: RATE_WINDOW_MS, max: RATE_MAX })) {
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
    phone: parsed.data.phone,
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
