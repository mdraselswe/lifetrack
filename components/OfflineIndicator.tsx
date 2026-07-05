'use client'

import { useEffect, useState } from 'react'
import { t, useLang } from '@/lib/i18n'
import { WifiOffIcon } from '@/components/Icons'

export default function OfflineIndicator() {
  // Re-render on language switch so the banner copy stays in sync.
  useLang()

  // Start "online" on both server and first client render to avoid a
  // hydration mismatch; the effect syncs the real value right after mount.
  const [online, setOnline] = useState(true)

  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  if (online) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-[130] flex items-center justify-center gap-1.5 tint-warn text-caution text-xs py-1.5 px-3 text-center shadow-sm animate-[offlineIn_.25s_ease-out]"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.375rem)' }}
    >
      <WifiOffIcon width={14} height={14} className="shrink-0" />
      <span>{t('offline.banner')}</span>
      <style>{`@keyframes offlineIn{from{opacity:0;transform:translateY(-100%)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  )
}
