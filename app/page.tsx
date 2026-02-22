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
  return { sleepCost, mentalCost, foodCost, wkndCost, prodCost, trainCost, signalCost, total };
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

const M = {
  bg: '#09090b', s1: '#111114', s2: '#1f1f24', brd: '#1e1e26', brd2: '#2c2c38',
  red: '#ef4444', org: '#f97316', yel: '#eab308', grn: '#22c55e',
  t1: '#ededf0', t2: '#a0a0a8', t3: '#6a6a72', t4: '#44444c',
  mono: "'JetBrains Mono', monospace", sans: "'Outfit', sans-serif",
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
    { ic: '😴', v: C.sleepCost, l: 'Sen', c: '#a855f7' }, { ic: '🧠', v: C.mentalCost, l: 'Stres', c: '#3b82f6' },
    { ic: '🍔', v: C.foodCost, l: 'Jedzenie', c: M.org }, { ic: '🍺', v: C.wkndCost, l: 'Weekendy', c: M.yel },
    { ic: '⏰', v: C.prodCost, l: 'Czas', c: '#06b6d4' }, { ic: '🏋️', v: C.trainCost, l: 'Trening', c: M.grn },
    { ic: '⚡', v: C.signalCost, l: 'Sygnały', c: M.red },
  ].filter(x => x.v > 0);
  const maxC = Math.max(...catData.map(x => x.v), 1);

  const hormones = [];
  if (D.sleep < 6.5 || D.sleepQ >= 3) hormones.push({ n: 'HGH', a: '↓', i: 'Obniżona regeneracja', c: M.org });
  if (D.drinks > 5 || D.subs > 0 || D.tags.has('libido')) hormones.push({ n: 'Testosteron', a: '↓', i: D.drinks > 10 || D.subs > 0 ? 'Mocny spadek' : 'Spadek', c: D.drinks > 10 || D.subs > 0 ? M.red : M.org });
  if (D.stress >= 3 || D.sleepQ >= 3) hormones.push({ n: 'Kortyzol', a: '↑', i: 'Chronicznie wysoki', c: M.red });
  if (D.dopamine >= 3 || D.tags.has('motivation')) hormones.push({ n: 'Dopamina', a: '⚡', i: 'Desensytyzacja', c: M.red });
  if (D.tags.has('mood') || D.subs > 0) hormones.push({ n: 'Serotonina', a: '↓', i: D.subs > 0 ? 'Deplecja' : 'Spadek', c: D.subs > 0 ? M.red : M.org });
  if (D.tags.has('belly') || D.binge >= 3) hormones.push({ n: 'Insulina', a: '↑', i: 'Insulinooporność', c: M.org });

  const insights: string[] = [];
  if (D.tags.size >= 5) insights.push(`Zaznaczyłeś <b>${D.tags.size} z 10 sygnałów</b>. To wzorzec który się pogłębia z każdym tygodniem.`);
  else if (D.tags.size >= 3) insights.push(`<b>${D.tags.size} sygnały</b> kręcą spiralę. Zmęczenie → gorsza dieta → gorszy trening → i tak w kółko.`);
  if (D.dopamine >= 3 && D.binge >= 2) insights.push(`Głód dopaminowy + objadanie = <b>rozregulowany układ nagrody</b>. To nie silna wola. To biochemia.`);
  if (D.tags.has('libido') && (D.stress >= 3 || D.sleep < 6.5)) insights.push(`Niższe libido + ${D.stress >= 3 ? 'chroniczny stres' : 'kiepski sen'} = <b>klasyka spadku testosteronu</b>. Badania 10 199 mężczyzn: to styl życia, nie wiek.`);
  if (D.tags.has('belly') && (D.binge >= 2 || D.dietChaos >= 3)) insights.push(`Brzuch nie schodzi + objadanie = <b>insulinooporność w budowie</b>. Sam trening tego nie przebije.`);
  if (D.drinks > 10 && D.tags.has('libido')) insights.push(`${D.drinks} drinków regularnie + niższe libido. 14+ drinków tygodniowo = <b>~6.8% chroniczny spadek T</b>. Alkohol zamienia testosteron w estrogen.`);
  if (C.total > 15000) insights.push(`<b>${C.total.toLocaleString('pl-PL')} zł w pół roku</b>. Nie na imprezy — na ich konsekwencje.`);

  const sevOpts = [{ n: '0', l: 'Brak' }, { n: '1', l: 'Rzadko' }, { n: '2', l: 'Często' }, { n: '3', l: 'Zawsze' }];
  const sevColors = [M.grn, M.yel, M.org, M.red];

  const SevField = ({ label, sub, k, val }: { label: string; sub?: string; k: SevKey; val: number }) => (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontSize: 13, color: M.t2, marginBottom: sub ? 4 : 10, lineHeight: 1.35 }}>
        {label}{sub && <small style={{ display: 'block', fontSize: 11, color: M.t4, marginTop: 2 }}>{sub}</small>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4 }}>
        {sevOpts.map((o, i) => {
          const on = val === i;
          return (
            <button key={i} onClick={() => sev(k, i)} style={{ padding: '10px 2px', textAlign: 'center', border: `1px solid ${on ? sevColors[i] : M.brd}`, background: on ? sevColors[i] + '15' : M.s1, cursor: 'pointer' }}>
              <span style={{ fontFamily: M.mono, fontSize: 16, fontWeight: 700, display: 'block', marginBottom: 1, color: on ? sevColors[i] : M.t3 }}>{o.n}</span>
              <span style={{ fontSize: 9, color: on ? sevColors[i] : M.t4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{o.l}</span>
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
      <div style={{ marginBottom: 24 }}>
        {label && <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: M.t2, flex: 1, lineHeight: 1.3 }}>{label}</span>
          <span style={{ fontFamily: M.mono, fontSize: 15, fontWeight: 700, color: hot ? M.red : M.t1, minWidth: 52, textAlign: 'right' }}>{val}{unit}</span>
        </div>}
        <div style={{ position: 'relative', height: 32, display: 'flex', alignItems: 'center' }}>
          <div style={{ position: 'absolute', left: 0, right: 0, height: 2, background: M.s2 }} />
          <div style={{ position: 'absolute', left: 0, height: 2, width: `${p}%`, background: hot ? M.red : M.t4 }} />
          <input type="range" min={min} max={max} step={step} value={val} onChange={e => upd(k, parseFloat(e.target.value))} style={{ width: '100%', height: 32, WebkitAppearance: 'none', background: 'transparent', position: 'relative', zIndex: 2, cursor: 'pointer' }} />
        </div>
        {note && <div style={{ textAlign: 'right', fontFamily: M.mono, fontSize: 10, color: M.t4, marginTop: 3 }}>{note}</div>}
      </div>
    );
  };

  const Chip = ({ t, label }: { t: ChipKey; label: string }) => {
    const on = D.tags.has(t);
    return (
      <div onClick={() => tog(t)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, background: on ? M.red + '15' : M.s1, border: `1px solid ${on ? M.red + '30' : M.brd}`, cursor: 'pointer', marginBottom: 4 }}>
        <div style={{ width: 15, height: 15, border: `1.5px solid ${on ? M.red : M.brd2}`, background: on ? M.red : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {on && <span style={{ fontSize: 9, color: '#fff' }}>✓</span>}
        </div>
        <span style={{ flex: 1, fontSize: 13, color: on ? M.t1 : M.t2 }}>{label}</span>
      </div>
    );
  };

  const SH = ({ n, title }: { n: string; title: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
      <div style={{ fontFamily: M.mono, fontSize: 9, fontWeight: 700, background: M.t4, color: M.bg, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{n}</div>
      <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5 }}>{title}</div>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700;800&family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        body{background:${M.bg};color:${M.t1};font-family:${M.sans};min-height:100vh;overflow-x:hidden;-webkit-font-smoothing:antialiased}
        body::before{content:'';position:fixed;inset:0;background:radial-gradient(ellipse 80% 50% at 50% 0%,#ef444406 0%,transparent 60%),repeating-linear-gradient(0deg,transparent,transparent 59px,#ffffff02 59px,#ffffff02 60px),repeating-linear-gradient(90deg,transparent,transparent 59px,#ffffff02 59px,#ffffff02 60px);pointer-events:none;z-index:0}
        input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:32px;background:transparent;cursor:pointer}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;background:${M.t1};border:none;border-radius:0;cursor:grab}
        input[type=range]::-webkit-slider-thumb:active{background:${M.red};cursor:grabbing}
        input[type=range]::-moz-range-thumb{width:20px;height:20px;background:${M.t1};border:none;border-radius:0}
        input[type=range]::-moz-range-track{background:transparent}
        input[type=email]{width:100%;padding:16px;background:${M.s1};border:1px solid ${M.brd2};color:${M.t1};font-size:16px;font-family:${M.sans};outline:none}
        input[type=email]:focus{border-color:${M.red}}
        button{font-family:${M.sans};transition:opacity .15s}
        button:hover{opacity:.85}
        a:hover{opacity:.85}
      `}</style>

      <div ref={topRef} style={{ maxWidth: 440, margin: '0 auto', padding: '0 0 80px', position: 'relative', zIndex: 1 }}>

        {/* ── FORM ── */}
        {phase === 'form' && (
          <>
            {/* Progress */}
            <div style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(9,9,11,0.96)', backdropFilter: 'blur(20px)', borderBottom: `1px solid ${M.brd}`, padding: '10px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                <span style={{ fontFamily: M.mono, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: M.t4 }}>Sekcja {sec + 1} z {SECTIONS.length}</span>
                <span style={{ fontFamily: M.mono, fontSize: 11, fontWeight: 700, color: pct > 60 ? M.red : M.t2 }}>{pct}%</span>
              </div>
              <div style={{ height: 3, background: M.s2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${M.yel}, ${M.org}, ${M.red})`, transition: 'width 0.4s ease' }} />
              </div>
              <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                {SECTIONS.map((s, i) => (
                  <div key={i} style={{ flex: 1, height: 2, background: i < sec ? M.t4 : i === sec ? M.red : M.s2, transition: 'background .3s' }} title={s} />
                ))}
              </div>
            </div>

            {/* Live counter */}
            {C.total > 0 && (
              <div style={{ position: 'sticky', top: 68, zIndex: 99, background: 'rgba(9,9,11,0.96)', backdropFilter: 'blur(20px)', borderBottom: `1px solid ${M.brd}`, padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: M.mono, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: M.t4 }}>Straty / 6 mies.</span>
                <span style={{ fontFamily: M.mono, fontSize: 18, fontWeight: 700, color: M.red }}>{C.total.toLocaleString('pl-PL')} zł</span>
              </div>
            )}

            <div style={{ padding: '0 16px' }}>
              {/* Hero */}
              {sec === 0 && (
                <div style={{ padding: '32px 0 28px', textAlign: 'center' }}>
                  <div style={{ display: 'inline-flex', fontFamily: M.mono, fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: M.red, border: `1px solid ${M.red}30`, padding: '5px 14px', marginBottom: 18, background: M.red + '15' }}>
                    ⚡ 2 minuty prawdy
                  </div>
                  <h1 style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.15, letterSpacing: -0.5, marginBottom: 12 }}>
                    Ile <em style={{ fontStyle: 'normal', color: M.red }}>naprawdę</em> Cię kosztuje<br />to jak teraz żyjesz?
                  </h1>
                  <p style={{ color: M.t3, fontSize: 13, lineHeight: 1.55, fontWeight: 300, maxWidth: 340, margin: '0 auto 12px' }}>
                    Nie moralizuję. Przeliczam. Hormony, mózg i formę — na złotówki. Na bazie badań, nie opinii.
                  </p>
                  <div style={{ fontFamily: M.mono, fontSize: 9, color: M.t4, letterSpacing: 1 }}>🔒 Zero danych · Tylko Ty to widzisz</div>
                </div>
              )}

              {/* Section title (non-hero) */}
              {sec > 0 && (
                <div style={{ padding: '24px 0 20px' }}>
                  <div style={{ fontFamily: M.mono, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: M.t4, marginBottom: 8 }}>Sekcja {sec + 1}</div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.3 }}>{SECTIONS[sec]}</h2>
                </div>
              )}

              {sec === 0 && (
                <div>
                  <SH n="01" title="Ile śpisz naprawdę" />
                  <div style={{ fontSize: 12.5, color: M.t4, paddingLeft: 32, marginBottom: 24 }}>Nie ile leżysz. Ile faktycznie śpisz.</div>
                  <Slider label="Średni sen w nocy" min={3} max={9} step={0.5} k="sleep" val={D.sleep} unit="h" note={`Deficyt vs 7.5h: ${Math.max((7.5 - D.sleep) * 7, 0).toFixed(0)}h / tydzień`} />
                  <SevField label="Jakość snu" sub="Budzisz się, kręcisz, masz płytki sen?" k="sleepQ" val={D.sleepQ} />
                  <SevField label="Telefon przed snem" sub="Scrollujesz w łóżku?" k="screenBed" val={D.screenBed} />
                </div>
              )}

              {sec === 1 && (
                <div>
                  <SevField label="Poziom stresu w ciągu dnia" k="stress" val={D.stress} />
                  <SevField label="Energia i motywacja" sub="Jak często czujesz się wypalony?" k="energy" val={D.energy} />
                  <SevField label="Głód dopaminowy" sub="Szukasz ciągłej stymulacji, trudno skupić się na nudnym zadaniu?" k="dopamine" val={D.dopamine} />
                  <Slider label="Ile godzin dziennie tracisz przez mgłę / wolniejsze myślenie?" min={0} max={4} step={0.5} k="lost" val={D.lost} unit="h" />
                  <Slider label="Twoja stawka godzinowa" min={0} max={300} step={10} k="rate" val={D.rate} unit=" zł" />
                </div>
              )}

              {sec === 2 && (
                <div>
                  <SevField label="Chaos w diecie" sub="Jesz nieregularnie, omijasz posiłki, improwizujesz?" k="dietChaos" val={D.dietChaos} />
                  <SevField label="Cykliczne objadanie" sub="Po weekendach, stresie, z nudów?" k="binge" val={D.binge} />
                  <Slider label="Wydajesz miesięcznie na śmieciowe jedzenie" min={0} max={1000} step={50} k="junk" val={D.junk} unit=" zł" note={`6 miesięcy: ${(D.junk * 6).toLocaleString('pl-PL')} zł`} />
                </div>
              )}

              {sec === 3 && (
                <div>
                  <Slider label="Weekendy imprezowe w miesiącu" min={0} max={4} step={1} k="wknd" val={D.wknd} unit="" />
                  <Slider label="Drinki na imprezie (średnio)" min={0} max={20} step={1} k="drinks" val={D.drinks} unit="" note={D.drinks > 5 ? '5-6 piw = ~27% spadek testosteronu w 12h' : ''} />
                  <Slider label="Wydajesz na imprezie" min={0} max={500} step={50} k="cash" val={D.cash} unit=" zł" note={`Suma 6 mies.: ${(D.cash * D.wknd * 6).toLocaleString('pl-PL')} zł`} />
                  <Slider label="Wydajesz na substancje" min={0} max={500} step={50} k="subs" val={D.subs} unit=" zł" />
                </div>
              )}

              {sec === 4 && (
                <div>
                  <Slider label="Miesięczny koszt siłowni / trenera" min={0} max={500} step={50} k="gym" val={D.gym} unit=" zł" />
                  <Slider label="Planowane treningi w tygodniu" min={0} max={7} step={1} k="plan" val={D.plan} unit="" />
                  <Slider label="Ile opuszczasz przez zmęczenie / kaca" min={0} max={4} step={1} k="miss" val={D.miss} unit="" note={`Tracisz: ${D.miss * 4 * 6} treningów w 6 mies.`} />
                </div>
              )}

              {sec === 5 && (
                <div>
                  <div style={{ fontSize: 13, color: M.t2, marginBottom: 16, lineHeight: 1.5 }}>Zaznacz co obserwujesz u siebie.</div>
                  {([
                    ['fatigue', 'Ciągłe zmęczenie mimo odpoczynku'],
                    ['mood', 'Wahania nastroju, drażliwość'],
                    ['libido', 'Obniżone libido lub motywacja seksualna'],
                    ['belly', 'Brzuch który nie schodzi mimo treningu'],
                    ['brain', 'Brain fog — mgła, problemy z koncentracją'],
                    ['anxiety', 'Niepokój, natrętne myśli'],
                    ['joints', 'Bóle stawów lub słaba regeneracja'],
                    ['skin', 'Pogorszona cera, wypryski'],
                    ['motivation', 'Brak motywacji, apatia'],
                    ['digest', 'Problemy trawienne, wzdęcia'],
                  ] as [ChipKey, string][]).map(([k, l]) => <Chip key={k} t={k} label={l} />)}
                </div>
              )}

              {/* Nav */}
              <div style={{ display: 'flex', gap: 10, marginTop: 32 }}>
                {sec > 0 && (
                  <button onClick={back} style={{ flex: 1, padding: 14, background: M.s1, color: M.t2, border: `1px solid ${M.brd}`, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    ← Wstecz
                  </button>
                )}
                <button onClick={go} style={{ flex: 2, padding: 16, background: sec === SECTIONS.length - 1 ? M.red : M.t1, color: sec === SECTIONS.length - 1 ? '#fff' : M.bg, border: 'none', fontFamily: M.mono, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 3, cursor: 'pointer' }}>
                  {sec === SECTIONS.length - 1 ? 'Oblicz moje straty →' : 'Dalej →'}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── EMAIL GATE ── */}
        {phase === 'gate' && (
          <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 16px', textAlign: 'center' }}>
            <div style={{ maxWidth: 400, width: '100%' }}>
              <div style={{ fontFamily: M.mono, fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: M.red, border: `1px solid ${M.red}30`, background: M.red + '15', padding: '5px 14px', display: 'inline-block', marginBottom: 28 }}>
                Obliczono
              </div>

              {/* Score preview */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontFamily: M.mono, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: M.t4, marginBottom: 8 }}>Twój Damage Score</div>
                <div style={{ fontFamily: M.mono, fontSize: 80, fontWeight: 800, lineHeight: 1, color: scoreColor }}>{SC}</div>
                <div style={{ fontFamily: M.mono, fontSize: 11, color: M.t4, marginTop: 4 }}>/100</div>
              </div>

              {/* Cost preview */}
              <div style={{ background: M.s1, border: `1px solid ${M.red}30`, padding: 16, marginBottom: 28 }}>
                <div style={{ fontFamily: M.mono, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: M.t4, marginBottom: 6 }}>Szacowane straty / 6 miesięcy</div>
                <div style={{ fontFamily: M.mono, fontSize: 36, fontWeight: 800, color: M.red }}>{C.total.toLocaleString('pl-PL')} zł</div>
              </div>

              <h2 style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.2, letterSpacing: -0.5, marginBottom: 10 }}>
                Podaj email żeby<br />zobaczyć pełną analizę
              </h2>
              <p style={{ fontSize: 13, color: M.t3, lineHeight: 1.6, marginBottom: 24, fontWeight: 300 }}>
                Breakdown hormonów, co się dzieje w Twoim ciele i konkretne wnioski — na maila i poniżej.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input type="email" placeholder="twoj@email.com" value={email}
                  onChange={e => { setEmail(e.target.value); setEmailErr(''); }}
                  onKeyDown={e => e.key === 'Enter' && submit()}
                  style={{ borderColor: emailErr ? M.red : undefined }} />
                {emailErr && <div style={{ fontSize: 11, color: M.red, fontFamily: M.mono, textAlign: 'left' }}>{emailErr}</div>}
                <button onClick={submit} disabled={loading}
                  style={{ width: '100%', padding: 16, background: loading ? M.brd2 : M.red, color: loading ? M.t4 : '#fff', border: 'none', fontFamily: M.mono, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer' }}>
                  {loading ? 'Wysyłam...' : 'Pokaż pełną analizę →'}
                </button>
              </div>
              <p style={{ fontSize: 11, color: M.t4, marginTop: 14, fontFamily: M.mono, letterSpacing: 0.5 }}>Zero spamu. Wypis jednym kliknięciem.</p>
            </div>
          </div>
        )}

        {/* ── RESULTS ── */}
        {phase === 'results' && (
          <div style={{ padding: '40px 16px 0' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 32, paddingBottom: 24, borderBottom: `1px solid ${M.brd}` }}>
              <div style={{ fontFamily: M.mono, fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: M.t4, marginBottom: 8 }}>Wyniki</div>
              <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>Twoja diagnoza</h2>
            </div>

            {/* Score ring */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0 0 32px' }}>
              <div style={{ position: 'relative', width: 160, height: 160 }}>
                <svg width="160" height="160" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="80" cy="80" r="64" fill="none" stroke={M.s2} strokeWidth={8} />
                  <circle cx="80" cy="80" r="64" fill="none" stroke={scoreColor} strokeWidth={8}
                    strokeDasharray={circ} strokeDashoffset={offset}
                    style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)' }} />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: M.mono, fontSize: 34, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>{SC}</span>
                  <span style={{ fontFamily: M.mono, fontSize: 10, color: M.t4, letterSpacing: 1 }}>/100</span>
                </div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: scoreColor, marginTop: 12 }}>
                {SC >= 75 ? 'Pracujesz przeciwko sobie' : SC >= 50 ? 'Hormony i mózg pod presją' : SC >= 25 ? 'Twoje ciało już to czuje' : 'Niskie ryzyko — ale nie zero'}
              </div>
            </div>

            {/* Total */}
            <div style={{ background: M.red, textAlign: 'center', padding: '24px 20px 20px', position: 'relative', overflow: 'hidden', marginBottom: 24 }}>
              <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(-45deg,transparent,transparent 3px,rgba(0,0,0,.05) 3px,rgba(0,0,0,.05) 6px)' }} />
              <div style={{ position: 'relative' }}>
                <div style={{ fontFamily: M.mono, fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', opacity: .7, marginBottom: 6 }}>Tracisz w 6 miesięcy</div>
                <div style={{ fontFamily: M.mono, fontSize: 40, fontWeight: 800 }}>{C.total.toLocaleString('pl-PL')} zł</div>
                <div style={{ fontFamily: M.mono, fontSize: 12, opacity: .65, marginTop: 4 }}>= {Math.round(C.total / 6).toLocaleString('pl-PL')} zł / miesiąc</div>
              </div>
            </div>

            {/* Cats grid */}
            {catData.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontFamily: M.mono, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: M.t4, marginBottom: 14 }}>Podział strat</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {catData.map((c, i) => (
                    <div key={i} style={{ background: M.s1, border: `1px solid ${M.brd}`, padding: '14px 12px' }}>
                      <div style={{ fontSize: 15, marginBottom: 4 }}>{c.ic}</div>
                      <div style={{ fontFamily: M.mono, fontSize: 16, fontWeight: 700, color: M.red }}>{c.v.toLocaleString('pl-PL')} zł</div>
                      <div style={{ fontSize: 9, color: M.t4, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>{c.l}</div>
                      <div style={{ height: 3, background: M.s2, marginTop: 8 }}>
                        <div style={{ height: '100%', background: c.c, width: `${(c.v / maxC) * 100}%`, transition: 'width 1s ease .3s' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hormones */}
            {hormones.length > 0 && (
              <div style={{ background: M.s1, border: `1px solid ${M.brd}`, padding: '20px 16px', marginBottom: 24 }}>
                <div style={{ fontFamily: M.mono, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: M.t4, marginBottom: 14 }}>Wpływ na Twoje hormony</div>
                {hormones.map((h, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < hormones.length - 1 ? `1px solid ${M.brd}` : 'none' }}>
                    <span style={{ fontSize: 13, color: M.t2, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 16 }}>{h.a}</span> {h.n}
                    </span>
                    <span style={{ fontFamily: M.mono, fontSize: 10, padding: '2px 8px', letterSpacing: 0.5, color: h.c, border: `1px solid ${h.c}33` }}>{h.i}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Insights */}
            {insights.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                {insights.map((ins, i) => (
                  <div key={i} style={{ padding: 14, borderLeft: `2px solid ${M.red}`, background: M.s1, marginBottom: 4 }}>
                    <p style={{ fontSize: 12.5, color: M.t3, lineHeight: 1.55, fontWeight: 300 }}
                      dangerouslySetInnerHTML={{ __html: ins.replace(/<b>/g, `<strong style="color:${M.t1};font-weight:600">`).replace(/<\/b>/g, '</strong>') }} />
                  </div>
                ))}
              </div>
            )}

            {/* CTA */}
            <div style={{ background: M.s1, border: `1px solid ${M.brd2}`, padding: '24px 20px', marginBottom: 24 }}>
              <div style={{ fontFamily: M.mono, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: M.t4, marginBottom: 12 }}>Co dalej?</div>
              <p style={{ fontSize: 14, color: M.t2, lineHeight: 1.65, fontWeight: 300, marginBottom: 20 }}>
                Pracuję z ludźmi którzy żyją dokładnie tak jak Ty — imprezy, praca, chaos.
                Mimo to mają formę, energię i sprawny mózg. <strong style={{ color: M.t1, fontWeight: 600 }}>Bez rezygnowania z życia.</strong>
              </p>
              <a href="https://system.talerzihantle.com" target="_blank" rel="noopener noreferrer"
                style={{ display: 'block', background: M.red, color: '#fff', fontFamily: M.mono, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', textDecoration: 'none', padding: 18, textAlign: 'center', marginBottom: 12 }}>
                Sprawdź czy się kwalifikujesz →
              </a>
              <div style={{ textAlign: 'center', fontSize: 11, color: M.t4, fontFamily: M.mono, letterSpacing: 0.5 }}>
                lub napisz <strong style={{ color: M.t3 }}>JAZDA</strong> w DM → @hantleitalerz
              </div>
              <a href="https://neurobiologia-formy.netlify.app" target="_blank" rel="noopener noreferrer"
                style={{ display: 'block', textAlign: 'center', marginTop: 16, padding: '14px 20px', background: 'transparent', border: `1px solid ${M.red}`, color: M.red, fontFamily: M.mono, fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', textDecoration: 'none' }}>
                Neurobiologia Formy — 49 zł →
              </a>
              <p style={{ textAlign: 'center', fontSize: 10, color: M.t4, marginTop: 6, fontFamily: M.mono }}>
                Nie jesteś gotowy na prowadzenie? Zacznij tutaj.
              </p>
            </div>

            {/* Sources */}
            <div style={{ padding: 16, background: M.s1, border: `1px solid ${M.brd}`, marginBottom: 32 }}>
              <div style={{ fontFamily: M.mono, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: M.t4, marginBottom: 10 }}>Skąd te liczby</div>
              <div style={{ fontSize: 10, color: M.t4, lineHeight: 1.7 }}>
                {['Nutrition & Metabolism, 2014: alkohol >1.5g/kg = spadek T ~27% w 12h',
                  'J. Clin. Endocrinol. Metab.: 14+ drinków = -23% testosteronu następnego dnia',
                  'RAND Corporation, 2016: <6h snu = 13% wyższe ryzyko śmierci, 19-29% mniej produktywności',
                  'Expert Rev. Endocrinol. Metab., 2023: meta-analiza 21 badań, 10 199 osób',
                ].map((s, i) => <span key={i} style={{ display: 'block', marginBottom: 3 }}>[{i + 1}] {s}</span>)}
              </div>
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', padding: 16, fontFamily: M.mono, fontSize: 9, color: M.t4, letterSpacing: 1 }}>
          Hantle i Talerz · Diagnostyka v5
        </div>
      </div>
    </>
  );
}
