import type { Answers, Question } from './decision-diagnostic';

export interface Insight {
  title: string; explanation: string; trap: string; actionTitle?: string;
  action: string; observe: string; yes: string; no: string;
}
const CONTEXT: Record<string, { title: string; rows: [string, string][] }> = {
  'training:work': { title: 'Co się stało z pracą tego dnia?', rows: [['unexpected', 'Doszło coś pilnego, czego wcześniej nie było.'], ['extra', 'Dokładałem kolejne rzeczy, choć mogły poczekać.'], ['overlap', 'Już rano było widać, że wszystko się nie zmieści.']] },
  'food:meal': { title: 'Co stało się z wcześniejszym posiłkiem?', rows: [['access', 'Nie miałem jedzenia ani gdzie go szybko kupić.'], ['work', 'Jedzenie było, ale ciągle odkładałem przerwę.'], ['restrict', 'Celowo zjadłem mniej, żeby trzymać założenia.']] },
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
    "Pilna rzecz zabrała część czasu na trening. Sprawdźmy, co zrobiłeś z tym, co zostało.",
    "Jeśli nie masz decyzji na moment, gdy dzień nagle się skraca, kolejna rozpiska dalej może się rozsypać.",
    "Przed następnym treningiem wybierz krótszy fragment swojego planu. Ustal, przy jakim opóźnieniu na niego przechodzisz. Jeśli nawet on się nie zmieści, wybierz inny dostępny termin.",
    "Ile czasu zostało po pilnej sprawie? Czy udało się w nim zrobić wybrany fragment?",
    "Jeśli się zmieścił, masz gotowy wariant na kolejny dzień z taką zmianą.",
    "Jeśli zabrakło czasu nawet na niego, sprawdź inny termin. Dalsze skracanie może już niczego nie rozwiązać."),
  "training:work:extra": I(
    "Dokładałeś zadania, choć mogły poczekać.",
    "Trening zaczął przegrywać wcześniej, w chwili gdy brałeś kolejną rzecz mimo planowanego końca pracy. To ten moment da się sprawdzić.",
    "Krótszy trening nic nie zmieni, jeśli odzyskany czas znowu oddasz pracy.",
    "Przed kolejnym treningiem wybierz ostatnie zadanie w pracy. Gdy wpadnie następne, zapisz, kiedy je zrobisz. Sprawdź, czy tym razem kończysz na tym, co ustaliłeś.",
    "Co chciałeś jeszcze zrobić przed wyjściem? Czy mogło poczekać i czy trening się odbył?",
    "Jeśli udało się wyjść i zrobić trening, powtórz to przy następnym dniu pracy.",
    "Jeśli nowe zadanie jednak było pilne, sprawdź termin treningu po tej zmianie. Samo postanowienie wyjścia wcześniej nie wystarczy."),
  "training:work:overlap": I(
    "Dzień był za ciasny już od rana.",
    "Obowiązki i trening od początku się nie mieściły. Wieczorem nie było już czego ratować, więc sprawdzamy, co trzeba przesunąć wcześniej.",
    "Wpisanie treningu w kalendarz niczego nie przesuwa z pozostałych obowiązków.",
    "Policz pracę, dojazd, sprawy w domu i trening. Wybierz, co przesuniesz albo skrócisz, żeby trening się zmieścił. Jeśli nic nie może ustąpić, poszukaj innego terminu.",
    "Co przesunąłeś? Czy ten czas nadal był wolny, gdy miałeś zacząć trening?",
    "Jeśli udało się zrobić miejsce, uwzględniaj dojazd i obowiązki przy kolejnych terminach.",
    "Jeśli coś później zajęło ten czas, zapisz co. To będzie inna przeszkoda niż zbyt ciasny plan od samego rana."),
  "training:family": I(
    "W porze treningu ktoś potrzebował Cię w domu.",
    "Samo wolne miejsce w kalendarzu nie wystarczy, jeśli w tej godzinie ktoś na Tobie polega. Najpierw sprawdź dostępność, dopiero potem termin treningu.",
    "Godzina wolna w kalendarzu może nadal być godziną, w której ktoś na Tobie polega.",
    "Przed kolejnym treningiem ustal, kto zajmie się obowiązkami podczas Twojej nieobecności. Jeśli nie masz takiej pomocy, wybierz termin, w którym możesz ćwiczyć bez niej.",
    "Czy mogłeś wyjść o ustalonej porze? Co jeszcze wymagało Twojej obecności?",
    "Jeśli to pomogło, ustalaj dostępność przed wpisaniem kolejnego treningu.",
    "Jeśli pomoc nie była dostępna, sprawdź inne miejsce lub termin treningu. Uwzględnij opiekę w planie."),
  "training:no_short": I(
    "Pełny trening się nie mieścił, a krótszej wersji nie miałeś.",
    "Tego dnia zostało trochę czasu, ale decyzję o skróceniu trzeba było podejmować już na gorąco. Sprawdź, co zmienia gotowy wariant awaryjny.",
    "W ciasnym dniu wybieranie ćwiczeń od nowa dokłada jeszcze jedną decyzję przed startem.",
    "Wybierz z obecnego planu znany fragment, który możesz zrobić przy mniejszej ilości czasu. Zapisz go obok pełnego treningu i użyj, gdy całość się nie zmieści.",
    "Czy udało się zrobić ten fragment w czasie, który został?",
    "Jeśli tak, zachowaj go na kolejny dzień, w którym czasu będzie mniej.",
    "Jeśli nawet ten fragment się nie zmieścił, wróć do terminu treningu. Sam zakres może nie być główną przeszkodą."),
  "training:tired:morning": I(
    "Byłeś zmęczony już po przebudzeniu.",
    "Zmęczenie było z Tobą od rana, więc trening jest tylko miejscem, w którym zaczęło Ci przeszkadzać. Quiz nie powie dlaczego. Może pomóc porównać podobne dni.",
    "Jeśli patrzysz tylko na wieczorny trening, gubisz wcześniejszą część tego samego dnia.",
    "Przy kolejnym takim dniu zapisz, kiedy spałeś i jak czułeś się po wstaniu. Porównaj też dzień bez treningu.",
    "Czy zmęczenie wraca także w dni bez ćwiczeń, mimo zwykłego odpoczynku?",
    "Jeśli wraca, zachowaj ten zapis do dalszej oceny. Powtarzające się zmęczenie omów z lekarzem.",
    "Jeśli rano czujesz się dobrze, a zmęczenie pojawia się później, przyjrzyj się temu, co dzieje się w ciągu dnia."),
  "training:tired:end": I(
    "Na trening zabrakło Ci siły po całym dniu.",
    "Zmęczenie pojawiło się dopiero po obowiązkach. Zanim zmienisz sam trening, sprawdź ten sam zakres wcześniej w ciągu dnia.",
    "Samo wolne miejsce wieczorem nie mówi, ile będziesz miał wtedy siły.",
    "Wybierz dzień, w którym możesz zrobić swój trening przed ostatnimi obowiązkami. Zostaw ten sam zakres. Jeśli nie ma takiego terminu, zapisz to i nie skracaj snu na tę próbę.",
    "Czy wcześniejszy termin był możliwy? Czy łatwiej było zacząć?",
    "Jeśli tak, uwzględnij tę porę przy planowaniu następnego treningu.",
    "Jeśli zmiana pory nic nie dała, sprawdź obciążenie dnia i zakres treningu. To porównanie nie ustala przyczyny zmęczenia."),
  "training:tired:start": I(
    "Najtrudniej jest Ci zacząć trening.",
    "Zaznaczyłeś, że po ruszeniu zwykle jest lepiej. To odróżnia trudność z rozpoczęciem od zmęczenia, które trzyma przez cały trening.",
    "Ocena całego treningu przed pierwszym ruchem nie pokaże, co dzieje się po starcie.",
    "Przygotuj pierwszy znany element rozgrzewki. Kiedy go zrobisz, oceń, czy masz siłę i chęć kontynuować swój trening.",
    "Czy po rozgrzewce coś się zmieniło? Jak czułeś się dalej?",
    "Jeśli rozgrzewka ułatwiła start, przygotuj ją tak samo przed kolejnym treningiem.",
    "Jeśli nadal jesteś zmęczony, nie musisz kończyć treningu dla tej próby. Uwzględnij odpoczynek i obciążenie dnia."),
  "food:meal:access": I(
    "Wcześniejszy posiłek wypadł, zanim wieczorem zjadłeś więcej.",
    "Masz tu wcześniejszy moment do sprawdzenia. Porównaj podobny dzień, w którym ten posiłek faktycznie jest dostępny.",
    "Postanowienie, że wieczorem zjesz mniej, zostawia tę wcześniejszą przerwę w jedzeniu.",
    "Na kolejny taki dzień wybierz zwykły posiłek, który zabierzesz, albo sprawdź, gdzie kupisz go o potrzebnej porze.",
    "Udało się zjeść wcześniej? Porównaj głód i jedzenie wieczorem.",
    "Jeśli zauważysz różnicę, powtórz próbę w podobnym dniu pracy.",
    "Jeśli zjadłeś wcześniej, a wieczór wyglądał tak samo, sprawdź, co wydarzyło się tuż przed wieczornym jedzeniem."),
  "food:meal:work": I(
    "Jedzenie było pod ręką, ale przerwa ciągle przegrywała z pracą.",
    "Dlatego sprawdzamy moment odejścia od pracy. Kolejne pudełko nadal może zostać nietknięte, jeśli przerwa znów się przesunie.",
    "Kolejne przygotowane pudełko może zostać w lodówce z tego samego powodu.",
    "Połącz przerwę na jedzenie z końcem konkretnego bloku pracy. Przy następnej takiej okazji zjedz przed rozpoczęciem kolejnej sprawy, jeśli możesz wtedy zrobić przerwę.",
    "Czy udało Ci się zjeść? Co chciało zająć ten czas i jak wyglądał głód wieczorem?",
    "Jeśli udało się zjeść i wieczorem było inaczej, sprawdź tę samą przerwę w kolejnym podobnym dniu.",
    "Jeśli obowiązki nie pozwoliły odejść od pracy, najpierw trzeba ustalić dostępną przerwę. Samo przypomnienie jej nie zapewni."),
  "food:meal:restrict": I(
    "Wcześniej celowo zjadłeś mniej, a wieczorem więcej.",
    "To daje prosty test: podobny dzień bez wcześniejszego cięcia. Dopiero wtedy zobaczysz, czy ten ciąg się powtarza.",
    "Jeszcze mniejszy posiłek następnego dnia powtórzyłby rzecz, którą właśnie chcesz sprawdzić.",
    "Przy podobnym dniu zjedz swój zwykły wcześniejszy posiłek bez ograniczania go w ramach nadrabiania. Jeśli masz zalecenia żywieniowe od specjalisty, trzymaj się ich.",
    "Jak wyglądał głód wieczorem? Co jeszcze działo się wtedy przy jedzeniu?",
    "Jeśli zauważysz różnicę, porównaj kolejny podobny dzień przed wyciąganiem wniosku.",
    "Jeśli było tak samo, sam wcześniejszy posiłek nie wyjaśnia sytuacji. Przyjrzyj się też napięciu i przebiegowi wieczora."),
  "food:no_food": I(
    "Po pracy musiałeś jeszcze wymyślić, co zjeść.",
    "Po pracy została Ci jeszcze jedna decyzja: co zjeść. Sprawdź, co zmienia wybór zrobiony wcześniej.",
    "Znajomość zasad jedzenia nie zapewnia posiłku pod ręką po pracy.",
    "Przed końcem pracy wybierz, co zjesz po powrocie. Sprawdź, czy masz składniki albo gdzie kupisz ten posiłek.",
    "Czy jedzenie było dostępne? Jak wyglądał wieczór, kiedy nie musiałeś już szukać posiłku?",
    "Jeśli to pomogło, wybierz jedzenie przed końcem pracy również przy następnej okazji.",
    "Jeśli posiłek czekał, a wieczór wyglądał tak samo, sprawdź, co działo się bezpośrednio przed jedzeniem."),
  "food:tension": I(
    "Jedzenie było też Twoją przerwą po napiętym dniu.",
    "W tej odpowiedzi jedzenie łączy się z odpoczynkiem. Jeśli potrzeba przerwy zostaje po posiłku, kolejne zasady jedzenia ominą część sytuacji.",
    "Jeśli to jedyna przerwa w dniu, zmiana samego jedzenia zostawia sprawę odpoczynku otwartą.",
    "Przy kolejnej takiej chwili zauważ, czy jesteś głodny i czego jeszcze potrzebujesz. Zjedz, jeśli jesteś głodny. Sprawdź, czy możesz też odpocząć po skończonym posiłku.",
    "Czy potrzeba przerwy została, gdy już zjadłeś?",
    "Jeśli tak, wybierz dostępną chwilę odpoczynku przy następnym podobnym wieczorze.",
    "Jeśli chodziło przede wszystkim o głód, przyjrzyj się wcześniejszym posiłkom. Nie trzeba dopisywać emocjonalnej przyczyny."),
  "food:social": I(
    "Zjadłeś więcej podczas spotkania.",
    "Jedno spotkanie niewiele mówi o tygodniu. Najwięcej pokaże pierwsza decyzja po nim: czy wróciłeś do zwykłego rytmu, czy zmieniły się też kolejne posiłki.",
    "Jedno wyjście nie wystarcza do ocenienia całego tygodnia.",
    "Po kolejnym spotkaniu wróć do zwykłego posiłku przy najbliższej okazji. Zauważ, czy wyjście zmieniło też to, co jadłeś później.",
    "Skończyło się na jednym spotkaniu czy zmieniły się również kolejne posiłki?",
    "Jeśli wróciłeś do swojego rytmu, uwzględnij to przy ocenie całej sytuacji.",
    "Jeśli zmieniły się też kolejne posiłki, sprawdź pierwszą decyzję po wyjściu. Zacznij od niej, zanim ograniczysz spotkania."),
  "sleep:screen:own": I(
    "Dopiero wieczorem miałeś chwilę dla siebie.",
    "Ekran był pierwszą chwilą tylko dla Ciebie. Gdy jedyny wolny moment trafia na koniec dnia, wcześniejszy sen konkuruje z czymś, czego wcześniej w tym dniu nie było.",
    "Zakaz telefonu sam nie tworzy innej chwili bez obowiązków.",
    "Wybierz dostępną chwilę dla siebie wcześniej w ciągu dnia. Ty decydujesz, co z nią zrobisz. Wieczorem sprawdź, czy nadal tak samo trudno skończyć oglądanie.",
    "Udało Ci się mieć tę chwilę? Jak potem kończyłeś wieczór?",
    "Jeśli łatwiej było skończyć oglądanie, sprawdź to w kolejnym dniu z czasem dla siebie.",
    "Jeśli nic się nie zmieniło, zobacz, co trzymało Cię przy ekranie w chwili, gdy chciałeś już kończyć."),
  "sleep:screen:auto": I(
    "Przy ekranie straciłeś poczucie czasu.",
    "W trakcie oglądania nie złapałeś momentu końca. Dlatego ustawiamy go przed startem i sprawdzamy, co wtedy robisz.",
    "Postanowienie „dzisiaj krócej” nie określa, kiedy kończysz.",
    "Przed oglądaniem wybierz moment, w którym kończysz, na przykład koniec odcinka. Kiedy nadejdzie, zauważ, czy wyłączasz ekran, czy zaczynasz coś następnego.",
    "Czy zauważyłeś ten moment? Co zrobiłeś i kiedy poszedłeś do łóżka?",
    "Jeśli to pomogło, wybierz koniec również przed następnym oglądaniem.",
    "Jeśli wiedziałeś, że czas kończyć, a oglądałeś dalej, sprawdź, po co chciałeś zostać. Samo pilnowanie czasu może nie wystarczyć."),
  "sleep:screen:awake": I(
    "Telefon pojawił się po trudności z zaśnięciem.",
    "To ważna kolejność: trudność ze snem zaczęła się wcześniej. Samo odłożenie telefonu nie powie, co działo się przed nim.",
    "Jeśli skupisz się tylko na ekranie, ominiesz moment, od którego zaczęła się ta noc.",
    "Przy następnej takiej nocy zapisz, kiedy się położyłeś, kiedy wziąłeś telefon i co działo się pomiędzy. Zauważ też noce bez telefonu.",
    "Czy trudność z zaśnięciem znów była pierwsza? Jak czułeś się następnego dnia?",
    "Jeśli to się powtarza, zachowaj zapis i omów trudności ze snem ze specjalistą.",
    "Jeśli tym razem najpierw pojawił się ekran, zapisz tę kolejność. To inna sytuacja niż ta, którą opisałeś wcześniej."),
  "sleep:work": I(
    "Sen przesuwał się razem z końcem pracy.",
    "Sprawdź moment kończenia ostatniego zadania. To on stoi wcześniej niż późniejsze wejście do łóżka.",
    "Przypomnienie o śnie nie kończy zadania, którym nadal się zajmujesz.",
    "Wybierz ostatnie zadanie na dziś. Pozostałe sprawy zapisz wraz z tym, od czego zaczniesz jutro. Sprawdź, czy po wybranym zadaniu zamykasz pracę.",
    "Co chciałeś jeszcze dokończyć? Kiedy skończyłeś pracę i poszedłeś do łóżka?",
    "Jeśli zapis ułatwił skończenie pracy, powtórz go na koniec następnego dnia.",
    "Jeśli musiałeś pracować dalej, przyjrzyj się terminom i obowiązkom. Zapis na jutro sam nie zmniejsza ich liczby."),
  "sleep:family": I(
    "Ostatni obowiązek w domu przesunął Ci sen.",
    "Ta ostatnia rzecz stoi między Tobą a snem. Sprawdź, czy da się zrobić ją wcześniej albo podzielić z kimś.",
    "Sztywna godzina snu nie usuwa obowiązku, który nadal trzeba wykonać.",
    "Zapisz ostatni obowiązek przed snem. Sprawdź, czy możesz zrobić go wcześniej lub z czyjąś pomocą. Ustal tę pomoc, zanim na niej oprzesz plan.",
    "Co przesunęło sen? Czy był inny dostępny sposób wykonania tej rzeczy?",
    "Jeśli znalazłeś taki sposób, sprawdź go przy następnym podobnym wieczorze.",
    "Jeśli tego obowiązku nie da się przesunąć, uwzględnij go przy planowaniu snu. Samo wcześniejsze postanowienie nie zmienia warunków."),
  "sleep:thoughts": I(
    "Byłeś już w łóżku, a sprawy z dnia dalej wracały.",
    "Późniejsze położenie się nie zamknie niedokończonych spraw. Sprawdź, czy zapisanie następnego kroku pomaga odłożyć je wcześniej.",
    "Pora wejścia do łóżka nie pokazuje, kiedy udało Ci się zasnąć.",
    "Przed końcem dnia zapisz niedokończone sprawy i to, od czego zaczniesz przy każdej z nich. Zauważ, czy później wracają te same myśli.",
    "Czy zapis coś zmienił? Które sprawy nadal wracały w łóżku?",
    "Jeśli pomogło, powtórz taki zapis przed końcem kolejnego dnia.",
    "Jeśli nie pomogło, ten sposób nie wystarczył. Powtarzające się trudności ze snem omów ze specjalistą."),
  "energy:short_sleep": I(
    "Trudniejszy dzień przyszedł po krótszej nocy.",
    "To jeszcze nie mówi, że sen był przyczyną. Daje za to prosty punkt porównania: podobny dzień po zwykłej dla Ciebie nocy.",
    "Kolejny sposób na koncentrację nie pokaże, jak pracujesz po zwykłej nocy.",
    "Porównaj podobny dzień pracy po nocy o zwykłej długości. Zapisz sen, pobudkę i moment, od którego trudniej było się skupić.",
    "Czy trudność wróciła o podobnej porze? Czy miałeś podobną ilość pracy?",
    "Jeśli widzisz różnicę, sprawdź kolejną okazję przed uznaniem snu za całe wyjaśnienie.",
    "Jeśli było tak samo, przyjrzyj się przebiegowi pracy i przerwom. Utrzymujące się dolegliwości wymagają osobnej oceny."),
  "energy:meal": I(
    "Posiłek przesunął się w tym samym dniu, w którym siadło skupienie.",
    "To jeszcze nie dowód związku. Porównaj podobny blok pracy po zwykłym posiłku i zobacz, czy trudność wraca.",
    "Sama kolejność zdarzeń nie dowodzi, że jedzenie wyjaśnia trudność ze skupieniem.",
    "Przed podobnym blokiem pracy zjedz swój zwykły posiłek i zostaw sobie czas, żeby go zjeść. Zapisz, kiedy później pojawiła się trudność ze skupieniem.",
    "Udało się zjeść? Czy skupienie pogorszyło się w podobnym momencie?",
    "Jeśli widzisz różnicę, powtórz porównanie przy podobnej ilości pracy.",
    "Jeśli było tak samo, sprawdź też pozostałe różnice między tymi dniami. Nie zmieniaj dalej jedzenia na podstawie samego quizu."),
  "energy:no_break": I(
    "Przed spadkiem skupienia długo pracowałeś bez przerwy.",
    "Spadek skupienia pojawił się po długim ciągu pracy bez przerwy. Sprawdźmy wcześniejszy moment: koniec jednego etapu i odejście od zadania.",
    "Dalsze siedzenie nad zadaniem nie pokazuje, co zmieniłaby przerwa.",
    "Wybierz koniec jednego etapu pracy i zrób wtedy przerwę od zadania. Po powrocie zacznij od jednej konkretnej czynności.",
    "Czy zrobiłeś przerwę? Czy po powrocie łatwiej było zająć się tym zadaniem?",
    "Jeśli pomogła, sprawdź przerwę po podobnym etapie następnego zadania.",
    "Jeśli nie pomogła, zobacz, co utrudniało powrót: zmęczenie, niejasny następny krok czy inne sprawy."),
  "energy:many_tasks": I(
    "Co chwilę przechodziłeś do innej sprawy.",
    "Trudno ocenić skupienie, kiedy praca co chwilę zmienia kierunek. Najpierw sprawdź jeden fragment zadania bez dokładania kolejnych niepilnych spraw.",
    "Zanim ocenisz koncentrację, zobacz, ile razy zmieniłeś sprawę przed skończeniem poprzedniej.",
    "Wybierz fragment zadania z jasnym końcem. Do jego ukończenia zapisuj inne sprawy bez rozpoczynania ich, o ile nie są pilne.",
    "Co Cię oderwało: czyjaś prośba, własne przełączenie czy brak pomysłu, co robić dalej?",
    "Jeśli udało się skończyć fragment, powtórz odkładanie niepilnych spraw.",
    "Jeśli musiałeś reagować na bieżąco, uwzględnij to przy następnym zadaniu. Bez przerwań sprawdź też zmęczenie i jasność zadania."),
  "weekend:late": I(
    "Po weekendzie wracałeś z innymi godzinami snu.",
    "Powrót do tygodnia zaczynał się już z innymi godzinami snu i pobudki. Sprawdź, gdzie ta zmiana pierwszy raz zderza się z obowiązkiem po weekendzie.",
    "Plan powrotu może zakładać godziny, które po weekendzie wyglądają inaczej.",
    "Zapisz sen, pobudkę i pierwszy obowiązek po następnym weekendzie. Sprawdź, czy wszystko mieściło się w godzinach, które założyłeś.",
    "Na czym najpierw pojawiła się trudność: pobudce, posiłku, pracy czy treningu?",
    "Jeśli znajdziesz ten moment, uwzględnij go przy planowaniu kolejnego powrotu.",
    "Jeśli mimo innych godzin powrót poszedł dobrze, zachowaj też tę informację. Samo przesunięcie nie dowodzi problemu."),
  "weekend:no_return": I(
    "Po weekendzie brakowało pierwszego ruchu, od którego wracasz.",
    "Wybrałeś, że nie miałeś ustalonego momentu powrotu. Sprawdź jedną konkretną okazję, nie cały poniedziałek naraz.",
    "Sam poniedziałek nie wskazuje, co robisz jako pierwsze.",
    "Przed kolejnym weekendem wybierz pierwszy zwykły posiłek po nim. Sprawdź, czy będzie dostępny, żeby móc od niego wrócić do swojego rytmu.",
    "Czy zjadłeś ten posiłek? Co zrobiłeś przy następnej okazji?",
    "Jeśli udało się wrócić, wykorzystaj tę samą okazję po kolejnym weekendzie.",
    "Jeśli się nie udało, zapisz, co zatrzymało powrót. Sprawdź dostępność jedzenia i zmianę planów przed kolejną próbą."),
  "weekend:compensate": I(
    "Po weekendzie dołożyłeś sobie więcej wymagań.",
    "Mniej jedzenia albo dodatkowy trening zmieniają warunki całego powrotu. Sprawdź zwykły plan bez nadrabiania i zobacz, czy tydzień wraca łatwiej.",
    "Dodatkowy trening i mniej jedzenia utrudniają porównanie ze zwykłym tygodniem.",
    "Wróć do zwykłych posiłków i treningu według swojego planu, bez dokładania nadrabiania. Zauważ moment, w którym chcesz coś zaostrzyć.",
    "Czy wróciłeś do rytmu? Co chciałeś zmienić, żeby nadrobić weekend?",
    "Jeśli zwykły powrót się udał, zachowaj go przy kolejnej takiej okazji.",
    "Jeśli się nie udał, sprawdź pierwszą decyzję, która go zmieniła. Sam weekend nie wyjaśnia jeszcze trudności z powrotem."),
  "weekend:work": I(
    "Weekend dalej niósł pracę.",
    "Najpierw sprawdź, ile czasu bez obowiązków faktycznie zostało. Dzień wolny z nazwy może nadal być pełnym dniem zadań.",
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
    space: ['Miałeś mniej obowiązków i tydzień poszedł dobrze.', 'Ta różnica ma znaczenie, gdy pracy znowu przybędzie.', 'Przed bardziej zajętym dniem sprawdź, co z obecnego planu nadal się zmieści. Wybierz, co przesuniesz, jeśli czasu będzie mniej.'],
    prepared: ['Pomogło wcześniejsze przygotowanie.', 'Jedzenie i trening były ustalone wcześniej. Wybierz jedną decyzję, którą możesz powtórzyć.', 'Wybierz jedną rzecz przygotowaną wcześniej, która pomogła Ci w tym tygodniu. Powtórz ją przed kolejnym podobnym dniem.'],
    flex: ['Zmieniałeś plan, gdy zmieniał się dzień.', 'Zaznaczyłeś, że to pomagało. Zachowaj jeden konkretny przykład na kolejną taką okazję.', 'Zapisz, co zmieniło się w dniu i jak poprawiłeś wtedy plan. Przy podobnej zmianie sprawdź ten sam sposób.'],
    help: ['Ktoś pomógł Ci ogarnąć obowiązki.', 'Ta pomoc miała znaczenie dla udanego tygodnia. Sprawdź, czy będzie dostępna również w następnym.', 'Ustal, czy możesz liczyć na tę samą pomoc. Jeśli nie, dopasuj do tego zakres lub terminy w swoim planie.'],
    unknown: ['Ten tydzień poszedł dobrze.', 'Nie szukaj na siłę rzeczy do naprawy. Zobacz, co ułatwiło Ci to, na czym zależało.', 'Wybierz jedną rzecz, która poszła po Twojej myśli i zapisz, co ją ułatwiło. Na razie niczego nie zmieniaj.'],
  };
  const [title, explanation, action] = a.scene === 'steady' ? anchors[String(a.anchor)] || anchors.unknown : ['Znalazłeś sposób, który Ci pomaga.', `Wskazałeś, że działa ${String(a.previous) === 'plan' ? 'plan treningu albo jedzenia' : String(a.previous) === 'calendar' ? 'trzymanie się ustalonych godzin' : String(a.previous) === 'small' ? 'jedna mniejsza zmiana' : 'pomoc drugiej osoby'}. Sprawdź, co pozwala Ci to utrzymać.`,  'Przy kolejnej podobnej sytuacji wróć do tego samego sposobu. Zauważ, co umożliwiło jego wykonanie.'];
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
    noMiss ? 'Możesz przyjrzeć się temu, co ułatwia lub utrudnia trening. Z tych liczb nie wynika, że jakiś wypadł.' : unknownContext ? `Zanim wybierzemy zmianę, brakuje jednej rzeczy: ${context.title}` : a.frequency === '0' ? 'Zaznaczyłeś zero takich sytuacji w podanym okresie. Zachowaj to jako pytanie na przyszłość.' : 'Brakuje konkretnego przykładu lub informacji, jak często to wraca. Poniżej masz fragment dnia, któremu możesz się przyjrzeć.',
    'Zbyt szybka rada mogłaby dotyczyć sytuacji, której u Ciebie wcale nie ma.',
    unknownContext ? `${action} Wróć też do pytania: ${context.title}` : action,
    'Czy coś poszło inaczej, niż chciałeś? Jeśli tak, co działo się tuż przed tym?',
    'Z takim przykładem możesz wrócić do odpowiedzi i sprawdzić kolejny krok.',
    'Jeśli nic Ci nie przeszkadza, zostaw tę część tygodnia tak, jak jest.');
}

export const INSIGHT_REACTIONS = [
  { id: 'new', label: 'Tego wcześniej nie łączyłem.' },
  { id: 'known', label: 'Wiedziałem o tym, ale nie wiedziałem, co zrobić dalej.' },
  { id: 'obvious', label: 'Już tego próbowałem.' },
  { id: 'off', label: 'U mnie wygląda to inaczej.' },
];
export function reactionNext(reaction: string): string {
  return ({ new: 'Sprawdź krok przy kolejnej podobnej sytuacji. Dopiero zachowanie pokaże, czy ten trop pasuje.', known: 'Wiesz już, gdzie patrzeć. Po próbie wróć i zapisz, co wyszło.', obvious: 'Nie rób tego jeszcze raz tylko dlatego, że wynik to proponuje. Zaznacz niżej, co stało się przy poprzedniej próbie.', off: 'Wybierz odpowiedź, do której chcesz wrócić. Jeśli żadna nie pasuje, wybierz „Nie wiem albo było inaczej”.' } as Record<string, string>)[reaction] || '';
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
