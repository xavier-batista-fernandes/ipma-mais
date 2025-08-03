import fs from 'fs';
import { getTypeFromArgs } from '../utilities/get-type-from-args.js';
import { getMunicipalities } from '../utilities/get-municipalities.js';
import { getRemotePath } from '../utilities/path/get-remote-path.js';
import { getLocalPath } from '../utilities/path/get-local-path.js';
import { fetchRemoteCsv } from '../utilities/fetch/fetch-remote-csv.js';
import { fetchLocalCsv } from '../utilities/fetch/fetch-local-csv.js';

const type = getTypeFromArgs();
const municipalities = getMunicipalities();

for (const { district, municipality, dico } of municipalities) {
    console.log(`\n🧶 Processing ${municipality} (${dico}) in district ${district}...`);
    const remotePath = getRemotePath(type, dico, municipality, district);
    const remoteCsv = await fetchRemoteCsv(remotePath);

    const localPath = getLocalPath(type, municipality, district);
    const localCsv = fetchLocalCsv(localPath);

    // Grab existing dates
    let existingDates = [];
    existingDates = localCsv
        .split('\n')
        .slice(1)
        .map((row) => row.split(',')[0])
        .filter((date) => date.trim() !== '');

    // Remove duplicates
    const newRows = remoteCsv
        .split('\n')
        .slice(1)
        .filter((row) => row.trim() !== '')
        .filter((row) => {
            const date = row.split(',')[0];
            return !existingDates.includes(date);
        });

    // Append new rows
    if (newRows.length > 0) {
        const csvToAppend = '\n' + newRows.join('\n');
        fs.appendFileSync(localPath, csvToAppend);
        console.log(`🚙 Appended ${newRows.length} new row(s) to ${municipality}.`);
    } else {
        console.log(`🧣 No new rows to add for ${municipality}.`);
    }
}

console.log(`\n🌱 Updated ${type} data for all municipalities.`);
