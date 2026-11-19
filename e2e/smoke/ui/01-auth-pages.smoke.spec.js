import { test, expect } from '@playwright/test'
import { apiRegisterMember, uiSignIn } from '../helpers/auth.js'
import { assertFeature, smokeTitle } from '../helpers/feature.js'

test(smokeTitle('UI Auth', 'Sign-in page renders'), async ({ page }) => {
  await assertFeature('UI — Sign In page load', async () => {
    await page.goto('/signin')
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()
    await expect(page.locator('#signin-email')).toBeVisible()
    await expect(page.locator('#signin-password')).toBeVisible()
    await expect(page.getByRole('button', { name: /^sign in$/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /sign up|create an account/i }).first()).toBeVisible()
  })
})

test(smokeTitle('UI Auth', 'Sign-up page renders'), async ({ page }) => {
  await assertFeature('UI — Sign Up page load', async () => {
    await page.goto('/signup')
    await expect(page.getByText(/create|sign up|account/i).first()).toBeVisible()
    await expect(page.locator('input').first()).toBeVisible()
  })
})

test(smokeTitle('UI Auth', 'Guest cannot open home'), async ({ page }) => {
  await assertFeature('UI — protected route redirects guests to sign-in', async () => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/signin/)
  })
})

test(smokeTitle('UI Auth', 'Member can sign in'), async ({ page, request }) => {
  const member = await apiRegisterMember(request)
  await assertFeature('UI — post-login lands on app (home or onboarding)', async () => {
    await uiSignIn(page, member.email, member.password)
    await expect(page).toHaveURL(/\/($|onboarding|profile|subscriptions|admin)/)
  })
})

test(smokeTitle('UI Auth', 'Forgot password modal opens'), async ({ page }) => {
  await assertFeature('UI — forgot password entry point', async () => {
    await page.goto('/signin')
    await page.getByRole('button', { name: /forgot password/i }).click()
    await expect(page.getByText(/forgot|reset|otp|verification/i).first()).toBeVisible()
  })
})
