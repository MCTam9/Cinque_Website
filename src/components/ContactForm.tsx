'use client';

import { useState } from 'react';
import { P2 } from '@/components/typography';

type Status = 'idle' | 'sending' | 'sent' | 'error';

/** Public contact form → POST /api/contact → Resend → cindy@cinque.studio. */
export default function ContactForm() {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string>('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('sending');
    setError('');

    const form = e.currentTarget;
    const data = new FormData(form);
    const payload = {
      name: String(data.get('name') ?? ''),
      email: String(data.get('email') ?? ''),
      message: String(data.get('message') ?? ''),
      company: String(data.get('company') ?? ''), // honeypot
    };

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setStatus('error');
        setError(json.error ?? 'Something went wrong.');
        return;
      }
      setStatus('sent');
      form.reset();
    } catch {
      setStatus('error');
      setError('Network error. Please try again.');
    }
  }

  if (status === 'sent') {
    return (
      <P2 className="text-graphite">
        Thank you — your message has been sent. We aim to respond within 2–3 working days.
      </P2>
    );
  }

  const field = 'w-full border border-oslo bg-cararra px-3 py-2 type-p1 outline-none focus:border-graphite';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {/* Honeypot: visually hidden, off the tab order */}
      <div aria-hidden className="hidden">
        <label>
          Company
          <input type="text" name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="type-p2 text-oslo">Name*</span>
        <input type="text" name="name" required maxLength={120} className={field} />
      </label>

      <label className="flex flex-col gap-1">
        <span className="type-p2 text-oslo">Email*</span>
        <input type="email" name="email" required maxLength={200} className={field} />
      </label>

      <label className="flex flex-col gap-1">
        <span className="type-p2 text-oslo">Message*</span>
        <textarea name="message" required maxLength={5000} rows={5} className={field} />
      </label>

      {status === 'error' && <P2 className="text-redcurrent">{error}</P2>}

      <button
        type="submit"
        disabled={status === 'sending'}
        className="type-p1 min-h-[48px] self-start bg-graphite px-8 text-cararra transition-colors hover:bg-redcurrent disabled:bg-oslo"
      >
        {status === 'sending' ? 'Sending…' : 'Submit'}
      </button>
    </form>
  );
}
