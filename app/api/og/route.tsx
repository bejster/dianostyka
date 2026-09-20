import { ImageResponse } from 'next/og';

export const runtime = 'edge';

// Dynamiczny OG: link /w?g=..&t=..&s=.. pokazuje w podglądzie (Messenger/IG/WhatsApp) godzinę pęknięcia usera.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  // Public entry preview. Historical result links with g keep their existing image.
  if (!searchParams.has('g')) return new ImageResponse(
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: '100%', height: '100%', padding: '70px 90px', background: '#08080a', color: '#f2eee4', fontFamily: 'serif' }}>
      <div style={{ display: 'flex', color: '#d3b365', fontSize: 24, letterSpacing: 5, marginBottom: 34 }}>DIAGNOSTYKA 168</div>
      <div style={{ display: 'flex', fontSize: 72, lineHeight: 1.1, maxWidth: 1000 }}>Co z Twojego dnia odbija się później na formie?</div>
      <div style={{ display: 'flex', fontSize: 28, marginTop: 38, color: '#bcb6ab' }}>Sprawdź swój tydzień. Wynik bez podawania kontaktu.</div>
      <div style={{ display: 'flex', fontSize: 22, marginTop: 50, color: '#d3b365' }}>Michał · Hantle i Talerz</div>
    </div>, { width: 1200, height: 630 });
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
