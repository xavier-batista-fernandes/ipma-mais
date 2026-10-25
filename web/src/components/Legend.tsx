import { MISSING_FILL, type ColorScale } from '../colors';
import { useI18n } from '../i18n';

interface Props {
    scale: ColorScale;
    unit: string;
}

/** Colour swatches with each boundary value written under the edge it marks. */
export function Legend({ scale, unit }: Props) {
    const { t, format } = useI18n();
    const { colors, thresholds } = scale;
    return (
        <figure className="legend">
            <figcaption>{unit}</figcaption>
            <div className="legend-scale">
                {colors.map((color) => (
                    <span key={color} className="legend-swatch" style={{ background: color }} />
                ))}
            </div>
            <div className="legend-ticks">
                {thresholds.map((value, i) => (
                    <span key={value} style={{ left: `${((i + 1) / colors.length) * 100}%` }}>
                        {format.number(value)}
                    </span>
                ))}
            </div>
            <div className="legend-missing">
                <span className="legend-swatch" style={{ background: MISSING_FILL }} />{' '}
                {t('common.noData')}
            </div>
        </figure>
    );
}
