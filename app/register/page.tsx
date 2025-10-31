'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/firebase-auth'
import { toast } from '@/lib/toast'
import Link from 'next/link'
import { validateRegistrationForm, isValidEmail, isValidName, isValidPassword } from '@/lib/validation'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{[key: string]: string}>({})
  const { register } = useAuth()
  const router = useRouter()

  // Real-time validation functions
  const validateName = (value: string) => {
    const validation = isValidName(value)
    setErrors(prev => ({
      ...prev,
      name: validation.isValid ? '' : (validation.message || '')
    }))
  }

  const validateEmail = (value: string) => {
    setErrors(prev => ({
      ...prev,
      email: isValidEmail(value) ? '' : 'সঠিক ইমেইল ঠিকানা দিন'
    }))
  }

  const validatePassword = (value: string) => {
    const validation = isValidPassword(value)
    setErrors(prev => ({
      ...prev,
      password: validation.isValid ? '' : (validation.message || '')
    }))
  }

  const validateConfirmPassword = (value: string) => {
    setErrors(prev => ({
      ...prev,
      confirmPassword: value === password ? '' : 'পাসওয়ার্ড মিলছে না'
    }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    // Validate form using utility function
    const validation = validateRegistrationForm({
      name,
      email,
      password,
      confirmPassword
    })

    if (!validation.isValid) {
      toast.error(validation.message || 'ফর্ম ভুলভাবে পূরণ হয়েছে')
      return
    }

    setLoading(true)
    
    try {
      await register(name, email, password)
      toast.success('সফলভাবে রেজিস্ট্রেশন হয়েছে')
      router.push('/')
    } catch (error: any) {
      toast.error(error.message || 'এই ইমেইল দিয়ে ইতিমধ্যে রেজিস্ট্রেশন হয়েছে')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl font-bold">💰</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">রেজিস্ট্রেশন করুন</h1>
            <p className="text-gray-600">নতুন অ্যাকাউন্ট তৈরি করুন</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                নাম
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  validateName(e.target.value)
                }}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 ${
                  errors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="আপনার নাম দিন"
                required
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

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
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 ${
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
                onChange={(e) => {
                  setPassword(e.target.value)
                  validatePassword(e.target.value)
                  // Re-validate confirm password when password changes
                  if (confirmPassword) {
                    validateConfirmPassword(confirmPassword)
                  }
                }}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 ${
                  errors.password ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="পাসওয়ার্ড দিন (কমপক্ষে ৬ অক্ষর)"
                required
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                পাসওয়ার্ড নিশ্চিত করুন
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  validateConfirmPassword(e.target.value)
                }}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 ${
                  errors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="পাসওয়ার্ড আবার দিন"
                required
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-4 rounded-xl font-medium hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'রেজিস্ট্রেশন হচ্ছে...' : 'রেজিস্ট্রেশন করুন'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-gray-600">
              ইতিমধ্যে অ্যাকাউন্ট আছে?{' '}
              <Link href="/login" className="text-green-600 hover:text-green-700 font-medium">
                লগইন করুন
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
