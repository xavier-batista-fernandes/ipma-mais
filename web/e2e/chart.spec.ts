import { en, expect, metricOf, openMap, test } from './fixtures';

test.describe('municipality chart', () => {
    test.beforeEach(async ({ page, index }) => {
        const lisboa = index.municipalities.find((m) => m.name === 'Lisboa')!;
        await openMap(page, `?m=et0&c=${lisboa.dico}`);
    });

    test('draws the series and switches range', async ({ page }) => {
        const chart = page.getByRole('img', { name: /mm/ });
        await expect(chart).toBeVisible();
        await expect(chart.locator('path').first()).toBeAttached();

        const range = page.getByRole('group', { name: en['chart.range'] });
        await expect(range.getByRole('button', { name: en['chart.range90'] })).toHaveAttribute(
            'aria-pressed',
            'true'
        );
        await range.getByRole('button', { name: en['chart.rangeAll'] }).click();
        await expect(range.getByRole('button', { name: en['chart.rangeAll'] })).toHaveAttribute(
            'aria-pressed',
            'true'
        );
        await expect(range.getByRole('button', { name: en['chart.range90'] })).toHaveAttribute(
            'aria-pressed',
            'false'
        );
    });

    test('clicking the chart moves the map to that day', async ({ page, index }) => {
        const { lastDate } = metricOf(index, 'et0');
        const chart = page.getByRole('img', { name: /mm/ });
        await expect(chart).toBeVisible();
        const box = (await chart.boundingBox())!;
        // Left edge of the plot: the first day of the visible range, never the latest one.
        await page.mouse.click(box.x + box.width * 0.15, box.y + box.height * 0.5);
        await expect(page).not.toHaveURL(new RegExp(`[?&]d=${lastDate}`));
    });
});
