'use client';

/* Hallmark · in-app result · genre: atmospheric-premium · theme: charcoal+gold (elevated)
 * disciplines: real-data-only, roman headers (no italic), locked tokens, mobile-safe, anti-slop
 * Personalizowany wynik Diagnostyki Tygodnia. Prowadzenie 1:1 jako nastepny krok na gorze.
 */

import React from 'react';

// ── LOCKED TOKENS ──
const T = {
  ink: '#0a0a0c',
  surface: '#121216',
  surface2: '#17171d',
  line: 'rgba(255,255,255,0.07)',
  lineStrong: 'rgba(255,255,255,0.14)',
  text: '#f3efe7',
  muted: '#9d988e',
  faint: '#63605a',
  gold: '#c8a84e',
  goldSoft: 'rgba(200,168,78,0.10)',
  good: '#63b981',
  mid: '#d2a24a',
  bad: '#cf6a4b',
  serif: 'Georgia, "Times New Roman", serif',
  sans: '"Inter", system-ui, sans-serif',
  mono: '"SF Mono", "Roboto Mono", monospace',
};

export interface DomainStat { label: string; pct: number }

interface Props {
  imie?: string;
  potential: number;          // 0-100, Odpornosc Tygodnia (wyzej = lepiej)
  domains: DomainStat[];      // 6 obszarow, pct 0-100 (wyzej = lepiej)
  archetypeLabel: string;
  archetypeTagline: string;
  archetypeMirror: string;
  worstLabel: string;         // najslabszy obszar
  breakText: string;          // godzina/okno peknicia (hourRange)
  costText: string;           // realny koszt roczny (display)
  costDays: number;           // dni na pol mocy / rok
  naborHref: string;
  onSaveCard?: () => void;
}

function statusOf(pct: number): { color: string; word: string } {
  if (pct >= 66) return { color: T.good, word: 'trzyma' };
  if (pct >= 42) return { color: T.mid, word: 'chwieje' };
  return { color: T.bad, word: 'pęka' };
}

// Skad rusza problem w zaleznosci od najslabszego obszaru (start lancucha)
const CHAIN_START: Record<string, string> = {
  'Sen': 'Za krótki, płytki sen',
  'Stres': 'Napięcie, które nie schodzi po pracy',
  'Żywienie': 'Niedojedzony dzień',
  'Weekend': 'Rozjazd rytmu w weekend',
  'Trening': 'Plan, który nie znosi gorszego dnia',
  'Głowa': 'Myślenie zero-jedynkowe',
};
// Co user zwykle naprawia ZAMIAST przyczyny (blad interwencji)
const CHAIN_MISFIX: Record<string, string> = {
  'Sen': 'Dokładasz kawę i kolejny trening',
  'Stres': 'Wpychasz więcej dyscypliny',
  'Żywienie': 'Tniesz kalorie jeszcze mocniej',
  'Weekend': 'Obiecujesz sobie „czysty poniedziałek”',
  'Trening': 'Dokładasz kolejne jednostki',
  'Głowa': 'Czekasz na idealny start',
};

