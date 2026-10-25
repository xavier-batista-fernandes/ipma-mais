import { scaleLinear, scaleThreshold } from 'd3-scale';
import { interpolateRdYlBu, interpolateYlGnBu } from 'd3-scale-chromatic';
import type { MetricInfo } from './api';

export const MISSING_FILL = '#d4d4d8';

const INTERPOLATORS: Record<MetricInfo['id'], (t: number) => string> = {
    et0: interpolateYlGnBu,
    // Reversed so hot is red.
    tmax: (t) => interpolateRdYlBu(1 - t),
    tmin: (t) => interpolateRdYlBu(1 - t),
};

export interface ColorScale {
    color: (value: number) => string;
    colors: string[];
    /** The boundaries between consecutive colours: `colors.length - 1` round numbers. */
    thresholds: number[];
}

/**
 * A fixed scale per metric (domain from the API index), so a colour means the same value on
 * every day. Boundaries are round numbers inside the domain; values beyond the first or last
 * boundary take the end colours.
 */
export function createColorScale(metric: MetricInfo): ColorScale {
    const [lo, hi] = metric.domain ?? [0, 1];
    const thresholds = scaleLinear()
        .domain([lo, hi])
        .ticks(7)
        .filter((t) => t > lo && t < hi);
    const interpolate = INTERPOLATORS[metric.id];
    const colors = Array.from({ length: thresholds.length + 1 }, (_, i) =>
        interpolate(0.1 + (0.85 * i) / thresholds.length)
    );
    const scale = scaleThreshold<number, string>().domain(thresholds).range(colors);

    return { color: (value) => scale(value), colors, thresholds };
}
