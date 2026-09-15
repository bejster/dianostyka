import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'app/diagnoza/page.tsx'), 'utf8');
const result = fs.readFileSync(path.join(root, 'app/components/ResultExperience.tsx'), 'utf8');
const flow = fs.readFileSync(path.join(root, 'app/components/SingleQuestionFlow.tsx'), 'utf8');
const cfg = fs.readFileSync(path.join(root, 'app/lib/assessment-config.ts'), 'utf8');

// Cold entry = blok JSX fazy 'intro'. Zawezamy zakres, zeby kontrakt dotyczyl realnego ekranu,
// a nie silnika scoringu nizej w pliku (tam slowo "Weekend" jest legalna etykieta osi).
const coldEntry = page.match(/if \(phase === 'intro'\) \{([\s\S]*?)\n  \}/)?.[1] ?? '';

test('v2.8 release is versioned 2.8.1', () => {
  // 2.8.1 = ten sam release awareness-first plus blok sufitu w domknieciu. Wersja jedzie w href CTA,
  // wiec musi sie zmienic razem z copy, inaczej konwersja sprzed i po triggerze wpada do jednego worka.
  assert.match(cfg, /ASSESSMENT_VERSION = '2\.8\.1'/);
});

test('cold entry sells an awareness gap, not a weekend audit', () => {
  assert.ok(coldEntry, "cold entry block (phase === 'intro') not found");
  assert.match(coldEntry, /Sprawdź, czy Twój obecny poziom to naprawdę Twój sufit\./);
  assert.match(coldEntry, /Sprawdź mój poziom/);
  // weekend przestal byc obietnica ekranu wejsciowego
  assert.doesNotMatch(coldEntry, /weekend/i, 'weekend framing leaked back into the cold entry');
  // rownie zakazane: obiecywanie diagnozy hormonalnej albo wellness-owego jezyka na wejsciu
  assert.doesNotMatch(coldEntry, /hormon|testosteron|kortyzol|wellness|dobrostan/i);
});

test('Punkt Pęknięcia is a payoff, never a precondition of starting', () => {
  assert.ok(coldEntry, 'cold entry block not found');
  assert.doesNotMatch(coldEntry, /Pęknięci|Pęknięcia/i, 'cold entry demands belief in IP before any evidence');
  assert.match(result, /<div className="rx-kick">Punkt Pęknięcia<\/div>/);
});

test('weekend is demoted to Q1/Q2 but is still asked first in the flow', () => {
  assert.match(flow, /FIRST_VISIBLE_IDS = \['weekend_pattern', 'monday_recovery', 'primary_goal'\]/);
});

test('result opens with current state and reserve, and names the fracture only after evidence', () => {
  const order = [...result.matchAll(/data-beat="([a-z0-9]+)"/g)].map((m) => m[1]);
  const at = (b: string) => order.indexOf(b);
  assert.ok(at('1') === 0, `result must open on the current-state beat, got: ${order.join(' > ')}`);
  assert.ok(at('map') > at('1'), 'Mapa 168 must follow the current-state beat');
  assert.ok(at('evidence') > at('map'), 'evidence must follow the map');
  assert.ok(at('fracture') > at('evidence'), 'Punkt Pęknięcia must be revealed AFTER the evidence, not before');
  assert.ok(at('2') > at('fracture'), 'Pętla 168 must follow the fracture reveal');
  assert.ok(at('horizon') > at('5'), 'horizon must follow the 72h experiment');
  assert.ok(at('6') > at('horizon'), 'the 1:1 demonstration must follow the horizon');
  // hero mowi o zapasie, a nie o czerwonej linii/deficycie
  assert.match(result, /Poziom, na którym dziś jedziesz, nie jest jeszcze Twoim sufitem\./);
  assert.match(result, /Największy zapas/);
});

test('reserve language replaces fake potential precision', () => {
  assert.match(result, /const reserveBand = \(score: number\)/);
  assert.match(result, /więcej miejsca do poprawy/);
  const live = page + result;
  assert.doesNotMatch(live, /potencjał[uaeó]?\s*(:|=)?\s*\d+\s*%/i, 'fabricated potential percentage');
  assert.doesNotMatch(live, /\d+\s*%\s*(swojego |Twojego )?potencjał/i, 'fabricated potential percentage');
  assert.doesNotMatch(live, /marnujesz \d+/i, 'fabricated waste figure');
  assert.doesNotMatch(live, /wykorzystujesz \d+\s*%/i, 'fabricated utilization figure');
  // indeks musi byc jawnie opisany jako porownawczy, nie jako procent formy ani wynik medyczny
  // v2.8.1 pass jezykowy: "To indeks porownawczy..." -> zdanie mowione. Ta sama tresc kontraktu
  // (liczba porownuje piec obszarow WYLACZNIE miedzy soba), ten sam poziom asercji: literal albo fail.
  assert.match(result, /Ta liczba porównuje pięć obszarów wyłącznie między sobą\./);
  assert.match(result, /Nie jest procentem Twojej formy, procentem wykorzystanego potencjału ani wynikiem medycznym\./);
});

