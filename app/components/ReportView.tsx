'use client';

/* Hallmark · in-app result · brand tokens (M) · Instrument Serif display
 * disciplines: real-data, roman headers, locked tokens, mobile-safe, anti-slop
 * Głęboki wynik: reframe -> mechanizm neuro -> łańcuch -> koszt -> most do prowadzenia.
 */

import React from 'react';
import { depthFor } from '../lib/report-content';

// ── BRAND TOKENS (z app/page.tsx obiekt M) ──
const T = {
  bg: '#0a0a0a', s1: '#131313', s2: '#1c1c1c', s3: '#252525',
  brd: '#222222', brd2: '#2e2e2e',
  gold: '#c8a84e', goldDim: '#8a7535', goldSoft: 'rgba(200,168,78,0.07)', goldGlow: 'rgba(200,168,78,0.16)',
  red: '#dc4444', org: '#e8923a', yel: '#d4a82a', grn: '#3cba5e',
  t1: '#ffffff', t2: '#e0ddd6', t3: '#b8b3a8', t4: '#8a857a',
  mono: "'JetBrains Mono', ui-monospace, monospace",
  sans: "'Inter', system-ui, -apple-system, sans-serif",
  serif: "var(--font-display, 'Instrument Serif'), Georgia, serif",
};

export interface DomainStat { label: string; pct: number }

interface Props {
  imie?: string;
  potential: number;
  domains: DomainStat[];
  archetypeLabel: string;
  archetypeTagline: string;
  archetypeMirror: string;
  worstLabel: string;
  breakText: string;
  costText: string;
  costDays: number;
  naborHref: string;
}

function statusOf(pct: number): { color: string; word: string } {
  if (pct >= 62) return { color: T.grn, word: 'trzyma' };
  if (pct >= 40) return { color: T.gold, word: 'chwieje się' };
  return { color: T.red, word: 'pęka' };
}

const Eyebrow = ({ children, color = T.gold }: { children: React.ReactNode; color?: string }) => (
  <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color, fontWeight: 700, marginBottom: 14 }}>{children}</div>
);
const H2 = ({ children }: { children: React.ReactNode }) => (
  <h2 style={{ fontFamily: T.serif, fontStyle: 'normal', fontWeight: 400, fontSize: 'clamp(26px, 6vw, 34px)', lineHeight: 1.12, letterSpacing: '-0.01em', color: T.t1, margin: 0, overflowWrap: 'anywhere' }}>{children}</h2>
);

