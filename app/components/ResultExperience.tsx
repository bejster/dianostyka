'use client';

// ── STRONA WYNIKU V3 (frozen spec, Michał 2026-09-08) ──
// 1 PUNKT PĘKNIĘCIA (payoff, score wtórny, max 2 evidence receipts) -> 2 PĘTLA 168 (deterministyczny
// łańcuch z realnych odpowiedzi, język niepewności gdy dowód słaby) -> 3 DLACZEGO TO WRACA (tried_before/
// give_up_point/break_window, zero wymyślonej przyczyny) -> 4 REALNY KOSZT (wyłącznie jawne fakty, zero
// zmyślonych rocznych kwot) -> 5 JEDEN eksperyment 72h (bank 20, deterministyczny selector, commit + reveal)
// -> 6 DEMONSTRACJA METODY (zero obietnicy darmowej analizy) + ROUTER (DM tylko dla gotowych, NABÓR dla
// explore/later, eksperyment jako primary dla reszty) -> 7 KALIBRACJA + bezpieczny Zapisz/Udostępnij.
import { useEffect, useRef, useState } from 'react';
import { GOOGLE_AGG, GOOGLE_CARDS } from '../lib/google-reviews';
import { trackDiag } from '../lib/analytics';
import type { ExperimentDef, Confidence } from '../lib/experiment-bank';
import type { RouteDecision } from '../lib/result-router-v3';
import { BREAK_PHRASE, type LoopNode } from '../lib/fracture-engine';
import type { AwarenessGap } from '../lib/awareness-gap';

const C = {
  ink: '#08080a', pan: '#141416', pan2: '#1a1a1d', line: '#26262b', line2: '#33333a',
  gold: '#c8a84e', goldB: '#e8cc80', goldD: '#8a7535', glow: 'rgba(200,168,78,.16)',
  paper: '#ece7db', mute: '#a49e92', faint: '#8f887c', hot: '#e0552e',
  rule: 'rgba(200,168,78,.16)', ruleS: 'rgba(200,168,78,.42)',
  mono: "'JetBrains Mono', ui-monospace, monospace", serif: "'Instrument Serif', Georgia, serif", sans: "'Inter', system-ui, sans-serif",
};

