import { fetchText, mapLimit } from '../lib/fetch.js';
import { upsertSeries } from '../lib/store.js';

/**
 * IPMA's soil moisture index (SMI): water in the root zone between wilting point (0) and field
 * capacity (1), from ECMWF's model at about 16 km, served by IPMA's cs2 map server for the last
 * days and a few days ahead. It is a grid, so IPMA+ samples it at a point inside each
 * municipality (`inputs/municipality-points.json`). GetFeatureInfo answers in JSON:
 * `[{ variablename: 'smi', data: { '100': { '2026-11-12T00:00:00Z': '0.625640', … } } }]`,
 * keyed by layer (soil level) and time. A time range returns every day the latest run holds
 * (about 20 days back and 9 ahead), so one request per municipality covers a run. Only days up
 * to today are stored; IPMA+ keeps the value as a percentage (SMI × 100).
 */
const SERVICE = 'https://cs2.ipma.pt/wms';
const DATASET = 'smi-forecast_10p1d-continental-ecmwf';
const LAYER = `PT:IPMA:CDG:LAYER:${DATASET}_latest`;
/** The level the IPMA page shows. */
export const SMI_LEVEL = '100';

const HALF = 0.001;

export function smiUrl([lon, lat], time) {
    const params = new URLSearchParams({
        dataset: DATASET,
        SERVICE: 'WMS',
        VERSION: '1.1.1',
        REQUEST: 'GetFeatureInfo',
        LAYERS: LAYER,
        QUERY_LAYERS: LAYER,
        STYLES: '',
        SRS: 'EPSG:4326',
        BBOX: [lon - HALF, lat - HALF, lon + HALF, lat + HALF].join(','),
        WIDTH: '3',
        HEIGHT: '3',
        X: '1',
        Y: '1',
        INFO_FORMAT: 'application/json',
        dim_layer: SMI_LEVEL,
    });
    if (time) params.set('TIME', time);
    return `${SERVICE}?${params}`;
}

/** `[[date, value]]` from a GetFeatureInfo answer, one per day, for the SMI level. */
export function parseSmi(json) {
    const items = typeof json === 'string' ? JSON.parse(json) : json;
    const item = Array.isArray(items) ? items.find((i) => i.variablename === 'smi') : null;
    const byTime = item?.data?.[SMI_LEVEL];
    if (!byTime || typeof byTime !== 'object') {
        throw new Error('Unexpected IPMA SMI answer; its structure may have changed.');
    }
    return Object.entries(byTime)
        .map(([time, value]) => [time.slice(0, 10), Number(value)])
        .filter(([, value]) => Number.isFinite(value))
        .sort(([a], [b]) => a.localeCompare(b));
}

export async function fetchSmi(point, time) {
    return parseSmi(await fetchText(smiUrl(point, time), { timeoutMs: 30000, retries: 4 }));
}

/**
 * Reads every municipality in `points` and stores its days up to `today`.
 * Returns `{ added, changed, latest, failed: [message] }`.
 */
export async function collectSmi(points, today, { concurrency = 6 } = {}) {
    const from = new Date(Date.parse(today) - 60 * 86400000).toISOString().slice(0, 10);
    const to = new Date(Date.parse(today) + 15 * 86400000).toISOString().slice(0, 10);
    const result = { added: 0, changed: 0, latest: '', failed: [] };
    await mapLimit(Object.entries(points), concurrency, async ([dico, point]) => {
        let days;
        try {
            days = await fetchSmi(point, `${from}/${to}`);
        } catch (error) {
            result.failed.push(`${dico}: ${error.message}`);
            return;
        }
        const rows = days
            .filter(([date]) => date <= today)
            .map(([date, value]) => ({
                date,
                mean: Math.round(value * 10000) / 100,
                min: null,
                max: null,
                std: null,
                source: 'api',
            }));
        const r = upsertSeries('smi', dico, rows);
        result.added += r.added;
        result.changed += r.changed;
        for (const { date } of rows) if (date > result.latest) result.latest = date;
    });
    return result;
}
