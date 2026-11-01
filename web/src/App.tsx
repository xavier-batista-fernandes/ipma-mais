import type { Municipality, MunicipalityInteractionEvent } from 'cartis';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
    getDay,
    getIndex,
    getSeries,
    getValues,
    type ApiIndex,
    type DayValues,
    type MetricId,
    type MetricInfo,
    type Series,
} from './api';
import { createColorScale, createResultScale, MISSING_FILL } from './colors';
import { download, mapToSvg, svgToPng, toCsv } from './export';
import { Header } from './components/Header';
import { Icon } from './components/Icon';
import { Legend } from './components/Legend';
import { MapView } from './components/MapView';
import { describeQuery, formatResult, QueryPanel, type ExportKind } from './components/QueryPanel';
import { Search } from './components/Search';
import { Select } from './components/Select';
import { SeriesChart } from './components/SeriesChart';
import { Timeline } from './components/Timeline';
import { useI18n } from './i18n';
import { AboutPage } from './pages/AboutPage';
import { SettingsPage } from './pages/SettingsPage';
import { useRoute, type Route } from './route';
import {
    defaultQuery,
    queryFromParams,
    runQuery,
    type Query,
    type QueryResult,
    type ValueMatrix,
} from './query';
import { readUrlState, writeUrlState, type Mode } from './url-state';

