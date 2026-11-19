import { test, expect } from '@playwright/test'
import { resolveMemberAuth, authHeaders } from '../helpers/auth.js'
import { assertFeature, smokeTitle } from '../helpers/feature.js'

test.describe.configure({ mode: 'serial' })

let token

test.beforeAll(async ({ request }) => {
  const member = await resolveMemberAuth(request)
  token = member.token
})

test(smokeTitle('Billing', 'GET /api/subscriptions/current'), async ({ request }) => {
  await assertFeature('Subscriptions — current subscription', async () => {
    const res = await request.get('/api/subscriptions/current', { headers: authHeaders(token) })
    expect(res.ok(), await res.text()).toBeTruthy()
  })
})

test(smokeTitle('Billing', 'GET /api/payment/latest-status'), async ({ request }) => {
  await assertFeature('Payments — latest status', async () => {
    const res = await request.get('/api/payment/latest-status', { headers: authHeaders(token) })
    expect(res.ok(), await res.text()).toBeTruthy()
  })
})

test(smokeTitle('Billing', 'GET /api/refunds/current'), async ({ request }) => {
  await assertFeature('Refunds — current refund workflow', async () => {
    const res = await request.get('/api/refunds/current', { headers: authHeaders(token) })
    expect(res.ok(), await res.text()).toBeTruthy()
  })
})

test(smokeTitle('Billing', 'GET /api/upgrades/current'), async ({ request }) => {
  await assertFeature('Upgrades — current upgrade request', async () => {
    const res = await request.get('/api/upgrades/current', { headers: authHeaders(token) })
    expect(res.ok(), await res.text()).toBeTruthy()
  })
})

test(smokeTitle('Billing', 'GET /api/upgrades/eligible-plans'), async ({ request }) => {
  await assertFeature('Upgrades — eligible plans', async () => {
    const res = await request.get('/api/upgrades/eligible-plans', { headers: authHeaders(token) })
    // Empty subscription may return 200 [] or 400 — both prove route is wired
    expect([200, 400].includes(res.status()), `unexpected ${res.status()}: ${await res.text()}`).toBeTruthy()
  })
})
