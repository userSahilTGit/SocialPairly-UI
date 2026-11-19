import { test, expect } from '@playwright/test'
import { resolveMemberAuth, authHeaders } from '../helpers/auth.js'
import { assertFeature, smokeTitle } from '../helpers/feature.js'

test.describe.configure({ mode: 'serial' })

let token

test.beforeAll(async ({ request }) => {
  const member = await resolveMemberAuth(request)
  token = member.token
})

test(smokeTitle('Profile', 'GET /api/profile'), async ({ request }) => {
  await assertFeature('Profile — load profile', async () => {
    const res = await request.get('/api/profile', { headers: authHeaders(token) })
    expect(res.ok(), await res.text()).toBeTruthy()
  })
})

test(smokeTitle('Profile', 'GET /api/profile/completion'), async ({ request }) => {
  await assertFeature('Profile — completion score', async () => {
    const res = await request.get('/api/profile/completion', { headers: authHeaders(token) })
    expect(res.ok(), await res.text()).toBeTruthy()
  })
})

test(smokeTitle('Onboarding', 'GET /api/onboarding/identity'), async ({ request }) => {
  await assertFeature('Onboarding — identity load', async () => {
    const res = await request.get('/api/onboarding/identity', { headers: authHeaders(token) })
    expect(res.ok(), await res.text()).toBeTruthy()
  })
})

test(smokeTitle('Onboarding', 'GET /api/onboarding/identity/reference-data'), async ({ request }) => {
  await assertFeature('Onboarding — identity reference data', async () => {
    const res = await request.get('/api/onboarding/identity/reference-data', {
      headers: authHeaders(token),
    })
    expect(res.ok(), await res.text()).toBeTruthy()
  })
})

test(smokeTitle('Onboarding', 'GET /api/onboarding/personality'), async ({ request }) => {
  await assertFeature('Onboarding — personality/lifestyle load', async () => {
    const res = await request.get('/api/onboarding/personality', { headers: authHeaders(token) })
    expect(res.ok(), await res.text()).toBeTruthy()
  })
})

test(smokeTitle('Questions', 'GET /api/questions'), async ({ request }) => {
  await assertFeature('Questions — active question bank', async () => {
    const res = await request.get('/api/questions', { headers: authHeaders(token) })
    expect(res.ok(), await res.text()).toBeTruthy()
    const data = await res.json()
    expect(Array.isArray(data)).toBeTruthy()
  })
})

test(smokeTitle('Media', 'GET /api/media/my-uploads'), async ({ request }) => {
  await assertFeature('Media — my uploads list', async () => {
    const res = await request.get('/api/media/my-uploads', { headers: authHeaders(token) })
    expect(res.ok(), await res.text()).toBeTruthy()
  })
})

test(smokeTitle('Media', 'GET /api/users/profile-readiness'), async ({ request }) => {
  await assertFeature('Media — profile readiness', async () => {
    const res = await request.get('/api/users/profile-readiness', { headers: authHeaders(token) })
    expect(res.ok(), await res.text()).toBeTruthy()
  })
})

test(smokeTitle('Events', 'GET /api/events/my'), async ({ request }) => {
  await assertFeature('Events — member event list', async () => {
    const res = await request.get('/api/events/my', { headers: authHeaders(token) })
    expect(res.ok(), await res.text()).toBeTruthy()
    const data = await res.json()
    expect(Array.isArray(data)).toBeTruthy()
  })
})
