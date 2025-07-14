import axios from 'axios';
import csv from 'csv-parser';
import path from 'path';
import { IPMA_EVAPOTRANSPIRATION_BASE_URL } from '../constants/paths.ts';

export { readDailyRecord };

async function readDailyRecord({ district, municipality, dico }) {
    console.log('🧶 Reading daily evapotranspiration measurements...');

    const relativePath = `${district}/et0-${dico}-${municipality}.csv`;
    const inputPath = path.join(IPMA_EVAPOTRANSPIRATION_BASE_URL, relativePath);

    const date = new Date();
    date.setDate(date.getDate() - 1);
    const todaysDate = date.toISOString().split('T')[0];
    // const todaysDate = '2025-07-11';

    try {
        console.log(`⏳ Fetching data for ${municipality}...`);
        return await new Promise(async (resolve, reject) => {
            let todaysEntry;

            const response = await axios.get(inputPath, { responseType: 'stream' });

            if (response.status === 404) {
                resolve(undefined);
            }

            response.data
                .pipe(csv())
                .on('data', (entry) => {
                    if (entry.date === todaysDate) {
                        todaysEntry = entry;
                    }
                })
                .on('end', () => {
                    if (todaysEntry) {
                        console.log(`✅ Entry found for ${todaysDate}.`);
                        resolve(todaysEntry);
                    } else {
                        console.log(`👎 No entry found for ${todaysDate}.`);
                        resolve(undefined);
                    }
                })
                .on('error', reject);
        });
    } catch (error) {
        console.error(`❌ Could not retrieve evapotranspiration data for ${municipality}:`);
    }
}
