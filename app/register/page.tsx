'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/firebase-auth'
import { toast } from '@/lib/toast'
import Link from 'next/link'
import { validateRegistrationForm, isValidEmail, isValidName, isValidPassword } from '@/lib/validation'
import { GoogleIcon, WalletIcon } from '@/components/Icons'
import ThemeToggle from '@/components/ThemeToggle'
import LanguageToggle from '@/components/LanguageToggle'
import { t, useLang } from '@/lib/i18n'
import { FinanceHeroIllustration } from '@/components/Illustrations'

export default function RegisterPage() {
  useLang() // re-render on language switch
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const { register, loginWithGoogle } = useAuth()
  const router = useRouter()

  const validateName = (value: string) => {
    const v = isValidName(value)
    setErrors(prev => ({ ...prev, name: v.isValid ? '' : (v.message || '') }))
  }
  const validateEmail = (value: string) => {
    setErrors(prev => ({ ...prev, email: isValidEmail(value) ? '' : t('auth.invalidEmailInput') }))
  }
  const validatePassword = (value: string) => {
    const v = isValidPassword(value)
    setErrors(prev => ({ ...prev, password: v.isValid ? '' : (v.message || '') }))
  }
  const validateConfirmPassword = (value: string) => {
    setErrors(prev => ({ ...prev, confirmPassword: value === password ? '' : t('auth.passwordMismatch') }))
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
    const validation = validateRegistrationForm({ name, email, password, confirmPassword })
    if (!validation.isValid) {
      toast.error(validation.message || t('auth.formInvalid'))
      return
    }
    setLoading(true)
    try {
      await register(name, email, password)
      toast.success(t('auth.register.success'), 8000)
      router.push('/login')
    } catch (error: any) {
      toast.error(error.message || t('auth.register.fallbackError'))
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

      <div className="w-full max-w-sm fade-in my-auto">
        <div className="flex flex-col items-center mb-6">
          <FinanceHeroIllustration className="w-64 h-44 mb-1" />
          <h1 className="text-2xl font-bold text-content">{t('auth.register.title')}</h1>
          <p className="text-sm text-muted mt-1">{t('auth.register.subtitle')}</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="label">{t('common.name')}</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => { setName(e.target.value); validateName(e.target.value) }}
                className={`input ${errors.name ? 'input-error' : ''}`}
                placeholder={t('auth.namePlaceholder')}
                required
              />
              {errors.name && <p className="mt-1.5 text-sm text-negative">{errors.name}</p>}
            </div>

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
                onChange={(e) => {
                  setPassword(e.target.value)
                  validatePassword(e.target.value)
                  if (confirmPassword) validateConfirmPassword(confirmPassword)
                }}
                className={`input ${errors.password ? 'input-error' : ''}`}
                placeholder={t('auth.passwordMinPlaceholder')}
                required
              />
              {errors.password && <p className="mt-1.5 text-sm text-negative">{errors.password}</p>}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="label">{t('auth.confirmPassword')}</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); validateConfirmPassword(e.target.value) }}
                className={`input ${errors.confirmPassword ? 'input-error' : ''}`}
                placeholder={t('auth.confirmPasswordPlaceholder')}
                required
              />
              {errors.confirmPassword && <p className="mt-1.5 text-sm text-negative">{errors.confirmPassword}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary w-full">
              {loading ? t('auth.register.loading') : t('auth.register.button')}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 border-t border-line" />
            <span className="text-xs text-muted">{t('auth.or')}</span>
            <div className="flex-1 border-t border-line" />
          </div>

          <button type="button" onClick={handleGoogleLogin} disabled={loading} className="btn btn-secondary w-full">
            <GoogleIcon />
            {t('auth.register.google')}
          </button>
        </div>

        <p className="text-center text-sm text-muted mt-6">
          {t('auth.register.haveAccount')}{' '}
          <Link href="/login" className="text-accent font-medium">{t('auth.register.loginLink')}</Link>
        </p>
      </div>
    </div>
  )
}
