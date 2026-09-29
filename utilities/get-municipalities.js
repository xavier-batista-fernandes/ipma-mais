import fs from 'fs';
import { MUNICIPALITIES_PATH } from '../constants/paths.ts';

export function getMunicipalities() {
    const rawMunicipalities = fs.readFileSync(MUNICIPALITIES_PATH, 'utf-8');
    const jsonMunicipalities = JSON.parse(rawMunicipalities);

    console.log(`\n🌱 Loaded ${jsonMunicipalities.length} municipalities.`);

    return jsonMunicipalities;
}
