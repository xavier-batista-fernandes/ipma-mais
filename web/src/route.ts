import { useEffect, useMemo, useState, type MouseEvent } from 'react';

/**
 * Pages live in the path (`/consultas`), the current view's state in the query string
 * (`?m=et0&d=…`, see url-state.ts). The Worker answers unknown paths with index.html.
 */
export type Route =
    | 'home'
    | 'map'
    | 'municipalities'
    | 'query'
    | 'data'
    | 'variables'
    | 'municipality'
    | 'variable';

const PATHS: Record<Exclude<Route, 'municipality' | 'variable'>, string> = {
    home: '/',
    map: '/mapa',
    variables: '/variaveis',
    municipalities: '/concelhos',
    query: '/consultas',
    data: '/dados',
};

/** Addresses that moved: /sobre became part of /dados. */
const MOVED: Record<string, string> = { '/sobre': PATHS.data };

/** A municipality's page: `/concelhos/vila-real-de-santo-antonio`. */
const MUNICIPALITY = /^\/concelhos\/([a-z0-9-]+)$/;
/** A variable's page: `/variaveis/et0`. */
const VARIABLE = /^\/variaveis\/([a-z0-9-]+)$/;

export interface Location {
    route: Route;
    /** The municipality's slug on its page (see cartis' `stringToSlug`). */
    slug?: string;
    /** The variable's id on its page. */
    variable?: string;
}

function readLocation(path = window.location.pathname): Location {
    const clean = path.replace(/\/+$/, '') || '/';
    const municipality = MUNICIPALITY.exec(clean);
    if (municipality) return { route: 'municipality', slug: municipality[1] };
    const variable = VARIABLE.exec(clean);
    if (variable) return { route: 'variable', variable: variable[1] };
    const match = (Object.keys(PATHS) as (keyof typeof PATHS)[]).find(
        (route) => PATHS[route] === clean
    );
    return { route: match ?? 'home' };
}

const withMetric = (path: string, metric?: string) => (metric ? `${path}?m=${metric}` : path);

/** A page's link. `metric` is carried along so the other page opens on the same variable. */
export const routeHref = (route: keyof typeof PATHS, metric?: string) =>
    withMetric(PATHS[route], metric);

/** A variable's page. */
export const variableHref = (id: string) => `/variaveis/${id}`;

/** A municipality page's link, from its slug. */
export const municipalityHref = (slug: string, metric?: string) =>
    withMetric(`/concelhos/${slug}`, metric);

const NAVIGATE = 'ipma-mais:navigate';

/** Opens another page (or the same one with other parameters) as a new history entry. */
export function navigate(href: string) {
    const next = new URL(href, window.location.href);
    if (next.href === window.location.href) return;
    const samePage = next.pathname === window.location.pathname;
    window.history.pushState(null, '', next);
    window.dispatchEvent(new Event(NAVIGATE));
    if (!samePage) window.scrollTo(0, 0);
}

/** For `<a onClick>`: follows the link in the app, but lets modified clicks open a new tab. */
export function followLink(event: MouseEvent<HTMLAnchorElement>) {
    if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
    )
        return;
    event.preventDefault();
    navigate(event.currentTarget.href);
}

/** The current page, re-read on every navigation (including Back and Forward). */
export function useLocation(): Location {
    const [path, setPath] = useState(() => window.location.pathname);
    useEffect(() => {
        const update = () => setPath(window.location.pathname);
        window.addEventListener('popstate', update);
        window.addEventListener(NAVIGATE, update);
        return () => {
            window.removeEventListener('popstate', update);
            window.removeEventListener(NAVIGATE, update);
        };
    }, []);
    return useMemo(() => readLocation(path), [path]);
}

/**
 * Links from before the app had real paths keep working: `#/about` and /sobre open /dados, `#/settings`
 * opens the map with the settings panel, and a query (`?v=q&…`) opens /consultas. The map used to
 * be the home page, so `/` with a view in its query string (`?m=…&d=…`) opens /mapa. Returns
 * whether the settings panel should start open. Runs once, before the first render.
 */
export function redirectOldLinks(): { openSettings: boolean } {
    const { pathname, search, hash } = window.location;
    const params = new URLSearchParams(search);
    let path = pathname;
    let openSettings = false;
    if (hash === '#/about') path = PATHS.data;
    else if (hash === '#/settings') {
        openSettings = true;
        if (path === '/' || path === '') path = PATHS.map;
    }
    path = MOVED[path.replace(/\/+$/, '')] ?? path;
    if (params.get('v') === 'q') {
        params.delete('v');
        path = PATHS.query;
    } else if ((path === '/' || path === '') && ['m', 'd', 'c'].some((key) => params.has(key))) {
        path = PATHS.map;
    }
    const query = params.toString();
    const next = `${path}${query ? `?${query}` : ''}`;
    if (next !== `${pathname}${search}` || hash.startsWith('#/')) {
        window.history.replaceState(null, '', next);
    }
    return { openSettings };
}
