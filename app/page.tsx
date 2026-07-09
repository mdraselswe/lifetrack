'use client'

import dynamic from 'next/dynamic'
import { DashboardSkeleton } from '@/components/SkeletonLoader'

// The dashboard pulls in the Firestore SDK (~327 KB). Loading it dynamically
// keeps that chunk OUT of the initial route bundle, so the app shell and this
// skeleton paint immediately while Firestore streams in behind them. ssr:false
// because the view is fully client-side (auth-gated, realtime subscriptions).
const DashboardView = dynamic(() => import('@/components/DashboardView'), {
  ssr: false,
  loading: () => <DashboardSkeleton />,
})

export default function Page() {
  return <DashboardView />
}
