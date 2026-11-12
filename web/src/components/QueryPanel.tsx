import { useEffect, useId, useState, type ReactNode } from 'react';
import type { MetricInfo, MunicipalityInfo } from '../api';
import { useI18n } from '../i18n';
import {
    QUERY_TYPES,
    STATISTICS,
    addDays,
    snap,
    type Query,
    type QueryResult,
    type ResultRow,
} from '../query';
import { DatePicker } from './DatePicker';
import { Icon } from './Icon';
import { Select } from './Select';

type I18n = ReturnType<typeof useI18n>;

export type ExportKind = 'csv' | 'json' | 'svg' | 'png';
const EXPORTS: ExportKind[] = ['csv', 'json', 'svg', 'png'];

/** One result as text: "12 days", "+1.4 mm" or "34.2 mm". */
export function formatResult(
    { t, format }: I18n,
    result: Pick<QueryResult, 'unit' | 'signed'>,
    value: number,
    unit: string
) {
    if (result.unit === 'days') {
        return value === 1 ? t('query.oneDay') : t('query.manyDays', { count: value });
    }
    return result.signed ? format.signed(value, unit) : format.value(value, unit);
}

/** The query in one line, used above the results and as the title of exports. */
export function describeQuery({ t, format }: I18n, query: Query, unit: string) {
    const values = {
        comparison: t(`query.describe.${query.comparison}`),
        value: format.value(query.value, unit),
        minDays: query.minDays,
        from: format.day(query.from),
        to: format.day(query.to),
        baseFrom: format.day(query.baseFrom),
        baseTo: format.day(query.baseTo),
        day: format.day(query.day),
        statistic: t(`query.statistic.${query.statistic}`),
    };
    return t(`query.describe.${query.type}`, values);
}

interface FormProps {
    /** Fields shown before the question, such as the variable it asks about. */
    children?: ReactNode;
    metric: MetricInfo;
    query: Query;
    onChange: (query: Query) => void;
}

