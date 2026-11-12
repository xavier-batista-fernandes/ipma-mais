import { isIsoDate } from '../lib/dates.js';
import { fetchText } from '../lib/fetch.js';

const BASE_URL = 'https://api.ipma.pt/open-data/forecast/meteorology/rcm';

/**
 * IPMA's fire-risk forecast (RCM, "risco de incêndio rural"): one class per municipality, from
 * 1 (reduced) to 5 (maximum). `rcm-d0.json` is for today and `rcm-d1.json` for tomorrow; IPMA
 * runs it once a day. IPMA keeps no history, so IPMA+ builds one by storing every day's
 * forecast under the day it is for. Tomorrow's value is replaced by the next day's `d0`.
 */
export const FIRE_RISK_DAYS = [0, 1];

/** Parses `{ dataPrev, local: { dico: { data: { rcm } } } }` into `{ dico, row }` entries. */
export function parseFireRisk(json) {
    const { dataPrev, local } = typeof json === 'string' ? JSON.parse(json) : json;
    if (!isIsoDate(dataPrev) || !local || typeof local !== 'object') {
        throw new Error('Unexpected IPMA fire-risk JSON; its structure may have changed.');
    }
    const entries = Object.entries(local).map(([key, entry]) => ({
        dico: String(entry.dico ?? key).padStart(4, '0'),
        row: {
            date: dataPrev,
            mean: Number(entry.data?.rcm),
            min: null,
            max: null,
            std: null,
            source: 'api',
        },
    }));
    return entries.sort((a, b) => a.dico.localeCompare(b.dico));
}

export async function fetchFireRisk(day) {
    return parseFireRisk(await fetchText(`${BASE_URL}/rcm-d${day}.json`));
}
