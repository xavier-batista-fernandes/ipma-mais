import { mapLimit } from '../lib/fetch.js';
import { dateCoverage, upsertSeries } from '../lib/store.js';
import { getFeatureInfo, WMS } from './ipma-wms.js';

/**
 * IPMA's Vegetation Health Index (VHI, NOAA/NESDIS, from satellite): 0–100, where low values
 * mean stressed vegetation (drought). IPMA publishes a per-municipality mean about once a week,
 * since 2018-01-07, only on its map server. A GetFeatureInfo with a time range returns one
 * feature per published date, so one request per municipality covers a whole period.
 * Each feature has `mean` (the VHI) and `ps35`/`ps15` (% of the area below 35 and 15, not kept).
 */
export const VHI_LAYER = 'vhi.obsRem.7days.vector.conc';
export const VHI_START = '2018-01-01';

/** One municipality's VHI rows between two ISO dates (both included), oldest first. */
export async function fetchVhiRange(point, from, to) {
    const features = await getFeatureInfo(WMS.vhi, VHI_LAYER, point, `${from}/${to}`);
    return featuresToRows(features);
}

export function featuresToRows(features) {
    const rows = new Map();
    for (const feature of features) {
        const date = String(feature.date ?? '').slice(0, 10);
        const mean = Number(feature.mean);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || feature.mean === '' || !Number.isFinite(mean))
            continue;
        rows.set(date, { date, mean, min: null, max: null, std: null, source: 'api' });
    }
    return [...rows.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Reads `ranges` (`[[from, to]]`) for every municipality in `points` (`{ dico: [lon, lat] }`)
 * and stores the rows. Returns `{ added, changed, latest, failed: [message] }`.
 */
export async function storeVhi(points, ranges, { concurrency = 6 } = {}) {
    const result = { added: 0, changed: 0, latest: '', failed: [] };
    const jobs = Object.entries(points).flatMap(([dico, point]) =>
        ranges.map(([from, to]) => ({ dico, point, from, to }))
    );
    await mapLimit(jobs, concurrency, async ({ dico, point, from, to }) => {
        let rows;
        try {
            rows = await fetchVhiRange(point, from, to);
        } catch (error) {
            result.failed.push(`${dico} ${from}/${to}: ${error.message}`);
            return;
        }
        const r = upsertSeries('vhi', dico, rows);
        result.added += r.added;
        result.changed += r.changed;
        for (const { date } of rows) if (date > result.latest) result.latest = date;
    });
    return result;
}

/**
 * The daily Collect step: look up the newest weeks at one municipality first, and read every
 * municipality only when a date shows up that most of them don't have yet.
 */
export async function collectVhi(points, today) {
    const from = new Date(Date.parse(today) - 35 * 86400000).toISOString().slice(0, 10);
    const [probeDico, probePoint] = Object.entries(points)[0];
    const recent = await fetchVhiRange(probePoint, from, today);
    const latest = recent.at(-1)?.date ?? '';
    const dicos = Object.keys(points);
    const coverage = dateCoverage('vhi', dicos);
    const missing = recent.some(({ date }) => (coverage.get(date) ?? 0) < dicos.length * 0.95);
    if (!missing)
        return { added: 0, changed: 0, latest, failed: [], skipped: true, probe: probeDico };
    return { ...(await storeVhi(points, [[from, today]])), skipped: false };
}
