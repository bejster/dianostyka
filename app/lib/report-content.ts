// report-content.ts: Glęboka treść wyniku per najsłabszy obszar.
// Reguła: belief-shift + mechanizm neuro + analogia z życia + ukryty koszt.
// Głos Michała, model edukacyjny (nie diagnoza), zero banów (chaos/system/em-dash out).

export interface DomainDepth {
  reframe: { nie: string; ale: string };   // "To nie <nie>. To <ale>."
  mechanizm: string;                         // co się naprawdę dzieje: neuro + analogia
  analogia: string;                          // jedno zdanie-kotwica
  chain: { tag: string; text: string }[];    // łańcuch pęknięcia (5 etapów)
  koszt: string;                             // stawka, nie liczba
  nieRob: string[];                          // czego teraz nie robić
}

export const DOMAIN_DEPTH: Record<string, DomainDepth> = {
  'Sen': {
    reframe: {
      nie: 'brak charakteru o dwudziestej drugiej',
      ale: 'niedospana kora przedczołowa, która wieczorem przestaje hamować',
    },
    mechanizm: 'Krótki, płytki sen to mniej fazy głębokiej, w której mózg odbudowuje hamulce. Rano kortyzol, który miał Cię podnieść, rusza z opóźnieniem, więc pierwsze godziny nadrabiasz kawą. Wieczorem, gdy to paliwo się kończy, znika też kontrola nad lodówką i telefonem.',
    analogia: 'Hamulce zużywają się w nocy. Jak nie doładujesz ich snem, wieczorem jedziesz bez nich.',
    chain: [
      { tag: 'Start', text: 'Za krótki, płytki sen w nocy' },
      { tag: 'Rano', text: 'Kortyzol rusza z opóźnieniem, budzisz się na minusie' },
      { tag: 'Dzień', text: 'Ciągniesz na kawie zamiast na regeneracji' },
      { tag: 'Naprawiasz nie to', text: 'Dokładasz kawę i kolejny trening' },
      { tag: 'Wieczór', text: 'Pada kontrola, jedzenie i ekran tną sen na kolejną dobę' },
    ],
    koszt: 'Jedna taka noc to nie jeden gorszy dzień. To reakcja, która zjada Ci dwie, trzy kolejne doby.',
    nieRob: [
      'Nie dokładaj kolejnego treningu, gdy śpisz pięć godzin',
      'Nie tnij mocniej kalorii, niedobór snu i tak wygra',
      'Nie licz, że kawa to nadrobi, ona tylko przesuwa rachunek na wieczór',
    ],
  },
  'Stres': {
    reframe: {
      nie: 'to, że nie umiesz się zmobilizować',
      ale: 'oś stresu, która nie ma kiedy się wyłączyć',
    },
    mechanizm: 'Stała gotowość w pracy trzyma wysoki kortyzol przez całą dobę. Ciało cały czas myśli, że jest zagrożenie, więc odkłada regenerację na potem. To potem nie przychodzi, a kortyzol po cichu psuje sen, apetyt i decyzje wieczorem.',
    analogia: 'Kortyzol to alarm, nie paliwo. Jak wyje bez przerwy, przestajesz go słyszeć, a on dalej robi swoje.',
    chain: [
      { tag: 'Start', text: 'Napięcie, które nie schodzi po wyjściu z pracy' },
      { tag: 'Doba', text: 'Kortyzol wysoko rano i wieczorem' },
      { tag: 'Regeneracja', text: 'Odłożona na później, które nie nadchodzi' },
      { tag: 'Naprawiasz nie to', text: 'Wpychasz więcej dyscypliny w rozstrojony układ' },
      { tag: 'Rano', text: 'Wstajesz znów na napięciu, nie na energii' },
    ],
    koszt: 'Dowozisz tydzień siłą. Rachunek przychodzi w weekend albo na urlopie, gdy napięcie puszcza i wszystko się sypie naraz.',
    nieRob: [
      'Nie dokładaj obowiązków do i tak przeciążonej doby',
      'Nie traktuj zmęczenia jak lenistwa',
      'Nie zostawiaj wyciszenia na sam koniec dnia, wtedy już nie zadziała',
    ],
  },
  'Żywienie': {
    reframe: {
      nie: 'brak silnej woli o dwudziestej pierwszej',
      ale: 'rachunek za dzień zbudowany na niedojedzeniu i napięciu',
    },
    mechanizm: 'Wieczorny głód rzadko zaczyna się wieczorem. Zaczyna się rano, gdy pomijasz białko i jedziesz na kawie. Cukier skacze i spada, mózg szuka szybkiej nagrody, a wieczorem, gdy kontrola pada, prowadzi Cię prosto do lodówki.',
    analogia: 'Dopamina to waluta, którą mózg płaci za ulgę. Wieczorem płacisz nią za cały dzień napięcia naraz.',
    chain: [
      { tag: 'Start', text: 'Niedojedzony poranek, mało białka' },
      { tag: 'Dzień', text: 'Cukier skacze i spada, energia w dołku' },
      { tag: 'Wieczór', text: 'Kontrola pada, mózg szuka szybkiej nagrody' },
      { tag: 'Naprawiasz nie to', text: 'Tniesz kalorie jeszcze mocniej nazajutrz' },
      { tag: 'Pętla', text: 'Głębszy niedobór, silniejszy napad wieczorem' },
    ],
    koszt: 'To nie kwestia jednego wieczoru. To codzienne odbicie, które kasuje deficyt zrobiony w dzień i trzyma wagę w miejscu.',
    nieRob: [
      'Nie obcinaj śniadania, żeby nadrobić wieczór',
      'Nie licz kalorii bez białka rano',
      'Nie traktuj napadu jak porażki charakteru',
    ],
  },
  'Weekend': {
    reframe: {
      nie: 'sobota',
      ale: 'poniedziałek i wtorek, które kasujesz dwoma dniami innego rytmu',
    },
    mechanizm: 'Dwa dni przesuniętego snu i luźniejszego jedzenia rozstrajają zegar biologiczny. W niedzielę w nocy nie możesz zasnąć, bo ciało myśli, że jest sobota. Poniedziałek i wtorek jedziesz na oparach, a rytm wraca dopiero w środku tygodnia.',
    analogia: 'To jak przelot przez kilka stref czasowych bez samolotu. Ciało nadrabia różnicę przez trzy dni.',
    chain: [
      { tag: 'Start', text: 'Przesunięte pobudki i jedzenie luzem w weekend' },
      { tag: 'Niedziela', text: 'Zegar rozstrojony, sen nie przychodzi' },
      { tag: 'Poniedziałek', text: 'Start na oparach, apetyt i energia rozjechane' },
      { tag: 'Naprawiasz nie to', text: 'Obiecujesz sobie czysty poniedziałek' },
      { tag: 'Środa', text: 'Rytm dopiero wraca, tydzień w połowie stracony' },
    ],
    koszt: 'Pięć dni budujesz, dwa kasujesz. W praktyce zostają Ci dwa, trzy dni obrotu na tydzień, reszta to odrabianie weekendu.',
    nieRob: [
      'Nie ratuj poniedziałku głodówką',
      'Nie przesuwaj pobudki w weekend o więcej niż godzinę',
      'Nie czekaj z powrotem do rytmu na kolejny poniedziałek',
    ],
  },
  'Trening': {
    reframe: {
      nie: 'zły plan treningowy',
      ale: 'plan, który znosi tylko idealny tydzień, a takiego nie prowadzisz',
    },
    mechanizm: 'Plan bez wersji minimum przy pierwszym pożarze w pracy odpada w całości. Mózg widzi wszystko albo nic, a skoro dziś nie da się wszystkiego, wybiera nic. Nie brakuje Ci motywacji, brakuje progu tak niskiego, że przejdziesz go w najgorszy dzień.',
    analogia: 'Most zaprojektowany tylko na idealną pogodę nie jest mocny. Jest kruchy.',
    chain: [
      { tag: 'Start', text: 'Plan napięty pod idealny tydzień' },
      { tag: 'Pożar', text: 'Praca albo gorszy dzień rozbija harmonogram' },
      { tag: 'Wszystko albo nic', text: 'Skoro nie da się w pełni, odpada całość' },
      { tag: 'Naprawiasz nie to', text: 'Dokładasz kolejne jednostki na start' },
      { tag: 'Odpad', text: 'Kilka dni przerwy, potem znów od zera' },
    ],
    koszt: 'Nie tracisz jednego treningu. Tracisz ciągłość, a bez niej sylwetka stoi mimo lat na siłowni.',
    nieRob: [
      'Nie dokładaj jednostek, których nie utrzymasz w zły tydzień',
      'Nie zaczynaj od siedmiu treningów, gdy robisz trzy',
      'Nie karz się przerwą, ustaw wersję minimum na taki dzień',
    ],
  },
  'Głowa': {
    reframe: {
      nie: 'odchylenie od planu',
      ale: 'liczba dni, których potrzebujesz, żeby po nim wrócić',
    },
    mechanizm: 'Myślenie zero-jedynkowe sprawia, że jeden gorszy posiłek kasuje cały tydzień. Nie dlatego, że jesteś słaby, tylko dlatego, że nie masz procedury powrotu. Mózg, który nie wie jak wrócić, czeka na nowy start, a każdy dzień czekania to kolejny dzień na minusie.',
    analogia: 'Silny nie ten, kto nigdy nie upada. Silny ten, kto wraca następnego dnia, nie w następny poniedziałek.',
    chain: [
      { tag: 'Start', text: 'Jeden gorszy posiłek albo opuszczony trening' },
      { tag: 'Zero-jedynkowo', text: 'Skoro dzień zepsuty, odpuszczasz resztę' },
      { tag: 'Czekanie', text: 'Czekasz na czysty poniedziałek' },
      { tag: 'Naprawiasz nie to', text: 'Szukasz nowego planu zamiast punktu powrotu' },
      { tag: 'Koszt', text: 'Kolejne dni na minusie, zanim ruszysz' },
    ],
    koszt: 'Wiedzę masz aż nadto. Bez punktu powrotu każde potknięcie kosztuje Cię nie jeden dzień, tylko cały tydzień.',
    nieRob: [
      'Nie kasuj tygodnia po jednym gorszym posiłku',
      'Nie czekaj na idealny start',
      'Nie szukaj nowego planu, ustaw procedurę powrotu na następny dzień',
    ],
  },
};

export function depthFor(worstLabel: string): DomainDepth {
  return DOMAIN_DEPTH[worstLabel] || DOMAIN_DEPTH['Sen'];
}
