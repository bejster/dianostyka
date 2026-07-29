# DIAGNOSTYKA TYGODNIA V2 — STATUS / HANDOFF

**Branch:** `feat/diagnostyka-v2` · **Repo:** `lejek-audit/_dianostyka` · **Ostatni commit:** pass anty-AI + skrócenie + kwalifikacja 2026-07-28 (patrz sekcje niżej)
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

## Pass anty-AI (2026-07-28) — DONE, tsc 0 / testy 13-0 / live 3011
7 niezależnych audytów (świeże oczy, red-team) → przepisane pod „nic nie brzmi jak AI":
- **Silnik LLM (`route.ts`)**: pełna banlista (proces/system/chaos/potencjał + slop PL), hamulec fizjologii (zero zmyślonych %, „wzorzec nie epizod"), anty-asekuracja, krótkie zdania, 2 few-shoty w głosie Michała, guard łapie en-dash + bany.
- **`week-plan.ts`**: klaster McKinsey (rezerwuar/uwalnia zasoby/punkt oporu) przepisany; „systemu egzekucji"×3 + „proces"/komputer analogia → głos Michała; `glowa_zajezdza` zdeduplikowany od `weekend_reset` (inny mechanizm + analogia z życia); evidence RED zmiękczone (nocny pik testosteronu, 60-70%, „ukryta oporność na stres", 48-72h); nazwy kotwic (Jedzenie/Trening/… zamiast Kotwica/Protokół); `deeperNote` kłamstwo „unikalny wzorzec" → uczciwe; grammar „dajesz→daje".
- **`WeekPage.tsx`**: `mirror` (najmocniejszy głos) wpięty w sekcję I; eyebrow „Zapas na stole"; akapit mostu (recap+tricolon+dedup out); „Ode mnie, na koniec".
- **`page.tsx`**: `mirror` przekazany; sticky-push „prowadzenie 1:1" zgaszony; sprzeczność „bez list" naprawiona spójnie (gate/done/teaser: wysyła Michał, bez zapisu na listę).
- **`assessment-config.ts`**: label domeny (system+chaos out); uscenione opcje `stress_level`+`screen_bed`; dubel `veggies`/`protein` rozbity; tytuły-rzeczowniki→pytania (`age`,`tried_before`); „Opcjonalnie:" out.
- **bug**: drabina mostu w HOT miała podwójną numerację (badge 01-04 vs wbite 1-4-2-3) → wbite numery usunięte.

## Skrócenie + kwalifikacja + Telegram (2026-07-28) — DONE, tsc 0 / 13-0 / 200
- **Quiz 29 -> ~16 pytań**: 13 mało-wartościowych wyciętych (`condition: () => false` w `assessment-config.ts`), `SingleQuestionFlow` honoruje teraz `condition` (licznik/pasek liczą po widocznych). Do hard-delete później.
- **2 pytania kwalifikacyjne** (sekcja VIII „Co dalej"): `intent` (sam/zobaczyć/prowadzenie/nie wiem) + `start_when` (timing). Nie wchodzą do score.
- **Silnik kwalifikacji** (`qualify()` w `diagnoza/page.tsx`, port z v1): `budgetProxy` z realnego wydatku (`costs().hardTotal`, bez pytania o kasę) + `commitment` (triedBefore + intent + start) + `priorityLead = ból>=40 && commitment>=3 && budżet>=2`.
- **Telegram ZAWSZE**: nowy `/api/lead-notify` -> `TELEGRAM_LEADS_CHAT_ID` (fallback `TELEGRAM_CHAT_ID`). Odpala się na koniec quizu (handleComplete), bez maila. 🔥 = priorytet 1:1.
- **Routing**: `qualified` (priorityLead || wantsHelp) -> most `hot` (`buildWeekPlan`), sticky + CTA WeekPage pchają współpracę (nabor) jako głośny primary.

## Następne kroki (kolejka dla nowego okna)
1. **TELEGRAM (Michał, 2 min)**: utwórz kanał/grupę „HiT Leady", dodaj bota (ten sam `TELEGRAM_BOT_TOKEN`), weź chat_id, ustaw env `TELEGRAM_LEADS_CHAT_ID`. Bot NIE utworzy kanału sam. Bez tego leady lecą na wspólny `TELEGRAM_CHAT_ID`.
2. **DECYZJA**: copy mówi „bez zapisu na listę", a Faza 4 planuje MailerLite (=lista). Albo email = osobisty one-off, albo zmień copy.
3. **#1 ekran INTRO przed Q1** — start od slidera WIEKU jest zimny. Intro: obietnica Karty + „~4 min" + „wynik bez maila". Największy skok konwersji.
4. **#4 Arc ocieplenia** — pogłębić (cold=eksperyment 14 dni); teraz `qualified` steruje tylko wariantem mostu.
5. **#2 Dowód** — BLOCKER na zdjęciach w `public/proof/`. Scaffold before/after gotowy do zbudowania.
6. Hard-delete 13 wyciętych pytań (teraz `condition:()=>false`). Faza 4 sekrety. Sprzątnąć martwy kod.
