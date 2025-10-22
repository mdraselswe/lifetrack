import type { Metadata, Viewport } from 'next'
import './globals.css'
import Navigation from '@/components/Navigation'
import PWARegistration from '@/components/PWARegistration'
import ToastContainer from '@/components/Toast'
import ConfirmToastContainer from '@/components/ConfirmToast'

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
  themeColor: '#0ea5e9',
  
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
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0ea5e9',
}

// Next.js 16 optimized layout with Suspense
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="bn" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0ea5e9" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="LifeTrack" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="antialiased">
        <PWARegistration />
        <ToastContainer />
        <ConfirmToastContainer />
        <div className="flex flex-col h-full min-h-screen">
          <main className="flex-1 overflow-auto pb-20">
            {children}
          </main>
          <Navigation />
        </div>
      </body>
    </html>
  )
}

