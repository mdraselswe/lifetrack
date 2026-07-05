'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  User
} from 'firebase/auth'
import { auth } from './firebase-app'
import { t } from '@/lib/i18n'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  resetPassword: (email: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      // Treat unverified accounts as logged-out for the whole app, so a
      // persisted unverified session can't hit Firestore and get
      // permission-denied. They must verify their email, then log in.
      if (firebaseUser && !firebaseUser.emailVerified) {
        setUser(null)
      } else {
        setUser(firebaseUser)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const login = async (email: string, password: string) => {
    let credential
    try {
      credential = await signInWithEmailAndPassword(auth, email, password)
    } catch (error: any) {
      // Suppress Firebase console error by not logging it
      // Handle specific Firebase auth errors
      let errorMessage = t('auth.error.login')

      switch (error.code) {
        case 'auth/invalid-credential':
          errorMessage = t('auth.error.invalidCredential')
          break
        case 'auth/user-not-found':
          errorMessage = t('auth.error.userNotFound')
          break
        case 'auth/wrong-password':
          errorMessage = t('auth.error.wrongPassword')
          break
        case 'auth/invalid-email':
          errorMessage = t('auth.error.invalidEmail')
          break
        case 'auth/user-disabled':
          errorMessage = t('auth.error.userDisabled')
          break
        case 'auth/too-many-requests':
          errorMessage = t('auth.error.tooManyRequests')
          break
        case 'auth/network-request-failed':
          errorMessage = t('auth.error.network')
          break
        default:
          errorMessage = t('auth.error.login')
      }
      
      // Create a new error without the original Firebase error details
      const userError = new Error(errorMessage)
      userError.name = 'UserError'
      throw userError
    }

    // Block sign-in until the email address is verified. This is what
    // enforces "real email only" — fake addresses can never confirm.
    if (!credential.user.emailVerified) {
      try {
        await sendEmailVerification(credential.user)
      } catch {
        // ignore resend failures (e.g. rate limit); user already has a link
      }
      await signOut(auth)
      const verifyError = new Error(t('auth.error.emailNotVerified'))
      verifyError.name = 'UserError'
      throw verifyError
    }
  }

  const register = async (name: string, email: string, password: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)

      // Send a verification email, then sign out so the account cannot be
      // used until the address is confirmed. Guarantees a real, reachable email.
      await sendEmailVerification(userCredential.user)
      await signOut(auth)

    } catch (error: any) {
      // Suppress Firebase console error by not logging it
      // Handle specific Firebase auth errors
      let errorMessage = t('auth.error.register')

      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = t('auth.error.emailInUse')
          break
        case 'auth/invalid-email':
          errorMessage = t('auth.error.invalidEmail')
          break
        case 'auth/weak-password':
          errorMessage = t('auth.error.weakPassword')
          break
        case 'auth/operation-not-allowed':
          errorMessage = t('auth.error.registrationDisabled')
          break
        case 'auth/network-request-failed':
          errorMessage = t('auth.error.network')
          break
        default:
          errorMessage = t('auth.error.register')
      }
      
      // Create a new error without the original Firebase error details
      const userError = new Error(errorMessage)
      userError.name = 'UserError'
      throw userError
    }
  }

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email)
    } catch (error: any) {
      let errorMessage = t('auth.error.reset')

      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = t('auth.error.userNotFound')
          break
        case 'auth/invalid-email':
          errorMessage = t('auth.error.invalidEmail')
          break
        case 'auth/too-many-requests':
          errorMessage = t('auth.error.tooManyRequests')
          break
        case 'auth/network-request-failed':
          errorMessage = t('auth.error.network')
          break
        default:
          errorMessage = t('auth.error.reset')
      }

      const userError = new Error(errorMessage)
      userError.name = 'UserError'
      throw userError
    }
  }

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
      // Google accounts always come with a verified, real email, so no
      // extra verification step is needed here.
    } catch (error: any) {
      let errorMessage = t('auth.error.google')

      switch (error.code) {
        case 'auth/popup-closed-by-user':
          errorMessage = t('auth.error.popupClosed')
          break
        case 'auth/cancelled-popup-request':
          errorMessage = t('auth.error.cancelledPopup')
          break
        case 'auth/popup-blocked':
          errorMessage = t('auth.error.popupBlocked')
          break
        case 'auth/account-exists-with-different-credential':
          errorMessage = t('auth.error.accountExists')
          break
        case 'auth/network-request-failed':
          errorMessage = t('auth.error.network')
          break
        case 'auth/operation-not-allowed':
          errorMessage = t('auth.error.googleDisabled')
          break
        case 'auth/unauthorized-domain':
          errorMessage = t('auth.error.unauthorizedDomain')
          break
        default:
          errorMessage = t('auth.error.google')
      }

      const userError = new Error(errorMessage)
      userError.name = 'UserError'
      throw userError
    }
  }

  const logout = async () => {
    try {
      await signOut(auth)
    } catch (error: any) {
      throw new Error(t('auth.error.logout'))
    }
  }

  const value = {
    user,
    loading,
    login,
    loginWithGoogle,
    register,
    resetPassword,
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
