import type { MetricId } from './api';

/** The current view lives in the query string (`?m=et0&d=2026-10-19&c=1106`), so links share it. */
export interface UrlState {
    metric?: MetricId;
    date?: string | null;
    dico?: string | null;
}

export function readUrlState(): UrlState {
    const params = new URLSearchParams(window.location.search);
    const metric = params.get('m');
    return {
        metric: metric === 'et0' || metric === 'tmax' || metric === 'tmin' ? metric : undefined,
        date: params.get('d'),
        dico: params.get('c'),
    };
}

export function writeUrlState({ metric, date, dico }: UrlState) {
    const params = new URLSearchParams();
    if (metric) params.set('m', metric);
    if (date) params.set('d', date);
    if (dico) params.set('c', dico);
    const query = params.toString();
    // Keep the hash: it holds the current page (see route.ts).
    const { pathname, hash } = window.location;
    window.history.replaceState(null, '', `${query ? `?${query}` : pathname}${hash}`);
}
