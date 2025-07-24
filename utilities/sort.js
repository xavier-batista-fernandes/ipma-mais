import minimist from 'minimist';
import fs from 'fs';
import path from 'path';
import { MUNICIPALITIES_PATH, EVAPOTRANSPIRATION_DIR } from '../constants/paths.ts';

// ───────────────────────────────────────────────────
// Step 1: Parse and validate CLI arguments
// ───────────────────────────────────────────────────

const VALID_TYPES = ['evapotranspiration', 'maxtemp', 'mintemp'];

const args = minimist(process.argv.slice(2), {
    alias: { t: 'type' },
});

const type = args.type;

if (!type || !VALID_TYPES.includes(type)) {
    console.error('❌ Invalid or missing -t/--type argument.');
    console.error('✅ Valid options are: evapotranspiration, maxtemp, mintemp');
    process.exit(1);
}

console.log(`🔍 You selected type: ${type}`);

// ───────────────────────────────────────────────────
// Step 2: Load municipality data into memory
// ───────────────────────────────────────────────────

const rawMunicipalities = fs.readFileSync(MUNICIPALITIES_PATH, 'utf-8');
const jsonMunicipalities = JSON.parse(rawMunicipalities);

// ───────────────────────────────────────────────────
// Step 3: Resolve the CSV directory for given type
// ───────────────────────────────────────────────────

let csvDir;

switch (type) {
    case 'evapotranspiration':
        csvDir = EVAPOTRANSPIRATION_DIR;
        break;
    default:
        console.error('❌ This type is not yet supported.');
        process.exit(2);
}

console.log(`📁 Using data directory: ${csvDir}`);

// ───────────────────────────────────────────────────
// Step 4: Sort each CSV file by ascending date
// ───────────────────────────────────────────────────

for (const { district, municipality } of jsonMunicipalities) {
    const csvPath = path.join(csvDir, district, `${municipality}.csv`);

    if (!fs.existsSync(csvPath)) {
        console.warn(`⚠️ CSV file not found: ${csvPath}`);
        continue;
    }

    const rawCsv = fs.readFileSync(csvPath, 'utf-8');
    const lines = rawCsv.trim().split('\n');

    const [header, ...rows] = lines;

    rows.sort((a, b) => {
        const dateA = new Date(a.split(',')[0]);
        const dateB = new Date(b.split(',')[0]);
        return dateA.getTime() - dateB.getTime();
    });

    // ───────────────────────────────────────────────────
    // Step 5: Write sorted CSV back to disk
    // ───────────────────────────────────────────────────

    const sortedCsv = [header, ...rows].join('\n');
    fs.writeFileSync(csvPath, sortedCsv);

    console.log(`✅ Sorted and saved: ${district}/${municipality}.csv`);
}
