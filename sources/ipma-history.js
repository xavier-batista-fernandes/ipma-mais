import { mapLimit } from '../lib/fetch.js';
import { readSeries, upsertSeries } from '../lib/store.js';
import { featuresToRows } from './ipma-vhi.js';
import { getFeatureInfo, WMS } from './ipma-wms.js';

/**
 * IPMA's older daily per-municipality layers on its map server: the same series as the frozen
 * per-municipality CSVs, but back to 2000-01-01 (they stop on 2025-11-11). A query with no time
 * and a large FEATURE_COUNT returns a municipality's whole series: one feature per day with
 * `mean` and `date`. Only the mean is published here, so min/max/std stay empty.
 */
export const HISTORY_LAYERS = {
    prec: [WMS.precipitation, 'mrrto.obsSup.daily.vector.conc'],
    tmax: [WMS.temperature, 'mtxmx.obsSup.daily.vector.conc'],
    tmin: [WMS.temperature, 'mtnmn.obsSup.daily.vector.conc'],
};
export const HISTORY_START = '2000-01-01';

/**
 * Stores one metric's history for every municipality in `points`, without touching days the
 * store already has (those came from richer sources). Returns `{ added, first, last, failed }`.
 */
export async function storeHistory(metric, points, { concurrency = 3, log = () => {} } = {}) {
    const [service, layer] = HISTORY_LAYERS[metric];
    const result = { added: 0, first: '', last: '', failed: [] };
    await mapLimit(Object.entries(points), concurrency, async ([dico, point]) => {
        let rows;
        try {
            const features = await getFeatureInfo(service, layer, point, undefined, {
                timeoutMs: 180000,
                retries: 3,
                featureCount: 20000,
            });
            rows = featuresToRows(features).filter((row) => row.date >= HISTORY_START);
        } catch (error) {
            result.failed.push(`${dico}: ${error.message}`);
            return;
        }
        const existing = readSeries(metric, dico);
        const fresh = rows.filter((row) => !existing.has(row.date));
        result.added += upsertSeries(metric, dico, fresh).added;
        if (rows.length > 0) {
            if (!result.first || rows[0].date < result.first) result.first = rows[0].date;
            if (rows.at(-1).date > result.last) result.last = rows.at(-1).date;
        }
        log(
            `${metric} ${dico}: ${rows.length} days (${rows[0]?.date}..${rows.at(-1)?.date}), ${fresh.length} new`
        );
    });
    return result;
}
