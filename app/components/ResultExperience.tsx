'use client';

// ── STRONA WYNIKU jako PRZEŻYCIE (7 beatów, v2.5) ──
// 1 WERDYKT (nazwa archetypu + siła wzorca, ZERO %) -> 2 PUNKT PĘKNIĘCIA (uczciwa rozdzielczość czasu)
// -> 3 MECHANIZM + KOSZT (koszt tylko z realnych odpowiedzi) -> 4 CO JA Z TEGO CZYTAM + PIERWSZY RUCH + HAND-RAISER
// (PRZED protokołem, zero hostage value) -> 5 PROTOKÓŁ 7 DNI -> 6 CO DALEJ (intent bridge / tier A override)
// -> 7 MIKRO-KALIBRACJA. Truth gate: zero zmyślonych godzin, zero „% Twojej formy", zero słów w usta usera.
import { useEffect, useRef, useState } from 'react';
import type { ResultPack, Experiment } from '../lib/result-content';
import { type PatternStrength } from '../lib/diagnostic-core';
import { GOOGLE_AGG, GOOGLE_CARDS } from '../lib/google-reviews';
import { trackDiag } from '../lib/analytics';
import HeroVideo, { type HeroVideoConfig } from './HeroVideo';

const C = {
  ink: '#08080a', pan: '#141416', pan2: '#1a1a1d', line: '#26262b', line2: '#33333a',
  gold: '#c8a84e', goldB: '#e8cc80', goldD: '#8a7535', glow: 'rgba(200,168,78,.16)',
  paper: '#ece7db', mute: '#a49e92', faint: '#8f887c', hot: '#e0552e',
  mono: "'JetBrains Mono', ui-monospace, monospace", serif: "'Instrument Serif', Georgia, serif", sans: "'Inter', system-ui, sans-serif",
};

// uczciwa rozdzielczość pęknięcia — WYŁĄCZNIE bucket, który user podał (zero zmyślonej godziny)
const BREAK_PHRASE: Record<string, string> = {
  bw_morning: 'Najwcześniej zaczyna się już rano, zaraz po przebudzeniu.',
  bw_midday: 'Najwcześniejszy moment to przedpołudnie, jeszcze przed obiadem.',
  bw_afternoon: 'Najwcześniejszy moment to popołudnie, gdzieś po czternastej.',
  bw_afterwork: 'Najwięcej dzieje się w przejściu z pracy do reszty dnia.',
  bw_evening: 'Najbardziej podejrzane jest okno wieczorem.',
  bw_weekend: 'Najwięcej zaczyna się sypać dopiero przy wejściu w weekend.',
  bw_varies: 'Nie widać u Ciebie jednego ostrego momentu. Wzorzec rozkłada się po całym tygodniu.',
};

