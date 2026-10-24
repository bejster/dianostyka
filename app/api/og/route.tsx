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
  // v=th2: podgląd linku /rozjazd (TH2). Obraz niesie jedno pytanie, og:title dokłada drugie.
  // 2026-10-14: z obrazu wyleciały oś kroków, podpis i badge. Za dużo tekstu w karcie FB.
  const th2 = searchParams.get('v') === 'th2';

  if (!g) {
    const brand = (
      <div style={{ display: 'flex', position: 'absolute', top: 54, left: 74, fontSize: 18, letterSpacing: 8, color: '#8a7535', fontWeight: 800 }}>
        MAPA 168
      </div>
    );
    // Obietnica = to, co realnie stoi na ekranie wyniku: "Gdzie zaczynasz" + "Pierwszy ruch 72h" (/pp §14A).
    const payoff = (
      <div style={{ display: 'flex', position: 'absolute', bottom: 50, left: 0, right: 0, justifyContent: 'center', fontSize: 32, color: '#c2ab6c' }}>
        Na końcu: gdzie to się u Ciebie zaczyna i co zrobić przez 3 dni
      </div>
    );
    const frame = {
      width: '100%',
      height: '100%',
      display: 'flex',
      position: 'relative' as const,
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 50% 5%, #1b170d 0%, #09090a 48%, #050506 100%)',
      color: '#ece7db',
      fontFamily: 'Arial, sans-serif',
    };

    if (th2) {
      return new ImageResponse(
        (
          <div style={{ ...frame, flexDirection: 'column' }}>
            {brand}
            <div style={{ display: 'flex', fontFamily: 'Georgia, serif', fontSize: 84, lineHeight: 1.02, textAlign: 'center' }}>
              Gdzie pęka Twój tydzień?
            </div>
            <div style={{ display: 'flex', width: 120, height: 3, marginTop: 40, background: '#c8a84e' }} />
            {payoff}
          </div>
        ),
        { width: 1200, height: 630 }
      );
    }

    // General: zakład kontra tydzień. Puste pole i znak zapytania zostają otwarte do wyniku.
    const card = { display: 'flex', flexDirection: 'column' as const, justifyContent: 'space-between', width: 460, height: 320, padding: '36px 40px', borderRadius: 18 };
    return new ImageResponse(
      (
        <div style={frame}>
          {brand}
          <div style={{ ...card, border: '2px solid #2d2a22', background: '#0e0d0a' }}>
            <div style={{ display: 'flex', fontSize: 28, letterSpacing: 5, color: '#a49e92', fontWeight: 800 }}>TY OBSTAWIASZ</div>
            <div style={{ display: 'flex', width: '100%', height: 3, marginBottom: 46, background: '#5b5242' }} />
          </div>
          <div style={{ display: 'flex', fontFamily: 'Georgia, serif', fontSize: 40, color: '#6f6858', margin: '0 34px' }}>vs</div>
          <div style={{ ...card, border: '2px solid #b99a4a', background: '#15130e', boxShadow: '0 0 60px rgba(200,168,78,.18)' }}>
            <div style={{ display: 'flex', fontSize: 28, letterSpacing: 5, color: '#c8a84e', fontWeight: 800 }}>TWÓJ TYDZIEŃ MÓWI</div>
            <div style={{ display: 'flex', fontFamily: 'Georgia, serif', fontSize: 170, lineHeight: 0.9, color: '#f2d98f' }}>?</div>
          </div>
          {payoff}
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
          168.talerzihantle.com
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
