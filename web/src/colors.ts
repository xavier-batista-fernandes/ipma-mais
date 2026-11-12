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
    tmean: { step: 1, stops: TEMPERATURE },
    // Dry days stay close to white so rain stands out; heavy rain runs to deep purple.
    prec: {
        step: 1,
        stops: [
            '#f7fbff',
            '#d2e9f5',
            '#9fd3ea',
            '#5fb6dd',
            '#2f8fd0',
            '#2563b8',
            '#3a3f9e',
            '#57268a',
            '#3d0b5c',
        ],
    },
    // IPMA's own fire-risk colours, one per class from reduced to maximum.
    fire: { step: 1, stops: ['#3fae49', '#f2d61a', '#f39200', '#e30613', '#7a0019'] },
    // Stressed vegetation (low) in browns, healthy (high) in greens.
    vhi: {
        step: 5,
        stops: [
            '#6b2e0e',
            '#a6541b',
            '#d98c2b',
            '#f2c94c',
            '#d9e67a',
            '#93c95b',
            '#4fa64a',
            '#1f7a3a',
            '#0b4d2c',
        ],
    },
    // Dry soil (low) in browns, soil at field capacity or wetter (high) in blues.
    smi: {
        step: 5,
        stops: [
            '#7a3b10',
            '#b9692a',
            '#e3a857',
            '#f5e3a6',
            '#c9e6d8',
            '#7cc3d6',
            '#3a95c8',
            '#1f5fa8',
            '#1b2f7a',
        ],
    },
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
    // Classes start on a multiple of the step (VHI 15–20, not 16–21), so legend labels are round.
    return createScale(stops, Math.floor(lo / step) * step, Math.ceil(hi / step) * step, step);
}

function createScale(stops: string[], lo: number, hi: number, step: number): ColorScale {
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

const DIVERGING = ['#2166ac', '#67a9cf', '#d1e5f0', '#f7f7f7', '#fddbc7', '#ef8a62', '#b2182b'];

/** 1, 2, 2.5 or 5 times a power of ten: the round class width nearest to `raw`. */
function niceStep(raw: number, integer: boolean) {
    if (!(raw > 0)) return 1;
    const power = 10 ** Math.floor(Math.log10(raw));
    const step = ([1, 2, 2.5, 5, 10].find((k) => k * power >= raw) ?? 10) * power;
    return integer ? Math.max(1, Math.round(step)) : step;
}

/**
 * A scale fitted to a query's results, which can be counts of days, totals over a period or
 * changes between periods: about eight round classes from the lowest to the highest result. Signed
 * results (changes) get a diverging blue–red scale centred on zero.
 */
export function createResultScale(
    metric: MetricInfo,
    values: number[],
    { integer = false, signed = false } = {}
): ColorScale {
    const CLASSES = 8;
    if (signed) {
        const extent = Math.max(...values.map(Math.abs), integer ? 1 : 0.1);
        const step = niceStep((2 * extent) / CLASSES, integer);
        const half = Math.max(1, Math.ceil(extent / step));
        return createScale(DIVERGING, -half * step, half * step, step);
    }
    let lo = values.length ? Math.min(...values) : 0;
    let hi = values.length ? Math.max(...values) : 1;
    const step = niceStep((hi - lo) / CLASSES, integer);
    lo = Math.floor(lo / step) * step;
    hi = Math.max(lo + step, Math.ceil(hi / step) * step);
    // A count of days starts its own class at each whole number, so the lowest count gets one.
    if (integer && hi === Math.max(...values)) hi += step;
    return createScale(PALETTES[metric.id].stops, lo, hi, step);
}

function round(value: number): number {
    return Math.round(value * 1e6) / 1e6;
}

function isMultiple(value: number, of: number): boolean {
    const q = value / of;
    return Math.abs(q - Math.round(q)) < 1e-6;
}
