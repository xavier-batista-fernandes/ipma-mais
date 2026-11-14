import type { Page } from '@playwright/test';
import { en, expect, municipalityPoint, openMap, pt, test } from './fixtures';

/** Opens the settings panel from the gear in the top bar. */
async function openSettings(
    page: Page,
    messages: Record<'nav.settings' | 'settings.title', string> = en
) {
    await page.getByRole('button', { name: messages['nav.settings'] }).click();
    const dialog = page.getByRole('dialog', { name: messages['settings.title'] });
    await expect(dialog).toBeVisible();
    return dialog;
}

test.describe('settings', () => {
    test('switches the language to Portuguese and remembers it', async ({ page }) => {
        await openMap(page);
        const dialog = await openSettings(page);

        const language = dialog.getByRole('radiogroup', { name: en['settings.language'] });
        await language.getByRole('radio', { name: 'Português' }).click();
        await expect(
            page.getByRole('dialog', { name: pt['settings.title'] }).getByRole('radiogroup', {
                name: pt['settings.language'],
            })
        ).toBeVisible();
        await expect(page.locator('html')).toHaveAttribute('lang', 'pt-PT');
        await expect(page.getByRole('link', { name: pt['nav.map'] })).toBeVisible();

        await page.reload();
        await expect(page.getByRole('link', { name: pt['nav.query'] })).toBeVisible();
        await expect(page.getByLabel(pt['controls.metric'])).toBeVisible();
        await expect(page.getByRole('combobox', { name: pt['search.label'] })).toBeVisible();
        const reopened = await openSettings(page, pt);
        await expect(
            reopened
                .getByRole('radiogroup', { name: pt['settings.language'] })
                .getByRole('radio', { name: 'Português' })
        ).toHaveAttribute('aria-checked', 'true');
    });

    test('switches the theme and remembers it', async ({ page }) => {
        await openMap(page);
        const html = page.locator('html');
        const theme = (await openSettings(page)).getByRole('radiogroup', {
            name: en['settings.theme'],
        });
        await expect(
            theme.getByRole('radio', { name: en['settings.theme.system'] })
        ).toHaveAttribute('aria-checked', 'true');
        await expect(html).not.toHaveAttribute('data-theme', /./);

        await theme.getByRole('radio', { name: en['settings.theme.dark'] }).click();
        await expect(html).toHaveAttribute('data-theme', 'dark');
        await page.reload();
        await expect(html).toHaveAttribute('data-theme', 'dark');

        const again = (await openSettings(page)).getByRole('radiogroup', {
            name: en['settings.theme'],
        });
        await again.getByRole('radio', { name: en['settings.theme.light'] }).click();
        await expect(html).toHaveAttribute('data-theme', 'light');
        await again.getByRole('radio', { name: en['settings.theme.system'] }).click();
        await expect(html).not.toHaveAttribute('data-theme', /./);

        // Escape closes the panel and gives focus back to the gear.
        await page.keyboard.press('Escape');
        await expect(page.getByRole('dialog', { name: en['settings.title'] })).toBeHidden();
        await expect(page.getByRole('button', { name: en['nav.settings'] })).toBeFocused();
    });
});

test.describe('Portuguese browser', () => {
    test.use({ locale: 'pt-PT' });

    test('defaults to Portuguese', async ({ page }) => {
        await page.goto('./mapa');
        await expect(page.locator('html')).toHaveAttribute('lang', 'pt-PT');
        await expect(page.getByLabel(pt['map.label']).locator('svg path').first()).toBeAttached();
        await expect(page.getByRole('button', { name: pt['nav.settings'] })).toBeVisible();
    });
});

