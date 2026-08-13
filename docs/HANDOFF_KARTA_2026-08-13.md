# HANDOFF — Diagnostyka „Karta Tygodnia" (kontynuacja w nowym oknie)

> Cel: fresh sesja czyta TEN plik i kontynuuje edycję Karty bez utraty kontekstu.
> Data: 2026-08-13. Repo: `lejek-audit/_dianostyka` (NIE MBO). Branch: `feat/diagnostyka-v2`.
> Live: **https://diagnostyka.talerzihantle.com/diagnoza** (build `4h1plwovi`, HEAD `4317031`).

---

## 0. START DLA NOWEJ SESJI (przeczytaj to pierwsze)
1. Ten plik = pełny stan.
2. Deploy działa tak (patrz §2) — nie zgaduj, diaza NIE auto-aliasuje domeny.
3. Klucz LLM `OPENROUTER_API_KEY` JEST w prod (Vercel env, projekt `dianostyka`).
4. `git push` blokuje **403** („denied to bejster", token wygasł) — commity siedzą LOKALNIE, kod jest LIVE przez vercel. Fix = `gh auth login` interaktywnie, potem `git push origin feat/diagnostyka-v2`.

---

## 1. CO TO JEST
Lead magnet-quiz na IG. Flow: loader → intro → ~22 pytania 1/ekran (single/slider/multi + **3 wymagane eseje** user_pain/user_trigger/user_selfdx + kontakt IG) → **Karta Tygodnia** (prywatny wynik) → DM do Michała (ig.me) / nabor.talerzihantle.com. Lead leci na Telegram (kanał „HiT Leady") w momencie ukończenia (`handleComplete`), z gotowym openerem + **1-tap deep link do DM**. Sprzedaż wyłącznie IG DM. Nisza = faceci, którzy żyją (weekendy/wino/wypady), rekompozycja BEZ rzucania życia.

Marka: HiT (Hantle i Talerz) — lifestyle-czysto, ZERO używek w treści (używki = TH2).

## 2. DEPLOY (sprawdzony flow, nie improwizuj)
```bash
cd "/c/Users/micha/Dropbox/Claude Code/lejek-audit/_dianostyka"
npx tsc --noEmit                      # BRAMKA (musi być czysto)
npx vercel --prod --yes               # builduje na Vercelu, zwraca dianostyka-XXXX.vercel.app
# diaza NIE aliasuje domeny sama -> ZAWSZE:
npx vercel alias set dianostyka-XXXX-michals-projects-20fc032f.vercel.app diagnostyka.talerzihantle.com
```
- Test API bez przechodzenia quizu: `POST /api/diagnoza` body `{brief,pain,trigger,selfDx,worstCat,segment,age,triedBefore}` → `{ok:true, reframe:{8 pól}}`.
- **Screenshot Karty** (przechodzi quiz automatem): `C:\pwshot\shot.cjs` (playwright-core 1.49 zainstalowany tam, POZA Dropboxem). Uruchom: `cd /c/pwshot && PW_EXE="/c/Users/micha/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe" TARGET="https://<deploy>/diagnoza" node shot.cjs`. GOTCHA: shoty późno w sekwencji gubią plik (bufor stdout w tle) — dawaj ważny shot jako pierwszy; fullPage jest flaky, pomijaj.

## 3. PLIKI (rola)
- `app/diagnoza/page.tsx` — orkiestracja flow; liczy **Mapa statusu (statuses, 5 osi)**; wysyła brief do LLM (fire-and-forget); `qualify()`; `buildWeekPlan` + render WeekPage. Handoff do naboru w URL (`?from=diagnoza&arch&score&worst&q&kwota&ig`).
- `app/components/SingleQuestionFlow.tsx` — quiz 1/ekran, autosave/resume, anty-bełkot (`isGibberish`/`enoughContent`).
- `app/lib/assessment-config.ts` — pytania. **3 eseje wymagane** (user_pain/user_trigger/user_selfdx). Wycięte pytania mają `condition:()=>false`.
- `app/lib/lead-brief.ts` — `buildLeadBrief()`: pełny brief ze WSZYSTKICH odpowiedzi (id→etykieta) do LLM.
- `app/api/diagnoza/route.ts` — LLM reframe (DeepSeek/OpenRouter, temp 0.6, 3 próby). Zwraca 8 pól: cytat, falszywe_zalozenie, mechanizm, kolejnosc, pulapka, slaby_punkt, zaproszenie, most_intro. **Guardy** (retry): slop-bany, cyrylica/CJK, em-dash, slogan binarny (slogA/B/C), `deShout` (wersaliki „U CIEBIE"), `asciiSlip` (per-pole diakrytyki <1/40), grounding triggera (zakaz zmyślania), oś niszy.
- `app/lib/week-plan.ts` — deterministyczny silnik Karty (fallback + struktura). Kluczowe: `VALUE_BY_ARCHETYPE` (sekcja wartości), `DEEPER` (mechanizm), `hiddenCost` (koszt), `invitationLine`/`bridgeIntroLine`/`buildBridge` (most), `WEAK_SPOT`, `WEEK_BY_ARCHETYPE` (krzywa). `firstMove` = OBIEKT `{widze,ruch,efekt}`.
- `app/components/WeekPage.tsx` — render Karty. Kolejność sekcji: I Rozpoznanie → II Twój tydzień (krzywa TU PĘKA) → ◆ Mapa statusu (agregat % + 5 słupków) → III Drugie dno (mechanizm) → IV Ukryty koszt → **V Zacznij tu (blok WARTOŚCI: widzę/7 dni/efekt)** → ★ case (nisza) → pas niszy → VI Most (zaproszenie + most_intro + drabina 2 + słaby punkt + 1 złoty przycisk DM + link nabor + Save PDF).
- `app/lib/cases.ts` — case study (teraz UCZCIWY „typowy przebieg", bez fejkowego nazwiska). Pusty = sekcja znika.
- `app/lib/proof.ts` — before/after zdjęcia (PUSTE, blocker: Michał wrzuca do `public/proof/`).
- `app/api/lead-notify/route.ts` — Telegram lead-notify + **inline button „Odpisz na DM (opener gotowy)"** = `ig.me/m/<handle>?text=<opener>` (1-tap outbound).
- `app/lib/scoring-engine.ts`, `diagnostic-core.ts`, `answers-to-fd.ts` — score/costs/archetyp/FD.
- `app/layout.tsx` — loader sesyjny + PostHog (`phc_yCJgz7...`, EU) + Meta Pixel.

## 4. CO ZROBIONE W TEJ SESJI (chronologicznie, wszystko LIVE)
1. **Personalizacja z realnych odpowiedzi** — LLM dostaje CAŁY brief (był 1 zdanie); +2 wymagane eseje (trigger+selfdx); 8 pól wyjścia; pisze też sekcję VII (most).
2. **Przebudowa VII (most)** po 2 bramkach: trigger otwiera domknięcie, jeden ruch=DM (złoty primary), off-rampy out, korpo out, metafora spójna.
3. **Ogonki bulletproof** — guard per-pole + 3 próby (ASCII input → pełna polszczyzna).
4. **Grounding** — zakaz zmyślania szczegółów triggera (ogólny zostaje ogólny).
5. **Oś niszy** wpięta (pas + LLM „bez rzucania życia") + case study.
6. **Telegram 1-tap outbound** (COUNCIL #7 z upgrade-council).
7. **Mapa statusu** — 5 osi 0-100 z realnych odpowiedzi (severity→pasmo 24-90, uczciwe labele „Napęd i libido"/„Forma").
8. **5-council red-team** (śr. 6.5/10) → converged fixy: zabity dubel Mapa+Zapas, IV Koszt (liczba), głos (kotwice/„Błędne założenie"/fallback zmiękczony), banner ball-in-court, Marek uczciwy, obietnice-gwarancje zmiękczone.
9. **CENTRUM — sekcja WARTOŚCI (V „Zacznij tu")**: zaawansowany mechanizm + ruch 7 dni + efekt/most, per archetyp (tryptofan+węgle, glicyna/magnez, social jetlag, glukoza/grelina, światło+oddech). Evidence-defensible, HiT-czysto.

## 5. 5-COUNCIL VERDICT (baza do re-score)
Śr **6.5/10**: konwersja/nabór 7, wiarygodność 6.5, głos 6.5, antygeneryczność 6, UX 6.5.
CHWALONE (nie ruszać): III Drugie dno, krzywa TU PĘKA, głos operatora (nisza/zaproszenie/case), guardy anti-slop, brak urgency, „nie każdego biorę/odpiszę ja nie zespół", render deterministyczny + lead-notify na completion.

## 6. TIER 2 — DEFERRED (następne ruchy, NIE zrobione)
1. **Async reveal** — personalizacja wchodzi w III zanim LLM dojdzie (do 90s, 3 próby) → cynik widzi wersję generyczną. Fix: III zostaje deterministyczne, CAŁĄ personalizację przenieść do dołu (VI Most, gdzie LLM zdąży) + shimmer „dopisuję pod Twoje słowa" + timeout 8-10s. [`page.tsx` routing reframe, `WeekPage`]
2. **Blok „co dalej + że to płatne + nie ścigam"** nad przyciskiem DM (cynik nie klika w niezdefiniowane). [`WeekPage` VI, nad przyciskiem]
3. **Sticky header** — link „zobacz jak wygląda współpraca" wisi na górze przedwcześnie; zdjąć/opóźnić do VI. [`page.tsx` sticky bar]
4. **3 eseje → 1** — UX mówi „zwiń do 1 (user_pain), przesuń wyżej, reszta opcjonalna", ALE Michał świadomie chciał „wszystkie wymagane + max danych". **DECYZJA MICHAŁA**, nie ruszać bez słowa.
5. Drobne: `break_window` 7→5 opcji; `isGibberish` próg na 5+ (false-positive na „wkurwiaaa"); IG-gate miękkie wyjście (balk = strata lead-notify); dead code (`plan` 6 kotwic, `metric`, `potential.body/punch` — liczone, nierenderowane).

## 7. OTWARTE / AKCJE MICHAŁA
- **Push GitHub**: `gh auth login` → `git push origin feat/diagnostyka-v2` (commity lokalnie, kod live).
- **Case study realny**: dać zweryfikowanego podopiecznego (inicjał + realne liczby + zgoda, najlepiej ze zdjęciem do `proof.ts`) → wraca imię i mocna precyzja w `cases.ts`. Teraz jest uczciwy „typowy przebieg".
- **PostHog funnel** (eu.posthog.com): zbudować z `diag_step_viewed{pos,total}` → gdzie odpadają (podejrzenie: 3 eseje). To rekomendacja „najpierw zmierz" (#21 z upgrade-council).
- **Marek/PROOF blocker**: zdjęcia before/after do `public/proof/` → sekcja „Efekt u innych" zapala się sama.

## 8. STORY 7 (kontekst z tej sesji, do produkcji contentu)
Michał chce Story-CTA „Napisz DIAGNOZA → ManyChat → diagnostyka.talerzihantle.com", obiecujące „mapę: forma, sen, hormony". Karta TO DOWOZI (Mapa statusu). Follow-up DM po diagnozie: „Widzę co wypełniłeś. Ile już tak stoisz? Co próbowałeś?".
