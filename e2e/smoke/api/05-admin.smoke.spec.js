import { test, expect } from '@playwright/test'
import { resolveAdminAuth, authHeaders } from '../helpers/auth.js'
import { assertFeature, smokeTitle } from '../helpers/feature.js'

let token

test.beforeAll(async ({ request }) => {
  const admin = await resolveAdminAuth(request)
  token = admin.token
})

async function expectAdminOk(request, path, feature) {
  await assertFeature(feature, async () => {
    const res = await request.get(path, { headers: authHeaders(token) })
    expect(res.ok(), `${path} → ${res.status()}: ${await res.text()}`).toBeTruthy()
  })
}

test(smokeTitle('Admin', 'Dashboard stats'), async ({ request }) => {
  await expectAdminOk(request, '/api/admin/stats', 'Admin — dashboard stats')
})

test(smokeTitle('Admin', 'Users list'), async ({ request }) => {
  await expectAdminOk(request, '/api/admin/users', 'Admin — users list')
})

test(smokeTitle('Admin', 'Questions list'), async ({ request }) => {
  await expectAdminOk(request, '/api/admin/questions', 'Admin — questions list')
})

test(smokeTitle('Admin', 'Media moderation list'), async ({ request }) => {
  await expectAdminOk(request, '/api/admin/media/all', 'Admin — media moderation list')
})

test(smokeTitle('Admin', 'Identity documents list'), async ({ request }) => {
  await expectAdminOk(request, '/api/admin/identity-documents', 'Admin — identity documents')
})

test(smokeTitle('Admin', 'Plans admin catalog'), async ({ request }) => {
  await expectAdminOk(request, '/api/plans/admin/all', 'Admin — plans catalog')
})

test(smokeTitle('Admin', 'Subscriptions list'), async ({ request }) => {
  await expectAdminOk(request, '/api/admin/subscriptions', 'Admin — subscriptions list')
})

test(smokeTitle('Admin', 'Finance payments list'), async ({ request }) => {
  await expectAdminOk(request, '/api/admin/payments', 'Admin — finance payments')
})

test(smokeTitle('Admin', 'Finance refunds list'), async ({ request }) => {
  await expectAdminOk(request, '/api/admin/refunds', 'Admin — finance refunds')
})

test(smokeTitle('Admin', 'Finance upgrades list'), async ({ request }) => {
  await expectAdminOk(request, '/api/admin/upgrades', 'Admin — finance upgrades')
})

test(smokeTitle('Admin', 'Events list'), async ({ request }) => {
  await expectAdminOk(request, '/api/admin/events', 'Admin — events list')
})

test(smokeTitle('Admin', 'Events stats'), async ({ request }) => {
  await expectAdminOk(request, '/api/admin/events/stats', 'Admin — events stats')
})

test(smokeTitle('Admin', 'Role & access catalog'), async ({ request }) => {
  await expectAdminOk(request, '/api/admin/access/catalog', 'Admin — role/access catalog')
})

test(smokeTitle('Admin', 'Employees list'), async ({ request }) => {
  await expectAdminOk(request, '/api/admin/access/employees', 'Admin — employees list')
})

test(smokeTitle('Admin', 'Dashboard matrix'), async ({ request }) => {
  await expectAdminOk(request, '/api/admin/access/dashboards', 'Admin — dashboard access matrix')
})

test(smokeTitle('Admin RBAC', 'Member token cannot access admin stats'), async ({ request }) => {
  await assertFeature('Admin RBAC — member blocked from /admin/stats', async () => {
    const { resolveMemberAuth } = await import('../helpers/auth.js')
    const member = await resolveMemberAuth(request)
    const res = await request.get('/api/admin/stats', {
      headers: authHeaders(member.token),
    })
    expect([401, 403].includes(res.status()), `expected 401/403 got ${res.status()}`).toBeTruthy()
  })
})
