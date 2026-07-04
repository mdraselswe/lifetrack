'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/firebase-auth'
import { toast } from '@/lib/toast'
import Link from 'next/link'
import { validateRegistrationForm, isValidEmail, isValidName, isValidPassword } from '@/lib/validation'
import { GoogleIcon, WalletIcon } from '@/components/Icons'
import ThemeToggle from '@/components/ThemeToggle'

export default function RegisterPage() {
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
    setErrors(prev => ({ ...prev, email: isValidEmail(value) ? '' : 'সঠিক ইমেইল ঠিকানা দিন' }))
  }
  const validatePassword = (value: string) => {
    const v = isValidPassword(value)
    setErrors(prev => ({ ...prev, password: v.isValid ? '' : (v.message || '') }))
  }
  const validateConfirmPassword = (value: string) => {
    setErrors(prev => ({ ...prev, confirmPassword: value === password ? '' : 'পাসওয়ার্ড মিলছে না' }))
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
    const validation = validateRegistrationForm({ name, email, password, confirmPassword })
    if (!validation.isValid) {
      toast.error(validation.message || 'ফর্ম ভুলভাবে পূরণ হয়েছে')
      return
    }
    setLoading(true)
    try {
      await register(name, email, password)
      toast.success('রেজিস্ট্রেশন সফল! আপনার ইমেইলে পাঠানো ভেরিফিকেশন লিংকে ক্লিক করে অ্যাকাউন্ট যাচাই করুন, তারপর লগইন করুন।', 8000)
      router.push('/login')
    } catch (error: any) {
      toast.error(error.message || 'এই ইমেইল দিয়ে ইতিমধ্যে রেজিস্ট্রেশন হয়েছে')
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
          <h1 className="text-2xl font-bold text-content">রেজিস্ট্রেশন করুন</h1>
          <p className="text-sm text-muted mt-1">নতুন অ্যাকাউন্ট তৈরি করুন</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="label">নাম</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => { setName(e.target.value); validateName(e.target.value) }}
                className={`input ${errors.name ? 'input-error' : ''}`}
                placeholder="আপনার নাম দিন"
                required
              />
              {errors.name && <p className="mt-1.5 text-sm text-negative">{errors.name}</p>}
            </div>

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
                onChange={(e) => {
                  setPassword(e.target.value)
                  validatePassword(e.target.value)
                  if (confirmPassword) validateConfirmPassword(confirmPassword)
                }}
                className={`input ${errors.password ? 'input-error' : ''}`}
                placeholder="কমপক্ষে ৬ অক্ষর"
                required
              />
              {errors.password && <p className="mt-1.5 text-sm text-negative">{errors.password}</p>}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="label">পাসওয়ার্ড নিশ্চিত করুন</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); validateConfirmPassword(e.target.value) }}
                className={`input ${errors.confirmPassword ? 'input-error' : ''}`}
                placeholder="পাসওয়ার্ড আবার দিন"
                required
              />
              {errors.confirmPassword && <p className="mt-1.5 text-sm text-negative">{errors.confirmPassword}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary w-full">
              {loading ? 'রেজিস্ট্রেশন হচ্ছে...' : 'রেজিস্ট্রেশন করুন'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 border-t border-line" />
            <span className="text-xs text-muted">অথবা</span>
            <div className="flex-1 border-t border-line" />
          </div>

          <button type="button" onClick={handleGoogleLogin} disabled={loading} className="btn btn-secondary w-full">
            <GoogleIcon />
            গুগল দিয়ে চালিয়ে যান
          </button>
        </div>

        <p className="text-center text-sm text-muted mt-6">
          ইতিমধ্যে অ্যাকাউন্ট আছে?{' '}
          <Link href="/login" className="text-accent font-medium">লগইন করুন</Link>
        </p>
      </div>
    </div>
  )
}
