import type { RawAnswers } from './scoring-engine';
import type { DecisionResult } from './decision-engine';
import type { ExperimentDef } from './experiment-bank';

// Jeden osobisty wniosek z przecinających się odpowiedzi, nie 6 archetypów i nie LLM.
// Hipoteza pozostaje hipotezą. Jeden eksperyment z istniejącego banku, zero nowych protokołów.
export type DecisionPattern =
  | 'weekend_return'
  | 'evening_and_work'
  | 'work_and_training'
  | 'work_pressure'
  | 'training_reliability'
  | 'repeated_restarts'
  | 'sleep_and_pressure'
  | 'observation_only';

export interface DecisionReceipt {
  source: string;
  answer: string;
}

export interface WeekDecisionCard {
  pattern: DecisionPattern;
  title: string;
  insight: string;
  receipts: DecisionReceipt[];
  trigger: string;
  action: string;
  measure: string;
  notTouch: string;
  alternativeIfWrong: string;
  note: string;
}

const read = (input: unknown): string => typeof input === 'string' ? input : '';
const number = (input: unknown): number | undefined => typeof input === 'number' && Number.isFinite(input) ? input : undefined;

const WORK: Record<string,string> = {
  wl_clock: 'zwykle zamykasz pracę o stałej godzinie',
  wl_deadline: 'w robocie stale wiszą terminy',
  wl_firefight: 'dzień zjada Ci gaszenie cudzych pożarów',
  wl_people: 'inni czekają, aż podejmiesz decyzję',
  wl_owner: 'odpowiedzialność za firmę wraca do Ciebie po godzinach',
};

const STRESS: Record<string,string> = {
  st_low: 'wieczorem praca zwykle odpuszcza',
  st_mid: 'przez 2–3 wieczory wracasz do pracy myślami',
  st_high: 'przez 4–5 wieczorów wracasz do pracy myślami',
  st_max: 'praktycznie codziennie zasypiasz z listą spraw',
};

const EVENING: Record<string,string> = {
  ee_clean: 'jedzenie wieczorem zwykle trzyma plan',
  ee_snack: 'wieczorem dochodzi przekąska poza planem',
  ee_binge: '1–2 wieczory w tygodniu jesz więcej, niż planowałeś',
  ee_uncontrolled: 'co najmniej 3 wieczory w tygodniu jedzenie wymyka Ci się spod kontroli',
  ee_chaos: 'jedzenie wieczorem jest nieprzewidywalne',
};

const WEEKEND: Record<string,string> = {
  wp_same: 'weekend ma podobny rytm jak reszta tygodnia',
  wp_slight: 'weekend jest trochę luźniejszy',
  wp_shifted: 'weekend wyraźnie zmienia godziny i rytm',
  wp_reset: 'weekend ma zupełnie inny rytm',
};

const RETURN: Record<string,string> = {
  mon_0: 'w poniedziałek rano czujesz się normalnie',
  mon_1: 'dopiero przed południem w poniedziałek wracasz do siebie',
  mon_2: 'zwykły poziom wraca według Ciebie dopiero we wtorek',
  mon_3: 'zwykły poziom wraca według Ciebie w środę albo później',
};

const SLEEP: Record<string,string> = {
  sq_great: 'prawie codziennie budzisz się z energią',
  sq_ok: 'czujesz się gotowy rano 3–4 razy w tygodniu',
  sq_heavy: 'rano czujesz się gotowy tylko 1–2 razy w tygodniu',
  sq_wrecked: 'prawie nigdy nie wstajesz rano gotowy',
};

function receipt(source: string, answer?: string): DecisionReceipt | null {
  return answer ? { source, answer } : null;
}

function trainingReceipt(answers: RawAnswers): DecisionReceipt | null {
  const planned = number(answers.planned_trainings);
  const missed = number(answers.missed_trainings);
  if (planned === undefined || missed === undefined || planned < 1) return null;
  const safeMissed = Math.max(0, Math.min(planned, missed));
  return receipt('Trening', safeMissed >= planned
    ? `w gorszym tygodniu wypadają wszystkie ${planned} zaplanowane treningi`
    : `w gorszym tygodniu wypada ${safeMissed} z ${planned} zaplanowanych treningów`);
}

function firstTwo(items: Array<DecisionReceipt | null>): DecisionReceipt[] {
  const results: DecisionReceipt[] = [];
  const used = new Set<string>();
  for (const item of items) {
    if (!item || used.has(item.source)) continue;
    results.push(item);
    used.add(item.source);
    if (results.length === 2) break;
  }
  return results;
}

