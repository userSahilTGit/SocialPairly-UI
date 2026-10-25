/**
 * OAuth client settings.
 *
 * IMPORTANT — Google Cloud does NOT allow wildcard ports on Authorized JavaScript
 * origins. Each origin (scheme + host + port) must be listed exactly.
 *
 * Local origin comes from FRONTEND_PORT in ./ports.js. After you change that port,
 * add http://localhost:<port> and http://127.0.0.1:<port> in Google Cloud Console.
 *
 * After pulling this build to EC2 (http://3.151.77.90) or the domain, Google Sign-In
 * works only if GCP includes the origins below AND nginx serves the SPA + proxies /api
 * (see deploy/nginx.conf).
 *
 * Authorized JavaScript origins (Web client) — keep ALL that you use:
 *   http://localhost:<FRONTEND_PORT>
 *   http://127.0.0.1:<FRONTEND_PORT>
 *   http://3.151.77.90
 *   http://3.151.77.90.nip.io
 *   https://www.socialpairly.com
 *   https://socialpairly.com
 *
 * Authorized redirect URIs: the same hosts with /signin.
 *
 * Apple Developer — Services ID return URLs / domains must include:
 *   https://www.socialpairly.com/signin
 *   https://socialpairly.com/signin
 *   http://3.151.77.90/signin
 *   http://localhost:<FRONTEND_PORT>/signin
 */

import { FRONTEND_PORT, frontendOrigin } from './ports.js'

export const SITE_ORIGIN = 'https://www.socialpairly.com'

/** EC2 host used for direct IP access (must match GCP JS origin). */
export const DEPLOY_IP_ORIGIN = 'http://3.151.77.90'

/** Default local Vite port — keep this in GCP Authorized JavaScript origins. */
export const DEFAULT_DEV_PORT = FRONTEND_PORT

export const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID
  || '1043168194153-i82qfvqg1jsk804qaa7ipkkov67b8pt4.apps.googleusercontent.com'

export const APPLE_CLIENT_ID =
  import.meta.env.VITE_APPLE_CLIENT_ID || 'com.socialpairly.web'

/** Origins where Google Sign-In is expected to work once listed in GCP. */
export const GOOGLE_JS_ORIGINS = [
  frontendOrigin('localhost'),
  frontendOrigin('127.0.0.1'),
  DEPLOY_IP_ORIGIN,
  'http://3.151.77.90.nip.io',
  'https://www.socialpairly.com',
  'https://socialpairly.com',
]

/** Prefer current origin when hosted on domain or IP; fall back to production. */
export function appleRedirectUri() {
  if (import.meta.env.VITE_APPLE_REDIRECT_URI) {
    return import.meta.env.VITE_APPLE_REDIRECT_URI
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin
    if (
      origin.includes('socialpairly.com')
      || origin.includes('3.151.77.90')
      || origin.includes('localhost')
      || origin.includes('127.0.0.1')
    ) {
      return `${origin}/signin`
    }
  }
  return `${SITE_ORIGIN}/signin`
}

/**
 * True when the current page origin is one we support for Google (after GCP allow-list).
 * Used for clearer Sign-In errors when opened from an unlisted host/port.
 */
export function isSupportedGoogleOrigin(origin = typeof window !== 'undefined' ? window.location?.origin : '') {
  if (!origin) return false
  if (GOOGLE_JS_ORIGINS.includes(origin)) return true
  try {
    const u = new URL(origin)
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return true
    if (u.hostname === '3.151.77.90' || u.hostname.endsWith('3.151.77.90.nip.io')) return true
    if (u.hostname === 'socialpairly.com' || u.hostname.endsWith('.socialpairly.com')) return true
  } catch {
    return false
  }
  return false
}

export const CUSTOMER_CARE_EMAIL = 'customercare@socialpairly.com'
