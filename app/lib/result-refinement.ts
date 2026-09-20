import type { Answers, DecisionResult } from './decision-diagnostic';

export type Refinement = { id: string; label: string; title: string; action: string; observe: string; canTry: boolean };

// These are follow-up choices, not replacements for the visitor's original answers.
// No model-generated recommendations and no new health interpretations.
export function refinementOptions(a: Answers, r: DecisionResult, reaction: string): Refinement[] {
  if (reaction === 'off') return [];
  if (reaction === 'obvious') return [
    { id: 'tried_helped', label: 'Robiłem to i pomagało.', title: 'Co wtedy pomagało Ci to robić?', action: 'Skoro to pomagało, warto sprawdzić, co się od tamtej pory zmieniło. Zapisz, czego potrzebujesz, żeby wrócić do tego sposobu.', observe: 'Czy nadal masz warunki, w których to działało?', canTry: false },
    { id: 'tried_unchanged', label: 'Robiłem to, ale bez różnicy.', title: 'Co dokładnie sprawdziłeś?', action: 'Zapisz, co robiłeś, ile razy i po czym oceniałeś zmianę. To pozwoli wrócić do konkretów w rozmowie. Na razie za mało wiemy, żeby proponować Ci kolejną rzecz.', observe: 'Czy za każdym razem sprawdzałeś to w podobnych warunkach?', canTry: false },
    { id: 'tried_blocked', label: 'Próbowałem, ale nie udało się tego zrobić.', title: 'Na czym się zatrzymałeś?', action: `Przy próbie „${r.experiment.title}” coś przeszkodziło Ci ją wykonać. Wróć do tego momentu i zapisz, co się wydarzyło.`, observe: 'Czego wtedy zabrakło, żeby zrobić to dalej?', canTry: false },
    { id: 'tried_uncertain', label: 'Nie wiem, czy robiłem dokładnie to.', title: 'Jak wyglądała Twoja próba?', action: 'Porównaj ten krok z tym, co robiłeś wcześniej. Sprawdź też, kiedy to robiłeś i po czym oceniałeś efekt, bo od tego zależy, czy możemy porównać wyniki.', observe: 'Co się zgadza, a co robiłeś inaczej?', canTry: false },
  ];
  if (r.certainty !== 'hypothesis' || a.attempt === 'works' || a.attempt === 'no_change') return [];
  if (!['food:meal:access', 'food:meal:work', 'food:no_food'].includes(r.experiment.id)) return [];
  return [
    { id: 'food_access', label: 'Nie będę mieć jedzenia pod ręką.', title: 'Skąd weźmiesz jedzenie w taki dzień?', action: 'Wybierz posiłek, który możesz zabrać, albo sprawdź, gdzie kupisz go o potrzebnej porze. Jeśli żadna opcja nie wchodzi w grę, zapisz dlaczego.', observe: 'Miałeś co zjeść? Udało Ci się zjeść?', canTry: true },
    { id: 'food_break', label: 'Jedzenie mam, ale nie decyduję o przerwie.', title: 'Kiedy możesz zrobić przerwę na jedzenie?', action: 'Sprawdź to przed kolejnym takim dniem. Jeśli przerwa wymaga ustalenia z kimś w pracy, zacznij od tej rozmowy. Jeśli nie możesz jej zrobić, zapisz, co Cię zatrzymuje.', observe: 'Czy udało Ci się skorzystać z przerwy i zjeść?', canTry: true },
    { id: 'food_ready', label: 'Mam warunki, żeby sprawdzić krok z wyniku.', title: r.experiment.title, action: r.experiment.action, observe: r.experiment.observe, canTry: true },
    { id: 'food_other', label: 'Chodzi o coś innego albo jeszcze nie wiem.', title: 'Co Ci przeszkodzi przy następnej próbie?', action: 'Jeśli znów nie uda się zrobić tego kroku, zapisz, co wydarzyło się tuż wcześniej. Możesz też poprawić odpowiedź, jeśli opis w wyniku nie pasuje do Twojej sytuacji.', observe: 'Na razie nie ma dość informacji, żeby wybrać inny krok.', canTry: false },
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
