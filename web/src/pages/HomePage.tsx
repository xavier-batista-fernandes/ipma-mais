import type { Municipality } from 'cartis';
import { useEffect, useMemo, useState } from 'react';
import {
    getDay,
    type ApiIndex,
    type DayValues,
    type MetricId,
    type MetricInfo,
    type MunicipalityInfo,
} from '../api';
import { createColorScale } from '../colors';
import { Icon, type IconName } from '../components/Icon';
import { MiniMap, summarizeDay } from '../components/MiniMap';
import { Search } from '../components/Search';
import { useFollowing } from '../following';
import { useI18n } from '../i18n';
import { metricMeta } from '../metrics';
import { followLink, municipalityHref, navigate, routeHref, variableHref } from '../route';

/** A series counts as current when its newest day is at most this old. */
export const STALE_DAYS = 14;

export const isCurrent = (index: ApiIndex, metric: MetricInfo) =>
    !!metric.lastDate &&
    Date.parse(index.generatedAt) - Date.parse(metric.lastDate) <= STALE_DAYS * 86400000;

interface Props {
    index: ApiIndex;
    byDico: Map<string, MunicipalityInfo>;
    slugOf: (name: Municipality) => string;
}

const EXPLORE: {
    route: 'map' | 'municipalities' | 'query' | 'data';
    icon: IconName;
    label: 'nav.map' | 'nav.municipalities' | 'nav.query' | 'nav.data';
    text:
        | 'home.explore.map'
        | 'home.explore.municipalities'
        | 'home.explore.query'
        | 'home.explore.data';
}[] = [
    { route: 'map', icon: 'map', label: 'nav.map', text: 'home.explore.map' },
    {
        route: 'municipalities',
        icon: 'list',
        label: 'nav.municipalities',
        text: 'home.explore.municipalities',
    },
    { route: 'query', icon: 'filter', label: 'nav.query', text: 'home.explore.query' },
    { route: 'data', icon: 'database', label: 'nav.data', text: 'home.explore.data' },
];

/**
 * The front page: what IPMA+ is, a search for one's municipality, each variable on its latest day
 * (with what it means), the municipalities the visitor follows and the way into the other pages.
 */
