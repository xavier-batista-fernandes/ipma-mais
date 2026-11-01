/**
 * Queries over every municipality's daily values, run in the browser on `{metric}/values.json`.
 *
 * Kept free of React and of the rest of the app (no imports at all) so `node --test` can run
 * `test/query.test.ts` against it directly.
 */

/** Every value of one metric: `values[dico][i]` is the mean on `dates[i]` (null when missing). */
export interface ValueMatrix {
    dates: string[];
    values: Record<string, (number | null)[]>;
}

export type QueryType = 'threshold' | 'total' | 'streak' | 'ranking' | 'compare';
export const QUERY_TYPES: QueryType[] = ['threshold', 'total', 'streak', 'ranking', 'compare'];

/** `gt`: strictly above the value; `lt`: strictly below. */
export type Comparison = 'gt' | 'lt';
export type Statistic = 'sum' | 'mean' | 'max' | 'min';
export const STATISTICS: Statistic[] = ['sum', 'mean', 'max', 'min'];
/** `desc`: highest first; `asc`: lowest first. */
export type Order = 'desc' | 'asc';

export interface Query {
    type: QueryType;
    /** threshold, streak */
    comparison: Comparison;
    /** threshold, streak: the value to compare each day with, in the metric's unit. */
    value: number;
    /** threshold: at least this many days; streak: at least this many consecutive days. */
    minDays: number;
    /** threshold, total, streak, compare: the period (both ends included). */
    from: string;
    to: string;
    /** total, compare */
    statistic: Statistic;
    /** total, ranking, compare */
    order: Order;
    /** total, ranking, compare: how many municipalities to keep; 0 keeps them all. */
    limit: number;
    /** ranking */
    day: string;
    /** compare: the period `from`–`to` is compared with. */
    baseFrom: string;
    baseTo: string;
}

export interface ResultRow {
    dico: string;
    /** What the results are ranked by: days (threshold, streak) or the metric's unit. */
    value: number;
    /** Days with data in the period (in the current period for compare). */
    days: number;
    /** streak: the longest run's first and last day. */
    start?: string;
    end?: string;
    /** compare: the statistic in the current and in the base period; `value` is their difference. */
    current?: number;
    base?: number;
}

export interface QueryResult {
    rows: ResultRow[];
    /** `days` for threshold and streak; otherwise values are in the metric's unit. */
    unit: 'days' | 'metric';
    /** compare: values are differences, shown with a sign and a diverging scale. */
    signed: boolean;
    /** Municipalities with any data in the period (before filtering and limiting). */
    considered: number;
}

const DAY_MS = 86400000;
const dayNumber = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / DAY_MS;
export const addDays = (iso: string, days: number) =>
    new Date((dayNumber(iso) + days) * DAY_MS).toISOString().slice(0, 10);

/** The indexes `[start, end)` of `dates` (ascending) that fall within `from`–`to`. */
export function dateRange(dates: string[], from: string, to: string): [number, number] {
    const [lo, hi] = from <= to ? [from, to] : [to, from];
    let start = 0;
    while (start < dates.length && dates[start] < lo) start++;
    let end = start;
    while (end < dates.length && dates[end] <= hi) end++;
    return [start, end];
}

const passes = (value: number, comparison: Comparison, threshold: number) =>
    comparison === 'gt' ? value > threshold : value < threshold;

function statistic(values: (number | null)[], start: number, end: number, stat: Statistic) {
    let count = 0;
    let sum = 0;
    let max = -Infinity;
    let min = Infinity;
    for (let i = start; i < end; i++) {
        const v = values[i];
        if (v === null || v === undefined) continue;
        count++;
        sum += v;
        if (v > max) max = v;
        if (v < min) min = v;
    }
    if (count === 0) return null;
    const value = stat === 'sum' ? sum : stat === 'mean' ? sum / count : stat === 'max' ? max : min;
    return { value: round(value), days: count };
}

