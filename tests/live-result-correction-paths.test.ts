import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const result = fs.readFileSync('app/components/ResultExperience.tsx', 'utf8');

test('a rejected or already-tried 72h test cannot silently become an accepted experiment', () => {
  assert.match(result, /const \[experimentReaction, setExperimentReaction\]/);
  assert.doesNotMatch(result, /trackDiag\('experiment_reaction'/);
  assert.match(result, /!committed && !experimentReaction/);
  assert.match(result, /Robiłem coś podobnego i pomagało\./);
  assert.match(result, /Robiłem, ale bez różnicy\./);
  assert.match(result, /Próbowałem, ale nie dało się tego utrzymać\./);
  assert.match(result, /Ten test nie pasuje do mojej sytuacji\./);
});

test('result correction stays evidence-bound instead of inventing a replacement cause', () => {
  for (const banned of [
    /czwartek wieczorem/i,
    /osiemnastą a dwudziestą drugą/i,
    /przesuwa się o godzinę/i,
    /zwykle schodzi jako jeden z ostatnich/i,
  ]) assert.doesNotMatch(result, banned);

  assert.match(result, /odpowiedzi o porankach/);
  assert.match(result, /pracy na pół mocy/);
  assert.match(result, /planowanej liczby treningów/);
  assert.match(result, /różnicy między weekendem a tygodniem/);
});

test('drive calibration keeps the medical boundary', () => {
  assert.match(result, /Quiz nie rozstrzyga przyczyny takiej odpowiedzi/);
  assert.match(result, /omów to z lekarzem/);
});
