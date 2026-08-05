// analytics.ts — cienki wrapper na PostHog (ladowany snippetem w layout.tsx).
// Bez klucza NEXT_PUBLIC_POSTHOG_KEY window.posthog nie istnieje i track() jest no-opem,
// wiec instrumentacja moze byc w kodzie na produkcji, zanim Michal wklei klucz.

type Props = Record<string, unknown>;

interface PosthogLike {
  capture?: (event: string, props?: Props) => void;
  identify?: (id: string, props?: Props) => void;
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

// Podpina sesje (wszystkie kroki + nagranie) pod handle IG -> w PostHog widzisz lejek konkretnego leada.
export function identify(handle: string, props?: Props): void {
  try {
    const h = (handle || '').replace(/[@\s]/g, '');
    if (h.length >= 2) ph()?.identify?.('ig:' + h.toLowerCase(), { instagram: '@' + h, ...props });
  } catch {
    // cisza
  }
}
