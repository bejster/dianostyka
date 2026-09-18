# Diagnostyka 168: audyt i finalny flow

Wersja robocza 3.0.0, 18.09.2026. Baza kodu: release/diag-v2.8-20260915.

## Decyzja

Diagnostyka pomaga wybrać jedną rzecz do sprawdzenia w zwykłym tygodniu. Wynik powstaje przed pytaniami o prowadzenie. Nie ocenia gotowości do zakupu, zdrowia ani niewykorzystanego potencjału.

Wykorzystane źródła języka i zasad: Communication Decision Compiler, Question Engine, kanoniczny głos Michała, przykłady z banku głosu, Genericity Kill Gate oraz skill landing pages Michała. Przegląd języka był ręczny, na tych źródłach. Nie jest to deklaracja uruchomienia całego systemu Voice Runtime.

## Co poprawiliśmy w faktach

| W starej wersji | W nowej wersji |
|---|---|
| Samoocena energii mogła zostać „skorygowana” obliczonym wynikiem | Brak arbitralnej korekty i punktacji 0–100 |
| Powrót do rytmu we wtorek sugerował utratę wszystkich dni od soboty | Nie przeliczamy powrotu na stracone dni |
| Odpowiedź o weekendzie stawała się liczbą weekendów w miesiącu | Pytamy wprost o ostatnie cztery weekendy; można nie pamiętać |
| Brak zaznaczenia objawu w wyborze maksymalnie trzech stawał się uspokajającym wnioskiem | Nie ma wnioskowania o zdrowiu z nieklikniętej odpowiedzi |
| Kolejność zdarzeń bywała przedstawiana jako rozpoznana przyczyna | Osobno pokazujemy odpowiedź, hipotezę i sposób sprawdzenia |
| Można było podać więcej opuszczonych treningów niż zaplanowanych | Zakres drugiego pytania zależy od pierwszego; zero jest pełnoprawne |
| Rada nie zawsze dotyczyła wskazanego wcześniejszego momentu | Eksperyment dobierany z pary scena + wcześniejsza sytuacja |
| Gotowość/fit mogły być wyliczane z pośrednich sygnałów | Potrzebę i obiekcję określa człowiek, opcjonalnie po wyniku |

## Finalny flow

Start → cel → scena z ostatniego tygodnia → wcześniejszy moment i częstotliwość, jeśli są potrzebne → ostatnia próba → wynik próby, jeśli była → co zachować → realny koszt, jeśli była trudność → dlaczego teraz → wynik i jedno zadanie → opcjonalny powrót po próbie → zaproszenie do prowadzenia.

**5–10 pytań przed wynikiem.** Pięć przy dobrym tygodniu i braku wcześniejszej próby. Dziesięć przy scenie treningowej, dodatniej liczbie planowanych treningów i wcześniejszej próbie. Pytania o fit i obiekcję są osobno, opcjonalnie po wyniku.

## JOB każdego pytania

| Pytanie | JOB | Co zmienia |
|---|---|---|
| Co chcesz poprawić w pierwszej kolejności? | Wybrać ważny dla człowieka efekt | Kryterium obserwacji: wykonanie, energia po pracy, sen lub odłożenie spraw z pracy |
| Przypomnij sobie ostatni tydzień. Która sytuacja najbardziej Ci przeszkodziła? | Ustalić konkretną scenę, dopuścić dobry tydzień i brak przykładu | Rodzina pytań oraz zadanie albo zachowanie działającego tygodnia |
| Co działo się wcześniej? | Szukać wcześniejszego ogniwa bez uznawania go za przyczynę | Konkretny eksperyment z pary scena/odpowiedź; brak wiedzy daje obserwację |
| Ile treningów zaplanowałeś na ten tydzień? | Ustalić mianownik | Limit opuszczonych treningów; zero pomija następne pytanie i usuwa tezę o niewykonaniu |
| Ile z tych treningów się nie odbyło? | Ustalić wykonanie | Zero daje obserwację; jeden przypadek nie staje się każdym tygodniem |
| W ilu dniach ostatniego tygodnia było podobnie? / Po ilu z ostatnich czterech weekendów było podobnie? | Rozróżnić epizod, powtarzalność i brak danych | Zero/brak pamięci daje obserwację. Jeden przypadek dostaje ograniczenie wniosku. Pozostałe liczby są pokazywane w swoim okresie |
| Co ostatnio próbowałeś zmienić, żeby było lepiej? | Poznać konkretną previous attempt | Wybiera odniesienie do poprzedniego planu, kalendarza, małego kroku lub pomocy. Brak próby pomija następne pytanie |
| Co się stało z tą próbą? | Zachować działające rozwiązanie lub uniknąć powtarzania błędu | Działa → zachowaj. Zmiana godzin → wariant po przesunięciu dnia. Za dużo → jeden element. Brak efektu → przegląd wykonania i miary. Brak feedbacku → zapisz przeszkodę do korekty |
| Na co ma zostać miejsce, kiedy zaczniesz to poprawiać? | Ustalić konflikt celu i tego, co człowiek chce zachować | Sposób wykonania zadania uwzględnia bliskich, spotkania, elastyczność albo odpoczynek |
| Co przez to faktycznie ucierpiało w ostatnim tygodniu? | Poznać realny koszt, także jego brak | Wybiera dodatkowy sygnał obserwacji. Brak kosztu dopuszcza decyzję, że zmiana nie jest potrzebna |
| Co sprawiło, że sprawdzasz to właśnie teraz? | Poznać WHY NOW bez wymuszania pilności | Instrukcja momentu próby i ton zaproszenia. Ciekawość nie staje się gotowością zakupu |
| Czego teraz potrzebujesz? (opcjonalne, po wyniku) | Sprawdzić dopasowanie rodzaju pomocy | Samodzielnie / korekty w prowadzeniu / sama rozpiska / pomoc medyczna |
| Co chcesz wiedzieć, zanim rozważysz prowadzenie? (tylko po wyborze korekt) | Ujawnić prawdziwą obiekcję | Zaproszenie wskazuje proces, czas, koszt lub pracę po słabszym tygodniu |

