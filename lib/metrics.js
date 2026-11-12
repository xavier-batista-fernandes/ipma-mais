/**
 * The metrics IPMA+ collects. `id` is used in file paths (`data/{id}/…`) and in the API (`/v1/{id}/…`).
 * `domain`, when set, fixes the app's colour scale instead of deriving it from the data.
 */
export const METRICS = [
    {
        id: 'et0',
        label: 'Evapotranspiração de referência (ET0)',
        unit: 'mm',
    },
    {
        id: 'tmax',
        label: 'Temperatura máxima',
        unit: '°C',
    },
    {
        id: 'tmin',
        label: 'Temperatura mínima',
        unit: '°C',
    },
    {
        id: 'tmean',
        label: 'Temperatura média',
        unit: '°C',
    },
    {
        id: 'prec',
        label: 'Precipitação',
        unit: 'mm',
    },
    {
        id: 'fire',
        label: 'Risco de incêndio rural',
        // A class from 1 (reduced) to 5 (maximum), so no unit, and the colour scale always
        // spans all five classes: [1, 2) is class 1 and so on.
        unit: '',
        domain: [1, 6],
    },
    {
        id: 'vhi',
        label: 'Índice de saúde da vegetação (VHI)',
        // 0–100, no unit. Weekly: one value every 7 days.
        unit: '',
    },
    {
        id: 'smi',
        label: 'Água no solo (SMI)',
        // Soil moisture index × 100: 0 is wilting point, 100 field capacity.
        unit: '%',
    },
];

export const METRIC_IDS = METRICS.map((metric) => metric.id);

export function getMetric(id) {
    const metric = METRICS.find((m) => m.id === id);
    if (!metric) throw new Error(`Unknown metric "${id}". Valid: ${METRIC_IDS.join(', ')}`);
    return metric;
}
