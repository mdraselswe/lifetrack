'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/firebase-auth'
import { auth } from '@/lib/firebase-app'
import { ADMIN_EMAIL } from '@/lib/admin'
import AppBar from '@/components/AppBar'
import { ListSkeleton } from '@/components/SkeletonLoader'
import { t, useLang, fmtInt, fmtDate, fmtRelative } from '@/lib/i18n'
import { toast } from '@/lib/toast'

type AdminUser = {
  uid: string
  email: string
  name: string
  verified: boolean
  disabled: boolean
  provider: string
  createdAt: number
  lastLoginAt: number
  counts: { debts: number; loans: number; reminders: number }
}

export default function AdminPage() {
  useLang() // re-render on language switch
  const { user, loading } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<AdminUser[] | null>(null)

  const isAdmin = !!user?.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()

  useEffect(() => {
    if (loading) return
    if (!user) { router.replace('/login'); return }
    if (!isAdmin) { router.replace('/'); return }
    let cancelled = false
    ;(async () => {
      try {
        const token = await auth.currentUser?.getIdToken()
        const res = await fetch('/api/admin/users', { headers: { 'x-firebase-token': token || '' } })
        const data = await res.json()
        if (!res.ok || !data.ok) throw new Error(data.error || 'failed')
        if (!cancelled) setUsers(data.users)
      } catch (e) {
        console.error('admin load failed:', e)
        if (!cancelled) { setUsers([]); toast.error(t('admin.loadError')) }
      }
    })()
    return () => { cancelled = true }
  }, [user, loading, isAdmin, router])

  if (loading || !user || !isAdmin) return null

  const now = Date.now()
  const active7d = (users || []).filter((u) => u.lastLoginAt > now - 7 * 24 * 60 * 60 * 1000).length

  return (
    <div className="min-h-full">
      <AppBar title={t('admin.title')} subtitle={t('admin.subtitle')} />

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4 fade-in">
        {users === null ? (
          <ListSkeleton count={4} />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="stat-tile tint-accent">
                <p className="text-xs font-medium text-accent mb-2">{t('admin.totalUsers')}</p>
                <p className="text-2xl font-bold text-content">{fmtInt(users.length)}</p>
              </div>
              <div className="stat-tile tint-pos">
                <p className="text-xs font-medium text-positive mb-2">{t('admin.active7d')}</p>
                <p className="text-2xl font-bold text-content">{fmtInt(active7d)}</p>
              </div>
            </div>

            <div className="space-y-3">
              {users.map((u) => (
                <div key={u.uid} className="card space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex-shrink-0 w-10 h-10 rounded-full bg-accent text-accent-fg flex items-center justify-center font-semibold">
                        {(u.name || u.email || '?').charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-content truncate">{u.name || u.email}</p>
                        <p className="text-xs text-muted truncate">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className={`chip text-[11px] ${u.verified ? 'chip-accent' : ''}`}>
                        {u.verified ? t('admin.verifiedBadge') : t('admin.unverifiedBadge')}
                      </span>
                      <span className="text-[11px] text-muted">
                        {u.provider === 'google.com' ? t('admin.googleProvider') : t('admin.emailProvider')}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-surface-2 px-3 py-2">
                      <p className="text-muted mb-0.5">{t('admin.registered')}</p>
                      <p className="text-content font-medium">{u.createdAt ? fmtDate(u.createdAt) : '—'}</p>
                    </div>
                    <div className="rounded-xl bg-surface-2 px-3 py-2">
                      <p className="text-muted mb-0.5">{t('admin.lastLogin')}</p>
                      <p className="text-content font-medium">{u.lastLoginAt ? fmtRelative(u.lastLoginAt) : t('admin.never')}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-muted">
                    <span className="chip">{t('nav.given')} {fmtInt(u.counts.debts)}</span>
                    <span className="chip">{t('nav.taken')} {fmtInt(u.counts.loans)}</span>
                    <span className="chip">{t('nav.reminders')} {fmtInt(u.counts.reminders)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