Pytania mają JOB i downstream również w kodzie. Pełne warianty odpowiedzi są w `app/lib/decision-diagnostic.ts`. Wynik nie dobiera medycznej diagnozy.

## Branching: priorytety

1. Poprzednia próba działa → zachowaj ją, nawet jeśli w tygodniu pojawiła się trudność.
2. Dobry tydzień → zachowaj to, co działa. Wyjątek: zgłoszony brak efektu poprzedniej próby kieruje do przeglądu danych.
3. Poprzednia próba bez widocznego efektu → zapisz czas trwania, wykonanie i sposób mierzenia. Nie dokładamy kolejnego wymagania.
4. Brak sceny, nieznane wcześniejsze ogniwo, zero wystąpień, brak pamięci, zero planu treningowego lub zero opuszczonych treningów → obserwacja, bez rozpoznania problemu.
5. Konkretna scena i znane wcześniejsze ogniwo z banku → jedna hipoteza i eksperyment.
6. Konkretne ogniwo bez dostatecznych danych do bezpiecznej rady, np. zmęczenie lub opieka nad dzieckiem przed snem → zapis sytuacji, bez automatycznej recepty.

Zmiana sceny usuwa stare odpowiedzi zależne od niej. Zmiana poprzedniej próby usuwa jej wynik. Zmniejszenie planu treningowego unieważnia niemożliwą liczbę opuszczonych treningów. Odtworzenie lokalnego zapisu też przechodzi walidację.

## Przykładowe przejścia od sceny do zadania

| Scena + wcześniejszy moment | Pierwsza próba |
|---|---|
| Wypada trening + przeciąga się praca | Przygotuj krótszy wariant przed rozpoczęciem pracy |
| Wieczorne jedzenie + wypadł wcześniejszy posiłek | Zadbaj o dostępność tego wcześniejszego posiłku |
| Późne położenie się + dokańczanie pracy | Ustal zadanie kończące pracę i zapisz dalszy krok na jutro |
| Skupienie + ciągłe przeskakiwanie między zadaniami | Sprawdź jeden blok nad jednym zadaniem, zanotuj przerwania |
| Trudny powrót po weekendzie + brak decyzji o powrocie | Ustal pierwszy zwykły posiłek i jego dostępność |
| Nie wiadomo, co było wcześniej | Zapisz scenę przed zmianą planu |

To hipotezy organizacyjne do sprawdzenia. Dobry wynik pojedynczej próby nie potwierdza przyczyny.

## Wynik na ekranie

1. Konkretny pierwszy krok i status wniosku, opisany słowami.
2. Dwie odpowiedzi, na których opiera się trop, plus podana liczba w swoim okresie.
3. Jedno zadanie: co zrobić, kiedy, co zapisać i co uwzględnić.
4. Pobranie wyniku. Wyjaśnienie i wszystkie odpowiedzi pod rozwinięciem.
5. Po przyjęciu próby: opcjonalny check-in „zrobiłem/pomogło”, „zrobiłem/bez różnicy”, „nie wykonałem”, „nie było okazji”. Każda odpowiedź ma inną dalszą wskazówkę.
6. Zaproszenie do poznania prowadzenia.

Wizualnie zachowane czerń, złoto i serif. Wynik dostał jedną główną kartę działania, większy kontrast tekstu oraz szczegóły pod rozwinięciem. Przyciski odpowiedzi są duże; liczby wybiera się bez przeciągania suwaka.

## Naturalne zaproszenie

> Masz jedną rzecz do sprawdzenia. W prowadzeniu wracam do tego, co wydarzyło się w tygodniu: czy zmiana weszła, co ją zatrzymało i co poprawić dalej.
>
> Masz punkt wyjścia. W prowadzeniu sprawdzam, co z niego wyszło i na tej podstawie koryguję następny tydzień. Jeśli chcesz pracować w ten sposób ze mną, zapraszam do szczegółów.
>
> **Zobacz, jak wygląda prowadzenie**