export default function ResultExperience({
  pack, tier = 'C', cytat, imie, instagram, ctaHref = 'https://nabor.talerzihantle.com/', wantsHelp = false, heroVideo, intent = '', startWhen = '',
  archLabel = '', archKey = '', strength = 'clear', redCount = 0, breakId = '', mondayId = '', evidence = [], experiment, firstMove, endLine,
}: {
  pack: ResultPack; tier?: 'A' | 'B' | 'C'; cytat?: string; imie?: string; instagram?: string; ctaHref?: string; wantsHelp?: boolean; heroVideo?: HeroVideoConfig; intent?: string; startWhen?: string;
  archLabel?: string; archKey?: string; strength?: PatternStrength; redCount?: number; breakId?: string; mondayId?: string; evidence?: string[]; experiment?: Experiment; firstMove?: string; endLine?: string;
}) {
  const progRef = useRef<HTMLDivElement>(null);
  const exp = experiment || pack.experiment; // Beat 5: eksperyment (silnik dynamiczny z page.tsx)
  // P1-5: kontrakt czasu z obiektu eksperymentu. Domyślnie 7 dni; testy weekendowe/odchyleniowe nadpisują.
  const durLabel = exp.durationLabel ?? '7 dni';
  const afterLabel = exp.afterLabel ?? 'Po 7 dniach szukasz';
  const fm = firstMove || pack.firstMove;    // Beat 4 teaser tego samego eksperymentu (silnik dynamiczny)
  const el = endLine || pack.endLine;        // Beat 7 linia continuity (silnik dynamiczny)
  const [calib, setCalib] = useState<string>('');
  const [submissionId] = useState<string>(() => { try { return typeof window !== 'undefined' ? (localStorage.getItem('diagnostyka_v2_submission_id') || '') : ''; } catch { return ''; } });
  const CALIB = [
    { id: 'sen', label: 'Sen' }, { id: 'energia', label: 'Energia i głowa' }, { id: 'jedzenie', label: 'Jedzenie' },
    { id: 'ruch', label: 'Ruch' }, { id: 'weekend', label: 'Weekend' }, { id: 'naped', label: 'Napęd i libido' }, { id: 'ok', label: 'Wszystko pasuje' },
  ];
  const sendCalib = (id: string) => {
    setCalib(id);
    try {
      fetch('/api/diag-event', { method: 'POST', headers: { 'content-type': 'application/json' }, keepalive: true, body: JSON.stringify({ submission_id: submissionId, q_id: 'calibration', value: id, tier, ts: Date.now() }) }).catch(() => {});
    } catch (_e) {}
    trackDiag('calibration_answer', { tier, id });
  };

  useEffect(() => {
    trackDiag('result_view', { tier, strength, arch: archLabel });
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        const b = (e.target as HTMLElement).dataset.beat;
        if (b) trackDiag('result_beat_view', { beat: b });
        if (b === '7') trackDiag('bridge_view', { archetype: archKey, tier, intent }); // raz na realny view (IO unobserve)
        io.unobserve(e.target);
      }
    }), { threshold: 0.16 });
    document.querySelectorAll('.rx-beat').forEach((b) => io.observe(b));
    const onScroll = () => { const h = document.documentElement; const p = h.scrollTop / (h.scrollHeight - h.clientHeight || 1); if (progRef.current) progRef.current.style.width = (p * 100) + '%'; };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { io.disconnect(); window.removeEventListener('scroll', onScroll); };
  }, [tier, strength, archLabel, archKey, intent]);

  // hand-raiser -> DM z gotowym prefillem (brzmi jak wiadomość człowieka, nie formularz)
  const DM_HANDLE = 'hantleitalerz';
  const dmMsg = `hej, zrobiłem Diagnostykę 168. wyszedł mi ${pack.ppTag}. możesz zerknąć na mój wynik i powiedzieć, od czego ty byś zaczął?`;
  const dmHref = `https://ig.me/m/${DM_HANDLE}?text=${encodeURIComponent(dmMsg)}`;

  // BEAT 1: kierunek z redCount (NIE severity/patternStrength — to globalny wynik, nie confidence archetypu)
  const redLine = redCount >= 2
    ? `${redCount} ${redCount <= 4 ? 'obszary' : 'obszarów'} w Twoich odpowiedziach ${redCount <= 4 ? 'wskazują' : 'wskazuje'} ten sam kierunek.`
    : redCount === 1 ? 'Najmocniejszy sygnał pojawia się w jednym obszarze.' : '';

  // BEAT 2: uczciwy nagłówek pęknięcia z bucketu usera
  const breakPhrase = BREAK_PHRASE[breakId] || 'Twój tydzień nie ma jednego wyraźnego momentu, w którym pęka.';
  const breakFollowup = breakId === 'bw_varies'
    ? 'Tu ważniejszy jest powtarzający się układ kilku odpowiedzi. Za chwilę zobaczysz, które sygnały wracają obok siebie.'
    : 'To najwcześniejszy moment, który zaznaczyłeś. Za chwilę zobaczysz, które z pozostałych odpowiedzi układają się z nim w ten sam kierunek.';

  // BEAT 3: koszt 2. rzędu TYLKO z realnej odpowiedzi monday_recovery (wtorek/środa)
  const costTail =
    mondayId === 'mon_1' ? ' Weekend zabiera Ci jeszcze kawałek poniedziałku.' :
    mondayId === 'mon_2' ? ' Weekend kończy się w niedzielę, ale u Ciebie jego ogon wchodzi jeszcze w poniedziałek.' :
    mondayId === 'mon_3' ? ' Weekend kończy się w niedzielę, a u Ciebie jego ogon potrafi wejść jeszcze w poniedziałek i wtorek.' : '';

  // BEAT 8: wynik wybiera JEDEN sensowny kolejny krok. Severity nie może obniżać jawnej intencji zakupu.
  type NextStep = { kicker: string; h2: string; body: string; cta: string; variant: 'strong' | 'medium' | 'soft'; route: 'dm' | 'nabor' };
  const fastLane = intent === 'in_prowadz' && (startWhen === 'sw_7dni' || startWhen === 'sw_30dni');
  const nextStep: NextStep = fastLane ? {
    kicker: 'Napisałeś, że wolisz prowadzenie',
    h2: 'Masz już wynik. Teraz sprawdzamy fit i zakres.',
    body: 'Wiadomość jest gotowa. Po niej sprawdzę ten wynik i powiem Ci, jaki zakres widzę u Ciebie oraz od czego warto ruszyć.',
    cta: 'Wyślij wynik i sprawdź fit →', variant: 'strong', route: 'dm',
  } : intent === 'in_prowadz' ? {
    kicker: 'Napisałeś, że wolisz prowadzenie',
    h2: 'Zobacz, jak wygląda praca po takim wyniku.',
    body: 'Na stronie prowadzenia zobaczysz rytm pracy, zakres oraz wejście krok po kroku.',
    cta: 'Zobacz prowadzenie →', variant: 'strong', route: 'nabor',
  } : intent === 'in_zobacz' ? {
    kicker: 'Chciałeś zobaczyć, jak wygląda praca z kimś',
    h2: 'Masz już próbkę. Teraz zobacz cały proces.',
    body: 'Zobaczysz, co dzieje się z takim wynikiem w kolejnych tygodniach oraz jak wygląda wejście.',
    cta: 'Zobacz cały proces →', variant: 'medium', route: 'nabor',
  } : intent === 'in_sam' ? {
    kicker: 'Chcesz najpierw ograć to sam',
    h2: `Zrób test. Wróć do wyniku za ${durLabel}.`,
    body: 'Jeśli dalej będziesz wracał do tego samego miejsca, będziesz już wiedział, z czym do mnie przychodzisz.',
    cta: 'Zobacz prowadzenie na później →', variant: 'soft', route: 'nabor',
  } : tier === 'A' ? {
    kicker: 'Ten wynik daje Ci pierwszy ruch',
    h2: `Sprawdź go przez ${durLabel}.`,
    body: 'Na razie zacząłbym właśnie od tego testu. Stronę prowadzenia możesz zobaczyć na później.',
    cta: 'Zobacz na później →', variant: 'soft', route: 'nabor',
  } : {
    kicker: 'Na dziś masz pierwszy ruch',
    h2: 'Zrób test. Potem zobacz, co faktycznie się zmieniło.',
    body: 'Jeśli chcesz już teraz sprawdzić, jak wygląda praca po takim wyniku, cały proces masz tutaj.',
    cta: 'Zobacz cały proces →', variant: 'medium', route: 'nabor',
  };
  const nextHref = nextStep.route === 'dm' ? dmHref : ctaHref;

  return (
    <div className="rx" style={{ background: C.ink, color: C.paper, fontFamily: C.sans, minHeight: '100vh', overflowX: 'hidden', position: 'relative' }}>
      <style>{css}</style>
      <div className="rx-atmo" aria-hidden />
      <div className="rx-prog" ref={progRef} aria-hidden />
      <div className="rx-wrap">

        {/* BEAT 1 — WERDYKT (nazwa archetypu + siła wzorca, ZERO %) */}
        <section className="rx-beat rx-hero" data-beat="1">
          <div className="rx-kick rx-kick-c">Twój wynik{imie?.trim() ? ` · ${imie.trim()}` : ''}</div>
          <h1 className="rx-arch">{archLabel || 'Twój tydzień'}</h1>
          {redLine && <div className="rx-redline">{redLine}</div>}
          <p className="rx-sub rx-hero-sub">{pack.beat1Line}</p>
          <div className="rx-cue" aria-hidden="true">
            <span className="rx-cue-arrow">↓</span>
            <span>SCROLLUJ</span>
          </div>
        </section>

        {/* BEAT 2 — PUNKT PĘKNIĘCIA (uczciwa rozdzielczość czasu) */}
        <section className="rx-beat" data-beat="2">
          <div className="rx-kick">Punkt pęknięcia</div>
          <h2 className="rx-h2">{breakPhrase}</h2>
          <p className="rx-sub">{breakFollowup}</p>
        </section>

        {/* BEAT 3 — MECHANIZM + KOSZT (koszt tylko z realnych odpowiedzi) */}
        <section className="rx-beat" data-beat="3">
          <div className="rx-kick">Co tu się dzieje</div>
          <h2 className="rx-h2" style={{ fontSize: 'clamp(24px,4.6vw,36px)' }}>{pack.mechHeadline}</h2>
          <p className="rx-sub" style={{ marginBottom: evidence.length ? 14 : 22 }}>{pack.mechBody}{costTail}</p>
          {evidence.map((line, i) => (<p key={i} className="rx-evidence">{line}</p>))}
          <p className="rx-pull" style={{ marginTop: evidence.length ? 20 : 0 }}>{pack.mechPull}</p>
        </section>

        {/* BEAT 4 — CO JA Z TEGO CZYTAM + PIERWSZY RUCH + HAND-RAISER (PRZED protokołem) */}
        <section className="rx-beat" data-beat="4">
          <div className="rx-kick">Co ja z tego czytam</div>
          {cytat && <p className="rx-quote">„{cytat}”</p>}
          <h2 className="rx-h2" style={{ fontSize: 'clamp(24px,5vw,38px)', marginBottom: 18 }}>{pack.ppHeadline}</h2>
          <p className="rx-sub" style={{ marginBottom: 22 }}>{pack.ppReveal}</p>

          <p className="rx-b4teaser">{fm}</p>

          {heroVideo && <HeroVideo {...heroVideo} />}

          <div className="rx-raise">
            <p className="rx-raise-q">Chcesz, żebym spojrzał na cały wynik i powiedział Ci, co sprawdziłbym u Ciebie jako pierwsze?</p>
          </div>

          <a className="rx-cta" href={dmHref} target="_blank" rel="noopener noreferrer" onClick={() => trackDiag('handraiser_click', { tier, wants_help: wantsHelp, arch: archLabel })}>
            Tak, rzuć okiem na mój wynik →
          </a>
          <p className="rx-fine" style={{ margin: '0 0 6px' }}>Piszesz do mnie na Instagramie, wiadomość jest już gotowa, wystarczy ją wysłać.</p>
          <p className="rx-selfserve">Wolisz najpierw ogarnąć to sam? Niżej masz cały test na {durLabel}.</p>

          <a className="rx-badge" style={{ marginTop: 18 }} href={GOOGLE_AGG.url} target="_blank" rel="noopener noreferrer" onClick={() => trackDiag('diag_google_click', { wants_help: wantsHelp })}>
            <span className="rx-g">G</span>
            <span className="rx-r">{GOOGLE_AGG.rating} <span style={{ color: C.gold }}>★★★★★</span><span style={{ color: C.mute, fontWeight: 400 }}> · {GOOGLE_AGG.count} opinii w Google</span></span>
          </a>
          <div className="rx-gcards">
            {GOOGLE_CARDS.slice(0, 2).map((r, i) => (
              <div key={i} className="rx-gcard">
                <div className="rx-gtop"><span style={{ color: C.gold, letterSpacing: 1 }}>★★★★★</span><span style={{ fontFamily: C.mono, fontSize: 10, color: C.faint }}>{r.name}</span></div>
                <p className="rx-gq">„{r.text}”</p>
              </div>
            ))}
          </div>
        </section>

        {/* BEAT 5 — TEST NA 7 DNI (statyczna karta do screena, ZERO trackera/checkboxow/progress) */}
        <section className="rx-beat" data-beat="5">
          <div className="rx-kick">Test na {durLabel}</div>
          <h2 className="rx-h2" style={{ fontSize: 'clamp(24px,5vw,38px)' }}>{exp.headline}</h2>
          <div className="rx-exp">
            <div className="rx-exp-row"><span className="rx-exp-k">Kiedy</span><p>{exp.when}</p></div>
            <div className="rx-exp-row"><span className="rx-exp-k">{exp.doLabel}</span><p>{exp.doCheck}</p></div>
            <div className="rx-exp-row"><span className="rx-exp-k">{afterLabel}</span><p>{exp.lookFor}</p></div>
          </div>
          <div className="rx-exp-guard">
            <span className="rx-exp-k">Żeby test był czytelny</span>
            <ul className="rx-exp-ul"><li>nie zmieniaj równolegle pięciu innych rzeczy</li><li>rób pomiar mniej więcej w tym samym momencie</li></ul>
          </div>
          {exp.example && <div className="rx-exp-ex"><span className="rx-exp-exk">przykład wpisu</span><code>{exp.example}</code></div>}
          <p className="rx-fine" style={{ textAlign: 'left', margin: '16px 0 0' }}>Najprościej zapisz jedną linijkę dziennie w Notatkach w telefonie.</p>
        </section>

        {/* BEAT 6 — MIKRO-KALIBRACJA (krótka; karmi jakość danych, NIE ostatnia rzecz emocjonalna) */}
        <section className="rx-beat" data-beat="6">
          <div className="rx-kick">Doprecyzuj wynik</div>
          <h2 className="rx-h2" style={{ fontSize: 'clamp(22px,4.6vw,32px)', marginBottom: 12 }}>Gdzie wynik najmniej do Ciebie pasuje?</h2>
          <p className="rx-sub" style={{ marginBottom: 20 }}>Jedno kliknięcie. Chcę wiedzieć, gdzie przestrzeliłem.</p>
          <div className="rx-calibwrap">
            {CALIB.map((c) => (
              <button key={c.id} className={'rx-cchip' + (calib === c.id ? ' on' : '')} onClick={() => sendCalib(c.id)}>{c.label}</button>
            ))}
          </div>
          {calib && <p className="rx-fine" style={{ textAlign: 'left', marginTop: 16 }}>Dzięki. To pokazuje mi, gdzie wynik przestrzelił.</p>}
        </section>

        {/* BEAT 7 — END EXPERIENCE (najważniejszy bridge: „to samo robię co 7 dni w prowadzeniu") */}
        <section className="rx-beat" data-beat="7">
          <div className="rx-kick">Co dzieje się dalej</div>
          <h2 className="rx-h2" style={{ fontSize: 'clamp(24px,5vw,38px)', marginBottom: 16 }}>W prowadzeniu wracam do takiego wyniku co 7 dni i sprawdzam, co zmienił ostatni tydzień.</h2>
          {el && <p className="rx-sub" style={{ marginBottom: 18, color: C.paper }}>{el}</p>}
          <p className="rx-sub" style={{ marginBottom: 22 }}>Dzisiaj widzisz jeden wycinek tygodnia. Za tydzień może zmienić się sen, praca, trening, weekend albo to, co właśnie testujesz. Ten sam wynik może wtedy prowadzić do innej decyzji. Patrzę na to, co faktycznie wydarzyło się po drodze.</p>

          <div className="rx-ee">
            <div className="rx-ee-col">
              <span className="rx-ee-h">Dzisiaj</span>
              <div className="rx-ee-t">1 wycinek tygodnia</div>
              <div className="rx-ee-steps"><span>Twoje odpowiedzi</span><span>hipoteza</span><span>jeden test</span></div>
            </div>
            <div className="rx-ee-col guide">
              <span className="rx-ee-h">W prowadzeniu</span>
              <div className="rx-ee-t">kolejna pętla co tydzień</div>
              <div className="rx-ee-steps"><span>co się wydarzyło</span><span>co zadziałało</span><span>co nadal ciągnie wynik</span><span>jedna następna korekta</span></div>
            </div>
          </div>
          <p className="rx-pull" style={{ margin: '2px 0 26px' }}>Plan zmienia się razem z tym, co faktycznie dzieje się w Twoim tygodniu.</p>

          <div className="rx-wk-head">Za tydzień decyzja może być już inna.</div>
          <div className="rx-wk-list">
            <div className="rx-wk"><span className="rx-wk-n">Tydzień 1</span><p>wieczorem puszcza jedzenie → cofamy się kilka godzin → testujemy wcześniejszy posiłek i stan przed wieczorem</p></div>
            <div className="rx-wk"><span className="rx-wk-n">Tydzień 2</span><p>wieczór poprawiony, ale wypada trening po ciężkim dniu → zmieniamy minimum treningowe</p></div>
            <div className="rx-wk"><span className="rx-wk-n">Tydzień 3</span><p>trening trzyma, weekend zostawia ogon do wtorku → pracujemy nad czasem powrotu</p></div>
          </div>
          <p className="rx-fine" style={{ textAlign: 'left', margin: '10px 0 0' }}>Przykład, jak zmienia się kierunek pracy z tygodnia na tydzień.</p>
        </section>

        {/* BEAT 8 — INTENT-AWARE NEXT STEP -> nabor (2 intencje: Beat 4 = DM teraz, tu = zrozum proces) */}
        <section className="rx-beat" data-beat="8">
          <div className="rx-kick">{nextStep.kicker}</div>
          <h2 className="rx-h2" style={{ fontSize: 'clamp(23px,4.8vw,34px)', marginBottom: 14 }}>{nextStep.h2}</h2>
          <p className="rx-sub" style={{ marginBottom: 22 }}>{nextStep.body}</p>
          <div className="rx-human">
            <img src="/michal-portrait.jpg" alt="Michał" width={86} height={86} />
            <div className="rx-human-head">
              <span>MICHAŁ · METODA 168</span>
              <strong>Naprawiam facetom tydzień, który regularnie wykłada im formę i napęd.</strong>
            </div>
            <p>Jeśli napiszesz po tej diagnostyce, startujemy od tego wyniku. Widzę Twoje odpowiedzi i mam konkretny punkt, od którego warto zacząć rozmowę.</p>
          </div>
          <a className={'rx-next rx-next-' + nextStep.variant} href={nextHref} target={nextHref.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" onClick={() => {
            trackDiag('final_route_click', { route: nextStep.route, archetype: archKey, tier, intent, start_when: startWhen, cta_variant: nextStep.variant });
            if (nextStep.route === 'dm') trackDiag('final_fast_lane_click', { archetype: archKey, tier, intent, start_when: startWhen });
            else trackDiag('nabor_click', { archetype: archKey, tier, intent, cta_variant: nextStep.variant });
          }}>{nextStep.cta}</a>
          <a className="rx-badge" style={{ marginTop: 16 }} href={GOOGLE_AGG.url} target="_blank" rel="noopener noreferrer">
            <span className="rx-g">G</span>
            <span className="rx-r">{GOOGLE_AGG.rating} <span style={{ color: C.gold }}>★★★★★</span><span style={{ color: C.mute, fontWeight: 400 }}> · {GOOGLE_AGG.count} opinii w Google</span></span>
          </a>
          {/* TODO(proof): realny anonimowy fragment check-inu (problem A -> wczesniejsze ogniwo -> zmiana -> tydzien pozniej). NIE renderowac dopoki nie ma prawdziwego artefaktu. */}
          {instagram && <p className="rx-fine">@{instagram} pozwala mi połączyć ten wynik z Twoją wiadomością.</p>}
        </section>

      </div>
    </div>
  );
}

