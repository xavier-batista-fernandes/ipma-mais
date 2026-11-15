import { isMetricId, type ApiIndex } from '../api';
import { paletteStops } from '../colors';
import { useI18n } from '../i18n';
import { followLink, routeHref } from '../route';
import { Logo } from './Logo';

/** Collection runs twice a day; older than this and the status light goes out. */
const FRESH_HOURS = 18;

/**
 * The bottom of every page, set like the identification plate on an instrument: the colour scale
 * of the variable on screen as its top edge, the station's call sign, a few live readouts (when
 * the data was last read, how much it covers) and the coordinates of the area it watches.
 */
export function Footer({ index, metric }: { index: ApiIndex | null; metric: string }) {
    const { t, format } = useI18n();
    const ramp = paletteStops(isMetricId(metric) ? metric : 'et0');

    const generated = index ? Date.parse(index.generatedAt) : Number.NaN;
    const hours = Number.isNaN(generated) ? null : (Date.now() - generated) / 3600000;
    const fresh = hours !== null && hours < FRESH_HOURS;
    const ago =
        hours === null
            ? null
            : hours < 1
              ? format.relative(-Math.max(1, Math.round(hours * 60)), 'minute')
              : hours < 48
                ? format.relative(-Math.round(hours), 'hour')
                : format.relative(-Math.round(hours / 24), 'day');
    const since = index?.metrics
        .map((m) => m.firstDate)
        .filter((d): d is string => !!d)
        .sort()[0];

    return (
        <footer className="site-footer">
            <div
                className="footer-ramp"
                aria-hidden="true"
                style={{ backgroundImage: `linear-gradient(90deg, ${ramp.join(', ')})` }}
            />
            <div className="footer-plate">
                <div className="footer-id">
                    <p className="footer-callsign">
                        <Logo />
                        <span className="footer-name">IPMA+</span>
                        <span className="footer-station">{t('footer.station')}</span>
                    </p>
                    <p className="footer-lede">{t('footer.lede')}</p>
                    <p className="footer-note">{t('footer.independent')}</p>
                </div>
                <dl className="footer-readouts">
                    <div>
                        <dt>{t('footer.lastReading')}</dt>
                        <dd>
                            <span
                                className="footer-led"
                                data-fresh={fresh || undefined}
                                aria-hidden="true"
                            />
                            {index ? (
                                <time dateTime={index.generatedAt}>
                                    {format.day(index.generatedAt.slice(0, 10))}
                                </time>
                            ) : (
                                '—'
                            )}
                            {ago && <span className="footer-ago">{ago}</span>}
                        </dd>
                    </div>
                    <div>
                        <dt>{t('footer.coverage')}</dt>
                        <dd>
                            {index ? (
                                <>
                                    {t('footer.municipalities', {
                                        count: format.number(index.municipalities.length),
                                    })}
                                    <span className="footer-ago">
                                        {t('footer.variables', {
                                            count: format.number(index.metrics.length),
                                        })}
                                    </span>
                                </>
                            ) : (
                                '—'
                            )}
                        </dd>
                    </div>
                    <div>
                        <dt>{t('footer.archive')}</dt>
                        <dd>{since ? t('footer.since', { year: since.slice(0, 4) }) : '—'}</dd>
                    </div>
                    <div>
                        <dt>{t('footer.source')}</dt>
                        <dd>
                            <a href="https://www.ipma.pt">IPMA</a>
                            <span className="footer-ago">{t('footer.cadence')}</span>
                        </dd>
                    </div>
                </dl>
            </div>
            <div className="footer-strip">
                <span className="footer-coords" title={t('footer.coordsTitle')}>
                    36°58′N–42°09′N · 6°11′W–9°30′W
                </span>
                <nav className="footer-links" aria-label={t('footer.links')}>
                    <a href={routeHref('data')} onClick={followLink}>
                        {t('footer.api')}
                    </a>
                    <a href="https://github.com/xavier-batista-fernandes/ipma-mais">
                        {t('footer.code')}
                    </a>
                    <span>
                        {t('footer.mapBy')}{' '}
                        <a href="https://github.com/xavier-batista-fernandes/cartis">Cartis</a>
                    </span>
                </nav>
            </div>
        </footer>
    );
}
