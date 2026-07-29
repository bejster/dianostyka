import { NextRequest, NextResponse } from 'next/server';

// ── Powiadomienie o leadzie z diagnostyki -> dedykowany kanal Telegram (np. "HiT Leady") ──
// Odpala sie ZAWSZE, gdy ktos skonczy quiz (nie wymaga maila). Kwalifikacja jest liczona po stronie
// klienta (page.tsx qualify()) i przekazana tutaj tylko do sformatowania wiadomosci.
// Kanal: TELEGRAM_LEADS_CHAT_ID; gdy nieustawiony, spada na TELEGRAM_CHAT_ID, zeby nic sie nie gubilo.
export async function POST(req: NextRequest) {
  try {
    const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chat = process.env.TELEGRAM_LEADS_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
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
      body: JSON.stringify({ chat_id: chat, text: lines.join('\n'), disable_web_page_preview: true }),
    });
    return NextResponse.json({ ok: res.ok });
  } catch {
    return NextResponse.json({ ok: false, reason: 'error' });
  }
}
