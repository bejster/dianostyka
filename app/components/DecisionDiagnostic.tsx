'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Atmosphere } from '../diagnoza/atmosphere';
import { track, registerContext } from '../lib/analytics';
import {
  DECISION_VERSION, DECISION_STORAGE_KEY, NABOR_URL, FIT_OPTIONS, OBJECTION_OPTIONS,
  buildDecisionResult, cleanAnswers, getQuestions, invitation, isComplete,
  resultAsText, updateAnswer, type Answers,
} from '../lib/decision-diagnostic';
import { INSIGHT_REACTIONS, reactionNext, contentSignal } from '../lib/decision-insights';
import { actionHeading, resultStatus, RESULT_UI_VERSION, analyticsEnvironment } from '../lib/decision-presentation';
import './decision-diagnostic.css';
import './decision-result.css';
import { JOURNEY_STAGES, journeyStage, questionContext, journeyCue, createChoiceGate } from '../lib/question-journey';
import './question-interactions.css';
import { refinementOptions, selectedRefinement, refinementAsText, nextRepairIndex } from '../lib/result-refinement';

type Phase = 'intro' | 'questions' | 'result';
type Stored = { version: string; answers: Answers; phase: Phase; index: number; fit: string; objection: string; accepted: boolean; checkin: string; reaction?: string; shared?: boolean; refinement?: string; repairing?: boolean };
function event(name: string, props: Record<string, unknown> = {}) {
  // Routine funnel events never send answers or contact. Content topics have a separate explicit opt-in below.
  track(name, { analytics_schema: 'site-analytics-v1', surface: 'diagnostyka', version: DECISION_VERSION, ui_version: RESULT_UI_VERSION, environment: analyticsEnvironment(typeof window === 'undefined' ? '' : window.location.hostname), ...props });
}
const CHECKIN: Record<string, string> = {
  helped: 'Zauważyłeś poprawę po wykonaniu zadania. Powtórz je przy podobnej okazji. Jeden lepszy dzień jeszcze nie rozstrzyga, co zadziałało.',
  unchanged: 'Zachowaj zapis tego, co zrobiłeś. Brak różnicy też pomaga ocenić, czy ten trop pasuje.',
  blocked: 'Zapisz, co Ci przeszkodziło. Od tej rzeczy trzeba zacząć przy następnej próbie.',
  no_chance: 'Wróć, kiedy będzie okazja to sprawdzić.',
};
export default function DecisionDiagnostic() {
  const [phase, setPhase] = useState<Phase>('intro');
  const [answers, setAnswers] = useState<Answers>({});
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [fastFit, setFastFit] = useState(false);
  const [fit, setFit] = useState('');
  const [objection, setObjection] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [checkin, setCheckin] = useState('');
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [status, setStatus] = useState('');
  const [instagram, setInstagram] = useState('');
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [reaction, setReaction] = useState('');
  const [refinement, setRefinement] = useState('');
  const [repairing, setRepairing] = useState(false);
  const [contentConsent, setContentConsent] = useState(false);
  const [shared, setShared] = useState(false);
  const [shareError, setShareError] = useState('');
  const sendingRef = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const startedAt = useRef(0);
  const invitationSection = useRef<HTMLElement>(null);
  const entryTracked = useRef(false);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const choiceGate = useRef(createChoiceGate((finish, delay) => {
    const timer = setTimeout(finish, delay);
    return () => clearTimeout(timer);
  }));
  useEffect(() => {
    const gate = choiceGate.current;
    return () => gate.cancel();
  }, []);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const fast = search.get('mode') === 'fast_fit';
    setFastFit(fast);
    registerContext({ mode: fast ? 'fast_fit' : 'diagnostic', version: DECISION_VERSION });
    let restoredPhase: Phase = 'intro';
    try {
      const text = localStorage.getItem(DECISION_STORAGE_KEY);
      if (text) {
        const saved = JSON.parse(text) as Stored;
        if (saved.version === DECISION_VERSION) {
          const clean = cleanAnswers(saved.answers);
          setAnswers(clean);
          const firstMissing = getQuestions(clean).findIndex(q => clean[q.id] === undefined);
          setIndex(Math.max(0, Math.min(Number.isInteger(saved.index) ? saved.index : 0, firstMissing < 0 ? getQuestions(clean).length - 1 : firstMissing)));
          if (!fast) {
            restoredPhase = saved.phase === 'result' && isComplete(clean) ? 'result' : saved.phase === 'questions' ? 'questions' : 'intro';
            setPhase(restoredPhase);
          }
          setFit(FIT_OPTIONS.some(o => o.id === saved.fit) ? saved.fit : '');
          setObjection(OBJECTION_OPTIONS.some(o => o.id === saved.objection) ? saved.objection : '');
          setAccepted(saved.accepted === true);
          setReaction(INSIGHT_REACTIONS.some(r => r.id === saved.reaction) ? saved.reaction! : '');
          setShared(saved.shared === true);
          setRefinement(selectedRefinement(clean, buildDecisionResult(clean), saved.reaction || '', saved.refinement)?.id || '');
          setRepairing(saved.repairing === true && restoredPhase === 'questions');
          setCheckin(CHECKIN[saved.checkin] ? saved.checkin : '');
        }
      }
    } catch { setStorageAvailable(false); }
    setLoaded(true);
    if (!entryTracked.current) {
      event(fast ? 'fast_fit_viewed' : restoredPhase === 'result' ? 'diag_result_resumed' : restoredPhase === 'questions' ? 'diag_questions_resumed' : 'diag_intro_viewed');
      entryTracked.current = true;
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(DECISION_STORAGE_KEY, JSON.stringify({ version: DECISION_VERSION, phase, answers, index, fit, objection, accepted, checkin, reaction, shared, refinement, repairing } satisfies Stored));
    } catch { setStorageAvailable(false); }
  }, [loaded, phase, answers, index, fit, objection, accepted, checkin, reaction, shared, refinement, repairing]);

  const questions = getQuestions(answers);
  const current = questions[Math.min(index, questions.length - 1)];
  const result = buildDecisionResult(answers);
  const invite = invitation(fit, objection, String(answers.why || ''), reaction);
  const refinements = refinementOptions(answers, result, reaction);
  const refined = selectedRefinement(answers, result, reaction, refinement);
  const rejected = ['off', 'obvious'].includes(reaction);
  const canAccept = !rejected && (!refined || refined.canTry);
  const refinementText = refinementAsText(answers, result, reaction, refinement);
  function chooseRefinement(id: string) {
    setRefinement(id); setAccepted(false); setCheckin(''); setSent(false); setStatus('');
    event('result_refinement_selected');
  }
  const routeResolved = !!answers.scene && !!answers.previous && (['none', 'unknown'].includes(String(answers.previous)) || !!answers.attempt) && (!questions.some(q => q.id === 'before') || !!answers.before) && (!questions.some(q => q.id === 'planned') || answers.planned !== undefined);
  const stage = journeyStage(current.id);
  const context = questionContext(answers, current.id);
  const cue = journeyCue(current.id, routeResolved ? questions.length - index : undefined);
  const answeredCount = questions.filter(q => answers[q.id] !== undefined).length;
  useEffect(() => {
    if (!loaded || phase !== 'questions') return;
    startedAt.current = Date.now();
    heading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
    event('question_view', { question_id: current.id, pos: index + 1 });
  }, [loaded, phase, index, current.id]);

  useEffect(() => {
    if (!loaded || phase !== 'result' || fastFit || !invitationSection.current) return;
    heading.current?.focus({ preventScroll: true });
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        event('diag_invitation_viewed');
        observer.disconnect();
      }
    }, { threshold: 0.2 });
    observer.observe(invitationSection.current);
    return () => observer.disconnect();
  }, [loaded, phase, fastFit]);

  function choose(value: string | number) {
    const elapsed = Math.max(0, Date.now() - startedAt.current);
    const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 180;
    if (choiceGate.current.choose(() => {
      commit(value, elapsed);
      setSelectedChoice(null);
    }, delay)) setSelectedChoice(String(value));
  }
  function commit(value: string | number, elapsed: number) {
    const next = updateAnswer(answers, current.id, value);
    setAnswers(next);
    setRefinement(''); setAccepted(false); setCheckin(''); setReaction(''); setShared(false); setContentConsent(false); setFit(''); setObjection(''); setStatus(''); setSent(false);
    event('question_answer', { question_id: current.id, pos: index + 1, elapsed_ms: elapsed });
    const nextQuestions = getQuestions(next);
    const nextIndex = repairing ? nextRepairIndex(nextQuestions, next) : nextQuestions.findIndex(q => q.id === current.id) + 1;
    if (nextIndex >= 0 && nextIndex < nextQuestions.length) setIndex(nextIndex);
    else if (isComplete(next)) {
      setRepairing(false);
      setPhase('result');
      window.scrollTo({ top: 0, behavior: 'instant' });
      event('diag_complete', { question_count: nextQuestions.length });
      event('diag_result_viewed');
    }
  }
  function save() {
    const blob = new Blob([[refinementText, resultAsText(answers)].filter(Boolean).join('\n\n')], { type: 'text/plain;charset=utf-8' });
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = href; a.download = 'moj-pierwszy-krok-168.txt'; a.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
    event('result_saved');
  }
  async function sendContact() {
    const handle = instagram.trim().replace(/^@/, '');
    if (!consent || !/^[A-Za-z0-9._]{2,30}$/.test(handle) || sendingRef.current || sent) return;
    sendingRef.current = true;
    setSending(true); setStatus('');
    try {
      const response = await fetch('/api/decision-lead', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ version: DECISION_VERSION, answers, fit, objection, reaction, refinement, instagram: handle, consent: true }) });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error('delivery_failed');
      setStatus('Wynik wysłany. Mam go razem z Twoim kontaktem.');
      setSent(true);
      event('contact_provided');
    } catch { setStatus('Nie udało się wysłać wyniku. Możesz go pobrać i przejść na stronę prowadzenia.'); event('contact_delivery_failed'); }
    finally { setSending(false); sendingRef.current = false; }
  }
  function shareTopics() {
    if (!contentConsent || shared) return;
    const ph = (window as unknown as { posthog?: { capture?: (name: string, props: Record<string, unknown>) => unknown } }).posthog;
    if (!ph?.capture) { setShareError('Nie udało się przekazać kategorii. Twój wynik nadal jest dostępny.'); return; }
    try {
      ph.capture('diag_content_insight_shared', { analytics_schema: 'diagnostic-content-v1', version: DECISION_VERSION, ui_version: RESULT_UI_VERSION, environment: analyticsEnvironment(window.location.hostname), consent: 'content_topics', ...contentSignal(cleanAnswers(answers), reaction, fit, objection) });
      setShared(true); setShareError('');
    } catch { setShareError('Nie udało się przekazać kategorii. Twój wynik nadal jest dostępny.'); }
  }
  function restart() {
    setRefinement(''); setRepairing(false);
    setReaction(''); setShared(false); setContentConsent(false); setShareError('');
    setAnswers({}); setIndex(0); setFit(''); setObjection(''); setAccepted(false); setCheckin(''); setStatus(''); setSent(false); setConsent(false); setInstagram(''); setPhase('questions');
    event('diag_start');
  }
  const section = phase === 'intro' ? 'Twój tydzień' : phase === 'questions' ? 'Twój tydzień' : 'Twój pierwszy krok';
  return <main className={`dd dd-phase-${phase}`}>
    <Atmosphere />
    <header className="dd-header"><Link href="/" aria-label="Diagnostyka 168, początek">168<span>DIAGNOSTYKA</span></Link><nav aria-label="Na skróty"><span>{section}</span>{phase !== 'result' && <a href={NABOR_URL} onClick={() => event('nabor_bypass_clicked', { placement: 'header' })}>Zobacz prowadzenie <span aria-hidden="true">↗</span></a>}</nav></header>
    {!loaded ? <div className="dd-shell" role="status">Otwieram diagnostykę…</div> : fastFit ? <section className="dd-shell dd-intro">
      <p className="dd-eyebrow">Prowadzenie 1:1</p>
      <h1>Zobacz, jak wygląda prowadzenie.</h1>
      <p className="dd-lead">Sprawdź zakres i koszt, zanim zdecydujesz, czy chcesz się zgłosić.</p>
      <a className="dd-primary" href={NABOR_URL} onClick={() => event('fast_fit_to_nabor')}>Zobacz prowadzenie <span>↗</span></a>
      <button className="dd-link" onClick={() => { setFastFit(false); setPhase('intro'); registerContext({ mode: 'diagnostic' }); event('fast_fit_to_diagnostic'); }}>Chcę najpierw sprawdzić swój tydzień</button>
    </section> : phase === 'intro' ? <section className="dd-shell dd-intro">
      <p className="dd-eyebrow">DIAGNOSTYKA 168 · TWÓJ TYDZIEŃ</p>
      <h1>Co z Twojego dnia odbija się później na formie?</h1>
      <p className="dd-lead">Wybierz sytuację z ostatniego tygodnia. Sprawdzimy, co ją poprzedziło i od czego warto zacząć u Ciebie.</p>
      <button className="dd-primary" onClick={() => { setPhase('questions'); event('diag_start'); }}>Sprawdzam swój tydzień <span>→</span></button>
      <p className="dd-micro">Od 6 do 11 odpowiedzi · bezpłatnie · wynik bez podawania kontaktu</p>
      <details className="dd-preview dd-example">
        <summary>Dlaczego pytam o to, co było wcześniej?</summary>
        <p>Przykład: siedzisz z telefonem do późna. Możesz stracić poczucie czasu albo sięgnąć po niego, bo już wcześniej nie mogłeś zasnąć. W każdej z tych sytuacji warto sprawdzić coś innego.</p>
      </details>
      <p className="dd-privacy">Wynik powstaje automatycznie. Odpowiedzi zostają w tej przeglądarce. Ty decydujesz, czy je później udostępnisz.</p>
    </section> : phase === 'questions' ? <section className="dd-shell dd-question" aria-label="Pytania diagnostyki">
      {!repairing && <ol className="dd-journey" aria-label="Etapy diagnostyki">{JOURNEY_STAGES.map((name, n) => <li key={name} aria-current={n === stage ? 'step' : undefined} data-done={n < stage}><span aria-hidden="true">{n < stage ? '✓' : n + 1}</span>{name}</li>)}</ol>}
      <div className="dd-progress-row"><button disabled={selectedChoice !== null} className="dd-back" onClick={() => index === 0 ? setPhase('intro') : setIndex(index - 1)}>← Wstecz</button><span>{repairing ? 'Doprecyzowanie wyniku' : <>Pytanie {index + 1} {routeResolved ? `z ${questions.length}` : '· do 11 odpowiedzi'}</>}</span></div>
      {!repairing && <div className="dd-progress" role="progressbar" aria-label="Postęp diagnostyki" aria-valuemin={0} aria-valuemax={routeResolved ? questions.length : 11} aria-valuenow={index} aria-valuetext={`${index} wcześniejszych odpowiedzi; teraz pytanie ${index + 1}`}><span style={{ width: `${index / (routeResolved ? questions.length : 11) * 100}%` }} /></div>}
      <div key={current.id} className="dd-question-enter">
      {context && <aside className="dd-question-context"><span>{context.label}</span><p>„{context.quote}”</p></aside>}
      <h1 ref={heading} tabIndex={-1}>{current.title}</h1>
      {current.hint && <p className="dd-hint">{current.hint}</p>}
      {!repairing && cue && <p className="dd-journey-cue">{cue}</p>}
      <div className={`dd-options ${current.type === 'number' || current.id === 'frequency' ? 'dd-numbers' : ''}`}>
        {(current.type === 'number' ? Array.from({ length: (current.max ?? 7) + 1 }, (_, n) => ({ id: String(n), label: String(n) })) : current.options || []).map(o => <button key={o.id} disabled={selectedChoice !== null} data-selected={selectedChoice === o.id} aria-pressed={selectedChoice === o.id || (selectedChoice === null && String(answers[current.id]) === o.id)} onClick={e => { if (e.detail < 2) choose(current.type === 'number' ? Number(o.id) : o.id); }}>{o.label}<span aria-hidden="true">{selectedChoice === o.id ? '✓' : '→'}</span></button>)}
      </div>
      <p className="dd-micro" role="status">{selectedChoice !== null ? 'Wybrano ✓' : 'Możesz wrócić i zmienić odpowiedź.'}</p>
      </div>
      {!storageAvailable && <p className="dd-notice">Ta przeglądarka nie pozwala zapisać postępu. Przed zamknięciem pobierz wynik.</p>}
    </section> : <article className="dd-shell dd-result">
      <div className="dd-result-heading">
        <div className="dd-result-meta"><p className="dd-eyebrow">TWÓJ WYNIK · {answeredCount} ODPOWIEDZI</p><span className="dd-result-status">{resultStatus(result)}</span></div>
        <h1 ref={heading} tabIndex={-1}>{reaction === 'off' ? 'Wróćmy do tego, jak jest u Ciebie.' : result.title}</h1>
        <p className="dd-result-lead">{reaction === 'off' ? 'Zaznaczyłeś, że opis nie pasuje. Niżej możesz poprawić konkretną odpowiedź.' : result.hypothesis}</p>
      </div>
      {(!rejected || refined) && <section className="dd-action" id="twoj-krok" aria-label="Pierwszy krok">
        <p className="dd-eyebrow">{refined && !refined.canTry ? 'WRÓĆ DO POPRZEDNIEJ PRÓBY' : result.certainty === 'maintain' ? 'CO WARTO ZACHOWAĆ' : 'SPRAWDŹ PRZY NASTĘPNEJ OKAZJI'}</p>
        <h2>{refined ? refined.title : actionHeading(result)}</h2>
        <p className="dd-task" aria-live="polite">{refined ? refined.action : result.experiment.action}</p>
        <div className="dd-action-detail"><span>{refined && !refined.canTry ? 'Do sprawdzenia' : 'Po czym poznasz'}</span><p>{refined ? refined.observe : result.experiment.observe}</p></div>
        <details className="dd-outcomes"><summary>Jak to dopasować i co zrobić potem?</summary>
          <p>{refined ? `Wybrałeś: „${refined.label}”` : result.constraint}</p>
          <p>{result.timing}</p>
          {!refined && <><p>{result.experiment.when}</p><h3>Po próbie</h3><p>{result.insight.yes}</p><p>{result.insight.no}</p></>}
          {answers.previous !== 'none' && answers.previous !== 'unknown' && <><h3>Twoja poprzednia próba</h3><p>{result.previous}</p></>}
          <h3>To, na czym Ci zależy</h3><p>{result.goalMetric}</p>{result.impact && <p>{result.impact}</p>}
        </details>
        {canAccept && <button className="dd-primary" onClick={() => { setAccepted(true); event('experiment_accepted'); }}>{accepted ? 'Zapisane. Wróć po próbie ✓' : 'Sprawdzę to'}<span>→</span></button>}
        {accepted && canAccept && <p role="status" className="dd-micro">{storageAvailable ? 'Wynik zostaje w tej przeglądarce.' : 'Pobierz wynik przed zamknięciem strony.'}</p>}
      </section>}
      <div className="dd-result-tools"><button className="dd-link" onClick={save}>Pobierz wynik ↓</button><details className="dd-details dd-evidence"><summary>Skąd ten wniosek?</summary>
        <p>{result.insight.trap}</p>
        {answers.scene === 'training' && typeof answers.planned === 'number' && <p>Ostatnie siedem dni: {answers.planned} zaplanowanych treningów{typeof answers.missed === 'number' ? `, ${answers.missed} niewykonanych` : ''}.</p>}
        {answers.frequency !== undefined && <p>{answers.frequency === 'unknown' ? 'Nie pamiętasz, jak często było podobnie.' : `Podobna sytuacja: ${answers.frequency} z ${answers.scene === 'weekend' ? 'ostatnich 4 weekendów' : 'ostatnich 7 dni'}.`}</p>}
        <dl>{result.evidence.map(e => <div key={e.id}><dt>{e.label}</dt><dd>{e.value}</dd></div>)}</dl>
        <button className="dd-link" onClick={() => { setIndex(0); setPhase('questions'); }}>Popraw odpowiedzi</button>
      </details></div>
      <section className="dd-feedback" aria-label="Dopasowanie wyniku">
        <h2>Jak to pasuje do Ciebie?</h2>
        <div className="dd-options">{INSIGHT_REACTIONS.map(o => <button key={o.id} aria-pressed={reaction === o.id} onClick={() => { setReaction(o.id); setRefinement(''); setAccepted(false); setCheckin(''); setSent(false); setStatus(''); event('result_reaction_selected'); }}>{o.label}</button>)}</div>
        {reaction && reaction !== 'obvious' && <p className="dd-notice" role="status">{reactionNext(reaction)}</p>}
        {reaction === 'off' && <details open className="dd-details"><summary>Co w opisie się nie zgadza?</summary><div className="dd-options">{questions.filter(q => ['scene', 'before', 'context', 'previous'].includes(q.id)).map(q => <button key={q.id} onClick={() => { setRepairing(true); setIndex(questions.findIndex(item => item.id === q.id)); setPhase('questions'); }}>{q.title}<span>→</span></button>)}</div><p>Po zmianie wrócisz do wyniku. Dopytam tylko o brakujące szczegóły.</p></details>}
      </section>
      {refinements.length > 0 && <section className="dd-feedback dd-refinement" aria-label="Doprecyzowanie kroku">
        <details open={reaction === 'obvious' || !!refined}>
          <summary>{reaction === 'obvious' ? 'Co wyszło, kiedy tego próbowałeś?' : 'Co może Ci przeszkodzić w tej próbie?'}</summary>
          <div className="dd-options">{refinements.map(o => <button key={o.id} aria-pressed={refinement === o.id} onClick={() => chooseRefinement(o.id)}>{o.label}</button>)}</div>
          {refined && <p className="dd-notice" role="status">Zmieniłem krok na podstawie tej odpowiedzi. <a href="#twoj-krok">Zobacz go ↑</a></p>}
        </details>
      </section>}
      {accepted && canAccept && <details className="dd-details"><summary>Wracasz po próbie? Zapisz, co wyszło.</summary>
        <p>Oceń tę sytuację. Na zmianę sylwetki potrzeba osobnego porównania.</p>
        <div className="dd-options">{[['helped', 'Zrobiłem to i zauważyłem poprawę.'], ['unchanged', 'Zrobiłem to, ale bez różnicy.'], ['blocked', 'Nie udało mi się tego zrobić.'], ['no_chance', 'Jeszcze nie było okazji.']].map(([id, label]) => <button key={id} aria-pressed={checkin === id} onClick={() => { setCheckin(id); event('experiment_reviewed'); }}>{label}</button>)}</div>
        {checkin && <p className="dd-notice" role="status">{refined ? CHECKIN[checkin] : checkin === 'helped' ? result.insight.yes : checkin === 'unchanged' ? result.insight.no : CHECKIN[checkin]}</p>}
      </details>}
      <section ref={invitationSection} className="dd-invitation" aria-label="Zaproszenie do prowadzenia">
        <p className="dd-eyebrow">CO DALEJ</p>
        <h2>{fit === 'medical' ? 'Z tym zwróć się do lekarza.' : fit === 'self' ? 'Wróć z tym, co wyszło.' : ['off', 'obvious'].includes(reaction) ? 'Chcesz przyjrzeć się temu ze mną?' : 'Chcesz, żebym pomógł Ci to poukładać?'}</h2>
        <details className="dd-details dd-fit"><summary>Wybierz, czego teraz potrzebujesz</summary>
          <div className="dd-options">{FIT_OPTIONS.map(o => <button key={o.id} aria-pressed={fit === o.id} onClick={() => { setFit(o.id); setObjection(''); setStatus(''); event('next_step_selected'); }}>{o.label}</button>)}</div>
          {fit === 'coaching' && <><h3>Co chcesz wiedzieć przed decyzją?</h3><div className="dd-options">{OBJECTION_OPTIONS.map(o => <button key={o.id} aria-pressed={objection === o.id} onClick={() => { setObjection(o.id); event('decision_question_answered'); }}>{o.label}</button>)}</div></>}
        </details>
        <p className="dd-invite-copy" aria-live="polite">{invite.text}</p>
        {invite.showNabor && <><a className="dd-primary" href={NABOR_URL} onClick={() => event('nabor_clicked', { placement: 'result' })}>{invite.cta} <span>↗</span></a><p className="dd-micro">Zakres, sposób pracy i koszt.</p></>}
        {fit === 'coaching' && <details className="dd-details"><summary>Wyślij mi wynik do rozmowy o prowadzeniu</summary>
          <p>Jeśli chcesz porozmawiać o prowadzeniu, możesz wysłać mi wynik razem ze swoim @Instagram.</p>
          <label className="dd-input-label" htmlFor="dd-ig">Twój Instagram</label><input id="dd-ig" value={instagram} autoComplete="off" placeholder="@twoj_nick" onChange={e => setInstagram(e.target.value)} maxLength={31} />
          <label className="dd-consent"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /><span>Chcę wysłać Michałowi odpowiedzi z diagnostyki, ocenę wyniku i wybrane doprecyzowanie. Proszę o kontakt na Instagramie w sprawie prowadzenia.</span></label>
          <button className="dd-secondary" disabled={sending || sent || !consent || !/^[A-Za-z0-9._]{2,30}$/.test(instagram.trim().replace(/^@/, ''))} onClick={sendContact}>{sent ? 'Wynik wysłany ✓' : sending ? 'Wysyłam…' : 'Wyślij mój wynik'}</button>
          {status && <p role="status" className="dd-notice">{status}</p>}
        </details>}
      </section>
      <details className="dd-details dd-content"><summary>Pomóż mi wybrać kolejne tematy</summary>
        <p>Twoje odpowiedzi mogą pomóc mi wybrać tematy kolejnych materiałów. Udostępnienie ich jest opcjonalne.</p>
        <p>Do analityki PostHog trafią: powód wejścia, wybrana scena, wcześniejszy moment, poprzednie próby, ograniczenie i koszt. Jeśli je wybierzesz, także potrzeba pomocy, obiekcja i ocena wyniku. Bez nicku, kontaktu, liczb i treści raportu. Kategorie mogą być powiązane z identyfikatorem tej przeglądarki.</p>
        <label className="dd-consent"><input type="checkbox" checked={contentConsent} disabled={shared} onChange={e => setContentConsent(e.target.checked)} /><span>Zgadzam się przekazać te kategorie Michałowi do planowania materiałów. Nie proszę w ten sposób o kontakt.</span></label>
        <button className="dd-secondary" disabled={!contentConsent || shared} onClick={shareTopics}>{shared ? 'Dzięki, przekazane ✓' : 'Udostępnij odpowiedzi do wyboru tematów'}</button>
        {shareError && <p role="status">{shareError}</p>}
      </details>
      <p className="dd-privacy">To automatyczne podsumowanie odpowiedzi. Proponuje próbę do sprawdzenia. Dolegliwości zdrowotne omów z lekarzem.</p>
      <button className="dd-link" onClick={restart}>Zacznij od nowa</button>
    </article>}
    <footer className="dd-footer">Michał · Hantle i Talerz · Diagnostyka 168</footer>
  </main>;
}
