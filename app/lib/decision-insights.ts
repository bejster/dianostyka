import type { Answers, Question } from './decision-diagnostic';

export interface Insight {
  title: string; explanation: string; trap: string; actionTitle?: string;
  action: string; observe: string; yes: string; no: string;
}
const CONTEXT: Record<string, { title: string; rows: [string, string][] }> = {
  'training:work': { title: 'Co się stało z pracą tego dnia?', rows: [['unexpected', 'Doszło coś pilnego, czego wcześniej nie było.'], ['extra', 'Dokładałem kolejne rzeczy, choć mogły poczekać.'], ['overlap', 'Już rano było widać, że wszystko się nie zmieści.']] },
  'food:meal': { title: 'Co stało się z wcześniejszym posiłkiem?', rows: [['access', 'Nie miałem jedzenia ani gdzie go szybko kupić.'], ['work', 'Jedzenie było, ale ciągle odkładałem przerwę.'], ['restrict', 'Celowo zjadłem mniej, żeby trzymać dietę.']] },
  'sleep:screen': { title: 'Dlaczego zostałeś przy ekranie?', rows: [['own', 'To był pierwszy moment dnia tylko dla mnie.'], ['auto', 'Nawet nie zauważyłem, ile czasu minęło.'], ['awake', 'Nie mogłem zasnąć, więc sięgnąłem po telefon.']] },
  'training:tired': { title: 'Kiedy poczułeś to zmęczenie?', rows: [['morning', 'Już po przebudzeniu.'], ['end', 'Dopiero po całym dniu obowiązków.'], ['start', 'Głównie kiedy miałem zacząć. Po ruszeniu zwykle jest lepiej.']] },
};
export function getContextQuestion(scene: string, before: string): Question | undefined {
  const item = CONTEXT[`${scene}:${before}`];
  if (!item) return;
  return { id: 'context', title: item.title, hint: 'Wybierz to, co pasuje do tego dnia.',
    job: 'Rozróżnić konkurencyjne wyjaśnienia tej samej sceny.', downstream: 'Zmienia miejsce interwencji: dostępność, granica, zakres lub obserwacja; nie tylko podpis wyniku.',
    options: [...item.rows, ['unknown', 'Nie pamiętam albo było inaczej.']].map(([id, label]) => ({ id, label })) };
}
function I(title: string, explanation: string, trap: string, action: string, observe: string, yes: string, no: string): Insight {
  return { title, explanation, trap, action, observe, yes, no };
}
const INSIGHTS: Record<string, Insight> = {
  "training:work:unexpected": I(
    "Coś pilnego zajęło Ci czas na trening.",
    "Tego zadania wcześniej nie było w planie. Warto sprawdzić, ile treningu dało się jeszcze zrobić po tej zmianie.",
    "Nowa rozpiska ćwiczeń nadal zostawia pytanie: co robisz, kiedy nagle masz mniej czasu?",
    "Przed następnym treningiem wybierz krótszy fragment swojego planu. Ustal, przy jakim opóźnieniu na niego przechodzisz. Jeśli nawet on się nie zmieści, wybierz inny dostępny termin.",
    "Ile czasu zostało po pilnej sprawie? Czy udało się w nim zrobić wybrany fragment?",
    "Jeśli się zmieścił, masz gotowy wariant na kolejny dzień z taką zmianą.",
    "Jeśli zabrakło czasu nawet na niego, sprawdź inny termin. Dalsze skracanie może już niczego nie rozwiązać."),
  "training:work:extra": I(
    "Dokładałeś zadania, choć mogły poczekać.",
    "Tak opisałeś końcówkę pracy. Sprawdziłbym moment, w którym bierzesz kolejną rzecz, mimo że miałeś już kończyć.",
    "Skrócony trening też może wypaść, jeśli odzyskany czas oddasz kolejnemu zadaniu.",
    "Przed kolejnym treningiem wybierz ostatnie zadanie w pracy. Gdy wpadnie następne, zapisz, kiedy je zrobisz. Sprawdź, czy tym razem kończysz na tym, co ustaliłeś.",
    "Co chciałeś jeszcze zrobić przed wyjściem? Czy mogło poczekać i czy trening się odbył?",
    "Jeśli udało się wyjść i zrobić trening, powtórz to przy następnym dniu pracy.",
    "Jeśli nowe zadanie jednak było pilne, sprawdź termin treningu po tej zmianie. Samo postanowienie wyjścia wcześniej nie wystarczy."),
  "training:work:overlap": I(
    "Już rano było za dużo rzeczy na jeden dzień.",
    "Zaznaczyłeś, że obowiązki i trening od początku się nie mieściły. W takim dniu warto sprawdzić, z czego konkretnie możesz zwolnić czas.",
    "Wpisanie treningu w kalendarz niczego nie przesuwa z pozostałych obowiązków.",
    "Policz pracę, dojazd, sprawy w domu i trening. Wybierz, co przesuniesz albo skrócisz, żeby trening się zmieścił. Jeśli nic nie może ustąpić, poszukaj innego terminu.",
    "Co przesunąłeś? Czy ten czas nadal był wolny, gdy miałeś zacząć trening?",
    "Jeśli udało się zrobić miejsce, uwzględniaj dojazd i obowiązki przy kolejnych terminach.",
    "Jeśli coś później zajęło ten czas, zapisz co. To będzie inna przeszkoda niż zbyt ciasny plan od samego rana."),
  "training:family": I(
    "W porze treningu ktoś potrzebował Cię w domu.",
    "Wskazałeś sprawę rodzinną albo opiekę nad kimś. Trzeba sprawdzić, czy przy kolejnym terminie rzeczywiście będziesz mógł wyjść.",
    "Godzina wolna w kalendarzu może nadal być godziną, w której ktoś na Tobie polega.",
    "Przed kolejnym treningiem ustal, kto zajmie się obowiązkami podczas Twojej nieobecności. Jeśli nie masz takiej pomocy, wybierz termin, w którym możesz ćwiczyć bez niej.",
    "Czy mogłeś wyjść o ustalonej porze? Co jeszcze wymagało Twojej obecności?",
    "Jeśli to pomogło, ustalaj dostępność przed wpisaniem kolejnego treningu.",
    "Jeśli pomoc nie była dostępna, sprawdź inne miejsce lub termin treningu. Uwzględnij opiekę w planie."),
  "training:no_short": I(
    "Na cały trening zabrakło czasu.",
    "Zostało go trochę, ale nie miałeś ustalonej krótszej wersji. Możesz sprawdzić, czy przygotowanie jej wcześniej coś zmieni.",
    "W ciasnym dniu wybieranie ćwiczeń od nowa dokłada jeszcze jedną decyzję przed startem.",
    "Wybierz z obecnego planu znany fragment, który możesz zrobić przy mniejszej ilości czasu. Zapisz go obok pełnego treningu i użyj, gdy całość się nie zmieści.",
    "Czy udało się zrobić ten fragment w czasie, który został?",
    "Jeśli tak, zachowaj go na kolejny dzień, w którym czasu będzie mniej.",
    "Jeśli nawet ten fragment się nie zmieścił, wróć do terminu treningu. Sam zakres może nie być główną przeszkodą."),
  "training:tired:morning": I(
    "Byłeś zmęczony już po przebudzeniu.",
    "To zaczęło się przed porą treningu. Sam quiz nie ustali przyczyny, ale możesz sprawdzić, czy podobnie czujesz się także w dni bez ćwiczeń.",
    "Oceniając sam wieczorny trening, pomijasz to, jak czułeś się od rana.",
    "Przy kolejnym takim dniu zapisz, kiedy spałeś i jak czułeś się po wstaniu. Porównaj też dzień bez treningu.",
    "Czy zmęczenie wraca także w dni bez ćwiczeń, mimo zwykłego odpoczynku?",
    "Jeśli wraca, zachowaj ten zapis do dalszej oceny. Powtarzające się zmęczenie warto omówić z lekarzem.",
    "Jeśli rano czujesz się dobrze, a zmęczenie pojawia się później, przyjrzyj się temu, co dzieje się w ciągu dnia."),
  "training:tired:end": I(
    "Na trening zabrakło Ci siły po całym dniu.",
    "Zaznaczyłeś, że zmęczenie pojawiło się po obowiązkach. Sprawdziłbym, czy ten sam trening łatwiej zacząć wcześniej.",
    "Samo wolne miejsce wieczorem nie mówi, ile będziesz miał wtedy siły.",
    "Wybierz dzień, w którym możesz zrobić swój trening przed ostatnimi obowiązkami. Zostaw ten sam zakres. Jeśli nie ma takiego terminu, zapisz to i nie skracaj snu na tę próbę.",
    "Czy wcześniejszy termin był możliwy? Czy łatwiej było zacząć?",
    "Jeśli tak, uwzględnij tę porę przy planowaniu następnego treningu.",
    "Jeśli zmiana pory nic nie dała, sprawdź obciążenie dnia i zakres treningu. To porównanie nie ustala przyczyny zmęczenia."),
  "training:tired:start": I(
    "Najtrudniej jest Ci zacząć trening.",
    "Sam zaznaczyłeś, że po ruszeniu zwykle jest lepiej. Warto sprawdzić, czy tak będzie również przy następnej okazji.",
    "Myśląc od razu o całym treningu, trudno oddzielić niechęć do startu od zmęczenia podczas ćwiczeń.",
    "Przygotuj pierwszy znany element rozgrzewki. Kiedy go zrobisz, oceń, czy masz siłę i chęć kontynuować swój trening.",
    "Czy po rozgrzewce coś się zmieniło? Jak czułeś się dalej?",
    "Jeśli rozgrzewka ułatwiła start, przygotuj ją tak samo przed kolejnym treningiem.",
    "Jeśli nadal jesteś zmęczony, nie musisz kończyć treningu dla tej próby. Uwzględnij odpoczynek i obciążenie dnia."),
  "food:meal:access": I(
    "Wcześniej wypadł posiłek, bo nie miałeś co zjeść.",
    "Potem wieczorem zjadłeś więcej, niż chciałeś. Sprawdź, jak wygląda podobny dzień, kiedy ten wcześniejszy posiłek jest dostępny.",
    "Postanowienie, że wieczorem zjesz mniej, zostawia tę wcześniejszą przerwę w jedzeniu.",
    "Na kolejny taki dzień wybierz zwykły posiłek, który zabierzesz, albo sprawdź, gdzie kupisz go o potrzebnej porze.",
    "Udało się zjeść wcześniej? Porównaj głód i jedzenie wieczorem.",
    "Jeśli zauważysz różnicę, powtórz próbę w podobnym dniu pracy.",
    "Jeśli zjadłeś wcześniej, a wieczór wyglądał tak samo, sprawdź, co wydarzyło się tuż przed wieczornym jedzeniem."),
  "food:meal:work": I(
    "Miałeś jedzenie, ale odkładałeś przerwę.",
    "Dlatego sprawdziłbym, co dzieje się, gdy masz odejść od pracy i zjeść. Przygotowany posiłek już był, a mimo to wypadł.",
    "Kolejne przygotowane pudełko może zostać w lodówce z tego samego powodu.",
    "Połącz przerwę na jedzenie z końcem konkretnego bloku pracy. Przy następnej takiej okazji zjedz przed rozpoczęciem kolejnej sprawy, jeśli możesz wtedy zrobić przerwę.",
    "Czy udało Ci się zjeść? Co chciało zająć ten czas i jak wyglądał głód wieczorem?",
    "Jeśli udało się zjeść i wieczorem było inaczej, sprawdź tę samą przerwę w kolejnym podobnym dniu.",
    "Jeśli obowiązki nie pozwoliły odejść od pracy, najpierw trzeba ustalić dostępną przerwę. Samo przypomnienie jej nie zapewni."),
  "food:meal:restrict": I(
    "Wcześniej zjadłeś mniej, żeby trzymać dietę.",
    "Wieczorem zjadłeś więcej, niż chciałeś. Warto sprawdzić, czy ten ciąg powtórzy się także po Twoim zwykłym wcześniejszym posiłku.",
    "Jeszcze mniejszy posiłek następnego dnia powtórzyłby rzecz, którą właśnie chcesz sprawdzić.",
    "Przy podobnym dniu zjedz swój zwykły wcześniejszy posiłek bez ograniczania go w ramach nadrabiania. Jeśli masz zalecenia żywieniowe od specjalisty, trzymaj się ich.",
    "Jak wyglądał głód wieczorem? Co jeszcze działo się wtedy przy jedzeniu?",
    "Jeśli zauważysz różnicę, porównaj kolejny podobny dzień przed wyciąganiem wniosku.",
    "Jeśli było tak samo, sam wcześniejszy posiłek nie wyjaśnia sytuacji. Przyjrzyj się też napięciu i przebiegowi wieczora."),
  "food:no_food": I(
    "Po pracy musiałeś jeszcze wymyślić, co zjeść.",
    "Zaznaczyłeś, że nic nie było przygotowane. Sprawdź, czy wcześniejszy wybór posiłku zmieni to, jak jesz po powrocie.",
    "Znajomość zasad jedzenia nie zapewnia posiłku pod ręką po pracy.",
    "Przed końcem pracy wybierz, co zjesz po powrocie. Sprawdź, czy masz składniki albo gdzie kupisz ten posiłek.",
    "Czy jedzenie było dostępne? Jak wyglądał wieczór, kiedy nie musiałeś już szukać posiłku?",
    "Jeśli to pomogło, wybierz jedzenie przed końcem pracy również przy następnej okazji.",
    "Jeśli posiłek czekał, a wieczór wyglądał tak samo, sprawdź, co działo się bezpośrednio przed jedzeniem."),
  "food:tension": I(
    "Przy jedzeniu mogłeś wreszcie zrobić przerwę.",
    "Tak opisałeś tę chwilę po napiętym dniu. Warto sprawdzić, czy potrzebowałeś wtedy również odpoczynku.",
    "Jeśli to jedyna przerwa w dniu, zmiana samego jedzenia zostawia sprawę odpoczynku otwartą.",
    "Przy kolejnej takiej chwili zauważ, czy jesteś głodny i czego jeszcze potrzebujesz. Zjedz, jeśli jesteś głodny. Sprawdź, czy możesz też odpocząć po skończonym posiłku.",
    "Czy potrzeba przerwy została, gdy już zjadłeś?",
    "Jeśli tak, wybierz dostępną chwilę odpoczynku przy następnym podobnym wieczorze.",
    "Jeśli chodziło przede wszystkim o głód, przyjrzyj się wcześniejszym posiłkom. Nie trzeba dopisywać emocjonalnej przyczyny."),
  "food:social": I(
    "Zjadłeś więcej podczas spotkania.",
    "Samo wyjście nie mówi jeszcze, czy trzeba coś zmieniać. Sprawdź, co wydarzyło się z jedzeniem po spotkaniu.",
    "Jedno wyjście nie wystarcza do ocenienia całego tygodnia.",
    "Po kolejnym spotkaniu wróć do zwykłego posiłku przy najbliższej okazji. Zauważ, czy wyjście zmieniło też to, co jadłeś później.",
    "Skończyło się na jednym spotkaniu czy zmieniły się również kolejne posiłki?",
    "Jeśli wróciłeś do swojego rytmu, uwzględnij to przy ocenie całej sytuacji.",
    "Jeśli zmieniły się też kolejne posiłki, sprawdź pierwszą decyzję po wyjściu. Zacznij od niej, zanim ograniczysz spotkania."),
  "sleep:screen:own": I(
    "Dopiero wieczorem miałeś chwilę dla siebie.",
    "Tak opisałeś czas przy ekranie. Sprawdziłbym, czy nadal chcesz go przedłużać, kiedy masz trochę wolnego wcześniej.",
    "Zakaz telefonu sam nie tworzy innej chwili bez obowiązków.",
    "Wybierz dostępną chwilę dla siebie wcześniej w ciągu dnia. Ty decydujesz, co z nią zrobisz. Wieczorem sprawdź, czy nadal tak samo trudno skończyć oglądanie.",
    "Udało Ci się mieć tę chwilę? Jak potem kończyłeś wieczór?",
    "Jeśli łatwiej było skończyć oglądanie, sprawdź to w kolejnym dniu z czasem dla siebie.",
    "Jeśli nic się nie zmieniło, zobacz, co trzymało Cię przy ekranie w chwili, gdy chciałeś już kończyć."),
  "sleep:screen:auto": I(
    "Przy ekranie nie zauważyłeś, ile czasu minęło.",
    "Możesz sprawdzić, co się stanie, kiedy wybierzesz moment końca jeszcze przed oglądaniem.",
    "Postanowienie „dzisiaj krócej” nie określa, kiedy kończysz.",
    "Przed oglądaniem wybierz moment, w którym kończysz, na przykład koniec odcinka. Kiedy nadejdzie, zauważ, czy wyłączasz ekran, czy zaczynasz coś następnego.",
    "Czy zauważyłeś ten moment? Co zrobiłeś i kiedy poszedłeś do łóżka?",
    "Jeśli to pomogło, wybierz koniec również przed następnym oglądaniem.",
    "Jeśli wiedziałeś, że czas kończyć, a oglądałeś dalej, sprawdź, po co chciałeś zostać. Samo pilnowanie czasu może nie wystarczyć."),
  "sleep:screen:awake": I(
    "Telefon pojawił się po trudności z zaśnięciem.",
    "Ta kolejność zmienia to, czemu warto się przyjrzeć. Trudność ze snem zaczęła się, zanim wziąłeś telefon.",
    "Samo odłożenie telefonu nie wyjaśni, co działo się wcześniej.",
    "Przy następnej takiej nocy zapisz, kiedy się położyłeś, kiedy wziąłeś telefon i co działo się pomiędzy. Zauważ też noce bez telefonu.",
    "Czy trudność z zaśnięciem znów była pierwsza? Jak czułeś się następnego dnia?",
    "Jeśli to się powtarza, zachowaj zapis i omów trudności ze snem ze specjalistą.",
    "Jeśli tym razem najpierw pojawił się ekran, zapisz tę kolejność. To inna sytuacja niż ta, którą opisałeś wcześniej."),
  "sleep:work": I(
    "Jeszcze przed snem dokańczałeś pracę.",
    "Sprawdziłbym, co dzieje się przy ostatnim zadaniu. Dopóki trwa praca, planowana pora snu może się przesuwać razem z nią.",
    "Przypomnienie o śnie nie kończy zadania, którym nadal się zajmujesz.",
    "Wybierz ostatnie zadanie na dziś. Pozostałe sprawy zapisz wraz z tym, od czego zaczniesz jutro. Sprawdź, czy po wybranym zadaniu zamykasz pracę.",
    "Co chciałeś jeszcze dokończyć? Kiedy skończyłeś pracę i poszedłeś do łóżka?",
    "Jeśli zapis ułatwił skończenie pracy, powtórz go na koniec następnego dnia.",
    "Jeśli musiałeś pracować dalej, przyjrzyj się terminom i obowiązkom. Zapis na jutro sam nie zmniejsza ich liczby."),
  "sleep:family": I(
    "Obowiązki w domu przesunęły Ci sen.",
    "Warto sprawdzić ostatnią rzecz przed pójściem do łóżka. Być może da się zrobić ją wcześniej albo podzielić z kimś.",
    "Sztywna godzina snu nie usuwa obowiązku, który nadal trzeba wykonać.",
    "Zapisz ostatni obowiązek przed snem. Sprawdź, czy możesz zrobić go wcześniej lub z czyjąś pomocą. Ustal tę pomoc, zanim na niej oprzesz plan.",
    "Co przesunęło sen? Czy był inny dostępny sposób wykonania tej rzeczy?",
    "Jeśli znalazłeś taki sposób, sprawdź go przy następnym podobnym wieczorze.",
    "Jeśli tego obowiązku nie da się przesunąć, uwzględnij go przy planowaniu snu. Samo wcześniejsze postanowienie nie zmienia warunków."),
  "sleep:thoughts": I(
    "W łóżku nadal myślałeś o sprawach z dnia.",
    "Tu warto przyjrzeć się kończeniu tych spraw. Samo wcześniejsze położenie się może pozostawić te same myśli.",
    "Pora wejścia do łóżka nie pokazuje, kiedy udało Ci się zasnąć.",
    "Przed końcem dnia zapisz niedokończone sprawy i to, od czego zaczniesz przy każdej z nich. Zauważ, czy później wracają te same myśli.",
    "Czy zapis coś zmienił? Które sprawy nadal wracały w łóżku?",
    "Jeśli pomogło, powtórz taki zapis przed końcem kolejnego dnia.",
    "Jeśli nie pomogło, ten sposób nie wystarczył. Powtarzające się trudności ze snem omów ze specjalistą."),
  "energy:short_sleep": I(
    "Przed trudniejszym dniem spałeś krócej.",
    "To daje punkt do porównania. Sprawdź podobny dzień pracy po zwykłej dla Ciebie nocy, zanim przypiszesz trudności ze skupieniem jednej przyczynie.",
    "Kolejny sposób na koncentrację nie pokaże, jak pracujesz po zwykłej nocy.",
    "Porównaj podobny dzień pracy po nocy o zwykłej długości. Zapisz sen, pobudkę i moment, od którego trudniej było się skupić.",
    "Czy trudność wróciła o podobnej porze? Czy miałeś podobną ilość pracy?",
    "Jeśli widzisz różnicę, sprawdź kolejną okazję przed uznaniem snu za całe wyjaśnienie.",
    "Jeśli było tak samo, przyjrzyj się przebiegowi pracy i przerwom. Utrzymujące się dolegliwości wymagają osobnej oceny."),
  "energy:meal": I(
    "Przesunąłeś posiłek, bo trwała praca.",
    "W tym dniu trudno było też utrzymać skupienie. Możesz porównać podobną pracę po posiłku, bez zakładania z góry przyczyny.",
    "Sama kolejność zdarzeń nie dowodzi, że jedzenie wyjaśnia trudność ze skupieniem.",
    "Przed podobnym blokiem pracy zadbaj o zwykły posiłek i czas, żeby go zjeść. Zapisz, kiedy później pojawiła się trudność ze skupieniem.",
    "Udało się zjeść? Czy skupienie pogorszyło się w podobnym momencie?",
    "Jeśli widzisz różnicę, powtórz porównanie przy podobnej ilości pracy.",
    "Jeśli było tak samo, sprawdź też pozostałe różnice między tymi dniami. Nie zmieniaj dalej jedzenia na podstawie samego quizu."),
  "energy:no_break": I(
    "Przed spadkiem skupienia długo pracowałeś bez przerwy.",
    "Sprawdziłbym, czy łatwiej wrócić do zadania po przerwie w konkretnym miejscu pracy.",
    "Dalsze siedzenie nad zadaniem nie pokazuje, co zmieniłaby przerwa.",
    "Wybierz koniec jednego etapu pracy i zrób wtedy przerwę od zadania. Po powrocie zacznij od jednej konkretnej czynności.",
    "Czy zrobiłeś przerwę? Czy po powrocie łatwiej było zająć się tym zadaniem?",
    "Jeśli pomogła, sprawdź przerwę po podobnym etapie następnego zadania.",
    "Jeśli nie pomogła, zobacz, co utrudniało powrót: zmęczenie, niejasny następny krok czy inne sprawy."),
  "energy:many_tasks": I(
    "Co chwilę przechodziłeś do innej sprawy.",
    "W tych warunkach trudno ocenić samo skupienie. Sprawdź, co się zmieni, gdy zostaniesz przy jednym fragmencie zadania.",
    "Zanim ocenisz koncentrację, warto zobaczyć, ile razy praca była przerywana.",
    "Wybierz fragment zadania z jasnym końcem. Do jego ukończenia zapisuj inne sprawy bez rozpoczynania ich, o ile nie są pilne.",
    "Co Cię oderwało: czyjaś prośba, własne przełączenie czy brak pomysłu, co robić dalej?",
    "Jeśli udało się skończyć fragment, powtórz odkładanie niepilnych spraw.",
    "Jeśli musiałeś reagować na bieżąco, uwzględnij to przy następnym zadaniu. Bez przerwań sprawdź też zmęczenie i jasność zadania."),
  "weekend:late": I(
    "Po weekendzie wracałeś z innymi godzinami snu.",
    "Zaznaczyłeś przesuniętą porę snu i pobudki. Sprawdź, jak pasowała do pierwszych obowiązków po weekendzie.",
    "Plan powrotu może zakładać godziny, które po weekendzie wyglądają inaczej.",
    "Zapisz sen, pobudkę i pierwszy obowiązek po następnym weekendzie. Sprawdź, czy wszystko mieściło się w godzinach, które założyłeś.",
    "Na czym najpierw pojawiła się trudność: pobudce, posiłku, pracy czy treningu?",
    "Jeśli znajdziesz ten moment, uwzględnij go przy planowaniu kolejnego powrotu.",
    "Jeśli mimo innych godzin powrót poszedł dobrze, zachowaj też tę informację. Samo przesunięcie nie dowodzi problemu."),
  "weekend:no_return": I(
    "Po weekendzie nie miałeś ustalonego pierwszego kroku.",
    "Wskazałeś brak momentu powrotu do jedzenia i treningu. Warto sprawdzić jedną konkretną okazję, od której wracasz.",
    "„Od poniedziałku” zostawia otwarte pytanie, co robisz jako pierwsze.",
    "Przed kolejnym weekendem wybierz pierwszy zwykły posiłek po nim. Sprawdź, czy będzie dostępny, żeby móc od niego wrócić do swojego rytmu.",
    "Czy zjadłeś ten posiłek? Co zrobiłeś przy następnej okazji?",
    "Jeśli udało się wrócić, wykorzystaj tę samą okazję po kolejnym weekendzie.",
    "Jeśli się nie udało, zapisz, co zatrzymało powrót. Sprawdź dostępność jedzenia i zmianę planów przed kolejną próbą."),
  "weekend:compensate": I(
    "Po weekendzie próbowałeś nadrobić jedzeniem albo treningiem.",
    "Do zwykłego planu doszły kolejne wymagania. Sprawdź, jak wygląda powrót, gdy zostawisz swój dotychczasowy zakres.",
    "Dodatkowy trening i mniej jedzenia utrudniają porównanie ze zwykłym tygodniem.",
    "Wróć do zwykłych posiłków i treningu według swojego planu, bez dokładania nadrabiania. Zauważ moment, w którym chcesz coś zaostrzyć.",
    "Czy wróciłeś do rytmu? Co chciałeś zmienić, żeby nadrobić weekend?",
    "Jeśli zwykły powrót się udał, zachowaj go przy kolejnej takiej okazji.",
    "Jeśli się nie udał, sprawdź pierwszą decyzję, która go zmieniła. Sam weekend nie wyjaśnia jeszcze trudności z powrotem."),
  "weekend:work": I(
    "W weekend nadal nadrabiałeś pracę.",
    "Przyjrzałbym się temu, ile zostało czasu bez obowiązków. Sama nazwa wolnego dnia niewiele mówi o odpoczynku.",
    "Plan odpoczynku nie zmniejsza liczby zadań, które przeniosłeś na weekend.",
    "Przed weekendem wybierz zadanie, które naprawdę musi być zrobione wtedy. Pozostałym nadaj terminy w tygodniu. Zapisz, co ostatecznie zajęło wolny czas.",
    "Ile pracy weszło w weekend? Czy został odpoczynek i jak wyglądał powrót?",
    "Jeśli ograniczenie pracy coś zmieniło, sprawdź podobny układ kolejnego weekendu.",
    "Jeśli zadania znów zajęły wolny czas, sprawdź, dlaczego trafiły właśnie tam i które zobowiązanie trzeba zmienić."),
};
export function getInsight(a: Answers): Insight | undefined {
  const key = `${a.scene}:${a.before}`;
  return INSIGHTS[`${key}:${a.context}`] || INSIGHTS[key];
}
export function getMaintenance(a: Answers): Insight {
  const anchors: Record<string, [string, string, string]> = {
    space: ['Miałeś mniej obowiązków i tydzień poszedł dobrze.', 'Warto uwzględnić tę różnicę, gdy pracy znów przybędzie.', 'Przed bardziej zajętym dniem sprawdź, co z obecnego planu nadal się zmieści. Wybierz, co przesuniesz, jeśli czasu będzie mniej.'],
    prepared: ['Pomogło wcześniejsze przygotowanie.', 'Wskazałeś jedzenie i trening ustalone wcześniej. Przyjrzyj się jednej decyzji, którą możesz powtórzyć.', 'Wybierz jedną rzecz przygotowaną wcześniej, która pomogła Ci w tym tygodniu. Powtórz ją przed kolejnym podobnym dniem.'],
    flex: ['Zmieniałeś plan, gdy zmieniał się dzień.', 'Zaznaczyłeś, że to pomagało. Warto zachować konkretny przykład na kolejną taką okazję.', 'Zapisz, co zmieniło się w dniu i jak poprawiłeś wtedy plan. Przy podobnej zmianie sprawdź ten sam sposób.'],
    help: ['Ktoś pomógł Ci ogarnąć obowiązki.', 'Ta pomoc miała znaczenie dla udanego tygodnia. Sprawdź, czy będzie dostępna również w następnym.', 'Ustal, czy możesz liczyć na tę samą pomoc. Jeśli nie, dopasuj do tego zakres lub terminy w swoim planie.'],
    unknown: ['Ten tydzień poszedł dobrze.', 'Nie musisz szukać problemu. Możesz za to zauważyć, co ułatwiło Ci to, na czym zależało.', 'Wybierz jedną rzecz, która poszła po Twojej myśli i zapisz, co ją ułatwiło. Na razie niczego nie zmieniaj.'],
  };
  const [title, explanation, action] = a.scene === 'steady' ? anchors[String(a.anchor)] || anchors.unknown : ['Znalazłeś sposób, który Ci pomaga.', `Wskazałeś, że działa ${String(a.previous) === 'plan' ? 'plan treningu albo jedzenia' : String(a.previous) === 'calendar' ? 'trzymanie się ustalonych godzin' : String(a.previous) === 'small' ? 'jedna mniejsza zmiana' : 'pomoc drugiej osoby'}. Warto sprawdzić, co pozwala Ci to utrzymać.`, 'Przy kolejnej podobnej sytuacji wróć do tego samego sposobu. Zauważ, co umożliwiło jego wykonanie.'];
  return I(title, explanation, 'Kolejna zmiana może utrudnić ocenę tego, co już działa.', action, 'Czy nadal miałeś to, co poprzednio pomagało? Czy udało się powtórzyć tę część tygodnia?', 'Jeśli tak, zachowaj ten sposób na podobne dni.', 'Jeśli nie, sprawdź, czego tym razem zabrakło. Od tej różnicy zacznij kolejną zmianę.');
}
export function getObservation(a: Answers): Insight {
  const target: Record<string, [string, string]> = {
    training: ['Co dzieje się przed treningiem?', 'Przy następnym treningu zapisz planowany start i to, co działo się tuż przed nim. Zaznacz, czy udało się go zrobić.'],
    food: ['Co poprzedza Twoje wieczorne jedzenie?', 'Przy następnym takim wieczorze zapisz wcześniejszy posiłek i to, co działo się tuż przed jedzeniem.'],
    sleep: ['Jak kończy się Twój wieczór?', 'Zapisz ostatnią czynność przed łóżkiem. Rozróżnij późniejsze położenie się od trudności z zaśnięciem.'],
    energy: ['W którym momencie trudniej się skupić?', 'Zapisz zadanie, przy którym pierwszy raz trudno Ci się skupić i to, co działo się wcześniej.'],
    weekend: ['Od czego wracasz po weekendzie?', 'Zapisz pierwszą zaplanowaną rzecz po weekendzie i to, czy udało się ją zrobić.'],
    head: ['Co wraca do Ciebie po pracy?', 'Po pracy zauważ pierwszą sprawę, do której wracasz myślami. Zapisz, czy wymaga czegoś jeszcze dziś i co konkretnie zostało do zrobienia.'],
  };
  const scene = target[String(a.scene)] ? String(a.scene) : ({ form: 'training', energy: 'energy', sleep: 'sleep', head: 'head' }[String(a.goal)] || 'energy');
  const [title, action] = target[scene];
  const context = getContextQuestion(String(a.scene), String(a.before));
  const unknownContext = context && (!a.context || a.context === 'unknown');
  const noMiss = a.scene === 'training' && (a.planned === 0 || a.missed === 0);
  return I(
    noMiss ? a.planned === 0 ? 'Nie planowałeś treningów w tym tygodniu.' : 'Zaplanowane treningi się odbyły.' : title,
    noMiss ? 'Możesz przyjrzeć się temu, co ułatwia lub utrudnia trening. Z tych liczb nie wynika, że jakiś wypadł.' : unknownContext ? `Zanim wybierzemy zmianę, brakuje jednej rzeczy: ${context.title}` : a.frequency === '0' ? 'Zaznaczyłeś zero takich sytuacji w podanym okresie. Na razie warto zachować to jako pytanie na przyszłość.' : 'Brakuje konkretnego przykładu lub informacji, jak często to wraca. Poniżej masz fragment dnia, któremu możesz się przyjrzeć.',
    'Zbyt szybka rada mogłaby dotyczyć sytuacji, której u Ciebie wcale nie ma.',
    unknownContext ? `${action} Wróć też do pytania: ${context.title}` : action,
    'Czy coś poszło inaczej, niż chciałeś? Jeśli tak, co działo się tuż przed tym?',
    'Z takim przykładem możesz wrócić do odpowiedzi i sprawdzić kolejny krok.',
    'Jeśli nic Ci nie przeszkadza, zostaw tę część tygodnia tak, jak jest.');
}