/** The question and its parameters (only those the question uses). Results update on every change. */
export function QueryForm({ children, metric, query, onChange }: FormProps) {
    const { t } = useI18n();
    const set = (patch: Partial<Query>) => onChange({ ...query, ...patch });
    const { type } = query;
    const usesThreshold = type === 'threshold' || type === 'streak';
    const usesPeriod = type !== 'ranking';
    const usesStatistic = type === 'total' || type === 'compare';
    const usesLimit = type === 'total' || type === 'ranking' || type === 'compare';
    const dates = metric.dates;
    const last = dates.at(-1) ?? query.to;

    return (
        <form className="query-form" onSubmit={(e) => e.preventDefault()}>
            {children}
            <Select
                label={t('query.type')}
                value={type}
                onChange={(value) =>
                    set({
                        type: value,
                        // Periods can have different numbers of days with data, so a
                        // comparison of totals would mostly compare data coverage.
                        statistic:
                            value === 'compare' && query.statistic === 'sum'
                                ? 'mean'
                                : query.statistic,
                    })
                }
                options={QUERY_TYPES.map((id) => ({ value: id, label: t(`query.type.${id}`) }))}
            />

            {usesThreshold && (
                <div className="query-row">
                    <Select
                        label={t('query.comparison')}
                        value={query.comparison}
                        onChange={(comparison) => set({ comparison })}
                        options={(['gt', 'lt'] as const).map((id) => ({
                            value: id,
                            label: t(`query.comparison.${id}`),
                        }))}
                    />
                    <NumberField
                        label={t('query.value', { unit: metric.unit })}
                        value={query.value}
                        step={0.1}
                        onChange={(value) => set({ value })}
                    />
                    <NumberField
                        label={t(type === 'streak' ? 'query.minRun' : 'query.minDays')}
                        value={query.minDays}
                        step={1}
                        min={1}
                        integer
                        onChange={(minDays) => set({ minDays })}
                    />
                </div>
            )}

            {usesStatistic && (
                <Select
                    label={t('query.statistic')}
                    value={query.statistic}
                    onChange={(statistic) => set({ statistic })}
                    options={STATISTICS.filter((id) => type !== 'compare' || id !== 'sum').map(
                        (id) => ({
                            value: id,
                            label: t(`query.statistic.${id}`),
                        })
                    )}
                />
            )}

            {usesPeriod && (
                <fieldset className="query-period">
                    <legend className="field-label">{t('query.period')}</legend>
                    <div className="query-row">
                        <DateField
                            label={t('query.from')}
                            dates={dates}
                            value={query.from}
                            onChange={(from) => set({ from })}
                        />
                        <DateField
                            label={t('query.to')}
                            dates={dates}
                            value={query.to}
                            onChange={(to) => set({ to })}
                        />
                    </div>
                    <div className="query-presets">
                        {[7, 30, 90, 365].map((count) => (
                            <button
                                key={count}
                                type="button"
                                className="chip"
                                onClick={() =>
                                    set({
                                        from: snap(dates, addDays(last, 1 - count)),
                                        to: last,
                                    })
                                }
                            >
                                {t('query.preset', { count })}
                            </button>
                        ))}
                    </div>
                </fieldset>
            )}

            {type === 'compare' && (
                <fieldset className="query-period">
                    <legend className="field-label">{t('query.basePeriod')}</legend>
                    <div className="query-row">
                        <DateField
                            label={t('query.baseFrom')}
                            visibleLabel={t('query.from')}
                            dates={dates}
                            value={query.baseFrom}
                            onChange={(baseFrom) => set({ baseFrom })}
                        />
                        <DateField
                            label={t('query.baseTo')}
                            visibleLabel={t('query.to')}
                            dates={dates}
                            value={query.baseTo}
                            onChange={(baseTo) => set({ baseTo })}
                        />
                    </div>
                </fieldset>
            )}

            {type === 'ranking' && (
                <DateField
                    label={t('query.day')}
                    dates={dates}
                    value={query.day}
                    onChange={(day) => set({ day })}
                />
            )}

            {usesLimit && (
                <div className="query-row">
                    <Select
                        label={t('query.order')}
                        value={query.order}
                        onChange={(order) => set({ order })}
                        options={(['desc', 'asc'] as const).map((id) => ({
                            value: id,
                            label: t(
                                type === 'compare'
                                    ? id === 'desc'
                                        ? 'query.order.increase'
                                        : 'query.order.decrease'
                                    : `query.order.${id}`
                            ),
                        }))}
                    />
                    <Select
                        label={t('query.limit')}
                        value={String(query.limit)}
                        onChange={(limit) => set({ limit: Number(limit) })}
                        options={[5, 10, 20, 50, 0].map((count) => ({
                            value: String(count),
                            label:
                                count === 0 ? t('query.limit.all') : t('query.limit.n', { count }),
                        }))}
                    />
                </div>
            )}
        </form>
    );
}

interface ResultsProps {
    metric: MetricInfo;
    query: Query;
    result: QueryResult | null;
    error: string | null;
    byDico: Map<string, MunicipalityInfo>;
    selected: string | null;
    onSelect: (dico: string) => void;
    onExport: (kind: ExportKind) => void;
}

