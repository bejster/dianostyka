# DIAGNOSTYKA — PEŁNY EXPORT COPY (pierwsza strona + pytania + strona wyniku)

Źródło: `app/diagnoza/page.tsx` (intro), `app/lib/assessment-config.ts` (pytania, ASSESSMENT_VERSION 2.4.0), `app/components/ResultExperience.tsx` + `app/lib/result-content.ts` (strona wyniku). Stan żywy na diagnostyka.talerzihantle.com/diagnoza.
Kolejność = kolejność renderowania (1 pytanie na ekran, `SingleQuestionFlow`). Wycięte pytania (`condition:()=>false`) nie renderują się.

Cały funnel tekstowy: **PIERWSZA STRONA (intro) → 21 PYTAŃ → STRONA WYNIKU (thank-you: 7 beatów + hand-raiser + zaproszenie do prowadzenia)**.

---

## DELTA v2.9 — LUSTRO (świadomość skali)

Ten export opisuje stan sprzed v2.9. Numeracja poniżej jest snapshotem, nie kanonem. Kanon pytań to zawsze `app/lib/assessment-config.ts`. Zmiany v2.9, żeby człowiek przekonany, że u niego wszystko gra, zobaczył własną różnicę:

- **DODANE `self_energy`** (zaraz po `primary_goal`, sekcja I) — slider 1-10, „W skali 1-10, ile masz dziś energii?". Musi stać przed każdym pytaniem o zachowanie, inaczej człowiek poda liczbę już skalibrowaną i cała różnica znika.
- **DODANE `self_drive`** (sekcja VI, po `symptoms_chips`) — slider 1-10, napęd oraz libido. Zero tezy hormonalnej, jedyne zdanie, jakie może wygenerować, zaprasza do lekarza. Poza `contentSignals`.
- **DODANE `stagnation_12m`** (sekcja VII, przed `tried_before`) — single, cztery opcje `st12_*`, ostatnie 12 miesięcy formy.
- **WYCIĘTE `user_trigger`** — drugie pole wolnego tekstu z rzędu, najdroższy ekran flow. `user_pain` zostaje i pokrywa VOC.

Wszystkie trzy nowe pytania mają `value: 0` oraz `upstreamWeight`/`crossDomainImpact` na zerze. Severity, archetyp i trasa sprzedażowa zostają nietknięte. Liczą się wyłącznie w `app/lib/awareness-gap.ts`, który renderuje sekcję Lustro między hero a Mapą 168.

---

## AUDIT BRIEF (dla ChatGPT)

Cel diagnostyki, w kolejności ważności:
1. **Zbieranie danych** — im więcej osób DOKOŃCZY, tym lepiej rozumiemy, gdzie ludzie się sypią i czego chcą. Completion > długość.
2. **Otwieranie człowieka** — „kurwa dokładnie ja", samoświadomość.
3. **Uczciwa kwalifikacja do prowadzenia 1:1** — bez pchania każdego na najdroższą opcję.

Zadanie audytu: **czy kolejność pytań jest optymalna** pod completion + jakość danych + naturalny łuk (łatwe wejście → głębia → esej → kwalifikacja → kontakt). Gdzie ludzie mogą odpadać? Co przesunąć, połączyć, wyciąć?

### TWARDE OGRANICZENIA (nie łamać)
- **ID i `value` opcji scoringowych MUSZĄ zostać 1:1** dla: `sleep_quality` (sq_*), `break_window` (bw_*), `stress_level` (st_*), `evening_eating` (ee_*), `weekend_pattern` (wp_*), `alcohol_intake` (alc_*). Można zmienić kolejność pytań i tekst, NIE id/value tych opcji (silnik scoringu na nich stoi).
- Pytanie kontaktowe (`instagram`) = brama przed wynikiem, musi zostać na końcu.
- 6 pytań jest już wyciętych świadomie (lista na dole) — nie przywracać bez powodu.

### ROLE PYTAŃ
- **SCORED** — wchodzi do wyniku (severity 0-100).
- **DANE** — zbierane, `value 0`, nie liczone do wyniku (cel/gdzie-sypie).
- **KWALIFIKACJA** — gotowość/fit, nie liczone do wyniku.
- **KONTAKT** — brama.

