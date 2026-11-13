import type { MetricId } from './api';
import type { Aggregate } from './municipality';

/**
 * What each variable is, beyond the numbers the API gives (id, unit, dates): how it is measured,
 * how to sum it up over a period and where it comes from. The words that explain it to people
 * live in the dictionaries, under `metricInfo.<id>.summary` (one line, shown in the variable
 * picker and on the home page), `.what`, `.read`, `.uses` and `.source` (the variable's page).
 *
 * To add a variable: add its id to `MetricId` in api.ts, an entry here, and those five keys to
 * `en.ts` and `pt.ts`. Entries for variables the API doesn't serve yet are ignored.
 */
export type MetricGroup = 'water' | 'temperature' | 'vegetation' | 'fire';

export interface MetricMeta {
    group: MetricGroup;
    /** How days add up over a week, a month or a query: rain and ET0 are totals, the rest averages. */
    aggregate: Aggregate;
    /** The notable end of the scale, for records ("highest" or "lowest" day). */
    extreme: 'highest' | 'lowest';
    /** How often a new value appears. */
    cadence: 'daily' | 'weekly';
    /** How IPMA gets the value: weather stations, satellites, a forecast or a model. */
    method: 'stations' | 'satellite' | 'forecast' | 'model';
    /** Where to read more, at the source. */
    sourceUrl: string;
}

const AGROMETEOROLOGY = 'https://www.ipma.pt/pt/agrometeorologia/';
const OPEN_DATA = 'https://api.ipma.pt/';

export const METRICS = {
    et0: {
        group: 'water',
        aggregate: 'sum',
        extreme: 'highest',
        cadence: 'daily',
        method: 'stations',
        sourceUrl: `${AGROMETEOROLOGY}evapotranspiracao/`,
    },
    tmax: {
        group: 'temperature',
        aggregate: 'mean',
        extreme: 'highest',
        cadence: 'daily',
        method: 'stations',
        sourceUrl: OPEN_DATA,
    },
    tmin: {
        group: 'temperature',
        aggregate: 'mean',
        extreme: 'lowest',
        cadence: 'daily',
        method: 'stations',
        sourceUrl: OPEN_DATA,
    },
    tmean: {
        group: 'temperature',
        aggregate: 'mean',
        extreme: 'highest',
        cadence: 'daily',
        method: 'stations',
        sourceUrl: OPEN_DATA,
    },
    prec: {
        group: 'water',
        aggregate: 'sum',
        extreme: 'highest',
        cadence: 'daily',
        method: 'stations',
        sourceUrl: OPEN_DATA,
    },
    vhi: {
        group: 'vegetation',
        aggregate: 'mean',
        extreme: 'lowest',
        cadence: 'weekly',
        method: 'satellite',
        sourceUrl: `${AGROMETEOROLOGY}vhi/`,
    },
    fire: {
        group: 'fire',
        aggregate: 'mean',
        extreme: 'highest',
        cadence: 'daily',
        method: 'forecast',
        sourceUrl: 'https://www.ipma.pt/pt/riscoincendio/rcm.pt/',
    },
    smi: {
        group: 'water',
        aggregate: 'mean',
        extreme: 'lowest',
        cadence: 'daily',
        method: 'model',
        sourceUrl: `${AGROMETEOROLOGY}smi/`,
    },
} as const satisfies Record<MetricId, MetricMeta> & Record<string, MetricMeta>;

/** A variable's description, for the ids the app knows. */
export const metricMeta = (id: MetricId): MetricMeta => METRICS[id];