test('reserve bands are calibrated to the real axis scale, so the label never contradicts its own evidence', () => {
  // Osie sa clampowane do uczciwego pasma 24-90 (srodek 57). Progi pasma musza siedziec wokol tego srodka,
  // inaczej wynik w rodzaju 62/100 z dowodem "2-3 weekendy w miesiacu psuja rytm" dostaje etykiete "malo zapasu".
  const m = result.match(/const reserveBand = \(score: number\)[^=]*=> score < (\d+) \? 'wyraźny' : score < (\d+) \? 'umiarkowany' : 'mały'/);
  assert.ok(m, 'reserveBand thresholds not found in the expected shape');
  const [lo, hi] = [Number(m![1]), Number(m![2])];
  assert.ok(lo > 24 && lo < 57, `"wyraźny zapas" cutoff ${lo} must sit below the middle of the 24-90 axis band`);
  assert.ok(hi > 57 && hi < 90, `"mały zapas" cutoff ${hi} must sit above the middle of the 24-90 axis band`);
  // ten sam prog rzadzi flaga medyczna, zeby nie powstal drugi, rozjezdzajacy sie prog
  assert.match(result, /const flagDriveCheck = Boolean\(driveAxis && reserveBand\(driveAxis\.score\) === 'wyraźny'\)/);
});

test('reserve headline is grammatical Polish for both the singular and plural case', () => {
  assert.match(result, /z \$\{statuses\.length\} obszarów \$\{bigReserve === 1 \? 'ma' : 'mają'\} dziś/);
  assert.doesNotMatch(result, /obszaru ma dziś/, 'broken genitive: "1 z 5 obszaru"');
  assert.doesNotMatch(result, /\$\{statuses\.length\} ma jeszcze/, 'plural subject with a singular verb');
});

