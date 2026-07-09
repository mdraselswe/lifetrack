'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/firebase-auth'
import { toast } from '@/lib/toast'
import Link from 'next/link'
import { validateLoginForm, isValidEmail } from '@/lib/validation'
import { GoogleIcon, WalletIcon } from '@/components/Icons'
import Modal, { ActionButton } from '@/components/Modal'
import ThemeToggle from '@/components/ThemeToggle'
import LanguageToggle from '@/components/LanguageToggle'
import { t, useLang } from '@/lib/i18n'
import { FinanceHeroIllustration } from '@/components/Illustrations'

export default function LoginPage() {
  useLang() // re-render on language switch
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const { login, loginWithGoogle, resetPassword } = useAuth()
  const router = useRouter()

  // Password reset modal
  const [resetOpen, setResetOpen] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  const openReset = () => {
    setResetEmail(email) // prefill with any already-typed email
    setResetOpen(true)
  }

  const handleReset = async () => {
    if (!isValidEmail(resetEmail)) {
      toast.error(t('auth.invalidEmailInput'))
      return
    }
    setResetLoading(true)
    try {
      await resetPassword(resetEmail)
      toast.success(t('auth.resetSent'))
      setResetOpen(false)
    } catch (error: any) {
      toast.error(error.message || t('auth.error.reset'))
    } finally {
      setResetLoading(false)
    }
  }

  const validateEmail = (value: string) => {
    setErrors(prev => ({ ...prev, email: isValidEmail(value) ? '' : t('auth.invalidEmailInput') }))
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      await loginWithGoogle()
      toast.success(t('auth.login.success'))
      router.push('/')
    } catch (error: any) {
      toast.error(error.message || t('auth.error.google'))
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const validation = validateLoginForm({ email, password })
    if (!validation.isValid) {
      toast.error(validation.message || t('auth.formInvalid'))
      return
    }
    setLoading(true)
    try {
      await login(email, password)
      toast.success(t('auth.login.success'))
      router.push('/')
    } catch (error: any) {
      toast.error(error.message || t('auth.error.invalidCredential'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen full-vh flex flex-col items-center p-4 safe-area-top safe-area-bottom overflow-y-auto">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <LanguageToggle />
        <ThemeToggle />
      </div>

      {/* No fade-in here: this wrapper holds the LCP element (hero + heading),
          and an opacity-0 start delays Largest Contentful Paint by ~320ms. */}
      <div className="w-full max-w-sm my-auto">
        <div className="flex flex-col items-center mb-6">
          <FinanceHeroIllustration className="w-64 h-44 mb-1" />
          <h1 className="text-2xl font-bold text-content">{t('auth.login.title')}</h1>
          <p className="text-sm text-muted mt-1">{t('auth.login.subtitle')}</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="label">{t('auth.email')}</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); validateEmail(e.target.value) }}
                className={`input ${errors.email ? 'input-error' : ''}`}
                placeholder={t('auth.emailPlaceholder')}
                required
              />
              {errors.email && <p className="mt-1.5 text-sm text-negative">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="password" className="label">{t('auth.password')}</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder={t('auth.passwordPlaceholder')}
                required
              />
              <div className="mt-1.5 text-right">
                <button
                  type="button"
                  onClick={openReset}
                  className="text-sm text-accent font-medium"
                >
                  {t('auth.forgotPassword')}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary w-full">
              {loading ? t('auth.login.loading') : t('auth.login.button')}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 border-t border-line" />
            <span className="text-xs text-muted">{t('auth.or')}</span>
            <div className="flex-1 border-t border-line" />
          </div>

          <button type="button" onClick={handleGoogleLogin} disabled={loading} className="btn btn-secondary w-full">
            <GoogleIcon />
            {t('auth.login.google')}
          </button>
        </div>

        <p className="text-center text-sm text-muted mt-6">
          {t('auth.login.noAccount')}{' '}
          <Link href="/register" className="text-accent font-medium">{t('auth.login.registerLink')}</Link>
        </p>
      </div>

      <Modal
        isOpen={resetOpen}
        onClose={() => setResetOpen(false)}
        title={t('auth.resetTitle')}
        footerActions={
          <>
            <ActionButton variant="secondary" onClick={() => setResetOpen(false)}>
              {t('common.cancel')}
            </ActionButton>
            <ActionButton onClick={handleReset} loading={resetLoading}>
              {t('auth.sendResetLink')}
            </ActionButton>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">{t('auth.resetSubtitle')}</p>
          <div>
            <label htmlFor="reset-email" className="label">{t('auth.email')}</label>
            <input
              type="email"
              id="reset-email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              className="input"
              placeholder={t('auth.emailPlaceholder')}
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
