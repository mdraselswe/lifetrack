import { NextResponse } from 'next/server'

// Served at /.well-known/assetlinks.json via a rewrite in next.config.js.
// Next.js does not serve dotfile folders under public/, so the Digital Asset
// Links file for the Android TWA (package com.lifetrack.app) lives here.
export async function GET() {
  const assetlinks = [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'com.lifetrack.app',
        sha256_cert_fingerprints: [
          '4B:BD:26:83:8D:DA:01:DE:7E:58:2B:19:42:BE:D9:F0:17:B9:FB:D6:A8:D5:01:5A:06:26:E9:CA:70:72:22:A1',
        ],
      },
    },
  ]

  return new NextResponse(JSON.stringify(assetlinks), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  })
}
