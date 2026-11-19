import { test, expect } from '@playwright/test'
import { injectBrowserSession, resolveMemberAuth } from '../helpers/auth.js'
import { assertFeature, smokeTitle } from '../helpers/feature.js'

let member

test.beforeAll(async ({ request }) => {
  member = await resolveMemberAuth(request)
})

async function openAsMember(page, path, { continueLater = true } = {}) {
  await injectBrowserSession(page, {
    token: member.token,
    user: member.user,
    continueLater,
  })
  await page.goto(path)
}

test(smokeTitle('UI Member', 'Identity onboarding page loads'), async ({ page }) => {
  await assertFeature('UI — Identity onboarding', async () => {
    await openAsMember(page, '/onboarding/identity', { continueLater: false })
    await expect(page).toHaveURL(/\/onboarding\/identity/)
    await expect(page.locator('body')).not.toContainText('Failed to load')
  })
})

test(smokeTitle('UI Member', 'Home page loads after continue-later'), async ({ page }) => {
  await assertFeature('UI — Home / events dashboard', async () => {
    await openAsMember(page, '/')
    await expect(page).not.toHaveURL(/signin|onboarding/)
    await expect(
      page.locator('.home-hero-title, .user-home-page, .home-greeting-card').first(),
    ).toBeVisible({ timeout: 20_000 })
  })
})

test(smokeTitle('UI Member', 'Profile page loads'), async ({ page }) => {
  await assertFeature('UI — Profile', async () => {
    await openAsMember(page, '/profile')
    await expect(page).toHaveURL(/\/profile/)
    await expect(page.locator('body')).not.toContainText('Failed to load dashboard')
  })
})

test(smokeTitle('UI Member', 'Profile media page loads'), async ({ page }) => {
  await assertFeature('UI — Profile media studio', async () => {
    await openAsMember(page, '/profile/media')
    await expect(page).toHaveURL(/\/profile\/media/)
  })
})

test(smokeTitle('UI Member', 'Subscriptions page loads plans'), async ({ page }) => {
  await assertFeature('UI — Subscriptions / plans', async () => {
    await openAsMember(page, '/subscriptions')
    await expect(page).toHaveURL(/\/subscriptions/)
    await expect(page.locator('body')).not.toContainText('Unexpected Application Error')
  })
})

test(smokeTitle('UI Member', 'Contact support page loads'), async ({ page }) => {
  await assertFeature('UI — Contact support', async () => {
    await openAsMember(page, '/contact')
    await expect(page.getByRole('heading', { name: /tell us what you need help with/i })).toBeVisible()
  })
})

test(smokeTitle('UI Member', 'Settings page loads'), async ({ page }) => {
  await assertFeature('UI — Settings', async () => {
    await openAsMember(page, '/settings')
    await expect(page).toHaveURL(/\/settings/)
  })
})

test(smokeTitle('UI Member', 'Personality onboarding page loads'), async ({ page }) => {
  await assertFeature('UI — Personality onboarding', async () => {
    await openAsMember(page, '/onboarding/personality')
    await expect(page).toHaveURL(/\/onboarding\/personality/)
  })
})

test(smokeTitle('UI Member', 'Faith onboarding page loads'), async ({ page }) => {
  await assertFeature('UI — Faith onboarding', async () => {
    await openAsMember(page, '/onboarding/faith')
    await expect(page).toHaveURL(/\/onboarding\/faith/)
  })
})

test(smokeTitle('UI Member', 'Notifications placeholder loads'), async ({ page }) => {
  await assertFeature('UI — Notifications', async () => {
    await openAsMember(page, '/notifications')
    await expect(page).toHaveURL(/\/notifications/)
  })
})

test(smokeTitle('UI Member', 'Logout returns to sign-in'), async ({ page }) => {
  await assertFeature('UI — Logout', async () => {
    await openAsMember(page, '/')
    await expect(page).not.toHaveURL(/signin/)
    await page.getByRole('button', { name: /profile menu|premium profile menu/i }).click()
    await page.locator('.dropdown-menu').getByRole('button', { name: /^logout$/i }).click()
    await expect(page).toHaveURL(/\/signin/, { timeout: 15_000 })
  })
})
