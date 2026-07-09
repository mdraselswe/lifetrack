import { initializeApp, getApps } from 'firebase/app'
import {
  initializeAuth,
  getAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  type Auth,
} from 'firebase/auth'

// App + Auth only — deliberately NO firestore import. Everything in the root
// layout graph (AuthProvider, Navigation, ProfileMenu…) pulls from here, so
// the heavy firestore bundle stays out of the shared chunk and off the
// login/register pages entirely. Data pages import db from ./firebase.

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  // authDomain is the app's OWN origin (not the *.firebaseapp.com default) so
  // the OAuth handler runs same-origin — otherwise browsers that partition
  // third-party storage (Android Chrome, iOS PWA) drop the sign-in result.
  // next.config.js reverse-proxies /__/auth/* to the real Firebase handler.
  authDomain: 'lifetrack-site.vercel.app',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

export const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)

// Initialize Auth WITHOUT a popupRedirectResolver. The default getAuth() wires
// up the resolver eagerly, which loads the gapi iframe (apis.google.com/js/api.js)
// on every page load — that script hurt LCP/TBT and tripped the CSP. Google
// sign-in still works because signInWithPopup is passed the resolver explicitly
// (see firebase-auth.tsx), so gapi only loads on the button click, not on mount.
// Persistence array mirrors the default (IndexedDB, falling back to localStorage)
// so existing sessions stay logged in. getAuth() fallback guards double-init (HMR).
let _auth: Auth
try {
  _auth = initializeAuth(app, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence],
  })
} catch {
  _auth = getAuth(app)
}
export const auth = _auth
