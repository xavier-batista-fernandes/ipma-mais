import { en, expect, openMap, pt, test } from './fixtures';

test.describe('settings', () => {
    test('switches the language to Portuguese and remembers it', async ({ page }) => {
        await page.goto('./#/settings');
        await expect(
            page.getByRole('heading', { level: 1, name: en['settings.title'] })
        ).toBeVisible();

        const language = page.getByRole('radiogroup', { name: en['settings.language'] });
        await language.getByRole('radio', { name: 'Português' }).click();
        await expect(
            page.getByRole('heading', { level: 1, name: pt['settings.title'] })
        ).toBeVisible();
        await expect(page.locator('html')).toHaveAttribute('lang', 'pt');
        await expect(
            page.getByRole('radiogroup', { name: pt['settings.language'] }).getByRole('radio', {
                name: 'Português',
            })
        ).toHaveAttribute('aria-checked', 'true');

        await page.reload();
        await expect(
            page.getByRole('heading', { level: 1, name: pt['settings.title'] })
        ).toBeVisible();
        await page.getByRole('link', { name: pt['nav.map'] }).click();
        await expect(page.getByLabel(pt['controls.metric'])).toBeVisible();
        await expect(page.getByRole('combobox', { name: pt['search.label'] })).toBeVisible();
    });

    test('switches the theme and remembers it', async ({ page }) => {
        await page.goto('./#/settings');
        const html = page.locator('html');
        const theme = page.getByRole('radiogroup', { name: en['settings.theme'] });
        await expect(
            theme.getByRole('radio', { name: en['settings.theme.system'] })
        ).toHaveAttribute('aria-checked', 'true');
        await expect(html).not.toHaveAttribute('data-theme', /./);

        await theme.getByRole('radio', { name: en['settings.theme.dark'] }).click();
        await expect(html).toHaveAttribute('data-theme', 'dark');
        await page.reload();
        await expect(html).toHaveAttribute('data-theme', 'dark');

        await page
            .getByRole('radiogroup', { name: en['settings.theme'] })
            .getByRole('radio', { name: en['settings.theme.light'] })
            .click();
        await expect(html).toHaveAttribute('data-theme', 'light');

        await page
            .getByRole('radiogroup', { name: en['settings.theme'] })
            .getByRole('radio', { name: en['settings.theme.system'] })
            .click();
        await expect(html).not.toHaveAttribute('data-theme', /./);
    });
});

test.describe('Portuguese browser', () => {
    test.use({ locale: 'pt-PT' });

    test('defaults to Portuguese', async ({ page }) => {
        await page.goto('./');
        await expect(page.locator('html')).toHaveAttribute('lang', 'pt');
        await expect(page.getByLabel(pt['map.label']).locator('svg path').first()).toBeAttached();
        await expect(page.getByRole('link', { name: pt['nav.settings'] })).toBeVisible();
    });
});

test.describe('navigation', () => {
    test('About and back to the map keep the current view', async ({ page, index }) => {
        const lisboa = index.municipalities.find((m) => m.name === 'Lisboa')!;
        await openMap(page, `?m=et0&c=${lisboa.dico}`);

        await page.getByRole('link', { name: en['nav.about'] }).click();
        await expect(
            page.getByRole('heading', { level: 1, name: en['about.title'] })
        ).toBeVisible();
        await expect(page.getByRole('link', { name: en['nav.about'] })).toHaveAttribute(
            'aria-current',
            'page'
        );

        await page.getByRole('link', { name: en['nav.map'] }).click();
        await expect(
            page.getByRole('complementary').getByRole('heading', { level: 2, name: 'Lisboa' })
        ).toBeVisible();
    });

    test.describe('on a phone', () => {
        test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

        test('the menu opens, navigates and closes', async ({ page }) => {
            await openMap(page);
            const toggle = page.getByRole('button', { name: en['nav.menu'] });
            await expect(toggle).toHaveAttribute('aria-expanded', 'false');
            await expect(page.getByRole('link', { name: en['nav.settings'] })).toBeHidden();

            await toggle.click();
            await expect(toggle).toHaveAttribute('aria-expanded', 'true');
            await page.getByRole('link', { name: en['nav.settings'] }).click();
            await expect(
                page.getByRole('heading', { level: 1, name: en['settings.title'] })
            ).toBeVisible();
            await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        });
    });
});
