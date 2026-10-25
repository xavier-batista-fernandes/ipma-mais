import type { Municipality, MunicipalityInteractionEvent } from 'cartis';
import { useEffect, useMemo, useState } from 'react';
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
import { Legend } from './components/Legend';
import { MapView } from './components/MapView';
import { Search } from './components/Search';
import { SeriesChart } from './components/SeriesChart';
import { Timeline } from './components/Timeline';
import { formatDate, formatDateTitle, formatValue } from './format';
import { readUrlState, writeUrlState } from './url-state';

export function App() {
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

    if (error) return <div className="fatal">Não foi possível carregar os dados: {error}</div>;
    if (!index || !metric || !scale) return <div className="fatal">A carregar…</div>;

    const shownDay = day?.metric === metric.id ? day : null;
    const valueOf = (dico: string) => shownDay?.values[dico];
    const hoverInfo = hover ? byName.get(hover.municipality) : undefined;
    const hoverValue = hoverInfo ? valueOf(hoverInfo.dico) : undefined;
    const selectedValue = selected ? valueOf(selected.dico) : undefined;
    const staleNote =
        metric.lastDate &&
        Date.parse(index.generatedAt) - Date.parse(metric.lastDate) > 14 * 86400000
            ? `O IPMA não publica esta série desde ${formatDate(metric.lastDate)}.`
            : null;

    return (
        <div className="app">
            <header>
                <div className="brand">
                    <h1>IPMA+</h1>
                    <p>Dados diários do IPMA por município</p>
                </div>
                <div className="controls">
                    <label>
                        <span>Variável</span>
                        <select
                            value={metric.id}
                            onChange={(e) => setMetricId(e.target.value as MetricId)}
                        >
                            {index.metrics.map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.label}
                                </option>
                            ))}
                        </select>
                    </label>
                    <Search onSelect={(name) => setSelectedDico(byName.get(name)?.dico ?? null)} />
                </div>
            </header>

            <main>
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
                                <span className="muted">{hover.district}</span>
                                <span>
                                    {hoverValue !== undefined
                                        ? formatValue(hoverValue, metric.unit)
                                        : 'sem dados'}
                                </span>
                            </div>
                        )}
                        <Legend scale={scale} unit={metric.unit} />
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
                        {activeDate ? formatDateTitle(activeDate) : 'Sem dados'}
                    </p>
                    {staleNote && <p className="notice">{staleNote}</p>}
                    {selected ? (
                        <>
                            <div className="selected-head">
                                <div>
                                    <h2>{selected.name}</h2>
                                    <p className="muted">Distrito de {selected.district}</p>
                                </div>
                                <button
                                    type="button"
                                    className="link"
                                    onClick={() => setSelectedDico(null)}
                                >
                                    Fechar
                                </button>
                            </div>
                            <p className="big-value">
                                {selectedValue !== undefined
                                    ? formatValue(selectedValue, metric.unit)
                                    : 'Sem dados neste dia'}
                            </p>
                            {series ? (
                                <SeriesChart
                                    rows={series.rows}
                                    unit={metric.unit}
                                    highlightDate={activeDate ?? ''}
                                    onPickDate={setDate}
                                />
                            ) : (
                                <p className="muted">A carregar a série…</p>
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

            <footer>
                Fonte: <a href="https://www.ipma.pt">IPMA</a>, recolhido por{' '}
                <a href="https://github.com/xavier-batista-fernandes/ipma-mais">IPMA+</a>. Mapa
                desenhado com{' '}
                <a href="https://github.com/xavier-batista-fernandes/cartis">Cartis</a>. Atualizado
                em {formatDate(index.generatedAt.slice(0, 10))}.
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
    if (!day) return <p className="muted">A carregar…</p>;
    const sorted = Object.entries(day.values).sort((a, b) => b[1] - a[1]);
    const list = (entries: [string, number][]) => (
        <ol>
            {entries.map(([dico, value]) => (
                <li key={dico}>
                    <button type="button" className="link" onClick={() => onSelect(dico)}>
                        {byDico.get(dico)?.name ?? dico}
                    </button>
                    <span>{formatValue(value, unit)}</span>
                </li>
            ))}
        </ol>
    );

    return (
        <div className="ranking">
            <p className="muted">Clique num município para ver a sua evolução.</p>
            <h3>Valores mais altos</h3>
            {list(sorted.slice(0, 5))}
            <h3>Valores mais baixos</h3>
            {list(sorted.slice(-5).reverse())}
        </div>
    );
}
