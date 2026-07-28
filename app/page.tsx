'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  buildNaborPilotUrl,
  FUNNEL_PILOT_VERSION,
  isFunnelDryRunHost,
  readSafeFunnelContext,
  sanitizeAnalyticsData,
} from './lib/funnel-pilot';
import WeekPage from './components/WeekPage';
import { buildWeekPlan } from './lib/week-plan';
import {
  type ChipKey,
  type FD,
  type Archetype,
  INIT,
  tagScoreWeighted,
  anchorRok,
  costs,
  score,
  pickArchetype,
  hourRange,
} from './lib/diagnostic-core';

const PILOT_NABOR_DESTINATION = process.env.NEXT_PUBLIC_FUNNEL_NABOR_URL || 'https://nabor.talerzihantle.com/';

// ── Tracking: wysyłka eventów do n8n via sendBeacon ──
function trackEvent(event: string, data?: Record<string, unknown>) {
  try {
    const isBrowser = typeof window !== 'undefined';
    const isDryRun = isBrowser && isFunnelDryRunHost(window.location.hostname);
    const payload = {
      event,
      page: 'diagnostyka',
      funnel_version: FUNNEL_PILOT_VERSION,
      ...(isBrowser ? readSafeFunnelContext(window.location.search) : {}),
      ...sanitizeAnalyticsData(data),
      ts: Date.now(),
      url: isBrowser ? `${window.location.origin}${window.location.pathname}` : '',
    };
    if (isDryRun) {
      const localWindow = window as typeof window & { __FUNNEL_PILOT_EVENTS__?: Array<typeof payload> };
      localWindow.__FUNNEL_PILOT_EVENTS__ ||= [];
      localWindow.__FUNNEL_PILOT_EVENTS__.push(payload);
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(
        'https://n8n.srv1313512.hstgr.cloud/webhook/diagnostyka-events',
        JSON.stringify(payload)
      );
    }
  } catch (_e) {}
}

// ── Meta Pixel: bezpieczne wywolanie fbq (skrypt zaladowany w layout.tsx) ──
function fbqTrack(event: string, params?: Record<string, unknown>) {
  try {
    if (typeof window === 'undefined') return;
    const w = window as unknown as { fbq?: (...args: unknown[]) => void };
    if (typeof w.fbq === 'function') {
      if (params) w.fbq('track', event, params);
      else w.fbq('track', event);
    }
  } catch (_e) {}
}

// ── Mobile haptic feedback - krotka wibracja przy interakcji ──
function vibe(pattern: number | number[] = 8) {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      (navigator as Navigator).vibrate(pattern);
    }
  } catch (_e) {}
}

// ── Confetti burst - 30 czastek z punktu klikniecia, CSS animacja ──
function spawnConfetti() {
  if (typeof document === 'undefined') return;
  const colors = ['#D4A853', '#10B981', '#A855F7', '#EF4444', '#06B6D4', '#F59E0B'];
  for (let i = 0; i < 30; i++) {
    const el = document.createElement('div');
    const c = colors[Math.floor(Math.random() * colors.length)];
    el.style.cssText = `position:fixed;left:50%;top:60%;width:${6 + Math.random() * 6}px;height:${6 + Math.random() * 6}px;background:${c};border-radius:${Math.random() > 0.5 ? '50%' : '2px'};pointer-events:none;z-index:99999;transform:translate(-50%,-50%);transition:none;will-change:transform,opacity`;
    document.body.appendChild(el);
    requestAnimationFrame(() => {
      const angle = (Math.random() * Math.PI) - Math.PI / 2 - Math.PI / 4 + (Math.random() * Math.PI / 2);
      const dist = 280 + Math.random() * 320;
      const x = Math.cos(angle) * dist;
      const y = Math.sin(angle) * dist - 200;
      const rot = (Math.random() - 0.5) * 720;
      el.style.transition = 'transform 1.8s cubic-bezier(.18,.9,.4,1), opacity 1.8s ease-out';
      el.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${rot}deg)`;
      el.style.opacity = '0';
    });
    setTimeout(() => el.remove(), 2000);
  }
}

// Reframe generowany przez Claude (klasyfikuj-nie-zmysluj) z wpisanego tekstu leada
interface ReframeData {
  cytat?: string;
  falszywe_zalozenie?: string;
  mechanizm?: string;
  kolejnosc?: string[];
  pulapka?: string;
}

type SevKey = 'sleepQ' | 'screenBed' | 'stress' | 'energy' | 'dopamine' | 'dietChaos' | 'binge';

// Suplementy do multi-select (bitmask). Kolejnosc = priorytet hormonalny.
const SUPP_OPTS: [number, string][] = [[1, 'Witamina D3'], [2, 'Omega-3'], [4, 'Kreatyna'], [8, 'Magnez']];

const SECTIONS = ['Sen', 'Stres', 'Żywienie', 'Weekend', 'Trening', 'Sygnały', 'Głowa'];
const RZYM = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

// ── Profile podglądu: ?resultPreview=1..5 renderuje stronę wyniku bez przechodzenia quizu ──
type PreviewProfile = { D: Partial<Omit<FD, 'tags'>> & { tags: ChipKey[] }; pain: string; trigger: string; selfDx: string; imie: string };
const PREVIEW_PROFILES: Record<string, PreviewProfile> = {
  '1': { // Wiem wszystko, nie dowożę
    D: { age: 33, sleep: 6, sleepQ: 1, screenBed: 2, stress: 2, energy: 2, dopamine: 1, workHours: 10, lost: 1.5, progress: 2, dietChaos: 1, junk: 250, binge: 1, wknd: 1, drinks: 4, cash: 150, subs: 0, mondayFeel: 1, weekendWork: 1, gym: 150, plan: 4, miss: 1, trainYears: 6, trainHappy: 2, rate: 110, triedBefore: 2, raise: 2, defer: 2, retreat: 3, tags: ['fatigue', 'belly', 'motivation', 'recovery'] },
    pain: 'trenuję lata i dalej wyglądam tak samo', trigger: 'zdjęcie z wesela', selfDx: 'chyba brak konsekwencji', imie: 'Kamil',
  },
  '2': { // Weekend cofa mnie do zera (drinks>=8 odpala regułę 2, triedBefore<2 omija regułę 1)
    D: { age: 28, sleep: 6.5, sleepQ: 1, screenBed: 1, stress: 1, energy: 2, dopamine: 2, workHours: 9, lost: 1, progress: 1, dietChaos: 2, junk: 400, binge: 1, wknd: 4, drinks: 12, cash: 400, subs: 150, mondayFeel: 3, weekendWork: 2, gym: 150, plan: 3, miss: 2, trainYears: 3, trainHappy: 1, rate: 90, triedBefore: 1, raise: 1, defer: 1, retreat: 1, tags: ['fatigue', 'mood', 'cravings', 'anxiety'] },
    pain: 'weekend rozwala mi cały tydzień', trigger: 'kolejny stracony poniedziałek', selfDx: 'za dużo imprez', imie: '',
  },
  '3': { // Głowa zajeżdża ciało (stres 3 + praca 12h odpala regułę 3, triedBefore<2 omija regułę 1)
    D: { age: 31, sleep: 5.5, sleepQ: 3, screenBed: 3, stress: 3, energy: 3, dopamine: 3, workHours: 12, lost: 2.5, progress: 2, dietChaos: 2, junk: 300, binge: 1, wknd: 1, drinks: 3, cash: 100, subs: 0, mondayFeel: 2, weekendWork: 1, gym: 100, plan: 3, miss: 1, trainYears: 4, trainHappy: 1, rate: 130, triedBefore: 1, raise: 3, defer: 3, retreat: 0, tags: ['fatigue', 'brain', 'focus', 'anxiety', 'headaches', 'procrastination'] },
    pain: 'głowa mi paruje, wieczorem nie mam już nic', trigger: 'prawie zasnąłem na spotkaniu', selfDx: 'za dużo roboty', imie: 'Michał',
  },
  '4': { // Wieczorny odpad (Żywienie najgorsze + binge 3 odpala regułę 4; stres 1 i praca 8h omijają regułę 3)
    D: { age: 30, sleep: 6, sleepQ: 2, screenBed: 3, stress: 1, energy: 2, dopamine: 2, workHours: 8, lost: 1, progress: 1, dietChaos: 3, junk: 500, binge: 3, wknd: 2, drinks: 6, cash: 200, subs: 0, mondayFeel: 1, weekendWork: 1, gym: 120, plan: 3, miss: 2, trainYears: 3, trainHappy: 1, rate: 85, triedBefore: 1, raise: 1, defer: 2, retreat: 1, tags: ['belly', 'cravings', 'fatigue', 'digest', 'confidence'] },
    pain: 'trzymam się cały dzień i wieczorem wszystko się sypie', trigger: 'znowu zjadłem pół lodówki o 23', selfDx: 'słaba wola wieczorem', imie: 'Bartek',
  },
  '5': { // Silnik bez paliwa (niski score = tier LOW "cieknacy zawor"; Trening najgorszy = furtka do typu domyślnego)
    D: { age: 27, sleep: 7, sleepQ: 0, screenBed: 0, stress: 1, energy: 1, dopamine: 0, workHours: 8, lost: 0.5, progress: 1, dietChaos: 1, junk: 150, binge: 1, wknd: 1, drinks: 3, cash: 100, subs: 0, mondayFeel: 0, weekendWork: 0, gym: 150, plan: 3, miss: 1, trainYears: 2, trainHappy: 1, rate: 80, triedBefore: 1, raise: 2, defer: 1, retreat: 2, tags: ['libido', 'sweating'] },
    pain: 'niby wszystko robię a lecę na pół gwizdka', trigger: 'badania wyszły dziwne', selfDx: 'nie wiem co jest', imie: '',
  },
  '6': { // IDEALNY tydzień - test DOBREJ ścieżki (good=true, SC~0): sen, dieta, trening, głowa - wszystko gra
    D: { age: 30, breakWindow: 6, sleep: 8, sleepQ: 0, screenBed: 0, stress: 0, energy: 0, dopamine: 0, dietChaos: 0, junk: 100, binge: 0, wknd: 0, drinks: 0, cash: 0, subs: 0, lost: 0, plan: 4, miss: 0, gym: 150, rate: 100, workHours: 8, progress: 0, mondayFeel: 0, weekendWork: 0, trainYears: 5, trainHappy: 0, triedBefore: 0, raise: 0, defer: 0, retreat: 0, veggies: 0, protein: 0, morningWood: 0, supps: 7, tags: [] },
    pain: 'w sumie jest okej, ale ciekawość', trigger: 'chcę sprawdzić, czy da się lepiej', selfDx: 'chyba wszystko gra', imie: 'Adam',
  },
};
// Pierwszy ruch per kategoria - jeden konkret na dzis, nie plan na pol strony
const RUCH_MAP: Record<string, string> = {
  'Sen': '90 minut bez ekranu przed snem. Trzy wieczory z rzędu.',
  'Stres': '10 minut marszu zaraz po robocie, zanim usiądziesz do telefonu.',
  'Żywienie': 'Normalny posiłek, zanim wieczorem odpalisz telefon.',
  'Weekend': 'Poniedziałek bez karnego treningu. Spacer, woda, normalne jedzenie.',
  'Trening': 'Jeden krótszy trening zrobiony dziś zamiast idealnego planu od poniedziałku.',
  'Głowa': 'Jedna decyzja zapisana wieczorem na kartce. Rano wykonana przed telefonem.',
};
// Mood color per sekcja - subtelny radial gradient na tle dla emocjonalnej variation
const SECTION_HUES = ['#4F46E5', '#EF4444', '#F59E0B', '#A855F7', '#10B981', '#06B6D4', '#D4A853'];

// Capitalize first letter (poprawia imię wpisane mała literą)
function capName(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

// ── TWOJA GODZINA: pora doby w której tydzień pęka, liczona z odpowiedzi (deterministyczna, per user) ──
// yourHour() usunięte: zmyślało minutę z wieku/pracy/snu. Zastąpione przez hourRange()/breakPos() z realnej odpowiedzi breakWindow.
// hourRange() przeniesione do ./lib/diagnostic-core

// Pozycja na osi doby (0-100%) dla znacznika „TU PĘKASZ", z breakWindow zamiast parsowania fikcyjnej godziny
function breakPos(D: FD): number {
  switch (D.breakWindow) {
    case 0: return 30; case 1: return 50; case 2: return 67;
    case 3: return 79; case 4: return 90; case 5: return 96; case 6: return 60;
    default: return 85;
  }
}
// Krótki token pory do karty share/OG (długi przedział rozwaliłby grafikę)
function hourShort(D: FD): string {
  switch (D.breakWindow) {
    case 0: return 'rano'; case 1: return 'przed 14'; case 2: return 'popołudniu';
    case 3: return '18-21'; case 4: return 'po 21'; case 5: return 'weekend'; case 6: return 'różnie';
    default: return 'wieczór';
  }
}

// ── ROZBIEŻNOŚĆ: przyłapanie na sprzeczności między dwiema odpowiedziami usera ──
function contradiction(D: FD, selfDx: string): { said: string; body: string } | null {
  // Przylapanie musi byc TWARDE albo zadne - miekka rozbieznosc czyta sie jak trik
  if (D.trainYears >= 2 && D.progress >= 2) {
    return { said: `Trenujesz od ${D.trainYears} lat.`, body: `Postępy rok do roku: nie widzisz.` };
  }
  if (D.gym >= 100 && D.miss >= 2) {
    return { said: `Płacisz ${D.gym} zł miesięcznie za siłownię.`, body: `Odpuszczasz około ${D.miss * 4} treningów w miesiącu.` };
  }
  const sd = selfDx.trim();
  if (sd) {
    return { said: `„${sd.slice(0, 90)}${sd.length > 90 ? '…' : ''}"`, body: `Sen ${D.sleep} h, ${D.drinks} drinków w weekend, ${D.miss} treningi odpuszczane w tygodniu.` };
  }
  return null;
}

// ── PERSONALIZACJA WYNIKU: kazdy blok decyzyjny budowany z odpowiedzi usera, zero uniwersalnych obietnic ──
const LEAK_LINE: Record<string, string> = {
  'Sen': 'spadek regeneracji NREM obniża energię i koncentrację w ciągu dnia',
  'Stres': 'utrzymujące się napięcie osi HPA blokuje wieczorny wypoczynek',
  'Żywienie': 'brak kontroli nad posiłkami w ciągu dnia skutkuje wieczornym apetytem kompensacyjnym',
  'Weekend': 'zaburzenie rytmu dobowego w weekend przekłada się na mniejszą sprawność w poniedziałek',
  'Trening': 'przeładowany plan w połączeniu ze stresem hamuje postępy sylwetkowe',
  'Głowa': 'nagromadzone otwarte pętle decyzyjne zjadają zasoby uwagi',
};
const LEAK_MOVE: Record<string, string> = {
  'Sen': '60 minut bez ekranów przed pójściem spać przez kolejne 3 wieczory.',
  'Stres': '15 minut spaceru bez telefonu bezpośrednio po zakończeniu pracy.',
  'Żywienie': 'Pełnowartościowy posiłek zjedzony zanim wejdziesz w stan zmęczenia wieczornego.',
  'Weekend': 'Stała pora pobudki w niedzielę z zachowaniem porannego nawodnienia i spaceru.',
  'Trening': 'Skrócenie sesji do 3-4 kluczowych ćwiczeń o wysokiej jakości.',
  'Głowa': 'Zapisanie jednego priorytetu na jutro przed zamknięciem dnia.',
};
const BENEFIT_30: Record<string, string> = {
  'Sen': 'Szybsze zasypianie i pobudka z pełnym zasobem energii przed alarmem',
  'Stres': 'Płynne przechodzenie w stan wypoczynku po zakończeniu pracy',
  'Żywienie': 'Pełna kontrola nad wieczornym apetytem bez konieczności używania silnej woli',
  'Weekend': 'Zachowanie wysokiej wydajności w poniedziałek od samego rana',
  'Trening': 'Stały progres sylwetkowy przy zoptymalizowanym czasie treningu',
  'Głowa': 'Wysoka koncentracja w kluczowych godzinach pracy',
};
const TAIL_LINE: Record<string, string> = {
  'Sen': 'Regeneracyjny sen staje się fundamentem efektywności.',
  'Stres': 'Układ nerwowy odzyskuje zdolność do szybkiej samoregulacji.',
  'Żywienie': 'Zrównoważone żywienie wspiera Twoje cele bez zbędnych wyrzeczeń.',
  'Weekend': 'Weekend przynosi realny odpoczynek bez długu regeneracyjnego.',
  'Trening': 'Treningi przynoszą oczekiwane rezultaty przy zachowaniu zdrowia.',
  'Głowa': 'Praca staje się bardziej uporządkowana i mniej obciążająca.',
};
const SCENE_LINE: Record<string, string> = {
  'Sen': 'Pobudka na zmęczeniu i konieczność wspomagania się kofeiną od pierwszych minut dnia.',
  'Stres': 'Trudność z wyłączeniem myśli o sprawach zawodowych podczas wieczornego odpoczynku.',
  'Żywienie': 'Sięganie po wysokokaloryczne przekąski po 21:00 jako forma rozładowania napięcia.',
  'Weekend': 'Odczuwalny spadek energii w poniedziałek rano po szarpanym weekendzie.',
  'Trening': 'Nieregularne sesje treningowe i brak widocznych efektów mimo spędzonych godzin na siłowni.',
  'Głowa': 'Odkładanie trudniejszych decyzji na później ze względu na zmęczenie psychiczne.',
};
// SMACZEK 1: bonus pod największy hamulec - konkretny, mało oczywisty ruch (wzajemność, realna wartość)
const BONUS_HAMULEC: Record<string, string> = {
  'Sen': 'Większość pilnuje długości snu, a rozjeżdża ich światło i temperatura. Zbij sypialnię do 18-19°C i złap 10 minut słońca w oczy w pierwszej godzinie po wstaniu. To przesuwa rytm mocniej niż godzina snu więcej.',
  'Stres': 'Napięcie samo nie schodzi, trzeba mu dać zejście przed snem. 10 minut marszu bez telefonu zaraz po robocie robi dla kortyzolu więcej niż godzina na kanapie z ekranem.',
  'Żywienie': 'Wieczorny głód bierze się zwykle z dnia na kawie i dwóch byle jakich posiłkach. Dołóż konkretne białko do śniadania, a wieczór siada prawie sam.',
  'Weekend': 'Najwięcej kosztuje Cię brak dnia na powrót, nie samo wyjście. Zaplanuj niedzielę jako reset (sen, woda, spacer, normalne jedzenie), a poniedziałek przestaje być odrabianiem.',
  'Trening': 'Zetnij plan do wersji, którą dowieziesz w najgorszy tydzień. Jeden trening 30 minut zrobiony bije idealny 90-minutowy, który odpuścisz.',
  'Głowa': 'Odkładanie bierze się z za wielu otwartych pętli naraz. Wieczorem zapisz jedną decyzję na kartce i zrób ją rano przed telefonem. Jedna zamknięta pętla dziennie odblokowuje resztę.',
};
// ── ROADMAPA 1:1: copy per kategoria (workflow roadmapa-copy-engine, zweryfikowane anty-slop + ICP-sceptyk 2026-07-15) ──
const ROADMAPA_KARTY: Record<string, { dzwignia: string; dno: string; robimy: string; poznasz: string }> = {
  'Sen': {
    dzwignia: 'Odblokowanie regeneracji i rytmu dobowego',
    dno: 'Późne zasypianie i szarpany sen sprawiają, że pierwszą część dnia ciągniesz na porannej kawie, a szczyt koncentracji przesuwa się na późne popołudnie.',
    robimy: 'Stabilizujemy ekspozycję na światło dzienne rano (naturalny reset kortyzolu) i przesuwamy pierwszą kofeinę o 60-90 minut po wybudzeniu, aby uniknąć popołudniowego zjazdu energii.',
    poznasz: 'Wstajesz z głową gotową do działania bez konieczności reanimacji kawą.',
  },
  'Stres': {
    dzwignia: 'Wyciszenie osi HPA po zakończeniu pracy',
    dno: 'Mimo zamknięcia komputera układ nerwowy pozostaje w gotowości bojowej, a skumulowane napięcie obniża jakość odpoczynku i utrudnia zasypianie.',
    robimy: 'Wdrażamy fizyczny protokół przejścia (krótki marsz, wydech dłuższy od wdechu) oraz stałą granicę zakończenia dnia pracy, dając mózgowi sygnał do przejścia w tryb regeneracji.',
    poznasz: 'Wieczorem potrafisz w pełni odciąć się od spraw zawodowych i zregenerować siły.',
  },
  'Żywienie': {
    dzwignia: 'Stabilizacja apetytu w ciągu dnia zamiast walki z głodem wieczorem',
    dno: 'Nieregularne posiłki w trakcie intensywnego dnia pracy prowadzą do głodu kompensacyjnego i podjadania po 21:00.',
    robimy: 'Podnosimy udział białka do 30-40 g w pierwszym posiłku (obniżenie greliny) oraz planujemy sytą kolację bez poczucia winy, eliminując chaotyczne sięganie po przekąski.',
    poznasz: 'Wieczorny apetyt jest pod pełną kontrolą bez używania silnej woli.',
  },
  'Weekend': {
    dzwignia: 'Ochrona rytmu dobowego podczas luźniejszych dni',
    dno: 'Znaczne przesunięcie pory snu i posiłków w weekend skutkuje jet-lagiem społecznym w poniedziałek rano.',
    robimy: 'Utrzymujemy stałą porę pobudki w niedzielę i stosujemy ukierunkowany protokół nawodnienia oraz spaceru, dzięki czemu poniedziałek rozpoczynasz bez długu regeneracyjnego.',
    poznasz: 'W poniedziałek rano wchodzisz w pracę od razu na pełnych obrotach.',
  },
  'Trening': {
    dzwignia: 'Dopasowanie objętości treningowej do zdolności regeneracyjnych',
    dno: 'Przeładowany plan treningowy w połączeniu ze stresem zawodowym prowadzi do przetrenowania, braku postępów sylwetkowych i odpuszczania sesji.',
    robimy: 'Redukujemy objętość do 3-4 kluczowych serii roboczych o wysokiej intensywności, dając mięśniom bodziec do wzrostu bez przeciążania układu nerwowego.',
    poznasz: 'Treningi przynoszą widoczne efekty sylwetkowe, a po wyjściu z siłowni masz siłę na resztę dnia.',
  },
  'Głowa': {
    dzwignia: 'Zamykanie otwartych pętli decyzyjnych',
    dno: 'Wielozadaniowość i ciągłe rozpraszacze zużywają energię psychiczną, prowadząc do odkładania kluczowych zadań na później.',
    robimy: 'Stosujemy wieczorną sekwencję planowania (1 kluczowe zadanie na rano) oraz pracę w bloku głębokim bez powiadomień.',
    poznasz: 'Realizujesz najważniejsze zadania w pierwszej kolejności bez prokrastynacji.',
  },
};

// Weekendowe "drugie dno" personalizowane odpowiedzia wkndWhat (co konkretnie sie sypie)
const WKND_DNO: Record<number, string> = {
  0: 'Sobota do południa w łóżku, niedziela do jedenastej, a poniedziałkowy budzik o 6:30 uderza jak jet lag po locie przez dwie strefy czasowe.',
  1: 'Od piątkowego wieczoru jedzenie leci luzem, a w poniedziałek rano patrzysz w lustro i liczysz, ile z tygodnia właśnie oddałeś.',
  2: 'Cały tydzień pilnujesz kroków i treningów, a weekend to kanapa i telefon, po których ciało w poniedziałek jest sztywne jak po chorobie.',
  3: 'W poniedziałek o 9:00 siedzisz na spotkaniu z trzecią kawą i udajesz, że słuchasz, a w głowie masz jedno: do środy będę spłacał ten weekend.',
};

// SMACZEK 2: belief-shift z realnych odpowiedzi (myślisz X, a to Y). HIDDEN = ukryte drivery pod objawami.
const HIDDEN_DRIVERS = ['Sen', 'Stres', 'Głowa'];
function zaskoczenie(worst: string, second: string): string {
  if (HIDDEN_DRIVERS.includes(worst)) {
    return `Większość na Twoim miejscu obwinia jedzenie i trening. Twoje odpowiedzi pokazują, że najpierw wysiada Ci ${worst.toLowerCase()}, a dopiero to rozwala apetyt, energię i motywację. Naprawiasz skutki, nie źródło.`;
  }
  return `${worst} wygląda na Twój główny problem. Ale to raczej objaw. Pod spodem ciągnie ${second.toLowerCase()} i dopóki to gra przeciw Tobie, ${worst.toLowerCase()} będzie wracać.`;
}
// DOBRY TYDZIEŃ: zaskoczenie i archetyp po pozytywnej stronie (Michał: dobrze = piszemy dobrze, nie wymyślamy problemów)
function zaskoczenieDobry(best: string): string {
  return `Większość, kto to wypełnia, szuka u siebie, co naprawić. U Ciebie tego nie ma. Najmocniej trzymasz ${best.toLowerCase()}, a reszta za tym idzie. Zostaje jedno pytanie: jak z dobrego zrobić świetne.`;
}
function archetypeGood(best: string): Archetype {
  return {
    key: 'ogarniety',
    label: 'Ogarnięty',
    tagline: 'Trzymasz tydzień w ryzach. Większość o tym dopiero marzy.',
    mirror: `Sen, energia, jedzenie, trening. U Ciebie to w większości gra, bo tak układasz tydzień. Najmocniej trzymasz ${best.toLowerCase()}. Do podkręcenia zawsze coś się znajdzie, ale startujesz z pozycji, z której inni dopiero chcą wystartować.`,
  };
}
function pickBenefits180(D: FD, badaniaCount: number): string[] {
  const out: string[] = [];
  if (D.tags.has('belly') || D.binge >= 2) out.push('Brzuch schodzi i widać to w lustrze');
  if (D.tags.has('libido')) out.push('Libido wraca do normy');
  if (D.tags.has('confidence')) out.push('Koszulka przestaje być tematem, na basenie i na fotkach');
  if (D.trainYears >= 2 && D.trainHappy >= 1) out.push('Po sylwetce w końcu widać lata treningu');
  if (D.tags.has('fatigue') || D.energy >= 2) out.push('Energia trzyma do wieczora bez trzeciej kawy');
  if (badaniaCount > 0) out.push('Panel krwi zrobiony i omówiony, zero zgadywania');
  out.push('Rytm tygodnia trzyma się sam, bez pilnowania');
  out.push('Forma rośnie, zamiast stać w miejscu');
  return out.slice(0, 3);
}

// ── OSIE HORMONALNE POD PRESJĄ: liczone z danych v5 (wzwód, sen, wyjścia, tagi, praca). Gate: oś pokazuje się TYLKO przy >=2 sygnałach. ──
function osieHormonalne(D: FD): { n: string; lvl: 2 | 3; why: string }[] {
  const out: { n: string; lvl: 2 | 3; why: string }[] = [];
  const t: string[] = []; let ts = 0;
  if (D.morningWood >= 1) { ts += D.morningWood; t.push(D.morningWood === 2 ? 'poranny wzwód rzadko' : 'poranny wzwód nieregularny'); }
  if (D.sleep < 6.5) { ts += 1; t.push(`sen ${D.sleep}h`); }
  if (D.drinks >= 8) { ts += 1; t.push('regularne wyjścia'); }
  if (D.tags.has('libido')) { ts += 1; t.push('spadek libido'); }
  if (D.tags.has('belly')) { ts += 1; t.push('tłuszcz na brzuchu'); }
  if (ts >= 2) out.push({ n: 'Testosteron', lvl: ts >= 4 ? 3 : 2, why: t.slice(0, 3).join(' + ') });
  const k: string[] = []; let ks = 0;
  if (D.stress >= 2) { ks += D.stress - 1; k.push('napięcie nie schodzi'); }
  if (D.sleep < 6.5) { ks += 1; k.push('krótki sen'); }
  if (D.workHours > 9) { ks += 1; k.push(`praca ${D.workHours}h dziennie`); }
  if (D.energy >= 2) { ks += 1; k.push('zmęczenie od rana'); }
  if (ks >= 2) out.push({ n: 'Kortyzol', lvl: ks >= 4 ? 3 : 2, why: k.slice(0, 3).join(' + ') });
  const dp: string[] = []; let ds = 0;
  if (D.dopamine >= 2) { ds += 1; dp.push('telefon co chwilę'); }
  if (D.defer >= 2) { ds += 1; dp.push('odkładane decyzje'); }
  if (D.screenBed >= 2) { ds += 1; dp.push('scroll przed snem'); }
  if (D.tags.has('motivation') || D.tags.has('procrastination')) { ds += 1; dp.push('napęd siada'); }
  if (ds >= 2) out.push({ n: 'Dopamina', lvl: ds >= 3 ? 3 : 2, why: dp.slice(0, 3).join(' + ') });
  const ins: string[] = []; let isc = 0;
  if (D.binge >= 2) { isc += 1; ins.push('wieczorne objadanie'); }
  if (D.tags.has('belly')) { isc += 1; ins.push('brzuch nie schodzi'); }
  if (D.tags.has('cravings')) { isc += 1; ins.push('głód na słodkie'); }
  if (D.veggies >= 2 || D.junk >= 400) { isc += 1; ins.push('jedzenie z dowozu i marketu'); }
  if (isc >= 2) out.push({ n: 'Insulina i apetyt', lvl: isc >= 3 ? 3 : 2, why: ins.slice(0, 3).join(' + ') });
  return out;
}

// Paleta: złoto + czerń, minimalizm
const M = {
  bg: '#0a0a0a',
  s1: '#131313',
  s2: '#1c1c1c',
  s3: '#252525',
  brd: '#222222',
  brd2: '#2e2e2e',
  gold: '#c8a84e',
  goldMuted: '#a08a3e',
  goldDim: '#8a7535',
  goldGlow: 'rgba(200,168,78,0.18)',
  red: '#dc4444',
  org: '#e8923a',
  yel: '#d4a82a',
  grn: '#3cba5e',
  t1: '#ffffff',
  t2: '#e0ddd6',
  t3: '#b8b3a8',
  t4: '#8a857a',
  mono: "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
  sans: "'Inter', system-ui, -apple-system, sans-serif",
  serif: "var(--font-display, 'Instrument Serif'), Georgia, serif",
};

// ── KONFIGURATOR (?config=1): warianty pierwszej i ostatniej strony, zapis w localStorage ──
type CfgT = {
  heroH1: 'A' | 'B' | 'C' | 'D' | 'E'; heroSub: 'A' | 'B'; badge: 'A' | 'B';
  font: 'instrument' | 'playfair' | 'cormorant'; heroSize: 'M' | 'L';
  cta: 'A' | 'B' | 'C'; crackTone: 'ostry' | 'spokojny';
  showOdczyt: boolean; showKontekst: boolean;
};
const CFG_DEFAULT: CfgT = { heroH1: 'A', heroSub: 'A', badge: 'A', font: 'instrument', heroSize: 'M', cta: 'A', crackTone: 'ostry', showOdczyt: true, showKontekst: true };
const FONT_MAP: Record<CfgT['font'], string> = {
  instrument: "'Instrument Serif', Georgia, serif",
  playfair: "'Playfair Display', Georgia, serif",
  cormorant: "'Cormorant Garamond', Georgia, serif",
};
// 5 KĄTÓW psychologicznych (Frame 1: diagnoza przed receptą; Caples: pytanie-samoselekcja; identity shift)
const HERO_H1: Record<CfgT['heroH1'], { pre: string; gold: string }> = {
  A: { pre: 'Ile potencjału tracisz przez to,', gold: 'co uznałeś już za normalne?' },
  B: { pre: 'Nie brakuje Ci dyscypliny.', gold: 'Brakuje Ci diagnozy.' },
  C: { pre: 'Robisz wszystko, co trzeba.', gold: 'I dalej lecisz na pół mocy?' },
  D: { pre: 'Wiesz o formie więcej niż niejeden trener.', gold: 'Po sylwetce nikt tego nie widzi.' },
  E: { pre: 'Kolejny plan odłożysz jak poprzednie.', gold: 'Najpierw zobacz, co go wywala.' },
};
const HERO_SUB: Record<CfgT['heroSub'], string> = {
  A: 'tę jedną godzinę i pierwszy ruch, który ją zamyka.',
  B: 'gdzie tydzień wycieka Ci najmocniej i co ruszyć pierwsze.',
};
const BADGE_V: Record<CfgT['badge'], string> = {
  A: 'Darmowa diagnostyka · 5 minut · wynik od razu',
  B: 'Darmowy przegląd · 5 minut · wynik od razu',
};
const CTA_LBL: Record<CfgT['cta'], string> = {
  A: 'ZOBACZ, JAK WYGLĄDA PROWADZENIE',
  B: 'ZOBACZ, JAK PRACUJĘ 1:1',
  C: 'SPRAWDŹ, CZY SIĘ ŁAPIESZ',
};

// ── PĘKNIĘCIA TYGODNIA: samoocena na koniec wyniku (commitment: sam odhacza, sam wydaje werdykt) ──
const CRACK_POOL: Record<string, string> = {
  'Sen': 'Budzik gra, a Ty jedziesz na baterii z wczoraj',
  'Stres': 'Ciało siedzi na kanapie, głowa dalej w robocie',
  'Żywienie': 'Po 21:00 kuchnia wygrywa z planem, który miałeś rano',
  'Weekend': 'Poniedziałek zaczyna się od odrabiania weekendu',
  'Trening': 'Trening był w planach. Znowu w planach.',
  'Głowa': 'Decyzje odkładasz, aż podejmą się same',
};

// ── HOOK: scroll progress bar ──
function useScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const scrolled = el.scrollTop;
      const total = el.scrollHeight - el.clientHeight;
      setProgress(total > 0 ? (scrolled / total) * 100 : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return progress;
}

// ── HOOK: scroll reveal dla sekcji wyników ──
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

// ── HOOK: animowany licznik ──
function useCounter(target: number, duration = 1200, active = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    // Pomijamy animację przy prefers-reduced-motion
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      const id = requestAnimationFrame(() => setVal(target));
      return () => cancelAnimationFrame(id);
    }
    const start = performance.now();
    const from = 0;
    const raf = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      // easeOutExpo
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      setVal(Math.round(from + (target - from) * eased));
      if (p < 1) requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }, [target, duration, active]);
  return val;
}

