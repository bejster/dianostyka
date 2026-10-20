# Diagnostyka HiT — audyt integralności, 20.10.2026

Status: poprawki w draft PR #12, bez zmiany produkcji. Nie potwierdzono pełnego odbioru w CloserOS ani rzeczywistym Telegramie. Nie utworzono syntetycznego leada produkcyjnego, nie wysłano rzeczywistych wiadomości sprzedażowych.

## Stan wyjściowy potwierdzony w bieżących źródłach

- Repo `bejster/dianostyka`, bazowy `main`: `d1af8083d2bda7b45eb55dff61bd45b885c69f46`.
- PR #10 i #11 scalone; domena produkcyjna jest przypisana do deploymentu Vercel `dpl_3BgaHbU1Q9UHCGQpm6o9eAA3TQ6x`, SHA `d1af808...`. Obie poprawki są na produkcji, nie tylko Preview.
- `/` przekierowuje do `/diagnoza`. Dawny `app/page.tsx` jest zachowany; jego publiczny endpoint `/api/subscribe` nadal wymaga kontroli.
- Dotychczasowe 24 testy przechodzą, ale część sprawdza jedynie tekst źródeł. Nie dowodzą odbioru przez CRM.
- Aktualna `/diagnoza` wywoływała tylko `/api/lead-notify`, które wysyłało Telegram. Zapis CRM był usunięty, a odpowiedź API ignorowana przez UI.
- W historii repo odnaleziono istniejący kontrakt Make -> canonical CRM, z n8n jako fallbackiem (`4af60fb...`, wcześniejsza poprawka `8206f84...`). Nie tworzono nowego CRM.

## Potwierdzone błędy i zmiany

| Problem | Dowód i poprawka |
|---|---|
| Brak CRM w aktywnej ścieżce | Odtworzono historyczny kontrakt Make: lead_ref, nick, wynik, intencja/start, raw answers w chunkach, derived signals, brief. Dane oblicza serwer. Make/n8n musi przyjąć dane przed alertem Telegram. |
| UI pokazywało wynik mimo niedostarczenia | Widoczny stan wysyłania, przyjęcia albo błędu; wynik zostaje dostępny; ręczne ponowienie używa tego samego lead_ref w bieżącej sesji strony. Nie deklarujemy idempotencji poza istniejącym odbiorcą Make ani po odświeżeniu strony. |
| Niepoprawny kontakt zmieniany w inny nick | Produkcja: `bad handle` staje się `badhandle` i aktywuje wysłanie. Preview: pozostaje `bad handle`, przycisk jest zablokowany, jest podpowiedź. To walidacja składni, nie weryfikacja istnienia konta. |
| Spacje bez wskazówki | W produkcji trzy spacje blokują przycisk bez komunikatu. Preview podaje minimum 15 znaków i 3 słowa; analogiczne wskazówki dla pozostałych typów pól. |
| Niemożliwa liczba opuszczonych treningów | 7 opuszczonych przy 1 planowanym przechodziło walidację. Teraz serwer odrzuca, a suwak ma maksimum zgodne z planem. |
| Ukryte/stare odpowiedzi wpływały na wynik | Zapisane sleep_hours, screen_bed i weekend_cash mimo wyłączenia pytań zmieniały FD. Normalizacja odcina nieaktywne oraz niepoprawne odpowiedzi w wyniku i payloadzie CRM. |
| Wznowienie sesji blokowało prawidłowe zero | Usunięto zależność od nietrwałego zestawu touched; zero zapisane jako odpowiedź można zatwierdzić. Klawiatura Home jest jawnym potwierdzeniem wartości początkowej. |
| Zapisany ukryty krok / uszkodzona sesja | Wznowienie omija wyłączone pytania. JSON `null`/tablica nie wywraca formularza. |
| Stare API przyjmowało pusty lub fragmentaryczny wynik | `/api/subscribe` wymaga pełnego snapshotu FD i intencji także po pominięciu source. Pusty score nie jest zerem; prawidłowe zero zostaje zachowane; email jest przycinany przed przekazaniem. |
| Powiadomienie uznawane za zapis | Sam Telegram nie wystarcza do sukcesu `/api/subscribe`. Błąd logiczny Telegram `{ok:false}` nie jest sukcesem mimo HTTP 200. Wadliwy JSON zwraca 400. |

