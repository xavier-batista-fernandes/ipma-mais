import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { parseCsv } from '../lib/csv.js';
import { daysBetween, isIsoDate, parsePtDate } from '../lib/dates.js';
import { fetchText } from '../lib/fetch.js';
import { createResolver, loadMunicipalities } from '../lib/municipalities.js';
import { readSeries, upsertSeries } from '../lib/store.js';
import { parseEt0Page, snapshotToRows } from '../sources/ipma-page.js';
import { parseFireRisk } from '../sources/ipma-fire-risk.js';
import { OPEN_DATA_FILES, parseOpenDataCsv } from '../sources/ipma-open-data.js';
import { buildSyncSql } from '../scripts/sync-d1.js';

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

describe('ipma open-data files', () => {
    const fields = (id) => OPEN_DATA_FILES.find((file) => file.id === id).fields;
    const parseTemperatureCsv = (text) => parseOpenDataCsv(text, fields('temperature'));

    const header =
        'time,zname,zid,mean_maxt2m,std_maxt2m,min_maxt2m,max_maxt2m,percentile_25_maxt2m,median_maxt2m,percentile_75_maxt2m,' +
        'mean_meant2m,std_meant2m,min_meant2m,max_meant2m,percentile_25_meant2m,median_meant2m,percentile_75_meant2m,' +
        'mean_mint2m,std_mint2m,min_mint2m,max_mint2m,percentile_25_mint2m,median_mint2m,percentile_75_mint2m';

    it('turns each temperature line into tmax, tmean and tmin rows keyed by DICO and day', () => {
        const csv =
            header +
            '\n2026-11-10 00:00:00+00:00,Águeda,0101,18.80,0.93,16.29,20.20,18.21,19.00,19.56,' +
            '16.00,0.74,13.52,17.09,15.56,16.14,16.61,13.90,0.77,11.39,15.14,13.42,14.04,14.52\n';
        assert.deepEqual(parseTemperatureCsv(csv), [
            {
                dico: '0101',
                name: 'Águeda',
                metric: 'tmax',
                row: {
                    date: '2026-11-10',
                    mean: 18.8,
                    min: 16.29,
                    max: 20.2,
                    std: 0.93,
                    source: 'api',
                },
            },
            {
                dico: '0101',
                name: 'Águeda',
                metric: 'tmean',
                row: {
                    date: '2026-11-10',
                    mean: 16,
                    min: 13.52,
                    max: 17.09,
                    std: 0.74,
                    source: 'api',
                },
            },
            {
                dico: '0101',
                name: 'Águeda',
                metric: 'tmin',
                row: {
                    date: '2026-11-10',
                    mean: 13.9,
                    min: 11.39,
                    max: 15.14,
                    std: 0.77,
                    source: 'api',
                },
            },
        ]);
    });

    it('turns each precipitation line into a prec row, keeping dry days as 0 mm', () => {
        const csv =
            'time,zname,zid,mean_maxprate,std_maxprate,min_maxprate,max_maxprate,percentile_25_maxprate,median_maxprate,percentile_75_maxprate,' +
            'mean_tp,std_tp,min_tp,max_tp,percentile_25_tp,median_tp,percentile_75_tp\n' +
            '2026-10-20 00:00:00+00:00,Águeda,0101,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00\n' +
            '2026-10-21 00:00:00+00:00,Águeda,0101,8.56,0.78,6.72,10.26,7.95,8.54,9.19,1.49,0.11,1.27,1.83,1.41,1.48,1.56\n';
        assert.deepEqual(
            parseOpenDataCsv(csv, fields('precipitation')).map((entry) => [
                entry.metric,
                entry.row,
            ]),
            [
                ['prec', { date: '2026-10-20', mean: 0, min: 0, max: 0, std: 0, source: 'api' }],
                [
                    'prec',
                    {
                        date: '2026-10-21',
                        mean: 1.49,
                        min: 1.27,
                        max: 1.83,
                        std: 0.11,
                        source: 'api',
                    },
                ],
            ]
        );
    });

    it('skips empty values and fails loudly on a new layout', () => {
        const csv = header + '\n2026-11-10 00:00:00+00:00,Águeda,0101' + ','.repeat(21) + '\n';
        assert.deepEqual(parseTemperatureCsv(csv), []);
        assert.throws(() => parseTemperatureCsv('date,mean\n2026-01-01,1\n'), /structure/);
    });
});

describe('ipma fire risk', () => {
    it("stores each municipality's class under the day it is forecast for", () => {
        const json = {
            dataPrev: '2026-11-11',
            dataRun: '2026-11-10',
            local: {
                '0101': { data: { rcm: 1 }, dico: '0101', latitude: 40.58, longitude: -8.44 },
                1106: { data: { rcm: 3 }, latitude: 38.75, longitude: -9.15 },
            },
        };
        assert.deepEqual(parseFireRisk(json), [
            {
                dico: '0101',
                row: {
                    date: '2026-11-11',
                    mean: 1,
                    min: null,
                    max: null,
                    std: null,
                    source: 'api',
                },
            },
            {
                dico: '1106',
                row: {
                    date: '2026-11-11',
                    mean: 3,
                    min: null,
                    max: null,
                    std: null,
                    source: 'api',
                },
            },
        ]);
        assert.throws(() => parseFireRisk({ local: {} }), /structure/);
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
});

describe('D1 sync', () => {
    const api = {
        index: { generatedAt: 'x', metrics: [], municipalities: [], sources: {} },
        metrics: {
            et0: {
                dates: ['2026-11-01', '2026-11-02'],
                days: new Map([
                    [
                        '2026-11-01',
                        { mean: { '0101': 2.1 }, detail: { '0101': [null, null, null, "page's"] } },
                    ],
                    [
                        '2026-11-02',
                        { mean: { '0101': 2.3 }, detail: { '0101': [null, null, null, 'page'] } },
                    ],
                ]),
            },
        },
    };

    it('writes every day and the index the first time, with quotes escaped', () => {
        const { sql, days, statements } = buildSyncSql(api, new Map(), 'now');
        assert.equal(days, 2);
        assert.equal(statements, 3);
        assert.match(sql, /"page''s"/);
        assert.match(sql, /INSERT INTO document/);
    });

    it('writes nothing when every hash is already in D1', () => {
        const hashes = new Map(
            [...buildSyncSql(api, new Map(), 'now').sql.matchAll(/'([0-9a-f]{40})'/g)].map(
                (m, i) => [['et0/2026-11-01', 'et0/2026-11-02', 'document/index'][i], m[1]]
            )
        );
        assert.equal(buildSyncSql(api, hashes, 'now').statements, 0);
    });

    it('rewrites only the day that changed', () => {
        const first = buildSyncSql(api, new Map(), 'now').sql;
        const hashes = new Map(
            [...first.matchAll(/'([0-9a-f]{40})'/g)].map((m, i) => [
                ['et0/2026-11-01', 'et0/2026-11-02', 'document/index'][i],
                m[1],
            ])
        );
        api.metrics.et0.days.get('2026-11-02').mean['0101'] = 2.4;
        const { days, sql } = buildSyncSql(api, hashes, 'now');
        assert.equal(days, 1);
        assert.match(sql, /'2026-11-02'/);
        assert.doesNotMatch(sql, /'2026-11-01'/);
    });
});
