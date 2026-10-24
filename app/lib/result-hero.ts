import type { DecisionResult } from './decision-engine';

// Pierwsze 5 sekund wyniku: osobista kontrteza, a nie kolejny generyczny naglowek.
// To sa hipotezy z odpowiedzi, nie diagnozy medyczne ani dowod przyczynowosci.
export type ResultHero = { headline: string; explanation: string };

type WeakestArea = { label: string; reason: string };

export function buildResultHero(
  decision: DecisionResult | undefined,
  weakest: WeakestArea | undefined,
  hasRoom: boolean,
): ResultHero {
  if (!decision) {
    return {
      headline: 'Dobra. Zobaczmy, co faktycznie wyszło z Twojego tygodnia.',
      explanation: 'Nie będziemy zgadywać na podstawie jednego słabego dnia. Niżej masz odpowiedzi, od których warto zacząć.',
    };
  }

  const { prediction, upstream_candidate: upstream, confidence, prediction_gap: gap } = decision;
  const firstSignal = `Pierwsze pogorszenie zaznaczyłeś: ${decision.early_signal}.`;
  const evidence = weakest
    ? ` W obszarze „${weakest.label}” z Twoich odpowiedzi wychodzi: ${weakest.reason}.`
    : '';
  const check = 'To trop do sprawdzenia przez 72 godziny, nie pewna przyczyna.';
  const candidate = upstream.label;

  if (prediction.lever === 'hormony' || gap.type === 'boundary') {
    return {
      headline: 'Obstawiałeś hormony. Tego z ankiety nie zmierzę.',
      explanation: `Mogę za to sprawdzić, czy w Twoim tygodniu powtarza się wzorzec związany z ${candidate}. ${firstSignal} ${check}`,
    };
  }
  if (!upstream.resolved || confidence.state === 'za_malo') {
    return {
      headline: 'Nie mam tu jednego pewnego winnego. I nie będę go wymyślał.',
      explanation: `${firstSignal} Odpowiedzi dają więcej niż jeden trop. Zamiast wciskać Ci diagnozę, zacznę od jednego prostego testu. ${check}`,
    };
  }
  if (!hasRoom) {
    return {
      headline: 'Tu nic się nie wali. Ale jest jedna rzecz, którą bym sprawdził.',
      explanation: `${firstSignal}${evidence} Chcę zobaczyć, czy ruch w obszarze „${candidate}” coś zmieni, zanim będziesz cokolwiek dokładał.`,
    };
  }
  if (gap.type === 'miss' || gap.type === 'upstream') {
    return {
      headline: `Obstawiałeś ${prediction.label}. Ja bym najpierw sprawdził ${candidate}.`,
      explanation: `${firstSignal}${evidence} Możliwe, że patrzysz na skutek zamiast na miejsce, w którym tydzień zaczyna się sypać. ${check}`,
    };
  }
  if (gap.type === 'deeper') {
    return {
      headline: `Obstawiałeś ${prediction.label}. To może być nawet krok wcześniej.`,
      explanation: `${firstSignal}${evidence} Twoje podejrzenie i wynik nie muszą się wykluczać. Zacznijmy od ${candidate} i sprawdźmy, co ruszy.`,
    };
  }
  if (gap.type === 'match') {
    return {
      headline: `Obstawiałeś ${prediction.label}. Odpowiedzi też tam prowadzą.`,
      explanation: `${firstSignal}${evidence} Ale zgodność odpowiedzi nie dowodzi przyczyny. Teraz trzeba sprawdzić, czy zmiana w tym miejscu poruszy resztę.`,
    };
  }

  return {
    headline: `Sam nie byłeś pewny. Ja bym sprawdził ${candidate}.`,
    explanation: `${firstSignal}${evidence} Nie ruszałbym pięciu rzeczy naraz. Jeden test na 72 godziny pokaże, czy ten trop w ogóle ma sens.`,
  };
}
