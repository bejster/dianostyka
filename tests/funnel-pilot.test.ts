import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildNaborPilotUrl,
  diagnosticLeadSegment,
  diagnosticScoreBucket,
  isFunnelDryRunHost,
  readSafeFunnelContext,
  sanitizeAnalyticsData,
} from '../app/lib/funnel-pilot.ts';

test('preserves campaign source while marking the diagnostic handoff', () => {
  const url = new URL(buildNaborPilotUrl({
    incomingSearch: '?utm_source=instagram&utm_medium=stories&utm_campaign=pilot&utm_content=hook-a',
    placement: 'primary',
    score: 67,
    topCategory: 'Sen',
    intent: 1,
  }));

  assert.equal(url.origin, 'https://nabor.talerzihantle.com');
  assert.equal(url.searchParams.get('utm_source'), 'instagram');
  assert.equal(url.searchParams.get('utm_medium'), 'stories');
  assert.equal(url.searchParams.get('origin_utm_content'), 'hook-a');
  assert.equal(url.searchParams.get('utm_content'), 'primary');
  assert.equal(url.searchParams.get('funnel_referrer'), 'diagnostyka');
  assert.equal(url.searchParams.get('diagnostic_segment'), 'goracy');
  assert.equal(url.searchParams.get('diagnostic_score_bucket'), 'high');
  assert.equal(url.searchParams.get('diagnostic_intent'), '1');
});

test('uses verified diagnostic defaults when no campaign context exists', () => {
  const url = new URL(buildNaborPilotUrl({
    incomingSearch: '',
    placement: 'sticky',
    score: 40,
    topCategory: 'Glowa',
  }));

  assert.equal(url.searchParams.get('utm_source'), 'diagnostyka');
  assert.equal(url.searchParams.get('utm_medium'), 'funnel_pilot');
  assert.equal(url.searchParams.get('diagnostic_segment'), 'zimny');
  assert.equal(url.searchParams.get('diagnostic_score_bucket'), 'mid');
});

test('supports a preview nabor destination without changing production defaults', () => {
  const url = new URL(buildNaborPilotUrl({
    destination: 'https://landing-pages-preview.vercel.app/',
    incomingSearch: '',
    placement: 'preview',
    score: 55,
    topCategory: 'Stres',
  }));
  assert.equal(url.hostname, 'landing-pages-preview.vercel.app');
  assert.equal(url.searchParams.get('funnel_referrer'), 'diagnostyka');
});

test('analytics context excludes unknown fields and control characters', () => {
  assert.deepEqual(
    readSafeFunnelContext('?utm_source=ig%00&utm_campaign=pilot&email=user@example.com&name=Jan'),
    { utm_source: 'ig', utm_campaign: 'pilot' },
  );
  assert.equal(diagnosticLeadSegment(61), 'goracy');
  assert.equal(diagnosticScoreBucket(39), 'low');
  assert.equal(isFunnelDryRunHost('diagnostyka-preview.vercel.app'), true);
  assert.equal(isFunnelDryRunHost('diagnostyka.talerzihantle.com'), false);
  assert.deepEqual(sanitizeAnalyticsData({ email: 'user@example.com', score_bucket: 'high' }), { score_bucket: 'high' });
});
