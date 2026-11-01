'use client';

import { useState } from 'react';
import { trackDiag } from '../lib/analytics';

type Reason = 'nie_pasuje' | 'skad_wniosek' | 'prowadz_1na1';
type Choice = { label: string; message: string };

export const CONVERSATION_CHOICES: Record<Reason, Choice> = {
  nie_pasuje: {
    label: 'Coś mi się nie zgadza',
    message: 'Cześć Michał, zrobiłem Mapę 168. Jedna rzecz w wyniku mi nie pasuje. Chcę Ci powiedzieć, która i dlaczego.',
  },
  skad_wniosek: {
    label: 'Skąd ten wniosek?',
    message: 'Cześć Michał, zrobiłem Mapę 168. Chcę dopytać o jeden wniosek, bo nie jestem pewien, czy dobrze go rozumiem.',
  },
  prowadz_1na1: {
    label: 'Co zrobiłbyś ze mną 1:1?',
    message: 'Cześć Michał, wypełniłem Mapę 168. Chcę zrozumieć, jak wyglądałoby u Ciebie prowadzenie 1:1 przy takim wyniku.',
  },
};

const TOPICS: Reason[] = ['nie_pasuje', 'skad_wniosek', 'prowadz_1na1'];

export default function ResultConversation({ archKey, primaryRoute }: { archKey: string; primaryRoute: 'nabor' | 'experiment' }) {
  const [reason, setReason] = useState<Reason>('nie_pasuje');
  const [copied, setCopied] = useState(false);
  const prepared = CONVERSATION_CHOICES[reason].message;
  // Wyłącznie neutralny tekst zaproszenia. Żadnych danych ankietowych, zdrowotnych, IG ani submission_id w URL.
  // Sprawdzony oficjalny handle i ścieżka są już w istniejącej Karcie Tygodnia.
  const dmHref = 'https://ig.me/m/hantleitalerz?text=' + encodeURIComponent(prepared);

  const copyMessage = async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(prepared);
      setCopied(true);
      trackDiag('result_conversation_copied', { topic: reason, arch: archKey, route: primaryRoute });
    } catch {
      setCopied(false);
    }
  };

  return (
    <aside className="rx-conversation-bridge" id="porozmawiaj" aria-labelledby="rx-talk-head">
      <style>{css}</style>
      <div className="rx-talk-author">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/michal-portrait.jpg" alt="Michał, autor Mapy 168" width={55} height={55} loading="lazy" />
        <div><span>MICHAŁ · HANTLE I TALERZ</span><strong>Ten wynik możesz podważyć.</strong></div>
      </div>
      <p className="rx-talk-honesty">To automatyczny odczyt mojej Mapy 168 na podstawie Twoich odpowiedzi. Nie będę udawał, że znam Cię po pięciu minutach. Dlatego jeśli coś Ci tutaj nie pasuje, napisz konkretnie co.</p>
      <h2 id="rx-talk-head">Masz jedno pytanie o swój wynik?</h2>
      <div className="rx-talk-options" role="group" aria-label="Wybierz temat rozmowy">
        {TOPICS.map((id) => (
          <button key={id} type="button" aria-pressed={reason === id}
            className={reason === id ? 'rx-talk-choice on' : 'rx-talk-choice'}
            onClick={() => { setReason(id); setCopied(false); }}>
            {CONVERSATION_CHOICES[id].label}
          </button>
        ))}
      </div>
      <p className="rx-talk-message" aria-live="polite">{prepared}</p>
      <div className="rx-talk-actions">
        <a className="rx-talk-primary" href={dmHref} target="_blank" rel="noopener noreferrer"
          onClick={() => trackDiag('result_conversation_clicked', { topic: reason, arch: archKey, route: primaryRoute, source: 'result' })}>
          Otwórz DM na Instagramie <span aria-hidden="true">↗</span>
        </a>
        <button type="button" className="rx-talk-copy" onClick={copyMessage}>
          {copied ? 'Skopiowane' : 'Kopiuj wiadomość'}
        </button>
      </div>
      <p className="rx-talk-fine">Przejdziesz na mój profil. Niczego nie wysyłam za Ciebie. Jeśli Instagram nie podstawi tekstu, możesz go skopiować i wkleić sam. Pełnych odpowiedzi z ankiety nie przekazuję w tym linku.</p>
    </aside>
  );
}

const css = `
.rx-conversation-bridge{width:100%;max-width:680px;margin:28px auto 52px;padding:27px 24px 23px;border:1px solid rgba(200,168,78,.34);border-radius:18px;background:linear-gradient(160deg,rgba(200,168,78,.085),rgba(17,17,19,.95) 65%);color:#ece7db;box-shadow:0 14px 70px rgba(0,0,0,.26)}
.rx-talk-author{display:flex;gap:15px;align-items:center;margin-bottom:20px}.rx-talk-author img{flex:0 0 55px;border-radius:50%;object-fit:cover;border:1px solid rgba(200,168,78,.4)}.rx-talk-author span{display:block;font:700 10px/1.4 'JetBrains Mono',monospace;letter-spacing:1.1px;color:#c8a84e;margin-bottom:5px}.rx-talk-author strong{display:block;font:400 clamp(25px,6vw,34px)/1.12 'Instrument Serif',Georgia,serif}
.rx-talk-honesty{margin:0 0 21px;color:#d1cabd;font:400 15px/1.65 'Inter',sans-serif}
.rx-conversation-bridge h2{margin:0 0 14px;color:#f5f1e8;font:400 clamp(23px,4.9vw,30px)/1.18 'Instrument Serif',Georgia,serif}
.rx-talk-options{display:flex;flex-wrap:wrap;gap:8px}
.rx-talk-choice{padding:12px 14px;border:1px solid #5b5143;border-radius:10px;color:#ece1d0;background:rgba(0,0,0,.15);font:650 14px/1.35 'Inter',sans-serif;cursor:pointer;text-align:left}.rx-talk-choice:hover,.rx-talk-choice:focus-visible{border-color:#c8a84e;color:#fff}.rx-talk-choice.on{background:rgba(200,168,78,.16);border-color:#c8a84e;color:#f4e0a2}
.rx-talk-message{min-height:55px;border-left:2px solid rgba(200,168,78,.55);margin:19px 0 17px;padding:9px 0 9px 15px;color:#b8b0a2;font:400 14.5px/1.58 'Inter',sans-serif}
.rx-talk-actions{display:flex;gap:10px;align-items:stretch;flex-wrap:wrap}.rx-talk-primary{display:inline-flex;flex:1 1 210px;justify-content:center;align-items:center;gap:12px;padding:15px 18px;border-radius:10px;background:#c8a84e;color:#0a0a0a;text-decoration:none;text-align:center;font:800 15px/1.35 'Inter',sans-serif}.rx-talk-primary:hover{background:#e0c36d}
.rx-talk-copy{flex:0 1 auto;padding:12px 14px;border:1px solid #534a34;border-radius:10px;background:transparent;color:#e8cc80;font:700 12.5px/1.3 'Inter',sans-serif;cursor:pointer}.rx-talk-copy:hover{border-color:#e8cc80}
.rx-talk-fine{margin:16px 0 0;color:#a49e92;font:400 12.5px/1.55 'Inter',sans-serif}
@media(max-width:480px){.rx-conversation-bridge{padding:22px 17px}.rx-talk-copy{flex:1 1 auto}.rx-talk-primary{flex:1 1 100%}}
`;
