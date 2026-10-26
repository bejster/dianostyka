import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { QUESTIONS, ASSESSMENT_VERSION } from '../app/lib/assessment-config.ts';
import { buildDecision } from '../app/lib/decision-engine.ts';
import { EXPERIMENT_BANK } from '../app/lib/experiment-bank.ts';
import { buildWeekDecisionCard } from '../app/lib/week-decision-card.ts';
import { buildMarketSignal } from '../app/lib/market-signal.ts';

const base = {
  primary_goal: 'goal_energia',
  break_window: 'bw_evening',
  give_up_point: 'gup_wieczor',
  tried_before: 'tb_2',
  work_load: 'wl_owner',
  stress_level: 'st_high',
  evening_eating: 'ee_binge',
  planned_trainings: 4,
  missed_trainings: 2,
  weekend_pattern: 'wp_slight',
  monday_recovery: 'mon_0',
};

function decisionCard(answers: Record<string, unknown>, experimentId: keyof typeof EXPERIMENT_BANK, confidence: 'HIGH' | 'LOW' = 'HIGH') {
  const experiment = EXPERIMENT_BANK[experimentId];
  const decision = buildDecision({ answers, experiment, confidence, routePrimary: 'experiment' });
  return buildWeekDecisionCard(answers, decision, experiment);
}

test('rdzeń pytań jest zamrożony; historię płatnych prób zbiera późniejszy formularz', () => {
  assert.equal(QUESTIONS.some(q => q.id === 'past_paid_attempt'), false);
  assert.equal(ASSESSMENT_VERSION, '3.0.0');
});

test('sygnał rynkowy jest deklaracją, nie scoringiem zamożności', () => {
  const m = buildMarketSignal({
    ...base, past_paid_attempt: 'pay_person',
    user_pain: 'od miesięcy nie ogarniam tego po pracy',
    instagram: 'prywatny_profil', symptoms_chips: ['libido'],
  });
  assert.equal(m.evidence, 'self_report');
  assert.equal(m.paid_solution_history, 'pay_person');
  assert.equal(m.has_verbatim_pain, true);
  assert.equal(m.declared_interest, null);
  assert.doesNotMatch(JSON.stringify(m), /prywatny_profil|od miesięcy|libido|password/);
  assert.equal(buildMarketSignal({ past_paid_attempt: 'fake' }).paid_solution_history, null);
});

test('wieczorne jedzenie + stres = inny wniosek niż gotowy tip żywieniowy', () => {
  const c = decisionCard(base, 'E1');
  assert.equal(c.pattern, 'evening_and_work');
  assert.match(c.title, /porą decyzji/);
  assert.equal(c.receipts.length, 2);
  assert.match(c.receipts.map(r => r.answer).join(' '), /4–5 wieczorów/);
  assert.match(c.receipts.map(r => r.answer).join(' '), /1–2 wieczory/);
  assert.equal(c.action, EXPERIMENT_BANK.E1.action, 'nie wymyślamy drugiego testu');
  assert.match(c.alternativeIfWrong, /Jeżeli wcześniejsza decyzja niczego nie zmieni/);
});

test('praca i 2 z 4 opuszczone = kontekst, liczby i jedna interwencja', () => {
  const c = decisionCard({ ...base, evening_eating: 'ee_clean' }, 'T1');
  assert.equal(c.pattern, 'work_and_training');
  assert.match(c.receipts.map(r => r.answer).join(' '), /2 z 4/);
  assert.match(c.insight, /nie dokładałbym kolejnego dnia treningowego/);
});

test('weekend i powrót we wtorek = realny sygnał bez diagnozy hormonalnej', () => {
  const c = decisionCard({ ...base, weekend_pattern: 'wp_reset', monday_recovery: 'mon_2' }, 'W4');
  assert.equal(c.pattern, 'weekend_return');
  assert.match(c.receipts.map(r => r.answer).join(' '), /dopiero we wtorek/);
  assert.doesNotMatch(c.insight, /kortyzol|dopamin|testosteron/i);
});

test('przy małej pewności nie ma pewnej przyczyny ani nieuzasadnionego claimu', () => {
  const c = decisionCard({ ...base, break_window: 'bw_varies' }, 'R4', 'LOW');
  assert.match(c.title, /nie będę zgadywał/);
  assert.match(c.note, /nie dowód przyczynowości/);
  assert.match(c.alternativeIfWrong, /Niczego nie potwierdziliśmy/);
});

test('publiczny wynik pokazuje dowody i możliwość niezgody, nie pseudopomiar energii', () => {
  const result = readFileSync('app/components/ResultExperience.tsx', 'utf8');
  assert.match(result, /decisionCard\.receipts/);
  assert.match(result, /decisionCard\.alternativeIfWrong/);
  assert.match(result, /result_reaction/);
  assert.match(result, /Nie wyliczę Twojej energii z pięciu kliknięć/);
  assert.doesNotMatch(result, /<SettlingReadout from=\{awareness\.selfEnergy\} to=\{awareness\.measuredEnergy\}/);
});

test('sygnały rynkowe idą prywatnym handoffem CRM, nie jako dane o portfelu do analytics', () => {
  const page = readFileSync('app/diagnoza/page.tsx', 'utf8');
  const analytics = readFileSync('app/lib/analytics.ts', 'utf8');
  assert.match(page, /market_signal: marketSignal/);
  const content = page.slice(page.indexOf('const contentSignals:'), page.indexOf('const submissionIdStr'));
  assert.doesNotMatch(content, /past_paid_attempt|user_pain:\s*raw|instagram/);
  assert.match(analytics, /UI_VARIANT = 'nnv-market-1'/);
});
