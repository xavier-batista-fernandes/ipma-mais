import type { ColorScale } from '../colors';
import { useI18n } from '../i18n';

interface Props {
    scale: ColorScale;
    unit: string;
    /** A value to point at on the scale, e.g. the hovered or selected municipality's. */
    marker?: number;
    /** What the grey swatch means; "no data" unless given. */
    missingLabel?: string;
}

/**
 * One swatch per colour class, with round boundaries labelled under the edge they mark and an
 * optional pointer at the current value.
 */
export function Legend({ scale, unit, marker, missingLabel }: Props) {
    const { t, format } = useI18n();
    const { colors, thresholds, labels, domain } = scale;
    const [lo, hi] = domain;
    const position = (value: number) => ((value - lo) / (hi - lo)) * 100;
    const markerAt = marker === undefined ? null : Math.min(100, Math.max(0, position(marker)));
    const stepLabel = format.number(thresholds.length > 0 ? thresholds[0] - lo : hi - lo);

    return (
        <figure className="legend">
            <figcaption>
                <span>{unit}</span>
                <span className="legend-step">
                    {t('legend.step', { step: `${stepLabel} ${unit}` })}
                </span>
            </figcaption>
            <div className="legend-bar">
                <div className="legend-scale">
                    {colors.map((color, i) => (
                        <span key={i} className="legend-swatch" style={{ background: color }} />
                    ))}
                </div>
                {markerAt !== null && marker !== undefined && (
                    <span
                        className="legend-marker"
                        style={{ left: `${markerAt}%`, background: scale.color(marker) }}
                    />
                )}
            </div>
            <div className="legend-ticks">
                {labels.map((value) => (
                    <span key={value} style={{ left: `${position(value)}%` }}>
                        {format.number(value)}
                    </span>
                ))}
            </div>
            <div className="legend-missing">
                <span className="legend-swatch" style={{ background: 'var(--map-missing)' }} />{' '}
                {missingLabel ?? t('common.noData')}
            </div>
        </figure>
    );
}