// ── KOMPONENT: Reveal wrapper z animacją wejścia ──
function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, visible } = useScrollReveal();
  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(18px)',
        transition: `opacity 0.55s ease ${delay}ms, transform 0.55s ease ${delay}ms`,
        width: '100%',
      }}
    >
      {children}
    </div>
  );
}

// ── KOMPONENT: Wave divider między sekcjami ──
function WaveDivider({ flip = false }: { flip?: boolean }) {
  return (
    <div style={{
      width: 'calc(100% + 32px)',
      overflow: 'hidden',
      lineHeight: 0,
      transform: flip ? 'scaleY(-1)' : 'none',
      margin: '0 -16px',
    }}>
      <svg
        viewBox="0 0 440 28"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        style={{ display: 'block', width: '100%', height: 28 }}
      >
        <path
          d="M0,14 C55,28 110,0 165,14 C220,28 275,0 330,14 C385,28 440,7 440,14 L440,28 L0,28 Z"
          fill="rgba(200,168,78,0.04)"
        />
        <path
          d="M0,18 C70,8 140,24 220,16 C300,8 370,22 440,16 L440,28 L0,28 Z"
          fill="rgba(200,168,78,0.025)"
        />
      </svg>
    </div>
  );
}

// ── KOMPONENT: Animowane niebo z gwiazdami ──
function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    // Sprawdź prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const DPR = window.devicePixelRatio || 1;

    // Konfiguracja gwiazd - subtelne, ledwo widoczne w tle
    const STAR_COUNT = 120;
    const SHOOTING_STAR_CHANCE = 0.0005; // rzadkie spadające gwiazdy

    // Rozmiar canvas
    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * DPR;
      canvas.height = h * DPR;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
    };
    resize();
    window.addEventListener('resize', resize, { passive: true });

    // Typy gwiazd - różne rozmiary i jasności
    interface Star {
      x: number; y: number;
      r: number;          // promień
      baseAlpha: number;  // bazowa jasność
      twinkleSpeed: number; // prędkość migotania
      twinklePhase: number; // faza migotania
      color: string;        // odcień gwiazdy
    }

    // Kolory gwiazd - głównie białe, kilka z lekkim odcieniem
    const starColors = [
      '255,255,255',   // biała (dominujące)
      '255,255,255',   // biała
      '255,255,255',   // biała
      '230,240,255',   // lekko niebieska
      '255,245,230',   // lekko ciepła
    ];

    const stars: Star[] = Array.from({ length: STAR_COUNT }, () => {
      const sizeRand = Math.random();
      // Normalne rozmiary, ale przyciemnione - subtelne tło
      const r = sizeRand < 0.55 ? Math.random() * 0.7 + 0.3
              : sizeRand < 0.82 ? Math.random() * 1.0 + 0.7
              : sizeRand < 0.95 ? Math.random() * 1.3 + 1.0
              : Math.random() * 1.8 + 1.5;
      return {
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r,
        baseAlpha: Math.random() * 0.12 + 0.06,  // subtelne: 0.06-0.18
        twinkleSpeed: Math.random() * 0.015 + 0.003,
        twinklePhase: Math.random() * Math.PI * 2,
        color: starColors[Math.floor(Math.random() * starColors.length)],
      };
    });

    // Spadające gwiazdy
    interface ShootingStar {
      x: number; y: number;
      vx: number; vy: number;
      life: number; maxLife: number;
      length: number;
    }
    const shootingStars: ShootingStar[] = [];

    let time = 0;

    const loop = () => {
      const W = window.innerWidth;
      const H = window.innerHeight;
      time += 1;

      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, W, H);

      // Rysowanie gwiazd z migotaniem
      for (const star of stars) {
        const twinkle = Math.sin(time * star.twinkleSpeed + star.twinklePhase);
        const alpha = star.baseAlpha + twinkle * 0.06;
        const clampedAlpha = Math.max(0.03, Math.min(0.25, alpha));

        // Delikatny glow tylko dla największych
        if (star.r > 1.5) {
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.r * 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${star.color},${clampedAlpha * 0.06})`;
          ctx.fill();
        }

        // Główna gwiazda
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${star.color},${clampedAlpha})`;
        ctx.fill();
      }

      // Spadające gwiazdy - tworzenie
      if (Math.random() < SHOOTING_STAR_CHANCE) {
        const angle = Math.random() * 0.5 + 0.3; // kąt 17-46 stopni
        const speed = Math.random() * 4 + 3;
        shootingStars.push({
          x: Math.random() * W * 0.8,
          y: Math.random() * H * 0.3,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          maxLife: Math.random() * 40 + 30,
          length: Math.random() * 80 + 40,
        });
      }

      // Spadające gwiazdy - renderowanie
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const ss = shootingStars[i];
        ss.x += ss.vx;
        ss.y += ss.vy;
        ss.life += 1;

        const progress = ss.life / ss.maxLife;
        const alpha = progress < 0.3 ? progress / 0.3
                    : progress > 0.7 ? (1 - progress) / 0.3
                    : 1;

        // Gradient ogon spadającej gwiazdy
        const tailX = ss.x - (ss.vx / Math.sqrt(ss.vx * ss.vx + ss.vy * ss.vy)) * ss.length * alpha;
        const tailY = ss.y - (ss.vy / Math.sqrt(ss.vx * ss.vx + ss.vy * ss.vy)) * ss.length * alpha;

        const grad = ctx.createLinearGradient(tailX, tailY, ss.x, ss.y);
        grad.addColorStop(0, `rgba(255,255,255,0)`);
        grad.addColorStop(0.7, `rgba(200,220,255,${alpha * 0.15})`);
        grad.addColorStop(1, `rgba(255,255,255,${alpha * 0.3})`);

        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(ss.x, ss.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Jasny punkt na czele
        ctx.beginPath();
        ctx.arc(ss.x, ss.y, 1, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha * 0.3})`;
        ctx.fill();

        // Usuwanie martwych spadających gwiazd
        if (ss.life >= ss.maxLife) {
          shootingStars.splice(i, 1);
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    />
  );
}

// ── KOMPONENT: Scroll progress bar ──
function ScrollProgress() {
  const progress = useScrollProgress();
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Postęp przewijania strony"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        zIndex: 200,
        background: 'transparent',
      }}
    >
      <div style={{
        height: '100%',
        width: `${progress}%`,
        background: `linear-gradient(90deg, ${M.goldDim}, ${M.gold}, #e8cc80)`,
        transition: 'width 0.1s linear',
        boxShadow: `0 0 10px ${M.gold}60, 0 0 20px ${M.gold}30`,
      }} />
    </div>
  );
}

// ── SECTION DIVIDER: subtle rytm "rozdzialow" miedzy sekcjami ──
function SectionDivider({ num, label }: { num: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '32px 0 18px', maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, rgba(212,168,83,.25), rgba(212,168,83,.4))' }} />
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, whiteSpace: 'nowrap' }}>
        <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, fontWeight: 700, color: '#999', letterSpacing: 2.5, textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(to left, transparent, rgba(212,168,83,.25), rgba(212,168,83,.4))' }} />
    </div>
  );
}

// ── SHAREABLE PNG: 1080x1080 z wiekiem mozgu (council Expansionist: viral mechanic) ──
async function genBrainAgeShareCard({ name, brainAge, age, bioAge, type, hour }: { name: string; brainAge: number; age: number; bioAge: number; type?: string; hour?: string }): Promise<Blob | null> {
  // godzina moze miec prefix ("piątkowe 22:14") - prefix mniejszy, czas duzy
  const hourParts = (hour || '').split(' ');
  const hourTime = hourParts[hourParts.length - 1] || '';
  const hourPrefix = hourParts.slice(0, -1).join(' ');
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 0, 1080);
  grad.addColorStop(0, '#0f0e0a');
  grad.addColorStop(0.5, '#070707');
  grad.addColorStop(1, '#0a0a0a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1080, 1080);

  // Subtle gold orb top-right
  const orb = ctx.createRadialGradient(900, 180, 0, 900, 180, 480);
  orb.addColorStop(0, 'rgba(212,168,83,0.18)');
  orb.addColorStop(1, 'rgba(212,168,83,0)');
  ctx.fillStyle = orb;
  ctx.fillRect(0, 0, 1080, 1080);

  // Brand wordmark
  ctx.fillStyle = '#D4A853';
  ctx.font = '700 30px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('HANTLE I TALERZ', 540, 110);

  // Gold divider
  ctx.fillStyle = '#D4A853';
  ctx.fillRect(490, 130, 100, 2);

  // Top label
  ctx.fillStyle = '#888';
  ctx.font = '700 30px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(hour ? 'O TEJ GODZINIE PĘKA MÓJ TYDZIEŃ' : 'WIEK MOJEGO MÓZGU', 540, 380);

  // Big gold number: godzina (nowy hero) albo wiek mozgu (fallback)
  ctx.fillStyle = '#D4A853';
  if (hour) {
    if (hourPrefix) { ctx.font = '700 46px "Inter", sans-serif'; ctx.fillText(hourPrefix, 540, 462); }
    ctx.font = '900 220px "Inter", sans-serif';
    ctx.fillText(hourTime, 540, 660);
  } else {
    ctx.font = '900 280px "Inter", sans-serif';
    ctx.fillText(String(brainAge), 540, 640);
  }

  // Pulsing glow under number
  const numGlow = ctx.createRadialGradient(540, 600, 0, 540, 600, 320);
  numGlow.addColorStop(0, 'rgba(212,168,83,0.12)');
  numGlow.addColorStop(1, 'rgba(212,168,83,0)');
  ctx.fillStyle = numGlow;
  ctx.fillRect(0, 0, 1080, 1080);

  // Re-draw number on top of glow
  ctx.fillStyle = '#D4A853';
  if (hour) {
    ctx.font = '900 220px "Inter", sans-serif';
    ctx.fillText(hourTime, 540, 660);
  } else {
    ctx.font = '900 280px "Inter", sans-serif';
    ctx.fillText(String(brainAge), 540, 640);
  }

  // Sub stats line
  ctx.fillStyle = '#ddd';
  ctx.font = '500 36px "Inter", sans-serif';
  const subText = name ? `${name}, mam ${age}. Mózg pokazuje ${brainAge}, organizm ${Math.round(bioAge)}.` : `Mam ${age}. Mózg pokazuje ${brainAge}, organizm ${Math.round(bioAge)}.`;
  ctx.fillText(subText, 540, 770);

  // Typ (archetyp) - identity na obrazku do udostepnienia
  if (type) {
    ctx.fillStyle = '#D4A853';
    ctx.font = '600 34px "Inter", sans-serif';
    ctx.fillText(`Typ: ${type}`, 540, 838);
  }

  // Bottom divider
  ctx.fillStyle = '#D4A85333';
  ctx.fillRect(390, 870, 300, 1);

  // Bottom CTA prompt
  ctx.fillStyle = '#888';
  ctx.font = '500 26px "Inter", sans-serif';
  ctx.fillText(hour ? 'Sprawdź swoją godzinę:' : 'Sprawdź swój tydzień:', 540, 930);

  ctx.fillStyle = '#D4A853';
  ctx.font = '700 32px "Inter", sans-serif';
  ctx.fillText('diagnostyka.talerzihantle.com', 540, 980);

  return new Promise<Blob | null>(resolve => canvas.toBlob(blob => resolve(blob), 'image/png', 0.95));
}

// ── STICKY CTA BAR: scroll progress + dual button (forma + DM) ──
function StickyCtaBar({ SC, potential, brainAge, userAge, topCatLabel, incomingSearch }: { SC: number; potential: number; brainAge: number; userAge: number; topCatLabel: string; incomingSearch: string }) {
  const progress = useScrollProgress();
  const dmText = `${topCatLabel.toLowerCase()} ciągnie, wynik ${SC}/100. ruszysz to ze mną?`;
  const dmHref = `https://ig.me/m/hantleitalerz?text=${encodeURIComponent(dmText)}`;
  const naborHref = buildNaborPilotUrl({
    destination: PILOT_NABOR_DESTINATION,
    incomingSearch,
    placement: 'sticky',
    score: SC,
    topCategory: topCatLabel,
  });
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
      paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
      background: 'linear-gradient(to top, rgba(10,10,10,0.96) 0%, rgba(10,10,10,0.88) 60%, rgba(10,10,10,0.4) 90%, transparent 100%)',
    }}>
      {/* Progress bar */}
      <div style={{ width: '100%', height: 2, background: 'rgba(200,168,78,0.08)', overflow: 'hidden', marginBottom: 10 }}>
        <div style={{
          height: '100%',
          width: `${Math.min(100, progress)}%`,
          background: `linear-gradient(90deg, ${M.goldDim}, ${M.gold}, #e8cc80)`,
          transition: 'width 0.15s linear',
          boxShadow: `0 0 8px ${M.gold}60`,
        }} />
      </div>

      {/* SINGLE CTA - jedno mocne CTA Jotform. DM wyciety per user: "wszystkie glowne CTA -> JotForm" */}
      <div style={{ padding: '0 16px', maxWidth: 520, margin: '0 auto' }}>
        <a
          href={naborHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => { trackEvent('primary_cta_click', { cta_id: 'diagnostic_sticky', destination: 'nabor', score_bucket: SC >= 40 ? 'high' : SC >= 20 ? 'mid' : 'low', legacy_event: 'diag_cta_click' }); fbqTrack('InitiateCheckout', { content_name: 'nabor_sticky', content_category: 'high_ticket', value: SC, currency: 'PLN' }); }}
          style={{
            display: 'block', textAlign: 'center', padding: '14px 16px', borderRadius: 12,
            background: `linear-gradient(135deg, ${M.gold}, #a08a3e)`,
            color: M.bg, fontWeight: 800, fontSize: 14, textDecoration: 'none',
            letterSpacing: 1, lineHeight: 1.15, minHeight: 52,
            boxShadow: '0 4px 22px rgba(200,168,78,0.4)',
          }}
        >
          ZOBACZ, JAK WYGLĄDA PROWADZENIE
          <span style={{ display: 'block', fontSize: 10, fontWeight: 600, letterSpacing: 0.8, marginTop: 3, opacity: 0.85 }}>3 minuty · bez płatności · potem sam decydujesz</span>
        </a>
      </div>
    </div>
  );
}

