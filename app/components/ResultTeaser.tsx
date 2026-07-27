'use client';

// ResultTeaser.tsx, Wynik widoczny PRZED mailem (spec §10/§12).
// Pokazuje: Odporność Tygodnia, profil, główne domino, kluczowe odkrycie,
// 6 domen (mini-wizualizacja) i pierwszy ruch. CTA prowadzi do pełnego raportu.

import React from 'react';
import type { ScoringResult, DomainScore } from '../lib/scoring-engine';
import type { DomainKey } from '../lib/assessment-config';

interface Props {
  result: ScoringResult;
  onWantFullReport: () => void;
}

const GOLD = '#c8a84e';
const BG = '#0e0e0e';

// Status słowny bez języka medycznego ("krytyczny" zakazany w quizie objawowym)
function resilienceWord(score: number): { word: string; color: string } {
  if (score >= 70) return { word: 'Odporny', color: '#6bbf7b' };
  if (score >= 48) return { word: 'Chwiejny', color: GOLD };
  return { word: 'Kruchy', color: '#d98a5b' };
}

// Pierwszy ruch zależny od głównego domina, konkretny, osadzony w czasie, bez pustych porad
const FIRST_MOVE: Record<DomainKey, string> = {
  sleep: 'Dziś ustaw jedną godzinę gaszenia ekranu: 30 minut przed snem telefon ląduje poza zasięgiem ręki.',
  energy: 'Jutro rano zablokuj pierwsze 90 minut na jedno ważne zadanie, zanim wejdą maile i telefony.',
  nutrition: 'Dołóż 30 g białka do śniadania. Wieczorny głód zwykle zaczyna się od niedojedzonego poranka.',
  weekend: 'W ten weekend trzymaj godzinę pobudki w granicy 60 minut wobec dni roboczych.',
  training: 'Zdefiniuj wersję minimum treningu: 20 minut, które zrobisz nawet w najgorszy dzień.',
  chaos: 'Zapisz jedną procedurę powrotu: co dokładnie robisz następnego dnia po odchyleniu, bez czekania na poniedziałek.',
};

function DomainBar({ d }: { d: DomainScore }) {
  const barColor = d.status === 'w_normie' ? '#6bbf7b' : d.status === 'granica' ? GOLD : '#d98a5b';
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
        <span style={{ fontSize: 13.5, color: '#ddd', fontWeight: 500 }}>{d.shortLabel}</span>
        <span style={{ fontFamily: 'monospace', fontSize: 12, color: barColor, fontVariantNumeric: 'tabular-nums' }}>{d.score}</span>
      </div>
      <div style={{ width: '100%', height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${d.score}%`, background: barColor, borderRadius: 3, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

export default function ResultTeaser({ result, onWantFullReport }: Props) {
  const { overallScore, profile, primaryLever, sortedDomains, breakWindowText } = result;
  const status = resilienceWord(overallScore);
  const circumference = 2 * Math.PI * 52;
  const dash = (overallScore / 100) * circumference;

  return (
    <div style={{ minHeight: '100vh', background: BG, color: '#f0f0f0', fontFamily: '"Inter", sans-serif' }}>
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '40px 20px 120px', boxSizing: 'border-box' }}>

        {/* Eyebrow */}
        <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: GOLD, fontWeight: 700, marginBottom: 18 }}>
          Twój wynik &middot; Profil {profile.code}
        </div>

        {/* Score ring + Odporność Tygodnia */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginBottom: 28 }}>
          <svg width="128" height="128" viewBox="0 0 128 128" style={{ flexShrink: 0 }} aria-hidden="true">
            <circle cx="64" cy="64" r="52" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
            <circle
              cx="64" cy="64" r="52" fill="none" stroke={status.color} strokeWidth="10" strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference}`} transform="rotate(-90 64 64)"
            />
            <text x="64" y="60" textAnchor="middle" fontFamily="monospace" fontSize="34" fontWeight="900" fill="#fff">{overallScore}</text>
            <text x="64" y="82" textAnchor="middle" fontFamily="monospace" fontSize="10" fill="#888">/ 100</text>
          </svg>
          <div>
            <div style={{ fontSize: 13, color: '#999', marginBottom: 4 }}>Odporność Twojego Tygodnia</div>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: 30, fontWeight: 400, color: status.color, lineHeight: 1.1 }}>{status.word}</div>
          </div>
        </div>

        {/* Profil, nazwa + tagline (kluczowe odkrycie) */}
        <div style={{ marginBottom: 26 }}>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(26px, 6.4vw, 34px)', fontWeight: 400, lineHeight: 1.2, color: '#fff', marginBottom: 12, letterSpacing: '-0.01em' }}>
            {profile.title}
          </h1>
          <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 18, lineHeight: 1.4, color: GOLD, margin: 0 }}>
            {profile.tagline}
          </p>
        </div>

        {/* Główne domino */}
        <div style={{ background: 'rgba(200,168,78,0.06)', border: `1px solid rgba(200,168,78,0.22)`, borderRadius: 16, padding: '20px 22px', marginBottom: 24 }}>
          <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: GOLD, fontWeight: 700, marginBottom: 10 }}>
            Główne domino
          </div>
          <div style={{ fontSize: 16.5, fontWeight: 600, color: '#fff', marginBottom: 8, lineHeight: 1.35 }}>
            {primaryLever.headline}
          </div>
          <p style={{ fontSize: 14.5, color: '#bbb', lineHeight: 1.55, margin: 0 }}>
            {profile.coreInsight}
          </p>
          <div style={{ marginTop: 12, fontSize: 13.5, color: '#999' }}>
            Twój tydzień zaczyna pękać <strong style={{ color: '#ddd' }}>{breakWindowText}</strong>.
          </div>
        </div>

        {/* 6 domen, mini-wizualizacja (od najsłabszej) */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#888', fontWeight: 700, marginBottom: 14 }}>
            Sześć obszarów tygodnia
          </div>
          {sortedDomains.map(d => <DomainBar key={d.domainKey} d={d} />)}
        </div>

        {/* Pierwszy ruch */}
        <div style={{ borderLeft: `2px solid ${GOLD}`, paddingLeft: 16, marginBottom: 34 }}>
          <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: GOLD, fontWeight: 700, marginBottom: 8 }}>
            Pierwszy ruch
          </div>
          <p style={{ fontSize: 15.5, color: '#eee', lineHeight: 1.5, margin: 0 }}>
            {FIRST_MOVE[primaryLever.domainKey]}
          </p>
        </div>

        {/* CTA do pełnego raportu (email gate w kolejnym kroku) */}
        <button
          onClick={onWantFullReport}
          style={{
            width: '100%', padding: '17px 24px', borderRadius: 14, border: 'none', cursor: 'pointer',
            background: `linear-gradient(135deg, ${GOLD}, #8a7535)`, color: BG,
            fontWeight: 800, fontSize: 15, letterSpacing: 0.5, textTransform: 'uppercase',
          }}
        >
          Odbierz pełną mapę tygodnia i plan na 14 dni &rarr;
        </button>
        <div style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: 11, color: '#666', marginTop: 12 }}>
          Wynik główny widzisz już teraz. Pełny raport i PDF wysyłamy na maila.
        </div>
      </div>
    </div>
  );
}