export function HomePage({ index, byDico, slugOf }: Props) {
    const { t, format, locale } = useI18n();
    const { following } = useFollowing();
    const [days, setDays] = useState<Partial<Record<MetricId, DayValues>>>({});
    const allNames = useMemo(() => index.municipalities.map((m) => m.name), [index]);
    const openMunicipality = (name: Municipality, metric?: MetricId) =>
        navigate(municipalityHref(slugOf(name), metric));

    useEffect(() => {
        let current = true;
        for (const m of index.metrics) {
            if (!m.lastDate) continue;
            getDay(m.id, m.lastDate).then(
                (day) => current && setDays((all) => ({ ...all, [m.id]: day })),
                () => {}
            );
        }
        return () => {
            current = false;
        };
    }, [index]);

    const updated = new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(
        new Date(index.generatedAt)
    );
    const followed = following.map((dico) => byDico.get(dico)).filter((m) => m !== undefined);

    return (
        <main className="page home-page">
            <section className="home-hero">
                <h1>{t('home.title')}</h1>
                <p className="lead">{t('home.lead')}</p>
                <div className="home-search">
                    <span className="field-label">{t('home.search')}</span>
                    <Search
                        onSelect={(name) => openMunicipality(name)}
                        describe={(name) =>
                            index.municipalities.find((m) => m.name === name)?.district
                        }
                    />
                </div>
                <p className="muted small mono">{t('home.updated', { date: updated })}</p>
            </section>

            {followed.length > 0 && (
                <section className="home-section" aria-labelledby="home-following">
                    <h2 id="home-following" className="section-title">
                        {t('home.following')}
                    </h2>
                    <div className="card home-following">
                        <table>
                            <thead>
                                <tr>
                                    <th scope="col">
                                        <span className="visually-hidden">
                                            {t('nav.municipalities')}
                                        </span>
                                    </th>
                                    {index.metrics.map((m) => (
                                        <th key={m.id} scope="col" title={t(`metric.${m.id}`)}>
                                            {m.id.toUpperCase()}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {followed.map((info) => (
                                    <tr key={info.dico}>
                                        <th scope="row">
                                            <a
                                                href={municipalityHref(slugOf(info.name))}
                                                onClick={followLink}
                                            >
                                                {info.name}
                                            </a>
                                        </th>
                                        {index.metrics.map((m) => {
                                            const value = days[m.id]?.values[info.dico];
                                            return (
                                                <td key={m.id}>
                                                    {value === undefined
                                                        ? '—'
                                                        : format.value(value, m.unit)}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            <section className="home-section" aria-labelledby="home-latest">
                <div className="section-head">
                    <h2 id="home-latest" className="section-title">
                        {t('home.latest')}
                    </h2>
                    <a href={routeHref('variables')} onClick={followLink} className="section-link">
                        {t('home.variables')}
                        <Icon name="arrowRight" />
                    </a>
                </div>
                <p className="muted small">{t('home.latestHint')}</p>
                <div className="metric-cards">
                    {index.metrics.map((m) => (
                        <MetricCard
                            key={m.id}
                            index={index}
                            metric={m}
                            day={days[m.id] ?? null}
                            byDico={byDico}
                            allNames={allNames}
                            onSelect={(name) => openMunicipality(name, m.id)}
                        />
                    ))}
                </div>
            </section>

            <section className="home-section" aria-labelledby="home-explore">
                <h2 id="home-explore" className="section-title">
                    {t('home.explore')}
                </h2>
                <ul className="explore">
                    {EXPLORE.map((item) => (
                        <li key={item.route}>
                            <a href={routeHref(item.route)} onClick={followLink}>
                                <Icon name={item.icon} />
                                <span>
                                    <strong>{t(item.label)}</strong>
                                    <span className="muted small">{t(item.text)}</span>
                                </span>
                                <Icon name="arrowRight" />
                            </a>
                        </li>
                    ))}
                </ul>
            </section>
        </main>
    );
}

function MetricCard({
    index,
    metric,
    day,
    byDico,
    allNames,
    onSelect,
}: {
    index: ApiIndex;
    metric: MetricInfo;
    day: DayValues | null;
    byDico: Map<string, MunicipalityInfo>;
    allNames: Municipality[];
    onSelect: (name: Municipality) => void;
}) {
    const { t, format } = useI18n();
    const meta = metricMeta(metric.id);
    const scale = useMemo(() => createColorScale(metric), [metric]);
    const summary = summarizeDay(day);
    const current = isCurrent(index, metric);
    const end = (which: 'high' | 'low') =>
        summary && (
            <>
                <span className="metric-stat-place">{byDico.get(summary[which].dico)?.name}</span>{' '}
                {format.value(summary[which].value, metric.unit)}
            </>
        );

    return (
        <article className="card metric-card" aria-labelledby={`metric-card-${metric.id}`}>
            <p className="metric-card-tags">
                <span className="tag">{t(`variable.group.${meta.group}`)}</span>
                <span className="tag">{metric.unit}</span>
                {metric.lastDate && (
                    <span className="metric-card-date" data-current={current}>
                        {current
                            ? format.day(metric.lastDate)
                            : t('home.stale', { date: format.day(metric.lastDate) })}
                    </span>
                )}
            </p>
            <h3 id={`metric-card-${metric.id}`}>
                <a href={routeHref('map', metric.id)} onClick={followLink}>
                    {t(`metric.${metric.id}`)}
                </a>
            </h3>
            <p className="metric-card-summary">{t(`metricInfo.${metric.id}.summary`)}</p>
            <MiniMap
                day={day}
                scale={scale}
                byDico={byDico}
                allNames={allNames}
                onSelect={onSelect}
            />
            {summary && (
                <dl className="metric-stats">
                    <div>
                        <dt>{t('home.average')}</dt>
                        <dd>{format.value(summary.mean, metric.unit)}</dd>
                    </div>
                    <div>
                        <dt>{t('home.highest')}</dt>
                        <dd>{end('high')}</dd>
                    </div>
                    <div>
                        <dt>{t('home.lowest')}</dt>
                        <dd>{end('low')}</dd>
                    </div>
                </dl>
            )}
            <p className="metric-card-links">
                <a className="button" href={routeHref('map', metric.id)} onClick={followLink}>
                    <Icon name="map" />
                    {t('home.openMap')}
                </a>
                <a className="button ghost" href={variableHref(metric.id)} onClick={followLink}>
                    <Icon name="info" />
                    {t('home.about')}
                </a>
            </p>
        </article>
    );
}
