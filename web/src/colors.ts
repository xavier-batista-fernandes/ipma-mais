import { interpolateLab, piecewise } from 'd3-interpolate';
import { scaleThreshold } from 'd3-scale';
import type { MetricInfo } from './api';

export const MISSING_FILL = '#d4d4d8';

interface Palette {
    /** Hand-picked colour stops, interpolated in Lab so steps look evenly spaced. */
    stops: string[];
    /** The width of one colour class, in the metric's unit. */
    step: number;
}

/**
 * Multi-hue ramps: with 15–25 classes on screen, changing hue as well as lightness is what keeps
 * neighbouring classes (0.5 mm or 1 °C apart) distinguishable.
 */
const TEMPERATURE: string[] = [
    '#3b0f70',
    '#3f37c9',
    '#2f6fe4',
    '#1ea7e4',
    '#2fd0c8',
    '#8ee08a',
    '#e8ee6b',
    '#fdc94a',
    '#fb8c3c',
    '#e8483a',
    '#b5172e',
    '#6d0a26',
];

const PALETTES: Record<MetricInfo['id'], Palette> = {
    // Low evapotranspiration reads as cool and wet, high as hot and dry.
    et0: {
        step: 0.5,
        stops: [
            '#e3f1fb',
            '#a7d5f2',
            '#5cb4e6',
            '#2f9fc0',
            '#3fbf8f',
            '#a6d854',
            '#f4d03f',
            '#f7a23b',
            '#ec6a3c',
            '#d1344a',
            '#9c1c5c',
            '#5b1260',
        ],
    },
    tmax: { step: 1, stops: TEMPERATURE },
    tmin: { step: 1, stops: TEMPERATURE },
};

export interface ColorScale {
    color: (value: number) => string;
    colors: string[];
    /** The boundaries between consecutive colours: `colors.length - 1` evenly spaced values. */
    thresholds: number[];
    /** The domain the colours span; values outside it take the end colours. */
    domain: [number, number];
    /** The boundaries worth labelling on a legend (a subset of `thresholds`). */
    labels: number[];
}

/** At most this many labels fit under the legend without crowding. */
const MAX_LABELS = 8;

/**
 * A fixed scale per metric (domain from the API index), so a colour means the same value on
 * every day. The domain is cut into classes `step` wide (0.5 mm for ET0, 1 °C for
 * temperatures), each with its own colour.
 */
export function createColorScale(metric: MetricInfo): ColorScale {
    const { stops, step } = PALETTES[metric.id];
    const [lo, hi] = metric.domain ?? [0, 1];
    const count = Math.max(1, Math.round((hi - lo) / step));
    const thresholds = Array.from({ length: count - 1 }, (_, i) => round(lo + (i + 1) * step));
    const interpolate = piecewise(interpolateLab, stops);
    const colors = Array.from({ length: count }, (_, i) =>
        interpolate(count === 1 ? 0.5 : i / (count - 1))
    );
    const scale = scaleThreshold<number, string>().domain(thresholds).range(colors);

    const every = [1, 2, 4, 5, 10, 20].find((k) => thresholds.length / k <= MAX_LABELS) ?? 50;
    const labelStep = every * step;
    const labels = thresholds.filter((t) => isMultiple(t, labelStep));

    return { color: (value) => scale(value), colors, thresholds, domain: [lo, hi], labels };
}

function round(value: number): number {
    return Math.round(value * 1e6) / 1e6;
}

function isMultiple(value: number, of: number): boolean {
    const q = value / of;
    return Math.abs(q - Math.round(q)) < 1e-6;
}