export function buildWeekDecisionCard(
  answers: RawAnswers,
  decision: DecisionResult,
  experiment: ExperimentDef,
): WeekDecisionCard {
  const upstream = decision.upstream_candidate.lever;
  const weekend = WEEKEND[read(answers.weekend_pattern)];
  const back = RETURN[read(answers.monday_recovery)];
  const work = WORK[read(answers.work_load)];
  const stress = STRESS[read(answers.stress_level)];
  const evening = EVENING[read(answers.evening_eating)];
  const sleep = SLEEP[read(answers.sleep_quality)];
  const training = trainingReceipt(answers);
  const planned = number(answers.planned_trainings) || 0;
  const missed = number(answers.missed_trainings) || 0;
  const heavyTrainingLoss = planned >= 1 && missed >= 1;
  const highStress = ['st_high','st_max'].includes(read(answers.stress_level));
  const toughWork = ['wl_deadline','wl_firefight','wl_people','wl_owner'].includes(read(answers.work_load));
  const eveningIssue = ['ee_snack','ee_binge','ee_uncontrolled','ee_chaos'].includes(read(answers.evening_eating));
  const returnSlow = ['mon_2','mon_3'].includes(read(answers.monday_recovery));
  const restart = ['tb_2','tb_3'].includes(read(answers.tried_before));
  const lowSleep = ['sq_heavy','sq_wrecked'].includes(read(answers.sleep_quality));

  let pattern: DecisionPattern = 'observation_only';
  let title = 'Tu jeszcze nie dopisywałbym Ci przyczyny.';
  let insight = 'Masz kilka obserwacji, ale żadna nie daje na razie mocnego powodu do wymieniania całego planu. Najpierw szukamy powtarzalnego momentu.';
  let alternativeIfWrong = 'Jeżeli przez te trzy dni nie wystąpi podobna sytuacja, nie mamy rozstrzygnięcia. Wtedy potrzebujemy kolejnych zwykłych dni, a nie mocniejszej teorii.';
  let receipts = firstTwo([
    receipt('Pierwszy moment', decision.early_signal === 'różnie, bez jednej godziny' ? undefined : `pierwszy spadek zaznaczyłeś: ${decision.early_signal}`),
    receipt('Weekend', weekend), receipt('Rytm po weekendzie', back),
  ]);

  if (upstream === 'weekend' && weekend && returnSlow) {
    pattern = 'weekend_return';
    title = 'Nie robiłbym z poniedziałku dnia na nadrabianie wszystkiego.';
    insight = 'Zaznaczyłeś, że weekend zmienia rytm, a swój normalny poziom odzyskujesz dopiero później. Najpierw sprawdziłbym, kiedy dokładnie wraca energia. Dokładanie nowych zasad w poniedziałek może tylko utrudnić ocenę, co się dzieje.';
    receipts = firstTwo([receipt('Weekend', weekend), receipt('Powrót', back)]);
    alternativeIfWrong = 'Jeżeli po następnym weekendzie wrócisz szybko, ten wzorzec nie jest stały. Wtedy porównamy także zwykłe dni pracy, a nie obwiniamy weekendu z automatu.';
  } else if (upstream === 'wieczor' && eveningIssue && highStress) {
    pattern = 'evening_and_work';
    title = 'Możesz mieć problem z porą decyzji, a nie z wiedzą o jedzeniu.';
    insight = 'Masz jednocześnie napięcie wieczorem i jedzenie poza planem. To nie dowodzi, że jedno powoduje drugie. Zamiast ciąć kalorie albo dopisywać zakazy, sprawdziłbym, co się dzieje, kiedy decyzję o posiłku podejmiesz wcześniej.';
    receipts = firstTwo([receipt('Po pracy', stress), receipt('Jedzenie', evening)]);
    alternativeIfWrong = 'Jeżeli wcześniejsza decyzja niczego nie zmieni, nie uznajemy od razu, że brakuje Ci dyscypliny. Trzeba wtedy sprawdzić m.in. regularność posiłków i rzeczywisty głód, których ta ankieta nie mierzy.';
  } else if ((upstream === 'glowa' || upstream === 'trening') && toughWork && heavyTrainingLoss) {
    pattern = 'work_and_training';
    title = 'Plan treningowy trzeba sprawdzać w gorszym tygodniu, nie w idealnym.';
    insight = 'Masz obciążenie w pracy i regularnie wypada Ci część zaplanowanych treningów. Na razie nie dokładałbym kolejnego dnia treningowego. Sprawdziłbym, czy obecny plan wytrzymuje rzeczywiste ograniczenia czasu.';
    receipts = firstTwo([receipt('Praca', work), training]);
    alternativeIfWrong = 'Jeśli test nie pomoże utrzymać choć jednego terminu, to informacja o dopasowaniu planu do kalendarza. Wtedy trzeba zmienić warunki wykonania, nie powtarzać motywacyjnego przemówienia.';
  } else if (upstream === 'glowa' && highStress) {
    pattern = 'work_pressure';
    title = 'Po pracy możesz nadal być w robocie, tylko bez laptopa.';
    insight = 'Sam zaznaczyłeś, że tematy z pracy wracają wieczorem. Nie wiem, czy to właśnie psuje sen lub trening. Najpierw zobaczyłbym, czy można zamknąć otwarte sprawy bez przepisywania całego dnia.';
    receipts = firstTwo([receipt('Głowa wieczorem', stress), receipt('Obciążenie', work)]);
    alternativeIfWrong = 'Jeżeli samo zamykanie spraw nie zmienia wieczoru, to nie będę dorzucał kolejnej checklisty. Sprawdziłbym wtedy realną liczbę godzin pracy i inne możliwe przyczyny zmęczenia.';
  } else if (upstream === 'trening' && heavyTrainingLoss) {
    pattern = 'training_reliability';
    title = 'Twój plan może być za duży na tydzień, który faktycznie masz.';
    insight = 'Tu nie brakuje chęci deklarowanych w ankiecie. Widać rozjazd między zaplanowanymi a wykonanymi treningami w gorszym tygodniu. Ważniejsze będzie utrzymanie rytmu niż dokładanie objętości.';
    receipts = firstTwo([training, receipt('Moment spadku', `wskazałeś: ${decision.early_signal}`)]);
    alternativeIfWrong = 'Jeżeli nawet wersja minimum się nie mieści, to trzeba wrócić do dostępnych okien czasu i warunków treningu. Samo zmniejszenie sesji może być niewystarczające.';
  } else if (upstream === 'powrot' && restart) {
    pattern = 'repeated_restarts';
    title = 'Może nie potrzebujesz nowego startu. Potrzebujesz krótszego powrotu.';
    insight = 'W ostatnim roku kilka planów nie przetrwało nawet miesiąca. Nowy plan może poprawić pierwsze dni, ale tu sprawdziłbym moment po pierwszym odstępstwie. To on mówi, czy system da się utrzymać.';
    receipts = firstTwo([
      receipt('Poprzednie próby', read(answers.tried_before) === 'tb_3' ? 'co najmniej 5 planów nie dożyło miesiąca' : '3–4 plany nie dożyły miesiąca'),
      receipt('Kiedy puszcza', decision.early_signal === 'różnie, bez jednej godziny' ? undefined : decision.early_signal),
    ]);
    alternativeIfWrong = 'Jeśli przez 72 godziny niczego nie odpuścisz, nie udowodniliśmy niczego o powrotach. Sprawdzisz to przy pierwszym rzeczywistym odstępstwie.';
  } else if (upstream === 'sen' && lowSleep) {
    pattern = 'sleep_and_pressure';
    title = 'Najpierw sprawdziłbym poranki, zanim ruszę cały trening.';
    insight = 'Budzisz się bez pełnej gotowości w wielu dniach tygodnia. Jeżeli do tego zostają Ci otwarte sprawy po pracy, warto zobaczyć, czy te dwa sygnały idą razem. Ankieta nie ustali przyczyny problemów ze snem.';
    receipts = firstTwo([receipt('Poranki', sleep), receipt('Wieczorem', highStress ? stress : undefined)]);
    alternativeIfWrong = 'Jeżeli poranki pozostają trudne albo problem utrzymuje się mimo zmian w rytmie, nie diagnozujemy tego na podstawie testu. Warto uwzględnić także przyczyny zdrowotne i senne.';
  }

  if (!decision.upstream_candidate.resolved || decision.confidence.state === 'za_malo') {
    // Umiarkowana lub niska pewność NIE może przekonać użytkownika stanowczym zdaniem.
    title = 'Mam pierwszy trop, ale w tym tygodniu nie będę zgadywał.';
    insight = 'Kilka odpowiedzi idzie w różne strony. Ten test ma pokazać, czy wskazany moment w ogóle się powtarza. Na tej podstawie nie wyciągam jeszcze wniosku o przyczynie.';
    alternativeIfWrong = 'Jeśli przez 72 godziny wzorzec się nie powtórzy, wynik zostaje otwarty. Niczego nie potwierdziliśmy i nie ma sensu dopowiadać historii.';
  }

  return {
    pattern,
    title,
    insight,
    receipts,
    trigger: experiment.moment,
    action: experiment.action,
    measure: experiment.observe,
    notTouch: experiment.doNotChange,
    alternativeIfWrong,
    note: 'To są Twoje deklaracje z ankiety, nie niezależny pomiar. Trzy dni dają pierwszą wskazówkę, nie dowód przyczynowości ani obietnicę poprawy.',
  };
}
