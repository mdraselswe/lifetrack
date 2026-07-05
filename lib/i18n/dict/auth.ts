import type { Dict } from './types'

export const auth: Dict = {
  // ---- Login page ----
  'auth.login.title': { bn: 'লগইন করুন', en: 'Log in' },
  'auth.login.subtitle': { bn: 'আপনার অ্যাকাউন্টে প্রবেশ করুন', en: 'Sign in to your account' },
  'auth.email': { bn: 'ইমেইল', en: 'Email' },
  'auth.emailPlaceholder': { bn: 'আপনার ইমেইল দিন', en: 'Enter your email' },
  'auth.password': { bn: 'পাসওয়ার্ড', en: 'Password' },
  'auth.passwordPlaceholder': { bn: 'আপনার পাসওয়ার্ড দিন', en: 'Enter your password' },
  'auth.login.loading': { bn: 'লগইন হচ্ছে...', en: 'Logging in...' },
  'auth.login.button': { bn: 'লগইন করুন', en: 'Log in' },
  'auth.or': { bn: 'অথবা', en: 'or' },
  'auth.login.google': { bn: 'গুগল দিয়ে লগইন করুন', en: 'Log in with Google' },
  'auth.login.noAccount': { bn: 'অ্যাকাউন্ট নেই?', en: "Don't have an account?" },
  'auth.login.registerLink': { bn: 'রেজিস্ট্রেশন করুন', en: 'Register' },
  'auth.login.success': { bn: 'সফলভাবে লগইন হয়েছে', en: 'Logged in successfully' },
  'auth.invalidEmailInput': { bn: 'সঠিক ইমেইল ঠিকানা দিন', en: 'Enter a valid email address' },
  'auth.formInvalid': { bn: 'ফর্ম ভুলভাবে পূরণ হয়েছে', en: 'The form was filled out incorrectly' },

  // ---- Register page ----
  'auth.register.title': { bn: 'রেজিস্ট্রেশন করুন', en: 'Register' },
  'auth.register.subtitle': { bn: 'নতুন অ্যাকাউন্ট তৈরি করুন', en: 'Create a new account' },
  'auth.namePlaceholder': { bn: 'আপনার নাম দিন', en: 'Enter your name' },
  'auth.passwordMinPlaceholder': { bn: 'কমপক্ষে ৬ অক্ষর', en: 'At least 6 characters' },
  'auth.confirmPassword': { bn: 'পাসওয়ার্ড নিশ্চিত করুন', en: 'Confirm password' },
  'auth.confirmPasswordPlaceholder': { bn: 'পাসওয়ার্ড আবার দিন', en: 'Re-enter your password' },
  'auth.passwordMismatch': { bn: 'পাসওয়ার্ড মিলছে না', en: 'Passwords do not match' },
  'auth.register.loading': { bn: 'রেজিস্ট্রেশন হচ্ছে...', en: 'Registering...' },
  'auth.register.button': { bn: 'রেজিস্ট্রেশন করুন', en: 'Register' },
  'auth.register.google': { bn: 'গুগল দিয়ে চালিয়ে যান', en: 'Continue with Google' },
  'auth.register.haveAccount': { bn: 'ইতিমধ্যে অ্যাকাউন্ট আছে?', en: 'Already have an account?' },
  'auth.register.loginLink': { bn: 'লগইন করুন', en: 'Log in' },
  'auth.register.success': {
    bn: 'রেজিস্ট্রেশন সফল! আপনার ইমেইলে পাঠানো ভেরিফিকেশন লিংকে ক্লিক করে অ্যাকাউন্ট যাচাই করুন, তারপর লগইন করুন।',
    en: 'Registration successful! Click the verification link sent to your email to verify your account, then log in.',
  },
  'auth.register.fallbackError': {
    bn: 'এই ইমেইল দিয়ে ইতিমধ্যে রেজিস্ট্রেশন হয়েছে',
    en: 'An account with this email already exists',
  },

  // ---- Auth errors (firebase-auth.tsx) ----
  'auth.error.login': { bn: 'লগইন করতে সমস্যা হয়েছে', en: 'Failed to log in' },
  'auth.error.invalidCredential': { bn: 'ইমেইল বা পাসওয়ার্ড ভুল', en: 'Incorrect email or password' },
  'auth.error.userNotFound': { bn: 'এই ইমেইলে কোনো অ্যাকাউন্ট নেই', en: 'No account exists with this email' },
  'auth.error.wrongPassword': { bn: 'পাসওয়ার্ড ভুল', en: 'Incorrect password' },
  'auth.error.invalidEmail': { bn: 'ভুল ইমেইল ফরম্যাট', en: 'Invalid email format' },
  'auth.error.userDisabled': { bn: 'এই অ্যাকাউন্ট নিষ্ক্রিয় করা হয়েছে', en: 'This account has been disabled' },
  'auth.error.tooManyRequests': {
    bn: 'অনেকবার চেষ্টা করা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন',
    en: 'Too many attempts. Please try again later',
  },
  'auth.error.network': {
    bn: 'নেটওয়ার্ক সমস্যা। ইন্টারনেট সংযোগ চেক করুন',
    en: 'Network problem. Check your internet connection',
  },
  'auth.error.emailNotVerified': {
    bn: 'আপনার ইমেইল এখনো যাচাই করা হয়নি। ইনবক্সে পাঠানো ভেরিফিকেশন লিংকে ক্লিক করে তারপর লগইন করুন।',
    en: 'Your email has not been verified yet. Click the verification link sent to your inbox, then log in.',
  },
  'auth.error.register': { bn: 'রেজিস্ট্রেশন করতে সমস্যা হয়েছে', en: 'Failed to register' },
  'auth.error.emailInUse': { bn: 'এই ইমেইল ইতিমধ্যে ব্যবহার করা হয়েছে', en: 'This email is already in use' },
  'auth.error.weakPassword': {
    bn: 'পাসওয়ার্ড খুব দুর্বল। কমপক্ষে ৬ অক্ষর দিন',
    en: 'Password is too weak. Use at least 6 characters',
  },
  'auth.error.registrationDisabled': { bn: 'রেজিস্ট্রেশন এখন অনুমোদিত নয়', en: 'Registration is not allowed right now' },
  'auth.error.google': { bn: 'গুগল দিয়ে লগইন করতে সমস্যা হয়েছে', en: 'Failed to log in with Google' },
  'auth.error.popupClosed': { bn: 'লগইন উইন্ডো বন্ধ করা হয়েছে', en: 'The login window was closed' },
  'auth.error.cancelledPopup': { bn: 'আগের লগইন চেষ্টা এখনো চলছে', en: 'A previous login attempt is still in progress' },
  'auth.error.popupBlocked': {
    bn: 'পপআপ ব্লক করা হয়েছে। ব্রাউজার সেটিংস থেকে অনুমতি দিন',
    en: 'Popup was blocked. Allow popups in your browser settings',
  },
  'auth.error.accountExists': {
    bn: 'এই ইমেইল অন্য পদ্ধতিতে নিবন্ধিত আছে',
    en: 'This email is registered with a different sign-in method',
  },
  'auth.error.googleDisabled': { bn: 'গুগল লগইন এখনো চালু করা হয়নি', en: 'Google login is not enabled yet' },
  'auth.error.unauthorizedDomain': {
    bn: 'এই ডোমেইনটি Firebase-এ অনুমোদিত নয়। Authorized domains-এ যোগ করুন',
    en: 'This domain is not authorized in Firebase. Add it to Authorized domains',
  },
  'auth.error.logout': { bn: 'লগআউট করতে সমস্যা হয়েছে', en: 'Failed to log out' },

  // ---- Confirm dialog action labels (lib/confirm.ts) ----
  // Defaults (হ্যাঁ/না) reuse common.yes / common.no; মুছুন/বাতিল reuse
  // common.delete / common.cancel. Only the action verbs unique to the
  // confirm helpers live here.
  'confirm.update': { bn: 'আপডেট করুন', en: 'Update' },
  'confirm.edit': { bn: 'সম্পাদনা করুন', en: 'Edit' },

  // ---- PWA install prompt (components/PWARegistration.tsx) ----
  'pwa.installTitle': { bn: 'LifeTrack Install করুন', en: 'Install LifeTrack' },
  'pwa.installDescription': {
    bn: 'App home screen-এ add করুন দ্রুত access-এর জন্য',
    en: 'Add the app to your home screen for quick access',
  },
  'pwa.installButton': { bn: 'Install করুন', en: 'Install' },
  'pwa.later': { bn: 'পরে', en: 'Later' },
  'pwa.manualHint': {
    bn: 'Desktop/Mobile menu থেকে "Install" বা "Add to Home Screen" option ব্যবহার করুন',
    en: 'Use the "Install" or "Add to Home Screen" option from your desktop/mobile browser menu',
  },
  'pwa.installSuccess': { bn: 'PWA সফলভাবে install হয়েছে!', en: 'PWA installed successfully!' },
  'pwa.installCancelled': { bn: 'Install cancelled', en: 'Install cancelled' },
  'pwa.installError': { bn: 'Install করতে সমস্যা হয়েছে', en: 'Failed to install' },
  'pwa.manualInstructionsTitle': { bn: 'Manual install instructions', en: 'Manual install instructions' },
  'pwa.manualDesktop': { bn: 'Address bar-এ install icon', en: 'Install icon in the address bar' },
}
