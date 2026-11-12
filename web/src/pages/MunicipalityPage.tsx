import type { Municipality } from 'cartis';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
    getDay,
    getSeries,
    type DayValues,
    type MetricInfo,
    type MunicipalityInfo,
    type Series,
} from '../api';
import { createColorScale } from '../colors';
import { download, toCsv } from '../export';
import { useFollowing } from '../following';
import { useI18n } from '../i18n';
import { Icon } from '../components/Icon';
import { MapView } from '../components/MapView';
import { MonthlyChart } from '../components/MonthlyChart';
import { SeriesChart } from '../components/SeriesChart';
import { change, monthly, summarize, type Aggregate } from '../municipality';
import { followLink, municipalityHref, routeHref } from '../route';

interface Props {
    info: MunicipalityInfo;
    metric: MetricInfo;
    /** The variable picker, shared with the other pages. */
    metricSelect: ReactNode;
    municipalities: MunicipalityInfo[];
    slugOf: (name: Municipality) => string;
    staleNote: string | null;
    /** Opens the map on this municipality, on `date` when given. */
    onOpenMap: (date?: string) => void;
    onOpenMunicipality: (name: Municipality) => void;
}

/**
 * Everything about one municipality: the latest day against the country, the last week, this
 * month against the same days a year earlier, the record, the daily series against the year
 * before, totals per month, where it is and how it ranks in its district.
 */
