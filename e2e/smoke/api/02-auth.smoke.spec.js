import { test, expect } from '@playwright/test'
import { apiRegisterMember, resolveAdminAuth, authHeaders } from '../helpers/auth.js'
import { SMOKE } from '../helpers/config.js'
import { assertFeature, smokeTitle } from '../helpers/feature.js'

test.describe.configure({ mode: 'serial' })

test(smokeTitle('Auth', 'Admin session GET /users/me'), async ({ request }) => {
  const admin = await resolveAdminAuth(request)
  await assertFeature('Auth — admin session /users/me', async () => {
    const res = await request.get('/api/users/me', { headers: authHeaders(admin.token) })
    expect(res.ok(), await res.text()).toBeTruthy()
    const me = await res.json()
    expect(me.email?.toLowerCase()).toBe(SMOKE.adminEmail.toLowerCase())
    expect(me.role).toBe('ADMIN')
  })
})

test(smokeTitle('Auth', 'Member register returns JWT'), async ({ request }) => {
  const member = await apiRegisterMember(request)
  await assertFeature('Auth — new member can call /users/me', async () => {
    const res = await request.get('/api/users/me', { headers: authHeaders(member.token) })
    expect(res.ok(), await res.text()).toBeTruthy()
    const me = await res.json()
    expect(me.email?.toLowerCase()).toBe(member.email.toLowerCase())
  })
})

test(smokeTitle('Auth', 'Invalid login is rejected'), async ({ request }) => {
  await assertFeature('Auth — bad credentials rejected', async () => {
    const res = await request.post('/api/auth/login', {
      data: {
        identifier: 'nobody-smoke@example.com',
        password: 'WrongPassword!999',
        rememberMe: false,
      },
    })
    expect([401, 403].includes(res.status()), `expected 401/403 got ${res.status()}`).toBeTruthy()
  })
})

test(smokeTitle('Auth', 'Logout succeeds'), async ({ request }) => {
  // Use a throwaway member so we do not blacklist the shared admin smoke token.
  const member = await apiRegisterMember(request)
  await assertFeature('Auth — logout', async () => {
    const res = await request.post('/api/auth/logout', {
      headers: authHeaders(member.token),
    })
    expect(res.ok(), await res.text()).toBeTruthy()
  })
})

test(smokeTitle('Auth', 'Forgot-password send-otp endpoint responds'), async ({ request }) => {
  await assertFeature('Auth — forgot password send OTP', async () => {
    const res = await request.post('/api/auth/forgot-password/send-otp', {
      data: { identifier: SMOKE.adminEmail },
    })
    // 200 even for unknown emails (anti-enumeration) or 400/429 on validation/rate-limit
    expect([200, 201, 400, 404, 429].includes(res.status()), `unexpected ${res.status()}: ${await res.text()}`).toBeTruthy()
  })
})
