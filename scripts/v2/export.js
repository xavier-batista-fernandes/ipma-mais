import fs from 'fs';
import path from 'path';
import { fetchLocalCsv } from '../../utilities/fetch/fetch-local-csv.js';

// -- Configurable constants --
const URL =
    'https://www.ipma.pt/pt/agrometeorologia/evapotranspiracao/index.jsp?page=index-geo-stations.jsp';
const BASE_OUTPUT_DIR = 'outputs/et0-v2';
const RAW_JSON_DIR = 'outputs/et0-raw-json';

// 1. Fetch the webpage containing ET0 data
console.log(`Fetching ET0 data from ${URL}...`);
const response = await fetch(URL);
let content = await response.text();

// 2. Extract today's ET0 data block from the page using regex
console.log('Extracting today’s ET0 data...');
const todayMatch = content.match(/et0\[0\]\s*=\s*(\{[\s\S]*?\})\s*;/);

if (!todayMatch) {
    console.error('ET0 data not found. The website structure might have changed.');
    process.exit(1);
}

const et0Data = JSON.parse(todayMatch[1]);
console.log(`Extracted ET0 data for: ${et0Data.data}`);

// 3. Format today’s date for CSV entry
const today = new Date().toISOString().split('T')[0];
console.log(`Today: ${today}`);

// 4. Loop through each municipality and save/update its CSV file
et0Data.et0.forEach((municipality) => {
    const { Distrito, CONCELHO, MEAN } = municipality;

    // Log separation between concelhos
    console.log('\n');
    console.log(`Processing municipality: ${CONCELHO} (${Distrito})`);

    // 4.1 Generate directory and file paths
    const dirPath = path.join(BASE_OUTPUT_DIR, Distrito);
    const filePath = path.join(dirPath, `${CONCELHO}.csv`);

    // 4.2 Ensure the directory exists
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`Created directory: ${dirPath}`);
    }

    // 4.3 Initialize the CSV file if it doesn't exist
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, 'date,mean\n');
        console.log(`Created file: ${filePath}`);
    }

    // 4.4 Skip if entry for today already exists
    const existingRows = fetchLocalCsv(filePath).split('\n');
    if (existingRows.some((row) => row.startsWith(today))) {
        console.log(`🧤 Entry for ${today} already exists. Skipping...`);
        return;
    }

    // 4.5 Append new row
    const newRow = `${today},${MEAN}\n`;
    fs.appendFileSync(filePath, newRow);
    console.log(`🌱 Added new row: ${newRow.trim()}`);
});

// 5. Save today's full raw JSON for debugging or detailed history
if (!fs.existsSync(RAW_JSON_DIR)) {
    fs.mkdirSync(RAW_JSON_DIR, { recursive: true });
}

const rawJsonPath = path.join(RAW_JSON_DIR, `et0-${today}.json`);
fs.writeFileSync(rawJsonPath, JSON.stringify(et0Data, null, 2));
console.log(`\nSaved detailed JSON to: ${rawJsonPath}`);
