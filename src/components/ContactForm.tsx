'use client';

import { useState } from 'react';

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
      phone: String(data.get('phone') ?? ''),
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

  // Underline-style inputs (bottom border only), matching the Figma Contact form.
  const field =
    'w-full border-0 border-b border-oslo bg-transparent px-0 py-2 type-p1 outline-none focus:border-graphite';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Honeypot: visually hidden, off the tab order */}
      <div aria-hidden className="hidden">
        <label>
          Company
          <input type="text" name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="type-p1 text-graphite">Name*</span>
        <input type="text" name="name" required maxLength={120} className={field} />
      </label>

      <label className="flex flex-col gap-1">
        <span className="type-p1 text-graphite">Email*</span>
        <input type="email" name="email" required maxLength={200} className={field} />
      </label>

      <label className="flex flex-col gap-1">
        <span className="type-p1 text-graphite">Phone</span>
        <input type="tel" name="phone" maxLength={40} className={field} />
      </label>

      <label className="flex flex-col gap-1">
        <span className="type-p1 text-graphite">Message*</span>
        <textarea name="message" required maxLength={5000} rows={5} className={field} />
      </label>

      {/* Announced to assistive tech: polite for success, assertive for error. */}
      <p role="status" aria-live="polite" className="type-p2 text-graphite empty:hidden">
        {status === 'sent'
          ? 'Thank you — your message has been sent. We aim to respond within 2–3 working days.'
          : ''}
      </p>
      {status === 'error' && (
        <p role="alert" className="type-p2 text-redcurrent">
          {error}
        </p>
      )}

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
