import type { Municipality } from 'cartis';
import { useEffect, useMemo, useState } from 'react';
import {
    getDay,
    type ApiIndex,
    type DayValues,
    type MetricInfo,
    type MunicipalityInfo,
} from '../api';
import { createColorScale } from '../colors';
import { Icon } from '../components/Icon';
import { Legend } from '../components/Legend';
import { MiniMap, summarizeDay } from '../components/MiniMap';
import { useI18n } from '../i18n';
import { metricMeta } from '../metrics';
import { followLink, municipalityHref, navigate, routeHref, variableHref } from '../route';
import { isCurrent } from './HomePage';

interface Props {
    index: ApiIndex;
    metric: MetricInfo;
    byDico: Map<string, MunicipalityInfo>;
    slugOf: (name: Municipality) => string;
}

/**
 * One variable explained: what it measures, how to read it, what it's for and where it comes from,
 * next to its latest map, its colour scale and how much history there is.
 */
export function VariablePage({ index, metric, byDico, slugOf }: Props) {
    const { t, format } = useI18n();
    const meta = metricMeta(metric.id);
    const scale = useMemo(() => createColorScale(metric), [metric]);
    const allNames = useMemo(() => index.municipalities.map((m) => m.name), [index]);
    const [day, setDay] = useState<(DayValues & { metric: string }) | null>(null);

    useEffect(() => {
        if (!metric.lastDate) return;
        let current = true;
        getDay(metric.id, metric.lastDate).then(
            (d) => current && setDay({ ...d, metric: metric.id }),
            () => {}
        );
        return () => {
            current = false;
        };
    }, [metric]);

    const shown = day?.metric === metric.id ? day : null;
    const summary = summarizeDay(shown);
    const current = isCurrent(index, metric);
    const sections = [
        { key: 'what', title: t('variable.what'), text: t(`metricInfo.${metric.id}.what`) },
        { key: 'read', title: t('variable.read'), text: t(`metricInfo.${metric.id}.read`) },
        { key: 'uses', title: t('variable.uses'), text: t(`metricInfo.${metric.id}.uses`) },
    ];

    return (
        <main className="page variable-page">
            <p className="breadcrumb">
                <a href={routeHref('variables')} onClick={followLink}>
                    {t('variables.title')}
                </a>
                <span aria-hidden="true"> / </span>
                <span className="mono">{metric.id}</span>
            </p>
            <h1>{t(`metric.${metric.id}`)}</h1>
            <p className="lead">{t(`metricInfo.${metric.id}.summary`)}</p>
            <ul className="variable-facts" aria-label={t('controls.metric')}>
                <li className="tag">{t(`variable.group.${meta.group}`)}</li>
                <li className="tag">{metric.unit}</li>
                <li className="tag">{t(`variable.cadence.${meta.cadence}`)}</li>
                <li className="tag">{t(`variable.method.${meta.method}`)}</li>
                <li className="tag">{t(`variable.aggregate.${meta.aggregate}`)}</li>
            </ul>
            <p className="variable-actions">
                <a className="button" href={routeHref('map', metric.id)} onClick={followLink}>
                    <Icon name="map" />
                    {t('variable.openMap')}
                </a>
                <a
                    className="button ghost"
                    href={routeHref('query', metric.id)}
                    onClick={followLink}
                >
                    <Icon name="filter" />
                    {t('variable.openQuery')}
                </a>
            </p>

            <div className="variable-grid">
                <div className="variable-text">
                    {sections.map((s) => (
                        <section key={s.key} className="card" aria-labelledby={`variable-${s.key}`}>
                            <h2 id={`variable-${s.key}`}>{s.title}</h2>
                            <p>{s.text}</p>
                        </section>
                    ))}
                    <section className="card" aria-labelledby="variable-source">
                        <h2 id="variable-source">{t('variable.source')}</h2>
                        <p>{t(`metricInfo.${metric.id}.source`)}</p>
                        <a href={meta.sourceUrl} target="_blank" rel="noreferrer">
                            {t('variable.sourceLink')}
                        </a>
                    </section>
                </div>

                <aside className="variable-side">
                    <section className="card" aria-labelledby="variable-latest">
                        <h2 id="variable-latest" className="field-label">
                            {metric.lastDate
                                ? t('variable.latest', { date: format.day(metric.lastDate) })
                                : t('panel.noData')}
                        </h2>
                        <MiniMap
                            day={shown}
                            scale={scale}
                            byDico={byDico}
                            allNames={allNames}
                            onSelect={(name) => navigate(municipalityHref(slugOf(name), metric.id))}
                        />
                        {summary && (
                            <dl className="metric-stats">
                                <div>
                                    <dt>{t('home.average')}</dt>
                                    <dd>{format.value(summary.mean, metric.unit)}</dd>
                                </div>
                                <div>
                                    <dt>{t('home.highest')}</dt>
                                    <dd>{format.value(summary.high.value, metric.unit)}</dd>
                                </div>
                                <div>
                                    <dt>{t('home.lowest')}</dt>
                                    <dd>{format.value(summary.low.value, metric.unit)}</dd>
                                </div>
                            </dl>
                        )}
                    </section>
                    <section className="card" aria-labelledby="variable-scale">
                        <h2 id="variable-scale" className="field-label">
                            {t('variable.scale')}
                        </h2>
                        <Legend scale={scale} unit={metric.unit} />
                        <p className="muted small">{t('variable.scaleHint')}</p>
                    </section>
                    <section className="card" aria-labelledby="variable-history">
                        <h2 id="variable-history" className="field-label">
                            {t('variable.history')}
                        </h2>
                        <p className="mono small">
                            {metric.firstDate && metric.lastDate
                                ? t('variable.historyValue', {
                                      first: format.day(metric.firstDate),
                                      last: format.day(metric.lastDate),
                                      count: metric.dates.length,
                                  })
                                : t('panel.noData')}
                        </p>
                        <p className="variable-status small" data-current={current}>
                            {current
                                ? t('data.current')
                                : t('data.archive', {
                                      date: metric.lastDate ? format.day(metric.lastDate) : '—',
                                  })}
                        </p>
                        <a
                            href={routeHref('data', metric.id)}
                            onClick={followLink}
                            className="small"
                        >
                            {t('nav.data')}
                        </a>
                    </section>
                </aside>
            </div>

            <nav className="variable-others" aria-labelledby="variable-others">
                <h2 id="variable-others" className="section-title">
                    {t('variable.others')}
                </h2>
                <VariableList index={index} except={metric.id} />
            </nav>
        </main>
    );
}

