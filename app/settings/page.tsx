'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  deleteUser,
  EmailAuthProvider,
  GoogleAuthProvider,
} from 'firebase/auth'
import { auth } from '@/lib/firebase-app'
import { useAuth } from '@/lib/firebase-auth'
import { isValidPassword } from '@/lib/validation'
import { toast } from '@/lib/toast'
import { confirm } from '@/lib/confirm'
import AppBar from '@/components/AppBar'
import Modal, { ActionButton } from '@/components/Modal'
import { UserIcon, KeyIcon } from '@/components/Icons'
import { t, useLang, fmtInt, fmtDate } from '@/lib/i18n'
import { getUserPrefs, setUserPrefs, deleteAllMyData } from '@/lib/storage'
import { importMyData } from '@/lib/export'
import { hashPin, PIN_HASH_KEY } from '@/components/AppLock'
import PinInput from '@/components/PinInput'
import { runBackup, disconnectBackup, isBackupConfigured, preloadBackup } from '@/lib/google-backup'

// Map Firebase reauth/update errors to scrubbed Bengali/English messages.
function reauthErrorMessage(code: string): string {
  switch (code) {
    case 'auth/wrong-password':
      return t('auth.error.wrongPassword')
    case 'auth/invalid-credential':
      return t('auth.error.invalidCredential')
    case 'auth/too-many-requests':
      return t('auth.error.tooManyRequests')
    case 'auth/network-request-failed':
      return t('auth.error.network')
    case 'auth/popup-closed-by-user':
      return t('auth.error.popupClosed')
    default:
      return t('settings.error.generic')
  }
}

