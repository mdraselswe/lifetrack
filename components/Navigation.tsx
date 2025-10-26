'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useState } from 'react'

export default function Navigation() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)

  const navItems = [
    { href: '/', label: 'হোম', icon: '🏠' },
    { href: '/reminders', label: 'রিমাইন্ডার', icon: '⏰' },
    { href: '/debts', label: 'ধার দিয়েছি', icon: '💰' },
    { href: '/loans', label: 'ধার নিয়েছি', icon: '💸' },
  ]

  const handleLogout = () => {
    logout()
    setShowUserMenu(false)
  }

  if (!user) {
    return null // Don't show navigation if user is not logged in
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-xl z-50 transition-transform duration-300">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors duration-300 rounded-t-lg ${
                isActive
                  ? 'text-blue-600 bg-blue-50 shadow-md'
                  : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50/50'
              }`}
            >
              <span className="text-xl sm:text-2xl mb-1">{item.icon}</span>
              <span className="text-xs font-medium leading-tight">{item.label}</span>
            </Link>
          )
        })}
        
        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex flex-col items-center justify-center h-full px-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50/50 transition-colors duration-300 rounded-t-lg"
          >
            <span className="text-xl sm:text-2xl mb-1">👤</span>
            <span className="text-xs font-medium leading-tight">প্রোফাইল</span>
          </button>
          
          {showUserMenu && (
            <div className="absolute bottom-full right-0 mb-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors duration-200"
              >
                লগআউট
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

