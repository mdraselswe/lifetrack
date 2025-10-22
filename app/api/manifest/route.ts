import { NextResponse } from 'next/server'

export async function GET() {
  const manifest = {
    name: 'LifeTrack - আপনার দৈনন্দিন জীবন পরিচালক',
    short_name: 'LifeTrack',
    description: 'রিমাইন্ডার ট্র্যাক করুন এবং ধার ব্যবস্থাপনা করুন সহজেই',
    theme_color: '#0ea5e9',
    background_color: '#ffffff',
    display: 'standalone',
    orientation: 'portrait',
    scope: '/',
    start_url: '/',
    lang: 'bn',
    categories: ['productivity', 'utilities'],
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable'
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable'
      }
    ]
  }

  return new NextResponse(JSON.stringify(manifest), {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
