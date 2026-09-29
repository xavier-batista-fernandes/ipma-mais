import fs from 'fs';

export function fetchLocalCsv(path) {
    try {
        console.log(`📂 Fetching local CSV...`);
        return fs.readFileSync(path, 'utf-8');
    } catch (error) {
        console.error(`❌ Failed to fetch local CSV from ${path}: ${error.message}`);
        throw error;
    }
}