## Lokalnie — co rzeczywiście przetestowano

`npm test`: 49 testów, 49 PASS, 0 FAIL. `npx tsc --noEmit`: exit 0. `npm run build`: exit 0. Nowe regresje odtworzono testami przed poprawkami.

- Każde widoczne wymagane pole: brak, null, pusty string, same spacje, tabulator/nowa linia. Osobno włączone warunki treningów i weekendu.
- Zakresy i kroki liczb, NaN, Infinity, liczby jako string, wartości zerowe.
- Nieprawidłowy Instagram/email, opcjonalne pole, limit wyboru, stare ukryte odpowiedzi i przywracanie sesji.
- Rzeczywisty handler API z przechwyconym I/O: żadne niepełne dane nie wychodzą do odbiorców; wynik i priorytet nie pochodzą z podsuniętych pól klienta.
- Pełna ścieżka React/JSDOM: intro -> wszystkie pytania (w tym oba warunkowe) -> wynik -> rzeczywisty handler -> przechwycony payload CRM -> odpowiedź atrapy Telegrama. Porównano odtworzone raw answers 1:1 z wypełnionym formularzem oraz nick/chat w alercie.
- Brak konfiguracji CRM i awaria CRM nie emitują Telegrama ani fałszywego sukcesu. Błąd wysyłki jest widoczny; ręczny retry zachowuje ID.
- Stara ścieżka: puste/sparse dane i pominięty source odrzucane przed I/O; pełny snapshot z zerem przechodzi do atrapy webhooka.

Wszystkie odbiorniki w tych testach są atrapami w pamięci. Nie są to rzeczywiste rekordy w bazie, odczyt CloserOS ani odbiór wiadomości na telefonie.

## Preview — dowody z przeglądarki

Pierwszy Preview PR #12: `https://dianostyka-8oqtenolx-michals-projects-20fc032f.vercel.app/diagnoza`, deployment `dpl_24oPfrGdpNrtik7v9Z8osjxjWjjk`, SHA `86ff656...`.

Potwierdzono przejście od intro przez 18 pytań do Karty Tygodnia; zera w liczbach; pominięcie pytań o opuszczone treningi i koszt weekendu, gdy nie dotyczą; blokadę samych spacji z podpowiedzią; błędny nick zachowany i zablokowany. Po poprawnym syntetycznym komplecie wynik jest dostępny, a brak CRM pokazuje: „Wynik jest gotowy, ale nie udało się przekazać zgłoszenia. Twoje odpowiedzi zostają w tej przeglądarce.” Jest przycisk „Spróbuj ponownie”.

Przed wysłaniem sprawdzono metadane konfiguracji Vercel (bez odszyfrowywania wartości): nowa gałąź Preview nie dziedziczy produkcyjnych Make/n8n/Telegram. Make dla Preview istnieje wyłącznie dla innej, starej gałęzi. MailerLite jest współdzielony z Preview, dlatego NIE wykonywano poprawnego `/api/subscribe` na Preview. Aktywna ścieżka `/api/lead-notify` nie wywołuje MailerLite i przy braku CRM kończy się przed zewnętrznym I/O.

Dodatkowe poprawki wznowienia sesji i starego API są w następnym commicie tego samego PR; opis ostatniego Preview i wynik HTTP zostanie dopisany poniżej.

## Produkcja — dowody i granice

