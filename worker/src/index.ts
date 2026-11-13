/**
 * IPMA+ public API, served from D1 under `/v1`. For links to the retired static API, `/api` is
 * an alias and every route also accepts a trailing `.json` (`/api/et0/latest.json`).
 *
 *   GET /v1                                   this list of endpoints
 *   GET /v1/index                             metrics (dates, colour domain), municipalities, sources
 *   GET /v1/{metric}/latest                   { date, values: { dico: mean } } for the newest day
 *   GET /v1/{metric}/days/{date}              { date, values: { dico: mean } }
 *   GET /v1/{metric}/series/{dico}?from&to    { dico, rows: [[date, mean, min, max]] }
 *   GET /v1/{metric}/values?from&to           { dates, values: { dico: [mean | null per date] } }
 *                                             (the last 366 days by default; at most 3660 days)
 *   GET /v1/{metric}/stats?from&to            { from, to, days, values: { dico: { n, sum, mean, min, max } } }
 */

export interface Env {
    DB: D1Database;
    /** Per-IP limit (see wrangler.jsonc); absent in tests or if the binding is removed. */
    RATE_LIMITER?: RateLimit;
}

/** Must match `ratelimits[0].simple` in wrangler.jsonc; sent back in the 429 response. */
const RATE_LIMIT = { requests: 600, seconds: 60 };

const METRICS = new Set(['et0', 'tmax', 'tmin', 'tmean', 'prec', 'fire', 'vhi', 'smi']);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DICO = /^\d{4}$/;

/** Data changes at most a few times a day; browsers and the edge may keep it for 10 minutes. */
const CACHE_SECONDS = 600;

class HttpError extends Error {
    constructor(
        readonly status: number,
        message: string
    ) {
        super(message);
    }
}

export default {
    async fetch(request, env, ctx): Promise<Response> {
        if (request.method === 'OPTIONS')
            return new Response(null, { status: 204, headers: corsHeaders() });
        if (request.method !== 'GET' && request.method !== 'HEAD') {
            return json({ error: 'Method not allowed' }, 405);
        }

        // Per IP and per Cloudflare location, approximate: it stops floods, not careful clients.
        // 600 a minute leaves room for the app's timeline playback (up to 5 days a second).
        if (env.RATE_LIMITER) {
            const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
            const { success } = await env.RATE_LIMITER.limit({ key: ip });
            if (!success) {
                const response = json(
                    {
                        error: `Rate limit exceeded: ${RATE_LIMIT.requests} requests per ${RATE_LIMIT.seconds} seconds per IP`,
                    },
                    429
                );
                response.headers.set('Retry-After', String(RATE_LIMIT.seconds));
                return response;
            }
        }

        const cache = caches.default;
        const cached = await cache.match(request);
        if (cached) return cached;

        let response: Response;
        try {
            response = json(await route(new URL(request.url), env.DB));
            response.headers.set('Cache-Control', `public, max-age=${CACHE_SECONDS}`);
            ctx.waitUntil(cache.put(request, response.clone()));
        } catch (error) {
            if (error instanceof HttpError) return json({ error: error.message }, error.status);
            console.error(error);
            return json({ error: 'Internal error' }, 500);
        }
        return response;
    },
} satisfies ExportedHandler<Env>;

async function route(url: URL, db: D1Database): Promise<unknown> {
    const [prefix, ...parts] = url.pathname
        .replace(/\.json$/, '')
        .split('/')
        .filter(Boolean);
    // `/api/…` is an alias, so links to the old static API (`api/et0/latest.json`) keep working.
    if (prefix !== 'v1' && prefix !== 'api') throw new HttpError(404, 'Not found');

    if (parts.length === 0) return endpoints();
    if (parts.length === 1 && parts[0] === 'index') return index(db);

    const [metric, resource, id, ...rest] = parts;
    if (!METRICS.has(metric)) throw new HttpError(404, `Unknown metric "${metric}"`);
    if (rest.length > 0) throw new HttpError(404, 'Not found');

    const range = readRange(url);
    switch (resource) {
        case 'latest':
            if (id === undefined) return latest(db, metric);
            break;
        case 'days':
            if (id !== undefined) return day(db, metric, id);
            break;
        case 'series':
            if (id !== undefined) return series(db, metric, id, range);
            break;
        case 'values':
            if (id === undefined) return values(db, metric, await valuesRange(db, metric, url));
            break;
        case 'stats':
            if (id === undefined) return stats(db, metric, range);
            break;
    }
    throw new HttpError(404, 'Not found');
}

function endpoints() {
    return {
        name: 'IPMA+ API',
        source: 'https://github.com/xavier-batista-fernandes/ipma-mais',
        metrics: [...METRICS],
        endpoints: [
            '/v1/index',
            '/v1/{metric}/latest',
            '/v1/{metric}/days/{YYYY-MM-DD}',
            '/v1/{metric}/series/{dico}?from=YYYY-MM-DD&to=YYYY-MM-DD',
            '/v1/{metric}/values?from=YYYY-MM-DD&to=YYYY-MM-DD',
            '/v1/{metric}/stats?from=YYYY-MM-DD&to=YYYY-MM-DD',
        ],
    };
}

async function index(db: D1Database) {
    const row = await db
        .prepare("SELECT body FROM document WHERE key = 'index'")
        .first<{ body: string }>();
    if (!row) throw new HttpError(503, 'No data yet');
    return raw(row.body);
}

async function latest(db: D1Database, metric: string) {
    const row = await db
        .prepare('SELECT date, mean FROM day WHERE metric = ? ORDER BY date DESC LIMIT 1')
        .bind(metric)
        .first<{ date: string; mean: string }>();
    if (!row) throw new HttpError(404, `No data for ${metric}`);
    return raw(`{"date":${JSON.stringify(row.date)},"values":${row.mean}}`);
}

