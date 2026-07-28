# DIAGNOSTYKA TYGODNIA V2 — STATUS / HANDOFF

**Branch:** `feat/diagnostyka-v2` · **Repo:** `lejek-audit/_dianostyka` · **Ostatni commit:** `e30ead8`
**Aktualizacja:** 2026-07-28 · **Stack:** Next 16 (Turbopack), React 19, Netlify. Testy: `node --experimental-strip-types --test tests/*.test.ts`

## Jak wznowić w nowym oknie (przeczytaj to pierwsze)
1. Dev server: `cd _dianostyka && npx next dev -p 3011` → **live V2 na `http://localhost:3011/diagnoza`**.
2. Prod `/` (v1, monolit `app/page.tsx`) **NIETKNIĘTY** poza wspólnymi plikami (patrz niżej). Nie deployujemy.
3. Mocny profil podglądu (pełne dane, do porównania): `http://localhost:3011/?resultPreview=1`.
4. Weryfikacja przed commitem: `npx tsc --noEmit; echo EXIT=$?` (MUSI 0) + `node --experimental-strip-types --test tests/*.test.ts` (13/0).

## Architektura V2 (po pivocie D1 — patrz DIAGNOSTYKA_V2_DECISIONS.md)
Flow: `SingleQuestionFlow` (1 pytanie/ekran, 30 pytań, autosave) → `answersToFD` → **istniejący bogaty silnik** (`diagnostic-core.ts`: score/costs/pickArchetype + `week-plan.ts` buildWeekPlan) → **`WeekPage`** (Karta Tygodnia: krzywa napięcia „TU PĘKA", I-VII) → email gate.
- `app/diagnoza/page.tsx` — orkiestracja flow + reframe LLM fetch.
- `app/components/WeekPage.tsx` — Karta (WSPÓLNA z prod `/`! zmiana copy tu rusza też v1 — OK na branchu).
- `app/lib/week-plan.ts` — cała treść Karty (problem/deeper/hiddenCost/potencjał/plan/invitation/bridge/firstMove). WSPÓLNA z prod.
- `app/lib/diagnostic-core.ts` — wyciągnięty z monolitu silnik (FD/score/costs/pickArchetype/anchorRok/hourRange). WSPÓLNY.
- `app/lib/assessment-config.ts` — 30 pytań (port z żywej `/`). `answers-to-fd.ts` — mapa RawAnswers→FD (30/42 pól, reszta INIT świadomie).
- MARTWY kod (do usunięcia): `ResultTeaser.tsx`, `report-content.ts`, `scoring-engine.ts` (chudy V2, tylko testy + typ RawAnswers używany).

## Cel: 10/10 lead magnet ocieplający ZIMNEGO leada. Status planu:
1. ✅ **Precyzja** — pełne 30 pytań, diagnoza na pełnym FD (commit `a4df295`).
2. ⏳ **Dowód** — BLOCKER: potrzebne realne zdjęcia klientów. Michał wrzuca do `public/proof/` (`case1-before.jpg`+`case1-after.jpg`...). Mam już `public/michal-portrait.jpg`. NIE zmyślać testimoniali.
3. ✅ **Jeden win na jutro** — box „Zacznij tu, jutro rano" w Karcie VI (commit `7dff7cf`).
4. ◻️ **Arc ocieplenia** — cold dostaje lżejszy krok (eksperyment 14 dni) zamiast pushu na 1:1; hot → 1:1. Logika hot/cold jest w `buildBridge`/`invitationLine` (próg potentialPct<=45), ale płytka — do pogłębienia.

## Copy — stan (perswazja + komisja-copy przeszły money-lines)
Most/oferta = **frame kwalifikacji, nie obietnicy** (Michał: „nie wiem czy mogę pomóc, bardzo bym chciał, zobacz jak pomagam innym, napiszę czy widzę potencjał"). Ból/koszt czekania/wstyd/loss-framing na wejściu, takeaway na końcu. Reframe z własnych słów usera (LLM `/api/diagnoza`) wpięty — patrz blocker klucza niżej.

## Blokery / gotchas
- **Reframe LLM** działa tylko z kluczem OpenRouter w env (dev). Bez klucza → fallback deterministyczny (Karta stoi). Klucz = sekret Fazy 4, wymaga OK Michała.
- **~30 pytań 1/ekran = długo** dla zimnego leada. Kandydat na branching (warunkowe pytania, cel 16-20). `SingleQuestionFlow` NIE honoruje pola `condition` (pokazuje zawsze) — do zrobienia jeśli branching.
- **Dług `gym_miss`**: `calculateScoring` (chudy silnik) czyta legacy `gym_miss` którego flow nie zbiera → w bramce e-mail może częściej pokazywać Profil D. NIE dotyka głównej Karty (ta liczy z pełnego FD). Nisko-priorytet.
- **Nie da się wyciągnąć zdjęć z czatu na dysk** — Michał musi wrzucić pliki do repo.
- **Background subagenci giną na granicy sesji** — używaj `run_in_background: false` (synchronicznie) na długie zadania.
- Śmieci untracked w repo (`Sam`, `Sen`, `(dla`, `.sim-*`, mojibake) — NIE commitować, można usunąć.
- Reguły języka Michała utwardzone tu: zero em-dash/en-dash, zero `, i` (przecinek przed „i"), zero banów (proces/system/chaos/potencjał-frazes/transformacja/realnie...). Suwak odmienia `lat`→rok/lata/lat.

## Następne kroki (kolejka dla nowego okna)
1. **Niezależny audyt konwersji** (content-critic / red-team, świeże oczy) — czy realnie ociepla zimnego leada.
2. **#2 Dowód** — gdy będą zdjęcia w `public/proof/`, zbuduj sekcję before/after w WeekPage (styl brand, Instrument Serif).
3. **#4 Arc ocieplenia** — pogłębić rozdział cold vs hot (cold: eksperyment 14 dni; hot: 1:1).
4. **Branching pytań** — skrócić do 16-20 (honorować `condition` w SingleQuestionFlow).
5. Faza 4 (sekrety, OK Michała): MailerLite `/api/subscribe`, mail transakcyjny, klucz OpenRouter.
6. Sprzątnąć martwy kod + śmieci.