---

## PIERWSZA STRONA (intro · `page.tsx` phase=intro)

Kolejność elementów na ekranie (góra → dół):

0. **Loader (raz na sesję):** wordmark „TALERZ**I**HANTLE" (złote I, błysk) → złota kreska → lift-out ~1.25 s.
1. **Instrument (WeekPulse):** krzywa tygodnia PON–NDZ z czerwonym „?" na piątku. Podpis (wielkie litery): **twój tydzień gdzieś tu pęka**
2. **Eyebrow:** METODA 168 · WYNIK WIDZĘ TYLKO JA
3. **Nagłówek (H1):** Jeden dzień w tygodniu kasuje Ci pozostałe sześć.
4. **Sub:** Formę robisz przez cały tydzień, wszystkie 168 godzin, nie tylko na tych trzech treningach. Robisz swoje, pilnujesz się, a i tak stoi, bo jeden dzień, którego byś nie obstawił, ciągnie w dół całą resztę. Odpowiedz na kilka pytań, a pokażę Ci który to i co z nim zrobić od jutra.
5. **Pasek autorytetu (3 statystyki):** 9 lat / w robocie · 1200+ / diagnostyk · 200+ / transformacji
6. **Przycisk:** Pokaż mi ten dzień →
7. **Microline (pod przyciskiem):** Realne przypadki, które prowadziłem osobiście. Wynik widzę tylko ja.

---

## ŻYWA KOLEJNOŚĆ (21 pytań)

### 1. `primary_goal` — DANE
- Sekcja: I · Po co tu jesteś
- Typ: single (value 0, nie scored)
- Tytuł: **Po co tu jesteś, szczerze?**
- Podtytuł: Zaznacz to, na czym najbardziej Ci zależy. Reszta się z tego ułoży.
- Opcje: Forma i wygląd, chcę wreszcie widzieć różnicę · Moc na cały dzień, bez zjazdów · Sen i regeneracja, budzić się wyspanym · Spokój w głowie, mniej napięcia · Napęd i libido, wrócić do siebie · Coś innego

### 2. `sleep_quality` — SCORED (waga 0.80/0.85)
- Sekcja: II · Sen
- Typ: single
- Tytuł: **Jak często budzisz się wyspany?**
- Podtytuł: Chodzi o to, czy rano masz siłę.
- Opcje (value): Prawie codziennie z energią (0) · 3-4 razy w tygodniu (30) · 1-2 razy, resztę zmęczony (70) · Prawie nigdy, rano rozbity (100)

### 3. `break_window` — SCORED (0.75/0.75)
- Sekcja: II · Sen
- Typ: single
- Tytuł: **O której godzinie dzień zaczyna Ci się psuć?**
- Podtytuł: Ten pierwszy moment, po którym reszta dnia leci w dół.
- Opcje (value): Od rana (60) · Przed obiadem (50) · Po 14 (75) · Po pracy (80) · Wieczorem (90) · Dopiero weekend (85) · Nie ma jednej godziny (70)

### 4. `stress_level` — SCORED (0.70/0.75)
- Sekcja: III · Głowa
- Typ: single
- Tytuł: **Leżysz już w łóżku, a głowa dalej w robocie?**
- Podtytuł: Ile z ostatnich 7 wieczorów tak wyglądało.
- Opcje (value): Prawie nigdy (0) · Czasem 2-3 (40) · Często 4-5 (80) · Codziennie (100)

### 5. `half_power_hours` — SCORED (0.65/0.65)
- Sekcja: III · Głowa
- Typ: slider (0-4 h, krok 0.5)
- Tytuł: **Ile godzin dziennie lecisz na pół mocy?**
- Podtytuł: Niby coś robisz, ale wiesz, że Cię tam nie ma. Policz te godziny.

