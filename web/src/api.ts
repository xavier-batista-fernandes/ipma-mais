import type { District, Municipality } from 'cartis';
import { addDays, mergeMatrices, type ValueMatrix } from './query';

/** Shapes returned by the Worker's `/v1` API (see docs/API.md). */
export type MetricId = 'et0' | 'tmax' | 'tmin' | 'tmean' | 'prec' | 'fire' | 'vhi' | 'smi';
export const METRIC_IDS: readonly MetricId[] = [
    'et0',
    'tmax',
    'tmin',
    'tmean',
    'prec',
    'fire',
    'vhi',
    'smi',
];

export const isMetricId = (value: unknown): value is MetricId =>
    METRIC_IDS.includes(value as MetricId);

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

/** The Worker's API (worker/src/index.ts), on the same origin as the app. */
const BASE = '/v1';
const cache = new Map<string, Promise<unknown>>();

function getJson<T>(path: string): Promise<T> {
    let request = cache.get(path);
    if (!request) {
        request = fetch(`${BASE}/${path}`).then((response) => {
            if (!response.ok) throw new Error(`${response.status} loading ${path}`);
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
/** The Worker's limit on one `values` request (MAX_VALUES_DAYS in worker/src/index.ts). */
const VALUES_CHUNK_DAYS = 3650;

/**
 * Every municipality's values for one metric over `from`–`to` (see `query.ts`), fetched in
 * chunks the Worker accepts and merged. `periods` may overlap.
 */
export async function getValues(
    metric: MetricId,
    periods: [string, string][]
): Promise<ValueMatrix> {
    const chunks: [string, string][] = [];
    for (const [from, to] of periods) {
        for (let start = from; start <= to; start = addDays(start, VALUES_CHUNK_DAYS)) {
            const end = addDays(start, VALUES_CHUNK_DAYS - 1);
            chunks.push([start, end < to ? end : to]);
        }
    }
    const parts = await Promise.all(
        chunks.map(([from, to]) =>
            getJson<ValueMatrix>(`${metric}/values.json?from=${from}&to=${to}`)
        )
    );
    return mergeMatrices(parts);
}
export const getSeries = (metric: MetricId, dico: string) =>
    getJson<Series>(`${metric}/series/${dico}.json`);
