/**
 * Builds the static JSON the web app reads, from the canonical store in `data/`.
 *
 *   node scripts/build-api.js [--out dist/api]
 *
 * Output (all generated, never committed):
 *   index.json                    metrics (dates, colour domain), municipalities, source status
 *   {metric}/days/{date}.json     { date, values: { dico: mean } }  → one request per map
 *   {metric}/series/{dico}.json   { dico, rows: [[date, mean, min, max]] } → one per chart
 *   {metric}/latest.json          same shape as a day file, for the most recent day
 */
import fs from 'fs';
import path from 'path';
import { parseArgs } from 'util';
import { readMeta } from '../lib/meta.js';
import { METRICS } from '../lib/metrics.js';
import { loadMunicipalities } from '../lib/municipalities.js';
import { readSeries } from '../lib/store.js';

const { values: args } = parseArgs({
    options: { out: { type: 'string', default: path.join('dist', 'api') } },
});

const outDir = path.resolve(args.out);
const municipalities = loadMunicipalities();

fs.rmSync(outDir, { recursive: true, force: true });

const index = {
    generatedAt: new Date().toISOString(),
    metrics: [],
    municipalities: municipalities.map(({ dico, name, district }) => ({ dico, name, district })),
    sources: readMeta().sources,
};

for (const metric of METRICS) {
    const byDate = new Map();

    for (const { dico } of municipalities) {
        const rows = [...readSeries(metric.id, dico).values()];
        if (rows.length === 0) continue;

        writeJson(path.join(metric.id, 'series', `${dico}.json`), {
            dico,
            rows: rows.map((r) => [r.date, round(r.mean), round(r.min), round(r.max)]),
        });

        for (const row of rows) {
            if (!byDate.has(row.date)) byDate.set(row.date, {});
            byDate.get(row.date)[dico] = round(row.mean);
        }
    }

    const dates = [...byDate.keys()].sort();
    for (const date of dates) {
        writeJson(path.join(metric.id, 'days', `${date}.json`), { date, values: byDate.get(date) });
    }

    if (dates.length > 0) {
        const latest = dates.at(-1);
        writeJson(path.join(metric.id, 'latest.json'), {
            date: latest,
            values: byDate.get(latest),
        });
    }

    index.metrics.push({
        id: metric.id,
        label: metric.label,
        unit: metric.unit,
        firstDate: dates[0] ?? null,
        lastDate: dates.at(-1) ?? null,
        domain: colourDomain(byDate),
        dates,
    });
    console.log(`${metric.id}: ${dates.length} day(s), ${dates[0]} → ${dates.at(-1)}`);
}

writeJson('index.json', index);
console.log(`API written to ${outDir}`);

/**
 * The value range the app's colour scale spans: the 2nd–98th percentile of every value ever
 * recorded, so colours mean the same thing on every day and a few outliers don't wash it out.
 */
function colourDomain(byDate) {
    const values = [...byDate.values()].flatMap((day) => Object.values(day)).sort((a, b) => a - b);
    if (values.length === 0) return null;
    const at = (q) => values[Math.min(values.length - 1, Math.floor(q * values.length))];
    return [Math.floor(at(0.02)), Math.ceil(at(0.98))];
}

function round(value) {
    return value === null ? null : Math.round(value * 100) / 100;
}

function writeJson(relativePath, value) {
    const file = path.join(outDir, relativePath);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(value));
}
