import { defineConfig, devices } from '@playwright/test';
import {
  BACKEND_PORT, BACKEND_URL, FRONTEND_PORT, FRONTEND_URL, E2E_DB_URL, JWT_SECRET,
} from './e2e/constants.js';

/**
 * Full-stack E2E: global-setup creates + seeds a dedicated eventia_e2e database,
 * then Playwright boots the real backend (Express + Prisma) and the real Vite
 * frontend against it. Tests drive the browser like a user.
 */
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.js',
  // DB-backed shared state → run serially for deterministic, reproducible runs.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: FRONTEND_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      // Real backend, pointed at the e2e database on a dedicated port.
      command: 'node src/index.js',
      cwd: '../backend',
      url: `${BACKEND_URL}/health`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        DATABASE_URL: E2E_DB_URL,
        JWT_SECRET,
        NODE_ENV: 'e2e',
        PORT: String(BACKEND_PORT),
      },
    },
    {
      // Real frontend. --mode e2e loads .env.e2e (VITE_API_URL -> backend :4100).
      command: `npm run dev -- --mode e2e --port ${FRONTEND_PORT} --strictPort`,
      url: FRONTEND_URL,
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
