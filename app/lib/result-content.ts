// ── TREŚĆ STRONY WYNIKU jako SEKWENCJA PERSWAZJI (6 beatów) per archetyp ──
// Ton: insight + dźwignia (zablokowany potencjał, nie deficyt/strach). Zdania się kleją,
// zero „to nie X, to Y", zero siekania. Jedyna wartość dynamiczna = pct (100 - score).
// Cytat leada wchodzi osobno w beacie 6 (reframe.cytat). HiT-czysto, zero używek.

export interface ProtocolStep { title: string; detail: string; }
// ── EKSPERYMENT 7 DNI (Beat 5): jeden test powtarzany 7 dni, NIE 7 roznych nawykow ──
// durationLabel/afterLabel (P1-5): kontrakt czasu eksperymentu. Domyślnie "7 dni" / "Po 7 dniach szukasz".
// Testy nie-tygodniowe (weekend / najbliższe odchylenie) nadpisują je, żeby Beat 5/self-serve/Tier A były spójne.
export interface Experiment { headline: string; when: string; doLabel: string; doCheck: string; lookFor: string; example?: string; durationLabel?: string; afterLabel?: string; }
export interface ResultPack {
  heroLabel: string;      // podpis pod wielką liczbą {pct}%
  heroHeadline: string;
  heroSub: string;
  revealHeadline: string;
  revealCaption: string;
  mechHeadline: string;
  mechBody: string;
  mechPull: string;       // złota kursywa (analogia/punch)
  costNumber: string;     // wielka liczba beatu KOSZT
  costUnit: string;
  costBody: string;
  protocolHeadline: string;
  protocol: ProtocolStep[];  // 7 dźwigni
  metric: string;
  closeHeadline: string;
  closeBody: string;
  // ── PUNKT PĘKNIĘCIA + hand-raiser (beat 4) ──
  ppHeadline: string;   // reframe wzorca, BEZ zmyslonej godziny (truth gate)
  ppReveal: string;     // jak patrze na wynik: od czego bym zaczal (interpretacja, nie diagnoza)
  ppHook: string;       // jedno miejsce, które sprawdziłbym pierwsze (teaser + prefill DM)
  ppTag: string;        // krótka etykieta wzorca do wiadomości DM
  // ── v2.5: beat 1 (sytuacja, nie obietnica) + beat 4 (pierwszy ruch na 24h/7 dni) ──
  beat1Line: string;
  firstMove: string;
  endLine: string; // Beat 7 END EXPERIENCE: linia continuity per archetyp (silnik nadpisywany dynamicznie)
  experiment: Experiment; // Beat 5 (silnik_bez_paliwa nadpisywany dynamicznie per najmocniejsza domena)
}