async function day(db: D1Database, metric: string, date: string) {
    if (!ISO_DATE.test(date)) throw new HttpError(400, 'Dates are YYYY-MM-DD');
    const row = await db
        .prepare('SELECT mean FROM day WHERE metric = ? AND date = ?')
        .bind(metric, date)
        .first<{ mean: string }>();
    if (!row) throw new HttpError(404, `No ${metric} data for ${date}`);
    return raw(`{"date":${JSON.stringify(date)},"values":${row.mean}}`);
}

async function series(db: D1Database, metric: string, dico: string, { from, to }: Range) {
    if (!DICO.test(dico)) throw new HttpError(400, 'A municipality is its 4-digit DICO code');
    const path = `$."${dico}"`;
    const { results } = await db
        .prepare(
            `SELECT date, json_extract(mean, ?1) AS mean, json_extract(detail, ?1) AS detail
             FROM day WHERE metric = ?2 AND date BETWEEN ?3 AND ?4 AND json_extract(mean, ?1) IS NOT NULL
             ORDER BY date`
        )
        .bind(path, metric, from, to)
        .all<{ date: string; mean: number; detail: string | null }>();
    if (results.length === 0) throw new HttpError(404, `No ${metric} data for ${dico}`);

    return {
        dico,
        rows: results.map(({ date, mean, detail }) => {
            const [min = null, max = null] = detail
                ? (JSON.parse(detail) as (number | null)[])
                : [];
            return [date, mean, min, max];
        }),
    };
}

/** Days a `values` request may span: about ten years, a few MB of JSON. */
const MAX_VALUES_DAYS = 3660;
const DAY_MS = 86400000;
const shiftDays = (iso: string, days: number) =>
    new Date(Date.parse(`${iso}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

/**
 * `values` holds every municipality for every day, so it is bounded: without `from` it starts a
 * year before `to` (or before the newest day), and a longer span than MAX_VALUES_DAYS is refused.
 */
async function valuesRange(db: D1Database, metric: string, url: URL): Promise<Range> {
    let { from, to } = readRange(url);
    if (!url.searchParams.has('to')) {
        const newest = await db
            .prepare('SELECT MAX(date) AS date FROM day WHERE metric = ?')
            .bind(metric)
            .first<{ date: string | null }>();
        to = newest?.date ?? to;
    }
    if (!url.searchParams.has('from')) from = shiftDays(to, -365);
    if (from > to) throw new HttpError(400, '"from" is after "to"');
    const span = (Date.parse(to) - Date.parse(from)) / DAY_MS + 1;
    if (span > MAX_VALUES_DAYS) {
        throw new HttpError(400, `At most ${MAX_VALUES_DAYS} days per request; split the range`);
    }
    return { from, to };
}

async function values(db: D1Database, metric: string, { from, to }: Range) {
    const { results } = await db
        .prepare(
            'SELECT date, mean FROM day WHERE metric = ? AND date BETWEEN ? AND ? ORDER BY date'
        )
        .bind(metric, from, to)
        .all<{ date: string; mean: string }>();

    const dates = results.map((row) => row.date);
    const matrix: Record<string, (number | null)[]> = {};
    results.forEach((row, i) => {
        for (const [dico, value] of Object.entries(
            JSON.parse(row.mean) as Record<string, number>
        )) {
            (matrix[dico] ??= new Array(dates.length).fill(null))[i] = value;
        }
    });
    return { dates, values: matrix };
}

async function stats(db: D1Database, metric: string, { from, to }: Range) {
    const days = await db
        .prepare(
            'SELECT COUNT(*) AS n, MIN(date) AS first, MAX(date) AS last FROM day WHERE metric = ? AND date BETWEEN ? AND ?'
        )
        .bind(metric, from, to)
        .first<{ n: number; first: string | null; last: string | null }>();
    const { results } = await db
        .prepare(
            `SELECT j.key AS dico, COUNT(*) AS n, SUM(j.value) AS sum, AVG(j.value) AS mean,
                    MIN(j.value) AS min, MAX(j.value) AS max
             FROM day, json_each(day.mean) AS j
             WHERE day.metric = ? AND day.date BETWEEN ? AND ?
             GROUP BY j.key`
        )
        .bind(metric, from, to)
        .all<{ dico: string; n: number; sum: number; mean: number; min: number; max: number }>();

    const round = (value: number) => Math.round(value * 100) / 100;
    return {
        metric,
        from: days?.first ?? null,
        to: days?.last ?? null,
        days: days?.n ?? 0,
        values: Object.fromEntries(
            results.map(({ dico, n, sum, mean, min, max }) => [
                dico,
                { n, sum: round(sum), mean: round(mean), min, max },
            ])
        ),
    };
}

interface Range {
    from: string;
    to: string;
}

function readRange(url: URL): Range {
    const from = url.searchParams.get('from') ?? '0000-01-01';
    const to = url.searchParams.get('to') ?? '9999-12-31';
    if (!ISO_DATE.test(from) || !ISO_DATE.test(to))
        throw new HttpError(400, 'Dates are YYYY-MM-DD');
    if (from > to) throw new HttpError(400, '"from" is after "to"');
    return { from, to };
}

/** A JSON body that is already serialised, passed through without parsing it. */
class RawJson {
    constructor(readonly body: string) {}
}
const raw = (body: string) => new RawJson(body);

function json(value: unknown, status = 200): Response {
    const body = value instanceof RawJson ? value.body : JSON.stringify(value);
    return new Response(body, {
        status,
        headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders() },
    });
}

function corsHeaders(): Record<string, string> {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    };
}