test('numbers shown to the user are written in Polish, not raw JS floats', () => {
  // suwak godzin ma krok 0.5, wiec kazde surowe wstawienie hp/D.lost daje "0.5 h" w polskim zdaniu
  const fe = fs.readFileSync(path.join(root, 'app/lib/fracture-engine.ts'), 'utf8');
  assert.match(fe, /function hoursPl\(h: number\): string \{\s*return String\(h\)\.replace\('\.', ','\);/);
  assert.match(page, /const hoursPl = \(h: number\) => String\(h\)\.replace\('\.', ','\)/);
  for (const [name, src] of [['fracture-engine', fe], ['page', page]] as const) {
    assert.doesNotMatch(src, /\$\{(hp|D\.lost)( as number)?\} h /, `raw float interpolated into Polish prose (${name})`);
  }
});

test('the training numbers in the copy are the same clamped numbers the scoring uses', () => {
  // suwak "ile wypada" nie zna wartosci suwaka "ile planuje" — bez clampu copy pokazywalo "5 z 3 treningow"
  const fe = fs.readFileSync(path.join(root, 'app/lib/fracture-engine.ts'), 'utf8');
  assert.match(fe, /function trainingPair\(answers: RawAnswers\)/);
  assert.match(fe, /missed: Math\.max\(0, Math\.min\(missedRaw, planned\)\)/);
  // surowa odpowiedz "ile wypada" ma byc czytana WYLACZNIE przez clampujacy helper
  const reads = [...fe.matchAll(/answers\.missed_trainings/g)].length;
  assert.equal(reads, 1, 'missed_trainings is read outside trainingPair, so a copy line can bypass the clamp');
  assert.match(fe, /function trainingPair[\s\S]*?answers\.missed_trainings/, 'the single read is not the one inside trainingPair');
  // "1 z 1 treningow" czyta sie jak blad danych, wiec komplet ma wlasne zdanie
  assert.match(fe, /function missedPhrase\(planned: number, missed: number\)/);
  assert.match(fe, /missed >= planned/);
  assert.match(page, /D\.miss >= D\.plan \?/, 'axis caption still renders the "N z N" shape');
  // zero wypadajacych treningow nie jest kosztem
  assert.doesNotMatch(fe, /push\(typeof missed === 'number' && typeof planned === 'number' && planned >= 1,/);
});

test('every displayed axis number carries the answer that moved it', () => {
  assert.match(result, /className="rx-axis-reason"/);
  assert.match(result, /Każda liczba powstaje wyłącznie z odpowiedzi/);
  assert.match(result, /weakestStatus\?\.reason/);
  assert.match(result, /strongestStatus\?\.reason/);
});

test('low drive is escalated to medical verification, never diagnosed', () => {
  assert.match(result, /warto zrobić badania i omówić wyniki z lekarzem/);
  const live = page + result;
  for (const re of [
    /masz nisk[ie][^.]{0,24}testosteron/i,
    /Twój testosteron jest/i,
    /rozregulowane hormony/i,
    /masz (wysoki|podwyższony) kortyzol/i,
    /niedobór testosteronu/i,
  ]) assert.doesNotMatch(live, re, `medical claim the answers cannot support: ${re}`);
});

test('horizon separates what 72h, weeks and longer can each answer, without invented dates', () => {
  const hz = result.match(/data-beat="horizon"([\s\S]*?)<\/section>/)?.[1] ?? '';
  assert.ok(hz, 'horizon beat not found');
  assert.match(hz, /72 godziny/);
  assert.match(hz, /Najbliższe tygodnie/);
  assert.match(hz, /Dłuższy horyzont/);
  assert.match(hz, /Daty tutaj nie podam, bo byłaby zmyślona\./);
  assert.doesNotMatch(hz, /w \d+ (dni|dniach|tygodni|tygodniach)/i, 'invented delivery date in the horizon block');
  assert.doesNotMatch(hz, /gwarant/i, 'guarantee language in the horizon block');
});

test('1:1 section demonstrates sequencing and holds escalation until there is proof', () => {
  assert.match(result, /Dokładam dopiero po dowodzie/);
  assert.match(result, /Kolejny element wchodzi wtedy, gdy pierwszy przeżyje gorszy tydzień\./);
  const demo = result.match(/data-beat="6"([\s\S]*?)<\/section>/)?.[1] ?? '';
  assert.ok(demo, '1:1 beat not found');
  for (const re of [/holistyczn/i, /indywidualny plan/i, /optymalizujemy/i, /odblokuj[ea]?\w* (swój )?potencjał/i]) {
    assert.doesNotMatch(demo, re, `generic coaching filler in the 1:1 section: ${re}`);
  }
});

test('commercial action stays ahead of calibration and no DM lane is reintroduced', () => {
  const action = result.indexOf('className="rx-final-action"');
  const calib = result.indexOf('className="rx-calibwrap"');
  assert.ok(action > 0 && calib > 0, 'final action or calibration block missing');
  assert.ok(action < calib, 'calibration must come AFTER the commercial action');
  assert.doesNotMatch(page + result, /dmHref|ig\.me\/m|cta_dm_clicked|napisz do mnie/i);
});

test('routing destination still depends on intent and start_when only', () => {
  const router = fs.readFileSync(path.join(root, 'app/lib/result-router-v3.ts'), 'utf8');
  assert.match(router, /export function routeDecision\(intentRaw: string, startWhenRaw: string\)/);
  // cialo funkcji bez komentarzy: zadna zmienna wyniku nie ma prawa dotknac destination
  const body = (router.match(/export function routeDecision\([^)]*\): RouteDecision \{([\s\S]*?)\n\}/)?.[1] ?? '')
    .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  assert.ok(body, 'routeDecision body not found');
  assert.doesNotMatch(body, /\bscore\b|\bseverity\b|\barchetype\b|\barchKey\b|\btier\b/i, 'routing must not read severity/score/archetype');
  assert.match(page, /const route = routeDecision\(intentStr, startWhenStr\)/);
});

test('no em dash or en dash in public prose', () => {
  for (const [name, src] of [['page', page], ['result', result]] as const) {
    const strings = [...src.matchAll(/>([^<>{}]{12,})</g)].map((m) => m[1]);
    for (const s of strings) {
      assert.doesNotMatch(s, /[—–]/, `dash in public prose (${name}): ${s.trim().slice(0, 90)}`);
    }
  }
});

test('every commercial headline ends as a finished sentence', () => {
  // rx-route-title renderuje kicker jako duzy serif h2. Bez znaku konca zdanie czytalo sie jak urwane,
  // a pytanie ("Chcesz, zeby ktos poprowadzil...") gubilo intonacje pytajna tuz nad przyciskiem.
  const router = fs.readFileSync(path.join(root, 'app/lib/result-router-v3.ts'), 'utf8');
  const kickers = [...router.matchAll(/primaryKicker: (?:near \? )?'([^']+)'(?: : '([^']+)')?/g)]
    .flatMap((m) => [m[1], m[2]])
    .filter(Boolean) as string[];
  assert.ok(kickers.length >= 6, `expected every routing branch to carry a kicker, got ${kickers.length}`);
  for (const k of kickers) {
    assert.match(k, /[.?]$/, `commercial headline is not a finished sentence: ${k}`);
    if (/^Chcesz\b/.test(k)) assert.match(k, /\?$/, `question rendered without a question mark: ${k}`);
  }
});

