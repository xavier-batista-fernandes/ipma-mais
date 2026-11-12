/**
 * Figures for a municipality's page, worked out from its daily series (`[date, mean, …]`, dates
 * ascending, days without data absent).
 *
 * Kept free of React and of the rest of the app (no imports at all) so `node --test` can run
 * `test/municipality.test.ts` against it directly.
 */

/** `[date, mean, …]`, as in the API's series (see `SeriesRow` in api.ts). */
export type DailyRow = readonly [string, number, ...unknown[]];

/**
 * How days add up: evapotranspiration is a daily amount, so a period has a total; a
 * temperature only has an average.
 */
export type Aggregate = 'sum' | 'mean';

export interface Period {
    /** The sum or mean over the days with data, or null when there are none. */
    value: number | null;
    /** Days with data in the period. */
    days: number;
    from: string;
    to: string;
}

export interface MonthTotal {
    /** `YYYY-MM`. */
    month: string;
    value: number;
    days: number;
    /** Days in the calendar month, so a partial month can be told apart from a complete one. */
    daysInMonth: number;
}

export interface Summary {
    /** The newest day with data and its value. */
    last: { date: string; value: number };
    /** The 7 days up to the newest day, and the 7 before them. */
    week: Period;
    previousWeek: Period;
    /** The newest day's month up to that day, and the same days a year earlier. */
    month: Period;
    sameMonthLastYear: Period;
    /** The highest and lowest daily values on record. */
    highest: { date: string; value: number };
    lowest: { date: string; value: number };
}

const DAY_MS = 86400000;
const dayNumber = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / DAY_MS;
export const addDays = (iso: string, days: number) =>
    new Date((dayNumber(iso) + days) * DAY_MS).toISOString().slice(0, 10);

/** The same calendar day a year earlier; 29 February becomes the 28th. */
export function yearBefore(iso: string) {
    const [y, m, d] = iso.split('-');
    const year = String(Number(y) - 1).padStart(4, '0');
    const day = m === '02' && d === '29' ? '28' : d;
    return `${year}-${m}-${day}`;
}

const daysInMonth = (month: string) => {
    const [y, m] = month.split('-').map(Number);
    return new Date(Date.UTC(y, m, 0)).getUTCDate();
};

/** Sum or mean of the rows whose date falls within `from`–`to` (inclusive). */
export function period(
    rows: readonly DailyRow[],
    from: string,
    to: string,
    aggregate: Aggregate
): Period {
    let sum = 0;
    let days = 0;
    for (const [date, value] of rows) {
        if (date < from || date > to) continue;
        sum += value;
        days++;
    }
    const value = days === 0 ? null : aggregate === 'sum' ? sum : sum / days;
    return { value, days, from, to };
}

/** The page's headline figures, or null when the series is empty. */
export function summarize(rows: readonly DailyRow[], aggregate: Aggregate): Summary | null {
    if (rows.length === 0) return null;
    const [lastDate, lastValue] = rows[rows.length - 1];
    const monthStart = `${lastDate.slice(0, 8)}01`;
    let highest = rows[0];
    let lowest = rows[0];
    for (const row of rows) {
        if (row[1] > highest[1]) highest = row;
        if (row[1] < lowest[1]) lowest = row;
    }
    return {
        last: { date: lastDate, value: lastValue },
        week: period(rows, addDays(lastDate, -6), lastDate, aggregate),
        previousWeek: period(rows, addDays(lastDate, -13), addDays(lastDate, -7), aggregate),
        month: period(rows, monthStart, lastDate, aggregate),
        sameMonthLastYear: period(rows, yearBefore(monthStart), yearBefore(lastDate), aggregate),
        highest: { date: highest[0], value: highest[1] },
        lowest: { date: lowest[0], value: lowest[1] },
    };
}

/** Every calendar month with data, oldest first, as a total or an average of its days. */
export function monthly(rows: readonly DailyRow[], aggregate: Aggregate): MonthTotal[] {
    const months = new Map<string, { sum: number; days: number }>();
    for (const [date, value] of rows) {
        const month = date.slice(0, 7);
        const entry = months.get(month) ?? { sum: 0, days: 0 };
        entry.sum += value;
        entry.days++;
        months.set(month, entry);
    }
    return [...months].map(([month, { sum, days }]) => ({
        month,
        value: aggregate === 'sum' ? sum : sum / days,
        days,
        daysInMonth: daysInMonth(month),
    }));
}

/** The relative change from `base` to `value` (0.12 = 12 % more), or null when undefined. */
export function change(value: number | null, base: number | null) {
    if (value === null || base === null || base === 0) return null;
    return (value - base) / Math.abs(base);
}
