import type { Metadata } from 'next';
import WeekPage from '../../components/WeekPage';
import { buildWeekPlan, type WeekPlanInput } from '../../lib/week-plan';

// ── PODGLĄD KALIBRACYJNY: /w/preview?p=1..5 renderuje stronę tygodnia per archetyp ──
// Tylko do lokalnej oceny głosu i układu. Noindex. Nie jest to ścieżka produkcyjna.
export const metadata: Metadata = { robots: { index: false } };

type SP = Promise<Record<string, string | string[] | undefined>>;

const PROFILES: Record<string, { input: WeekPlanInput; imie: string }> = {
  '1': {
    imie: 'Kamil',
    input: {
      archetypeKey: 'wiedza_bez_wdrozenia',
      archetypeLabel: 'Wiem wszystko, nie dowożę',
      archetypeTagline: 'Teorię znasz lepiej niż połowa trenerów. Po ciele tego nie widać.',
      worstCat: 'Trening', breakWindow: 6, score: 52, costTotal: 5400, wknd: 1,
      miss: 1, protein: 1,
    },
  },
  '2': {
    imie: '',
    input: {
      archetypeKey: 'weekend_reset',
      archetypeLabel: 'Weekend cofa mnie do zera',
      archetypeTagline: 'Pięć dni budujesz. Dwa dni kasujesz.',
      worstCat: 'Weekend', breakWindow: 5, score: 66, costTotal: 8200, wknd: 4,
      drinks: 12, junk: 400,
    },
  },
  '3': {
    imie: 'Michał',
    input: {
      archetypeKey: 'glowa_zajezdza',
      archetypeLabel: 'Głowa zajeżdża ciało',
      archetypeTagline: 'Problem nie zaczyna się na talerzu. Zaczyna się w głowie o 22:00.',
      worstCat: 'Stres', breakWindow: 4, score: 71, costTotal: 6600, wknd: 1,
      sleep: 5.5, screenBed: 3,
    },
  },
  '4': {
    imie: 'Bartek',
    input: {
      archetypeKey: 'wieczorny_odpad',
      archetypeLabel: 'Dzień na kredycie',
      archetypeTagline: 'W dzień masz kontrolę. Wieczorem organizm odbiera dług.',
      worstCat: 'Żywienie', breakWindow: 4, score: 50, costTotal: 6000, wknd: 2,
      binge: 3, junk: 500, screenBed: 3,
    },
  },
  '5': {
    imie: '',
    input: {
      archetypeKey: 'silnik_bez_paliwa',
      archetypeLabel: 'Silnik bez paliwa',
      archetypeTagline: 'Niby wszystko robisz. Niby nic nie działa.',
      worstCat: 'Sen', breakWindow: 6, score: 34, costTotal: 2400, wknd: 1,
      sleep: 7,
    },
  },
};

export default async function Preview({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const key = (typeof sp.p === 'string' ? sp.p : '4');
  const profile = PROFILES[key] || PROFILES['4'];
  const plan = buildWeekPlan(profile.input);
  return (
    <>
      <div style={{ background: '#131313', color: '#8a857a', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, padding: '8px 16px', display: 'flex', gap: 14, flexWrap: 'wrap', borderBottom: '1px solid #222' }}>
        <span style={{ color: '#c8a84e', fontWeight: 700 }}>PODGLĄD</span>
        {Object.keys(PROFILES).map(k => (
          <a key={k} href={`?p=${k}`} style={{ color: k === key ? '#fff' : '#8a857a', textDecoration: 'none' }}>
            {k}. {PROFILES[k].input.archetypeLabel}
          </a>
        ))}
      </div>
      <WeekPage plan={plan} imie={profile.imie} />
    </>
  );
}
