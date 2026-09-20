import { answerLabel, type Answers } from './decision-diagnostic.ts';

export const JOURNEY_STAGES = ['Twój tydzień', 'Co było wcześniej', 'Twój krok'];

export function journeyStage(questionId: string): number {
  if (['why', 'goal', 'scene'].includes(questionId)) return 0;
  return ['protect', 'impact'].includes(questionId) ? 2 : 1;
}

export function questionContext(answers: Answers, questionId: string): { label: string; quote: string } | undefined {
  const id = questionId === 'context' ? 'before'
    : ['before', 'previous', 'anchor'].includes(questionId) ? 'scene'
    : questionId === 'attempt' ? 'previous' : undefined;
  if (!id || answers[id] === undefined || answers[id] === 'unknown') return;
  const quote = answerLabel(answers, id);
  if (quote === 'Brak odpowiedzi') return;
  return { label: id === 'previous' ? 'Twoja poprzednia próba' : id === 'before' ? 'Chodzi o ten moment' : 'Wybrałeś tę sytuację', quote };
}

export function journeyCue(questionId: string, remaining?: number): string {
  if (remaining === 1) return 'Ostatnia odpowiedź. Potem zobaczysz swój wynik.';
  if (remaining === 2) return 'Jeszcze dwie odpowiedzi.';
  if (questionId === 'scene') return ''; 
  if (questionId === 'context') return ''; 
  if (questionId === 'attempt') return ''; 
  return '';
}

// Only one choice can advance the question. Cancelling also invalidates a queued callback.
// The scheduler is injected so rapid input and leaving the flow can be tested without a browser.
export function createChoiceGate(schedule: (finish: () => void, delay: number) => () => void) {
  let busy = false;
  let generation = 0;
  let cancelTimer: (() => void) | undefined;
  return {
    choose(run: () => void, delay: number): boolean {
      if (busy) return false;
      busy = true;
      const current = ++generation;
      cancelTimer = schedule(() => {
        if (current !== generation) return;
        cancelTimer = undefined;
        busy = false;
        run();
      }, delay);
      return true;
    },
    cancel() {
      generation++;
      cancelTimer?.();
      cancelTimer = undefined;
      busy = false;
    },
  };
}
