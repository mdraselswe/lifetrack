'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User 
} from 'firebase/auth'
import { auth } from './firebase'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (error: any) {
      // Suppress Firebase console error by not logging it
      // Handle specific Firebase auth errors
      let errorMessage = 'লগইন করতে সমস্যা হয়েছে'
      
      switch (error.code) {
        case 'auth/invalid-credential':
          errorMessage = 'ইমেইল বা পাসওয়ার্ড ভুল'
          break
        case 'auth/user-not-found':
          errorMessage = 'এই ইমেইলে কোনো অ্যাকাউন্ট নেই'
          break
        case 'auth/wrong-password':
          errorMessage = 'পাসওয়ার্ড ভুল'
          break
        case 'auth/invalid-email':
          errorMessage = 'ভুল ইমেইল ফরম্যাট'
          break
        case 'auth/user-disabled':
          errorMessage = 'এই অ্যাকাউন্ট নিষ্ক্রিয় করা হয়েছে'
          break
        case 'auth/too-many-requests':
          errorMessage = 'অনেকবার চেষ্টা করা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন'
          break
        case 'auth/network-request-failed':
          errorMessage = 'নেটওয়ার্ক সমস্যা। ইন্টারনেট সংযোগ চেক করুন'
          break
        default:
          errorMessage = 'লগইন করতে সমস্যা হয়েছে'
      }
      
      // Create a new error without the original Firebase error details
      const userError = new Error(errorMessage)
      userError.name = 'UserError'
      throw userError
    }
  }

  const register = async (name: string, email: string, password: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      
      // You can add user profile data here if needed
      // await updateProfile(userCredential.user, { displayName: name })
      
    } catch (error: any) {
      // Suppress Firebase console error by not logging it
      // Handle specific Firebase auth errors
      let errorMessage = 'রেজিস্ট্রেশন করতে সমস্যা হয়েছে'
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'এই ইমেইল ইতিমধ্যে ব্যবহার করা হয়েছে'
          break
        case 'auth/invalid-email':
          errorMessage = 'ভুল ইমেইল ফরম্যাট'
          break
        case 'auth/weak-password':
          errorMessage = 'পাসওয়ার্ড খুব দুর্বল। কমপক্ষে ৬ অক্ষর দিন'
          break
        case 'auth/operation-not-allowed':
          errorMessage = 'রেজিস্ট্রেশন এখন অনুমোদিত নয়'
          break
        case 'auth/network-request-failed':
          errorMessage = 'নেটওয়ার্ক সমস্যা। ইন্টারনেট সংযোগ চেক করুন'
          break
        default:
          errorMessage = 'রেজিস্ট্রেশন করতে সমস্যা হয়েছে'
      }
      
      // Create a new error without the original Firebase error details
      const userError = new Error(errorMessage)
      userError.name = 'UserError'
      throw userError
    }
  }

  const logout = async () => {
    try {
      await signOut(auth)
    } catch (error: any) {
      throw new Error('লগআউট করতে সমস্যা হয়েছে')
    }
  }

  const value = {
    user,
    loading,
    login,
    register,
    logout
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
