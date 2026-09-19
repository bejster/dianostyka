import type { Answers, Question } from './decision-diagnostic';

export interface Insight {
  title: string; explanation: string; trap: string; actionTitle?: string;
  action: string; observe: string; yes: string; no: string;
}
const CONTEXT: Record<string, { title: string; rows: [string, string][] }> = {
  'training:work': { title: 'Jak praca weszła w czas treningu?', rows: [['unexpected', 'Doszło coś pilnego, czego wcześniej nie było.'], ['extra', 'Dokładałem kolejne rzeczy, choć mogły poczekać.'], ['overlap', 'Już rano było widać, że wszystko się nie zmieści.']] },
  'food:meal': { title: 'Co stało się z wcześniejszym posiłkiem?', rows: [['access', 'Nie miałem jedzenia ani gdzie go szybko kupić.'], ['work', 'Jedzenie było, ale ciągle odkładałem przerwę.'], ['restrict', 'Celowo zjadłem mniej, żeby trzymać dietę.']] },
  'sleep:screen': { title: 'Co Cię wtedy trzymało przy ekranie?', rows: [['own', 'To był pierwszy moment dnia tylko dla mnie.'], ['auto', 'Nawet nie zauważyłem, ile czasu minęło.'], ['awake', 'Nie mogłem zasnąć, więc sięgnąłem po telefon.']] },
  'training:tired': { title: 'Kiedy poczułeś to zmęczenie?', rows: [['morning', 'Już po przebudzeniu.'], ['end', 'Dopiero po całym dniu obowiązków.'], ['start', 'Głównie kiedy miałem zacząć. Po ruszeniu zwykle jest lepiej.']] },
};
export function getContextQuestion(scene: string, before: string): Question | undefined {
  const item = CONTEXT[`${scene}:${before}`];
  if (!item) return;
  return { id: 'context', title: item.title, hint: 'Wróć do ostatniego takiego dnia. Jeśli żadne nie pasuje, nie zgaduj.',
    job: 'Rozróżnić konkurencyjne wyjaśnienia tej samej sceny.', downstream: 'Zmienia miejsce interwencji: dostępność, granica, zakres lub obserwacja; nie tylko podpis wyniku.',
    options: [...item.rows, ['unknown', 'Nie pamiętam albo było inaczej.']].map(([id, label]) => ({ id, label })) };
}
function I(title: string, explanation: string, trap: string, action: string, observe: string, yes: string, no: string): Insight {
  return { title, explanation, trap, action, observe, yes, no };
}
const INSIGHTS: Record<string, Insight> = {
  'training:work:unexpected': I(
    'Nagła sprawa zajęła czas przeznaczony na trening.',
    'Wskazałeś nagłe zadanie, którego nie było w planie. Warto sprawdzić, czy po takiej zmianie zostaje jakakolwiek realna wersja treningu.',
    'Kolejna dokładna rozpiska nie odpowie na pytanie, co robisz, gdy zaplanowane okno znika.',
    'Przed następnym treningiem wybierz z niego krótszy wariant oraz konkretny moment, w którym przełączasz się na ten wariant. Jeśli nie zostaje nawet tyle czasu, świadomie przenieś trening do dostępnego okna.',
    'Czy pojawiło się nagłe zadanie? Czy wariant zmieścił się w czasie, który naprawdę został?',
    'Jeśli krótszy wariant się zmieścił, zachowaj tę regułę na podobne przesunięcia.',
    'Jeśli nie było żadnego okna, skracanie treningu nie rozwiązało przeszkody. Przyjrzyj się jego terminowi i obciążeniu dnia.'),
  'training:work:extra': I(
    'Czas na trening znikał przy kolejnych „jeszcze tylko”.',
    'Napisałeś, że dokładałeś zadania, które mogły poczekać. Pierwsze miejsce do sprawdzenia to decyzja o końcu pracy, zanim zaczniesz poprawiać sam trening.',
    'Krótszy trening też może wypaść, jeśli kolejne zadanie zajmie cały odzyskany czas.',
    'Przed kolejnym dniem treningowym wybierz ostatnie zadanie w pracy. Gdy pojawi się następne, zapisz jego termin zamiast od razu je zaczynać. Sprawdź, czy wychodzisz przy ustalonej granicy.',
    'Jakie zadanie próbowało wejść po ustalonym końcu? Czy naprawdę musiało być zrobione wtedy? Czy trening się odbył?',
    'Jeśli koniec pracy pozwolił zrobić trening, zachowaj tę decyzję przed dokładaniem zmian do rozpiski.',
    'Jeśli zadania były obowiązkowe, hipoteza o „jeszcze tylko” nie wystarcza. Następnym krokiem jest realne okno treningowe, nie coraz twardszy zakaz pracy.'),
  'training:work:overlap': I(
    'Trening był w planie, ale nie miał wolnego miejsca w dniu.',
    'Wskazałeś, że już rano obowiązki nie mieściły się razem z treningiem. Wieczorne odpuszczenie mogło być skutkiem decyzji podjętej przy planowaniu dnia.',
    'Dopisywanie motywacji do wieczora nie zwalnia czasu, który wcześniej obiecałeś na coś innego.',
    'Przy następnym treningu sprawdź razem: pracę, dojazd, obowiązki domowe i czas samego treningu. Wskaż, co rzeczywiście przesuwasz albo skracasz, żeby zrobiło się miejsce. Jeśli nic, wybierz inny termin.',
    'Co konkretnie ustąpiło miejsca treningowi? Czy to okno zostało wolne do momentu startu?',
    'Jeśli trening wszedł po zwolnieniu miejsca, planuj kolejne razem z obowiązkami i dojazdem.',
    'Jeśli okno zniknęło później, zapisz co je zajęło. Wtedy sprawdzasz zmianę dnia, a nie samą początkową rozpiskę.'),
  'training:family': I('Termin treningu zderzył się z obowiązkami w domu.',
    'Wskazałeś konkretną sprawę rodzinną lub opiekę. Warto odróżnić wolną godzinę w kalendarzu od godziny, w której faktycznie możesz wyjść.',
    'Samo wpisanie treningu nie rozstrzyga, kto zajmie się obowiązkami w tym czasie.',
    'Przy kolejnym terminie sprawdź, czy obowiązki są wtedy zabezpieczone. Ustal to z osobą, której dotyczy zmiana, albo wybierz okno, które nie wymaga jej pomocy.',
    'Czy mogłeś faktycznie wyjść? Jeśli nie, które ustalenie było niepełne?',
    'Zachowaj potwierdzenie dostępności przed wpisaniem kolejnego treningu.',
    'Jeśli tej dostępności nie ma, dopasuj miejsce lub zakres treningu do opieki. Nie opieraj planu na niepotwierdzonej pomocy.'),
  'training:no_short': I('Część czasu została. Trening nie miał wersji, która się w niej mieści.',
    'Zaznaczyłeś brak czasu na całość i brak ustalonego krótszego wariantu. Tu można sprawdzić konkretnie, czy przeszkodą był zakres treningu.',
    'Decydowanie na szybko, co wyrzucić z rozpiski, dokłada kolejne zadanie w już ciasnym dniu.',
    'Z obecnego planu wybierz znany, wykonalny fragment na krótszą okazję. Zapisz go wcześniej obok pełnej wersji. Użyj go dopiero wtedy, gdy czasu nie starczy na całość.',
    'Czy wykonałeś ten fragment w oknie, które zostało? Czy rzeczywiście oszczędził czas?',
    'Zostaw ten wariant jako opcję na podobne dni.',
    'Jeśli nie wystarczył czas nawet na fragment, przyjrzyj się terminowi. Kolejne cięcie ćwiczeń może nie rozwiązać problemu.'),
  'training:tired:morning': I('Zmęczenie było już rano, zanim przyszła pora treningu.',
    'To nie wystarcza, żeby wyjaśnić przyczynę zmęczenia. Pozwala jednak sprawdzić coś wcześniejszego niż chęć do ćwiczeń wieczorem.',
    'Dopychanie treningu siłą nie sprawdzi, z czym zaczynasz dzień.',
    'Przy następnej takiej sytuacji zapisz porę snu, pobudki i to, czy zmęczenie towarzyszyło Ci już po wstaniu. Zaznacz też, czy podobnie było w dniu bez treningu.',
    'Czy zmęczenie występuje także poza dniami treningowymi i mimo zwykłego odpoczynku?',
    'Jeśli wraca także w inne dni, masz konkretny zapis do dalszej oceny, zamiast etykiety „nie chce mi się”.',
    'Jeśli pojawia się dopiero później, następnym tropem jest przebieg dnia. Sam formularz nie ustala przyczyny zmęczenia.'),
  'training:tired:end': I('Trening dostał czas, który został po wszystkich obowiązkach.',
    'Wskazałeś zmęczenie dopiero po całym dniu. Sprawdźmy, czy pora wykonania ma znaczenie, zanim dodasz coś do planu.',
    'Wolna godzina pod koniec dnia nie musi być równie wykonalna jak ta sama godzina wcześniej.',
    'Wybierz najbliższy dzień, w którym znany trening możesz zrobić przed ostatnim blokiem obowiązków. Zachowaj jego zakres. Jeśli nie ma takiej okazji, zapisz to zamiast zabierać czas ze snu.',
    'Czy wcześniejszy termin był dostępny i czy trening łatwiej było zacząć?',
    'Jeśli tak, uwzględnij porę przy kolejnym planowaniu.',
    'Jeśli nie, sama zamiana kolejności nie wystarczyła. Sprawdź obciążenie całego dnia i zakres treningu.'),
  'training:tired:start': I('Najtrudniejszy bywa start. Sam wskazałeś, że po nim zwykle jest lepiej.',
    'To dobry powód, żeby sprawdzić rozpoczęcie osobno od reszty treningu. Nie przesądza, że każde zmęczenie trzeba przełamywać.',
    'Myślenie od razu o całym treningu nie pokazuje, czy trudny jest start, czy faktycznie cały wysiłek.',
    'Przy następnej zwykłej okazji przygotuj pierwszy znany element rozgrzewki. Po nim oceń, czy chcesz i możesz kontynuować zgodnie ze swoim planem.',
    'Czy po rozpoczęciu zmieniła się chęć i gotowość do dalszego treningu?',
    'Jeśli start coś zmienił, przygotowuj pierwszy krok przed porą treningu.',
    'Jeśli zmęczenie nie minęło, nie traktuj tej próby jako nakazu dokończenia. Wróć do odpoczynku i realnego obciążenia.'),
  'food:meal:access': I('Wieczorne jedzenie zaczyna się tu od posiłku, którego nie było pod ręką.',
    'Wskazałeś, że wcześniejszy posiłek wypadł, bo nie miałeś go przy sobie ani gdzie szybko kupić. To konkretny punkt do sprawdzenia przed wieczorem.',
    'Postanowienie „wieczorem zjem mniej” zostawia bez zmiany brak wcześniejszego posiłku.',
    'Przed kolejnym podobnym dniem przygotuj zwykły posiłek albo wybierz dostępne miejsce zakupu na moment, w którym ostatnio wypadł. Sprawdź dostępność wcześniej.',
    'Czy posiłek się odbył? Jak wyglądał głód i jedzenie wieczorem w porównaniu z opisanym dniem?',
    'Jeśli wieczór wyglądał inaczej, powtórz próbę przy podobnym obciążeniu dnia.',
    'Jeśli mimo zjedzonego posiłku było podobnie, dostępność nie wyjaśnia całej sytuacji. Przyjrzyj się temu, co uruchomiło wieczorne jedzenie.'),
  'food:meal:work': I('Jedzenie było. Przerwa na nie ciągle przegrywała z pracą.',
    'W tej scenie przygotowanie kolejnego pudełka nie rozwiązuje wskazanej przeszkody. Posiłek był dostępny, ale nie dostał swojego momentu.',
    'Więcej przygotowanego jedzenia może znów zostać niezjedzone, jeśli każde zadanie będzie ważniejsze od przerwy.',
    'W kolejnym podobnym dniu połącz przerwę na posiłek z końcem konkretnego bloku pracy. Przy tym momencie sprawdź, czy zaczynasz następną sprawę, czy faktycznie jesz.',
    'Co próbowało wejść w przerwę? Czy posiłek się odbył i jak wyglądał późniejszy wieczór?',
    'Jeśli przerwa się odbyła i wieczór wyglądał inaczej, zachowaj ten punkt w dniu.',
    'Jeśli przerwa była niemożliwa z powodu obowiązków, potrzebujesz dostępnego momentu lub innej organizacji pracy. Samo przypomnienie nie wystarczy.'),
  'food:meal:restrict': I('Wieczorne jedzenie poprzedziło celowe ograniczenie wcześniejszego posiłku.',
    'Wskazałeś, że wcześniej zjadłeś mniej, żeby trzymać dietę. Warto sprawdzić, jak ta decyzja łączy się z późniejszym jedzeniem, bez oceniania jej jako braku charakteru.',
    'Jeszcze mocniejsze ograniczanie następnego dnia powtórzyłoby ten sam element, który chcesz teraz sprawdzić.',
    'Przy podobnym dniu nie pomijaj swojego zwykłego wcześniejszego posiłku w ramach nadrabiania. Zapisz, co zjadłeś, późniejszy głód i sytuację wieczorem. Jeśli masz zalecony sposób żywienia, trzymaj się ustaleń ze specjalistą.',
    'Czy po zwykłym posiłku wieczorem było podobnie? Co oprócz głodu towarzyszyło jedzeniu?',
    'Jeśli zauważysz różnicę, masz trop do porównania w kolejnej podobnej sytuacji.',
    'Jeśli nie, nie przypisuj wszystkiego wcześniejszemu posiłkowi. Sprawdź napięcie, dostępność jedzenia i przebieg wieczora.'),
  'food:no_food': I('Po pracy czekała Cię jeszcze decyzja, co w ogóle zjeść.',
    'Wskazałeś brak przygotowanego jedzenia po powrocie. Można sprawdzić, czy wcześniejsza decyzja zmienia ten konkretny wieczór.',
    'Sama wiedza o tym, co jeść, nie zapewnia dostępnego posiłku po powrocie.',
    'Przed końcem kolejnego dnia pracy wybierz jeden zwykły, dostępny posiłek na powrót. Sprawdź składniki albo miejsce zakupu. Nie planuj przy okazji całego tygodnia.',
    'Czy ten posiłek faktycznie był dostępny? Czy po powrocie nadal zaczynałeś od szukania czegokolwiek?',
    'Jeśli gotowa decyzja ułatwiła powrót, zachowaj moment wyboru przed końcem pracy.',
    'Jeśli jedzenie było gotowe, a wieczór wyglądał tak samo, dostępność nie jest wystarczającym wyjaśnieniem. Sprawdź sytuację bezpośrednio przed jedzeniem.'),
  'food:tension': I('Jedzenie było też chwilą przerwy po napiętym dniu.',
    'Tak opisałeś tę scenę. Zanim zmienisz jedzenie, warto sprawdzić, co ta chwila dawała oprócz samego posiłku.',
    'Usunięcie jedzenia bez zauważenia potrzeby przerwy zostawia tę potrzebę bez odpowiedzi.',
    'Przy kolejnej takiej chwili nazwij, czego potrzebujesz: posiłku, ciszy, oderwania od zadań czy kilku z tych rzeczy. Zjedz, jeśli jesteś głodny. Zauważ też, czy w ogóle pozwalasz sobie odpocząć bez jedzenia.',
    'Czy podobna potrzeba wraca po napiętym dniu? Czy pojawia się także po zwykłym posiłku?',
    'Jeśli chodzi również o odpoczynek, wybierz jego dostępną formę przed następnym podobnym wieczorem.',
    'Jeśli dominował głód, wróć do wcześniejszych posiłków. Nie trzeba dorabiać emocjonalnego wyjaśnienia.'),
  'food:social': I('To było jedzenie w konkretnej sytuacji towarzyskiej.',
    'Wskazałeś spotkanie. Sam ten fakt nie mówi, że trzeba ograniczyć wyjścia. Przyjrzyjmy się temu, co działo się po nim.',
    'Rozciąganie jednego spotkania na ocenę całego tygodnia może prowadzić do niepotrzebnych zmian.',
    'Po kolejnym wyjściu wróć do swojego zwykłego posiłku przy najbliższej okazji. Zapisz, czy samo spotkanie skończyło temat, czy wpłynęło na dalsze decyzje o jedzeniu.',
    'Czy sytuacja została przy jednym wyjściu, czy zmieniła kolejne posiłki?',
    'Jeśli zwykły rytm wrócił, oceń spotkanie w jego rzeczywistej skali.',
    'Jeśli kolejne posiłki też się zmieniły, sprawdź konkretnie pierwszą decyzję po wyjściu, zamiast od razu rezygnować ze spotkań.'),
  'sleep:screen:own': I('Wieczór z ekranem był pierwszą częścią dnia tylko dla Ciebie.',
    'Tak opisałeś tę chwilę. Warto sprawdzić, czy odsuwanie snu wiąże się z brakiem wcześniejszego czasu bez obowiązków.',
    'Zakaz telefonu zabiera tę chwilę, ale sam nie tworzy innego czasu dla Ciebie.',
    'Wybierz w kolejnym dniu jedną dostępną chwilę bez pracy i obowiązków przed końcem wieczora. Sam zdecyduj, na co ją przeznaczysz. Zapisz, czy później nadal chciałeś przedłużać czas z ekranem.',
    'Czy ta chwila faktycznie się pojawiła? Czy zmieniło się to, jak kończyłeś wieczór?',
    'Jeśli łatwiej było zakończyć wieczór, powtórz próbę z zachowaniem czasu dla siebie.',
    'Jeśli nic się nie zmieniło, ta hipoteza nie wystarcza. Sprawdź sam moment kończenia oglądania i to, czy chciałeś już spać.'),
  'sleep:screen:auto': I('W tej scenie uciekł Ci moment zakończenia oglądania.',
    'Wskazałeś, że nie zauważyłeś mijającego czasu. Możemy sprawdzić, czy wyraźny koniec zmienia porę położenia się.',
    'Postanowienie „dziś krócej” nie określa momentu, w którym podejmujesz decyzję o końcu.',
    'Przed włączeniem ekranu wybierz moment zakończenia, np. koniec wybranego odcinka. Gdy nadejdzie, zapisz, czy kończysz, czy świadomie zaczynasz kolejną rzecz.',
    'Czy zauważyłeś ustalony moment? Co zrobiłeś wtedy i o której poszedłeś do łóżka?',
    'Jeśli wyraźny koniec pomógł, zachowaj go przed kolejnym oglądaniem.',
    'Jeśli zauważyłeś go i oglądałeś dalej, utrata poczucia czasu nie wyjaśnia całości. Sprawdź, co chciałeś jeszcze zyskać z tego wieczora.'),
  'sleep:screen:awake': I('Telefon pojawił się po trudności z zaśnięciem.',
    'Wskazałeś taką kolejność. Nie ma więc podstaw, żeby na podstawie tej odpowiedzi uznać ekran za początek całej sytuacji.',
    'Rada „odłóż telefon” pomija informację, że trudność zaczęła się wcześniej.',
    'Przy następnej podobnej nocy zanotuj, kiedy się położyłeś, kiedy sięgnąłeś po telefon i co pamiętasz z czasu pomiędzy. Zwróć uwagę, czy podobna trudność powtarza się także bez telefonu.',
    'Czy problem z zaśnięciem znów poprzedzał ekran? Jak wpływał na następny dzień?',
    'Jeśli ta kolejność się powtarza, zachowaj zapis. Nawracającą trudność ze snem warto omówić ze specjalistą.',
    'Jeśli ekran pojawił się wcześniej, masz inną scenę do sprawdzenia. Nie trzeba wciskać jej w poprzednie wyjaśnienie.'),
  'sleep:work': I('Przed późniejszym snem nadal dokańczałeś pracę.',
    'Wskazałeś dokańczanie pracy przed późniejszym położeniem się. Sprawdźmy decyzję o końcu pracy, nie tylko godzinę wejścia do łóżka.',
    'Wcześniejszy alarm na sen nie zamknie zadania, które nadal próbujesz dokończyć.',
    'Przy kończeniu kolejnego dnia zapisz niedokończoną rzecz oraz pierwszy ruch na jutro. Ustal ostatnie zadanie na dziś i sprawdź, czy po nim rzeczywiście zamykasz pracę.',
    'Co jeszcze próbowało wejść po końcu? Kiedy skończyłeś pracę i kiedy się położyłeś?',
    'Jeśli łatwiej było skończyć, zachowaj zapis dalszego kroku na jutro.',
    'Jeśli obowiązkowa praca nadal trwała, potrzebujesz realniejszego końca dnia lub zmiany zobowiązań. Sama kartka nie usuwa obciążenia.'),
  'sleep:family': I('Pora snu zależała też od obowiązków domowych.',
    'Wskazałeś opiekę lub sprawy w domu. Nie wiadomo jeszcze, która z nich miała stały termin i czy można ją przesunąć.',
    'Sztywna godzina snu nie zmienia sama z siebie obowiązku, który nadal trwa.',
    'Przy kolejnym takim wieczorze nazwij ostatni obowiązek przed snem. Sprawdź, czy da się go wykonać wcześniej, podzielić z kimś czy jest nieprzesuwalny. Nie zakładaj cudzej dostępności.',
    'Który obowiązek przesunął sen? Czy miał realną alternatywę wykonania?',
    'Jeśli znalazłeś alternatywę, sprawdź ją przy następnym podobnym wieczorze.',
    'Jeśli obowiązek jest nieprzesuwalny, plan snu musi go uwzględniać. Nie oceniaj tego jak nieprzestrzegania własnego postanowienia.'),
  'sleep:thoughts': I('Do łóżka poszedłeś. Sprawy z dnia przyszły razem z Tobą.',
    'Wskazałeś myśli po położeniu się. To inna sytuacja niż świadome odsuwanie pory snu.',
    'Samo wcześniejsze wejście do łóżka nie sprawdzi, co utrzymuje uwagę przy tych sprawach.',
    'Przy końcu kolejnego dnia zapisz niedokończone sprawy i najbliższy krok do każdej. Wieczorem zauważ, czy wracają te same myśli, czy inne.',
    'Czy zapis coś zmienił? Czy myśli dotyczyły zadań, których dalszy krok już ustaliłeś?',
    'Jeśli pomogło, zachowaj zamknięcie spraw przed końcem dnia.',
    'Jeśli nie, ten sposób nie odpowiedział na przyczynę. Powtarzającą się trudność ze snem omów ze specjalistą.'),
  'energy:short_sleep': I('Trudniejsze skupienie poprzedziła krótsza noc.',
    'Podałeś tę kolejność. Nie dowodzi ona przyczyny, ale daje porównanie, od którego można zacząć.',
    'Dodanie kolejnego sposobu na koncentrację nie sprawdzi, czy podobnie jest po zwykłej nocy.',
    'Porównaj najbliższy podobny dzień pracy po nocy o zwykłej dla Ciebie długości z opisanym dniem. Zapisz porę snu, pobudki i moment, w którym trudniej było się skupić.',
    'Czy trudność wróciła o podobnej porze? Czy obciążenie pracą było porównywalne?',
    'Jeśli zauważysz różnicę, powtórz obserwację, zanim uznasz krótszą noc za całe wyjaśnienie.',
    'Jeśli było podobnie, sprawdź przebieg pracy i przerwy. Utrzymujących się dolegliwości nie rozstrzyga ten wynik.'),
  'energy:meal': I('Przerwa na jedzenie ustąpiła miejsca pracy.',
    'Wskazałeś przesunięty posiłek przed trudnością ze skupieniem. Sprawdźmy ten fragment dnia w porównywalnych warunkach.',
    'Wynik nie mówi, że każdy spadek skupienia wynika z jedzenia. Trzeba sprawdzić wskazany ciąg.',
    'Przed podobnym blokiem pracy zapewnij dostęp do swojego zwykłego posiłku oraz moment przerwy. Zanotuj, czy udało się zjeść i kiedy później pojawiła się trudność ze skupieniem.',
    'Czy przerwa się odbyła? Czy trudność pojawiła się w podobnym momencie mimo posiłku?',
    'Jeśli zauważyłeś różnicę, powtórz porównanie przy podobnym obciążeniu.',
    'Jeśli nie, nie poprawiaj w ciemno samego jedzenia. Sprawdź inne zmiany między tymi dniami.'),
  'energy:no_break': I('Spadek skupienia pojawił się po pracy bez przerwy.',
    'Wskazałeś długi blok bez przerwy. Można sprawdzić zmianę jego przebiegu bez dokładania nowego zadania po pracy.',
    'Dłuższe siedzenie przy zadaniu nie pozwala samo w sobie ocenić, czy ten sposób pracy nadal Ci służy.',
    'W podobnym bloku wybierz naturalny koniec jednego etapu i zrób wtedy przerwę od zadania. Po powrocie zapisz, od czego dokładnie zaczynasz.',
    'Czy po powrocie łatwiej było utrzymać uwagę przy jednym zadaniu? Czy przerwa faktycznie się odbyła?',
    'Jeśli pomogła, sprawdź ją ponownie w podobnym miejscu pracy.',
    'Jeśli nie, zobacz, czy trudność dotyczyła zmęczenia, niejasnego zadania czy przerywania przez inne sprawy.'),
  'energy:many_tasks': I('Uwaga co chwilę zmieniała zadanie.',
    'Wskazałeś przeskakiwanie między sprawami. To pozwala oddzielić trudność ze skupieniem od warunków, w których próbujesz się skupić.',
    'Ocenianie własnej koncentracji bez zauważenia przerwań może prowadzić do nietrafionej rady.',
    'Wybierz jeden fragment zadania z jasnym końcem. Do jego zakończenia zapisuj wpadające sprawy bez rozpoczynania ich, o ile nie wymagają pilnej reakcji.',
    'Co przerwało pracę: zewnętrzna prośba, własne przełączenie czy brak jasnego następnego kroku?',
    'Jeśli fragment udało się dokończyć, zachowaj sposób odkładania niepilnych spraw.',
    'Jeśli przerwania były obowiązkowe, trzeba uwzględnić dostępność w pracy. Jeśli ich nie było, sprawdź jasność zadania i zmęczenie.'),
  'weekend:late': I('Po weekendzie wracały obowiązki, zanim wróciły zwykłe godziny.',
    'Wskazałeś przesunięte pory snu i pobudki. Przyjrzyjmy się przejściu do zwykłego dnia zamiast oceniać cały weekend.',
    'Plan na poniedziałek może zakładać inne warunki niż te, z którymi faktycznie go zaczynasz.',
    'Przy najbliższym weekendzie zapisz porę położenia się, pobudki oraz pierwszy obowiązek po weekendzie. Sprawdź, czy plan na powrót mieści się w realnych godzinach.',
    'Gdzie nastąpiło pierwsze zderzenie: pobudka, posiłek, start pracy czy trening?',
    'Jeśli znajdziesz konkretny punkt, do niego dopasuj następny powrót.',
    'Jeśli powrót poszedł dobrze mimo przesunięcia godzin, nie uznawaj go automatycznie za problem.'),
  'weekend:no_return': I('Nie ustaliłeś, od czego wracasz po weekendzie.',
    'Wskazałeś, że nie ustaliłeś momentu powrotu. Sprawdźmy pierwszą zwykłą czynność po weekendzie.',
    '„Od poniedziałku wracam” nie ustala, od którego posiłku lub treningu naprawdę zaczynasz.',
    'Przed następnym weekendem wybierz pierwszy zwykły posiłek po wyjściu i zadbaj o jego dostępność. Nie czekaj na idealnie poukładany cały dzień.',
    'Czy wróciłeś przy ustalonej okazji? Co stało się z kolejną decyzją?',
    'Jeśli powrót się udał, zachowaj tę konkretną okazję.',
    'Jeśli nie, zapisz co stanęło na drodze: brak jedzenia, zmiana planów czy chęć czekania na nowy początek.'),
  'weekend:compensate': I('Po weekendzie plan zmienił się w nadrabianie.',
    'Wskazałeś mniej jedzenia albo dodatkowy trening w ramach odrabiania. Warto sprawdzić, co dzieje się po powrocie do zwykłego planu.',
    'Dodatkowe wymagania po weekendzie mogą utrudnić ocenę, czy sam zwykły rytm jest do utrzymania.',
    'Przy kolejnym powrocie wybierz zwykły posiłek i trening zgodny z dotychczasowym planem, bez dokładania nadrabiania. Zapisz pierwszą decyzję, którą najtrudniej było zostawić bez zmiany.',
    'Czy wróciłeś do zwykłego rytmu? Czy chęć nadrabiania zmieniła kolejny posiłek lub trening?',
    'Jeśli zwykły powrót się udał, zachowaj go jako punkt odniesienia.',
    'Jeśli nie, przyjrzyj się tej pierwszej decyzji. Sam weekend nie mówi jeszcze, dlaczego powrót się wydłużył.'),
  'weekend:work': I('W weekend nadal było nadrabianie pracy.',
    'Wskazałeś pracę przed trudnym powrotem do zwykłego rytmu. Sprawdźmy, ile z weekendu faktycznie było wolne od obowiązków.',
    'Samo nazwanie soboty i niedzieli wolnymi dniami nie pokazuje, czy znalazł się w nich odpoczynek.',
    'Przed kolejnym weekendem oddziel zadanie, które rzeczywiście musi być wykonane wtedy, od tych, które mogą dostać termin w tygodniu. Zapisz, co ostatecznie weszło w wolny czas.',
    'Czy obciążenie było takie, jak ustaliłeś? Czy został czas na odpoczynek i jak wyglądał powrót?',
    'Jeśli ograniczenie pracy coś zmieniło, sprawdź podobny układ ponownie.',
    'Jeśli praca nadal zajęła weekend, przyjrzyj się temu, co ją tam przeniosło. Plan odpoczynku sam nie zmniejsza zobowiązań.'),
};
export function getInsight(a: Answers): Insight | undefined {
  const key = `${a.scene}:${a.before}`;
  return INSIGHTS[`${key}:${a.context}`] || INSIGHTS[key];
}
export function getMaintenance(a: Answers): Insight {
  const anchors: Record<string, [string, string, string]> = {
    space: ['W udanym tygodniu było więcej wolnego miejsca.', 'Sam wskazałeś mniejsze obciążenie. Warto zachować realną skalę planu, gdy obowiązków znowu przybędzie.', 'Przed najbliższym bardziej zajętym dniem wybierz, które elementy obecnego planu nadal się mieszczą. Resztę świadomie przesuń.'],
    prepared: ['Pomogło to, co było ustalone przed początkiem dnia.', 'Wskazałeś wcześniejsze przygotowanie jedzenia i treningu. To konkretny warunek, który warto zachować.', 'Zapisz jedną decyzję o jedzeniu lub treningu, którą podjąłeś wcześniej i która pomogła. Powtórz właśnie ją przed kolejnym podobnym dniem.'],
    flex: ['Dopasowanie planu pomogło Ci utrzymać tydzień.', 'Wskazałeś zmienianie planu wraz z dniem. Sprawdź, którą decyzję można wykorzystać ponownie.', 'Zapisz jedną korektę z ostatniego tygodnia: co zmieniło się w dniu i co zrobiłeś wtedy z planem. Użyj tej samej reguły przy podobnej zmianie.'],
    help: ['W tym tygodniu część obowiązków przejął ktoś inny.', 'Wskazałeś konkretną pomoc. Dobrze uwzględnić jej dostępność, planując kolejny tydzień.', 'Przed powtórzeniem tego tygodnia sprawdź, czy ta sama pomoc jest dostępna. Jeśli nie, zmniejsz zakres lub wybierz inne okno, zamiast zakładać taki sam plan.'],
    unknown: ['Tydzień poszedł dobrze. Warto zapamiętać, co wtedy było możliwe.', 'Nie wskazałeś konkretnego warunku udanego tygodnia. Nie trzeba z tego robić problemu.', 'W najbliższym zwykłym dniu zapisz jedną rzecz, która poszła tak, jak chciałeś oraz to, co ją ułatwiło. Na razie niczego nie zmieniaj.'],
  };
  const [title, explanation, action] = a.scene === 'steady' ? anchors[String(a.anchor)] || anchors.unknown : ['Masz zmianę, która już działa. Sprawdź, co pozwala ją utrzymać.', `Wskazałeś działającą próbę: ${String(a.previous) === 'plan' ? 'plan treningu albo jedzenia' : String(a.previous) === 'calendar' ? 'ustalone godziny' : String(a.previous) === 'small' ? 'mniejszy zakres i jedną rzecz' : 'czyjąś pomoc'}. Nie dokładamy nowego zadania w to samo miejsce.`, 'Przy następnej podobnej sytuacji zastosuj tę samą działającą próbę. Zapisz, co umożliwiło jej wykonanie i czy nadal było dostępne.'];
  return I(title, explanation, 'Nowa metoda mogłaby zmienić coś, co obecnie Ci służy. Najpierw zachowaj warunek, który pomógł.', action, 'Czy udało się zachować wskazany warunek? Czy ta część tygodnia znów poszła zgodnie z Twoim zamiarem?', 'Jeśli tak, masz konkretną rzecz do powtórzenia.', 'Jeśli nie, nazwij warunek, który zniknął. Do niego dopasuj korektę.');
}
export function getObservation(a: Answers): Insight {
  const target: Record<string, [string, string]> = {
    training: ['treningu', 'Zapisz planowany start, to, co działo się bezpośrednio przed nim oraz czy trening się odbył.'],
    food: ['wieczornego jedzenia', 'Zapisz wcześniejszy posiłek oraz sytuację bezpośrednio przed jedzeniem wieczorem.'],
    sleep: ['końca wieczora', 'Zapisz ostatnią czynność przed łóżkiem oraz to, czy później się położyłeś, czy nie mogłeś zasnąć.'],
    energy: ['skupienia w pracy', 'Zapisz pierwszą chwilę trudniejszego skupienia, wykonywane zadanie i to, co działo się przed nią.'],
    weekend: ['powrotu po weekendzie', 'Przy najbliższym weekendzie zapisz pierwszą zaplanowaną czynność po nim oraz co stało się z jej wykonaniem.'],
  };
  const scene = target[String(a.scene)] ? String(a.scene) : ({ form: 'training', energy: 'energy', sleep: 'sleep', head: 'sleep' }[String(a.goal)] || 'energy');
  const [name, action] = target[scene];
  const context = getContextQuestion(String(a.scene), String(a.before));
  const unknownContext = context && (!a.context || a.context === 'unknown');
  const noMiss = a.scene === 'training' && (a.planned === 0 || a.missed === 0);
  return I(
    noMiss ? a.planned === 0 ? 'Nie było zaplanowanego treningu do rozliczenia.' : 'Zaplanowane treningi się odbyły. Trudniejszy moment nie oznacza opuszczenia.' : `Przyjrzyjmy się jednej sytuacji dotyczącej ${name}.`,
    noMiss ? 'Twoje liczby nie pokazują niewykonanego treningu. Możesz sprawdzić warunki wykonania, bez dopisywania sobie straty.' : unknownContext ? `Brakuje szczegółu, który zmienia zalecenie: ${context.title} Bez niego łatwo byłoby podsunąć nietrafioną radę.` : 'Nie mamy jeszcze wystarczająco konkretnej lub powtarzalnej sceny, żeby wybierać zmianę. Poniżej masz dokładnie określony fragment do sprawdzenia.',
    'Wynik ma pomóc rozstrzygnąć niewiadomą. Nie trzeba wybierać problemu tylko dlatego, że formularz o niego pyta.',
    unknownContext ? `${action} Dopisz odpowiedź na: ${context.title}` : action,
    'Czy pojawiła się różnica między zamiarem a wykonaniem? Jeśli tak, w którym momencie? Jeśli nie, zachowaj też ten fakt.',
    'Jeśli znajdziesz konkretny moment, wróć do odpowiedzi z tym przykładem. To pozwoli dobrać następny ruch.',
    'Jeśli nie widzisz trudności ani kosztu, zostaw tę część tygodnia w spokoju. Nie musisz niczego naprawiać.');
}

