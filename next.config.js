/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 16 optimizations
  reactStrictMode: true,
  
  // Performance optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Next.js 16 features
  cacheComponents: true,

  // Keep heavy Node-only SDKs out of the bundle; load from node_modules at runtime.
  serverExternalPackages: ['firebase-admin', 'googleapis'],
  
  // Turbopack configuration
  turbopack: {
    root: process.cwd(),
  },
  
  // Experimental features
  experimental: {
    // Optimized package imports
    optimizePackageImports: ['date-fns'],
  },
  
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Headers for better security and PWA
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          // Force HTTPS for 2 years incl. subdomains (Lighthouse Best-Practices audit).
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          // Origin isolation. Safe here — auth is email/password, no OAuth popups.
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          // CSP scoped for Firebase (Firestore/Auth/Installations/FCM over *.googleapis.com),
          // the inline theme-flash script + Next.js inline bootstrap ('unsafe-inline'),
          // the service worker (worker-src), and dynamic manifest. Tighten script-src with a
          // nonce later if you move off static rendering.
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Dev (React/Turbopack) needs eval(); production never does — so it
              // is scoped to dev only, keeping the prod policy tight.
              `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV !== 'production' ? " 'unsafe-eval'" : ''}`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com",
              "worker-src 'self'",
              "manifest-src 'self'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ]
  },
  
  // PWA manifest configuration
  async rewrites() {
    return [
      {
        source: '/manifest.json',
        destination: '/api/manifest',
      },
      {
        source: '/.well-known/assetlinks.json',
        destination: '/api/assetlinks',
      },
    ]
  },
}

module.exports = nextConfig

