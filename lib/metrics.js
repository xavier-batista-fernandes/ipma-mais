/**
 * The metrics IPMA+ collects. `id` is used in file paths (`data/{id}/…`, `api/{id}/…`).
 */
export const METRICS = [
    {
        id: 'et0',
        label: 'Evapotranspiração de referência (ET0)',
        unit: 'mm',
        apiPath: 'evapotranspiration',
        apiPrefix: 'et0',
    },
    {
        id: 'tmax',
        label: 'Temperatura máxima',
        unit: '°C',
        apiPath: 'temperature-max',
        apiPrefix: 'mtxmx',
    },
    {
        id: 'tmin',
        label: 'Temperatura mínima',
        unit: '°C',
        apiPath: 'temperature-min',
        apiPrefix: 'mtnmn',
    },
];

export const METRIC_IDS = METRICS.map((metric) => metric.id);

export function getMetric(id) {
    const metric = METRICS.find((m) => m.id === id);
    if (!metric) throw new Error(`Unknown metric "${id}". Valid: ${METRIC_IDS.join(', ')}`);
    return metric;
}
