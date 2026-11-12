import { fetchText } from '../lib/fetch.js';

/**
 * IPMA's soil moisture index (SMI): water in the root zone between wilting point (0) and field
 * capacity (1), from ECMWF's model at about 16 km, served by IPMA's cs2 map server for the last
 * days and a few days ahead. It is a grid, so IPMA+ samples it at a point inside each
 * municipality (`inputs/municipality-points.json`). GetFeatureInfo answers in JSON:
 * `[{ variablename: 'smi', data: { '100': { '2026-11-12T00:00:00Z': '0.625640', … } } }]`,
 * keyed by layer (soil level) and time.
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
