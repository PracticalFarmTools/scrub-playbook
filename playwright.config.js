import { defineConfig, devices } from '@playwright/test'

const PORT = 4180

// Runs against `vite preview`, which serves the production build with the vercel.json
// security headers, so a Content Security Policy break fails here. Build first: `npm run e2e`.
// WebKit is the engine inside every iPhone browser, so the iPhone project is the closest a
// Linux runner gets to Safari; it does not replace a check on a real iPhone.
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}/`,
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'android-chromium', use: { ...devices['Pixel 7'] } },
    { name: 'iphone-webkit', use: { ...devices['iPhone 14'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'], viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: `npx vite preview --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
})
