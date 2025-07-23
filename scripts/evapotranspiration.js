import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { INPUTS_DIR, IPMA_EVAPOTRANSPIRATION_BASE_URL, OUTPUTS_DIR } from '../constants/paths.ts';

async function main() {
    // Step 1: Load municipalities from input JSON file
    const municipalitiesPath = path.join(INPUTS_DIR, 'municipalities.json');
    const municipalitiesRaw = fs.readFileSync(municipalitiesPath, 'utf-8');
    const municipalities = JSON.parse(municipalitiesRaw);

    console.log(`\n🪀 Loaded ${municipalities.length} municipalities.`);

    // Step 2: Iterate through each municipality
    for (const { district, municipality, dico } of municipalities) {
        const remoteCsvPath = path.join(
            IPMA_EVAPOTRANSPIRATION_BASE_URL,
            `${district}/et0-${dico}-${municipality}.csv`
        );

        // Step 3: Attempt to fetch data from IPMA
        let fetchedCsv;
        try {
            console.log(`\n🪀 Fetching data for ${municipality} (${dico})...`);
            const response = await axios.get(remoteCsvPath);
            fetchedCsv = response.data;
        } catch (error) {
            console.error(`🧣 Failed to process ${municipality}: ${error.message}`);
            continue;
        }

        // Step 4: Read the existing CSV data from disk
        const localCsvPath = path.join(
            OUTPUTS_DIR,
            'evapotranspiration',
            district,
            `${municipality}.csv`
        );

        let existingDates = [];
        const existingCsvContent = fs.readFileSync(localCsvPath, 'utf-8');
        existingDates = existingCsvContent
            .split('\n')
            .slice(1)
            .map((row) => row.split(',')[0])
            .filter((date) => date.trim() !== '');

        // Step 5: Compare fetched data with local dates and filter out duplicates
        const newRows = fetchedCsv
            .split('\n')
            .slice(1)
            .filter((row) => row.trim() !== '')
            .filter((row) => {
                const date = row.split(',')[0];
                return !existingDates.includes(date);
            });

        // Step 6: Append new rows to disk if any
        if (newRows.length > 0) {
            const csvToAppend = newRows.join('\n') + '\n';
            fs.appendFileSync(localCsvPath, csvToAppend);
            console.log(`🪀 Appended ${newRows.length} new row(s) to ${municipality}.`);
        } else {
            console.log(`🧣 No new rows to add for ${municipality}.`);
        }
    }

    console.log('\n🪀 Updated evapotranspiration data for all municipalities.');
}

main();
