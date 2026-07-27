# DIAGNOSTYKA TYGODNIA V2 — STATUS

**Branch:** `feat/diagnostyka-v2`
**Ostatnia aktualizacja:** 2026-07-27
**Stack:** Next.js 16 (Turbopack) · React 19 · Netlify · testy: `node --experimental-strip-types --test`

> Źródło prawdy o produkcie: `docs/DIAGNOSTYKA_V2_MASTER_SPEC.md`. Ten plik = bieżący stan techniczny (§22).

## Status faz

| Faza | Zakres | Stan |
|---|---|---|
| 0 | Audit + plan + scoring docs | ✅ done (`108c1b3`, `8a388f8`) |
| 1 | Single-question shell (`SingleQuestionFlow.tsx`), autosave, progress, back | ✅ done (`7f7fdea`) |
| 2 | Config-driven (`assessment-config.ts`) + `scoring-engine.ts` + unit testy | ✅ done + **naprawione** (patrz niżej) |
| 3 | Result teaser + raport online + 4 wizualizacje + CTA po lead-fit | 🔁 PIVOT (D1): flow zostaje, wynik przepięty na istniejący bogaty silnik (Karta+reframe+archetyp) + mapa tygodnia |
| 4 | Email gate + PDF (jeden model danych) + MailerLite | ⛔ blocker: sekrety |
| 5 | Analytics (bez surowych odpowiedzi) + privacy/noindex + performance | ◻️ pending |
| 6 | E2E + screenshoty + preview + deploy/rollback guide | ◻️ pending |

## Zweryfikowane (2026-07-27)

- `npm test` → **13/13 pass** (persona A/B/C + leadFit hot + week-plan).
- `npx tsc --noEmit` → **exit 0**, zero błędów typów.

## Naprawione w tej sesji

- 🔴→✅ Testy `scoring-engine.test.ts` się NIE URUCHAMIAŁY (`ERR_MODULE_NOT_FOUND`). Systemowy bug importów bez rozszerzeń pod `node --strip-types`:
  - `tests/scoring-engine.test.ts` — dodane `.ts` + marker `type` na `RawAnswers`.
  - `app/lib/scoring-engine.ts` — import `./assessment-config.ts` + `type` na `DomainKey`/`ProfileDef`.
  - `tsconfig.json` — `allowImportingTsExtensions: true` (legalizuje `.ts` w importach; `noEmit` już był; typecheck czysty).
- `package.json` — zacommitowane luźne `jose ^6.2.4` (pod secure-token `/w/[token]`), zostawione niezacommitowane przez prior sesję.

## Blokery (wymagają decyzji/sekretów właściciela)

- **Faza 4 — email + MailerLite:** `/api/subscribe` istnieje, ale potrzebny klucz MailerLite + provider maila transakcyjnego (env, nie do repo). Do ustalenia: stub (mock lokalny) vs realne klucze test.
- **RODO / `LEGAL_REVIEW_REQUIRED`:** teksty zgód (raport vs marketing) — implementacja techniczna OK, treść do weryfikacji prawnej.

## Następny krok (Faza 3)

1. Result teaser: wynik główny + profil + główne domino + 1 odkrycie + 1 ruch — WIDOCZNE PRZED mailem.
2. Raport online: personalizacja per profil (nie tylko liczba) + mapa tygodnia (najważniejsza wizualizacja) + 6 domen + łańcuch + 3 ruchy/14 dni + „czego nie robić" + case + CTA po lead-fit.
3. Min. 4 dynamiczne wizualizacje. Po fazie: test + typecheck + browser QA (390×844) + screenshoty + commit.
