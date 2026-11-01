import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

/**
 * End-to-end tests against the production build (`vite build` + `vite preview`), with the static
 * API generated from the real `data/` store. Run with `npm run test:e2e` from `web/`.
 */
export default defineConfig({
    testDir: 'e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
    use: {
        baseURL: `http://localhost:${PORT}/`,
        // English by default; the i18n spec switches to Portuguese explicitly.
        locale: 'en-GB',
        timezoneId: 'Europe/Lisbon',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
    webServer: {
        command: `npm run api && npm run build && npm run preview -- --port ${PORT} --strictPort`,
        url: `http://localhost:${PORT}/`,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
    },
});
