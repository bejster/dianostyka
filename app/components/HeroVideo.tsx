'use client';

// ── SLOT WIDEO TRUST (beat 6) ──
// Osobista wiadomosc Michala tuz nad hand-raiserem. Tap-to-play (bez autoplay, nie spowalnia strony:
// iframe/video montuje sie dopiero po kliknieciu). Obsluguje mp4 (plik) albo embed (YT/Vimeo).
// Render tylko gdy jest asset — brak = komponent nic nie zwraca (prod czysty do czasu nagrania).
import { useState } from 'react';

export interface HeroVideoConfig {
  kind: 'mp4' | 'embed';
  src: string;            // url pliku mp4 albo embed (youtube.com/embed/... | player.vimeo.com/video/...)
  poster?: string;        // opcjonalna klatka-plakat (twarz Michala). Brak = zloty gradient.
  caption?: string;       // linia pod tytulem
}

const C = {
  ink: '#08080a', pan: '#141416', pan2: '#1a1a1d', line2: '#33333a',
  gold: '#c8a84e', goldB: '#e8cc80', goldD: '#8a7535', glow: 'rgba(200,168,78,.16)',
  paper: '#ece7db', mute: '#a49e92', faint: '#8f887c',
  mono: "'JetBrains Mono', ui-monospace, monospace", serif: "'Instrument Serif', Georgia, serif",
};

function withAutoplay(src: string): string {
  const sep = src.includes('?') ? '&' : '?';
  // YT: autoplay+rel=0; Vimeo: autoplay=1. Oba ignoruja nieznane parametry.
  return `${src}${sep}autoplay=1&rel=0&playsinline=1`;
}

export default function HeroVideo({ kind, src, poster, caption }: HeroVideoConfig) {
  const [playing, setPlaying] = useState(false);
  const cap = caption || 'Jak realnie patrzę na taki wynik';

  return (
    <div style={{ margin: '0 0 18px' }}>
      <div style={{ fontFamily: C.mono, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: C.gold, fontWeight: 700, marginBottom: 10 }}>
        60 sekund ode mnie
      </div>
      <div style={{
        position: 'relative', borderRadius: 16, overflow: 'hidden', aspectRatio: '16 / 9',
        border: `1px solid ${C.goldD}`, background: poster ? `#000 url(${poster}) center/cover no-repeat` : `linear-gradient(150deg, ${C.pan2}, ${C.ink})`,
        boxShadow: `0 0 34px ${C.glow}, 0 30px 60px -28px rgba(0,0,0,.85)`,
      }}>
        {!playing ? (
          <button
            onClick={() => setPlaying(true)}
            aria-label="Odtwórz wiadomość"
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14,
              border: 'none', background: poster ? 'rgba(8,8,10,.34)' : 'transparent', color: C.paper,
            }}
          >
            <span style={{
              width: 72, height: 72, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `linear-gradient(135deg, ${C.gold}, ${C.goldB})`, boxShadow: `0 0 0 8px rgba(200,168,78,.14), 0 14px 34px -8px rgba(200,168,78,.55)`,
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill={C.ink} aria-hidden><path d="M8 5v14l11-7z" /></svg>
            </span>
            <span style={{ fontFamily: C.serif, fontSize: 'clamp(17px,3.6vw,22px)', color: C.paper, lineHeight: 1.2, textAlign: 'center', maxWidth: '22ch', textShadow: '0 2px 12px rgba(0,0,0,.6)' }}>
              {cap}
            </span>
          </button>
        ) : kind === 'mp4' ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video src={src} poster={poster} controls autoPlay playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', background: '#000' }} />
        ) : (
          <iframe
            src={withAutoplay(src)}
            title="Wiadomość od Michała"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
          />
        )}
      </div>
      <p style={{ fontFamily: C.mono, fontSize: 11, letterSpacing: '.5px', color: C.faint, margin: '8px 0 0', lineHeight: 1.5 }}>
        Zerknij zanim napiszesz. To ta sama głowa, która spojrzy na Twój wynik.
      </p>
    </div>
  );
}
