# MERGE DECISIONS · DIAGNOSTYKA FLAGSHIP

Branch `feat/diagnostyka-flagship-20260926`, baza `5c161c8` (PROD, FROZEN). Status: PREVIEW, nie PROD.

Źródła:
- **A** = PROD `5c161c8`: hero „W poniedziałek ogarniasz”, copy, Make CRM + dedupe, pytania, router.
- **B** = Visual Instrument `37d045f`: 11 commitów przeniesionych na A (9 identycznych patchy, 2 dopasowane przy konflikcie; `git cherry -v HEAD 37d045f`).
- **C** = warstwa decyzyjna 3.0 (ta gałąź).
- **D** = brudny worktree `C:/dev/diagnostyka-v264-final-20260907`, HEAD `fdc6255` z 09.09. Poza linią `5c161c8`. Jego nieśledzone testy (`result-v4-payoff`, `mobile-touch-v31`, `conversion-content-signals`) są w `5c161c8` w nowszej wersji pod tymi samymi nazwami. **Wchłonięty, nic do wzięcia.**
- **E** = `0c6d21c` (release/setter-crm-bridge, 10.09). Writer Make z `lead_ref`, porcjowaniem pól i `lead_ref` generowanym w przeglądarce. To samo żyje w A jako `8206f84` (`MAKE_DIAGNOSTYKA_WEBHOOK`, `chunkForNotion`, fallback n8n) plus `page.tsx:105-111`. **Wyparty przez A, nic do wzięcia.**

Zasada rozstrzygania: dowód (test, dane z ruchu, zasada sprzedaży) wygrywa z gustem. Tam, gdzie nie ma jeszcze danych z ruchu, piszę to wprost.