### 6. `evening_eating` — SCORED (0.85/0.75)
- Sekcja: IV · Jedzenie
- Typ: single
- Tytuł: **Co się dzieje z jedzeniem po 18:00?**
- Podtytuł: Wieczorem najłatwiej odpuścić. Jak to u Ciebie wygląda?
- Opcje (value): Jem to co zaplanowałem (0) · Jedna przekąska poza planem (45) · 1-2 razy dużo więcej (70) · 3 wieczory bez kontroli (90) · Każdy wieczór inaczej (100)

### 7. `takeout_cost` — SCORED (0.50/0.40) · proxy budżetu
- Sekcja: IV · Jedzenie
- Typ: slider (0-1000 zł, krok 50)
- Tytuł: **Ile miesięcznie wydajesz na dowozy i jedzenie na mieście?**
- Podtytuł: Glovo, kebab, gotowce z Żabki. Podaj kwotę na oko, nikt tego nie sprawdza.

### 8. `planned_trainings` — SCORED (0.70/0.65)
- Sekcja: V · Trening
- Typ: slider (0-7)
- Tytuł: **Ile razy w tygodniu planujesz trening?**
- Podtytuł: Zero to też odpowiedź. Nie musisz trenować, żeby zrobić ten test.

### 9. `missed_trainings` — SCORED (0.70/0.65) · WARUNKOWE (tylko gdy planned ≥ 1)
- Sekcja: V · Trening
- Typ: slider (0-7)
- Tytuł: **Ile z nich zwykle wypada, gdy tydzień się psuje?**
- Podtytuł: Przez zmęczenie, brak czasu albo rozwalony tydzień.

### 10. `weekend_pattern` — SCORED (0.85/0.85)
- Sekcja: VI · Weekend
- Typ: single
- Tytuł: **Jak często weekend psuje Ci sen, jedzenie albo ruch?**
- Opcje (value): Prawie nigdy (0) · Raz na miesiąc (35) · 2-3 weekendy (75) · Prawie każdy (100)

### 11. `alcohol_intake` — SCORED (0.80/0.90)
- Sekcja: VI · Weekend
- Typ: single
- Tytuł: **Weekend. Jak mocno się urywasz?**
- Podtytuł: Alkohol, zioło, coś mocniejszego. Zero moralizowania, liczę tylko co to robi z Twoją głową i regeneracją.
- Opcje (value): Czysto (0) · Kilka piw (35) · Solidnie, urywa film (70) · Alkohol plus coś jeszcze (90) · Mocno i nie tylko w weekend (100)

### 12. `monday_recovery` — SCORED (0.70/0.75)
- Sekcja: VI · Weekend
- Typ: single
- Tytuł: **Ile dni po weekendzie zdychasz, zanim wrócisz do formy?**
- Opcje (value): Zero (0) · Poniedziałek po południu (40) · Dopiero wtorek (70) · Środa albo później (100)

### 13. `symptoms_chips` — SCORED (0.60/0.80)
- Sekcja: VII · Napęd
- Typ: multi (max 3)
- Tytuł: **Co ostatnio najbardziej Ci siadało?**
- Podtytuł: Zaznacz maksymalnie 3, te najmocniejsze. Bóle, stawy i tętno zostaw lekarzowi.
- Opcje (value): Zmęczenie mimo snu (20) · Trudno się skupić (20) · Wieczorny głód/słodkie (15) · Brak efektów na sylwetce (20) · Wolno wracam po treningu (15) · Libido w dół (20) · Napięcie nie mija wieczorem (20) · Brzuch, wzdęcia (15) · Napęd siadł, minimum (15) · Mniej pewny siebie (15)

### 14. `morning_wood` — SCORED (0.55/0.60)
- Sekcja: VII · Napęd
- Typ: single
- Tytuł: **Poranne wzwody, szczerze, jak często?**
- Podtytuł: Bez oceniania. To jeden z najlepszych domowych sygnałów snu i testosteronu.
- Opcje (value): Większość poranków (0) · Kilka razy w tygodniu (50) · Rzadko (100)

### 15. `tried_before` — SCORED (0.65/0.60)
- Sekcja: VII · Napęd
- Typ: single
- Tytuł: **Ile razy w tym roku zacząłeś plan, który padł w niecały miesiąc?**
- Opcje (value): Ani razu (0) · 1-2 razy (33) · 3-4 razy (66) · 5+ (100)

