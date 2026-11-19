// Eksport CSV wszystkich odpowiedzi z Mapy 168 z kanonicznego CRM (Notion "Leady").
//
// Z Notion API (token integracji z dostępem do bazy Leady, tylko do odczytu):
//   NOTION_TOKEN=... node --experimental-strip-types scripts/export-168-csv.ts --out mapa168.csv
// Offline, z zapisanego wyniku zapytania (tablica stron albo {results:[...]}):
//   node --experimental-strip-types scripts/export-168-csv.ts --from-json strony.json --out mapa168.csv
// Flagi: --include-test (dołącz rekordy TEST / wykluczone z KPI), --sep , (domyślnie ;), --since 2026-11-16
//
// Plik zawiera dane osobowe (IG, własne słowa). Nie commituj go i nie wrzucaj publicznie.
import { readFileSync, writeFileSync } from 'node:fs';
import { rowFromNotionPage, toCsv168 } from '../app/lib/export-168.ts';

const DATA_SOURCE_ID = 'ca076967-009c-4648-81f8-581a0fb31205'; // Leady, ten sam co scenariusz Make 9778887
const NOTION_VERSION = '2025-09-03';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function fetchAll(token: string, since?: string): Promise<Record<string, unknown>[]> {
  const pages: Record<string, unknown>[] = [];
  let cursor: string | undefined;
  const and: unknown[] = [{ property: 'Conversion Surface', select: { equals: 'Diagnostyka 168' } }];
  if (since) and.push({ property: 'Diagnostyka Sync At', date: { on_or_after: since } });
  do {
    const res = await fetch(`https://api.notion.com/v1/data_sources/${DATA_SOURCE_ID}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filter: { and }, page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) }),
    });
    if (!res.ok) throw new Error(`Notion ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const json = await res.json() as { results: Record<string, unknown>[]; has_more: boolean; next_cursor: string | null };
    pages.push(...json.results);
    cursor = json.has_more && json.next_cursor ? json.next_cursor : undefined;
  } while (cursor);
  return pages;
}

async function main() {
  const out = arg('--out') ?? 'mapa168-odpowiedzi.csv';
  const fromJson = arg('--from-json');
  let pages: Record<string, unknown>[];
  if (fromJson) {
    const parsed = JSON.parse(readFileSync(fromJson, 'utf8'));
    pages = Array.isArray(parsed) ? parsed : parsed.results ?? [];
  } else {
    const token = (process.env.NOTION_TOKEN || '').trim();
    if (!token) {
      console.error('Brak NOTION_TOKEN. Ustaw token integracji z dostępem do bazy Leady albo użyj --from-json.');
      process.exit(2);
    }
    pages = await fetchAll(token, arg('--since'));
  }
  const rows = pages.map(rowFromNotionPage);
  const { csv, count, priority, brokenJson } = toCsv168(rows, {
    includeTest: process.argv.includes('--include-test'),
    sep: arg('--sep') ?? ';',
  });
  writeFileSync(out, csv, 'utf8');
  console.log(`OK ${out}: ${count} odpowiedzi (z ${pages.length} rekordów), ${priority} z PRIORYTETEM ODPISU, ${brokenJson} z uciętym/pustym JSON.`);
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
