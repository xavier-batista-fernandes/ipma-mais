/**
 * One-off: converts the legacy `outputs/` folders into the canonical store.
 *
 * - `outputs/{evapotranspiration,temperature-max,temperature-min}/{district}/{slug}.csv`
 *   (open-data API rows) → `data/{et0,tmax,tmin}/{dico}.csv`, source `api`.
 * - `outputs/et0-raw-json/*.json` (page snapshots) → `data/et0/{dico}.csv`, source `page`,
 *   dated by the payload's own `data` field, and archived under `data/raw/et0-page/`.
 *
 * `outputs/et0-v2/*.csv` is deliberately not read: its rows were dated by the runner's clock
 * and contain duplicates, while the raw snapshots carry the real date for the same values.
 *
 * Safe to re-run: every write is an upsert.
 */
import fs from 'fs';
import path from 'path';
import { parsePtDate } from '../lib/dates.js';
import { createResolver } from '../lib/municipalities.js';
import { DATA_DIR, upsertSeries } from '../lib/store.js';
import { parseApiCsv } from '../sources/ipma-api.js';
import { snapshotToRows } from '../sources/ipma-page.js';

const OUTPUTS_DIR = path.join(import.meta.dirname, '..', 'outputs');
const RAW_PAGE_DIR = path.join(DATA_DIR, 'raw', 'et0-page');
const LEGACY_API_DIRS = {
    evapotranspiration: 'et0',
    'temperature-max': 'tmax',
    'temperature-min': 'tmin',
};

const resolver = createResolver();
const problems = [];

migratePageSnapshots();
for (const [folder, metric] of Object.entries(LEGACY_API_DIRS)) migrateApiFolder(folder, metric);

if (problems.length > 0) {
    console.error(problems.map((p) => `❌ ${p}`).join('\n'));
    process.exit(1);
}

function migratePageSnapshots() {
    const dir = path.join(OUTPUTS_DIR, 'et0-raw-json');
    const files = fs
        .readdirSync(dir)
        .filter((f) => f.endsWith('.json'))
        .sort();
    const dates = new Set();
    const rowsByDico = new Map();

    for (const file of files) {
        const snapshot = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'));
        const date = parsePtDate(snapshot.data);
        dates.add(date);

        for (const { dico, name, district, row } of snapshotToRows(date, snapshot)) {
            if (resolver.resolve(district, name)?.dico !== dico) {
                problems.push(`${file}: DICO ${dico} does not match ${district}/${name}`);
                continue;
            }
            if (!rowsByDico.has(dico)) rowsByDico.set(dico, []);
            rowsByDico.get(dico).push(row);
        }

        fs.mkdirSync(RAW_PAGE_DIR, { recursive: true });
        fs.writeFileSync(
            path.join(RAW_PAGE_DIR, `${date}.json`),
            JSON.stringify(snapshot, null, 2) + '\n'
        );
    }

    let added = 0;
    for (const [dico, rows] of rowsByDico) added += upsertSeries('et0', dico, rows).added;

    console.log(
        `page: ${files.length} snapshot(s) → ${dates.size} distinct day(s), ${added} row(s) added`
    );
}

function migrateApiFolder(folder, metric) {
    const dir = path.join(OUTPUTS_DIR, folder);
    let files = 0;
    let added = 0;
    let changed = 0;

    for (const district of fs.readdirSync(dir)) {
        for (const file of fs.readdirSync(path.join(dir, district))) {
            const municipality = resolver.resolve(district, file.replace(/\.csv$/, ''));
            if (!municipality) {
                problems.push(`${folder}/${district}/${file}: unknown municipality`);
                continue;
            }

            const rows = parseApiCsv(fs.readFileSync(path.join(dir, district, file), 'utf-8'));
            const result = upsertSeries(metric, municipality.dico, rows);
            files++;
            added += result.added;
            changed += result.changed;
        }
    }

    console.log(`api ${metric}: ${files} file(s), ${added} row(s) added, ${changed} replaced`);
}