### 16. `give_up_point` — DANE
- Sekcja: VII · Gdzie się sypie
- Typ: single (value 0)
- Tytuł: **Gdzie najczęściej Ci się sypie?**
- Podtytuł: Ten jeden moment, po którym cały plan zaczyna się rozłazić.
- Opcje: Na weekendzie · Wieczorem, po całym dniu · Gdy w robocie/głowie się pali · Gdy nie widać efektów · Gdy braknie czasu

### 17. `user_pain` — SCORED (0.90/0.90) · najwyższa waga
- Sekcja: VII · Główna przeszkoda
- Typ: text (esej)
- Tytuł: **Co Cię w tym wszystkim najbardziej wkurwia?**
- Podtytuł: Jedno, dwa zdania, własnymi słowami. Bez ładnego pisania, tak jak myślisz.

### 18. `user_trigger` — WYCIĘTE w v2.9 (`condition: () => false`)
- Sekcja: VII · Główna przeszkoda
- Typ: text (esej, można pominąć)
- Tytuł: **Czemu akurat teraz to sprawdzasz?**
- Podtytuł: Jak coś Cię dziś tu przygnało, napisz w dwóch słowach. Jak nie, przejdź dalej.
- Uwaga: opcjonalne celowo — kto wypełni mimo wszystko = gorący lead (self-select).

### 19. `intent` — KWALIFIKACJA
- Sekcja: VIII · Co dalej
- Typ: single (value 0)
- Tytuł: **Gdybyś miał to w końcu zmienić, jak wolisz działać?**
- Opcje: Ogarnę sam, daj kierunek (in_sam) · Chcę zobaczyć pracę z kimś (in_zobacz) · Wolę, żeby ktoś mnie poprowadził (in_prowadz) · Jeszcze nie wiem (in_niewiem)
- Uwaga: steruje wariantem zaproszenia „Co dalej" na stronie wyniku (awareness-aware bridge).

### 20. `start_when` — KWALIFIKACJA
- Sekcja: VIII · Co dalej
- Typ: single (value 0)
- Tytuł: **Kiedy chcesz zacząć?**
- Opcje: W tym tygodniu (sw_7dni) · W tym miesiącu (sw_30dni) · Za 2-3 miesiące (sw_kwartal) · Na razie sprawdzam (sw_sprawdzam)

### 21. `instagram` — KONTAKT (brama przed wynikiem)
- Sekcja: IX · Kontakt
- Typ: contact
- Tytuł: **Podaj swój Instagram, pokażę Ci wynik.**
- Podtytuł: Wynik widzę tylko ja. Jak coś w nim będzie, odezwę się osobiście.

---

## STRONA WYNIKU (thank-you · `ResultExperience.tsx` + `result-content.ts`)

Pokazywana PO ukończeniu (brama = podanie IG). 7 beatów przewijanych. Treść beatów 1-6 jest PER ARCHETYP (5 archetypów w `result-content.ts`); struktura i copy stały niżej. `{pct}` = 100 − score (uziemione 35–78%).

### Szkielet 7 beatów (stały)
1. **CIOS** — kicker „Twoja diagnoza · {imię}"; wielka liczba **{pct}%**; podpis (heroLabel); H (heroHeadline); sub (heroSub).
2. **PĘKNIĘCIE** — kicker „Pęknięcie"; H (revealHeadline); krzywa tygodnia „TU PĘKA"; podpis (revealCaption).
3. **MECHANIZM** — kicker „Dlaczego tego nie widziałeś"; H (mechHeadline); akapit (mechBody); złota kursywa (mechPull).
4. **KOSZT** — kicker „Ile Cię to kosztuje"; wielka liczba (costNumber); jednostka (costUnit); akapit (costBody).
5. **PROTOKÓŁ** — kicker „Protokół · 7 dni"; H (protocolHeadline); 7 kroków = interaktywny checklist (tytuł + mechanizm); ramka „Jak to liczysz:" (metric). Po 7/7: „Komplet. Teraz to samo, tylko z kimś, kto pilnuje, żebyś nie odpuścił po trzecim dniu."
6. **CO JA Z TEGO CZYTAM** — Punkt Pęknięcia + hand-raiser (serce konwersji, copy niżej).
7. **MIKRO-KALIBRACJA** — kicker „Zanim pójdziesz"; H „Która z tych rzeczy u Ciebie NIE pasuje?"; sub „Jedno kliknięcie. Dzięki temu następnym razem trafiam celniej."; chipy: Sen · Energia i głowa · Jedzenie · Ruch · Weekend · Napęd i libido · Wszystko pasuje.

