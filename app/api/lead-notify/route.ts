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
      body: JSON.stringify({ chat_id: chat, text: [...lines, '', '✍️ NAPISZ DO NIEGO:', opener, '', `🎯 JAK GRAĆ: ${closer}`].join('\n'), disable_web_page_preview: true }),
    });
    return NextResponse.json({ ok: res.ok });
  } catch {
    return NextResponse.json({ ok: false, reason: 'error' });
  }
}
