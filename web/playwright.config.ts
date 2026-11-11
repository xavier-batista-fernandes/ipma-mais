import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

/**
 * End-to-end tests against the production build served by the Worker (`wrangler dev`), with a
 * local D1 loaded from the real `data/` store. Run with `npm run test:e2e` from `web/`
 * (needs `npm ci` in `worker/` too).
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
        command: [
            'npm run build',
            'cd ../worker',
            'npm run db:migrate:local',
            'npm run db:sync:local',
            `npx wrangler dev --port ${PORT}`,
        ].join(' && '),
        url: `http://localhost:${PORT}/`,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
    },
});
