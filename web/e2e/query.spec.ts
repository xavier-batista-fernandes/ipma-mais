import { readFile } from 'node:fs/promises';
import type { APIRequestContext, Page } from '@playwright/test';
import type { ValueMatrix } from '../src/query';
import { en, expect, fill, metricOf, openMap, test } from './fixtures';

const panel = (page: Page) => page.getByRole('complementary');
const results = (page: Page) =>
    panel(page).getByRole('region', { name: en['query.result'] }).getByRole('listitem');

/** Opens the query page from the map's menu, so the link and the page are both covered. */
async function openQuery(page: Page) {
    await openMap(page);
    await page.getByRole('link', { name: en['nav.query'] }).click();
    await expect(page).toHaveURL(/\/consultas\?/);
    await expect(panel(page).getByRole('status')).toBeVisible();
}

async function chooseQuestion(page: Page, type: keyof typeof QUESTIONS) {
    await page.getByRole('button', { name: en['query.type'] }).click();
    await page
        .getByRole('listbox', { name: en['query.type'] })
        .getByRole('option', { name: QUESTIONS[type] })
        .click();
}

const QUESTIONS = {
    threshold: en['query.type.threshold'],
    total: en['query.type.total'],
    streak: en['query.type.streak'],
    ranking: en['query.type.ranking'],
    compare: en['query.type.compare'],
};

async function values(request: APIRequestContext) {
    const response = await request.get('v1/et0/values');
    expect(response.ok()).toBeTruthy();
    return (await response.json()) as ValueMatrix;
}

/** The threshold query worked out independently from the published values. */
function countAbove(matrix: ValueMatrix, from: string, to: string, value: number, minDays: number) {
    let count = 0;
    for (const series of Object.values(matrix.values)) {
        const hits = matrix.dates.filter(
            (date, i) => date >= from && date <= to && series[i] !== null && series[i]! > value
        ).length;
        if (hits > 0 && hits >= minDays) count++;
    }
    return count;
}

