import {
    chooseMetric,
    en,
    expect,
    fill,
    metricOf,
    metricOptions,
    municipalityPoint,
    openMap,
    test,
} from './fixtures';

test.describe('map', () => {
    test('draws every municipality and opens on the latest ET0 day', async ({ page, index }) => {
        const et0 = metricOf(index, 'et0');
        await openMap(page);

        await expect(page.getByLabel(en['map.label']).locator('svg path')).toHaveCount(
            index.municipalities.length
        );
        await expect(page).toHaveURL(/[?&]m=et0/);
        await expect(page.getByRole('region', { name: en['timeline.label'] })).toContainText(
            fill(en['timeline.dayOf'], { day: et0.dates.length, total: et0.dates.length })
        );
        await expect(page).toHaveURL(new RegExp(`[?&]d=${et0.lastDate}`));

        // Legend and ranking (5 highest + 5 lowest) for the day.
        await expect(page.getByText(en['common.noData']).first()).toBeVisible();
        const panel = page.getByRole('complementary');
        await expect(panel.getByRole('heading', { name: en['ranking.highest'] })).toBeVisible();
        await expect(panel.getByRole('heading', { name: en['ranking.lowest'] })).toBeVisible();
        await expect(panel.getByRole('listitem')).toHaveCount(10);
    });

    test('shows a tooltip on hover and selects on click', async ({ page, index }) => {
        await openMap(page);
        const odemira = index.municipalities.find((m) => m.name === 'Odemira')!;

        const point = await municipalityPoint(page, 'Odemira');
        await page.mouse.move(point.x, point.y);
        const tooltip = page.locator('.tooltip');
        await expect(tooltip).toContainText('Odemira');
        await expect(tooltip).toContainText(odemira.district);

        await page.mouse.click(point.x, point.y);
        const panel = page.getByRole('complementary');
        await expect(panel.getByRole('heading', { level: 2, name: 'Odemira' })).toBeVisible();
        await expect(panel).toContainText(
            fill(en['panel.district'], { district: odemira.district })
        );
        await expect(page).toHaveURL(new RegExp(`[?&]c=${odemira.dico}`));

        // The selection keeps its outline; the rest of the map fades, and with borders off each
        // faded municipality is still stroked in its own (faded, opaque) fill, so no outlines show.
        const map = page.getByLabel(en['map.label']);
        const selected = map.locator('svg path.selected');
        await expect(selected).toHaveCount(1);
        await expect(selected).toHaveAttribute('stroke-width', '1');
        const others = await map.locator('svg path:not(.selected)').evaluateAll((paths) =>
            paths.map((p) => ({
                fill: p.getAttribute('fill'),
                stroke: p.getAttribute('stroke'),
                fillOpacity: getComputedStyle(p).fillOpacity,
            }))
        );
        expect(others.length).toBeGreaterThan(200);
        for (const path of others) {
            expect(path.stroke).toBe(path.fill);
            expect(path.fillOpacity).toBe('1');
        }
    });

    test('toggles thin municipality borders and remembers the choice', async ({ page }) => {
        await openMap(page);
        const toggle = page.getByRole('button', { name: en['map.borders'] });
        const firstPath = page.getByLabel(en['map.label']).locator('svg path').first();
        await expect(toggle).toHaveAttribute('aria-pressed', 'false');
        await expect(firstPath).toHaveAttribute('stroke-width', '1.5');

        await toggle.click();
        await expect(toggle).toHaveAttribute('aria-pressed', 'true');
        await expect(firstPath).toHaveAttribute('stroke-width', '0.5');

        await page.reload();
        await expect(page.getByRole('button', { name: en['map.borders'] })).toHaveAttribute(
            'aria-pressed',
            'true'
        );
        await page.getByRole('button', { name: en['nav.settings'] }).click();
        await expect(
            page
                .getByRole('radiogroup', { name: en['settings.borders'] })
                .getByRole('radio', { name: en['settings.borders.on'] })
        ).toHaveAttribute('aria-checked', 'true');
    });

    test('zoom buttons move the view and reset brings it back', async ({ page }) => {
        await openMap(page);
        const reset = page.getByRole('button', { name: en['map.reset'] });
        await expect(reset).toBeHidden();

        await page.getByRole('button', { name: en['map.zoomIn'] }).click();
        await expect(reset).toBeVisible();
        await reset.click();
        await expect(reset).toBeHidden();
    });

    test('clicking a ranking entry selects that municipality', async ({ page, index, request }) => {
        // The top entry is the day's highest value, read from the same API the app uses.
        const { lastDate } = metricOf(index, 'et0');
        const day = await (await request.get(`v1/et0/days/${lastDate}`)).json();
        const [topDico] = Object.entries(day.values as Record<string, number>).sort(
            (a, b) => b[1] - a[1]
        )[0];
        const name = index.municipalities.find((m) => m.dico === topDico)!.name;

        await openMap(page);
        const panel = page.getByRole('complementary');
        const first = panel.getByRole('listitem').first().getByRole('button');
        await expect(first).toContainText(name);
        await first.click();
        await expect(panel.getByRole('heading', { level: 2, name })).toBeVisible();
        await expect(panel.getByRole('img', { name: /./ })).toBeVisible();

        await panel.getByRole('button', { name: en['panel.close'] }).click();
        await expect(panel.getByRole('heading', { name: en['ranking.highest'] })).toBeVisible();
        await expect(page).not.toHaveURL(/[?&]c=/);
    });
});

test.describe('variable picker', () => {
    for (const id of ['tmax', 'tmin', 'tmean', 'prec', 'fire', 'vhi', 'smi'] as const) {
        test(`switching to ${id} shows its latest day`, async ({ page, index }) => {
            const metric = metricOf(index, id);
            await openMap(page);

            await chooseMetric(page, id);
            await expect(page).toHaveURL(new RegExp(`[?&]m=${id}`));
            await expect(page).toHaveURL(new RegExp(`[?&]d=${metric.lastDate}`));
            await expect(page.getByRole('region', { name: en['timeline.label'] })).toContainText(
                fill(en['timeline.dayOf'], { day: metric.dates.length, total: metric.dates.length })
            );
            await expect(page.getByRole('complementary').getByRole('listitem')).toHaveCount(10);
        });
    }

    test('lists every metric in the index', async ({ page, index }) => {
        await openMap(page);
        const options = await metricOptions(page);
        await expect(options).toHaveCount(index.metrics.length);
        for (const [i, m] of index.metrics.entries()) {
            await expect(options.nth(i)).toContainText(en[`metric.${m.id}`]);
        }
    });
});
