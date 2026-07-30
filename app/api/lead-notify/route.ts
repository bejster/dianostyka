import { NextRequest, NextResponse } from 'next/server';

// ── Powiadomienie o leadzie z diagnostyki -> dedykowany kanal Telegram (np. "HiT Leady") ──
// Odpala sie ZAWSZE, gdy ktos skonczy quiz (nie wymaga maila). Kwalifikacja jest liczona po stronie
// klienta (page.tsx qualify()) i przekazana tutaj tylko do sformatowania wiadomosci.
// Kanal: TELEGRAM_LEADS_CHAT_ID; gdy nieustawiony, spada na TELEGRAM_CHAT_ID, zeby nic sie nie gubilo.
export async function POST(req: NextRequest) {
  try {
    const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const token = process.env.TELEGRAM_BOT_TOKEN;
    // Domyslnie kanal "HiT Leady" (chat_id z t.me/c/4328603395). Env moze nadpisac.
    const chat = process.env.TELEGRAM_LEADS_CHAT_ID || '-1004328603395';
    if (!token || !chat) {
      return NextResponse.json({ ok: false, reason: 'no_telegram_config' });
    }

    const s = (v: unknown, max = 200) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
    const score = Number(b.score) || 0;
    const priority = b.priority_lead === true;
    const ico = priority ? '🔥' : score >= 40 ? '🔴' : score >= 20 ? '🟡' : '🟢';
    const intentMap: Record<string, string> = {
      in_prowadz: 'chce prowadzenia', in_zobacz: 'chce zobaczyc pomoc', in_sam: 'woli sam', in_niewiem: 'nie wie',
    };
    const startMap: Record<string, string> = {
      sw_7dni: 'w tym tygodniu', sw_30dni: 'w tym miesiacu', sw_kwartal: 'za 2-3 mies', sw_sprawdzam: 'tylko sprawdza',
    };

    // ── Gotowy opener DM (per archetyp, w glosie Michala) + wskazowka jak grac ──
    const im = s(b.imie, 40);
    const greet = im ? `Cześć ${im}` : 'Cześć';
    const OPENERS: Record<string, string> = {
      weekend_reset: `${greet}, widziałem Twój wynik. Piątkę dni budujesz, a weekend kasuje Ci to w dwa i w poniedziałek startujesz od minusa. Powiedz mi szczerze: ile z ostatnich czterech poniedziałków ruszyłeś z pełną głową?`,
      wieczorny_odpad: `${greet}, Twój wynik to klasyk. W dzień ogarniasz, a wieczorem lodówka i telefon do późna przejmują stery. Ciekawi mnie jedno: ten wieczór bardziej ucieka Ci na jedzeniu czy na scrollowaniu do pierwszej?`,
      glowa_zajezdza: `${greet}, u Ciebie ciało dostaje resztki, bo głowa po robocie nie schodzi z obrotów. Powiedz mi: o której odpuszczasz myślenie o robocie wieczorem?`,
      wiedza_bez_wdrozenia: `${greet}, Twój wynik mówi wprost: wiedzy masz aż nadto, a tydzień wykłada Ci się na wykonaniu. Ile razy w tym roku odpaliłeś plan, który padł przed miesiącem?`,
      silnik_bez_paliwa: `${greet}, robisz swoje, a i tak lecisz na pół mocy i coś pod spodem nie gra. Od jak dawna masz tak, że niby wszystko ok, a energii zero?`,
    };
    let opener = OPENERS[s(b.archetypKey, 40)] || `${greet}, widziałem Twój wynik z diagnostyki. Powiedz mi, co Cię w tym tygodniu najbardziej wkurza?`;
    if (b.pain) opener += ` Sam napisałeś, że najbardziej wkurza Cię: „${s(b.pain, 200)}”. Od tego bym zaczął.`;
    const intent = s(b.intencja, 20);
    const closer = priority
      ? 'GORĄCY. Ból wysoki, budżet jest, chce prowadzenia. Otwórz pytaniem, po 1-2 odpowiedziach proponuj rozmowę o prowadzeniu 1:1.'
      : (intent === 'in_prowadz' || intent === 'in_zobacz')
      ? 'CIEPŁY. Chce z kimś, ale nie docisnij od razu. Zbuduj 2-3 wymiany, potem miękko rzuć współpracę.'
      : 'ZIMNY albo woli sam. Otwórz wartością, zero pitchu. Daj jeden konkret z jego wyniku, zbuduj zaufanie, wróć później.';

    // ── PELNA ZAGRYWKA DM: pogleb (forma/energia/libido) -> drugie dno + koszt -> most ──
    const key = s(b.archetypKey, 40);
    // Pytania POGŁĘBIAJĄCE dobrane z tego, co lead zaznaczył (efekt „skąd on wie"), jedno na raz.
    const objawy = s(b.objawy, 200).split(',').map((x) => x.trim()).filter(Boolean);
    const Q: Record<string, string> = {
      libido: '„Libido i poranny gaz, tak jak kilka lat temu, czy zauważalnie w dół? Pytam nie bez powodu."',
      belly: '„Ile lat już trenujesz i co konkretnie próbowałeś, że efektu dalej nie widać? W którym momencie zawsze pada?"',
      confidence: '„Łapiesz się czasem na tym, że omijasz lustro albo zdjęcia? Szczerze."',
      fatigue: '„Śpisz swoje godziny, a i tak wstajesz jak po nocnej zmianie? Od jak dawna tak masz?"',
      focus: '„Po której godzinie głowa Ci siada i lecisz już tylko na kawie?"',
      cravings: '„Wieczorem masz kontrolę, czy lodówka wygrywa? O której się zaczyna?"',
      anxiety: '„To napięcie schodzi wieczorem, czy leżysz i dalej mielisz robotę?"',
      motivation: '„Dowozisz, czy robisz już tylko minimum? I od kiedy odpuściłeś to więcej?"',
      recovery: '„Po treningu wracasz na drugi dzień, czy ciągnie się to dwa, trzy dni?"',
      digest: '„Brzuch, wzdęcia, trawienie, dochodzi do tego, czy raczej ok?"',
    };
    const picked: string[] = [];
    for (const o of objawy) { const q = Q[o]; if (q && picked.length < 2 && !picked.includes(q)) picked.push(q); }
    if ((Number(b.triedBefore) || 0) >= 2 && picked.length < 3) picked.push('„Ile razy w tym roku odpaliłeś plan, który padł, i w którym momencie zawsze pęka? To nie przypadek."');
    if ((Number(b.drinks) || 0) >= 6 && picked.length < 3) picked.push('„Weekend Ci to rozjeżdża, nie? Ile zajmuje Ci powrót do formy po sobocie?"');
    const FILL = [
      '„Jak z energią i głową po południu, ciągniesz czy siadasz?"',
      '„Robisz swoje, a sylwetka stoi w miejscu, czy widać ruch? Szczerze."',
      '„Libido i poranny gaz, tak jak rok temu, czy poszło w dół?"',
    ];
    for (const f of FILL) { if (picked.length < 3 && !picked.includes(f)) picked.push(f); }
    const DEEPEN = picked.slice(0, 3);
    const AWARENESS: Record<string, string> = {
      weekend_reset: 'To nie silna wola. Jeden rozjechany weekend miesza rytm kortyzolu i podcina testosteron na dwa, trzy dni, więc tracisz nie sobotę, tylko pół tygodnia. Rok po roku to się kumuluje: forma stoi, energia siada. Za rok będziesz w tym samym miejscu, tylko starszy, jak tego nie ruszysz.',
      wieczorny_odpad: 'Ten wieczorny odpad to nie słaby charakter. Po dniu na napięciu i krótkim śnie rośnie głód, spada sytość, mózg szuka najszybszego zejścia z obrotów. Płacisz za to gorszym jutrem i tak w kółko. Marnujesz formę, którą masz w środku, tylko sam ją sobie co wieczór odcinasz.',
      glowa_zajezdza: 'To nie brak dyscypliny. Głowa, która po pracy nie schodzi z obrotów, trzyma Cię w trybie alarmu, ciało nie wchodzi w regenerację, sen i testosteron lecą. Rano wstajesz z mniejszym bakiem niż wczoraj. To się nakręca miesiącami, a Ty myślisz, że tak ma być.',
      wiedza_bez_wdrozenia: 'Wiesz więcej niż połowa trenerów, a ciało tego nie pokazuje, bo mózg nagradza Cię za samą analizę, nie za wykonanie. Kolejny plan pada na pierwszym gorszym dniu. Lata lecą, wiedza rośnie, forma stoi. Brakuje nie wiedzy, tylko kogoś, kto Cię z niej rozliczy.',
      silnik_bez_paliwa: 'Wyniki w normie to nie to samo co forma. Spłycony sen, nierozładowany stres i nieregularne posiłki robią cichy wyciek, chodzisz zauważalnie poniżej swojego pułapu i myślisz, że tak już wyglądasz. Ten zapas siedzi pod jednym przeciekiem. Im dłużej stoi, tym więcej go tracisz.',
    };
    const awareness = AWARENESS[key] || 'To, co czujesz, to nie lenistwo, tylko konkretny wyciek w tygodniu, który sam się nie zatka. Im dłużej stoi, tym więcej formy i energii tracisz.';
    const BRIDGE = 'Słuchaj, dokładnie w takich przypadkach pracuję z chłopakami: ogarniamy głowę, sen, hormony i formę naraz, bo to jeden mechanizm, nie osobne tematy. Jak czujesz, że to Twoje, pokażę Ci jak wygląda robota ze mną i powiem wprost, czy widzę potencjał, żeby Cię ruszyć. Zobacz najpierw: nabor.talerzihantle.com';

    const lines = [
      `${ico} LEAD DIAGNOSTYKA${priority ? ' — PRIORYTET 1:1' : ''}`,
      `Wynik ${score}/100 (${s(b.segment, 20)}) · ${s(b.archetyp, 60)}`,
      `Peka: ${s(b.godzina, 40)} · Hamulec: ${s(b.worstCat, 30)} · Koszt: ${s(b.kwota, 20)} zl`,
      `Gotowosc: ${intentMap[s(b.intencja, 20)] || '—'} · Start: ${startMap[s(b.kiedy_start, 20)] || '—'}`,
      `Budzet(proxy) ${Number(b.budget_proxy) || 0}/3 · Zaangazowanie ${Number(b.commitment) || 0}/5`,
      b.imie ? `Imie: ${s(b.imie, 60)}` : '',
      b.pain ? `Wkurza: „${s(b.pain, 300)}”` : '',
    ].filter(Boolean);

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text: [
        ...lines,
        '', '━━━ ZAGRYWKA DM ━━━',
        '', '1) OTWÓRZ:', opener,
        '', '2) POGŁĘB (jedno pytanie na raz, z tego co zaznaczył):', ...DEEPEN,
        '', '3) DRUGIE DNO (uświadom, pokaż koszt):', awareness,
        '', '4) MOST (gdy odpisze ciepło):', BRIDGE,
        '', `🎯 JAK GRAĆ: ${closer}`,
      ].join('\n'), disable_web_page_preview: true }),
    });
    return NextResponse.json({ ok: res.ok });
  } catch {
    return NextResponse.json({ ok: false, reason: 'error' });
  }
}
