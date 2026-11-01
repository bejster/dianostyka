// ── RESULT PAGE V3 — BANK 20 DETERMINISTYCZNYCH EKSPERYMENTOW 72H ──
// Zamrozony wybor i parametry 20 testow (Michal, 2026-09-08). Uczciwsze wyjasnienia "dlaczego"
// poprawione po audycie 2026-11-01; akcji, obserwacji, czasu i selekcji nie zmieniano.
// Bez runtime LLM: jedna odpowiedz zestawu prowadzi do jednego eksperymentu.

export type ExperimentId =
  | 'E1' | 'E2' | 'E3' | 'E4'
  | 'G1' | 'G2' | 'G3' | 'G4'
  | 'T1' | 'T2' | 'T3' | 'T4'
  | 'W1' | 'W2' | 'W3' | 'W4'
  | 'R1' | 'R2' | 'R3' | 'R4';

export interface ExperimentDef {
  id: ExperimentId;
  name: string;
  action: string;
  moment: string;
  observe: string;
  doNotChange: string;
  purpose: string;
  // 2026-10-14 (Michal): mechanizm + analogia, pokazywane pod akcja jako "Dlaczego to ma sens".
  why: string;
}

export const EXPERIMENT_BANK: Record<ExperimentId, ExperimentDef> = {
  E1: {
    id: 'E1', name: 'BLOKADA DECYZJI',
    action: 'Do 16:00 zdecyduj, co jesz po 18:00. Po 18:00 nie podejmuj nowej decyzji żywieniowej.',
    moment: 'zanim zacznie się Twoje zwykłe pęknięcie po południu albo wieczorem',
    observe: 'liczba nieplanowanych decyzji o jedzeniu po 18:00',
    doNotChange: 'kalorii, całego jadłospisu, suplementów, treningu',
    purpose: 'sprawdzić, czy późne podejmowanie decyzji jest częścią pętli',
    why: 'Sprawdzasz, czy problemem jest podejmowanie decyzji o jedzeniu dopiero wieczorem. Jeśli po wcześniejszym wyborze rzadziej improwizujesz, masz trop. Jeżeli nic się nie zmieni, szukamy dalej.',
  },
  E2: {
    id: 'E2', name: 'KONTROLA PRZED PĘKNIĘCIEM',
    action: '90 minut przed zwykłym Punktem Pęknięcia oceń trzy rzeczy: energię, głód i napięcie w skali 0-10.',
    moment: '90 minut przed zadeklarowanym oknem pęknięcia',
    observe: 'który z trzech sygnałów rusza pierwszy i czy powtarza się przez 3 dni',
    doNotChange: 'reszty planu',
    purpose: 'znaleźć najwcześniejszy powtarzalny sygnał',
    why: 'Nie wiemy jeszcze, co pojawia się przed gorszym wieczorem: głód, napięcie czy spadek energii. Zapisujesz te trzy sygnały wcześniej i sprawdzasz, czy któryś powtarza się w podobnych dniach.',
  },
  E3: {
    id: 'E3', name: 'POSIŁEK AWARYJNY',
    action: 'Zanim zacznie się zwykły kryzys, ustal jedną gotową opcję awaryjną na jedzenie.',
    moment: 'zanim zacznie się typowy rozjazd',
    observe: 'ile razy dowóz albo przypadkowe jedzenie było decyzją z ostatniej chwili',
    doNotChange: 'ogólnych kalorii ani całego systemu żywienia',
    purpose: 'sprawdzić, czy brak gotowej opcji napędza decyzję',
    why: 'Przygotowana opcja pozwala sprawdzić, ile przypadkowych wyborów wynika z braku planu na trudny moment. Liczysz takie sytuacje, zamiast oceniać cały tydzień po jednym posiłku.',
  },
  E4: {
    id: 'E4', name: 'NASTĘPNA NORMALNA DECYZJA',
    action: 'Po pierwszym odstępstwie następna decyzja wraca do normalnego planu. Bez nadrabiania.',
    moment: 'zaraz po pierwszym odstępstwie',
    observe: 'ile czasu mija od odstępstwa do pierwszej normalnej decyzji',
    doNotChange: 'reszty planu na ten tydzień',
    purpose: 'sprawdzić zdolność powrotu bez rytuału zaczynania od nowa',
    why: 'Jedno odstępstwo nie przekreśla tygodnia. W tym teście liczysz czas do następnej normalnej decyzji. Jeśli szybciej wracasz, to konkretny postęp bez kolejnego zaczynania wszystkiego od nowa.',
  },
  G1: {
    id: 'G1', name: 'ZAMKNIĘCIE PRACY',
    action: 'Przed końcem pracy wypisz otwarte sprawy i pierwszą rzecz, od której zaczniesz jutro. Potem zamknij pracę.',
    moment: 'ostatnie 10-15 minut dnia pracy',
    observe: 'ile razy wieczorem wracasz do pracy myślami albo działaniem',
    doNotChange: 'rutyny snu, treningu i jedzenia naraz',
    purpose: 'sprawdzić, czy niedokończona praca zostaje poznawczo otwarta',
    why: 'Sprawdzasz, czy niedokończona sprawa wraca do głowy dlatego, że nie ustaliłeś jej następnego kroku. Zapisujesz go przed wyjściem z pracy i obserwujesz powroty myślami wieczorem.',
  },
  G2: {
    id: 'G2', name: 'ODŁÓŻ NA JUTRO',
    action: 'Każdą sprawę, która wraca po pracy, zapisujesz w jednym miejscu. Nie otwierasz jej ponownie tego wieczoru.',
    moment: 'za każdym razem, gdy myśl o pracy wraca po godzinach',
    observe: 'liczba ponownych wejść w ten sam temat',
    doNotChange: 'reszty wieczornej rutyny',
    purpose: 'sprawdzić, czy zapisanie otwartej sprawy ogranicza powroty do niej',
    why: 'Jeżeli ta sama sprawa wraca do głowy po pracy, zapisanie jej w jednym miejscu daje Ci możliwość odłożenia jej do jutra. Liczysz powroty do tematu, nie zakładasz z góry, że sam zapis pomoże.',
  },
  G3: {
    id: 'G3', name: 'JEDNA RZECZ WCZEŚNIEJ',
    action: 'Jedną wymagającą rzecz, którą zwykle robisz po spadku, przesuń przed przewidywany Punkt Pęknięcia.',
    moment: 'przed typowym spadkiem',
    observe: 'czy ta sama rzecz jest łatwiejsza do wykonania przed pęknięciem niż po nim',
    doNotChange: 'całego harmonogramu',
    purpose: 'sprawdzić, czy pora zadania nasila problem',
    why: 'To samo zadanie może być łatwiejsze o innej porze dnia. Przesuwasz jedną rzecz i porównujesz wykonanie, zamiast od razu uznawać, że brakuje Ci dyscypliny albo że każdy wieczór musi być słaby.',
  },
  G4: {
    id: 'G4', name: 'WCZEŚNIEJSZA DECYZJA',
    action: 'Godzinę przed końcem pracy podejmij jedną decyzję, którą zwykle zostawiasz na wieczór.',
    moment: 'około godziny przed końcem pracy',
    observe: 'czy wieczorem zostaje mniej decyzji do podjęcia na zmęczonej głowie',
    doNotChange: 'reszty wieczoru',
    purpose: 'sprawdzić przelewanie się obciążenia decyzyjnego na wieczór',
    why: 'Nie trzeba zgadywać, ile masz jeszcze siły na decyzje. Sprawdzasz coś prostszego: czy wcześniejszy wybór usuwa jedną wieczorną negocjację ze sobą.',
  },
  T1: {
    id: 'T1', name: 'TRYB MINIMUM',
    action: 'Przygotuj 20-minutową wersję najbliższego treningu. Jeśli pełny trening nie wchodzi, robisz Minimum w tym samym terminie.',
    moment: 'najbliższy zaplanowany trening',
    observe: 'trening wykonany: TAK / NIE',
    doNotChange: 'reszty planu treningowego',
    purpose: 'sprawdzić zachowanie całość-albo-nic',
    why: 'Jeśli pełny trening wypada w trudniejszym dniu, wersja dwudziestominutowa sprawdzi, czy przeszkodą jest rozmiar zadania. Nie liczysz jej jako pełnej sesji. Sprawdzasz, czy termin w ogóle przetrwał.',
  },
  T2: {
    id: 'T2', name: 'JEDNO PRZESUNIĘCIE',
    action: 'Każdy trening możesz przesunąć tylko raz. Przy drugim konflikcie wchodzi Tryb Minimum.',
    moment: 'gdy ten sam trening byłby przesuwany drugi raz',
    observe: 'liczba kolejnych przesunięć tego samego treningu',
    doNotChange: 'liczby zaplanowanych treningów',
    purpose: 'sprawdzić, czy to odkładanie, nie brak intencji, jest punktem awarii',
    why: 'Pierwsze przesunięcie może wynikać z konfliktu terminów. Kolejne przesuwanie tego samego treningu sprawdza już, czy naprawdę masz dla niego miejsce. Wersja minimum rozstrzyga, czy da się uratować termin.',
  },
  T3: {
    id: 'T3', name: 'CHRONIONY TRENING',
    action: 'Przez 72 godziny chronisz tylko najbliższy trening. Reszta planu zostaje bez zmian.',
    moment: 'najbliższy zaplanowany trening',
    observe: 'czy jeden jasno chroniony termin jest dowieziony',
    doNotChange: 'całego harmonogramu treningowego',
    purpose: 'sprawdzić, czy zbyt wiele równoległych priorytetów obniża wykonanie',
    why: 'Dobór ćwiczeń niewiele pomoże, jeśli trening ciągle przegrywa z innymi sprawami w kalendarzu. Chronisz jeden konkretny termin i sprawdzasz, czy przy zwykłym tygodniu udało się go utrzymać.',
  },
  T4: {
    id: 'T4', name: 'BEZ NADRABIANIA',
    action: 'Jeśli trening wypadnie, niczego nie nadrabiasz. Wracasz do kolejnego normalnie zaplanowanego terminu.',
    moment: 'zaraz po opuszczonym treningu',
    observe: 'ile czasu mija do powrotu do normalnego planu',
    doNotChange: 'kolejnych treningów, żeby coś odrobić',
    purpose: 'sprawdzić, czy nadrabianie wydłuża rozjazd',
    why: 'Odrabianie opuszczonego treningu może zwiększyć koszt powrotu. W tym teście tego nie robisz. Patrzysz, czy kolejny normalnie zaplanowany termin łatwiej utrzymać bez dokładania zaległości.',
  },
  W1: {
    id: 'W1', name: 'POWRÓT NASTĘPNEGO DNIA',
    action: 'Po pierwszym gorszym dniu pierwsza decyzja następnego dnia wraca do normalnego układu.',
    moment: 'pierwsza decyzja następnego ranka albo dnia',
    observe: 'czy jeden gorszy dzień zamienia się w dwa albo trzy',
    doNotChange: 'reszty planu na weekend',
    purpose: 'sprawdzić czas trwania rozjazdu',
    why: 'Gorszy dzień nie mówi, ile potrwa cały rozjazd. Liczy się następna decyzja. Sprawdzasz, czy powrót do normalnego układu następuje od razu następnego dnia, czy kolejne odstępstwa ciągną się dalej.',
  },
  W2: {
    id: 'W2', name: 'NIEDZIELNY PUNKT POWROTU',
    action: 'W niedzielę o ustalonej godzinie przygotuj dokładnie pierwszy punkt poniedziałku.',
    moment: 'stała godzina w niedzielny wieczór',
    observe: 'czy poniedziałek zaczyna się od gotowej decyzji czy od improwizacji',
    doNotChange: 'całej niedzieli',
    purpose: 'sprawdzić, czy weekendowi brakuje jasnego punktu powrotu',
    why: 'Niedziela nie musi naprawiać całego weekendu. Może przygotować jedną decyzję na poniedziałek. Widzisz wtedy, czy rano zaczynasz od konkretu, czy najpierw próbujesz wymyślić plan od początku.',
  },
  W3: {
    id: 'W3', name: 'DZIENNIK PĘKNIĘCIA WEEKENDU',
    action: 'Zapisz dokładny moment pierwszego odejścia od normalnego planu.',
    moment: 'pierwsze zauważalne odstępstwo w weekend',
    observe: 'pora i sytuacja pierwszego pęknięcia',
    doNotChange: 'weekendu specjalnie, żeby wyszedł lepszy wynik',
    purpose: 'zaobserwować realne pierwsze pęknięcie zamiast zgadywać',
    why: 'Zanim cokolwiek zmienisz, zbierz ślad: kiedy pojawiło się pierwsze odstępstwo i w jakiej sytuacji. Na podstawie jednego wspomnienia trudno odróżnić powtarzalny wzorzec od jednorazowego weekendu.',
  },
  W4: {
    id: 'W4', name: 'PUNKT POWROTU',
    action: 'Przez trzy kolejne dni o tej samej godzinie oceń energię 0-10.',
    moment: 'ta sama godzina: poniedziałek / wtorek / środa (albo Twoje własne 72 godziny)',
    observe: 'pierwszy dzień, w którym wynik wraca do Twojej zwykłej wartości',
    doNotChange: 'kilku rzeczy naraz, żeby szybciej wrócić',
    purpose: 'ustalić realny czas powrotu do formy',
    why: 'Wrażenie, że po weekendzie wracasz do siebie dopiero po kilku dniach, warto porównać z zapisem energii o tej samej porze. Trzy pomiary pokażą wstępny przebieg, ale nie wskażą samej przyczyny.',
  },
  R1: {
    id: 'R1', name: 'BEZ PONIEDZIAŁKOWEGO STARTU OD NOWA',
    action: 'Przez 72 godziny nie zaczynasz żadnego nowego planu. Kontynuujesz jedną rzecz, którą już robiłeś.',
    moment: 'gdy pojawia się chęć przeprojektowania albo zaczęcia od nowa',
    observe: 'czy potrafisz wrócić bez ceremonii nowego startu',
    doNotChange: 'aplikacji, programu, kalorii, układu treningów, całego systemu',
    purpose: 'sprawdzić zależność od zaczynania od nowa',
    why: 'Nowy plan może dać poczucie postępu, zanim zmieni się choć jedno zachowanie. Przez trzy dni niczego nowego nie zaczynasz. Sprawdzasz, czy umiesz wrócić do jednej rzeczy już rozpoczętej.',
  },
  R2: {
    id: 'R2', name: 'BEZ OPTYMALIZACJI',
    action: 'Przez 72 godziny niczego nie optymalizujesz. Obserwujesz tylko, kiedy pierwszy raz dzień wyraźnie zbacza z normalnego toru.',
    moment: 'przez wszystkie 72 godziny',
    observe: 'pierwszy powtarzalny moment albo sytuacja pęknięcia',
    doNotChange: 'kalorii, planu treningowego, suplementów, aplikacji, protokołu snu',
    purpose: 'znaleźć sygnał zanim przepiszesz działanie',
    why: 'Kiedy zmieniasz jedzenie, trening i sen jednocześnie, trudno później ocenić, co pomogło. Tu na razie niczego nie zmieniasz. Szukasz pierwszego powtarzalnego odstępstwa, od którego można zacząć.',
  },
  R3: {
    id: 'R3', name: 'STAŁA PORA POBUDKI',
    action: 'Przez trzy pobudki trzymaj tę samą porę w oknie plus minus 30 minut.',
    moment: 'pora porannego wstawania',
    observe: 'jak oceniasz swój poranek w skali 0-10',
    doNotChange: 'pory snu, suplementów, kofeiny i pięciu innych rzeczy naraz',
    purpose: 'prosty test spójności zachowania',
    why: 'Godzina pobudki jest jednym z sygnałów regulujących rytm dobowy. Sprawdzasz tylko, jak ocenisz trzy poranki przy zbliżonej porze wstawania. To jeszcze nie dowód poprawy snu ani jego przyczyny.',
  },
  R4: {
    id: 'R4', name: 'MAPA ENERGII',
    action: 'Przez trzy dni oceń energię 0-10 o 10:00, 14:00 i 18:00.',
    moment: '10:00 / 14:00 / 18:00',
    observe: 'pierwsza godzina, w której spadek powtarza się w więcej niż jednym dniu',
    doNotChange: 'całej rutyny w trakcie obserwacji',
    purpose: 'znaleźć powtarzalne pęknięcie energii przed interwencją',
    why: 'Hasło brak energii jest za mało precyzyjne, żeby decydować, co zmieniać. Trzy stałe pory pomiaru pokażą, kiedy spadek najczęściej się pojawia. Dopiero wtedy warto wybierać jedną hipotezę.',
  },
};