CTA prowadzi do `https://nabor.talerzihantle.com/` z oznaczeniem źródła diagnostyki. Bez odpowiedzi, danych kontaktowych i domniemanej gotowości w URL. Bez automatycznego przekierowania.

Samodzielna próba → zostaje zadanie i spokojny link. Sama rozpiska → wyjaśnienie, że plan stanowi część prowadzenia. Poszukiwanie diagnozy lub leczenia → znika zaproszenie do naboru; informacja o zakresie i lekarzu.

Obiekcje: proces → co robisz Ty/co sprawdzam ja; powtórne odpuszczenie → przebieg pracy po słabszym tygodniu; czas → wymagania po stronie podopiecznego; cena → zakresy i pełny koszt sześciu miesięcy. Szczegóły oferty sprawdzone na obecnej stronie naboru; ich aktualizacja wymaga też przejrzenia tych komunikatów.

## Co usunęliśmy albo przenieśliśmy

- Samoocena ogólnego poziomu oraz osie energii/libido/stresu: nie służą tu do policzenia prawdziwego pomiaru.
- Ogólne godziny „na pół mocy”, postęp roczny i lista objawów: nie są potrzebne do jednego eksperymentu, a zachęcały do nadinterpretacji.
- Liczba wcześniejszych prób: zastąpiona ostatnią konkretną próbą i tym, co z nią się stało.
- Ogólny trigger odpuszczenia: zastąpiony wcześniejszym momentem w jednej scenie.
- Intencja zakupowa i termin startu przed wynikiem: zastąpione opcjonalnym wyborem pomocy po otrzymaniu wyniku.
- Kontakt: po wyniku, opcjonalny także dla osoby zainteresowanej prowadzeniem.

## Kontakt i pomiar

Odpowiedzi zapisują się lokalnie. Użytkownik może pobrać wynik. Nowy endpoint wysyła odpowiedzi dopiero po osobnym wyborze wysłania wyniku i prośbie o kontakt na Instagramie. Nie wysyłamy testowych zgłoszeń do realnego CRM ani Telegrama.

Zdarzenia v3: start, widok/odpowiedź pytania (ID, pozycja, czas, bez wartości odpowiedzi), ukończenie, wyświetlenie wyniku, przyjęcie zadania, zapis, powrót po próbie, opcjonalny fit/obiekcja bez treści, kliknięcie naboru i jawne wysłanie kontaktu. W analizach trzeba filtrować `version = 3.0.0`.

Mierzyć: start→wynik, porzucenia na pytaniach, wynik→przyjęcie/pobranie kroku, wynik→nabór, nabór→zgłoszenie. Wzrost liczby kliknięć nie jest jeszcze dowodem wzrostu jakości zgłoszeń.

Nowy payload webhooka ma nową wersję i schemat. Zachowuje kanały dostarczenia, ale nie wysyła dawnych syntetycznych ocen. Mapowanie automatyzacji n8n/Notion wymaga sprawdzenia na jej rzeczywistym schemacie przed publikacją. Nie deklarujemy potwierdzenia zapisu w CRM na podstawie samego HTTP 2xx.

## Weryfikacja

- 160 testów: zaliczone, w tym macierz ponad 2000 kombinacji gałęzi nowego silnika.
- Build produkcyjny Next.js: zaliczony.
- Endpoint kontaktowy: testy rzeczywistego kodu z odizolowaną konfiguracją i atrapą wysyłki. Brak zgody, niepełny formularz, zbyt duży payload i brak dostarczenia nie zgłaszają sukcesu. Test poprawnego zgłoszenia potwierdza, że brief liczy serwer i odrzuca dopisane oceny. Rzeczywiste kanały kontaktu nie zostały uruchomione.
- Osobne kontrole: czyszczenie ukrytych odpowiedzi, liczby graniczne, zero, nie wiem, działająca próba, brak efektu, medyczny brak fit, prywatność zdarzeń i brak automatycznego przekierowania.
- Testy starego silnika nadal sprawdzają zachowane moduły historyczne. Kontrakty publicznego wejścia zaktualizowano do v3.
- Użytkownik zatwierdził publikację gałęzi i przygotowanie podglądu. Weryfikacja przeglądarkowa i adres podglądu będą zapisane w PR.
- Ta wersja nie została opublikowana na głównej domenie.

## Kopie wersji

- Produkcja sprzed zmian: `backup/production_2026-09-18_11-34-07_CEST`, commit `e926e2297b169478b0e2a30966d56ce353b1be90`; gałąź w GitHub.
- Deployment produkcyjny do ewentualnego powrotu: `dpl_2h3n2zpNCRpeDVPrafBXDwRqcnsY`.
- Pierwsza kompletna wersja robocza: lokalny tag `backup/decision-v3_2026-09-18_11-34-07_CEST`, commit `991d5a581ae695009c4de16789e368d6e77b8c78`.
- Obowiązek kopii przed nadpisaniem zapisany w `AGENTS.md`.