export function App() {
    const route = useRoute();
    const i18n = useI18n();
    const { t, format } = i18n;
    const [index, setIndex] = useState<ApiIndex | null>(null);
    const [error, setError] = useState<string | null>(null);

    const initial = useMemo(readUrlState, []);
    const [metricId, setMetricId] = useState<MetricId>(initial.metric ?? 'et0');
    const [date, setDate] = useState<string | null>(initial.date ?? null);
    const [selectedDico, setSelectedDico] = useState<string | null>(initial.dico ?? null);
    const [mode, setMode] = useState<Mode>(initial.mode ?? 'day');
    const [query, setQuery] = useState<Query | null>(null);
    const [matrix, setMatrix] = useState<(ValueMatrix & { metric: MetricId }) | null>(null);
    const [matrixError, setMatrixError] = useState<string | null>(null);

    // The last day loaded for the current metric. While the next one loads the map keeps showing
    // this one instead of flashing to "no data", which matters most while playing through time.
    const [day, setDay] = useState<(DayValues & { metric: MetricId }) | null>(null);
    const [series, setSeries] = useState<Series | null>(null);
    const [hover, setHover] = useState<MunicipalityInteractionEvent | null>(null);

    useEffect(() => {
        getIndex().then(setIndex, (e: unknown) => setError(String(e)));
    }, []);

    const metric = index?.metrics.find((m) => m.id === metricId) ?? index?.metrics[0] ?? null;
    const byName = useMemo(
        () => new Map(index?.municipalities.map((m) => [m.name, m]) ?? []),
        [index]
    );
    const byDico = useMemo(
        () => new Map(index?.municipalities.map((m) => [m.dico, m]) ?? []),
        [index]
    );
    const allNames = useMemo(() => index?.municipalities.map((m) => m.name) ?? [], [index]);
    const scale = useMemo(() => (metric ? createColorScale(metric) : null), [metric]);
    const selected = selectedDico ? (byDico.get(selectedDico) ?? null) : null;

    // Keep the date valid for the current metric: fall back to its latest day.
    const activeDate =
        metric && date && metric.dates.includes(date) ? date : (metric?.lastDate ?? null);

    useEffect(() => {
        if (!metric || !activeDate) return;
        let current = true;
        getDay(metric.id, activeDate).then(
            (d) => current && setDay({ ...d, metric: metric.id }),
            (e: unknown) => setError(String(e))
        );
        return () => {
            current = false;
        };
    }, [metric, activeDate]);

    useEffect(() => {
        setSeries(null);
        if (!metric || !selectedDico) return;
        let current = true;
        getSeries(metric.id, selectedDico).then(
            (s) => current && setSeries(s),
            () => current && setSeries({ dico: selectedDico, rows: [] })
        );
        return () => {
            current = false;
        };
    }, [metric, selectedDico]);

    // The query starts from the URL (or defaults fitted to the metric's dates) and starts over,
    // keeping only the question, when the metric changes.
    const queryMetric = useRef<MetricId | null>(null);
    useEffect(() => {
        if (!metric || queryMetric.current === metric.id) return;
        const defaults = defaultQuery(metric.dates, metric.domain);
        const first = queryMetric.current === null;
        queryMetric.current = metric.id;
        setQuery((current) =>
            first
                ? queryFromParams(initial.params, defaults)
                : { ...defaults, type: current?.type ?? defaults.type }
        );
    }, [metric, initial]);

    useEffect(() => {
        if (mode !== 'query' || !metric) return;
        let current = true;
        setMatrixError(null);
        getValues(metric.id).then(
            (values) => current && setMatrix({ ...values, metric: metric.id }),
            (e: unknown) => current && setMatrixError(String(e))
        );
        return () => {
            current = false;
        };
    }, [mode, metric]);

    const queryResult = useMemo<QueryResult | null>(
        () =>
            mode === 'query' && query && matrix && matrix.metric === metric?.id
                ? runQuery(matrix, query)
                : null,
        [mode, query, matrix, metric]
    );
    const resultByDico = useMemo(
        () => new Map(queryResult?.rows.map((row) => [row.dico, row]) ?? []),
        [queryResult]
    );
    const resultScale = useMemo(
        () =>
            queryResult && metric
                ? createResultScale(
                      metric,
                      queryResult.rows.map((row) => row.value),
                      { integer: queryResult.unit === 'days', signed: queryResult.signed }
                  )
                : null,
        [queryResult, metric]
    );

    useEffect(() => {
        writeUrlState({ metric: metricId, date: activeDate, dico: selectedDico, mode, query });
    }, [metricId, activeDate, selectedDico, mode, query]);

    const fills = useMemo(() => {
        const result = new Map<Municipality, string>();
        if (mode === 'query') {
            if (!resultScale) return result;
            for (const row of resultByDico.values()) {
                const info = byDico.get(row.dico);
                if (info) result.set(info.name, resultScale.color(row.value));
            }
            return result;
        }
        if (!day || !scale || day.metric !== metric?.id) return result;
        for (const [dico, value] of Object.entries(day.values)) {
            const info = byDico.get(dico);
            if (info) result.set(info.name, scale.color(value));
        }
        return result;
    }, [mode, resultScale, resultByDico, day, scale, byDico, metric]);

    // The map's state above lives on while another page is open, so coming back restores it.
    const shell = (page: ReactNode) => (
        <Shell route={route} generatedAt={index?.generatedAt ?? null}>
            {page}
        </Shell>
    );
    if (route === 'settings') return shell(<SettingsPage />);
    if (route === 'about') return shell(<AboutPage generatedAt={index?.generatedAt ?? null} />);
    if (error) return shell(<div className="status">{t('app.loadError', { error })}</div>);
    if (!index || !metric || !scale) return shell(<div className="status">{t('app.loading')}</div>);

    const querying = mode === 'query' && query !== null;
    const shownDay = day?.metric === metric.id ? day : null;
    // What the map shows for a municipality: the day's value, or its query result.
    const valueOf = (dico: string) =>
        querying ? resultByDico.get(dico)?.value : shownDay?.values[dico];
    const describeValue = (value: number | undefined, missing: string) => {
        if (value === undefined) return missing;
        if (querying && queryResult) return formatResult(i18n, queryResult, value, metric.unit);
        return format.value(value, metric.unit);
    };
    const hoverInfo = hover ? byName.get(hover.municipality) : undefined;
    const hoverValue = hoverInfo ? valueOf(hoverInfo.dico) : undefined;
    const selectedValue = selected ? valueOf(selected.dico) : undefined;
    const legendScale = querying ? resultScale : scale;
    const legendUnit = querying && queryResult?.unit === 'days' ? t('query.unitDays') : metric.unit;
    const missingLabel = querying ? t('query.notInResults') : t('common.noData');

    const exportResults = async (kind: ExportKind) => {
        if (!query || !queryResult || !resultScale) return;
        const description = describeQuery(i18n, query, metric.unit);
        const period = query.type === 'ranking' ? query.day : `${query.from}_${query.to}`;
        const filename = `ipma-mais-${metric.id}-${query.type}-${period}`;
        const valueUnit = queryResult.unit === 'days' ? 'days' : metric.unit;
        const rows = queryResult.rows.map((row, i) => ({
            rank: i + 1,
            municipality: byDico.get(row.dico)?.name ?? '',
            district: byDico.get(row.dico)?.district ?? '',
            ...row,
        }));

        if (kind === 'csv') {
            const extra =
                query.type === 'streak'
                    ? (['start', 'end'] as const)
                    : query.type === 'compare'
                      ? (['current', 'base'] as const)
                      : ([] as const);
            const header = [
                'rank',
                'dico',
                'municipality',
                'district',
                'value',
                'unit',
                'days_with_data',
                ...extra,
            ];
            const body = rows.map((r) => [
                r.rank,
                r.dico,
                r.municipality,
                r.district,
                r.value,
                valueUnit,
                r.days,
                ...extra.map((key) => r[key]),
            ]);
            download(`${filename}.csv`, toCsv(header, body), 'text/csv;charset=utf-8');
        } else if (kind === 'json') {
            const json = {
                metric: { id: metric.id, name: t(`metric.${metric.id}`), unit: metric.unit },
                query,
                description,
                unit: valueUnit,
                municipalitiesWithData: queryResult.considered,
                dataUpdated: index.generatedAt,
                exported: new Date().toISOString(),
                source: 'IPMA (https://www.ipma.pt), collected by IPMA+',
                results: rows,
            };
            download(`${filename}.json`, `${JSON.stringify(json, null, 2)}\n`, 'application/json');
        } else {
            const svg = mapImage(metric, description, resultScale, legendUnit);
            if (!svg) return;
            if (kind === 'svg') download(`${filename}.svg`, svg, 'image/svg+xml');
            else download(`${filename}.png`, await svgToPng(svg));
        }
    };

    const mapImage = (
        info: MetricInfo,
        subtitle: string,
        imageScale: NonNullable<typeof resultScale>,
        unit: string
    ) => {
        const svg = document.querySelector<SVGSVGElement>('.map svg');
        if (!svg) return null;
        const css = getComputedStyle(document.documentElement);
        const token = (name: string) => css.getPropertyValue(name).trim();
        return mapToSvg(
            svg,
            (path) => {
                const datum = (path as { __data__?: { properties?: { NAME_2?: string } } })
                    .__data__;
                const name = datum?.properties?.NAME_2 as Municipality | undefined;
                return (name && fills.get(name)) || MISSING_FILL;
            },
            {
                title: t(`metric.${info.id}`),
                subtitle,
                scale: imageScale,
                tick: (value) =>
                    queryResult?.signed ? format.signed(value, '').trim() : format.number(value),
                unit,
                missingColor: MISSING_FILL,
                missingLabel,
                source: t('export.source', {
                    url: `${window.location.host}${window.location.pathname}`,
                }),
                background: token('--surface') || '#ffffff',
                text: token('--text') || '#0f172a',
                muted: token('--muted') || '#64748b',
            }
        );
    };
    const staleNote =
        metric.lastDate &&
        Date.parse(index.generatedAt) - Date.parse(metric.lastDate) > 14 * 86400000
            ? t('panel.stale', { date: format.date(metric.lastDate) })
            : null;

    return shell(
        <>
            <div className="toolbar">
                <div className="controls">
                    <Select
                        label={t('controls.metric')}
                        value={metric.id}
                        onChange={setMetricId}
                        options={index.metrics.map((m) => ({
                            value: m.id,
                            label: t(`metric.${m.id}`),
                            tag: m.unit,
                        }))}
                    />
                    <Search
                        onSelect={(name) => setSelectedDico(byName.get(name)?.dico ?? null)}
                        describe={(name) => byName.get(name)?.district}
                    />
                    <div className="mode-switch">
                        <span className="field-label" id="mode-label">
                            {t('mode.label')}
                        </span>
                        <div className="segmented" role="group" aria-labelledby="mode-label">
                            {(['day', 'query'] as const).map((id) => (
                                <button
                                    key={id}
                                    type="button"
                                    aria-pressed={mode === id}
                                    onClick={() => setMode(id)}
                                >
                                    <Icon name={id === 'day' ? 'map' : 'filter'} />
                                    {t(`mode.${id}`)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <main className="map-layout" data-mode={mode}>
                <section className="map-panel">
                    <div className="map-stage">
                        <MapView
                            fills={fills}
                            allNames={allNames}
                            selected={selected?.name ?? null}
                            onHover={setHover}
                            onSelect={(name) => setSelectedDico(byName.get(name)?.dico ?? null)}
                        />
                        {hover && hoverInfo && (
                            <div className="tooltip" style={{ left: hover.x, top: hover.y }}>
                                <strong>{hover.municipality}</strong>
                                <span className="muted small">{hover.district}</span>
                                <span className="tooltip-value">
                                    {describeValue(hoverValue, missingLabel)}
                                </span>
                            </div>
                        )}
                        {legendScale && (
                            <Legend
                                scale={legendScale}
                                unit={legendUnit}
                                marker={hoverValue ?? selectedValue}
                                missingLabel={missingLabel}
                            />
                        )}
                    </div>
                    {!querying && activeDate && metric.dates.length > 0 && (
                        <Timeline
                            dates={metric.dates}
                            value={activeDate}
                            onChange={setDate}
                            preload={(d) => getDay(metric.id, d)}
                        />
                    )}
                </section>

                <aside className="side-panel">
                    {!querying && (
                        <p className="day-label">
                            {activeDate ? format.dateTitle(activeDate) : t('panel.noData')}
                        </p>
                    )}
                    {staleNote && <p className="notice">{staleNote}</p>}
                    {selected ? (
                        <>
                            <div className="selected-head">
                                <div>
                                    <h2>{selected.name}</h2>
                                    <p className="muted">
                                        {t('panel.district', { district: selected.district })}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    className="icon-button ghost"
                                    aria-label={t('panel.close')}
                                    title={t('panel.close')}
                                    onClick={() => setSelectedDico(null)}
                                >
                                    <Icon name="close" />
                                </button>
                            </div>
                            {querying && <p className="day-label">{t('query.result')}</p>}
                            <p className="big-value">
                                {describeValue(
                                    selectedValue,
                                    querying ? t('query.notInResults') : t('panel.noDataThisDay')
                                )}
                            </p>
                            {series ? (
                                <SeriesChart
                                    rows={series.rows}
                                    unit={metric.unit}
                                    highlightDate={querying ? query.to : (activeDate ?? '')}
                                    onPickDate={(picked) => {
                                        setDate(picked);
                                        setMode('day');
                                    }}
                                />
                            ) : (
                                <p className="muted">{t('panel.loadingSeries')}</p>
                            )}
                        </>
                    ) : querying ? (
                        <QueryPanel
                            metric={metric}
                            query={query}
                            onChange={setQuery}
                            result={queryResult}
                            error={matrixError}
                            byDico={byDico}
                            onSelect={setSelectedDico}
                            onExport={(kind) => void exportResults(kind)}
                        />
                    ) : (
                        <Ranking
                            day={shownDay}
                            byDico={byDico}
                            unit={metric.unit}
                            onSelect={setSelectedDico}
                        />
                    )}
                </aside>
            </main>
        </>
    );
}

/** Header, the current page and the footer. */
function Shell({
    route,
    generatedAt,
    children,
}: {
    route: Route;
    generatedAt: string | null;
    children: ReactNode;
}) {
    const { t, format } = useI18n();
    return (
        <div className="app" data-route={route}>
            <Header route={route} />
            {children}
            <footer>
                {t('footer.source')} <a href="https://www.ipma.pt">IPMA</a>,{' '}
                {t('footer.collectedBy')}{' '}
                <a href="https://github.com/xavier-batista-fernandes/ipma-mais">IPMA+</a>.{' '}
                {t('footer.mapBy')}{' '}
                <a href="https://github.com/xavier-batista-fernandes/cartis">Cartis</a>.
                {generatedAt &&
                    ` ${t('footer.updated', { date: format.date(generatedAt.slice(0, 10)) })}`}
            </footer>
        </div>
    );
}

function Ranking({
    day,
    byDico,
    unit,
    onSelect,
}: {
    day: DayValues | null;
    byDico: Map<string, ApiIndex['municipalities'][number]>;
    unit: string;
    onSelect: (dico: string) => void;
}) {
    const { t, format } = useI18n();
    if (!day) return <p className="muted">{t('app.loading')}</p>;
    const sorted = Object.entries(day.values).sort((a, b) => b[1] - a[1]);
    const min = sorted.at(-1)?.[1] ?? 0;
    const max = sorted[0]?.[1] ?? 0;
    // Each row's bar spans the day's range, so the top and bottom lists compare at a glance.
    const share = (value: number) => (max > min ? 0.08 + (0.92 * (value - min)) / (max - min) : 1);
    const list = (entries: [string, number][], rankOf: (i: number) => number) => (
        <ol>
            {entries.map(([dico, value], i) => {
                const info = byDico.get(dico);
                return (
                    <li key={dico}>
                        <button type="button" onClick={() => onSelect(dico)}>
                            <span className="rank">{rankOf(i)}</span>
                            <span className="ranking-name">
                                <span>{info?.name ?? dico}</span>
                                <span className="muted small">{info?.district}</span>
                            </span>
                            <span className="ranking-value">{format.value(value, unit)}</span>
                            <span
                                className="ranking-bar"
                                style={{ transform: `scaleX(${share(value)})` }}
                            />
                        </button>
                    </li>
                );
            })}
        </ol>
    );

    return (
        <div className="ranking">
            <p className="muted">{t('ranking.hint')}</p>
            <h3>{t('ranking.highest')}</h3>
            {list(sorted.slice(0, 5), (i) => i + 1)}
            <h3>{t('ranking.lowest')}</h3>
            {list(sorted.slice(-5).reverse(), (i) => sorted.length - i)}
        </div>
    );
}
