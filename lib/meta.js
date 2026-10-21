import fs from 'fs';
import path from 'path';
import { DATA_DIR } from './store.js';

/**
 * `data/meta.json` records, per source, when it last ran successfully and the newest
 * observation date it returned, so staleness is visible without digging through logs.
 */
export function metaPath(dataDir = DATA_DIR) {
    return path.join(dataDir, 'meta.json');
}

export function readMeta(dataDir = DATA_DIR) {
    const file = metaPath(dataDir);
    if (!fs.existsSync(file)) return { sources: {} };
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

export function updateSourceMeta(source, fields, dataDir = DATA_DIR) {
    const meta = readMeta(dataDir);
    meta.sources[source] = { ...meta.sources[source], ...fields };
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(metaPath(dataDir), JSON.stringify(meta, null, 4) + '\n');
}
