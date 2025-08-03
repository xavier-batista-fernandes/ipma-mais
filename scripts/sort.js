import minimist from 'minimist';
import fs from 'fs';
import path from 'path';
import { EVAPOTRANSPIRATION_DIR } from '../constants/paths.ts';
import { getMunicipalities } from '../utilities/get-municipalities.js';

const type = getTypeFromArgs();
const municipalities = getMunicipalities();

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

for (const { district, municipality } of municipalities) {
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