export const RESULT_CONTENT: Record<string, ResultPack> = {
  wieczorny_odpad: {
    heroLabel: 'tyle Twojej formy blokuje jedno okno w tygodniu',
    ppHeadline: 'To, co widzisz wieczorem, najczęściej zaczyna się dużo wcześniej w ciągu dnia.',
    ppReveal: 'Dlatego samo pilnowanie wieczoru zwykle nie wystarcza. Kiedy patrzę na taki wynik, najpierw cofam się do tego, jak wyglądają Twoje popołudnia, bo tam najczęściej narasta to, co puszcza dopiero po zmroku.',
    ppHook: 'jak wyglądają Twoje popołudnia, między obiadem a kolacją',
    ppTag: 'wieczorny rozjazd',
    beat1Line: 'Najmocniejszy moment rozjazdu w Twoich odpowiedziach pojawia się wieczorem.',
    firstMove: 'U Ciebie jako pierwsze cofnąłbym taśmę kilka godzin przed wieczornym rozjazdem i sprawdził, w jakim stanie wtedy jesteś. Niżej masz prosty test na 7 dni.',
    endLine: 'U Ciebie zaczęliśmy od tego, co dzieje się przed wieczornym rozjazdem. W prowadzeniu za tydzień sprawdziłbym, czy test coś zmienił i co wydarzyło się dalej w tygodniu.',
    experiment: {
      headline: 'Przez tydzień cofnij taśmę, zanim wieczór zdąży się posypać.',
      when: '2-4 godziny przed oknem, w którym zwykle zaczyna Ci się rozjeżdżać.',
      doLabel: 'Sprawdź',
      doCheck: 'głód 0-10 · energia 0-10 · napięcie 0-10 · kiedy jadłeś ostatni normalny posiłek',
      lookFor: 'Co najczęściej pojawiało się, zanim wieczór puszczał.',
      example: '17:30 · głód 8 · energia 4 · napięcie 7 · ostatni posiłek 13:00',
    },
    heroHeadline: 'Domknij ten jeden dzień, a tydzień przestaje się sypać.',
    heroSub: 'Robisz swoje, pilnujesz jedzenia, a i tak stoi, bo wszystko sypie się w jednym oknie, którego nie podejrzewasz, i zaraz Ci je pokażę, co do godziny.',
    revealHeadline: 'Twój tydzień pęka w piątek o 22:00.',
    revealCaption: 'Poniedziałek do czwartku trzymasz się nieźle, a potem w piątek wieczorem wszystko się sypie i ciągnie za sobą cały weekend, więc ten jeden dzień kasuje robotę z pięciu.',
    mechHeadline: 'Wieczorny rozjazd rzadko zaczyna się dopiero wieczorem.',
    mechBody: 'Wieczór jest miejscem, w którym problem robi się widoczny. Z samych odpowiedzi nie wynika jeszcze, co dokładnie uruchamia go wcześniej. Dlatego cofnąłbym się o kilka godzin i sprawdził, co regularnie dzieje się przed tym oknem.',
    mechPull: 'Wieczór pokazuje skutek. Pierwszego sygnału szukamy kilka godzin wcześniej.',
    costNumber: '12', costUnit: 'dni miesięcznie, które wracają do Ciebie, kiedy zatkasz to okno',
    costBody: 'Trzy rozwalone wieczory w tygodniu robią dwanaście dni na pół mocy w miesiącu, a kiedy zamkniesz to jedno okno, te dni wracają razem z treningiem, który wreszcie odkłada efekty, i głową, która ciągnie równo do wieczora.',
    protocolHeadline: 'Przez 7 dni sprawdzasz tylko to jedno okno.',
    protocol: [
      { title: 'Rano: 10 minut światła w oczy', detail: 'W ciągu godziny po wstaniu wyjdź na balkon albo na krótki spacer. Poranne światło to sygnał, który ustawia wieczorny spadek kortyzolu, tego samego, który realnie Cię budzi, nie kawa. Bez niego rytm się rozjeżdża i wieczorem nie schodzisz.' },
      { title: 'Śniadanie: 30-40 g białka i tłuszcz', detail: '3-4 jajka zamiast płatków czy kanapki. Węgle na czczo podbijają cukier, a potem gwałtownie go zrzucają, i ten zjazd mózg czyta jako głód. Białko trzyma cukier płasko, więc po południu nie łapie Cię wilczy apetyt.' },
      { title: 'Ostatnia kawa do 14:00', detail: 'Kofeina schodzi z krwi do połowy dopiero po jakichś 6 godzinach. O 22:00 wciąż blokuje adenozynę: zasypiasz normalnie, ale głęboki, regeneracyjny sen siada. Rano jesteś zmęczony, więc znów kawa. Pętla.' },
      { title: 'Minimum 8 000 kroków dziennie', detail: 'Zwykłe chodzenie spala kortyzol i adrenalinę, nie dokładając stresu treningowego. Trening je podnosi, spacer ściąga w dół. Dlatego 8 000 kroków robi dla Twojego wieczoru więcej niż drugi trening.' },
      { title: 'Ostatni kęs 2 godziny przed snem', detail: 'Późne, ciężkie jedzenie podnosi temperaturę ciała i insulinę, a mózg do zaśnięcia potrzebuje spadku temperatury. Z pełnym żołądkiem śpisz płycej. Jeden wyjątek niżej.' },
      { title: '2 godziny przed snem: wolne białko i węgle', detail: '30-40 g twarogu albo kazeiny z garścią ryżu czy ziemniaka. To jest ten nieoczywisty ruch: białko daje tryptofan, a węgle przepychają go do mózgu, bo bez nich przegrywa na wejściu. Z tryptofanu powstaje serotonina, a potem melatonina. Mniej ciągnie do słodkiego i głębiej zasypiasz.' },
      { title: 'Sen: telefon poza sypialnią i magnez', detail: 'Telefon zostaw w innym pokoju na godzinę przed snem, bo sam ekran trzyma mózg w gotowości. Do tego magnez w formie glicynianu, nie tlenku (ten prawie się nie wchłania), 200-400 mg, który łagodnie wycisza układ nerwowy.' },
    ],
    metric: 'licz wieczory domknięte zgodnie z planem, celuj w 5 na 7',
    closeHeadline: 'Masz wszystko, czego potrzebujesz na najbliższy tydzień.',
    closeBody: 'Wiesz już dokładnie, co robić od jutra, a to więcej, niż ma większość facetów na sali. Tego, kto taki protokół zna, od tego, kto ma go realnie w ciele, dzieli jedno: ktoś, kto trzyma Cię na kursie przez pierwszy tydzień, kiedy jeszcze nic nie widać, i nie daje odpuścić, gdy głowa podpowiada, że jutro się nadrobi.',
  },

  weekend_reset: {
    heroLabel: 'tyle Twojej formy trzyma rozjechany rytm weekendu',
    ppHeadline: 'Weekend to dopiero część rachunku. Najwięcej kosztuje to, co zostaje po nim.',
    ppReveal: 'Dlatego pilnowanie samej soboty rzadko wystarcza. Przy takim wyniku najpierw patrzę na to, jak wygląda Twoje wejście w weekend i pierwszy poranek po nim, bo tam najczęściej rytm się rozjeżdża.',
    ppHook: 'jak wygląda Twój piątkowy wieczór i pierwszy poranek po weekendzie',
    ppTag: 'weekend, który zostaje na dłużej',
    beat1Line: 'Przez tydzień trzymasz rytm. Najczęściej rozjeżdża się dopiero na weekendzie i wraca do Ciebie na starcie kolejnego.',
    firstMove: 'U Ciebie jako pierwsze sprawdziłbym nie sam weekend, tylko czas, jaki zajmuje Ci powrót po pierwszym odstępstwie. Niżej pokażę Ci, jak to zmierzyć przez jeden weekend.',
    endLine: 'U Ciebie najważniejszy był czas powrotu. W prowadzeniu za tydzień sprawdziłbym, czy ogon weekendu się skrócił i co najbardziej wpływało na powrót.',
    experiment: {
      headline: 'Przez jeden weekend zmierz, jak szybko wracasz na tory.',
      when: 'Przy pierwszym momencie w weekendzie, kiedy wypadasz ze swojego rytmu.',
      doLabel: 'Zrób',
      doCheck: 'Nie czekaj na poniedziałek. Wróć do normy przy najbliższej decyzji: następny posiłek albo najbliższa okazja do ruchu.',
      lookFor: 'Ile godzin zwykle mija od odstępstwa do pierwszego powrotu na tory.',
      durationLabel: 'ten weekend', afterLabel: 'Po weekendzie szukasz', // P1-5: test weekendowy, nie 7-dniowy
    },
    heroHeadline: 'Ustaw jeden zegar, a pięć dni pracy wreszcie zostaje.',
    heroSub: 'Przez tydzień robisz swoje, jedzenie ogarnięte, a wynik i tak stoi, bo wszystko, co budujesz przez pięć dni, rozjeżdża się na styku weekendu i poniedziałku, i zaraz Ci pokażę, czemu wtorek schodzi na nadrabianiu.',
    revealHeadline: 'Twój tydzień pęka w weekend, a płacisz w poniedziałek.',
    revealCaption: 'Poniedziałek do piątku trzymasz rytm, pobudka o stałej porze i posiłki na czas, a potem w sobotę śpisz dłużej, w niedzielę jeszcze dłużej i kładziesz się grubo po północy, więc ciało dostaje sygnał, że zmieniłeś strefę czasową, i poniedziałek z wtorkiem schodzą na wracaniu na tory.',
    mechHeadline: 'Weekend nie kończy się w niedzielę.',
    mechBody: 'Kiedy w sobotę i niedzielę przesuwają się pory snu, jedzenia i regeneracji, wewnętrzny zegar dostaje sygnał zmiany rytmu. Poniedziałek i wtorek schodzą wtedy na wracaniu na tory, zanim znów złapiesz swoje tempo.',
    mechPull: 'Rozjechany weekend najczęściej ciągnie się jeszcze przez początek kolejnego tygodnia.',
    costNumber: '8–10', costUnit: 'dni miesięcznie, które odzyskujesz, kiedy weekend przestanie Cię cofać',
    costBody: 'Rozjechany weekend zabiera wysokie obroty na trzy kolejne dni, co w skali miesiąca robi z tego osiem do dziesięciu dni roboczych, a kiedy ustawisz rytm, wracają razem z mocniejszym treningiem i głową, która od poniedziałku jest z Tobą, zamiast dopiero dochodzić do siebie.',
    protocolHeadline: 'Siedem dźwigni na tydzień, po których weekend przestaje Cię cofać.',
    protocol: [
      { title: 'Pobudka o stałej porze, 7 dni w tygodniu', detail: 'Sobota i niedziela w oknie ±1 h od dnia roboczego. Ta jedna kotwica trzyma cały zegar w ryzach.' },
      { title: '10 minut światła w pierwszej godzinie', detail: 'Zaraz po wstaniu, najlepiej na dworze. Poranne światło ustawia wyrzut kortyzolu na właściwą godzinę.' },
      { title: 'Pierwszy posiłek o stałej porze', detail: 'W oknie 60 min od pobudki, 30–40 g białka. Jedzenie o tej samej porze dokręca zegar obwodowy w ciele.' },
      { title: '8 000+ kroków dziennie, też w weekend', detail: 'Ruch w ciągu dnia stabilizuje rytm i pogłębia sen. Weekend bez ruchu rozjeżdża go najszybciej.' },
      { title: 'Kofeina do 14:00', detail: 'Ostatnia kawa 8–9 h przed snem, bo kofeina siedzi w krwi długo i spłyca głęboką fazę.' },
      { title: 'Ekrany off 90 min przed snem', detail: 'Telefon poza sypialnią i przyciszone światło w domu sprzyjają wejściu melatoniny.' },
      { title: 'Drzemka 20 min, gdy weekend rozbił noc', detail: 'Między 13:00 a 15:00, nie dłużej. Spłaca dług energii, a nie psuje najbliższej nocy.' },
    ],
    metric: 'licz poranki z pobudką w oknie, celuj w 7 na 7',
    closeHeadline: 'Masz wszystko, żeby weekend zaczął pracować dla Ciebie.',
    closeBody: 'Wiesz już, co robić od jutra, tyle że w środę trening wypada o innej porze, w piątek ktoś proponuje wyjście, a w niedzielę budzik dzwoni i go klikasz, i zegar znów się rozjeżdża. Dlatego z facetami, których prowadzę, ustawiamy ten rytm pod ich tydzień, robotę i trening, a ja patrzę im na ręce przez ten pierwszy tydzień, aż weekend przestaje kasować formę.',
  },

  glowa_zajezdza: {
    heroLabel: 'tyle Twojej formy trzyma napięcie, które nie schodzi wieczorem',
    ppHeadline: 'Wieczór, w którym nie umiesz zejść z obrotów, to końcówka dnia, nie jego początek.',
    ppReveal: 'Dlatego samo wyciszanie wieczoru rzadko wystarcza. Przy takim wyniku najpierw patrzę na to, co trzyma Cię na wysokich obrotach po południu, bo tam najczęściej zaczyna się to, co wieczorem już tylko widać.',
    ppHook: 'co trzyma Cię na wysokich obrotach po południu i wczesnym wieczorem',
    ppTag: 'głowa, która nie schodzi z obrotów',
    beat1Line: 'Robotę dowozisz. Najczęściej problem zaczyna się wtedy, gdy po pracy głowa nie schodzi z obrotów.',
    firstMove: 'U Ciebie jako pierwsze sprawdziłbym moment przejścia z pracy do reszty dnia. Niżej masz prosty test, który pokaże, czy właśnie tam zostaje napięcie.',
    endLine: 'U Ciebie zaczęliśmy od przejścia z pracy do reszty dnia. W prowadzeniu sprawdziłbym, jak zmieniło się napięcie i co wydarzyło się dalej z jedzeniem, snem i treningiem.',
    experiment: {
      headline: 'Przez tydzień sprawdź, czy głowa potrafi skończyć pracę razem z Tobą.',
      when: 'Kiedy kończysz pracę albo ostatni blok, po którym zwykle zabierasz robotę do wieczora.',
      doLabel: 'Zrób',
      doCheck: '3-minutowe zamknięcie dnia: zapisz, co niedokończone i pierwszy ruch na jutro. Do tego napięcie 0-10 tuż po pracy i godzinę później.',
      lookFor: 'Czy napięcie realnie spada po zamknięciu dnia, czy siedzi z Tobą do wieczora.',
      example: '18:00 · napięcie 7 · 19:00 · napięcie 6',
    },
    heroHeadline: 'Naucz głowę schodzić z obrotów, a reszta idzie za nią.',
    heroSub: 'Robisz swoje, pilnujesz jedzenia, a i tak stoi, bo wszystko sypie się wieczorem, w głowie, i ciągnie za sobą następny dzień, więc zaraz Ci pokażę, o której godzinie się to włącza.',
    revealHeadline: 'Twój tydzień pęka codziennie o 22:00.',
    revealCaption: 'Rano i w pracy trzymasz, a po pracy napięcie nie schodzi i wieczorem siedzisz nakręcony, nie umiejąc zejść na luz, więc każdy taki wieczór podkrada Ci noc i rano wstajesz z mniejszym bakiem niż dzień wcześniej.',
    mechHeadline: 'Ciało dostaje resztki tego, co zostaje po głowie.',
    mechBody: 'Kiedy napięcie trzyma się do wieczora, organizm zostaje w trybie gotowości i sen robi się płytszy. Rano startujesz wtedy z mniejszym zapasem, mimo że zegar mówi, że spałeś tyle co zwykle.',
    mechPull: 'To, co czujesz wieczorem jako rozdrażnienie, jest zwykle końcówką całego dnia na wysokich obrotach.',
    costNumber: '6', costUnit: 'godzin głębokiej regeneracji, które odzyskujesz co tydzień',
    costBody: 'Każdy nakręcony wieczór podkrada Ci kawałek nocy, co w tydzień robi jakieś sześć godzin regeneracji, a kiedy nauczysz głowę schodzić z obrotów, te godziny wracają i naraz masz z czego trenować, ogarniać robotę i mieć jeszcze coś z wieczoru dla siebie.',
    protocolHeadline: 'Siedem ruchów na tydzień, z których każdy zdejmuje napięcie z wieczora.',
    protocol: [
      { title: 'Światło w oczy rano', detail: '10 minut dziennego światła w ciągu godziny od pobudki. Kotwiczy kortyzol wysoko rano, żeby wieczorem miał z czego zejść.' },
      { title: 'Twarde zamknięcie pracy', detail: 'O stałej porze wyłączasz powiadomienia i zapisujesz 3 rzeczy na jutro, żeby głowa dostała sygnał, że można zejść z obrotów.' },
      { title: '5 minut oddechu wieczorem', detail: 'Wydech dwa razy dłuższy niż wdech, przez 5 minut. Dłuższy wydech schładza układ nerwowy i wprowadza go w regenerację.' },
      { title: 'Kofeina do 14:00', detail: 'Ostatnia kawa najpóźniej o 14:00, bo kofeina podbija napięcie dokładnie wtedy, gdy ma opadać.' },
      { title: 'Telefon poza sypialnią', detail: 'Odkładasz go poza sypialnię na 60 minut przed snem, żeby mniej bodźca nakręcało głowę przed zaśnięciem.' },
      { title: 'Magnez albo glicyna', detail: 'Magnez glicynian 200–400 mg albo 3 g glicyny na 30–60 minut przed snem sprzyja szybszemu wyciszeniu i głębszej fazie.' },
      { title: 'Stała godzina pobudki', detail: 'Ta sama pora 7 dni w tygodniu reguluje cały rytm dobowy, łącznie z wieczornym zejściem.' },
    ],
    metric: 'licz wieczory, w których udało się zejść z obrotów, celuj w 5 na 7',
    closeHeadline: 'Masz wszystko, żeby wieczór wreszcie należał do Ciebie.',
    closeBody: 'Wiesz już, co robić od jutra, tyle że działa to dopiero, gdy trzymasz to codziennie przez tygodnie, a pierwszy ciężki dzień w pracy potrafi zmieść połowę tej listy. Dlatego w prowadzeniu 1:1 pilnuję tego rytmu, dobieram dźwignie pod Twój tydzień i nie daję Ci zejść z toru, kiedy głowa podpowiada, że jutro się nadrobi.',
  },

  wiedza_bez_wdrozenia: {
    heroLabel: 'tyle Twojej formy blokuje jeden brak: wykonanie',
    ppHeadline: 'Pierwszy gorszy dzień mówi o Twoim planie więcej niż pięć idealnych.',
    ppReveal: 'Przy takim wyniku sprawdziłbym przede wszystkim, co dzieje się po pierwszym odstępstwie. Jeśli jeden gorszy dzień łatwo zamienia się w kilka, plan nie ma dobrego trybu powrotu. I właśnie ten moment warto poprawić jako pierwszy.',
    ppHook: 'co dokładnie dzieje się w tym pierwszym dniu, w którym plan zaczyna się sypać',
    ppTag: 'plan, który pęka przy pierwszym gorszym dniu',
    beat1Line: 'Sporo już przeszedłeś i niejedno próbowałeś. Najczęściej problem pojawia się przy przełożeniu tego na tydzień, który nie jest idealny.',
    firstMove: 'U Ciebie jako pierwsze sprawdziłbym, co dzieje się po pierwszym odstępstwie od planu. Niżej testujesz nie idealny tydzień, tylko szybkość powrotu.',
    endLine: 'U Ciebie testujemy powrót po pierwszym odstępstwie. W prowadzeniu sprawdziłbym, czy Tryb Minimum skrócił czas powrotu i co wydarzyło się przy kolejnym gorszym dniu.',
    experiment: {
      headline: 'Przez tydzień nie licz potknięć. Zmierz czas powrotu.',
      when: 'Pierwszy moment, kiedy plan nie idzie tak, jak miał.',
      doLabel: 'Zrób',
      doCheck: 'Odpal Tryb Minimum przy najbliższej decyzji: najmniejszą sensowną wersję tego, co miało się wydarzyć. Bez nadrabiania i resetu tygodnia.',
      lookFor: 'Czy pojedyncze odstępstwo dalej zamienia się w kilka dni, czy udaje się wrócić tego samego dnia.',
    },
    heroHeadline: 'Dowieź jeden tydzień w całości, a wiedza wreszcie zamienia się w formę.',
    heroSub: 'Teorię masz opanowaną lepiej niż połowa trenerów, tylko po ciele tego nie widać ani grama, więc zaraz Ci pokażę, gdzie dokładnie ta wiedza wyparowuje, co tydzień, od miesięcy.',
    revealHeadline: 'Plan jest idealny do środy.',
    revealCaption: 'Poniedziałek i wtorek dowozisz co do minuty, bo plan jest świeży i napięty, a potem w środę wypada jeden trening albo jeden posiłek nie po planie i zamiast wrócić do dziewięćdziesięciu procent, kasujesz resztę tygodnia i odkładasz na od poniedziałku, więc pięć dni z siedmiu leci w błoto.',
    mechHeadline: 'Plan, który działa tylko w idealnym tygodniu, pęka przy pierwszym gorszym dniu.',
    mechBody: 'Kiedy plan nie ma wersji minimum, jeden gorszy dzień potrafi wywalić całość. Wtedy zamiast wrócić do osiemdziesięciu procent, najłatwiej przełożyć wszystko na kolejny czysty start, i tydzień leci od nowa.',
    mechPull: 'Najczęściej wszystko trzyma się do pierwszego dnia, w którym coś wypada z planu.',
    costNumber: '0', costUnit: 'tyle ruszyła forma mimo lat czytania',
    costBody: 'Policz godziny oddane podcastom, filmikom i układaniu idealnego splitu, spokojnie kilkaset przez ostatni rok, z których ani jedna nie weszła w sztangę ani w talerz, a wystarczy jeden tydzień dowieziony w całości, żeby ta cała wiedza pierwszy raz zaczęła się odkładać na ciele.',
    protocolHeadline: 'Siedem dni bez ani jednej nowej rzeczy do nauczenia się.',
    protocol: [
      { title: 'Zero nowej teorii przez 7 dni', detail: 'Żadnych filmików, artykułów, podcastów ani nowych planów. Na najbliższy tydzień wiesz już wystarczająco.' },
      { title: 'Trening 20 minut wbity w kalendarz', detail: 'Wersja minimum na konkretną godzinę, wpisana jak spotkanie biznesowe, którego nie przesuwasz.' },
      { title: 'Jedna liczba na koniec dnia, 1 albo 0', detail: 'Wieczorem zapisujesz jedną cyfrę: kotwica dnia domknięta czy nie, bez opisów i bez tłumaczeń.' },
      { title: 'Posiłek-kotwica o stałej porze', detail: 'Jeden posiłek dziennie o tej samej godzinie i w tym samym schemacie, gdy reszta dnia może się sypać.' },
      { title: 'Twardy dolny próg 8 000 kroków', detail: '8 000 to podłoga dnia, którą pilnujesz jak stanu konta i poniżej której już nie schodzisz.' },
      { title: 'Minimum w 100% bije przeładowany plan', detail: 'Kiedy dzień się sypie, tniesz plan do minimum i domykasz go co do kropki, bo serię dni na 1 broni się za każdą cenę.' },
      { title: '2-minutowy przegląd wieczorem', detail: 'Dwie minuty przed snem na to, co domknięte, co nie, i jedną rzecz na jutro, i zamykasz notatnik.' },
    ],
    metric: 'licz dni z domkniętą kotwicą, celuj w 5 na 7',
    closeHeadline: 'Masz komplet, którego nie kupisz kolejnym filmikiem.',
    closeBody: 'Wiesz już wszystko, co potrzebne na najbliższy tydzień, tyle że sam sobie jesteś sędzią, a mózg, który płaci Ci dopaminą za samo czytanie, nigdy nie wystawi Ci uczciwej jedynki ani zera. Na tym stoi prowadzenie 1:1: ktoś z zewnątrz codziennie odbiera od Ciebie tę cyfrę, trzyma serię i nie daje Ci schować się w kolejnym planie.',
  },

  silnik_bez_paliwa: {
    heroLabel: 'tyle Twojej formy trzymają trzy ciche wycieki naraz',
    ppHeadline: 'Nie widać tu jednego ostrego momentu, w którym się wywala. I dlatego tak trudno to złapać.',
    ppReveal: 'Przy takim wyniku nie szukam jednego winnego. Najpierw patrzę na to, która z tych kilku rzeczy ciągnie u Ciebie najmocniej, żeby zacząć od niej, a nie od wszystkiego naraz.',
    ppHook: 'która z tych kilku rzeczy ciągnie u Ciebie najmocniej: sen, stres czy pory posiłków',
    ppTag: 'kilka cichych wycieków naraz',
    beat1Line: 'Robisz swoje, a mimo to lecisz na pół mocy. Najczęściej nie ma tu jednego winnego, tylko kilka drobnych rzeczy naraz.',
    firstMove: 'Nie masz jednego ostrego pęknięcia. Najpierw odizolowałbym więc najmocniejszy sygnał w Twoim wyniku. Niżej masz test tylko dla tego jednego obszaru.',
    endLine: 'U Ciebie zaczęliśmy od jednego obszaru testowego. W prowadzeniu za tydzień sprawdziłbym, czy właśnie ten obszar rzeczywiście był najlepszym miejscem startu.',
    experiment: {
      headline: 'Przez tydzień testuj tylko najmocniejszy sygnał z Twojego wyniku.',
      when: 'Codziennie w tym samym momencie, przy tym jednym sygnale.',
      doLabel: 'Zrób',
      doCheck: 'Zamiast ruszać wszystko naraz, pilnujesz tylko jednej rzeczy i patrzysz, czy to zmienia resztę.',
      lookFor: 'Czy skupienie się na jednym obszarze realnie rusza cały tydzień.',
    },
    heroHeadline: 'Zepnij trzy dźwignie na jednym zegarze, a bak wreszcie się napełnia.',
    heroSub: 'Robisz swoje, jedzenie ogarnięte, a bak i tak świeci na rezerwie od rana, i nic nie wywala się z hukiem, więc trudno namierzyć, gdzie ucieka, ale zaraz Ci pokażę, co pod spodem sączy Ci formę każdego dnia.',
    revealHeadline: 'Twój tydzień sączy się po równo, siedem dni z rzędu.',
    revealCaption: 'Szukasz tego jednego dnia, w którym się wywaliło, i nie znajdujesz, bo strata rozkłada się równo po wszystkich siedmiu, a każdy dzień oddaje kawałek tak mały, że pojedynczo wygląda na nic, dopóki nie zsumujesz siedmiu i nie zobaczysz tygodnia na pół mocy.',
    mechHeadline: 'Kiedy nic nie wywala się z hukiem, wyciek łatwo przeoczyć.',
    mechBody: 'Płytszy sen, nierozładowany stres i posiłki o różnych porach każdego dnia oddają po kawałku. Osobno każda z tych rzeczy wygląda na drobiazg, więc łatwo machnąć ręką na wszystkie naraz.',
    mechPull: 'Efekt widać dopiero, kiedy zsumujesz cały tydzień, a nie pojedynczy dzień.',
    costNumber: '50', costUnit: '% mocy, które odzyskujesz, gdy zepniesz te trzy wycieki',
    costBody: 'Pół mocy przez jeden dzień nie robi różnicy, ale pół mocy przez trzydzieści dni z rzędu to cały miesiąc, w którym trening nie odkłada tego, co powinien, a kiedy zepniesz te trzy dźwignie na jednym zegarze, ta druga połowa wraca i pierwszy raz od dawna czujesz, że jedziesz na pełnym baku.',
    protocolHeadline: 'Siedem dźwigni na jednym zegarze, które odpalasz razem, od tego samego poranka.',
    protocol: [
      { title: 'Stała pobudka, 7 dni w tygodniu', detail: 'Ta sama godzina codziennie, też w weekend, w oknie ±30 minut. To wskazówka, pod którą podłącza się reszta zegara.' },
      { title: 'Pierwszy posiłek w ciągu godziny od wstania', detail: '30–40 g białka do 60 minut po pobudce, cztery jajka albo duży skyr, jako sygnał dla ciała, że dzień ruszył na serio.' },
      { title: '10 minut na dworze zaraz po wstaniu', detail: 'Światło dzienne i ruch, choćby spacer wokół bloku, ustawiają rytm dobowy i wyciszają melatoninę na dzień.' },
      { title: 'Minimum 8 000 kroków dziennie', detail: 'W ciągu dnia, nie na siłowni, bo rozładowują napięcie, którego trening trzy razy w tygodniu sam nie zdejmie.' },
      { title: 'Ostatnia kawa do 14:00', detail: 'Kofeina siedzi w krwi 6–8 godzin, więc kawa o 17:00 spłyca sen, choć zasypiasz normalnie, i rano czujesz się jak po nieprzespanej nocy.' },
      { title: '3 posiłki o stałych porach', detail: 'Śniadanie, obiad i kolacja w podobnych oknach każdego dnia to druga wskazówka zegara, zaraz po pobudce.' },
      { title: 'Telefon za drzwiami, magnez do łóżka', detail: 'Telefon ładuje się w innym pokoju, a magnez glicynian 200–400 mg albo 3 g glicyny na 30–60 minut przed snem pogłębia fazy, z których się regenerujesz.' },
    ],
    metric: 'licz dni z co najmniej trzema fundamentami odhaczonymi, celuj w 5 na 7',
    closeHeadline: 'Masz wszystko, żeby wreszcie ruszyć z pełnego baku.',
    closeBody: 'Wiesz już, co robić od jutra, tyle że wszystkie siedem dźwigni rusza naraz i przez pierwsze dni jeszcze nic nie widać, a wtedy głowa najłatwiej podpowiada, że to nic nie daje. Zegar biologiczny łapie rytm dopiero po dziesięciu, czternastu dniach, więc w prowadzeniu 1:1 trzymam Cię na kursie właśnie przez ten tydzień, czytam Twoje liczby zamiast wymówek i pilnuję, aż zegar zacznie oddawać formę.',
  },
};

