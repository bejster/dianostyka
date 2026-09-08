// ── RESULT PAGE V3 — ROUTER, authoritative 16-combo matrix (frozen spec, Michal 2026-09-08) ──
// severity/archetyp/score NIGDY nie zmieniaja destination. Tylko intent x start_when.
export type Intent = 'in_prowadz' | 'in_zobacz' | 'in_sam' | 'in_niewiem';
export type StartWhen = 'sw_7dni' | 'sw_30dni' | 'sw_kwartal' | 'sw_sprawdzam';
export type RouteDestination = 'nabor' | 'experiment';

export interface RouteDecision {
  primary: RouteDestination;
  primaryKicker: string;
  primaryLabel: string;
  primaryNote: string;
  secondaryNabor?: { label: string; prominence: 'prominent' | 'soft' };
}

const NABOR_LABEL_PROWADZ = 'Zobacz, jak wygląda prowadzenie';
const NABOR_LABEL_ZOBACZ = 'Zobacz, jak pracuję';

export function routeDecision(intentRaw: string, startWhenRaw: string): RouteDecision {
  const intent = intentRaw as Intent;
  const sw = startWhenRaw as StartWhen;
  const near = sw === 'sw_7dni' || sw === 'sw_30dni';
  if (intent === 'in_prowadz') return { primary: 'nabor', primaryKicker: near ? 'Chcesz prowadzenia i temat jest na teraz' : 'Chcesz prowadzenia', primaryLabel: NABOR_LABEL_PROWADZ, primaryNote: 'Zobacz zakres, sposób pracy i warunki. Ja mam już Twój wynik, więc nie musisz pisać pierwszej wiadomości.' };
  if (intent === 'in_zobacz') return { primary: 'nabor', primaryKicker: near ? 'Chcesz zobaczyć pomoc i myślisz o niej teraz' : 'Chcesz zobaczyć, jak wygląda pomoc', primaryLabel: NABOR_LABEL_ZOBACZ, primaryNote: 'Tu zobaczysz, co robię dalej z takim wynikiem, ile to kosztuje i dla kogo ma sens.' };
  if (intent === 'in_sam') return { primary: 'experiment', primaryKicker: 'Chcesz najpierw ograć to sam', primaryLabel: 'Biorę test 72h', primaryNote: 'Zatwierdź test i przez trzy dni sprawdź, czy Punkt Pęknięcia naprawdę się powtarza.' };
  if (near) return { primary: 'nabor', primaryKicker: 'Nie wiesz jeszcze, czego potrzebujesz, ale temat jest na teraz', primaryLabel: NABOR_LABEL_ZOBACZ, primaryNote: 'Zobacz prowadzenie i sam oceń, czy ten poziom wsparcia jest Ci potrzebny.' };
  return { primary: 'experiment', primaryKicker: 'Na dziś masz jeden konkretny ruch', primaryLabel: 'Biorę test 72h', primaryNote: 'Zatwierdź test i sprawdź hipotezę w normalnym tygodniu.', secondaryNabor: { label: NABOR_LABEL_ZOBACZ, prominence: 'soft' } };
}
