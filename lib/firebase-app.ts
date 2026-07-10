import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'

// App + Auth only — deliberately NO firestore import. Everything in the root
// layout graph (AuthProvider, Navigation, ProfileMenu…) pulls from here, so
// the heavy firestore bundle stays out of the shared chunk and off the
// login/register pages entirely. Data pages import db from ./firebase.

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

export const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
export const auth = getAuth(app)
