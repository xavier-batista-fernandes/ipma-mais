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

export function featureInfoUrl(service, layer, [lon, lat], time) {
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
        FEATURE_COUNT: '1',
    });
    if (time) params.set('TIME', time);
    return `${service}?${params}`;
}

/**
 * Reads the first feature's plain fields out of MapServer's GML answer
 * (`<id>dico1107date20261104</id><mean>34.12</mean>…`). Null when nothing is there.
 */
export function parseFeatureInfoGml(gml) {
    const feature = gml.match(/<(\w+)_feature>([\s\S]*?)<\/\1_feature>/);
    if (!feature) return null;
    const fields = {};
    for (const [, name, value] of feature[2].matchAll(/<(\w+)>([^<]*)<\/\1>/g)) {
        fields[name] = value.trim();
    }
    return fields;
}

export async function getFeatureInfo(service, layer, point, time) {
    const gml = await fetchText(featureInfoUrl(service, layer, point, time), {
        timeoutMs: 30000,
        retries: 4,
    });
    if (/ServiceException/.test(gml)) {
        throw new Error(
            `WMS error for ${layer} at ${time}: ${gml.replace(/\s+/g, ' ').slice(0, 200)}`
        );
    }
    return parseFeatureInfoGml(gml);
}

/** `{ layerName: timeExtent }` from a GetCapabilities document, for layers matching `filter`. */
export async function layerTimes(service, filter = () => true) {
    const xml = await fetchText(`${service}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities`, {
        timeoutMs: 60000,
    });
    const times = {};
    for (const [, body] of xml.matchAll(/<Layer[^>]*>([\s\S]*?)<\/Layer>/g)) {
        const name = body.match(/<Name>([^<]+)<\/Name>/)?.[1];
        const time = body.match(/<Dimension[^>]*name="time"[^>]*>([^<]*)<\/Dimension>/)?.[1];
        if (name && filter(name)) times[name] = time?.trim() ?? null;
    }
    return times;
}
