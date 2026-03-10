'use client';
import { useState, useRef } from 'react';

type SevKey = 'sleepQ' | 'screenBed' | 'stress' | 'energy' | 'dopamine' | 'dietChaos' | 'binge';
type ChipKey = 'fatigue' | 'mood' | 'libido' | 'belly' | 'brain' | 'anxiety' | 'joints' | 'skin' | 'motivation' | 'digest';

interface FD {
  sleep: number; sleepQ: number; screenBed: number; stress: number; energy: number;
  dopamine: number; dietChaos: number; junk: number; binge: number; wknd: number;
  drinks: number; cash: number; subs: number; lost: number; plan: number;
  miss: number; gym: number; rate: number; prodDrop: number; tags: Set<ChipKey>;
}

const INIT: FD = {
  sleep: 7, sleepQ: 0, screenBed: 0, stress: 0, energy: 0, dopamine: 0,
  dietChaos: 0, junk: 0, binge: 0, wknd: 1, drinks: 0, cash: 0,
  subs: 0, lost: 0, plan: 0, miss: 0, gym: 150, rate: 60, prodDrop: 0,
  tags: new Set(),
};

const SECTIONS = ['Sen', 'Stres', 'Jedzenie', 'Weekend', 'Trening', 'Sygnały'];

function costs(D: FD) {
  // ── TWARDE KOSZTY — wydajesz wprost, weryfikowalne ──
  const wkndCost = Math.round((D.cash + D.subs) * D.wknd * 6);
  const foodCost = Math.round(D.junk * 6 + (D.binge >= 3 ? 300 : 0));
  const trainCost = D.plan > 0 ? Math.round(D.gym * 6 * Math.min(D.miss / D.plan, 1)) : 0;
  // Sen: kompensacja deficytu — kawa, suplementy, gorsze decyzje zakupowe (Cappuccio 2010)
  const sleepCost = D.sleep < 7 ? Math.round((7.5 - D.sleep) * 100 * 6) : 0;

  // ── UKRYTE KOSZTY — szacunek oparty na badaniach naukowych ──
  // Produktywność: mgła × stawka × 26 tyg. (RAND 2016: <6h snu = -2.4% GDP; Hemp HBR 2004: prezenteizm 3× droższy niż absencja)
  const prodCost = Math.round(D.lost * 26 * D.rate);
  // Stagnacja: treningi bez progresu bo fundamenty nie grają
  // (Parr 2014: alkohol -24-37% synteza białek; Halson 2014: deficyt snu = upośledzona regeneracja;
  //  Schoenfeld 2017: progres wymaga progressive overload + regeneracja + dieta jednocześnie)
  const brakes = [
    D.sleepQ >= 2 || D.sleep < 6.5,       // kiepski sen / za mało snu
    D.dietChaos >= 2 || D.binge >= 2,      // chaos w diecie
    D.stress >= 3 || D.energy >= 3,        // wysoki stres / wypalenie
    D.drinks > 5 || D.subs > 0,           // alkohol / substancje
    D.dopamine >= 3,                       // rozregulowana dopamina
  ].filter(Boolean).length;
  const wastedPct = Math.min(brakes * 12, 60);
  const wastedSessions = D.plan > 0 ? Math.round(D.plan * 26 * wastedPct / 100) : 0;
  const stagnationMonths = Math.round(brakes * 1.5 * 10) / 10;
  const costPerSession = D.plan > 0 ? D.gym / (D.plan * 4) : 0;
  const stagnationCost = Math.round(wastedSessions * (costPerSession + 1.25 * Math.max(D.rate * 0.2, 10)));
  // Symptomy: suplementy, wizyty, kompensacja sygnałów ciała (180 zł / symptom / 6 mies.)
  const signalCost = Math.round(D.tags.size * 180);

  const totalLostH = Math.round(D.lost * 26);
  const hardTotal = wkndCost + foodCost + trainCost + sleepCost;
  const hiddenTotal = prodCost + stagnationCost + signalCost;
  const total = hardTotal + hiddenTotal;

  return { sleepCost, foodCost, wkndCost, trainCost, prodCost, stagnationCost, signalCost,
           total, hardTotal, hiddenTotal, totalLostH,
           brakes, wastedPct, wastedSessions, stagnationMonths };
}

