import { defineConfig, devices } from '@playwright/test'
import { FRONTEND_PORT } from './src/config/ports.js'

const baseURL = process.env.SMOKE_BASE_URL || `http://127.0.0.1:${FRONTEND_PORT}`

/**
 * SocialPairly end-to-end smoke suite.
 * Prerequisites: UI (`npm run dev`) + Workflow-manager on BACKEND_PORT.
 */
export default defineConfig({
  testDir: './e2e/smoke',
  globalSetup: './e2e/smoke/global-setup.js',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  globalTimeout: 45 * 60_000,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    extraHTTPHeaders: {
      Accept: 'application/json',
    },
  },
  projects: [
    {
      name: 'api-smoke',
      testMatch: /api\/.*\.smoke\.spec\.js/,
      use: {
        baseURL: process.env.SMOKE_API_BASE_URL || baseURL,
      },
    },
    {
      name: 'ui-smoke',
      testMatch: /ui\/.*\.smoke\.spec\.js/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL,
      },
    },
  ],
})
