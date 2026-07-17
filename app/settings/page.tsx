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
import { t, useLang, fmtInt } from '@/lib/i18n'
import { getUserPrefs, setUserPrefs } from '@/lib/storage'
import { importMyData } from '@/lib/export'
import { hashPin } from '@/components/AppLock'
import PinInput from '@/components/PinInput'

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

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.push('/login')
      return
    }
    setDisplayName(user.displayName || '')
    getUserPrefs().then((p) => setPinEnabled(!!p.pinHash)).catch(() => {})
  }, [user, loading, router])

  const handleEnablePin = async () => {
    if (!/^\d{4}$/.test(pin1)) { toast.error(t('lock.invalid')); return }
    if (pin1 !== pin2) { toast.error(t('lock.mismatch')); return }
    setSavingPin(true)
    try {
      await setUserPrefs({ pinHash: await hashPin(pin1) })
      try { sessionStorage.setItem('lifetrack-unlocked', '1') } catch { /* ignore */ }
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

  // After successful reauth, actually delete the auth user, then log out.
  const finishDelete = async () => {
    if (!auth.currentUser) return
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
                <PinInput value={pin2} onChange={setPin2} onComplete={() => handleEnablePin()} ariaLabel={t('lock.confirmPin')} />
              </div>
              <div className="flex justify-end">
                <button type="button" className="btn btn-primary" onClick={handleEnablePin} disabled={savingPin}>{t('lock.enable')}</button>
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
