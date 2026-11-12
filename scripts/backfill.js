/**
 * One-off imports of history that the daily Collect run can't reach, into the canonical store.
 *
 *   node scripts/backfill.js prec-archive   # daily rain, 2025, from IPMA's frozen per-municipality CSVs
 *
 * Safe to repeat: rows go through `upsertSeries`, so an identical row is a no-op. Run from
 * the Backfill workflow (the cloud sandbox can't reach IPMA).
 */
import { parseCsv, toNumber } from '../lib/csv.js';
import { isIsoDate } from '../lib/dates.js';
import { fetchText, mapLimit } from '../lib/fetch.js';
import { loadMunicipalities } from '../lib/municipalities.js';
import { upsertSeries } from '../lib/store.js';
import { collectSmi, smiUrl } from '../sources/ipma-smi.js';
import { storeVhi, VHI_START } from '../sources/ipma-vhi.js';
import { featureInfoUrl, parseFeatureInfoGml, WMS } from '../sources/ipma-wms.js';
import POINTS from '../inputs/municipality-points.json' with { type: 'json' };

const JOBS = {
    'prec-archive': precArchive,
    'probe-wms': probeWms,
    'probe-smi': probeSmi,
    'vhi-archive': vhiArchive,
    smi: smiNow,
};

/** Soil moisture for the days IPMA's latest run holds (the same step Collect runs). */
async function smiNow() {
    const result = await collectSmi(POINTS, new Date().toISOString().slice(0, 10));
    console.log(
        `smi: latest ${result.latest}, ${result.added} added, ${result.changed} changed, ${result.failed.length} failed`
    );
    for (const line of result.failed) console.log(`::warning::smi ${line}`);
}

/** Every VHI week since 2018: one request per municipality and year (about 2,500). */
async function vhiArchive() {
    const thisYear = new Date().getUTCFullYear();
    const ranges = [];
    for (let year = Number(VHI_START.slice(0, 4)); year <= thisYear; year++) {
        ranges.push([`${year}-01-01`, `${year}-12-31`]);
    }
    const result = await storeVhi(POINTS, ranges);
    console.log(
        `vhi-archive: latest ${result.latest}, ${result.added} added, ${result.changed} changed, ` +
            `${result.failed.length} requests failed`
    );
    for (const line of result.failed) console.log(`::warning::vhi-archive ${line}`);
    if (result.failed.length > 50)
        throw new Error(`${result.failed.length} requests failed; run it again`);
}

/** Prints what the SMI service answers for Lisboa with no time, a range, and one day. */
async function probeSmi() {
    const lisboa = POINTS['1106'];
    for (const time of [undefined, '2026-10-01/2026-11-30', '2026-11-10']) {
        try {
            const text = await fetchText(smiUrl(lisboa, time), { timeoutMs: 30000 });
            console.log(`smi ${time}: ${text.slice(0, 1500)}`);
        } catch (error) {
            console.log(`smi ${time}: ${error.message}`);
        }
    }
}

/** Checks whether a time range returns one feature per date, for VHI and the old daily rain layer. */
async function probeWms() {
    const lisboa = POINTS['1106'];
    const probes = [
        [WMS.vhi, 'vhi.obsRem.7days.vector.conc', '2018-01-01/2018-12-31'],
        [WMS.vhi, 'vhi.obsRem.7days.vector.conc', '2026-11-04'],
        [WMS.vhi, 'vhi.obsRem.7days.vector.conc', '2026-11-03'],
        [WMS.vhi, 'vhi.obsRem.7days.vector.conc', '2026-10-28'],
        [WMS.vhi, 'vhi.obsRem.7days.vector.conc', '2018-01-07'],
        [WMS.vhi, 'vhi.obsRem.7days.vector.conc', '2018-01-14'],
        [WMS.vhi, 'vhi.obsRem.7days.vector.conc', '2026-11-04T00:00:00Z'],
        [WMS.vhi, 'vhi.obsRem.7days.vector.conc', undefined],
        [WMS.precipitation, 'mrrto.obsSup.daily.vector.conc', '2025-11-10'],
        [WMS.precipitation, 'mrrto.obsSup.daily.vector.conc', '2015-11-10'],
    ];
    for (const [service, layer, time] of probes) {
        try {
            const features = await getFeatureInfo(service, layer, lisboa, time, {
                timeoutMs: 60000,
                retries: 1,
            });
            const dates = features.map((f) => f.date?.slice(0, 10)).sort();
            console.log(
                `${layer} ${time}: ${features.length} features, ${dates[0]}..${dates.at(-1)}; ` +
                    `first ${JSON.stringify(features[0])}; dates ${dates.slice(0, 12).join(' ')}`
            );
        } catch (error) {
            console.log(`${layer} ${time}: ${error.message}`);
        }
    }
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
