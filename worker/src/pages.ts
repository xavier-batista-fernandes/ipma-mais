/**
 * The app's pages as HTML a search engine can read without running the app: every address
 * (`/`, `/concelhos/lisboa`, `/variaveis/et0`…) is answered with the built index.html, given the
 * page's own title, description, canonical address, language alternates and Open Graph tags, and
 * with the page's text (for a municipality, its latest values) inside `#root`. The app replaces
 * that text when it starts, so people see the same app as before.
 *
 * Portuguese is the site's language; `?lang=en` is the same page in English (see `hreflang`).
 * Also serves /sitemap.xml and /robots.txt.
 */
import { en, type Messages } from '../../web/src/i18n/en';
import { pt } from '../../web/src/i18n/pt';
import {
    MOVED,
    PATHS,
    municipalityPath,
    parsePath,
    slugOf,
    variablePath,
    type Location,
    type PageRoute,
} from '../../web/src/paths';
import {
    LANG_TAG,
    OG_LOCALE,
    SITE_NAME,
    pageMeta,
    type PageMeta,
    type SeoLanguage,
} from '../../web/src/seo';

export interface PagesEnv {
    DB: D1Database;
    ASSETS: Fetcher;
}

const MESSAGES: Record<SeoLanguage, Messages> = { pt, en };
const LOCALE: Record<SeoLanguage, string> = { pt: 'pt-PT', en: 'en-GB' };

/** Text only these pages need, beyond the app's dictionaries. */
const WORDS = {
    pt: {
        latest: 'Últimos valores',
        variable: 'Variável',
        value: 'Valor',
        day: 'Dia',
        noData: 'Sem dados recentes',
        district: 'Distrito de {district}',
        openApp: 'Abrir no IPMA+',
        allMunicipalities: 'Todos os municípios',
        notFound: 'Não há nenhuma página neste endereço.',
        source: 'Dados do Instituto Português do Mar e da Atmosfera (IPMA).',
    },
    en: {
        latest: 'Latest values',
        variable: 'Variable',
        value: 'Value',
        day: 'Day',
        noData: 'No recent data',
        district: '{district} district',
        openApp: 'Open in IPMA+',
        allMunicipalities: 'All municipalities',
        notFound: 'There is no page at this address.',
        source: 'Data from the Portuguese Institute for Sea and Atmosphere (IPMA).',
    },
} satisfies Record<SeoLanguage, Record<string, string>>;

/** The pages in the order the navigation and the sitemap list them. */
const MAIN_PAGES: PageRoute[] = ['home', 'map', 'municipalities', 'variables', 'query', 'data'];
const NAV_LABEL: Record<PageRoute, keyof Messages> = {
    home: 'nav.start',
    map: 'nav.map',
    municipalities: 'nav.municipalities',
    variables: 'nav.variables',
    query: 'nav.query',
    data: 'nav.data',
};

interface StoredIndex {
    metrics: { id: string; unit: string; dateRuns?: [string, number][] }[];
    municipalities: { dico: string; name: string; district: string }[];
}

interface SiteIndex {
    metrics: { id: string; unit: string; lastDate: string | null }[];
    municipalities: { dico: string; name: string; district: string; slug: string }[];
    bySlug: Map<string, { dico: string; name: string; district: string; slug: string }>;
}

