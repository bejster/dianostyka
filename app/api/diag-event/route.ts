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
    let forwarded = false;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ event: 'diagnostyka_answer', ...body, received_at: new Date().toISOString() }),
      });
      forwarded = res.ok;
      if (!res.ok) {
        // Nie wybuchamy quizu, ale zostawiamy slad w runtime logach (Vercel), zeby dalo sie
        // wylapac ciche gubienie progresywnych eventow zamiast dowiadywac sie o tym po fakcie.
        console.error(`[diag-event] downstream ${res.status} from ${url}`);
      }
    } catch (e) {
      console.error(`[diag-event] downstream fetch failed for ${url}:`, e instanceof Error ? e.message : e);
    }
    // ok:true zawsze — quiz nie moze sie wywalic przez padniety sink. forwarded mowi prawde
    // o tym, czy dane faktycznie dotarly dalej, zeby cichy data loss byl widoczny w logach/monitoringu.
    return NextResponse.json({ ok: true, forwarded });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