function score(D: FD) {
  const s = Math.min(((D.sleepQ + D.screenBed) / 8 + (7.5 - Math.min(D.sleep, 7.5)) / 2) * 15, 15)
    + Math.min(((D.stress + D.energy + D.dopamine) / 12) * 20, 20)
    + Math.min(((D.dietChaos + D.binge) / 8) * 12, 12)
    + Math.min((D.drinks / 15) * 12 + (D.subs > 0 ? 8 : 0), 20)
    + Math.min((D.miss / 3) * 10, 10)
    + Math.min((D.tags.size / 6) * 18, 18)
    + Math.min((D.prodDrop / 4) * 5, 5);
  return Math.min(Math.round(s), 100);
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
  red: '#dc4444',
  org: '#e8923a',
  yel: '#d4a82a',
  grn: '#3cba5e',
  t1: '#ffffff',
  t2: '#e0ddd6',
  t3: '#b8b3a8',
  t4: '#8a857a',
  mono: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
  sans: "'Inter', system-ui, -apple-system, sans-serif",
};

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
  const [rateMode, setRateMode] = useState<'hourly' | 'salary'>('hourly');
  const [salaryInput, setSalaryInput] = useState(10000);
  const topRef = useRef<HTMLDivElement>(null);

  const upd = (k: keyof FD, v: number) => setD(p => ({ ...p, [k]: v }));
  const sev = (k: SevKey, v: number) => setD(p => ({ ...p, [k]: v }));
  const tog = (t: ChipKey) => setD(p => {
    const tags = new Set(p.tags); tags.has(t) ? tags.delete(t) : tags.add(t);
    return { ...p, tags };
  });

  const go = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (sec < SECTIONS.length - 1) setSec(s => s + 1);
    else setPhase('gate');
  };
  const back = () => { setSec(s => s - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const submit = async () => {
    // Walidacja IG handle
    const handle = igHandle.trim().replace(/^@/, '');
    if (!handle) { setIgErr('Podaj nick na Instagramie'); return; }
    // Walidacja email
    if (!email.includes('@') || !email.includes('.')) { setEmailErr('Podaj poprawny email'); return; }
    setLoading(true);
    const c = costs(D); const sc = score(D);
    const finalHandle = '@' + handle;
    const odpowiedzi = {
      sleep: D.sleep, sleepQ: D.sleepQ, screenBed: D.screenBed,
      stress: D.stress, energy: D.energy, dopamine: D.dopamine,
      dietChaos: D.dietChaos, junk: D.junk, binge: D.binge,
      wknd: D.wknd, drinks: D.drinks, cash: D.cash, subs: D.subs,
      lost: D.lost, plan: D.plan, miss: D.miss, gym: D.gym,
      rate: D.rate, prodDrop: D.prodDrop, tags: Array.from(D.tags),
    };
    const biggest = catData.reduce((a, b) => a.v > b.v ? a : b, catData[0]);
    const payload = {
      instagram_handle: finalHandle,
      email,
      imie: imie.trim() || null,
      wynik_kwota: String(c.total),
      wynik_score: String(sc),
      biggest_category: biggest?.l || '',
      timestamp: new Date().toISOString(),
      source: 'diagnostyka_hit',
      odpowiedzi,
    };
    // Wyslij do API (MailerLite + webhook n8n)
    try {
      await fetch('/api/subscribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      // Fallback: zapisz w sessionStorage na retry
      try { sessionStorage.setItem('diag_lead_retry', JSON.stringify(payload)); } catch {}
    }
    setPhase('results');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const C = costs(D); const SC = score(D);
  const pct = Math.round((sec / SECTIONS.length) * 100);
  const scoreColor = SC >= 75 ? M.red : SC >= 50 ? M.org : SC >= 25 ? M.yel : M.grn;
  const circ = 2 * Math.PI * 64;
  const offset = circ - (SC / 100) * circ;

  const catData = [
    { ic: '🍺', v: C.wkndCost, l: 'Weekendy', c: M.gold, type: 'hard' },
    { ic: '🍔', v: C.foodCost, l: 'Jedzenie', c: M.org, type: 'hard' },
    { ic: '🏋️', v: C.trainCost, l: 'Trening', c: M.grn, type: 'hard' },
    { ic: '😴', v: C.sleepCost, l: 'Sen', c: '#a08ae0', type: 'hard' },
    { ic: '⏰', v: C.prodCost, l: 'Produktywność', c: '#4abace', type: 'hidden' },
    { ic: '📉', v: C.stagnationCost, l: 'Stagnacja', c: '#e05a7a', type: 'hidden' },
    { ic: '⚡', v: C.signalCost, l: 'Symptomy', c: M.red, type: 'hidden' },
  ].filter(x => x.v > 0);
  const maxC = Math.max(...catData.map(x => x.v), 1);

  const hormones: { n: string; a: string; i: string; c: string }[] = [];
  if (D.sleep < 6.5 || D.sleepQ >= 3) hormones.push({ n: 'HGH', a: '↓', i: 'Obniżona regeneracja', c: M.org });
  if (D.drinks > 5 || D.subs > 0 || D.tags.has('libido')) hormones.push({ n: 'Testosteron', a: '↓', i: D.drinks > 10 || D.subs > 0 ? 'Mocny spadek' : 'Spadek', c: D.drinks > 10 || D.subs > 0 ? M.red : M.org });
  if (D.stress >= 3 || D.sleepQ >= 3) hormones.push({ n: 'Kortyzol', a: '↑', i: 'Chronicznie wysoki', c: M.red });
  if (D.dopamine >= 3 || D.tags.has('motivation')) hormones.push({ n: 'Dopamina', a: '⚡', i: 'Desensytyzacja', c: M.red });
  if (D.tags.has('mood') || D.subs > 0) hormones.push({ n: 'Serotonina', a: '↓', i: D.subs > 0 ? 'Deplecja' : 'Spadek', c: D.subs > 0 ? M.red : M.org });
  if (D.tags.has('belly') || D.binge >= 3) hormones.push({ n: 'Insulina', a: '↑', i: 'Insulinooporność', c: M.org });
  if (D.sleepQ >= 3 || D.screenBed >= 3) hormones.push({ n: 'Melatonina', a: '↓', i: 'Zaburzony cykl', c: M.org });

  const insights: string[] = [];
  if (D.tags.size >= 5) insights.push(`Zaznaczyłeś <b>${D.tags.size} z 10 sygnałów</b>. To wzorzec który się pogłębia z każdym tygodniem.`);
  else if (D.tags.size >= 3) insights.push(`<b>${D.tags.size} sygnały</b> kręcą spiralę. Zmęczenie → gorsza dieta → gorszy trening → i tak w kółko.`);
  if (D.dopamine >= 3 && D.binge >= 2) insights.push(`Głód dopaminowy + objadanie = <b>rozregulowany układ nagrody</b>. To biochemia, nie słaba wola.`);
  if (D.tags.has('libido') && (D.stress >= 3 || D.sleep < 6.5)) insights.push(`Niższe libido + ${D.stress >= 3 ? 'chroniczny stres' : 'kiepski sen'} = <b>klasyka spadku testosteronu</b>. Badania 10 199 mężczyzn: to styl życia, nie wiek.`);
  if (D.tags.has('belly') && (D.binge >= 2 || D.dietChaos >= 3)) insights.push(`Brzuch nie schodzi + objadanie = <b>insulinooporność w budowie</b>. Sam trening tego nie przebije.`);
  if (D.drinks > 10 && D.tags.has('libido')) insights.push(`${D.drinks} drinków regularnie + niższe libido. 14+ drinków tygodniowo = <b>~6.8% chroniczny spadek T</b>. Alkohol zamienia testosteron w estrogen.`);
  if (C.total > 8000) insights.push(`<b>${C.total.toLocaleString('pl-PL')} zł w pół roku</b>. Na konsekwencje, nie na sam weekend.`);

  const comparisons: string[] = [];
  if (C.total > 5000) comparisons.push('pół roku profesjonalnego prowadzenia');
  if (C.total > 8000) comparisons.push('wakacje all-inclusive');
  if (C.total > 15000) comparisons.push('używany samochód');
  if (C.total > 30000) comparisons.push('wkład własny na mieszkanie');

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
    timeline.push({ period: 'Cały dzień', text: `Wysoki stres + niska energia = <b>kortyzol chronicznie podwyższony</b>. Ciało w trybie przetrwania: magazynuje tłuszcz na brzuchu, rozkłada mięśnie na energię, tłumi libido. Biochemia, nie słabość.` });
  }
  if (D.wknd > 0 && D.drinks > 3) {
    timeline.push({ period: 'Weekend', text: `${D.drinks} drinków x ${D.wknd} weekendów. Dawka >1.5g/kg alkoholu (5-6 piw dla 70kg) = <b>spadek testosteronu o ~27% w 12h</b>, normalizacja po 36h. ${D.subs > 0 ? 'Substancje dodatkowo wyczerpują serotoninę i dopaminę.' : 'Synteza białek mięśniowych zatrzymana na 2-3 dni.'}` });
  }
  if (D.dietChaos >= 3 || D.binge >= 3) {
    timeline.push({ period: 'Cyklicznie', text: `Chaotyczne jedzenie${D.binge >= 3 ? ' + cykliczne objadanie' : ''} = <b>skoki insuliny</b>. Ciało nie wie kiedy budować, kiedy spalać. Domyślnie magazynuje. Tłuszcz trzewny to bezpośredni efekt.` });
  }
  if (C.totalLostH > 20) {
    timeline.push({ period: '6 miesięcy', text: `<b>${C.totalLostH}h</b> pracy na autopilocie. Przy Twojej stawce to <b>${C.prodCost.toLocaleString('pl-PL')} zł</b>. Twój mózg chemicznie nie jest w stanie działać na 100% kiedy hormony, sen i dieta nie grają.` });
  }

  // Severity opcje - zielony→żółty→pomarańczowy→czerwony (czytelne)
  const sevOpts = [{ n: '0', l: 'Brak' }, { n: '1', l: 'Rzadko' }, { n: '2', l: 'Często' }, { n: '3', l: 'Zawsze' }];
  const sevColors = ['#3cba5e', '#d4a82a', '#e8923a', '#dc4444'];

  const SevField = ({ label, sub, k, val }: { label: string; sub?: string; k: SevKey; val: number }) => (
    <div style={{ marginBottom: 26 }}>
      <div style={{ fontSize: 15, color: M.t1, fontWeight: 500, marginBottom: sub ? 6 : 12, lineHeight: 1.45 }}>
        {label}{sub && <span style={{ display: 'block', fontSize: 12.5, color: M.t3, marginTop: 4, fontWeight: 400 }}>{sub}</span>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
        {sevOpts.map((o, i) => {
          const on = val === i;
          return (
            <button key={i} onClick={() => sev(k, i)} style={{
              padding: '14px 4px', textAlign: 'center',
              border: `1.5px solid ${on ? sevColors[i] : M.brd2}`,
              background: on ? sevColors[i] + '12' : M.s1,
              cursor: 'pointer', borderRadius: 10,
              transition: 'all .2s ease',
              transform: on ? 'scale(1.03)' : 'scale(1)',
            }}>
              <span style={{ fontFamily: M.mono, fontSize: 18, fontWeight: 700, display: 'block', marginBottom: 3, color: on ? sevColors[i] : M.t3 }}>{o.n}</span>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: on ? sevColors[i] : M.t4, textTransform: 'uppercase', letterSpacing: 0.8 }}>{o.l}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const Slider = ({ label, min, max, step, k, val, unit, note }: { label: string; min: number; max: number; step: number; k: keyof FD; val: number; unit: string; note?: string }) => {
    const p = ((val - min) / (max - min)) * 100;
    const hot = unit === 'h' ? val < 7 : val > 0;
    return (
      <div style={{ marginBottom: 28 }}>
        {label && <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <span style={{ fontSize: 15, color: M.t1, fontWeight: 500, flex: 1, lineHeight: 1.45 }}>{label}</span>
          <span style={{ fontFamily: M.mono, fontSize: 17, fontWeight: 700, color: hot ? M.gold : M.t1, minWidth: 60, textAlign: 'right' }}>{val}{unit}</span>
        </div>}
        <div style={{ position: 'relative', height: 48, display: 'flex', alignItems: 'center' }}>
          <div style={{ position: 'absolute', left: 0, right: 0, height: 6, background: M.s3, borderRadius: 3, top: '50%', marginTop: -3 }} />
          <div style={{ position: 'absolute', left: 0, height: 6, width: `${p}%`, background: hot ? M.gold : M.t4, borderRadius: 3, transition: 'width .2s cubic-bezier(.4,0,.2,1)', top: '50%', marginTop: -3, opacity: hot ? 0.8 : 0.4 }} />
          <input type="range" min={min} max={max} step={step} value={val} onChange={e => upd(k, parseFloat(e.target.value))} style={{ width: '100%', height: 48, WebkitAppearance: 'none', background: 'transparent', position: 'relative', zIndex: 2, cursor: 'pointer', margin: 0, padding: 0 }} />
        </div>
        {note && <div style={{ textAlign: 'right', fontFamily: M.mono, fontSize: 11, color: M.t3, marginTop: 6 }}>{note}</div>}
      </div>
    );
  };

  const Chip = ({ t, label }: { t: ChipKey; label: string }) => {
    const on = D.tags.has(t);
    return (
      <div onClick={() => tog(t)} style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '15px 16px',
        background: on ? M.gold + '10' : M.s1,
        border: `1.5px solid ${on ? M.gold + '40' : M.brd2}`,
        cursor: 'pointer', marginBottom: 6, borderRadius: 12,
        transition: 'all .2s ease',
        transform: on ? 'scale(1.01)' : 'scale(1)',
      }}>
        <div style={{
          width: 22, height: 22,
          border: `2px solid ${on ? M.gold : M.brd2}`,
          background: on ? M.gold : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderRadius: 6,
          transition: 'all .2s ease',
        }}>
          {on && <span style={{ fontSize: 11, color: '#0a0a0a', fontWeight: 700 }}>✓</span>}
        </div>
        <span style={{ flex: 1, fontSize: 14.5, fontWeight: on ? 500 : 400, color: on ? M.t1 : M.t2 }}>{label}</span>
      </div>
    );
  };

  const SH = ({ n, title }: { n: string; title: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
      <div style={{ fontFamily: M.mono, fontSize: 10, fontWeight: 700, background: M.gold, color: M.bg, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderRadius: 8 }}>{n}</div>
      <div style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: M.t2 }}>{title}</div>
    </div>
  );

  // Logo komponent — okrągłe logo + tekst
  const Logo = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
      <img src="/logo-circle.png" alt="Hantle i Talerz" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
      <span style={{ fontFamily: M.mono, fontSize: 10, fontWeight: 700, letterSpacing: 3.5, textTransform: 'uppercase', color: M.t3 }}>Hantle i Talerz</span>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;700;800&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        body{background:${M.bg};color:${M.t1};font-family:${M.sans};min-height:100vh;overflow-x:hidden;-webkit-font-smoothing:antialiased;width:100%}
        h1,h2,h3{text-shadow:0 0 20px rgba(255,255,255,.1),0 1px 2px rgba(0,0,0,.6)}
        p,span,div,label{text-shadow:0 1px 2px rgba(0,0,0,.4)}
        body::before{content:'';position:fixed;inset:0;background:radial-gradient(ellipse 80% 50% at 50% 0%,#141210 0%,transparent 60%);pointer-events:none;z-index:0}
        body::after{content:'';position:fixed;inset:0;opacity:.35;background:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.03'/%3E%3C/svg%3E");pointer-events:none;z-index:0}

        input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:48px;background:transparent;cursor:pointer;margin:0;touch-action:none;-webkit-tap-highlight-color:transparent}
        input[type=range]::-webkit-slider-runnable-track{height:6px;background:transparent;border-radius:3px;cursor:pointer}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;background:${M.gold};border:none;border-radius:50%;cursor:grab;box-shadow:0 1px 4px rgba(0,0,0,.5),0 0 0 4px rgba(200,168,78,.12);margin-top:-8px}
        input[type=range]::-webkit-slider-thumb:active{cursor:grabbing;box-shadow:0 1px 6px rgba(0,0,0,.5),0 0 0 8px rgba(200,168,78,.15);width:24px;height:24px;margin-top:-9px}
        input[type=range]::-moz-range-thumb{width:22px;height:22px;background:${M.gold};border:none;border-radius:50%;cursor:grab;box-shadow:0 1px 4px rgba(0,0,0,.5),0 0 0 4px rgba(200,168,78,.12)}
        input[type=range]::-moz-range-track{background:transparent;height:6px;border:none;cursor:pointer}

        input[type=email],input[type=text]{width:100%;padding:16px 18px;background:${M.s1};border:1.5px solid ${M.brd2};color:${M.t1};font-size:16px;font-weight:500;font-family:${M.sans};outline:none;border-radius:12px;transition:border-color .2s ease}
        input[type=email]:focus,input[type=text]:focus{border-color:${M.gold}}
        input[type=email]::placeholder,input[type=text]::placeholder{color:${M.t4}}

        button{font-family:${M.sans};transition:all .2s ease}
        button:hover{opacity:.9}
        button:active{transform:scale(0.98)}
        a{transition:opacity .2s ease}
        a:hover{opacity:.85}

        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .fade-up{animation:fadeUp .5s ease both}

        @keyframes pulse-gold{0%,100%{box-shadow:0 0 0 0 ${M.gold}20}50%{box-shadow:0 0 0 6px ${M.gold}00}}

        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:${M.brd2};border-radius:2px}
      `}</style>

      <div ref={topRef} style={{ maxWidth: 440, width: '100%', margin: '0 auto', padding: '0 0 60px', position: 'relative', zIndex: 1 }}>

        {/* ── FORM ── */}
        {phase === 'form' && (
          <>
            {/* Top bar z logo + progress */}
            <div style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(10,10,10,0.94)', backdropFilter: 'blur(24px)', borderBottom: `1px solid ${M.brd}`, padding: '12px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Logo />
                <span style={{ fontFamily: M.mono, fontSize: 11, fontWeight: 700, color: M.gold }}>{pct}%</span>
              </div>
              <div style={{ height: 3, background: M.s2, overflow: 'hidden', borderRadius: 2 }}>
                <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${M.goldDim}, ${M.gold})`, transition: 'width 0.4s ease', borderRadius: 2 }} />
              </div>
              <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                {SECTIONS.map((s, i) => (
                  <div key={i} style={{ flex: 1, height: 2, background: i < sec ? M.gold : i === sec ? M.gold : M.s2, opacity: i < sec ? 0.5 : i === sec ? 1 : 0.3, transition: 'all .3s ease' }} title={s} />
                ))}
              </div>
            </div>

            {/* Live counter */}
            {C.total > 0 && (
              <div style={{ position: 'sticky', top: 72, zIndex: 99, background: 'rgba(10,10,10,0.94)', backdropFilter: 'blur(24px)', borderBottom: `1px solid ${M.brd}`, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: M.t4 }}>Straty / 6 mies.</span>
                <span style={{ fontFamily: M.mono, fontSize: 18, fontWeight: 700, color: M.gold, textShadow: `0 0 12px ${M.gold}25` }}>{C.total.toLocaleString('pl-PL')} zł</span>
              </div>
            )}

            <div style={{ padding: '0 16px' }}>
              {/* Hero - pierwszy ekran */}
              {sec === 0 && (
                <div className="fade-up" style={{ padding: '40px 0 32px', textAlign: 'center' }}>
                  <div style={{
                    display: 'inline-flex', fontFamily: M.mono, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase',
                    color: M.gold, border: `1px solid ${M.gold}25`, padding: '7px 18px', marginBottom: 22,
                    background: M.gold + '08', borderRadius: 20, fontWeight: 600,
                  }}>
                    ⚡ 2 minuty
                  </div>
                  <h1 style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.18, letterSpacing: -0.5, marginBottom: 16, color: M.t1, textShadow: '0 0 24px rgba(255,255,255,.1), 0 1px 3px rgba(0,0,0,.5)' }}>
                    Ile <em style={{ fontStyle: 'normal', color: M.gold }}>naprawdę</em> Cię kosztuje<br />to jak teraz żyjesz?
                  </h1>
                  <p style={{ color: M.t3, fontSize: 14.5, lineHeight: 1.65, fontWeight: 400, maxWidth: 340, margin: '0 auto 14px' }}>
                    Przeliczam hormony, mózg i formę na złotówki. Na bazie badań, nie opinii.
                  </p>
                  <div style={{ fontFamily: M.mono, fontSize: 10, color: M.t4, letterSpacing: 1.5 }}>🔒 Zero danych · Tylko Ty to widzisz</div>
                  <div style={{ fontFamily: M.mono, fontSize: 9.5, color: M.t4, letterSpacing: 1, marginTop: 8, opacity: 0.7 }}>📊 Kalkulacja oparta na 9 badaniach naukowych</div>
                </div>
              )}

              {/* Nagłówek sekcji (nie-hero) */}
              {sec > 0 && (
                <div className="fade-up" style={{ padding: '28px 0 24px' }}>
                  <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: M.t4, marginBottom: 8 }}>Sekcja {sec + 1}</div>
                  <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.3, color: M.t1, textShadow: '0 0 20px rgba(255,255,255,.08)' }}>{SECTIONS[sec]}</h2>
                </div>
              )}

              {sec === 0 && (
                <div className="fade-up">
                  <SH n="01" title="Ile śpisz naprawdę" />
                  <div style={{ fontSize: 14, color: M.t3, fontWeight: 400, paddingLeft: 38, marginBottom: 28 }}>Nie ile leżysz. Ile faktycznie śpisz.</div>
                  <Slider label="Średni sen w nocy" min={3} max={9} step={0.5} k="sleep" val={D.sleep} unit="h" note={`Deficyt vs 7.5h: ${Math.max((7.5 - D.sleep) * 7, 0).toFixed(0)}h / tydzień`} />
                  <SevField label="Jakość snu" sub="Budzisz się, kręcisz, masz płytki sen?" k="sleepQ" val={D.sleepQ} />
                  <SevField label="Telefon przed snem" sub="Scrollujesz w łóżku?" k="screenBed" val={D.screenBed} />
                </div>
              )}

              {sec === 1 && (
                <div className="fade-up">
                  <SevField label="Poziom stresu w ciągu dnia" k="stress" val={D.stress} />
                  <SevField label="Energia i motywacja" sub="Jak często czujesz się wypalony?" k="energy" val={D.energy} />
                  <SevField label="Głód dopaminowy" sub="Szukasz ciągłej stymulacji, trudno skupić się na nudnym zadaniu?" k="dopamine" val={D.dopamine} />
                  <Slider label="Ile godzin dziennie tracisz przez mgłę / wolniejsze myślenie?" min={0} max={4} step={0.5} k="lost" val={D.lost} unit="h" />
                  {/* Toggle: stawka godzinowa / pensja */}
                  <div style={{ marginBottom: 28 }}>
                    <div style={{ display: 'flex', background: M.s1, border: `1.5px solid ${M.brd2}`, borderRadius: 10, overflow: 'hidden', marginBottom: 14 }}>
                      {([['hourly', 'Stawka / godz.'], ['salary', 'Pensja / mies.']] as const).map(([mode, label]) => (
                        <button key={mode} onClick={() => {
                          setRateMode(mode);
                          if (mode === 'salary') upd('rate', Math.round(salaryInput / 168));
                          else upd('rate', 60);
                        }} style={{
                          flex: 1, padding: '12px 8px', border: 'none', cursor: 'pointer',
                          background: rateMode === mode ? M.gold + '15' : 'transparent',
                          borderBottom: rateMode === mode ? `2px solid ${M.gold}` : '2px solid transparent',
                          fontFamily: M.mono, fontSize: 11, fontWeight: rateMode === mode ? 700 : 500,
                          letterSpacing: 0.8, color: rateMode === mode ? M.gold : M.t4,
                          transition: 'all .2s ease',
                        }}>{label}</button>
                      ))}
                    </div>
                    {rateMode === 'hourly' ? (
                      <Slider label="Twoja stawka godzinowa" min={0} max={300} step={10} k="rate" val={D.rate} unit=" zł" />
                    ) : (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                          <span style={{ fontSize: 15, color: M.t1, fontWeight: 500, lineHeight: 1.45 }}>Pensja netto (na rękę)</span>
                          <span style={{ fontFamily: M.mono, fontSize: 17, fontWeight: 700, color: M.gold, minWidth: 80, textAlign: 'right' }}>{salaryInput.toLocaleString('pl-PL')} zł</span>
                        </div>
                        <div style={{ position: 'relative', height: 48, display: 'flex', alignItems: 'center' }}>
                          <div style={{ position: 'absolute', left: 0, right: 0, height: 6, background: M.s3, borderRadius: 3, top: '50%', marginTop: -3 }} />
                          <div style={{ position: 'absolute', left: 0, height: 6, width: `${((salaryInput - 3000) / (25000 - 3000)) * 100}%`, background: M.gold, borderRadius: 3, transition: 'width .2s cubic-bezier(.4,0,.2,1)', top: '50%', marginTop: -3, opacity: 0.8 }} />
                          <input type="range" min={3000} max={25000} step={500} value={salaryInput}
                            onChange={e => {
                              const v = parseFloat(e.target.value);
                              setSalaryInput(v);
                              upd('rate', Math.round(v / 168));
                            }}
                            style={{ width: '100%', height: 48, WebkitAppearance: 'none', background: 'transparent', position: 'relative', zIndex: 2, cursor: 'pointer', margin: 0, padding: 0 }} />
                        </div>
                        <div style={{ textAlign: 'right', fontFamily: M.mono, fontSize: 11, color: M.t3, marginTop: 6 }}>
                          = {D.rate} zł/godz. (168h pracy w miesiącu)
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {sec === 2 && (
                <div className="fade-up">
                  <SevField label="Chaos w diecie" sub="Jesz nieregularnie, omijasz posiłki, improwizujesz?" k="dietChaos" val={D.dietChaos} />
                  <SevField label="Cykliczne objadanie" sub="Po weekendach, stresie, z nudów?" k="binge" val={D.binge} />
                  <Slider label="Wydajesz miesięcznie na śmieciowe jedzenie" min={0} max={1000} step={50} k="junk" val={D.junk} unit=" zł" note={`6 miesięcy: ${(D.junk * 6).toLocaleString('pl-PL')} zł`} />
                </div>
              )}

              {sec === 3 && (
                <div className="fade-up">
                  <Slider label="Weekendy imprezowe w miesiącu" min={0} max={4} step={1} k="wknd" val={D.wknd} unit="" />
                  <Slider label="Drinki na imprezie (średnio)" min={0} max={20} step={1} k="drinks" val={D.drinks} unit="" note={D.drinks > 5 ? '5-6 piw = ~27% spadek testosteronu w 12h' : ''} />
                  <Slider label="Wydajesz na imprezie" min={0} max={500} step={50} k="cash" val={D.cash} unit=" zł" note={`Suma 6 mies.: ${(D.cash * D.wknd * 6).toLocaleString('pl-PL')} zł`} />
                  <Slider label="Wydajesz na substancje" min={0} max={500} step={50} k="subs" val={D.subs} unit=" zł" />
                </div>
              )}

              {sec === 4 && (
                <div className="fade-up">
                  <Slider label="Miesięczny koszt siłowni / trenera" min={0} max={500} step={50} k="gym" val={D.gym} unit=" zł" />
                  <Slider label="Planowane treningi w tygodniu" min={0} max={7} step={1} k="plan" val={D.plan} unit="" />
                  <Slider label="Ile opuszczasz przez zmęczenie / kaca" min={0} max={4} step={1} k="miss" val={D.miss} unit="" note={`Tracisz: ${D.miss * 4 * 6} treningów w 6 mies.`} />
                </div>
              )}

              {sec === 5 && (
                <div className="fade-up">
                  <div style={{ fontSize: 15, color: M.t2, fontWeight: 500, marginBottom: 18, lineHeight: 1.5 }}>Zaznacz co obserwujesz u siebie.</div>
                  {([
                    ['fatigue', 'Ciągłe zmęczenie mimo odpoczynku'],
                    ['mood', 'Wahania nastroju, drażliwość'],
                    ['libido', 'Obniżone libido lub motywacja seksualna'],
                    ['belly', 'Brzuch który nie schodzi mimo treningu'],
                    ['brain', 'Brain fog - mgła, problemy z koncentracją'],
                    ['anxiety', 'Niepokój, natrętne myśli'],
                    ['joints', 'Bóle stawów lub słaba regeneracja'],
                    ['skin', 'Pogorszona cera, wypryski'],
                    ['motivation', 'Brak motywacji, apatia'],
                    ['digest', 'Problemy trawienne, wzdęcia'],
                  ] as [ChipKey, string][]).map(([k, l]) => <Chip key={k} t={k} label={l} />)}
                </div>
              )}

              {/* Nav buttons */}
              <div style={{ display: 'flex', gap: 10, marginTop: 36, paddingBottom: 20 }}>
                {sec > 0 && (
                  <button onClick={back} style={{ flex: 1, padding: 16, background: M.s1, color: M.t3, border: `1.5px solid ${M.brd2}`, fontSize: 14, fontWeight: 600, cursor: 'pointer', borderRadius: 12 }}>
                    ← Wstecz
                  </button>
                )}
                <button onClick={go} style={{
                  flex: 2, padding: 18,
                  background: sec === SECTIONS.length - 1 ? M.gold : M.t1,
                  color: sec === SECTIONS.length - 1 ? '#0a0a0a' : M.bg,
                  border: 'none', fontFamily: M.mono, fontSize: 12, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: 2.5, cursor: 'pointer', borderRadius: 12,
                }}>
                  {sec === SECTIONS.length - 1 ? 'Oblicz moje straty →' : 'Dalej →'}
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

              {/* Czesciowy wynik — WOW moment */}
              <div style={{ marginTop: 32, marginBottom: 12 }}>
                <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: M.t4, marginBottom: 10 }}>Twój Damage Score</div>
                <div style={{ fontFamily: M.mono, fontSize: 72, fontWeight: 800, lineHeight: 1, color: scoreColor, textShadow: `0 0 30px ${scoreColor}30` }}>{SC}</div>
                <div style={{ fontFamily: M.mono, fontSize: 12, color: M.t4, marginTop: 6 }}>/100</div>
              </div>

              <div style={{ background: M.s1, border: `1px solid ${M.gold}20`, padding: 18, marginBottom: 28, borderRadius: 14 }}>
                <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: M.t4, marginBottom: 8 }}>Tracisz w 6 miesięcy</div>
                <div style={{ fontFamily: M.mono, fontSize: 36, fontWeight: 800, color: M.gold }}>{C.total.toLocaleString('pl-PL')} zł</div>
                <div style={{ fontFamily: M.mono, fontSize: 12, color: M.t4, marginTop: 4 }}>= {Math.round(C.total / 6).toLocaleString('pl-PL')} zł / miesiąc</div>
              </div>

              {/* Gate — formularz */}
              <h2 style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.25, letterSpacing: -0.5, marginBottom: 10, color: M.t1, textShadow: '0 0 20px rgba(255,255,255,.1)' }}>
                Twój wynik jest gotowy.
              </h2>
              <p style={{ fontSize: 14, color: M.t3, lineHeight: 1.6, marginBottom: 24, fontWeight: 400 }}>
                Podaj dane, żebym mógł spojrzeć na Twój wynik i powiedzieć Ci co z tym zrobić.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left' }}>
                {/* Instagram handle — wymagane */}
                <div>
                  <div style={{ fontSize: 11, color: M.t3, fontWeight: 600, marginBottom: 5, fontFamily: M.mono, letterSpacing: 0.5 }}>Nick na Instagramie *</div>
                  <input type="text" placeholder="@twojnick" value={igHandle}
                    onChange={e => { setIgHandle(e.target.value); setIgErr(''); }}
                    style={{ borderColor: igErr ? M.red : undefined }} />
                  {igErr && <div style={{ fontSize: 11, color: M.red, fontFamily: M.mono, marginTop: 4 }}>{igErr}</div>}
                </div>

                {/* Email — wymagane */}
                <div>
                  <div style={{ fontSize: 11, color: M.t3, fontWeight: 600, marginBottom: 5, fontFamily: M.mono, letterSpacing: 0.5 }}>Email *</div>
                  <input type="email" placeholder="twoj@email.com" value={email}
                    onChange={e => { setEmail(e.target.value); setEmailErr(''); }}
                    style={{ borderColor: emailErr ? M.red : undefined }} />
                  {emailErr && <div style={{ fontSize: 11, color: M.red, fontFamily: M.mono, marginTop: 4 }}>{emailErr}</div>}
                </div>

                {/* Imie — opcjonalne */}
                <div>
                  <div style={{ fontSize: 11, color: M.t4, fontWeight: 600, marginBottom: 5, fontFamily: M.mono, letterSpacing: 0.5 }}>Imię (opcjonalne)</div>
                  <input type="text" placeholder="Jak masz na imię?" value={imie}
                    onChange={e => setImie(e.target.value.slice(0, 50))} />
                </div>

                {/* CTA */}
                <button onClick={submit} disabled={loading}
                  style={{
                    width: '100%', padding: 18, marginTop: 6,
                    background: loading ? M.brd2 : M.gold,
                    color: loading ? M.t4 : '#0a0a0a',
                    border: 'none', fontFamily: M.mono, fontSize: 12, fontWeight: 700, letterSpacing: 2.5,
                    textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer', borderRadius: 12,
                    boxShadow: loading ? 'none' : `0 0 16px ${M.gold}20`,
                  }}>
                  {loading ? 'Ładuję wynik...' : 'Pokaż mój wynik →'}
                </button>
              </div>
              <p style={{ fontSize: 11, color: M.t4, marginTop: 16, fontFamily: M.mono, letterSpacing: 0.5, textAlign: 'center' }}>
                Odezwę się do Ciebie w DM w ciągu 24h z konkretnym feedbackiem.
              </p>
            </div>
          </div>
        )}

        {/* ── RESULTS ── */}
        {phase === 'results' && (
          <div className="fade-up" style={{ padding: '32px 16px 20px', width: '100%', boxSizing: 'border-box' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 32, paddingBottom: 20, borderBottom: `1px solid ${M.brd}` }}>
              <Logo />
              <div style={{ marginTop: 18 }}>
                <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: M.t4, marginBottom: 6 }}>Wyniki</div>
                <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5, color: M.t1, textShadow: `0 0 24px rgba(255,255,255,.1)` }}>Twoja diagnoza</h2>
              </div>
            </div>

            {/* Score ring */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0 auto 32px', width: '100%' }}>
              <div style={{ position: 'relative', width: 150, height: 150 }}>
                <svg width="150" height="150" viewBox="0 0 150 150" style={{ transform: 'rotate(-90deg)', display: 'block' }}>
                  <circle cx="75" cy="75" r="60" fill="none" stroke={M.s2} strokeWidth={7} />
                  <circle cx="75" cy="75" r="60" fill="none" stroke={scoreColor} strokeWidth={7}
                    strokeDasharray={2 * Math.PI * 60} strokeDashoffset={2 * Math.PI * 60 - (SC / 100) * 2 * Math.PI * 60} strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)', filter: `drop-shadow(0 0 6px ${scoreColor}40)` }} />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: M.mono, fontSize: 34, fontWeight: 800, color: scoreColor, lineHeight: 1, textShadow: `0 0 16px ${scoreColor}30` }}>{SC}</span>
                  <span style={{ fontFamily: M.mono, fontSize: 11, color: M.t4, letterSpacing: 1, marginTop: 2 }}>/100</span>
                </div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: scoreColor, marginTop: 12, textAlign: 'center', textShadow: `0 0 12px ${scoreColor}20` }}>
                {SC >= 75 ? 'Pracujesz przeciwko sobie' : SC >= 50 ? 'Hormony i mózg pod presją' : SC >= 25 ? 'Twoje ciało już to czuje' : 'Niskie ryzyko - ale nie zero'}
              </div>
            </div>

            {/* Total - złota karta */}
            <div style={{ background: `linear-gradient(135deg, ${M.gold}, ${M.goldMuted})`, textAlign: 'center', padding: '24px 16px 20px', position: 'relative', overflow: 'hidden', marginBottom: 20, borderRadius: 14, width: '100%', boxSizing: 'border-box' }}>
              <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(-45deg,transparent,transparent 4px,rgba(0,0,0,.06) 4px,rgba(0,0,0,.06) 8px)' }} />
              <div style={{ position: 'relative' }}>
                <div style={{ fontFamily: M.mono, fontSize: 9, letterSpacing: 3.5, textTransform: 'uppercase', color: '#0a0a0a', opacity: .6, marginBottom: 6 }}>Tracisz w 6 miesięcy</div>
                <div style={{ fontFamily: M.mono, fontSize: 38, fontWeight: 800, color: '#0a0a0a' }}>{C.total.toLocaleString('pl-PL')} zł</div>
                <div style={{ fontFamily: M.mono, fontSize: 12, color: '#0a0a0a', opacity: .5, marginTop: 4 }}>= {Math.round(C.total / 6).toLocaleString('pl-PL')} zł / miesiąc</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginTop: 10, fontFamily: M.mono, fontSize: 10 }}>
                  <span style={{ color: '#0a0a0a', opacity: .7 }}>wprost: {C.hardTotal.toLocaleString('pl-PL')} zł</span>
                  <span style={{ color: '#0a0a0a', opacity: .4 }}>|</span>
                  <span style={{ color: '#0a0a0a', opacity: .7 }}>ukryte: {C.hiddenTotal.toLocaleString('pl-PL')} zł</span>
                </div>
              </div>
            </div>

            {/* Comparison text */}
            {comparisons.length > 0 && (
              <div style={{ background: M.s1, border: `1px solid ${M.brd}`, padding: '16px 16px', marginBottom: 20, borderRadius: 12, width: '100%', boxSizing: 'border-box' }}>
                <p style={{ fontSize: 13, color: M.t2, lineHeight: 1.6, fontWeight: 400, textAlign: 'center' }}
                  dangerouslySetInnerHTML={{ __html: `Za <strong style="color:${M.gold};font-weight:600">${C.total.toLocaleString('pl-PL')} zł</strong> w pół roku mógłbyś mieć: ${comparisons.join(', ')}.` }} />
              </div>
            )}

            {/* Norm: Ty vs przeciętny */}
            <div style={{ background: M.s1, border: `1px solid ${M.brd}`, padding: '18px 14px', marginBottom: 20, borderRadius: 12, width: '100%', boxSizing: 'border-box' }}>
              <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: M.t4, marginBottom: 14 }}>Ty vs przeciętny facet 25-35</div>
              {normData.map((n, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: i < normData.length - 1 ? 10 : 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 500, color: i === 0 ? M.t1 : M.t3, width: 58, flexShrink: 0 }}>{n.label}</span>
                  <div style={{ flex: 1, height: 7, background: M.s3, overflow: 'hidden', borderRadius: 4, minWidth: 0 }}>
                    <div style={{ height: '100%', background: n.color, width: `${n.pct}%`, transition: 'width .8s ease', borderRadius: 4 }} />
                  </div>
                  <span style={{ fontFamily: M.mono, fontSize: 11, fontWeight: 600, width: 55, flexShrink: 0, textAlign: 'right', color: n.color === M.gold ? M.gold : n.color === M.grn ? M.grn : M.t4 }}>
                    {n.value >= 1000 ? `${(n.value / 1000).toFixed(1)}k` : n.value.toLocaleString('pl-PL')}
                  </span>
                </div>
              ))}
              <div style={{ marginTop: 10, fontSize: 11, color: M.t4, fontStyle: 'italic', textAlign: 'center' }}>
                &ldquo;Świadomy&rdquo; = żyje normalnie, ale rozumie mechanizmy.
              </div>
            </div>

            {/* Projection: kumulacja 6 mies */}
            <div style={{ background: M.s1, border: `1px solid ${M.brd}`, padding: '18px 14px', marginBottom: 20, borderRadius: 12, width: '100%', boxSizing: 'border-box' }}>
              <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: M.t4, marginBottom: 16 }}>Kumulacja strat: 6 miesięcy</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 2, marginBottom: 8 }}>
                {projData.map((p, i) => (
                  <div key={i} style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
                    <div style={{ height: 55, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: 4 }}>
                      <div style={{ width: '80%', maxWidth: 26, background: `linear-gradient(180deg, ${M.gold}, ${M.goldDim})`, minHeight: 3, height: `${(p.v / projMax) * 50}px`, borderRadius: '4px 4px 0 0', transition: 'height .6s ease' }} />
                    </div>
                    <div style={{ fontFamily: M.mono, fontSize: 9, color: M.t4 }}>M{p.m}</div>
                    <div style={{ fontFamily: M.mono, fontSize: 9, color: M.t3, marginTop: 1, fontWeight: 500 }}>{(p.v / 1000).toFixed(1)}k</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTop: `1px solid ${M.brd}` }}>
                <span style={{ fontSize: 12, color: M.t3, fontWeight: 500 }}>Suma po 6 mies.</span>
                <span style={{ fontFamily: M.mono, fontSize: 17, fontWeight: 700, color: M.gold, textShadow: `0 0 12px ${M.gold}20` }}>{C.total.toLocaleString('pl-PL')} zł</span>
              </div>
            </div>

            {/* Podział strat — split: twarde + ukryte */}
            {catData.length > 0 && (
              <div style={{ marginBottom: 20, width: '100%' }}>
                {/* TWARDE — wydajesz wprost */}
                {catData.filter(x => x.type === 'hard').length > 0 && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                      <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: M.t4 }}>Wydajesz wprost</div>
                      <div style={{ fontFamily: M.mono, fontSize: 13, fontWeight: 700, color: M.gold }}>{C.hardTotal.toLocaleString('pl-PL')} zł</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, width: '100%', marginBottom: 18 }}>
                      {catData.filter(x => x.type === 'hard').map((c, i) => (
                        <div key={i} style={{ background: M.s1, border: `1px solid ${M.brd}`, padding: '14px 12px', borderRadius: 10, minWidth: 0 }}>
                          <div style={{ fontSize: 15, marginBottom: 4 }}>{c.ic}</div>
                          <div style={{ fontFamily: M.mono, fontSize: 15, fontWeight: 700, color: M.gold, textShadow: `0 0 10px ${M.gold}15` }}>{c.v.toLocaleString('pl-PL')} zł</div>
                          <div style={{ fontSize: 10, color: M.t4, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2, fontWeight: 600 }}>{c.l}</div>
                          <div style={{ height: 3, background: M.s3, marginTop: 8, borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: c.c, width: `${(c.v / maxC) * 100}%`, transition: 'width 1s ease .3s', borderRadius: 2 }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* UKRYTE — tracisz niewidocznie */}
                {catData.filter(x => x.type === 'hidden').length > 0 && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                      <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: M.t4 }}>Tracisz niewidocznie</div>
                      <div style={{ fontFamily: M.mono, fontSize: 13, fontWeight: 700, color: M.t3 }}>{C.hiddenTotal.toLocaleString('pl-PL')} zł</div>
                    </div>
                    <div style={{ fontSize: 11, color: M.t4, fontStyle: 'italic', marginBottom: 10 }}>Szacunek na bazie badań naukowych. Nie rachunki, ale realne koszty konsekwencji.</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, width: '100%' }}>
                      {catData.filter(x => x.type === 'hidden').map((c, i) => (
                        <div key={i} style={{ background: M.s1, border: `1px solid ${M.brd}`, padding: '14px 12px', borderRadius: 10, minWidth: 0 }}>
                          <div style={{ fontSize: 15, marginBottom: 4 }}>{c.ic}</div>
                          <div style={{ fontFamily: M.mono, fontSize: 15, fontWeight: 700, color: M.t3, textShadow: `0 0 10px ${M.t4}10` }}>{c.v.toLocaleString('pl-PL')} zł</div>
                          <div style={{ fontSize: 10, color: M.t4, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2, fontWeight: 600 }}>{c.l}</div>
                          <div style={{ height: 3, background: M.s3, marginTop: 8, borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: c.c, width: `${(c.v / maxC) * 100}%`, transition: 'width 1s ease .3s', borderRadius: 2 }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 📉 Stagnacja — karta */}
            {C.brakes > 0 && C.wastedSessions > 0 && (
              <div style={{ background: M.s1, border: `1px solid ${M.brd}`, padding: '18px 14px', marginBottom: 20, borderRadius: 12, width: '100%', boxSizing: 'border-box' }}>
                <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: M.t4, marginBottom: 14 }}>📉 Stanie w miejscu</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                  <div style={{ textAlign: 'center', padding: '14px 8px', background: M.s2, borderRadius: 10 }}>
                    <div style={{ fontFamily: M.mono, fontSize: 28, fontWeight: 800, color: M.red }}>{C.stagnationMonths}</div>
                    <div style={{ fontSize: 10, color: M.t4, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 4, fontWeight: 600 }}>mies. bez progresu</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '14px 8px', background: M.s2, borderRadius: 10 }}>
                    <div style={{ fontFamily: M.mono, fontSize: 28, fontWeight: 800, color: M.org }}>{C.wastedSessions}</div>
                    <div style={{ fontSize: 10, color: M.t4, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 4, fontWeight: 600 }}>treningów na marne</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
                  {[0,1,2,3,4].map(i => (
                    <div key={i} style={{ flex: 1, height: 5, borderRadius: 3, background: i < C.brakes ? M.red : M.s3, transition: 'background .3s ease' }} />
                  ))}
                </div>
                <div style={{ fontSize: 11, color: M.t4, fontFamily: M.mono, letterSpacing: 0.3 }}>
                  {C.brakes}/5 hamulców aktywnych. {C.wastedPct}% wysiłku treningowego zmarnowane.
                </div>
                <p style={{ fontSize: 11.5, color: M.t3, lineHeight: 1.6, marginTop: 10, fontWeight: 400 }}>
                  Trenujesz, ale fundamenty (sen, dieta, stres) sabotują progres. Za 6 miesięcy będziesz w tym samym miejscu co teraz. <strong style={{ color: M.t1, fontWeight: 500 }}>To nie brak dyscypliny. To zła kolejność.</strong>
                </p>
              </div>
            )}

            {/* Hormony */}
            {hormones.length > 0 && (
              <div style={{ background: M.s1, border: `1px solid ${M.brd}`, padding: '18px 14px', marginBottom: 20, borderRadius: 12, width: '100%', boxSizing: 'border-box' }}>
                <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: M.t4, marginBottom: 14 }}>Wpływ na Twoje hormony</div>
                {hormones.map((h, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < hormones.length - 1 ? `1px solid ${M.brd}` : 'none', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: M.t1, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <span style={{ fontSize: 14 }}>{h.a}</span> {h.n}
                    </span>
                    <span style={{ fontFamily: M.mono, fontSize: 10, fontWeight: 500, padding: '3px 8px', letterSpacing: 0.3, color: h.c, border: `1px solid ${h.c}25`, borderRadius: 6, background: h.c + '08', whiteSpace: 'nowrap', flexShrink: 0, textShadow: `0 0 8px ${h.c}15` }}>{h.i}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Timeline */}
            {timeline.length > 0 && (
              <div style={{ marginBottom: 20, width: '100%' }}>
                <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: M.t4, marginBottom: 16 }}>Co się dzieje w Twoim ciele</div>
                {timeline.map((t, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, paddingTop: 2 }}>
                      <div style={{ width: 8, height: 8, background: M.gold, borderRadius: 4, flexShrink: 0, boxShadow: `0 0 6px ${M.gold}30` }} />
                      {i < timeline.length - 1 && <div style={{ width: 1, flex: 1, background: M.brd2, marginTop: 3, minHeight: 10 }} />}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontFamily: M.mono, fontSize: 10, fontWeight: 600, color: M.gold, marginBottom: 4 }}>{t.period}</div>
                      <p style={{ fontSize: 12.5, color: M.t3, fontWeight: 400, lineHeight: 1.6, wordBreak: 'break-word' }}
                        dangerouslySetInnerHTML={{ __html: t.text.replace(/<b>/g, `<strong style="color:${M.t2};font-weight:500">`).replace(/<\/b>/g, '</strong>') }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Insights */}
            {insights.length > 0 && (
              <div style={{ marginBottom: 20, width: '100%' }}>
                {insights.map((ins, i) => (
                  <div key={i} style={{ padding: '14px 14px', borderLeft: `2px solid ${M.gold}`, background: M.s1, marginBottom: 8, borderRadius: '0 10px 10px 0' }}>
                    <p style={{ fontSize: 12.5, color: M.t3, lineHeight: 1.65, fontWeight: 400, wordBreak: 'break-word' }}
                      dangerouslySetInnerHTML={{ __html: ins.replace(/<b>/g, `<strong style="color:${M.t1};font-weight:600">`).replace(/<\/b>/g, '</strong>') }} />
                  </div>
                ))}
              </div>
            )}

            {/* Closing */}
            <div style={{ textAlign: 'center', padding: '22px 18px', marginBottom: 20, border: `1px solid ${M.brd}`, background: M.s1, borderRadius: 14, width: '100%', boxSizing: 'border-box' }}>
              <p style={{ fontSize: 13.5, color: M.t2, lineHeight: 1.75, fontWeight: 400 }}>
                Te liczby nie znikną same.<br />
                Za 6 miesięcy będą wyższe albo niższe.<br />
                <strong style={{ color: M.gold, fontWeight: 600 }}>Zależy co zrobisz teraz.</strong>
              </p>
              <p style={{ fontSize: 12, color: M.t4, lineHeight: 1.6, fontWeight: 400, marginTop: 10 }}>
                Hormony, mózg, metabolizm. Kiedy rozumiesz mechanikę, przestajesz tracić.
              </p>
            </div>

            {/* CTA */}
            <div style={{ background: M.s1, border: `1px solid ${M.brd2}`, padding: '22px 16px', marginBottom: 20, borderRadius: 14, width: '100%', boxSizing: 'border-box' }}>
              <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: M.t4, marginBottom: 14 }}>Co dalej?</div>
              <p style={{ fontSize: 13.5, color: M.t3, lineHeight: 1.7, fontWeight: 400, marginBottom: 8 }}>
                Pracuję z ludźmi którzy żyją dokładnie tak jak Ty. Imprezy, praca, chaos.
              </p>
              <p style={{ fontSize: 13.5, color: M.t2, lineHeight: 1.7, fontWeight: 500, marginBottom: 8 }}>
                Mimo to mają formę, energię i sprawny mózg.
              </p>
              <p style={{ fontSize: 13, color: M.t3, lineHeight: 1.7, fontWeight: 400, marginBottom: 20 }}>
                Różnica? Wiedzą <em>co</em> sabotuje ich ciało i mają plan który to naprawia. <strong style={{ color: M.t1, fontWeight: 600 }}>Bez rezygnowania z życia.</strong>
              </p>
              <a href="https://system.talerzihantle.com" target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'block', background: M.gold, color: '#0a0a0a',
                  fontFamily: M.mono, fontSize: 12, fontWeight: 700, letterSpacing: 2,
                  textTransform: 'uppercase', textDecoration: 'none', padding: 18,
                  textAlign: 'center', marginBottom: 10, borderRadius: 12,
                  boxShadow: `0 0 20px ${M.gold}25`,
                }}>
                Sprawdź czy się kwalifikujesz →
              </a>
              <div style={{ textAlign: 'center', fontSize: 11, color: M.t4, fontFamily: M.mono, letterSpacing: 0.3, marginBottom: 18 }}>
                lub napisz <strong style={{ color: M.gold }}>JAZDA</strong> w DM → @hantleitalerz
              </div>
              <div style={{ height: 1, background: M.brd, margin: '0 20px 18px' }} />
              <p style={{ textAlign: 'center', fontSize: 11.5, color: M.t4, marginBottom: 10 }}>
                Nie jesteś jeszcze gotowy na prowadzenie?
              </p>
              <a href="https://neurobiologia-formy.talerzihantle.com" target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'block', textAlign: 'center', padding: '14px 14px',
                  background: 'transparent', border: `1.5px solid ${M.gold}40`, color: M.gold,
                  fontFamily: M.mono, fontSize: 10, fontWeight: 700, letterSpacing: 2,
                  textTransform: 'uppercase', textDecoration: 'none', borderRadius: 12,
                }}>
                Neurobiologia Formy. 49 zł →
              </a>
              <p style={{ textAlign: 'center', fontSize: 10.5, color: M.t4, marginTop: 6, fontFamily: M.mono }}>
                Ebook który tłumaczy dlaczego Twoje ciało działa tak a nie inaczej.
              </p>
            </div>

            {/* DM notification */}
            <div style={{ textAlign: 'center', padding: '20px 16px', marginBottom: 20, background: `${M.gold}08`, border: `1px solid ${M.gold}20`, borderRadius: 14, width: '100%', boxSizing: 'border-box' }}>
              <p style={{ fontSize: 13.5, color: M.t2, lineHeight: 1.65, fontWeight: 500, marginBottom: 6 }}>
                Analizuję Twoje odpowiedzi.
              </p>
              <p style={{ fontSize: 12.5, color: M.t3, lineHeight: 1.65, fontWeight: 400 }}>
                Napiszę do Ciebie w DM <strong style={{ color: M.gold, fontWeight: 600 }}>@hantleitalerz</strong> w ciągu 24h z konkretnym feedbackiem co u Ciebie nie gra i od czego zacząć.
              </p>
            </div>

            {/* Źródła */}
            <div style={{ padding: '16px 12px', background: M.s1, border: `1px solid ${M.brd}`, marginBottom: 24, borderRadius: 12, width: '100%', boxSizing: 'border-box' }}>
              <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: M.t4, marginBottom: 10 }}>📊 Źródła naukowe (9 badań)</div>
              <div style={{ fontSize: 10.5, color: M.t4, lineHeight: 1.8 }}>
                {[
                  'RAND Europe, 2016: pracownicy śpiący <6h tracą ekwiwalent 2.4% PKB w produktywności',
                  'Leproult & Van Cauter, JAMA 2011: 1 tydzień 5h snu = 10-15% spadek testosteronu',
                  'Parr et al., PLOS ONE 2014: alkohol po treningu obniża syntezę białek mięśniowych o 24-37%',
                  'Cappuccio et al., 2010: meta-analiza, <6h snu = 12% wyższe ryzyko śmierci',
                  'Hemp, Harvard Business Review 2004: prezenteizm (praca w obniżonej formie) kosztuje 3× więcej niż absencja',
                  'Vingren et al., 2013: alkohol >1.5g/kg = spadek T o ~23% w ciągu 10-16h',
                  'Halson, Sports Medicine 2014: deficyt snu upośledza wydolność, układ odpornościowy i regenerację',
                  'Schoenfeld et al., 2017: progres wymaga progressive overload + regeneracja + dieta jednocześnie',
                  'Expert Rev. Endocrinol. Metab., 2023: meta-analiza 21 badań, 10 199 mężczyzn, styl życia > wiek',
                ].map((s, i) => <span key={i} style={{ display: 'block', marginBottom: 4, paddingLeft: 16, textIndent: -16 }}>[{i + 1}] {s}</span>)}
              </div>
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <Logo />
          <span style={{ fontFamily: M.mono, fontSize: 10, color: M.t4, letterSpacing: 1.5 }}>Diagnostyka v6</span>
        </div>
      </div>
    </>
  );
}