const DAY_MS = 86400000;
const shiftDays = (iso: string, days: number) =>
    new Date(Date.parse(`${iso}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

/** The index changes a few times a day; each Worker instance keeps it for 5 minutes. */
const INDEX_TTL_MS = 5 * 60 * 1000;
let indexCache: { at: number; index: SiteIndex | null } | null = null;

async function siteIndex(db: D1Database): Promise<SiteIndex | null> {
    if (indexCache && Date.now() - indexCache.at < INDEX_TTL_MS) return indexCache.index;
    const row = await db
        .prepare("SELECT body FROM document WHERE key = 'index'")
        .first<{ body: string }>();
    let index: SiteIndex | null = null;
    if (row) {
        const stored = JSON.parse(row.body) as StoredIndex;
        const municipalities = stored.municipalities.map((m) => ({ ...m, slug: slugOf(m.name) }));
        index = {
            metrics: stored.metrics.map(({ id, unit, dateRuns }) => {
                const last = dateRuns?.at(-1);
                return { id, unit, lastDate: last ? shiftDays(last[0], last[1] - 1) : null };
            }),
            municipalities,
            bySlug: new Map(municipalities.map((m) => [m.slug, m])),
        };
    }
    indexCache = { at: Date.now(), index };
    return index;
}

/**
 * Answers a request that isn't for the API: a page, the sitemap, robots.txt, or a static file.
 * Unknown addresses get the app with a 404 status, so they aren't indexed.
 */
export async function servePage(request: Request, env: PagesEnv): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/robots.txt') return robots(url);
    if (path === '/sitemap.xml') return sitemap(url, await siteIndex(env.DB));

    const moved = MOVED[path.replace(/\/+$/, '')];
    if (moved) return Response.redirect(new URL(`${moved}${url.search}`, url).toString(), 301);

    const location = parsePath(path);
    if (!location) {
        const asset = await env.ASSETS.fetch(request);
        if (asset.status !== 404) return asset;
    }
    return renderPage(request, env, location);
}

async function renderPage(
    request: Request,
    env: PagesEnv,
    location: Location | null
): Promise<Response> {
    const url = new URL(request.url);
    const language: SeoLanguage = url.searchParams.get('lang') === 'en' ? 'en' : 'pt';
    const index = await siteIndex(env.DB).catch((error) => {
        console.error(error);
        return null;
    });

    const municipality =
        location?.route === 'municipality' ? index?.bySlug.get(location.slug ?? '') : undefined;
    const knownVariable =
        location?.route !== 'variable' ||
        (index ? index.metrics.some((m) => m.id === location.variable) : true);
    // Without the index (no data yet, or D1 failing) a municipality can't be looked up: still
    // answer with the app, which shows its own error, but don't let it be indexed as missing.
    const found =
        location !== null &&
        knownVariable &&
        (location.route !== 'municipality' || municipality !== undefined || index === null);
    const meta = pageMeta(found ? location : null, language, { municipality, knownVariable });

    let body = '';
    try {
        body = await pageBody(found ? location : null, language, index, municipality, env.DB);
    } catch (error) {
        console.error(error);
    }

    const shell = await env.ASSETS.fetch(new Request(new URL('/', url), { method: 'GET' }));
    if (!shell.ok) return shell;
    const canonicalPath = found && location ? canonicalPathOf(location, municipality?.slug) : null;
    const status = found ? 200 : 404;
    const rewritten = new HTMLRewriter()
        .on('html', {
            element: (element) => {
                element.setAttribute('lang', LANG_TAG[language]);
            },
        })
        .on('title', {
            element: (element) => {
                element.setInnerContent(meta.title);
            },
        })
        .on('meta[name="description"]', {
            element: (element) => {
                element.setAttribute('content', meta.description);
            },
        })
        .on('head', {
            element: (element) => {
                element.append(headTags(url, meta, language, canonicalPath), { html: true });
            },
        })
        .on('#root', {
            element: (element) => {
                element.setInnerContent(body, { html: true });
            },
        })
        .transform(shell);

    const headers = new Headers(rewritten.headers);
    headers.set('Content-Type', 'text/html; charset=utf-8');
    // The HTML names the build's hashed scripts, so it must not outlive a deploy in a cache.
    headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
    headers.delete('ETag');
    headers.set('Content-Language', LANG_TAG[language]);
    return new Response(request.method === 'HEAD' ? null : rewritten.body, { status, headers });
}

function canonicalPathOf(location: Location, slug?: string) {
    if (location.route === 'municipality') return municipalityPath(slug ?? location.slug ?? '');
    if (location.route === 'variable') return variablePath(location.variable ?? '');
    return PATHS[location.route];
}

const pageUrl = (origin: string, path: string, language: SeoLanguage) =>
    `${origin}${path}${language === 'en' ? '?lang=en' : ''}`;

function headTags(
    url: URL,
    meta: PageMeta,
    language: SeoLanguage,
    canonicalPath: string | null
): string {
    const tags = [
        `<meta property="og:site_name" content="${escape(SITE_NAME)}" />`,
        `<meta property="og:type" content="website" />`,
        `<meta property="og:title" content="${escape(meta.title)}" />`,
        `<meta property="og:description" content="${escape(meta.description)}" />`,
        `<meta property="og:locale" content="${OG_LOCALE[language]}" />`,
        `<meta name="twitter:card" content="summary" />`,
    ];
    if (canonicalPath === null) {
        tags.push('<meta name="robots" content="noindex" />');
        return tags.join('');
    }
    const canonical = pageUrl(url.origin, canonicalPath, language);
    tags.push(
        `<link rel="canonical" href="${escape(canonical)}" />`,
        `<meta property="og:url" content="${escape(canonical)}" />`,
        `<link rel="alternate" hreflang="pt-PT" href="${escape(pageUrl(url.origin, canonicalPath, 'pt'))}" />`,
        `<link rel="alternate" hreflang="en" href="${escape(pageUrl(url.origin, canonicalPath, 'en'))}" />`,
        `<link rel="alternate" hreflang="x-default" href="${escape(pageUrl(url.origin, canonicalPath, 'pt'))}" />`
    );
    return tags.join('');
}

/** The page's text, as plain HTML with links, for whoever reads it without running the app. */
async function pageBody(
    location: Location | null,
    language: SeoLanguage,
    index: SiteIndex | null,
    municipality: SiteIndex['municipalities'][number] | undefined,
    db: D1Database
): Promise<string> {
    const m = MESSAGES[language];
    const w = WORDS[language];
    const link = (path: string, text: string) =>
        `<a href="${escape(pageUrl('', path, language))}">${escape(text)}</a>`;
    const nav = `<nav aria-label="${escape(m['nav.pages'])}"><ul>${MAIN_PAGES.map(
        (route) => `<li>${link(PATHS[route], m[NAV_LABEL[route]])}</li>`
    ).join('')}</ul></nav>`;
    const metricName = (id: string) => (m as Record<string, string>)[`metric.${id}`] ?? id;
    const info = (id: string, part: string) =>
        (m as Record<string, string>)[`metricInfo.${id}.${part}`] ?? '';
    const metrics = index?.metrics ?? [];
    const variableList = `<ul>${metrics
        .map(
            ({ id }) =>
                `<li>${link(variablePath(id), metricName(id))}: ${escape(info(id, 'summary'))}</li>`
        )
        .join('')}</ul>`;
    const municipalityList = () => {
        const byDistrict = new Map<string, SiteIndex['municipalities']>();
        for (const item of index?.municipalities ?? []) {
            const list = byDistrict.get(item.district) ?? [];
            list.push(item);
            byDistrict.set(item.district, list);
        }
        const collator = new Intl.Collator(LOCALE[language]);
        return [...byDistrict.entries()]
            .sort(([a], [b]) => collator.compare(a, b))
            .map(
                ([district, list]) =>
                    `<h2>${escape(district)}</h2><ul>${list
                        .sort((a, b) => collator.compare(a.name, b.name))
                        .map((item) => `<li>${link(municipalityPath(item.slug), item.name)}</li>`)
                        .join('')}</ul>`
            )
            .join('');
    };

    let main: string;
    switch (location?.route) {
        case 'home':
            main =
                `<h1>${escape(m['home.title'])}</h1><p>${escape(m['home.lead'])}</p>` +
                `<h2>${escape(m['home.explore'])}</h2><ul>` +
                (['map', 'municipalities', 'query', 'data'] as const)
                    .map(
                        (route) =>
                            `<li>${link(PATHS[route], m[NAV_LABEL[route]])}: ${escape(
                                m[`home.explore.${route}`]
                            )}</li>`
                    )
                    .join('') +
                `</ul><h2>${escape(m['home.variables'])}</h2>${variableList}`;
            break;
        case 'map':
            main = `<h1>${escape(m['nav.map'])}</h1><p>${escape(m['home.explore.map'])}</p>`;
            break;
        case 'query':
            main = `<h1>${escape(m['nav.query'])}</h1><p>${escape(m['home.explore.query'])}</p>`;
            break;
        case 'data':
            main = `<h1>${escape(m['data.title'])}</h1><p>${escape(m['home.explore.data'])}</p>`;
            break;
        case 'variables':
            main = `<h1>${escape(m['variables.title'])}</h1><p>${escape(m['variables.lead'])}</p>${variableList}`;
            break;
        case 'municipalities':
            main = `<h1>${escape(m['municipalities.title'])}</h1><p>${escape(
                m['home.explore.municipalities']
            )}</p>${municipalityList()}`;
            break;
        case 'variable': {
            const id = location.variable ?? '';
            const sections = (['what', 'read', 'uses', 'source'] as const)
                .map(
                    (part) =>
                        `<h2>${escape(m[`variable.${part}`])}</h2><p>${escape(info(id, part))}</p>`
                )
                .join('');
            main = `<h1>${escape(metricName(id))}</h1><p>${escape(info(id, 'summary'))}</p>${sections}`;
            break;
        }
        case 'municipality': {
            if (!municipality) {
                main = '';
                break;
            }
            const rows = await latestValues(db, metrics, municipality.dico);
            const number = new Intl.NumberFormat(LOCALE[language], { maximumFractionDigits: 1 });
            const date = new Intl.DateTimeFormat(LOCALE[language], {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                timeZone: 'UTC',
            });
            const table = rows
                .map(({ id, unit, value, day }) => {
                    const shown =
                        value === null
                            ? escape(w.noData)
                            : `${escape(number.format(value))}${unit ? ` ${escape(unit)}` : ''}`;
                    const when = day ? escape(date.format(new Date(`${day}T00:00:00Z`))) : '';
                    return `<tr><th scope="row">${link(variablePath(id), metricName(id))}</th><td>${shown}</td><td>${when}</td></tr>`;
                })
                .join('');
            main =
                `<h1>${escape(municipality.name)}</h1>` +
                `<p>${escape(w.district.replace('{district}', municipality.district))} · ${escape(
                    m['municipality.code'].replace('{code}', municipality.dico)
                )}</p>` +
                `<h2>${escape(w.latest)}</h2><table><thead><tr><th scope="col">${escape(
                    w.variable
                )}</th><th scope="col">${escape(w.value)}</th><th scope="col">${escape(
                    w.day
                )}</th></tr></thead><tbody>${table}</tbody></table>` +
                `<p>${link(PATHS.municipalities, w.allMunicipalities)}</p>`;
            break;
        }
        default:
            main = `<h1>${escape(pageMeta(null, language).title)}</h1><p>${escape(w.notFound)}</p>`;
    }

    return `${PRERENDER_STYLE}<div class="prerender"><header><p>${link(PATHS.home, SITE_NAME)} · ${escape(
        m['app.tagline']
    )}</p>${nav}</header><main>${main}</main><footer><p>${escape(w.source)}</p></footer></div>`;
}

/** Enough layout for the moment before the app starts; it goes away with the text. */
const PRERENDER_STYLE =
    '<style>.prerender{max-width:48rem;margin:0 auto;padding:1rem;line-height:1.5}' +
    '.prerender nav ul{display:flex;flex-wrap:wrap;gap:.25rem 1rem;list-style:none;padding:0}' +
    '.prerender table{border-collapse:collapse}.prerender th,.prerender td{text-align:left;padding:.25rem 1rem .25rem 0}</style>';

/** The municipality's newest value of each variable, from the last 60 days with data. */
async function latestValues(db: D1Database, metrics: SiteIndex['metrics'], dico: string) {
    const path = `$."${dico}"`;
    const withData = metrics.filter((metric) => metric.lastDate);
    const results = await db.batch<{ date: string; value: number }>(
        withData.map(({ id, lastDate }) =>
            db
                .prepare(
                    `SELECT date, json_extract(mean, ?1) AS value FROM day
                     WHERE metric = ?2 AND date >= ?3 AND json_extract(mean, ?1) IS NOT NULL
                     ORDER BY date DESC LIMIT 1`
                )
                .bind(path, id, shiftDays(lastDate as string, -60))
        )
    );
    return withData.map(({ id, unit }, i) => {
        const row = results[i]?.results[0];
        return { id, unit, value: row?.value ?? null, day: row?.date ?? null };
    });
}

function robots(url: URL): Response {
    const body = [
        'User-agent: *',
        'Allow: /',
        // The JSON API is for programs; its documentation is at /dados.
        'Disallow: /v1/',
        'Disallow: /api/',
        '',
        `Sitemap: ${url.origin}/sitemap.xml`,
        '',
    ].join('\n');
    return new Response(body, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
        },
    });
}

function sitemap(url: URL, index: SiteIndex | null): Response {
    const newest = index?.metrics
        .map((metric) => metric.lastDate)
        .filter((date): date is string => date !== null)
        .sort()
        .at(-1);
    // Fire risk is a forecast, dated tomorrow; a sitemap date can't be in the future.
    const today = new Date().toISOString().slice(0, 10);
    const lastmod = (date?: string | null) => (date && date > today ? today : (date ?? undefined));
    const entries: { path: string; lastmod?: string }[] = [
        ...MAIN_PAGES.map((route) => ({
            path: PATHS[route],
            lastmod: route === 'variables' ? undefined : lastmod(newest),
        })),
        ...(index?.metrics ?? []).map((metric) => ({
            path: variablePath(metric.id),
            lastmod: lastmod(metric.lastDate),
        })),
        ...(index?.municipalities ?? []).map((item) => ({
            path: municipalityPath(item.slug),
            lastmod: lastmod(newest),
        })),
    ];
    const urls = entries.map(({ path, lastmod }) => {
        const pt = escape(pageUrl(url.origin, path, 'pt'));
        const en = escape(pageUrl(url.origin, path, 'en'));
        const alternates =
            `<xhtml:link rel="alternate" hreflang="pt-PT" href="${pt}"/>` +
            `<xhtml:link rel="alternate" hreflang="en" href="${en}"/>` +
            `<xhtml:link rel="alternate" hreflang="x-default" href="${pt}"/>`;
        const modified = lastmod ? `<lastmod>${lastmod}</lastmod>` : '';
        return [pt, en]
            .map((loc) => `<url><loc>${loc}</loc>${modified}${alternates}</url>`)
            .join('\n');
    });
    const body =
        '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
        `${urls.join('\n')}\n</urlset>\n`;
    return new Response(body, {
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
        },
    });
}

function escape(text: string): string {
    return text
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
}
