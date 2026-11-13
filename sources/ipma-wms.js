import { fetchText } from '../lib/fetch.js';

/**
 * IPMA's map server (MapServer WMS). WFS is turned off there, but GetFeatureInfo answers what
 * a layer holds at one point, so per-municipality layers are read one municipality at a time,
 * at a point inside it (`inputs/municipality-points.json`).
 */
export const WMS = {
    vhi: 'https://mapservices.ipma.pt/observations/climate/VegetationHealthIndex/wms',
    temperature: 'https://mapservices.ipma.pt/observations/climate/temperature/wms',
    precipitation: 'https://mapservices.ipma.pt/observations/climate/precipitation/wms',
};

/** Half the side of the tiny box queried around a point, in degrees (about 100 m). */
const HALF = 0.001;

export function featureInfoUrl(service, layer, [lon, lat], time, featureCount = 1000) {
    const params = new URLSearchParams({
        SERVICE: 'WMS',
        VERSION: '1.1.1',
        REQUEST: 'GetFeatureInfo',
        LAYERS: layer,
        QUERY_LAYERS: layer,
        STYLES: '',
        SRS: 'EPSG:4326',
        BBOX: [lon - HALF, lat - HALF, lon + HALF, lat + HALF].join(','),
        WIDTH: '3',
        HEIGHT: '3',
        X: '1',
        Y: '1',
        INFO_FORMAT: 'application/vnd.ogc.gml',
        FEATURE_COUNT: String(featureCount),
    });
    if (time) params.set('TIME', time);
    return `${service}?${params}`;
}

/**
 * Reads every feature's plain fields out of MapServer's GML answer
 * (`<id>dico1107date20261104</id><mean>34.12</mean>…`). A time range (`TIME=start/end`)
 * returns one feature per date in it, so one request can hold a whole year.
 */
export function parseFeatureInfoGml(gml) {
    const features = [];
    for (const [, , body] of gml.matchAll(/<([\w.-]+)_feature>([\s\S]*?)<\/\1_feature>/g)) {
        const fields = {};
        for (const [, name, value] of body.matchAll(/<(\w+)>([^<]*)<\/\1>/g)) {
            fields[name] = value.trim();
        }
        features.push(fields);
    }
    return features;
}

export async function getFeatureInfo(
    service,
    layer,
    point,
    time,
    { timeoutMs = 30000, retries = 4, featureCount = 1000 } = {}
) {
    const gml = await fetchText(featureInfoUrl(service, layer, point, time, featureCount), {
        timeoutMs,
        retries,
    });
    if (/ServiceException/.test(gml)) {
        throw new Error(
            `WMS error for ${layer} at ${time}: ${(gml.match(/<ServiceException[^>]*>([\s\S]*?)<\/ServiceException>/)?.[1] ?? gml).replace(/\s+/g, ' ').trim().slice(0, 300)}`
        );
    }
    return parseFeatureInfoGml(gml);
}
