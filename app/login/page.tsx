'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/firebase-auth'
import { toast } from '@/lib/toast'
import Link from 'next/link'
import { validateLoginForm, isValidEmail } from '@/lib/validation'
import { GoogleIcon, WalletIcon } from '@/components/Icons'
import ThemeToggle from '@/components/ThemeToggle'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const { login, loginWithGoogle } = useAuth()
  const router = useRouter()

  const validateEmail = (value: string) => {
    setErrors(prev => ({ ...prev, email: isValidEmail(value) ? '' : 'সঠিক ইমেইল ঠিকানা দিন' }))
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      await loginWithGoogle()
      toast.success('সফলভাবে লগইন হয়েছে')
      router.push('/')
    } catch (error: any) {
      toast.error(error.message || 'গুগল দিয়ে লগইন করতে সমস্যা হয়েছে')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const validation = validateLoginForm({ email, password })
    if (!validation.isValid) {
      toast.error(validation.message || 'ফর্ম ভুলভাবে পূরণ হয়েছে')
      return
    }
    setLoading(true)
    try {
      await login(email, password)
      toast.success('সফলভাবে লগইন হয়েছে')
      router.push('/')
    } catch (error: any) {
      toast.error(error.message || 'ইমেইল বা পাসওয়ার্ড ভুল')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen full-vh flex flex-col items-center justify-center p-4 safe-area-top safe-area-bottom">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm fade-in">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-accent text-accent-fg flex items-center justify-center mb-4 shadow-pop">
            <WalletIcon className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-content">লগইন করুন</h1>
          <p className="text-sm text-muted mt-1">আপনার অ্যাকাউন্টে প্রবেশ করুন</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="label">ইমেইল</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); validateEmail(e.target.value) }}
                className={`input ${errors.email ? 'input-error' : ''}`}
                placeholder="আপনার ইমেইল দিন"
                required
              />
              {errors.email && <p className="mt-1.5 text-sm text-negative">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="password" className="label">পাসওয়ার্ড</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="আপনার পাসওয়ার্ড দিন"
                required
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary w-full">
              {loading ? 'লগইন হচ্ছে...' : 'লগইন করুন'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 border-t border-line" />
            <span className="text-xs text-muted">অথবা</span>
            <div className="flex-1 border-t border-line" />
          </div>

          <button type="button" onClick={handleGoogleLogin} disabled={loading} className="btn btn-secondary w-full">
            <GoogleIcon />
            গুগল দিয়ে লগইন করুন
          </button>
        </div>

        <p className="text-center text-sm text-muted mt-6">
          অ্যাকাউন্ট নেই?{' '}
          <Link href="/register" className="text-accent font-medium">রেজিস্ট্রেশন করুন</Link>
        </p>
      </div>
    </div>
  )
}
