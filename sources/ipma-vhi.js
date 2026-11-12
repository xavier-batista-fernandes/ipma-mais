import { mapLimit } from '../lib/fetch.js';
import { dateCoverage, upsertSeries } from '../lib/store.js';
import { getFeatureInfo, layerTimes, WMS } from './ipma-wms.js';

/**
 * IPMA's Vegetation Health Index (VHI, NOAA/NESDIS, from satellite): 0–100, where low values
 * mean stressed vegetation (drought). IPMA publishes a per-municipality mean every 7 days,
 * since 2018-01-07, only on its map server, so each week is read one municipality at a time.
 * Fields: `mean` (VHI), `ps35` and `ps15` (% of the area below 35 and 15, kept as `max` and
 * `min` would be misleading, so only `mean` is stored).
 */
export const VHI_LAYER = 'vhi.obsRem.7days.vector.conc';

/** The weeks the layer holds, oldest first, as ISO dates. */
export async function vhiWeeks() {
    const times = await layerTimes(WMS.vhi, (name) => name === VHI_LAYER);
    return expandTimes(times[VHI_LAYER]);
}

/**
 * Expands a WMS time dimension (`2018-01-07/2026-11-04/P7D`, a comma list, or a mix) into
 * ISO dates.
 */
export function expandTimes(extent) {
    if (!extent)
        throw new Error('The VHI layer has no time dimension; its structure may have changed.');
    const dates = [];
    for (const part of extent.split(',')) {
        const [start, end, period] = part.trim().split('/');
        if (!end) {
            dates.push(start.slice(0, 10));
            continue;
        }
        const days = Number(period?.match(/^P(\d+)D$/)?.[1] ?? 1);
        for (
            let t = Date.parse(start.slice(0, 10));
            t <= Date.parse(end.slice(0, 10));
            t += days * 86400000
        ) {
            dates.push(new Date(t).toISOString().slice(0, 10));
        }
    }
    return [...new Set(dates)].sort();
}

/** One municipality's VHI for one week, or null when the map server has none there. */
export async function fetchVhi(point, date) {
    const fields = await getFeatureInfo(WMS.vhi, VHI_LAYER, point, date);
    if (!fields) return null;
    const mean = Number(fields.mean);
    return Number.isFinite(mean)
        ? { date, mean, min: null, max: null, std: null, source: 'api' }
        : null;
}

/**
 * Reads one week for every municipality in `points` (`{ dico: [lon, lat] }`). Returns
 * `{ rows: Map dico → row, failed: [message] }`; a week counts as complete only when every
 * municipality answered.
 */
export async function fetchVhiWeek(date, points, concurrency = 8) {
    const rows = new Map();
    const failed = [];
    await mapLimit(Object.entries(points), concurrency, async ([dico, point]) => {
        try {
            const row = await fetchVhi(point, date);
            if (row) rows.set(dico, row);
            else failed.push(`${dico}: no value`);
        } catch (error) {
            failed.push(`${dico}: ${error.message}`);
        }
    });
    return { rows, failed };
}

/**
 * Reads every week in `weeks` that isn't stored yet (95% of municipalities have it) and stores
 * it, oldest first, until `deadline` (ms timestamp) passes. A week where more than 5% of
 * municipalities failed is not stored, so the next run tries it again.
 * Returns `{ weeks: [{ date, stored, failed }], added, changed, remaining }`.
 */
export async function storeVhiWeeks(weeks, points, { deadline = Infinity, log = () => {} } = {}) {
    const dicos = Object.keys(points);
    const coverage = dateCoverage('vhi', dicos);
    const missing = weeks.filter((date) => (coverage.get(date) ?? 0) < dicos.length * 0.95);
    const result = { weeks: [], added: 0, changed: 0, remaining: 0 };

    for (const [i, date] of missing.entries()) {
        if (Date.now() > deadline) {
            result.remaining = missing.length - i;
            break;
        }
        const { rows, failed } = await fetchVhiWeek(date, points);
        const stored = failed.length <= dicos.length * 0.05;
        if (stored) {
            for (const [dico, row] of rows) {
                const r = upsertSeries('vhi', dico, [row]);
                result.added += r.added;
                result.changed += r.changed;
            }
        }
        result.weeks.push({ date, stored, failed });
        log(
            `vhi ${date}: ${rows.size} values, ${failed.length} failed${stored ? '' : ' (not stored)'}${failed.length ? ` e.g. ${failed[0]}` : ''}`
        );
    }
    return result;
}