export const INSIGHT_REACTIONS = [
  { id: 'new', label: 'Na to wcześniej nie patrzyłem.' },
  { id: 'known', label: 'Wiedziałem, ale nie miałem pomysłu, co z tym zrobić.' },
  { id: 'obvious', label: 'To już wiedziałem i próbowałem.' },
  { id: 'off', label: 'To nie oddaje mojej sytuacji.' },
];
export function reactionNext(reaction: string): string {
  return ({ new: 'Zacznij od próby opisanej wyżej. Jej wynik pokaże, czy ten trop pasuje do Twojego dnia.', known: 'Masz teraz moment działania oraz warunek oceny. Wróć po próbie do „Co wyszło”, żeby wybrać kolejny ruch.', obvious: 'Nie powtarzaj zadania tylko dlatego, że pojawiło się w wyniku, jeśli już je próbowałeś. Sprawdź, czy zapis poprzedniej próby oddaje to, co zrobiłeś. Jeśli tak, zostaw odpowiedź: automat nie ma dość szczegółów, żeby dobrać kolejną zmianę. Możesz pobrać wynik jako zapis do dalszej rozmowy.', off: 'Ten trop nie pasuje. Wróć do sceny i tego, co było wcześniej. Jeśli żadna odpowiedź nie opisuje sytuacji, wybierz „Nie wiem albo było inaczej”, zamiast dopasowywać siebie do wyniku.' } as Record<string, string>)[reaction] || '';
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