export const INSIGHT_REACTIONS = [
  { id: 'new', label: 'Wcześniej tego nie łączyłem.' },
  { id: 'known', label: 'Wiedziałem, ale brakowało mi pomysłu, co zrobić.' },
  { id: 'obvious', label: 'Już tego próbowałem.' },
  { id: 'off', label: 'U mnie wygląda to inaczej.' },
];
export function reactionNext(reaction: string): string {
  return ({ new: 'Próba pokaże, czy ten trop pasuje również przy kolejnej okazji.', known: 'Po próbie możesz tu wrócić i zapisać, co wyszło.', obvious: 'Nie powtarzaj czegoś tylko dlatego, że quiz znów to proponuje. Sprawdźmy, co wyszło poprzednio.', off: 'Wybierz niżej pytanie, do którego chcesz wrócić. Jeśli brakuje pasującej odpowiedzi, wybierz „Nie wiem albo było inaczej”.' } as Record<string, string>)[reaction] || '';
}
export function contentSignal(a: Answers, reaction: string, fit: string, objection: string): Record<string, string> {
  // Only reviewed categorical topics. No contact, free text, counts, score or report body.
  const keys = ['why', 'scene', 'before', 'context', 'previous', 'attempt', 'protect', 'impact'];
  const out: Record<string, string> = {};
  for (const key of keys) if (typeof a[key] === 'string') out[key] = a[key];
  if (INSIGHT_REACTIONS.some(r => r.id === reaction)) out.reaction = reaction;
  if (['self', 'coaching', 'plan', 'medical'].includes(fit)) out.fit = fit;
  if (fit === 'coaching' && ['process', 'repeat', 'time', 'price', 'none'].includes(objection)) out.objection = objection;
  return out;
}
