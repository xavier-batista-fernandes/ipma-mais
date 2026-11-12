/**
 * The metrics IPMA+ collects. `id` is used in file paths (`data/{id}/…`) and in the API (`/v1/{id}/…`).
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
];

export const METRIC_IDS = METRICS.map((metric) => metric.id);

export function getMetric(id) {
    const metric = METRICS.find((m) => m.id === id);
    if (!metric) throw new Error(`Unknown metric "${id}". Valid: ${METRIC_IDS.join(', ')}`);
    return metric;
}