| Element | A (PROD) | B (Instrument) | C / D / E | BIERZEMY | Dlaczego |
|---|---|---|---|---|---|
| Hero | „W poniedziałek ogarniasz. W piątek… »znowu to samo«” | ta sama treść w typografii przyrządu | C: bez zmian treści. D, E: brak | **A treść + B forma** | Hero A jest na PROD i przeszedł release gate `5c161c8`. B zmienia tylko warstwę wizualną. Test `v28-awareness-first` pilnuje treści. |
| Intro / CTA startu | „Pokaż mi, co ruszyć najpierw” | ten sam przycisk w stylu przyrządu | C: kicker drzwi (`?door`, `?topic`) nad hero | **A + B + kicker C** | Drzwi zmieniają tylko kicker i `entry_variant`. Pytania i wynik wspólne, więc porównanie drzwi mierzy wejście, nie inny produkt. Zły `door`/`topic` spada do general (QA). |
| Pytanie `prediction` (nowe) | brak | brak | C: „Obstaw, zanim policzymy: co najbardziej blokuje ten cel?” po `self_energy` | **C** | Obstawienie przed wynikiem daje wynikowi coś do potwierdzenia albo przesunięcia (prediction gap). Bez tego odczyt jest monologiem. Koszt: +1 krok. **Danych o odpadaniu jeszcze nie ma**: patrz event `prediction_locked` vs `experiment_shown`. |
| Pytanie `good_day` (nowe) | brak | brak | C: „Przypomnij sobie najlepszy dzień z ostatnich dwóch tygodni. Co wtedy było inaczej?” po `break_window` | **C** | Kontrast wzmacnia albo osłabia trop (`contrast_evidence`), więc pewność ma podstawę zamiast być dekoracją. Koszt: +1 krok, jak wyżej. |
| Pozostałe pytania (39) | 39 pytań | bez zmian treści | D: starsze wersje | **A** | Zero zmian treści pytań A. Testy A przechodzą bez zmian. |
| Kolejność pytań | A | A | C: wstawia 2 pytania w blok „tydzień” | **A + 2 wstawki C** | `prediction` przed danymi o tygodniu (żeby obstawienie było czyste), `good_day` zaraz po `break_window` (kontrast do złego dnia na świeżo). |
| Pierwszy ekran wyniku | nagłówek poziomu + mapa | wynik w języku przyrządu, SettlingReadout | C: odczyt 7 wierszy `rx-readout` | **B rama + C odczyt (6 wierszy)** | Człowiek w pierwszym kadrze dostaje decyzję: cel, obstawienie, trop, wcześniejsze ogniwo, test z tym, co obserwować, pewność. 3.1: „Obserwuj” wszedł do wiersza testu, więc na 375×667 nazwa testu i akcja stoją nad zgięciem (wiersz testu y=564). Od 1100 px hero dzieli się na tezę i odczyt, dalsze beaty mają szynę kickerów obok kolumny 620. |
| Beat: Obstawiłeś | brak | brak | C | **C** | Linia gap bez powtarzania typu obstawienia (red team). |
| Beat: Najmocniejszy trop | najsłabsza oś | ta sama oś w przyrządzie | C: zostaje jako objaw | **A logika + C etykieta** | Red team: trop i ogniwo to dwie taksonomie. Most w wierszu ogniwa: „Forma to objaw. Tu sprawdzasz, gdzie się zaczyna.” |
| Beat: Wcześniejszy moment | brak | brak | C: `UPSTREAM_OF` | **C** | Rdzeń 168: objaw rzadko jest przyczyną. Wiersz złoty, klucz odczytu. |
| Beat: Test 72h + Obserwuj | bank eksperymentów A | bank A w przyrządzie | C: nazwa + akcja w odczycie | **A bank + C forma** | Bank eksperymentów bez zmian. W odczycie nazwa zdaniem, nie caps lockiem, a „Punkt Pęknięcia” zastępuje „moment, w którym zwykle odpuszczasz”, bo termin pada dopiero w beacie pęknięcia (`plainAction`). 72h zostaje, bo spinają go testy i copy A. 7 dni obsługuje pętla powrotu. |
| Beat: Pewność | brak (score) | brak | C: słowami, 3 kreski | **C** | Bez procentów i bez pseudo-score. Kontrdowód obniża pewność i jest pokazany. |
| Granica medyczna | brak | brak | C: `MEDICAL_BOUNDARY` | **C** | „Hormony” nie dostaje szacunku testosteronu. Usługa krwi zostaje płatna. |
| Dalsze beaty (mapa, dowód, demo prowadzenia) | A | B forma | C: bez zmian | **A + B** | Sprawdzone na PROD. Nie ruszamy. |
| CTA / router | `routeCategory` A → nabor / dane / self-serve | ta sama logika, B styl | C: eventy `*_route` | **A** | Router A nietykalny. C tylko go mierzy. |
| Pętla powrotu | brak | brak | C: `diagnostyka_v3_return`, panel po 3 dniach albo z `?return=1` | **C** | Domyka eksperyment i daje event `return_7d`. Rekord to same kategorie, whitelist dźwigni (red team). |
| Wizual / motion | ciemny layout A | przyrząd 168, skan, SettlingReadout, podziałka | C: stagger wierszy odczytu, reduced motion = brak animacji | **B + stagger C** | Instrument nietknięty. Stagger od 270 do 810 ms, poświata na kluczowym wierszu. |
| Analityka | PostHog | `ui=instrument-1`, PostHog tylko na produkcji | C: 17 eventów 3.0, allowlista w `result-v3-safety` | **B + C** | Payloady to same kategorie. Na preview PostHog nie strzela (QA: zero żądań). |
| Rura leada / Make CRM | `lead-notify` → Make (`8206f84`) + dedupe + fallback n8n | bez zmian | E: wcześniejsza wersja tego samego | **A, NIETYKALNE** | `git diff 5c161c8 HEAD -- app/api` = pusty. Na preview brak env Make/Telegram, więc walk nie wysyła leada. |

## Co świadomie odpada
- D w całości (starsza wersja A).
- E w całości (wyparte przez `8206f84`).
- Wiersz testu na 7 dni. Zostaje 72h, bo tak mówi reszta produktu.
- Osobny wiersz „Obserwuj” (wchłonięty przez wiersz testu).

## constraint i failed_solution (rozstrzygnięte 26.09)
Wpływają na wynik jako modyfikatory istniejących wierszy, bez ósmego wiersza:
- `failed_solution` 3-4 albo 5+ prób: zdanie w wierszu „Wcześniejszy moment” (poprawka w miejscu objawu nie trzyma, więc zaczynamy wcześniej). Nie rusza pewności ani wyboru testu, bo selektor liczy już `restart` (tb_2/tb_3) w zgodności domen. Drugie doliczenie byłoby podwójnym liczeniem tej samej odpowiedzi.
- `constraint` (gaszenie cudzych pożarów, ludzie czekają, własna firma): zdanie w wierszu testu, że robisz tylko ten jeden ruch. Nie zmienia wyboru eksperymentu, bo nie mamy danych, że inny test działa lepiej przy takim kalendarzu. Zmiana selektora wymaga danych z pętli powrotu.
- Oba bez PII, testy w `tests/decision-engine.test.ts` pilnują, że pewność i eksperyment zostają te same.