export default function ReportView({
  imie, potential, domains, archetypeLabel, archetypeTagline, archetypeMirror,
  worstLabel, breakText, costText, costDays, naborHref, onSaveCard,
}: Props) {
  const sorted = [...domains].sort((a, b) => a.pct - b.pct);
  const gaugeStatus = statusOf(potential);
  const R = 58;
  const CIRC = 2 * Math.PI * R;
  const dash = (potential / 100) * CIRC;
  const name = (imie || '').trim();

  // Mapa peknicia tygodnia: 5 etapow z realnych danych
  const stages = [
    { tag: 'Start', text: CHAIN_START[worstLabel] || CHAIN_START['Sen'] },
    { tag: 'Widać', text: `Zjazd ${breakText}` },
    { tag: 'Naprawiasz nie to', text: CHAIN_MISFIX[worstLabel] || CHAIN_MISFIX['Sen'] },
    { tag: 'Ukryty koszt', text: costDays > 0 ? `${costDays} dni w roku na pół mocy` : 'Dni tygodnia na pół mocy' },
    { tag: 'Powrót', text: 'Rytm wraca dopiero w środku kolejnego tygodnia' },
  ];

  return (
    <div style={{ background: T.ink, color: T.text, fontFamily: T.sans, minHeight: '100vh', overflowX: 'clip' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 18px 96px' }}>

        {/* ── NASTĘPNY KROK: prowadzenie 1:1 na górze ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 0', borderBottom: `1px solid ${T.line}`, position: 'sticky', top: 0, background: T.ink, zIndex: 20 }}>
          <span style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: T.gold, fontWeight: 700 }}>Diagnoza gotowa</span>
          <span style={{ flex: 1, height: 1, background: T.line }} />
          <a href={naborHref} target="_blank" rel="noopener noreferrer"
             style={{ fontSize: 12.5, color: T.text, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
            następny krok: <strong style={{ color: T.gold }}>prowadzenie 1:1</strong> &rarr;
          </a>
        </div>

        {/* ── HERO: archetyp ── */}
        <header style={{ padding: '44px 0 32px' }}>
          <div style={{ fontFamily: T.mono, fontSize: 10.5, letterSpacing: 3, textTransform: 'uppercase', color: T.muted, marginBottom: 18 }}>
            {name ? `${name}, ` : ''}Twój tydzień w jednym zdaniu
          </div>
          <h1 style={{ fontFamily: T.serif, fontStyle: 'normal', fontWeight: 400, fontSize: 'clamp(30px, 8vw, 46px)', lineHeight: 1.08, letterSpacing: '-0.015em', margin: 0, color: '#fff', overflowWrap: 'anywhere' }}>
            {archetypeLabel}
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.5, color: T.gold, margin: '18px 0 0', maxWidth: 460, fontWeight: 500 }}>
            {archetypeTagline}
          </p>
        </header>

        {/* ── ODPORNOŚĆ + KOSZT ── */}
        <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0,auto) minmax(0,1fr)', gap: 20, alignItems: 'center', padding: '26px 22px', background: T.surface, border: `1px solid ${T.line}`, borderRadius: 18, marginBottom: 14 }}>
          <svg width="140" height="140" viewBox="0 0 140 140" aria-hidden="true" style={{ flexShrink: 0 }}>
            <circle cx="70" cy="70" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="9" />
            <circle cx="70" cy="70" r={R} fill="none" stroke={gaugeStatus.color} strokeWidth="9" strokeLinecap="round"
                    strokeDasharray={`${dash} ${CIRC}`} transform="rotate(-90 70 70)" />
            <text x="70" y="66" textAnchor="middle" fontFamily={T.mono} fontSize="38" fontWeight="800" fill="#fff">{potential}</text>
            <text x="70" y="88" textAnchor="middle" fontFamily={T.mono} fontSize="10" fill={T.faint}>/ 100</text>
          </svg>
          <div>
            <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: T.muted, marginBottom: 6 }}>Odporność Twojego Tygodnia</div>
            <div style={{ fontFamily: T.serif, fontSize: 24, color: gaugeStatus.color, lineHeight: 1.15, marginBottom: 10 }}>
              System {gaugeStatus.word}
            </div>
            <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.5 }}>
              Realny rachunek: <strong style={{ color: T.text }}>{costText}</strong> rocznie na tym, co ma wracać.
            </div>
          </div>
        </section>

        {/* ── MAPA PĘKNIĘCIA TYGODNIA (sygnatura) ── */}
        <section style={{ padding: '30px 0 10px' }}>
          <h2 style={{ fontFamily: T.serif, fontWeight: 400, fontSize: 22, color: '#fff', margin: '0 0 4px' }}>Gdzie pęka Twój tydzień</h2>
          <p style={{ fontSize: 13.5, color: T.muted, margin: '0 0 22px', lineHeight: 1.5 }}>
            Problem rzadko zaczyna się tam, gdzie go widzisz.
          </p>
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, position: 'relative' }}>
            {stages.map((s, i) => {
              const isMis = i === 2;
              return (
                <li key={i} style={{ display: 'grid', gridTemplateColumns: '26px minmax(0,1fr)', gap: 14, paddingBottom: i < stages.length - 1 ? 22 : 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ width: 13, height: 13, borderRadius: '50%', background: isMis ? T.bad : T.gold, boxShadow: `0 0 0 4px ${isMis ? 'rgba(207,106,75,0.15)' : T.goldSoft}`, flexShrink: 0 }} />
                    {i < stages.length - 1 && <span style={{ width: 2, flex: 1, marginTop: 4, background: `linear-gradient(${T.lineStrong}, ${T.line})` }} />}
                  </div>
                  <div style={{ paddingTop: -2 }}>
                    <div style={{ fontFamily: T.mono, fontSize: 9.5, letterSpacing: 1.5, textTransform: 'uppercase', color: isMis ? T.bad : T.faint, fontWeight: 700, marginBottom: 4 }}>{s.tag}</div>
                    <div style={{ fontSize: 15.5, color: isMis ? T.text : T.text, lineHeight: 1.4, fontWeight: isMis ? 600 : 400 }}>{s.text}</div>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {/* ── 6 OBSZARÓW ── */}
        <section style={{ padding: '30px 0 6px' }}>
          <h2 style={{ fontFamily: T.serif, fontWeight: 400, fontSize: 22, color: '#fff', margin: '0 0 20px' }}>Sześć obszarów, od najsłabszego</h2>
          {sorted.map((d) => {
            const st = statusOf(d.pct);
            return (
              <div key={d.label} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <span style={{ fontSize: 14.5, color: T.text, fontWeight: 500 }}>{d.label}</span>
                  <span style={{ fontFamily: T.mono, fontSize: 11.5, color: st.color }}>{st.word} · {d.pct}</span>
                </div>
                <div style={{ width: '100%', height: 7, borderRadius: 4, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.max(d.pct, 3)}%`, background: st.color, borderRadius: 4, transition: 'width 0.7s ease' }} />
                </div>
              </div>
            );
          })}
        </section>

        {/* ── LUSTRO: to jest Ty ── */}
        <section style={{ padding: '30px 22px', background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 18, margin: '18px 0' }}>
          <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: T.gold, fontWeight: 700, marginBottom: 12 }}>Brzmi znajomo?</div>
          <p style={{ fontFamily: T.serif, fontSize: 18, lineHeight: 1.55, color: T.text, margin: 0 }}>
            {archetypeMirror}
          </p>
        </section>

        {/* ── PROWADZENIE 1:1: pełne CTA ── */}
        <section style={{ padding: '34px 24px', background: `linear-gradient(160deg, ${T.surface}, ${T.ink})`, border: `1px solid ${T.gold}44`, borderRadius: 20, marginTop: 18, textAlign: 'center' }}>
          <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: T.gold, fontWeight: 700, marginBottom: 14 }}>Następny krok</div>
          <h2 style={{ fontFamily: T.serif, fontWeight: 400, fontSize: 25, lineHeight: 1.25, color: '#fff', margin: '0 0 12px' }}>
            Ktoś ułoży to pod Twój tydzień i rozliczy Cię z niego
          </h2>
          <p style={{ fontSize: 14.5, color: T.muted, lineHeight: 1.55, margin: '0 auto 24px', maxWidth: 400 }}>
            Diagnoza pokazała gdzie pęka. Prowadzenie 1:1 to naprawa dokładnie tego jednego dominia, nie kolejna porcja teorii.
          </p>
          <a href={naborHref} target="_blank" rel="noopener noreferrer"
             style={{ display: 'inline-block', padding: '16px 34px', borderRadius: 14, background: `linear-gradient(135deg, ${T.gold}, #a2863b)`, color: T.ink, fontWeight: 800, fontSize: 15, letterSpacing: 0.4, textTransform: 'uppercase', textDecoration: 'none' }}>
            Zobacz prowadzenie 1:1 &rarr;
          </a>
          {onSaveCard && (
            <button onClick={onSaveCard} style={{ display: 'block', margin: '16px auto 0', background: 'none', border: 'none', color: T.faint, fontSize: 12.5, cursor: 'pointer', fontFamily: T.sans }}>
              albo zapisz tę kartę na maila
            </button>
          )}
        </section>

      </div>
    </div>
  );
}
