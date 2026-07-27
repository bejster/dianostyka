// ── Rdzeń diagnostyczny: czysta logika scoringu wyciągnięta z app/page.tsx ──
// ZERO zależności od Reacta/DOM/window. Werbatim przeniesione formuły — nie zmieniać liczb.

export type ChipKey = 'fatigue' | 'mood' | 'libido' | 'belly' | 'brain' | 'anxiety' | 'joints' | 'skin' | 'motivation' | 'digest' | 'cravings' | 'recovery' | 'focus' | 'headaches' | 'sweating' | 'heartRate' | 'procrastination' | 'impatience' | 'memory' | 'confidence';

export interface FD {
  age: number;
  breakWindow: number; // pierwszy moment pęknięcia dnia: -1=brak odp, 0=rano, 1=10-14, 2=14-18, 3=18-21, 4=po21, 5=weekend, 6=brak stałego
  sleep: number; sleepQ: number; screenBed: number; stress: number; energy: number;
  dopamine: number; dietChaos: number; junk: number; binge: number; wknd: number;
  drinks: number; cash: number; subs: number; lost: number; plan: number;
  miss: number; gym: number; rate: number; tags: Set<ChipKey>;
  wakeTime: number;     // godzina wstania (5-10)
  alarm: number;        // budzik: 0=sam, 1=budzik
  workHours: number;    // ile godzin pracy (6-14)
  progress: number;     // czujesz postępy: 0=tak, 1=trochę, 2=nie
  meals: number;        // ile posiłków (1-5)
  cooking: number;      // gotujesz: 0=tak, 1=mix, 2=zamawiam
  mondayFeel: number;   // poniedziałek rano: 0=ok, 1=średnio, 2=źle, 3=tragedia
  weekendWork: number;  // weekend wpływa na pracę: 0=nie, 1=czasem, 2=regularnie
  trainYears: number;   // ile lat trenuje (0-15)
  trainHappy: number;   // zadowolony z wyników: 0=tak, 1=nie do końca, 2=nie
  trainPlan: number;    // ma plan: 0=tak, 1=improwizuje
  triedBefore: number;  // próbował zmienić sam: 0=nie, 1=raz-dwa, 2=wiele razy
  frustration: number;  // co frustruje: 0=brak wyników, 1=brak energii, 2=brak czasu, 3=brak konsekwencji
  raise: number;        // ruch w zarobkach 12 mies: -1=brak odp, 0=konkretny, 1=symboliczny, 2=stoi, 3=nie pamięta (gate komponentu C kotwicy)
  defer: number;        // odkładane decyzje/tydzień: -1=brak odp, 0=0, 1=1-2, 2=3-5, 3=codziennie coś wisi
  retreat: number;      // odpuszczona rozmowa (pewność siebie): -1=brak odp, 0=w tym tygodniu, 1=w tym miesiącu, 2=dawno, 3=ciągle
  wkndWhat: number;     // co sypie się w weekend najmocniej: -1=brak odp, 0=sen/pobudki, 1=jedzenie luzem, 2=zero ruchu, 3=alkohol/regeneracja (pytane gdy wknd>=2)
  veggies: number;      // warzywa/owoce ~500g dziennie: 0=tak, 1=czasem, 2=prawie wcale (jakość żywienia)
  protein: number;      // białko + regularne posiłki: 0=tak, 1=średnio, 2=mało/nieregularnie
  morningWood: number;  // poranny wzwód (marker hormonalny z narzędzia hormonów): 0=regularnie, 1=czasem, 2=rzadko/wcale
  supps: number;        // suplementacja bitmask: 1=D3, 2=omega-3, 4=kreatyna, 8=magnez; 0=nic; -1=brak odp
}

export const INIT: FD = {
  age: 28,
  breakWindow: -1,
  sleep: 7, sleepQ: 0, screenBed: 0, stress: 0, energy: 0, dopamine: 0,
  dietChaos: 0, junk: 0, binge: 0, wknd: 0, drinks: 0, cash: 0,
  subs: 0, lost: 0, plan: 0, miss: 0, gym: 150, rate: 60,
  tags: new Set(),
  wakeTime: 7, alarm: 1, workHours: 8, progress: 0, meals: 3, cooking: 1,
  mondayFeel: 0, weekendWork: 1, trainYears: 3, trainHappy: 0, trainPlan: 0,
  triedBefore: 1, frustration: 1,
  raise: -1, defer: -1, retreat: -1, wkndWhat: -1,
  veggies: 0, protein: 0, morningWood: 0, supps: -1,
};