/** Every variable as a card: name, unit, what it is in one line. */
export function VariableList({ index, except }: { index: ApiIndex; except?: string }) {
    const { t } = useI18n();
    return (
        <ul className="variable-cards">
            {index.metrics
                .filter((m) => m.id !== except)
                .map((m) => (
                    <li key={m.id}>
                        <a href={variableHref(m.id)} onClick={followLink}>
                            <span className="variable-card-head">
                                <strong>{t(`metric.${m.id}`)}</strong>
                                <span className="tag">{m.unit}</span>
                            </span>
                            <span className="muted small">{t(`metricInfo.${m.id}.summary`)}</span>
                            <span className="field-label">
                                {t(`variable.group.${metricMeta(m.id).group}`)}
                            </span>
                        </a>
                    </li>
                ))}
        </ul>
    );
}

/** /variaveis: every variable, explained in a line, each opening its own page. */
export function VariablesPage({ index }: { index: ApiIndex }) {
    const { t } = useI18n();
    return (
        <main className="page variables-page">
            <h1>{t('variables.title')}</h1>
            <p className="lead">{t('variables.lead')}</p>
            <VariableList index={index} />
        </main>
    );
}

export function VariableNotFound() {
    const { t } = useI18n();
    return (
        <main className="page">
            <h1>{t('variable.notFound')}</h1>
            <p>
                <a className="button" href={routeHref('variables')} onClick={followLink}>
                    {t('variables.title')}
                    <Icon name="arrowRight" />
                </a>
            </p>
        </main>
    );
}
