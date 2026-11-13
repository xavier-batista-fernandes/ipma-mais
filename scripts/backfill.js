/**
 * One-off imports of history that the daily Collect run can't reach, into the canonical store.
 *
 *   node scripts/backfill.js prec-archive   # daily rain, Aug-Nov 2025, from IPMA's frozen per-municipality CSVs
 *   node scripts/backfill.js vhi-archive    # every VHI week since 2018
 *   node scripts/backfill.js prec-history   # daily rain since 2000 (also tmax-history, tmin-history)
 *   node scripts/backfill.js smi collect    # today's soil moisture, then a full Collect run
 *
 * Safe to repeat: rows go through `upsertSeries`, so an identical row is a no-op. Run from
 * the Backfill workflow (the cloud sandbox can't reach IPMA).
 */
import { parseCsv, toNumber } from '../lib/csv.js';
import { isIsoDate } from '../lib/dates.js';
import { fetchText, mapLimit } from '../lib/fetch.js';
import { loadMunicipalities } from '../lib/municipalities.js';
import { upsertSeries } from '../lib/store.js';
import { storeHistory } from '../sources/ipma-history.js';
import { collectSmi } from '../sources/ipma-smi.js';
import { storeVhi } from '../sources/ipma-vhi.js';
import POINTS from '../inputs/municipality-points.json' with { type: 'json' };

const JOBS = {
    'prec-archive': precArchive,
    'vhi-archive': vhiArchive,
    smi: smiNow,
    'prec-history': () => history('prec'),
    'tmax-history': () => history('tmax'),
    'tmin-history': () => history('tmin'),
    // The whole daily collection, as the Collect workflow runs it. It exits the process, so list it last.
    collect: () => import('./collect.js'),
};

/** Daily history since 2000 from IPMA's map server (see sources/ipma-history.js). */
async function history(metric) {
    const result = await storeHistory(metric, POINTS, { log: console.log });
    console.log(
        `${metric}-history: ${result.first}..${result.last}, ${result.added} added, ${result.failed.length} failed`
    );
    for (const line of result.failed) console.log(`::warning::${metric}-history ${line}`);
    if (result.failed.length > 0)
        throw new Error(`${result.failed.length} municipalities failed; run it again`);
}

/** Soil moisture for the days IPMA's latest run holds (the same step Collect runs). */
async function smiNow() {
    const result = await collectSmi(POINTS, new Date().toISOString().slice(0, 10));
    console.log(
        `smi: latest ${result.latest}, ${result.added} added, ${result.changed} changed, ${result.failed.length} failed`
    );
    for (const line of result.failed) console.log(`::warning::smi ${line}`);
}

/** Every VHI week since 2018: one request per municipality returns its whole history. */
async function vhiArchive() {
    const result = await storeVhi(POINTS);
    console.log(
        `vhi-archive: latest ${result.latest}, ${result.added} added, ${result.changed} changed, ` +
            `${result.failed.length} municipalities failed`
    );
    for (const line of result.failed) console.log(`::warning::vhi-archive ${line}`);
    if (result.failed.length > 0)
        throw new Error(`${result.failed.length} municipalities failed; run it again`);
}

/**
 * IPMA's older per-municipality open-data CSVs (`date,minimum,maximum,range,mean,std`) stopped
 * updating on 2025-11-11 but are still served, with the months before that. The same files
 * gave IPMA+ its 2025 ET0 and temperature history; rain was never imported until now.
 */
async function precArchive() {
    const base = 'https://api.ipma.pt/open-data/observation/climate/precipitation-total';
    const municipalities = loadMunicipalities();
    let added = 0;
    let changed = 0;
    let first = '';
    let last = '';
    const failed = [];

    await mapLimit(municipalities, 6, async ({ dico, slug, districtSlug }) => {
        let text;
        try {
            text = await fetchText(`${base}/${districtSlug}/mrrto-${dico}-${slug}.csv`);
        } catch (error) {
            failed.push(`${dico}: ${error.message}`);
            return;
        }
        const rows = parseCsv(text)
            .map((r) => ({
                date: r.date,
                mean: toNumber(r.mean),
                min: toNumber(r.minimum),
                max: toNumber(r.maximum),
                std: toNumber(r.std),
                source: 'api',
            }))
            .filter((r) => isIsoDate(r.date) && r.mean !== null);
        const result = upsertSeries('prec', dico, rows);
        added += result.added;
        changed += result.changed;
        for (const { date } of rows) {
            if (!first || date < first) first = date;
            if (date > last) last = date;
        }
    });

    console.log(`prec-archive: ${first}..${last}, ${added} added, ${changed} changed`);
    for (const line of failed) console.log(`::warning::prec-archive ${line}`);
    if (failed.length > municipalities.length / 10)
        throw new Error(`${failed.length} files failed`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const names = process.argv.slice(2);
    const unknown = names.filter((name) => !(name in JOBS));
    if (names.length === 0 || unknown.length > 0) {
        console.error(`Usage: node scripts/backfill.js <${Object.keys(JOBS).join('|')}>…`);
        process.exit(1);
    }
    for (const name of names) await JOBS[name]();
}
