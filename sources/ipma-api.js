import { parseCsv, toNumber } from '../lib/csv.js';
import { isIsoDate } from '../lib/dates.js';
import { fetchText } from '../lib/fetch.js';

const BASE_URL = 'https://api.ipma.pt/open-data/observation/climate';

/**
 * IPMA open-data climate observations: one CSV per metric and municipality, holding a
 * rolling window of daily statistics (`date,minimum,maximum,range,mean,std`).
 */
export function apiUrl(metric, municipality) {
    const { districtSlug, dico, slug } = municipality;
    return `${BASE_URL}/${metric.apiPath}/${districtSlug}/${metric.apiPrefix}-${dico}-${slug}.csv`;
}

export function parseApiCsv(text) {
    return parseCsv(text)
        .map((row) => ({
            date: row.date,
            mean: toNumber(row.mean),
            min: toNumber(row.minimum),
            max: toNumber(row.maximum),
            std: toNumber(row.std),
            source: 'api',
        }))
        .filter((row) => isIsoDate(row.date) && row.mean !== null);
}

export async function fetchApiSeries(metric, municipality) {
    return parseApiCsv(await fetchText(apiUrl(metric, municipality)));
}
