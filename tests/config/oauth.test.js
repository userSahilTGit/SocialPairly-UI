import { describe, it, expect } from 'vitest'
import {
  APPLE_CLIENT_ID,
  CUSTOMER_CARE_EMAIL,
  DEFAULT_DEV_PORT,
  DEPLOY_IP_ORIGIN,
  GOOGLE_CLIENT_ID,
  GOOGLE_JS_ORIGINS,
  SITE_ORIGIN,
  appleRedirectUri,
  isSupportedGoogleOrigin,
} from '@/config/oauth'
import { FRONTEND_PORT, frontendOrigin } from '@/config/ports'

describe('oauth config', () => {
  it('points customer care and production site at SocialPairly domain', () => {
    expect(CUSTOMER_CARE_EMAIL).toBe('customercare@socialpairly.com')
    expect(SITE_ORIGIN).toBe('https://www.socialpairly.com')
    expect(DEPLOY_IP_ORIGIN).toBe('http://3.151.77.90')
    expect(DEFAULT_DEV_PORT).toBe(FRONTEND_PORT)
    expect(GOOGLE_CLIENT_ID).toContain('apps.googleusercontent.com')
    expect(APPLE_CLIENT_ID).toBe('com.socialpairly.web')
    expect(GOOGLE_JS_ORIGINS).toContain(frontendOrigin('localhost'))
    expect(GOOGLE_JS_ORIGINS).toContain(frontendOrigin('127.0.0.1'))
    expect(GOOGLE_JS_ORIGINS).toContain(DEPLOY_IP_ORIGIN)
    expect(GOOGLE_JS_ORIGINS).toContain('https://www.socialpairly.com')
  })

  it('builds Apple redirect URI for current origin or production fallback', () => {
    const uri = appleRedirectUri()
    expect(uri.endsWith('/signin')).toBe(true)
    expect(uri.includes('socialpairly.com') || uri.includes('localhost') || uri.includes('127.0.0.1')).toBe(true)
  })

  it('recognizes IP and domain origins for Google Sign-In', () => {
    expect(isSupportedGoogleOrigin('http://3.151.77.90')).toBe(true)
    expect(isSupportedGoogleOrigin('https://www.socialpairly.com')).toBe(true)
    expect(isSupportedGoogleOrigin(`http://localhost:${FRONTEND_PORT}`)).toBe(true)
    expect(isSupportedGoogleOrigin('http://127.0.0.1:3000')).toBe(true)
    expect(isSupportedGoogleOrigin('http://evil.example')).toBe(false)
  })
})
