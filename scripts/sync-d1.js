/**
 * Copies the canonical store in `data/` into the Cloudflare D1 database the Worker reads.
 *
 *   node scripts/sync-d1.js --local | --remote [--dry-run]
 *
 * Only days whose content changed are written: the script reads every day's hash from D1
 * first (about 1,300 rows), so a normal collection writes about 7 rows plus the index. That
 * keeps it far inside D1's free tier (100,000 rows written a day). Runs `wrangler` from
 * `worker/`, which needs CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID for --remote.
 */
import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { parseArgs } from 'util';
import { buildApi } from '../lib/api.js';

const WORKER_DIR = path.join(import.meta.dirname, '..', 'worker');
const DATABASE = 'DB';

/** Builds the upserts for every day and document whose hash differs from `known`. */
export function buildSyncSql(
    { index, metrics },
    known = new Map(),
    now = new Date().toISOString()
) {
    const statements = [];
    let changed = 0;

    for (const [metric, { days, dates }] of Object.entries(metrics)) {
        for (const date of dates) {
            const { mean, detail } = days.get(date);
            const meanJson = JSON.stringify(mean);
            const detailJson = JSON.stringify(detail);
            const hash = sha1(meanJson + detailJson);
            if (known.get(`${metric}/${date}`) === hash) continue;

            changed++;
            statements.push(
                `INSERT INTO day (metric, date, mean, detail, hash, updated_at) VALUES (${[
                    metric,
                    date,
                    meanJson,
                    detailJson,
                    hash,
                    now,
                ]
                    .map(sqlString)
                    .join(', ')}) ON CONFLICT (metric, date) DO UPDATE SET mean = excluded.mean, ` +
                    `detail = excluded.detail, hash = excluded.hash, updated_at = excluded.updated_at;`
            );
        }
    }

    // `generatedAt` changes on every build, so leave it out of the hash.
    const { generatedAt: _, ...stable } = index;
    const indexHash = sha1(JSON.stringify(stable));
    if (known.get('document/index') !== indexHash) {
        statements.push(
            `INSERT INTO document (key, body, hash, updated_at) VALUES ('index', ${sqlString(
                JSON.stringify({ ...index, generatedAt: now })
            )}, ${sqlString(indexHash)}, ${sqlString(now)}) ON CONFLICT (key) DO UPDATE SET ` +
                `body = excluded.body, hash = excluded.hash, updated_at = excluded.updated_at;`
        );
    }

    return { sql: statements.join('\n'), days: changed, statements: statements.length };
}

function sqlString(value) {
    return `'${String(value).replaceAll("'", "''")}'`;
}

function sha1(text) {
    return crypto.createHash('sha1').update(text).digest('hex');
}

function wrangler(args) {
    return execFileSync('npx', ['wrangler', ...args], {
        cwd: WORKER_DIR,
        encoding: 'utf-8',
        maxBuffer: 64 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'inherit'],
    });
}

function readKnownHashes(target) {
    const output = wrangler([
        'd1',
        'execute',
        DATABASE,
        target,
        '--json',
        '--command',
        "SELECT metric || '/' || date AS key, hash FROM day UNION ALL SELECT 'document/' || key, hash FROM document",
    ]);
    const [{ results }] = JSON.parse(output);
    return new Map(results.map((row) => [row.key, row.hash]));
}

function main() {
    const { values: args } = parseArgs({
        options: {
            local: { type: 'boolean', default: false },
            remote: { type: 'boolean', default: false },
            'dry-run': { type: 'boolean', default: false },
        },
    });
    if (args.local === args.remote) throw new Error('Pass exactly one of --local or --remote.');
    const target = args.remote ? '--remote' : '--local';

    const known = readKnownHashes(target);
    const { sql, days, statements } = buildSyncSql(buildApi(), known);
    console.log(`D1 (${target.slice(2)}): ${known.size} row(s) known, ${days} day(s) to write.`);
    if (statements === 0 || args['dry-run']) return;

    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ipma-d1-')), 'sync.sql');
    fs.writeFileSync(file, sql);
    wrangler(['d1', 'execute', DATABASE, target, '--yes', '--file', file]);
    console.log(`Wrote ${statements} statement(s).`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
