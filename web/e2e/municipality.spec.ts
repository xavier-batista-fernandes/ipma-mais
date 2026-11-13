import type { Page } from '@playwright/test';
import type { Series } from '../src/api';
import { en, expect, fill, openMap, test } from './fixtures';

const number = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 });
const mm = (value: number) => `${number.format(Math.round(value * 100) / 100)} mm`;
const DAY = 86400000;

async function openLisboa(page: Page) {
    await page.goto('./concelhos/lisboa?m=et0');
    await expect(page.getByRole('heading', { level: 1, name: 'Lisboa' })).toBeVisible();
    await expect(page.getByRole('region', { name: en['municipality.summary'] })).toBeVisible();
}

test.describe('municipality page', () => {
    test('opens from the map and shows the latest day and the last week', async ({
        page,
        index,
        request,
    }) => {
        const lisboa = index.municipalities.find((m) => m.name === 'Lisboa')!;
        await openMap(page, `?m=et0&c=${lisboa.dico}`);
        await page.getByRole('link', { name: en['municipality.open'] }).click();
        await expect(page).toHaveURL(/\/concelhos\/lisboa\?m=et0$/);
        await expect(page.getByRole('heading', { level: 1, name: 'Lisboa' })).toBeVisible();

        // The figures, worked out independently from the same API.
        const series = (await (await request.get(`v1/et0/series/${lisboa.dico}`)).json()) as Series;
        const [lastDate, lastValue] = series.rows.at(-1)!;
        const weekStart = Date.parse(lastDate) - 6 * DAY;
        const week = series.rows
            .filter(([date]) => Date.parse(date) >= weekStart)
            .reduce((sum, [, value]) => sum + value, 0);

        const summary = page.getByRole('region', { name: en['municipality.summary'] });
        const values = summary.locator('.kpi-value');
        await expect(values).toHaveCount(4);
        await expect(values.nth(0)).toHaveText(mm(lastValue));
        await expect(values.nth(1)).toHaveText(mm(week));

        // Both charts are drawn, the daily one with last year's line.
        await expect(
            page.getByRole('img', { name: fill(en['chart.label'], { unit: 'mm' }) })
        ).toBeVisible();
        await expect(page.getByText(en['chart.yearBefore'])).toBeVisible();
        await expect(page.getByRole('img', { name: en['municipality.monthly.sum'] })).toBeVisible();
    });

    test('lists the district and links to its other municipalities', async ({ page }) => {
        await openLisboa(page);
        const district = page.getByRole('region', { name: /Lisboa district on/ });
        await expect(district.getByRole('link', { name: /^\d+ Lisboa / })).toHaveAttribute(
            'aria-current',
            'page'
        );
        await district.getByRole('link', { name: /Sintra/ }).click();
        await expect(page).toHaveURL(/\/concelhos\/sintra\?m=et0$/);
        await expect(page.getByRole('heading', { level: 1, name: 'Sintra' })).toBeVisible();

        await page.goBack();
        await expect(page.getByRole('heading', { level: 1, name: 'Lisboa' })).toBeVisible();
    });

    test('follows a municipality and shows it on the map page', async ({ page }) => {
        await openLisboa(page);
        const follow = page.getByRole('button', { name: en['municipality.follow'] });
        await expect(follow).toHaveAttribute('aria-pressed', 'false');
        await follow.click();
        await expect(
            page.getByRole('button', { name: en['municipality.following'] })
        ).toHaveAttribute('aria-pressed', 'true');

        await page.getByRole('link', { name: en['nav.map'] }).click();
        const following = page.getByRole('navigation', { name: en['following.title'] });
        await following.getByRole('link', { name: /Lisboa/ }).click();
        await expect(page.getByRole('heading', { level: 1, name: 'Lisboa' })).toBeVisible();

        // Unfollowing removes it again, and the choice survives a reload.
        await page.getByRole('button', { name: en['municipality.following'] }).click();
        await page.reload();
        await expect(page.getByRole('button', { name: en['municipality.follow'] })).toHaveAttribute(
            'aria-pressed',
            'false'
        );
    });

    test('shows the municipality on the map, on a day picked on its chart', async ({
        page,
        index,
    }) => {
        const lisboa = index.municipalities.find((m) => m.name === 'Lisboa')!;
        await openLisboa(page);
        await page.getByRole('button', { name: en['municipality.showOnMap'] }).click();
        await expect(page).toHaveURL(new RegExp(`/mapa\\?m=et0.*[?&]c=${lisboa.dico}`));
        await expect(
            page.getByRole('complementary').getByRole('heading', { level: 2, name: 'Lisboa' })
        ).toBeVisible();

        await page.goBack();
        const chart = page.getByRole('img', { name: fill(en['chart.label'], { unit: 'mm' }) });
        const box = (await chart.boundingBox())!;
        await page.mouse.click(box.x + box.width * 0.2, box.y + box.height * 0.5);
        await expect(page).toHaveURL(/\/mapa\?m=et0&d=\d{4}-\d{2}-\d{2}&c=/);
        await expect(page.getByRole('region', { name: en['timeline.label'] })).toBeVisible();
    });

    test('search on the page opens the other municipality', async ({ page }) => {
        await openLisboa(page);
        await page.getByRole('combobox', { name: en['search.label'] }).fill('porto');
        await page
            .getByRole('listbox')
            .getByRole('option', { name: /^Porto/ })
            .first()
            .click();
        await expect(page).toHaveURL(/\/concelhos\/porto\?m=et0$/);
        await expect(page.getByRole('heading', { level: 1, name: 'Porto' })).toBeVisible();
    });

    test('an unknown address says so and leads back to the map', async ({ page }) => {
        await page.goto('./concelhos/atlantida');
        await expect(
            page.getByRole('heading', { level: 1, name: en['municipality.notFound'] })
        ).toBeVisible();
        await page.getByRole('link', { name: en['municipality.backToMap'] }).click();
        await expect(page.getByRole('region', { name: en['timeline.label'] })).toBeVisible();
    });
});
