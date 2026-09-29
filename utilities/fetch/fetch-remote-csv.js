import axios from 'axios';

export async function fetchRemoteCsv(path) {
    try {
        console.log(`📂 Fetching remote CSV...`);
        const response = await axios.get(path);
        return response.data;
    } catch (error) {
        console.error(`🧣 Failed to fetch remote CSV from ${path}: ${error.message}`);
        throw error;
    }
}
