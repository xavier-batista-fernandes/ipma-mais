import { stringToSlug, type Municipality, type MunicipalityInteractionEvent } from 'cartis';
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
    type MunicipalityInfo,
    type Series,
} from './api';
import {
    createColorScale,
    createResultScale,
    MISSING_FILL,
    readableOn,
    type ColorScale,
} from './colors';
import { download, mapToSvg, svgToPng, toCsv } from './export';
import { Header } from './components/Header';
import { Icon } from './components/Icon';
import { Legend } from './components/Legend';
import { MapView } from './components/MapView';
import {
    describeQuery,
    formatResult,
    QueryForm,
    QueryResults,
    type ExportKind,
} from './components/QueryPanel';
import { Ranking } from './components/Ranking';
import { Select } from './components/Select';
import { SeriesChart, seriesGap } from './components/SeriesChart';
import { Timeline } from './components/Timeline';
import { useI18n } from './i18n';
import { DataPage } from './pages/DataPage';
import { HomePage } from './pages/HomePage';
import { VariableNotFound, VariablePage, VariablesPage } from './pages/VariablePage';
import { MunicipalitiesPage } from './pages/MunicipalitiesPage';
import {
    followLink,
    municipalityHref,
    navigate,
    routeHref,
    useLocation,
    variableHref,
    type Route,
} from './route';
import { useFollowing } from './following';
import { MunicipalityNotFound, MunicipalityPage } from './pages/MunicipalityPage';
import {
    defaultQuery,
    queryFromParams,
    queryPeriods,
    runQuery,
    type Query,
    type QueryResult,
    type ValueMatrix,
} from './query';
import { NO_HOVER_QUERY, PHONE_QUERY, useMediaQuery } from './media';
import { useSettings } from './settings';
import { useThemeColor } from './theme';
import { readUrlState, writeUrlState } from './url-state';

/**
 * The app's state (variable, day, selection, query) lives here, above the pages, so moving
 * between the map and the query page and back keeps each where it was.
 */
