import { parsePtDate } from '../lib/dates.js';
import { fetchText } from '../lib/fetch.js';

export const PAGE_URL =
    'https://www.ipma.pt/pt/agrometeorologia/evapotranspiracao/index.jsp?page=index-geo-stations.jsp';

/**
 * Extracts every `et0[n] = {…};` block from the IPMA agrometeorology page. Each block is
 * one day: `{ data: "Sáb, 14 Mar 2026", et0: [{ DICO, CONCELHO, Distrito, MEAN, … }] }`.
 * The date comes from the payload, never from the clock of whoever runs the scraper.
 */
export function parseEt0Page(html) {
    const days = [];
    const pattern = /et0\[(\d+)\]\s*=\s*(\{[\s\S]*?\})\s*;/g;

    for (const match of html.matchAll(pattern)) {
        const snapshot = JSON.parse(match[2]);
        days.push({ index: Number(match[1]), date: parsePtDate(snapshot.data), snapshot });
    }

    if (days.length === 0) {
        throw new Error('No et0[n] data found on the IPMA page; its structure may have changed.');
    }
    return days;
}

/** Turns one day's snapshot into `{ dico, row }` entries for the et0 metric. */
export function snapshotToRows(date, snapshot) {
    return snapshot.et0.map((entry) => ({
        dico: String(entry.DICO).padStart(4, '0'),
        name: entry.CONCELHO,
        district: entry.Distrito,
        row: {
            date,
            mean: typeof entry.MEAN === 'number' ? entry.MEAN : Number(entry.MEAN),
            min: null,
            max: null,
            std: null,
            source: 'page',
        },
    }));
}

export async function fetchEt0Page() {
    return parseEt0Page(await fetchText(PAGE_URL));
}
