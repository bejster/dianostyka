import { QUESTIONS } from './assessment-config';

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
