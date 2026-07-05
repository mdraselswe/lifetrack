'use client'

import { useEffect, useState } from 'react'
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
import { t, useLang } from '@/lib/i18n'

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

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.push('/login')
      return
    }
    setDisplayName(user.displayName || '')
  }, [user, loading, router])

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
      <AppBar title={t('settings.title')} />

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