export function App({ openSettings = false }: { openSettings?: boolean }) {
    const { route, slug, variable } = useLocation();
    const { following } = useFollowing();
    const i18n = useI18n();
    const { t, format } = i18n;
    const { borders } = useSettings();
    const [index, setIndex] = useState<ApiIndex | null>(null);
    const [error, setError] = useState<string | null>(null);

    const initial = useMemo(readUrlState, []);
    const [metricId, setMetricId] = useState<MetricId>(initial.metric ?? 'et0');
    const [date, setDate] = useState<string | null>(initial.date ?? null);
    const [selectedDico, setSelectedDico] = useState<string | null>(initial.dico ?? null);
    const [query, setQuery] = useState<Query | null>(null);
    const [matrix, setMatrix] = useState<(ValueMatrix & { key: string }) | null>(null);
    const [matrixError, setMatrixError] = useState<string | null>(null);
    const querying = route === 'query';

    // The last day loaded for the current metric. While the next one loads the map keeps showing
    // this one instead of flashing to "no data", which matters most while playing through time.
    const [day, setDay] = useState<(DayValues & { metric: MetricId }) | null>(null);
    const [series, setSeries] = useState<Series | null>(null);
    const [hover, setHover] = useState<MunicipalityInteractionEvent | null>(null);
    // The tooltip is inverted: its background is the theme's text colour.
    const tooltipBackground = useThemeColor('--text', '#0b0d10');
    // On a phone the map stays on the whole country when a municipality is picked, and the pick
    // shows in a sheet over the tab bar instead of a tooltip (a tap would leave one behind).
    const phone = useMediaQuery(PHONE_QUERY);
    const noHover = useMediaQuery(NO_HOVER_QUERY);

    useEffect(() => {
        getIndex().then(setIndex, (e: unknown) => setError(String(e)));
    }, []);

    // A variable's page makes it the current variable, so the other pages open on it.
    useEffect(() => {
        const shown = index?.metrics.find((m) => m.id === variable);
        if (route === 'variable' && shown) setMetricId(shown.id);
    }, [route, variable, index]);

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
    const bySlug = useMemo(
        () => new Map(index?.municipalities.map((m) => [stringToSlug(m.name), m]) ?? []),
        [index]
    );
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

    // The query page loads every municipality's values, but only for the periods it asks about.
    const periodsKey = metric && query ? `${metric.id}:${JSON.stringify(queryPeriods(query))}` : '';
    useEffect(() => {
        if (!querying || !metric || !query) return;
        let current = true;
        setMatrixError(null);
        const key = periodsKey;
        getValues(metric.id, queryPeriods(query)).then(
            (values) => current && setMatrix({ ...values, key }),
            (e: unknown) => current && setMatrixError(String(e))
        );
        return () => {
            current = false;
        };
        // `periodsKey` stands for the query's periods; other query edits need no new values.
    }, [querying, periodsKey]);

    const queryResult = useMemo<QueryResult | null>(
        () => (query && matrix && matrix.key === periodsKey ? runQuery(matrix, query) : null),
        [query, matrix, periodsKey]
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
        writeUrlState(route, { metric: metricId, date: activeDate, dico: selectedDico, query });
    }, [route, metricId, activeDate, selectedDico, query]);

    // Hovering is per map; a tooltip left over from the other page would point at nothing.
    useEffect(() => setHover(null), [route]);

    const fills = useMemo(() => {
        const result = new Map<Municipality, string>();
        if (querying) {
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
    }, [querying, resultScale, resultByDico, day, scale, byDico, metric]);

    const select = (name: Municipality) => setSelectedDico(byName.get(name)?.dico ?? null);
    const openMunicipality = (name: Municipality) =>
        navigate(municipalityHref(stringToSlug(name), metricId));

    const shell = (page: ReactNode) => (
        <Shell
            route={route}
            metric={metricId}
            generatedAt={index?.generatedAt ?? null}
            settingsOpen={openSettings}
            onSearch={(name) => {
                // On a map, search selects the municipality there; elsewhere it opens its page.
                if (route === 'map' || route === 'query') select(name);
                else openMunicipality(name);
            }}
            describe={(name) => byName.get(name)?.district}
        >
            {page}
        </Shell>
    );
    if (error) return shell(<div className="status">{t('app.loadError', { error })}</div>);
    if (route === 'municipality' && index && !bySlug.has(slug ?? ''))
        return shell(<MunicipalityNotFound metric={metricId} />);
    if (!index || !metric || !scale || (querying && !query))
        return shell(<div className="status">{t('app.loading')}</div>);

    const shownDay = day?.metric === metric.id ? day : null;
    const showingQuery = querying && query !== null;
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
    // The hovered value is written in its municipality's colour on the scale (not the pale hover
    // highlight), shaded just enough to stay readable on the tooltip.
    const hoverFill = hover && hoverValue !== undefined ? fills.get(hover.municipality) : undefined;
    const hoverColor = hoverFill ? readableOn(hoverFill, tooltipBackground) : undefined;
    const legendScale = querying ? resultScale : scale;
    const legendUnit = querying && queryResult?.unit === 'days' ? t('query.unitDays') : metric.unit;
    const missingLabel = querying ? t('query.notInResults') : t('common.noData');

    const mapImage = (info: MetricInfo, subtitle: string, imageScale: ColorScale, unit: string) => {
        const svg = document.querySelector<SVGSVGElement>('.map svg');
        if (!svg) return null;
        const css = getComputedStyle(document.documentElement);
        const token = (name: string) => css.getPropertyValue(name).trim();
        const missingColor = token('--map-missing') || MISSING_FILL;
        return mapToSvg(
            svg,
            (path) => {
                const datum = (path as { __data__?: { properties?: { NAME_2?: string } } })
                    .__data__;
                const name = datum?.properties?.NAME_2 as Municipality | undefined;
                return (name && fills.get(name)) || missingColor;
            },
            {
                title: t(`metric.${info.id}`),
                subtitle,
                scale: imageScale,
                tick: (value) =>
                    queryResult?.signed ? format.signed(value, '').trim() : format.number(value),
                unit,
                missingColor,
                missingLabel,
                source: t('export.source', { url: window.location.host }),
                background: token('--surface') || '#ffffff',
                text: token('--text') || '#0f172a',
                muted: token('--muted') || '#64748b',
                border: borders ? token('--map-border') || '#ffffff' : undefined,
            }
        );
    };

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

    const staleNote =
        metric.lastDate &&
        Date.parse(index.generatedAt) - Date.parse(metric.lastDate) > 14 * 86400000
            ? t('panel.stale', { date: format.date(metric.lastDate) })
            : null;

    const picker = (
        <Select
            label={t('controls.metric')}
            value={metric.id}
            onChange={setMetricId}
            options={index.metrics.map((m) => ({
                value: m.id,
                label: t(`metric.${m.id}`),
                tag: m.unit,
                description: t(`metricInfo.${m.id}.summary`),
            }))}
        />
    );
    const metricHelp = (
        <a
            className="icon-button ghost metric-help"
            href={variableHref(metric.id)}
            onClick={followLink}
            aria-label={t('variable.info', { name: t(`metric.${metric.id}`) })}
            title={t('variable.info', { name: t(`metric.${metric.id}`) })}
        >
            <Icon name="info" />
        </a>
    );
    // The picker with a link to what the chosen variable means; every page with a picker uses it.
    const metricSelect = (
        <div className="metric-picker">
            {picker}
            {metricHelp}
        </div>
    );
    const toolbar = (
        <div className="toolbar">
            <div className="controls">{metricSelect}</div>
        </div>
    );

    // On a phone the side panel sits below the map and the timeline, out of sight: the selection
    // also shows in a sheet pinned over the tab bar.
    const selectedSheet = phone && selected && (
        <SelectedSheet
            info={selected}
            value={describeValue(
                selectedValue,
                querying ? t('query.notInResults') : t('panel.noDataThisDay')
            )}
            pageHref={municipalityHref(stringToSlug(selected.name), metricId)}
            onClose={() => setSelectedDico(null)}
        />
    );

    const mapStage = (
        <div className="map-stage">
            <div className="map-area">
                <MapView
                    fills={fills}
                    allNames={allNames}
                    selected={selected?.name ?? null}
                    onHover={noHover ? ignoreHover : setHover}
                    onSelect={select}
                    zoomToSelected={!phone}
                />
                {hover && hoverInfo && (
                    <div className="tooltip" style={{ left: hover.x, top: hover.y }}>
                        <strong>{hover.municipality}</strong>
                        <span className="muted small">{hover.district}</span>
                        <span
                            className="tooltip-value"
                            style={hoverColor ? { color: hoverColor } : undefined}
                        >
                            {describeValue(hoverValue, missingLabel)}
                        </span>
                    </div>
                )}
                {selectedSheet}
            </div>
            {legendScale && (
                <Legend
                    scale={legendScale}
                    unit={legendUnit}
                    marker={hoverValue ?? selectedValue}
                    missingLabel={missingLabel}
                />
            )}
        </div>
    );

    // The selected municipality: its value (or query result) and its history. Picking a day on
    // the chart opens that day on the map.
    const selectedDetail = selected && (
        <SelectedMunicipality
            info={selected}
            label={querying ? t('query.result') : null}
            value={describeValue(
                selectedValue,
                querying ? t('query.notInResults') : t('panel.noDataThisDay')
            )}
            series={series}
            unit={metric.unit}
            maxGap={seriesGap(metric.id)}
            pageHref={municipalityHref(stringToSlug(selected.name), metricId)}
            highlightDate={querying && query ? query.to : (activeDate ?? '')}
            onClose={() => setSelectedDico(null)}
            onPickDate={(picked) => {
                setDate(picked);
                if (querying) navigate(routeHref('map', metricId));
            }}
        />
    );

    if (route === 'home')
        return shell(<HomePage index={index} byDico={byDico} slugOf={stringToSlug} />);
    if (route === 'variables') return shell(<VariablesPage index={index} />);
    if (route === 'variable') {
        const shownMetric = index.metrics.find((m) => m.id === variable);
        return shell(
            shownMetric ? (
                <VariablePage
                    index={index}
                    metric={shownMetric}
                    byDico={byDico}
                    slugOf={stringToSlug}
                />
            ) : (
                <VariableNotFound />
            )
        );
    }
    if (route === 'data') return shell(<DataPage index={index} />);
    if (route === 'municipalities')
        return shell(
            <MunicipalitiesPage
                metric={metric}
                metricSelect={metricSelect}
                municipalities={index.municipalities}
                slugOf={stringToSlug}
            />
        );

    if (route === 'municipality') {
        const info = bySlug.get(slug ?? '')!;
        return shell(
            <MunicipalityPage
                info={info}
                metric={metric}
                metricSelect={metricSelect}
                municipalities={index.municipalities}
                slugOf={stringToSlug}
                staleNote={staleNote}
                onOpenMap={(picked) => {
                    setSelectedDico(info.dico);
                    if (picked) setDate(picked);
                    navigate(routeHref('map', metricId));
                }}
                onOpenMunicipality={openMunicipality}
            />
        );
    }

    if (showingQuery) {
        return shell(
            <main className="query-page">
                <section className="query-builder" aria-label={t('query.question')}>
                    <QueryForm metric={metric} query={query} onChange={setQuery}>
                        {metricSelect}
                    </QueryForm>
                </section>
                <div className="map-layout" data-mode="query">
                    <section className="map-panel">{mapStage}</section>
                    <aside className="side-panel">
                        {staleNote && <p className="notice">{staleNote}</p>}
                        {selectedDetail && <div className="selected-card">{selectedDetail}</div>}
                        <QueryResults
                            metric={metric}
                            query={query}
                            result={queryResult}
                            error={matrixError}
                            byDico={byDico}
                            selected={selectedDico}
                            onSelect={setSelectedDico}
                            onExport={(kind) => void exportResults(kind)}
                        />
                    </aside>
                </div>
            </main>
        );
    }

    return shell(
        <>
            {toolbar}
            <main className="map-layout" data-mode="day">
                <section className="map-panel">
                    {mapStage}
                    {activeDate && metric.dates.length > 0 && (
                        <Timeline
                            dates={metric.dates}
                            value={activeDate}
                            onChange={setDate}
                            preload={(d) => getDay(metric.id, d)}
                        />
                    )}
                </section>

                <aside className="side-panel">
                    <p className="day-label">
                        {activeDate ? format.dateTitle(activeDate) : t('panel.noData')}
                    </p>
                    {staleNote && <p className="notice">{staleNote}</p>}
                    {!selectedDetail && following.length > 0 && (
                        <nav className="following" aria-label={t('following.title')}>
                            <h3 className="field-label">{t('following.title')}</h3>
                            <ul>
                                {following
                                    .map((dico) => byDico.get(dico))
                                    .filter((m) => m !== undefined)
                                    .map((m) => (
                                        <li key={m.dico}>
                                            <a
                                                href={municipalityHref(
                                                    stringToSlug(m.name),
                                                    metricId
                                                )}
                                                onClick={followLink}
                                            >
                                                <span>{m.name}</span>
                                                <span className="ranking-value">
                                                    {shownDay?.values[m.dico] === undefined
                                                        ? '—'
                                                        : format.value(
                                                              shownDay.values[m.dico],
                                                              metric.unit
                                                          )}
                                                </span>
                                            </a>
                                        </li>
                                    ))}
                            </ul>
                        </nav>
                    )}
                    {selectedDetail ?? (
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

const ignoreHover = () => {};

/** The selected municipality in brief, pinned to the bottom of a phone's screen. */
function SelectedSheet({
    info,
    value,
    pageHref,
    onClose,
}: {
    info: MunicipalityInfo;
    value: string;
    pageHref: string;
    onClose: () => void;
}) {
    const { t } = useI18n();
    return (
        <section className="selected-sheet" aria-label={info.name}>
            <div className="selected-sheet-name">
                <strong>{info.name}</strong>
                <span className="muted small">{info.district}</span>
            </div>
            <span className="selected-sheet-value">{value}</span>
            <a
                className="button selected-sheet-open"
                href={pageHref}
                onClick={followLink}
                aria-label={t('municipality.open')}
                title={t('municipality.open')}
            >
                <Icon name="arrowRight" />
            </a>
            <button
                type="button"
                className="icon-button ghost"
                aria-label={t('panel.close')}
                title={t('panel.close')}
                onClick={onClose}
            >
                <Icon name="close" />
            </button>
        </section>
    );
}

function SelectedMunicipality({
    info,
    label,
    value,
    series,
    unit,
    maxGap,
    pageHref,
    highlightDate,
    onClose,
    onPickDate,
}: {
    maxGap: number;
    pageHref: string;
    info: MunicipalityInfo;
    label: string | null;
    value: string;
    series: Series | null;
    unit: string;
    highlightDate: string;
    onClose: () => void;
    onPickDate: (date: string) => void;
}) {
    const { t } = useI18n();
    return (
        <>
            <div className="selected-head">
                <div>
                    <h2>{info.name}</h2>
                    <p className="muted">{t('panel.district', { district: info.district })}</p>
                </div>
                <button
                    type="button"
                    className="icon-button ghost"
                    aria-label={t('panel.close')}
                    title={t('panel.close')}
                    onClick={onClose}
                >
                    <Icon name="close" />
                </button>
            </div>
            {label && <p className="day-label">{label}</p>}
            <p className="big-value">{value}</p>
            <a className="button open-page" href={pageHref} onClick={followLink}>
                {t('municipality.open')}
                <Icon name="arrowRight" />
            </a>
            {series ? (
                <SeriesChart
                    rows={series.rows}
                    unit={unit}
                    maxGap={maxGap}
                    highlightDate={highlightDate}
                    onPickDate={onPickDate}
                />
            ) : (
                <p className="muted">{t('panel.loadingSeries')}</p>
            )}
        </>
    );
}

/** Header, the current page and the footer. */
function Shell({
    route,
    metric,
    generatedAt,
    settingsOpen,
    onSearch,
    describe,
    children,
}: {
    route: Route;
    metric: string;
    generatedAt: string | null;
    settingsOpen: boolean;
    onSearch: (name: Municipality) => void;
    describe: (name: Municipality) => string | undefined;
    children: ReactNode;
}) {
    const { t, format } = useI18n();
    return (
        <div className="app" data-route={route}>
            <Header
                route={route}
                metric={metric}
                onSearch={onSearch}
                describe={describe}
                settingsOpen={settingsOpen}
            />
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
