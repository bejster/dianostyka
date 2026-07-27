# DIAGNOSTYKA V2 — DECYZJE I ZAŁOŻENIA

## D1 (2026-07-27) — PIVOT: V2 = czysty flow + ISTNIEJĄCY bogaty silnik, nie osobny chudy system

**Kontekst:** Prior sesja zbudowała osobny, cieńszy V2 (`scoring-engine.ts` + `ResultTeaser`) i wpięła go na `/diagnoza`. Test właściciela (Michał): **to nie jest ulepszenie względem żywej produkcji** `diagnostyka.talerzihantle.com`.

**Diagnoza dlaczego:** Wartość obecnej strony = bogaty, spersonalizowany WYNIK: `pickArchetype` (5 archetypów + „mirror" text), **reframe generowany z WŁASNYCH SŁÓW usera** (`/api/diagnoza` → LLM), Karta Tygodnia (`WeekPage`), realny koszt (`anchorRok`), `score(D)` ważony z 8 obszarów. Nowy V2 to zgubił — dał sztywny profil A-F + 6 pasków. Sztywny profil < personalizacja z tego co user sam napisał = regres.

**Decyzja:** Jedyny realny zysk nowego to flow 1-pytanie/ekran (`SingleQuestionFlow`). Zostawiamy go. Reszta V2 stoi na ISTNIEJĄCYM silniku, nie na chudym.

**Kierunek (potwierdzony przez właściciela):**
1. Wyciągnąć mózg (`FD`, `INIT`, `score`, `costs`, catScores, `pickArchetype`, `anchorRok`, `hourRange`, `tagScoreWeighted`) z `app/page.tsx` do libu (np. `app/lib/diagnostic-core.ts`) — bez zmiany zachowania, prod `/` dalej działa (weryfikacja: typecheck + curl `/`).
2. Config-driven bogaty zestaw pytań produkujący `FD`, renderowany 1/ekran.
3. `/diagnoza`: flow → `score`+archetyp+reframe → Karta (`WeekPage`) + NOWA mapa pęknięcia tygodnia; wynik przed mailem.

**Konsekwencje:**
- `app/lib/scoring-engine.ts` + `ResultTeaser.tsx` (chudy V2) → do kosza albo fallback offline. Ich testy zostają jako sanity, dopóki nie usunięte.
- Prod `/` nietknięty do pełnego QA i świadomego cutoveru.
- Scoring jest wytuningowany — ekstrakcja behawioralnie identyczna, żaden regres wyniku.

## Blokery
- **Faza 4 (email/PDF):** sekrety MailerLite + mail transakcyjny (env). Stub do czasu decyzji.
- **RODO:** teksty zgód = `LEGAL_REVIEW_REQUIRED`.
