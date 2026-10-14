import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// 2026-10-14 audyt ekranu wyniku: dwa miejsca, w ktorych wynik przeczyl sam sobie.
// 1) Licznik w lustrze stal na wlasnej ocenie (2), a naglowek obok mowil 3,4, bo animacja
//    startowala dopiero przy 80% widocznosci elementu.
// 2) Samoocena napedu 2/10 + ostrzezenie lekarskie, a na mapie "Napęd i libido" jako os,
//    ktorej "na razie nie ruszaj", bo indeks napedu nie czytal self_drive.
const rx = fs.readFileSync('app/components/ResultExperience.tsx', 'utf8');
const page = fs.readFileSync('app/diagnoza/page.tsx', 'utf8');

test('SettlingReadout shows the measured value unless the animation actually runs', () => {
  const fn = rx.match(/function SettlingReadout[\s\S]*?\r?\n}\r?\n/)?.[0] ?? '';
  assert.ok(fn, 'SettlingReadout exists');
  assert.match(fn, /useState\(fmt\(to\)\)/);
  const beforeObserver = fn.split('new IntersectionObserver')[0];
  assert.doesNotMatch(beforeObserver, /setShown\(fmt\(from\)\)/, 'from must not be shown before the element is in view');
  const th = Number(fn.match(/threshold:\s*([\d.]+)/)?.[1]);
  assert.ok(th <= 0.5, `threshold ${th} too high, short viewports never trigger it`);
});

test('drive axis reads the self-rating, not only ticked symptoms', () => {
  const sev = page.match(/const napedSev = [^\n]+/)?.[0] ?? '';
  assert.match(sev, /selfDriveSev/);
  assert.match(page, /answers\.self_drive/);
  const reason = page.match(/const driveReason = [^\n]+/)?.[0] ?? '';
  assert.match(reason, /oceniasz to na/);
});

test('low self-rated drive is never presented as the axis to leave alone', () => {
  const block = rx.match(/const strongestStatus = [^\n]+/)?.[0] ?? '';
  assert.match(block, /selfDrive/);
});
