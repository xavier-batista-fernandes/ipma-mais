import { en, expect, test } from './fixtures';

test.describe('home page', () => {
    test('shows each variable on its latest day, with a link to what it means', async ({
        page,
        index,
    }) => {
        await page.goto('./');
        await expect(page.getByRole('heading', { level: 1, name: en['home.title'] })).toBeVisible();
        await expect(page.getByRole('link', { name: en['nav.home'], exact: true })).toHaveAttribute(
            'aria-current',
            'page'
        );
        for (const m of index.metrics) {
            const card = page.getByRole('article', { name: en[`metric.${m.id}`] });
            await expect(card).toContainText(en[`metricInfo.${m.id}.summary`]);
            await expect(card.locator('svg path').first()).toBeAttached();
        }
        const et0 = page.getByRole('article', { name: en['metric.et0'] });
        await et0.getByRole('link', { name: en['home.about'] }).click();
        await expect(page).toHaveURL(/\/variaveis\/et0(\?|$)/);
        await expect(page.getByRole('heading', { level: 1, name: en['metric.et0'] })).toBeVisible();
        await expect(page.getByRole('heading', { name: en['variable.what'] })).toBeVisible();
        await expect(page.getByText(en['metricInfo.et0.what'])).toBeVisible();
    });

    test('search opens the municipality page', async ({ page }) => {
        await page.goto('./');
        await page.locator('.home-search input').fill('evora');
        await page.getByRole('listbox').getByRole('option', { name: 'Évora' }).click();
        await expect(page).toHaveURL(/\/concelhos\/evora(\?|$)/);
    });
});

test.describe('variables', () => {
    test('the map links to the variable on screen and its page links back', async ({ page }) => {
        await page.goto('./mapa?m=tmin');
        await page
            .getByRole('link', {
                name: en['variable.info'].replace('{name}', en['metric.tmin']),
            })
            .click();
        await expect(page).toHaveURL(/\/variaveis\/tmin(\?|$)/);
        await page.getByRole('link', { name: en['variable.openMap'] }).click();
        await expect(page).toHaveURL(/\/mapa\?m=tmin/);
    });

    test('lists every variable and handles unknown ones', async ({ page, index }) => {
        await page.goto('./variaveis');
        for (const m of index.metrics) {
            await expect(
                page.locator('.variable-cards a').filter({ hasText: en[`metric.${m.id}`] })
            ).toBeVisible();
        }
        await page.goto('./variaveis/nothing');
        await expect(
            page.getByRole('heading', { level: 1, name: en['variable.notFound'] })
        ).toBeVisible();
    });
});
