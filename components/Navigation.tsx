'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navigation() {
  const pathname = usePathname()

  const navItems = [
    { href: '/', label: 'হোম', icon: '🏠' },
    { href: '/reminders', label: 'রিমাইন্ডার', icon: '⏰' },
    { href: '/debts', label: 'ধার দিয়েছি', icon: '💰' },
    { href: '/loans', label: 'ধার নিয়েছি', icon: '💸' },
  ]

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
      </div>
    </nav>
  )
}

