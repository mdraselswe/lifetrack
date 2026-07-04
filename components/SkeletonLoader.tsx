'use client'

import { ReactNode } from 'react'

interface SkeletonProps {
  className?: string
  children?: ReactNode
}

const Skeleton = ({ className = '', children }: SkeletonProps) => (
  <div
    className={`animate-pulse rounded-lg ${className}`}
    style={{ backgroundColor: 'var(--surface-2)' }}
  >
    {children}
  </div>
)

export const DashboardSkeleton = () => {
  return (
    <div className="min-h-full">
      <div className="app-bar">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="w-9 h-9 rounded-xl" />
      </div>
      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
      </div>
    </div>
  )
}

export const CardSkeleton = () => (
  <div className="card">
    <div className="flex items-center justify-between mb-4">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-7 w-20 rounded-lg" />
    </div>
    <Skeleton className="h-4 w-24 mb-2" />
    <Skeleton className="h-4 w-16" />
  </div>
)

export const ListSkeleton = ({ count = 3 }: { count?: number }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="card">
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-6 w-16 rounded-lg" />
        </div>
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-4 w-20" />
      </div>
    ))}
  </div>
)

export default Skeleton
