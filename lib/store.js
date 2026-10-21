import fs from 'fs';
import path from 'path';
import { parseCsv, stringifyCsv, toNumber } from './csv.js';
import { isIsoDate } from './dates.js';

export const DATA_DIR = path.join(import.meta.dirname, '..', 'data');

export const COLUMNS = ['date', 'mean', 'min', 'max', 'std', 'source'];

/**
 * Where a row came from. When two sources have a value for the same day, the higher rank
 * wins: the official open-data API over the agrometeorology web page.
 */
export const SOURCE_RANK = { page: 1, api: 2 };

export function seriesPath(metric, dico, dataDir = DATA_DIR) {
    return path.join(dataDir, metric, `${dico}.csv`);
}

/** Reads one municipality's series as a Map of ISO date → row. Missing file → empty map. */
export function readSeries(metric, dico, dataDir = DATA_DIR) {
    const file = seriesPath(metric, dico, dataDir);
    if (!fs.existsSync(file)) return new Map();

    const rows = parseCsv(fs.readFileSync(file, 'utf-8')).map((row) => ({
        date: row.date,
        mean: toNumber(row.mean),
        min: toNumber(row.min),
        max: toNumber(row.max),
        std: toNumber(row.std),
        source: row.source,
    }));
    return new Map(rows.map((row) => [row.date, row]));
}

/**
 * Merges `rows` into the stored series and rewrites it sorted by date. Safe to repeat:
 * an identical row is a no-op, and a row from a lower-ranked source never replaces one
 * from a higher-ranked source. Returns how many rows were added and changed.
 */
export function upsertSeries(metric, dico, rows, dataDir = DATA_DIR) {
    const series = readSeries(metric, dico, dataDir);
    let added = 0;
    let changed = 0;

    for (const row of rows) {
        validateRow(row);
        const existing = series.get(row.date);

        if (!existing) {
            series.set(row.date, row);
            added++;
        } else if (
            SOURCE_RANK[row.source] >= SOURCE_RANK[existing.source] &&
            !sameValues(existing, row)
        ) {
            series.set(row.date, row);
            changed++;
        }
    }

    if (added > 0 || changed > 0) {
        const sorted = [...series.values()].sort((a, b) => a.date.localeCompare(b.date));
        const file = seriesPath(metric, dico, dataDir);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, stringifyCsv(COLUMNS, sorted));
    }

    return { added, changed };
}

function sameValues(a, b) {
    return COLUMNS.every((column) => (a[column] ?? null) === (b[column] ?? null));
}

function validateRow(row) {
    if (!isIsoDate(row.date)) throw new Error(`Invalid date "${row.date}"`);
    if (typeof row.mean !== 'number' || !Number.isFinite(row.mean)) {
        throw new Error(`Invalid mean "${row.mean}" on ${row.date}`);
    }
    if (!(row.source in SOURCE_RANK)) throw new Error(`Unknown source "${row.source}"`);
}
