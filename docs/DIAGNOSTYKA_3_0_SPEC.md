# DIAGNOSTYKA 3.0 FLAGSHIP · SPEC

Branch `feat/diagnostyka-flagship-20260926`, baza PROD `5c161c8`. Status: PREVIEW. PROD zamrożony na `5c161c8`.
Pięć sekcji w jednym pliku zamiast pięciu dokumentów: jeden właściciel, zero dryfu między nimi.

## 1. LEAD MAGNET PRODUCT
- Obietnica: w 5 minut człowiek widzi, gdzie tydzień mu pęka, jakie ogniwo stoi wcześniej i jeden test do sprawdzenia.
- Silnik: istniejący scoring 5 osi + bank eksperymentów (bez zmian). Warstwa 3.0 (`app/lib/decision-engine.ts`) tylko składa wynik w decyzję. Zero LLM.
- Drzwi: `?door=general|hit|th2` i `?topic=sen|energia|glowa|jedzenie|trening|weekend`. Drzwi zmieniają wyłącznie kicker, linię tematu i etykietę `entry_variant`. Pytania i wynik są wspólne, więc porównanie drzwi mierzy wejście.
- Granica medyczna: brak szacunku testosteronu, brak wyniku hormonalnego, brak diagnozy. Obstawienie „hormony” dostaje linię granicy i przekierowanie na tydzień. Usługa krwi zostaje płatna.

## 2. PSYCHOLOGY SCREEN MAP
| Moment | Ekran | Job |
|---|---|---|
| Desire lock | `primary_goal` | cel w słowach człowieka, wraca w pierwszym wierszu wyniku |
| Prediction lock | `prediction` (nowe) | obstawienie przed wynikiem; wynik je potwierdza albo przesuwa |
| Signal scan | pytania osi (bez zmian) | dane do scoringu |
| Bad day | `break_window`, `give_up_point` | moment pęknięcia, daje „pierwszy sygnał” |
| Good day | `good_day` (nowe) | kontrast: wzmacnia albo osłabia trop |
| Failed solution | `tried_before` | zdejmuje winę z człowieka |
| Constraint | `work_load` | test ma się zmieścić w realiach |
| Reveal | odczyt `rx-readout` | 7 wierszy w pierwszym kadrze |
| Return | panel „Wracasz po teście” | domyka pętlę eksperymentu |

## 3. QUESTION → DECISION MATRIX
| Odpowiedź | Pole decyzji |
|---|---|
| `primary_goal` | `desired_outcome` |
| `prediction` | `prediction.lever` → `prediction_gap` (match / upstream / miss / none / boundary) |
| `good_day` | `contrast_evidence.effect` (support / neutral / counter) → `confidence`, `counterevidence` |
| `break_window` | `early_signal`, fallback dźwigni |
| wybrany eksperyment | `upstream_candidate` (prefiks W/E/G/T/R) |
| `tried_before` | `failed_solution.count` |
| `work_load` | `constraint` |
| route engine | `route` (help / data_needed / self_serve) |

Mapa „co stoi wcześniej” (`UPSTREAM_OF`): sen ← wieczór, głowa, weekend · wieczór ← głowa, sen · trening ← głowa, wieczór, sen · głowa ← sen.

## 4. RESULT ENGINE
- Pewność w słowach, bez procentów: Wyraźny wzorzec / Trop do sprawdzenia / Za mało danych. Punkty: HIGH 2, MEDIUM 1, LOW 0, +1 za kontrast wspierający, −1 za sprzeczny.
- Pierwszy kadr: Chciałeś poprawić · Obstawiłeś · Najmocniejszy trop · Wcześniejszy moment warty sprawdzenia · Test 72h · Obserwuj · Pewność. Pod spodem kontrdowód i granica medyczna, jeśli występują.
- Odchylenie od briefu: wiersz testu to **72h**, nie 7 dni. Test 72h jest spięty w wielu testach i copy wyniku; 7 dni obsługuje pętla powrotu.
- Pętla powrotu: `localStorage['diagnostyka_v3_return']` = `{v, at, upstream, experimentId, prediction}`. Panel pokazuje się po ≥3 dniach albo z `?return=1`. Odpowiedź Pomogło / Częściowo / Nic → hipoteza wzmocniona / nierozstrzygnięta / osłabiona. Rekord jest kasowany po odpowiedzi.

## 5. ANALYTICS
Wszystko przez `trackDiag`, PostHog tylko na produkcji. Payloady to same kategorie: id odpowiedzi, stan i dźwignia. Zero tekstu, zero PII.
`entry_variant`, `desire_selected`, `prediction_locked`, `contrast_completed`, `failed_solution`, `constraint_selected`, `prediction_gap_type`, `confidence_state`, `experiment_shown`, `experiment_accepted`, `help_route` / `data_needed_route` / `self_serve_route`, `return_7d`, `hypothesis_strengthened` / `hypothesis_weakened` / `hypothesis_unresolved`. Allowlista: `tests/result-v3-safety.test.ts`.
Pytania do danych po 2 tygodniach ruchu: rozkład `prediction_gap_type`, czy `miss`/`upstream` podnoszą `experiment_accepted`, ile osób wraca (`return_7d`).