test.describe('queries', () => {
    test('opens the query page and finds the municipalities above a value', async ({
        page,
        index,
        request,
    }) => {
        const et0 = metricOf(index, 'et0');
        await openQuery(page);

        await expect(page.getByRole('link', { name: en['nav.query'] })).toHaveAttribute(
            'aria-current',
            'page'
        );
        await expect(page.getByRole('region', { name: en['timeline.label'] })).toBeHidden();
        await expect(page.getByText(en['query.notInResults']).first()).toBeVisible();

        const url = new URL(page.url());
        const from = url.searchParams.get('f')!;
        const to = url.searchParams.get('t')!;
        expect(to).toBe(et0.lastDate);

        // Raise the bar: fewer (or as many) municipalities match, and the count is right.
        const input = page.getByLabel(fill(en['query.value'], { unit: 'mm' }));
        await input.fill('1.5');
        await page.getByLabel(en['query.minDays']).fill('3');
        await expect(page).toHaveURL(/[?&]x=1\.5(&|$)/);
        await expect(page).toHaveURL(/[?&]n=3(&|$)/);

        const expected = countAbove(await values(request), from, to, 1.5, 3);
        await expect(panel(page).getByRole('status')).toContainText(
            fill(en['query.matches'], { count: expected, total: index.municipalities.length })
        );
        await expect(results(page)).toHaveCount(expected);
    });

    test('reads the question as a sentence that follows the choices', async ({ page }) => {
        await openQuery(page);
        const question = page.getByRole('region', { name: en['query.question'] });
        await page.getByLabel(en['query.minDays']).fill('1');
        await expect(question).toContainText(`${en['query.sentence.day']},`);
        await page.getByLabel(en['query.minDays']).fill('3');
        await expect(question).toContainText(`${en['query.sentence.days']},`);

        await chooseQuestion(page, 'ranking');
        await expect(question).toContainText(en['query.sentence.ranking'].split(' {')[0]);
        await expect(page.getByLabel(en['query.minDays'])).toHaveCount(0);
        await expect(page.getByRole('button', { name: `${en['query.day']}: ` })).toBeVisible();
    });

    test('restores the query from the link', async ({ page }) => {
        await openQuery(page);
        await page.getByLabel(fill(en['query.value'], { unit: 'mm' })).fill('2');
        await expect(page).toHaveURL(/[?&]x=2(&|$)/);
        const status = (await panel(page).getByRole('status').textContent())!;

        await page.reload();
        await expect(page).toHaveURL(/\/consultas\?/);
        await expect(page.getByLabel(fill(en['query.value'], { unit: 'mm' }))).toHaveValue('2');
        await expect(panel(page).getByRole('status')).toHaveText(status);
    });

    test('answers every kind of question', async ({ page }) => {
        await openQuery(page);
        await page.getByLabel(fill(en['query.value'], { unit: 'mm' })).fill('0');

        for (const type of Object.keys(QUESTIONS) as (keyof typeof QUESTIONS)[]) {
            await chooseQuestion(page, type);
            await expect(page).toHaveURL(new RegExp(`[?&]qt=${type}(&|$)`));
            await expect(panel(page).getByRole('status')).toBeVisible();
            await expect(results(page).first()).toBeVisible();
        }

        // Ranking keeps the top 10 by default, ordered highest first.
        await chooseQuestion(page, 'ranking');
        await expect(results(page)).toHaveCount(10);
        const numbers = await results(page)
            .locator('.ranking-value')
            .allInnerTexts()
            .then((texts) => texts.map((text) => Number.parseFloat(text)));
        expect(numbers).toEqual([...numbers].sort((a, b) => b - a));

        // A comparison shows signed changes, and never offers totals.
        await chooseQuestion(page, 'compare');
        await expect(results(page).first().locator('.ranking-value')).toHaveText(/^[+−-]?\d|^0/);
        await page.getByRole('button', { name: en['query.statistic'] }).click();
        await expect(
            page.getByRole('listbox', { name: en['query.statistic'] }).getByRole('option')
        ).toHaveText([
            en['query.statistic.mean'],
            en['query.statistic.max'],
            en['query.statistic.min'],
        ]);
    });

    test('a period preset changes the dates', async ({ page, index }) => {
        const et0 = metricOf(index, 'et0');
        await openQuery(page);
        await page.getByRole('button', { name: fill(en['query.preset'], { count: 7 }) }).click();
        const url = new URL(page.url());
        expect(url.searchParams.get('t')).toBe(et0.lastDate);
        const days = (Date.parse(et0.lastDate!) - Date.parse(url.searchParams.get('f')!)) / 864e5;
        expect(days).toBeLessThanOrEqual(6);
    });

    test('clicking a result shows it above the results and the map is one click away', async ({
        page,
    }) => {
        await openQuery(page);
        await page.getByLabel(fill(en['query.value'], { unit: 'mm' })).fill('0');
        const first = results(page).first();
        const name = await first.locator('.ranking-name > span').first().innerText();
        await first.getByRole('button').click();

        await expect(panel(page).getByRole('heading', { level: 2, name })).toBeVisible();
        await expect(panel(page).getByText(en['query.result'])).toBeVisible();
        // The results stay in view under the selection.
        await expect(first).toBeVisible();
        await expect(first.getByRole('button')).toHaveAttribute('aria-current', 'true');

        // The map keeps the selection; Back returns to the same question.
        const queryUrl = page.url();
        await page.getByRole('link', { name: en['nav.map'] }).click();
        await expect(page).toHaveURL(/\/mapa\?/);
        await expect(page.getByRole('region', { name: en['timeline.label'] })).toBeVisible();
        await expect(panel(page).getByRole('heading', { level: 2, name })).toBeVisible();
        await page.goBack();
        await expect(page).toHaveURL(queryUrl);
        await expect(panel(page).getByRole('status')).toBeVisible();
    });

    test('exports the results as CSV, JSON, SVG and PNG', async ({ page }) => {
        await openQuery(page);
        await page.getByLabel(fill(en['query.value'], { unit: 'mm' })).fill('0');
        const count = await results(page).count();
        const exportButton = (name: string) =>
            panel(page)
                .getByRole('group', { name: en['export.label'] })
                .getByRole('button', { name, exact: true });
        const save = async (name: string) => {
            const [file] = await Promise.all([
                page.waitForEvent('download'),
                exportButton(name).click(),
            ]);
            return {
                name: file.suggestedFilename(),
                text: await readFile((await file.path())!, 'utf8'),
            };
        };

        const csv = await save(en['export.csv']);
        expect(csv.name).toMatch(
            /^ipma-mais-et0-threshold-\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}\.csv$/
        );
        const lines = csv.text.replace(/^﻿/, '').trim().split(/\r\n/);
        expect(lines[0]).toBe('rank,dico,municipality,district,value,unit,days_with_data');
        expect(lines).toHaveLength(count + 1);

        const json = JSON.parse((await save(en['export.json'])).text);
        expect(json.query.type).toBe('threshold');
        expect(json.query.value).toBe(0);
        expect(json.results).toHaveLength(count);
        expect(json.results[0]).toMatchObject({ rank: 1 });

        const svg = await save(en['export.svg']);
        expect(svg.name).toMatch(/\.svg$/);
        expect(svg.text).toContain('<svg');
        expect(svg.text.match(/<path /g)?.length).toBeGreaterThan(200);

        const [png] = await Promise.all([
            page.waitForEvent('download'),
            exportButton(en['export.png']).click(),
        ]);
        expect(png.suggestedFilename()).toMatch(/\.png$/);
        const bytes = await readFile((await png.path())!);
        expect(bytes.subarray(1, 4).toString()).toBe('PNG');
    });
});
