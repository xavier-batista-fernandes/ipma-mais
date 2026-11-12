import { test as base, expect, type Page } from '@playwright/test';
import { en } from '../src/i18n/en';
import { pt } from '../src/i18n/pt';
import type { ApiIndex } from '../src/api';

export { expect, en, pt };

/** Fills `{name}` placeholders the same way `useI18n().t` does. */
export function fill(message: string, values: Record<string, string | number>) {
    return message.replace(/\{(\w+)\}/g, (match, name: string) =>
        name in values ? String(values[name]) : match
    );
}

/**
 * `index` is the API the app is served with, so tests read dates and municipalities from the
 * real data instead of hardcoding values that change with every collection run.
 */
export const test = base.extend<{ index: ApiIndex }>({
    index: async ({ request }, use) => {
        const response = await request.get('v1/index');
        expect(response.ok()).toBeTruthy();
        await use((await response.json()) as ApiIndex);
    },
});

export function metricOf(index: ApiIndex, id: string) {
    const metric = index.metrics.find((m) => m.id === id);
    if (!metric) throw new Error(`metric ${id} missing from index.json`);
    return metric;
}

/** Opens the map and waits until Cartis has drawn it and the day's values are in. */
export async function openMap(page: Page, query = '') {
    await page.goto(`./${query}`);
    await expect(page.getByLabel(en['map.label']).locator('svg path').first()).toBeAttached();
    await expect(page.getByRole('button', { name: en['map.zoomIn'] })).toBeVisible();
}

/**
 * A point inside a municipality's shape, in page coordinates. Cartis doesn't label its paths, so
 * this finds the path through the GeoJSON feature D3 bound to it (as MapView's bringToFront does)
 * and probes its bounding box for a point that's really inside the polygon.
 */
export async function municipalityPoint(page: Page, name: string) {
    const point = await page.evaluate((name) => {
        for (const path of document.querySelectorAll<SVGPathElement>('.map svg path')) {
            const datum = (path as { __data__?: { properties?: { NAME_2?: string } } }).__data__;
            if (datum?.properties?.NAME_2 !== name) continue;
            const box = path.getBBox();
            const matrix = path.getScreenCTM();
            if (!matrix) return null;
            for (let i = 1; i < 10; i++) {
                for (let j = 1; j < 10; j++) {
                    const local = new DOMPoint(
                        box.x + (box.width * i) / 10,
                        box.y + (box.height * j) / 10
                    );
                    if (!path.isPointInFill(local)) continue;
                    const screen = local.matrixTransform(matrix);
                    // Skip points a neighbour or an overlay covers.
                    if (document.elementFromPoint(screen.x, screen.y) !== path) continue;
                    return { x: screen.x, y: screen.y };
                }
            }
        }
        return null;
    }, name);
    if (!point) throw new Error(`no clickable point found for ${name}`);
    return point;
}

/*
 * Variable and day pickers. Until #11 (styled drop-down and calendar) is merged, these handle
 * both the native controls and the custom ones, so the suite passes whichever lands first.
 * Once it's in, drop the native branches.
 */

const metricSelect = (page: Page) =>
    page.locator('select').filter({ has: page.locator('option[value="et0"]') });

/** The variable picker's options, opening the drop-down first if it's a custom one. */
export async function metricOptions(page: Page) {
    if (await metricSelect(page).count()) return metricSelect(page).getByRole('option');
    await page.getByRole('button', { name: en['controls.metric'] }).click();
    return page.getByRole('listbox', { name: en['controls.metric'] }).getByRole('option');
}

export async function chooseMetric(page: Page, id: 'et0' | 'tmax' | 'tmin' | 'tmean' | 'prec') {
    if (await metricSelect(page).count()) return void (await metricSelect(page).selectOption(id));
    const options = await metricOptions(page);
    await options.filter({ hasText: en[`metric.${id}`] }).click();
}

/**
 * Picks a day other than the current one with the date control and returns it: the native
 * input takes `fallback` directly, the calendar takes the first other day with data it shows.
 */
export async function pickOtherDay(page: Page, fallback: string) {
    const native = page.locator('input[type="date"]');
    if (await native.count()) {
        await native.fill(fallback);
        return fallback;
    }
    await page.getByRole('button', { name: en['controls.pickDay'] }).click();
    const calendar = page.getByRole('dialog', { name: en['controls.pickDay'] });
    const day = calendar
        .getByRole('grid')
        .locator('button:not([aria-disabled]):not([aria-selected="true"])')
        .first();
    const date = (await day.getAttribute('data-date'))!;
    await day.click();
    await expect(calendar).toBeHidden();
    return date;
}