export function MunicipalityPage({
    info,
    metric,
    metricSelect,
    municipalities,
    slugOf,
    staleNote,
    onOpenMap,
    onOpenMunicipality,
}: Props) {
    const i18n = useI18n();
    const { t, format, locale } = i18n;
    const { following, toggle } = useFollowing();
    const followed = following.includes(info.dico);
    const [series, setSeries] = useState<Series | null>(null);
    const [day, setDay] = useState<DayValues | null>(null);
    // Evapotranspiration and rain add up over days; a temperature only averages.
    const aggregate: Aggregate = metric.id === 'et0' || metric.id === 'prec' ? 'sum' : 'mean';

    useEffect(() => {
        const previous = document.title;
        document.title = `${info.name} · IPMA+`;
        return () => {
            document.title = previous;
        };
    }, [info.name]);

    useEffect(() => {
        let current = true;
        setSeries(null);
        getSeries(metric.id, info.dico).then(
            (s) => current && setSeries(s),
            () => current && setSeries({ dico: info.dico, rows: [] })
        );
        return () => {
            current = false;
        };
    }, [metric.id, info.dico]);

    useEffect(() => {
        let current = true;
        setDay(null);
        if (metric.lastDate)
            getDay(metric.id, metric.lastDate).then(
                (d) => current && setDay(d),
                () => {}
            );
        return () => {
            current = false;
        };
    }, [metric.id, metric.lastDate]);

    const summary = useMemo(
        () => (series ? summarize(series.rows, aggregate) : null),
        [series, aggregate]
    );
    const months = useMemo(
        () => (series ? monthly(series.rows, aggregate) : []),
        [series, aggregate]
    );
    const scale = useMemo(() => createColorScale(metric), [metric]);

    const byDico = useMemo(() => new Map(municipalities.map((m) => [m.dico, m])), [municipalities]);
    const fills = useMemo(() => {
        const result = new Map<Municipality, string>();
        if (!day) return result;
        for (const [dico, value] of Object.entries(day.values)) {
            const m = byDico.get(dico);
            if (m) result.set(m.name, scale.color(value));
        }
        return result;
    }, [day, byDico, scale]);
    const allNames = useMemo(() => municipalities.map((m) => m.name), [municipalities]);

    const district = useMemo(
        () =>
            day
                ? municipalities
                      .filter(
                          (m) => m.district === info.district && day.values[m.dico] !== undefined
                      )
                      .map((m) => ({ ...m, value: day.values[m.dico] }))
                      .sort((a, b) => b.value - a.value)
                : [],
        [day, municipalities, info.district]
    );
    const countryMean = useMemo(() => {
        const values = day ? Object.values(day.values) : [];
        return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
    }, [day]);

    const longMonth = new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' });
    const percent = new Intl.NumberFormat(locale, {
        style: 'percent',
        signDisplay: 'exceptZero',
        maximumFractionDigits: 0,
    });
    const round = (value: number) => Math.round(value * 100) / 100;
    const amount = (value: number | null) =>
        value === null ? '—' : format.value(round(value), metric.unit);
    const signed = (value: number) => format.signed(round(value), metric.unit);

    const exportCsv = () => {
        if (!series) return;
        const body = series.rows.map(([date, mean, min, max]) => [
            date,
            mean,
            min ?? '',
            max ?? '',
        ]);
        download(
            `ipma-mais-${metric.id}-${slugOf(info.name)}.csv`,
            toCsv(['date', 'mean', 'min', 'max'], body),
            'text/csv;charset=utf-8'
        );
    };

    const kpis =
        summary &&
        (() => {
            const { last, week, previousWeek, month, sameMonthLastYear } = summary;
            const lowIsNotable = metric.id === 'tmin' || metric.id === 'vhi' || metric.id === 'smi';
            const record = lowIsNotable ? summary.lowest : summary.highest;
            const monthName = longMonth.format(new Date(`${last.date}T00:00:00Z`));
            const lastYear = `${format.month(sameMonthLastYear.from)} ${sameMonthLastYear.from.slice(0, 4)}`;
            const monthChange = (() => {
                if (month.value === null || sameMonthLastYear.value === null)
                    return t('municipality.noLastYear', { period: lastYear });
                const diff =
                    aggregate === 'sum'
                        ? percent.format(change(month.value, sameMonthLastYear.value) ?? 0)
                        : signed(month.value - sameMonthLastYear.value);
                return t('municipality.vsPeriod', { diff, period: lastYear });
            })();
            return [
                {
                    label: t('municipality.lastDay', { date: format.day(last.date) }),
                    value: amount(last.value),
                    detail:
                        countryMean === null || day?.date !== last.date
                            ? null
                            : t('municipality.vsCountry', {
                                  diff: signed(last.value - countryMean),
                              }),
                    trend: countryMean === null ? 0 : last.value - countryMean,
                },
                {
                    label: t(`municipality.week.${aggregate}`),
                    value: amount(week.value),
                    detail:
                        week.value === null || previousWeek.value === null
                            ? null
                            : t('municipality.vsWeek', {
                                  diff: signed(week.value - previousWeek.value),
                              }),
                    trend:
                        week.value === null || previousWeek.value === null
                            ? 0
                            : week.value - previousWeek.value,
                    note:
                        week.days < 7
                            ? t('municipality.daysWithData', { days: week.days, total: 7 })
                            : null,
                },
                {
                    label: t(`municipality.month.${aggregate}`, {
                        month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
                        day: Number(last.date.slice(8)),
                    }),
                    value: amount(month.value),
                    detail: monthChange,
                    trend:
                        month.value === null || sameMonthLastYear.value === null
                            ? 0
                            : month.value - sameMonthLastYear.value,
                },
                {
                    label: t(lowIsNotable ? 'municipality.lowest' : 'municipality.highest'),
                    value: amount(record.value),
                    detail: format.day(record.date),
                    trend: 0,
                },
            ];
        })();

    return (
        <main className="municipality-page">
            <header className="municipality-head">
                <div className="municipality-title">
                    <p className="day-label">{t('panel.district', { district: info.district })}</p>
                    <h1>{info.name}</h1>
                    <p className="muted small">
                        {t('municipality.code', { code: info.dico })}
                        {series?.rows[0] &&
                            ` · ${t('municipality.since', { date: format.day(series.rows[0][0]) })}`}
                    </p>
                </div>
                <div className="municipality-actions">
                    {metricSelect}
                    <button
                        type="button"
                        className="button-outline"
                        aria-pressed={followed}
                        title={t('municipality.followHint')}
                        onClick={() => toggle(info.dico)}
                    >
                        <Icon name={followed ? 'starFilled' : 'star'} />
                        {t(followed ? 'municipality.following' : 'municipality.follow')}
                    </button>
                    <button type="button" className="button-outline" onClick={() => onOpenMap()}>
                        <Icon name="map" />
                        {t('municipality.showOnMap')}
                    </button>
                    <button
                        type="button"
                        className="button-outline"
                        disabled={!series || series.rows.length === 0}
                        onClick={exportCsv}
                    >
                        <Icon name="download" />
                        {t('municipality.csv')}
                    </button>
                </div>
            </header>

            {staleNote && <p className="notice">{staleNote}</p>}

            {!series ? (
                <p className="status">{t('panel.loadingSeries')}</p>
            ) : !kpis ? (
                <p className="status">{t('chart.noData')}</p>
            ) : (
                <>
                    <section className="kpis" aria-label={t('municipality.summary')}>
                        {kpis.map((kpi) => (
                            <div className="kpi" key={kpi.label}>
                                <p className="field-label">{kpi.label}</p>
                                <p className="kpi-value">{kpi.value}</p>
                                {kpi.detail && (
                                    <p
                                        className="kpi-detail"
                                        data-trend={
                                            kpi.trend > 0
                                                ? 'up'
                                                : kpi.trend < 0
                                                  ? 'down'
                                                  : undefined
                                        }
                                    >
                                        {kpi.detail}
                                    </p>
                                )}
                                {'note' in kpi && kpi.note && (
                                    <p className="kpi-detail muted">{kpi.note}</p>
                                )}
                            </div>
                        ))}
                    </section>

                    <div className="municipality-grid">
                        <div className="municipality-main">
                            <section className="card" aria-labelledby="daily-title">
                                <h2 id="daily-title" className="field-label">
                                    {t('municipality.daily')} ({metric.unit})
                                </h2>
                                <SeriesChart
                                    rows={series.rows}
                                    unit={metric.unit}
                                    highlightDate={summary!.last.date}
                                    onPickDate={(date) => onOpenMap(date)}
                                    width={720}
                                    height={230}
                                    previousYear
                                />
                            </section>
                            <section className="card" aria-labelledby="monthly-title">
                                <h2 id="monthly-title" className="field-label">
                                    {t(`municipality.monthly.${aggregate}`)} ({metric.unit})
                                </h2>
                                <MonthlyChart
                                    months={months}
                                    year={Number(summary!.last.date.slice(0, 4))}
                                    unit={metric.unit}
                                    aggregate={aggregate}
                                />
                            </section>
                        </div>

                        <aside className="municipality-side">
                            <section className="card locator" aria-labelledby="locator-title">
                                <h2 id="locator-title" className="field-label">
                                    {t('municipality.location')}
                                </h2>
                                <div className="locator-map">
                                    <MapView
                                        fills={fills}
                                        allNames={allNames}
                                        selected={info.name}
                                        onHover={() => {}}
                                        onSelect={onOpenMunicipality}
                                        zoomToSelected={false}
                                    />
                                </div>
                            </section>
                            {district.length > 0 && day && (
                                <section className="card ranking" aria-labelledby="district-title">
                                    <h2 id="district-title" className="field-label">
                                        {t('municipality.districtOn', {
                                            district: info.district,
                                            date: format.day(day.date),
                                        })}
                                    </h2>
                                    <ol>
                                        {district.map((m, i) => (
                                            <li key={m.dico}>
                                                <a
                                                    href={municipalityHref(
                                                        slugOf(m.name),
                                                        metric.id
                                                    )}
                                                    onClick={followLink}
                                                    aria-current={
                                                        m.dico === info.dico ? 'page' : undefined
                                                    }
                                                >
                                                    <span className="rank">{i + 1}</span>
                                                    <span className="ranking-name">
                                                        <span>{m.name}</span>
                                                    </span>
                                                    <span className="ranking-value">
                                                        {format.value(m.value, metric.unit)}
                                                    </span>
                                                </a>
                                            </li>
                                        ))}
                                    </ol>
                                </section>
                            )}
                        </aside>
                    </div>
                </>
            )}
        </main>
    );
}

/** Shown when the address names no municipality. */
export function MunicipalityNotFound({ metric }: { metric: string }) {
    const { t } = useI18n();
    return (
        <main className="page">
            <h1>{t('municipality.notFound')}</h1>
            <p>
                <a className="button" href={routeHref('map', metric)} onClick={followLink}>
                    <Icon name="map" />
                    {t('municipality.backToMap')}
                </a>
            </p>
        </main>
    );
}
