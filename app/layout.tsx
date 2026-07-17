import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { Inter, Noto_Sans_Bengali } from 'next/font/google'
import './globals.css'

// Bengali UI font — drives --font-bengali. Used when the app language is bn.
// Variable font: one file covers every weight (400–700) — smaller total
// payload than the four static weight files it replaces, zero visual change.
const notoSansBengali = Noto_Sans_Bengali({
  subsets: ['bengali', 'latin'],
  variable: '--font-bengali',
  display: 'swap',
})

// Standard Google Latin UI font (Inter) — drives --font-en. Used when the app
// language is en, so English text renders with proper Latin glyphs instead of
// Noto Sans Bengali's fallback Latin shapes.
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-en',
  display: 'swap',
})
import PWARegistration from '@/components/PWARegistration'
import AppLock from '@/components/AppLock'
import BackupAutoSync from '@/components/BackupAutoSync'
import OfflineIndicator from '@/components/OfflineIndicator'
import CelebrationContainer from '@/components/Celebration'
import ToastContainer from '@/components/Toast'
import ConfirmToastContainer from '@/components/ConfirmToast'
import { AuthProvider } from '@/lib/firebase-auth'
import ConditionalLayout from '@/components/ConditionalLayout'

// Next.js 16 optimized metadata
export const metadata: Metadata = {
  metadataBase: new URL('https://lifetrack.app'),
  title: {
    default: 'LifeTrack - আপনার দৈনন্দিন জীবন পরিচালক',
    template: '%s | LifeTrack'
  },
  description: 'রিমাইন্ডার ট্র্যাক করুন এবং ধার ব্যবস্থাপনা করুন সহজেই',
  keywords: ['PWA', 'reminder', 'debt tracker', 'loan tracker', 'বাংলা'],
  authors: [{ name: 'LifeTrack Team' }],
  creator: 'LifeTrack',
  publisher: 'LifeTrack',
  
  // PWA metadata
  manifest: '/manifest.json',

  // Apple specific metadata
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'LifeTrack',
  },
  
  // Open Graph metadata
  openGraph: {
    type: 'website',
    locale: 'bn_BD',
    url: 'https://lifetrack.app',
    title: 'LifeTrack - আপনার দৈনন্দিন জীবন পরিচালক',
    description: 'রিমাইন্ডার ট্র্যাক করুন এবং ধার ব্যবস্থাপনা করুন সহজেই',
    siteName: 'LifeTrack',
    images: [
      {
        url: '/icon-512x512.png',
        width: 512,
        height: 512,
        alt: 'LifeTrack App Icon',
      },
    ],
  },
  
  // Twitter metadata
  twitter: {
    card: 'summary_large_image',
    title: 'LifeTrack - আপনার দৈনন্দিন জীবন পরিচালক',
    description: 'রিমাইন্ডার ট্র্যাক করুন এবং ধার ব্যবস্থাপনা করুন সহজেই',
    images: ['/icon-512x512.png'],
  },
  
  // Additional PWA metadata
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'LifeTrack',
    'application-name': 'LifeTrack',
    'msapplication-TileColor': '#0ea5e9',
    'msapplication-tap-highlight': 'no',
  },
}

// Next.js 16 viewport configuration
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Allow pinch-zoom for accessibility (WCAG 1.4.4)
  maximumScale: 5,
  // theme-color is set per light/dark scheme via <meta> tags in <head>,
  // kept in sync with the --bg surface tokens in globals.css.
}

// Next.js 16 optimized layout with Suspense
export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="bn" className={`${notoSansBengali.variable} ${inter.variable} lang-bn`} suppressHydrationWarning>
      <head>
        {/* Open Firebase connections early — removes the TLS handshake from the first data fetch */}
        <link rel="preconnect" href="https://firestore.googleapis.com" />
        <link rel="preconnect" href="https://identitytoolkit.googleapis.com" />
        <link rel="dns-prefetch" href="https://securetoken.googleapis.com" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#f4f5f7" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0a0d14" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="LifeTrack" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* Apply saved / system theme and language before paint to avoid a flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');var l=localStorage.getItem('lifetrack-lang');if(l==='en'){document.documentElement.classList.add('lang-en');document.documentElement.classList.remove('lang-bn');}else{document.documentElement.classList.add('lang-bn');document.documentElement.classList.remove('lang-en');}var ph=localStorage.getItem('lifetrack-pin-hash');var un=sessionStorage.getItem('lifetrack-unlocked')==='1';if(ph&&!un)document.documentElement.classList.add('app-locked');}catch(e){}})();`,
          }}
        />
      </head>
      <body suppressHydrationWarning={true}>
        <AuthProvider>
          <PWARegistration />
          <OfflineIndicator />
          <CelebrationContainer />
          <ToastContainer />
          <ConfirmToastContainer />
          <AppLock />
          <BackupAutoSync />
          {/* Wrapper hidden pre-paint by the inline script (html.app-locked) so
              app content never flashes before the PIN gate. Toasts/confirm/gate
              live OUTSIDE it so the lock screen + its forgot-PIN dialog show. */}
          <div id="app-shell">
            <ConditionalLayout>
              {children}
            </ConditionalLayout>
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}