export function packFor(key: string): ResultPack {
  return RESULT_CONTENT[key] || RESULT_CONTENT.wieczorny_odpad;
}

// ── EKSPERYMENT per DOMENA — dla silnik_bez_paliwa: izoluj TYLKO najmocniejszy sygnal (worstW z page.tsx),
//    nie naprawiaj 4 domen naraz. Klucze = labele catScores: Sen/Stres/Żywienie/Weekend/Trening/Głowa. ──
export const DOMAIN_EXPERIMENT: Record<string, Omit<Experiment, 'headline'>> = {
  Sen: { when: 'Wieczorem, przez cały tydzień.', doLabel: 'Zrób', doCheck: 'Kładź się o tej samej porze, resztę zostaw możliwie podobną.', lookFor: 'Czy stała pora snu zmienia to, jak wstajesz rano.' },
  Stres: { when: 'Po pracy, przy przejściu do reszty dnia.', doLabel: 'Zrób', doCheck: '3-minutowe zamknięcie dnia. Do tego napięcie 0-10 tuż po pracy i godzinę później.', lookFor: 'Czy napięcie spada po zamknięciu, czy siedzi z Tobą do wieczora.', example: '18:00 · napięcie 7 · 19:00 · napięcie 6' },
  'Głowa': { when: 'Po pracy, przy przejściu do reszty dnia.', doLabel: 'Zrób', doCheck: '3-minutowe zamknięcie dnia. Do tego napięcie 0-10 tuż po pracy i godzinę później.', lookFor: 'Czy napięcie spada po zamknięciu, czy siedzi z Tobą do wieczora.', example: '18:00 · napięcie 7 · 19:00 · napięcie 6' },
  'Żywienie': { when: 'Wieczorem, przy pierwszym sięgnięciu po coś poza planem.', doLabel: 'Zrób', doCheck: 'Zanim sięgniesz, zapisz, co działo się w ostatnich dwóch godzinach.', lookFor: 'Co najczęściej poprzedza sięgnięcie.' },
  Weekend: { when: 'Przy pierwszym odstępstwie w weekendzie.', doLabel: 'Zrób', doCheck: 'Wróć przy najbliższej normalnej decyzji, bez czekania na poniedziałek.', lookFor: 'Ile godzin zajmuje powrót.' },
  Trening: { when: 'Pierwszy dzień, w którym trening wypada.', doLabel: 'Zrób', doCheck: 'Odpal wersję minimum przy najbliższej okazji.', lookFor: 'Czy minimum utrzymuje serię.' },
};
// truth gate: 'clear' = jedna domena realnie wybija sie w dol, 'tied' = remis na minimum,
// 'neutral' = wszystkie podobnie zdrowe. Tie-break i tak wybiera 1 domene do eksperymentu,
// ale copy NIE moze mowic „najmocniejszy sygnal", jesli to nie jest prawda.
export type WorstState = 'clear' | 'tied' | 'neutral';
export function silnikExperiment(domainLabel: string, state: WorstState = 'clear'): Experiment {
  const base = DOMAIN_EXPERIMENT[domainLabel] || DOMAIN_EXPERIMENT.Sen;
  const headline =
    state === 'neutral' ? `Nie widać domeny, która wyraźnie ciągnie wynik w dół. Zacznij od jednego obszaru testowego: ${domainLabel}.` :
    state === 'tied' ? `Nie ma jednego obszaru, który wybija się ponad resztę. Na początek testuj tylko jeden: ${domainLabel}.` :
    `Nie masz jednego ostrego pęknięcia. Przez tydzień testuj tylko najmocniejszy sygnał: ${domainLabel}.`;
  return { ...base, headline };
}
export function silnikEndLine(domainLabel: string): string {
  return `U Ciebie zaczęliśmy od jednego obszaru testowego: ${domainLabel}. W prowadzeniu za tydzień sprawdziłbym, czy właśnie ten obszar rzeczywiście był najlepszym miejscem startu.`;
}
export function silnikBeat4(domainLabel: string, state: WorstState = 'clear'): string {
  if (state === 'neutral') return `Nie widać jednej domeny, która wyraźnie ciągnie wynik w dół. Zaczniemy więc od jednego obszaru testowego: ${domainLabel}, żeby nie zmieniać kilku rzeczy naraz. Niżej masz test tylko dla tego obszaru.`;
  if (state === 'tied') return `Nie ma tu jednego obszaru, który wybija się wyraźnie ponad resztę. Żeby nie ruszać kilku rzeczy naraz, na początek odizolowałbym ${domainLabel} i sprawdził tylko ten jeden obszar. Niżej masz test.`;
  return `Nie masz jednego ostrego pęknięcia. Najpierw odizolowałbym więc najmocniejszy sygnał w Twoim wyniku: ${domainLabel}. Niżej masz test tylko dla tego jednego obszaru.`;
}

