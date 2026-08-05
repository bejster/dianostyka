import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'O której godzinie pęka Twój tydzień? | Hantle i Talerz',
  description: 'Przegląd tygodnia w 5 minut. Na końcu: godzina, o której się sypiesz, liczby i rachunek, którego nikt Ci nie wystawił.',
  openGraph: {
    title: 'O której godzinie pęka Twój tydzień? | Hantle i Talerz',
    description: 'Przegląd tygodnia w 5 minut. Na końcu: godzina, o której się sypiesz, liczby i rachunek, którego nikt Ci nie wystawił.',
    url: 'https://diagnostyka.talerzihantle.com',
    siteName: 'Diagnostyka | Hantle i Talerz',
    images: [
      {
        url: 'https://diagnostyka.talerzihantle.com/og.png',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'pl_PL',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'O której godzinie pęka Twój tydzień? | Hantle i Talerz',
    description: 'Przegląd tygodnia w 5 minut. Na końcu: godzina, o której się sypiesz, liczby i rachunek, którego nikt Ci nie wystawił.',
    images: ['https://diagnostyka.talerzihantle.com/og.png'],
  },
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
  other: {
    'theme-color': '#0a0a0a',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0a0a',
};

// Publiczny klucz projektu PostHog (phc_...) — z zalozenia trafia do przegladarki KAZDEGO usera,
// wiec commit do repo jest bezpieczny (to nie sekret). Env NEXT_PUBLIC_POSTHOG_KEY ma priorytet,
// gdyby trzeba bylo podmienic projekt bez deployu kodu.
const PH_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || 'phc_yCJgz7TrkLywSVD22pLnbrETQxjgGgrShY3JcKxNVVik';
const PH_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';

// Bramka loadera: raz na sesje, przed 1. paintem. reduced-motion = brak loadera. ?intro wymusza.
// Fail-open: bez JS klasa nie wchodzi -> loader ukryty -> tresc widoczna od razu.
const LDR_GATE = `try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches){if(location.search.indexOf('intro')>-1||!sessionStorage.getItem('th_diag_ldr')){if(location.search.indexOf('intro')<0)sessionStorage.setItem('th_diag_ldr','1');document.documentElement.classList.add('dxldr-on')}}}catch(e){}`;

// Loader sesyjny — brandowy wjazd spojny z nabor.talerzihantle.com (glow -> wordmark z blyskiem
// -> zlota kreska -> podpis -> lift-out). CSS-only, sam znika, pointer-events:none = nie blokuje.
const DXLDR_CSS = `
.dxldr{display:none}
html.dxldr-on .dxldr{display:flex;position:fixed;inset:0;z-index:9999;background:radial-gradient(120% 90% at 50% 42%,#12100c 0%,#08080a 62%);align-items:center;justify-content:center;pointer-events:none;animation:dxldrOut .6s cubic-bezier(.22,1,.36,1) 1.25s forwards}
html.dxldr-on .dxldr::before{content:"";position:absolute;width:min(72vw,540px);height:min(72vw,540px);border-radius:50%;background:radial-gradient(circle,rgba(200,168,78,.16),transparent 62%);filter:blur(12px);opacity:0;animation:dxldrGlow 1.1s ease .1s forwards}
html.dxldr-on .dxldr-in{position:relative;text-align:center;animation:dxldrLift .6s cubic-bezier(.22,1,.36,1) 1.25s forwards}
html.dxldr-on .dxldr-eye{display:block;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10.5px;letter-spacing:.34em;text-transform:uppercase;color:#c8a84e;opacity:0;margin-bottom:16px;animation:dxldrCap .55s ease .05s forwards}
html.dxldr-on .dxldr-word{display:inline-block;position:relative;overflow:hidden;font-family:'JetBrains Mono',ui-monospace,monospace;font-weight:800;font-size:clamp(22px,6vw,34px);letter-spacing:.3em;color:#f0f0f0;text-shadow:0 0 18px rgba(200,168,78,.14);animation:dxldrWord .75s cubic-bezier(.22,1,.36,1) both}
html.dxldr-on .dxldr-word b{color:#c8a84e;font-weight:inherit}
html.dxldr-on .dxldr-word::after{content:"";position:absolute;inset:0;background:linear-gradient(105deg,transparent 40%,rgba(255,246,224,.5) 50%,transparent 60%);transform:translateX(-130%);animation:dxldrShine .9s ease .55s forwards}
html.dxldr-on .dxldr-line{display:block;width:min(46vw,220px);height:1px;margin:16px auto 12px;background:linear-gradient(90deg,transparent,#c8a84e,transparent);transform:scaleX(0);animation:dxldrLine .85s cubic-bezier(.22,1,.36,1) .18s forwards}
html.dxldr-on .dxldr-cap{display:block;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10.5px;letter-spacing:.22em;color:#8a8478;opacity:0;animation:dxldrCap .6s ease .45s forwards}
@keyframes dxldrWord{from{opacity:0;letter-spacing:.55em;transform:translateY(8px)}to{opacity:1;letter-spacing:.3em;transform:none}}
@keyframes dxldrShine{to{transform:translateX(130%)}}
@keyframes dxldrGlow{to{opacity:1}}
@keyframes dxldrLine{to{transform:scaleX(1)}}
@keyframes dxldrCap{to{opacity:1}}
@keyframes dxldrLift{to{opacity:0;transform:translateY(-14px)}}
@keyframes dxldrOut{to{opacity:0;visibility:hidden}}
@media(prefers-reduced-motion:reduce){.dxldr{display:none!important}}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" suppressHydrationWarning>
      <head>
        {/* PostHog — lejek, heatmapy, nagrania sesji. Laduje sie TYLKO gdy ustawiony klucz. */}
        {PH_KEY && (
          <script dangerouslySetInnerHTML={{__html:`
!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug getPageViewId captureTraceFeedback captureTraceMetric".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
posthog.init(${JSON.stringify(PH_KEY)},{api_host:${JSON.stringify(PH_HOST)},person_profiles:'identified_only',capture_pageview:true,autocapture:true,capture_heatmaps:true});
          `}} />
        )}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;700;800&family=Instrument+Serif:ital@0;1&family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=Cormorant+Garamond:ital,wght@0,600;0,700;1,600&display=swap" rel="stylesheet" />
        {/* Meta Pixel - tracking lead funnel */}
        <script dangerouslySetInnerHTML={{__html:`
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','1699985401399738');fbq('track','PageView');
        `}} />
        <noscript dangerouslySetInnerHTML={{__html:`<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=1699985401399738&ev=PageView&noscript=1"/>`}} />
        {/* Bramka loadera — musi ustawic klase na <html> PRZED 1. paintem (dlatego w head) */}
        <script dangerouslySetInnerHTML={{__html: LDR_GATE}} />
        <style dangerouslySetInnerHTML={{__html: DXLDR_CSS}} />
      </head>
      <body>
        {/* Loader sesyjny (brandowy wjazd spojny z nabor). aria-hidden + pointer-events:none. */}
        <div className="dxldr" aria-hidden="true">
          <div className="dxldr-in">
            <span className="dxldr-eye">Diagnoza tygodnia</span>
            <span className="dxldr-word">TALERZ<b>I</b>HANTLE</span>
            <span className="dxldr-line" />
            <span className="dxldr-cap">4 MINUTY &middot; 7 DNI &middot; JEDEN SŁABY DZIEŃ</span>
          </div>
        </div>
        {children}
      </body>
    </html>
  );
}
