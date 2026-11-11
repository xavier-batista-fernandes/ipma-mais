/**
 * Collects IPMA data into the canonical store (`data/{metric}/{dico}.csv`).
 *
 *   node scripts/collect.js   # daily ET0 from the agrometeorology page
 *
 * IPMA's open-data API (ET0, max and min temperature) stopped publishing in November 2025; the
 * rows it gave are kept in `data/` with source `api`, but it is no longer collected.
 *
 * Exits non-zero when the page fails or returns data that does not validate, so the
 * GitHub Actions run goes red instead of silently committing nothing.
 */
import fs from 'fs';
import path from 'path';
import { daysBetween, todayIso } from '../lib/dates.js';
import { updateSourceMeta } from '../lib/meta.js';
import { createResolver, loadMunicipalities } from '../lib/municipalities.js';
import { DATA_DIR, upsertSeries } from '../lib/store.js';
import { fetchEt0Page, snapshotToRows } from '../sources/ipma-page.js';

const STALE_AFTER_DAYS = 14;
const RAW_PAGE_DIR = path.join(DATA_DIR, 'raw', 'et0-page');

const municipalities = loadMunicipalities();
const resolver = createResolver(municipalities);
const summary = [];
const warnings = [];
const errors = [];

await collectPage();

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
