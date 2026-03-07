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
  const sleepCost = Math.round((Math.max((7.5 - D.sleep) * 7, 0) / 7.5) * 2500 * (D.sleepQ >= 3 ? 1.4 : 1));
  const mentalCost = Math.round(((D.stress + D.energy) / 8) * 3500);
  const foodCost = Math.round(D.junk * 4 * 6 + (D.dietChaos >= 3 ? 800 : 0) + (D.binge >= 3 ? 600 : 0));
  const wkndCost = Math.round((D.cash + D.subs) * D.wknd * 6);
  const prodCost = D.rate > 0 ? Math.round(D.lost * 26 * D.rate) : Math.round((D.prodDrop / 4) * 3200);
  const trainCost = Math.round(D.gym * 6 * (D.miss / 4));
  const signalCost = Math.round(D.tags.size * 500);
  const total = sleepCost + mentalCost + foodCost + wkndCost + prodCost + trainCost + signalCost;
  const totalLostH = Math.round(D.lost * 26);
  return { sleepCost, mentalCost, foodCost, wkndCost, prodCost, trainCost, signalCost, total, totalLostH };
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
  s1: '#111111',
  s2: '#1a1a1a',
  s3: '#222222',
  brd: '#1e1e1e',
  brd2: '#2a2a2a',
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
  const [email, setEmail] = useState('');
  const [emailErr, setEmailErr] = useState('');
  const [loading, setLoading] = useState(false);
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
    if (!email.includes('@')) { setEmailErr('Podaj poprawny email'); return; }
    setLoading(true);
    const c = costs(D); const sc = score(D);
    try {
      await fetch('/api/subscribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, score: sc, totalCost: c.total, fields: { diagnostyka_drinks: String(D.drinks), diagnostyka_sleep: String(D.sleep) } }),
      });
    } catch {}
    setPhase('results');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const C = costs(D); const SC = score(D);
  const pct = Math.round((sec / SECTIONS.length) * 100);
  const scoreColor = SC >= 75 ? M.red : SC >= 50 ? M.org : SC >= 25 ? M.yel : M.grn;
  const circ = 2 * Math.PI * 64;
  const offset = circ - (SC / 100) * circ;

  const catData = [
    { ic: '😴', v: C.sleepCost, l: 'Sen', c: '#a08ae0' }, { ic: '🧠', v: C.mentalCost, l: 'Stres', c: '#5a8ad0' },
    { ic: '🍔', v: C.foodCost, l: 'Jedzenie', c: M.org }, { ic: '🍺', v: C.wkndCost, l: 'Weekendy', c: M.gold },
    { ic: '⏰', v: C.prodCost, l: 'Czas', c: '#4abace' }, { ic: '🏋️', v: C.trainCost, l: 'Trening', c: M.grn },
    { ic: '⚡', v: C.signalCost, l: 'Sygnały', c: M.red },
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
  if (C.total > 15000) insights.push(`<b>${C.total.toLocaleString('pl-PL')} zł w pół roku</b>. Na konsekwencje, nie na sam weekend.`);

  const comparisons: string[] = [];
  if (C.total > 10000) comparisons.push('wakacje all-inclusive');
  if (C.total > 5000) comparisons.push('pół roku profesjonalnego prowadzenia');
  if (C.total > 20000) comparisons.push('używany samochód');
  if (C.total > 35000) comparisons.push('wkład własny na mieszkanie');

  const normMax = Math.max(C.total, 30000);
  const normData = [
    { label: 'Ty', value: C.total, color: M.gold, pct: (C.total / normMax) * 100 },
    { label: 'Średnia', value: 12000, color: M.t4, pct: (12000 / normMax) * 100 },
    { label: 'Świadomy', value: 4200, color: M.grn, pct: (4200 / normMax) * 100 },
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

  // Logo komponent
  const Logo = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      <div style={{ width: 28, height: 28, border: `2px solid ${M.gold}`, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6 }}>
        <span style={{ fontFamily: M.mono, fontSize: 13, fontWeight: 800, color: M.gold, lineHeight: 1 }}>H</span>
      </div>
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
        body::before{content:'';position:fixed;inset:0;background:radial-gradient(600px circle at 20% 10%,${M.gold}08 0%,transparent 50%),radial-gradient(400px circle at 80% 60%,${M.gold}05 0%,transparent 50%),radial-gradient(300px circle at 50% 90%,${M.gold}04 0%,transparent 40%);pointer-events:none;z-index:0}
        body::after{content:'';position:fixed;inset:0;background:url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='g' width='100' height='100' patternUnits='userSpaceOnUse'%3E%3Cpath d='M100 0L50 86.6 0 0z' fill='none' stroke='%23c8a84e' stroke-opacity='0.025' stroke-width='0.5'/%3E%3Ccircle cx='50' cy='35' r='1' fill='%23c8a84e' fill-opacity='0.04'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100' height='100' fill='url(%23g)'/%3E%3C/svg%3E");pointer-events:none;z-index:0}

        input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:48px;background:transparent;cursor:pointer;margin:0;touch-action:none;-webkit-tap-highlight-color:transparent}
        input[type=range]::-webkit-slider-runnable-track{height:6px;background:transparent;border-radius:3px;cursor:pointer}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;background:${M.gold};border:none;border-radius:50%;cursor:grab;box-shadow:0 1px 4px rgba(0,0,0,.5),0 0 0 4px rgba(200,168,78,.12);margin-top:-8px}
        input[type=range]::-webkit-slider-thumb:active{cursor:grabbing;box-shadow:0 1px 6px rgba(0,0,0,.5),0 0 0 8px rgba(200,168,78,.15);width:24px;height:24px;margin-top:-9px}
        input[type=range]::-moz-range-thumb{width:22px;height:22px;background:${M.gold};border:none;border-radius:50%;cursor:grab;box-shadow:0 1px 4px rgba(0,0,0,.5),0 0 0 4px rgba(200,168,78,.12)}
        input[type=range]::-moz-range-track{background:transparent;height:6px;border:none;cursor:pointer}

        input[type=email]{width:100%;padding:16px 18px;background:${M.s1};border:1.5px solid ${M.brd2};color:${M.t1};font-size:16px;font-weight:500;font-family:${M.sans};outline:none;border-radius:12px;transition:border-color .2s ease}
        input[type=email]:focus{border-color:${M.gold}}
        input[type=email]::placeholder{color:${M.t4}}

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
                  <Slider label="Twoja stawka godzinowa" min={0} max={300} step={10} k="rate" val={D.rate} unit=" zł" />
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

        {/* ── EMAIL GATE ── */}
        {phase === 'gate' && (
          <div className="fade-up" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 16px', textAlign: 'center' }}>
            <div style={{ maxWidth: 400, width: '100%' }}>
              <Logo />
              <div style={{ marginTop: 32, marginBottom: 28 }}>
                <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: M.t4, marginBottom: 10 }}>Twój Damage Score</div>
                <div style={{ fontFamily: M.mono, fontSize: 80, fontWeight: 800, lineHeight: 1, color: scoreColor, textShadow: `0 0 30px ${scoreColor}30` }}>{SC}</div>
                <div style={{ fontFamily: M.mono, fontSize: 12, color: M.t4, marginTop: 6 }}>/100</div>
              </div>

              <div style={{ background: M.s1, border: `1px solid ${M.gold}20`, padding: 18, marginBottom: 32, borderRadius: 14 }}>
                <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: M.t4, marginBottom: 8 }}>Szacowane straty / 6 miesięcy</div>
                <div style={{ fontFamily: M.mono, fontSize: 38, fontWeight: 800, color: M.gold }}>{C.total.toLocaleString('pl-PL')} zł</div>
              </div>

              <h2 style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.25, letterSpacing: -0.5, marginBottom: 14, color: M.t1, textShadow: '0 0 20px rgba(255,255,255,.1)' }}>
                Podaj email żeby<br />zobaczyć pełną analizę
              </h2>
              <p style={{ fontSize: 14, color: M.t3, lineHeight: 1.6, marginBottom: 26, fontWeight: 400 }}>
                Breakdown hormonów, co się dzieje w Twoim ciele i konkretne wnioski.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input type="email" placeholder="twoj@email.com" value={email}
                  onChange={e => { setEmail(e.target.value); setEmailErr(''); }}
                  onKeyDown={e => e.key === 'Enter' && submit()}
                  style={{ borderColor: emailErr ? M.red : undefined }} />
                {emailErr && <div style={{ fontSize: 11, color: M.red, fontFamily: M.mono, textAlign: 'left' }}>{emailErr}</div>}
                <button onClick={submit} disabled={loading}
                  style={{
                    width: '100%', padding: 18,
                    background: loading ? M.brd2 : M.gold,
                    color: loading ? M.t4 : '#0a0a0a',
                    border: 'none', fontFamily: M.mono, fontSize: 11, fontWeight: 700, letterSpacing: 2.5,
                    textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer', borderRadius: 12,
                  }}>
                  {loading ? 'Wysyłam...' : 'Pokaż pełną analizę →'}
                </button>
              </div>
              <p style={{ fontSize: 11, color: M.t4, marginTop: 16, fontFamily: M.mono, letterSpacing: 0.5 }}>Zero spamu. Wypis jednym kliknięciem.</p>
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
              </div>
            </div>

            {/* Comparison text */}
            {comparisons.length > 0 && (
              <div style={{ background: M.s1, border: `1px solid ${M.brd}`, padding: '16px 14px', marginBottom: 20, borderRadius: 12, width: '100%', boxSizing: 'border-box' }}>
                <p style={{ fontSize: 13.5, color: M.t2, lineHeight: 1.55, fontWeight: 400, textAlign: 'center' }}
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

            {/* Podział strat - grid */}
            {catData.length > 0 && (
              <div style={{ marginBottom: 20, width: '100%' }}>
                <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: M.t4, marginBottom: 12 }}>Podział strat</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, width: '100%' }}>
                  {catData.map((c, i) => (
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
                      <div style={{ fontFamily: M.mono, fontSize: 10, fontWeight: 600, color: M.gold, marginBottom: 3 }}>{t.period}</div>
                      <p style={{ fontSize: 13, color: M.t3, fontWeight: 400, lineHeight: 1.5, wordBreak: 'break-word' }}
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
                  <div key={i} style={{ padding: '14px 12px', borderLeft: `2px solid ${M.gold}`, background: M.s1, marginBottom: 6, borderRadius: '0 10px 10px 0' }}>
                    <p style={{ fontSize: 13, color: M.t3, lineHeight: 1.55, fontWeight: 400, wordBreak: 'break-word' }}
                      dangerouslySetInnerHTML={{ __html: ins.replace(/<b>/g, `<strong style="color:${M.t1};font-weight:600">`).replace(/<\/b>/g, '</strong>') }} />
                  </div>
                ))}
              </div>
            )}

            {/* Closing */}
            <div style={{ textAlign: 'center', padding: '24px 14px', marginBottom: 20, border: `1px solid ${M.brd}`, background: M.s1, borderRadius: 14, width: '100%', boxSizing: 'border-box' }}>
              <p style={{ fontSize: 14, color: M.t3, lineHeight: 1.7, fontWeight: 400 }}>
                Mechanika: hormony, mózg, metabolizm.<br />
                Kiedy rozumiesz co się dzieje w środku,<br />
                <strong style={{ color: M.gold, fontWeight: 600 }}>możesz żyć normalnie</strong> i nie płacić za to takiej ceny.
              </p>
            </div>

            {/* CTA */}
            <div style={{ background: M.s1, border: `1px solid ${M.brd2}`, padding: '22px 14px', marginBottom: 20, borderRadius: 14, width: '100%', boxSizing: 'border-box' }}>
              <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: M.t4, marginBottom: 12 }}>Co dalej?</div>
              <p style={{ fontSize: 14, color: M.t3, lineHeight: 1.6, fontWeight: 400, marginBottom: 18 }}>
                Pracuję z ludźmi którzy żyją dokładnie tak jak Ty. Imprezy, praca, chaos.
                Mimo to mają formę, energię i sprawny mózg. <strong style={{ color: M.t1, fontWeight: 600 }}>Bez rezygnowania z życia.</strong>
              </p>
              <a href="https://system.talerzihantle.com" target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'block', background: M.gold, color: '#0a0a0a',
                  fontFamily: M.mono, fontSize: 11, fontWeight: 700, letterSpacing: 2,
                  textTransform: 'uppercase', textDecoration: 'none', padding: 18,
                  textAlign: 'center', marginBottom: 12, borderRadius: 12,
                  boxShadow: `0 0 16px ${M.gold}20`,
                }}>
                Sprawdź czy się kwalifikujesz →
              </a>
              <div style={{ textAlign: 'center', fontSize: 12, color: M.t4, fontFamily: M.mono, letterSpacing: 0.5 }}>
                lub napisz <strong style={{ color: M.gold }}>JAZDA</strong> w DM → @hantleitalerz
              </div>
              <a href="https://neurobiologia-formy.talerzihantle.com" target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'block', textAlign: 'center', marginTop: 16, padding: '14px 14px',
                  background: 'transparent', border: `1.5px solid ${M.gold}40`, color: M.gold,
                  fontFamily: M.mono, fontSize: 10, fontWeight: 700, letterSpacing: 2,
                  textTransform: 'uppercase', textDecoration: 'none', borderRadius: 12,
                }}>
                Neurobiologia Formy - 49 zł →
              </a>
              <p style={{ textAlign: 'center', fontSize: 11, color: M.t4, marginTop: 6, fontFamily: M.mono }}>
                Nie jesteś gotowy na prowadzenie? Zacznij tutaj.
              </p>
            </div>

            {/* Źródła */}
            <div style={{ padding: '16px 12px', background: M.s1, border: `1px solid ${M.brd}`, marginBottom: 24, borderRadius: 12, width: '100%', boxSizing: 'border-box' }}>
              <div style={{ fontFamily: M.mono, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: M.t4, marginBottom: 10 }}>Skąd te liczby</div>
              <div style={{ fontSize: 11, color: M.t3, lineHeight: 1.7 }}>
                {['Nutrition & Metabolism, 2014: alkohol >1.5g/kg = spadek T ~27% w 12h',
                  'J. Clin. Endocrinol. Metab.: 14+ drinków = -23% testosteronu następnego dnia',
                  'RAND Corporation, 2016: <6h snu = 13% wyższe ryzyko śmierci, 19-29% mniej produktywności',
                  'Expert Rev. Endocrinol. Metab., 2023: meta-analiza 21 badań, 10 199 osób',
                ].map((s, i) => <span key={i} style={{ display: 'block', marginBottom: 3 }}>[{i + 1}] {s}</span>)}
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