Przeszedłem od pierwszego pytania do ekranu kontaktu, bez finalnego wysłania. Potwierdzono zera, warunki pomijające pytania, możliwość pominięcia pola opcjonalnego, blokadę spacji i błędne przepisywanie nicku. Puste żądania `/api/lead-notify` i `/api/subscribe` zwracają 422.

Nie wysyłano poprawnego kompletu ani prób z pojedynczym brakującym polem na produkcję: wadliwa walidacja nie może przypadkiem stworzyć testowego kontaktu. Nie sprawdzono rzeczywistego zapisu, automatyzacji ani dostarczenia Telegrama przez wywołanie produkcyjne.

## Pozostałe luki — nie oznaczać jako PASS

1. **CloserOS / CRM:** historyczny kontrakt odtworzono i sprawdzono lokalnie. Nie potwierdzono w tej sesji rekordu odczytanego z canonical CRM ani jego pojawienia się w CloserOS. Samo HTTP 2xx webhooka oznacza przyjęcie transportu, nie zapis w bazie. Brak udostępnionego, potwierdzonego sandboxa i kontraktu odbioru CloserOS.
2. **Rzeczywisty Telegram:** nie wysyłano wiadomości do produkcyjnej grupy. Konieczny dedykowany testowy odbiorca, jeżeli test ma potwierdzić realną dostawę.
3. **Telefon:** nie wykonano testu fizycznego iPhone/Android ani wiarygodnej emulacji mobilnej. Dostępna przeglądarka nie udostępnia ustawienia viewportu; próba otwarcia ramki 390 px przez data URL została zablokowana przez politykę przeglądarki i nie była obchodzona. `minWidth:0` w polach flex i inputMode nie są dowodem mobilnego PASS.
4. **Treść wyniku, osobny problem istniejącego silnika:** łagodny profil syntetyczny (score 15, brak wieczornego jedzenia i używek) otrzymał szablon „Dzień na kredycie” z opisem telefonu/lodówki/snu po pierwszej i alkoholu w piątek. Te sceny nie wynikały z odpowiedzi. To zachowanie dotychczasowego `pickArchetype`/`week-plan`, nie regresja nowej walidacji. Nie przepisano całego silnika narracji w tej poprawce. Nie uznawać treści wyniku za źródłowo potwierdzoną diagnozę.

## Bezpieczne domknięcie po udostępnieniu sandboxa

Jeden oznaczony test w izolowanym środowisku: od wypełnienia do ID odpowiedzi API, odczytu rekordu po lead_ref, porównania kontaktu/odpowiedzi/wyniku/intencji w CRM i CloserOS oraz odczytu wiadomości w testowym Telegramie. Wyłączone procesy sprzedażowe i brak produkcyjnych writerów są warunkiem rozpoczęcia. Nie zastępować tego testu kolejnym zielonym buildem.

## HTTP — wyniki niezależne od lokalnych atrap

`docs/evidence/diagnostyka-http-2026-10-20.json`: **22/22 zgodnych odpowiedzi** na pierwszym Preview. Dwa bezpieczne żądania produkcyjne (puste body) -> 422. Preview: oba puste API -> 422; każda z 17 wymaganych odpowiedzi w podstawowej ścieżce zamieniona na same spacje -> 422 ze wskazaniem pola; poprawny syntetyczny komplet -> 503 `crm_unavailable`, `crm:false`, `telegram:false`. Nie interpretujemy oczekiwanej 503 jako udanego zapisu.

Dla ścieżek z włączonym treningiem i weekendem kompletność i obie dodatkowe odpowiedzi sprawdzono lokalnie (realny handler z atrapami); nie mylić tego z powyższą macierzą HTTP Preview.

Sprawdzenie źródeł: GitHub PR #10/#11 i git history; Vercel project/deployment oraz metadane konfiguracji; przeglądarka produkcji i Preview; lokalne testy behawioralne i komendy walidacyjne. Nie odszyfrowywano ani nie kopiowano sekretów produkcyjnych.
