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

const C = {
  ink: '#08080a', pan: '#141416', pan2: '#1a1a1d', line: '#26262b', line2: '#33333a',
  gold: '#c8a84e', goldB: '#e8cc80', goldD: '#8a7535', glow: 'rgba(200,168,78,.16)',
  paper: '#ece7db', mute: '#a49e92', faint: '#8f887c', hot: '#e0552e',
  mono: "'JetBrains Mono', ui-monospace, monospace", serif: "'Instrument Serif', Georgia, serif", sans: "'Inter', system-ui, sans-serif",
};

export default function ResultExperience({
  archLabel, archKey, redCount, breakId, domainLabel,
  evidenceReceipts, loop, whyRepeats, costFacts, userPain,
  experiment, experimentConfidence, route,
  imie, instagram, naborHref, dmHref, submissionId,
}: {
  archLabel: string; archKey: string; redCount?: number; breakId: string; domainLabel: string;
  evidenceReceipts: string[]; loop: { nodes: LoopNode[]; uncertain: boolean }; whyRepeats: string;
  costFacts: string[]; userPain?: string;
  experiment: ExperimentDef; experimentConfidence: Confidence; route: RouteDecision;
  imie?: string; instagram?: string; naborHref: string; dmHref: string; submissionId?: string;
}) {
  const progRef = useRef<HTMLDivElement>(null);
  const [calib, setCalib] = useState<string>('');
  const [committed, setCommitted] = useState(false);
  const [saved, setSaved] = useState(false);
  const CALIB = [
    { id: 'sen', label: 'Sen' }, { id: 'energia', label: 'Energia i głowa' }, { id: 'jedzenie', label: 'Jedzenie' },
    { id: 'ruch', label: 'Ruch' }, { id: 'weekend', label: 'Weekend' }, { id: 'naped', label: 'Napęd i libido' }, { id: 'ok', label: 'Wszystko pasuje' },
  ];
  const sendCalib = (id: string) => {
    setCalib(id);
    try {
      fetch('/api/diag-event', { method: 'POST', headers: { 'content-type': 'application/json' }, keepalive: true, body: JSON.stringify({ submission_id: submissionId, q_id: 'calibration', value: id, ts: Date.now() }) }).catch(() => {});
    } catch (_e) { /* analityka nigdy nie wywraca flow */ }
    trackDiag('calibration_answer', { id });
  };

  useEffect(() => {
    trackDiag('result_viewed', { arch: archKey });
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) {
        const b = (e.target as HTMLElement).dataset.beat;
        const EVT: Record<string, string> = { '1': 'fracture_viewed', '2': 'loop_viewed', '5': 'experiment_viewed', '6': 'method_demo_viewed' };
        if (b && EVT[b]) trackDiag(EVT[b], { arch: archKey, ...(b === '5' ? { experiment_id: experiment.id, confidence: experimentConfidence } : {}) });
        io.unobserve(e.target);
      }
    }), { threshold: 0.16 });
    document.querySelectorAll('.rx-beat').forEach((b) => io.observe(b));
    const onScroll = () => { const h = document.documentElement; const p = h.scrollTop / (h.scrollHeight - h.clientHeight || 1); if (progRef.current) progRef.current.style.width = (p * 100) + '%'; };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { io.disconnect(); window.removeEventListener('scroll', onScroll); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [archKey]);

  const breakPhrase = BREAK_PHRASE[breakId] || 'Twój tydzień nie ma jednego wyraźnego momentu, w którym pęka.';
  const redLine = (redCount ?? 0) >= 2
    ? `${redCount} ${(redCount ?? 0) <= 4 ? 'obszary' : 'obszarów'} w Twoich odpowiedziach ${(redCount ?? 0) <= 4 ? 'wskazują' : 'wskazuje'} ten sam kierunek.`
    : (redCount ?? 0) === 1 ? 'Najmocniejszy sygnał pojawia się w jednym obszarze.' : '';

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
  const onDmClick = () => trackDiag('cta_dm_clicked', { arch: archKey, route: route.primary });

  return (
    <div className="rx" style={{ background: C.ink, color: C.paper, fontFamily: C.sans, minHeight: '100vh', overflowX: 'hidden', position: 'relative' }}>
      <style>{css}</style>
      <div className="rx-atmo" aria-hidden />
      <div className="rx-prog" ref={progRef} aria-hidden />

      {route.hotEarlyCta && (
        <a className="rx-hotcta" href={dmHref} target="_blank" rel="noopener noreferrer" onClick={onDmClick}>
          {route.primaryLabel} →
        </a>
      )}

      <div className="rx-wrap" style={route.hotEarlyCta ? { paddingBottom: 'max(96px, calc(env(safe-area-inset-bottom) + 86px))' } : undefined}>

        {/* BEAT 1 — PUNKT PĘKNIĘCIA jako primary payoff. Score/pct wtorny (brak w V3). Max 2 receipts. */}
        <section className="rx-beat rx-hero" data-beat="1">
          <div className="rx-kick rx-kick-c">Twój Punkt Pęknięcia{imie?.trim() ? ` · ${imie.trim()}` : ''}</div>
          <div className="rx-hero-panel">
            <div className="rx-hero-signature" aria-hidden="true"><span/><span/><span/></div>
            <h1 className="rx-arch">{breakPhrase}</h1>
            {redLine && <div className="rx-redline">{redLine}</div>}
            <p className="rx-sub rx-hero-sub">Z Twoich odpowiedzi najmocniej składa się właśnie ten moment. Dalej pokazuję, co po nim wraca.</p>
            {evidenceReceipts.length > 0 && (
              <div className="rx-receipts">
                {evidenceReceipts.map((r, i) => (<p key={i} className="rx-receipt">{r}</p>))}
              </div>
            )}
          </div>
          <div className="rx-cue" aria-hidden="true">
            <span className="rx-cue-arrow">↓</span>
            <span>SCROLLUJ</span>
          </div>
        </section>

        {/* BEAT 2 — PĘTLA 168: deterministyczny łańcuch z realnych odpowiedzi + istniejącej, zatwierdzonej treści archetypu */}
        <section className="rx-beat" data-beat="2">
          <div className="rx-kick">Pętla 168</div>
          <h2 className="rx-h2" style={{ fontSize: 'clamp(22px,4.6vw,32px)' }}>U Ciebie jedna rzecz pociąga kolejną mniej więcej tak.</h2>
          <div className="rx-loop">
            {loop.nodes.map((node, i) => (
              <div key={i} className="rx-loop-node">
                <span className="rx-loop-label">{node.label}</span>
                <p>{node.text}</p>
                {i < loop.nodes.length - 1 && <span className="rx-loop-arrow" aria-hidden="true">↓</span>}
              </div>
            ))}
          </div>
          <p className="rx-pull" style={{ marginTop: 18 }}>Najciekawsze jest pierwsze ogniwo. Zanim widać już problem, kilka wcześniejszych decyzji zdążyło ustawić resztę dnia.</p>
          {loop.uncertain && <p className="rx-uncertain">To jest hipoteza do sprawdzenia przez 72 godziny, nie pewnik. Dokładnie po to jest test niżej.</p>}
        </section>

        {/* BEAT 3 — DLACZEGO TO WRACA (tried_before / give_up_point / break_window, zero wymyslonej przyczyny) */}
        <section className="rx-beat" data-beat="3">
          <div className="rx-kick">Dlaczego to wraca</div>
          <h2 className="rx-h2" style={{ fontSize: 'clamp(24px,4.6vw,36px)' }}>Tu prawdopodobnie odpala się Twoja pętla.</h2>
          <p className="rx-sub">{whyRepeats}</p>
        </section>

        {/* BEAT 4 — REALNY KOSZT: wylacznie jawne fakty z odpowiedzi, max 3, zero zmyslonych rocznych kwot */}
        {(costFacts.length > 0 || userPain) && (
          <section className="rx-beat" data-beat="4">
            <div className="rx-kick">Co to już kosztuje</div>
            <h2 className="rx-h2" style={{ fontSize: 'clamp(22px,4.6vw,32px)' }}>To jest część ceny, którą już płacisz.</h2>
            {costFacts.map((f, i) => (<p key={i} className="rx-costfact">{f}</p>))}
            {userPain && <p className="rx-quote">„{userPain}”</p>}
          </section>
        )}

        {/* BEAT 5 — JEDEN eksperyment 72h z banku 20. Zero LLM. Commit -> reveal osobistego momentu obserwacji. */}
        <section className="rx-beat" data-beat="5">
          <div className="rx-kick">Test na 72 godziny</div>
          <h2 className="rx-h2" style={{ fontSize: 'clamp(24px,5vw,38px)' }}>Przez następne 72 godziny sprawdź jedną rzecz.</h2>
          <div className="rx-exp">
            <div className="rx-exp-row"><span className="rx-exp-k">{experiment.name}</span><p>{experiment.action}</p></div>
            <div className="rx-exp-row"><span className="rx-exp-k">Kiedy</span><p>{experiment.moment}</p></div>
            <div className="rx-exp-row"><span className="rx-exp-k">Obserwuj</span><p>{experiment.observe}</p></div>
            <div className="rx-exp-row"><span className="rx-exp-k">Przez te 3 dni nie ruszaj</span><p>{experiment.doNotChange}</p></div>
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

        {/* BEAT 6 — DEMONSTRACJA METODY. Zero obietnicy darmowej analizy. Router: DM/NABOR/eksperyment wg intent x start_when. */}
        <section className="rx-beat" data-beat="6">
          <div className="rx-kick">Jak pracowałbym dalej</div>
          <div className="rx-human">
            <img src="/michal-portrait.jpg" alt="Michał" width={86} height={86} />
            <div className="rx-human-head">
              <span>MICHAŁ · METODA 168</span>
              <strong>Naprawiam facetom tydzień, który regularnie wykłada im formę i napęd.</strong>
            </div>
          </div>
          <h2 className="rx-h2" style={{ fontSize: 'clamp(23px,4.8vw,34px)' }}>Gdybym pracował z Twoim tygodniem, zrobiłbym dalej trzy rzeczy.</h2>
          <ol className="rx-demo">
            <li><span className="rx-demo-n">1</span>Sprawdziłbym, czy to, co widać w Punkcie Pęknięcia, naprawdę powtarza się w normalnym tygodniu.</li>
            <li><span className="rx-demo-n">2</span>Ustawiłbym wersję minimum na moment, w którym pojawia się {domainLabel.toLowerCase()}.</li>
            <li><span className="rx-demo-n">3</span>Dopiero później ruszałbym {domainLabel.toLowerCase()} dalej.</li>
          </ol>
          <div className="rx-expectation">
            <p>Jeśli chcesz tylko zrozumieć swój wynik, masz go tutaj. Nie musisz pisać do mnie po dodatkowe darmowe omówienie.</p>
            <p>Zrób test 72h. Sprawdź, czy Punkt Pęknięcia faktycznie pojawia się tam, gdzie wyszedł. DM służy osobom, które realnie rozważają prowadzenie.</p>
          </div>

          <div className="rx-kick" style={{ marginTop: 28 }}>{route.primaryKicker}</div>
          {route.primary === 'dm' && (
            <a className="rx-next rx-next-strong" href={dmHref} target="_blank" rel="noopener noreferrer" onClick={onDmClick}>{route.primaryLabel} →</a>
          )}
          {route.primary === 'nabor' && (
            <a className="rx-next rx-next-strong" href={naborHref} target="_blank" rel="noopener noreferrer" onClick={onNaborClick}>{route.primaryLabel} →</a>
          )}
          {route.primary === 'experiment' && (
            <a className="rx-next rx-next-medium" href="#beat-5-anchor" onClick={() => { const el = document.querySelector('[data-beat="5"]'); el?.scrollIntoView({ behavior: 'smooth' }); }}>{route.primaryLabel} ↑</a>
          )}
          {route.secondaryNabor && (
            <a className={route.secondaryNabor.prominence === 'prominent' ? 'rx-next rx-next-medium' : 'rx-next rx-next-soft'} href={naborHref} target="_blank" rel="noopener noreferrer" onClick={onNaborClick}>
              {route.secondaryNabor.label} →
            </a>
          )}

          <a className="rx-badge" style={{ marginTop: 16 }} href={GOOGLE_AGG.url} target="_blank" rel="noopener noreferrer">
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
          {instagram && <p className="rx-fine">@{instagram} pozwala mi połączyć ten wynik z Twoją wiadomością.</p>}
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
          {calib && <p className="rx-fine" style={{ textAlign: 'left', marginTop: 16 }}>Dzięki. To pokazuje mi, gdzie wynik przestrzelił.</p>}
          <button className="rx-save" type="button" onClick={shareSafe}>{saved ? 'Zapisano ✓' : 'Zapisz / udostępnij wynik'}</button>
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
.rx-arch{font-family:${C.serif};font-weight:400;line-height:1.1;font-size:clamp(30px,7.4vw,52px);color:${C.gold};margin:0 0 16px;letter-spacing:-.01em;text-shadow:0 0 44px ${C.glow};max-width:18ch}
.rx-redline{font-family:${C.mono};font-size:12px;letter-spacing:1px;color:${C.mute};margin-bottom:22px;max-width:32ch}
.rx-hero-panel{position:relative;width:100%;max-width:560px;padding:30px 22px 26px;border:1px solid rgba(200,168,78,.22);border-radius:24px;background:linear-gradient(160deg,rgba(200,168,78,.075),rgba(255,255,255,.018) 42%,rgba(8,8,10,.68));box-shadow:0 34px 90px -54px rgba(200,168,78,.72),inset 0 1px 0 rgba(255,255,255,.04);overflow:hidden}
.rx-hero-panel::before{content:"";position:absolute;inset:0;background:radial-gradient(420px 180px at 50% 0%,rgba(200,168,78,.13),transparent 68%);pointer-events:none}
.rx-hero-panel::after{content:"";position:absolute;left:18%;right:18%;top:0;height:1px;background:linear-gradient(90deg,transparent,${C.goldB},transparent);opacity:.8}
.rx-hero-panel>*{position:relative;z-index:1}
.rx-hero-signature{display:flex;justify-content:center;gap:6px;margin:0 auto 18px}.rx-hero-signature span{display:block;width:24px;height:3px;border-radius:999px;background:${C.goldD};opacity:.62}.rx-hero-signature span:nth-child(2){width:44px;background:${C.goldB};opacity:.95}
.rx-receipts{margin-top:22px;display:grid;gap:10px;max-width:46ch;width:100%}
.rx-receipt{color:${C.paper};line-height:1.5;font-size:14px;margin:0;padding:12px 14px;border:1px solid ${C.line2};border-radius:12px;background:rgba(255,255,255,.025);text-align:left}
.rx-hero-sub{max-width:40ch;margin:0 auto}
.rx-cue{position:absolute;left:50%;bottom:max(34px,calc(env(safe-area-inset-bottom) + 22px));transform:translateX(-50%);display:inline-flex;align-items:center;justify-content:center;gap:12px;font-family:${C.mono};font-size:clamp(18px,4.6vw,22px);font-weight:700;line-height:1;letter-spacing:.28em;color:${C.goldB};text-transform:uppercase;white-space:nowrap;text-shadow:0 0 18px rgba(200,168,78,.18);opacity:.96}
.rx-cue-arrow{display:inline-block;font-size:1.4em;line-height:.7;letter-spacing:0;color:${C.gold};animation:rxbob 1.6s ease-in-out infinite}
@keyframes rxbob{0%,100%{transform:translateY(0);opacity:.72}50%{transform:translateY(7px);opacity:1}}
.rx-quote{font-family:${C.serif};font-style:italic;font-size:clamp(19px,4vw,24px);color:${C.paper};line-height:1.34;border-left:2px solid ${C.goldD};padding-left:18px;margin:14px 0 0}
.rx-cta{display:block;width:100%;text-align:center;text-decoration:none;font-weight:800;font-size:17px;color:${C.ink};background:linear-gradient(135deg,${C.gold},${C.goldB});padding:20px 26px;border-radius:16px;margin:0 0 12px;border:none;cursor:pointer;box-shadow:0 0 0 1px rgba(200,168,78,.35),0 22px 60px -18px rgba(200,168,78,.5);transition:transform .18s,box-shadow .18s}
.rx-cta:hover{transform:translateY(-2px);box-shadow:0 0 0 1px rgba(200,168,78,.5),0 28px 74px -16px rgba(200,168,78,.62)}
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
.rx-donemsg{font-family:${C.serif};font-style:italic;font-size:18px;color:${C.gold};text-align:left;line-height:1.4;background:${C.pan2};border:1px solid ${C.goldD};border-radius:14px;padding:18px 20px}
.rx-loop{display:grid;gap:0;margin:0 0 8px}
.rx-loop-node{background:${C.pan2};border:1px solid ${C.line};border-radius:14px;padding:14px 16px;position:relative;margin-bottom:18px}
.rx-loop-label{display:block;font-family:${C.mono};font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${C.gold};font-weight:700;margin-bottom:6px}
.rx-loop-node p{margin:0;font-size:14.5px;color:${C.paper};line-height:1.55}
.rx-loop-arrow{position:absolute;left:24px;bottom:-22px;color:${C.goldD};font-size:14px}
.rx-uncertain{font-family:${C.mono};font-size:12px;color:${C.faint};margin-top:14px;line-height:1.5}
.rx-costfact{color:${C.paper};font-size:15px;line-height:1.6;margin:0 0 10px;padding-left:14px;border-left:2px solid ${C.goldD}}
.rx-human{display:grid;grid-template-columns:86px 1fr;gap:14px;align-items:center;background:linear-gradient(145deg,rgba(200,168,78,.07),${C.pan});border:1px solid ${C.goldD};border-radius:16px;padding:16px;margin:0 0 22px}.rx-human img{width:86px;height:86px;border-radius:50%;object-fit:cover;object-position:center;border:1px solid ${C.goldD};box-shadow:0 0 0 5px rgba(200,168,78,.05)}.rx-human-head span{display:block;font-family:${C.mono};font-size:10px;letter-spacing:2px;color:${C.gold};font-weight:800;margin-bottom:6px}.rx-human-head strong{display:block;font-size:15px;line-height:1.42;color:${C.paper};font-weight:750}@media(max-width:380px){.rx-human{grid-template-columns:70px 1fr}.rx-human img{width:70px;height:70px}}
.rx-demo{list-style:none;margin:0 0 22px;padding:0;display:grid;gap:12px}
.rx-demo li{display:flex;gap:12px;align-items:flex-start;color:${C.paper};font-size:15px;line-height:1.58;background:${C.pan2};border:1px solid ${C.line};border-radius:12px;padding:14px 16px}
.rx-demo-n{flex-shrink:0;width:24px;height:24px;border-radius:50%;background:${C.goldD};color:${C.ink};font-family:${C.mono};font-weight:800;font-size:12px;display:flex;align-items:center;justify-content:center}
.rx-expectation{background:linear-gradient(180deg,${C.pan2},${C.pan});border:1px solid ${C.goldD};border-radius:16px;padding:18px 20px;margin:0 0 8px}
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
.rx-cchip{font-family:${C.sans};font-size:14px;color:${C.mute};background:${C.pan2};border:1px solid ${C.line2};border-radius:999px;padding:10px 16px;cursor:pointer;transition:.15s}
.rx-cchip:hover{border-color:${C.goldD};color:${C.paper}}
.rx-cchip.on{background:linear-gradient(135deg,${C.gold},${C.goldB});color:${C.ink};border-color:transparent;font-weight:700}
.rx-save{margin-top:22px;font-family:${C.mono};font-size:12.5px;letter-spacing:.5px;color:${C.mute};background:transparent;border:1px solid ${C.line2};border-radius:10px;padding:11px 16px;cursor:pointer;transition:.15s}
.rx-save:hover{border-color:${C.goldD};color:${C.paper}}
.rx-hotcta{position:fixed;left:16px;right:16px;bottom:max(14px,env(safe-area-inset-bottom));z-index:8;display:block;text-align:center;text-decoration:none;font-weight:800;font-size:15px;color:${C.ink};background:linear-gradient(135deg,${C.gold},${C.goldB});padding:15px 18px;border-radius:14px;box-shadow:0 12px 34px -10px rgba(200,168,78,.55);max-width:588px;margin:0 auto}
@media(max-width:640px){.rx-wrap{padding:0 18px}.rx-hero{padding-top:26px;padding-bottom:max(106px,calc(env(safe-area-inset-bottom) + 86px))}.rx-hero-panel{padding:24px 18px 22px;border-radius:20px}.rx-arch{font-size:clamp(31px,9vw,44px)}.rx-receipts{grid-template-columns:1fr}.rx-cue{bottom:max(26px,calc(env(safe-area-inset-bottom) + 16px))}}
@media(prefers-reduced-motion:reduce){.rx-beat{opacity:1;transform:none}.rx-cue-arrow{animation:none}}
`;