test('axis evidence never explains one axis with another axis signal', () => {
  // "Napęd i libido" z najwyzszym wynikiem dostawal jako dowod godziny na pol mocy, czyli fakt negatywny
  // pochodzacy z osi glowy i stresu. Dowod ma pochodzic z pytan tej samej osi albo powiedziec wprost, ze go nie ma.
  const drive = page.match(/const driveReason = .*/)?.[0] ?? '';
  assert.ok(drive, 'driveReason not found');
  assert.doesNotMatch(drive, /D\.lost/, 'drive axis borrows the stress-axis half-power number as its evidence');
  assert.match(drive, /nie zaznaczyłeś tu żadnego z czterech sygnałów/);
  // v2.8.4: sam objaw jako dowod ("zaznaczyles: motywacja") przeczyl etykiecie pasma, kiedy os wypadla
  // najlepiej z pieciu. Dowod ma niesc proporcje, bo ta sama liczba tlumaczy wysoki wynik rownie dobrze jak niski.
  assert.match(drive, /z czterech sygnałów/, 'drive evidence states a bare symptom instead of its proportion');
  assert.doesNotMatch(drive, /`zaznaczyłeś: /, 'bare symptom label can contradict the band rendered above it');
});

test('the first two cold-flow screens are not labelled as a weekend section', () => {
  // Hero obiecuje sprawdzenie sufitu. Ekran 1 i 2 mialy nad soba naglowek "WEEKEND", wiec user od razu
  // czytal cala diagnostyke jako diagnostyke weekendu. Pytania zostaja, etykieta ma byc szersza.
  const flow = fs.readFileSync(path.join(root, 'app/components/SingleQuestionFlow.tsx'), 'utf8');
  const cfg = fs.readFileSync(path.join(root, 'app/lib/assessment-config.ts'), 'utf8');
  const firstIds = (flow.match(/const FIRST_VISIBLE_IDS = \[([^\]]+)\]/)?.[1] ?? '')
    .split(',').map((s) => s.trim().replace(/'/g, '')).filter(Boolean);
  assert.deepEqual(firstIds.slice(0, 2), ['weekend_pattern', 'monday_recovery']);
  for (const id of firstIds.slice(0, 2)) {
    const block = cfg.slice(cfg.indexOf(`id: '${id}'`));
    const section = block.match(/section: '([^']+)'/)?.[1] ?? '';
    assert.ok(section, `no section label for ${id}`);
    assert.doesNotMatch(section, /[Ww]eekend/, `screen for ${id} still opens under a weekend section label: ${section}`);
  }
});

test('the closing block confronts the ceiling belief without inventing precision', () => {
  // Domkniecie bylo uprzejme i przez to bezzebne. ICP wychodzil z przekonaniem "u mnie jest ok,
  // ogarne sam". Trigger ma uderzac w to przekonanie, ale wylacznie liczbami z pasm zapasu.
  const src = fs.readFileSync(path.join(root, 'app/components/ResultExperience.tsx'), 'utf8');
  // Domkniecie nie moze byc jednym literalem dla kazdego. Ma sie rozgalezac na pasmach zapasu
  // i wskazywac konkretny obszar z wyniku tego czlowieka.
  assert.match(src, /const ceilingHit = hasCeilingRoom/);
  assert.match(src, /Nie wiesz, ile zapasu siedzi tutaj: \$\{breakPos\.label\}/);
  assert.match(src, /className="rx-ceiling"/);
  // trigger stoi PRZED handlowym CTA, a CTA dalej stoi przed kalibracja
  const ceilingAt = src.indexOf('className="rx-ceiling"');
  const kickerAt = src.indexOf('{route.primaryKicker}');
  const calibAt = src.indexOf('data-beat="7"');
  assert.ok(ceilingAt > 0 && ceilingAt < kickerAt, 'ceiling trigger does not stand above the routed CTA');
  assert.ok(kickerAt < calibAt, 'commercial CTA slipped below calibration');
  // liczba w triggerze pochodzi z pasm zapasu, nie z wymyslonego procentu potencjalu
  const block = src.slice(src.indexOf('const ceilingCount'), src.indexOf('const commitExperiment'));
  assert.ok(block.length > 200, 'ceiling copy block not found');
  assert.match(block, /bigReserve|anyReserve/);
  assert.doesNotMatch(block, /%|procent/, 'closing trigger invented a potential percentage');
  assert.doesNotMatch(block, /testosteron|kortyzol|hormon/i, 'closing trigger makes a hormonal claim');
  // zakaz sloganowej antytezy X/Y w gotowym copy domkniecia
  assert.doesNotMatch(block, /[Tt]o nie .{2,40}, to /);
  assert.doesNotMatch(block, /[Nn]ie chodzi o /);
  // twardy gate jezykowy: przecinek bezposrednio przed spojnikiem "i"
  assert.doesNotMatch(block, /, i /);
});
