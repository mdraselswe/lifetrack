'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/firebase-auth'
import { toast } from '@/lib/toast'
import Link from 'next/link'
import { validateLoginForm, isValidEmail } from '@/lib/validation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{[key: string]: string}>({})
  const { login } = useAuth()
  const router = useRouter()

  // Real-time validation function
  const validateEmail = (value: string) => {
    setErrors(prev => ({
      ...prev,
      email: isValidEmail(value) ? '' : 'সঠিক ইমেইল ঠিকানা দিন'
    }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    // Validate form using utility function
    const validation = validateLoginForm({
      email,
      password
    })

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
    <div className="min-h-screen full-vh bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4 safe-area-top safe-area-bottom safe-area-left safe-area-right">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl font-bold">💰</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">লগইন করুন</h1>
            <p className="text-gray-600">আপনার অ্যাকাউন্টে প্রবেশ করুন</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                ইমেইল
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  validateEmail(e.target.value)
                }}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="আপনার ইমেইল দিন"
                required
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                পাসওয়ার্ড
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="আপনার পাসওয়ার্ড দিন"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-4 rounded-xl font-medium hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'লগইন হচ্ছে...' : 'লগইন করুন'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-gray-600">
              অ্যাকাউন্ট নেই?{' '}
              <Link href="/register" className="text-blue-600 hover:text-blue-700 font-medium">
                রেজিস্ট্রেশন করুন
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