// ── WERDYKT 3-TIER (uczciwy routing) ──
// Ciezkosc liczona z domen + eseju (page.tsx), NIE z intencji zakupu. {leak} podstawiany runtime.
// A = git (zero pushu 1:1), B = jeden wyciek (miekki most), C = potrzebuje pomocy (jasne 1:1).
export interface TierVerdict {
  kicker: string;
  headline: string;
  body: string;      // {leak} -> nazwa najslabszej domeny
  ctaKind: 'none' | 'soft' | 'hard';
  ctaLabel?: string;
  shareLine?: string;
  secondary?: string;
}
export const TIER_VERDICTS: Record<'A' | 'B' | 'C', TierVerdict> = {
  A: {
    kicker: 'Szczerze, gdzie jesteś',
    headline: 'Trzymasz to sam i widać to po odpowiedziach.',
    body: 'Twój tydzień się klei. Najsłabszy jest {leak}, ale jeszcze nie krwawi. Weź ten protokół, dopilnuj tego jednego miejsca i idź dalej sam, bo dasz radę. Te 168 godzin rozgrywasz nieźle, a jakbyś kiedyś chciał podkręcić to o poziom wyżej, wiesz gdzie mnie znaleźć.',
    ctaKind: 'none',
    shareLine: 'Znasz kogoś, kto się w tym topi? Podeślij mu ten test, jemu przyda się bardziej niż Tobie.',
  },
  B: {
    kicker: 'Szczerze, gdzie jesteś',
    headline: 'Masz jeden wyciek i to on trzyma resztę.',
    body: 'Baza jest dobra, ale {leak} przecieka i ciągnie za sobą cały tydzień. Te parę godzin, na których myślisz, że robisz formę, nie przegrywa. Przegrywa ten jeden dzień przez pozostałe ze 168. Da się go zatkać samemu, tylko sam wiesz, jak to się kończy po trzecim gorszym dniu.',
    ctaKind: 'soft',
    ctaLabel: 'Zobacz, jak zatykam to z facetami 1:1 →',
    secondary: 'Ruszysz sam i utkniesz po dwóch tygodniach? Napisz, podpowiem.',
  },
  C: {
    kicker: 'Szczerze, gdzie jesteś',
    headline: 'Zajeżdża Cię cały tydzień, nie jeden dzień.',
    body: 'Kilka rzeczy nakręca się naraz i sam po tylu podejściach wiesz, że nie chodzi o wiedzę. Nikt Ci tego nie ustawił na te 168 godzin, w których realnie robi się forma. Tu ma sens, żeby ktoś przeszedł to z Tobą, zamiast żebyś znów zaczynał sam od poniedziałku.',
    ctaKind: 'hard',
    ctaLabel: 'Zobacz, jak przeprowadzam przez to 1:1 →',
  },
};
