# Diagnostyka 168: interakcje 3.3

Decyzja Michała: diagnostyka ma działać w całości bez filmu. Film może pojawić się później jako opcjonalne wyjaśnienie. Wynik, pobranie, samodzielna próba i zaproszenie do naboru pozostają dostępne od razu.

## Co zmieniono

- Natychmiastowe podświetlenie wybranej odpowiedzi i znak ✓, delikatne wciśnięcie karty oraz pojedynczy złoty błysk. Po 180 ms następuje przejście; to czas potwierdzenia wyboru, nie udawane obliczenia.
- Nowe pytanie wchodzi ruchem o 7 px przez 220 ms. Treść nie czeka na zakończenie animacji. Wynik ma jeden krótki efekt wejścia, bez dodatkowego ekranu ładowania.
- Etapy: Scena → Szczegóły → Twój krok. Długość diagnostyki nadal wynika z odpowiedzi.
- Licznik pokazuje dokładną liczbę pytań dopiero po ustaleniu rozgałęzienia. Pasek liczy wcześniejsze odpowiedzi i nie osiąga 100% na ekranie nieodpowiedzianego ostatniego pytania.
- Przed dopytaniem pojawia się cytat z wybranej sceny, poprzedniej próby albo wcześniejszego momentu. Użytkownik widzi, dlaczego otrzymuje właśnie to pytanie. Nie ma wstępnych etykiet ani diagnoz.
- Krótkie wskazówki zapowiadają funkcję pytania. Komunikaty „ostatnia odpowiedź” i „zostały dwie” zależą od rzeczywistej pozostałej ścieżki.
- Brak nowych pytań, dodatkowego kliknięcia „dalej”, wymogu oglądania filmu, opłat albo bramki kontaktowej.

## Dostępność i poprawność

`prefers-reduced-motion` wyłącza nowe animacje oraz opóźnienie przejścia. Potwierdzenie ma ikonę i stan przycisku, nie opiera się wyłącznie na kolorze. Po przejściu fokus wraca do nagłówka pytania.

Blokada wyboru przyjmuje tylko pierwsze kliknięcie w trakcie przejścia. Opuszczenie komponentu unieważnia opóźnioną funkcję. Czas odpowiedzi liczony jest do kliknięcia, bez dodawania czasu animacji.

Silnik i zapis odpowiedzi pozostają w wersji 3.1.0. `ui_version=3.3.0` pozwala rozdzielić doświadczenie od poprzedniego interfejsu. Reguły zgody i rozdział preview/production pozostają bez zmian.

## Hipoteza do sprawdzenia

Czy czytelne potwierdzenie wyboru, powiązanie kolejnych pytań i rzeczywisty postęp zwiększają ukończenia, bez spadku trafności wyników oraz sensownych zgłoszeń?

Nie deklarujemy zwiększania dopaminy ani udowodnionego wzrostu retencji. Mierzymy zachowanie użytkowników. Porównanie wymaga podobnego źródła ruchu i uwzględnienia długości ścieżki. Osobno oceniamy ukończenie, poprawianie odpowiedzi, użyteczność (tylko w grupie z opt-in), przejścia do naboru i przyjęte prośby o kontakt. Odbiór danych we właściwym projekcie PostHog pozostaje do potwierdzenia, zgodnie z opisem v3.2.

Podstawa projektu interakcji: [NN/g: Animation for Attention and Comprehension](https://www.nngroup.com/articles/animation-usability/) opisuje wykorzystanie ruchu do pokazania związku między działaniem a zmianą interfejsu oraz koszt powtarzalnych długich animacji. [MDN: prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion) dokumentuje obsługę preferencji ograniczenia ruchu. Konkretne czasy 180/220 ms są decyzją projektową do oceny, nie naukową gwarancją wyniku.

## Weryfikacja i cofnięcie

180 testów przechodzi, w tym blokada szybkich kliknięć, anulowanie opóźnionego przejścia, cytowanie faktycznej odpowiedzi, kolejność etapów w krótkiej i długiej ścieżce oraz warunki wyświetlania odliczania. Build i lint zmienionych plików przechodzą.

Stan przed zmianą: `e3031a8f5afda11a58676069daaae7d1ca3a05eb`, deployment `dpl_5AW1Uy6XApYJhSamTsuz4sXvgyyq`. Datowana kopia: `backup/result-v32-before-interactions_2026-09-19_19-34-47_UTC`. Publikacja dotyczy gałęzi podglądowej, bez podmiany produkcyjnej domeny.
