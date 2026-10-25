import { MISSING_FILL, type ColorScale } from '../colors';
import { formatNumber } from '../format';

interface Props {
    scale: ColorScale;
    unit: string;
}

/** Colour swatches with each boundary value written under the edge it marks. */
export function Legend({ scale, unit }: Props) {
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
                {thresholds.map((t, i) => (
                    <span key={t} style={{ left: `${((i + 1) / colors.length) * 100}%` }}>
                        {formatNumber(t)}
                    </span>
                ))}
            </div>
            <div className="legend-missing">
                <span className="legend-swatch" style={{ background: MISSING_FILL }} /> sem dados
            </div>
        </figure>
    );
}