const round = (value: number) => Math.round(value * 100) / 100;

const byValue = (order: Order) => (a: ResultRow, b: ResultRow) =>
    (order === 'desc' ? b.value - a.value : a.value - b.value) || a.dico.localeCompare(b.dico);

const limited = (rows: ResultRow[], limit: number) => (limit > 0 ? rows.slice(0, limit) : rows);

export function runQuery(matrix: ValueMatrix, query: Query): QueryResult {
    const { dates } = matrix;
    const entries = Object.entries(matrix.values);

    switch (query.type) {
        case 'threshold': {
            const [start, end] = dateRange(dates, query.from, query.to);
            const rows: ResultRow[] = [];
            let considered = 0;
            for (const [dico, values] of entries) {
                let days = 0;
                let hits = 0;
                for (let i = start; i < end; i++) {
                    const v = values[i];
                    if (v === null || v === undefined) continue;
                    days++;
                    if (passes(v, query.comparison, query.value)) hits++;
                }
                if (days === 0) continue;
                considered++;
                if (hits > 0 && hits >= query.minDays) rows.push({ dico, value: hits, days });
            }
            return { rows: rows.sort(byValue('desc')), unit: 'days', signed: false, considered };
        }

        case 'streak': {
            const [start, end] = dateRange(dates, query.from, query.to);
            const rows: ResultRow[] = [];
            let considered = 0;
            for (const [dico, values] of entries) {
                let days = 0;
                let best = { length: 0, start: 0, end: 0 };
                let run = 0;
                let runStart = 0;
                for (let i = start; i < end; i++) {
                    const v = values[i];
                    if (v === null || v === undefined) {
                        run = 0;
                        continue;
                    }
                    days++;
                    if (!passes(v, query.comparison, query.value)) {
                        run = 0;
                        continue;
                    }
                    // A run only continues over consecutive calendar days: a day without data
                    // (also a gap in the dates) ends it.
                    const follows = run > 0 && dayNumber(dates[i]) - dayNumber(dates[i - 1]) === 1;
                    if (follows) run++;
                    else {
                        run = 1;
                        runStart = i;
                    }
                    if (run > best.length) best = { length: run, start: runStart, end: i };
                }
                if (days === 0) continue;
                considered++;
                if (best.length > 0 && best.length >= query.minDays) {
                    rows.push({
                        dico,
                        value: best.length,
                        days,
                        start: dates[best.start],
                        end: dates[best.end],
                    });
                }
            }
            return { rows: rows.sort(byValue('desc')), unit: 'days', signed: false, considered };
        }

        case 'total': {
            const [start, end] = dateRange(dates, query.from, query.to);
            const rows: ResultRow[] = [];
            for (const [dico, values] of entries) {
                const result = statistic(values, start, end, query.statistic);
                if (result) rows.push({ dico, ...result });
            }
            return {
                rows: limited(rows.sort(byValue(query.order)), query.limit),
                unit: 'metric',
                signed: false,
                considered: rows.length,
            };
        }

        case 'ranking': {
            const i = dates.indexOf(query.day);
            const rows: ResultRow[] = [];
            if (i >= 0) {
                for (const [dico, values] of entries) {
                    const v = values[i];
                    if (v !== null && v !== undefined) rows.push({ dico, value: v, days: 1 });
                }
            }
            return {
                rows: limited(rows.sort(byValue(query.order)), query.limit),
                unit: 'metric',
                signed: false,
                considered: rows.length,
            };
        }

        case 'compare': {
            const [start, end] = dateRange(dates, query.from, query.to);
            const [baseStart, baseEnd] = dateRange(dates, query.baseFrom, query.baseTo);
            const rows: ResultRow[] = [];
            for (const [dico, values] of entries) {
                const current = statistic(values, start, end, query.statistic);
                const base = statistic(values, baseStart, baseEnd, query.statistic);
                if (!current || !base) continue;
                rows.push({
                    dico,
                    value: round(current.value - base.value),
                    days: current.days,
                    current: current.value,
                    base: base.value,
                });
            }
            return {
                rows: limited(rows.sort(byValue(query.order)), query.limit),
                unit: 'metric',
                signed: true,
                considered: rows.length,
            };
        }
    }
}

