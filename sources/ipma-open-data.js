import { parseCsv, toNumber } from '../lib/csv.js';
import { isIsoDate } from '../lib/dates.js';
import { fetchText } from '../lib/fetch.js';

const BASE_URL = 'https://api.ipma.pt/open-data/observation/climate';

/**
 * IPMA's consolidated per-municipality open-data files. Each holds a rolling 20-day window,
 * one line per municipality and day, with statistics (`mean_X,std_X,min_X,max_X,…`) of each
 * variable X interpolated (IDW) from the surface stations onto the municipality's grid cells.
 * `fields` maps an IPMA+ metric to the variable that feeds it.
 */
export const OPEN_DATA_FILES = [
    {
        id: 'temperature',
        url: `${BASE_URL}/temperature/t2m-p1d-continental-obssup-idw-concelhos-20d.csv`,
        // Daily maximum, mean and minimum air temperature at 2 m.
        fields: { tmax: 'maxt2m', tmean: 'meant2m', tmin: 'mint2m' },
    },
    {
        id: 'precipitation',
        url: `${BASE_URL}/precipitation/prec-p1d-continental-obssup-idw-concelhos-20d.csv`,
        // Total precipitation over the day (`tp`, mm). The file also has the day's highest
        // rain rate (`maxprate`), which IPMA+ does not keep.
        fields: { prec: 'tp' },
    },
];

/**
 * Parses one consolidated file (`time,zname,zid,mean_X,std_X,min_X,max_X,…`) into
 * `{ dico, name, metric, row }` entries. `time` is `YYYY-MM-DD 00:00:00+00:00`; `zid` is
 * the DICO code.
 */
export function parseOpenDataCsv(text, fields) {
    const records = parseCsv(text);
    const first = Object.values(fields)[0];
    if (records.length === 0 || !('zid' in records[0]) || !(`mean_${first}` in records[0])) {
        throw new Error('Unexpected IPMA open-data CSV header; its structure may have changed.');
    }

    const entries = [];
    for (const record of records) {
        const date = String(record.time).slice(0, 10);
        if (!isIsoDate(date)) continue;

        for (const [metric, field] of Object.entries(fields)) {
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

export async function fetchOpenDataFile(file) {
    return parseOpenDataCsv(await fetchText(file.url, { timeoutMs: 60000 }), file.fields);
}
