import { scaleLinear } from 'd3-scale';
import { useI18n } from '../i18n';
import { useElementWidth } from '../media';
import type { Aggregate, MonthTotal } from '../municipality';

const HEIGHT = 170;
const M = { top: 10, right: 8, bottom: 22, left: 40 };
const MONTHS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

interface Props {
    months: MonthTotal[];
    /** The year to compare with the one before it. */
    year: number;
    unit: string;
    aggregate: Aggregate;
}

/**
 * One pair of bars per calendar month: the year before (grey) and this year (accent). A month
 * with days missing is drawn lighter, so a short total isn't mistaken for a low one.
 */
export function MonthlyChart({ months, year, unit, aggregate }: Props) {
    const { t, format } = useI18n();
    // Drawn at the card's real width, so the labels stay readable on a phone.
    const [ref, WIDTH] = useElementWidth<HTMLDivElement>(720);
    const byMonth = new Map(months.map((m) => [m.month, m]));
    const years = [year - 1, year];
    const shown = years.flatMap((y) =>
        MONTHS.map((m) => byMonth.get(`${y}-${m}`)).filter((m): m is MonthTotal => !!m)
    );
    if (shown.length === 0)
        return (
            <div className="chart monthly-chart" ref={ref}>
                <p className="muted">{t('chart.noData')}</p>
            </div>
        );

    const values = shown.map((m) => m.value);
    const y = scaleLinear()
        .domain([Math.min(0, ...values), Math.max(0, ...values)])
        .nice(4)
        .range([HEIGHT - M.bottom, M.top]);
    const slot = (WIDTH - M.left - M.right) / 12;
    const bar = slot * 0.36;
    // Too narrow for twelve month names: label every other month.
    const labelEvery = slot < 34 ? 2 : 1;

    const describe = (m: MonthTotal) =>
        `${format.month(`${m.month}-01`)} ${m.month.slice(0, 4)}: ${format.value(
            Math.round(m.value * 10) / 10,
            unit
        )} · ${t('municipality.daysWithData', { days: m.days, total: m.daysInMonth })}`;

    return (
        <div className="chart monthly-chart" ref={ref}>
            <svg
                viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                role="img"
                aria-label={t(`municipality.monthly.${aggregate}`)}
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
                            x={M.left - 6}
                            y={y(tick)}
                            dy="0.32em"
                            textAnchor="end"
                        >
                            {format.number(tick)}
                        </text>
                    </g>
                ))}
                {MONTHS.map((m, i) => {
                    const x0 = M.left + i * slot + (slot - 2 * bar - 2) / 2;
                    return (
                        <g key={m}>
                            {years.map((yr, j) => {
                                const total = byMonth.get(`${yr}-${m}`);
                                if (!total) return null;
                                const top = y(Math.max(0, total.value));
                                const bottom = y(Math.min(0, total.value));
                                return (
                                    <rect
                                        key={yr}
                                        className={j === 0 ? 'bar-earlier' : 'bar'}
                                        data-partial={total.days < total.daysInMonth || undefined}
                                        x={x0 + j * (bar + 2)}
                                        y={top}
                                        width={bar}
                                        height={Math.max(1, bottom - top)}
                                    >
                                        <title>{describe(total)}</title>
                                    </rect>
                                );
                            })}
                            {i % labelEvery === 0 && (
                                <text
                                    className="tick"
                                    x={M.left + i * slot + slot / 2}
                                    y={HEIGHT - 6}
                                    textAnchor="middle"
                                >
                                    {format.month(`${year}-${m}-01`)}
                                </text>
                            )}
                        </g>
                    );
                })}
            </svg>
            <p className="chart-legend muted small">
                <span className="swatch earlier" /> {year - 1}
                <span className="swatch" /> {year}
                <span className="chart-legend-note">{t('municipality.monthlyHint')}</span>
            </p>
        </div>
    );
}
