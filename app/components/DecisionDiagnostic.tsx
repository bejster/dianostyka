'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Atmosphere } from '../diagnoza/atmosphere';
import { track, registerContext } from '../lib/analytics';
import {
  DECISION_VERSION, DECISION_STORAGE_KEY, NABOR_URL, FIT_OPTIONS, OBJECTION_OPTIONS,
  answerLabel, buildDecisionResult, cleanAnswers, getQuestions, invitation, isComplete,
  resultAsText, updateAnswer, type Answers,
} from '../lib/decision-diagnostic';
import './decision-diagnostic.css';

type Phase = 'intro' | 'questions' | 'result';
type Stored = { version: string; answers: Answers; phase: Phase; index: number; fit: string; objection: string; accepted: boolean; checkin: string };
function event(name: string, props: Record<string, unknown> = {}) {
  // Never send answer values, report text, health signals or contact details to product analytics.
  track(name, { analytics_schema: 'site-analytics-v1', surface: 'diagnostyka', version: DECISION_VERSION, ...props });
}
const CHECKIN: Record<string, string> = {
  helped: 'Zauważyłeś poprawę po wykonaniu zadania. Powtórz je przy podobnej okazji. Jeden lepszy dzień jeszcze nie rozstrzyga, co zadziałało.',
  unchanged: 'Wykonałeś zadanie i nie widzisz różnicy. To powód do ponownego sprawdzenia hipotezy. Zachowaj zapis sytuacji oraz tego, co faktycznie zrobiłeś.',
  blocked: 'Zadanie nie weszło. Zapisz, co je zatrzymało. Następna korekta powinna uwzględnić tę przeszkodę i wymagać mniej przygotowania.',
  no_chance: 'Podobna sytuacja jeszcze się nie wydarzyła. Nie ma wyniku do ocenienia. Wróć po najbliższej realnej okazji.',
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
  const sendingRef = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const startedAt = useRef(0);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const fast = search.get('mode') === 'fast_fit';
    setFastFit(fast);
    registerContext({ mode: fast ? 'fast_fit' : 'diagnostic', version: DECISION_VERSION });
    try {
      const text = localStorage.getItem(DECISION_STORAGE_KEY);
      if (text) {
        const saved = JSON.parse(text) as Stored;
        if (saved.version === DECISION_VERSION) {
          const clean = cleanAnswers(saved.answers);
          setAnswers(clean);
          const firstMissing = getQuestions(clean).findIndex(q => clean[q.id] === undefined);
          setIndex(Math.max(0, Math.min(Number.isInteger(saved.index) ? saved.index : 0, firstMissing < 0 ? getQuestions(clean).length - 1 : firstMissing)));
          if (!fast) setPhase(saved.phase === 'result' && isComplete(clean) ? 'result' : saved.phase === 'questions' ? 'questions' : 'intro');
          setFit(FIT_OPTIONS.some(o => o.id === saved.fit) ? saved.fit : '');
          setObjection(OBJECTION_OPTIONS.some(o => o.id === saved.objection) ? saved.objection : '');
          setAccepted(saved.accepted === true);
          setCheckin(CHECKIN[saved.checkin] ? saved.checkin : '');
        }
      }
    } catch { setStorageAvailable(false); }
    setLoaded(true);
    event('diag_intro_viewed');
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(DECISION_STORAGE_KEY, JSON.stringify({ version: DECISION_VERSION, phase, answers, index, fit, objection, accepted, checkin } satisfies Stored));
    } catch { setStorageAvailable(false); }
  }, [loaded, phase, answers, index, fit, objection, accepted, checkin]);

  const questions = getQuestions(answers);
  const current = questions[Math.min(index, questions.length - 1)];
  const result = buildDecisionResult(answers);
  const invite = invitation(fit, objection, String(answers.why || ''));
  const answeredCount = questions.filter(q => answers[q.id] !== undefined).length;
  useEffect(() => {
    if (!loaded || phase !== 'questions') return;
    startedAt.current = Date.now();
    heading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
    event('question_view', { question_id: current.id, pos: index + 1 });
  }, [loaded, phase, index, current.id]);

  function commit(value: string | number) {
    const next = updateAnswer(answers, current.id, value);
    setAnswers(next);
    setAccepted(false); setCheckin(''); setFit(''); setObjection(''); setStatus(''); setSent(false);
    event('question_answer', { question_id: current.id, pos: index + 1, elapsed_ms: Math.max(0, Date.now() - startedAt.current) });
    const nextQuestions = getQuestions(next);
    const nextIndex = nextQuestions.findIndex(q => q.id === current.id) + 1;
    if (nextIndex < nextQuestions.length) setIndex(nextIndex);
    else if (isComplete(next)) {
      setPhase('result');
      window.scrollTo({ top: 0, behavior: 'instant' });
      event('diag_complete', { question_count: nextQuestions.length });
      event('diag_result_viewed');
    }
  }
  function save() {
    const blob = new Blob([resultAsText(answers)], { type: 'text/plain;charset=utf-8' });
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
      const response = await fetch('/api/decision-lead', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ version: DECISION_VERSION, answers, fit, objection, instagram: handle, consent: true }) });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error('delivery_failed');
      setStatus('Wynik wysłany. Możesz teraz spokojnie zobaczyć szczegóły prowadzenia.');
      setSent(true);
      event('contact_provided');
    } catch { setStatus('Nie udało się wysłać wyniku. Możesz go pobrać i przejść na stronę prowadzenia.'); }
    finally { setSending(false); sendingRef.current = false; }
  }
  function restart() {
    setAnswers({}); setIndex(0); setFit(''); setObjection(''); setAccepted(false); setCheckin(''); setStatus(''); setSent(false); setConsent(false); setInstagram(''); setPhase('questions');
    event('diag_start');
  }
  const section = phase === 'intro' ? 'Twój tydzień' : phase === 'questions' ? 'Jedna odpowiedź, jeden krok' : 'Twój pierwszy krok';
  return <main className={`dd dd-${phase}`}>
    <Atmosphere />
    <header className="dd-header"><Link href="/" aria-label="Diagnostyka 168, początek">168<span>DIAGNOSTYKA</span></Link><span>{section}</span></header>
    {!loaded ? <div className="dd-shell" role="status">Otwieram diagnostykę…</div> : fastFit ? <section className="dd-shell dd-intro">
      <p className="dd-eyebrow">Prowadzenie 1:1</p>
      <h1>Chcesz zobaczyć, jak pracuję? Zapraszam do szczegółów.</h1>
      <p className="dd-lead">Na stronie znajdziesz przebieg prowadzenia, zakresy i koszt. Możesz od razu sprawdzić, czy to pasuje do Twojej sytuacji.</p>
      <a className="dd-primary" href={NABOR_URL} onClick={() => event('fast_fit_to_nabor')}>Zobacz prowadzenie <span>↗</span></a>
      <button className="dd-link" onClick={() => { setFastFit(false); setPhase('intro'); registerContext({ mode: 'diagnostic' }); event('fast_fit_to_diagnostic'); }}>Chcę najpierw sprawdzić swój tydzień</button>
    </section> : phase === 'intro' ? <section className="dd-shell dd-intro">
      <p className="dd-eyebrow">DIAGNOSTYKA 168 · DO 10 KRÓTKICH ODPOWIEDZI</p>
      <h1>W którym momencie tygodnia najtrudniej Ci zadbać o formę?</h1>
      <p className="dd-lead">Przejdziemy przez jedną sytuację z ostatniego tygodnia. Zobaczysz, co warto sprawdzić wcześniej i dostaniesz pierwszy krok do wykonania.</p>
      <button className="dd-primary" onClick={() => { setPhase('questions'); event('diag_start'); }}>Sprawdzam swój tydzień <span>→</span></button>
      <p className="dd-micro">Bezpłatnie · wynik od razu · kontakt opcjonalny</p>
      <aside className="dd-preview" aria-label="Przykład wyniku">
        <span className="dd-eyebrow">TAKI WYNIK DOSTANIESZ · PRZYKŁAD</span>
        <p className="dd-preview-title">Trening wypada, kiedy praca się przeciąga.</p>
        <p>Przed kolejnym dniem ustal krótszą wersję. Sprawdź, czy dzięki niej trening się odbędzie.</p>
        <span className="dd-preview-foot">Twoje odpowiedzi wybiorą Twój krok.</span>
      </aside>
      <p className="dd-privacy">Wynik powstaje automatycznie. Odpowiedzi zostają w tej przeglądarce, dopóki sam nie wybierzesz wysłania ich do Michała.</p>
    </section> : phase === 'questions' ? <section className="dd-shell dd-question" aria-label="Pytania diagnostyki">
      <div className="dd-progress-row"><button className="dd-back" onClick={() => index === 0 ? setPhase('intro') : setIndex(index - 1)}>← Wstecz</button><span>Pytanie {index + 1} {answers.scene && answers.previous ? `z ${questions.length}` : '· maks. 10'}</span></div>
      <div className="dd-progress" role="progressbar" aria-label="Postęp diagnostyki" aria-valuemin={0} aria-valuemax={answers.scene && answers.previous ? questions.length : 10} aria-valuenow={Math.min(index + 1, questions.length)}><span style={{ width: `${(index + 1) / (answers.scene && answers.previous ? questions.length : 10) * 100}%` }} /></div>
      <h1 ref={heading} tabIndex={-1}>{current.title}</h1>
      <p className="dd-hint">{current.hint}</p>
      <div className={`dd-options ${current.type === 'number' || current.id === 'frequency' ? 'dd-numbers' : ''}`}>
        {(current.type === 'number' ? Array.from({ length: (current.max ?? 7) + 1 }, (_, n) => ({ id: String(n), label: String(n) })) : current.options || []).map(o => <button key={o.id} aria-pressed={String(answers[current.id]) === o.id} onClick={() => commit(current.type === 'number' ? Number(o.id) : o.id)}>{o.label}<span aria-hidden="true">→</span></button>)}
      </div>
      <p className="dd-micro">Kliknięcie zapisuje odpowiedź. Możesz cofnąć się i ją zmienić.</p>
      {!storageAvailable && <p className="dd-notice">Ta przeglądarka nie pozwala zapisać postępu. Przed zamknięciem pobierz wynik.</p>}
    </section> : <article className="dd-shell dd-result">
      <p className="dd-eyebrow">TWÓJ WYNIK · {answeredCount} ODPOWIEDZI</p>
      <h1>{result.title}</h1>
      <p className="dd-lead">{result.hypothesis}</p>
      <div className="dd-receipts">
        {result.evidence.filter(e => ['scene', 'before'].includes(e.id)).map(e => <div key={e.id}><span>{e.id === 'scene' ? 'Ostatnia sytuacja' : 'Co było wcześniej'}</span><p>{e.value}</p></div>)}
        {answers.scene === 'training' && typeof answers.planned === 'number' && <div><span>Twój zapis treningów</span><p>{answers.planned === 0 ? 'Nie zaplanowałeś treningu na ten tydzień.' : `Zaplanowane: ${answers.planned}. Niewykonane: ${answers.missed}.`}</p></div>}
        {answers.frequency !== undefined && <div><span>{answers.scene === 'weekend' ? 'Ostatnie cztery weekendy' : 'Ostatnie siedem dni'}</span><p>{answers.frequency === 'unknown' ? 'Nie pamiętasz, ile razy było podobnie.' : `Podobna sytuacja: ${answers.frequency} z ${answers.scene === 'weekend' ? 4 : 7}.`}</p></div>}
      </div>
      <section className="dd-action" aria-label="Pierwszy krok">
        <p className="dd-eyebrow">PIERWSZA PRÓBA</p><h2>{result.experiment.title}</h2>
        <p>{result.experiment.action}</p>
        <div className="dd-action-detail"><span>Kiedy</span><p>{result.experiment.when}</p></div>
        <div className="dd-action-detail"><span>Co zapisać</span><p>{result.experiment.observe}</p></div>
        <p className="dd-constraint">{result.constraint}</p>
        <button className="dd-primary" onClick={() => { setAccepted(true); event('experiment_accepted'); }}>{accepted ? 'Wracam po tej próbie ✓' : 'Sprawdzę ten krok'}<span>→</span></button>
        {accepted && <p role="status" className="dd-micro">{storageAvailable ? 'Możesz wrócić do wyniku w tej samej przeglądarce. Pobierz go też na później.' : 'Pobierz wynik, żeby mieć go po zamknięciu strony.'}</p>}
      </section>
      <button className="dd-secondary dd-save" onClick={save}>Pobierz wynik i zadanie ↓</button>
      <details className="dd-details"><summary>Dlaczego taki krok i z czego wynika?</summary>
        <h3>Poprzednia próba</h3><p>{answerLabel(answers, 'previous')}</p><p>{result.previous}</p>
        <h3>Po czym ocenić tę próbę</h3><p>{result.goalMetric}</p>{result.impact && <p>{result.impact}</p>}
        <h3>Dlaczego teraz</h3><p>{result.timing}</p>
        <h3>Wszystkie Twoje odpowiedzi</h3><dl>{result.evidence.map(e => <div key={e.id}><dt>{e.label}</dt><dd>{e.value}</dd></div>)}</dl>
        <button className="dd-link" onClick={() => { setIndex(0); setPhase('questions'); }}>Popraw odpowiedzi</button>
      </details>
      {accepted && <details className="dd-details"><summary>Wracasz po próbie? Zapisz, co wyszło.</summary>
        <p>Oceń wykonanie przy podobnej sytuacji. Po kilku dniach nie rozstrzygamy jeszcze efektu na sylwetkę ani przyczyny dolegliwości.</p>
        <div className="dd-options">{[['helped', 'Zrobiłem zadanie i zauważyłem poprawę.'], ['unchanged', 'Zrobiłem zadanie. Nie widzę różnicy.'], ['blocked', 'Nie udało mi się wykonać zadania.'], ['no_chance', 'Nie było jeszcze podobnej okazji.']].map(([id, label]) => <button key={id} aria-pressed={checkin === id} onClick={() => { setCheckin(id); event('experiment_reviewed'); }}>{label}</button>)}</div>
        {checkin && <p className="dd-notice" role="status">{CHECKIN[checkin]}</p>}
      </details>}
      <section className="dd-invitation" aria-label="Zaproszenie do prowadzenia">
        <p className="dd-eyebrow">DALEJ MOŻESZ DZIAŁAĆ SAM ALBO ZE MNĄ</p>
        <h2>Co dalej z tym wynikiem?</h2>
        <p>Masz jedną rzecz do sprawdzenia. W prowadzeniu wracam do tego, co wydarzyło się w tygodniu: czy zmiana weszła, co ją zatrzymało i co poprawić dalej.</p>
        <details className="dd-details dd-fit"><summary>Sprawdź, czy takiej pomocy szukasz</summary>
          <p>Czego teraz potrzebujesz?</p><div className="dd-options">{FIT_OPTIONS.map(o => <button key={o.id} aria-pressed={fit === o.id} onClick={() => { setFit(o.id); setObjection(''); setStatus(''); event('next_step_selected'); }}>{o.label}</button>)}</div>
          {fit === 'coaching' && <><h3>Co chcesz wiedzieć, zanim rozważysz prowadzenie?</h3><div className="dd-options">{OBJECTION_OPTIONS.map(o => <button key={o.id} aria-pressed={objection === o.id} onClick={() => { setObjection(o.id); event('decision_question_answered'); }}>{o.label}</button>)}</div></>}
        </details>
        <p className="dd-invite-copy" aria-live="polite">{invite.text}</p>
        {invite.showNabor && <><a className="dd-primary" href={NABOR_URL} onClick={() => event('nabor_clicked')}>{invite.cta} <span>↗</span></a><p className="dd-micro">Przechodzisz do opisu prowadzenia. Samo wejście do niczego Cię nie zobowiązuje.</p></>}
        {fit === 'coaching' && <details className="dd-details"><summary>Chcę wysłać Michałowi ten wynik</summary>
          <p>Wyślesz swoje odpowiedzi i @Instagram do Michała, żeby mógł wrócić do Ciebie w sprawie prowadzenia. To opcjonalne.</p>
          <label className="dd-input-label" htmlFor="dd-ig">Twój Instagram</label><input id="dd-ig" value={instagram} autoComplete="off" placeholder="@twoj_nick" onChange={e => setInstagram(e.target.value)} maxLength={31} />
          <label className="dd-consent"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /><span>Chcę wysłać Michałowi odpowiedzi z diagnostyki i proszę o kontakt na Instagramie w sprawie prowadzenia.</span></label>
          <button className="dd-secondary" disabled={sending || sent || !consent || !/^[A-Za-z0-9._]{2,30}$/.test(instagram.trim().replace(/^@/, ''))} onClick={sendContact}>{sent ? 'Wynik wysłany ✓' : sending ? 'Wysyłam…' : 'Wyślij mój wynik'}</button>
          {status && <p role="status" className="dd-notice">{status}</p>}
        </details>}
      </section>
      <p className="dd-privacy">To automatyczne podsumowanie Twoich odpowiedzi. Hipotezy wymagają sprawdzenia. Dolegliwości zdrowotne omów z lekarzem.</p>
      <button className="dd-link" onClick={restart}>Zacznij od nowa</button>
    </article>}
    <footer className="dd-footer">Michał · Hantle i Talerz · Diagnostyka 168</footer>
  </main>;
}
