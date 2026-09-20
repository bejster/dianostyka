import type { Answers, DecisionResult } from './decision-diagnostic';

export type Refinement = { id: string; label: string; title: string; action: string; observe: string; canTry: boolean };

// These are follow-up choices, not replacements for the visitor's original answers.
// No model-generated recommendations and no new health interpretations.
export function refinementOptions(a: Answers, r: DecisionResult, reaction: string): Refinement[] {
  if (reaction === 'off') return [];
  if (reaction === 'obvious') return [
    { id: 'tried_helped', label: 'Robiłem to i pomagało.', title: 'Co się zmieniło od czasu, kiedy to działało?', action: 'Skoro ten sposób już pomagał, nie dokładaj nowej rady. Zapisz, co było wtedy możliwe i czego dziś brakuje, żeby do tego wrócić.', observe: 'Czy nadal masz warunki, w których ten sposób działał?', canTry: false },
    { id: 'tried_unchanged', label: 'Robiłem to, ale bez różnicy.', title: 'Najpierw sprawdź, co właściwie testowałeś.', action: 'Zapisz, co robiłeś, ile razy i po czym oceniałeś zmianę. Bez tego kolejna rada byłaby zgadywaniem.', observe: 'Czy za każdym razem sprawdzałeś to w podobnych warunkach?', canTry: false },
    { id: 'tried_blocked', label: 'Próbowałem, ale nie udało się tego zrobić.', title: 'Na czym dokładnie zatrzymała się próba?', action: `Przy kroku „${r.experiment.title}” coś zatrzymało wykonanie. Wróć do ostatniego momentu, w którym plan był jeszcze wykonalny i zapisz, co wydarzyło się potem.`, observe: 'Co konkretnie sprawiło, że nie zrobiłeś kolejnego ruchu?', canTry: false },
    { id: 'tried_uncertain', label: 'Nie wiem, czy robiłem dokładnie to.', title: 'Porównaj obie próby, zanim wyciągniesz wniosek.', action: 'Zapisz, co robiłeś wcześniej, kiedy to robiłeś i po czym oceniałeś efekt. Potem porównaj to z krokiem z wyniku.', observe: 'Co było takie samo, a co zrobiłeś inaczej?', canTry: false },
  ];
  if (r.certainty !== 'hypothesis' || a.attempt === 'works' || a.attempt === 'no_change') return [];
  if (!['food:meal:access', 'food:meal:work', 'food:no_food'].includes(r.experiment.id)) return [];
  return [
    { id: 'food_access', label: 'Nie będę mieć jedzenia pod ręką.', title: 'Najpierw rozwiąż dostęp do jedzenia.', action: 'Wybierz posiłek, który możesz zabrać, albo sprawdź, gdzie kupisz go wtedy, kiedy zwykle wypada jedzenie. Jeśli żadna opcja nie wchodzi w grę, zapisz dlaczego.', observe: 'Czy jedzenie było dostępne i czy udało Ci się zjeść?', canTry: true },
    { id: 'food_break', label: 'Jedzenie mam, ale nie decyduję o przerwie.', title: 'Najpierw ustal, kiedy przerwa jest możliwa.', action: 'Sprawdź to przed kolejnym takim dniem. Jeśli przerwa zależy od innych osób, ustal ją wcześniej. Jeśli nadal nie możesz odejść od pracy, zapisz, co dokładnie Cię zatrzymuje.', observe: 'Czy udało Ci się zrobić przerwę i zjeść?', canTry: true },
    { id: 'food_ready', label: 'Mam warunki, żeby sprawdzić krok z wyniku.', title: r.experiment.title, action: r.experiment.action, observe: r.experiment.observe, canTry: true },
    { id: 'food_other', label: 'Chodzi o coś innego albo jeszcze nie wiem.', title: 'Nie zgadujmy kolejnej przyczyny.', action: 'Przy następnej próbie zapisz, co wydarzyło się tuż przed momentem, w którym krok się zatrzymał. Jeśli opis wyniku nie pasuje, wróć i popraw odpowiedź.', observe: 'Na razie brakuje informacji do wybrania innego kroku.', canTry: false },
  ];
}

export function selectedRefinement(a: Answers, r: DecisionResult, reaction: string, id: unknown): Refinement | undefined {
  return typeof id === 'string' ? refinementOptions(a, r, reaction).find(o => o.id === id) : undefined;
}

export function refinementAsText(a: Answers, r: DecisionResult, reaction: string, id: unknown): string {
  const selected = selectedRefinement(a, r, reaction, id);
  const rejection = reaction === 'off' ? 'Użytkownik: wynik nie oddaje mojej sytuacji.' : reaction === 'obvious' ? 'Użytkownik: to już wiedziałem i próbowałem. Pierwotne zadanie nie zostało zaakceptowane.' : '';
  if (!selected && !rejection) return '';
  return ['DOPRECYZOWANIE PO WYNIKU', rejection, ...(selected ? [`Wybrana odpowiedź: ${selected.label}`, selected.title, selected.action, `Do sprawdzenia: ${selected.observe}`] : []), 'Pierwotne odpowiedzi pozostają bez zmian.'].filter(Boolean).join('\n');
}

export function nextRepairIndex(questions: { id: string }[], answers: Answers): number {
  return questions.findIndex(q => answers[q.id] === undefined);
}
