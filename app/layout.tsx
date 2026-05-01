import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Diagnostyka Neurochemiczna - Ile Cię kosztuje to jak żyjesz?',
  description: 'Sprawdź ile naprawdę tracisz na swoim stylu życia. Pełna diagnostyka: sen, stres, żywienie, weekend, trening.',
  openGraph: {
    title: 'Diagnostyka Neurochemiczna - Ile Cię kosztuje to jak żyjesz?',
    description: 'Sprawdź ile naprawdę tracisz na swoim stylu życia. Pełna diagnostyka: sen, stres, żywienie, weekend, trening.',
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
    title: 'Diagnostyka Neurochemiczna - Ile Cię kosztuje to jak żyjesz?',
    description: 'Sprawdź ile naprawdę tracisz na swoim stylu życia. Pełna diagnostyka: sen, stres, żywienie, weekend, trening.',
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;700;800&display=swap" rel="stylesheet" />
        {/* Meta Pixel - tracking lead funnel */}
        <script dangerouslySetInnerHTML={{__html:`
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','1699985401399738');fbq('track','PageView');
        `}} />
        <noscript dangerouslySetInnerHTML={{__html:`<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=1699985401399738&ev=PageView&noscript=1"/>`}} />
      </head>
      <body>
        {/* Floating particles background */}
        <div className="particle-container">
          <div className="particle particle-1"></div>
          <div className="particle particle-2"></div>
          <div className="particle particle-3"></div>
        </div>

        {/* INTRO LOADING - diagnostic scan reveal */}
        <style dangerouslySetInnerHTML={{__html:`
          @keyframes diagScanDown{0%{transform:translateY(-140%);opacity:0}15%{opacity:1}85%{opacity:1}100%{transform:translateY(140%);opacity:0}}
          @keyframes diagRing{0%{transform:scale(.8);opacity:0}40%{opacity:1}100%{transform:scale(1.4);opacity:0}}
          @keyframes diagPulse{0%,100%{box-shadow:0 0 40px rgba(200,168,78,.25)}50%{box-shadow:0 0 60px rgba(200,168,78,.5)}}
          @keyframes diagDotsSweep{0%{background-position:0% 50%}100%{background-position:100% 50%}}
          #introLogoImg{animation:diagPulse 1.4s ease-in-out infinite}
          #introScanLine{animation:diagScanDown 1.6s cubic-bezier(.55,.1,.45,.9) .25s forwards}
          #introRingOuter{animation:diagRing 1.6s cubic-bezier(.25,1,.5,1) .4s forwards}
          #introRingDelay{animation:diagRing 1.6s cubic-bezier(.25,1,.5,1) .8s forwards}
          #introDots{background:linear-gradient(90deg,transparent 0%,#c8a84e40 20%,#c8a84e 50%,#c8a84e40 80%,transparent 100%);background-size:200% 100%;background-repeat:no-repeat;animation:diagDotsSweep 1.4s linear infinite}
        `}} />
        <div id="introLoading" style={{
          position:'fixed',inset:0,zIndex:10000,background:'#0a0a0a',
          display:'flex',alignItems:'center',justifyContent:'center',
          pointerEvents:'none',transition:'opacity .6s cubic-bezier(.25,1,.5,1)',overflow:'hidden'
        }}>
          {/* Diagnostic grid background */}
          <div aria-hidden="true" style={{
            position:'absolute',inset:0,opacity:.08,
            backgroundImage:'linear-gradient(rgba(200,168,78,.3) 1px,transparent 1px),linear-gradient(90deg,rgba(200,168,78,.3) 1px,transparent 1px)',
            backgroundSize:'40px 40px',
            maskImage:'radial-gradient(ellipse 50% 40% at 50% 50%,#000 0%,transparent 80%)',
            WebkitMaskImage:'radial-gradient(ellipse 50% 40% at 50% 50%,#000 0%,transparent 80%)'
          }}></div>

          {/* Logo container */}
          <div id="introLoadingInner" style={{
            position:'relative',display:'flex',alignItems:'center',justifyContent:'center',
            transform:'scale(.85)',opacity:0,
            transition:'transform 1s cubic-bezier(.16,1,.3,1),opacity .7s cubic-bezier(.25,1,.5,1)'
          }}>
            {/* Animowane gold rings (diagnostic scan rings) */}
            <div id="introRingOuter" aria-hidden="true" style={{
              position:'absolute',width:180,height:180,borderRadius:'50%',
              border:'1px solid rgba(200,168,78,.5)',opacity:0,pointerEvents:'none'
            }}></div>
            <div id="introRingDelay" aria-hidden="true" style={{
              position:'absolute',width:220,height:220,borderRadius:'50%',
              border:'1px solid rgba(200,168,78,.35)',opacity:0,pointerEvents:'none'
            }}></div>

            {/* Radial glow */}
            <div aria-hidden="true" style={{
              position:'absolute',inset:'-100px',borderRadius:'50%',
              background:'radial-gradient(circle,rgba(200,168,78,.25) 0%,rgba(200,168,78,.08) 35%,transparent 70%)',
              filter:'blur(24px)',zIndex:0
            }}></div>

            {/* Logo + scan line */}
            <div style={{position:'relative',width:120,height:120,zIndex:2}}>
              <img id="introLogoImg" src="/logo-circle.png" alt="Hantle i Talerz" style={{
                width:120,height:120,borderRadius:'50%',objectFit:'cover',
                border:'1px solid rgba(200,168,78,.4)',
                position:'relative',zIndex:1
              }} />
              {/* Horizontal gold scan line traversing the logo */}
              <div id="introScanLine" aria-hidden="true" style={{
                position:'absolute',left:'-10%',right:'-10%',top:'50%',height:2,
                background:'linear-gradient(90deg,transparent 0%,rgba(200,168,78,.6) 20%,#c8a84e 50%,rgba(200,168,78,.6) 80%,transparent 100%)',
                boxShadow:'0 0 16px rgba(200,168,78,.8),0 0 32px rgba(200,168,78,.5)',
                zIndex:3,pointerEvents:'none',opacity:0
              }}></div>
            </div>
          </div>

          {/* Meta info: scanning... + site name */}
          <div style={{
            position:'absolute',bottom:'15%',left:'50%',transform:'translateX(-50%)',
            display:'flex',flexDirection:'column',alignItems:'center',gap:10,opacity:0,
            transition:'opacity .6s ease .5s'
          }} id="introMark">
            <div id="introDots" style={{width:140,height:1}}></div>
            <div style={{
              fontFamily:"'JetBrains Mono', ui-monospace, monospace",fontSize:10,letterSpacing:'3px',
              textTransform:'uppercase',color:'#c8a84e',fontWeight:700
            }}>Skanowanie · Diagnostyka</div>
          </div>
        </div>
        <script dangerouslySetInnerHTML={{__html:`
          (function(){
            var intro=document.getElementById('introLoading');
            var inner=document.getElementById('introLoadingInner');
            var mark=document.getElementById('introMark');
            if(!intro||!inner)return;
            if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){intro.style.display='none';return;}
            setTimeout(function(){inner.style.transform='scale(1)';inner.style.opacity='1';if(mark)mark.style.opacity='1';},50);
            setTimeout(function(){intro.style.opacity='0';},1900);
            setTimeout(function(){intro.style.display='none';intro.remove();},2500);
          })();
        `}} />

        {children}
      </body>
    </html>
  );
}
