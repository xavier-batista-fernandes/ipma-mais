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
import { smiUrl } from '../sources/ipma-smi.js';
import { storeVhiWeeks, vhiWeeks } from '../sources/ipma-vhi.js';
import { getFeatureInfo, layerTimes, WMS } from '../sources/ipma-wms.js';
import POINTS from '../inputs/municipality-points.json' with { type: 'json' };

const JOBS = {
    'prec-archive': precArchive,
    'probe-wms': probeWms,
    'probe-smi': probeSmi,
    'vhi-archive': vhiArchive,
};

/**
 * Every VHI week since 2018 (about 460 weeks × 278 municipalities). Stops starting new weeks
 * after BACKFILL_MINUTES (default 240) so the job can commit; run it again to continue.
 */
async function vhiArchive() {
    const minutes = Number(process.env.BACKFILL_MINUTES ?? 240);
    const weeks = await vhiWeeks();
    console.log(`vhi: ${weeks.length} weeks, ${weeks[0]}..${weeks.at(-1)}`);
    const result = await storeVhiWeeks(weeks, POINTS, {
        deadline: Date.now() + minutes * 60000,
        log: console.log,
    });
    const skipped = result.weeks.filter((w) => !w.stored).length;
    console.log(
        `vhi-archive: ${result.weeks.length} weeks read, ${skipped} not stored, ${result.added} added, ` +
            `${result.changed} changed, ${result.remaining} weeks left for another run`
    );
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

/** Prints the time extent of the map-server layers IPMA+ could read, and one sample value. */
async function probeWms() {
    for (const [id, service] of Object.entries(WMS)) {
        const times = await layerTimes(service, (name) => /conc|vhi/.test(name));
        for (const [name, time] of Object.entries(times)) {
            const extent =
                time && time.length > 300 ? `${time.slice(0, 120)} … ${time.slice(-120)}` : time;
            console.log(`${id} ${name}: ${extent}`);
        }
    }
    const lisboa = POINTS['1106'];
    console.log(
        await getFeatureInfo(WMS.vhi, 'vhi.obsRem.7days.vector.conc', lisboa, '2026-11-04')
    );
    console.log(
        await getFeatureInfo(WMS.vhi, 'vhi.obsRem.7days.vector.conc', lisboa, '2018-01-07')
    );
    console.log(
        await getFeatureInfo(
            WMS.precipitation,
            'mrrto.obsSup.daily.vector.conc',
            lisboa,
            '2025-11-10'
        )
    );
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
