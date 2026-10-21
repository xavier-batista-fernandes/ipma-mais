import fs from 'fs';
import path from 'path';
import { getDistrictFromString, getMunicipalityFromString, stringToSlug } from 'cartis';

const MUNICIPALITIES_PATH = path.join(import.meta.dirname, '..', 'inputs', 'municipalities.json');

/**
 * The 278 mainland municipalities, keyed by IPMA's DICO code, with the canonical
 * Cartis names (`name`, `district`) that the app uses to draw them.
 */
export function loadMunicipalities() {
    const raw = JSON.parse(fs.readFileSync(MUNICIPALITIES_PATH, 'utf-8'));

    return raw.map(({ dico, municipality, district }) => {
        const name = getMunicipalityFromString(municipality);
        const districtName = getDistrictFromString(district);
        if (!name || !districtName) {
            throw new Error(`No Cartis name for ${dico} ${district}/${municipality}`);
        }
        return { dico, slug: municipality, districtSlug: district, name, district: districtName };
    });
}

/**
 * Builds a resolver that finds a municipality's DICO from any spelling IPMA uses
 * ("vila-real-de-santo-antonio", "VILA REAL DE SANTO ANTÓNIO", …) within a district.
 */
export function createResolver(municipalities = loadMunicipalities()) {
    const byKey = new Map(municipalities.map((m) => [`${m.districtSlug}/${m.slug}`, m]));
    const byDico = new Map(municipalities.map((m) => [m.dico, m]));

    return {
        byDico,
        resolve(district, municipality) {
            return byKey.get(`${stringToSlug(district)}/${stringToSlug(municipality)}`);
        },
    };
}
