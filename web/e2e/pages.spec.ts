import type { ValueMatrix } from '../src/query';
import { en, expect, fill, test } from './fixtures';

test.describe('municipalities list', () => {
    test('lists every municipality by district, with the latest value', async ({
        page,
        index,
        request,
    }) => {
        await page.goto('./concelhos?m=et0');
        await expect(
            page.getByRole('heading', { level: 1, name: en['municipalities.title'] })
        ).toBeVisible();
        await expect(page.getByRole('link', { name: en['nav.municipalities'] })).toHaveAttribute(
            'aria-current',
            'page'
        );

        const rows = page.locator('.municipality-list li');
        await expect(rows).toHaveCount(index.municipalities.length);

        // Lisboa's row shows the last column of the API's values.
        const values = (await (await request.get('v1/et0/values')).json()) as ValueMatrix;
        const lisboa = index.municipalities.find((m) => m.name === 'Lisboa')!;
        const latest = values.values[lisboa.dico].at(-1)!;
        const district = page.getByRole('region', { name: 'Lisboa', exact: true });
        const row = district.getByRole('listitem').filter({ hasText: /^Lisboa/ });
        await expect(row.locator('.municipality-value')).toHaveText(
            `${new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 }).format(latest)} mm`
        );
    });

    test('filters ignoring accents and sorts by value', async ({ page }) => {
        await page.goto('./concelhos?m=et0');
        await page.getByRole('searchbox', { name: en['municipalities.filter'] }).fill('sao bras');
        await expect(page.locator('.municipality-name')).toHaveText(['São Brás de Alportel']);

        await page.getByRole('searchbox', { name: en['municipalities.filter'] }).fill('');
        await page.getByRole('button', { name: en['municipalities.order.value'] }).click();
        const numbers = await page
            .locator('.municipality-value')
            .evaluateAll((cells) =>
                cells
                    .map((c) => Number.parseFloat((c.textContent ?? '').replace(/,/g, '')))
                    .filter((n) => !Number.isNaN(n))
            );
        expect(numbers.length).toBeGreaterThan(100);
        expect(numbers).toEqual([...numbers].sort((a, b) => b - a));
    });

    test('follows from the list and opens the municipality page', async ({ page }) => {
        await page.goto('./concelhos?m=et0');
        await page
            .getByRole('button', {
                name: fill(en['municipalities.follow'], { name: 'Porto' }),
                exact: true,
            })
            .click();
        const following = page.getByRole('region', { name: new RegExp(en['following.title']) });
        await expect(following.getByRole('link', { name: /Porto/ })).toBeVisible();

        await following.getByRole('link', { name: /Porto/ }).click();
        await expect(page).toHaveURL(/\/concelhos\/porto\?m=et0$/);
        await expect(
            page.getByRole('button', { name: en['municipality.following'] })
        ).toHaveAttribute('aria-pressed', 'true');
    });
});

test.describe('data page', () => {
    test('shows each variable, its coverage and the API', async ({ page, index }) => {
        await page.goto('./dados');
        await expect(page.getByRole('heading', { level: 1, name: en['data.title'] })).toBeVisible();

        const variables = page.getByRole('region', { name: en['data.variables'] });
        await expect(variables.getByRole('listitem').filter({ hasText: /^et0/i })).toBeVisible();
        await expect(variables.locator('.variables li')).toHaveCount(index.metrics.length);

        // The calendar has a square for every day from the first to the last.
        const coverage = page.getByRole('region', { name: en['data.coverage'] });
        await coverage.getByRole('button', { name: 'TMAX' }).click();
        const tmax = index.metrics.find((m) => m.id === 'tmax')!;
        const span = (Date.parse(tmax.lastDate!) - Date.parse(tmax.firstDate!)) / 86400000 + 1;
        await expect(coverage.locator('.coverage-day:not([data-state="out"])')).toHaveCount(span);
        await expect(coverage.locator('.coverage-day[data-state="data"]')).toHaveCount(
            tmax.dates.length
        );

        const api = page.getByRole('region', { name: en['data.api'] });
        await expect(api.getByRole('link', { name: 'GET /v1/index' })).toHaveAttribute(
            'href',
            /\/v1\/index$/
        );
    });
});
