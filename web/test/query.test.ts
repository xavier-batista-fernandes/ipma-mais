import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
    dateRange,
    defaultQuery,
    queryFromParams,
    queryToParams,
    runQuery,
    type Query,
    type ValueMatrix,
} from '../src/query.ts';

// Four days with a gap between the 3rd and the 5th.
const matrix: ValueMatrix = {
    dates: ['2026-07-01', '2026-07-02', '2026-07-03', '2026-07-05', '2026-07-06'],
    values: {
        '0101': [5, 6, 7, 8, 9],
        '0102': [1, 6, null, 6, 6],
        '0103': [2, 2, 2, 2, 2],
        '0104': [null, null, null, null, null],
    },
};

const base = (overrides: Partial<Query>): Query => ({
    ...defaultQuery(matrix.dates, [0, 10]),
    from: '2026-07-01',
    to: '2026-07-06',
    ...overrides,
});

const dicos = (query: Partial<Query>) => runQuery(matrix, base(query)).rows.map((r) => r.dico);

describe('dateRange', () => {
    it('includes both ends and accepts them in either order', () => {
        assert.deepEqual(dateRange(matrix.dates, '2026-07-02', '2026-07-05'), [1, 4]);
        assert.deepEqual(dateRange(matrix.dates, '2026-07-05', '2026-07-02'), [1, 4]);
        assert.deepEqual(dateRange(matrix.dates, '2026-08-01', '2026-08-31'), [5, 5]);
    });
});

describe('threshold', () => {
    it('counts days strictly above the value and keeps municipalities with enough of them', () => {
        const result = runQuery(matrix, base({ type: 'threshold', value: 5, minDays: 3 }));
        assert.deepEqual(
            result.rows.map((r) => [r.dico, r.value, r.days]),
            [
                ['0101', 4, 5],
                ['0102', 3, 4],
            ]
        );
        assert.equal(result.unit, 'days');
        assert.equal(result.considered, 3);
    });

    it('supports below and the period', () => {
        assert.deepEqual(dicos({ type: 'threshold', comparison: 'lt', value: 3 }), [
            '0103',
            '0102',
        ]);
        assert.deepEqual(
            dicos({ type: 'threshold', comparison: 'lt', value: 3, to: '2026-07-01' }),
            ['0102', '0103']
        );
    });
});

describe('streak', () => {
    it('only counts consecutive calendar days, so gaps and missing days end a run', () => {
        const rows = runQuery(matrix, base({ type: 'streak', value: 4, minDays: 1 })).rows;
        assert.deepEqual(
            rows.map((r) => [r.dico, r.value, r.start, r.end]),
            [
                ['0101', 3, '2026-07-01', '2026-07-03'],
                ['0102', 2, '2026-07-05', '2026-07-06'],
            ]
        );
    });

    it('drops runs shorter than the minimum', () => {
        assert.deepEqual(dicos({ type: 'streak', value: 4, minDays: 3 }), ['0101']);
    });
});

describe('total', () => {
    it('sums, averages and ranks over the days with data', () => {
        const sum = runQuery(matrix, base({ type: 'total', statistic: 'sum', limit: 0 })).rows;
        assert.deepEqual(
            sum.map((r) => [r.dico, r.value, r.days]),
            [
                ['0101', 35, 5],
                ['0102', 19, 4],
                ['0103', 10, 5],
            ]
        );
        const mean = runQuery(
            matrix,
            base({ type: 'total', statistic: 'mean', order: 'asc', limit: 2 })
        ).rows;
        assert.deepEqual(
            mean.map((r) => [r.dico, r.value]),
            [
                ['0103', 2],
                ['0102', 4.75],
            ]
        );
    });
});

describe('ranking', () => {
    it('ranks one day', () => {
        assert.deepEqual(dicos({ type: 'ranking', day: '2026-07-02', limit: 2 }), ['0101', '0102']);
        assert.deepEqual(dicos({ type: 'ranking', day: '2026-07-04' }), []);
    });
});

describe('compare', () => {
    it('returns the change between two periods, skipping municipalities missing either', () => {
        const result = runQuery(
            matrix,
            base({
                type: 'compare',
                statistic: 'mean',
                from: '2026-07-05',
                to: '2026-07-06',
                baseFrom: '2026-07-01',
                baseTo: '2026-07-03',
                limit: 0,
            })
        );
        assert.equal(result.signed, true);
        assert.deepEqual(
            result.rows.map((r) => [r.dico, r.value, r.current, r.base]),
            [
                ['0101', 2.5, 8.5, 6],
                ['0102', 2.5, 6, 3.5],
                ['0103', 0, 2, 2],
            ]
        );
    });
});

describe('URL state', () => {
    it('round-trips a query and ignores invalid values', () => {
        const query = base({ type: 'streak', comparison: 'lt', value: 1.5, minDays: 4 });
        const params = new URLSearchParams();
        queryToParams(query, params);
        assert.deepEqual(queryFromParams(params, base({})), query);

        params.set('qt', 'nope');
        params.set('x', 'abc');
        params.set('f', '2026-7-1');
        const fallback = base({});
        const read = queryFromParams(params, fallback);
        assert.equal(read.type, fallback.type);
        assert.equal(read.value, fallback.value);
        assert.equal(read.from, fallback.from);
    });
});