const css = `
.rx-atmo{position:fixed;inset:0;z-index:0;pointer-events:none;background:radial-gradient(1100px 640px at 50% -6%,${C.glow},transparent 60%),radial-gradient(820px 820px at 50% 118%,rgba(224,85,46,.06),transparent 55%)}
.rx-atmo::after{content:"";position:absolute;inset:0;opacity:.5;background-image:radial-gradient(rgba(255,255,255,.03) 1px,transparent 1px);background-size:3px 3px;mix-blend-mode:screen}
.rx-prog{position:fixed;top:0;left:0;height:3px;width:0;background:linear-gradient(90deg,${C.goldD},${C.goldB});z-index:9;box-shadow:0 0 12px ${C.glow}}
.rx-wrap{position:relative;z-index:1;max-width:620px;margin:0 auto;padding:0 22px}
.rx * , .rx-wrap *{box-sizing:border-box}
.rx-beat{padding:74px 0;border-bottom:1px solid ${C.line};opacity:0;transform:translateY(24px);transition:opacity .7s cubic-bezier(.2,.6,.2,1),transform .7s cubic-bezier(.2,.6,.2,1)}
.rx-beat.in{opacity:1;transform:none}
.rx-kick{font-family:${C.mono};font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${C.gold};font-weight:700;margin-bottom:20px;display:flex;align-items:center;gap:10px}
.rx-kick::before{content:"";width:22px;height:1px;background:${C.goldD}}
.rx-kick-c{justify-content:center}
.rx-h2{font-family:${C.serif};font-weight:400;line-height:1.08;letter-spacing:-.01em;color:${C.paper};margin:0 0 22px;font-size:clamp(28px,5.2vw,44px)}
.rx-sub{color:${C.mute};line-height:1.62;font-size:clamp(15px,2.1vw,17px)}
.rx-pull{font-family:${C.serif};font-style:italic;color:${C.gold};border-left:2px solid ${C.goldD};padding-left:18px;line-height:1.4;font-size:clamp(19px,4vw,24px);margin:0}
.rx-hero{position:relative;min-height:100svh;display:flex;flex-direction:column;justify-content:center;text-align:center;align-items:center;padding:40px 0 max(112px,calc(env(safe-area-inset-bottom) + 92px))}
.rx-arch{font-family:${C.serif};font-weight:400;line-height:1.02;font-size:clamp(34px,8.4vw,64px);color:${C.gold};margin:0 0 16px;letter-spacing:-.01em;text-shadow:0 0 44px ${C.glow};max-width:15ch}
.rx-redline{font-family:${C.mono};font-size:12px;letter-spacing:1px;color:${C.mute};margin-bottom:22px;max-width:32ch}
.rx-evidence{color:${C.paper};line-height:1.55;font-size:14.5px;margin:0 0 8px;padding-left:14px;border-left:2px solid ${C.goldD}}
.rx-hero-sub{max-width:34ch;margin:0 auto}
.rx-cue{position:absolute;left:50%;bottom:max(34px,calc(env(safe-area-inset-bottom) + 22px));transform:translateX(-50%);display:inline-flex;align-items:center;justify-content:center;gap:12px;font-family:${C.mono};font-size:clamp(18px,4.6vw,22px);font-weight:700;line-height:1;letter-spacing:.28em;color:${C.goldB};text-transform:uppercase;white-space:nowrap;text-shadow:0 0 18px rgba(200,168,78,.18);opacity:.96}
.rx-cue-arrow{display:inline-block;font-size:1.4em;line-height:.7;letter-spacing:0;color:${C.gold};animation:rxbob 1.6s ease-in-out infinite}
@keyframes rxbob{0%,100%{transform:translateY(0);opacity:.72}50%{transform:translateY(7px);opacity:1}}
.rx-quote{font-family:${C.serif};font-style:italic;font-size:clamp(19px,4vw,24px);color:${C.paper};line-height:1.34;border-left:2px solid ${C.goldD};padding-left:18px;margin:0 0 26px}
.rx-raise-teaser{font-size:14.5px;color:${C.mute};line-height:1.55;margin:0 0 12px}
.rx-firstmove{background:${C.pan2};border:1px solid ${C.line2};border-left:3px solid ${C.gold};border-radius:12px;padding:14px 16px;margin:0 0 18px}
.rx-firstmove .rx-fm-k{display:block;font-family:${C.mono};font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${C.gold};font-weight:700;margin-bottom:6px}
.rx-firstmove p{margin:0;font-size:15px;color:${C.paper};line-height:1.55}
.rx-raise{background:linear-gradient(180deg,${C.pan2},${C.pan});border:1px solid ${C.goldD};border-radius:16px;padding:20px 22px;margin:0 0 18px;box-shadow:0 0 34px ${C.glow}}
.rx-raise-q{font-family:${C.serif};font-weight:400;font-size:clamp(20px,4.4vw,27px);color:${C.paper};line-height:1.28;margin:0}
.rx-cta{display:block;text-align:center;text-decoration:none;font-weight:800;font-size:17px;color:${C.ink};background:linear-gradient(135deg,${C.gold},${C.goldB});padding:20px 26px;border-radius:16px;margin:0 0 12px;box-shadow:0 0 0 1px rgba(200,168,78,.35),0 22px 60px -18px rgba(200,168,78,.5);transition:transform .18s,box-shadow .18s}
.rx-cta:hover{transform:translateY(-2px);box-shadow:0 0 0 1px rgba(200,168,78,.5),0 28px 74px -16px rgba(200,168,78,.62)}
.rx-selfserve{font-family:${C.mono};font-size:12px;letter-spacing:.5px;color:${C.faint};text-align:center;margin:2px 0 0;line-height:1.5}
.rx-fine{font-family:${C.mono};font-size:11px;letter-spacing:.5px;color:${C.faint};text-align:center;margin:16px 0 0;line-height:1.5}
.rx-badge{display:flex;align-items:center;gap:10px;text-decoration:none;background:${C.pan2};border:1px solid ${C.line2};border-radius:12px;padding:12px 15px}
.rx-g{font-family:${C.sans};font-weight:800;font-size:18px;color:#4285F4;line-height:1}
.rx-r{font-size:14px;color:${C.paper};font-weight:700}
.rx-gcards{display:grid;gap:10px;margin-top:10px}
.rx-gcard{background:linear-gradient(180deg,${C.pan2},${C.ink});border:1px solid ${C.line2};border-radius:12px;padding:13px 15px}
.rx-gtop{display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-bottom:6px;font-size:12px}
.rx-gq{font-family:${C.serif};font-style:italic;color:${C.paper};line-height:1.42;margin:0;font-size:15px}
.rx-exp{display:grid;gap:12px;margin:0 0 22px}
.rx-exp-row{background:${C.pan2};border:1px solid ${C.line};border-radius:14px;padding:16px 18px}
.rx-exp-k{display:block;font-family:${C.mono};font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${C.gold};font-weight:700;margin-bottom:8px}
.rx-exp-row p{margin:0;font-size:15px;color:${C.paper};line-height:1.55}
.rx-exp-ul{margin:0;padding-left:18px}
.rx-exp-ul li{font-size:14.5px;color:${C.paper};line-height:1.5;margin-bottom:4px}
.rx-exp-guard{background:${C.pan};border:1px solid ${C.line};border-radius:12px;padding:14px 16px;margin-top:14px}
.rx-b4teaser{font-size:15.5px;color:${C.paper};line-height:1.6;background:${C.pan2};border:1px solid ${C.line2};border-left:3px solid ${C.gold};border-radius:12px;padding:14px 16px;margin:0 0 18px}
.rx-exp-ex{margin:14px 0 0;background:${C.ink};border:1px solid ${C.line2};border-radius:10px;padding:12px 14px}
.rx-exp-exk{display:block;font-family:${C.mono};font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${C.faint};margin-bottom:6px}
.rx-exp-ex code{font-family:${C.mono};font-size:13px;color:${C.goldB};white-space:nowrap;overflow-x:auto;display:block}
.rx-step{display:flex;gap:14px;align-items:flex-start;background:${C.pan2};border:1px solid ${C.line};border-radius:14px;padding:16px;margin-bottom:10px;cursor:pointer;transition:.2s;user-select:none}
.rx-step:hover{border-color:${C.goldD}}
.rx-step.done{border-color:${C.goldD};background:linear-gradient(180deg,rgba(200,168,78,.09),transparent)}
.rx-box{width:26px;height:26px;border-radius:8px;border:1.5px solid ${C.line2};flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:.2s;margin-top:1px}
.rx-step.done .rx-box{background:linear-gradient(135deg,${C.gold},${C.goldB});border-color:transparent;transform:scale(1.06)}
.rx-box svg{opacity:0;transition:.2s}.rx-step.done .rx-box svg{opacity:1}
.rx-st{font-size:15px;font-weight:700;color:${C.paper};line-height:1.3}
.rx-step.done .rx-st{color:${C.gold}}
.rx-sd{font-size:13.5px;color:${C.mute};line-height:1.5;margin-top:4px}
.rx-chip{font-family:${C.mono};font-size:11px;color:${C.gold};font-weight:700;margin-right:2px}
.rx-metric{font-size:14px;color:${C.mute};background:${C.pan2};border:1px solid ${C.line};border-left:3px solid ${C.gold};border-radius:10px;padding:14px 16px;margin-top:14px;line-height:1.55}
.rx-donemsg{max-height:0;opacity:0;overflow:hidden;transform:translateY(8px);transition:.5s;font-family:${C.serif};font-style:italic;font-size:19px;color:${C.gold};text-align:center;line-height:1.4}
.rx-donemsg.show{max-height:200px;opacity:1;transform:none;margin-top:18px}
.rx-bridge{background:linear-gradient(180deg,${C.pan2},${C.pan});border:1px solid ${C.line2};border-left:3px solid ${C.gold};border-radius:14px;padding:18px 20px}
.rx-bridge-p{font-size:15px;color:${C.paper};line-height:1.62;margin:0 0 16px}
.rx-bridge-cta{display:block;text-align:center;text-decoration:none;font-weight:700;font-size:15px;color:${C.goldB};background:transparent;border:1px solid ${C.goldD};border-radius:12px;padding:15px 18px;transition:.18s}
.rx-bridge-cta:hover{background:rgba(200,168,78,.08);border-color:${C.gold};color:${C.paper}}
.rx-calibwrap{display:flex;flex-wrap:wrap;gap:10px}
.rx-cchip{font-family:${C.sans};font-size:14px;color:${C.mute};background:${C.pan2};border:1px solid ${C.line2};border-radius:999px;padding:10px 16px;cursor:pointer;transition:.15s}
.rx-cchip:hover{border-color:${C.goldD};color:${C.paper}}
.rx-cchip.on{background:linear-gradient(135deg,${C.gold},${C.goldB});color:${C.ink};border-color:transparent;font-weight:700}
.rx-ee{display:grid;gap:12px;margin:0 0 6px}
.rx-ee-col{background:${C.pan2};border:1px solid ${C.line};border-radius:14px;padding:16px 18px}
.rx-ee-col.guide{border-color:${C.goldD};background:linear-gradient(180deg,rgba(200,168,78,.06),${C.pan})}
.rx-ee-h{font-family:${C.mono};font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${C.gold};font-weight:700}
.rx-ee-t{font-family:${C.serif};font-size:clamp(19px,4vw,23px);color:${C.paper};margin:4px 0 14px;line-height:1.15}
.rx-ee-steps{display:flex;flex-direction:column;gap:9px}
.rx-ee-steps span{font-size:14px;color:${C.mute};padding-left:16px;position:relative}
.rx-ee-steps span::before{content:"↓";position:absolute;left:0;top:-13px;color:${C.goldD};font-size:11px}
.rx-ee-steps span:first-child::before{content:""}
.rx-wk-head{font-family:${C.serif};font-style:italic;font-size:clamp(18px,3.8vw,22px);color:${C.gold};margin:8px 0 14px;line-height:1.3}
.rx-wk-list{display:grid;gap:10px}
.rx-wk{background:${C.pan2};border:1px solid ${C.line};border-left:3px solid ${C.goldD};border-radius:12px;padding:13px 15px}
.rx-wk-n{display:block;font-family:${C.mono};font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${C.gold};font-weight:700;margin-bottom:5px}
.rx-wk p{margin:0;font-size:14px;color:${C.paper};line-height:1.5}
.rx-human{display:grid;grid-template-columns:86px 1fr;gap:14px;align-items:center;background:linear-gradient(145deg,rgba(200,168,78,.07),${C.pan});border:1px solid ${C.goldD};border-radius:16px;padding:16px;margin:0 0 18px}.rx-human img{width:86px;height:86px;border-radius:50%;object-fit:cover;object-position:center;border:1px solid ${C.goldD};box-shadow:0 0 0 5px rgba(200,168,78,.05)}.rx-human-head span{display:block;font-family:${C.mono};font-size:10px;letter-spacing:2px;color:${C.gold};font-weight:800;margin-bottom:6px}.rx-human-head strong{display:block;font-size:15px;line-height:1.42;color:${C.paper};font-weight:750}.rx-human>p{grid-column:1/-1;margin:0;color:${C.mute};font-size:14px;line-height:1.58}@media(max-width:380px){.rx-human{grid-template-columns:70px 1fr}.rx-human img{width:70px;height:70px}}
.rx-next{display:block;text-align:center;text-decoration:none;border-radius:14px;padding:17px 22px;transition:transform .18s,box-shadow .18s,background .18s,border-color .18s;margin:0 0 4px}
.rx-next-strong{color:${C.ink};background:linear-gradient(135deg,${C.gold},${C.goldB});font-weight:800;font-size:17px;box-shadow:0 0 0 1px rgba(200,168,78,.35),0 22px 60px -18px rgba(200,168,78,.5)}
.rx-next-strong:hover{transform:translateY(-2px);box-shadow:0 0 0 1px rgba(200,168,78,.5),0 28px 74px -16px rgba(200,168,78,.62)}
.rx-next-medium{color:${C.goldB};background:transparent;border:1px solid ${C.goldD};font-weight:700;font-size:15px}
.rx-next-medium:hover{background:rgba(200,168,78,.08);border-color:${C.gold};color:${C.paper}}
.rx-next-soft{color:${C.mute};background:transparent;border:1px solid ${C.line2};font-weight:600;font-size:14px}
.rx-next-soft:hover{color:${C.gold};border-color:${C.goldD}}
@media(prefers-reduced-motion:reduce){.rx-beat{opacity:1;transform:none}.rx-cue-arrow{animation:none}}
`;
