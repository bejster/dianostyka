import { ImageResponse } from 'next/og';

export const runtime = 'edge';

// Bez parametru g route jest publicznym OG Diagnostyki. Gdy /w poda g, zachowujemy
// personalizowany podgląd godziny pęknięcia bez wymyślania jej dla zimnego ruchu.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawG = searchParams.get('g');
  const g = rawG ? rawG.slice(0, 24) : '';
  const t = (searchParams.get('t') || '').slice(0, 48);
  const s = (searchParams.get('s') || '').slice(0, 3);

  if (!g) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            background: 'radial-gradient(circle at 50% 5%, #1b170d 0%, #09090a 48%, #050506 100%)',
            color: '#ece7db',
            padding: '64px 74px',
            fontFamily: 'Arial, sans-serif',
          }}
        >
          <div style={{ display: 'flex', fontSize: 20, letterSpacing: 8, color: '#c8a84e', fontWeight: 800 }}>
            DIAGNOSTYKA 168
          </div>

          <div style={{ display: 'flex', marginTop: 30, maxWidth: 1030, fontFamily: 'Georgia, serif', fontSize: 70, lineHeight: 1.02 }}>
            Wiesz, co robić. Więc czemu Twój tydzień i tak kończy się tak samo?
          </div>

          <div style={{ display: 'flex', alignItems: 'center', marginTop: 42, width: '100%' }}>
            {['RANO', 'PRACA', 'PO PRACY'].map((label, i) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ display: 'flex', width: 36, height: 36, borderRadius: 999, alignItems: 'center', justifyContent: 'center', border: '2px solid #b99a4a', color: '#f2d98f', background: '#15130e', fontFamily: 'Georgia, serif', fontSize: 30 }}>
                    {i === 1 ? '?' : ''}
                  </div>
                  <div style={{ display: 'flex', marginTop: 10, fontSize: 15, letterSpacing: 2, color: '#8f887c' }}>{label}</div>
                </div>
                <div style={{ display: 'flex', height: 2, flex: 1, margin: '0 16px 28px', background: 'linear-gradient(90deg,#514629,#8a7535)' }} />
              </div>
            ))}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ display: 'flex', width: 36, height: 36, borderRadius: 999, background: '#e0552e', boxShadow: '0 0 24px rgba(224,85,46,.45)' }} />
              <div style={{ display: 'flex', marginTop: 10, fontSize: 15, letterSpacing: 2, color: '#df8c73' }}>OBJAW</div>
            </div>
          </div>

          <div style={{ display: 'flex', marginTop: 34, justifyContent: 'space-between', alignItems: 'center', gap: 30 }}>
            <div style={{ display: 'flex', fontSize: 25, color: '#a49e92' }}>
              Znajdź pierwszy moment, od którego zaczyna się łańcuch.
            </div>
            <div style={{ display: 'flex', fontSize: 20, color: '#c8a84e', fontWeight: 800 }}>
              WYNIK OD RAZU · TEST 72H
            </div>
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }

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
          Sprawdź swój pierwszy punkt:
        </div>
        <div style={{ display: 'flex', fontSize: 30, color: '#c8a84e', fontWeight: 700, marginTop: 6 }}>
          diagnostyka.talerzihantle.com
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
