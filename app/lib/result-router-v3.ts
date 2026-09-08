// ── RESULT PAGE V3 — ROUTER, authoritative 16-combo matrix (frozen spec, Michal 2026-09-08) ──
// severity/archetyp/score NIGDY nie zmieniaja destination. Tylko intent x start_when.
export type Intent = 'in_prowadz' | 'in_zobacz' | 'in_sam' | 'in_niewiem';
export type StartWhen = 'sw_7dni' | 'sw_30dni' | 'sw_kwartal' | 'sw_sprawdzam';
export type RouteDestination = 'dm' | 'nabor' | 'experiment';

export interface RouteDecision {
  primary: RouteDestination;
  primaryKicker: string;
  primaryLabel: string;
  secondaryNabor?: { label: string; prominence: 'prominent' | 'soft' };
  hotEarlyCta: boolean; // in_prowadz + sw_7dni/sw_30dni: CTA moze pojawic sie wczesniej, po payoffie/method-demo
}

const NABOR_LABEL_PROWADZ = 'Zobacz, jak wygląda prowadzenie';
const NABOR_LABEL_ZOBACZ = 'Zobacz, jak pracuję';

export function routeDecision(intentRaw: string, startWhenRaw: string): RouteDecision {
  const intent = intentRaw as Intent;
  const sw = startWhenRaw as StartWhen;
  const highReadiness = intent === 'in_prowadz' && (sw === 'sw_7dni' || sw === 'sw_30dni');

  if (highReadiness) {
    return { primary: 'dm', primaryKicker: 'Napisałeś, że chcesz prowadzenia', primaryLabel: 'Chcę ruszyć z prowadzeniem', hotEarlyCta: true };
  }
  if (intent === 'in_prowadz') { // sw_kwartal / sw_sprawdzam
    return { primary: 'nabor', primaryKicker: 'Napisałeś, że wolisz prowadzenie', primaryLabel: NABOR_LABEL_PROWADZ, hotEarlyCta: false };
  }
  if (intent === 'in_zobacz') {
    if (sw === 'sw_7dni' || sw === 'sw_30dni') {
      return { primary: 'nabor', primaryKicker: 'Chciałeś zobaczyć, jak wygląda praca z kimś', primaryLabel: NABOR_LABEL_ZOBACZ, hotEarlyCta: false };
    }
    return {
      primary: 'experiment', primaryKicker: 'Chciałeś zobaczyć, jak to wygląda', primaryLabel: 'Robię ten test',
      secondaryNabor: { label: NABOR_LABEL_ZOBACZ, prominence: 'soft' }, hotEarlyCta: false,
    };
  }
  if (intent === 'in_sam') {
    return {
      primary: 'experiment', primaryKicker: 'Chcesz ograć to sam', primaryLabel: 'Robię ten test',
      secondaryNabor: { label: 'Zobacz prowadzenie na później', prominence: 'soft' }, hotEarlyCta: false,
    };
  }
  // in_niewiem (i kazdy inny/pusty intent -> bezpieczny fallback: eksperyment, zero DM)
  const prominentDays = sw === 'sw_7dni' || sw === 'sw_30dni';
  return {
    primary: 'experiment', primaryKicker: 'Na dziś masz jeden test', primaryLabel: 'Robię ten test',
    secondaryNabor: { label: NABOR_LABEL_ZOBACZ, prominence: prominentDays ? 'prominent' : 'soft' }, hotEarlyCta: false,
  };
}
