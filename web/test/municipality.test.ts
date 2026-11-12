import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
    addDays,
    change,
    monthly,
    period,
    summarize,
    yearBefore,
    type DailyRow,
} from '../src/municipality.ts';

/** One row per day from `from`, with `value(i)` for the i-th day; `skip` leaves days out. */
function days(from: string, count: number, value: (i: number) => number, skip: number[] = []) {
    const rows: DailyRow[] = [];
    for (let i = 0; i < count; i++) {
        if (!skip.includes(i)) rows.push([addDays(from, i), value(i)]);
    }
    return rows;
}

describe('yearBefore', () => {
    it('keeps the calendar day and turns 29 February into the 28th', () => {
        assert.equal(yearBefore('2026-11-10'), '2025-11-10');
        assert.equal(yearBefore('2028-02-29'), '2027-02-28');
    });
});

describe('period', () => {
    it('sums or averages only the days with data in range', () => {
        const rows = days('2026-01-01', 10, (i) => i + 1, [2]);
        assert.deepEqual(period(rows, '2026-01-02', '2026-01-04', 'sum'), {
            value: 2 + 4,
            days: 2,
            from: '2026-01-02',
            to: '2026-01-04',
        });
        assert.equal(period(rows, '2026-01-02', '2026-01-04', 'mean').value, 3);
        assert.equal(period(rows, '2027-01-01', '2027-01-31', 'sum').value, null);
    });
});

describe('summarize', () => {
    it('returns null for an empty series', () => {
        assert.equal(summarize([], 'sum'), null);
    });

    it('works out the week, the month against last year and the records', () => {
        // 2025-11-01 … 2026-11-10, value = 1 on every day except two records.
        const rows = days('2025-11-01', 375, (i) => (i === 40 ? 9 : i === 100 ? -2 : 1));
        const summary = summarize(rows, 'sum')!;
        assert.deepEqual(summary.last, { date: '2026-11-10', value: 1 });
        assert.equal(summary.week.value, 7);
        assert.equal(summary.week.from, '2026-11-04');
        assert.equal(summary.previousWeek.to, '2026-11-03');
        assert.equal(summary.previousWeek.value, 7);
        assert.deepEqual(
            [summary.month.from, summary.month.to, summary.month.value],
            ['2026-11-01', '2026-11-10', 10]
        );
        assert.deepEqual(
            [
                summary.sameMonthLastYear.from,
                summary.sameMonthLastYear.to,
                summary.sameMonthLastYear.value,
            ],
            ['2025-11-01', '2025-11-10', 10]
        );
        assert.deepEqual(summary.highest, { date: '2025-12-11', value: 9 });
        assert.deepEqual(summary.lowest, { date: '2026-02-09', value: -2 });
    });
});

describe('monthly', () => {
    it('groups by calendar month and flags partial months', () => {
        const rows = days('2026-01-30', 5, () => 2);
        assert.deepEqual(monthly(rows, 'sum'), [
            { month: '2026-01', value: 4, days: 2, daysInMonth: 31 },
            { month: '2026-02', value: 6, days: 3, daysInMonth: 28 },
        ]);
        assert.equal(monthly(rows, 'mean')[1].value, 2);
    });
});

describe('change', () => {
    it('is relative to the base and undefined without one', () => {
        assert.equal(change(11, 10), 0.1);
        assert.equal(change(5, null), null);
        assert.equal(change(5, 0), null);
    });
});
