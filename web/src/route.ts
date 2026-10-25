import { useEffect, useState } from 'react';

/** Pages live in the hash (`#/settings`), next to the map's query string state. */
export type Route = 'map' | 'about' | 'settings';

const ROUTES: Route[] = ['map', 'about', 'settings'];

function readRoute(): Route {
    const name = window.location.hash.replace(/^#\/?/, '');
    return ROUTES.includes(name as Route) ? (name as Route) : 'map';
}

export const routeHref = (route: Route) => (route === 'map' ? '#/' : `#/${route}`);

export function useRoute() {
    const [route, setRoute] = useState(readRoute);
    useEffect(() => {
        const update = () => {
            setRoute(readRoute());
            window.scrollTo(0, 0);
        };
        window.addEventListener('hashchange', update);
        return () => window.removeEventListener('hashchange', update);
    }, []);
    return route;
}
