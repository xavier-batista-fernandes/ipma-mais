import { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { routeHref, type Route } from '../route';
import { Icon, type IconName } from './Icon';
import { Logo } from './Logo';

const ITEMS: { route: Route; icon: IconName; label: 'nav.map' | 'nav.about' | 'nav.settings' }[] = [
    { route: 'map', icon: 'map', label: 'nav.map' },
    { route: 'about', icon: 'info', label: 'nav.about' },
    { route: 'settings', icon: 'settings', label: 'nav.settings' },
];

/** Top bar: logo and wordmark, then the page menu (a drop-down panel on narrow screens). */
export function Header({ route }: { route: Route }) {
    const { t } = useI18n();
    const [open, setOpen] = useState(false);

    // Close the mobile menu after navigating.
    useEffect(() => setOpen(false), [route]);

    return (
        <header className="topbar">
            <a className="brand" href={routeHref('map')} aria-label={t('nav.home')}>
                <Logo />
                <span className="brand-text">
                    <span className="brand-name">IPMA+</span>
                    <span className="brand-tagline">{t('app.tagline')}</span>
                </span>
            </a>
            <button
                type="button"
                className="icon-button menu-toggle"
                aria-label={t('nav.menu')}
                aria-expanded={open}
                aria-controls="main-menu"
                onClick={() => setOpen((o) => !o)}
            >
                <Icon name={open ? 'close' : 'menu'} />
            </button>
            <nav id="main-menu" className="menu" data-open={open}>
                {ITEMS.map((item) => (
                    <a
                        key={item.route}
                        href={routeHref(item.route)}
                        aria-current={route === item.route ? 'page' : undefined}
                    >
                        <Icon name={item.icon} />
                        {t(item.label)}
                    </a>
                ))}
            </nav>
        </header>
    );
}
