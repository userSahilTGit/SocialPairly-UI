import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { request } from '@playwright/test'
import { FRONTEND_PORT } from '../../src/config/ports.js'
import { SMOKE, uniqueEmail, uniquePhone } from './helpers/config.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const AUTH_DIR = path.join(__dirname, '.auth')

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

export default async function globalSetup() {
  fs.mkdirSync(AUTH_DIR, { recursive: true })
  const baseURL = process.env.SMOKE_BASE_URL || `http://127.0.0.1:${FRONTEND_PORT}`
  const api = await request.newContext({ baseURL })

  const email = uniqueEmail('member')
  const password = SMOKE.memberPasswordDefault
  const registerRes = await api.post('/api/auth/register', {
    data: {
      firstName: 'Smoke',
      lastName: 'Member',
      middleName: null,
      email,
      phoneNumber: uniquePhone(),
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
  if (!registerRes.ok()) {
    throw new Error(`Member register failed: ${registerRes.status()} ${await registerRes.text()}`)
  }
  const memberBody = await registerRes.json()
  fs.writeFileSync(
    path.join(AUTH_DIR, 'member.json'),
    JSON.stringify({
      token: memberBody.token,
      user: memberBody.user,
      email,
      password,
    }),
  )

  const adminPath = path.join(AUTH_DIR, 'admin.json')
  // Prefer a still-valid token from a previous run (avoids login rate-limit burn).
  let adminReady = false
  if (fs.existsSync(adminPath)) {
    try {
      const prior = JSON.parse(fs.readFileSync(adminPath, 'utf8'))
      const me = await api.get('/api/users/me', {
        headers: { Authorization: `Bearer ${prior.token}` },
      })
      if (me.ok()) {
        const user = await me.json()
        if (user.role === 'ADMIN') {
          fs.writeFileSync(adminPath, JSON.stringify({ ...prior, user }))
          adminReady = true
          console.log('[smoke setup] reused existing admin token')
        }
      }
    } catch {
      // fall through to login
    }
  }

  if (!adminReady) {
    let adminBody = null
    let lastError = ''
    const maxAttempts = Number(process.env.SMOKE_ADMIN_LOGIN_RETRIES || 20)
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const res = await api.post('/api/auth/login', {
        data: {
          identifier: SMOKE.adminEmail,
          password: SMOKE.adminPassword,
          rememberMe: true,
        },
      })
      const text = await res.text()
      if (res.ok()) {
        adminBody = JSON.parse(text)
        break
      }
      lastError = `${res.status()}: ${text}`
      if (res.status() === 429) {
        console.log(`[smoke setup] admin login rate-limited, retry ${attempt + 1}/${maxAttempts}…`)
        await sleep(30_000)
        continue
      }
      throw new Error(`Admin login failed: ${lastError}`)
    }
    if (!adminBody) {
      console.warn(`[smoke setup] admin auth unavailable (${lastError}). Admin smoke cases will fail with a clear message.`)
      if (fs.existsSync(adminPath)) fs.unlinkSync(adminPath)
    } else {
      if (adminBody.user?.role !== 'ADMIN') {
        throw new Error('Seeded admin user does not have ADMIN role')
      }
      fs.writeFileSync(
        adminPath,
        JSON.stringify({
          token: adminBody.token,
          user: adminBody.user,
          email: SMOKE.adminEmail,
          password: SMOKE.adminPassword,
        }),
      )
      adminReady = true
    }
  }

  await api.dispose()
  console.log(
    `[smoke setup] member.json ready; admin.json ${adminReady ? 'ready' : 'missing (rate-limited)'}`,
  )
}