export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW';

// Sygnaly domenowe uzywane WYLACZNIE do wyboru eksperymentu (nie do medycznej/seksualnej prescrypcji — safety gate).
export interface SelectorInput {
  breakId: string;          // answers.break_window (bw_*)
  giveUpPoint: string;      // answers.give_up_point (gup_*)
  eveningEating: string;    // answers.evening_eating (ee_*)
  takeoutCost: number | undefined; // answers.takeout_cost (obecnie wylaczone z flow -> zwykle undefined)
  stressLevel: string;      // answers.stress_level (st_*)
  halfPowerHours: number | undefined; // answers.half_power_hours
  plannedTrainings: number | undefined; // answers.planned_trainings
  missedTrainings: number | undefined;  // answers.missed_trainings
  weekendPattern: string;   // answers.weekend_pattern (wp_*)
  mondayRecovery: string;   // answers.monday_recovery (mon_*)
  triedBefore: string;      // answers.tried_before (tb_*)
}

function domainAgreement(input: SelectorInput) {
  const evening = input.eveningEating === 'ee_binge' || input.eveningEating === 'ee_uncontrolled' || input.eveningEating === 'ee_chaos'
    || (typeof input.takeoutCost === 'number' && input.takeoutCost >= 300);
  const work = input.stressLevel === 'st_high' || input.stressLevel === 'st_max'
    || (typeof input.halfPowerHours === 'number' && input.halfPowerHours >= 2);
  const training = typeof input.plannedTrainings === 'number' && input.plannedTrainings >= 1
    && typeof input.missedTrainings === 'number' && input.missedTrainings >= 1;
  const weekend = input.weekendPattern === 'wp_shifted' || input.weekendPattern === 'wp_reset'
    || input.mondayRecovery === 'mon_2' || input.mondayRecovery === 'mon_3';
  const restart = input.triedBefore === 'tb_2' || input.triedBefore === 'tb_3';
  return { evening, work, training, weekend, restart };
}

