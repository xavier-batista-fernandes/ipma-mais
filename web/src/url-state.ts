import type { MetricId } from './api';
import { queryToParams, type Query } from './query';
import type { Route } from './route';

/**
 * The current view lives in the query string, so links share it. Every page keeps the variable
 * (`m`); the map adds its day and municipality (`?m=et0&d=2026-10-19&c=1106`), the query page
 * its question (see `query.ts`) and the selected municipality.
 */
export interface UrlState {
    metric?: MetricId;
    date?: string | null;
    dico?: string | null;
    query?: Query | null;
}

export function readUrlState(): UrlState & { params: URLSearchParams } {
    const params = new URLSearchParams(window.location.search);
    const metric = params.get('m');
    return {
        metric: metric === 'et0' || metric === 'tmax' || metric === 'tmin' ? metric : undefined,
        date: params.get('d'),
        dico: params.get('c'),
        params,
    };
}

export function writeUrlState(route: Route, { metric, date, dico, query }: UrlState) {
    const params = new URLSearchParams();
    if (metric) params.set('m', metric);
    if (route === 'map' && date) params.set('d', date);
    if (route !== 'about' && dico) params.set('c', dico);
    if (route === 'query' && query) queryToParams(query, params);
    const search = params.toString();
    const { pathname } = window.location;
    const next = `${pathname}${search ? `?${search}` : ''}`;
    if (next !== `${pathname}${window.location.search}`)
        window.history.replaceState(null, '', next);
}
