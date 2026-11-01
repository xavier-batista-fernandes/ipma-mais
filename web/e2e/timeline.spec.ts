import { en, expect, fill, metricOf, openMap, pickOtherDay, test } from './fixtures';

test.describe('timeline', () => {
    test('buttons step through days and update the URL', async ({ page, index }) => {
        const { dates } = metricOf(index, 'et0');
        const total = dates.length;
        await openMap(page);
        const timeline = page.getByRole('region', { name: en['timeline.label'] });
        const dayOf = (day: number) => fill(en['timeline.dayOf'], { day, total });

        await expect(timeline.getByRole('button', { name: en['controls.nextDay'] })).toBeDisabled();
        await expect(timeline.getByRole('button', { name: en['timeline.lastDay'] })).toBeDisabled();

        await timeline.getByRole('button', { name: en['controls.previousDay'] }).click();
        await expect(timeline).toContainText(dayOf(total - 1));
        await expect(page).toHaveURL(new RegExp(`[?&]d=${dates[total - 2]}`));

        await timeline.getByRole('button', { name: en['timeline.firstDay'] }).click();
        await expect(timeline).toContainText(dayOf(1));
        await expect(page).toHaveURL(new RegExp(`[?&]d=${dates[0]}`));
        await expect(
            timeline.getByRole('button', { name: en['controls.previousDay'] })
        ).toBeDisabled();

        await timeline.getByRole('button', { name: en['controls.nextDay'] }).click();
        await expect(timeline).toContainText(dayOf(2));

        await timeline.getByRole('button', { name: en['timeline.lastDay'] }).click();
        await expect(timeline).toContainText(dayOf(total));
    });

    test('arrow keys step a day', async ({ page, index }) => {
        const total = metricOf(index, 'et0').dates.length;
        await openMap(page);
        const timeline = page.getByRole('region', { name: en['timeline.label'] });

        await page.locator('body').press('ArrowLeft');
        await page.locator('body').press('ArrowLeft');
        await expect(timeline).toContainText(fill(en['timeline.dayOf'], { day: total - 2, total }));
        await page.locator('body').press('ArrowRight');
        await expect(timeline).toContainText(fill(en['timeline.dayOf'], { day: total - 1, total }));
    });

    test('the slider and date picker choose a day', async ({ page, index }) => {
        const { dates } = metricOf(index, 'et0');
        await openMap(page);
        const timeline = page.getByRole('region', { name: en['timeline.label'] });

        await timeline.getByRole('slider', { name: en['controls.day'] }).fill('0');
        await expect(page).toHaveURL(new RegExp(`[?&]d=${dates[0]}`));

        const picked = await pickOtherDay(page, dates[5]);
        expect(dates).toContain(picked);
        await expect(page).toHaveURL(new RegExp(`[?&]d=${picked}`));
    });

    test('play advances through days and pause stops', async ({ page, index }) => {
        const { dates } = metricOf(index, 'et0');
        await openMap(page, `?m=et0&d=${dates[0]}`);
        const timeline = page.getByRole('region', { name: en['timeline.label'] });

        await timeline.getByRole('group', { name: en['timeline.speed'] }).getByText('4×').click();
        await timeline.getByRole('button', { name: en['timeline.play'] }).click();
        const pause = timeline.getByRole('button', { name: en['timeline.pause'] });
        await expect(pause).toHaveAttribute('aria-pressed', 'true');
        // Playback steps at least a few days forward on its own.
        const shownDay = () => new URL(page.url()).searchParams.get('d') ?? '';
        await expect.poll(() => dates.indexOf(shownDay())).toBeGreaterThanOrEqual(3);

        await pause.click();
        await expect(timeline.getByRole('button', { name: en['timeline.play'] })).toBeVisible();
        const stoppedAt = shownDay();
        await page.waitForTimeout(600);
        expect(shownDay()).toBe(stoppedAt);
    });
});

test.describe('URL state', () => {
    test('restores metric, day and municipality from the address', async ({ page, index }) => {
        const { dates } = metricOf(index, 'et0');
        const lisboa = index.municipalities.find((m) => m.name === 'Lisboa')!;
        await openMap(page, `?m=et0&d=${dates[10]}&c=${lisboa.dico}`);

        await expect(page.getByRole('region', { name: en['timeline.label'] })).toContainText(
            fill(en['timeline.dayOf'], { day: 11, total: dates.length })
        );
        await expect(
            page.getByRole('complementary').getByRole('heading', { level: 2, name: 'Lisboa' })
        ).toBeVisible();
    });

    test('falls back to the latest day for an unknown date', async ({ page, index }) => {
        await openMap(page, '?m=et0&d=1999-01-01');
        await expect(page).toHaveURL(new RegExp(`[?&]d=${metricOf(index, 'et0').lastDate}`));
    });
});