/** The data day on or after `iso` (or the last one), so period ends land on days with data. */
export function snap(dates: string[], iso: string) {
    return dates.find((d) => d >= iso) ?? dates.at(-1) ?? iso;
}

/**
 * Sensible starting values: the last 30 days, compared with the same days a year earlier when
 * there is data for them (ET0 is strongly seasonal), otherwise with the 30 days before.
 */
export function defaultQuery(dates: string[], domain: [number, number] | null): Query {
    const last = dates.at(-1) ?? '2000-01-01';
    const first = dates[0] ?? last;
    const from = snap(dates, addDays(last, -29));
    const yearAgo = addDays(from, -365);
    const [baseFrom, baseTo] =
        yearAgo >= first ? [yearAgo, addDays(last, -365)] : [addDays(from, -30), addDays(from, -1)];
    const [lo, hi] = domain ?? [0, 10];
    return {
        type: 'threshold',
        comparison: 'gt',
        value: Math.round((lo + hi) / 2),
        minDays: 1,
        from,
        to: last,
        statistic: 'sum',
        order: 'desc',
        limit: 10,
        day: last,
        baseFrom,
        baseTo,
    };
}

/*
 * The query lives in the URL next to the map's state (`?v=q&qt=threshold&op=gt&x=4&n=3&f=…`), so
 * a link reopens the same results.
 */

const KEYS: Record<keyof Query, string> = {
    type: 'qt',
    comparison: 'op',
    value: 'x',
    minDays: 'n',
    from: 'f',
    to: 't',
    statistic: 'st',
    order: 'o',
    limit: 'k',
    day: 'qd',
    baseFrom: 'bf',
    baseTo: 'bt',
};

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function queryToParams(query: Query, params: URLSearchParams) {
    for (const [field, key] of Object.entries(KEYS)) {
        params.set(key, String(query[field as keyof Query]));
    }
}

/** Reads a query from the URL, keeping `fallback`'s value for anything missing or invalid. */
export function queryFromParams(params: URLSearchParams, fallback: Query): Query {
    const get = (field: keyof Query) => params.get(KEYS[field]);
    const oneOf = <T extends string>(field: keyof Query, allowed: readonly T[], current: T) => {
        const value = get(field);
        return value && (allowed as readonly string[]).includes(value) ? (value as T) : current;
    };
    const number = (field: keyof Query, current: number, integer = false) => {
        const raw = get(field);
        const value = raw === null || raw === '' ? Number.NaN : Number(raw);
        if (!Number.isFinite(value)) return current;
        return integer ? Math.max(0, Math.round(value)) : value;
    };
    const date = (field: keyof Query, current: string) => {
        const value = get(field);
        return value && ISO.test(value) ? value : current;
    };
    const query: Query = {
        type: oneOf('type', QUERY_TYPES, fallback.type),
        comparison: oneOf('comparison', ['gt', 'lt'] as const, fallback.comparison),
        value: number('value', fallback.value),
        minDays: number('minDays', fallback.minDays, true),
        from: date('from', fallback.from),
        to: date('to', fallback.to),
        statistic: oneOf('statistic', STATISTICS, fallback.statistic),
        order: oneOf('order', ['desc', 'asc'] as const, fallback.order),
        limit: number('limit', fallback.limit, true),
        day: date('day', fallback.day),
        baseFrom: date('baseFrom', fallback.baseFrom),
        baseTo: date('baseTo', fallback.baseTo),
    };
    // Comparisons use averages or extremes, never totals (see QueryPanel).
    if (query.type === 'compare' && query.statistic === 'sum') query.statistic = 'mean';
    return query;
}
