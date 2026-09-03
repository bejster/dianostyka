// analytics.ts — cienki wrapper na PostHog (ladowany snippetem w layout.tsx).
// Bez klucza NEXT_PUBLIC_POSTHOG_KEY window.posthog nie istnieje i track() jest no-opem,
// wiec instrumentacja moze byc w kodzie na produkcji, zanim Michal wklei klucz.

import { ASSESSMENT_VERSION } from './assessment-config';

type Props = Record<string, unknown>;

interface PosthogLike {
  capture?: (event: string, props?: Props) => void;
  identify?: (id: string, props?: Props) => void;
  register?: (props: Props) => void;
}

function ph(): PosthogLike | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { posthog?: PosthogLike }).posthog;
}

export function track(event: string, props?: Props): void {
  try {
    ph()?.capture?.(event, props);
  } catch {
    // cisza: analityka nigdy nie moze wywrocic flow
  }
}

// Event diagnostyki: wstrzykuje `version` z JEDNEGO centralnego zrodla (ASSESSMENT_VERSION),
// zeby moc porownac 2.5.0 vs 2.5.1 bez mieszania danych. Uzywaj do wszystkich eventow diagnostyki.
export function trackDiag(event: string, props?: Props): void {
  track(event, { version: ASSESSMENT_VERSION, ...props });
}

// P1-1 (rc-003): rejestruje NIE-PII kontekst atrybucji settera (src/lane/campaign/mode) jako super-properties.
// Dołączane do wszystkich kolejnych eventów. WYŁĄCZNIE atrybucja — NIGDY nie wpływa na severity/archetyp/tier/wynik/fast-fit.
export function registerContext(props: Props): void {
  try { ph()?.register?.(props); } catch { /* cisza: atrybucja nigdy nie wywraca flow */ }
}

// Podpina sesje (wszystkie kroki + nagranie) pod handle IG -> w PostHog widzisz lejek konkretnego leada.
export function identify(handle: string, props?: Props): void {
  try {
    const h = (handle || '').replace(/[@\s]/g, '');
    if (h.length >= 2) ph()?.identify?.('ig:' + h.toLowerCase(), { instagram: '@' + h, ...props });
  } catch {
    // cisza
  }
}