// ── KOTWICA ROCZNA: tylko realny wydatek (podany przez usera) + czas na pół mocy. Zero zmyślonej pensji/podwyżki. ──
// hardYear = wydatki, które user sam wpisał: weekend (ile schodzi x częstotliwość) + dowozy/jedzenie na mieście.
// hours/dni = godziny na pół mocy w roku, ostrożnie: 220 dni roboczych, nie 365. To rama czasu, nie kwota.
export function anchorRok(D: FD) {
  const hardYear = Math.round((D.cash * D.wknd * 12) + (D.junk * 12));
  const hours = Math.round(D.lost * 220);
  const dni = Math.round(hours / 8);
  const tys = Math.floor(hardYear / 1000);
  const light = hardYear < 3000;
  const display = hardYear >= 45000 ? 'ponad 45 tys zł'
    : tys >= 1 ? `około ${tys} tys zł`
    : `${Math.round(hardYear / 100) * 100} zł`;
  return { hardYear, hours, dni, display, light };
}

// Wagi objawów - im poważniejszy symptom, tym wyższy wpływ na score i koszt
// Koszt: szacunek konsekwencji finansowych na 6 miesięcy (suplementy, wizyty, utracona produktywność)
// Waga score: wpływ na łączny wynik (1.0 = bazowy, 2.0 = podwójny)
export const TAG_WEIGHTS: Record<ChipKey, { cost: number; scoreW: number }> = {
  fatigue:   { cost: 500, scoreW: 1.8 },   // chroniczne zmęczenie - wpływa na wszystko, dużo suplementów/kaw
  mood:      { cost: 400, scoreW: 1.5 },   // wahania nastroju - wizyty psycholog, gorsze decyzje
  libido:    { cost: 600, scoreW: 2.0 },   // spadek libido - mocny marker hormonalny, endokrynolog
  belly:     { cost: 450, scoreW: 1.6 },   // brzuch nie schodzi - insulinooporność, diety, suplementy
  brain:     { cost: 550, scoreW: 1.8 },   // mgła mózgowa - utracona produktywność, neurolog
  anxiety:   { cost: 500, scoreW: 1.7 },   // lęki - psychiatra/psycholog, suplementy, CBD
  joints:    { cost: 350, scoreW: 1.2 },   // bóle stawów - fizjoterapeuta, suplementy kolagen/MSM
  skin:      { cost: 250, scoreW: 1.0 },   // skóra - dermatolog, kosmetyki, cynk
  motivation:{ cost: 450, scoreW: 1.6 },   // brak motywacji - dopamina, utracone szanse
  digest:    { cost: 350, scoreW: 1.3 },   // trawienie - gastroenterolog, probiotyki, dieta eliminacyjna
  cravings:  { cost: 300, scoreW: 1.2 },   // głód na słodycze - insulinooporność, gorsze żywienie
  recovery:  { cost: 400, scoreW: 1.4 },   // wolna regeneracja - zmarnowane treningi, suplementy
  focus:     { cost: 500, scoreW: 1.7 },   // koncentracja - utracona produktywność, nootropiki
  headaches: { cost: 400, scoreW: 1.3 },   // bóle głowy - leki, wizyty, absencja w pracy
  sweating:  { cost: 300, scoreW: 1.2 },   // nocne poty - zaburzony sen, testy hormonalne
  heartRate: { cost: 450, scoreW: 1.5 },   // podwyższone tętno - kardiolog, stres, substancje
  procrastination: { cost: 450, scoreW: 1.6 }, // prokrastynacja - utracona produktywność, gorsze decyzje
  impatience: { cost: 300, scoreW: 1.3 },      // brak cierpliwości - impulsywne decyzje, porzucanie planów
  memory: { cost: 500, scoreW: 1.8 },          // słabsza pamięć - neuroplastyczność, hipokamp
  confidence: { cost: 400, scoreW: 1.5 },      // mniejsza pewność siebie - gorsze decyzje zawodowe
};

// Oblicz ważony koszt sygnałów i ważony score sygnałów
export function tagCost(tags: Set<ChipKey>): number {
  let total = 0;
  tags.forEach(t => { total += TAG_WEIGHTS[t]?.cost || 350; });
  return total;
}
export function tagScoreWeighted(tags: Set<ChipKey>): number {
  let total = 0;
  tags.forEach(t => { total += TAG_WEIGHTS[t]?.scoreW || 1.0; });
  return total;
}

