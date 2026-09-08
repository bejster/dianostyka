// /api/diag-event — progresywny zapis pojedynczej odpowiedzi (event-per-row).
// Forwarduje event WYLACZNIE gdy DIAG_EVENT_WEBHOOK jest jawnie ustawiony w env — n8n upsertuje
// JEDEN wiersz w Notion po submission_id, zeby porzucona sesja i tak zostawiala dane 1-11.
// 2026-09-08 (P1 backend closeout): workflow n8n `diagnostyka-events` jest SWIADOMIE OFF — to
// progresywny lead-capture (per-odpowiedz, w tym wolny tekst user_pain/user_trigger + IG/imie),
// NIE anonimowa analityka, wiec aktywacja wymaga osobnego privacy review, nie tego zamkniecia P1.
// Stary hardcodowany fallback (https://n8n.srv1313512.hstgr.cloud/webhook/diagnostyka-events) byl
// dead URL bijacy w wylaczony workflow na kazdym requescie w KAZDYM env (preview i produkcja) —
// stad falszywy szum `[diag-event] downstream 404` w logach. Usuniety: bez jawnego env = no-op,
// bez proby fetch, bez logu. Ustawienie DIAG_EVENT_WEBHOOK z powrotem wlacza forwarding.
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    // .trim() broni przed zablakanym \n w wartosci env.
    const url = (process.env.DIAG_EVENT_WEBHOOK || '').trim();
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
