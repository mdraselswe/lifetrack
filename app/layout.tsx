import type { Metadata } from 'next'
import './globals.css'
import Navigation from '@/components/Navigation'

export const metadata: Metadata = {
  title: 'LifeTrack - আপনার দৈনন্দিন জীবন পরিচালক',
  description: 'রিমাইন্ডার ট্র্যাক করুন এবং ধার ব্যবস্থাপনা করুন সহজেই',
  manifest: '/manifest.json',
  themeColor: '#0ea5e9',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'LifeTrack',
  },
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="bn">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0ea5e9" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="LifeTrack" />
      </head>
      <body>
        <div className="flex flex-col h-full">
          <main className="flex-1 overflow-auto pb-20">
            {children}
          </main>
          <Navigation />
        </div>
      </body>
    </html>
  )
}

