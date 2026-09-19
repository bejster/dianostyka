import type { DecisionResult } from './decision-diagnostic';

// These headings describe the existing action; they never select the recommendation.
export const ACTION_HEADINGS: Record<string, string> = {
  'training:work:unexpected': 'Ustal, co robisz, gdy znika czas na trening.',
  'training:work:extra': 'Wybierz ostatnie zadanie przed treningiem.',
  'training:work:overlap': 'Sprawdź, co ustąpi miejsca treningowi.',
  'training:family': 'Potwierdź, że możesz wtedy wyjść.',
  'training:no_short': 'Wybierz wcześniej krótszy fragment planu.',
  'training:tired:morning': 'Sprawdź, z czym zaczynasz dzień.',
  'training:tired:end': 'Porównaj start treningu o wcześniejszej porze.',
  'training:tired:start': 'Przygotuj sam początek rozgrzewki.',
  'food:meal:access': 'Zadbaj o posiłek, który ostatnio wypadł.',
  'food:meal:work': 'Wybierz zadanie, po którym robisz przerwę na jedzenie.',
  'food:meal:restrict': 'Sprawdź wieczór po zwykłym posiłku.',
  'food:no_food': 'Wybierz jedzenie, zanim wrócisz do domu.',
  'food:tension': 'Zauważ, czego potrzebujesz w tej chwili.',
  'food:social': 'Sprawdź pierwszą decyzję po wyjściu.',
  'sleep:screen:own': 'Zrób miejsce na chwilę dla siebie wcześniej.',
  'sleep:screen:auto': 'Wybierz koniec, zanim zaczniesz oglądać.',
  'sleep:screen:awake': 'Zapisz, co było między łóżkiem a telefonem.',
  'sleep:work': 'Zostaw pierwszy ruch na jutro.',
  'sleep:family': 'Sprawdź ostatni obowiązek przed snem.',
  'sleep:thoughts': 'Zapisz dalszy krok do niedokończonych spraw.',
  'energy:short_sleep': 'Porównaj podobny dzień po zwykłej nocy.',
  'energy:meal': 'Sprawdź podobny blok pracy po posiłku.',
  'energy:no_break': 'Zrób przerwę po jednym etapie pracy.',
  'energy:many_tasks': 'Dokończ jeden fragment. Resztę zapisz.',
  'weekend:late': 'Sprawdź godziny pierwszego dnia po weekendzie.',
  'weekend:no_return': 'Ustal pierwszy zwykły posiłek po wyjściu.',
  'weekend:compensate': 'Wróć do zwykłego planu po weekendzie.',
  'weekend:work': 'Sprawdź, co musi wejść w weekend.',
};

export function actionHeading(result: DecisionResult): string {
  return ACTION_HEADINGS[result.experiment.id] || result.experiment.title;
}

export function resultStatus(result: DecisionResult): string {
  return result.certainty === 'maintain' ? 'Co warto zachować'
    : result.certainty === 'observation' ? 'Najpierw obserwacja' : 'Trop do sprawdzenia';
}

export const RESULT_UI_VERSION = '3.2.0';
export function analyticsEnvironment(hostname: string): 'production' | 'preview' {
  return hostname === 'diagnostyka.talerzihantle.com' ? 'production' : 'preview';
}
