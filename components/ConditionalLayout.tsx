'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/firebase-auth'
import Navigation from './Navigation'

interface ConditionalLayoutProps {
  children: ReactNode
}

export default function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname()
  const { user } = useAuth()
  
  // Pages that don't need bottom padding (login/register pages)
  const noPaddingPages = ['/login', '/register']
  const isNoPaddingPage = noPaddingPages.includes(pathname)
  
  // Show navigation only for authenticated users and not on login/register pages
  const showNavigation = user && !isNoPaddingPage
  
  return (
    <div className="flex flex-col h-full min-h-screen">
      <main className={`flex-1 overflow-auto ${showNavigation ? 'pb-16' : ''}`}>
        {children}
      </main>
      {showNavigation && <Navigation />}
    </div>
  )
}
