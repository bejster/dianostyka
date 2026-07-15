import { ImageResponse } from 'next/og';

export const runtime = 'edge';

// Dynamiczny OG: link /w?g=..&t=..&s=.. pokazuje w podglądzie (Messenger/IG/WhatsApp) godzinę pęknięcia usera.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const g = (searchParams.get('g') || '22:47').slice(0, 24);
  const t = (searchParams.get('t') || '').slice(0, 48);
  const s = (searchParams.get('s') || '').slice(0, 3);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(160deg, #0f0e0a 0%, #070707 55%, #0a0a0a 100%)',
          color: '#e0ddd6',
          fontFamily: 'Georgia, serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 26, letterSpacing: 10, color: '#c8a84e', fontWeight: 700, marginBottom: 8 }}>
          HANTLE I TALERZ
        </div>
        <div style={{ display: 'flex', width: 110, height: 2, background: '#c8a84e', marginBottom: 44 }} />
        <div style={{ display: 'flex', fontSize: 30, letterSpacing: 4, color: '#8a857a', marginBottom: 10, textTransform: 'uppercase' }}>
          O tej godzinie pęka mój tydzień
        </div>
        <div style={{ display: 'flex', fontSize: 220, fontWeight: 700, color: '#c8a84e', fontStyle: 'italic', lineHeight: 1 }}>
          {g}
        </div>
        {t ? (
          <div style={{ display: 'flex', fontSize: 34, color: '#e0ddd6', marginTop: 26, fontStyle: 'italic' }}>
            {'„'}{t}{'”'}{s ? `  ·  ${s}/100` : ''}
          </div>
        ) : null}
        <div style={{ display: 'flex', fontSize: 26, color: '#8a857a', marginTop: 48 }}>
          Sprawdź swoją godzinę:
        </div>
        <div style={{ display: 'flex', fontSize: 30, color: '#c8a84e', fontWeight: 700, marginTop: 6 }}>
          diagnostyka.talerzihantle.com
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
