import type { District, Municipality } from 'cartis';

/** Shapes written by `scripts/build-api.js`. */
export type MetricId = 'et0' | 'tmax' | 'tmin';

export interface MetricInfo {
    id: MetricId;
    label: string;
    unit: string;
    firstDate: string | null;
    lastDate: string | null;
    domain: [number, number] | null;
    dates: string[];
}

export interface MunicipalityInfo {
    dico: string;
    name: Municipality;
    district: District;
}

export interface SourceStatus {
    lastSuccess?: string;
    latestDate?: string;
}

export interface ApiIndex {
    generatedAt: string;
    metrics: MetricInfo[];
    municipalities: MunicipalityInfo[];
    sources: Record<string, SourceStatus>;
}

export interface DayValues {
    date: string;
    values: Record<string, number>;
}

/** `[date, mean, min, max]`; min/max are null for the daily page source. */
export type SeriesRow = [string, number, number | null, number | null];

export interface Series {
    dico: string;
    rows: SeriesRow[];
}

const BASE = `${import.meta.env.BASE_URL}api`;
const cache = new Map<string, Promise<unknown>>();

function getJson<T>(path: string): Promise<T> {
    let request = cache.get(path);
    if (!request) {
        request = fetch(`${BASE}/${path}`).then((response) => {
            if (!response.ok) throw new Error(`${response.status} ao carregar ${path}`);
            return response.json();
        });
        // Don't keep failures around, so a retry actually refetches.
        request.catch(() => cache.delete(path));
        cache.set(path, request);
    }
    return request as Promise<T>;
}

export const getIndex = () => getJson<ApiIndex>('index.json');
export const getDay = (metric: MetricId, date: string) =>
    getJson<DayValues>(`${metric}/days/${date}.json`);
export const getSeries = (metric: MetricId, dico: string) =>
    getJson<Series>(`${metric}/series/${dico}.json`);