// Confidence: HIGH = break_window + give_up_point + domain signal align. MEDIUM = dwa sygnaly. LOW = reszta.
export function computeConfidence(input: SelectorInput): Confidence {
  const dom = domainAgreement(input);
  const gup = input.giveUpPoint;
  const hasBreak = !!input.breakId && input.breakId !== 'bw_varies';
  const hasGup = !!gup;
  const alignedDomain =
    (gup === 'gup_wieczor' && dom.evening) ||
    (gup === 'gup_stres' && dom.work) ||
    (gup === 'gup_weekend' && dom.weekend) ||
    (gup === 'gup_efekt' && dom.restart) ||
    (gup === 'gup_czas' && dom.training);
  const signalCount = [dom.evening, dom.work, dom.training, dom.weekend, dom.restart].filter(Boolean).length;
  if (hasBreak && hasGup && alignedDomain) return 'HIGH';
  if (signalCount >= 2 || (hasBreak && hasGup)) return 'MEDIUM';
  return 'LOW';
}

// Selector priority (earliest controllable fracture wins when evidence clearly supports it):
// 1 weekend spillover (gdy bardzo wyrazny) -> 2 wieczor/jedzenie -> 3 praca/glowa -> 4 trening ->
// 5 restart loop -> 6 rozmyty sen/energia -> 7 fallback LOW-confidence observation.
export function selectExperiment(input: SelectorInput): { experiment: ExperimentDef; confidence: Confidence } {
  const confidence = computeConfidence(input);
  const dom = domainAgreement(input);

  if (confidence === 'LOW') {
    // LOW confidence MUST prefer observation: E2 / W3 / R2 / R4.
    if (input.breakId === 'bw_weekend') return { experiment: EXPERIMENT_BANK.W3, confidence };
    if (dom.evening || input.breakId === 'bw_evening' || input.breakId === 'bw_afterwork') return { experiment: EXPERIMENT_BANK.E2, confidence };
    if (dom.work || input.breakId === 'bw_afternoon' || input.breakId === 'bw_midday') return { experiment: EXPERIMENT_BANK.R4, confidence };
    return { experiment: EXPERIMENT_BANK.R2, confidence };
  }

  // wyrazny spillover weekendowy (mon_3 = pol tygodnia, wp_reset = prawie kazdy weekend)
  const weekendVeryClear = input.mondayRecovery === 'mon_3' || input.weekendPattern === 'wp_reset';
  if (weekendVeryClear) {
    return { experiment: input.mondayRecovery === 'mon_3' || input.mondayRecovery === 'mon_2' ? EXPERIMENT_BANK.W4 : EXPERIMENT_BANK.W1, confidence };
  }
  if (dom.evening) {
    if (input.giveUpPoint === 'gup_wieczor' && confidence === 'HIGH') return { experiment: EXPERIMENT_BANK.E1, confidence };
    if (typeof input.takeoutCost === 'number' && input.takeoutCost >= 300) return { experiment: EXPERIMENT_BANK.E3, confidence };
    return { experiment: EXPERIMENT_BANK.E4, confidence };
  }
  if (dom.work) {
    if (input.stressLevel === 'st_max') return { experiment: EXPERIMENT_BANK.G1, confidence };
    if (input.giveUpPoint === 'gup_stres') return { experiment: EXPERIMENT_BANK.G4, confidence };
    return { experiment: EXPERIMENT_BANK.G3, confidence };
  }
  if (dom.training) {
    if (typeof input.missedTrainings === 'number' && input.missedTrainings >= 2) return { experiment: EXPERIMENT_BANK.T1, confidence };
    return { experiment: EXPERIMENT_BANK.T3, confidence };
  }
  if (dom.weekend) {
    return { experiment: input.mondayRecovery === 'mon_1' || input.mondayRecovery === 'mon_2' ? EXPERIMENT_BANK.W2 : EXPERIMENT_BANK.W1, confidence };
  }
  if (dom.restart) {
    return { experiment: EXPERIMENT_BANK.R1, confidence };
  }
  // diffuse sleep/energy fallback
  return { experiment: EXPERIMENT_BANK.R4, confidence };
}
