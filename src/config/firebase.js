import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyAw9GCf__76jxS-w63aLTRBE0m2-i2WRZo',
  authDomain: 'sp99-c54b0.firebaseapp.com',
  projectId: 'sp99-c54b0',
  storageBucket: 'sp99-c54b0.firebasestorage.app',
  messagingSenderId: '1060265942117',
  appId: '1:1060265942117:web:788b092ac06b2a66a0fa8c',
  measurementId: 'G-XLBFBTBC9S',
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)

/**
 * Firebase web Phone Auth always needs abuse protection.
 * For Console "Phone numbers for testing" only, you can disable the visible captcha UX:
 *   VITE_FIREBASE_PHONE_TEST_MODE=true
 * Real carrier SMS still requires an invisible reCAPTCHA under the hood (Firebase rule).
 */
if (import.meta.env.VITE_FIREBASE_PHONE_TEST_MODE === 'true') {
  auth.settings.appVerificationDisabledForTesting = true
}
