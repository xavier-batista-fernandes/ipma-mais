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

/** One municipality's whole VHI history (a query with no time returns every week). */
export async function fetchVhiHistory(point) {
    const features = await getFeatureInfo(WMS.vhi, VHI_LAYER, point, undefined, {
        timeoutMs: 60000,
    });
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
 * Reads every municipality in `points` (`{ dico: [lon, lat] }`) and stores its whole history.
 * Returns `{ added, changed, latest, failed: [message] }`.
 */
export async function storeVhi(points, { concurrency = 6 } = {}) {
    const result = { added: 0, changed: 0, latest: '', failed: [] };
    await mapLimit(Object.entries(points), concurrency, async ([dico, point]) => {
        let rows;
        try {
            rows = await fetchVhiHistory(point);
        } catch (error) {
            result.failed.push(`${dico}: ${error.message}`);
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
 * The daily Collect step: look at one municipality first, and read every municipality only when
 * it has a week that most of them don't have yet (IPMA adds one about once a week).
 */
export async function collectVhi(points) {
    const [, probePoint] = Object.entries(points)[0];
    const rows = await fetchVhiHistory(probePoint);
    const latest = rows.at(-1)?.date ?? '';
    const dicos = Object.keys(points);
    const coverage = dateCoverage('vhi', dicos);
    const missing = rows.some(({ date }) => (coverage.get(date) ?? 0) < dicos.length * 0.95);
    if (!missing) return { added: 0, changed: 0, latest, failed: [], skipped: true };
    return { ...(await storeVhi(points)), skipped: false };
}