### BEAT 6 — dokładny copy (stały + dynamiczny)
- kicker: **Co ja z tego czytam**
- cytat leada (jeśli jest): „{user_pain}"
- H: **{ppHeadline}** (per archetyp)
- reframe: {ppReveal} (per archetyp — skutek vs przyczyna)
- [tylko tier A] „Szczerze? Twój tydzień w większości się klei i spokojnie dowieziesz to sam."
- [SLOT WIDEO, ukryty do nagrania] „60 sekund ode mnie" · „Jak realnie patrzę na taki wynik" · „Zerknij zanim napiszesz. To ta sama głowa, która spojrzy na Twój wynik."
- teaser: „U Ciebie najpierw spojrzałbym na jedno: {ppHook}."
- **PYTANIE (hand-raiser):** Chcesz, żebym spojrzał na Twój pełny wynik i powiedział, co sprawdziłbym u Ciebie jako pierwsze?
- **PRZYCISK primary (DM):** Tak, rzuć okiem na mój wynik →  (ig.me/m/hantleitalerz z gotowym prefillem: „wyszedł mi punkt pęknięcia: {ppTag}...")
- linia: „Piszesz do mnie na Instagramie, wiadomość jest już gotowa, wystarczy ją wysłać."
- **Dowód Google:** 5,0 ★★★★★ · 56 opinii w Google + 2 karty
- **BLOK „Co dalej" (zaproszenie do prowadzenia — 4 warianty wg pytania `intent`):**
  - **in_prowadz:** „Napisałeś, że wolisz, żeby ktoś Cię przez to przeprowadził. Wiedzę masz, tylko ostatnie miesiące pokazały, że w pojedynkę to nie trzyma dłużej niż parę tygodni. Zobacz, jak wygląda prowadzenie, a powiem Ci wprost, czy widzę u Ciebie potencjał, żeby to ruszyć." → CTA **Zobacz prowadzenie 1:1 →**
  - **in_zobacz:** „Napisałeś, że chcesz zobaczyć, jak wygląda praca z kimś. Tu masz dokładnie to: co sprawdzam na start, jak wygląda pierwszy miesiąc i po czym poznasz, że idzie w dobrą stronę. Zajrzyj, zanim cokolwiek zdecydujesz." → CTA **Zobacz, jak pracuję 1:1 →**
  - **in_sam:** „Widzę, że chcesz to ograć sam, i dobrze, masz sensowną bazę i od czego zacząć. Zostawię Ci jedno na później: jakby za parę tygodni utknęło w tym samym miejscu, tak wygląda robota ze mną." → CTA **Zajrzyj na wszelki wypadek →**
  - **in_niewiem (domyślny):** „Nie musisz teraz nic decydować. Skoro masz już tydzień rozpisany co do godziny, zajrzyj, co wchodzi w grę, gdyby sam plan nie dowiózł." → CTA **Zobacz bez zobowiązań →**
- [tylko tier A] share: „Znasz kogoś, kto się w tym topi? Podeślij mu ten test, jemu przyda się bardziej niż Tobie."
- linia: „Ta diagnoza jest tylko Twoja, pod @{ig}. Trafia wyłącznie do mnie."

### TIER (uczciwy routing, z liczby domen „na czerwono")
A = trzyma sam (dopisek + share, zero pchania) · B = jeden wyciek · C = zajeżdża cały tydzień. Werdykt tier NIE jest już nagłówkiem (zastąpiony Punktem Pęknięcia); steruje tylko dopiskiem A + intensywnością.

### PRZYKŁAD PEŁNEGO ARCHETYPU — `wieczorny_odpad`
- heroLabel: tyle Twojej formy blokuje jedno okno w tygodniu
- heroHeadline: Domknij ten jeden dzień, a tydzień przestaje się sypać.
- heroSub: Robisz swoje, pilnujesz jedzenia, a i tak stoi, bo wszystko sypie się w jednym oknie, którego nie podejrzewasz, i zaraz Ci je pokażę, co do godziny.
- revealHeadline: Twój tydzień pęka w piątek o 22:00.
- revealCaption: Poniedziałek do czwartku trzymasz się nieźle, a potem w piątek wieczorem wszystko się sypie i ciągnie za sobą cały weekend, więc ten jeden dzień kasuje robotę z pięciu.
- mechHeadline: Wieczorem tylko płacisz rachunek, a robisz go od 7:00 rano.
- mechBody: Kawa na czczo i śniadanie na węglach rozbujają Ci cukier na cały dzień, a każdy jego zjazd to dla głowy sygnał, żeby dobrać szybkiej energii, więc wieczorem, już zmęczony, przestajesz z tym walczyć.
- mechPull (kursywa): To czternaście godzin nakręcania sprężyny, która wieczorem musi gdzieś strzelić, i charakter nie ma tu nic do rzeczy.
- costNumber/unit: 12 · dni miesięcznie, które wracają do Ciebie, kiedy zatkasz to okno
- protocolHeadline: Zatkaj to jedno okno w siedmiu ruchach.
- protokół (7): Rano: 10 minut światła w oczy / Śniadanie: 30-40 g białka i tłuszcz / Ostatnia kawa do 14:00 / Minimum 8 000 kroków dziennie / Ostatni kęs 2 godziny przed snem / 2 godziny przed snem: wolne białko i węgle / Sen: telefon poza sypialnią i magnez
- metric: licz wieczory domknięte zgodnie z planem, celuj w 5 na 7
- **ppHeadline:** Twój wynik najmocniej pokrywa się z Punktem Pęknięcia między 16 a 21.
- **ppReveal:** Ciekawe jest to, że wieczór prawdopodobnie nie jest tu problemem. Wieczorem widzisz dopiero skutek tego, co narasta od wczesnego popołudnia, czasem od samego rana. Dlatego walka z samym wieczorem rzadko działa, bo pilnujesz godziny, w której jest już za późno, żeby cokolwiek zmienić.
- **ppHook:** co dzieje się u Ciebie między 13:00 a 16:00
- **ppTag (do prefillu DM):** wieczór, okno 16-21

### POZOSTAŁE 4 ARCHETYPY (ta sama struktura 7 beatów, copy w `result-content.ts`)
- `weekend_reset` — Punkt Pęknięcia: styk weekendu (płacisz w poniedziałek)
- `glowa_zajezdza` — PP: głowa, codziennie wieczorem
- `wiedza_bez_wdrozenia` — PP: środek tygodnia (pętla restartu, start pon → koniec śr)
- `silnik_bez_paliwa` — PP: brak jednego ostrego punktu, sączy się po równo cały tydzień

---

## WYCIĘTE (6, świadomie — `condition:()=>false`)
- `age` — niski sygnał diagnostyczny, chroni completion
- `sleep_hours` — pokrywa `sleep_quality`
- `screen_bed` — nadmiar warstwy snu
- `energy_mornings` — dubel z `sleep_quality`/`half_power_hours`
- `weekend_cash` — drugi proxy budżetu, `takeout_cost` wystarcza
- `user_selfdx` — trzeci esej = największe tarcie, pokrywa się z `user_pain`

---

## STRUKTURA SEKCJI (obecny łuk)
I Po co tu jesteś → II Sen → III Głowa → IV Jedzenie → V Trening → VI Weekend → VII Napęd/esej → VIII Co dalej (kwalifikacja) → IX Kontakt.

## DANE → NOTION
Każde ukończone wypełnienie leci webhookiem n8n `diagnostyka-hit` → Notion (pola m.in.: score, archetyp, godzina pęknięcia, primary_goal, give_up_point, tier, intent, objawy, user_pain). Per-answer (porzucenia) → `diagnostyka-events` (obecnie workflow OFF).
