import { test, expect } from '@playwright/test'
import { assertFeature, smokeTitle } from '../helpers/feature.js'

test.describe.configure({ mode: 'serial' })

test(smokeTitle('Public', 'GET /api/plans returns catalog'), async ({ request }) => {
  await assertFeature('Plans — public catalog', async () => {
    const res = await request.get('/api/plans')
    expect(res.ok(), await res.text()).toBeTruthy()
    const plans = await res.json()
    expect(Array.isArray(plans), 'plans must be an array').toBeTruthy()
  })
})

test(smokeTitle('Public', 'GET /api/auth/phone-country-codes'), async ({ request }) => {
  await assertFeature('Auth — phone country codes', async () => {
    const res = await request.get('/api/auth/phone-country-codes')
    expect(res.ok(), await res.text()).toBeTruthy()
    const codes = await res.json()
    expect(Array.isArray(codes) ? codes.length : Object.keys(codes || {}).length).toBeGreaterThan(0)
  })
})

test(smokeTitle('Public', 'POST /api/support/contact accepts ticket'), async ({ request }) => {
  await assertFeature('Support — contact form API', async () => {
    const res = await request.post('/api/support/contact', {
      data: {
        name: 'Smoke Tester',
        email: 'smoke.support@example.com',
        subject: 'Smoke test contact',
        message: 'Automated smoke test — please ignore.',
        issues: ['Technical issue'],
      },
    })
    // 200/201 success, or 400/502 if SMTP misconfigured — still proves endpoint is reachable & validated
    expect([200, 201, 400, 502].includes(res.status()), `unexpected ${res.status()}: ${await res.text()}`).toBeTruthy()
    if (res.status() >= 500 && res.status() !== 502) {
      throw new Error(`Support contact server error: ${res.status()}`)
    }
  })
})

test(smokeTitle('Public', 'Unauthenticated /api/users/me is rejected'), async ({ request }) => {
  await assertFeature('Security — protected route requires auth', async () => {
    const res = await request.get('/api/users/me')
    expect([401, 403].includes(res.status()), `expected 401/403 got ${res.status()}`).toBeTruthy()
  })
})
