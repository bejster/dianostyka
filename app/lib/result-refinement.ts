import type { Answers, DecisionResult } from './decision-diagnostic';

export type Refinement = { id: string; label: string; title: string; action: string; observe: string; canTry: boolean };

// These are follow-up choices, not replacements for the visitor's original answers.
// No model-generated recommendations and no new health interpretations.
export function refinementOptions(a: Answers, r: DecisionResult, reaction: string): Refinement[] {
  if (reaction === 'off') return [];
  if (reaction === 'obvious') return [
    { id: 'tried_helped', label: 'Robiłem to i pomagało.', title: 'Zachowaj to, co pomagało.', action: 'Nie musisz zmieniać skutecznego sposobu tylko dlatego, że zrobiłeś diagnostykę. Zapisz, w jakich warunkach pomagał i czy nadal możesz do nich wrócić.', observe: 'Co było wtedy dostępne, a co zmieniło się w obecnej sytuacji?', canTry: false },
    { id: 'tried_unchanged', label: 'Wykonałem to. Nie zauważyłem zmiany.', title: 'Ta próba już się odbyła. Sprawdźmy jej zapis.', action: 'Zapisz, co dokładnie wykonałeś, przy ilu podobnych okazjach i po czym oceniałeś efekt. Sam brak zmiany nie mówi jeszcze, którą kolejną radę wybrać. Nie powtarzaj tej próby tylko dla formularza.', observe: 'Czy warunki i sposób oceny były porównywalne? Ten zapis możesz zabrać do dalszej rozmowy.', canTry: false },
    { id: 'tried_blocked', label: 'Próbowałem, ale nie udało się tego wykonać.', title: 'Zatrzymajmy się przy wykonaniu.', action: `Wróć do pierwszego momentu, w którym zadanie „${r.experiment.title}” przestało być wykonalne. Zapisz, co konkretnie wtedy stanęło na drodze. Nie mamy jeszcze wyniku tej próby.`, observe: 'Który warunek nie był dostępny: czas, miejsce, jedzenie, pomoc czy coś innego? Bez tego nie wybieramy kolejnej korekty.', canTry: false },
    { id: 'tried_uncertain', label: 'Nie wiem, czy to była ta sama próba.', title: 'Najpierw porównaj, co faktycznie robiłeś.', action: 'Porównaj opis kroku z tym, co wykonałeś wcześniej: moment działania, samą czynność i sposób oceny. Jeśli to różne próby, nie traktuj wyniku jednej jako odpowiedzi na drugą.', observe: 'Co było takie samo, a co inne? Możesz pozostawić sprawę otwartą.', canTry: false },
  ];
  if (r.certainty !== 'hypothesis' || a.attempt === 'works' || a.attempt === 'no_change') return [];
  if (!['food:meal:access', 'food:meal:work', 'food:no_food'].includes(r.experiment.id)) return [];
  return [
    { id: 'food_access', label: 'Nie będę mieć posiłku pod ręką.', title: 'Wybierz posiłek dostępny w tym miejscu.', action: 'Dla następnego podobnego dnia wybierz jeden zwykły posiłek, który możesz zabrać, albo miejsce, w którym rzeczywiście go kupisz. Sprawdź wcześniej godzinę dostępności. Jeśli nie masz żadnej opcji, zapisz to — samo planowanie przerwy nie rozwiązuje tej przeszkody.', observe: 'Czy posiłek był dostępny, kiedy go potrzebowałeś? Czy udało się zjeść?', canTry: true },
    { id: 'food_break', label: 'Jedzenie będzie. Nie wybieram sam momentu przerwy.', title: 'Sprawdź, kiedy naprawdę możesz zjeść.', action: 'Przed kolejnym podobnym dniem sprawdź najbliższą przerwę, z której faktycznie możesz skorzystać. Jeśli wymaga ustalenia z kimś w pracy, najpierw ustal tę możliwość. Gdy takiej przerwy nie ma, zapisz ograniczenie zamiast zakładać, że wystarczy przypomnienie.', observe: 'Czy dostępna przerwa faktycznie się odbyła i czy mogłeś w niej zjeść?', canTry: true },
    { id: 'food_ready', label: 'Mam warunki, żeby sprawdzić krok z wyniku.', title: r.experiment.title, action: r.experiment.action, observe: r.experiment.observe, canTry: true },
    { id: 'food_other', label: 'Przeszkoda jest inna albo jeszcze nie wiem.', title: 'Nie dobierajmy rozwiązania do zgadywanej przeszkody.', action: 'Przy najbliższej podobnej okazji zapisz moment, w którym proponowany krok przestał być możliwy, i co wtedy się wydarzyło. Możesz też sprawdzić opis swojej sytuacji w diagnostyce.', observe: 'Którego warunku zabrakło? Na razie nie ma dość informacji na konkretną zmianę zadania.', canTry: false },
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