export function costs(D: FD) {
  // ── TWARDE KOSZTY - wydajesz wprost, weryfikowalne ──
  const wkndCost = Math.round((D.cash + D.subs) * D.wknd * 6);
  const foodCost = Math.round(D.junk * 6);
  const trainCost = 0; // koszt siłowni wypadł z diagnostyki (nie podbijamy nim rachunku)
  // Sen: kompensacja deficytu - kawa, suplementy, gorsze decyzje zakupowe (Cappuccio 2010)
  const sleepCostRaw = D.sleep < 7 ? Math.round((7.5 - D.sleep) * 140 * 6) : 0;
  const sleepCost = D.sleep >= 6.5 ? Math.round(sleepCostRaw * 0.5) : sleepCostRaw;

  // ── UKRYTE KOSZTY - szacunek oparty na badaniach naukowych ──
  // Produktywność: mgła x stawka x 26 tyg. (RAND 2016: <6h snu = -2.4% GDP; Hemp HBR 2004: praca w obniżonej formie 3x droższa niż absencja)
  const wkndScale = Math.min(D.wknd / 2, 1); // skalowanie dla rzadko imprezujących
  const prodCost = Math.round(D.lost * 26 * D.rate * wkndScale);
  // Stagnacja: treningi bez progresu bo fundamenty nie grają
  const brakes = [
    D.sleepQ >= 2 || D.sleep < 6.5,       // kiepski sen / za mało snu
    D.dietChaos >= 2 || D.binge >= 2,      // chaos w żywieniu
    D.stress >= 3 || D.energy >= 3,        // wysoki stres / wypalenie
    D.drinks > 5 || D.subs > 0,           // alkohol / substancje
    D.dopamine >= 3,                       // rozregulowana dopamina
  ].filter(Boolean).length;
  const wastedPct = Math.min(brakes * 12 * Math.min(D.wknd / 2, 1), 60);
  const wastedSessions = D.plan > 0 ? Math.round(D.plan * 26 * wastedPct / 100) : 0;
  const stagnationMonths = Math.round(brakes * 1.5 * Math.min(D.wknd / 2, 1) * 10) / 10;
  const costPerSession = D.plan > 0 ? D.gym / (D.plan * 4) : 0;
  const stagnationCost = Math.round(wastedSessions * (costPerSession + 1.25 * Math.max(D.rate * 0.2, 10)) * wkndScale);
  // Symptomy: ważony koszt - każdy objaw ma inną wagę (250-600 zł / 6 mies.)
  const signalCost = Math.round(tagCost(D.tags));

  const totalLostH = Math.round(D.lost * 26);
  const hardTotal = wkndCost + foodCost; // tylko realny wydatek (weekend + dowozy), bez siłowni i „kompensacji snu"
  const hiddenTotal = prodCost + stagnationCost + signalCost; // liczone, ale NIE idą do wyświetlanej kwoty
  const total = hardTotal; // gate/kotwica pokazują wyłącznie realny wydatek

  return { sleepCost, foodCost, wkndCost, trainCost, prodCost, stagnationCost, signalCost,
           total, hardTotal, hiddenTotal, totalLostH,
           brakes, wastedPct, wastedSessions, stagnationMonths };
}

export function score(D: FD) {
  // Ważony score - AGRESYWNY scoring, typowy user 40-55% potencjału
  // Max possible: 20+25+15+20+18+15+12 = 125, capped at 100
  const tagScore = tagScoreWeighted(D.tags);
  const s =
    // Sen (max 20): sleep 5h + bad quality + phone = 20
    Math.min(((D.sleepQ + D.screenBed) / 4 + (7.5 - Math.min(D.sleep, 7.5))) * 6, 20)
    // Stres (max 25): stress 3 + energy 3 + dopamine 3 = 25
    + Math.min((D.stress + D.energy + D.dopamine) * 2.8, 25)
    // Dieta (max 15): wieczorne jedzenie bez kontroli (binge 0-4)
    + Math.min(D.binge * 3.5, 15)
    // Weekend (max 20): jak mocno weekend rusza rytm (wknd 0-4) + opcjonalna dawka
    + Math.min(D.wknd * 3.5 + D.drinks * 0.8, 20)
    // Trening (max 18): miss + niezadowolenie (bez kary dla początkujących, trainHappy=3) + brak planu
    + Math.min(D.miss * 4 + (D.trainHappy >= 1 && D.trainHappy <= 2 ? 5 : 0) + (D.trainPlan >= 1 ? 3 : 0), 18)
    // Sygnaly (max 15): 5+ tags = 15
    + Math.min(tagScore * 1.5, 15)
    // Glowa (max 12): no progress + long hours + bad monday + tried before
    + Math.min((D.progress >= 2 ? 5 : D.progress >= 1 ? 2 : 0) + (D.workHours > 9 ? 3 : D.workHours > 8 ? 1 : 0) + (D.mondayFeel >= 2 ? 3 : D.mondayFeel >= 1 ? 1 : 0) + (D.triedBefore >= 2 ? 3 : D.triedBefore >= 1 ? 1 : 0), 12)
    // Jakosc/hormony (max 12): warzywa + bialko + poranny wzwod (opcjonalny). Suplementy NIE liczą się do score. Defaulty=0 = zero inflacji.
    + Math.min(D.veggies * 2 + D.protein * 2 + D.morningWood * 2, 12);
  return Math.min(Math.round(s), 100);
}

