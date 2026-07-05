import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'
import { app, auth } from './firebase-app'

// Firestore lives here, split from ./firebase-app so only data-touching code
// bundles it. Persistent multi-tab local cache: instant reads from disk,
// offline writes, sync on reconnect.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})

export { auth }
export default app
