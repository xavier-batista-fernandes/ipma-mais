import { scaleLinear, scaleUtc } from 'd3-scale';
import { area, line } from 'd3-shape';
import { useMemo, useState } from 'react';
import type { SeriesRow } from '../api';
import { parseIsoDate } from '../format';
import { useI18n } from '../i18n';

const RANGES = [
    { label: 'chart.range30', days: 30 },
    { label: 'chart.range90', days: 90 },
    { label: 'chart.range365', days: 365 },
    { label: 'chart.rangeAll', days: Infinity },
] as const;

const WIDTH = 360;
const HEIGHT = 180;
const M = { top: 10, right: 12, bottom: 22, left: 34 };

interface Props {
    rows: SeriesRow[];
    unit: string;
    highlightDate: string;
    onPickDate: (date: string) => void;
}

/** A daily line chart; shaded where the source also gives the municipality's min–max spread. */
export function SeriesChart({ rows, unit, highlightDate, onPickDate }: Props) {
    const { t, format } = useI18n();
    const [rangeDays, setRangeDays] = useState<number>(90);
    const [hover, setHover] = useState<SeriesRow | null>(null);

    const chart = useMemo(() => {
        if (rows.length === 0) return null;
        const end = parseIsoDate(rows.at(-1)![0]);
        const start = new Date(end.getTime() - (rangeDays - 1) * 86400000);
        const visible = rows.filter(
            ([date]) => rangeDays === Infinity || parseIsoDate(date) >= start
        );

        const values = visible.flatMap(([, mean, min, max]) => [mean, min ?? mean, max ?? mean]);
        const x = scaleUtc()
            .domain([parseIsoDate(visible[0][0]), end])
            .range([M.left, WIDTH - M.right]);
        const y = scaleLinear()
            .domain([Math.min(...values), Math.max(...values)])
            .nice(4)
            .range([HEIGHT - M.bottom, M.top]);

        // One path per run of consecutive days, so gaps show as gaps instead of straight bridges.
        const runs: SeriesRow[][] = [];
        visible.forEach((row, i) => {
            if (i === 0 || daysApart(visible[i - 1][0], row[0]) > 1) runs.push([]);
            runs.at(-1)!.push(row);
        });
        const lineGen = line<SeriesRow>()
            .x(([date]) => x(parseIsoDate(date)))
            .y(([, mean]) => y(mean));
        const meanLines = runs.map((run) => lineGen(run) ?? '');
        const band = area<SeriesRow>()
            .defined(([, , min, max]) => min !== null && max !== null)
            .x(([date]) => x(parseIsoDate(date)))
            .y0(([, , min]) => y(min!))
            .y1(([, , , max]) => y(max!))(visible);

        return { visible, x, y, meanLines, band };
    }, [rows, rangeDays]);

    if (!chart) return <p className="muted">{t('chart.noData')}</p>;
    const { visible, x, y, meanLines, band } = chart;

    const pick = (event: React.MouseEvent<SVGRectElement>) => {
        const box = event.currentTarget.getBoundingClientRect();
        const at = x.invert(
            M.left + ((event.clientX - box.left) / box.width) * (WIDTH - M.left - M.right)
        );
        let nearest = visible[0];
        for (const row of visible) {
            if (
                Math.abs(parseIsoDate(row[0]).getTime() - at.getTime()) <
                Math.abs(parseIsoDate(nearest[0]).getTime() - at.getTime())
            )
                nearest = row;
        }
        return nearest;
    };

    const shown = hover ?? visible.find(([date]) => date === highlightDate) ?? visible.at(-1)!;

    return (
        <div className="chart">
            <div className="chart-head">
                <span>
                    <strong>{format.value(shown[1], unit)}</strong> · {format.date(shown[0])}
                </span>
                <div className="segmented" role="group" aria-label={t('chart.range')}>
                    {RANGES.map((r) => (
                        <button
                            key={r.label}
                            type="button"
                            aria-pressed={rangeDays === r.days}
                            onClick={() => setRangeDays(r.days)}
                        >
                            {t(r.label)}
                        </button>
                    ))}
                </div>
            </div>
            <svg
                viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                role="img"
                aria-label={t('chart.label', { unit })}
            >
                {y.ticks(4).map((tick) => (
                    <g key={tick}>
                        <line
                            className="grid"
                            x1={M.left}
                            x2={WIDTH - M.right}
                            y1={y(tick)}
                            y2={y(tick)}
                        />
                        <text
                            className="tick"
                            x={M.left - 4}
                            y={y(tick)}
                            dy="0.32em"
                            textAnchor="end"
                        >
                            {format.number(tick)}
                        </text>
                    </g>
                ))}
                {x.ticks(4).map((tick) => (
                    <text
                        key={tick.getTime()}
                        className="tick"
                        x={x(tick)}
                        y={HEIGHT - 6}
                        textAnchor="middle"
                    >
                        {format.shortDate(tick)}
                    </text>
                ))}
                {band && <path className="band" d={band} />}
                {meanLines.map((d, i) => (
                    <path key={i} className="series" d={d} />
                ))}
                <line
                    className="cursor"
                    x1={x(parseIsoDate(shown[0]))}
                    x2={x(parseIsoDate(shown[0]))}
                    y1={M.top}
                    y2={HEIGHT - M.bottom}
                />
                <circle className="dot" cx={x(parseIsoDate(shown[0]))} cy={y(shown[1])} r={3.5} />
                <rect
                    x={M.left}
                    y={M.top}
                    width={WIDTH - M.left - M.right}
                    height={HEIGHT - M.top - M.bottom}
                    fill="transparent"
                    style={{ cursor: 'pointer' }}
                    onPointerMove={(e) => setHover(pick(e))}
                    onPointerLeave={() => setHover(null)}
                    onClick={(e) => onPickDate(pick(e)[0])}
                />
            </svg>
            <p className="muted small">{t('chart.hint')}</p>
        </div>
    );
}

function daysApart(a: string, b: string) {
    return Math.round((parseIsoDate(b).getTime() - parseIsoDate(a).getTime()) / 86400000);
}