// ── ARCHETYP: nazwany typ leada z wzorca odpowiedzi (identity + share hook) ──
export interface Archetype { key: string; label: string; tagline: string; mirror: string; }
export function pickArchetype(D: FD, worstLabel: string): Archetype {
  // 1. Wiem wszystko, nie dowożę - identity-priority (ICP: wiedza bez wdrożenia)
  if (D.trainYears >= 3 && D.triedBefore >= 2 && (D.trainHappy >= 1 || D.progress >= 1)) {
    return {
      key: 'wiedza_bez_wdrozenia',
      label: 'Wiem wszystko, nie dowożę',
      tagline: 'Teorię znasz lepiej niż połowa trenerów. Po ciele tego nie widać.',
      mirror: 'Lata treningu, dziesiątki obejrzanych filmów, a wynik stoi w miejscu. Wiedzy masz aż nadto. Brakuje kogoś, kto ułoży ją pod Twój tydzień i rozliczy Cię z niego, zamiast dawać kolejną porcję teorii.',
    };
  }
  // 2. Weekend cofa mnie do zera
  if (worstLabel === 'Weekend' || D.drinks >= 8 || D.wknd >= 3) {
    return {
      key: 'weekend_reset',
      label: 'Weekend cofa mnie do zera',
      tagline: 'Pięć dni budujesz. Dwa dni kasujesz.',
      mirror: 'W tygodniu trzymasz się nieźle. Potem przychodzi weekend i w poniedziałek zaczynasz od tego samego miejsca. Nie od zera, od minusa, bo dochodzi kac, gorszy sen i wyrzuty.',
    };
  }
  // 3. Głowa zajeżdża ciało
  if (worstLabel === 'Stres' || worstLabel === 'Głowa' || (D.stress >= 2 && D.workHours >= 9)) {
    return {
      key: 'glowa_zajezdza',
      label: 'Głowa zajeżdża ciało',
      tagline: 'Problem nie zaczyna się na talerzu. Zaczyna się w głowie o 22:00.',
      mirror: 'Robota, napięcie, telefon do późna. Ciało dostaje resztki. Zanim wjedzie kolejny plan, trzeba zejść z tego, co zjada Ci sen, apetyt i decyzje wieczorem.',
    };
  }
  // 4. Wieczorny odpad
  if (worstLabel === 'Żywienie' || worstLabel === 'Sen' || D.binge >= 2 || D.screenBed >= 2) {
    return {
      key: 'wieczorny_odpad',
      label: 'Dzień na kredycie',
      tagline: 'W dzień masz kontrolę. Wieczorem organizm odbiera dług.',
      mirror: 'Do osiemnastej jesteś ogarnięty. Potem leci telefon, lodówka i sen po pierwszej. Wieczorem spłacasz rachunek za cały dzień na kawie i stresie. Silna wola nie ma tu nic do gadania.',
    };
  }
  // 5. default - silnik bez paliwa
  return {
    key: 'silnik_bez_paliwa',
    label: 'Silnik bez paliwa',
    tagline: 'Niby wszystko robisz. Niby nic nie działa.',
    mirror: 'Trenujesz, pilnujesz jedzenia, a i tak lecisz na pół mocy. Coś pod spodem nie gra: sen, hormony, regeneracja. To się sprawdza, nie zgaduje.',
  };
}

// ── PRZEDZIAŁ PĘKNIĘCIA: uczciwy zakres z odpowiedzi usera (breakWindow), NIE zmyślona minuta ──
export function hourRange(D: FD): string {
  switch (D.breakWindow) {
    case 0: return 'zaraz po przebudzeniu';
    case 1: return 'między 10:00 a 14:00';
    case 2: return 'między 14:00 a 18:00';
    case 3: return 'między 18:00 a 21:00';
    case 4: return 'po 21:00';
    case 5: return 'w weekend';
    case 6: return 'różnie, bez jednej stałej pory';
    default: return 'wieczorem';
  }
}
