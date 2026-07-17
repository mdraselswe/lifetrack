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
import { confirm } from '@/lib/confirm'
import { SearchIcon } from '@/components/Icons'
import { NoResultsIllustration } from '@/components/Illustrations'
import { avatarColor } from '@/lib/avatar'

type AdminUser = {
  uid: string
  email: string
  name: string
  verified: boolean
  disabled: boolean
  provider: string
  createdAt: number
  lastLoginAt: number
  counts: { debts: number; loans: number; reminders: number; expenses: number }
}

export default function AdminPage() {
  useLang() // re-render on language switch
  const { user, loading } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<AdminUser[] | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'verified' | 'unverified' | 'google' | 'email'>('all')

  // Push broadcast composer
  const [pushTitle, setPushTitle] = useState('')
  const [pushBody, setPushBody] = useState('')
  const [pushUrl, setPushUrl] = useState('')
  const [pushTarget, setPushTarget] = useState<'all' | 'verified' | 'unverified'>('all')
  const [pushSending, setPushSending] = useState(false)

  const sendBroadcast = async () => {
    const title = pushTitle.trim()
    const body = pushBody.trim()
    if (!title || !body) { toast.error(t('admin.pushEmpty')); return }
    setPushSending(true)
    try {
      const token = await auth.currentUser?.getIdToken()
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-firebase-token': token || '' },
        body: JSON.stringify({ title, body, url: pushUrl.trim(), target: pushTarget }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'failed')
      toast.success(`${t('admin.pushResult')}: ${fmtInt(data.sent)}`)
      setPushTitle(''); setPushBody(''); setPushUrl('')
    } catch (e) {
      console.error('broadcast failed:', e)
      toast.error(t('admin.pushError'))
    } finally {
      setPushSending(false)
    }
  }

  const confirmSend = () => {
    if (!pushTitle.trim() || !pushBody.trim()) { toast.error(t('admin.pushEmpty')); return }
    confirm.custom(t('admin.pushTitle'), t('admin.pushConfirm'), sendBroadcast, {
      confirmText: t('admin.pushSend'),
      type: 'info',
    })
  }

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
  const q = search.trim().toLowerCase()
  const matchesFilter = (u: AdminUser) => {
    switch (filter) {
      case 'verified': return u.verified
      case 'unverified': return !u.verified
      case 'google': return u.provider === 'google.com'
      case 'email': return u.provider !== 'google.com'
      default: return true
    }
  }
  const shown = (users || [])
    .filter(matchesFilter)
    .filter((u) => !q || u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q))

  const FILTERS: { key: typeof filter; label: string }[] = [
    { key: 'all', label: t('admin.filterAll') },
    { key: 'verified', label: t('admin.filterVerified') },
    { key: 'unverified', label: t('admin.filterUnverified') },
    { key: 'google', label: t('admin.filterGoogle') },
    { key: 'email', label: t('admin.filterEmail') },
  ]

  return (
    <div className="min-h-full">
      <AppBar title={t('admin.title')} subtitle={t('admin.subtitle')} back />

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

            <details className="card">
              <summary className="cursor-pointer font-semibold text-content">{t('admin.pushTitle')}</summary>
              <div className="mt-4 space-y-3">
                <div>
                  <label className="label">{t('admin.pushHeading')}</label>
                  <input type="text" value={pushTitle} onChange={(e) => setPushTitle(e.target.value)} className="input" placeholder={t('admin.pushHeadingPlaceholder')} maxLength={80} />
                </div>
                <div>
                  <label className="label">{t('admin.pushMessage')}</label>
                  <textarea value={pushBody} onChange={(e) => setPushBody(e.target.value)} className="input min-h-[80px] resize-y" placeholder={t('admin.pushMessagePlaceholder')} maxLength={300} />
                </div>
                <div>
                  <label className="label">{t('admin.pushLink')}</label>
                  <input type="text" value={pushUrl} onChange={(e) => setPushUrl(e.target.value)} className="input" placeholder="/debts" />
                </div>
                <div>
                  <label className="label">{t('admin.pushTarget')}</label>
                  <div className="flex gap-2">
                    {([
                      { k: 'all', l: t('admin.targetAll') },
                      { k: 'verified', l: t('admin.targetVerified') },
                      { k: 'unverified', l: t('admin.targetUnverified') },
                    ] as const).map((o) => (
                      <button key={o.k} type="button" onClick={() => setPushTarget(o.k)}
                        className={`chip flex-shrink-0 ${pushTarget === o.k ? 'chip-accent' : ''}`}>
                        {o.l}
                      </button>
                    ))}
                  </div>
                </div>
                <button type="button" onClick={confirmSend} disabled={pushSending} className="btn btn-primary w-full">
                  {pushSending ? t('admin.pushSending') : t('admin.pushSend')}
                </button>
              </div>
            </details>

            <div className="relative">
              <SearchIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-10"
                placeholder={t('search.placeholder')}
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`chip flex-shrink-0 whitespace-nowrap transition-colors ${filter === f.key ? 'chip-accent' : ''}`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {shown.length === 0 && (
              <div className="text-center py-10"><NoResultsIllustration className="w-44 h-26 mx-auto mb-3" /><p className="text-muted text-sm">{t('search.noResults')}</p></div>
            )}

            <div className="space-y-3 list-stagger" key={q + filter}>
              {shown.map((u) => (
                <div key={u.uid} className="card space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-semibold"
                        style={{ backgroundColor: avatarColor(u.name || u.email).bg, color: avatarColor(u.name || u.email).fg }}
                      >
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

                  <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted">
                    <span className="chip">{t('nav.given')} {fmtInt(u.counts.debts)}</span>
                    <span className="chip">{t('nav.taken')} {fmtInt(u.counts.loans)}</span>
                    <span className="chip">{t('nav.reminders')} {fmtInt(u.counts.reminders)}</span>
                    <span className="chip">{t('nav.expenses')} {fmtInt(u.counts.expenses)}</span>
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
