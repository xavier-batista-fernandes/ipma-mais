import { readMeta } from './meta.js';
import { METRICS } from './metrics.js';
import { loadMunicipalities } from './municipalities.js';
import { DATA_DIR, readSeries } from './store.js';

/**
 * Everything the API serves, built from the canonical store in `data/`, for
 * `scripts/sync-d1.js` to copy into Cloudflare D1.
 *
 * Returns `{ index, metrics }`, where each `metrics[id]` holds:
 *   days:   Map date → { mean: { dico: mean }, detail: { dico: [min, max, std, source] } }
 *   dates:  sorted ISO dates
 */
export function buildApi({ dataDir = DATA_DIR, municipalities = loadMunicipalities() } = {}) {
    const index = {
        generatedAt: new Date().toISOString(),
        metrics: [],
        municipalities: municipalities.map(({ dico, name, district }) => ({
            dico,
            name,
            district,
        })),
        sources: readMeta(dataDir).sources,
    };
    const metrics = {};

    for (const metric of METRICS) {
        const days = new Map();

        for (const { dico } of municipalities) {
            const rows = [...readSeries(metric.id, dico, dataDir).values()];
            if (rows.length === 0) continue;

            for (const r of rows) {
                if (!days.has(r.date)) days.set(r.date, { mean: {}, detail: {} });
                const day = days.get(r.date);
                day.mean[dico] = round(r.mean);
                day.detail[dico] = [round(r.min), round(r.max), r.std, r.source];
            }
        }

        const dates = [...days.keys()].sort();
        metrics[metric.id] = { days, dates };
        index.metrics.push({
            id: metric.id,
            label: metric.label,
            unit: metric.unit,
            firstDate: dates[0] ?? null,
            lastDate: dates.at(-1) ?? null,
            domain: metric.domain ?? colourDomain(days),
            dates,
        });
    }

    return { index, metrics };
}

/**
 * The value range the app's colour scale spans: the 2nd–98th percentile of every value ever
 * recorded, so colours mean the same thing on every day and a few outliers don't wash it out.
 */
function colourDomain(days) {
    const values = [...days.values()]
        .flatMap((day) => Object.values(day.mean))
        .sort((a, b) => a - b);
    if (values.length === 0) return null;
    const at = (q) => values[Math.min(values.length - 1, Math.floor(q * values.length))];
    return [Math.floor(at(0.02)), Math.ceil(at(0.98))];
}

export function round(value) {
    return value === null ? null : Math.round(value * 100) / 100;
}
