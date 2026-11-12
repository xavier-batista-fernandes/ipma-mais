import type { Municipality } from 'cartis';
import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { getValues, type MetricInfo, type MunicipalityInfo } from '../api';
import { Icon } from '../components/Icon';
import { useFollowing } from '../following';
import { useI18n } from '../i18n';
import type { ValueMatrix } from '../query';
import { followLink, municipalityHref } from '../route';

type Order = 'district' | 'name' | 'value';
const ORDERS: Order[] = ['district', 'name', 'value'];
/** Days drawn in each row's sparkline. */
const TREND_DAYS = 30;

interface Props {
    metric: MetricInfo;
    metricSelect: ReactNode;
    municipalities: MunicipalityInfo[];
    slugOf: (name: Municipality) => string;
}

interface Row extends MunicipalityInfo {
    /** The latest day's value, when there is one. */
    value: number | undefined;
    trend: (number | null)[];
}

/** Lower case without accents, so "evora" finds Évora. */
const fold = (text: string) =>
    text
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase();

/**
 * Every municipality in a list that reads without the map: the latest value, the last 30 days and
 * the difference from the country's average. Followed municipalities come first.
 */
export function MunicipalitiesPage({ metric, metricSelect, municipalities, slugOf }: Props) {
    const { t, format } = useI18n();
    const { following, toggle } = useFollowing();
    const [matrix, setMatrix] = useState<(ValueMatrix & { metric: string }) | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState('');
    const [order, setOrder] = useState<Order>('district');
    const filterId = useId();

    useEffect(() => {
        let current = true;
        setError(null);
        getValues(metric.id).then(
            (values) => current && setMatrix({ ...values, metric: metric.id }),
            (e: unknown) => current && setError(String(e))
        );
        return () => {
            current = false;
        };
    }, [metric.id]);

    const data = matrix?.metric === metric.id ? matrix : null;
    const lastIndex = data ? data.dates.length - 1 : -1;
    const lastDate = data?.dates[lastIndex] ?? null;

    const rows = useMemo<Row[]>(
        () =>
            municipalities.map((m) => {
                const series = data?.values[m.dico] ?? [];
                const value = series[lastIndex];
                return {
                    ...m,
                    value: value === null || value === undefined ? undefined : value,
                    trend: series.slice(-TREND_DAYS),
                };
            }),
        [municipalities, data, lastIndex]
    );
    const countryMean = useMemo(() => {
        const values = rows.flatMap((r) => (r.value === undefined ? [] : [r.value]));
        return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
    }, [rows]);

    const shown = useMemo(() => {
        const query = fold(filter.trim());
        const matching = query
            ? rows.filter((r) => fold(r.name).includes(query) || fold(r.district).includes(query))
            : rows;
        const byName = (a: Row, b: Row) => a.name.localeCompare(b.name, 'pt');
        if (order === 'value')
            return [...matching].sort((a, b) => (b.value ?? -Infinity) - (a.value ?? -Infinity));
        if (order === 'name') return [...matching].sort(byName);
        return [...matching].sort(
            (a, b) => a.district.localeCompare(b.district, 'pt') || byName(a, b)
        );
    }, [rows, filter, order]);

    // Groups: one per district, or a single unlabelled one when sorted otherwise.
    const groups = useMemo(() => {
        if (order !== 'district') return [{ name: null as string | null, rows: shown }];
        const map = new Map<string, Row[]>();
        for (const row of shown) {
            if (!map.has(row.district)) map.set(row.district, []);
            map.get(row.district)!.push(row);
        }
        return [...map].map(([name, rows]) => ({ name: name as string | null, rows }));
    }, [shown, order]);

    const followed = rows.filter((r) => following.includes(r.dico));
    const round = (value: number) => Math.round(value * 100) / 100;

    const list = (items: Row[], label: string) => (
        <ul className="municipality-list" aria-label={label}>
            {items.map((row) => {
                const isFollowed = following.includes(row.dico);
                const diff =
                    row.value === undefined || countryMean === null
                        ? null
                        : round(row.value - countryMean);
                return (
                    <li key={row.dico}>
                        <button
                            type="button"
                            className="star"
                            aria-pressed={isFollowed}
                            aria-label={t(
                                isFollowed ? 'municipalities.unfollow' : 'municipalities.follow',
                                {
                                    name: row.name,
                                }
                            )}
                            onClick={() => toggle(row.dico)}
                        >
                            <Icon name={isFollowed ? 'starFilled' : 'star'} />
                        </button>
                        <a
                            className="municipality-link"
                            href={municipalityHref(slugOf(row.name), metric.id)}
                            onClick={followLink}
                        >
                            <span className="municipality-name">{row.name}</span>
                            <span className="muted small">{row.district}</span>
                        </a>
                        <span className="municipality-value">
                            {row.value === undefined ? '—' : format.value(row.value, metric.unit)}
                        </span>
                        <Sparkline values={row.trend} />
                        <span
                            className="municipality-diff"
                            data-trend={
                                diff === null || diff === 0 ? undefined : diff > 0 ? 'up' : 'down'
                            }
                        >
                            {diff === null
                                ? ''
                                : t('municipalities.vsCountry', {
                                      diff: format.signed(diff, metric.unit),
                                  })}
                        </span>
                    </li>
                );
            })}
        </ul>
    );

    return (
        <main className="municipalities-page">
            <header className="municipalities-head">
                <div>
                    <h1>{t('municipalities.title')}</h1>
                    <p className="muted">
                        {lastDate
                            ? t('municipalities.subtitle', {
                                  count: municipalities.length,
                                  metric: t(`metric.${metric.id}`),
                                  date: format.day(lastDate),
                              })
                            : t('app.loading')}
                    </p>
                </div>
                <div className="municipalities-controls">
                    <div className="query-field">
                        <label className="field-label" htmlFor={filterId}>
                            {t('municipalities.filter')}
                        </label>
                        <input
                            id={filterId}
                            type="search"
                            value={filter}
                            placeholder={t('municipalities.filterPlaceholder')}
                            onChange={(e) => setFilter(e.target.value)}
                        />
                    </div>
                    <div>
                        <span className="field-label" id="order-label">
                            {t('municipalities.order')}
                        </span>
                        <div className="segmented" role="group" aria-labelledby="order-label">
                            {ORDERS.map((id) => (
                                <button
                                    key={id}
                                    type="button"
                                    aria-pressed={order === id}
                                    onClick={() => setOrder(id)}
                                >
                                    {t(`municipalities.order.${id}`)}
                                </button>
                            ))}
                        </div>
                    </div>
                    {metricSelect}
                </div>
            </header>

            {error && <p className="notice">{t('query.loadError', { error })}</p>}

            {followed.length > 0 && !filter && (
                <section className="card list-card" aria-labelledby="following-title">
                    <h2 id="following-title" className="field-label">
                        {t('following.title')} · {followed.length}
                    </h2>
                    {list(followed, t('following.title'))}
                </section>
            )}

            {shown.length === 0 ? (
                <p className="muted">{t('search.noResults')}</p>
            ) : (
                groups.map((group) => (
                    <section
                        key={group.name ?? 'all'}
                        className="card list-card"
                        aria-label={group.name ?? t('municipalities.title')}
                    >
                        {group.name && (
                            <h2 className="field-label">
                                {t('panel.district', { district: group.name })} ·{' '}
                                {group.rows.length}
                            </h2>
                        )}
                        {list(group.rows, group.name ?? t('municipalities.title'))}
                    </section>
                ))
            )}
        </main>
    );
}

/** The last days as a small line, so a rising or falling municipality stands out in the list. */
function Sparkline({ values }: { values: (number | null)[] }) {
    const width = 120;
    const height = 26;
    const known = values.filter((v): v is number => v !== null);
    if (known.length < 2) return <span className="sparkline" />;
    const min = Math.min(...known);
    const max = Math.max(...known);
    const x = (i: number) => (i / (values.length - 1)) * width;
    const y = (v: number) => height - 3 - ((v - min) / (max - min || 1)) * (height - 6);
    let d = '';
    let pen = false;
    values.forEach((v, i) => {
        if (v === null) {
            pen = false;
            return;
        }
        d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`;
        pen = true;
    });
    const lastIndex = values.findLastIndex((v) => v !== null);
    return (
        <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
            <path d={d} />
            <circle cx={x(lastIndex)} cy={y(values[lastIndex]!)} r={2.2} />
        </svg>
    );
}
