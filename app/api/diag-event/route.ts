// /api/diag-event — progresywny zapis pojedynczej odpowiedzi (event-per-row).
// Forwarduje event do webhooka (DIAG_EVENT_WEBHOOK = Twoj n8n), a n8n upsertuje JEDEN wiersz
// w Notion po submission_id. NIE piszemy per-odpowiedz prosto w Notion (rate limit, duplikaty).
// Dzieki temu porzucona sesja (ktos rzucil na pytaniu 12) i tak zostawia dane 1-11.
// Bez DIAG_EVENT_WEBHOOK = no-op (nic nie wybucha, apka dziala normalnie).
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    // Analityczny sink zdarzen (ten sam, do ktorego bije beacon starej strony). Env moze nadpisac.
    // .trim() broni przed zablakanym \n w wartosci env.
    const url = (process.env.DIAG_EVENT_WEBHOOK || 'https://n8n.srv1313512.hstgr.cloud/webhook/diagnostyka-events').trim();
    if (!url) return NextResponse.json({ ok: true, forwarded: false });
    await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ event: 'diagnostyka_answer', ...body, received_at: new Date().toISOString() }),
    }).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
