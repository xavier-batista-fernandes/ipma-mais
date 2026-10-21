import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { parseCsv } from '../lib/csv.js';
import { daysBetween, isIsoDate, parsePtDate } from '../lib/dates.js';
import { fetchText, mapLimit } from '../lib/fetch.js';
import { createResolver, loadMunicipalities } from '../lib/municipalities.js';
import { readSeries, upsertSeries } from '../lib/store.js';
import { apiUrl, parseApiCsv } from '../sources/ipma-api.js';
import { parseEt0Page, snapshotToRows } from '../sources/ipma-page.js';

const row = (date, mean, source = 'page') => ({
    date,
    mean,
    min: null,
    max: null,
    std: null,
    source,
});

describe('dates', () => {
    it('parses IPMA Portuguese dates', () => {
        assert.equal(parsePtDate('Sáb, 14 Mar 2026'), '2026-03-14');
        assert.equal(parsePtDate('Ter, 28 Out 2025'), '2025-10-28');
        assert.equal(parsePtDate('Dom, 7 Dez 2025'), '2025-12-07');
    });

    it('rejects unknown or impossible dates', () => {
        assert.throws(() => parsePtDate('14 Foo 2026'));
        assert.throws(() => parsePtDate('Qui, 31 Fev 2026'));
        assert.throws(() => parsePtDate(undefined));
    });

    it('validates ISO dates and counts days', () => {
        assert.ok(isIsoDate('2026-02-28'));
        assert.ok(!isIsoDate('2026-02-30'));
        assert.equal(daysBetween('2026-02-27', '2026-03-01'), 2);
    });
});

describe('csv', () => {
    it('parses headers, CRLF, BOM and a missing trailing newline', () => {
        const rows = parseCsv('﻿date,mean\r\n2026-01-01,1.5\r\n2026-01-02,2');
        assert.deepEqual(rows, [
            { date: '2026-01-01', mean: '1.5' },
            { date: '2026-01-02', mean: '2' },
        ]);
    });
});

describe('ipma page', () => {
    const snapshot = (data, mean) => ({
        data,
        et0: [
            {
                JCOD: 'a1',
                MEAN: mean,
                DICO: '1106',
                DI: '11',
                CONCELHO: 'LISBOA',
                Distrito: 'LISBOA',
            },
        ],
    });
    const html = (...blocks) =>
        blocks.map((b, i) => `<script>et0[${i}] = ${JSON.stringify(b)};</script>`).join('\n');

    it('reads every day block with its own date', () => {
        const days = parseEt0Page(
            html(snapshot('Seg, 19 Out 2026', 3.28), snapshot('Dom, 18 Out 2026', 3.44))
        );
        assert.deepEqual(
            days.map((d) => [d.index, d.date]),
            [
                [0, '2026-10-19'],
                [1, '2026-10-18'],
            ]
        );
        assert.deepEqual(
            snapshotToRows(days[0].date, days[0].snapshot)[0].row,
            row('2026-10-19', 3.28)
        );
    });

    it('fails loudly when the page structure changes', () => {
        assert.throws(
            () => parseEt0Page('<html>nothing here</html>'),
            /structure may have changed/
        );
    });
});

describe('ipma api', () => {
    it('builds the open-data URL', () => {
        const lisboa = { dico: '1106', slug: 'lisboa', districtSlug: 'lisboa' };
        assert.equal(
            apiUrl({ apiPath: 'temperature-max', apiPrefix: 'mtxmx' }, lisboa),
            'https://api.ipma.pt/open-data/observation/climate/temperature-max/lisboa/mtxmx-1106-lisboa.csv'
        );
    });

    it('maps open-data columns and drops unusable rows', () => {
        const csv =
            'date,minimum,maximum,range,mean,std\n2025-09-20,3.1,3.6,0.5,3.37,0.11\nbad,1,1,0,1,0\n2025-09-21,,,,,\n';
        assert.deepEqual(parseApiCsv(csv), [
            { date: '2025-09-20', mean: 3.37, min: 3.1, max: 3.6, std: 0.11, source: 'api' },
        ]);
    });
});

describe('store', () => {
    let dir;
    beforeEach(() => (dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ipma-store-'))));
    afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

    it('adds rows sorted by date and is idempotent', () => {
        assert.deepEqual(
            upsertSeries('et0', '1106', [row('2026-01-02', 2), row('2026-01-01', 1)], dir),
            {
                added: 2,
                changed: 0,
            }
        );
        assert.deepEqual(upsertSeries('et0', '1106', [row('2026-01-01', 1)], dir), {
            added: 0,
            changed: 0,
        });

        const text = fs.readFileSync(path.join(dir, 'et0', '1106.csv'), 'utf-8');
        assert.equal(
            text,
            'date,mean,min,max,std,source\n2026-01-01,1,,,,page\n2026-01-02,2,,,,page\n'
        );
    });

    it('lets the API replace page values but never the other way round', () => {
        upsertSeries('et0', '1106', [row('2026-01-01', 1, 'page')], dir);
        assert.equal(upsertSeries('et0', '1106', [row('2026-01-01', 1.2, 'api')], dir).changed, 1);
        assert.equal(upsertSeries('et0', '1106', [row('2026-01-01', 9, 'page')], dir).changed, 0);
        assert.equal(readSeries('et0', '1106', dir).get('2026-01-01').mean, 1.2);
    });

    it('rejects invalid rows', () => {
        assert.throws(() => upsertSeries('et0', '1106', [row('2026-13-01', 1)], dir));
        assert.throws(() => upsertSeries('et0', '1106', [row('2026-01-01', NaN)], dir));
    });
});

describe('municipalities', () => {
    it('has all 278 with Cartis names', () => {
        const all = loadMunicipalities();
        assert.equal(all.length, 278);
        assert.equal(new Set(all.map((m) => m.dico)).size, 278);
    });

    it('resolves every spelling IPMA uses', () => {
        const { resolve } = createResolver();
        assert.equal(resolve('faro', 'vila-real-de-santo-antonio').dico, '0816');
        assert.equal(resolve('FARO', 'VILA REAL DE SANTO ANTÓNIO').dico, '0816');
        assert.equal(
            resolve('BRAGANÇA', 'FREIXO DE ESPADA À CINTA').name,
            'Freixo de Espada à Cinta'
        );
        assert.equal(resolve('lisboa', 'atlantis'), undefined);
    });
});

describe('fetch', () => {
    const realFetch = globalThis.fetch;
    afterEach(() => (globalThis.fetch = realFetch));

    it('retries server errors, then succeeds', async () => {
        let calls = 0;
        globalThis.fetch = async () =>
            ++calls < 3 ? new Response('', { status: 503 }) : new Response('ok');
        assert.equal(await fetchText('https://x', { backoffMs: 1 }), 'ok');
        assert.equal(calls, 3);
    });

    it('does not retry a 404', async () => {
        let calls = 0;
        globalThis.fetch = async () => (calls++, new Response('', { status: 404 }));
        await assert.rejects(fetchText('https://x', { backoffMs: 1 }), /HTTP 404/);
        assert.equal(calls, 1);
    });

    it('limits concurrency and keeps order', async () => {
        let running = 0;
        let peak = 0;
        const results = await mapLimit([1, 2, 3, 4, 5], 2, async (n) => {
            peak = Math.max(peak, ++running);
            await new Promise((r) => setTimeout(r, 5));
            running--;
            if (n === 3) throw new Error('boom');
            return n * 10;
        });
        assert.equal(peak, 2);
        assert.deepEqual(
            results.map((r) => r.value ?? r.error.message),
            [10, 20, 'boom', 40, 50]
        );
    });
});