## Weto: ZAMKNIĘTE
Michał 26.09 oddał rozstrzygnięcie („rozwiąż MERGE_DECISIONS.md”), więc wiersze powyżej obowiązują jako decyzja. Freeze PROD bez zmian. Kolejny krok to release przez broker z SHA potomka `5c161c8`, dopiero po jawnym GO.

## 2026-10-07 · Hero C „Ile dni po weekendzie wracasz do siebie?”

Gałąź `copy/hero-wracasz-do-siebie-20261007` od `202616d`. Świadomie zastępuje hero „W poniedziałek ogarniasz…” (wiersz „Hero” wyżej).

| Element | Było | Jest | Dlaczego |
|---|---|---|---|
| H1 | „W poniedziałek ogarniasz. W piątek… »znowu to samo«” | „Ile dni po weekendzie *wracasz do siebie?*” | Michał: w piątek nikt tak nie myśli, a hero zakładało, że tydzień się sypie. Pytanie daje odbiorcy samemu policzyć koszt, bez etykiety. Komisja copy (6 soczewek): C 7,7 vs B 6,0 vs A 5,3. |
| Podtytuł | lista obszarów + chipy GDZIE TRACISZ / NAJWIĘKSZY ZAPAS / PIERWSZY RUCH 72H | „Zobacz, co w Twoim tygodniu najbardziej ciągnie formę w dół i od czego zacząć w najbliższe 3 dni.” | Chipy były kalką z angielskiego (headroom, next move). Zakres tygodnia trzyma podtytuł, więc intencja testu v28 (awareness, nie audyt weekendu) zostaje. |
| CTA | „Pokaż mi, co ruszyć najpierw” | „Sprawdzam swój tydzień →” | Pierwsza osoba, czasownik, zakres tygodnia. |
| Meta / OG | stare hero | nowe H1 + podtytuł | Spójność wejścia z linku. |

Otwarte defekty z komisji: brak proofu w hero (19/40 tylko niżej), ryzyko „nie o mnie” dla HiT bez problemu z weekendem. Danych z ruchu jeszcze nie ma: porównać CTR startu diagnozy przed/po.

### 2026-10-07 (poprawka tego samego dnia) · H1 bez weekendu

H1 → „Ile dni w tygodniu *jesteś w formie?*”, podtytuł „…co w Twoim tygodniu najbardziej Ci ją zabiera i od czego zacząć w najbliższe 3 dni.”
Dlaczego: H1 jest wspólny dla drzwi general/hit/th2 i tematów (`?topic=sen` dawało „weekend” + „Zaczynamy od tematu: sen”). Weekend pada w wyniku tylko temu, kto tak odpowiedział (`fracture-engine.ts:201`). Mechanizm z komisji zostaje: krótkie pytanie, odbiorca sam liczy, odpowiedź „7” jest możliwa. Podtytuł skrócony, „ciągnie formę w dół” (uwaga komisji: książkowe) wycięte. Test v28 pilnuje, że H1 nie zawiera „weekend”.

## 2026-10-07 — merge hero „Ile dni w tygodniu jesteś w formie?” na prod 0c542d7 (TH2 bio bridge)
- PROD z 16:02 (dpl_y28Gc @ 0c542d7) powstał z linii bez 202616d: wypadły voice fix, a11y aria-pressed, walidacja rekordu powrotu, macierz niezmienników. Ten merge przywraca je razem z nowym hero.
- Konflikt hero: drzwi TH2 (/rozjazd, `?door=th2`) zostają przy własnym H1/CTA z release'u TH2 (zablokowane `tests/th2-bio-bridge.test.ts`). Nowy hero dotyczy drzwi general/hit. Guard „H1 bez weekendu” sprawdza tylko gałąź general.
- `tests/acquisition.test.ts`: test failował już na 0c542d7 (kod przeszedł na `captureAcquisition(effectiveSearch)` dla /rozjazd). Regex zaktualizowany, poza /rozjazd nadal `window.location.search`.
