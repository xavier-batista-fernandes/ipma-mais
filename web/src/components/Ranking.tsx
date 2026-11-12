import type { ApiIndex, DayValues } from '../api';
import { useI18n } from '../i18n';

/** The day's five highest and five lowest municipalities, each a button that selects it. */
export function Ranking({
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
