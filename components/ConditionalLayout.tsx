'use client'

import type { ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/firebase-auth'
import Navigation from './Navigation'
import { useState, useRef } from 'react'

interface ConditionalLayoutProps {
  children: ReactNode
}

// Navigation items in order (must match Navigation component)
const navItems = [
  { href: '/', label: 'হোম' },
  { href: '/reminders', label: 'রিমাইন্ডার' },
  { href: '/debts', label: 'ধার দিয়েছি' },
  { href: '/loans', label: 'ধার নিয়েছি' },
]

export default function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()
  
  // Touch gesture state
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const touchStartTime = useRef<number | null>(null)
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null)
  
  // Pages that don't need bottom padding (login/register pages)
  const noPaddingPages = ['/login', '/register']
  const isNoPaddingPage = noPaddingPages.includes(pathname)
  
  // Show navigation only for authenticated users and not on login/register pages
  const showNavigation = user && !isNoPaddingPage
  
  // Get current navigation index
  const getCurrentNavIndex = () => {
    return navItems.findIndex(item => item.href === pathname)
  }
  
  // Handle swipe navigation
  const handleSwipe = (direction: 'left' | 'right') => {
    const currentIndex = getCurrentNavIndex()
    if (currentIndex === -1) return // Current page is not in nav items
    
    let nextIndex: number
    
    if (direction === 'left') {
      // Swipe left = next page
      nextIndex = currentIndex + 1
      if (nextIndex >= navItems.length) return // Already at last page
    } else {
      // Swipe right = previous page
      nextIndex = currentIndex - 1
      if (nextIndex < 0) return // Already at first page
    }
    
    router.push(navItems[nextIndex].href)
    setSwipeDirection(direction)
    setTimeout(() => setSwipeDirection(null), 300) // Reset after animation
  }
  
  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStartX.current = touch.clientX
    touchStartY.current = touch.clientY
    touchStartTime.current = Date.now()
  }
  
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null || touchStartTime.current === null) {
      return
    }
    
    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - touchStartX.current
    const deltaY = touch.clientY - touchStartY.current
    const deltaTime = Date.now() - touchStartTime.current
    
    const absDeltaX = Math.abs(deltaX)
    const absDeltaY = Math.abs(deltaY)
    
    // Swipe detection criteria:
    // 1. Horizontal movement should be greater than vertical (horizontal swipe)
    // 2. Minimum horizontal distance: 50px
    // 3. Maximum time: 500ms (quick swipe)
    // 4. Horizontal movement should be at least 2x vertical (prevent accidental swipes)
    
    if (
      absDeltaX > absDeltaY * 2 && // Horizontal swipe is dominant
      absDeltaX > 50 && // Minimum swipe distance
      deltaTime < 500 && // Quick swipe
      showNavigation // Only allow swipe when navigation is visible
    ) {
      if (deltaX > 0) {
        // Swipe right = previous page
        handleSwipe('right')
      } else {
        // Swipe left = next page
        handleSwipe('left')
      }
    }
    
    // Reset touch state
    touchStartX.current = null
    touchStartY.current = null
    touchStartTime.current = null
  }
  
  return (
    <div className="app-container no-bounce">
      <main
        className={`flex-1 ${showNavigation ? 'pb-nav' : ''}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          // Let the document scroll natively (no inner scroll container) so the
          // browser's dynamic toolbar and momentum scrolling work correctly on
          // mobile. pan-y keeps vertical scroll while enabling swipe detection.
          touchAction: showNavigation ? 'pan-y' : 'auto',
        }}
      >
        {children}
      </main>
      {showNavigation && <Navigation />}
    </div>
  )
}
