import fs from 'fs';
import path from 'path';
import axios from 'axios';
import csv from 'csv-parser';
import { INPUTS_DIR, IPMA_EVAPOTRANSPIRATION_BASE_URL, OUTPUTS_DIR } from '../constants/paths.ts';

async function main() {
    const inputPath = path.join(INPUTS_DIR, 'municipalities.json');
    const inputRawData = fs.readFileSync(inputPath, 'utf-8');
    const inputObjects = JSON.parse(inputRawData);

    for (const object of inputObjects) {
        // Get available evapotranspiration data from IPMA
        const { district, municipality, dico } = object;
        const inputPath = path.join(
            IPMA_EVAPOTRANSPIRATION_BASE_URL,
            `${district}/et0-${dico}-${municipality}.csv`
        );

        const response = await axios.get(inputPath);
        const apiEvapo = response.data;

        // Get saved evapotranspirations from disk
        const outputPath = path.join(
            OUTPUTS_DIR,
            `/evapotranspiration/${district}/${municipality}.csv`
        );

        const raw = fs.readFileSync(outputPath, 'utf-8');
        const existingDates = raw
            .split('\n')
            .slice(1)
            .map((row) => row.split(',')[0])
            .filter((date) => date.trim() !== '');

        // Remove the existing rows from the fetched data
        const entriesToAdd = apiEvapo
            .split('\n')
            .slice(1)
            .filter((row) => row.trim() !== '')
            .filter((row) => !existingDates.includes(row.split(',')[0]))
            .join('\n');
        console.log(entriesToAdd);

        // Write the new entries to disk
        fs.appendFileSync(outputPath, entriesToAdd);
    }
}

main();
