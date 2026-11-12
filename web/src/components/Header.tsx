import type { Municipality } from 'cartis';
import { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { followLink, routeHref, type Route } from '../route';
import { Icon, type IconName } from './Icon';
import { Logo } from './Logo';
import { Search } from './Search';
import { SettingsMenu } from './SettingsMenu';

const ITEMS: {
    route: Exclude<Route, 'municipality'>;
    icon: IconName;
    label: 'nav.map' | 'nav.municipalities' | 'nav.query' | 'nav.data';
}[] = [
    { route: 'map', icon: 'map', label: 'nav.map' },
    { route: 'municipalities', icon: 'list', label: 'nav.municipalities' },
    { route: 'query', icon: 'filter', label: 'nav.query' },
    { route: 'data', icon: 'database', label: 'nav.data' },
];

interface Props {
    route: Route;
    /** The variable on screen, carried to the other pages. */
    metric?: string;
    onSearch: (name: Municipality) => void;
    describe?: (name: Municipality) => string | undefined;
    settingsOpen?: boolean;
}

/**
 * Top bar: logo, the pages, municipality search and the settings gear. On phones the pages move
 * to a tab bar at the bottom of the screen and search folds into a button.
 */
export function Header({ route, metric, onSearch, describe, settingsOpen }: Props) {
    const { t } = useI18n();
    const [searching, setSearching] = useState(false);

    // Close the phone search row after navigating.
    useEffect(() => setSearching(false), [route]);
    useEffect(() => {
        if (searching) document.querySelector<HTMLInputElement>('.topbar-search input')?.focus();
    }, [searching]);

    const links = (className: string, label: string) => (
        <nav className={className} aria-label={label}>
            {ITEMS.map((item) => (
                <a
                    key={item.route}
                    href={routeHref(item.route, metric)}
                    onClick={followLink}
                    aria-current={route === item.route ? 'page' : undefined}
                >
                    <Icon name={item.icon} />
                    <span>{t(item.label)}</span>
                </a>
            ))}
        </nav>
    );

    return (
        <>
            <header className="topbar">
                <a
                    className="brand"
                    href={routeHref('map', metric)}
                    onClick={followLink}
                    aria-label={t('nav.home')}
                >
                    <Logo />
                    <span className="brand-text">
                        <span className="brand-name">IPMA+</span>
                        <span className="brand-tagline">{t('app.tagline')}</span>
                    </span>
                </a>
                {links('menu', t('nav.pages'))}
                <div className="topbar-tools">
                    <div className="topbar-search" data-open={searching}>
                        <Search
                            onSelect={(name) => {
                                setSearching(false);
                                onSearch(name);
                            }}
                            describe={describe}
                        />
                    </div>
                    <button
                        type="button"
                        className="icon-button search-toggle"
                        aria-label={t('search.label')}
                        aria-expanded={searching}
                        onClick={() => setSearching((s) => !s)}
                    >
                        <Icon name={searching ? 'close' : 'search'} />
                    </button>
                    <SettingsMenu initiallyOpen={settingsOpen} />
                </div>
            </header>
            {links('tabbar', t('nav.pages'))}
        </>
    );
}
