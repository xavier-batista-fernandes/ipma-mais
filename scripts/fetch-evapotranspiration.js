const axios = require('axios');
const fs = require('fs');
const path = require('path');

const MUNICIPALITIES = require('../models/municipalities/lisboa.json');

const BASE_URL = 'https://api.ipma.pt/open-data/observation/climate/evapotranspiration/';
const OUTPUT_BASE_DIR = path.resolve(__dirname, '../output');

/**
 * Downloads a CSV stream from IPMA and saves it to disk
 */
async function downloadAndSaveCSV({ dico, municipality, district }) {
    const filename = `et0-${dico}-${municipality}.csv`;
    const url = `${BASE_URL}${district}/${filename}`;
    const date = new Date().toISOString().split('T')[0];
    const outputDir = path.join(OUTPUT_BASE_DIR, date, district);
    const outputPath = path.join(outputDir, `${municipality}.csv`);

    try {
        console.log(`⏳ Fetching data for ${municipality}...`);
        const response = await axios.get(url, { responseType: 'stream' });

        console.log(`💿 Saving data for ${municipality}...`);
        fs.mkdirSync(outputDir, { recursive: true });
        const writeStream = fs.createWriteStream(outputPath);
        response.data.pipe(writeStream);
        await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
        });
    } catch (error) {
        console.error(`❌ Failed to fetch ${municipality} (${dico}):`, error.message);
    }
}

/**
 * Main function: download & optionally parse data
 */
async function main() {
    console.log('🌱 Starting evapotranspiration export...');

    for (const municipality of MUNICIPALITIES) {
        await downloadAndSaveCSV(municipality);
    }

    console.log('✅ Sucessfully fetched evapotranspiration data!');
}

main();