export default function ResultExperience({
  archLabel, archKey, redCount, breakId, domainLabel, statuses,
  evidenceReceipts, loop, whyRepeats, costFacts, userPain,
  experiment, experimentConfidence, route,
  imie, instagram, naborHref, submissionId, contentSignals, awareness,
}: {
  archLabel: string; archKey: string; redCount?: number; breakId: string; domainLabel: string;
  statuses: { label: string; score: number; reason: string }[];
  evidenceReceipts: string[]; loop: { nodes: LoopNode[]; uncertain: boolean }; whyRepeats: string;
  costFacts: string[]; userPain?: string;
  experiment: ExperimentDef; experimentConfidence: Confidence; route: RouteDecision;
  imie?: string; instagram?: string; naborHref: string; submissionId?: string;
  contentSignals?: Record<string, string | boolean>;
  awareness?: AwarenessGap;
}) {
  const progRef = useRef<HTMLDivElement>(null);
  const resultStartedAt = useRef<number>(Date.now());
  const maxScrollRef = useRef<number>(0);
  const lastBeatRef = useRef<string>('');
  const beatSeenAtRef = useRef<number>(Date.now());
  const hiddenAtRef = useRef<number>(0);
  const hiddenMsRef = useRef<number>(0);
  const beatHiddenMsRef = useRef<number>(0);
  const scrollMarksRef = useRef<Set<number>>(new Set());
  const [calib, setCalib] = useState<string>('');
  const [committed, setCommitted] = useState(false);
  const [saved, setSaved] = useState(false);
  const CALIB = [
    { id: 'sen', label: 'Sen' }, { id: 'energia', label: 'Energia i głowa' }, { id: 'jedzenie', label: 'Jedzenie' },
    { id: 'ruch', label: 'Ruch' }, { id: 'weekend', label: 'Weekend' }, { id: 'naped', label: 'Napęd i libido' }, { id: 'ok', label: 'Wszystko pasuje' },
  ];
  // Kalibracja nie moze konczyc sie podziekowaniem. Klikniecie oznacza, ze czlowiek wlasnie wykluczyl
  // jeden obszar, a to jest informacja diagnostyczna: skoro nie tam, to gdzie indziej. Kazdy chip
  // dostaje wiec konkretna reakcje z nastepnym miejscem do sprawdzenia. Wartosci wyniku sie nie zmieniaja.
  const CALIB_REPLY: Record<string, string> = {
    sen: 'Czyli tydzień rozjeżdża Ci się przy w miarę zebranym śnie. Wtedy patrzę najpierw na obciążenie w pracy oraz na to, co dzieje się między osiemnastą a dwudziestą drugą.',
    energia: 'Czyli energię masz, a i tak coś wypada. Wtedy zwykle rozjeżdża się kolejność dnia: wszystko przesuwa się o godzinę i wieczorem nie zostaje miejsca na to, co miało być. Sprawdziłbym, o której faktycznie kończysz robotę.',
    jedzenie: 'Czyli punkt pęknięcia nie siedzi w jedzeniu. Jedzenie najczęściej tylko odbija to, co wydarzyło się wcześniej, więc następne pytanie brzmi: co robisz w godzinie przed pierwszą przekąską.',
    ruch: 'Czyli treningi dowozisz. Wtedy różnicę robi reszta tygodnia, te godziny, w których nie ma siłowni.',
    weekend: 'Czyli pęknięcie jest wcześniej niż sobota. Sprawdziłbym czwartek wieczorem, bo tam zwykle zapada decyzja o tym, jak będzie wyglądał piątek.',
    naped: 'Czyli ten obszar trzyma. To dobry znak, bo zwykle schodzi jako jeden z ostatnich. Reszta wyniku zostaje w mocy.',
    ok: 'To znaczy, że pracujemy na tym wyniku bez korekty. Test 72h ma teraz sprawdzić, czy pierwszy moment naprawdę trzyma.',
  };
  const sendCalib = (id: string) => {
    setCalib(id);
    try {
      fetch('/api/diag-event', { method: 'POST', headers: { 'content-type': 'application/json' }, keepalive: true, body: JSON.stringify({ submission_id: submissionId, q_id: 'calibration', value: id, ts: Date.now() }) }).catch(() => {});
    } catch (_e) { /* analityka nigdy nie wywraca flow */ }
    trackDiag('calibration_answer', { id });
  };

  useEffect(() => {
    resultStartedAt.current = Date.now();
    beatSeenAtRef.current = Date.now();
    trackDiag('result_viewed', { arch: archKey });
    // Jedna anonimowa paczka content intelligence. Wyłącznie bezpieczne kategorie, zero PII/free text/health data.
    if (contentSignals) trackDiag('content_signal', contentSignals);
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      (e.target as HTMLElement).classList.add('in');
      const b = (e.target as HTMLElement).dataset.beat;
      const EVT: Record<string, string> = { '1': 'current_state_viewed', mirror: 'mirror_viewed', map: 'map_viewed', evidence: 'evidence_viewed', fracture: 'fracture_viewed', '2': 'loop_viewed', '5': 'experiment_viewed', horizon: 'horizon_viewed', '6': 'method_demo_viewed' };
      if (b && EVT[b]) {
        const now = Date.now();
        if (lastBeatRef.current && lastBeatRef.current !== b) trackDiag('result_beat_dwell', { arch: archKey, beat: lastBeatRef.current, dwell_ms: Math.max(0, now - beatSeenAtRef.current - beatHiddenMsRef.current) });
        lastBeatRef.current = b; beatSeenAtRef.current = now; beatHiddenMsRef.current = 0;
        trackDiag(EVT[b], { arch: archKey, ...(b === '5' ? { experiment_id: experiment.id, confidence: experimentConfidence } : {}) });
      }
      io.unobserve(e.target);
    }), { threshold: 0.16 });
    const beats = document.querySelectorAll('.rx-beat');
    beats.forEach((b) => io.observe(b));
    document.querySelector('.rx-hero')?.classList.add('in');
    const marks = [25, 50, 75, 90, 100];
    const onScroll = () => {
      const h = document.documentElement; const pct = Math.max(0, Math.min(100, Math.round((h.scrollTop / (h.scrollHeight - h.clientHeight || 1)) * 100)));
      maxScrollRef.current = Math.max(maxScrollRef.current, pct);
      if (progRef.current) progRef.current.style.width = pct + '%';
      for (const mark of marks) if (pct >= mark && !scrollMarksRef.current.has(mark)) { scrollMarksRef.current.add(mark); trackDiag('result_scroll_depth', { arch: archKey, pct: mark }); }
    };
    const onVisibility = () => {
      const now = Date.now();
      if (document.visibilityState === 'hidden') hiddenAtRef.current = now;
      else if (hiddenAtRef.current) { const delta = now - hiddenAtRef.current; hiddenMsRef.current += delta; beatHiddenMsRef.current += delta; hiddenAtRef.current = 0; }
    };
    const onPageHide = () => {
      const now = Date.now(); const pendingHidden = hiddenAtRef.current ? now - hiddenAtRef.current : 0;
      if (lastBeatRef.current) trackDiag('result_beat_dwell', { arch: archKey, beat: lastBeatRef.current, dwell_ms: Math.max(0, now - beatSeenAtRef.current - beatHiddenMsRef.current - pendingHidden), final: true });
      trackDiag('result_exit_snapshot', { arch: archKey, last_beat: lastBeatRef.current || 'hero', max_scroll_pct: maxScrollRef.current, active_ms: Math.max(0, now - resultStartedAt.current - hiddenMsRef.current - pendingHidden) });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    onScroll();
    return () => { io.disconnect(); window.removeEventListener('scroll', onScroll); document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('pagehide', onPageHide); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [archKey]);

  const breakPhrase = BREAK_PHRASE[breakId] || 'Odpowiedzi nie wskazują jednego stałego momentu. Wzorzec zmienia się zależnie od dnia.';
  const orderedStatuses = [...statuses].sort((a,b) => a.score - b.score);
  const weakestStatus = orderedStatuses[0];
  const strongestStatus = orderedStatuses[orderedStatuses.length - 1];
  const breakTrack: Record<string,{pct:number;label:string}> = { bw_morning:{pct:5,label:'rano'}, bw_midday:{pct:24,label:'przed obiadem'}, bw_afternoon:{pct:43,label:'po 14'}, bw_afterwork:{pct:62,label:'po pracy'}, bw_evening:{pct:81,label:'wieczorem'}, bw_weekend:{pct:96,label:'weekend'}, bw_varies:{pct:50,label:'zmiennie'} };
  const breakPos = breakTrack[breakId] || breakTrack.bw_varies;
  const radarPoints = statuses.map((st, i) => { const a = -Math.PI / 2 + i * (Math.PI * 2 / statuses.length); const r = Math.max(24, Math.min(st.score, 90)) * 0.82; return `${110 + Math.cos(a) * r},${110 + Math.sin(a) * r}`; }).join(' ');
  const radarGrid = [30, 55, 80].map((r) => statuses.map((_, i) => { const a = -Math.PI / 2 + i * (Math.PI * 2 / statuses.length); return `${110 + Math.cos(a) * r},${110 + Math.sin(a) * r}`; }).join(' '));

  // ── V2.8 ZAPAS: język pojemności zamiast fałszywej precyzji. Zero "% potencjału", zero wymyślonych zysków.
  //    Pasma czytają ten sam indeks 24-90, który user widzi na osi, więc etykieta zawsze zgadza się z liczbą.
  //    Progi liczone na realnej skali osi (24-90, srodek 57), nie na starym progu czerwieni 45.
  //    Inaczej "2-3 weekendy w miesiacu psuja rytm" ladowalo jako "malo zapasu" i przeczylo wlasnemu dowodowi.
  const reserveBand = (score: number): 'wyraźny' | 'umiarkowany' | 'mały' => score < 50 ? 'wyraźny' : score < 68 ? 'umiarkowany' : 'mały';
  const axisBand = (score: number) => { const b = reserveBand(score); return b === 'mały' ? 'mało zapasu' : `${b} zapas`; };
  const bigReserve = statuses.filter((st) => reserveBand(st.score) === 'wyraźny').length;
  const anyReserve = statuses.filter((st) => reserveBand(st.score) !== 'mały').length;
  const hasCeilingRoom = anyReserve > 0;
  const reserveLine = bigReserve >= 1
    ? `${bigReserve} z ${statuses.length} obszarów ${bigReserve === 1 ? 'ma' : 'mają'} dziś wyraźnie więcej miejsca do poprawy niż reszta.`
    : anyReserve >= 1
      ? `Żaden obszar nie leży, ale ${anyReserve} z ${statuses.length} ${anyReserve === 1 ? 'ma' : 'mają'} jeszcze umiarkowany zapas.`
      : 'Wszystkie pięć obszarów trzyma się dziś podobnie wysoko.';
  // Napęd i libido nisko = sygnał do weryfikacji badaniami, nie do diagnozy z quizu.
  const driveAxis = statuses.find((st) => st.label.toLowerCase().includes('napęd'));
  const flagDriveCheck = Boolean(driveAxis && reserveBand(driveAxis.score) === 'wyraźny');
  // breakPos.label to fraza okolicznikowa ("po pracy", "rano", "weekend"). Wchodzi wyłącznie po dwukropku,
  // nigdy po przyimku — "zacząłbym od po pracy" i "od momentu weekend" to złamana polszczyzna dla 7 z 7 wartości.
  const repairLead = (redCount ?? 0) >= 3
    ? `Kilka obszarów jest słabszych naraz. Pierwszy ruch sprawdziłbym tutaj: ${breakPos.label}. Potem patrzyłbym, które z pozostałych rzeczy cofają się same, bez dokładania Ci kolejnych zasad.`
    : (redCount ?? 0) === 2
      ? `Dwa słabsze obszary układają się w jeden ciąg. Pierwszy ruch sprawdziłbym tutaj: ${breakPos.label}. Najszybciej z tego widać, czy reszta tygodnia w ogóle reaguje.`
      : `Masz jeden wyraźny obszar do sprawdzenia. Pierwszy ruch sprawdziłbym tutaj: ${breakPos.label}. Potem patrzyłbym, czy reszta tygodnia zaczyna trzymać lepiej.`;

  // ── V2.8.1 SUFIT: domknięcie ma trafiać w przekonanie "u mnie jest w porządku, ogarnę sam",
  //    a nie w tożsamość użytkownika. Liczba bierze się z tych samych pasm zapasu co reszta strony,
  //    więc nigdzie nie pada wymyślony procent potencjału ani żadna teza o hormonach.
  const ceilingCount = bigReserve >= 1 ? bigReserve : anyReserve;
  const ceilingLead = hasCeilingRoom
    ? 'Ten wynik nie mówi, że jest u Ciebie źle.'
    : 'Ten wynik nie daje Ci dziś nic do gaszenia.';
  // Zadnego "wiekszosc osob". To bylaby statystyka, ktorej nikt nie policzyl. Zostaje scena.
  const ceilingBody = hasCeilingRoom
    ? 'Zwykle wygląda to tak, że nic nie jest złe: robota idzie, trening jakoś leci, weekend się odbywa. I dokładnie dlatego nic się nie rusza. Jest za to poniedziałek, który wygląda tak samo jak dwa lata temu.'
    : 'To jest ten moment, w którym najłatwiej odpuścić, bo nic nie pali. Jest też jedyny moment, w którym da się spokojnie sprawdzić, na ile Cię stać, bez gaszenia pożaru przy okazji.';
  // Wczesniej jeden literal dla kazdego. Teraz domkniecie wskazuje realny obszar z jego wlasnego wyniku.
  const ceilingHit = hasCeilingRoom
    ? `Nie wiesz, ile zapasu siedzi tutaj: ${breakPos.label}. Nigdy nie sprawdziłeś tego przy tygodniu, który trzyma.`
    : 'Nie wiesz, gdzie jest Twój pułap, bo nie było jeszcze tygodnia, w którym wszystko zagrało naraz.';

  // ── V2.8.3 BRAKI: zamiast abstrakcyjnego "N z 5 obszarow ma zapas" domkniecie nazywa konkretne
  //    luki z jego wlasnych osi, ale w jezyku, ktorym czlowiek mysli o swoim dniu: sylwetka, glowa,
  //    energia, czas. Energia jest tu opisana przez skupienie, bo tak dziala u tego ICP: krotszy
  //    fokus = ta sama robota zjada wiecej godzin = "nie mam czasu". Zero wymyslonych liczb.
  const GAP_COST: Record<string, string> = {
    'Forma': 'sylwetka stoi w tym samym miejscu, chociaż wkładasz w nią więcej niż rok temu',
    'Sen i regeneracja': 'dzień startuje z mniejszym zapasem, więc wieczór dostaje Cię już zużytego',
    'Napęd i libido': 'chęć na cokolwiek poza robotą wraca wolniej, niż kiedyś wracała',
    'Głowa i stres': 'skupienie trzyma krócej, więc ta sama robota zjada Ci więcej godzin z dnia',
    'Weekend i rytm': 'dwa dni rozkładają to, co ustawiłeś przez poprzednie pięć',
  };
  const gaps = orderedStatuses
    .filter((st) => reserveBand(st.score) !== 'mały')
    .slice(0, 3)
    .map((st) => ({ label: st.label, cost: GAP_COST[st.label] || 'ten obszar ma dziś najwięcej miejsca do poprawy' }));
  // Bez kolejnego "z Twoich odpowiedzi". To zdanie bylo piatym powtorzeniem tego samego dowodu na stronie.
  const gapsLead = gaps.length === 1
    ? 'Zapas został dziś w jednym miejscu.'
    : `Zapas został dziś w ${gaps.length === 2 ? 'dwóch miejscach' : 'trzech miejscach'}.`;

  // Fakt z mojego arkusza "PODSUMOWANIE TYGODNIA": 431 cotygodniowych check-inow od 44 osob, od grudnia.
  // Podane jako obserwacja z wlasnych danych, nie jako dowod przyczynowy i nie jako teza medyczna.
  // Ta wiedza celowo nie powtarza niczego ze strony naboru.
  const knowledgeLine = 'Jedna rzecz z moich check-inów, zanim pójdziesz dalej. Mam 431 cotygodniowych podsumowań od 44 osób, zbieranych od grudnia. Wychodzi z nich, że sama liczba godzin snu tłumaczy zaskakująco mało. Ludzie, którzy śpią po siedem i pół godziny, mają tygodnie od bardzo dobrych po całkiem rozjechane. Różnicę robi ocena jakości snu zestawiona z energią następnego dnia, czyli dokładnie te dwie rzeczy, które ustawia się wieczorem, a nie budzikiem.';

  // Zaproszenie w moim jezyku, nie w jezyku landing page. Bez obietnicy wyniku, bez presji,
  // z jawnym powiedzeniem, co sie stanie po wyslaniu formularza.
  const naborInvite = 'Tyle ode mnie w tym wyniku. Jak chcesz, żebym pomógł Ci to poukładać, obadaj sobie na spokojnie stronę prowadzenia. W środku jest formularz. Wypełnij go śmiało, nic za to nie płacisz i do niczego Cię to nie zobowiązuje. Przeczytam go osobiście i powiem wprost, czy widzę tutaj sens wspólnej roboty.';
  const naborInviteSoft = 'A jeśli wolisz, żeby ktoś poukładał Ci to z zewnątrz, obadaj stronę prowadzenia. W środku jest formularz, wypełnij go śmiało. Przeczytam go osobiście.';

  const commitExperiment = () => {
    setCommitted(true);
    trackDiag('experiment_committed', { experiment_id: experiment.id, confidence: experimentConfidence, arch: archKey });
  };

  // Zapisz/Udostepnij: WYLACZNIE bezpieczne pola (etykieta archetypu, experiment id, anonimowy submission ref).
  const shareSafe = () => {
    const params = new URLSearchParams({ arch: archKey, exp: experiment.id, ...(submissionId ? { ref: submissionId.slice(0, 24) } : {}) });
    const url = `${typeof window !== 'undefined' ? window.location.origin + window.location.pathname : ''}?${params.toString()}`;
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        navigator.share({ title: 'Diagnostyka 168', text: `Mój Punkt Pęknięcia: ${archLabel}`, url }).catch(() => {});
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(url).catch(() => {});
      }
    } catch { /* share/clipboard opcjonalne, nigdy nie wywraca flow */ }
    setSaved(true);
    trackDiag('result_saved', { arch: archKey, experiment_id: experiment.id });
  };

  const onNaborClick = () => trackDiag('cta_nabor_clicked', { arch: archKey, route: route.primary });

  // overflowX MUSI byc 'clip', nie 'hidden'. 'hidden' na jednej osi wymusza 'auto' na drugiej, wiec ten div
  // stawal sie wlasnym kontenerem scrolla. Nieodsloniete .rx-beat maja transform:translateY(24px), co dawalo
  // mu 24px wlasnego przewijania (zmierzone w przegladarce: scrollHeight 10408 przy clientHeight 10384).
  // Na dotyku kazdy swipe najpierw wchodzil w ten wewnetrzny scroller, dopiero potem w dokument, wiec strona
  // wyniku nie przewijala sie w dol. 'clip' przycina poziom bez robienia scrollportu. Ten sam fix co w naborze.
  return (
    <div className="rx" style={{ background: C.ink, color: C.paper, fontFamily: C.sans, minHeight: '100vh', overflowX: 'clip', position: 'relative' }}>
      <style>{css}</style>
      <div className="rx-atmo" aria-hidden />
      <div className="rx-prog" ref={progRef} aria-hidden />

      <div className="rx-wrap">

        {/* BEAT 1 (V2.8) — GDZIE JESTEŚ TERAZ + GDZIE MASZ ZAPAS. Awareness-first: stan i pojemność
            przed nazwaniem Punktu Pęknięcia. Zero procentu potencjału, zero wymyślonych zysków. */}
        <section className="rx-beat rx-hero" data-beat="1">
          <div className="rx-kick rx-kick-c">Gdzie jesteś teraz{imie?.trim() ? ` · ${imie.trim()}` : ''}</div>
          <div className="rx-hero-panel">
            <div className="rx-hero-signature" aria-hidden="true"><span/><span/><span/></div>
            <h1 className="rx-arch">{hasCeilingRoom ? 'Poziom, na którym dziś jedziesz, nie jest jeszcze Twoim sufitem.' : 'Twój tydzień trzyma się dziś równo w pięciu obszarach.'}</h1>
            <div className="rx-redline">{reserveLine}</div>
            {/* Podpis pod naglowkiem wycialem w calosci. Pierwsze zdanie ("Policzylem to wylacznie z Twoich
                odpowiedzi") bylo pierwszym z pieciu wystapien tego samego dowodu, a drugie zapowiadalo
                odczyt spod osi, ktory i tak stoi przy mapie. Handoff w dol robi strzalka ZOBACZ CALA MAPE. */}
            <div className="rx-reserve">
              <div className="rx-reserve-row rx-reserve-top">
                <span>Największy zapas</span>
                <strong>{weakestStatus?.label}</strong>
                <p>{weakestStatus?.reason}</p>
              </div>
              <div className="rx-reserve-row">
                <span>Trzyma się dziś najlepiej</span>
                <strong>{strongestStatus?.label}</strong>
                <p>{strongestStatus?.reason}</p>
              </div>
            </div>
          </div>
          <div className="rx-cue" aria-hidden="true">
            <span className="rx-cue-arrow">↓</span>
            <span>ZOBACZ CAŁĄ MAPĘ</span>
          </div>
        </section>

        {/* LUSTRO (v2.9) — jedyne miejsce na tej stronie, gdzie czlowiek widzi siebie obok siebie.
            Po lewej liczba, ktora sobie dal na ekranie 2. Po prawej ta sama skala policzona z jego
            zachowan. Pod spodem kazda odpowiedz, ktora zabrala punkt, wiec roznicy nie da sie
            zbyc zdaniem "no tak mi sie kliknelo". Zero oceny, zero diagnozy, sam rachunek.
            Stoi PRZED mapa, bo mapa jest odpowiedzia na pytanie, ktore dopiero tutaj powstaje. */}
        {awareness && awareness.verdict !== 'NONE' && (
          <section className="rx-beat rx-mirror" data-beat="mirror">
            <div className="rx-kick">Lustro</div>
            <h2 className="rx-h2" style={{ fontSize: 'clamp(22px,4.6vw,32px)' }}>{awareness.headline}</h2>
            <div className="rx-mirror-pair">
              <div className="rx-mirror-cell">
                <span>Tak się oceniasz</span>
                <strong>{String(awareness.selfEnergy).replace('.', ',')}</strong>
                <em>Twoja odpowiedź z drugiego ekranu</em>
              </div>
              <div className={`rx-mirror-cell ${awareness.verdict === 'ABOVE' ? 'rx-mirror-hot' : ''}`}>
                <span>Tak wychodzi z odpowiedzi</span>
                <strong>{String(awareness.measuredEnergy).replace('.', ',')}</strong>
                <em>Policzone z pięciu Twoich kliknięć</em>
              </div>
            </div>
            <p className="rx-sub">{awareness.body}</p>
            {awareness.drivers.length > 0 && (
              <ul className="rx-mirror-drivers">
                {awareness.drivers.map((d, i) => (<li key={i}>{d}</li>))}
              </ul>
            )}
            {awareness.stagnationLine && <p className="rx-mirror-stagnation">{awareness.stagnationLine}</p>}
            {/* Zastrzezenie zostaje, bo pilnuje innej liczby niz to przy mapie. Wycialem tylko czlon
                o procencie potencjalu, ktory pada slowo w slowo dwa ekrany nizej. */}
            <p className="rx-mirror-note">Ta liczba porównuje Cię wyłącznie z Twoją własną oceną sprzed kilku minut. Nie jest wynikiem medycznym.</p>
            {awareness.driveLine && <p className="rx-medical">{awareness.driveLine}</p>}
          </section>
        )}

        {/* MAPA 168 — wizualny payoff z pięciu osi już liczonych z odpowiedzi. */}
        <section className="rx-beat rx-map-section" data-beat="map">
          <div className="rx-kick">Mapa 168</div>
          <div className="rx-map-head">
            <h2 className="rx-h2">Pięć obszarów, które składają się na Twój tydzień.</h2>
          </div>
          <div className="rx-map-visual">
            <div className="rx-radar-wrap" aria-hidden="true">
              <svg className="rx-radar" viewBox="0 0 220 220" role="img">
                {radarGrid.map((pts, i) => <polygon key={i} points={pts} className="rx-radar-grid" />)}
                {statuses.map((_, i) => { const a = -Math.PI / 2 + i * (Math.PI * 2 / statuses.length); return <line key={i} x1="110" y1="110" x2={110 + Math.cos(a) * 80} y2={110 + Math.sin(a) * 80} className="rx-radar-axis" />; })}
                <polygon points={radarPoints} className="rx-radar-data" />
              </svg>
              <div className="rx-radar-core"><span>MAPA</span><strong>168</strong></div>
            </div>
            <div className="rx-map">
              {/* klucz do odczytu calego wykresu wisial wczesniej przy naglowku, 8-10px i poza kartą.
                  Stoi tam, gdzie sie go potrzebuje: nad pierwszym paskiem. */}
              <p className="rx-map-key">Dłuższy pasek = mniej miejsca do poprawy.</p>
              {statuses.map((st) => (
                <div className="rx-axis" key={st.label}>
                  <div className="rx-axis-head"><span>{st.label}</span><div className="rx-axis-score"><em>{axisBand(st.score)}</em><strong>{st.score}</strong></div></div>
                  <div className="rx-axis-track" aria-label={`${st.label}: ${st.score} punktów na wspólnej osi pięciu obszarów, ${axisBand(st.score)}`}><div className="rx-axis-fill" style={{ width: `${st.score}%` }} /><span className="rx-axis-mid" aria-hidden="true" /></div>
                  <p className="rx-axis-reason">{st.reason}</p>
                </div>
              ))}
            </div>
          </div>
          {/* rx-map-readout wycialem: te same dwie etykiety z tymi samymi wartosciami stoja juz w hero,
              a tutaj siedzialy 60px pod paskami, ktore pokazuja to samo dokladniej. Czlowiek widzial
              identyczny kafelek drugi raz i to najmocniej odbieralo stronie powage. Hero zostaje,
              bo tam ten odczyt pada pierwszy raz i ma kontekst. */}
          <div className="rx-map-proof">
            <span>Jak czytać te liczby</span>
            <p>Każda liczba powstaje wyłącznie z odpowiedzi, które podałeś w tej diagnostyce. <strong>{weakestStatus?.score}/100</strong> na osi {weakestStatus?.label} bierze się stąd: {weakestStatus?.reason}.</p>
            <p>Ta liczba porównuje pięć obszarów wyłącznie między sobą. Nie jest procentem Twojej formy, procentem wykorzystanego potencjału ani wynikiem medycznym. Pod każdą osią masz odpowiedź, która najmocniej przesunęła liczbę.</p>
            {flagDriveCheck && <p className="rx-medical">Napęd i libido siedzą u Ciebie nisko. Jeśli trwa to dłużej niż kilka tygodni, warto zrobić badania i omówić wyniki z lekarzem. Ta diagnostyka opiera się na Twoich odpowiedziach i tego nie zastąpi.</p>}
          </div>
        </section>

        {/* EVIDENCE — skąd te wnioski wyszły. Zawsze PRZED nazwaniem Punktu Pęknięcia (V2.8). */}
        {evidenceReceipts.length > 0 && (
          <section className="rx-beat" data-beat="evidence">
            <div className="rx-kick">Skąd to wiem</div>
            <h2 className="rx-h2" style={{ fontSize: 'clamp(22px,4.6vw,32px)' }}>To są Twoje własne odpowiedzi, nie moja interpretacja.</h2>
            <div className="rx-receipts">
              {evidenceReceipts.map((r, i) => (<p key={i} className="rx-receipt">{r}</p>))}
            </div>
          </section>
        )}

        {/* PUNKT PĘKNIĘCIA — reveal PO dowodzie. Najpierw zjawisko, potem nazwa (V2.8). */}
        <section className="rx-beat" data-beat="fracture">
          <div className="rx-kick">Punkt Pęknięcia</div>
          <h2 className="rx-h2">{breakPhrase}</h2>
          <p className="rx-sub" style={{ marginBottom: 22 }}>Te odpowiedzi układają się w jeden wzorzec, który wraca co tydzień. Pierwszy moment, w którym się odpala, nazywam Punktem Pęknięcia. Od niego zaczynam, bo cała reszta tygodnia stoi na nim.</p>
          <div className="rx-breakviz">
            <div className="rx-breakviz-now">Pierwszy sygnał w odpowiedziach: <strong>{breakPos.label}</strong></div>
            <div className="rx-breakviz-line"><span style={{ left: `${breakPos.pct}%` }} /></div>
            {/* srodkowa etykieta stoi pod 50%, a bw_afternoon siada na 43%. Przy "po pracy" (62%)
                znacznik "po 14" ladowal wizualnie na cudzej etykiecie. Skala ma teraz trzy rowne przystanki dnia. */}
            <div className="rx-breakviz-scale"><span>rano</span><span>po południu</span><span>weekend</span></div>
          </div>
        </section>

        {/* BEAT 2 — PĘTLA 168: deterministyczny łańcuch z realnych odpowiedzi + istniejącej, zatwierdzonej treści archetypu */}
        <section className="rx-beat" data-beat="2">
          <div className="rx-kick">Pętla 168</div>
          <h2 className="rx-h2" style={{ fontSize: 'clamp(22px,4.6vw,32px)' }}>{loop.uncertain ? 'Te sygnały jeszcze nie składają się w jeden pewny ciąg.' : 'U Ciebie ten ciąg wygląda mniej więcej tak.'}</h2>
          <div className="rx-loop">
            {loop.nodes.map((node, i) => (
              <div key={i} className="rx-loop-node">
                <span className="rx-loop-label">{node.label}</span>
                <p>{node.text}</p>
                {i < loop.nodes.length - 1 && <span className="rx-loop-arrow" aria-hidden="true">↓</span>}
              </div>
            ))}
          </div>
          <p className="rx-pull" style={{ marginTop: 18 }}>Pierwsze miejsce do sprawdzenia: <strong>{breakPos.label}</strong>. Jeśli tam coś się ruszy, zobaczymy, czy {weakestStatus?.label.toLowerCase()} zaczyna trzymać lepiej.</p>
          {loop.uncertain && <p className="rx-uncertain">To jest hipoteza do sprawdzenia przez 72 godziny, nie pewnik. Dokładnie po to jest test niżej.</p>}
        </section>

        {/* BEAT 3 — DLACZEGO TO WRACA (tried_before / give_up_point / break_window, zero wymyslonej przyczyny) */}
        <section className="rx-beat" data-beat="3">
          {/* Kicker brzmial "Dlaczego to wraca" nad naglowkiem "Tu widac, dlaczego to wraca...".
              Zlota etykieta zuzywala sie na zapowiedz zdania, ktore pada pol sekundy pozniej. */}
          <div className="rx-kick">Mechanizm</div>
          <h2 className="rx-h2" style={{ fontSize: 'clamp(24px,4.6vw,36px)' }}>Tu widać, dlaczego to wraca w to samo miejsce.</h2>
          <p className="rx-sub">{whyRepeats}</p>
        </section>

        {/* BEAT 4 — REALNY KOSZT: wylacznie jawne fakty z odpowiedzi, max 3, zero zmyslonych rocznych kwot */}
        {(costFacts.length > 0 || userPain) && (
          <section className="rx-beat" data-beat="4">
            <div className="rx-kick">Co to już kosztuje</div>
            <h2 className="rx-h2" style={{ fontSize: 'clamp(22px,4.6vw,32px)' }}>Tyle to zabiera w zwykłym tygodniu.</h2>
            {costFacts.map((f, i) => (<p key={i} className="rx-costfact">{f}</p>))}
            {userPain && <p className="rx-quote">„{userPain}”</p>}
          </section>
        )}

        {/* BEAT 5 — JEDEN eksperyment 72h z banku 20. Zero LLM. Commit -> reveal osobistego momentu obserwacji. */}
        <section className="rx-beat" data-beat="5">
          <div className="rx-kick">Test na 72 godziny</div>
          <h2 className="rx-h2" style={{ fontSize: 'clamp(24px,5vw,38px)' }}>Sprawdźmy, czy to się potwierdza w Twoim tygodniu.</h2>
          <div className="rx-72line" aria-hidden="true"><span>0 h</span><i/><span>24 h</span><i/><span>48 h</span><i/><span>72 h</span></div>
          <div className="rx-exp">
            {/* Cztery identyczne karty czytaly sie jak lista rownorzednych polecen. Samo zadanie prowadzi,
                trzy parametry sa doprecyzowaniem i dostaja lzejszy, cichszy wiersz. */}
            <div className="rx-exp-row rx-exp-lead"><span className="rx-exp-k">{experiment.name}</span><p>{experiment.action}</p></div>
            <div className="rx-exp-row rx-exp-meta"><span className="rx-exp-k">Kiedy</span><p>{experiment.moment}</p></div>
            <div className="rx-exp-row rx-exp-meta"><span className="rx-exp-k">Obserwuj</span><p>{experiment.observe}</p></div>
            <div className="rx-exp-row rx-exp-meta"><span className="rx-exp-k">Przez te 3 dni nie ruszaj</span><p>{experiment.doNotChange}</p></div>
          </div>
          {!committed ? (
            <button className="rx-cta" onClick={commitExperiment} type="button">Robię ten test</button>
          ) : (
            <div className="rx-donemsg show">
              Dobra. Teraz patrz na jeden moment: {experiment.observe.toLowerCase()}.
              {' '}Jeżeli po trzech dniach ten sygnał się powtórzy, mamy lepszy argument, że właśnie tam warto grzebać dalej.
              Nie oceniaj testu po tym, czy cały tydzień był idealny.
            </div>
          )}
        </section>

        {/* HORYZONT (V2.8) — orientacja w czasie bez obietnic. Trzy okna: co sprawdzamy po 72h,
            co widać przez kolejne tygodnie, czego nie da się przyspieszyć. Zero dat, zero gwarancji. */}
        <section className="rx-beat" data-beat="horizon">
          <div className="rx-kick">Co i kiedy da się zobaczyć</div>
          <h2 className="rx-h2" style={{ fontSize: 'clamp(24px,4.8vw,36px)' }}>Na każdym z tych odcinków widać co innego.</h2>
          <div className="rx-horizon">
            <div className="rx-hz">
              <span className="rx-hz-k">72 godziny</span>
              {/* Trzecie powtorzenie experiment.observe na jednej stronie. Test wyzej mowi to doslownie,
                  demonstracja metody powtarza to w swoim kontekscie. Tutaj liczy sie tylko horyzont. */}
              <p>Na efekt jest wtedy dużo za wcześnie. Te trzy dni mają rozstrzygnąć jedno: czy trafiliśmy w miejsce.</p>
            </div>
            <div className="rx-hz">
              <span className="rx-hz-k">Najbliższe tygodnie</span>
              <p>Tu widać, czy {weakestStatus?.label.toLowerCase()} zaczyna trzymać także w gorszym tygodniu, a nie tylko w idealnym. Zmiana, która działa, przestaje wymagać pilnowania.</p>
            </div>
            <div className="rx-hz">
              <span className="rx-hz-k">Dłuższy horyzont</span>
              <p>Sylwetka, wyniki w treningu i rytm, który trzyma się sam, biorą się z wielu takich samych tygodni pod rząd. Ile ich potrzeba, zależy od tego, skąd startujesz i ile z tego dowieziesz. Daty tutaj nie podam, bo byłaby zmyślona.</p>
            </div>
          </div>
        </section>

        {/* BEAT 6 — DEMONSTRACJA METODY. Zero obietnicy darmowej analizy. Router: DM/NABOR/eksperyment wg intent x start_when. */}
        <section className="rx-beat" data-beat="6">
          <div className="rx-kick">Gdybym prowadził Cię 1:1</div>
          <div className="rx-human">
            <img src="/michal-portrait.jpg" alt="Michał" width={86} height={86} />
            <div className="rx-human-head">
              <span>MICHAŁ · METODA 168</span>
              <strong>Z tego wyniku da się już ustawić pierwszy ruch. W 1:1 sprawdzam go na Twoim zwykłym tygodniu i poprawiam po tym, co wychodzi przez kolejne dni.</strong>
            </div>
          </div>
          <h2 className="rx-h2" style={{ fontSize: 'clamp(23px,4.8vw,34px)' }}>Gdybym brał ten wynik do prowadzenia, zacząłbym tak.</h2>
          <p className="rx-method-lead">{repairLead}</p>
          <ol className="rx-demo">
            <li><span className="rx-demo-n">1</span><div><strong>Pierwszy punkt: {breakPos.label}</strong><p>Ustawiamy wersję minimum właśnie tutaj. Ma zadziałać też w dniu, w którym nic nie idzie po planie.</p></div></li>
            {/* experiment.name to kryptonim testu (wersaliki, część nazw w trybie rozkazującym), a observe jest w mianowniku.
                Oba wchodzą jako apozycja po "testu" / po dwukropku — "test to ODŁÓŻ NA JUTRO" i "patrzymy na liczba..."
                łamią gramatykę w całym banku 20 eksperymentów. */}
            <li><span className="rx-demo-n">2</span><div><strong>Sprawdzamy: {weakestStatus?.label}</strong><p>Na start dostajesz jedno zadanie na 72 godziny: {experiment.action} Obserwujemy: {experiment.observe.toLowerCase()}.</p></div></li>
            <li><span className="rx-demo-n">3</span><div><strong>Tego na start nie ruszam: {strongestStatus?.label}</strong><p>Zostawiam to bez zmian, żeby był punkt odniesienia. Wtedy widać, czy tydzień poprawia pierwszy ruch, czy coś zupełnie innego.</p></div></li>
            <li><span className="rx-demo-n">4</span><div><strong>Dokładam dopiero po dowodzie</strong><p>Kolejny element wchodzi wtedy, gdy pierwszy przeżyje gorszy tydzień. Jeśli nie przeżyje, zmieniam ruch, a nie dokładam Ci kolejnych zasad.</p></div></li>
          </ol>
          <div className="rx-expectation">
            <p>Jeśli myślisz o prowadzeniu, niżej masz następny krok.</p>
            <p>Nie każę Ci opisywać od nowa tego, co przed chwilą wypełniłeś. Ta diagnostyka jest już punktem wyjścia.</p>
          </div>

          <a className="rx-badge" style={{ marginTop: 16 }} href={GOOGLE_AGG.url} target="_blank" rel="noopener noreferrer">
            <span className="rx-g">G</span>
            <span className="rx-r">{GOOGLE_AGG.rating} <span style={{ color: C.gold }}>★★★★★</span><span style={{ color: C.mute, fontWeight: 400 }}> · {GOOGLE_AGG.count} opinii w Google</span></span>
          </a>
          <div className="rx-gcards">
            {GOOGLE_CARDS.slice(0, 1).map((r, i) => (
              <div key={i} className="rx-gcard">
                <div className="rx-gtop"><span style={{ color: C.gold, letterSpacing: 1 }}>★★★★★</span><span style={{ fontFamily: C.mono, fontSize: 10, color: C.faint }}>{r.name}</span></div>
                <p className="rx-gq">„{r.text}”</p>
              </div>
            ))}
          </div>
          {instagram && <p className="rx-fine">Mam ten wynik przypisany do @{instagram}. Nie musisz niczego wypełniać drugi raz.</p>}

          <div className="rx-final-action">
            <div className="rx-route-eyebrow">Zanim zamkniesz wynik</div>
            <div className="rx-ceiling">
              <p className="rx-ceiling-lead">{ceilingLead}</p>
              <p>{ceilingBody}</p>
              <p className="rx-ceiling-hit">{ceilingHit}</p>
            </div>
            {gaps.length > 0 && (
              <div className="rx-gaps">
                <p className="rx-gaps-lead">{gapsLead}</p>
                <ul>
                  {gaps.map((g) => (
                    <li key={g.label}><strong>{g.label}:</strong> {g.cost}</li>
                  ))}
                </ul>
              </div>
            )}
            <p className="rx-know">{knowledgeLine}</p>
            <h3>{route.primaryKicker}</h3>
            <p>{route.primaryNote}</p>
            {route.primary === 'nabor' ? (
              <>
                <p className="rx-invite">{naborInvite}</p>
                <a className="rx-next rx-next-strong" href={naborHref} target="_blank" rel="noopener noreferrer" onClick={onNaborClick}>{route.primaryLabel} →</a>
                {!committed && <button className="rx-route-alt" type="button" onClick={commitExperiment}>Nie teraz. Biorę test 72h</button>}
                {committed && <div className="rx-action-confirm">Test 72h zapisany ✓</div>}
              </>
            ) : (
              <>
                {!committed ? <button className="rx-next rx-next-strong" type="button" onClick={commitExperiment}>{route.primaryLabel}</button> : <div className="rx-action-confirm">Test 72h zapisany ✓</div>}
                {committed && !saved && <button className="rx-next rx-next-medium" type="button" onClick={shareSafe}>Zapisz wynik na te 72 godziny</button>}
                {committed && saved && <div className="rx-action-done">Wynik zapisany. Zostaje Ci jeden test.</div>}
                {route.secondaryNabor && <p className="rx-invite rx-invite-soft">{naborInviteSoft}</p>}
                {route.secondaryNabor && <a className="rx-route-alt" href={naborHref} target="_blank" rel="noopener noreferrer" onClick={onNaborClick}>{route.secondaryNabor.label} →</a>}
              </>
            )}
          </div>
        </section>

        {/* BEAT 7 — KALIBRACJA (bez zmian wartości) + bezpieczny Zapisz/Udostepnij */}
        <section className="rx-beat" data-beat="7">
          <div className="rx-kick">Doprecyzuj wynik</div>
          <h2 className="rx-h2" style={{ fontSize: 'clamp(22px,4.6vw,32px)', marginBottom: 12 }}>Co w tym wyniku najmniej do Ciebie pasuje?</h2>
          <p className="rx-sub" style={{ marginBottom: 20 }}>Jedno kliknięcie. Chcę wiedzieć, gdzie przestrzeliłem.</p>
          <div className="rx-calibwrap">
            {CALIB.map((c) => (
              <button key={c.id} className={'rx-cchip' + (calib === c.id ? ' on' : '')} onClick={() => sendCalib(c.id)}>{c.label}</button>
            ))}
          </div>
          {calib && <p className="rx-calibreply">{CALIB_REPLY[calib] || 'Dzięki. To pokazuje mi, gdzie wynik przestrzelił.'}</p>}
          <button className="rx-save" type="button" onClick={shareSafe}>{saved ? 'Zapisano ✓' : 'Zapisz / udostępnij wynik'}</button>


        </section>

      </div>
    </div>
  );
}

