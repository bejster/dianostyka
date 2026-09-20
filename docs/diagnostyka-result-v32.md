# Diagnostyka 168: wynik 3.2

Data pracy: 2026-09-19. Silnik odpowiedzi: 3.1.0. Prezentacja wyniku: 3.2.0.

## Cel

Użytkownik ma zobaczyć, która jego odpowiedź zmieniła następny ruch, dostać wykonalną próbę i móc sam zdecydować o prowadzeniu. Wynik nie wymaga kontaktu. Zachowujemy istniejącą diagnostykę i jej adres.

## Backup i publikacja

- Pełny stan wejściowy: `cdccf622f95e2c62b5381e3fd0ed256d0e960325`.
- Zdalna kopia przed zmianami: `backup/result-v31_2026-09-19_19-00-11_UTC`.
- Gałąź podglądu: `fix/diagnostyka-decision-compiler-20260918`.
- Poprzedni podgląd: `dpl_HmcQowtC6yZVfxXZWdcc3DhmzgX5`.
- Produkcja pozostaje na `dpl_2h3n2zpNCRpeDVPrafBXDwRqcnsY`, commit `e926e2297b169478b0e2a30966d56ce353b1be90`.
- Nie zmieniamy domeny produkcyjnej w ramach zgody na podgląd.

## Finalny flow

1. Wejście z bio lub zimnego ruchu: jedna obietnica sprawdzenia konkretnej sytuacji. Widoczny skrót „Zobacz prowadzenie” dla osoby, która już tego szuka.
2. Pytania: powód wejścia, cel, scena, poprzednia próba; dalsze pytania zależą od odpowiedzi. Łącznie 6–11, bez sztucznego skracania każdej ścieżki do sześciu.
3. Wynik: nagłówek odnoszący się do odpowiedzi; status „Trop do sprawdzenia”, „Najpierw obserwacja” albo „Co warto zachować”.
4. Dwie części wyniku: zapisane odpowiedzi i szczegół zmieniający rekomendację; obok jedno działanie z konkretnym nagłówkiem, kryterium oceny i uwzględnionym ograniczeniem.
5. Wyjaśnienie, poprzednia próba, dalsza interpretacja i pełne odpowiedzi są rozwijane. Cały raport można pobrać.
6. Opcjonalna ocena użyteczności: nowe / wiedziałem, brakowało działania / już próbowałem / nietrafione. Dwie ostatnie odpowiedzi cofają do odpowiedniego pytania i wyłączają akceptację odrzuconej próby.
7. Zaproszenie do prowadzenia: dobrowolny link do naboru, z dopasowaniem do wyrażonej potrzeby i obiekcji. Wynik jest już dostępny przed tym zaproszeniem.
8. Osobno: opcjonalne wysłanie wyniku i prośby o kontakt; opcjonalne udostępnienie kategorii do planowania materiałów.

## Branching

| Odpowiedź / warunek | Co się zmienia |
| --- | --- |
| Brak poprzedniej próby lub brak pamięci | Pomijamy pytanie o jej rezultat. |
| Poprzednia próba działa | Utrzymanie tego, co działa; bez nowej interwencji w tym samym miejscu. |
| Próba wykonana, brak zauważonej zmiany | Odtworzenie czasu trwania, wykonania i sposobu porównania efektu. |
| Dobry tydzień | Pytanie o warunek, który pomógł; rekomendacja jego ochrony. |
| Konkretna scena | Pytanie o wcześniejsze zdarzenie i częstość; trening ma osobno planowane i niewykonane sesje. |
| Praca zabrała trening / zmęczenie / wcześniejszy posiłek / ekran | Dopytanie rozróżnia konkurencyjne wyjaśnienia, wybierając inne działanie. |
| Brak szczegółu, nieznana częstość lub zero | Obserwacja zamiast pewnego rozpoznania wzorca. |
| Jeden przypadek | Wyjaśnienie zachowuje skalę pojedynczego zdarzenia. |
| Brak wyraźnego kosztu | Próba z ciekawości; brak obowiązku naprawiania czegokolwiek. |
| Wybrany czas z bliskimi / odpoczynek / swoboda / spotkania | Dopasowanie warunku wykonania próby, bez automatycznego odbierania tej rzeczy. |
| Wynik nietrafiony lub już sprawdzony | Doprecyzowanie sceny albo poprzedniej próby; brak zachęty do powtarzania odrzuconej rady. |
| Chcę działać sam | Spokojne wykonanie próby; oferta pozostaje opcjonalna. |
| Chcę regularnych korekt | Opis prowadzenia; opcjonalna prośba o kontakt. |
| Szukam tylko planu | Wyjaśnienie zakresu przed zgłoszeniem. |
| Szukam diagnozy lub leczenia | Wyjaśnienie ograniczenia usługi, bez CTA do prowadzenia. |

