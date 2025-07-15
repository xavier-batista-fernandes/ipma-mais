import path from 'path';
import fs from 'fs';
import { readDailyRecord } from '../utilities/read-daily-record.js';
import { writeDailyRecord } from '../utilities/write-daily-record.js';
import { INPUTS_DIR, PROJECT_ROOT } from '../constants/paths.ts';

console.log('📁 Project root:', PROJECT_ROOT);

const inputPath = path.join(INPUTS_DIR, '/municipalities.json');
const data = fs.readFileSync(inputPath, 'utf-8');
const municipalities = JSON.parse(data);

async function main() {
    console.log('🌱 Starting evapotranspiration export...');

    for (const municipality of municipalities) {
        console.log(`\n🧵 Processing data for ${municipality.municipality}...`);

        const todaysEntry = await readDailyRecord(municipality);
        if (!todaysEntry) continue;
        writeDailyRecord(municipality, todaysEntry);
    }

    console.log('✅ Sucessfully fetched evapotranspiration data!');
}

main();
