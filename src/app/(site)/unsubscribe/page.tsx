'use client';

import { useState } from 'react';
import Link from 'next/link';
import Container, { statusPadY } from '@/components/Container';
import { H1, P1 } from '@/components/typography';

/**
 * The checkout reminder's unsubscribe link. A button rather than acting on
 * page load, so a mail scanner opening the link can't unsubscribe anyone.
 */
export default function UnsubscribePage() {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');

  const confirm = async () => {
    setState('busy');
    const res = await fetch(`/api/cart/unsubscribe${window.location.search}`, {
      method: 'POST',
    }).catch(() => null);
    setState(res?.ok ? 'done' : 'error');
  };

  return (
    <Container className={statusPadY}>
      <H1 className="mb-[20px]">UNSUBSCRIBE</H1>
      {state === 'done' ? (
        <>
          <P1 className="mb-[20px] text-graphite">
            Done. We won’t send you checkout reminders again. Order confirmations and shipping
            updates for anything you buy still arrive as usual.
          </P1>
          <Link href="/shop" className="btn">
            Continue shopping
          </Link>
        </>
      ) : (
        <div className="flex max-w-[480px] flex-col gap-[20px]">
          <P1 className="text-graphite">
            Stop the reminder we send when a checkout is left unfinished?
          </P1>
          <button
            type="button"
            onClick={confirm}
            disabled={state === 'busy'}
            className="type-h3 min-h-[48px] bg-graphite text-cararra transition-colors hover:bg-redcurrent disabled:bg-oslo"
          >
            Stop checkout reminders
          </button>
          {state === 'error' && (
            <P1 className="text-redcurrent">
              That didn’t work. The link may be incomplete; try it again from the email.
            </P1>
          )}
        </div>
      )}
    </Container>
  );
}
