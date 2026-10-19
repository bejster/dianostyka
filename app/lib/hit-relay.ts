// HiT Telegram relay: kanały CARE / SALES / OPS, oddzielone od Nocnej Zmiany.
// Ta sama semantyka i nazwy env co CloserOS lib/hit-telegram.ts i nabor api/_hitTelegram.js.
// Env (tylko nazwy): HIT_TG_BOT_TOKEN (opcjonalnie HIT_TG_<KANAŁ>_BOT_TOKEN), HIT_TG_<KANAŁ>_CHAT_ID,
// HIT_TG_<KANAŁ>_TOPIC_ID. Bez nich: stary TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID (nic nie ginie).
// Log dostarczenia bez treści, chat ID i tokenu.

export type HitChannel = 'CARE' | 'SALES' | 'OPS';
export type RelayTarget = { token: string; chatId: string; topicId: number | null; source: 'HIT' | 'LEGACY' };
type Env = Record<string, string | undefined>;
type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; json?: () => Promise<unknown> }>;

const CHANNELS: HitChannel[] = ['CARE', 'SALES', 'OPS'];
const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [300, 900];

// Brak kanału = SALES (dotychczasowy ruch relaya to leady). Nieznany kanał = null (400).
export function parseChannel(raw: unknown): HitChannel | null {
  if (raw === undefined || raw === null || raw === '') return 'SALES';
  const value = String(raw).trim().toUpperCase();
  return (CHANNELS as string[]).includes(value) ? (value as HitChannel) : null;
}

export function resolveRelayTarget(channel: HitChannel, env: Env): RelayTarget | null {
  const token = String(env[`HIT_TG_${channel}_BOT_TOKEN`] || env.HIT_TG_BOT_TOKEN || '').trim();
  const chatId = String(env[`HIT_TG_${channel}_CHAT_ID`] || '').trim();
  if (token && chatId) {
    const rawTopic = String(env[`HIT_TG_${channel}_TOPIC_ID`] || '').trim();
    return { token, chatId, topicId: /^\d+$/.test(rawTopic) ? Number(rawTopic) : null, source: 'HIT' };
  }
  const legacyToken = String(env.TELEGRAM_BOT_TOKEN || '').trim();
  const legacyChat = String(env.TELEGRAM_CHAT_ID || '').trim();
  return legacyToken && legacyChat ? { token: legacyToken, chatId: legacyChat, topicId: null, source: 'LEGACY' } : null;
}

const realSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Retry: 5xx, 429 (retry_after max 2 s) i błąd sieci. Inne 4xx kończą od razu. Nigdy nie rzuca.
export async function relaySend(
  target: RelayTarget,
  text: string,
  channel: HitChannel,
  deps: { fetch?: FetchLike; sleep?: (ms: number) => Promise<void> } = {},
): Promise<{ ok: boolean; http: number | null; attempts: number }> {
  const doFetch = deps.fetch || (globalThis.fetch as unknown as FetchLike);
  const wait = deps.sleep || realSleep;
  const payload: Record<string, unknown> = { chat_id: target.chatId, text, disable_web_page_preview: true };
  if (target.topicId !== null) payload.message_thread_id = target.topicId;
  let attempts = 0;
  let http: number | null = null;
  while (attempts < MAX_ATTEMPTS) {
    attempts += 1;
    let retryAfterMs: number | null = null;
    try {
      const r = await doFetch(`https://api.telegram.org/bot${target.token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
      });
      http = r.status;
      if (r.ok) break;
      if (r.status === 429 && r.json) {
        const body = (await r.json().catch(() => null)) as { parameters?: { retry_after?: number } } | null;
        const seconds = Number(body?.parameters?.retry_after);
        if (Number.isFinite(seconds) && seconds > 0) retryAfterMs = Math.min(seconds * 1000, 2000);
      }
      if (r.status !== 429 && r.status < 500) break;
    } catch {
      http = null;
    }
    if (attempts < MAX_ATTEMPTS) await wait(retryAfterMs ?? BACKOFF_MS[attempts - 1] ?? 900);
  }
  const ok = http !== null && http >= 200 && http < 300;
  try {
    console.log('HIT_TG_DELIVERY', JSON.stringify({
      event: 'relay.telegram_lead', channel, status: ok ? 'SENT' : 'FAILED', attempts, http, source: target.source, topic: target.topicId !== null,
    }));
  } catch { /* log nie może wywrócić relaya */ }
  return { ok, http, attempts };
}
