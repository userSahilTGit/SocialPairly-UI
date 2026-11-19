import { test, expect } from '@playwright/test'
import { injectBrowserSession, resolveAdminAuth, resolveMemberAuth } from '../helpers/auth.js'
import { assertFeature, smokeTitle } from '../helpers/feature.js'

let admin
let member

test.beforeAll(async ({ request }) => {
  // Member first (register avoids login rate-limit); admin login retries on 429.
  test.setTimeout(20 * 60_000)
  member = await resolveMemberAuth(request)
  admin = await resolveAdminAuth(request)
}, { timeout: 20 * 60_000 })

async function openAsAdmin(page, path) {
  await injectBrowserSession(page, {
    token: admin.token,
    user: admin.user,
    continueLater: false,
  })
  await page.goto(path)
}

async function expectAdminPage(page, path, heading) {
  await openAsAdmin(page, path)
  await expect(page).toHaveURL(new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  if (heading) {
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible({ timeout: 20_000 })
  }
  await expect(page.locator('body')).not.toContainText('Failed to load dashboard data')
}

test(smokeTitle('UI Admin', 'Admin session opens dashboard'), async ({ page }) => {
  await assertFeature('UI — Admin login redirect', async () => {
    await openAsAdmin(page, '/admin')
    await expect(page).toHaveURL(/\/admin/)
    await expect(page.getByRole('heading', { level: 1, name: /admin dashboard/i })).toBeVisible()
  })
})

test(smokeTitle('UI Admin', 'Dashboard loads'), async ({ page }) => {
  await assertFeature('UI — Admin Dashboard', async () => {
    await expectAdminPage(page, '/admin', /admin dashboard/i)
  })
})

test(smokeTitle('UI Admin', 'Questions page loads'), async ({ page }) => {
  await assertFeature('UI — Admin Questions', async () => {
    await expectAdminPage(page, '/admin/questions', /manage questions/i)
  })
})

test(smokeTitle('UI Admin', 'Media moderation page loads'), async ({ page }) => {
  await assertFeature('UI — Admin Media Moderation', async () => {
    await expectAdminPage(page, '/admin/media', /media moderation/i)
  })
})

test(smokeTitle('UI Admin', 'Identity documents page loads'), async ({ page }) => {
  await assertFeature('UI — Admin Identity Documents', async () => {
    await expectAdminPage(page, '/admin/identity-documents', /identity documents/i)
  })
})

test(smokeTitle('UI Admin', 'Finance page loads'), async ({ page }) => {
  await assertFeature('UI — Admin Finance', async () => {
    await expectAdminPage(page, '/admin/finance', /payment & refund operations/i)
  })
})

test(smokeTitle('UI Admin', 'Plans page loads'), async ({ page }) => {
  await assertFeature('UI — Admin Plans', async () => {
    await expectAdminPage(page, '/admin/plans', /subscription plans/i)
  })
})

test(smokeTitle('UI Admin', 'Events page loads'), async ({ page }) => {
  await assertFeature('UI — Admin Events', async () => {
    await expectAdminPage(page, '/admin/events', /event/i)
  })
})

test(smokeTitle('UI Admin', 'Customer support page loads'), async ({ page }) => {
  await assertFeature('UI — Admin Customer Support', async () => {
    await expectAdminPage(page, '/admin/customer-support', /customer support/i)
  })
})

test(smokeTitle('UI Admin', 'Role & access page loads'), async ({ page }) => {
  await assertFeature('UI — Admin Role & Access', async () => {
    await expectAdminPage(page, '/admin/access', /role.*access/i)
  })
})

test(smokeTitle('UI Admin', 'Member cannot open admin dashboard'), async ({ page }) => {
  await assertFeature('UI RBAC — member blocked from /admin', async () => {
    await injectBrowserSession(page, {
      token: member.token,
      user: member.user,
      continueLater: true,
    })
    await page.goto('/admin')
    await expect(page).not.toHaveURL(/\/admin$/)
  })
})