export default function SettingsPage() {
  useLang() // re-render on language switch
  const { user, loading, logout } = useAuth()
  const router = useRouter()

  const isPasswordUser =
    auth.currentUser?.providerData.some((p) => p.providerId === 'password') ?? false

  // Profile / display name
  const [displayName, setDisplayName] = useState('')
  const [savingName, setSavingName] = useState(false)

  // Change password
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  // Delete account modal (password re-auth)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleting, setDeleting] = useState(false)

  // App lock (PIN)
  const [pinEnabled, setPinEnabled] = useState(false)
  const [pin1, setPin1] = useState('')
  const [pin2, setPin2] = useState('')
  const [savingPin, setSavingPin] = useState(false)

  // Backup import
  const [importing, setImporting] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)

  // Google Sheet backup (user-owned)
  const [backupUrl, setBackupUrl] = useState<string | null>(null)
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null)
  const [backupBusy, setBackupBusy] = useState(false)

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.push('/login')
      return
    }
    setDisplayName(user.displayName || '')
    getUserPrefs().then((p) => {
      setPinEnabled(!!p.pinHash)
      setBackupUrl(p.backupSheetId ? (p.backupSheetUrl || '') : null)
      setLastBackupAt(p.lastBackupAt || null)
    }).catch(() => {})
    // Warm up Google Identity Services so the Connect click can open the OAuth
    // popup synchronously (a post-click await would get the popup blocked).
    if (isBackupConfigured()) preloadBackup()
  }, [user, loading, router])

  const handleConnectBackup = async () => {
    setBackupBusy(true)
    try {
      const r = await runBackup(true) // interactive: shows the Google consent popup
      setBackupUrl(r.url)
      setLastBackupAt(r.at)
      toast.success(t('gbackup.connected'))
    } catch {
      toast.error(t('gbackup.error'))
    } finally {
      setBackupBusy(false)
    }
  }

  const handleSyncBackup = async () => {
    setBackupBusy(true)
    try {
      const r = await runBackup(true)
      setBackupUrl(r.url)
      setLastBackupAt(r.at)
      toast.success(t('gbackup.synced'))
    } catch {
      toast.error(t('gbackup.error'))
    } finally {
      setBackupBusy(false)
    }
  }

  const handleDisconnectBackup = () => {
    confirm.custom(t('gbackup.disconnectTitle'), t('gbackup.disconnectMsg'), async () => {
      try {
        await disconnectBackup()
        setBackupUrl(null)
        setLastBackupAt(null)
        toast.success(t('gbackup.disconnected'))
      } catch {
        toast.error(t('gbackup.error'))
      }
    }, { confirmText: t('gbackup.disconnect'), cancelText: t('common.cancel'), type: 'warning' })
  }

  // confirmValue lets the confirm field's onComplete pass its just-typed value
  // directly — reading pin2 from state here would be stale (setPin2 hasn't
  // re-rendered yet when onComplete fires on the 4th digit).
  const handleEnablePin = async (confirmValue?: string) => {
    const confirmPin = confirmValue ?? pin2
    if (!/^\d{4}$/.test(pin1)) { toast.error(t('lock.invalid')); return }
    if (pin1 !== confirmPin) { toast.error(t('lock.mismatch')); return }
    setSavingPin(true)
    try {
      const hash = await hashPin(pin1)
      await setUserPrefs({ pinHash: hash })
      try { sessionStorage.setItem('lifetrack-unlocked', '1') } catch { /* ignore */ }
      // Cache the hint so the gate can show instantly on next open (no flash).
      try { localStorage.setItem(PIN_HASH_KEY, hash) } catch { /* ignore */ }
      setPinEnabled(true)
      setPin1('')
      setPin2('')
      toast.success(t('lock.enabled'))
    } catch {
      toast.error(t('lock.saveError'))
    } finally {
      setSavingPin(false)
    }
  }

  const handleDisablePin = () => {
    confirm.custom(t('lock.title'), t('lock.disableConfirm'), async () => {
      try {
        // null (not undefined) so the write isn't stripped by filterUndefined.
        await setUserPrefs({ pinHash: null as unknown as string })
        try { localStorage.removeItem(PIN_HASH_KEY) } catch { /* ignore */ }
        setPinEnabled(false)
        toast.success(t('lock.disabled'))
      } catch {
        toast.error(t('lock.saveError'))
      }
    }, { confirmText: t('lock.disable'), cancelText: t('common.cancel'), type: 'warning' })
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (!file) return
    confirm.custom(t('import.confirmTitle'), t('import.confirmMsg'), async () => {
      setImporting(true)
      try {
        const res = await importMyData(file)
        toast.success(t('import.success', { debts: fmtInt(res.debts), loans: fmtInt(res.loans), reminders: fmtInt(res.reminders), expenses: fmtInt(res.expenses) }))
      } catch {
        toast.error(t('import.error'))
      } finally {
        setImporting(false)
      }
    }, { confirmText: t('import.action'), cancelText: t('common.cancel'), type: 'info' })
  }

  if (loading || !user) return null

  const handleSaveName = async () => {
    const name = displayName.trim()
    if (!name || !auth.currentUser) return
    setSavingName(true)
    try {
      await updateProfile(auth.currentUser, { displayName: name })
      toast.success(t('settings.nameSaved'))
    } catch {
      toast.error(t('settings.error.generic'))
    } finally {
      setSavingName(false)
    }
  }

  const handleChangePassword = async () => {
    if (!auth.currentUser || !auth.currentUser.email) return
    if (!currentPassword) {
      toast.error(t('settings.currentPasswordRequired'))
      return
    }
    const check = isValidPassword(newPassword)
    if (!check.isValid) {
      toast.error(check.message || t('auth.error.weakPassword'))
      return
    }
    setChangingPassword(true)
    try {
      const cred = EmailAuthProvider.credential(auth.currentUser.email, currentPassword)
      await reauthenticateWithCredential(auth.currentUser, cred)
      await updatePassword(auth.currentUser, newPassword)
      toast.success(t('settings.passwordChanged'))
      setCurrentPassword('')
      setNewPassword('')
    } catch (error: any) {
      toast.error(reauthErrorMessage(error?.code))
    } finally {
      setChangingPassword(false)
    }
  }

  // After successful reauth: wipe all Firestore data (while still authenticated),
  // clear local hints, then delete the auth user and log out.
  const finishDelete = async () => {
    if (!auth.currentUser) return
    // Delete data FIRST — after deleteUser there's no auth to satisfy the rules,
    // which would leave the data orphaned forever.
    try { await deleteAllMyData() } catch { /* best-effort; still delete the account */ }
    try { sessionStorage.removeItem('lifetrack-unlocked') } catch { /* ignore */ }
    try { localStorage.removeItem(PIN_HASH_KEY) } catch { /* ignore */ }
    await deleteUser(auth.currentUser)
    toast.success(t('settings.accountDeleted'))
    await logout()
    router.push('/login')
  }

  const handleDeleteClick = () => {
    confirm.delete(t('settings.deleteConfirmTitle'), t('settings.deleteConfirmMsg'), () => {
      if (isPasswordUser) {
        // Collect the current password for re-authentication in a modal.
        setDeletePassword('')
        setDeleteOpen(true)
      } else {
        // Google (or other federated) user: re-auth via popup.
        void handleDeleteGoogle()
      }
    })
  }

  const handleDeleteGoogle = async () => {
    if (!auth.currentUser) return
    setDeleting(true)
    try {
      await reauthenticateWithPopup(auth.currentUser, new GoogleAuthProvider())
      await finishDelete()
    } catch (error: any) {
      toast.error(reauthErrorMessage(error?.code))
    } finally {
      setDeleting(false)
    }
  }

  const handleDeletePassword = async () => {
    if (!auth.currentUser || !auth.currentUser.email) return
    if (!deletePassword) {
      toast.error(t('settings.currentPasswordRequired'))
      return
    }
    setDeleting(true)
    try {
      const cred = EmailAuthProvider.credential(auth.currentUser.email, deletePassword)
      await reauthenticateWithCredential(auth.currentUser, cred)
      setDeleteOpen(false)
      await finishDelete()
    } catch (error: any) {
      toast.error(reauthErrorMessage(error?.code))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <AppBar title={t('settings.title')} back />

      <main className="p-4 space-y-4 max-w-lg mx-auto w-full safe-area-bottom">
        {/* Profile */}
        <section className="card space-y-4">
          <div className="flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-content" />
            <h2 className="text-base font-semibold text-content">{t('settings.profile')}</h2>
          </div>

          <div>
            <label className="label">{t('auth.email')}</label>
            <input type="email" value={user.email || ''} className="input" disabled readOnly />
          </div>

          <div>
            <label htmlFor="displayName" className="label">{t('settings.displayName')}</label>
            <input
              type="text"
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="input"
              placeholder={t('auth.namePlaceholder')}
            />
          </div>

          <div className="flex justify-end">
            <ActionButton
              onClick={handleSaveName}
              loading={savingName}
              disabled={!displayName.trim() || displayName.trim() === (user.displayName || '')}
            >
              {t('settings.saveName')}
            </ActionButton>
          </div>
        </section>

        {/* Change password */}
        <section className="card space-y-4">
          <div className="flex items-center gap-2">
            <KeyIcon className="w-5 h-5 text-content" />
            <h2 className="text-base font-semibold text-content">{t('settings.changePassword')}</h2>
          </div>

          {isPasswordUser ? (
            <>
              <div>
                <label htmlFor="currentPassword" className="label">{t('settings.currentPassword')}</label>
                <input
                  type="password"
                  id="currentPassword"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input"
                  placeholder={t('auth.passwordPlaceholder')}
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label htmlFor="newPassword" className="label">{t('settings.newPassword')}</label>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input"
                  placeholder={t('auth.passwordMinPlaceholder')}
                  autoComplete="new-password"
                />
              </div>
              <div className="flex justify-end">
                <ActionButton
                  onClick={handleChangePassword}
                  loading={changingPassword}
                  disabled={!currentPassword || !newPassword}
                >
                  {t('settings.changePassword')}
                </ActionButton>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">{t('settings.googleNoPassword')}</p>
          )}
        </section>

        {/* App lock (PIN) */}
        <section className="card space-y-4">
          <h2 className="text-base font-semibold text-content">{t('lock.title')}</h2>
          <p className="text-sm text-muted">{t('lock.setDesc')}</p>
          {pinEnabled ? (
            <div className="flex justify-end">
              <button type="button" className="btn btn-secondary" onClick={handleDisablePin}>{t('lock.disable')}</button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="label">{t('lock.newPin')}</label>
                <PinInput value={pin1} onChange={setPin1} ariaLabel={t('lock.newPin')} />
              </div>
              <div className="space-y-2">
                <label className="label">{t('lock.confirmPin')}</label>
                <PinInput value={pin2} onChange={setPin2} onComplete={(v) => handleEnablePin(v)} ariaLabel={t('lock.confirmPin')} />
              </div>
              <div className="flex justify-end">
                <button type="button" className="btn btn-primary" onClick={() => handleEnablePin()} disabled={savingPin}>{t('lock.enable')}</button>
              </div>
            </div>
          )}
        </section>

        {/* Backup import */}
        <section className="card space-y-4">
          <h2 className="text-base font-semibold text-content">{t('import.action')}</h2>
          <p className="text-sm text-muted">{t('import.confirmMsg')}</p>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportFile}
          />
          <div className="flex justify-end">
            <button type="button" className="btn btn-secondary" onClick={() => importInputRef.current?.click()} disabled={importing}>
              {importing ? t('import.importing') : t('import.action')}
            </button>
          </div>
        </section>

        {/* Google Sheet backup (user-owned readable copy) */}
        {isBackupConfigured() && (
          <section className="card space-y-4">
            <h2 className="text-base font-semibold text-content">{t('gbackup.title')}</h2>
            <p className="text-sm text-muted">{t('gbackup.desc')}</p>
            {backupUrl === null ? (
              <div className="flex justify-end">
                <button type="button" className="btn btn-primary" onClick={handleConnectBackup} disabled={backupBusy}>
                  {backupBusy ? t('gbackup.working') : t('gbackup.connect')}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {lastBackupAt && (
                  <p className="text-xs text-muted">{t('gbackup.lastSynced', { time: fmtDate(lastBackupAt, true) })}</p>
                )}
                <div className="flex flex-wrap gap-2 justify-end">
                  {backupUrl && (
                    <a href={backupUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                      {t('gbackup.open')}
                    </a>
                  )}
                  <button type="button" className="btn btn-secondary" onClick={handleSyncBackup} disabled={backupBusy}>
                    {backupBusy ? t('gbackup.working') : t('gbackup.syncNow')}
                  </button>
                  <button type="button" className="btn btn-ghost text-negative" onClick={handleDisconnectBackup} disabled={backupBusy}>
                    {t('gbackup.disconnect')}
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Delete account */}
        <section className="card space-y-4">
          <h2 className="text-base font-semibold text-negative">{t('settings.deleteAccount')}</h2>
          <p className="text-sm text-muted">{t('settings.deleteNote')}</p>
          <div className="flex justify-end">
            <button type="button" onClick={handleDeleteClick} className="btn btn-danger" disabled={deleting}>
              {t('settings.deleteAccount')}
            </button>
          </div>
        </section>
      </main>

      {/* Password re-auth modal for account deletion */}
      <Modal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={t('settings.deleteConfirmTitle')}
        footerActions={
          <>
            <ActionButton variant="secondary" onClick={() => setDeleteOpen(false)}>
              {t('common.cancel')}
            </ActionButton>
            <ActionButton variant="danger" onClick={handleDeletePassword} loading={deleting}>
              {t('settings.deleteAccount')}
            </ActionButton>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">{t('settings.deleteReauthMsg')}</p>
          <div>
            <label htmlFor="deletePassword" className="label">{t('settings.currentPassword')}</label>
            <input
              type="password"
              id="deletePassword"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              className="input"
              placeholder={t('auth.passwordPlaceholder')}
              autoComplete="current-password"
            />
          </div>
        </div>
      </Modal>
    </>
  )
}
