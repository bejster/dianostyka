# Talerzownik — Lead Asset Entry / Handoff

## Cel
Po odzyskaniu Talerzownika nie wracamy do analizy od zera.
Masz wejść w aktualny canonical release, odpalić jedną bramkę jakości i dopiero potem robić cutover.

Canonical branch:
`release/th2-bio-bridge-v2-20261003`

Główne assety:
- `docs/TH2_BIO_TO_DIAGNOSTYKA_RUNBOOK.md`
- `docs/LEAD_DECISION_ENGINE.md`
- `scripts/talerzownik-lead-asset-preflight.ps1`

## 1. Pierwsze 2 minuty po wejściu

W repo Diagnostyki:

```powershell
git fetch origin
git switch release/th2-bio-bridge-v2-20261003
git pull --ff-only
powershell -ExecutionPolicy Bypass -File scripts/talerzownik-lead-asset-preflight.ps1
```

Nie cherry-pickuj starego `feat/telegram-lead-decision-v2-20261001`.
Nie wracaj do `release/th2-bio-bridge-20261003`.
Canonical ma już zawierać TH2 bridge + source attribution + Lead Decision Engine.

## 2. Co preflight ma potwierdzić

Musi przejść:
- branch = canonical,
- HEAD = origin/canonical,
- brak tracked local changes,
- `npm ci`,
- `npm run test:lead`,
- `npm test`,
- `npx tsc --noEmit`,
- targeted ESLint dla lead/TH2 surfaces,
- `npx next build`.

Jeśli cokolwiek FAIL:
NIE deployuj produkcji.
Najpierw poprawiasz konkretny gate.

## 3. Co ma być zachowane po deployu

### General / HiT
Zwykłe wejście nadal działa bez TH2 framingu.

### TH2
Canonical URL:
`https://diagnostyka.talerzihantle.com/?door=th2&src=organic&campaign=th2_bio_v1`

TH2 zmienia framing + attribution.
Nie zmienia scoringu.

### Telegram
Pierwszy ekran wiadomości ma być decision-first:
- decyzja,
- osoba,
- źródło,
- KANDYDAT,
- FIT,
- INTENT,
- URGENCY,
- FINANSE,
- PROBLEM,
- PUNKT PĘKNIĘCIA,
- BLOCKER,
- NEXT MOVE,
- jedna wiadomość DM NOW.

Nie może wrócić stary blok:
`ZAGRYWKA DM / POGŁĘB / DRUGIE DNO / MOST`.

## 4. Production cutover — kolejność atomowa

Nie zmieniaj kolejności.

1. APP PROD — deploy canonical release.
2. Smoke general + HiT + TH2 na production domain.
3. MAKE — dopiero wtedy mapping acquisition channel/detail.
4. Synthetic E2E przez production:
   - Record Type=TEST
   - Exclude from KPI=true
   - Do Not Contact=true
   - Telegram=false dla qa_synthetic.
5. Sprawdź Notion/CRM:
   - TH2 → HiT
   - Acquisition Detail
   - Conversion Surface = Diagnostyka 168.
6. Dopiero potem bio/link Instagram.
7. Pierwszy realny lead: ręcznie sprawdź cały łańcuch.

Jeśli krok 1–4 fail:
nie zmieniaj bio.
Legacy CRM mapping zostaje bezpiecznym fallbackiem.

## 5. Smoke po produkcji

Sprawdź HTTP 200:
- `https://diagnostyka.talerzihantle.com/diagnoza`
- `https://diagnostyka.talerzihantle.com/?door=th2&src=organic&campaign=th2_bio_v1`

Sprawdź funkcjonalnie:
- TH2 hero,
- ten sam SingleQuestionFlow,
- zwykłe wejście bez TH2 copy,
- nabor URL zachowuje `door=th2`,
- Telegram pokazuje źródło + decision lane.

## 6. Rollback

Przed cutover zapisz aktualny production deployment URL / ID.

Jeśli po deployu app smoke fail:
- przywróć poprzedni production deployment / alias,
- nie aktywuj Make mappingu,
- nie zmieniaj bio.

Jeśli app działa, ale CRM E2E fail:
- app może zostać,
- Make wraca do legacy acquisition mappingu,
- bio nadal bez zmiany.

Jeśli bio już zmienione i potem wykryjesz problem:
- przywróć poprzedni link bio,
- cofnij Make mapping,
- przywróć poprzedni app deployment jeśli problem leży w app.

## 7. Definition of Done

Projekt jest CLOSED dopiero gdy:
- canonical branch zielony,
- production app = canonical release,
- general/HiT smoke PASS,
- TH2 smoke PASS,
- CRM synthetic E2E PASS,
- Telegram decision-first PASS,
- bio wskazuje canonical TH2 URL,
- pierwszy realny lead lub pełny synthetic chain potwierdza każdy hop.

Preview ≠ DONE.
Merge ≠ DONE.
Build ≠ DONE.

## 8. Po CLOSED — jedyna sensowna następna faza

Revenue Learning Loop:
`lane → reply → qualified → offer → paid → LTV/retencja`

Najpierw dane.
Dopiero potem zmiana routingu.
