import { RecaptchaVerifier } from 'firebase/auth'
import { auth } from '../config/firebase'

const HIDDEN_CONTAINER_ID = 'sp-firebase-recaptcha-host'

export function firebasePhoneErrorMessage(err) {
  const code = err?.code || ''
  const raw = err?.message || ''

  if (code === 'auth/operation-not-allowed' || /operation is not allowed/i.test(raw)) {
    return (
      'Phone SMS is blocked in Firebase. Enable Phone under Authentication → Sign-in method, '
      + 'allow India (+91) under Authentication → Settings → SMS region policy, '
      + 'and use the Blaze plan (or a Firebase test phone number).'
    )
  }
  if (code === 'auth/invalid-phone-number') return 'Invalid phone number format.'
  if (code === 'auth/too-many-requests') return 'Too many SMS attempts. Wait and try again.'
  if (code === 'auth/code-expired') return 'Code expired. Request a new one.'
  if (code === 'auth/invalid-verification-code') return 'Invalid verification code.'
  if (code === 'auth/captcha-check-failed') return 'Security check failed. Refresh and try again.'
  if (code === 'auth/quota-exceeded') return 'SMS quota exceeded for this Firebase project.'
  if (code === 'auth/billing-not-enabled') {
    return 'Firebase Phone Auth requires the Blaze (billing) plan for real SMS.'
  }
  return raw || 'Phone verification failed'
}

function ensureHiddenHost() {
  let host = document.getElementById(HIDDEN_CONTAINER_ID)
  if (!host) {
    host = document.createElement('div')
    host.id = HIDDEN_CONTAINER_ID
    // Keep off-screen so users never see a captcha checkbox
    host.setAttribute('aria-hidden', 'true')
    Object.assign(host.style, {
      position: 'fixed',
      left: '-10000px',
      top: '0',
      width: '1px',
      height: '1px',
      overflow: 'hidden',
      opacity: '0',
      pointerEvents: 'none',
    })
    document.body.appendChild(host)
  }
  return host
}

/**
 * Invisible reCAPTCHA mounted outside React trees so Profile re-renders
 * cannot null out the widget DOM (fixes recaptcha__.style crashes).
 */
export async function getInvisibleRecaptcha(verifierRef) {
  // Reuse existing verifier when possible
  if (verifierRef.current) {
    return verifierRef.current
  }

  const host = ensureHiddenHost()
  host.replaceChildren()

  const verifier = new RecaptchaVerifier(auth, host, {
    size: 'invisible',
    callback: () => {},
    'expired-callback': () => {
      // Force recreate next send
      verifierRef.current = null
    },
  })
  verifierRef.current = verifier
  await verifier.render()
  return verifier
}

export async function resetInvisibleRecaptcha(verifierRef) {
  const verifier = verifierRef.current
  verifierRef.current = null
  if (verifier) {
    try {
      await verifier.clear()
    } catch {
      // ignore dispose races
    }
  }
  const host = document.getElementById(HIDDEN_CONTAINER_ID)
  if (host) host.replaceChildren()
}
