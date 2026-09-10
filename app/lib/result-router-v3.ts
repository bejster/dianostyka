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

const NABOR_LABEL_PROWADZ = 'Zobacz prowadzenie 1:1';
const NABOR_LABEL_ZOBACZ = 'Zobacz prowadzenie 1:1';

export function routeDecision(intentRaw: string, startWhenRaw: string): RouteDecision {
  const intent = intentRaw as Intent;
  const sw = startWhenRaw as StartWhen;
  const near = sw === 'sw_7dni' || sw === 'sw_30dni';
  if (intent === 'in_prowadz') return { primary: 'nabor', primaryKicker: near ? 'Chcesz ruszyć z tym teraz?' : 'Chcesz, żeby ktoś poprowadził ten proces z Tobą?', primaryLabel: NABOR_LABEL_PROWADZ, primaryNote: 'Na następnej stronie zobaczysz zakres, sposób pracy i warunki. Kontekst z tej diagnostyki już mam.' };
  if (intent === 'in_zobacz') return { primary: 'nabor', primaryKicker: 'Chcesz zobaczyć, co zrobiłbym dalej?', primaryLabel: NABOR_LABEL_ZOBACZ, primaryNote: 'Pokażę Ci zakres prowadzenia, sposób pracy i warunki. Sam zdecydujesz, czy ten poziom wsparcia jest Ci potrzebny.' };
  if (intent === 'in_sam') return { primary: 'experiment', primaryKicker: 'Najpierw sprawdź wynik w praktyce.', primaryLabel: 'Biorę test 72h', primaryNote: 'Przez trzy dni obserwuj jedno miejsce. Jeśli wzorzec się powtórzy, masz konkretny punkt do pracy.' };
  if (near) return { primary: 'nabor', primaryKicker: 'Masz już wynik. Zobacz, jak wyglądałby następny krok.', primaryLabel: NABOR_LABEL_ZOBACZ, primaryNote: 'Na następnej stronie zobaczysz, co obejmuje prowadzenie i jak wygląda praca z takim wynikiem.' };
  return { primary: 'experiment', primaryKicker: 'Na dziś wystarczy jeden test.', primaryLabel: 'Biorę test 72h', primaryNote: 'Sprawdź tę hipotezę w swoim normalnym tygodniu. Jeśli będziesz chciał pójść dalej, prowadzenie masz jako drugi krok.', secondaryNabor: { label: NABOR_LABEL_ZOBACZ, prominence: 'soft' } };
}
