import type { DecisionResult } from './decision-diagnostic';

// These headings describe the existing action; they never select the recommendation.
export const ACTION_HEADINGS: Record<string, string> = {
  'training:work:unexpected': 'Przygotuj krótszy wariant treningu.',
  'training:work:extra': 'Wybierz ostatnie zadanie przed treningiem.',
  'training:work:overlap': 'Sprawdź, co ustąpi miejsca treningowi.',
  'training:family': 'Potwierdź, że możesz wtedy wyjść.',
  'training:no_short': 'Wybierz wcześniej krótszy fragment planu.',
  'training:tired:morning': 'Porównaj poranki z treningiem i bez niego.',
  'training:tired:end': 'Sprawdź trening wcześniej w ciągu dnia.',
  'training:tired:start': 'Przygotuj sam początek rozgrzewki.',
  'food:meal:access': 'Wybierz, skąd weźmiesz wcześniejszy posiłek.',
  'food:meal:work': 'Wybierz zadanie, po którym robisz przerwę na jedzenie.',
  'food:meal:restrict': 'Sprawdź wieczór po zwykłym posiłku.',
  'food:no_food': 'Wybierz jedzenie, zanim wrócisz do domu.',
  'food:tension': 'Zauważ, czego potrzebujesz w tej chwili.',
  'food:social': 'Sprawdź pierwszą decyzję po wyjściu.',
  'sleep:screen:own': 'Zrób miejsce na chwilę dla siebie wcześniej.',
  'sleep:screen:auto': 'Wybierz koniec, zanim zaczniesz oglądać.',
  'sleep:screen:awake': 'Zapisz, co działo się przed telefonem.',
  'sleep:work': 'Zapisz, od czego zaczniesz jutro.',
  'sleep:family': 'Sprawdź ostatni obowiązek przed snem.',
  'sleep:thoughts': 'Zapisz dalszy krok do niedokończonych spraw.',
  'energy:short_sleep': 'Porównaj podobny dzień po zwykłej nocy.',
  'energy:meal': 'Sprawdź podobny blok pracy po posiłku.',
  'energy:no_break': 'Zrób przerwę po jednym etapie pracy.',
  'energy:many_tasks': 'Dokończ jeden fragment zadania.',
  'weekend:late': 'Sprawdź godziny pierwszego dnia po weekendzie.',
  'weekend:no_return': 'Wybierz pierwszy posiłek po weekendzie.',
  'weekend:compensate': 'Wróć do zwykłego planu po weekendzie.',
  'weekend:work': 'Sprawdź, która praca musi zostać na weekend.',
};

export function actionHeading(result: DecisionResult): string {
  return ACTION_HEADINGS[result.experiment.id] || result.experiment.title;
}

export function resultStatus(result: DecisionResult): string {
  return result.certainty === 'maintain' ? 'To już działa'
    : result.certainty === 'observation' ? 'Najpierw sprawdź' : 'Tu bym zaczął';
}

export const RESULT_UI_VERSION = '3.6.0';
export function analyticsEnvironment(hostname: string): 'production' | 'preview' {
  return hostname === 'diagnostyka.talerzihantle.com' ? 'production' : 'preview';
}