export default function Page() {
  const [D, setD] = useState<FD>(INIT);
  const [sec, setSec] = useState(0);
  const [phase, setPhase] = useState<'form' | 'gate' | 'results'>('form');
  const [igHandle, setIgHandle] = useState('');
  const [email, setEmail] = useState('');
  const [imie, setImie] = useState('');
  const [igErr, setIgErr] = useState('');
  const [emailErr, setEmailErr] = useState('');
  const [loading, setLoading] = useState(false);
  // Tier 3: dwuetapowy lejek (wynik przed kontaktem → intencja → miękki kontakt)
  const [intent, setIntent] = useState<number | null>(null); // 0=działam sam, 1=zobaczyć pomoc, 2=napisz mi, 3=nie wiem
  const [startWhen, setStartWhen] = useState<number | null>(null); // 0=7dni, 1=30dni, 2=2-3mies, 3=sprawdzam
  const [hotWhy, setHotWhy] = useState(''); // warunek decyzji gorącego leada (materiał do DM)
  const [captured, setCaptured] = useState(false); // kontakt zostawiony (po zobaczeniu wyniku)
  // salaryInput usunięte: pensja wypadła z przeglądu, kotwica liczy realny wydatek + czas.
  const [loaded, setLoaded] = useState(false); // efekt wejścia hero
  const [copied, setCopied] = useState(false); // przycisk share
  const [utmSource, setUtmSource] = useState('');
  const [utmProblem, setUtmProblem] = useState('');
  const [inboundSearch, setInboundSearch] = useState('');
  const [countersActive, setCountersActive] = useState(false); // uruchom liczniki po wejściu w wyniki
  const [showDetails, setShowDetails] = useState(false); // collapsible cost breakdown
  const [cracked, setCracked] = useState<Set<number>>(new Set()); // pęknięcia tygodnia - samoocena na wyniku
  const [lastRes, setLastRes] = useState<{ ts: number; score: number; hour: string; typ: string } | null>(null); // poprzedni wynik (pętla powrotu)
  const [showConfig, setShowConfig] = useState(false); // panel konfiguratora (?config=1)
  const [cfg, setCfg] = useState<CfgT>(CFG_DEFAULT);
  const [showBadania, setShowBadania] = useState(false); // collapsible blood tests
  const [showProgresja, setShowProgresja] = useState(false); // collapsible progression timeline
  const [showHormony, setShowHormony] = useState(false); // collapsible hormones
  const [showStickyCta, setShowStickyCta] = useState(false); // sticky CTA po scrollu
  const [secTransition, setSecTransition] = useState<'idle' | 'out-left' | 'out-right' | 'in'>('idle'); // animacja przejscia sekcji
  // Pytania otwarte - dane jakościowe od leada (bóle własnymi słowami) - przywrócone z baseline
  const [pain, setPain] = useState('');
  const [trigger, setTrigger] = useState('');
  const [selfDx, setSelfDx] = useState('');
  // Reframe per-user z Claude - unikatowy belief-shift z wpisanego tekstu
  const [reframe, setReframe] = useState<ReframeData | null>(null);
  const [reframeLoading, setReframeLoading] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  // Efekt wejścia hero + tracking startu + UTM
  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 80);
    trackEvent('diagnostic_start', { legacy_event: 'diag_started' });
    // Pixel: ViewContent - lead zaczyna formularz diagnostyki
    fbqTrack('ViewContent', { content_name: 'diagnostyka_start', content_category: 'lead_gen' });
    // Odczytaj UTM z URL
    if (typeof window !== 'undefined') {
      setInboundSearch(window.location.search);
      const params = new URLSearchParams(window.location.search);
      const src = params.get('utm_source') || '';
      const prob = params.get('problem') || '';
      if (src) setUtmSource(src);
      if (prob) setUtmProblem(prob);
    }
    return () => clearTimeout(t);
  }, []);

  // Uruchom liczniki animowane przy przejściu do wyników + tracking + sticky CTA
  useEffect(() => {
    if (phase === 'results') {
      const sc = score(D);
      trackEvent('diagnostic_complete', {
        score_bucket: sc >= 40 ? 'high' : sc >= 20 ? 'mid' : 'low',
        diagnostic_segment: sc >= 40 ? 'goracy' : sc >= 20 ? 'cieply' : 'zimny',
        legacy_event: 'diag_results_view',
      });
      const t = setTimeout(() => setCountersActive(true), 400);
      // Sticky CTA - pokaż po scrollu 400px
      const onScroll = () => {
        setShowStickyCta(window.scrollY > 400);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      return () => { clearTimeout(t); window.removeEventListener('scroll', onScroll); };
    }
    return undefined;
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const upd = (k: keyof FD, v: number) => { vibe(6); setD(p => {
    const n: FD = { ...p, [k]: v };
    // Twardy cap: nie da się odpuścić więcej treningów, niż się planuje
    if (k === 'miss') n.miss = Math.min(v, p.plan);
    if (k === 'plan') { n.plan = v; if (p.miss > v) n.miss = v; }
    return n;
  }); };
  const sev = (k: SevKey, v: number) => { vibe(10); setD(p => ({ ...p, [k]: v })); };
  const tog = (t: ChipKey) => { vibe(8); setD(p => {
    const tags = new Set(p.tags);
    if (tags.has(t)) tags.delete(t);
    else { if (tags.size >= 3) return p; tags.add(t); } // max 3 objawy: bez premiowania katastrofizacji
    return { ...p, tags };
  }); };

  // ── Auto-save: powrot bez utraty odpowiedzi (localStorage) + tryb podgladu wyniku ──
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    // ?config=1 : panel konfiguratora (ukryty przed userami) + wczytaj zapisane warianty
    if (sp.get('config')) setShowConfig(true);
    try { const c = localStorage.getItem('diag_config_v1'); if (c) setCfg(p => ({ ...p, ...JSON.parse(c) })); } catch {}
    // ?resultPreview=1..5 : od razu strona wyniku na mocku (do dopracowania UI bez przechodzenia quizu)
    const pv = sp.get('resultPreview');
    if (pv && PREVIEW_PROFILES[pv]) {
      const m = PREVIEW_PROFILES[pv];
      setD({ ...INIT, ...m.D, tags: new Set(m.D.tags) });
      setPain(m.pain); setTrigger(m.trigger); setSelfDx(m.selfDx);
      setImie(m.imie); setIgHandle('podglad'); setEmail('podglad@preview.pl');
      setPhase('results');
      return;
    }
    // Poprzedni wynik (pętla powrotu: baner na hero + delta na wyniku)
    try {
      const lr = localStorage.getItem('diag_last_result');
      if (lr) setLastRes(JSON.parse(lr));
    } catch { /* ignoruj */ }
    // Wznow przerwana diagnoze
    try {
      const raw = localStorage.getItem('diag_progress_v2');
      if (!raw) return;
      const s = JSON.parse(raw);
      if (s.D) setD({ ...INIT, ...s.D, tags: new Set(s.D.tags || []) });
      if (typeof s.sec === 'number') setSec(s.sec);
      if (s.pain) setPain(s.pain);
      if (s.trigger) setTrigger(s.trigger);
      if (s.selfDx) setSelfDx(s.selfDx);
    } catch { /* corrupt state - ignoruj */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (typeof window === 'undefined' || phase !== 'form') return;
    try {
      localStorage.setItem('diag_progress_v2', JSON.stringify({
        D: { ...D, tags: Array.from(D.tags) }, sec, pain, trigger, selfDx,
      }));
    } catch { /* quota / private mode - trudno */ }
  }, [D, sec, pain, trigger, selfDx, phase]);

  // Konfigurator: zapisuj warianty (dziala tez bez panelu - raz wybrane zostaje)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try { localStorage.setItem('diag_config_v1', JSON.stringify(cfg)); } catch {}
  }, [cfg]);

  const resetDiagnoza = () => {
    try { localStorage.removeItem('diag_progress_v2'); } catch {}
    setD(INIT); setSec(0); setPain(''); setTrigger(''); setSelfDx('');
    setPhase('form');
    if (typeof window !== 'undefined' && topRef.current) topRef.current.scrollIntoView({ behavior: 'auto', block: 'start' });
  };
  void resetDiagnoza;

  // Soft scroll: tylko gdy user jest pod formularzem (rect.top < 0). Instant, bez smooth-jumpa.
  const softScrollToForm = () => {
    if (typeof window === 'undefined' || !topRef.current) return;
    const rect = topRef.current.getBoundingClientRect();
    if (rect.top < -20) {
      topRef.current.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
  };

  const go = () => {
    vibe([12, 40, 12]); // sekcja complete - tactile checkpoint
    if (sec < SECTIONS.length - 1) {
      setSecTransition('out-left');
      setTimeout(() => {
        const nextSec = sec + 1;
        trackEvent('diagnostic_section_complete', {
          section_id: SECTIONS[sec],
          next_section_id: SECTIONS[nextSec],
          step: sec + 1,
          legacy_event: 'diag_section',
        });
        setSec(nextSec);
        setSecTransition('in');
        softScrollToForm();
        setTimeout(() => setSecTransition('idle'), 400);
      }, 250);
    } else {
      // Tier 3: value-first. Wynik pokazuje się OD RAZU, bez ściany email. Kontakt zbieramy niżej, po intencji.
      const sc = score(D);
      const worst = [...catScores].sort((a, b) => a.pct - b.pct)[0]?.label || '';
      // Pixel: Lead - skonczyl 7 sekcji i zobaczyl wynik
      fbqTrack('Lead', { content_name: 'diagnostyka_results', content_category: 'lead_gen', value: sc });
      fetchReframe({ pain, selfDx, trigger, worstCat: worst, segment: '', age: D.age });
      // ANONIMOWY zapis odpowiedzi przy KAZDYM wyniku (bez imienia/maila/IG) - agregaty pod content
      // ("o ktorej peka tydzien X facetow"), przyszle percentyle i real-voice mine takze od tych, co nie zostawia kontaktu.
      try {
        if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
          navigator.sendBeacon(
            'https://n8n.srv1313512.hstgr.cloud/webhook/unified-leads',
            JSON.stringify({
              event: 'diagnostyka_anon_result',
              ts: new Date().toISOString(),
              score: sc,
              stan: sc < 12 ? 'dobry' : sc < 40 ? 'sredni' : 'zly',
              godzina: hourRange(D),
              hamulec: worst,
              typ: pickArchetype(D, worst).key,
              odpowiedzi: { ...D, tags: Array.from(D.tags) },
              pain, trigger, selfDx,
            })
          );
        }
      } catch {}
      try { localStorage.removeItem('diag_progress_v2'); } catch {}
      try { localStorage.setItem('diag_last_result', JSON.stringify({ ts: Date.now(), score: sc, hour: hourRange(D), typ: pickArchetype(D, worst).label })); } catch {}
      setPhase('results');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  const back = () => {
    vibe(15);
    setSecTransition('out-right');
    setTimeout(() => {
      setSec(s => s - 1);
      softScrollToForm();
      setSecTransition('in');
      setTimeout(() => setSecTransition('idle'), 400);
    }, 250);
  };

  // Generacja reframe przez Claude - odpalana w submit, nie blokuje wynikow (fallback gdy padnie)
  const fetchReframe = useCallback(async (args: { pain: string; selfDx: string; trigger: string; worstCat: string; segment: string; age: number }) => {
    if (!args.pain.trim() && !args.selfDx.trim()) return;
    setReframeLoading(true);
    try {
      const res = await fetch('/api/diagnoza', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
      });
      const json = await res.json();
      if (json?.ok && json.reframe) setReframe(json.reframe as ReframeData);
    } catch {
      // cisza - frontend pokaze fallback (kolejnosc procesu z worstCat)
    } finally {
      setReframeLoading(false);
    }
  }, []);

  const submit = async () => {
    // Tier 3: email wymagany (raport + lista), IG opcjonalny (kanał DM). Jeden wymagany kanał zamiast dwóch.
    const handle = igHandle.trim().replace(/^@/, '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { setEmailErr('Podaj poprawny email'); vibe([30, 80, 30]); return; }
    // Successful submit - confetti burst + mocna wibracja
    vibe([20, 60, 20, 60, 40]);
    spawnConfetti();
    setLoading(true);
    const c = costs(D); const sc = score(D);
    // Oblicz metryki biologiczne na potrzeby payloadu
    // Payload bioAge - zsynchronizowany z display bioAge (realistyczne +3-7)
    const pBioAge = (() => {
      let penalty = 0;
      if (D.sleep < 5.5) penalty += 3;
      else if (D.sleep < 6) penalty += 2;
      else if (D.sleep < 6.5) penalty += 1.5;
      else if (D.sleep < 7) penalty += 0.5;
      if (D.sleepQ >= 2) penalty += 1;
      if (D.screenBed >= 2) penalty += 0.5;
      if (D.stress >= 3) penalty += 2.5;
      else if (D.stress >= 2) penalty += 1.5;
      if (D.drinks > 10) penalty += 2.5;
      else if (D.drinks > 6) penalty += 1.5;
      else if (D.drinks > 3) penalty += 1;
      if (D.subs > 0) penalty += 2;
      if (D.energy >= 3) penalty += 1.5;
      else if (D.energy >= 2) penalty += 0.5;
      if (D.dopamine >= 3) penalty += 1;
      if (D.dietChaos >= 2) penalty += 1;
      if (D.binge >= 2) penalty += 0.5;
      if (D.miss >= 2) penalty += 0.5;
      if (D.workHours >= 12) penalty += 1;
      else if (D.workHours >= 10) penalty += 0.5;
      if (D.mondayFeel >= 3) penalty += 1;
      else if (D.mondayFeel >= 2) penalty += 0.5;
      if (D.meals <= 1) penalty += 0.5;
      return Math.round((D.age + penalty + Math.min(D.tags.size * 0.25, 2)) * 10) / 10;
    })();
    // Payload cognitive - zsynchronizowany z display cognitive
    const pCognitive = (() => {
      let pct = 100;
      if (D.sleep < 5.5) pct -= 28;
      else if (D.sleep < 6) pct -= 22;
      else if (D.sleep < 6.5) pct -= 15;
      else if (D.sleep < 7) pct -= 10;
      if (D.sleepQ >= 2) pct -= 5;
      if (D.stress >= 3) pct -= 35;
      else if (D.stress >= 2) pct -= 18;
      if (D.dopamine >= 3) pct -= 22;
      else if (D.dopamine >= 2) pct -= 10;
      if (D.drinks > 10) pct -= 18;
      else if (D.drinks > 6) pct -= 12;
      else if (D.drinks > 3) pct -= 6;
      if (D.subs > 0) pct -= 15;
      if (D.energy >= 3) pct -= 8;
      if (D.miss >= 2) pct -= 6;
      if (D.tags.has('brain')) pct -= 6;
      if (D.tags.has('focus')) pct -= 6;
      if (D.workHours >= 12) pct -= 12;
      else if (D.workHours >= 10) pct -= 7;
      if (D.progress === 2) pct -= 6;
      if (D.mondayFeel >= 3) pct -= 8;
      else if (D.mondayFeel >= 2) pct -= 5;
      if (D.tags.has('memory')) pct -= 6;
      if (D.tags.has('procrastination')) pct -= 4;
      if (D.screenBed >= 2) pct -= 4;
      return Math.max(pct, 15);
    })();
    const pBrainAge = (() => {
      let penalty = 0;
      if (D.sleep < 6) penalty += 4; else if (D.sleep < 7) penalty += 2;
      if (D.stress >= 3) penalty += 3; else if (D.stress >= 2) penalty += 1.5;
      if (D.dopamine >= 3) penalty += 3; else if (D.dopamine >= 2) penalty += 1;
      if (D.drinks > 8) penalty += 2.5; else if (D.drinks > 4) penalty += 1;
      if (D.subs > 0) penalty += 3;
      if (D.tags.has('brain')) penalty += 1;
      if (D.tags.has('focus')) penalty += 1;
      if (D.tags.has('headaches')) penalty += 0.5;
      if (D.miss >= 2) penalty += 1;
      if (D.tags.has('memory')) penalty += 1;
      if (D.tags.has('procrastination')) penalty += 0.5;
      return Math.round((D.age + penalty) * 10) / 10;
    })();
    // Tracking: email gate submit
    trackEvent('contact_gate_submit', { contact_channel: 'email', legacy_event: 'diag_gate_submit' });
    // Pochodne v2 (pola bez UI, klucze payloadu zostają): trainPlan z plan, frustration z tekstu leada
    D.trainPlan = D.plan > 0 ? 0 : 1;
    {
      const kw = (pain + ' ' + selfDx).toLowerCase();
      D.frustration = /wynik|efekt/.test(kw) ? 0
        : /energi|zmecz|zmęcz|sił|sil/.test(kw) ? 1
        : /czas|robot/.test(kw) ? 2
        : /konsekwen|ogar|dyscyplin|odkłada|odklada/.test(kw) ? 3
        : 1;
    }
    const finalHandle = handle ? '@' + handle : '';
    const odpowiedzi = {
      sleep: D.sleep, sleepQ: D.sleepQ, screenBed: D.screenBed,
      wakeTime: D.wakeTime, alarm: D.alarm,
      stress: D.stress, energy: D.energy, dopamine: D.dopamine,
      workHours: D.workHours, progress: D.progress,
      dietChaos: D.dietChaos, junk: D.junk, binge: D.binge,
      meals: D.meals, cooking: D.cooking,
      wknd: D.wknd, drinks: D.drinks, cash: D.cash, subs: D.subs,
      mondayFeel: D.mondayFeel, weekendWork: D.weekendWork,
      lost: D.lost, plan: D.plan, miss: D.miss, gym: D.gym,
      trainYears: D.trainYears, trainHappy: D.trainHappy, trainPlan: D.trainPlan,
      rate: D.rate, tags: Array.from(D.tags),
      triedBefore: D.triedBefore, frustration: D.frustration,
      raise: D.raise, defer: D.defer, retreat: D.retreat, wkndWhat: D.wkndWhat,
      veggies: D.veggies, protein: D.protein, morningWood: D.morningWood,
      supps: SUPP_OPTS.filter(([bit]) => D.supps > 0 && (D.supps & bit) !== 0).map(([, l]) => l).join(', ') || (D.supps === 0 ? 'nic' : 'brak odp'),
      breakWindow: D.breakWindow,
      pain, trigger, selfDx,
    };
    const biggest = catData.reduce((a, b) => a.v > b.v ? a : b, catData[0]);
    const payloadBlocked = Math.min(sc, 85);
    // Oblicz segment (GORACY/CIEPELY/ZIMNY) i routed product do payloadu
    const segment = sc >= 40 ? 'GORACY' : sc >= 20 ? 'CIEPELY' : 'ZIMNY';
    // Najgorsza kategoria wg catScores (te same formuly co display, kalibracja 2026-07-15)
    const pCatScores = [
      { label: 'Sen', pct: Math.max(100 - Math.round(((D.sleepQ + D.screenBed) / 6 + (7.5 - Math.min(D.sleep, 7.5)) / 1.5) * 55), 5) },
      { label: 'Stres', pct: Math.max(100 - Math.round(((D.stress + D.energy + (D.workHours > 9 ? 1 : 0)) / 7) * 100), 5) },
      { label: 'Żywienie', pct: Math.max(100 - Math.round((D.binge / 4) * 70 + (D.veggies + D.protein) * 7), 5) },
      { label: 'Weekend', pct: Math.max(100 - Math.round((D.drinks / 12) * 40 + D.wknd * 10 + D.mondayFeel * 8 + (D.subs > 0 ? 25 : 0)), 5) },
      { label: 'Trening', pct: Math.max(100 - Math.round(((D.miss * 1.5 + (D.trainHappy >= 1 && D.trainHappy <= 2 ? 1 : 0)) / 4) * 100), 5) },
      { label: 'Głowa', pct: Math.max(100 - Math.round((tagScoreWeighted(D.tags) / 10) * 60 + D.defer * 8 + D.dopamine * 6 + (D.triedBefore >= 2 ? 10 : 0)), 5) },
    ];
    const worstCatP = pCatScores.reduce((a, b) => a.pct < b.pct ? a : b, pCatScores[0]);
    // Odpal generacje reframe rownolegle - poleci w tle, gotowe zanim lead doscrolluje
    fetchReframe({ pain, selfDx, trigger, worstCat: worstCatP.label, segment, age: D.age });
    // Routed product - diagnostyka ZAWSZE kieruje na system (coaching page z formularzem)
    // Sprzedaz produktow per sciezka odbywa sie w DM po formularzu, nie na diagnostyce
    const routedProduct = 'system_coaching';
    // PRIORITY FLAG - proxy dla HOT+WYSOKI budget (per Council recommendation)
    // Bez dodatkowego pytania - wyliczane z istniejacych odpowiedzi
    const commitmentProxy = (D.triedBefore >= 2 ? 2 : D.triedBefore) + (D.frustration >= 3 ? 2 : D.frustration >= 1 ? 1 : 0);
    const budgetProxy = (c.hardTotal >= 3000 ? 3 : c.hardTotal >= 1500 ? 2 : 1);
    const priorityLead = sc >= 40 && commitmentProxy >= 3 && budgetProxy >= 2;
    // Kotwica roczna do payloadu: ta sama kwota co na hero wyniku, slowo w slowo (rada: jeden rozjazd = zaufanie pada)
    const arP = anchorRok(D);
    const payload = {
      instagram_handle: finalHandle,
      email,
      imie: imie.trim() || null,
      intencja: intent === null ? '' : ['dziala_sam', 'chce_zobaczyc_pomoc', 'napisz_mi', 'nie_wie'][intent],
      kiedy_start: startWhen === null ? '' : ['7dni', '30dni', '2-3mies', 'tylko_sprawdza'][startWhen],
      warunek_decyzji: hotWhy.trim() || '',
      wynik_godzina: hourRange(D),
      wynik_stan: sc < 12 ? 'dobry' : sc < 40 ? 'średni' : 'zły',
      wynik_rok_wydatek: String(arP.hardYear),
      wynik_rok_godziny: String(arP.hours),
      wynik_rok_dni: String(arP.dni),
      wynik_rok_display: arP.display,
      wynik_typ: pickArchetype(D, worstCatP.label).label,
      wynik_typ_klucz: pickArchetype(D, worstCatP.label).key,
      wynik_rozbieznosc: (() => { const cx = contradiction(D, selfDx); return cx ? `${cx.said} VS ${cx.body}` : ''; })(),
      wynik_kwota: String(c.total),
      wynik_score: String(sc),
      wynik_potencjal: String(payloadBlocked),
      wynik_niewykorzystany: String(Math.max(100 - sc, 15)),
      wynik_potential: String(100 - sc),
      wynik_bio_age: String(pBioAge),
      wynik_brain_age: String(pBrainAge),
      wynik_cognitive: String(pCognitive),
      wynik_hamulce: String(c.brakes),
      wynik_badania_count: String(badaniaUnique.length),
      wynik_badania_priorytet: badaniaWysoki.map(b => b.nazwa).join(', '),
      biggest_category: biggest?.l || '',
      segment,
      worst_category: worstCatP.label,
      routed_product: routedProduct,
      // Priority routing fields (dla n8n priority_lead switch node)
      severity_score: sc,
      commitment_proxy: commitmentProxy,
      budget_proxy: budgetProxy,
      priority_lead: priorityLead,
      priority_tag: priorityLead ? 'segment_priority_1on1' : `segment_${segment.toLowerCase()}`,
      timestamp: new Date().toISOString(),
      source: 'diagnostyka_hit',
      utm_source: utmSource || null,
      hormony_problem: utmProblem || null,
      odpowiedzi,
    };
    // Wysyłka do API (MailerLite + webhook n8n) z retry
    const sendPayload = async (data: typeof payload, retryCount = 0): Promise<boolean> => {
      try {
        const res = await fetch('/api/subscribe', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          // Wyczyść ewentualny retry z sessionStorage
          try { sessionStorage.removeItem('diag_lead_retry'); } catch {}
          return true;
        }
        throw new Error(`HTTP ${res.status}`);
      } catch {
        if (retryCount < 2) {
          // Retry po 1.5s - max 2 próby
          await new Promise(r => setTimeout(r, 1500));
          return sendPayload(data, retryCount + 1);
        }
        // Po 3 nieudanych próbach - zapisz do sessionStorage
        try { sessionStorage.setItem('diag_lead_retry', JSON.stringify(data)); } catch {}
        return false;
      }
    };
    await sendPayload(payload);
    // Telegram notification usunięta - n8n workflow (SK powiadomienia) obsługuje to przez /api/subscribe
    // Backup: wyslij do unified-leads (Notion + Telegram + MailerLite)
    try {
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon(
          'https://n8n.srv1313512.hstgr.cloud/webhook/unified-leads',
          JSON.stringify({
            event: 'diagnostyka_lead',
            name: payload.imie || '',
            email: payload.email || '',
            ig: payload.instagram_handle || '',
            scores: { overall: payload.wynik_score, categories: payload.biggest_category, potential: payload.wynik_potential, bioAge: payload.wynik_bio_age, brainAge: payload.wynik_brain_age, cognitive: payload.wynik_cognitive },
            utm_source: utmSource || null,
            hormony_problem: utmProblem || null,
            ts: new Date().toISOString(),
          })
        );
      }
    } catch (_e) {}
    // Pixel: CompleteRegistration - lead skonczyl diagnostyke (zapisany do MailerLite + n8n)
    fbqTrack('CompleteRegistration', {
      content_name: 'diagnostyka_complete',
      status: priorityLead ? 'priority' : segment.toLowerCase(),
      value: sc,
      currency: 'PLN',
    });
    // Diagnoza dokończona - wyczysc auto-save (zeby powrot nie wrzucil w polowe quizu) + zapisz wynik do pętli powrotu
    try { localStorage.removeItem('diag_progress_v2'); } catch {}
    try { localStorage.setItem('diag_last_result', JSON.stringify({ ts: Date.now(), score: sc, hour: hourRange(D), typ: pickArchetype(D, worstCatP.label).label })); } catch {}
    // Tier 3: już jesteśmy w wynikach. Pokaż potwierdzenie zamiast przełączać fazę.
    setLoading(false);
    setCaptured(true);
  };

  // Retry nieudanych wysyłek z poprzedniej sesji
  useEffect(() => {
    try {
      const retry = sessionStorage.getItem('diag_lead_retry');
      if (retry) {
        const data = JSON.parse(retry);
        fetch('/api/subscribe', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }).then(res => {
          if (res.ok) sessionStorage.removeItem('diag_lead_retry');
        }).catch(() => {});
      }
    } catch {}
  }, []);

  const C = costs(D); const SC = score(D);
  // Tier narracji wyniku: doom musi byc proporcjonalny do wyniku, inaczej niski score czyta doom jako fake
  // PROGI SKALIBROWANE symulacją 15 profili (2026-07-15): pojedynczy zajechany obszar daje SC ~20-28,
  // wiec stary prog good<30 wpuszczal 13/15 realnych profili w strone "wszystko ok" = zero napiecia = zero klikniec.
  const tier: 'low' | 'mid' | 'high' = SC >= 40 ? 'high' : SC >= 20 ? 'mid' : 'low';
  const bad = SC >= 40;   // zły tydzień: mówimy wprost, że tydzień pracuje przeciwko niemu
  // good liczone NIZEJ (po catScores): SC < 12 ORAZ zadna kategoria poza norma
  const pct = Math.round(((sec + 1) / SECTIONS.length) * 100);
  const scoreColor = SC >= 75 ? M.red : SC >= 50 ? M.org : SC >= 25 ? M.yel : M.grn;

  const catData = [
    { ic: '🍺', v: C.wkndCost, l: 'Weekendy', c: M.gold, type: 'hard' },
    { ic: '🍔', v: C.foodCost, l: 'Żywienie', c: M.org, type: 'hard' },
    { ic: '🏋️', v: C.trainCost, l: 'Trening', c: M.grn, type: 'hard' },
    { ic: '😴', v: C.sleepCost, l: 'Sen', c: '#a08ae0', type: 'hard' },
    { ic: '⏰', v: C.prodCost, l: 'Produktywność', c: '#4abace', type: 'hidden' },
    { ic: '📉', v: C.stagnationCost, l: 'Stagnacja', c: '#e05a7a', type: 'hidden' },
    { ic: '⚡', v: C.signalCost, l: 'Symptomy', c: M.red, type: 'hidden' },
  ].filter(x => x.v > 0);
  const maxC = Math.max(...catData.map(x => x.v), 1);

  // Before/after comparison - szacunek oszczednosci po 3 miesiacach w systemie
  const optimizedCost = Math.round(C.total * 0.3);
  const savings = C.total - optimizedCost;

  // Priorytet #1 - lead + 3 bullety (zamiast wall-of-text 80 slow). Treść neuro zachowana, scanowalność wzrasta.
  const priority = (() => {
    const areas = [
      {
        area: 'Sen',
        score: (D.sleepQ + D.screenBed + Math.max(0, 7.5 - D.sleep) * 1.5),
        action: D.sleep < 6 ? {
          lead: `Śpisz ${D.sleep}h. Mózg nie kończy oczyszczania, toksyny zostają.`,
          bullets: [
            'Rano rozbity, po południu zjazd',
            'Wieczorem telefon do 1:00 bo dopamina nie wróciła do bazy',
            'Bez ruszenia kortyzolu i światła rano sam tego nie wydłużysz',
          ],
        } : {
          lead: `${D.sleep}h w łóżku nie znaczy ${D.sleep}h snu. Fazy się rozjeżdżają.`,
          bullets: [
            'Głęboki sen = 80% wydzielania hormonu wzrostu',
            'Kortyzol, ekrany, alkohol tną tę fazę nawet przy 8h w pościeli',
            'Jesteś w łóżku, regeneracja zatrzymuje się w połowie',
          ],
        },
        impact: 'Każda noc pogarsza parametry',
      },
      {
        area: 'Stres',
        score: (D.stress * 2 + D.energy + (D.workHours > 9 ? 2 : 0) + (D.mondayFeel >= 2 ? 1 : 0)),
        action: {
          lead: 'Chroniczny kortyzol nie spada sam. Organizm traktuje go jako normę.',
          bullets: [
            'Walczy z testosteronem o pregnenolon. Kortyzol wygrywa, testo leci',
            'Mniej masy, gorsze libido, wolniejsza regeneracja',
            'Sam stresu nie ruszysz - osie hormonalne są spięte ze snem i jedzeniem',
          ],
        },
        impact: 'Sabotuje resztę parametrów',
      },
      {
        area: 'Alkohol',
        score: (D.drinks / 2 + (D.subs > 0 ? 4 : 0)),
        action: D.drinks > 8 ? {
          lead: `${D.drinks} drinków = 12-18h detoksyfikacji wątroby.`,
          bullets: [
            'Synteza białek stoi, kortyzol w górze, jelita przepuszczają endotoksyny',
            'Następny weekend przychodzi zanim organizm wrócił do normy',
            'Trzy weekendy z rzędu zżerają miesiąc progresu z siłowni',
          ],
        } : {
          lead: 'Nawet umiarkowane picie obniża testo na 72h i niszczy fazę REM.',
          bullets: [
            'Aromataza w tkance tłuszczowej szybciej przerabia testo w estradiol',
            'Mniej T, więcej E2, gorsze proporcje',
            'W lustrze nie widzisz. Widzisz za 6 miesięcy',
          ],
        },
        impact: 'Trzy weekendy zżerają miesiąc progresu',
      },
      {
        area: 'Żywienie',
        score: (D.dietChaos * 1.5 + D.binge + (D.meals <= 1 ? 2 : 0)),
        action: {
          lead: 'Jedzenie bez rytmu = skoki insuliny co 2-3h.',
          bullets: [
            'Lipaza zablokowana, organizm nie spala tłuszczu',
            'Greliny i leptyny rozjechane, mózg myli głód z nudą',
            'Jesz nie za dużo. Jesz na złym zegarze',
          ],
        },
        impact: 'Blokuje spalanie i hormony',
      },
      {
        area: 'Dopamina',
        score: (D.dopamine * 2 + (D.screenBed >= 2 ? 1 : 0)),
        action: {
          lead: 'Receptory D2 zregulowane w dół. Telefon, substancje, jedzenie. Coraz mniej kopa za każdym razem.',
          bullets: [
            'Mechanizm jak tolerancja na używki',
            'Dopamina napędza trening, dyscyplinę, sen - leży wszystko naraz',
            'Sam detoks dopaminowy nie wystarczy bez korekty snu i kortyzolu',
          ],
        },
        impact: 'Niszczy motywację i dyscyplinę',
      },
      {
        area: 'Trening',
        score: (D.miss * 2 + (D.trainHappy >= 1 ? 1 : 0) + (D.trainPlan >= 1 ? 1 : 0)),
        action: D.miss >= 2 ? {
          lead: 'Opuszczasz treningi bo organizm nie ma z czego regenerować.',
          bullets: [
            'Rozjechany kortyzol + brak snu + wypalona dopamina = każdy trening bierze więcej niż daje',
            'Trenujesz, nic nie widzisz, motywacja leci, siłownia odpada',
            'Lepszy plan tego nie ruszy. Robi się to w godzinach między treningami',
          ],
        } : {
          lead: 'Trenujesz regularnie a wyników brak. Trening to 4-5h, reszta tygodnia 163h.',
          bullets: [
            'Kortyzol, sen, żywienie, regeneracja - bez tego trenujesz na 30-40%',
            'Plan masz. Robota siedzi w godzinach poza siłownią',
          ],
        },
        impact: 'Wysiłek bez efektów',
      },
    ];
    const worst = areas.sort((a, b) => b.score - a.score)[0];
    return worst;
  })();

  const hormones: { n: string; a: string; i: string; c: string }[] = [];
  if (D.sleep < 6.5 || D.sleepQ >= 3) hormones.push({ n: 'HGH', a: '↓', i: 'Obniżona regeneracja', c: M.org });
  if (D.drinks > 5 || D.subs > 0 || D.tags.has('libido')) hormones.push({ n: 'Testosteron', a: '↓', i: D.drinks > 10 || D.subs > 0 ? 'Mocny spadek' : 'Spadek', c: D.drinks > 10 || D.subs > 0 ? M.red : M.org });
  if (D.stress >= 3 || D.sleepQ >= 3) hormones.push({ n: 'Kortyzol', a: '↑', i: 'Chronicznie wysoki', c: M.red });
  if (D.dopamine >= 3 || D.tags.has('motivation')) hormones.push({ n: 'Dopamina', a: '⚡', i: 'Desensytyzacja', c: M.red });
  if (D.tags.has('mood') || D.subs > 0) hormones.push({ n: 'Serotonina', a: '↓', i: D.subs > 0 ? 'Wyczerpanie' : 'Spadek', c: D.subs > 0 ? M.red : M.org });
  if (D.tags.has('belly') || D.binge >= 3) hormones.push({ n: 'Insulina', a: '↑', i: 'Insulinooporność', c: M.org });
  if (D.sleepQ >= 3 || D.screenBed >= 3) hormones.push({ n: 'Melatonina', a: '↓', i: 'Zaburzony cykl', c: M.org });
  if (D.tags.has('heartRate') || (D.stress >= 3 && D.subs > 0)) hormones.push({ n: 'Adrenalina', a: '↑', i: 'Układ sympatyczny non-stop', c: M.red });

  // Zalecane badania krwi - ZERO hardcoded defaults, wszystko pod konkretne sygnały
  const badania: { nazwa: string; dlaczego: string; priorytet: 'wysoki' | 'sredni' }[] = [];

  // Domyślny zestaw - 3 najuniwersalniejsze badania, dające najwięcej "easy winów" u 80% facetów
  const hasAnySignal = D.tags.size >= 1 || D.stress >= 2 || D.energy >= 2 || D.sleep < 7 || D.drinks > 5 || D.subs > 0 || D.miss > 0 || D.binge >= 2 || D.dopamine >= 2;
  if (hasAnySignal) {
    badania.push({ nazwa: 'Morfologia z rozmazem', dlaczego: 'Punkt startowy: stan zapalny, anemia, odporność. Reszta interpretuje się w kontekście tego wyniku.', priorytet: 'wysoki' });
    badania.push({ nazwa: 'Witamina D3 (25-OH)', dlaczego: '80% Polaków ma niedobór, większość nie wie. Niski D3 zżera testosteron, regenerację i decyzje wieczorem. Norma „ok" zaczyna się dużo wyżej niż referencyjna.', priorytet: 'wysoki' });
    badania.push({ nazwa: 'Ferrytyna', dlaczego: 'Top przyczyna „mgły mózgowej" i zmęczenia u facetów. Norma 30 ng/ml to dno. Optymalna: 80-150. Energia w środę 14:00 zwykle leży tutaj.', priorytet: 'wysoki' });
  }

  // Testosteron całkowity + wolny - tylko gdy sygnały męskie
  const tSignals: string[] = [];
  if (D.tags.has('libido')) tSignals.push('libido');
  if (D.tags.has('mood')) tSignals.push('nastrój');
  if (D.tags.has('belly')) tSignals.push('sylwetka');
  if (D.trainYears >= 2 && D.trainHappy >= 1) tSignals.push('brak efektów z treningu');
  if (D.sleep < 6.5) tSignals.push('regeneracja');
  if (D.drinks > 8 || D.subs > 0) tSignals.push('obciążenie wątroby');
  if (tSignals.length >= 1) {
    badania.push({ nazwa: 'Testosteron całkowity + wolny', dlaczego: `Twoje sygnały (${tSignals.slice(0, 3).join(', ')}) wskazują, że T trzeba zmierzyć w pierwszej kolejności.`, priorytet: 'wysoki' });
  }

  // SHBG - TYLKO gdy trenujesz długo bez efektu LUB problem z libido/formą przy normalnym T
  if ((D.trainYears >= 3 && D.trainHappy >= 1) || (D.tags.has('libido') && D.tags.has('belly'))) {
    badania.push({ nazwa: 'SHBG', dlaczego: 'Często wysoki u facetów, którzy trenują długo, a efektów brak. Wiąże wolny testosteron, więc wynik T „w normie” nie znaczy, że organizm go używa.', priorytet: 'wysoki' });
  }

  // Sen
  if (D.sleep < 6.5 || D.sleepQ >= 2) {
    badania.push({ nazwa: 'Kortyzol (poranny, godz. 8:00)', dlaczego: 'Deficyt snu = podwyższony kortyzol, który sabotuje regenerację i testosteron', priorytet: 'wysoki' });
    badania.push({ nazwa: 'Magnez (Mg) w erytrocytach', dlaczego: 'Niedobór magnezu = gorszy sen, skurcze, wyższy kortyzol. 80% mężczyzn ma niedobór', priorytet: 'sredni' });
    badania.push({ nazwa: 'Prolaktyna', dlaczego: 'Zaburzenia snu mogą podnosić prolaktynę, która hamuje testosteron', priorytet: 'sredni' });
  }

  // Stres / energia / wypalenie
  if (D.stress >= 2 || D.energy >= 2) {
    badania.push({ nazwa: 'TSH + fT3 + fT4', dlaczego: 'Tarczyca reguluje metabolizm i energię. Stres ją hamuje - subkliniczne niedoczynności są częste', priorytet: 'wysoki' });
    badania.push({ nazwa: 'Ferrytyna', dlaczego: 'Niedobór żelaza = zmęczenie, mgła, słaba regeneracja, nawet gdy laboratorium pisze "w normie"', priorytet: 'wysoki' });
    badania.push({ nazwa: 'DHEA-S', dlaczego: 'Hormon anty-stresowy - jeśli niski, organizm przegrywa z kortyzolem', priorytet: 'sredni' });
    if (!badania.some(b => b.nazwa.includes('Kortyzol'))) {
      badania.push({ nazwa: 'Kortyzol (poranny, godz. 8:00)', dlaczego: 'Chroniczny stres = oś HPA rozregulowana. Kortyzol powinien być wysoki rano i niski wieczorem', priorytet: 'wysoki' });
    }
  }

  // Alkohol / substancje
  if (D.drinks > 5 || D.subs > 0) {
    badania.push({ nazwa: 'AST + ALT + GGTP', dlaczego: `${D.drinks > 10 ? D.drinks + ' drinków' : D.subs > 0 ? 'Substancje' : 'Alkohol'} obciąża wątrobę. GGTP - najbardziej czuły marker uszkodzenia alkoholowego`, priorytet: 'wysoki' });
    badania.push({ nazwa: 'Bilirubina całkowita', dlaczego: 'Marker wydolności wątroby - podwyższona przy przeciążeniu toksynami', priorytet: 'sredni' });
    badania.push({ nazwa: 'Estradiol (E2)', dlaczego: 'Alkohol zwiększa aromatyzację testosteronu do estrogenów. Więcej E2 = mniej T', priorytet: 'wysoki' });
    if (D.subs > 0) {
      badania.push({ nazwa: 'Prolaktyna', dlaczego: 'Substancje zaburzają oś dopaminową. Podwyższona prolaktyna = spadek libido, motywacji i T', priorytet: 'sredni' });
      badania.push({ nazwa: 'Witamina B12 + kwas foliowy', dlaczego: 'Substancje i alkohol niszczą zapasy wit. B, a bez nich układ nerwowy i energia leżą', priorytet: 'wysoki' });
    }
  }

  // Libido / problemy hormonalne
  if (D.tags.has('libido')) {
    if (!badania.some(b => b.nazwa.includes('Estradiol'))) {
      badania.push({ nazwa: 'Estradiol (E2)', dlaczego: 'Zaburzony stosunek T/E2 to częsta przyczyna spadku libido u mężczyzn', priorytet: 'wysoki' });
    }
    badania.push({ nazwa: 'LH + FSH', dlaczego: 'Sprawdzają czy problem z testosteronem jest na poziomie jąder czy mózgu (przysadka)', priorytet: 'wysoki' });
    if (!badania.some(b => b.nazwa.includes('Prolaktyna'))) {
      badania.push({ nazwa: 'Prolaktyna', dlaczego: 'Podwyższona prolaktyna hamuje libido i erekcję niezależnie od poziomu T', priorytet: 'wysoki' });
    }
  }

  // Brzuch / dieta / insulinooporność
  if (D.tags.has('belly') || D.binge >= 2 || D.dietChaos >= 3) {
    badania.push({ nazwa: 'Insulina na czczo + glukoza', dlaczego: 'Obliczenie HOMA-IR - wczesny marker insulinooporności, zanim cukier będzie "za wysoki"', priorytet: 'wysoki' });
    badania.push({ nazwa: 'HbA1c (hemoglobina glikowana)', dlaczego: 'Średni poziom cukru z ostatnich 3 miesięcy - lepszy obraz niż jednorazowa glukoza', priorytet: 'sredni' });
    badania.push({ nazwa: 'Lipidogram rozszerzony', dlaczego: 'Cholesterol, triglicerydy, LDL/HDL - pełen obraz ryzyka metabolicznego', priorytet: 'sredni' });
  }

  // Mgła mózgowa / koncentracja
  if (D.tags.has('brain') || D.tags.has('focus')) {
    if (!badania.some(b => b.nazwa.includes('Ferrytyna'))) {
      badania.push({ nazwa: 'Ferrytyna', dlaczego: 'Niedobór żelaza to najczęstsza przyczyna „mgły mózgowej" u mężczyzn. Optymalna: 80-150 ng/ml', priorytet: 'wysoki' });
    }
    badania.push({ nazwa: 'Witamina D3 (25-OH)', dlaczego: 'Niedobór wit. D = gorsze funkcje kognitywne, spadek nastroju, słabsza odporność. 80% Polaków ma niedobór', priorytet: 'wysoki' });
    badania.push({ nazwa: 'hsCRP (białko C-reaktywne)', dlaczego: 'Marker przewlekłego stanu zapalnego - stan zapalny w mózgu wpływa na koncentrację i energię', priorytet: 'sredni' });
    badania.push({ nazwa: 'Homocysteina', dlaczego: 'Podwyższona uszkadza naczynia i neurony. Często wysoka przy niedoborze B12 i kwasu foliowego', priorytet: 'sredni' });
  }

  // Stawy / regeneracja
  if (D.tags.has('joints') || D.tags.has('recovery')) {
    if (!badania.some(b => b.nazwa.includes('Witamina D3'))) {
      badania.push({ nazwa: 'Witamina D3 (25-OH)', dlaczego: 'Niedobór wit. D = słabsze kości, stawy, wolniejsza regeneracja. Optymalna: 50-80 ng/ml', priorytet: 'wysoki' });
    }
    if (!badania.some(b => b.nazwa.includes('hsCRP'))) {
      badania.push({ nazwa: 'hsCRP (białko C-reaktywne)', dlaczego: 'Stan zapalny = wolniejsza regeneracja, bóle stawów, przewlekłe zmęczenie', priorytet: 'sredni' });
    }
    badania.push({ nazwa: 'Wapń (Ca) całkowity', dlaczego: 'Kluczowy dla kości, stawów i prawidłowej pracy mięśni', priorytet: 'sredni' });
  }

  // Skóra
  if (D.tags.has('skin')) {
    badania.push({ nazwa: 'Cynk (Zn) w surowicy', dlaczego: 'Niedobór cynku = trądzik, wolne gojenie, spadek T. Trening i alkohol wyczerpują cynk', priorytet: 'sredni' });
    if (!badania.some(b => b.nazwa.includes('fT3'))) {
      badania.push({ nazwa: 'TSH + fT3 + fT4', dlaczego: 'Problemy ze skórą mogą wskazywać na niedoczynność tarczycy', priorytet: 'sredni' });
    }
  }

  // Pocenie / tętno
  if (D.tags.has('sweating') || D.tags.has('heartRate')) {
    if (!badania.some(b => b.nazwa.includes('fT3'))) {
      badania.push({ nazwa: 'TSH + fT3 + fT4', dlaczego: 'Nadczynność tarczycy = pocenie, szybkie tętno, utrata masy. Trzeba wykluczyć', priorytet: 'wysoki' });
    }
    badania.push({ nazwa: 'Sód (Na) + Potas (K)', dlaczego: 'Zaburzenia elektrolitów = arytmie, skurcze, nadmierne pocenie', priorytet: 'sredni' });
  }

  // Głód na słodycze
  if (D.tags.has('cravings')) {
    badania.push({ nazwa: 'HbA1c (hemoglobina glikowana)', dlaczego: 'Głód na słodycze może wskazywać na wahania cukru. HbA1c pokaże średni poziom z 3 miesięcy', priorytet: 'sredni' });
    if (!badania.some(b => b.nazwa.includes('Insulina'))) {
      badania.push({ nazwa: 'Insulina na czczo + glukoza', dlaczego: 'Głód na słodycze często = reaktywna hipoglikemia lub początkowa insulinooporność', priorytet: 'wysoki' });
    }
  }

  // Bóle głowy
  if (D.tags.has('headaches')) {
    if (!badania.some(b => b.nazwa.includes('Magnez'))) {
      badania.push({ nazwa: 'Magnez (Mg) w erytrocytach', dlaczego: 'Niedobór magnezu to częsta przyczyna bólów głowy i migren. Suplementacja Mg zmniejsza częstotliwość o 40%', priorytet: 'wysoki' });
    }
    if (!badania.some(b => b.nazwa.includes('hsCRP'))) {
      badania.push({ nazwa: 'hsCRP (białko C-reaktywne)', dlaczego: 'Przewlekły stan zapalny może powodować nawracające bóle głowy', priorytet: 'sredni' });
    }
  }

  // Lęki / niepokój
  if (D.tags.has('anxiety')) {
    if (!badania.some(b => b.nazwa.includes('Magnez'))) {
      badania.push({ nazwa: 'Magnez (Mg) w erytrocytach', dlaczego: 'Magnez to naturalny regulator układu nerwowego. Niedobór = lęki, napięcie, bezsenność', priorytet: 'wysoki' });
    }
    if (!badania.some(b => b.nazwa.includes('Witamina D3'))) {
      badania.push({ nazwa: 'Witamina D3 (25-OH)', dlaczego: 'Niski poziom wit. D silnie koreluje z lękami i depresją u mężczyzn 25-40', priorytet: 'sredni' });
    }
    if (!badania.some(b => b.nazwa.includes('fT3'))) {
      badania.push({ nazwa: 'TSH + fT3 + fT4', dlaczego: 'Zaburzenia tarczycy mogą nasilać lęki - trzeba wykluczyć', priorytet: 'sredni' });
    }
  }

  // Deduplikacja badan po nazwie
  const badaniaUnique = badania.filter((b, i, arr) => arr.findIndex(x => x.nazwa === b.nazwa) === i);
  const badaniaWysoki = badaniaUnique.filter(b => b.priorytet === 'wysoki');
  const badaniaSredni = badaniaUnique.filter(b => b.priorytet === 'sredni');

  const insights: string[] = [];
  if (D.tags.size >= 6) insights.push(`Zaznaczyłeś <b>${D.tags.size} z 20 sygnałów</b>. To wzorzec który się pogłębia z każdym tygodniem.`);
  else if (D.tags.size >= 3) insights.push(`<b>${D.tags.size} sygnały</b> kręcą spiralę. Zmęczenie, gorsze żywienie, gorszy trening. I tak w kółko.`);
  if (D.dopamine >= 3 && D.binge >= 2) insights.push(`Głód dopaminowy + objadanie = <b>rozregulowany układ nagrody</b>. To biochemia, nie słaba wola.`);
  if (D.tags.has('libido') && (D.stress >= 3 || D.sleep < 6.5)) insights.push(`Niższe libido + ${D.stress >= 3 ? 'chroniczny stres' : 'kiepski sen'} = <b>klasyka spadku testosteronu</b>. Badania 10 199 mężczyzn: to styl życia, nie wiek.`);
  if (D.tags.has('belly') && (D.binge >= 2 || D.dietChaos >= 3)) insights.push(`Brzuch nie schodzi + objadanie = <b>insulinooporność w budowie</b>. Sam trening tego nie przebije.`);
  if (D.drinks > 10 && D.tags.has('libido')) insights.push(`${D.drinks} drinków regularnie + niższe libido. 14+ drinków tygodniowo = <b>~6.8% chroniczny spadek T</b>. Alkohol zamienia testosteron w estrogen.`);
  if (D.tags.has('sweating') && D.drinks > 5) insights.push(`Nocne poty + alkohol = <b>kortyzol nocą nie schodzi</b>. Organizm próbuje się detoksyfikować zamiast regenerować.`);
  if (D.tags.has('heartRate') && (D.stress >= 2 || D.subs > 0)) insights.push(`Podwyższone tętno spoczynkowe = <b>układ sympatyczny na stałym gazie</b>. ${D.subs > 0 ? 'Substancje to potęgują.' : 'Stres chroniczny tego nie odpuści sam.'}`);
  if (D.tags.has('headaches') && D.sleep < 6.5) insights.push(`Bóle głowy + deficyt snu = <b>przewlekły stan zapalny</b>. Ibuprofen to plaster, nie rozwiązanie.`);
  if (D.tags.has('procrastination') && D.dopamine >= 2) insights.push(`Prokrastynacja + głód dopaminowy = <b>mózg wybiera natychmiastową nagrodę</b>. Sięgasz po telefon zamiast robić, bo dopamina bazowa jest za niska.`);
  if (D.tags.has('memory') && D.sleep < 7) insights.push(`Słabsza pamięć + deficyt snu = <b>hipokamp nie konsoliduje wspomnień</b>. Sen poniżej 7h blokuje przenoszenie informacji z pamięci krótkotrwałej do długotrwałej.`);
  if (D.tags.has('confidence') && D.trainHappy >= 1) insights.push(`Mniejsza pewność siebie + niezadowolenie z wyników. <b>Testosteron i pewność siebie korelują bezpośrednio</b>. Biochemia, nie psychologia.`);
  if (D.tags.has('impatience') && D.dopamine >= 2) insights.push(`Brak cierpliwości + rozregulowana dopamina = <b>mózg przyzwyczajony do szybkich nagród</b>. Dlatego trudno wytrwać przy planie który wymaga tygodni.`);
  if (D.triedBefore >= 2) insights.push(`Próbowałeś wiele razy sam. <b>Problem nie siedzi w dyscyplinie</b>. Widzisz fragmenty, ale nie widzisz jak one na siebie wpływają.`);
  if (C.total > 8000) insights.push(`<b>${C.total.toLocaleString('pl-PL')} zł w pół roku</b>. Na konsekwencje, nie na sam weekend.`);

  // Potencjal - ile % blokujesz stylem zycia vs ile wykorzystujesz
  const blocked = Math.min(SC, 85); // ile % potencjalu blokujesz stylem zycia
  const usable = Math.max(100 - SC, 15); // ile % potencjalu wykorzystujesz
  const potential = 100 - SC; // procent potencjalu ktory faktycznie wykorzystujesz

  // Wiek biologiczny - bazowy wiek + kary za nawyki - AGRESYWNY scoring
  // Cel: stress=3, sleep=6, drinks=8 -> +5-8 lat
  // Bio age - realistyczne: typowy user +3-7 lat, ekstremalny +10-12 max
  const bioAge = (() => {
    const baseAge = D.age;
    let penalty = 0;
    if (D.sleep < 5.5) penalty += 3;
    else if (D.sleep < 6) penalty += 2;
    else if (D.sleep < 6.5) penalty += 1.5;
    else if (D.sleep < 7) penalty += 0.5;
    if (D.sleepQ >= 2) penalty += 1;
    if (D.screenBed >= 2) penalty += 0.5;
    if (D.stress >= 3) penalty += 2.5;
    else if (D.stress >= 2) penalty += 1.5;
    else if (D.stress >= 1) penalty += 0.5;
    if (D.drinks > 10) penalty += 2.5;
    else if (D.drinks > 6) penalty += 1.5;
    else if (D.drinks > 3) penalty += 1;
    if (D.subs > 0) penalty += 2;
    if (D.energy >= 3) penalty += 1.5;
    else if (D.energy >= 2) penalty += 0.5;
    if (D.dopamine >= 3) penalty += 1;
    else if (D.dopamine >= 2) penalty += 0.5;
    if (D.dietChaos >= 2) penalty += 1;
    if (D.binge >= 2) penalty += 0.5;
    if (D.miss >= 2) penalty += 0.5;
    if (D.workHours >= 12) penalty += 1;
    else if (D.workHours >= 10) penalty += 0.5;
    if (D.mondayFeel >= 3) penalty += 1;
    else if (D.mondayFeel >= 2) penalty += 0.5;
    if (D.meals <= 1) penalty += 0.5;
    const tagPenalty = Math.min(D.tags.size * 0.25, 2);
    return Math.round((baseAge + penalty + tagPenalty) * 10) / 10;
  })();

  // Sprawnosc kognitywna - % mocy mozgu (Walker 2017, Topiwala 2022) - AGRESYWNY scoring
  // Cel: stress=3 sam daje cognitive ~60-65%, nie 85-90%
  const cognitive = (() => {
    let pct = 100;
    // Sen - Walker 2017: <6h = kognitywnie jak pijany
    if (D.sleep < 5.5) pct -= 28;
    else if (D.sleep < 6) pct -= 22;
    else if (D.sleep < 6.5) pct -= 15;
    else if (D.sleep < 7) pct -= 10;
    if (D.sleepQ >= 2) pct -= 5;       // płytki sen = mniej REM = gorszy mózg
    // Stres - kortyzol degraduje hipokamp (Sapolsky 2004)
    if (D.stress >= 3) pct -= 35;       // stres 100% = mózg na 65% mocy sam z siebie
    else if (D.stress >= 2) pct -= 18;
    else if (D.stress >= 1) pct -= 7;
    // Dopamina - desensytyzacja D2 (Volkow 2001)
    if (D.dopamine >= 3) pct -= 22;
    else if (D.dopamine >= 2) pct -= 10;
    // Alkohol - Topiwala et al. 2022: umiarkowane picie zmniejsza objętość mózgu
    if (D.drinks > 10) pct -= 18;
    else if (D.drinks > 6) pct -= 12;
    else if (D.drinks > 3) pct -= 6;
    // Substancje - neurotoksyczność
    if (D.subs > 0) pct -= 15;
    // Energia - wypalenie = mózg na rezerwie
    if (D.energy >= 3) pct -= 8;
    else if (D.energy >= 2) pct -= 4;
    // Trening - brak BDNF
    if (D.miss >= 2) pct -= 6;
    // Symptomy
    if (D.tags.has('brain')) pct -= 6;
    if (D.tags.has('focus')) pct -= 6;
    if (D.tags.has('memory')) pct -= 6;
    if (D.tags.has('procrastination')) pct -= 4;
    // Nowe pola
    if (D.workHours >= 12) pct -= 12;
    else if (D.workHours >= 10) pct -= 7;
    if (D.progress === 2) pct -= 6;
    if (D.mondayFeel >= 3) pct -= 8;
    else if (D.mondayFeel >= 2) pct -= 5;
    if (D.screenBed >= 2) pct -= 4;
    // Floor 40 - poniżej tego ICP wyśmieje liczbę. Realnie nikt nie chodzi po świecie z mózgiem na 15%.
    return Math.max(pct, 40);
  })();

  // Wiek mozgu - osobna metryka od wieku biologicznego
  // Brain age - realistyczne: +4-8 lat typowy, +10-14 ekstremalny
  const brainAge = (() => {
    const baseAge = D.age;
    let penalty = 0;
    if (D.sleep < 5.5) penalty += 3;
    else if (D.sleep < 6.5) penalty += 2;
    else if (D.sleep < 7) penalty += 1;
    if (D.sleepQ >= 2) penalty += 1;
    if (D.screenBed >= 2) penalty += 0.5;
    if (D.stress >= 3) penalty += 2.5;
    else if (D.stress >= 2) penalty += 1.5;
    if (D.energy >= 3) penalty += 1;
    if (D.dopamine >= 3) penalty += 2;
    else if (D.dopamine >= 2) penalty += 1;
    if (D.drinks > 8) penalty += 1.5;
    else if (D.drinks > 4) penalty += 1;
    if (D.subs > 0) penalty += 2.5;
    if (D.workHours >= 10) penalty += 1;
    if (D.mondayFeel >= 2) penalty += 0.5;
    if (D.tags.has('brain')) penalty += 1;
    if (D.tags.has('focus')) penalty += 0.5;
    if (D.tags.has('memory')) penalty += 1;
    if (D.tags.has('headaches')) penalty += 0.5;
    if (D.miss >= 2) penalty += 0.5;
    // Mózg nieco starszy od ciała (min +1)
    return Math.round((baseAge + Math.max(penalty, bioAge - baseAge + 1)) * 10) / 10;
  })();

  // Roczny spadek kognitywny przy obecnym stylu zycia
  // Realistycznie: 0.5-1%/rok przy zlym stylu zycia, max 1.5%/rok przy ekstremalnym
  // Coefficient 0.015 = przy cognitive=40 wychodzi 0.9%/rok, przy cognitive=70 = 0.45%/rok
  const cognitiveDecayPerYear = Math.round((100 - cognitive) * 0.015 * 10) / 10;
  const cognitiveIn5Years = Math.max(Math.round(cognitive - cognitiveDecayPerYear * 5), 30);

  // ── HERO VERDICT FRAME (council recommendation) ──
  // Lata oddane = brain age - real age (verifiable in feel: spojrz w lustro)
  const losYears = Math.max(Math.round(brainAge - D.age), 0);
  // 70% odzyskasz w 90 dni, max 4 lata (cap medycznie realistyczny - Subagent B audit)
  // recoverableYears usunięte: „-X lat cofniesz" był zmyślonym pomiarem wieku.
  // Roczny koszt zycia w obecnym stylu (extrapolacja z 6mies)
  const costPerYear = Math.round(C.total / 6 * 12 / 100) * 100; // zaokraglenie do 100zł

  // Insight o mozgu - po obliczeniu cognitive
  if (cognitive < 75) insights.push(`Twój mózg pracuje na <b>${cognitive}% mocy</b>. To organ który zarabia Ci pieniądze, a Ty go degradujesz stylem życia.`);

  // tips usunięte z renderowania - diagnostyka pogłębia problem, nie daje rozwiązań


  const normMax = Math.max(C.total, 20000);
  const normData = [
    { label: 'Ty', value: C.total, color: M.gold, pct: (C.total / normMax) * 100 },
    { label: 'Średnia', value: 9500, color: M.t4, pct: (9500 / normMax) * 100 },
    { label: 'Świadomy', value: 2800, color: M.grn, pct: (2800 / normMax) * 100 },
  ];

  const mo = Math.round(C.total / 6);
  const projData = [1, 2, 3, 4, 5, 6].map(m => ({ m, v: mo * m }));
  const projMax = projData[5]?.v || 1;

  const timeline: { period: string; text: string }[] = [];
  if (D.sleep < 6.5 || D.sleepQ >= 3) {
    timeline.push({ period: 'Każda noc', text: `${D.sleep}h snu${D.sleepQ >= 3 ? ' i do tego kiepska jakość' : ''}. HGH wydziela się w głębokim śnie. Bez niego <b>regeneracja mięśniowa, spalanie tłuszczu i odnowa komórkowa nie zachodzą</b>. Ludzie śpiący <6h mają 13% wyższe ryzyko śmierci i tracą 19-29% produktywności.` });
  }
  if (D.stress >= 3 || D.energy >= 3) {
    timeline.push({ period: 'Cały dzień', text: `Wysoki stres + niska energia = <b>kortyzol chronicznie podwyższony</b>. Organizm w trybie przetrwania: magazynuje tłuszcz na brzuchu, rozkłada mięśnie na energię, tłumi libido. Biochemia, nie słabość.` });
  }
  if (D.wknd > 0 && D.drinks > 3) {
    timeline.push({ period: 'Weekend', text: `${D.drinks} drinków x ${D.wknd} weekendów. Dawka >1.5g/kg alkoholu (5-6 piw dla 70kg) = <b>spadek testosteronu o ~27% w 12h</b>, normalizacja po 36h. ${D.subs > 0 ? 'Substancje dodatkowo wyczerpują serotoninę i dopaminę.' : 'Synteza białek mięśniowych zatrzymana na 2-3 dni.'}` });
  }
  if (D.dietChaos >= 3 || D.binge >= 3) {
    timeline.push({ period: 'Cyklicznie', text: `Chaotyczne żywienie${D.binge >= 3 ? ' + cykliczne objadanie' : ''} = <b>skoki insuliny</b>. Organizm nie wie kiedy budować, kiedy spalać. Domyślnie magazynuje. Tłuszcz trzewny to bezpośredni efekt.` });
  }
  if (C.totalLostH > 20) {
    timeline.push({ period: '6 miesięcy', text: `<b>${C.totalLostH}h</b> pracy na autopilocie. Przy Twojej stawce to <b>${C.prodCost.toLocaleString('pl-PL')} zł</b>. Twój mózg chemicznie nie jest w stanie działać na 100% kiedy hormony, sen i jadłospis nie grają.` });
  }

  // ── 6 kategorii - obliczone % dla compact bars - TWARDY scoring ──
  const catScores = [
    { label: 'Sen', pct: Math.max(100 - Math.round(((D.sleepQ + D.screenBed) / 6 + (7.5 - Math.min(D.sleep, 7.5)) / 1.5) * 55), 5) },
    { label: 'Stres', pct: Math.max(100 - Math.round(((D.stress + D.energy + (D.workHours > 9 ? 1 : 0)) / 7) * 100), 5) },
    { label: 'Żywienie', pct: Math.max(100 - Math.round((D.binge / 4) * 70 + (D.veggies + D.protein) * 7), 5) },
    { label: 'Weekend', pct: Math.max(100 - Math.round((D.drinks / 12) * 40 + D.wknd * 10 + D.mondayFeel * 8 + (D.subs > 0 ? 25 : 0)), 5) },
    { label: 'Trening', pct: Math.max(100 - Math.round(((D.miss * 1.5 + (D.trainHappy >= 1 && D.trainHappy <= 2 ? 1 : 0)) / 4) * 100), 5) },
    { label: 'Głowa', pct: Math.max(100 - Math.round((tagScoreWeighted(D.tags) / 10) * 60 + D.defer * 8 + D.dopamine * 6 + (D.triedBefore >= 2 ? 10 : 0)), 5) },
  ];
  // DOBRY tydzien: niski indeks ORAZ zadna kategoria realnie poza norma (kalibracja z symulacji 15 profili)
  const good = SC < 12 && catScores.every(c => c.pct >= 60);
  // Badge: KRYTYCZNY przy <= 5%, WYSOKI przy <= 20%
  const catBadge = (pct: number) => pct <= 5 ? 'KRYTYCZNY' : pct <= 20 ? 'WYSOKI' : null;
  const catBadgeColor = (pct: number) => pct <= 5 ? M.red : M.org;
  const catBarColor = (pct: number) => pct >= 70 ? M.grn : pct >= 45 ? M.yel : M.red;
  // Jeśli jakakolwiek kategoria jest krytyczna, obniż potencjał extra

  // Severity opcje
  const sevOpts = [{ n: '0', l: 'Brak' }, { n: '1', l: 'Rzadko' }, { n: '2', l: 'Często' }, { n: '3', l: 'Zawsze' }];
  const sevColors = ['#3cba5e', '#d4a82a', '#e8923a', '#dc4444'];

  // Animowane liczniki dla wyników
  const animTotal = useCounter(C.total, 1400, countersActive);
  const animScore = useCounter(SC, 1000, countersActive);
  const animHard = useCounter(C.hardTotal, 1200, countersActive);
  const animHidden = useCounter(C.hiddenTotal, 1300, countersActive);
  const animPotential = useCounter(potential, 1000, countersActive);
  const animCognitive = useCounter(cognitive, 1100, countersActive);
  const animBioAge = useCounter(Math.round(bioAge), 900, countersActive);
  const animBrainAge = useCounter(Math.round(brainAge), 1000, countersActive);
  const animLosYears = useCounter(losYears, 1200, countersActive);

  const SevField = ({ label, sub, k, val }: { label: string; sub?: string; k: SevKey; val: number }) => (
    <div style={{ marginBottom: 26 }}>
      <div style={{ fontSize: 15, color: M.t1, fontWeight: 500, marginBottom: sub ? 6 : 12, lineHeight: 1.45 }}>
        {label}{sub && <span style={{ display: 'block', fontSize: 12.5, color: M.t3, marginTop: 4, fontWeight: 400 }}>{sub}</span>}
      </div>
      {/* Segmentowana skala: jeden instrument, nie cztery kafle-swiatla */}
      <div style={{ display: 'flex', border: `1px solid ${M.brd2}`, borderRadius: 12, overflow: 'hidden', background: M.s1 }}>
        {sevOpts.map((o, i) => {
          const on = val === i;
          return (
            <button
              key={i}
              onClick={() => sev(k, i)}
              role="switch"
              aria-checked={on}
              aria-label={`${label}: ${o.l}`}
              style={{
                flex: 1, padding: '13px 2px 11px', textAlign: 'center',
                background: on ? `${M.gold}12` : 'transparent',
                borderLeft: i > 0 ? `1px solid ${M.brd}` : 'none',
                borderBottom: on ? `2px solid ${M.gold}` : '2px solid transparent',
                cursor: 'pointer', borderRadius: 0,
                transition: 'background .2s ease, border-color .2s ease',
                minHeight: 56,
              }}
            >
              <span style={{ fontFamily: M.mono, fontSize: 15, fontWeight: 700, display: 'block', marginBottom: 3, color: on ? M.gold : M.t3, fontVariantNumeric: 'tabular-nums' }}>{o.n}</span>
              <span style={{ fontSize: 9.5, fontWeight: 600, color: on ? M.t1 : M.t4, textTransform: 'uppercase', letterSpacing: 0.6 }}>{o.l}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const Slider = ({ label, min, max, step, k, val, unit, note, ariaLabel }: { label: string; min: number; max: number; step: number; k: keyof FD; val: number; unit: string; note?: string; ariaLabel?: string }) => {
    const p = ((val - min) / (max - min)) * 100;
    const hot = unit === 'h' ? val < 7 : val > 0;
    return (
      <div style={{ marginBottom: 28 }}>
        {label && <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <span style={{ fontSize: 15, color: M.t1, fontWeight: 500, flex: 1, lineHeight: 1.45 }}>{label}</span>
          <span style={{ fontFamily: M.mono, fontSize: 19, fontWeight: 700, letterSpacing: '-0.02em', color: hot ? M.gold : M.t1, minWidth: 60, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{val}{unit}</span>
        </div>}
        <div style={{ position: 'relative', height: 44, display: 'flex', alignItems: 'center' }}>
          <div style={{ position: 'absolute', left: 0, right: 0, height: 2, background: '#262626', borderRadius: 1, top: '50%', marginTop: -1 }} />
          <div style={{ position: 'absolute', left: 0, height: 2, width: `${p}%`, background: hot ? M.gold : M.t4, borderRadius: 1, transition: 'width .2s cubic-bezier(.4,0,.2,1)', top: '50%', marginTop: -1, opacity: hot ? 1 : 0.5 }} />
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={val}
            onChange={e => upd(k, parseFloat(e.target.value))}
            aria-label={ariaLabel || label}
            aria-valuenow={val}
            aria-valuemin={min}
            aria-valuemax={max}
            style={{ width: '100%', height: 48, WebkitAppearance: 'none', background: 'transparent', position: 'relative', zIndex: 2, cursor: 'pointer', margin: 0, padding: 0 }}
          />
        </div>
        {note && <div style={{ textAlign: 'right', fontFamily: M.mono, fontSize: 11, color: M.t3, marginTop: 6 }}>{note}</div>}
      </div>
    );
  };

  const Chip = ({ t, label }: { t: ChipKey; label: string }) => {
    const on = D.tags.has(t);
    return (
      <div
        onClick={() => tog(t)}
        role="switch"
        aria-checked={on}
        aria-label={label}
        tabIndex={0}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && tog(t)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
          background: on ? M.gold + '0c' : M.s1,
          border: `1px solid ${on ? M.gold + '55' : M.brd2}`,
          cursor: 'pointer', marginBottom: 6, borderRadius: 10,
          transition: 'border-color .2s ease, background .2s ease',
          minHeight: 48,
        }}
      >
        <div style={{
          width: 20, height: 20,
          border: `1.5px solid ${on ? M.gold : M.brd2}`,
          background: on ? M.gold : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderRadius: '50%',
          transition: 'all .2s ease',
        }}>
          {on && <span style={{ fontSize: 10, color: '#0a0a0a', fontWeight: 800, lineHeight: 1 }}>✓</span>}
        </div>
        <span style={{ flex: 1, fontSize: 14.5, fontWeight: on ? 500 : 400, color: on ? M.t1 : M.t2 }}>{label}</span>
      </div>
    );
  };

  const SH = ({ n, title }: { n: string; title: string }) => (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 6 }}>
      <span style={{ fontFamily: M.mono, fontSize: 11, fontWeight: 700, color: M.gold, letterSpacing: 1 }}>{n}</span>
      <span style={{ fontFamily: M.serif, fontSize: 25, fontWeight: 400, color: M.t1, letterSpacing: '-0.01em' }}>{title}</span>
      <span aria-hidden="true" style={{ flex: 1, height: 1, background: M.brd2, transform: 'translateY(-5px)' }} />
    </div>
  );

  // Logo komponent: okrągłe logo + tekst
  const Logo = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
      <div style={{
        width: 34, height: 34, borderRadius: '50%',
        border: `1.5px solid ${M.gold}30`,
        boxShadow: `0 0 10px ${M.gold}15`,
        overflow: 'hidden', flexShrink: 0,
      }}>
        <img
          src="/logo-circle.png"
          alt="Hantle i Talerz"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>
      <span style={{ fontFamily: M.mono, fontSize: 10, fontWeight: 700, letterSpacing: 3.5, textTransform: 'uppercase', color: M.t3 }}>Hantle i Talerz</span>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        body{background:${M.bg};color:${M.t1};font-family:${M.sans};min-height:100vh;overflow-x:hidden;-webkit-font-smoothing:antialiased;width:100%}
        h1,h2,h3{text-shadow:0 0 20px rgba(255,255,255,.1),0 1px 2px rgba(0,0,0,.6)}
        p,span,div,label{text-shadow:0 1px 2px rgba(0,0,0,.4)}
        body::before{content:'';position:fixed;inset:0;background:radial-gradient(ellipse 80% 50% at 50% 0%,#141210 0%,transparent 60%);pointer-events:none;z-index:0}
        body::after{content:'';position:fixed;inset:0;opacity:.35;background:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.03'/%3E%3C/svg%3E");pointer-events:none;z-index:0}

        input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:48px;background:transparent;cursor:pointer;margin:0;touch-action:none;-webkit-tap-highlight-color:transparent}
        input[type=range]::-webkit-slider-runnable-track{height:6px;background:transparent;border-radius:3px;cursor:pointer}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:24px;height:24px;background:${M.gold};border:none;border-radius:50%;cursor:grab;box-shadow:0 0 12px rgba(200,168,78,.4),0 1px 4px rgba(0,0,0,.5),0 0 0 4px rgba(200,168,78,.12);margin-top:-9px;transition:all .2s ease}
        input[type=range]::-webkit-slider-thumb:active{cursor:grabbing;box-shadow:0 0 20px rgba(200,168,78,.6),0 1px 6px rgba(0,0,0,.5),0 0 0 8px rgba(200,168,78,.15);width:26px;height:26px;margin-top:-10px}
        input[type=range]::-moz-range-thumb{width:24px;height:24px;background:${M.gold};border:none;border-radius:50%;cursor:grab;box-shadow:0 0 12px rgba(200,168,78,.4),0 1px 4px rgba(0,0,0,.5),0 0 0 4px rgba(200,168,78,.12)}
        input[type=range]::-moz-range-track{background:transparent;height:6px;border:none;cursor:pointer}

        input[type=email],input[type=text]{width:100%;padding:16px 18px;background:${M.s1};border:1.5px solid ${M.brd2};color:${M.t1};font-size:16px;font-weight:500;font-family:${M.sans};outline:none;border-radius:12px;transition:border-color .2s ease,box-shadow .2s ease}
        input[type=email]:focus,input[type=text]:focus{border-color:${M.gold};box-shadow:0 0 0 3px ${M.gold}15}
        input[type=email]::placeholder,input[type=text]::placeholder{color:${M.t4}}

        button{font-family:${M.sans};transition:all .2s ease}
        button:hover{opacity:.9}
        button:active{transform:scale(0.98)}
        a{transition:opacity .2s ease}
        a:hover{opacity:.85}

        /* ── Keyframes premium ── */
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .fade-up{animation:fadeUp .5s ease both}

        @keyframes secOutLeft{from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(-30px)}}
        @keyframes secOutRight{from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(30px)}}
        @keyframes secIn{from{opacity:0;transform:translateX(30px)}to{opacity:1;transform:translateX(0)}}
        .sec-out-left{animation:secOutLeft .25s ease both}
        .sec-out-right{animation:secOutRight .25s ease both}
        .sec-in{animation:secIn .4s cubic-bezier(.16,1,.3,1) both}

        @keyframes pulseGlow{
          0%,100%{box-shadow:0 0 0 0 rgba(200,168,78,0.18),0 0 12px rgba(200,168,78,0.08)}
          50%{box-shadow:0 0 0 8px rgba(200,168,78,0),0 0 24px rgba(200,168,78,0.18)}
        }
        @keyframes shimmer{
          0%{background-position:-200% center}
          100%{background-position:200% center}
        }
        @keyframes morphBlob{
          0%,100%{border-radius:42% 58% 55% 45% / 48% 52% 48% 52%}
          25%{border-radius:55% 45% 38% 62% / 62% 38% 62% 38%}
          50%{border-radius:38% 62% 60% 40% / 40% 60% 40% 60%}
          75%{border-radius:60% 40% 45% 55% / 55% 45% 52% 48%}
        }
        @keyframes gradientShift{
          0%,100%{background-position:0% 50%}
          50%{background-position:100% 50%}
        }
        @keyframes borderGlow{
          0%,100%{border-color:rgba(200,168,78,0.15)}
          50%{border-color:rgba(200,168,78,0.45)}
        }
        @keyframes float{
          0%,100%{transform:translateY(0)}
          50%{transform:translateY(-8px)}
        }
        @keyframes scorePulse{
          0%,100%{filter:drop-shadow(0 0 6px rgba(200,168,78,0.25))}
          50%{filter:drop-shadow(0 0 16px rgba(200,168,78,0.55))}
        }
        @keyframes pulse-gold{0%,100%{box-shadow:0 0 0 0 ${M.gold}20}50%{box-shadow:0 0 0 6px ${M.gold}00}}
        @keyframes heroEntry{from{opacity:0;transform:translateY(20px) scale(0.98)}to{opacity:1;transform:translateY(0) scale(1)}}

        .shimmer-btn{
          background:linear-gradient(90deg,${M.gold} 0%,#e8cc80 40%,${M.gold} 50%,#a08a3e 100%) !important;
          background-size:200% auto !important;
          animation:shimmer 2.8s linear infinite !important;
        }
        .blob-bg{animation:morphBlob 12s ease-in-out infinite}
        .score-ring{animation:scorePulse 2.5s ease-in-out infinite}
        .border-glow{animation:borderGlow 3s ease-in-out infinite}
        .float-el{animation:float 4s ease-in-out infinite}
        .hero-entry{animation:heroEntry 0.7s cubic-bezier(.16,1,.3,1) both}

        /* Focus visible accesibility */
        *:focus-visible{outline:2px solid ${M.gold};outline-offset:2px;border-radius:8px}

        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:${M.brd2};border-radius:2px}

        @media (prefers-reduced-motion: reduce){
          *{animation:none !important;transition-duration:0.01ms !important}
        }

        /* ════════════════════════════════════════════════════════════════
           PREMIUM DIAG LAYER · matte cards · ambient · micro-interactions
           ════════════════════════════════════════════════════════════════ */
        @keyframes diagSheen{0%{background-position:300% 0}100%{background-position:-300% 0}}
        @keyframes diagSheenV{0%{background-position:0 -300%}100%{background-position:0 300%}}
        @keyframes diagOrb1{0%{transform:translate(0,0)}50%{transform:translate(-12vw,18vh)}100%{transform:translate(8vw,-6vh)}}
        @keyframes diagOrb2{0%{transform:translate(0,0)}50%{transform:translate(15vw,-12vh)}100%{transform:translate(-8vw,8vh)}}
        @keyframes diagNumGlow{0%,100%{filter:drop-shadow(0 0 14px rgba(200,168,78,.18))}50%{filter:drop-shadow(0 0 28px rgba(200,168,78,.4))}}
        @keyframes diagBarShine{0%{transform:translateX(-100%)}50%,100%{transform:translateX(300%)}}
        @keyframes diagPulse{0%,100%{opacity:.35}50%{opacity:.7}}

        /* Ambient floating orby */
        .diag-ambient{position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden}
        .diag-ambient::before,.diag-ambient::after{content:'';position:absolute;border-radius:50%;filter:blur(80px);opacity:.07;pointer-events:none}
        .diag-ambient::before{width:55vw;height:55vw;background:radial-gradient(circle,rgba(232,195,115,.55),transparent 60%);top:-15vw;right:-15vw;animation:diagOrb1 32s ease-in-out infinite alternate}
        .diag-ambient::after{width:45vw;height:45vw;background:radial-gradient(circle,rgba(200,168,78,.5),transparent 60%);bottom:-8vw;left:-8vw;animation:diagOrb2 38s ease-in-out infinite alternate}

        /* Premium card with animated top border sheen */
        .diag-card{position:relative;isolation:isolate;overflow:hidden;transition:transform .45s cubic-bezier(.16,1,.3,1),border-color .35s,box-shadow .45s}
        .diag-card::after{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent 0%,rgba(200,168,78,.4) 35%,rgba(232,195,115,.85) 50%,rgba(200,168,78,.4) 65%,transparent 100%);background-size:300% 100%;animation:diagSheen 7s ease-in-out infinite;pointer-events:none;z-index:5}
        .diag-card:hover{transform:translateY(-3px);box-shadow:0 18px 50px rgba(0,0,0,.55),0 0 28px rgba(200,168,78,.1) !important}

        /* Big metric numbers shimmer */
        .diag-metric-num{
          background:linear-gradient(135deg,${M.gold} 0%,#e8cc80 35%,#f5e0a0 50%,#e8cc80 65%,${M.gold} 100%) !important;
          background-size:300% 100% !important;-webkit-background-clip:text !important;background-clip:text !important;-webkit-text-fill-color:transparent !important;
          color:transparent !important;
          animation:shimmer 5s ease-in-out infinite,diagNumGlow 3.5s ease-in-out infinite
        }

        /* Verdict big number (lata fory oddanej) - red→gold gradient, dominacja straty */
        .diag-verdict-num{
          background:linear-gradient(135deg,#dc4444 0%,#e8cc80 50%,#dc4444 100%) !important;
          background-size:300% 100% !important;-webkit-background-clip:text !important;background-clip:text !important;-webkit-text-fill-color:transparent !important;
          color:transparent !important;
          animation:shimmer 6s ease-in-out infinite,diagVerdictPulse 3s ease-in-out infinite
        }
        @keyframes diagVerdictPulse{
          0%,100%{filter:drop-shadow(0 0 16px rgba(220,68,68,.18))}
          50%{filter:drop-shadow(0 0 32px rgba(220,68,68,.4))}
        }

        /* Before/After mini boxes */
        .diag-ba-box{position:relative;overflow:hidden;transition:transform .35s cubic-bezier(.16,1,.3,1),border-color .35s,box-shadow .35s}
        .diag-ba-box::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;opacity:.7;animation:diagSheen 5s ease-in-out infinite;background-size:300% 100%}
        .diag-ba-box.now::before{background:linear-gradient(90deg,transparent 0%,rgba(220,68,68,.5) 50%,transparent 100%);background-size:300% 100%}
        .diag-ba-box.future::before{background:linear-gradient(90deg,transparent 0%,rgba(232,195,115,.7) 50%,transparent 100%);background-size:300% 100%}
        .diag-ba-box:hover{transform:translateY(-2px) scale(1.01)}
        .diag-ba-box.now:hover{border-color:rgba(220,68,68,.4) !important;box-shadow:0 12px 32px rgba(0,0,0,.4),0 0 22px rgba(220,68,68,.12)}
        .diag-ba-box.future:hover{border-color:rgba(200,168,78,.5) !important;box-shadow:0 12px 32px rgba(0,0,0,.4),0 0 22px rgba(200,168,78,.14)}

        /* Priority card with stronger pulse */
        .diag-priority{position:relative;overflow:hidden;transition:transform .45s cubic-bezier(.16,1,.3,1),border-color .35s,box-shadow .45s}
        .diag-priority::after{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,rgba(200,168,78,.6),rgba(232,195,115,.95),rgba(200,168,78,.6),transparent);background-size:300% 100%;animation:diagSheen 5s ease-in-out infinite;z-index:3}
        .diag-priority:hover{transform:translateY(-3px);border-color:rgba(200,168,78,.55) !important;box-shadow:0 18px 50px rgba(0,0,0,.55),0 0 32px rgba(200,168,78,.14) !important}

        /* Profile card with vertical sheen on left */
        .diag-profile{position:relative;overflow:hidden;transition:transform .45s,border-color .35s,box-shadow .45s}
        .diag-profile::after{content:'';position:absolute;top:0;left:0;width:2px;height:100%;background:linear-gradient(180deg,transparent 0%,rgba(200,168,78,.5) 30%,rgba(232,195,115,.9) 50%,rgba(200,168,78,.5) 70%,transparent 100%);background-size:100% 300%;animation:diagSheenV 6s ease-in-out infinite;z-index:3}
        .diag-profile:hover{transform:translateX(2px);border-color:rgba(200,168,78,.3) !important;box-shadow:0 14px 40px rgba(0,0,0,.45),0 0 24px rgba(200,168,78,.08) !important}

        /* Progress bar shine animation */
        .diag-progress-bar{position:relative;overflow:hidden}
        .diag-progress-bar::after{content:'';position:absolute;top:0;left:0;width:30%;height:100%;background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,.25) 50%,transparent 100%);animation:diagBarShine 3.5s ease-in-out infinite;animation-delay:var(--shine-delay,0s)}

        /* Collapsible buttons upgrade */
        .diag-collapse-btn{position:relative;overflow:hidden;transition:transform .25s cubic-bezier(.16,1,.3,1),border-color .3s,background .3s,box-shadow .3s !important}
        .diag-collapse-btn::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(200,168,78,.35),transparent);background-size:200% 100%;animation:diagSheen 9s ease-in-out infinite;opacity:.5;pointer-events:none}
        .diag-collapse-btn:hover{transform:translateY(-1px);border-color:rgba(200,168,78,.4) !important;background:linear-gradient(135deg,rgba(200,168,78,.07) 0%,rgba(200,168,78,.02) 100%) !important;box-shadow:0 8px 22px rgba(0,0,0,.35),0 0 16px rgba(200,168,78,.08)}

        /* Section tag spotlight */
        .diag-section-tag{position:relative}
        .diag-section-tag::before{content:'';position:absolute;left:-12px;top:50%;width:6px;height:6px;border-radius:50%;background:${M.gold};transform:translateY(-50%);box-shadow:0 0 12px ${M.gold},0 0 4px ${M.gold};animation:scorePulse 2.5s ease-in-out infinite}

      `}</style>

      {/* ── Skip-to-content dla dostępności ── */}
      <a
        href="#diagnostyka"
        style={{
          position: 'absolute',
          top: -60,
          left: 16,
          background: M.gold,
          color: '#0a0a0a',
          padding: '8px 16px',
          fontFamily: M.mono,
          fontSize: 12,
          fontWeight: 700,
          borderRadius: 8,
          zIndex: 9999,
          textDecoration: 'none',
          transition: 'top 0.2s ease',
        }}
        onFocus={e => (e.currentTarget.style.top = '8px')}
        onBlur={e => (e.currentTarget.style.top = '-60px')}
      >
        Przejdź do diagnostyki
      </a>

      {/* ── Scroll progress bar ── */}
      <ScrollProgress />

      {/* ── Ambient gold orby (premium drift) ── */}
      <div className="diag-ambient" aria-hidden="true" />

      <div
        id="diagnostyka"
        ref={topRef}
        style={{ maxWidth: phase === 'results' ? 584 : 440, width: '100%', margin: '0 auto', padding: '0 0 60px', position: 'relative', zIndex: 1, overflow: 'hidden', ['--font-display' as string]: FONT_MAP[cfg.font] } as React.CSSProperties}
      >

        {/* ── FORM ── */}
        {phase === 'form' && (
          <>
            {/* Top bar z logo + progress */}
            <div style={{
              position: 'sticky', top: 0, zIndex: 100,
              background: 'rgba(10,10,10,0.92)',
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              borderBottom: `1px solid ${M.brd}`,
              padding: '12px 16px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Logo />
                <span style={{ fontFamily: M.mono, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: M.gold, textAlign: 'right' }}>{RZYM[sec]} / VII &middot; {SECTIONS[sec]}</span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Postęp formularza"
                style={{ display: 'flex', gap: 5 }}
              >
                {SECTIONS.map((s, i) => (
                  <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= sec ? M.gold : M.s2, opacity: i < sec ? 0.45 : i === sec ? 1 : 0.55, boxShadow: i === sec ? `0 0 8px ${M.gold}40` : 'none', transition: 'all .35s ease' }} title={s} />
                ))}
              </div>
            </div>

            {/* Live counter */}
            {C.total > 0 && (
              <div style={{
                position: 'sticky', top: 72, zIndex: 99,
                background: 'rgba(10,10,10,0.92)',
                backdropFilter: 'blur(28px)',
                WebkitBackdropFilter: 'blur(28px)',
                borderBottom: `1px solid ${M.brd}`,
                padding: '10px 16px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: M.t4 }}>Twoja strata / 6 mies.</span>
                <span style={{ fontFamily: M.mono, fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em', color: M.gold, fontVariantNumeric: 'tabular-nums' }}>{C.total.toLocaleString('pl-PL')} zł</span>
              </div>
            )}

            <div
              className={secTransition === 'out-left' ? 'sec-out-left' : secTransition === 'out-right' ? 'sec-out-right' : secTransition === 'in' ? 'sec-in' : ''}
              style={{
                padding: '0 16px',
                minHeight: 'calc(100vh - 120px)',
                position: 'relative',
                background: `radial-gradient(ellipse 80% 50% at 50% 0%, ${SECTION_HUES[sec]}0c 0%, transparent 65%), radial-gradient(ellipse 60% 40% at 100% 100%, ${SECTION_HUES[sec]}05 0%, transparent 70%)`,
                transition: 'background .8s cubic-bezier(.4,0,.2,1)',
              }}
            >
              {/* Hero - pierwszy ekran */}
              {sec === 0 && (
                <div
                  className={loaded ? 'hero-entry' : ''}
                  style={{ padding: '40px 0 32px', textAlign: 'center', position: 'relative' }}
                >
                  {/* Morfujące blob tła */}
                  <div
                    className="blob-bg"
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      top: '10%', left: '50%',
                      transform: 'translateX(-50%)',
                      width: 280, height: 280,
                      background: `radial-gradient(ellipse, ${M.gold}08 0%, transparent 70%)`,
                      pointerEvents: 'none',
                      zIndex: 0,
                    }}
                  />
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{
                      display: 'inline-flex', fontFamily: M.mono, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase',
                      color: M.gold, border: `1.5px solid ${M.gold}40`, padding: '8px 20px', marginBottom: 22,
                      background: M.gold + '10', borderRadius: 20, fontWeight: 700,
                      boxShadow: `0 0 12px ${M.gold}15`,
                    }} className="border-glow">
                      {BADGE_V[cfg.badge]}
                    </div>
                    <h1 style={{
                      fontFamily: M.serif, fontSize: cfg.heroSize === 'L' ? 'clamp(46px, 13vw, 64px)' : 'clamp(40px, 11vw, 56px)', fontWeight: 400, lineHeight: 1.0, letterSpacing: '-0.01em', marginBottom: 20,
                      color: M.t1, textShadow: '0 0 24px rgba(255,255,255,.08)',
                      textWrap: 'balance',
                    }}>
                      {HERO_H1[cfg.heroH1].pre}{' '}
                      <span style={{
                        color: M.gold,
                        fontStyle: 'italic',
                      }}>
                        {HERO_H1[cfg.heroH1].gold}
                      </span>
                    </h1>
                    {/* Symptom stack + insight "to nie 5 problemow" + obietnica + odkrycia (wersja Michala, promise-payoff match z wynikiem) */}
                    <div style={{ color: M.t1, fontSize: 16, lineHeight: 1.75, fontWeight: 600, maxWidth: 400, margin: '0 auto 14px' }}>
                      {['Sen, który nie regeneruje', 'Zjazd energii w ciągu dnia', 'Brak efektów mimo kolejnych prób'].map((s, i) => (
                        <div key={i}>{s}</div>
                      ))}
                    </div>
                    <p style={{ fontFamily: M.serif, fontStyle: 'italic', color: M.gold, fontSize: 19, lineHeight: 1.35, fontWeight: 400, maxWidth: 400, margin: '0 auto 22px' }}>
                      To nie muszą być osobne problemy.
                    </p>
                    <button
                      onClick={() => { vibe(10); if (typeof window !== 'undefined') window.scrollBy({ top: Math.round(window.innerHeight * 0.72), behavior: 'smooth' }); }}
                      className="shimmer-btn"
                      style={{ width: '100%', maxWidth: 360, padding: '16px 28px', background: `linear-gradient(135deg, ${M.gold}, #a08a3e)`, color: M.bg, border: 'none', fontFamily: M.sans, fontSize: 15, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer', borderRadius: 14, boxShadow: '0 4px 24px rgba(200,168,78,0.28)', minHeight: 52 }}
                    >
                      Sprawdzam, co mnie blokuje &rarr;
                    </button>
                    <div style={{ fontFamily: M.mono, fontSize: 11, color: M.t4, letterSpacing: 1.2, marginTop: 14 }}>
                      5 minut &middot; za darmo &middot; <span style={{ color: M.gold, fontWeight: 700 }}>1200+ facetów już sprawdziło</span>
                    </div>
                    {/* Pętla powrotu: poprzedni wynik = pretekst do retestu i porównania */}
                    {lastRes && (Date.now() - lastRes.ts) > 86400000 && (
                      <div style={{ margin: '18px auto 0', maxWidth: 380, padding: '12px 16px', borderRadius: 12, background: M.s1, border: `1px solid ${M.gold}30`, textAlign: 'left' }}>
                        <div style={{ fontFamily: M.mono, fontSize: 9.5, letterSpacing: 2, textTransform: 'uppercase', color: M.gold, fontWeight: 700, marginBottom: 5 }}>Twój poprzedni pomiar</div>
                        <div style={{ fontSize: 13, color: M.t2, lineHeight: 1.5 }}>
                          {lastRes.score}/100 &middot; {lastRes.hour} &middot; {Math.floor((Date.now() - lastRes.ts) / 86400000)} dni temu. Zrób jeszcze raz i zobacz, co się ruszyło.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Nagłówek sekcji (nie-hero) */}
              {sec > 0 && (
                <div className="fade-up" style={{ padding: '30px 0 26px' }}>
                  <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: M.gold, fontWeight: 700, marginBottom: 10 }}>Sekcja {RZYM[sec]} / VII</div>
                  <h2 style={{ fontFamily: M.serif, fontWeight: 400, fontSize: 38, letterSpacing: '-0.01em', lineHeight: 1, color: M.t1 }}>{SECTIONS[sec]}</h2>
                  <div aria-hidden="true" style={{ width: 44, height: 1, background: M.gold, marginTop: 14, opacity: 0.65 }} />
                </div>
              )}

              {sec === 0 && (
                <div className="fade-up">
                  <div style={{ marginBottom: 28 }}>
                    <Slider label="Twój wiek" min={18} max={50} step={1} k="age" val={D.age} unit=" lat" ariaLabel="Twój wiek w latach" />
                  </div>
                  <SH n="01" title="Sen" />
                  <div style={{ fontSize: 14, color: M.t3, fontWeight: 400, paddingLeft: 38, marginBottom: 28 }}>Leżysz 8h. Ile z tego naprawdę śpisz, a ile przewijasz telefon?</div>
                  <Slider label="Ile godzin faktycznie śpisz" min={3} max={9} step={0.5} k="sleep" val={D.sleep} unit="h" note={`Deficyt vs 7.5h: ${Math.max((7.5 - D.sleep) * 7, 0).toFixed(0)}h / tydzień`} ariaLabel="Średni czas snu w nocy w godzinach" />
                  {/* Telefon przed snem → screenBed (rozdzielone od jakości snu) */}
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 15, color: M.t1, fontWeight: 500, marginBottom: 8, lineHeight: 1.45 }}>
                      W ilu z ostatnich 7 wieczorów telefon był z Tobą do ostatnich 30 minut przed snem?
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                      {([['0-1', 0], ['2-3', 1], ['4-5', 2], ['6-7', 3]] as [string, number][]).map(([l, v]) => {
                        const on = D.screenBed === v;
                        return (
                          <button key={v} onClick={() => upd('screenBed', v)} style={{ padding: '13px 4px', textAlign: 'center', border: `1.5px solid ${on ? M.gold : M.brd2}`, background: on ? M.gold + '0e' : M.s1, color: on ? M.t1 : M.t4, cursor: 'pointer', borderRadius: 10, transition: 'border-color .2s ease, background .2s ease', fontSize: 13, fontWeight: 600, fontFamily: M.sans, minHeight: 48 }}>{l}</button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Jakość snu → sleepQ (rozdzielone od telefonu) */}
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 15, color: M.t1, fontWeight: 500, marginBottom: 8, lineHeight: 1.45 }}>
                      Jak często budzisz się z poczuciem, że sen faktycznie Cię odnowił?
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {([['Prawie codziennie', 0], ['3-4 razy w tygodniu', 1], ['1-2 razy w tygodniu', 2], ['Prawie nigdy', 3]] as [string, number][]).map(([l, v]) => {
                        const on = D.sleepQ === v;
                        return (
                          <button key={v} onClick={() => upd('sleepQ', v)} style={{ padding: '13px 14px', textAlign: 'left', border: `1.5px solid ${on ? M.gold : M.brd2}`, background: on ? M.gold + '0e' : M.s1, color: on ? M.t1 : M.t3, cursor: 'pointer', borderRadius: 12, transition: 'all .2s ease', fontSize: 13.5, fontWeight: 600, fontFamily: M.sans, lineHeight: 1.4 }}>{l}</button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Moment pęknięcia dnia → breakWindow (zastępuje zmyślaną godzinę yourHour) */}
                  <div style={{ marginBottom: 26 }}>
                    <div style={{ fontSize: 15, color: M.t1, fontWeight: 500, marginBottom: 8, lineHeight: 1.45 }}>
                      Kiedy zaczyna się pierwszy moment, po którym dzień się sypie?<span style={{ display: 'block', fontSize: 12.5, color: M.t3, marginTop: 4, fontWeight: 400 }}>Chodzi o pierwszy ruch, po którym reszta się rozjeżdża, zanim jeszcze widać skutki.</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {([
                        ['Zaraz po przebudzeniu. Budzik, telefon, kawa, start na minusie.', 0],
                        ['Między 10:00 a 14:00. Odpływam, odkładam pierwsze ważne rzeczy.', 1],
                        ['Między 14:00 a 18:00. Kończy się skupienie, dowożę już tylko minimum.', 2],
                        ['Między 18:00 a 21:00. Odpada trening, normalny posiłek albo plan na wieczór.', 3],
                        ['Po 21:00. Telefon, lodówka i przesuwanie snu przejmują stery.', 4],
                        ['Dopiero weekend. W tygodniu trzymam, piątek albo sobota kasuje rytm.', 5],
                        ['Nie ma jednego momentu. Rozsypuje się różnie.', 6],
                      ] as [string, number][]).map(([l, v]) => {
                        const on = D.breakWindow === v;
                        return (
                          <button key={v} onClick={() => upd('breakWindow', v)} style={{ padding: '13px 14px', textAlign: 'left', border: `1.5px solid ${on ? M.gold : M.brd2}`, background: on ? M.gold + '12' : M.s1, color: on ? M.t1 : M.t3, cursor: 'pointer', borderRadius: 12, transition: 'all .2s ease', fontSize: 13.5, fontWeight: 600, fontFamily: M.sans, lineHeight: 1.4 }}>{l}</button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {sec === 1 && (
                <div className="fade-up">
                  {/* Micro-reward: insight z poprzedniej sekcji */}
                  <div style={{ borderLeft: `3px solid ${M.gold}`, padding: '8px 12px', marginBottom: 20, background: `${M.gold}08`, borderRadius: '0 8px 8px 0', maxWidth: '100%', margin: '0 auto 20px' }}>
                    <p style={{ fontSize: 12, color: M.t3, margin: 0, lineHeight: 1.5, textAlign: 'center' }}>Twój sen: brakuje <strong style={{ color: M.gold }}>{Math.max((7.5 - D.sleep) * 7, 0).toFixed(0)}h</strong> w tygodniu. To <strong style={{ color: M.gold }}>{Math.round(Math.max((7.5 - D.sleep) * 7 * 52, 0))}h</strong> rocznie pod alarmem.</p>
                  </div>
                  {/* Napięcie → stress (scena + częstotliwość, 0-3) */}
                  <div style={{ marginBottom: 22 }}>
                    <div style={{ fontSize: 15, color: M.t1, fontWeight: 500, marginBottom: 8, lineHeight: 1.45 }}>
                      W ilu z ostatnich 7 wieczorów ciało już siedziało, a głowa dalej była w robocie?
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                      {([['0-1', 0], ['2-3', 1], ['4-5', 2], ['6-7', 3]] as [string, number][]).map(([l, v]) => {
                        const on = D.stress === v;
                        return (<button key={v} onClick={() => upd('stress', v)} style={{ padding: '13px 4px', textAlign: 'center', border: `1.5px solid ${on ? M.gold : M.brd2}`, background: on ? M.gold + '0e' : M.s1, color: on ? M.t1 : M.t4, cursor: 'pointer', borderRadius: 10, transition: 'border-color .2s ease, background .2s ease', fontSize: 13, fontWeight: 600, fontFamily: M.sans, minHeight: 48 }}>{l}</button>);
                      })}
                    </div>
                  </div>

                  {/* Zmęczenie od rana → energy (częstotliwość poranków, 0-3) */}
                  <div style={{ marginBottom: 22 }}>
                    <div style={{ fontSize: 15, color: M.t1, fontWeight: 500, marginBottom: 8, lineHeight: 1.45 }}>
                      Jak często budzisz się z poczuciem, że spałbyś od razu jeszcze dwie godziny?
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
                      {([['Prawie nigdy', 0], ['1-2 poranki w tygodniu', 1], ['3-4 poranki', 2], ['5-7 poranków', 3]] as [string, number][]).map(([l, v]) => {
                        const on = D.energy === v;
                        return (<button key={v} onClick={() => upd('energy', v)} style={{ padding: '13px 10px', textAlign: 'left', border: `1.5px solid ${on ? M.gold : M.brd2}`, background: on ? M.gold + '0e' : M.s1, color: on ? M.t1 : M.t3, cursor: 'pointer', borderRadius: 10, transition: 'border-color .2s ease, background .2s ease', fontSize: 12.5, fontWeight: 600, fontFamily: M.sans, minHeight: 48, lineHeight: 1.35 }}>{l}</button>);
                      })}
                    </div>
                  </div>

                  {/* Ucieczka od trudnego zadania → dopamine (scena zachowania, 0-3) */}
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 15, color: M.t1, fontWeight: 500, marginBottom: 8, lineHeight: 1.45 }}>
                      Co się dzieje, gdy trafiasz na nudne albo trudne zadanie?
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {([
                        ['Zostaję przy nim bez sięgania po telefon.', 0],
                        ['Po kilku minutach zaczynam szukać przerwy.', 1],
                        ['Łapię telefon przy prawie każdym postoju.', 2],
                        ['Bez dodatkowego bodźca nie wytrzymuję nawet 15-20 minut.', 3],
                      ] as [string, number][]).map(([l, v]) => {
                        const on = D.dopamine === v;
                        return (<button key={v} onClick={() => upd('dopamine', v)} style={{ padding: '13px 14px', textAlign: 'left', border: `1.5px solid ${on ? M.gold : M.brd2}`, background: on ? M.gold + '0e' : M.s1, color: on ? M.t1 : M.t3, cursor: 'pointer', borderRadius: 12, transition: 'all .2s ease', fontSize: 13.5, fontWeight: 600, fontFamily: M.sans, lineHeight: 1.4 }}>{l}</button>);
                      })}
                    </div>
                  </div>
                  <div style={{ fontSize: 15, color: M.t1, fontWeight: 600, marginBottom: 4, marginTop: 4 }}>Praca</div>
                  <div style={{ fontSize: 12.5, color: M.t3, marginBottom: 16 }}>Dwie liczby. Z nich wychodzi, ile ten stan kosztuje Cię w robocie.</div>
                  <Slider label="Ile godzin dziennie pracujesz?" min={4} max={14} step={1} k="workHours" val={D.workHours} unit="h" ariaLabel="Liczba godzin pracy dziennie" />
                  <Slider label="Ile z nich lecisz na pół mocy?" min={0} max={4} step={0.5} k="lost" val={D.lost} unit="h" note="Siedzisz przy ekranie, klikasz, ale głowy tam nie ma. Policz te godziny." ariaLabel="Liczba godzin na pół mocy dziennie" />
                  {/* Pensja i podwyżka usunięte z przeglądu: kotwica liczy tylko realny wydatek + czas, nie zmyśloną utraconą pensję. */}
                  {/* Pytanie o "poczucie progresu" wyciete (audyt osi biznesowych 2026-07-16): nie otwiera DM, nie domyka, nie robi contentu. Pole progress zostaje w FD z defaultem 0 = zero wplywu. */}
                </div>
              )}

              {sec === 2 && (
                <div className="fade-up">
                  {/* Micro-reward: insight z poprzedniej sekcji */}
                  <div style={{ borderLeft: `3px solid ${M.gold}`, padding: '8px 12px', marginBottom: 20, background: `${M.gold}08`, borderRadius: '0 8px 8px 0', maxWidth: '100%', margin: '0 auto 20px' }}>
                    <p style={{ fontSize: 12, color: M.t3, margin: 0, lineHeight: 1.5, textAlign: 'center' }}>Na pół mocy schodzi Ci <strong style={{ color: M.gold }}>{Math.round(D.lost * 220)}h</strong> w roku. To około <strong style={{ color: M.gold }}>{Math.round(D.lost * 220 / 8)} dni roboczych</strong> obok własnej roboty.</p>
                  </div>
                  {/* Wieczorne jedzenie → binge (scala rozjechane jedzenie + objadanie w jedno pytanie o zachowanie) */}
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 15, color: M.t1, fontWeight: 500, marginBottom: 8, lineHeight: 1.45 }}>
                      Co najczęściej dzieje się z jedzeniem między 18:00 a snem?
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {([
                        ['Jem zaplanowany posiłek i temat jest zamknięty.', 0],
                        ['Dochodzi jedna nieplanowana przekąska.', 1],
                        ['1-2 razy w tygodniu jem znacznie więcej, niż planowałem.', 2],
                        ['3 albo więcej wieczorów kończy się jedzeniem bez kontroli.', 3],
                        ['Każdy wieczór wygląda inaczej, nie mam żadnego rytmu.', 4],
                      ] as [string, number][]).map(([l, v]) => {
                        const on = D.binge === v;
                        return (<button key={v} onClick={() => upd('binge', v)} style={{ padding: '13px 14px', textAlign: 'left', border: `1.5px solid ${on ? M.gold : M.brd2}`, background: on ? M.gold + '0e' : M.s1, color: on ? M.t1 : M.t3, cursor: 'pointer', borderRadius: 12, transition: 'all .2s ease', fontSize: 13.5, fontWeight: 600, fontFamily: M.sans, lineHeight: 1.4 }}>{l}</button>);
                      })}
                    </div>
                  </div>

                  {/* Jakosc zywienia - warzywa/owoce (kwalifikator) */}
                  <div style={{ marginBottom: 24, marginTop: 8 }}>
                    <div style={{ fontSize: 15, color: M.t1, fontWeight: 500, marginBottom: 8, lineHeight: 1.45 }}>
                      W ilu z ostatnich 7 dni jadłeś warzywa lub owoce przynajmniej 3 razy?
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                      {([['6-7 dni', 0], ['2-5 dni', 1], ['0-1 dni', 2]] as [string, number][]).map(([l, v]) => {
                        const on = D.veggies === v;
                        return (
                          <button key={v} onClick={() => upd('veggies', v)} style={{ padding: '13px 4px', textAlign: 'center', border: `1.5px solid ${on ? M.gold : M.brd2}`, background: on ? M.gold + '0e' : M.s1, color: on ? M.t1 : M.t4, cursor: 'pointer', borderRadius: 10, transition: 'border-color .2s ease, background .2s ease', fontSize: 12, fontWeight: 600, fontFamily: M.sans, lineHeight: 1.3, minHeight: 48 }}>{l}</button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bialko + regularne posilki */}
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 15, color: M.t1, fontWeight: 500, marginBottom: 8, lineHeight: 1.45 }}>
                      W ilu z ostatnich 7 dni miałeś 3 normalne posiłki z konkretnym białkiem?
                      <span style={{ display: 'block', fontSize: 12.5, color: M.t3, marginTop: 4, fontWeight: 400 }}>Mięso, ryby, jajka, nabiał. Nie „coś się zjadło".</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                      {([['6-7 dni', 0], ['2-5 dni', 1], ['0-1 dni', 2]] as [string, number][]).map(([l, v]) => {
                        const on = D.protein === v;
                        return (
                          <button key={v} onClick={() => upd('protein', v)} style={{ padding: '13px 4px', textAlign: 'center', border: `1.5px solid ${on ? M.gold : M.brd2}`, background: on ? M.gold + '0e' : M.s1, color: on ? M.t1 : M.t4, cursor: 'pointer', borderRadius: 10, transition: 'border-color .2s ease, background .2s ease', fontSize: 12, fontWeight: 600, fontFamily: M.sans, lineHeight: 1.3, minHeight: 48 }}>{l}</button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Suplementy usunięte z diagnostyki: nie kwalifikują i nie pokazują głównego problemu. */}

                  <Slider label="Ile miesięcznie idzie na dowóz i jedzenie na mieście?" min={0} max={1000} step={50} k="junk" val={D.junk} unit=" zł" note={`Glovo, kebab pod blokiem, gotowce z Żabki. To liczba, którą sam podajesz i tylko ona wchodzi do rachunku.`} ariaLabel="Miesięczne wydatki na dowóz i jedzenie na mieście" />
                </div>
              )}

              {sec === 3 && (
                <div className="fade-up">
                  {/* Micro-reward: insight z poprzedniej sekcji */}
                  <div style={{ borderLeft: `3px solid ${M.gold}`, padding: '8px 12px', marginBottom: 20, background: `${M.gold}08`, borderRadius: '0 8px 8px 0', maxWidth: '100%', margin: '0 auto 20px' }}>
                    <p style={{ fontSize: 12, color: M.t3, margin: 0, lineHeight: 1.5, textAlign: 'center' }}>Śmieciowe jedzenie / dowóz: <strong style={{ color: M.gold }}>{(D.junk * 6).toLocaleString('pl-PL')} zł</strong> w 6 miesięcy</p>
                  </div>
                  <div style={{ fontSize: 13.5, color: M.t3, fontWeight: 400, marginBottom: 20, lineHeight: 1.6 }}>Zero moralizowania. Liczę tylko, co to robi z formą i kieszenią.</div>

                  {/* Wpływ weekendu na rytm → wknd (odłączone od dawki alkoholu, częstotliwość != dawka) */}
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 15, color: M.t1, fontWeight: 500, marginBottom: 8, lineHeight: 1.45 }}>
                      Jak często weekend wyraźnie rusza Ci sen, jedzenie albo poziom ruchu?
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {([
                        ['Prawie nigdy', 0],
                        ['Raz w miesiącu', 1],
                        ['2-3 weekendy w miesiącu', 2],
                        ['Prawie każdy weekend', 4],
                      ] as [string, number][]).map(([l, wk]) => {
                        const on = D.wknd === wk;
                        return (
                          <button key={l} onClick={() => upd('wknd', wk)} style={{ padding: '13px 14px', textAlign: 'left', border: `1.5px solid ${on ? M.gold : M.brd2}`, background: on ? M.gold + '0e' : M.s1, color: on ? M.t1 : M.t3, cursor: 'pointer', borderRadius: 12, transition: 'border-color .2s ease, background .2s ease', fontSize: 13.5, fontWeight: 600, fontFamily: M.sans, lineHeight: 1.4 }}>{l}</button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Dawka alkoholu → drinks (osobne, opcjonalne, NIE liczone z częstotliwości) */}
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 15, color: M.t1, fontWeight: 500, marginBottom: 8, lineHeight: 1.45 }}>
                      Jeśli pijesz, ile porcji zwykle wypada na jedno wyjście?<span style={{ display: 'block', fontSize: 12.5, color: M.t3, marginTop: 4, fontWeight: 400 }}>Opcjonalne. Piwo, drink, kieliszek, to jedna porcja.</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                      {([['Nie piję', 0], ['1-2', 2], ['3-5', 4], ['6-8', 7], ['9+', 10]] as [string, number][]).map(([l, dr]) => {
                        const on = D.drinks === dr;
                        return (
                          <button key={l} onClick={() => upd('drinks', dr)} style={{ padding: '12px 4px', textAlign: 'center', border: `1.5px solid ${on ? M.gold : M.brd2}`, background: on ? M.gold + '0e' : M.s1, color: on ? M.t1 : M.t4, cursor: 'pointer', borderRadius: 10, transition: 'border-color .2s ease, background .2s ease', fontSize: 12.5, fontWeight: 600, fontFamily: M.sans, minHeight: 46, lineHeight: 1.3 }}>{l}</button>
                        );
                      })}
                    </div>
                  </div>

                  {/* JEDNA kwota za wyjscie: alkohol + kluby + taksowki + substancje scalone */}
                  {D.wknd > 0 && (
                    <Slider label="Ile schodzi, jak już wyjdziesz?" min={0} max={800} step={50} k="cash" val={D.cash} unit=" zł" note={`Alkohol, kluby, taksówki, jedzenie, cokolwiek. Jedno typowe wyjście. Rok: ${(D.cash * D.wknd * 12).toLocaleString('pl-PL')} zł`} ariaLabel="Ile wydajesz na typowe wyjście" />
                  )}
                  {D.drinks >= 10 && (
                    <div style={{ fontSize: 11.5, color: M.org, fontStyle: 'italic', marginTop: -8, marginBottom: 24, lineHeight: 1.5 }}>
                      Przy tej częstotliwości wątroba i testosteron nie wracają między jednym a drugim wyjściem do poziomu wyjściowego (szacunek).
                    </div>
                  )}
                  {/* Poniedziałek po weekendzie - combo: mondayFeel + weekendWork (v2, ożywia 2 martwe pola) */}
                  <div style={{ marginBottom: 26, marginTop: 4 }}>
                    <div style={{ fontSize: 15, color: M.t1, fontWeight: 500, marginBottom: 8, lineHeight: 1.45 }}>
                      Kiedy po weekendzie sen, energia i głowa wracają do normy?<span style={{ display: 'block', fontSize: 12.5, color: M.t3, marginTop: 4, fontWeight: 400 }}>Żeby było jak w środku tygodnia.</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {([
                        ['Od poniedziałkowego rana', 0, 0],
                        ['W poniedziałek po południu', 1, 1],
                        ['Dopiero we wtorek', 2, 1],
                        ['W środę albo później', 3, 2],
                      ] as [string, number, number][]).map(([l, mf, ww], i) => {
                        const on = D.mondayFeel === mf && D.weekendWork === ww;
                        return (
                          <button key={i} onClick={() => { upd('mondayFeel', mf); upd('weekendWork', ww); }} style={{
                            padding: '13px 14px', textAlign: 'left',
                            border: `1.5px solid ${on ? M.gold : M.brd2}`,
                            background: on ? M.gold + '12' : M.s1,
                            color: on ? M.t1 : M.t3,
                            cursor: 'pointer', borderRadius: 12, transition: 'all .2s ease',
                            fontSize: 13.5, fontWeight: 600, fontFamily: M.sans, lineHeight: 1.4,
                          }}>
                            {l}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Co konkretnie sypie sie w weekend (warunkowe, gdy weekend realnie rusza rytm) - karmi personalizacje fazy Weekend */}
                  {D.wknd >= 2 && (
                    <div style={{ marginBottom: 26 }}>
                      <div style={{ fontSize: 15, color: M.t1, fontWeight: 500, marginBottom: 8, lineHeight: 1.45 }}>
                        Co się sypie w weekend najmocniej?
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {([
                          ['Sen i pobudki, wstaję w południe', 0],
                          ['Jedzenie leci luzem', 1],
                          ['Zero ruchu, kanapa i telefon', 2],
                          ['Alkohol i powrót do siebie', 3],
                        ] as [string, number][]).map(([l, v]) => {
                          const on = D.wkndWhat === v;
                          return (
                            <button key={v} onClick={() => upd('wkndWhat', v)} style={{ padding: '12px 10px', textAlign: 'left', border: `1.5px solid ${on ? M.gold : M.brd2}`, background: on ? M.gold + '0e' : M.s1, color: on ? M.t1 : M.t3, cursor: 'pointer', borderRadius: 10, transition: 'border-color .2s ease, background .2s ease', fontSize: 12.5, fontWeight: 600, fontFamily: M.sans, lineHeight: 1.35, minHeight: 50 }}>{l}</button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {sec === 4 && (
                <div className="fade-up">
                  {/* Micro-reward: insight z poprzedniej sekcji */}
                  <div style={{ borderLeft: `3px solid ${M.gold}`, padding: '8px 12px', marginBottom: 20, background: `${M.gold}08`, borderRadius: '0 8px 8px 0', maxWidth: '100%', margin: '0 auto 20px' }}>
                    <p style={{ fontSize: 12, color: M.t3, margin: 0, lineHeight: 1.5, textAlign: 'center' }}>Twój weekend: <strong style={{ color: M.gold }}>{(D.cash * D.wknd).toLocaleString('pl-PL')} zł</strong> z konta {D.drinks > 5 ? <>+ <strong style={{ color: M.gold }}>mocna presja na testosteron</strong> po każdym</> : 'miesięcznie'}. Rok = <strong style={{ color: M.gold }}>{(D.cash * D.wknd * 12).toLocaleString('pl-PL')} zł</strong> z kasy.</p>
                  </div>
                  {/* Koszt siłowni usunięty: podbijał rachunek, nie pomagał dobrać prowadzenia. */}
                  <div style={{ fontSize: 15, color: M.t1, fontWeight: 600, marginBottom: 4 }}>Plan vs życie</div>
                  <div style={{ fontSize: 12.5, color: M.t3, marginBottom: 16 }}>Dwie liczby, między którymi mieszka cała prawda o Twojej formie. Zero treningów to też odpowiedź.</div>
                  <Slider label="Ile treningów w tygodniu sobie zakładasz?" min={0} max={7} step={1} k="plan" val={D.plan} unit="" ariaLabel="Liczba planowanych treningów w tygodniu" />
                  <Slider label="Ile z nich zwykle wypada przez zmęczenie, brak czasu, rozsypany tydzień?" min={0} max={Math.max(D.plan, 0)} step={1} k="miss" val={D.miss} unit="" note={D.plan > 0 ? `Nie policzy się więcej, niż planujesz (${D.plan}/tydz).` : 'Najpierw ustaw, ile planujesz.'} ariaLabel="Liczba treningów, które wypadają tygodniowo" />
                  <Slider label="Od ilu lat trenujesz?" min={0} max={15} step={1} k="trainYears" val={D.trainYears} unit=" lat" ariaLabel="Liczba lat treningu" />
                  {/* trainHappy - emocjonalny closer sekcji (v2, ożywia najgęściej wpięte martwe pole) */}
                  <div style={{ marginBottom: 26 }}>
                    <div style={{ fontSize: 15, color: M.t1, fontWeight: 500, marginBottom: 8, lineHeight: 1.45 }}>
                      Widać po Tobie te lata treningu?<span style={{ display: 'block', fontSize: 12.5, color: M.t3, marginTop: 4, fontWeight: 400 }}>Szczerze. Nikt tego nie widzi poza Tobą.</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
                      {[{ l: 'Tak, jestem zadowolony', v: 0 }, { l: 'Częściowo, powinno być lepiej', v: 1 }, { l: 'Nie, wkładam dużo więcej niż widać', v: 2 }, { l: 'Dopiero zaczynam, za wcześnie oceniać', v: 3 }].map(o => {
                        const on = D.trainHappy === o.v;
                        const col = o.v === 0 ? M.grn : o.v === 1 ? M.yel : o.v === 2 ? M.red : M.t3;
                        return (
                          <button key={o.v} onClick={() => upd('trainHappy', o.v)} style={{
                            padding: '14px 4px', textAlign: 'center',
                            border: `1.5px solid ${on ? M.gold : M.brd2}`,
                            background: on ? M.gold + '0e' : M.s1,
                            cursor: 'pointer', borderRadius: 12, transition: 'border-color .2s ease, background .2s ease',
                            minHeight: 52,
                          }}>
                            <span style={{ fontSize: 11.5, fontWeight: 600, color: on ? col : M.t4, letterSpacing: 0.4 }}>{o.l}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {sec === 5 && (
                <div className="fade-up">
                  {/* Micro-reward: insight z poprzedniej sekcji */}
                  <div style={{ borderLeft: `3px solid ${M.gold}`, padding: '8px 12px', marginBottom: 20, background: `${M.gold}08`, borderRadius: '0 8px 8px 0', maxWidth: '100%', margin: '0 auto 20px' }}>
                    <p style={{ fontSize: 12, color: M.t3, margin: 0, lineHeight: 1.5, textAlign: 'center' }}>Przy tym rytmie w rok wypada Ci <strong style={{ color: M.gold }}>{D.miss * 4 * 12}</strong> treningów. Nie z braku karnetu, z rozsypanego tygodnia.</p>
                  </div>
                  {/* Poranny wzwod - marker hormonalny z narzedzia hormonow (mocny kwalifikator, pytany wprost) */}
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 15, color: M.t1, fontWeight: 500, marginBottom: 8, lineHeight: 1.45 }}>
                      Opcjonalnie: jak często w ostatnich 4 tygodniach zdarzał się poranny wzwód?
                      <span style={{ display: 'block', fontSize: 12.5, color: M.t3, marginTop: 4, fontWeight: 400 }}>Jeden z kilku sygnałów snu i zdrowia seksualnego. Sam nie mówi, jaki masz testosteron. Możesz pominąć.</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                      {([['4+ razy w tygodniu', 0], ['1-3 razy w tygodniu', 1], ['Rzadziej', 2]] as [string, number][]).map(([l, v]) => {
                        const on = D.morningWood === v;
                        return (
                          <button key={v} onClick={() => upd('morningWood', v)} style={{ padding: '13px 4px', textAlign: 'center', border: `1.5px solid ${on ? M.gold : M.brd2}`, background: on ? M.gold + '0e' : M.s1, color: on ? M.t1 : M.t4, cursor: 'pointer', borderRadius: 10, transition: 'border-color .2s ease, background .2s ease', fontSize: 12, fontWeight: 600, fontFamily: M.sans, lineHeight: 1.3, minHeight: 48 }}>{l}</button>
                        );
                      })}
                    </div>
                  </div>
                  <div style={{ fontSize: 15, color: M.t2, fontWeight: 500, marginBottom: 6, lineHeight: 1.5 }}>Które sygnały przeszkadzały Ci najbardziej w ostatnich tygodniach?</div>
                  <div style={{ fontSize: 12.5, color: M.t4, marginBottom: 16, lineHeight: 1.5 }}>Wybierz maksymalnie 3. {D.tags.size}/3 zaznaczone. Objawy czysto medyczne (bóle głowy, stawy, tętno) omawia się z lekarzem, nie zalicza do wyniku.</div>
                  {([
                    ['fatigue', 'Zmęczenie mimo wystarczającej liczby godzin snu.'],
                    ['focus', 'Trudność z utrzymaniem skupienia.'],
                    ['cravings', 'Wieczorne jedzenie bez kontroli, głód na słodkie.'],
                    ['belly', 'Brak efektów sylwetkowych mimo regularnych prób.'],
                    ['recovery', 'Wolniejsza regeneracja po treningu.'],
                    ['libido', 'Spadek libido albo zainteresowania seksem.'],
                    ['anxiety', 'Napięcie i rozdrażnienie, które nie schodzą wieczorem.'],
                    ['digest', 'Problemy z trawieniem albo częste wzdęcia.'],
                    ['motivation', 'Napęd siada, robisz tylko minimum.'],
                    ['confidence', 'Mniej pewny siebie niż rok temu, unikasz luster.'],
                  ] as [ChipKey, string][]).map(([k, l]) => <Chip key={k} t={k} label={l} />)}
                </div>
              )}

              {sec === 6 && (
                <div className="fade-up">
                  {/* Micro-reward: insight z poprzedniej sekcji */}
                  <div style={{ borderLeft: `3px solid ${M.gold}`, padding: '8px 12px', marginBottom: 20, background: `${M.gold}08`, borderRadius: '0 8px 8px 0', maxWidth: '100%', margin: '0 auto 20px' }}>
                    <p style={{ fontSize: 12, color: M.t3, margin: 0, lineHeight: 1.5, textAlign: 'center' }}>Zaznaczyłeś <strong style={{ color: M.gold }}>{D.tags.size}</strong> {D.tags.size === 1 ? 'sygnał' : 'sygnałów'}. Bez liczenia ich na złotówki: to lista tego, co ciągnie Cię w dół każdego dnia.</p>
                  </div>
                  <div style={{ fontSize: 13.5, color: M.t3, fontWeight: 400, marginBottom: 20, lineHeight: 1.6 }}>Ostatnia sekcja. 60 sekund i masz liczby.</div>
                  {/* Próby zmiany */}
                  <div style={{ marginBottom: 26 }}>
                    <div style={{ fontSize: 15, color: M.t1, fontWeight: 500, marginBottom: 6, lineHeight: 1.45 }}>
                      Próby zmiany<span style={{ display: 'block', fontSize: 12.5, color: M.t3, marginTop: 4, fontWeight: 400 }}>Ile razy w ostatnich 12 miesiącach zaczynałeś plan, który wytrzymał krócej niż 4 tygodnie?</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
                      {[{ n: '0', l: 'Ani razu', v: 0 }, { n: '1-2', l: 'razy', v: 1 }, { n: '3-4', l: 'razy', v: 2 }, { n: '5+', l: 'razy', v: 3 }].map(o => {
                        const on = D.triedBefore === o.v;
                        const col = o.v === 0 ? M.t4 : o.v === 1 ? M.yel : o.v === 2 ? M.org : M.red;
                        return (
                          <button key={o.v} onClick={() => upd('triedBefore', o.v)} style={{
                            padding: '16px 4px', textAlign: 'center',
                            border: `1.5px solid ${on ? M.gold : M.brd2}`,
                            background: on ? M.gold + '0e' : M.s1,
                            cursor: 'pointer', borderRadius: 12, transition: 'border-color .2s ease, background .2s ease',
                            minHeight: 58,
                          }}>
                            <span style={{ fontSize: 20, fontWeight: 700, display: 'block', marginBottom: 4, color: on ? col : M.t3 }}>{o.n}</span>
                            <span style={{ fontSize: 11, fontWeight: 600, color: on ? col : M.t4, textTransform: 'uppercase', letterSpacing: 0.8 }}>{o.l}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {/* Odkładane decyzje - scena, nie deklaracja (dowód wolnej głowy do wyniku i DM) */}
                  <div style={{ marginBottom: 26 }}>
                    <div style={{ fontSize: 15, color: M.t1, fontWeight: 500, marginBottom: 8, lineHeight: 1.45 }}>
                      W ostatnim tygodniu: ile ważnych rzeczy odłożyłeś, bo nie miałeś głowy, chociaż czas teoretycznie był?
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                      {([['0', 0], ['1-2', 1], ['3-5', 2], ['Codziennie coś wisi', 3]] as [string, number][]).map(([l, v]) => {
                        const on = D.defer === v;
                        return (
                          <button key={v} onClick={() => upd('defer', v)} style={{
                            padding: '13px 4px', textAlign: 'center',
                            border: `1.5px solid ${on ? M.gold : M.brd2}`,
                            background: on ? M.gold + '0e' : M.s1,
                            cursor: 'pointer', borderRadius: 10, transition: 'border-color .2s ease, background .2s ease',
                            fontSize: 11.5, fontWeight: 600, color: on ? M.t1 : M.t4, fontFamily: M.sans, lineHeight: 1.3, minHeight: 50,
                          }}>
                            {l}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Odpuszczona rozmowa - pewność siebie przez scenę wycofania (omija filtr self-reportu) */}
                  <div style={{ marginBottom: 26 }}>
                    <div style={{ fontSize: 15, color: M.t1, fontWeight: 500, marginBottom: 8, lineHeight: 1.45 }}>
                      Kiedy ostatnio odpuściłeś ważną rozmowę, na której Ci zależało, bo nie miałeś na nią głowy?
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {([['W tym tygodniu', 0], ['W tym miesiącu', 1], ['Dawno, nie pamiętam', 2], ['Ciągle tak mam', 3]] as [string, number][]).map(([l, v]) => {
                        const on = D.retreat === v;
                        return (
                          <button key={v} onClick={() => upd('retreat', v)} style={{
                            padding: '12px 10px', textAlign: 'left',
                            border: `1.5px solid ${on ? M.gold : M.brd2}`,
                            background: on ? M.gold + '0e' : M.s1,
                            color: on ? M.t1 : M.t3,
                            cursor: 'pointer', borderRadius: 10, transition: 'border-color .2s ease, background .2s ease',
                            fontSize: 12.5, fontWeight: 600, fontFamily: M.sans, lineHeight: 1.35, minHeight: 48,
                          }}>
                            {l}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Pytania otwarte - climax sekcji, dane jakościowe (własne słowa leada) */}
                  <div style={{ borderTop: `1px solid ${M.brd}`, paddingTop: 22, marginTop: 4 }}>
                    <div style={{ fontSize: 13, color: M.gold, fontFamily: M.mono, letterSpacing: 0.5, marginBottom: 4 }}>OSTATNIE TRZY. TWOIMI SŁOWAMI.</div>
                    <div style={{ fontSize: 13.5, color: M.t3, fontWeight: 400, marginBottom: 20, lineHeight: 1.6 }}>Liczby już mam. Teraz chcę usłyszeć Ciebie. To z tego czytam najwięcej.</div>
                    {[
                      { v: pain, set: setPain, label: 'Co Cię w tym wszystkim najbardziej wkurwia?', sub: 'Jedno zdanie, własnymi słowami. Bez ładnego pisania.', ph: 'np. budzę się zmęczony i wieczorem znowu nie mam na nic siły...' },
                      { v: trigger, set: setTrigger, label: 'Co się musiało wydarzyć, że sprawdzasz to dziś, a nie za miesiąc?', sub: 'Zdjęcie, impreza, badania, czyjś tekst. Jedna scena.', ph: 'np. zobaczyłem zdjęcie z wakacji...' },
                      { v: selfDx, set: setSelfDx, label: 'Czego już próbowałeś i w którym momencie zwykle się to rozsypywało?', sub: 'Jedna rzecz, która miała pomóc i moment, w którym przestawała działać.', ph: 'np. dieta trzymała 2 tygodnie, potem weekend i koniec...' },
                    ].map((q, i) => (
                      <div key={i} style={{ marginBottom: 22 }}>
                        <div style={{ fontSize: 15, color: M.t1, fontWeight: 500, marginBottom: 8, lineHeight: 1.45 }}>
                          {q.label}<span style={{ display: 'block', fontSize: 12.5, color: M.t3, marginTop: 4, fontWeight: 400 }}>{q.sub}</span>
                        </div>
                        <textarea
                          value={q.v}
                          onChange={e => q.set(e.target.value)}
                          placeholder={q.ph}
                          rows={2}
                          maxLength={500}
                          style={{
                            width: '100%', boxSizing: 'border-box', padding: '12px 14px',
                            background: M.s1, color: M.t1, fontSize: 14.5, lineHeight: 1.55,
                            border: `1.5px solid ${M.brd2}`, borderRadius: 12, resize: 'vertical',
                            fontFamily: 'inherit', outline: 'none',
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Nav buttons */}
              <div style={{ display: 'flex', gap: 10, marginTop: 36, paddingBottom: 20 }}>
                {sec > 0 && (
                  <button
                    onClick={back}
                    aria-label="Poprzednia sekcja"
                    style={{
                      flex: 1, padding: 16, background: 'transparent', color: M.t4,
                      border: `1px solid ${M.brd2}`, fontSize: 13.5, fontWeight: 600,
                      cursor: 'pointer', borderRadius: 12, minHeight: 50,
                    }}
                  >
                    &larr; Wstecz
                  </button>
                )}
                <button
                  onClick={go}
                  aria-label={sec === SECTIONS.length - 1 ? 'Oblicz straty i przejdź do wyniku' : 'Przejdź do następnej sekcji'}
                  className={sec === SECTIONS.length - 1 ? 'shimmer-btn' : ''}
                  style={{
                    flex: 2, padding: '16px 32px',
                    background: `linear-gradient(135deg, #c8a84e, #a08a3e)`,
                    color: '#0a0a0a',
                    border: 'none', fontFamily: M.sans, fontSize: 14, fontWeight: 800,
                    textTransform: 'uppercase', letterSpacing: 1.2, cursor: 'pointer', borderRadius: 12,
                    minHeight: 50,
                  }}
                >
                  {sec === SECTIONS.length - 1 ? 'Pokaż raport' : 'Dalej →'}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── LEAD GATE ── */}
        {phase === 'gate' && (
          <div className="fade-up" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 16px', textAlign: 'center' }}>
            <div style={{ maxWidth: 400, width: '100%' }}>
              <Logo />

              {/* Częściowy wynik - WOW moment */}
              <div style={{ marginTop: 32, marginBottom: 12 }}>
                <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: M.t4, marginBottom: 10 }}>Twój Wynik</div>
                <div style={{ fontFamily: M.mono, fontSize: 72, fontWeight: 800, lineHeight: 1, color: scoreColor, textShadow: `0 0 30px ${scoreColor}30` }}>{SC}</div>
                <div style={{ fontFamily: M.mono, fontSize: 12, color: M.t4, marginTop: 6 }}>/100</div>
              </div>

              {/* Karta wyniku ze szkłem */}
              <div style={{
                background: 'rgba(19,19,19,0.75)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: `1px solid ${M.gold}20`,
                padding: 18, marginBottom: 28, borderRadius: 14,
              }}>
                <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: M.t4, marginBottom: 8 }}>Tracisz w 6 miesięcy</div>
                <div style={{ fontFamily: M.mono, fontSize: 36, fontWeight: 800, color: M.gold }}>{C.total.toLocaleString('pl-PL')} zł</div>
                <div style={{ fontFamily: M.mono, fontSize: 12, color: M.t4, marginTop: 4 }}>= {Math.round(C.total / 6).toLocaleString('pl-PL')} zł / miesiąc</div>
              </div>

              {/* Gate - formularz ze szklem */}
              <div style={{
                background: 'rgba(19,19,19,0.72)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                border: `1px solid ${M.brd2}`,
                padding: '24px 18px',
                borderRadius: 16,
              }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.25, letterSpacing: -0.5, marginBottom: 10, color: M.t1, textShadow: '0 0 20px rgba(255,255,255,.1)' }}>
                  {SC >= 40 ? 'Twój tydzień pracuje mocno przeciwko Tobie. Dobra wiadomość: większość tego to styl życia, nie geny.' : SC >= 20 ? 'Wynik średni. Kilka miejsc cieknie po cichu i łatwo je przegapić.' : 'Baza trzyma. Brakuje 2-3 ruchów, żeby zrobić realną różnicę.'}
                </h2>
                <p style={{ fontSize: 14, color: M.t3, lineHeight: 1.6, marginBottom: 24, fontWeight: 400 }}>
                  Pełny raport pokazuje <strong style={{ color: M.t1 }}>gdzie i kiedy pęka Twój tydzień, sygnały do sprawdzenia i priorytet nr 1</strong> od razu na ekranie. Email zostaje u mnie. Jak widzę że pasujemy, odzywam się w DM.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left' }}>
                  {/* Instagram handle */}
                  <div>
                    <div style={{ fontSize: 11, color: M.t3, fontWeight: 600, marginBottom: 5, fontFamily: M.mono, letterSpacing: 0.5 }}>Nick na Instagramie *</div>
                    <input
                      type="text"
                      placeholder="@twojnick"
                      value={igHandle}
                      aria-label="Nick na Instagramie"
                      aria-required="true"
                      onChange={e => { setIgHandle(e.target.value); setIgErr(''); }}
                      style={{ borderColor: igErr ? M.red : undefined }}
                    />
                    {igErr && <div role="alert" style={{ fontSize: 11, color: M.red, fontFamily: M.mono, marginTop: 4 }}>{igErr}</div>}
                  </div>

                  {/* Email */}
                  <div>
                    <div style={{ fontSize: 11, color: M.t3, fontWeight: 600, marginBottom: 5, fontFamily: M.mono, letterSpacing: 0.5 }}>Email *</div>
                    <input
                      type="email"
                      placeholder="twoj@email.com"
                      value={email}
                      aria-label="Adres email"
                      aria-required="true"
                      onChange={e => { setEmail(e.target.value); setEmailErr(''); }}
                      style={{ borderColor: emailErr ? M.red : undefined }}
                    />
                    {emailErr && <div role="alert" style={{ fontSize: 11, color: M.red, fontFamily: M.mono, marginTop: 4 }}>{emailErr}</div>}
                  </div>

                  {/* Imię - opcjonalne */}
                  <div>
                    <div style={{ fontSize: 11, color: M.t4, fontWeight: 600, marginBottom: 5, fontFamily: M.mono, letterSpacing: 0.5 }}>Imię (opcjonalne)</div>
                    <input
                      type="text"
                      placeholder="Jak masz na imię?"
                      value={imie}
                      aria-label="Imię (opcjonalne)"
                      onChange={e => setImie(e.target.value.slice(0, 50))}
                    />
                  </div>

                  {/* CTA z shimmer */}
                  <button
                    onClick={submit}
                    disabled={loading}
                    aria-label={loading ? 'Ładowanie wyniku' : 'Pokaż moją diagnozę'}
                    className={!loading ? 'shimmer-btn' : ''}
                    style={{
                      width: '100%', padding: '16px 32px', marginTop: 6,
                      background: loading ? M.brd2 : 'linear-gradient(135deg, #c8a84e, #a08a3e)',
                      color: loading ? M.t4 : '#0a0a0a',
                      border: 'none', fontFamily: M.sans, fontSize: 15, fontWeight: 700, letterSpacing: 2.5,
                      textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer', borderRadius: 12,
                      boxShadow: loading ? 'none' : '0 4px 20px rgba(200,168,78,0.2)',
                      minHeight: 48,
                    }}
                  >
                    {loading ? 'Ładuję wynik...' : 'Pokaż mi co widać →'}
                  </button>
                </div>
              </div>

              <p style={{ fontSize: 11, color: M.t4, marginTop: 16, fontFamily: M.mono, letterSpacing: 0.5, textAlign: 'center' }}>
                Każdy wynik czytam sam. Potwierdzam w 24h, decyzja merytoryczna do 5 dni roboczych.
              </p>
            </div>
          </div>
        )}

        {/* ── RESULTS ── */}
        {phase === 'results' && (
          <div className="fade-up" style={{ padding: '32px 16px 140px', width: '100%', boxSizing: 'border-box' }}>

            {/* ═══ KARTA TYGODNIA — prywatny artefakt: drugie dno, potencjał, plan 7 dni, most (hero wyniku) ═══ */}
            {!good && (() => {
              const worstW = [...catScores].sort((a, b) => a.pct - b.pct)[0]?.label || 'Sen';
              const archW = pickArchetype(D, worstW);
              const wkPlan = buildWeekPlan({
                archetypeKey: archW.key, archetypeLabel: archW.label, archetypeTagline: archW.tagline,
                worstCat: worstW, breakWindow: D.breakWindow, score: SC, costTotal: C.total, wknd: D.wknd,
                imie, potentialPct: potential, costMonths: C.stagnationMonths,
                drinks: D.drinks, screenBed: D.screenBed, junk: D.junk, protein: D.protein,
                sleep: D.sleep, miss: D.miss, binge: D.binge, gym: D.gym,
                reframe: reframe || undefined,
              });
              // naborHref zbudowany lokalnie (był zdefiniowany tylko w StickyCtaBar → ReferenceError)
              const naborHref = buildNaborPilotUrl({
                destination: PILOT_NABOR_DESTINATION,
                incomingSearch: inboundSearch,
                placement: 'card',
                score: SC,
                topCategory: worstW,
              });
              return (
                <div style={{ margin: '0 -16px 20px', borderBottom: `1px solid ${M.brd}` }}>
                  <WeekPage plan={wkPlan} imie={imie} naborHref={naborHref} />
                </div>
              );
            })()}

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 24, paddingBottom: 16, borderBottom: `1px solid ${M.brd}` }}>
              <Logo />
              <div style={{ marginTop: 14 }}>
                <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: M.t4, marginBottom: 6 }}>Raport</div>
                <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, color: M.t1 }}>{imie.trim() ? `${capName(imie.trim())}, Twoje liczby` : 'Twoje liczby'}</h2>
              </div>
            </div>

            {/* ═══ KOTWICA ROCZNA - realny wydatek (podany przez usera) + czas na pół mocy. Zero zmyślonej pensji/podwyżki. ═══ */}
            {(() => {
              const ar = anchorRok(D);
              // Pokaż tylko gdy jest z czego: realny wydatek >= 3000 zł albo wyraźny czas (>= 5 dni)
              if (ar.hardYear < 3000 && ar.dni < 5) return null;
              const dowod = D.defer >= 2 || D.binge >= 3;
              return (
                <Reveal delay={70}>
                  <div style={{ padding: '28px 20px 24px', marginBottom: 16, borderRadius: 16, width: '100%', boxSizing: 'border-box', background: `linear-gradient(160deg, #141210, ${M.gold}0a)`, border: `1px solid ${M.gold}45`, boxShadow: `0 0 44px ${M.gold}0d` }}>
                    <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: M.gold, fontWeight: 700, marginBottom: 14 }}>Rachunek roku · z Twoich odpowiedzi</div>
                    <div style={{ fontFamily: M.serif, fontSize: 'clamp(28px, 7.5vw, 38px)', color: M.t1, lineHeight: 1.12, marginBottom: 4 }}>
                      Około <em style={{ fontStyle: 'italic', color: M.gold }}>{ar.dni} dni roboczych</em> w roku
                    </div>
                    <p style={{ fontSize: 14.5, color: M.t2, lineHeight: 1.6, marginBottom: 16 }}>
                      siedzisz przy biurku, ale Cię tam nie ma. Głowa mieli wszystko poza tym, co masz zrobić.
                    </p>
                    <div style={{ marginBottom: 14 }}>
                      {ar.hours > 0 && (
                        <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', padding: '7px 0', borderBottom: ar.hardYear >= 3000 ? `1px solid ${M.brd}` : 'none' }}>
                          <span style={{ fontFamily: M.mono, fontSize: 13.5, fontWeight: 700, color: M.org, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>~{ar.hours} h</span>
                          <span style={{ fontSize: 12.5, color: M.t3, lineHeight: 1.45 }}>na pół mocy w roku, czyli około {ar.dni} dni roboczych obok własnej roboty</span>
                        </div>
                      )}
                      {ar.hardYear >= 3000 && (
                        <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', padding: '7px 0' }}>
                          <span style={{ fontFamily: M.mono, fontSize: 13.5, fontWeight: 700, color: M.t2, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{ar.hardYear.toLocaleString('pl-PL')} zł</span>
                          <span style={{ fontSize: 12.5, color: M.t3, lineHeight: 1.45 }}>na wyjścia i dowozy, tyle sam podałeś (i to jest okej)</span>
                        </div>
                      )}
                    </div>
                    <p style={{ fontSize: 11.5, color: M.t4, lineHeight: 1.55, fontStyle: 'italic', marginBottom: 16 }}>
                      Czas liczony ostrożnie: rok roboczy to 220 dni, nie 365. Żadnej zmyślonej utraconej pensji.
                    </p>
                    <p style={{ fontSize: 15, color: M.t2, lineHeight: 1.7, margin: 0 }}>
                      Na wyjścia wydawaj ile chcesz, to Twoje życie i nie zabieram Ci go. Tylko że dziś <strong style={{ color: M.t1 }}>płacisz za weekend dwa razy: raz kartą, raz dniami, w których się zbierasz.</strong> To się skraca, a piątek zostaje piątkiem.{dowod ? ' Zresztą sam to zaznaczyłeś minutę temu.' : ''}
                    </p>
                  </div>
                </Reveal>
              );
            })()}

            {/* ═══ SCREEN 1: WOW MOMENT - 3 metryki DUŻE + brain insight + before/after ═══ */}
            <Reveal delay={80}>
              <div style={{
                background: `linear-gradient(160deg, #0e0e0e, #151510)`,
                textAlign: 'center', padding: '28px 14px 24px',
                position: 'relative', overflow: 'hidden', marginBottom: 16, borderRadius: 16, width: '100%',
                boxSizing: 'border-box',
                border: `2px solid ${M.gold}40`,
                boxShadow: `0 8px 40px ${M.gold}15, inset 0 1px 0 ${M.gold}15`,
              }} className="float-el diag-card">
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(-45deg,transparent,transparent 4px,rgba(200,168,78,.03) 4px,rgba(200,168,78,.03) 8px)' }} />
                <div style={{ position: 'relative' }}>
                  {/* ── DIAGNOZA FIRST - liczba jako dowod, nie hak ── */}
                  {(() => {
                    const imieD = imie.trim() ? capName(imie.trim()) : 'Stary';
                    // Top 3 najgorszych kategorii (wyciek tygodnia)
                    const top3 = [...catScores].sort((a, b) => a.pct - b.pct).slice(0, 3).map(c => c.label.toLowerCase());
                    const w0full = [...catScores].sort((a, b) => a.pct - b.pct)[0]?.label || '';
                    const hourStr = hourRange(D);
                    const hasWindow = D.breakWindow >= 0 && D.breakWindow <= 5; // 6 = brak stałej pory → nie rysujemy znacznika
                    const hourPos = breakPos(D);
                    const hourLabelPos = Math.min(Math.max(hourPos, 10), 86);
                    return (
                      <>
                        <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: M.gold, fontWeight: 700, marginBottom: 12, textAlign: 'left' }}>
                          Twój wynik
                        </div>
                        <h2 style={{ fontFamily: M.serif, fontSize: 'clamp(32px, 8.5vw, 52px)', fontWeight: 400, lineHeight: 1.06, letterSpacing: '-0.01em', color: M.t1, marginBottom: 12, textAlign: 'left' }}>
                          {good
                            ? <>Twój tydzień <em style={{ fontStyle: 'italic', color: M.gold }}>trzyma się mocno.</em></>
                            : <>Twój tydzień pęka <em style={{ fontStyle: 'italic', color: M.gold }}>{hourStr}.</em></>}
                        </h2>
                        <p style={{ fontSize: 14.5, color: M.t3, lineHeight: 1.6, marginBottom: 20, textAlign: 'left' }}>
                          {good
                            ? <>{imieD !== 'Stary' ? `${imieD}, to` : 'To'} solidna baza. Większość Twoich odpowiedzi wygląda dobrze. Zostają drobiazgi do dopięcia, nie naprawa.</>
                            : <>{hasWindow ? 'O tej porze najczęściej tracisz ster.' : 'Rozsypuje się różnie, więc tym bardziej trzeba go poukładać.'} {imieD !== 'Stary' ? `${imieD}, tu` : 'Tu'} nie brakuje planu. Tu wycieka tydzień: <strong style={{ color: M.t1 }}>{top3.join(' + ')}</strong>.</>}
                        </p>

                        {/* DOBA: oś 0-24h z pęknięciem o JEGO godzinie (sygnatura wizualna, personalizowana pozycją) */}
                        <div style={{ margin: '4px 0 26px' }}>
                          <div style={{ position: 'relative', height: 40 }}>
                            <div style={{ position: 'absolute', left: 0, right: 0, top: 19, height: 3, borderRadius: 2, background: `linear-gradient(90deg, ${M.s3} 0%, ${M.s3} ${Math.max(hourPos - 24, 0)}%, rgba(232,146,58,0.5) ${Math.max(hourPos - 9, 0)}%, ${M.red} ${hourPos}%, ${M.s3} ${Math.min(hourPos + 6, 100)}%, ${M.s3} 100%)` }} />
                            {[0, 6, 12, 18, 24].map(h => (
                              <span key={h} style={{ position: 'absolute', top: 27, left: `${(h / 24) * 100}%`, transform: h === 0 ? 'none' : h === 24 ? 'translateX(-100%)' : 'translateX(-50%)', fontFamily: M.mono, fontSize: 8.5, color: M.t4, letterSpacing: 0.5 }}>{h}:00</span>
                            ))}
                            {hasWindow && !good && <>
                            <span style={{ position: 'absolute', top: 10, left: `calc(${hourPos}% - 1.5px)`, width: 3, height: 21, borderRadius: 2, background: M.red, boxShadow: '0 0 12px rgba(220,68,68,.65)' }} />
                            <span style={{ position: 'absolute', top: 0, left: `${hourLabelPos}%`, transform: 'translateX(-50%)', fontFamily: M.mono, fontSize: 9, fontWeight: 800, letterSpacing: 1.5, color: M.red, whiteSpace: 'nowrap' }}>TU PĘKASZ</span>
                            </>}
                          </div>
                        </div>

                        {/* LICZBA jako dowod */}
                        <div className="diag-verdict-num" style={{ fontFamily: M.mono, fontSize: 'clamp(64px, 18vw, 120px)', fontWeight: 900, lineHeight: .9, letterSpacing: '-0.03em', marginBottom: 4 }}>
                          {countersActive ? animScore : SC}<span style={{ fontSize: '0.45em', color: M.t4, fontWeight: 700 }}>/100</span>
                        </div>
                        <div style={{ fontFamily: M.mono, fontSize: 11, letterSpacing: 2.5, textTransform: 'uppercase', color: M.t4, marginBottom: 14, fontWeight: 700 }}>Indeks przeciążenia tygodnia</div>
                        {/* Payoff hero: „największy hamulec" + koszt tygodnia (promise-payoff match z landingiem) */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: lastRes && (Date.now() - lastRes.ts) > 3600000 ? 8 : 16 }}>
                          <span style={{ fontFamily: M.mono, fontSize: 11.5, color: M.t2, padding: '6px 12px', borderRadius: 8, background: M.s1, border: `1px solid ${M.brd2}` }}>
                            {good ? 'Najmocniej' : 'Największy hamulec'}: <strong style={{ color: M.gold }}>{good ? ([...catScores].sort((a, b) => b.pct - a.pct)[0]?.label || 'Sen') : (w0full || 'Sen')}</strong>
                          </span>
                          <span style={{ fontFamily: M.mono, fontSize: 11.5, color: M.t2, padding: '6px 12px', borderRadius: 8, background: M.s1, border: `1px solid ${M.brd2}` }}>
                            Koszt tygodnia: <strong style={{ color: SC >= 40 ? M.red : SC >= 12 ? M.org : M.grn }}>{SC >= 40 ? 'wysoki' : SC >= 12 ? 'średni' : 'niski'}</strong>
                          </span>
                        </div>
                        {lastRes && (Date.now() - lastRes.ts) > 3600000 && (
                          <div style={{ fontFamily: M.mono, fontSize: 11.5, color: lastRes.score > SC ? M.grn : lastRes.score < SC ? M.red : M.t4, marginBottom: 16, fontVariantNumeric: 'tabular-nums' }}>
                            poprzednio {lastRes.score}/100 &rarr; dziś {SC}/100 {lastRes.score > SC ? '(lepiej)' : lastRes.score < SC ? '(gorzej)' : '(bez zmian)'}
                          </div>
                        )}

                        {SC >= 40 && (
                          <div style={{ fontSize: 14, color: M.t2, lineHeight: 1.55, marginBottom: 12, textAlign: 'left' }}>
                            Masz <strong style={{ color: M.t1 }}>{D.age}</strong> lat, a z odpowiedzi wychodzi tydzień, w którym <strong style={{ color: M.org }}>bierzesz z siebie więcej, niż oddajesz</strong>. I robisz tak od miesięcy, nie od wczoraj.
                          </div>
                        )}

                        {/* Dyskretny disclaimer */}
                        <div style={{ fontSize: 10.5, color: M.t4, lineHeight: 1.45, fontStyle: 'italic', marginBottom: 14, opacity: 0.8, textAlign: 'left' }}>
                          Policzone z Twoich odpowiedzi, nie z badań krwi.
                        </div>

                        {/* ── W praktyce ── */}
                        {losYears >= 3 && (
                          <div style={{ fontSize: 13.5, color: M.t3, lineHeight: 1.6, marginBottom: 18, padding: '11px 14px', background: 'rgba(200,168,78,0.05)', border: '1px solid rgba(200,168,78,0.15)', borderRadius: 8, textAlign: 'left' }}>
                            Praca w stałym napięciu i spłycony sen NREM obniżają koncentrację popołudniu, co zwiększa wieczorny apetyt i przesuwa porę zaśnięcia.
                          </div>
                        )}

                        {/* „-X lat cofniesz w 90 dni" usunięte: to był zmyślony pomiar wieku, nie dane. */}
                      </>
                    );
                  })()}
                </div>
              </div>
            </Reveal>

            {/* Cienki link „Następny krok" usunięty: konkurował z blokiem intencji, który jest teraz głównym, mocnym wyjściem. */}

            {/* ═══ TOP 3 DO POPRAWY - luki z jego wyniku + naturalne przekierowanie wysoko (Michal: kluczowy redirect na gorze) ═══ */}
            <Reveal delay={80}>
              {(() => {
                const t3 = [...catScores].sort((a, b) => a.pct - b.pct).slice(0, 3);
                const anyLeak = t3.some(c => c.pct < 78);
                if (good || !anyLeak) return (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, margin: '0 0 16px', padding: '13px 16px', borderRadius: 12, border: `1px solid ${M.gold}30`, background: `${M.gold}07`, width: '100%', boxSizing: 'border-box' }}>
                    <span style={{ fontSize: 13, color: M.t2, lineHeight: 1.4 }}>Baza gra. Do podkręcenia: <strong style={{ color: M.gold }}>{t3[0]?.label.toLowerCase()}</strong>.</span>
                    <a href="https://nabor.talerzihantle.com?utm_source=diagnostyka&utm_content=top3" target="_blank" rel="noopener noreferrer"
                      onClick={() => trackEvent('diag_cta_click', { target: 'nabor_top3', score: SC })}
                      style={{ fontSize: 13, fontWeight: 700, color: M.gold, textDecoration: 'underline', textDecorationColor: `${M.gold}66`, textUnderlineOffset: 3, whiteSpace: 'nowrap' }}
                    >Jak pracuję na wynik &rarr;</a>
                  </div>
                );
                return (
                  <div style={{ marginBottom: 16, padding: '20px 18px', borderRadius: 16, width: '100%', boxSizing: 'border-box', background: M.s1, border: `1px solid ${M.gold}35` }}>
                    <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: M.gold, fontWeight: 700, marginBottom: 12 }}>Top 3 do poprawy · z Twoich odpowiedzi</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 14 }}>
                      {t3.map((c, i) => (
                        <div key={c.label} style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                          <span style={{ fontFamily: M.mono, fontSize: 13, fontWeight: 800, color: M.gold, flexShrink: 0 }}>{i + 1}.</span>
                          <span style={{ fontSize: 14, color: M.t2, lineHeight: 1.5 }}><strong style={{ color: M.t1 }}>{c.label}</strong>: {LEAK_LINE[c.label] || c.label.toLowerCase()}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 12, borderTop: `1px solid ${M.brd}` }}>
                      <span style={{ fontSize: 13, color: M.t3, lineHeight: 1.45 }}>Z każdą z tych trzech pracuję w prowadzeniu 1:1. Pełną drogę masz na dole raportu.</span>
                      <a href="https://nabor.talerzihantle.com?utm_source=diagnostyka&utm_content=top3" target="_blank" rel="noopener noreferrer"
                        onClick={() => { trackEvent('diag_cta_click', { target: 'nabor_top3', score: SC }); fbqTrack('InitiateCheckout', { content_name: 'nabor_top3', content_category: 'high_ticket', value: SC, currency: 'PLN' }); }}
                        style={{ fontSize: 13, fontWeight: 700, color: M.gold, textDecoration: 'underline', textDecorationColor: `${M.gold}66`, textUnderlineOffset: 3, whiteSpace: 'nowrap' }}
                      >Zobacz, jak to robię &rarr;</a>
                    </div>
                  </div>
                );
              })()}
            </Reveal>

            {/* ═══ TWOIMI SŁOWAMI - echo bólu zaraz po werdykcie (personalizacja z jego wpisu) ═══ */}
            {pain.trim() && (
              <Reveal delay={81}>
                <div style={{ marginBottom: 16, padding: '18px 18px', borderRadius: 14, width: '100%', boxSizing: 'border-box', background: M.s1, border: `1px solid ${M.brd}` }}>
                  <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: M.t4, marginBottom: 10 }}>Twoimi słowami</div>
                  <div style={{ fontSize: 15, color: M.t1, lineHeight: 1.6, fontStyle: 'italic', borderLeft: `3px solid ${M.gold}`, paddingLeft: 14, marginBottom: 8 }}>„{pain.trim()}"</div>
                  <div style={{ fontSize: 13, color: M.t3, lineHeight: 1.6 }}>Zapisałem słowo w słowo. Wynik wyżej pokazuje to samo. {imie.trim() ? capName(imie.trim()) + ', n' : 'N'}ie wymyśliłeś sobie tego.</div>
                </div>
              </Reveal>
            )}

            {/* ═══ SMACZEK 2: ZASKOCZENIE - belief-shift z realnych odpowiedzi (myślisz X, a to Y) ═══ */}
            <Reveal delay={82}>
              {(() => {
                const scz = [...catScores].sort((a, b) => a.pct - b.pct);
                const zw = scz[0]?.label || ''; const zs = scz[1]?.label || '';
                if (!zw) return null;
                const zbest = [...catScores].sort((a, b) => b.pct - a.pct)[0]?.label || zw;
                const acc = good ? M.gold : M.org;
                return (
                  <div style={{ marginBottom: 16, padding: '20px 18px', borderRadius: 16, width: '100%', boxSizing: 'border-box', background: `linear-gradient(160deg, rgba(19,19,19,0.95), ${acc}12)`, border: `1px solid ${acc}35` }}>
                    <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: acc, fontWeight: 700, marginBottom: 10 }}>{good ? 'Co masz mocne' : 'Zaskoczenie'}</div>
                    <p style={{ fontSize: 15.5, color: M.t1, lineHeight: 1.65, margin: 0, fontWeight: 500 }}>
                      {good ? zaskoczenieDobry(zbest) : zaskoczenie(zw, zs)}
                    </p>
                  </div>
                );
              })()}
            </Reveal>

            {/* ═══ TIER 3: CO DALEJ - intencja + miękki kontakt (po wartości, jeden wymagany kanał) ═══ */}
            <Reveal delay={83}>
              <div style={{ marginBottom: 20, padding: '24px 20px', borderRadius: 16, width: '100%', boxSizing: 'border-box', background: 'linear-gradient(160deg, rgba(19,19,19,0.95), rgba(200,168,78,0.06))', border: `1px solid ${M.gold}35` }}>
                {captured ? (
                  <div style={{ textAlign: 'center', padding: '6px 0' }}>
                    <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: M.grn, fontWeight: 700, marginBottom: 10 }}>Zapisane</div>
                    <p style={{ fontSize: 15, color: M.t2, lineHeight: 1.6, margin: '0 0 16px' }}>
                      Mam Twój wynik{imie.trim() ? `, ${capName(imie.trim())}` : ''}. {intent === 2 ? 'Odezwę się w DM z konkretem, zwykle w 24h. W międzyczasie zobacz, jak wygląda prowadzenie.' : intent === 1 ? 'Zobacz teraz, jak dokładnie wygląda prowadzenie.' : 'Pierwszy ruch masz w raporcie niżej. Jak zechcesz ułożyć to razem, zacznij tutaj.'}
                    </p>
                    <a
                      href={buildNaborPilotUrl({ destination: PILOT_NABOR_DESTINATION, incomingSearch: inboundSearch, placement: 'captured', score: SC, topCategory: catScores.reduce((a, b) => a.pct < b.pct ? a : b, catScores[0]).label, intent })}
                      target="_blank" rel="noopener noreferrer"
                      onClick={() => trackEvent('primary_cta_click', { cta_id: 'diagnostic_captured', destination: 'nabor', score_bucket: tier, diagnostic_intent: intent, legacy_event: 'diag_cta_click' })}
                      className="shimmer-btn"
                      style={{ display: 'block', textAlign: 'center', background: `linear-gradient(135deg, ${M.gold}, #a08a3e)`, color: M.bg, textDecoration: 'none', padding: '17px', borderRadius: 14, fontWeight: 800, fontSize: 15, letterSpacing: 1, boxShadow: '0 4px 24px rgba(200,168,78,0.28)' }}
                    >ZOBACZ, JAK WYGLĄDA PROWADZENIE &rarr;</a>
                    <div style={{ fontSize: 11.5, color: M.t4, marginTop: 8, fontFamily: M.mono, letterSpacing: 0.5 }}>3 minuty czytania &middot; bez płatności</div>
                  </div>
                ) : (
                  <>
                    <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: M.gold, fontWeight: 700, marginBottom: 12 }}>Co dalej</div>
                    <h3 style={{ fontSize: 21, fontWeight: 800, lineHeight: 1.25, color: M.t1, marginBottom: 10, letterSpacing: '-0.01em' }}>Masz wynik. Co chcesz z nim zrobić?</h3>
                    <p style={{ fontSize: 14, color: M.t3, lineHeight: 1.6, marginBottom: 16 }}>
                      Raport pokazuje pierwszy ruch. Jak widzę, że problem pasuje do mojego prowadzenia, mogę sprawdzić, czy ma sens ułożyć to razem.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {[
                        'Chcę działać sam. Pokaż mi raport i pierwszy ruch.',
                        'Chcę najpierw zobaczyć, jak wygląda pomoc i czego wymaga.',
                        'Jeżeli uznasz, że pasujemy, napisz mi konkretnie, co możemy zrobić razem.',
                        'Nie wiem jeszcze. Chcę tylko zobaczyć wynik.',
                      ].map((l, v) => {
                        const on = intent === v;
                        return (
                          <button key={v} onClick={() => { vibe(8); setIntent(v); trackEvent('diag_intent', { intent: v, score: SC }); }} style={{ padding: '13px 14px', textAlign: 'left', border: `1.5px solid ${on ? M.gold : M.brd2}`, background: on ? M.gold + '12' : M.s1, color: on ? M.t1 : M.t3, cursor: 'pointer', borderRadius: 12, transition: 'all .2s ease', fontSize: 13.5, fontWeight: 600, fontFamily: M.sans, lineHeight: 1.4 }}>{l}</button>
                        );
                      })}
                    </div>

                    {(intent === 1 || intent === 2) && (
                      <div style={{ marginTop: 18 }}>
                        <div style={{ fontSize: 14, color: M.t1, fontWeight: 600, marginBottom: 8, lineHeight: 1.4 }}>Jeżeli po rozmowie uznasz, że to ma sens, kiedy faktycznie chcesz zacząć?</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
                          {['W ciągu 7 dni', 'W ciągu 30 dni', 'Za 2-3 miesiące', 'Na razie tylko sprawdzam'].map((l, v) => {
                            const on = startWhen === v;
                            return (<button key={v} onClick={() => { vibe(6); setStartWhen(v); }} style={{ padding: '12px 8px', textAlign: 'center', border: `1.5px solid ${on ? M.gold : M.brd2}`, background: on ? M.gold + '0e' : M.s1, color: on ? M.t1 : M.t4, cursor: 'pointer', borderRadius: 10, fontSize: 12, fontWeight: 600, fontFamily: M.sans, minHeight: 46, lineHeight: 1.3 }}>{l}</button>);
                          })}
                        </div>
                      </div>
                    )}

                    {intent === 2 && (
                      <div style={{ marginTop: 18 }}>
                        <div style={{ fontSize: 14, color: M.t1, fontWeight: 600, marginBottom: 6, lineHeight: 1.4 }}>Co musiałoby być prawdą, żeby prowadzenie było dobrą decyzją?</div>
                        <div style={{ fontSize: 12.5, color: M.t4, marginBottom: 8, lineHeight: 1.5 }}>Jedno zdanie. Ustawia naszą pierwszą rozmowę tak, że nie zgaduję.</div>
                        <textarea value={hotWhy} onChange={e => setHotWhy(e.target.value.slice(0, 300))} rows={2} placeholder="np. muszę wiedzieć, że da się to pogodzić z moją pracą..." style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', fontFamily: M.sans, fontSize: 13.5 }} />
                      </div>
                    )}

                    {intent !== null && (
                      <div style={{ marginTop: 18, paddingTop: 18, borderTop: `1px solid ${M.brd}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div>
                          <div style={{ fontSize: 14, color: M.t1, fontWeight: 700, marginBottom: 4 }}>{intent === 2 ? 'Gdzie mam się do Ciebie odezwać?' : intent === 1 ? 'Gdzie wysłać zapis raportu?' : 'Chcesz zapis raportu na później?'}</div>
                          <p style={{ fontSize: 12.5, color: M.t3, lineHeight: 1.5, margin: 0 }}>Email zostaje u mnie, raport idzie na skrzynkę.{intent === 1 || intent === 2 ? ' IG podaj, żebym mógł odpisać w DM.' : ''}</p>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: M.t3, fontWeight: 600, marginBottom: 5, fontFamily: M.mono, letterSpacing: 0.5 }}>Email *</div>
                          <input type="email" placeholder="twoj@email.com" value={email} aria-label="Adres email" onChange={e => { setEmail(e.target.value); setEmailErr(''); }} style={{ borderColor: emailErr ? M.red : undefined }} />
                          {emailErr && <div role="alert" style={{ fontSize: 11, color: M.red, fontFamily: M.mono, marginTop: 4 }}>{emailErr}</div>}
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: M.t4, fontWeight: 600, marginBottom: 5, fontFamily: M.mono, letterSpacing: 0.5 }}>Instagram {intent === 1 || intent === 2 ? '(żebym odpisał w DM)' : '(opcjonalnie)'}</div>
                          <input type="text" placeholder="@twojnick" value={igHandle} aria-label="Nick na Instagramie" onChange={e => setIgHandle(e.target.value)} />
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: M.t4, fontWeight: 600, marginBottom: 5, fontFamily: M.mono, letterSpacing: 0.5 }}>Imię (opcjonalne)</div>
                          <input type="text" placeholder="Jak masz na imię?" value={imie} aria-label="Imię" onChange={e => setImie(e.target.value.slice(0, 50))} />
                        </div>
                        <button onClick={submit} disabled={loading} className={!loading ? 'shimmer-btn' : ''} style={{ width: '100%', padding: '15px 24px', marginTop: 4, background: loading ? M.brd2 : 'linear-gradient(135deg, #c8a84e, #a08a3e)', color: loading ? M.t4 : '#0a0a0a', border: 'none', fontFamily: M.sans, fontSize: 14, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer', borderRadius: 12, minHeight: 48 }}>
                          {loading ? 'Zapisuję...' : intent === 2 ? 'Wyślij, odezwij się do mnie →' : 'Zapisz mój raport →'}
                        </button>
                        <p style={{ fontSize: 11.5, color: M.t4, lineHeight: 1.5, textAlign: 'center', margin: '2px 0 0', fontStyle: 'italic' }}>Czytam sam, odpisuję w 24h, a jak nie pasujesz mówię wprost zamiast wciskać.</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </Reveal>

            {/* ═══ ROZBIEŻNOŚĆ - przyłapanie na sprzeczności (rozpoznanie, nie osąd) ═══ */}
            {(() => {
              const cx = contradiction(D, selfDx);
              if (!cx) return null;
              return (
                <Reveal delay={84}>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ padding: '20px 18px', borderRadius: 16, width: '100%', boxSizing: 'border-box', background: M.s1, border: `1px solid ${M.gold}35`, boxShadow: `0 0 30px ${M.gold}08` }}>
                      <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: M.gold, fontWeight: 700, marginBottom: 14 }}>Rozbieżność</div>
                      <div style={{ fontFamily: M.serif, fontStyle: 'italic', fontSize: 15, color: M.t4, marginBottom: 7 }}>Jedna Twoja odpowiedź:</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: M.t1, lineHeight: 1.5 }}>{cx.said}</div>
                      <div style={{ borderTop: `1px solid ${M.brd}`, margin: '15px 0', paddingTop: 15 }}>
                        <div style={{ fontFamily: M.serif, fontStyle: 'italic', fontSize: 15, color: M.t4, marginBottom: 7 }}>I druga, też Twoja:</div>
                        <div style={{ fontFamily: M.mono, fontSize: 13.5, color: M.t2, lineHeight: 1.55 }}>{cx.body}</div>
                      </div>
                      <p style={{ fontFamily: M.serif, fontSize: 19, lineHeight: 1.4, color: M.t1, margin: 0, paddingTop: 15, borderTop: `1px solid ${M.brd}` }}>
                        Te dwa parametry stoją ze sobą w fizycznej sprzeczności – <em style={{ fontStyle: 'italic', color: M.gold }}>i to dokładnie w tym punkcie powstaje ukryty wyciek w Twoim tygodniu.</em>
                      </p>
                    </div>
                  </div>
                </Reveal>
              );
            })()}

            {/* ═══ TWÓJ TYP - archetyp z wzorca odpowiedzi (identity + share hook) ═══ */}
            <Reveal delay={85}>
              {(() => {
                const worst = [...catScores].sort((a, b) => a.pct - b.pct)[0]?.label || '';
                const best = [...catScores].sort((a, b) => b.pct - a.pct)[0]?.label || '';
                const arch = good ? archetypeGood(best) : pickArchetype(D, worst);
                return (
                  <div style={{
                    marginBottom: 16, padding: '24px 20px', borderRadius: 16, width: '100%', boxSizing: 'border-box',
                    background: 'linear-gradient(160deg, rgba(19,19,19,0.95), rgba(200,168,78,0.07))',
                    border: `1px solid ${M.gold}30`,
                  }}>
                    <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: M.gold, fontWeight: 700, marginBottom: 12 }}>Twój typ</div>
                    <div style={{ fontFamily: M.serif, fontSize: 36, fontWeight: 400, lineHeight: 1.08, letterSpacing: '-0.01em', color: M.t1, marginBottom: 10 }}>
                      „{arch.label}"
                    </div>
                    <div style={{ fontSize: 15, color: M.gold, fontWeight: 600, lineHeight: 1.5, marginBottom: 14 }}>
                      {arch.tagline}
                    </div>
                    <p style={{ fontSize: 14.5, color: M.t2, lineHeight: 1.65, margin: 0 }}>
                      {arch.mirror}
                    </p>
                  </div>
                );
              })()}
            </Reveal>

            {/* ═══ ODCZYT: 6 obszarów jako zakresy referencyjne (spójne z raportem, zero zielonych paskow-procentow) ═══ */}
            {cfg.showOdczyt && <Reveal delay={110}>
              <div className="diag-card" style={{
                background: M.s1, border: `1px solid ${M.brd2}`,
                padding: '20px 18px', marginBottom: 20, borderRadius: 16, width: '100%', boxSizing: 'border-box',
              }}>
                <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: M.t4, fontWeight: 700, marginBottom: 6 }}>Odczyt · 6 obszarów</div>
                <div style={{ fontSize: 12, color: M.t4, lineHeight: 1.5, marginBottom: 12 }}>Pasek po prawej to zakres, w którym tydzień się spina. Kreska to Ty.</div>
                {catScores.map((cat, i) => {
                  const out = cat.pct < 50;
                  const edge = cat.pct >= 50 && cat.pct < 72;
                  return (
                    <div key={i} style={{ padding: '12px 0', borderBottom: i < catScores.length - 1 ? `1px solid ${M.brd}` : 'none' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 9 }}>
                        <span style={{ fontFamily: M.mono, fontSize: 11.5, letterSpacing: 1, color: M.t2, fontWeight: 600, textTransform: 'uppercase' }}>{cat.label}</span>
                        <span style={{ fontFamily: M.mono, fontSize: 9.5, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 700, color: out ? M.red : edge ? M.gold : M.t4 }}>{out ? 'poza zakresem' : edge ? 'granica' : 'w normie'}</span>
                      </div>
                      <div style={{ position: 'relative', height: 14 }}>
                        <span style={{ position: 'absolute', top: 6, left: 0, right: 0, height: 2, background: M.s3, borderRadius: 1 }} />
                        <span style={{ position: 'absolute', top: 5, left: '72%', width: '26%', height: 4, background: 'rgba(200,168,78,.22)', borderRadius: 2 }} />
                        <span style={{ position: 'absolute', top: 0, width: 3, height: 14, borderRadius: 2, left: `calc(${Math.min(Math.max(cat.pct, 2), 98)}% - 1px)`, background: out ? M.red : M.gold, boxShadow: `0 0 8px ${out ? 'rgba(220,68,68,.4)' : 'rgba(200,168,78,.35)'}` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Reveal>}

            {/* ═══ OSIE HORMONALNE POD PRESJĄ - widoczne (nie akordeon), tylko osie z >=2 sygnałami z JEGO danych ═══ */}
            {(() => {
              const osie = osieHormonalne(D);
              if (!osie.length) return null;
              return (
                <Reveal delay={112}>
                  <div style={{ background: M.s1, border: `1px solid ${M.brd2}`, padding: '20px 18px', marginBottom: 20, borderRadius: 16, width: '100%', boxSizing: 'border-box' }}>
                    <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: M.gold, fontWeight: 700, marginBottom: 6 }}>Sygnały, które warto sprawdzić</div>
                    <div style={{ fontSize: 12, color: M.t4, lineHeight: 1.5, marginBottom: 14 }}>Wzorce z Twoich odpowiedzi, które warto potwierdzić badaniem krwi. Z samych odpowiedzi hormonów nie odczytam i nie udaję, że jest inaczej.</div>
                    {osie.map((o, i) => (
                      <div key={i} style={{ padding: '12px 0', borderBottom: i < osie.length - 1 ? `1px solid ${M.brd}` : 'none' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                          <span style={{ fontFamily: M.serif, fontSize: 19, color: M.t1 }}>{o.n}</span>
                          <span style={{ fontFamily: M.mono, fontSize: 12, letterSpacing: 2, color: o.lvl === 3 ? M.red : M.org }} aria-label={o.lvl === 3 ? 'mocna presja' : 'presja'}>
                            {o.lvl === 3 ? '●●●' : '●●○'}
                          </span>
                        </div>
                        <div style={{ fontFamily: M.mono, fontSize: 11.5, color: M.t3, lineHeight: 1.5 }}>{o.why}</div>
                      </div>
                    ))}
                    <div style={{ fontSize: 12.5, color: M.t4, lineHeight: 1.55, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${M.brd}`, fontStyle: 'italic' }}>
                      Którą oś ruszyć pierwszą i czy potwierdzić krwią, ustawiam już w prowadzeniu, 1:1.
                    </div>
                  </div>
                </Reveal>
              );
            })()}

            {/* ═══ SMACZEK 3: LISTA DO PRZYCHODNI - namacalny artefakt (screenshot → lekarz), realna wartość ═══ */}
            {badaniaUnique.length > 0 && (
              <Reveal delay={114}>
                <div style={{ marginBottom: 20, padding: '20px 18px', borderRadius: 16, width: '100%', boxSizing: 'border-box', background: M.s1, border: `1px solid ${M.brd2}` }}>
                  <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: M.gold, fontWeight: 700, marginBottom: 6 }}>Bonus &middot; lista do przychodni</div>
                  <div style={{ fontSize: 12.5, color: M.t4, lineHeight: 1.5, marginBottom: 14 }}>Zrób screena i weź do lekarza rodzinnego po skierowania. To, co u Ciebie warto sprawdzić najpierw:</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[...badaniaWysoki, ...badaniaSredni].slice(0, 4).map((b, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'baseline', padding: '9px 12px', borderRadius: 10, background: M.bg, border: `1px solid ${M.brd}` }}>
                        <span style={{ fontFamily: M.mono, fontSize: 12, color: M.gold, fontWeight: 800, flexShrink: 0 }}>{i + 1}</span>
                        <div>
                          <div style={{ fontSize: 13.5, color: M.t1, fontWeight: 600 }}>{b.nazwa}</div>
                          <div style={{ fontSize: 11.5, color: M.t3, lineHeight: 1.45, marginTop: 2 }}>{b.dlaczego}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 10.5, color: M.t4, lineHeight: 1.5, marginTop: 12, fontStyle: 'italic' }}>Diagnozę stawia lekarz. Ta lista mówi, od czego zacząć sprawdzanie. Kolejność i interpretację z Twoim tygodniem układam w prowadzeniu.</div>
                </div>
              </Reveal>
            )}




            {/* ═══ TWOJA DROGA v2 (werdykt rady): 1 pelna dzwignia 14 dni + tease faz 2-3 + proof + rama egzekucji + JEDEN CTA. Nic po CTA. ═══ */}
            <Reveal delay={112}>
              {(() => {
                const rank = [...catScores].sort((a, b) => a.pct - b.pct);
                const fazy = rank.slice(0, 3).map(c => c.label).filter(l => ROADMAPA_KARTY[l]);
                const glowna = fazy[0] || 'Sen';
                const tease = fazy.slice(1);
                const kg = ROADMAPA_KARTY[glowna];
                const sdx = selfDx.trim();
                const dnoFor = (label: string, k: { dno: string }) => label === 'Weekend' && D.wkndWhat >= 0 ? (WKND_DNO[D.wkndWhat] || k.dno) : k.dno;
                const wynik180 = good
                  ? ['Sylwetka, po której widać, że to nie przypadek', 'Panel krwi zrobiony i omówiony, zero zgadywania', 'Forma rośnie, zamiast stać na dobrym poziomie']
                  : pickBenefits180(D, badaniaWysoki.length);
                return (
                  <div style={{ marginBottom: 16, padding: '26px 20px', borderRadius: 16, width: '100%', boxSizing: 'border-box', background: `linear-gradient(160deg, rgba(19,19,19,0.96), ${M.gold}0d)`, border: `2px solid ${M.gold}45`, boxShadow: `0 0 36px ${M.gold}10` }}>
                    <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: M.gold, fontWeight: 700, marginBottom: 10 }}>Twoja droga · rozpisana z wyniku</div>
                    <h3 style={{ fontFamily: M.serif, fontSize: 26, fontWeight: 400, lineHeight: 1.15, color: M.t1, margin: '0 0 18px' }}>
                      {good ? <>Baza jest. Tak wygląda droga z dobrego na świetne:</> : <>Da się to poukładać. Jedna rzecz naraz, we właściwej kolejności:</>}
                    </h3>

                    {/* START */}
                    <div style={{ position: 'relative', paddingLeft: 26, paddingBottom: 22, borderLeft: `2px solid ${M.brd2}` }}>
                      <span style={{ position: 'absolute', left: -7, top: 0, width: 12, height: 12, borderRadius: 7, background: M.red, boxShadow: '0 0 10px rgba(220,68,68,.6)' }} />
                      <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: M.red, fontWeight: 800, marginBottom: 6 }}>Tu jesteś</div>
                      <div style={{ fontSize: 14, color: M.t2, lineHeight: 1.55 }}>
                        {SC}/100, najmocniej ciągnie {glowna.toLowerCase()}.{!good && sdx ? <> Sam napisałeś: <em style={{ color: M.t1 }}>„{sdx.slice(0, 90)}{sdx.length > 90 ? '…' : ''}"</em>.</> : null}
                      </div>
                    </div>

                    {/* DZWIGNIA 14 DNI: jedyny pelny protokol na stronie (kasuje dublet z priorytetem) */}
                    <div style={{ position: 'relative', paddingLeft: 26, paddingBottom: 22, borderLeft: `2px solid ${M.gold}` }}>
                      <span style={{ position: 'absolute', left: -8, top: 0, width: 14, height: 14, borderRadius: 8, background: M.gold, boxShadow: `0 0 14px ${M.gold}80` }} />
                      <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: M.gold, fontWeight: 800, marginBottom: 6 }}>Twoja dźwignia na 14 dni · {glowna}</div>
                      {!good && <p style={{ fontSize: 13.5, color: M.t3, fontStyle: 'italic', lineHeight: 1.6, margin: '0 0 8px' }}>{dnoFor(glowna, kg)}</p>}
                      <p style={{ fontSize: 14, color: M.t2, lineHeight: 1.65, margin: '0 0 8px' }}>{kg.robimy}</p>
                      <p style={{ fontSize: 13, color: M.grn, lineHeight: 1.5, margin: 0 }}><span style={{ fontFamily: M.mono, fontSize: 9.5, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 700 }}>Po czym poznasz</span> {kg.poznasz}</p>
                    </div>

                    {/* TEASE FAZ 2-3: nazwa dzwigni bez wykonania (sekwencjonowanie = produkt) */}
                    {tease.map((label, i) => {
                      const k = ROADMAPA_KARTY[label];
                      return (
                        <div key={label} style={{ position: 'relative', paddingLeft: 26, paddingBottom: 20, borderLeft: `2px solid ${M.gold}45` }}>
                          <span style={{ position: 'absolute', left: -7, top: 0, width: 12, height: 12, borderRadius: 7, background: 'transparent', border: `2.5px solid ${M.gold}`, boxSizing: 'border-box' }} />
                          <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: M.gold, fontWeight: 800, marginBottom: 6 }}>{i === 0 ? 'Faza 2' : 'Faza 3'} · {label}</div>
                          {!good && <p style={{ fontSize: 13.5, color: M.t3, fontStyle: 'italic', lineHeight: 1.6, margin: '0 0 8px' }}>{dnoFor(label, k)}</p>}
                          <p style={{ fontSize: 14.5, color: M.t1, fontWeight: 600, lineHeight: 1.5, margin: '0 0 6px' }}>{k.dzwignia}.</p>
                          <p style={{ fontSize: 13, color: M.grn, lineHeight: 1.5, margin: 0 }}><span style={{ fontFamily: M.mono, fontSize: 9.5, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 700 }}>Po czym poznasz</span> {k.poznasz}</p>
                        </div>
                      );
                    })}
                    <div style={{ position: 'relative', paddingLeft: 26, paddingBottom: 22, borderLeft: `2px solid ${M.gold}45` }}>
                      <p style={{ fontSize: 13, color: M.t3, lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>Jak dokładnie, w jakich dawkach i co robić, kiedy tydzień się sypie: to zależy od Twoich wyników i to ustawiamy razem. Kolejność jest połową efektu.</p>
                    </div>

                    {/* KONIEC: wynik */}
                    <div style={{ position: 'relative', paddingLeft: 26, paddingBottom: 4 }}>
                      <span style={{ position: 'absolute', left: -7, top: 0, width: 12, height: 12, borderRadius: 7, background: M.grn, boxShadow: '0 0 10px rgba(60,186,94,.5)' }} />
                      <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: M.grn, fontWeight: 800, marginBottom: 6 }}>Miesiąc 4-6 · wynik</div>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {wynik180.map((b, i) => (
                          <li key={i} style={{ fontSize: 14, color: M.t1, lineHeight: 1.5, paddingLeft: 16, position: 'relative', fontWeight: 500 }}>
                            <span style={{ position: 'absolute', left: 0, top: 0, color: M.grn, fontWeight: 700 }}>·</span>{b}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* PROOF przed CTA (werdykt: proof wyzej, przy decyzji) */}
                    <div style={{ borderTop: `1px solid ${M.gold}25`, marginTop: 20, paddingTop: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                        <img src="/michal-portrait.jpg" alt="Michał" loading="lazy" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', objectPosition: 'center 30%', border: `2px solid ${M.gold}`, boxShadow: `0 6px 20px rgba(0,0,0,.5),0 0 16px ${M.gold}25`, flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: M.t1, lineHeight: 1.2, marginBottom: 3 }}>Michał &middot; Hantle i Talerz</div>
                          <div style={{ fontSize: 12, color: M.t4, lineHeight: 1.4 }}>180 facetów przeszło tę drogę &middot; 5.0 na Google &middot; 9 lat prowadzenia</div>
                        </div>
                      </div>
                      {!good && (
                        <p style={{ fontFamily: M.serif, fontStyle: 'italic', fontSize: 14.5, color: M.t2, lineHeight: 1.55, margin: '0 0 14px' }}>
                          „Zrywy: 2 tygodnie idealnie, potem odpuszczenie." Tak pisał facet, który jest dziś w zupełnie innym miejscu. Zaczynał od takiego samego wyniku.
                        </p>
                      )}

                      {/* RAMA EGZEKUCJI: wiedza nigdy nie byla problemem (tease na niewdrozeniu, nie na tajemnicy) */}
                      {!good && (
                        <p style={{ fontSize: 14, color: M.t2, lineHeight: 1.65, margin: '0 0 16px' }}>
                          Tę dźwignię wyżej pewnie kojarzysz. {D.triedBefore >= 2 ? 'Zaczynałeś już nie raz i wiesz, jak to się kończyło po dwóch tygodniach. ' : ''}Wiedza nigdy nie była u Ciebie problemem. Dowożenie w tygodniu, który się sypie, było. Dokładnie od tego jestem.
                        </p>
                      )}
                      {good && (
                        <p style={{ fontSize: 14, color: M.t2, lineHeight: 1.65, margin: '0 0 16px' }}>
                          Z takim tygodniem pół roku pracy nad detalami daje więcej, niż innym daje rok. Zobacz, jak wygląda prowadzenie na wynik.
                        </p>
                      )}

                      <a href="https://nabor.talerzihantle.com?utm_source=diagnostyka&utm_content=roadmapa" target="_blank" rel="noopener noreferrer" className="shimmer-btn"
                        onClick={() => { trackEvent('diag_cta_click', { target: 'nabor_roadmapa', score: SC }); fbqTrack('InitiateCheckout', { content_name: 'nabor_roadmapa', content_category: 'high_ticket', value: SC, currency: 'PLN' }); }}
                        style={{ display: 'block', textAlign: 'center', background: `linear-gradient(135deg, ${M.gold}, #a08a3e)`, color: M.bg, textDecoration: 'none', padding: '18px', borderRadius: 14, fontWeight: 800, fontSize: 15, letterSpacing: 1, boxShadow: '0 4px 24px rgba(200,168,78,0.3)' }}
                      >{good ? 'ZOBACZ, JAK PRACUJĘ NA WYNIK' : 'ZOBACZ, JAK TO WYGLĄDA W ŚRODKU'} &rarr;</a>
                      <div style={{ fontSize: 11.5, color: M.t4, textAlign: 'center', marginTop: 8, fontFamily: M.mono, letterSpacing: 0.5 }}>3 minuty czytania &middot; bez płatności &middot; raport zostaje otwarty</div>
                    </div>
                  </div>
                );
              })()}
            </Reveal>

            {/* Disclaimer - model edukacyjny, nie diagnoza */}
            <div style={{ padding: '14px 16px', marginBottom: 12, borderRadius: 12, background: M.s1, border: `1px solid ${M.brd}`, fontSize: 12, color: M.t3, lineHeight: 1.6 }}>
              Ten raport liczę z Twoich odpowiedzi, nie z badań. Lekarza nie zastępuje. Jak coś Cię boli albo wyniki krwi wyglądają dziwnie, idź z tym do lekarza, nie do quizu.
            </div>

            {/* Źródła - kompaktowe */}
            <div style={{ padding: '12px', fontSize: 10, color: M.t4, lineHeight: 1.6, fontFamily: M.mono }}>
              Źródła: RAND 2016, Leproult & Van Cauter JAMA 2011, Parr et al. 2014, Cappuccio et al. 2010, Hemp HBR 2004, Vingren et al. 2013, Halson 2014, Schoenfeld et al. 2017, Expert Rev. Endocrinol. Metab. 2023
            </div>

            {/* ═══ STICKY CTA - upgraded: scroll progress + DM-direct (council Expansionist) ═══ */}
            {showStickyCta && (
              <StickyCtaBar SC={SC} potential={potential} brainAge={brainAge} userAge={D.age} topCatLabel={catScores.reduce((a, b) => a.pct < b.pct ? a : b, catScores[0]).label} incomingSearch={inboundSearch} />
            )}
          </div>
        )}

        {/* ── KONFIGURATOR (?config=1) - panel wariantów pierwszej i ostatniej strony ── */}
        {showConfig && (
          <div style={{ position: 'fixed', right: 10, bottom: 10, zIndex: 9999, width: 264, maxHeight: '82vh', overflowY: 'auto', background: '#0f0f0f', border: `1px solid ${M.gold}50`, borderRadius: 14, padding: '14px 14px 16px', boxShadow: '0 10px 40px rgba(0,0,0,.65)' }}>
            <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: M.gold, fontWeight: 700, marginBottom: 12 }}>Konfigurator · zapis auto</div>
            {([
              ['Nagłówek hero (kąt)', 'heroH1', [['A', 'godzina'], ['B', 'dyscyplina/diagnoza'], ['C', 'ile kosztuje'], ['D', 'wiesz, forma stoi'], ['E', 'anty-plan']]],
              ['Zajawka', 'heroSub', [['A', 'godzina+koszt'], ['B', '3 liczby']]],
              ['Badge', 'badge', [['A', 'zero teorii'], ['B', 'darmowy']]],
              ['Font nagłówków', 'font', [['instrument', 'Instrument'], ['playfair', 'Playfair'], ['cormorant', 'Cormorant']]],
              ['Rozmiar hero', 'heroSize', [['M', 'M'], ['L', 'L']]],
              ['CTA główne', 'cta', [['A', 'zobacz prowadzenie'], ['B', 'jak pracuję 1:1'], ['C', 'czy się łapiesz']]],
              ['Ton pęknięć', 'crackTone', [['ostry', 'ostry'], ['spokojny', 'spokojny']]],
            ] as [string, keyof CfgT, [string, string][]][]).map(([label, key, opts]) => (
              <div key={String(key)} style={{ marginBottom: 11 }}>
                <div style={{ fontFamily: M.mono, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: M.t4, marginBottom: 5 }}>{label}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {opts.map(([v, l]) => {
                    const on = String(cfg[key]) === v;
                    return (
                      <button key={v} onClick={() => setCfg(p => ({ ...p, [key]: v }))} style={{ padding: '5px 9px', borderRadius: 7, fontSize: 10.5, fontWeight: 600, cursor: 'pointer', border: `1px solid ${on ? M.gold : M.brd2}`, background: on ? M.gold + '18' : M.s1, color: on ? M.gold : M.t3, fontFamily: M.sans }}>{l}</button>
                    );
                  })}
                </div>
              </div>
            ))}
            <div style={{ marginBottom: 11 }}>
              <div style={{ fontFamily: M.mono, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: M.t4, marginBottom: 5 }}>Sekcje wyniku</div>
              {([['showOdczyt', 'Odczyt 6 obszarów'], ['showKontekst', 'Pełen kontekst (akordeony)']] as [keyof CfgT, string][]).map(([k, l]) => {
                const on = Boolean(cfg[k]);
                return (
                  <button key={String(k)} onClick={() => setCfg(p => ({ ...p, [k]: !p[k] }))} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 9px', marginBottom: 4, borderRadius: 7, fontSize: 10.5, fontWeight: 600, cursor: 'pointer', border: `1px solid ${on ? M.gold : M.brd2}`, background: on ? M.gold + '14' : M.s1, color: on ? M.gold : M.t4, fontFamily: M.sans }}>{on ? '✓ ' : '✗ '}{l}</button>
                );
              })}
            </div>
            <button onClick={() => setCfg({ ...CFG_DEFAULT })} style={{ width: '100%', padding: '7px', borderRadius: 8, fontSize: 10.5, fontWeight: 700, cursor: 'pointer', border: `1px solid ${M.brd2}`, background: 'transparent', color: M.t4, fontFamily: M.sans }}>Reset do domyślnych</button>
          </div>
        )}

        {/* ── FOOTER ── */}
        <footer style={{ textAlign: 'center', padding: '24px 16px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, borderTop: `1px solid ${M.brd}` }}>
          <Logo />
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            <a
              href="https://ig.me/m/hantleitalerz?text=wje%C5%BCd%C5%BCam"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontFamily: M.mono, fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: M.t4, textDecoration: 'none' }}
            >
              Prowadzenie 1:1
            </a>
            <span style={{ color: M.brd2 }}>|</span>
            <a
              href="https://instagram.com/hantleitalerz"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram @hantleitalerz"
              style={{ fontFamily: M.mono, fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: M.t4, textDecoration: 'none' }}
            >
              Instagram
            </a>
          </div>
          <span style={{ fontFamily: M.mono, fontSize: 9.5, color: M.t4, letterSpacing: 1 }}>Hantle i Talerz &copy; 2026</span>
        </footer>

      </div>
    </>
  );
}
