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
 *   {metric}/values.json          { dates, values: { dico: [mean|null per date] } } → queries
 *
 * The Cloudflare Worker serves the same shapes from D1 under /v1 (see worker/).
 */
import fs from 'fs';
import path from 'path';
import { parseArgs } from 'util';
import { buildApi } from '../lib/api.js';

const { values: args } = parseArgs({
    options: { out: { type: 'string', default: path.join('dist', 'api') } },
});

const outDir = path.resolve(args.out);
fs.rmSync(outDir, { recursive: true, force: true });

const { index, metrics } = buildApi();

for (const [id, { series, days, dates }] of Object.entries(metrics)) {
    for (const [dico, rows] of series) {
        writeJson(path.join(id, 'series', `${dico}.json`), { dico, rows });
    }
    for (const date of dates) {
        writeJson(path.join(id, 'days', `${date}.json`), { date, values: days.get(date).mean });
    }

    // Every value in one file, so the app can run queries over any period with one request.
    const values = {};
    for (const dico of series.keys()) {
        values[dico] = dates.map((date) => days.get(date).mean[dico] ?? null);
    }
    writeJson(path.join(id, 'values.json'), { dates, values });

    if (dates.length > 0) {
        const latest = dates.at(-1);
        writeJson(path.join(id, 'latest.json'), { date: latest, values: days.get(latest).mean });
    }
    console.log(`${id}: ${dates.length} day(s), ${dates[0]} → ${dates.at(-1)}`);
}

writeJson('index.json', index);
console.log(`API written to ${outDir}`);

function writeJson(relativePath, value) {
    const file = path.join(outDir, relativePath);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(value));
}
