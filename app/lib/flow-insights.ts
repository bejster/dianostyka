import { QUESTIONS } from './assessment-config.ts';

// Mikro-wyjaśnienia wykorzystują tylko wcześniejsze, jawne odpowiedzi.
// Nie diagnozują przyczyny, nie zmieniają scoringu ani nie dodają pytań.
export interface FlowInsight {
  kicker: string;
  title: string;
  evidence: string;
  explanation: string;
}

function answerLabel(questionId: string, answer: unknown): string | null {
  if (typeof answer !== 'string') return null;
  const question = QUESTIONS.find((q) => q.id === questionId);
  return question?.options?.find((o) => o.id === answer)?.label ?? null;
}

const BREAK_MOMENT: Record<string, string> = {
  bw_morning: 'rano',
  bw_midday: 'przed obiadem',
  bw_afternoon: 'po 14',
  bw_afterwork: 'po pracy',
  bw_evening: 'wieczorem',
  bw_weekend: 'przy wejściu w weekend',
  bw_varies: 'bez jednej stałej pory',
};

export function buildFlowInsight(questionId: string, answers: Record<string, unknown>): FlowInsight | null {
  if (questionId === 'monday_recovery') {
    const previous = answerLabel('weekend_pattern', answers.weekend_pattern);
    if (!previous) return null;
    return {
      kicker: 'PIERWSZA RZECZ, KTÓRĄ ROZDZIELAM',
      title: 'Weekend i czas powrotu to dwie różne informacje.',
      evidence: `Zaznaczyłeś: „${previous}”`,
      explanation: 'Teraz sprawdzamy, kiedy wracasz do zwykłego poziomu. Nie będę z góry liczył soboty i niedzieli jako straconych dni.',
    };
  }

  if (questionId === 'good_day') {
    const moment = typeof answers.break_window === 'string' ? BREAK_MOMENT[answers.break_window] : undefined;
    if (!moment) return null;
    return {
      kicker: 'TU ZACZYNA SIĘ ANALIZA',
      title: moment === 'bez jednej stałej pory'
        ? 'Nie masz jednego stałego momentu spadku.'
        : `Pierwszy gorszy moment wskazałeś: ${moment}.`,
      evidence: 'To Twoja odpowiedź, nie ustalona przyczyna.',
      explanation: 'Teraz porównamy ją z lepszym dniem. Bez takiego porównania łatwo pomylić moment, kiedy coś zauważasz, z tym, co problem wywołuje.',
    };
  }

  if (questionId === 'intent') {
    const previous = answerLabel('give_up_point', answers.give_up_point);
    if (!previous) return null;
    return {
      kicker: 'Z TEGO ZROBIMY KONKRET',
      title: 'Wiemy, w jakiej sytuacji najłatwiej odpuszczasz.',
      evidence: `Twoja odpowiedź: „${previous}”`,
      explanation: 'To jeszcze nie wyjaśnia, dlaczego tak się dzieje. W wyniku dostaniesz jeden trop i sprawdzalny ruch na 72 godziny.',
    };
  }

  return null;
}


// Pierwsza wartość dla wejścia po follow. Wykorzystujemy wyłącznie istniejące ID
// odpowiedzi. To obserwacja, NIE wynik diagnostyki ani dodatkowy model scoringowy.
export function buildFollowEarlyObservation(answers: Record<string, unknown>): FlowInsight | null {
  const weekend = answers.weekend_pattern;
  const monday = answers.monday_recovery;
  const goal = answers.primary_goal;
  const weekendNames: Record<string, string> = {
    wp_same: 'podobny rytm w weekend', wp_slight: 'trochę luźniejszy weekend',
    wp_shifted: 'wyraźnie inny weekend', wp_reset: 'weekend zupełnie poza rytmem',
  };
  const mondayNames: Record<string, string> = {
    mon_0: 'zwykły poziom w poniedziałek', mon_1: 'rozruch do południa',
    mon_2: 'powrót dopiero we wtorek', mon_3: 'powrót w środę lub później',
  };
  if (typeof weekend !== 'string' || typeof monday !== 'string' || typeof goal !== 'string') return null;
  if (!weekendNames[weekend] || !mondayNames[monday] || !answerLabel('primary_goal', goal)) return null;
  const largeShift = weekend === 'wp_shifted' || weekend === 'wp_reset';
  const slowReturn = monday === 'mon_2' || monday === 'mon_3';
  const title = largeShift && slowReturn ? 'Weekend się zmienia, a powrót trwa dłużej.'
    : largeShift ? 'Weekend wygląda inaczej, ale powrót jest dość szybki.'
    : slowReturn ? 'Powrót trwa dłużej, chociaż weekend nie zmienia się mocno.'
    : 'Na razie weekend nie wygląda na główną przeszkodę.';
  return {
    kicker: 'PIERWSZY ODCZYT · 3 ODPOWIEDZI',
    title,
    evidence: 'Zaznaczyłeś: ' + weekendNames[weekend] + ' oraz ' + mondayNames[monday] + '.',
    explanation: 'To obserwacja, nie przyczyna. Teraz sprawdzimy jedzenie, sen, pracę i trening. Nie musisz niczego wpisywać drugi raz.',
  };
}
