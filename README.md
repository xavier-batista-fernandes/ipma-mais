# IPMA+

IPMA, Portugal's weather institute, only serves some data for a few weeks. Evapotranspiration (ET0), for example, disappears after about two months. IPMA+ collects it on a schedule, keeps the full history, and publishes it as a map app and a public API.

- **App:** [ipma-mais.xavierbatistafernandes-001.workers.dev](https://ipma-mais.xavierbatistafernandes-001.workers.dev). It maps any day by municipality, charts one municipality's history and runs queries over a period.
- **API:** [`/v1`](https://ipma-mais.xavierbatistafernandes-001.workers.dev/v1). It is free and needs no key. **[Read the API guide →](docs/API.md)**
- **Raw data:** [`data/`](data/), daily CSVs per municipality.

## How it works

```
IPMA ──► Collect (GitHub Actions, twice a day) ──► data/*.csv in git
                                                        │
                       Deploy to Cloudflare ◄───────────┘
                       ├─ sync changed days into D1
                       ├─ build web/ against /v1
                       └─ deploy the Worker: app + /v1 API, one origin
```

1. **Collect** (`scripts/collect.js`) scrapes the IPMA agrometeorology page twice a day for daily ET0, and the open-data API weekly for ET0 and temperature. Each value is stored by its observation date and the municipality's DICO code, and a repeated run never duplicates rows. The open-data API has published nothing new since November 2025, so `tmax` and `tmin` are an archive.
2. **Deploy to Cloudflare** runs after every collection and app change:
   - It copies the days that changed from `data/` into a D1 database (`scripts/sync-d1.js`).
   - It builds the app and deploys the Worker in `worker/`, which serves both the app and the API.
3. **`data/` stays in git as the backup.** Everything in D1 can be rebuilt from it with `scripts/sync-d1.js`. The old GitHub Pages address (`xavier-batista-fernandes.github.io/ipma-mais`) now only redirects to the Cloudflare app, and keeps the path, query and `#` of old links.

## Repository

| Path | Contents |
| --- | --- |
| `data/{et0,tmax,tmin}/{dico}.csv` | Daily series per municipality: `date,mean,min,max,std,source` (`source` is `api` or `page`; the API wins when both exist) |
| `data/raw/et0-page/{date}.json` | A full copy of each day the ET0 page published |
| `data/meta.json` | When each source last succeeded, and its newest date |
| `inputs/municipalities.json` | The 278 mainland municipalities and their DICO codes |
| `scripts/`, `sources/`, `lib/` | Collector, static API builder, D1 sync |
| `worker/` | Cloudflare Worker (`src/index.ts`) and D1 schema (`migrations/`) |
| `web/` | React + Vite app, with the map drawn by [Cartis](https://github.com/xavier-batista-fernandes/cartis) |
| `docs/API.md` | The public API guide |
| `pages-redirect/` | What the old GitHub Pages address serves: a redirect to the Cloudflare app |

## Development

Needs Node 22 or newer.

```bash
npm ci
npm test                       # collector and sync tests
npm run collect                # collect now (or collect:page / collect:api)
```

Run the app against static JSON:

```bash
cd web && npm ci
npm run dev                    # builds public/api from ../data, then starts Vite
npm run test:e2e               # Playwright against the production build (npx playwright install chromium once)
```

Run the Worker, D1 and the app the way production does:

```bash
cd worker && npm ci
npm run db:migrate:local       # create the local D1 tables
npm run db:sync:local          # load data/ into local D1
VITE_API_BASE=/v1 npm run build --prefix ../web
npm run dev                    # app + API on http://localhost:8787
```

## Deployment

| Workflow | Runs | Does |
| --- | --- | --- |
| [Collect](https://github.com/xavier-batista-fernandes/ipma-mais/actions/workflows/collect.yaml) | 08:00 and 20:00 UTC, plus Mondays 04:00 for the open-data API | Scrapes IPMA and commits `data/` |
| [Deploy to Cloudflare](https://github.com/xavier-batista-fernandes/ipma-mais/actions/workflows/cloudflare.yaml) | After Collect, and on app or Worker changes | Migrates and syncs D1, builds and deploys the Worker |
| [Redirect GitHub Pages](https://github.com/xavier-batista-fernandes/ipma-mais/actions/workflows/deploy.yaml) | When `pages-redirect/` changes | Publishes the redirect from the old Pages address |
| [CI](https://github.com/xavier-batista-fernandes/ipma-mais/actions/workflows/ci.yaml), [E2E](https://github.com/xavier-batista-fernandes/ipma-mais/actions/workflows/e2e.yaml) | Pull requests and `main` | Tests, builds, typechecks the Worker, runs the Playwright suite |

Deploying to Cloudflare needs two repository secrets:
- `CLOUDFLARE_API_TOKEN`, made from the "Edit Cloudflare Workers" template with **Account → D1 → Edit** added.
- `CLOUDFLARE_ACCOUNT_ID`.

The first run creates the `ipma-mais` D1 database, and later runs find it by name.

## Data source and disclaimer

All data comes from [IPMA, the Instituto Português do Mar e da Atmosfera](https://www.ipma.pt). IPMA+ is an independent project: it is not affiliated with IPMA, it doesn't change the values it collects, and it gives no guarantee about their accuracy or availability. Please credit IPMA when you use the data.

If this project conflicts with IPMA's terms of use, please open an issue and it will be changed or taken down.
