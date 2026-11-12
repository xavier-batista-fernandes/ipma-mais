import { parseCsv, toNumber } from '../lib/csv.js';
import { isIsoDate } from '../lib/dates.js';
import { fetchText } from '../lib/fetch.js';

export const TEMPERATURE_URL =
    'https://api.ipma.pt/open-data/observation/climate/temperature/t2m-p1d-continental-obssup-idw-concelhos-20d.csv';

/**
 * Which column family of IPMA's consolidated temperature file feeds each IPMA+ metric.
 * The file has, per municipality and day, statistics of the daily maximum (`maxt2m`),
 * mean (`meant2m`) and minimum (`mint2m`) air temperature interpolated (IDW) from the
 * surface stations onto the municipality's grid cells.
 */
const FIELDS = { tmax: 'maxt2m', tmin: 'mint2m' };

/**
 * Parses IPMA's rolling 20-day temperature file
 * (`time,zname,zid,mean_maxt2m,std_maxt2m,min_maxt2m,max_maxt2m,…`) into
 * `{ dico, name, metric, row }` entries. `time` is `YYYY-MM-DD 00:00:00+00:00`; `zid` is
 * the DICO code.
 */
export function parseTemperatureCsv(text) {
    const records = parseCsv(text);
    if (records.length === 0 || !('zid' in records[0]) || !('mean_maxt2m' in records[0])) {
        throw new Error('Unexpected IPMA temperature CSV header; its structure may have changed.');
    }

    const entries = [];
    for (const record of records) {
        const date = String(record.time).slice(0, 10);
        if (!isIsoDate(date)) continue;

        for (const [metric, field] of Object.entries(FIELDS)) {
            const mean = toNumber(record[`mean_${field}`]);
            if (mean === null) continue;
            entries.push({
                dico: String(record.zid).padStart(4, '0'),
                name: record.zname,
                metric,
                row: {
                    date,
                    mean,
                    min: toNumber(record[`min_${field}`]),
                    max: toNumber(record[`max_${field}`]),
                    std: toNumber(record[`std_${field}`]),
                    source: 'api',
                },
            });
        }
    }
    return entries;
}

export async function fetchTemperature() {
    return parseTemperatureCsv(await fetchText(TEMPERATURE_URL, { timeoutMs: 60000 }));
}
