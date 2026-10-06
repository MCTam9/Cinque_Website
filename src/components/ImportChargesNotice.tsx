import Link from 'next/link';
import { P1 } from '@/components/typography';
import {
  DUTIES_CALCULATOR,
  IMPORT_AUTHORITY,
  importChargesNotice,
  type ShipCountry,
} from '@/lib/shop/shipping';

const linkClass = 'underline underline-offset-4 hover:text-redcurrent';

/**
 * The checkout's import-charges notice for `country`: who sets the charges,
 * that the buyer pays them, and where to check — the destination's own customs
 * guidance first, a third-party estimator second. We deliberately quote no
 * figure of our own: rates turn on product code, value, exchange rate and
 * state or province, and a wrong estimate is worse than none.
 *
 * Renders nothing for the UK. Boxed and in full-strength text, not the muted
 * oslo of the surrounding notes, so it can't be skimmed past before paying.
 */
export default function ImportChargesNotice({
  country,
  className = '',
}: {
  country: ShipCountry;
  className?: string;
}) {
  const notice = importChargesNotice(country);
  if (!notice) return null;
  const authority = IMPORT_AUTHORITY[country];

  return (
    <div className={`flex flex-col gap-[6px] border border-graphite p-[10px] ${className}`}>
      <P1 className="font-bold text-graphite">Import duties &amp; taxes</P1>
      <P1 className="text-graphite">{notice}</P1>
      <P1 className="text-oslo">
        {authority && (
          <>
            <a href={authority.url} target="_blank" rel="noopener noreferrer" className={linkClass}>
              Guidance from {authority.name}
            </a>
            {' · '}
          </>
        )}
        <a
          href={DUTIES_CALCULATOR.url}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          Estimate with {DUTIES_CALCULATOR.name}
        </a>{' '}
        (third party, a rough guide only) ·{' '}
        <Link href="/shipping#duties" className={linkClass}>
          Shipping &amp; returns
        </Link>
      </P1>
    </div>
  );
}
