import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';

/** The card size every social platform crops to. */
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = 'image/png';

// Brand palette, from tailwind.config.ts.
const CARARRA = '#F1F0ED';
const GRAPHITE = '#4D4B4A';
const OSLO = '#A6A3A1';

/**
 * The brand font, read off disk at render time.
 *
 * Satori cannot use the CSS font that `next/font/local` sets up, so the file is
 * loaded directly. Cached in module scope: OG routes are hit repeatedly by
 * crawlers and re-reading per request is pure waste.
 */
let fontCache: ArrayBuffer | null = null;
async function brandFont(): Promise<ArrayBuffer> {
  if (!fontCache) {
    const file = await readFile(
      path.join(process.cwd(), 'src/fonts/LetterGothicStd.otf')
    );
    fontCache = file.buffer.slice(
      file.byteOffset,
      file.byteOffset + file.byteLength
    ) as ArrayBuffer;
  }
  return fontCache;
}

/**
 * The shared Open Graph card: wordmark, title, optional subtitle.
 *
 * Every page had no OG image at all before this, so shares rendered blank.
 */
export async function ogImage({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}): Promise<ImageResponse> {
  const font = await brandFont();

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: CARARRA,
          color: GRAPHITE,
          padding: '72px',
          fontFamily: 'LetterGothic',
        }}
      >
        <div style={{ display: 'flex', fontSize: 34, letterSpacing: '0.24em' }}>
          CINQUE®
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', fontSize: 76, lineHeight: 1.1 }}>{title}</div>
          {subtitle ? (
            <div style={{ display: 'flex', fontSize: 32, color: OSLO }}>{subtitle}</div>
          ) : null}
        </div>

        <div style={{ display: 'flex', fontSize: 26, color: OSLO }}>
          Individually made, cast and hallmarked in London
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [{ name: 'LetterGothic', data: font, style: 'normal', weight: 400 }],
    }
  );
}
