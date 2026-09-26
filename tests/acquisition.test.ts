import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  acquisitionFromSearch,
  mergeAcquisitionFirstTouch,
  withAcquisition,
} from '../app/lib/acquisition';

test('acquisition reads all 9 safe fields', () => {
  const value = acquisitionFromSearch(
    '?utm_source=instagram&utm_medium=story&utm_campaign=wrzesien'
    + '&utm_content=hook1&utm_term=fit&source=manychat_core'
    + '&source_asset=asset_123&source_campaign=punkt_pekniecia&keyword=FORMA',
  );
  assert.deepEqual(value, {
    utm_source: 'instagram',
    utm_medium: 'story',
    utm_campaign: 'wrzesien',
    utm_content: 'hook1',
    utm_term: 'fit',
    source: 'manychat_core',
    source_asset: 'asset_123',
    source_campaign: 'punkt_pekniecia',
    keyword: 'FORMA',
  });
});

test('acquisition rejects PII-shaped and unknown values', () => {
  const value = acquisitionFromSearch(
    '?source_asset=person%40example.com&keyword=%2B48500000000'
    + '&source=reel&unexpected=DROP',
  );
  assert.equal(value.source_asset, undefined);
  assert.equal(value.keyword, undefined);
  assert.equal(value.source, 'reel');
  assert.equal('unexpected' in value, false);
});

test('first touch stays stable when later query tries to replace the asset', () => {
  const first = acquisitionFromSearch('?source=reel&source_asset=asset_A&keyword=FORMA');
  const later = acquisitionFromSearch('?source=story&source_asset=asset_B&keyword=STER');
  const merged = mergeAcquisitionFirstTouch(first, later);
  assert.equal(merged.source, 'reel');
  assert.equal(merged.source_asset, 'asset_A');
  assert.equal(merged.keyword, 'FORMA');
});

test('Nabor URL keeps product routing while carrying exact content attribution', () => {
  const url = new URL(withAcquisition(
    'https://nabor.talerzihantle.com/?from=diag&mode=fast_fit#prowadzenie',
    { source_asset: 'asset_A', source_campaign: 'campaign_A', keyword: 'FORMA' },
  ));
  assert.equal(url.searchParams.get('from'), 'diag');
  assert.equal(url.searchParams.get('mode'), 'fast_fit');
  assert.equal(url.searchParams.get('source_asset'), 'asset_A');
  assert.equal(url.searchParams.get('source_campaign'), 'campaign_A');
  assert.equal(url.searchParams.get('keyword'), 'FORMA');
  assert.equal(url.hash, '#prowadzenie');
});

test('current Diagnostyka 3.0 carries acquisition through both Nabor exits only', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'app/diagnoza/page.tsx'), 'utf8');
  assert.match(source, /captureAcquisition\(window\.location\.search\)/);
  assert.match(source, /withAcquisition\(\s*'https:\/\/nabor\.talerzihantle\.com\/\?from=diag&mode=fast_fit#prowadzenie'/);
  assert.match(source, /const naborUrl = withAcquisition\(naborBaseUrl, acquisitionRef\.current\)/);
  assert.doesNotMatch(source, /score\([^\n]*acquisition|routeDecision\([^\n]*acquisition|classifyPremiumFit\([^\n]*acquisition/);
});