const css = `
.rx-atmo{position:fixed;inset:0;z-index:0;pointer-events:none;background:radial-gradient(1100px 640px at 50% -6%,${C.glow},transparent 60%),radial-gradient(820px 820px at 50% 118%,rgba(224,85,46,.06),transparent 55%)}
.rx-atmo::after{content:"";position:absolute;inset:0;opacity:.5;background-image:radial-gradient(rgba(255,255,255,.03) 1px,transparent 1px);background-size:3px 3px;mix-blend-mode:screen}
.rx-prog{position:fixed;top:0;left:0;height:6px;width:0;background-image:repeating-linear-gradient(90deg,${C.gold} 0 1px,transparent 1px 9px);border-right:1px solid ${C.gold};z-index:9}
.rx-wrap{position:relative;z-index:1;max-width:620px;margin:0 auto;padding:0 22px}
.rx * , .rx-wrap *{box-sizing:border-box}
.rx-beat{padding:74px 0;border-bottom:1px solid ${C.line};opacity:0;transform:translateY(24px);transition:opacity .7s cubic-bezier(.2,.6,.2,1),transform .7s cubic-bezier(.2,.6,.2,1)}
.rx-beat.in{opacity:1;transform:none}
.rx-beat:not(.rx-hero)>*{opacity:0;transform:translateY(10px);transition:opacity .62s cubic-bezier(.22,1,.36,1),transform .62s cubic-bezier(.22,1,.36,1)}
.rx-beat.in:not(.rx-hero)>*{opacity:1;transform:none}
.rx-beat.in>*:nth-child(2){transition-delay:80ms}.rx-beat.in>*:nth-child(3){transition-delay:160ms}.rx-beat.in>*:nth-child(4){transition-delay:240ms}.rx-beat.in>*:nth-child(n+5){transition-delay:320ms}
.rx-kick{font-family:${C.mono};font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${C.gold};font-weight:700;margin-bottom:20px;display:flex;align-items:center;gap:10px}
.rx-kick::before{content:"";width:22px;height:1px;background:${C.goldD}}
.rx-kick-c{justify-content:center}
.rx-h2{font-family:${C.serif};font-weight:400;line-height:1.08;letter-spacing:-.01em;color:${C.paper};margin:0 0 22px;font-size:clamp(28px,5.2vw,44px)}
.rx-sub{color:${C.mute};line-height:1.62;font-size:clamp(15px,2.1vw,17px)}
.rx-pull{font-family:${C.serif};font-style:italic;color:${C.gold};border-left:2px solid ${C.goldD};padding-left:18px;line-height:1.4;font-size:clamp(19px,4vw,24px);margin:0}
.rx-hero{position:relative;min-height:100svh;opacity:1;transform:none;display:flex;flex-direction:column;justify-content:center;text-align:center;align-items:center;padding:40px 0 max(112px,calc(env(safe-area-inset-bottom) + 92px))}
.rx-arch{font-family:${C.serif};font-weight:400;line-height:1.1;font-size:clamp(30px,7.4vw,52px);color:${C.gold};margin:0 0 16px;letter-spacing:-.01em;max-width:18ch}
/* To zdanie niesie caly wniosek otwarcia. W wersji mono 12px bylo najslabszym elementem bloku,
   czyli dowod czytal sie jak systemowa etykieta pod naglowkiem. Ma wage zdania, nie labelki. */
.rx-redline{font-family:${C.sans};font-size:clamp(15px,4.1vw,17px);line-height:1.5;color:${C.paper};margin:0 auto 22px;max-width:34ch}
.rx-hero-panel{position:relative;width:100%;max-width:560px;padding:30px 24px 26px;border:1px solid ${C.rule};background:linear-gradient(180deg,rgba(200,168,78,.04),rgba(8,8,10,.55) 60%)}
.rx-hero-panel::before,.rx-hero-panel::after{content:"";position:absolute;width:14px;height:14px;pointer-events:none;border-color:${C.gold};border-style:solid}.rx-hero-panel::before{left:-1px;top:-1px;border-width:1px 0 0 1px}
.rx-hero-panel::after{right:-1px;bottom:-1px;border-width:0 1px 1px 0}
.rx-hero-panel>*{position:relative;z-index:1}
.rx-hero-signature{display:flex;justify-content:center;align-items:flex-end;gap:7px;height:14px;margin:0 auto 18px}.rx-hero-signature span{display:block;width:1px;height:8px;background:${C.ruleS}}.rx-hero-signature span:nth-child(2){height:14px;background:${C.gold}}
.rx-breakviz{width:100%;margin:22px 0 0;padding:16px 0 4px;border-top:1px solid ${C.rule};text-align:left}.rx-breakviz-now{font-family:${C.mono};font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:${C.faint};margin-bottom:14px}.rx-breakviz-now strong{color:${C.goldB};font-weight:700}.rx-breakviz-line{position:relative;height:18px;background-image:repeating-linear-gradient(90deg,rgba(255,255,255,.16) 0 1px,transparent 1px 9px);background-size:100% 8px;background-repeat:no-repeat;background-position:0 100%;border-bottom:1px solid ${C.rule}}.rx-breakviz-line span{position:absolute;bottom:0;width:1px;height:26px;background:${C.gold};transform:translateX(-50%)}.rx-breakviz-line span::after{content:"";position:absolute;left:50%;top:-5px;width:7px;height:7px;background:${C.gold};transform:translateX(-50%) rotate(45deg)}.rx-breakviz-scale{display:flex;justify-content:space-between;margin-top:9px;font-family:${C.mono};font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:${C.faint}}
.rx-map-readout{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.rx-map-readout>div{padding:13px 15px;border:1px solid ${C.line};border-radius:12px;background:${C.pan2}}.rx-map-readout span{display:block;font-family:${C.mono};font-size:8px;letter-spacing:1.4px;text-transform:uppercase;color:${C.faint};margin-bottom:5px}.rx-map-readout strong{font-size:14px;color:${C.paper};line-height:1.3}
.rx-reserve{width:100%;margin:22px 0 0;display:grid;text-align:left;border-top:1px solid ${C.rule}}
.rx-reserve-row{position:relative;padding:15px 0 15px 20px;border-bottom:1px solid ${C.rule}}.rx-reserve-row::before{content:"";position:absolute;left:0;top:17px;width:1px;height:22px;background:${C.ruleS}}
.rx-reserve-row.rx-reserve-top::before{height:40px;background:${C.gold}}
.rx-reserve-row span{display:block;font-family:${C.mono};font-size:9px;letter-spacing:.22em;text-transform:uppercase;color:${C.faint};margin-bottom:6px}
.rx-reserve-row.rx-reserve-top span{color:${C.gold};font-weight:800}
.rx-reserve-row strong{display:block;font-size:16px;color:${C.paper};line-height:1.25;margin-bottom:5px}
.rx-reserve-row.rx-reserve-top strong{color:${C.goldB}}
.rx-reserve-row p{margin:0;font-size:12.5px;line-height:1.5;color:${C.mute}}
.rx-medical{margin-top:10px!important;padding-top:10px;border-top:1px solid ${C.line2};color:${C.mute}!important}
.rx-mirror-pair{display:grid;grid-template-columns:1fr 1fr;gap:0;margin:22px 0 18px;border:1px solid ${C.rule}}
.rx-mirror-cell{padding:20px 16px;text-align:center}.rx-mirror-cell+.rx-mirror-cell{border-left:1px solid ${C.rule}}
.rx-mirror-cell span{display:block;font-family:${C.mono};font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:${C.faint};margin-bottom:12px}
.rx-mirror-cell strong{display:block;font-family:${C.mono};font-weight:400;font-variant-numeric:tabular-nums;font-size:clamp(40px,11vw,60px);line-height:1;letter-spacing:-.02em;color:${C.paper}}
.rx-mirror-cell em{display:block;margin-top:9px;font-style:normal;font-size:11.5px;line-height:1.45;color:${C.mute}}
.rx-mirror-cell.rx-mirror-hot{background:linear-gradient(180deg,rgba(224,85,46,.08),transparent);box-shadow:inset 0 -2px 0 ${C.hot}}
.rx-mirror-cell.rx-mirror-hot span{color:${C.hot};font-weight:800}
.rx-mirror-cell.rx-mirror-hot strong{color:${C.hot}}
.rx-mirror-drivers{margin:16px 0 0;padding:0;list-style:none;display:grid;border-top:1px solid ${C.rule}}
.rx-mirror-drivers li{position:relative;padding:12px 0 12px 22px;border-bottom:1px solid ${C.rule};font-size:13.5px;line-height:1.5;color:${C.paper}}
.rx-mirror-drivers li::before{content:"";position:absolute;left:0;top:16px;width:10px;height:1px;background:${C.gold}}
.rx-mirror-stagnation{margin:16px 0 0;padding:14px 16px;border-left:2px solid ${C.gold};background:rgba(200,168,78,.06);font-size:14.5px;line-height:1.55;color:${C.goldB}}
.rx-mirror-note{margin:16px 0 0;font-size:11.5px;line-height:1.55;color:${C.faint}}
@media(max-width:380px){.rx-mirror-pair{grid-template-columns:1fr}.rx-mirror-cell+.rx-mirror-cell{border-left:0;border-top:1px solid ${C.rule}}}
.rx-horizon{display:grid;border-top:1px solid ${C.rule}}
.rx-hz{padding:16px 0 16px 20px;border-bottom:1px solid ${C.rule};position:relative}.rx-hz::before{content:"";position:absolute;left:0;top:19px;width:1px;height:18px;background:${C.ruleS}}
.rx-hz:first-child::before{height:36px;background:${C.gold}}
.rx-hz-k{display:block;font-family:${C.mono};font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${C.gold};font-weight:700;margin-bottom:8px}
.rx-hz p{margin:0;font-size:14.5px;line-height:1.55;color:${C.paper}}
.rx-hz:not(:first-child) p{color:${C.mute}}
.rx-receipts{margin-top:22px;display:grid;max-width:46ch;width:100%;border-top:1px solid ${C.rule};counter-reset:rc}
.rx-receipt{position:relative;color:${C.paper};line-height:1.5;font-size:14px;margin:0;padding:13px 0 13px 34px;border-bottom:1px solid ${C.rule};text-align:left;counter-increment:rc}.rx-receipt::before{content:counter(rc,decimal-leading-zero);position:absolute;left:0;top:15px;font-family:${C.mono};font-size:10px;letter-spacing:.1em;color:${C.gold}}
.rx-hero-sub{max-width:40ch;margin:0 auto}
.rx-cue{position:absolute;left:50%;bottom:max(34px,calc(env(safe-area-inset-bottom) + 22px));transform:translateX(-50%);display:inline-flex;align-items:center;justify-content:center;gap:12px;font-family:${C.mono};font-size:clamp(18px,4.6vw,22px);font-weight:700;line-height:1;letter-spacing:.28em;color:${C.goldB};text-transform:uppercase;white-space:nowrap;text-shadow:0 0 18px rgba(200,168,78,.18);opacity:.96}
.rx-cue-arrow{display:inline-block;font-size:1.4em;line-height:.7;letter-spacing:0;color:${C.gold};animation:rxbob 1.6s ease-in-out infinite}
@keyframes rxbob{0%,100%{transform:translateY(0);opacity:.72}50%{transform:translateY(7px);opacity:1}}
.rx-map-head{margin-bottom:22px}.rx-map-head .rx-h2{margin:0}
.rx-map-key{margin:0 0 14px;font-size:12.5px;letter-spacing:.2px;color:${C.mute}}
.rx-map-visual{display:grid;grid-template-columns:minmax(200px,.82fr) minmax(260px,1.18fr);gap:28px;align-items:center;padding:24px 0;border-top:1px solid ${C.rule};border-bottom:1px solid ${C.rule}}
.rx-radar-wrap{position:relative;min-height:220px;display:grid;place-items:center}.rx-radar{width:100%;max-width:240px}.rx-radar-grid{fill:none;stroke:rgba(236,231,219,.12);stroke-width:1}.rx-radar-axis{stroke:rgba(236,231,219,.08);stroke-width:1}.rx-radar-data{fill:rgba(200,168,78,.12);stroke:${C.gold};stroke-width:1.25;stroke-linejoin:miter}.rx-radar-core{position:absolute;display:grid;place-items:center;line-height:1;pointer-events:none}.rx-radar-core span{font-family:${C.mono};font-size:8px;letter-spacing:2px;color:${C.faint}}.rx-radar-core strong{font-family:${C.mono};font-size:20px;letter-spacing:.04em;color:${C.goldB};font-weight:400}
.rx-map{display:grid;gap:14px}.rx-axis-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:7px}.rx-axis-head span{font-size:13.5px;color:${C.paper};font-weight:650}.rx-axis-score{display:flex;align-items:baseline;gap:8px}.rx-axis-score em{font-family:${C.mono};font-style:normal;font-size:8px;letter-spacing:1px;text-transform:uppercase;color:${C.faint}}.rx-axis-score strong{font-family:${C.mono};font-size:14px;font-variant-numeric:tabular-nums;color:${C.goldB}}.rx-axis-reason{margin:7px 0 0;color:${C.faint};font-size:10.5px;line-height:1.42}.rx-axis-track{position:relative;height:10px;background-image:repeating-linear-gradient(90deg,rgba(255,255,255,.14) 0 1px,transparent 1px 7px)}.rx-axis-fill{height:100%;background-image:repeating-linear-gradient(90deg,${C.gold} 0 1px,transparent 1px 7px);border-right:1px solid ${C.goldB};transform-origin:left;transition:transform 1.1s cubic-bezier(.22,1,.36,1) .25s}.rx-beat:not(.in) .rx-axis-fill{transform:scaleX(0)}.rx-axis-mid{position:absolute;left:50%;top:-3px;bottom:-3px;width:1px;background:rgba(255,255,255,.28)}.rx-map-proof{margin:18px 0 0;padding:4px 0 4px 20px;border-left:1px solid ${C.ruleS}}.rx-map-proof>span{display:block;font-family:${C.mono};font-size:9px;letter-spacing:1.7px;text-transform:uppercase;color:${C.gold};font-weight:800;margin-bottom:9px}.rx-map-proof p{margin:0 0 8px;font-size:12.5px;line-height:1.55;color:${C.mute}}.rx-map-proof p:last-child{margin-bottom:0;color:${C.faint}}.rx-map-proof strong{color:${C.goldB}}
.rx-72line{display:flex;align-items:center;gap:8px;margin:0 0 18px;color:${C.goldB};font-family:${C.mono};font-size:10px;font-weight:700;letter-spacing:.14em}.rx-72line i{height:8px;flex:1;background-image:repeating-linear-gradient(90deg,${C.ruleS} 0 1px,transparent 1px 9px);border-bottom:1px solid ${C.rule};position:relative}.rx-72line i::after{content:"";position:absolute;right:0;bottom:-1px;width:1px;height:14px;background:${C.gold}}
.rx-ceiling{margin:2px 0 20px;padding:2px 0 2px 16px;border-left:2px solid ${C.goldD}}.rx-ceiling p{margin:0 0 9px;font-size:14.5px;line-height:1.6;color:${C.mute}}.rx-ceiling p:last-child{margin-bottom:0}.rx-ceiling p.rx-ceiling-lead{font-family:${C.serif};font-weight:400;font-size:clamp(22px,4.4vw,30px);line-height:1.14;color:${C.paper};margin-bottom:12px}.rx-ceiling p.rx-ceiling-hit{color:${C.goldB};font-weight:700;font-size:15.5px;line-height:1.5}
.rx-gaps{margin:0 0 18px}.rx-gaps .rx-gaps-lead{font-family:${C.mono};font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:${C.faint};margin:0 0 10px}.rx-gaps ul{list-style:none;margin:0;padding:0}.rx-gaps li{font-family:${C.sans};font-size:14.5px;line-height:1.55;color:${C.mute};padding:9px 0 9px 14px;border-left:1px solid ${C.goldD};margin-bottom:7px}.rx-gaps li:last-child{margin-bottom:0}.rx-gaps li strong{color:${C.paper};font-weight:600}
.rx-know{font-family:${C.sans};font-size:14px;line-height:1.7;color:${C.faint};margin:0 0 22px;padding:4px 0 4px 20px;border-left:1px solid ${C.rule}}
.rx-invite{font-family:${C.sans};font-size:15.5px;line-height:1.68;color:${C.paper};margin:0 0 16px}.rx-invite.rx-invite-soft{font-size:14.5px;color:${C.mute};margin-top:18px}
.rx-final-action{position:relative;margin-top:34px;padding:24px 22px;border:1px solid ${C.rule};background:linear-gradient(180deg,rgba(200,168,78,.05),transparent 70%)}.rx-final-action::before,.rx-route-card::before{content:"";position:absolute;left:-1px;top:-1px;width:14px;height:14px;border-top:1px solid ${C.gold};border-left:1px solid ${C.gold};pointer-events:none}.rx-final-action h3{font-family:${C.serif};font-size:clamp(25px,5vw,36px);line-height:1.05;font-weight:400;color:${C.paper};margin:8px 0 10px}.rx-final-action>p{color:${C.mute};font-size:14.5px;line-height:1.55;margin:0 0 18px}.rx-action-confirm{text-align:center;padding:16px;border-top:1px solid ${C.ruleS};border-bottom:1px solid ${C.ruleS};color:${C.goldB};font-family:${C.mono};font-size:12px;letter-spacing:.16em;text-transform:uppercase;font-weight:700;margin-bottom:10px}.rx-action-done{text-align:center;color:${C.mute};font-size:13px;line-height:1.5;padding:6px 8px 2px}
.rx-route-card{position:relative;margin-top:30px;padding:26px 24px;border:1px solid ${C.ruleS};background:linear-gradient(180deg,rgba(200,168,78,.06),transparent 70%)}.rx-route-eyebrow{font-family:${C.mono};font-size:10px;letter-spacing:2.4px;text-transform:uppercase;color:${C.gold};font-weight:800;margin-bottom:10px}.rx-route-card h3{font-family:${C.serif};font-weight:400;font-size:clamp(25px,4.8vw,34px);line-height:1.08;margin:0 0 12px;color:${C.paper}}.rx-route-card>p{font-size:14.5px;line-height:1.58;color:${C.mute};margin:0 0 20px}.rx-route-alt{display:block;width:100%;text-align:center;text-decoration:none;background:transparent;border:0;color:${C.mute};font-size:13px;font-weight:650;padding:9px 8px;cursor:pointer}.rx-route-alt:hover{color:${C.goldB}}
.rx-quote{font-family:${C.serif};font-style:italic;font-size:clamp(19px,4vw,24px);color:${C.paper};line-height:1.34;border-left:2px solid ${C.goldD};padding-left:18px;margin:14px 0 0}
.rx-cta{display:block;width:100%;text-align:center;text-decoration:none;font-weight:800;font-size:17px;color:${C.ink};background:linear-gradient(135deg,${C.gold},${C.goldB});padding:20px 26px;border-radius:16px;margin:0 0 12px;border:none;cursor:pointer;box-shadow:0 0 0 1px rgba(200,168,78,.35),0 22px 60px -18px rgba(200,168,78,.5);transition:transform .18s,box-shadow .18s}
.rx-cta:hover{transform:translateY(-2px);box-shadow:0 0 0 1px rgba(200,168,78,.5),0 28px 74px -16px rgba(200,168,78,.62)}
.rx-fine{font-family:${C.mono};font-size:11px;letter-spacing:.5px;color:${C.faint};text-align:center;margin:16px 0 0;line-height:1.5}
.rx-badge{display:flex;align-items:center;gap:10px;text-decoration:none;background:${C.pan2};border:1px solid ${C.line2};border-radius:12px;padding:12px 15px}
.rx-g{font-family:${C.sans};font-weight:800;font-size:18px;color:#4285F4;line-height:1}
.rx-r{font-size:14px;color:${C.paper};font-weight:700}
.rx-gcards{display:grid;gap:10px;margin-top:10px}
.rx-gcard{border-top:1px solid ${C.rule};padding:13px 0}
.rx-gtop{display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-bottom:6px;font-size:12px}
.rx-gq{font-family:${C.serif};font-style:italic;color:${C.paper};line-height:1.42;margin:0;font-size:15px}
.rx-exp{display:grid;margin:0 0 22px;border-top:1px solid ${C.rule}}
.rx-exp-row{border-bottom:1px solid ${C.rule};padding:16px 0}
.rx-exp-k{display:block;font-family:${C.mono};font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${C.gold};font-weight:700;margin-bottom:8px}
.rx-exp-row p{margin:0;font-size:15px;color:${C.paper};line-height:1.55}
.rx-exp-lead{padding:18px 0 18px 20px;position:relative}.rx-exp-lead::before{content:"";position:absolute;left:0;top:20px;bottom:20px;width:1px;background:${C.gold}}
.rx-exp-lead p{font-size:16.5px;line-height:1.5}
.rx-exp-meta{padding:11px 0}
.rx-exp-meta .rx-exp-k{color:${C.faint};font-weight:600;letter-spacing:1.4px;margin-bottom:4px}
.rx-exp-meta p{font-size:14px;color:${C.mute}}
.rx-donemsg{font-family:${C.serif};font-style:italic;font-size:18px;color:${C.gold};text-align:left;line-height:1.4;border-top:1px solid ${C.ruleS};border-bottom:1px solid ${C.ruleS};padding:18px 0}
.rx-loop{display:grid;gap:0;margin:0 0 8px;position:relative;counter-reset:loop}.rx-loop::before{content:"";position:absolute;left:14px;top:10px;bottom:24px;width:1px;background:linear-gradient(${C.gold},${C.rule})}
.rx-loop-node{padding:6px 0 22px 48px;position:relative;counter-increment:loop;z-index:1}.rx-loop-node::before{content:counter(loop,decimal-leading-zero);position:absolute;left:0;top:4px;width:29px;height:20px;display:grid;place-items:center;background:${C.ink};border:1px solid ${C.ruleS};font-family:${C.mono};font-size:9px;letter-spacing:.06em;color:${C.goldB}}
.rx-loop-label{display:block;font-family:${C.mono};font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${C.gold};font-weight:700;margin-bottom:6px}
.rx-loop-node p{margin:0;font-size:14.5px;color:${C.paper};line-height:1.55}
.rx-loop-arrow{display:none}
.rx-uncertain{font-family:${C.mono};font-size:12px;color:${C.faint};margin-top:14px;line-height:1.5}
.rx-costfact{color:${C.paper};font-size:15px;line-height:1.6;margin:0 0 10px;padding-left:14px;border-left:2px solid ${C.goldD}}
.rx-human{display:grid;grid-template-columns:86px 1fr;gap:14px;align-items:center;border-top:1px solid ${C.rule};border-bottom:1px solid ${C.rule};padding:16px 0;margin:0 0 22px}.rx-human img{width:86px;height:86px;border-radius:0;object-fit:cover;object-position:center;border:1px solid ${C.ruleS};filter:grayscale(.25) contrast(1.05)}.rx-human-head span{display:block;font-family:${C.mono};font-size:10px;letter-spacing:2px;color:${C.gold};font-weight:800;margin-bottom:6px}.rx-human-head strong{display:block;font-size:15px;line-height:1.42;color:${C.paper};font-weight:750}@media(max-width:380px){.rx-human{grid-template-columns:70px 1fr}.rx-human img{width:70px;height:70px}}
.rx-method-lead{margin:-4px 0 20px;padding:4px 0 4px 20px;border-left:1px solid ${C.gold};color:${C.paper};font-size:14.5px;line-height:1.58}.rx-demo{list-style:none;margin:0 0 22px;padding:0;display:grid;border-top:1px solid ${C.rule}}
.rx-demo li{display:flex;gap:16px;align-items:flex-start;color:${C.paper};font-size:15px;line-height:1.58;border-bottom:1px solid ${C.rule};padding:15px 0}.rx-demo li>div{min-width:0}.rx-demo li strong{display:block;color:${C.goldB};font-size:14.5px;margin-bottom:4px}.rx-demo li p{margin:0;color:${C.mute};font-size:13.5px;line-height:1.55}
.rx-demo-n{flex-shrink:0;width:28px;padding-top:3px;color:${C.gold};font-family:${C.mono};font-weight:400;font-size:11px;letter-spacing:.08em;font-variant-numeric:tabular-nums}
.rx-expectation{border-top:1px solid ${C.ruleS};border-bottom:1px solid ${C.ruleS};padding:18px 0;margin:0 0 8px}
.rx-expectation p{margin:0 0 10px;font-size:14.5px;color:${C.mute};line-height:1.6}
.rx-expectation p:last-child{margin-bottom:0;color:${C.paper}}
.rx-next{display:block;text-align:center;text-decoration:none;border-radius:14px;padding:17px 22px;transition:transform .18s,box-shadow .18s,background .18s,border-color .18s;margin:0 0 10px}
.rx-next-strong{color:${C.ink};background:linear-gradient(135deg,${C.gold},${C.goldB});font-weight:800;font-size:17px;box-shadow:0 0 0 1px rgba(200,168,78,.35),0 22px 60px -18px rgba(200,168,78,.5)}
.rx-next-strong:hover{transform:translateY(-2px);box-shadow:0 0 0 1px rgba(200,168,78,.5),0 28px 74px -16px rgba(200,168,78,.62)}
.rx-next-medium{color:${C.goldB};background:transparent;border:1px solid ${C.goldD};font-weight:700;font-size:15px}
.rx-next-medium:hover{background:rgba(200,168,78,.08);border-color:${C.gold};color:${C.paper}}
.rx-next-soft{color:${C.mute};background:transparent;border:1px solid ${C.line2};font-weight:600;font-size:14px}
.rx-next-soft:hover{color:${C.gold};border-color:${C.goldD}}
.rx-calibwrap{display:flex;flex-wrap:wrap;gap:10px}
.rx-cchip{font-family:${C.sans};font-size:14px;color:${C.mute};background:transparent;border:1px solid ${C.line2};border-radius:0;padding:10px 16px;cursor:pointer;transition:border-color .18s,color .18s,background .18s}
.rx-cchip:hover{border-color:${C.goldD};color:${C.paper}}
.rx-cchip.on{background:rgba(200,168,78,.1);color:${C.goldB};border-color:${C.gold};font-weight:700}
.rx-calibreply{font-family:${C.sans};font-size:15px;line-height:1.65;color:${C.mute};text-align:left;margin:18px 0 0;padding-left:14px;border-left:2px solid ${C.goldD}}
.rx-save{margin-top:22px;font-family:${C.mono};font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:${C.mute};background:transparent;border:0;border-bottom:1px solid ${C.ruleS};border-radius:0;padding:10px 0;cursor:pointer;transition:color .18s,border-color .18s}
.rx-save:hover{border-color:${C.gold};color:${C.goldB}}
.rx-hotcta{position:fixed;left:16px;right:16px;bottom:max(14px,env(safe-area-inset-bottom));z-index:8;display:block;text-align:center;text-decoration:none;font-weight:800;font-size:15px;color:${C.ink};background:linear-gradient(135deg,${C.gold},${C.goldB});padding:15px 18px;border-radius:14px;box-shadow:0 12px 34px -10px rgba(200,168,78,.55);max-width:588px;margin:0 auto}
@media(max-width:640px){.rx-wrap{padding:0 18px}.rx-map-readout{grid-template-columns:1fr}.rx-map-visual{grid-template-columns:1fr;padding:20px 0;gap:16px}.rx-radar-wrap{min-height:190px}.rx-radar{max-width:210px}.rx-route-card{padding:22px 18px}.rx-72line{gap:6px;font-size:9px}.rx-hero{padding-top:26px;padding-bottom:max(106px,calc(env(safe-area-inset-bottom) + 86px))}.rx-hero-panel{padding:24px 18px 22px}.rx-arch{font-size:clamp(31px,9vw,44px)}.rx-receipts{grid-template-columns:1fr}.rx-cue{bottom:max(26px,calc(env(safe-area-inset-bottom) + 16px))}}
/* Hero trzymal 100svh z trescia wysrodkowana w pionie, a .rx-cue wisialo absolutnie przy dolnej krawedzi
   okna. Na telefonie okno jest niskie, wiec panel i strzalka stoja obok siebie. Na desktopie miedzy nimi
   otwieralo sie ~200px pustki i kafelek czytal sie tak, jakby cos z niego wycieto. Na szerokim ekranie
   hero dostaje wysokosc od wlasnej tresci, a strzalka wraca do normalnego przeplywu. Mobile bez zmian. */
@media(min-width:721px){.rx-hero{min-height:auto;padding-bottom:72px}.rx-cue{position:static;transform:none;margin-top:34px}}
@media(prefers-reduced-motion:reduce){.rx-beat,.rx-beat:not(.rx-hero)>*{opacity:1;transform:none;transition:none}.rx-beat:not(.in) .rx-axis-fill{transform:none}.rx-axis-fill{transition:none}.rx-cue-arrow{animation:none}}
`;
