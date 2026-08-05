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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
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
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
