/**
 * Collects IPMA data into the canonical store (`data/{metric}/{dico}.csv`).
 *
 *   node scripts/collect.js --source page   # daily ET0 from the agrometeorology page
 *   node scripts/collect.js --source api    # ET0, max and min temperature from open-data
 *   node scripts/collect.js                 # both
 *
 * Exits non-zero when a source fails or returns data that does not validate, so the
 * GitHub Actions run goes red instead of silently committing nothing.
 */
import fs from 'fs';
import path from 'path';
import { parseArgs } from 'util';
import { daysBetween, todayIso } from '../lib/dates.js';
import { mapLimit } from '../lib/fetch.js';
import { updateSourceMeta } from '../lib/meta.js';
import { METRICS } from '../lib/metrics.js';
import { createResolver, loadMunicipalities } from '../lib/municipalities.js';
import { DATA_DIR, upsertSeries } from '../lib/store.js';
import { fetchApiSeries } from '../sources/ipma-api.js';
import { fetchEt0Page, snapshotToRows } from '../sources/ipma-page.js';

const { values: args } = parseArgs({
    options: { source: { type: 'string', default: 'all' } },
});

const STALE_AFTER_DAYS = 14;
const MAX_API_FAILURE_RATIO = 0.1;
const RAW_PAGE_DIR = path.join(DATA_DIR, 'raw', 'et0-page');

const municipalities = loadMunicipalities();
const resolver = createResolver(municipalities);
const summary = [];
const warnings = [];
const errors = [];

const sources = args.source === 'all' ? ['page', 'api'] : [args.source];
for (const source of sources) {
    if (source === 'page') await collectPage();
    else if (source === 'api') await collectApi();
    else errors.push(`Unknown source "${source}" (use page, api or all).`);
}

report();
process.exit(errors.length > 0 ? 1 : 0);

async function collectPage() {
    let days;
    try {
        days = await fetchEt0Page();
    } catch (error) {
        errors.push(`page: ${error.message}`);
        return;
    }

    const rowsByDico = new Map();
    for (const { date, snapshot } of days) {
        const entries = snapshotToRows(date, snapshot);
        const problems = validatePageEntries(entries);
        if (problems.length > 0) {
            errors.push(`page ${date}: ${problems.join('; ')}`);
            continue;
        }

        for (const { dico, row } of entries) {
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
    let changed = 0;
    for (const [dico, rows] of rowsByDico) {
        const result = upsertSeries('et0', dico, rows);
        added += result.added;
        changed += result.changed;
    }

    const latest = days
        .map((day) => day.date)
        .sort()
        .at(-1);
    summary.push(
        `page: ${days.length} day(s), latest ${latest}, ${added} added, ${changed} changed`
    );
    checkStale('page', latest);
    updateSourceMeta('page', { lastSuccess: new Date().toISOString(), latestDate: latest });
}

function validatePageEntries(entries) {
    const problems = [];
    const seen = new Set();

    for (const { dico, name, district, row } of entries) {
        const known = resolver.byDico.get(dico);
        if (!known) problems.push(`unknown DICO ${dico} (${district}/${name})`);
        else if (resolver.resolve(district, name)?.dico !== dico) {
            problems.push(`DICO ${dico} is ${known.name}, page says ${district}/${name}`);
        }
        if (!Number.isFinite(row.mean)) problems.push(`non-numeric value for ${dico}`);
        seen.add(dico);
    }

    if (seen.size !== municipalities.length) {
        problems.push(`${seen.size} municipalities, expected ${municipalities.length}`);
    }
    return problems;
}

async function collectApi() {
    const jobs = METRICS.flatMap((metric) => municipalities.map((m) => ({ metric, m })));
    const results = await mapLimit(jobs, 6, ({ metric, m }) => fetchApiSeries(metric, m));

    for (const metric of METRICS) {
        const mine = results.filter((r) => r.item.metric === metric);
        const failed = mine.filter((r) => r.error);
        let added = 0;
        let changed = 0;
        let latest = null;

        for (const { item, value } of mine.filter((r) => !r.error)) {
            const result = upsertSeries(metric.id, item.m.dico, value);
            added += result.added;
            changed += result.changed;
            for (const row of value) if (!latest || row.date > latest) latest = row.date;
        }

        summary.push(
            `api ${metric.id}: ${mine.length - failed.length}/${mine.length} fetched, ` +
                `latest ${latest ?? 'none'}, ${added} added, ${changed} changed`
        );

        if (failed.length > 0) {
            const sample = failed.slice(0, 3).map((r) => r.error.message);
            const message = `api ${metric.id}: ${failed.length} request(s) failed, e.g. ${sample.join(' | ')}`;
            if (failed.length / mine.length > MAX_API_FAILURE_RATIO) errors.push(message);
            else warnings.push(message);
        }

        if (latest) {
            checkStale(`api ${metric.id}`, latest);
            updateSourceMeta(`api:${metric.id}`, {
                lastSuccess: new Date().toISOString(),
                latestDate: latest,
            });
        }
    }
}

function checkStale(label, latest) {
    const age = daysBetween(latest, todayIso());
    if (age > STALE_AFTER_DAYS) {
        warnings.push(
            `${label}: newest observation is ${latest} (${age} days old); IPMA may have stopped updating it.`
        );
    }
}

function report() {
    const lines = [
        '### IPMA+ collection',
        '',
        ...summary.map((line) => `- ${line}`),
        ...warnings.map((line) => `- ⚠️ ${line}`),
        ...errors.map((line) => `- ❌ ${line}`),
    ];
    console.log(lines.join('\n'));

    for (const line of warnings) console.log(`::warning::${line}`);
    for (const line of errors) console.log(`::error::${line}`);

    if (process.env.GITHUB_STEP_SUMMARY) {
        fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n') + '\n');
    }
}
