/**
 * The app's addresses, free of React and the DOM so the Worker can import them too: it answers
 * each page with HTML of its own (title, description and the page's text, see worker/src/pages.ts)
 * and lists them in /sitemap.xml.
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

export type PageRoute = Exclude<Route, 'municipality' | 'variable'>;

export const PATHS: Record<PageRoute, string> = {
    home: '/',
    map: '/mapa',
    variables: '/variaveis',
    municipalities: '/concelhos',
    query: '/consultas',
    data: '/dados',
};

/** Addresses that moved: /sobre became part of /dados. */
export const MOVED: Record<string, string> = { '/sobre': PATHS.data };

/** A municipality's page: `/concelhos/vila-real-de-santo-antonio`. */
const MUNICIPALITY = /^\/concelhos\/([a-z0-9-]+)$/;
/** A variable's page: `/variaveis/et0`. */
const VARIABLE = /^\/variaveis\/([a-z0-9-]+)$/;

export interface Location {
    route: Route;
    /** The municipality's slug on its page (see `slugOf`). */
    slug?: string;
    /** The variable's id on its page. */
    variable?: string;
}

/** The page at a path, or null when no page lives there. A trailing slash is ignored. */
export function parsePath(path: string): Location | null {
    const clean = path.replace(/\/+$/, '') || '/';
    const municipality = MUNICIPALITY.exec(clean);
    if (municipality) return { route: 'municipality', slug: municipality[1] };
    const variable = VARIABLE.exec(clean);
    if (variable) return { route: 'variable', variable: variable[1] };
    const match = (Object.keys(PATHS) as PageRoute[]).find((route) => PATHS[route] === clean);
    return match ? { route: match } : null;
}

/** A variable's page. */
export const variablePath = (id: string) => `/variaveis/${id}`;

/** A municipality's page, from its slug. */
export const municipalityPath = (slug: string) => `/concelhos/${slug}`;

/**
 * A municipality's slug, as in cartis' `stringToSlug` (the app uses that one; this copy is for
 * the Worker, which doesn't load cartis): "Vila Real de Santo António" → "vila-real-de-santo-antonio".
 */
export const slugOf = (name: string) =>
    name.trim().toLowerCase().replace(/\s+/g, '-').normalize('NFD').replace(/[̀-ͯ]/g, '');
