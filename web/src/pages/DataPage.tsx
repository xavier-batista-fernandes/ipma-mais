import { useMemo, useState } from 'react';
import type { ApiIndex, MetricId, MetricInfo } from '../api';
import { Icon } from '../components/Icon';
import { parseIsoDate } from '../format';
import { useI18n } from '../i18n';
import { addDays } from '../municipality';

const DOCS = 'https://github.com/xavier-batista-fernandes/ipma-mais/blob/main/docs/API.md';
const CODE = 'https://github.com/xavier-batista-fernandes/ipma-mais';
/** A series counts as current when its newest day is at most this old. */
const STALE_DAYS = 14;

/**
 * Where the numbers come from and how to use them elsewhere: each variable and how current it is,
 * which days have data, the public API, and what IPMA+ is (formerly the About page).
 */
export function DataPage({ index }: { index: ApiIndex }) {
    const { t, format, locale } = useI18n();
    const [coverageId, setCoverageId] = useState<MetricId>(index.metrics[0]?.id ?? 'et0');
    const coverage = index.metrics.find((m) => m.id === coverageId) ?? index.metrics[0];
    const base = `${window.location.origin}/v1`;
    const dateTime = new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
    const lastCollection = Object.values(index.sources)
        .map((s) => s.lastSuccess)
        .filter((d): d is string => !!d)
        .sort()
        .at(-1);
    const isCurrent = (m: MetricInfo) =>
        !!m.lastDate &&
        Date.parse(index.generatedAt) - Date.parse(m.lastDate) <= STALE_DAYS * 86400000;
    const example =
        index.municipalities.find((m) => m.name === 'Lisboa') ?? index.municipalities[0];

    const endpoints = [
        { path: 'index', key: 'data.api.index' },
        { path: 'et0/latest', key: 'data.api.latest' },
        { path: `et0/series/${example?.dico ?? '1106'}`, key: 'data.api.series' },
        { path: 'et0/values', key: 'data.api.values' },
        { path: 'et0/stats', key: 'data.api.stats' },
    ] as const;

    return (
        <main className="page data-page">
            <h1>{t('data.title')}</h1>
            <p className="lead">{t('about.intro')}</p>

            <section className="card" aria-labelledby="variables-title">
                <h2 id="variables-title">{t('data.variables')}</h2>
                <ul className="variables">
                    {index.metrics.map((m) => (
                        <li key={m.id}>
                            <span className="variable-id">{m.id}</span>
                            <span className="variable-name">
                                <span>
                                    {t(`metric.${m.id}`)} <span className="tag">{m.unit}</span>
                                </span>
                                <span className="muted small">
                                    {m.firstDate && m.lastDate
                                        ? `${format.day(m.firstDate)} → ${format.day(m.lastDate)} · ${t(
                                              'data.days',
                                              { count: m.dates.length }
                                          )}`
                                        : t('panel.noData')}
                                </span>
                            </span>
                            <span className="variable-status" data-current={isCurrent(m)}>
                                {isCurrent(m)
                                    ? t('data.current')
                                    : t('data.archive', {
                                          date: m.lastDate ? format.day(m.lastDate) : '—',
                                      })}
                            </span>
                        </li>
                    ))}
                </ul>
                <ul className="small muted data-notes">
                    <li>{t('about.et0')}</li>
                    <li>{t('about.temperature')}</li>
                </ul>
                {lastCollection && (
                    <p className="muted small mono">
                        {t('data.lastCollection', {
                            date: dateTime.format(new Date(lastCollection)),
                        })}
                    </p>
                )}
            </section>

            {coverage && (
                <section className="card" aria-labelledby="coverage-title">
                    <div className="card-head">
                        <h2 id="coverage-title">{t('data.coverage')}</h2>
                        <div className="segmented" role="group" aria-label={t('controls.metric')}>
                            {index.metrics.map((m) => (
                                <button
                                    key={m.id}
                                    type="button"
                                    aria-pressed={coverage.id === m.id}
                                    onClick={() => setCoverageId(m.id)}
                                >
                                    {m.id.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>
                    <p className="muted small">{t('data.coverageHint')}</p>
                    <Coverage metric={coverage} />
                </section>
            )}

            <section className="card" aria-labelledby="api-title">
                <h2 id="api-title">{t('data.api')}</h2>
                <p>{t('data.apiIntro')}</p>
                <p className="api-base">
                    <code>{base}</code>
                </p>
                <ul className="endpoints">
                    {endpoints.map((e) => (
                        <li key={e.path}>
                            <a href={`${base}/${e.path}`} target="_blank" rel="noreferrer">
                                <code>GET /v1/{e.path}</code>
                            </a>
                            <span className="muted small">{t(e.key)}</span>
                        </li>
                    ))}
                </ul>
                <a className="button" href={DOCS}>
                    <Icon name="arrowRight" />
                    {t('data.docs')}
                </a>
            </section>

            <section className="card" aria-labelledby="about-title">
                <h2 id="about-title">{t('about.title')}</h2>
                <p>{t('about.how')}</p>
                <a className="button" href={CODE}>
                    <Icon name="github" />
                    {t('about.code')}
                </a>
            </section>
        </main>
    );
}

/** One square per day from the first to the last day, a row per month; gaps stand out. */
function Coverage({ metric }: { metric: MetricInfo }) {
    const { t, locale } = useI18n();
    const months = useMemo(() => {
        if (!metric.firstDate || !metric.lastDate) return [];
        const have = new Set(metric.dates);
        const result: { month: string; days: { date: string; state: 'data' | 'gap' | 'out' }[] }[] =
            [];
        let date = `${metric.firstDate.slice(0, 8)}01`;
        while (date <= metric.lastDate) {
            const month = date.slice(0, 7);
            if (result.at(-1)?.month !== month) result.push({ month, days: [] });
            const state = date < metric.firstDate ? 'out' : have.has(date) ? 'data' : 'gap';
            result.at(-1)!.days.push({ date, state });
            date = addDays(date, 1);
        }
        return result;
    }, [metric]);
    const monthName = new Intl.DateTimeFormat(locale, {
        month: 'short',
        year: '2-digit',
        timeZone: 'UTC',
    });
    const missing = months.reduce((n, m) => n + m.days.filter((d) => d.state === 'gap').length, 0);

    return (
        <div className="coverage">
            <div
                className="coverage-grid"
                role="img"
                aria-label={t('data.coverageLabel', { missing })}
            >
                {months.map((m) => (
                    <div className="coverage-row" key={m.month}>
                        <span className="coverage-month">
                            {monthName.format(parseIsoDate(`${m.month}-01`)).replace('.', '')}
                        </span>
                        {m.days.map((d) => (
                            <span
                                key={d.date}
                                className="coverage-day"
                                data-state={d.state}
                                title={d.state === 'out' ? undefined : d.date}
                            />
                        ))}
                    </div>
                ))}
            </div>
            <p className="chart-legend muted small">
                <span className="swatch coverage-key" /> {t('data.withData')}
                <span className="swatch coverage-key gap" />{' '}
                {t('data.withoutData', { count: missing })}
            </p>
        </div>
    );
}
