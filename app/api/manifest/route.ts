import { NextResponse } from 'next/server'

export async function GET() {
  const manifest = {
    id: '/',
    name: 'LifeTrack - আপনার দৈনন্দিন জীবন পরিচালক',
    short_name: 'LifeTrack',
    description: 'রিমাইন্ডার ট্র্যাক করুন এবং ধার ব্যবস্থাপনা করুন সহজেই',
    theme_color: '#0ea5e9',
    background_color: '#ffffff',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'portrait',
    scope: '/',
    start_url: '/',
    lang: 'bn',
    dir: 'ltr',
    categories: ['productivity', 'utilities', 'finance'],
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      }
    ],
    shortcuts: [
      {
        name: 'রিমাইন্ডার',
        short_name: 'রিমাইন্ডার',
        url: '/reminders',
        icons: [{ src: '/icon-192x192.png', sizes: '192x192' }]
      },
      {
        name: 'পাওনা',
        short_name: 'পাওনা',
        url: '/debts',
        icons: [{ src: '/icon-192x192.png', sizes: '192x192' }]
      },
      {
        name: 'দেনা',
        short_name: 'দেনা',
        url: '/loans',
        icons: [{ src: '/icon-192x192.png', sizes: '192x192' }]
      }
    ],
    screenshots: [
      {
        src: '/screenshot-mobile.png',
        sizes: '1179x2556',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'LifeTrack ড্যাশবোর্ড — মোবাইল'
      },
      {
        src: '/screenshot-desktop.png',
        sizes: '2878x1314',
        type: 'image/png',
        form_factor: 'wide',
        label: 'LifeTrack ড্যাশবোর্ড — ডেস্কটপ'
      }
    ]
  }

  return new NextResponse(JSON.stringify(manifest), {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  })
}