export default function ReportView({
  imie, potential, domains, archetypeLabel, archetypeTagline, archetypeMirror,
  worstLabel, breakText, costText, costDays, naborHref,
}: Props) {
  const depth = depthFor(worstLabel);
  const sorted = [...domains].sort((a, b) => a.pct - b.pct);
  const g = statusOf(potential);
  const R = 58, CIRC = 2 * Math.PI * R, dash = (potential / 100) * CIRC;
  const name = (imie || '').trim();

  return (
    <div style={{ background: T.bg, color: T.t2, fontFamily: T.sans, minHeight: '100vh', overflowX: 'clip', ['--font-display' as string]: "'Instrument Serif', Georgia, serif" } as React.CSSProperties}>
      <div style={{ maxWidth: 580, margin: '0 auto', padding: '0 18px 100px' }}>

        {/* NASTĘPNY KROK na górze */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 0', position: 'sticky', top: 0, background: T.bg, borderBottom: `1px solid ${T.brd}`, zIndex: 20 }}>
          <span style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: T.t4, fontWeight: 700 }}>Diagnoza gotowa</span>
          <span style={{ flex: 1 }} />
          <a href={naborHref} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, color: T.t2, textDecoration: 'none', whiteSpace: 'nowrap' }}>
            następny krok: <strong style={{ color: T.gold }}>prowadzenie 1:1</strong> &rarr;
          </a>
        </div>

        {/* HERO: archetyp */}
        <header style={{ padding: '48px 0 8px' }}>
          <Eyebrow color={T.t4}>{name ? `${name}, ` : ''}Twój tydzień w jednym zdaniu</Eyebrow>
          <h1 style={{ fontFamily: T.serif, fontStyle: 'normal', fontWeight: 400, fontSize: 'clamp(38px, 11vw, 62px)', lineHeight: 1.02, letterSpacing: '-0.02em', margin: 0, color: T.t1, overflowWrap: 'anywhere' }}>
            {archetypeLabel}
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.5, color: T.gold, margin: '20px 0 0', maxWidth: 480, fontWeight: 500 }}>{archetypeTagline}</p>
        </header>

        {/* REFRAME: belief-shift */}
        <section style={{ padding: '40px 0', borderTop: `1px solid ${T.brd}`, marginTop: 40 }}>
          <Eyebrow>Sedno</Eyebrow>
          <p style={{ fontFamily: T.serif, fontSize: 'clamp(22px, 5.4vw, 30px)', lineHeight: 1.3, color: T.t4, margin: '0 0 6px', fontStyle: 'normal' }}>
            To nie {depth.reframe.nie}.
          </p>
          <p style={{ fontFamily: T.serif, fontSize: 'clamp(24px, 6vw, 34px)', lineHeight: 1.28, color: T.t1, margin: 0, fontStyle: 'normal' }}>
            To <span style={{ color: T.gold }}>{depth.reframe.ale}</span>.
          </p>
        </section>

        {/* ODPORNOŚĆ + KOSZT */}
        <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0,auto) minmax(0,1fr)', gap: 22, alignItems: 'center', padding: '24px 22px', background: T.s1, border: `1px solid ${T.brd}`, borderRadius: 16 }}>
          <svg width="132" height="132" viewBox="0 0 132 132" aria-hidden="true" style={{ flexShrink: 0 }}>
            <circle cx="66" cy="66" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="9" />
            <circle cx="66" cy="66" r={R} fill="none" stroke={g.color} strokeWidth="9" strokeLinecap="round" strokeDasharray={`${dash} ${CIRC}`} transform="rotate(-90 66 66)" />
            <text x="66" y="62" textAnchor="middle" fontFamily={T.mono} fontSize="36" fontWeight="800" fill={T.t1}>{potential}</text>
            <text x="66" y="84" textAnchor="middle" fontFamily={T.mono} fontSize="9.5" fill={T.t4}>/ 100</text>
          </svg>
          <div>
            <div style={{ fontFamily: T.mono, fontSize: 9.5, letterSpacing: 1.8, textTransform: 'uppercase', color: T.t4, marginBottom: 6 }}>Odporność Twojego Tygodnia</div>
            <div style={{ fontFamily: T.serif, fontSize: 25, color: g.color, lineHeight: 1.12, marginBottom: 10 }}>Twój tydzień {g.word}</div>
            <div style={{ fontSize: 13, color: T.t3, lineHeight: 1.5 }}>Realny rachunek: <strong style={{ color: T.t2 }}>{costText}</strong> rocznie na tym, co miało wracać.</div>
          </div>
        </section>

        {/* MECHANIZM: co się naprawdę dzieje */}
        <section style={{ padding: '46px 0 0' }}>
          <Eyebrow>Co się naprawdę dzieje</Eyebrow>
          <p style={{ fontSize: 16.5, lineHeight: 1.65, color: T.t2, margin: '0 0 22px' }}>{depth.mechanizm}</p>
          <blockquote style={{ margin: 0, padding: '18px 22px', background: T.goldSoft, borderLeft: `2px solid ${T.gold}`, borderRadius: 8 }}>
            <p style={{ fontFamily: T.serif, fontSize: 20, lineHeight: 1.4, color: T.t1, margin: 0, fontStyle: 'normal' }}>{depth.analogia}</p>
          </blockquote>
        </section>

        {/* MAPA PĘKNIĘCIA (łańcuch) */}
        <section style={{ padding: '46px 0 0' }}>
          <H2>Gdzie pęka Twój tydzień</H2>
          <p style={{ fontSize: 14, color: T.t3, margin: '10px 0 26px', lineHeight: 1.5 }}>Problem rzadko zaczyna się tam, gdzie go widzisz. Widzisz go {breakText}.</p>
          <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {depth.chain.map((s, i) => {
              const mis = s.tag.toLowerCase().includes('naprawiasz');
              return (
                <li key={i} style={{ display: 'grid', gridTemplateColumns: '24px minmax(0,1fr)', gap: 15, paddingBottom: i < depth.chain.length - 1 ? 22 : 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: mis ? T.red : T.gold, boxShadow: `0 0 0 4px ${mis ? 'rgba(220,68,68,0.15)' : T.goldSoft}`, flexShrink: 0 }} />
                    {i < depth.chain.length - 1 && <span style={{ width: 2, flex: 1, marginTop: 4, background: T.brd2 }} />}
                  </div>
                  <div>
                    <div style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase', color: mis ? T.red : T.t4, fontWeight: 700, marginBottom: 4 }}>{s.tag}</div>
                    <div style={{ fontSize: 15.5, color: T.t1, lineHeight: 1.4, fontWeight: mis ? 600 : 400 }}>{s.text}</div>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {/* UKRYTY KOSZT */}
        <section style={{ padding: '38px 22px', background: T.s1, border: `1px solid ${T.brd}`, borderRadius: 16, margin: '46px 0 0' }}>
          <Eyebrow color={T.org}>Ukryty koszt</Eyebrow>
          <p style={{ fontFamily: T.serif, fontSize: 21, lineHeight: 1.45, color: T.t1, margin: 0, fontStyle: 'normal' }}>{depth.koszt}</p>
          {costDays > 0 && (
            <div style={{ marginTop: 16, fontFamily: T.mono, fontSize: 12.5, color: T.t3 }}>
              <span style={{ color: T.org, fontWeight: 700 }}>{costDays} dni</span> w roku na pół mocy &middot; <span style={{ color: T.org, fontWeight: 700 }}>{costText}</span> wydane rocznie
            </div>
          )}
        </section>

        {/* SZEŚĆ OBSZARÓW */}
        <section style={{ padding: '46px 0 0' }}>
          <H2>Sześć obszarów, od najsłabszego</H2>
          <div style={{ marginTop: 22 }}>
            {sorted.map((d) => {
              const st = statusOf(d.pct);
              return (
                <div key={d.label} style={{ marginBottom: 15 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                    <span style={{ fontSize: 15, color: T.t1, fontWeight: 500 }}>{d.label}</span>
                    <span style={{ fontFamily: T.mono, fontSize: 11, color: st.color }}>{st.word} · {d.pct}</span>
                  </div>
                  <div style={{ width: '100%', height: 7, borderRadius: 4, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.max(d.pct, 3)}%`, background: st.color, borderRadius: 4, transition: 'width 0.7s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* CZEGO TERAZ NIE ROBIĆ */}
        <section style={{ padding: '46px 0 0' }}>
          <H2>Czego teraz nie robić</H2>
          <ul style={{ listStyle: 'none', margin: '22px 0 0', padding: 0 }}>
            {depth.nieRob.map((n, i) => (
              <li key={i} style={{ display: 'grid', gridTemplateColumns: '22px minmax(0,1fr)', gap: 12, marginBottom: 14, alignItems: 'start' }}>
                <span style={{ color: T.red, fontSize: 18, lineHeight: 1.3, fontWeight: 700 }}>&times;</span>
                <span style={{ fontSize: 15.5, color: T.t2, lineHeight: 1.5 }}>{n}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* LUSTRO */}
        <section style={{ padding: '34px 24px', background: T.s2, border: `1px solid ${T.brd}`, borderRadius: 16, margin: '46px 0 0' }}>
          <Eyebrow>Brzmi znajomo?</Eyebrow>
          <p style={{ fontFamily: T.serif, fontSize: 19, lineHeight: 1.55, color: T.t1, margin: 0, fontStyle: 'normal' }}>{archetypeMirror}</p>
        </section>

        {/* MOST DO PROWADZENIA */}
        <section style={{ padding: '44px 26px', background: `linear-gradient(165deg, ${T.s1}, ${T.bg})`, border: `1px solid ${T.gold}44`, borderRadius: 20, marginTop: 44, textAlign: 'center' }}>
          <Eyebrow>Następny krok</Eyebrow>
          <h2 style={{ fontFamily: T.serif, fontStyle: 'normal', fontWeight: 400, fontSize: 'clamp(24px, 6vw, 30px)', lineHeight: 1.22, color: T.t1, margin: '0 0 14px' }}>
            Ktoś ułoży to pod Twój tydzień i rozliczy Cię z niego
          </h2>
          <p style={{ fontSize: 15, color: T.t3, lineHeight: 1.6, margin: '0 auto 26px', maxWidth: 420 }}>
            Wiesz już gdzie pęka i dlaczego. Prowadzenie 1:1 to naprawa dokładnie tego jednego miejsca, nie kolejna porcja teorii do obejrzenia.
          </p>
          <a href={naborHref} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', padding: '17px 38px', borderRadius: 14, background: `linear-gradient(135deg, ${T.gold}, ${T.goldDim})`, color: T.bg, fontWeight: 800, fontSize: 15, letterSpacing: 0.4, textTransform: 'uppercase', textDecoration: 'none' }}>
            Zobacz prowadzenie 1:1 &rarr;
          </a>
        </section>

      </div>
    </div>
  );
}