Nie rysujemy łańcucha przyczynowego z odpowiedzi, które go nie potwierdzają. Karty cytują odpowiedzi. W scenie z trudnością zasypiania telefon pozostaje zdarzeniem późniejszym. Nagłówki działań opisują 28 istniejących rekomendacji, nie wybierają ich na nowo.

## Pomiar: definicje zamiast jednego wskaźnika konwersji

Każde zwykłe zdarzenie ma `analytics_schema=site-analytics-v1`, `surface=diagnostyka`, `version=3.1.0`, `ui_version=3.2.0` i `environment`. Tylko dokładna domena `diagnostyka.talerzihantle.com` otrzymuje `production`. Podglądy i localhost otrzymują `preview`.

| Pytanie | Zdarzenia i interpretacja |
| --- | --- |
| Czy wejście zachęca do rozpoczęcia? | `diag_intro_viewed` → `diag_start`; unikalne sesje, produkcja. |
| Czy użytkownik kończy? | `diag_start` → `diag_complete`; osobno wznowienia. |
| Gdzie odpada? | Ostatnie `question_view` bez późniejszej odpowiedzi; ID pytania i pozycja, bez treści odpowiedzi. |
| Czy wraca do zapisanego wyniku? | `diag_result_resumed`, bez ponownego zaliczania wejścia i ukończenia. |
| Czy korzysta z działania? | `experiment_accepted`, `result_saved`, później `experiment_reviewed`; deklaracja i zapis, nie dowód poprawy. |
| Czy widzi zaproszenie? | `diag_invitation_viewed` po pokazaniu co najmniej 20% sekcji. |
| Czy przechodzi do oferty z wyniku? | `nabor_clicked`, `placement=result`; klik nie oznacza załadowania naboru ani zgłoszenia. |
| Czy omija diagnostykę? | `nabor_bypass_clicked`, `placement=header`; osobna ścieżka. Stary tryb fast-fit zachowuje własne zdarzenia. |
| Czy prosi o kontakt? | `contact_provided` dopiero po potwierdzeniu API; przynajmniej jeden kanał odbiorczy zaakceptował wiadomość. To nie dowód sprzedaży. |
| Czy wysłanie nie działa? | `contact_delivery_failed`, bez nicku i raportu. |
| Czy wynik był nowy i trafny? | Kategorie reakcji tylko w dobrowolnym `diag_content_insight_shared`. Samo `result_reaction_selected` nie zawiera oceny. |

Kohorty: produkcja; wersja interfejsu; osobno świeże wejścia, wznowienia i fast-fit. Nie mieszać ruchu testowego z realnymi użytkownikami. Lejek sesyjny mierzy bieżące przejście; późniejsze powroty analizować oddzielnie. Nie wymagać kliknięcia naboru przed prośbą o kontakt, bo formularz kontaktowy jest także dostępny na wyniku.

Użyteczność i tematy contentu oceniamy wyłącznie wśród osób, które udostępniły kategorie. Raportować liczebność tej grupy oraz udział opt-in; nie przedstawiać jej procentów jako rozkładu całego ruchu. Rutynowe zdarzenia nie wysyłają odpowiedzi, diagnozy ani kontaktu.

## Stan weryfikacji analityki

Podłączony konektor udostępnia jedną organizację „Talerz i Hantle” i jeden projekt „Default project”, ID 266256, bez zarejestrowanych zdarzeń. Jego publiczny token nie odpowiada domyślnemu tokenowi w kodzie strony. Token w kodzie może być zastąpiony zmienną wdrożenia; nie potwierdzono wartości tej zmiennej ani zgodności projektu z rzeczywistym wdrożeniem.

Nie przestawiono projektu, nie utworzono mylącego pustego dashboardu i nie wysłano sztucznych zgłoszeń ani kategorii contentowych. Instrumentacja jest gotowa do sprawdzenia we właściwym projekcie. Dostarczenie danych do PostHog, wejście na nabor po kliknięciu i dalsza sprzedaż pozostają niepotwierdzone. Do domknięcia dashboardu potrzebny jest dostęp do projektu faktycznie odbierającego dane z tego wdrożenia.

## Weryfikacja

170 wcześniejszych testów przeszło. Pięć dodatkowych sprawdza 28 nagłówków, trzy różne sceny z ekranem, niepewne odpowiedzi, utrzymanie działającej próby i rozdzielenie domen produkcyjnych od podglądów. TypeScript, lint zmienionych źródeł i build przechodzą.

`/preview/mobile` to pomoc do oglądania rzeczywistej strony w ramce szerokości 390 px. Jest dostępna wyłącznie na wdrożeniach Vercel Preview; w produkcji zwraca 404. To kontrola układu w wąskim oknie, nie emulacja urządzenia ani potwierdzenie działania na każdym telefonie.
