import type { Municipality, MunicipalityInteractionEvent } from 'cartis';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
    getDay,
    getIndex,
    getSeries,
    type ApiIndex,
    type DayValues,
    type MetricId,
    type Series,
} from './api';
import { createColorScale } from './colors';
import { Header } from './components/Header';
import { Icon } from './components/Icon';
import { Legend } from './components/Legend';
import { MapView } from './components/MapView';
import { Search } from './components/Search';
import { Select } from './components/Select';
import { SeriesChart } from './components/SeriesChart';
import { Timeline } from './components/Timeline';
import { useI18n } from './i18n';
import { AboutPage } from './pages/AboutPage';
import { SettingsPage } from './pages/SettingsPage';
import { useRoute, type Route } from './route';
import { readUrlState, writeUrlState } from './url-state';

export function App() {
    const route = useRoute();
    const { t, format } = useI18n();
    const [index, setIndex] = useState<ApiIndex | null>(null);
    const [error, setError] = useState<string | null>(null);

    const initial = useMemo(readUrlState, []);
    const [metricId, setMetricId] = useState<MetricId>(initial.metric ?? 'et0');
    const [date, setDate] = useState<string | null>(initial.date ?? null);
    const [selectedDico, setSelectedDico] = useState<string | null>(initial.dico ?? null);

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

    useEffect(() => {
        writeUrlState({ metric: metricId, date: activeDate, dico: selectedDico });
    }, [metricId, activeDate, selectedDico]);

    const fills = useMemo(() => {
        const result = new Map<Municipality, string>();
        if (!day || !scale || day.metric !== metric?.id) return result;
        for (const [dico, value] of Object.entries(day.values)) {
            const info = byDico.get(dico);
            if (info) result.set(info.name, scale.color(value));
        }
        return result;
    }, [day, scale, byDico, metric]);

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

    const shownDay = day?.metric === metric.id ? day : null;
    const valueOf = (dico: string) => shownDay?.values[dico];
    const hoverInfo = hover ? byName.get(hover.municipality) : undefined;
    const hoverValue = hoverInfo ? valueOf(hoverInfo.dico) : undefined;
    const selectedValue = selected ? valueOf(selected.dico) : undefined;
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
                </div>
            </div>

            <main className="map-layout">
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
                                    {hoverValue !== undefined
                                        ? format.value(hoverValue, metric.unit)
                                        : t('common.noData')}
                                </span>
                            </div>
                        )}
                        <Legend
                            scale={scale}
                            unit={metric.unit}
                            marker={hoverValue ?? selectedValue}
                        />
                    </div>
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
                            <p className="big-value">
                                {selectedValue !== undefined
                                    ? format.value(selectedValue, metric.unit)
                                    : t('panel.noDataThisDay')}
                            </p>
                            {series ? (
                                <SeriesChart
                                    rows={series.rows}
                                    unit={metric.unit}
                                    highlightDate={activeDate ?? ''}
                                    onPickDate={setDate}
                                />
                            ) : (
                                <p className="muted">{t('panel.loadingSeries')}</p>
                            )}
                        </>
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
