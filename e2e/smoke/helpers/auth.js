import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { expect } from '@playwright/test'
import { SMOKE, uniqueEmail, uniquePhone } from './config.js'
import { assertFeature } from './feature.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const AUTH_DIR = path.join(__dirname, '../.auth')

function readAuthFile(name) {
  const file = path.join(AUTH_DIR, name)
  if (!fs.existsSync(file)) return null
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

/** Module cache so API + UI projects share one admin login per process when possible. */
let cachedAdminAuth = null

export async function apiLogin(request, identifier, password, { retries = 20 } = {}) {
  return assertFeature('Auth API — login', async () => {
    let lastStatus = 0
    let lastBody = ''
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const res = await request.post('/api/auth/login', {
        data: { identifier, password, rememberMe: true },
      })
      lastStatus = res.status()
      lastBody = await res.text()
      if (res.ok()) {
        const body = JSON.parse(lastBody)
        expect(body.token, 'login must return JWT').toBeTruthy()
        expect(body.user, 'login must return user').toBeTruthy()
        return body
      }
      // app.rate-limit.login-max=10 / window 15m — retry until window frees.
      if (lastStatus === 429 && attempt < retries) {
        await sleep(30_000)
        continue
      }
      break
    }
    expect(false, `login status ${lastStatus}: ${lastBody}`).toBeTruthy()
  })
}

export async function apiRegisterMember(request) {
  return assertFeature('Auth API — register member', async () => {
    const email = uniqueEmail('member')
    const password = SMOKE.memberPasswordDefault
    const phoneNumber = uniquePhone()
    const res = await request.post('/api/auth/register', {
      data: {
        firstName: 'Smoke',
        lastName: 'Member',
        middleName: null,
        email,
        phoneNumber,
        password,
        confirmPassword: password,
        address: 'Smoke Test Address',
        is18OrOlder: true,
        termsAccepted: true,
        privacyAccepted: true,
        identityConsent: true,
        marketingConsent: false,
      },
    })
    expect(res.ok(), `register status ${res.status()}: ${await res.text()}`).toBeTruthy()
    const body = await res.json()
    expect(body.token, 'register must return JWT').toBeTruthy()
    return { ...body, email, password, phoneNumber }
  })
}

export async function resolveMemberAuth(request) {
  const fromSetup = readAuthFile('member.json')
  if (fromSetup?.token) {
    return fromSetup
  }
  if (SMOKE.memberEmail && SMOKE.memberPassword) {
    const body = await apiLogin(request, SMOKE.memberEmail, SMOKE.memberPassword)
    return {
      token: body.token,
      user: body.user,
      email: SMOKE.memberEmail,
      password: SMOKE.memberPassword,
    }
  }
  const created = await apiRegisterMember(request)
  return {
    token: created.token,
    user: created.user,
    email: created.email,
    password: created.password,
  }
}

async function persistAdminAuth(auth) {
  cachedAdminAuth = auth
  try {
    fs.mkdirSync(AUTH_DIR, { recursive: true })
    fs.writeFileSync(path.join(AUTH_DIR, 'admin.json'), JSON.stringify(auth))
  } catch {
    // best-effort cache for later projects
  }
  return auth
}

export async function resolveAdminAuth(request) {
  const candidates = [cachedAdminAuth, readAuthFile('admin.json')].filter((x) => x?.token)
  for (const candidate of candidates) {
    const me = await request.get('/api/users/me', { headers: authHeaders(candidate.token) })
    if (me.ok()) {
      const user = await me.json()
      if (user.role === 'ADMIN') {
        return persistAdminAuth({ ...candidate, user })
      }
    }
  }

  try {
    const body = await apiLogin(request, SMOKE.adminEmail, SMOKE.adminPassword, { retries: 5 })
    expect(body.user?.role, 'admin seed user must have ADMIN role').toBe('ADMIN')
    return persistAdminAuth({
      token: body.token,
      user: body.user,
      email: SMOKE.adminEmail,
      password: SMOKE.adminPassword,
    })
  } catch (error) {
    throw new Error(
      `FAILING FUNCTIONALITY: Auth — admin login unavailable (rate-limited, blacklisted token, or misconfigured). Restart Workflow-manager to reset the in-memory login limiter, then re-run. ${error.message}`,
    )
  }
}

export function authHeaders(token) {
  return { Authorization: `Bearer ${token}` }
}

/**
 * Seed browser auth without hitting /auth/login (avoids auth rate limits during page smokes).
 */
export async function injectBrowserSession(page, { token, user, continueLater = false }) {
  await page.addInitScript(
    ({ token: t, user: u, continueLater: later }) => {
      localStorage.setItem('token', t)
      localStorage.setItem('user', JSON.stringify(u))
      sessionStorage.removeItem('token')
      sessionStorage.removeItem('user')
      if (later) {
        sessionStorage.setItem('sp_identity_continue_later', '1')
      } else {
        sessionStorage.removeItem('sp_identity_continue_later')
      }
    },
    { token, user, continueLater },
  )
}

/** UI: fill Sign In form and submit; wait until we leave /signin. */
export async function uiSignIn(page, email, password) {
  await assertFeature('UI Auth — sign-in page', async () => {
    await page.goto('/signin')
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()
    await page.locator('#signin-email').fill(email)
    await page.locator('#signin-password').fill(password)
    await Promise.all([
      page.waitForURL((url) => !url.pathname.includes('/signin'), { timeout: 25_000 }),
      page.getByRole('button', { name: /^sign in$/i }).click(),
    ])
  })
}

/** Bypass identity onboarding gate for member page smoke. */
export async function dismissIdentityGate(page) {
  await page.evaluate(() => {
    sessionStorage.setItem('sp_identity_continue_later', '1')
  })
}