test.describe('navigation', () => {
    test('Data and back to the map keep the current view', async ({ page, index }) => {
        const lisboa = index.municipalities.find((m) => m.name === 'Lisboa')!;
        await openMap(page, `?m=tmax&c=${lisboa.dico}`);

        await page.getByRole('link', { name: en['nav.data'] }).click();
        await expect(page).toHaveURL(/\/dados\?m=tmax$/);
        await expect(page.getByRole('heading', { level: 1, name: en['data.title'] })).toBeVisible();
        await expect(page.getByRole('link', { name: en['nav.data'] })).toHaveAttribute(
            'aria-current',
            'page'
        );

        await page.getByRole('link', { name: en['nav.map'] }).click();
        await expect(
            page.getByRole('complementary').getByRole('heading', { level: 2, name: 'Lisboa' })
        ).toBeVisible();
        await expect(page).toHaveURL(new RegExp(`[?&]c=${lisboa.dico}(&|$)`));

        // The browser's Back and Forward move between the pages.
        await page.goBack();
        await expect(page.getByRole('heading', { level: 1, name: en['data.title'] })).toBeVisible();
        await page.goForward();
        await expect(page.getByRole('region', { name: en['timeline.label'] })).toBeVisible();
    });

    test('pages open directly from their address', async ({ page }) => {
        await page.goto('./dados');
        await expect(page.getByRole('heading', { level: 1, name: en['data.title'] })).toBeVisible();
        await page.goto('./consultas?m=et0');
        await expect(page.getByRole('link', { name: en['nav.query'] })).toHaveAttribute(
            'aria-current',
            'page'
        );
    });

    test('links from before the pages had addresses still work', async ({ page }) => {
        await page.goto('./#/about');
        await expect(page).toHaveURL(/\/dados(\?|$)/);
        await expect(page.getByRole('heading', { level: 1, name: en['data.title'] })).toBeVisible();

        await page.goto('./sobre');
        await expect(page).toHaveURL(/\/dados(\?|$)/);

        await page.goto('./?m=et0#/settings');
        await expect(page).toHaveURL(/\/mapa\?m=et0/);
        await expect(page.getByRole('dialog', { name: en['settings.title'] })).toBeVisible();

        // The map used to be the home page: a shared view of it opens /mapa.
        await page.goto('./?m=tmax&d=2026-11-01');
        await expect(page).toHaveURL(/\/mapa\?m=tmax&d=2026-11-01/);

        await page.goto('./?m=et0&v=q&qt=threshold&x=2');
        await expect(page).toHaveURL(/\/consultas\?m=et0&.*x=2/);
        await expect(page).not.toHaveURL(/[?&]v=q/);
    });

    test.describe('on a phone', () => {
        test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

        test('the tab bar moves between pages and search opens from a button', async ({ page }) => {
            await openMap(page);
            const tabs = page.getByRole('navigation', { name: en['nav.pages'] });
            await expect(tabs).toHaveCount(1);
            await expect(tabs.getByRole('link', { name: en['nav.map'] })).toHaveAttribute(
                'aria-current',
                'page'
            );

            await tabs.getByRole('link', { name: en['nav.query'] }).click();
            await expect(page).toHaveURL(/\/consultas\?/);

            const search = page.getByRole('combobox', { name: en['search.label'] });
            await expect(search).toBeHidden();
            await page.getByRole('button', { name: en['search.label'] }).click();
            await expect(search).toBeFocused();
            await search.fill('Évora');
            await page.getByRole('option', { name: /Évora/ }).first().click();
            await expect(
                page.getByRole('complementary').getByRole('heading', { level: 2, name: 'Évora' })
            ).toBeVisible();
            await expect(search).toBeHidden();
        });

        test('a tapped municipality shows in a sheet over the map, without zooming in', async ({
            page,
        }) => {
            await openMap(page);
            const point = await municipalityPoint(page, 'Évora');
            await page.touchscreen.tap(point.x, point.y);

            const sheet = page.getByRole('region', { name: 'Évora' });
            await expect(sheet).toBeVisible();
            await expect(page.locator('.tooltip')).toHaveCount(0);
            await expect(page.getByRole('button', { name: en['map.reset'] })).toHaveCount(0);

            await sheet.getByRole('link', { name: en['municipality.open'] }).click();
            await expect(page).toHaveURL(/\/concelhos\/evora/);
        });
    });
});
