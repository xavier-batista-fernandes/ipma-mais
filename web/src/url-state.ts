import type { MetricId } from './api';
import { queryToParams, type Query } from './query';

export type Mode = 'day' | 'query';

/**
 * The current view lives in the query string (`?m=et0&d=2026-10-19&c=1106`), so links share it.
 * In query mode `v=q` and the query's own parameters are added (see `query.ts`).
 */
export interface UrlState {
    metric?: MetricId;
    date?: string | null;
    dico?: string | null;
    mode?: Mode;
    query?: Query | null;
}

export function readUrlState(): UrlState & { params: URLSearchParams } {
    const params = new URLSearchParams(window.location.search);
    const metric = params.get('m');
    return {
        metric: metric === 'et0' || metric === 'tmax' || metric === 'tmin' ? metric : undefined,
        date: params.get('d'),
        dico: params.get('c'),
        mode: params.get('v') === 'q' ? 'query' : 'day',
        params,
    };
}

export function writeUrlState({ metric, date, dico, mode, query }: UrlState) {
    const params = new URLSearchParams();
    if (metric) params.set('m', metric);
    if (date) params.set('d', date);
    if (dico) params.set('c', dico);
    if (mode === 'query') {
        params.set('v', 'q');
        if (query) queryToParams(query, params);
    }
    const search = params.toString();
    // Keep the hash: it holds the current page (see route.ts).
    const { pathname, hash } = window.location;
    window.history.replaceState(null, '', `${search ? `?${search}` : pathname}${hash}`);
}