/** The matching municipalities, ranked, with export buttons. */
export function QueryResults({
    metric,
    query,
    result,
    error,
    byDico,
    selected,
    onSelect,
    onExport,
}: ResultsProps) {
    const i18n = useI18n();
    const { t } = i18n;
    const { type } = query;
    const usesThreshold = type === 'threshold' || type === 'streak';

    return (
        <section className="query-results" aria-label={t('query.result')}>
            {error ? (
                <p className="notice">{t('query.loadError', { error })}</p>
            ) : !result ? (
                <p className="muted">{t('query.loading')}</p>
            ) : (
                <>
                    <p className="query-summary" role="status">
                        <strong>
                            {t(usesThreshold ? 'query.matches' : 'query.shown', {
                                count: result.rows.length,
                                total: result.considered,
                            })}
                        </strong>
                        <span className="muted small">
                            {describeQuery(i18n, query, metric.unit)}
                        </span>
                    </p>
                    {type === 'streak' && <p className="muted small">{t('query.streakHint')}</p>}
                    {result.rows.length === 0 ? (
                        <p className="muted">{t('query.none')}</p>
                    ) : (
                        <>
                            <div
                                className="query-export"
                                role="group"
                                aria-label={t('export.label')}
                            >
                                <span className="field-label">
                                    <Icon name="download" /> {t('export.label')}
                                </span>
                                <div className="query-export-buttons">
                                    {EXPORTS.map((kind) => (
                                        <button
                                            key={kind}
                                            type="button"
                                            className="chip"
                                            title={t(`export.${kind}Title`)}
                                            onClick={() => onExport(kind)}
                                        >
                                            {t(`export.${kind}`)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="ranking">
                                <p className="muted">{t('query.hint')}</p>
                                <ResultList
                                    rows={result.rows}
                                    result={result}
                                    unit={metric.unit}
                                    byDico={byDico}
                                    selected={selected}
                                    onSelect={onSelect}
                                />
                            </div>
                        </>
                    )}
                </>
            )}
        </section>
    );
}

function ResultList({
    rows,
    result,
    unit,
    byDico,
    selected,
    onSelect,
}: {
    rows: ResultRow[];
    result: QueryResult;
    unit: string;
    byDico: Map<string, MunicipalityInfo>;
    selected: string | null;
    onSelect: (dico: string) => void;
}) {
    const i18n = useI18n();
    const { t, format } = i18n;
    const magnitudes = rows.map((r) => Math.abs(r.value));
    const max = Math.max(...magnitudes, 0);
    const share = (value: number) => (max > 0 ? 0.06 + (0.94 * Math.abs(value)) / max : 1);
    const detail = (row: ResultRow) => {
        if (row.start && row.end) {
            return t('query.runDates', { start: format.day(row.start), end: format.day(row.end) });
        }
        if (row.current !== undefined && row.base !== undefined) {
            return t('query.versus', {
                current: format.value(row.current, unit),
                base: format.value(row.base, unit),
            });
        }
        if (result.unit === 'days') return t('query.hitsOf', { days: row.days });
        if (row.days > 1) return t('query.daysWithData', { days: row.days });
        return null;
    };

    return (
        <ol className="query-list">
            {rows.map((row, i) => {
                const info = byDico.get(row.dico);
                const extra = detail(row);
                return (
                    <li key={row.dico}>
                        <button
                            type="button"
                            aria-current={row.dico === selected ? 'true' : undefined}
                            onClick={() => onSelect(row.dico)}
                        >
                            <span className="rank">{i + 1}</span>
                            <span className="ranking-name">
                                <span>{info?.name ?? row.dico}</span>
                                <span className="muted small">
                                    {info?.district}
                                    {extra && ` · ${extra}`}
                                </span>
                            </span>
                            <span className="ranking-value">
                                {formatResult(i18n, result, row.value, unit)}
                            </span>
                            <span
                                className="ranking-bar"
                                style={{ transform: `scaleX(${share(row.value)})` }}
                            />
                        </button>
                    </li>
                );
            })}
        </ol>
    );
}

/** A labelled calendar button over the days with data. */
function DateField({
    label,
    visibleLabel,
    dates,
    value,
    onChange,
}: {
    label: string;
    /** Shorter text shown above the button when the fieldset already gives the context. */
    visibleLabel?: string;
    dates: string[];
    value: string;
    onChange: (date: string) => void;
}) {
    const { format } = useI18n();
    return (
        <div className="query-field">
            <span className="field-label" aria-hidden="true">
                {visibleLabel ?? label}
            </span>
            <DatePicker dates={dates} value={value} onChange={onChange} label={label}>
                <Icon name="calendar" />
                <span>{format.day(value)}</span>
                <Icon name="chevronDown" />
            </DatePicker>
        </div>
    );
}

/**
 * A number input that lets you type freely ("4.", "-", "") and only reports valid numbers, so the
 * results don't jump around mid-edit.
 */
function NumberField({
    label,
    value,
    onChange,
    step,
    min,
    integer = false,
}: {
    label: string;
    value: number;
    onChange: (value: number) => void;
    step: number;
    min?: number;
    integer?: boolean;
}) {
    const id = useId();
    const [text, setText] = useState(String(value));
    useEffect(() => {
        setText((current) => (Number(current) === value ? current : String(value)));
    }, [value]);

    return (
        <div className="query-field">
            <label className="field-label" htmlFor={id}>
                {label}
            </label>
            <input
                id={id}
                type="number"
                inputMode={integer ? 'numeric' : 'decimal'}
                step={step}
                min={min}
                value={text}
                onChange={(e) => {
                    setText(e.target.value);
                    const parsed = e.target.valueAsNumber;
                    if (!Number.isFinite(parsed)) return;
                    if (
                        integer &&
                        (!Number.isInteger(parsed) || (min !== undefined && parsed < min))
                    )
                        return;
                    onChange(parsed);
                }}
            />
        </div>
    );
}
