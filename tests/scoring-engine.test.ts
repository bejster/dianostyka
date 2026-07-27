// scoring-engine.test.ts — Unit tests for Diagnostyka Tygodnia V2 scoring engine

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculateScoring, type RawAnswers } from '../app/lib/scoring-engine.ts';

test('sleep_debt_michal persona -> Profile A (Zaczynasz dzień na minusie)', () => {
  const answers: RawAnswers = {
    sleep_hours: 5.5,
    sleep_quality: 'sq_wrecked',
    screen_bed: 'sb_fallasleep',
    work_hours: 9,
    stress_level: 'st_mid',
    break_window: 'bw_morning',
    evening_eating: 'ee_snack',
    takeout_cost: 200,
    weekend_pattern: 'wp_slight',
    alcohol_intake: 'alc_low',
    gym_miss: 'gm_sometimes',
    symptoms_chips: ['fatigue', 'brain'],
  };

  const res = calculateScoring(answers);
  assert.equal(res.profile.code, 'A');
  assert.equal(res.primaryLever.domainKey, 'sleep');
  assert.ok(res.overallScore >= 0 && res.overallScore <= 100);
});

test('evening_hunger_loop persona -> Profile B (Wieczór zjada Ci następny dzień)', () => {
  const answers: RawAnswers = {
    sleep_hours: 7.5,
    sleep_quality: 'sq_ok',
    screen_bed: 'sb_30min',
    work_hours: 8,
    stress_level: 'st_mid',
    break_window: 'bw_evening',
    evening_eating: 'ee_uncontrolled',
    takeout_cost: 800,
    weekend_pattern: 'wp_slight',
    alcohol_intake: 'alc_low',
    gym_miss: 'gm_sometimes',
    symptoms_chips: ['cravings', 'belly'],
  };

  const res = calculateScoring(answers);
  assert.equal(res.profile.code, 'B');
  assert.equal(res.primaryLever.domainKey, 'nutrition');
});

test('weekend_recovery_cost persona -> Profile C (Weekend kosztuje Cię trzy dni)', () => {
  const answers: RawAnswers = {
    sleep_hours: 7,
    sleep_quality: 'sq_ok',
    screen_bed: 'sb_30min',
    work_hours: 8,
    stress_level: 'st_mid',
    break_window: 'bw_weekend',
    evening_eating: 'ee_clean',
    takeout_cost: 100,
    weekend_pattern: 'wp_reset',
    alcohol_intake: 'alc_high',
    gym_miss: 'gm_sometimes',
    symptoms_chips: ['fatigue'],
  };

  const res = calculateScoring(answers);
  assert.equal(res.profile.code, 'C');
  assert.equal(res.primaryLever.domainKey, 'weekend');
});

test('leadFitSegment classifies high-stress / low-resilience users as hot', () => {
  const hotAnswers: RawAnswers = {
    sleep_hours: 5,
    sleep_quality: 'sq_wrecked',
    screen_bed: 'sb_fallasleep',
    work_hours: 12,
    stress_level: 'st_max',
    evening_eating: 'ee_uncontrolled',
    symptoms_chips: ['fatigue', 'belly', 'brain', 'cravings'],
  };

  const res = calculateScoring(hotAnswers);
  assert.equal(res.leadFitSegment, 'hot');
});
