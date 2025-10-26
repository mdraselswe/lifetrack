'use client'

import { ReactNode } from 'react'

interface SkeletonProps {
  className?: string
  children?: ReactNode
}

const Skeleton = ({ className = '', children }: SkeletonProps) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`}>
    {children}
  </div>
)

export const DashboardSkeleton = () => {
  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-green-400/20 to-blue-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-purple-400/10 to-pink-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-6">
        {/* Header Section Skeleton */}
        <div className="text-center mb-10 sm:mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 bg-gray-200 rounded-3xl mb-6 sm:mb-8 animate-pulse">
            <Skeleton className="w-8 h-8 rounded-lg" />
          </div>
          <Skeleton className="h-12 sm:h-16 w-64 mx-auto mb-4 sm:mb-6 rounded-lg" />
          <Skeleton className="h-6 sm:h-8 w-80 mx-auto mb-4 rounded-lg" />
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg border border-white/20">
            <Skeleton className="w-8 h-8 rounded-full" />
            <Skeleton className="h-4 w-24 rounded" />
          </div>
        </div>

        {/* Financial Summary Skeleton */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-lg border border-white/20 mb-6 sm:mb-8">
          <div className="text-center mb-6">
            <Skeleton className="w-10 h-10 rounded-xl mx-auto mb-3" />
            <Skeleton className="h-8 w-64 mx-auto mb-2 rounded-lg" />
            <Skeleton className="h-4 w-48 mx-auto mb-3 rounded" />
            <Skeleton className="h-6 w-32 mx-auto rounded-full" />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Money to Receive Skeleton */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-1 rounded" />
                  <Skeleton className="h-8 w-24 mb-1 rounded-lg" />
                  <Skeleton className="h-3 w-16 rounded" />
                </div>
                <Skeleton className="w-12 h-12 rounded-xl" />
              </div>
              
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex justify-between items-center bg-white/60 rounded-lg p-2 border border-green-100">
                    <Skeleton className="h-4 w-20 rounded" />
                    <Skeleton className="h-6 w-16 rounded" />
                  </div>
                ))}
              </div>
            </div>

            {/* Money to Give Skeleton */}
            <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-5 border border-red-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-1 rounded" />
                  <Skeleton className="h-8 w-24 mb-1 rounded-lg" />
                  <Skeleton className="h-3 w-16 rounded" />
                </div>
                <Skeleton className="w-12 h-12 rounded-xl" />
              </div>
              
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="flex justify-between items-center bg-white/60 rounded-lg p-2 border border-red-100">
                    <Skeleton className="h-4 w-20 rounded" />
                    <Skeleton className="h-6 w-16 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Net Balance Skeleton */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200">
            <div className="text-center">
              <Skeleton className="w-12 h-12 rounded-xl mx-auto mb-3" />
              <Skeleton className="h-4 w-24 mx-auto mb-2 rounded" />
              <Skeleton className="h-10 w-32 mx-auto mb-2 rounded-lg" />
              <Skeleton className="h-5 w-40 mx-auto mb-2 rounded" />
              <Skeleton className="h-6 w-48 mx-auto rounded-full" />
            </div>
          </div>
        </div>

        {/* Navigation Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="group relative overflow-hidden bg-gray-200 rounded-2xl p-5 animate-pulse">
              <div className="flex items-center space-x-4">
                <Skeleton className="w-12 h-12 rounded-xl" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-24 mb-1 rounded" />
                  <Skeleton className="h-4 w-16 mb-1 rounded" />
                  <Skeleton className="h-3 w-20 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tips Section Skeleton */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-lg border border-white/20">
          <div className="text-center mb-6">
            <Skeleton className="w-12 h-12 rounded-xl mx-auto mb-3" />
            <Skeleton className="h-6 w-48 mx-auto mb-2 rounded-lg" />
            <Skeleton className="h-4 w-64 mx-auto mb-2 rounded" />
            <Skeleton className="h-6 w-32 mx-auto rounded-full" />
          </div>
          <div className="grid gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                <Skeleton className="w-6 h-6 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-1 rounded" />
                  <Skeleton className="h-3 w-full rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export const CardSkeleton = () => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-6 w-32 rounded" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
      <Skeleton className="h-4 w-24 mb-2 rounded" />
      <Skeleton className="h-4 w-16 mb-4 rounded" />
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex justify-between items-center">
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-4 w-16 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

export const ListSkeleton = ({ count = 3 }: { count?: number }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow-lg p-4 animate-pulse">
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-5 w-24 rounded" />
            <Skeleton className="h-6 w-16 rounded-lg" />
          </div>
          <Skeleton className="h-4 w-32 mb-2 rounded" />
          <Skeleton className="h-4 w-20 rounded" />
        </div>
      ))}
    </div>
  )
}

export default Skeleton
