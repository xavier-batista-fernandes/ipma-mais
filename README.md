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
                       ├─ build web/
                       └─ deploy the Worker: app + /v1 API, one origin
```

1. **Collect** (`scripts/collect.js`) runs twice a day. It scrapes the IPMA agrometeorology page for daily ET0, and reads daily `tmax`, `tmean` and `tmin` from IPMA's [consolidated temperature file](https://api.ipma.pt/open-data/observation/climate/temperature/t2m-p1d-continental-obssup-idw-concelhos-20d.csv) and daily rain (`prec`) from its [precipitation file](https://api.ipma.pt/open-data/observation/climate/precipitation/prec-p1d-continental-obssup-idw-concelhos-20d.csv), both covering the last 20 days. It also stores IPMA's fire-risk forecast (`fire`) for today and tomorrow, the weekly vegetation health index (`vhi`) and the soil moisture index (`smi`); the last two only exist on IPMA's map server, which is read with one point query per municipality at `inputs/municipality-points.json` (a point inside each municipality, made from Cartis' boundaries by `scripts/municipality-points.js`). Each value is stored by its observation date and the municipality's DICO code, and a repeated run never duplicates rows. The older ET0, `tmax`, `tmin` and `prec` rows came from IPMA's per-municipality open-data CSVs, which stopped updating in 2025 Daily `prec`, `tmax` and `tmin` from 2000-01-01 to 2025-11-11 were imported once from IPMA's map server, which still serves those per-municipality layers (`sources/ipma-history.js`, run with `scripts/backfill.js` from the Backfill workflow); those rows only have the mean. IPMA does not publish the temperatures and rain from 2025-11-12 to October 2026 anywhere we can collect, so that stretch is missing.
2. **Deploy to Cloudflare** runs after every collection and app change:
   - It copies the days that changed from `data/` into a D1 database (`scripts/sync-d1.js`).
   - It builds the app and deploys the Worker in `worker/`, which serves both the app and the API.
3. **`data/` stays in git as the backup.** Everything in D1 can be rebuilt from it with `scripts/sync-d1.js`.

## Repository

| Path | Contents |
| --- | --- |
| `data/{et0,tmax,tmin,tmean,prec,fire,vhi,smi}/{dico}.csv` | Daily series per municipality: `date,mean,min,max,std,source` (`source` is `api` or `page`; the API wins when both exist) |
| `data/raw/et0-page/{date}.json` | A full copy of each day the ET0 page published |
| `data/meta.json` | When each source last succeeded, and its newest date |
| `inputs/municipalities.json` | The 278 mainland municipalities and their DICO codes |
| `scripts/`, `sources/`, `lib/` | Collector and D1 sync |
| `worker/` | Cloudflare Worker: the /v1 API (`src/index.ts`), each page's HTML for search engines plus `sitemap.xml` and `robots.txt` (`src/pages.ts`), and the D1 schema (`migrations/`) |
| `web/` | React + Vite app, with the map drawn by [Cartis](https://github.com/xavier-batista-fernandes/cartis) |
| `docs/API.md` | The public API guide |

## Development

Needs Node 22 or newer.

```bash
npm ci
npm test                       # collector and sync tests
npm run collect                # collect now
```

The app always reads the Worker's API, so start the Worker with a local D1 first:

```bash
cd worker && npm ci
npm run db:migrate:local       # create the local D1 tables
npm run db:sync:local          # load data/ into local D1 (re-run after collecting)
npm run dev                    # API on http://localhost:8787 (and the last web build)
```

Then, in another terminal:

```bash
cd web && npm ci
npm run dev                    # Vite with hot reload, proxying /v1 to the Worker
npm run test:e2e               # Playwright: builds the app and serves it with wrangler dev
                               # (npx playwright install chromium once)
```

## Deployment

| Workflow | Runs | Does |
| --- | --- | --- |
| [Collect](https://github.com/xavier-batista-fernandes/ipma-mais/actions/workflows/collect.yaml) | 08:00 and 20:00 UTC | Scrapes the ET0 page and commits `data/` |
| [Deploy to Cloudflare](https://github.com/xavier-batista-fernandes/ipma-mais/actions/workflows/cloudflare.yaml) | After Collect, and on app or Worker changes | Migrates and syncs D1, builds and deploys the Worker |
| [CI](https://github.com/xavier-batista-fernandes/ipma-mais/actions/workflows/ci.yaml), [E2E](https://github.com/xavier-batista-fernandes/ipma-mais/actions/workflows/e2e.yaml) | Pull requests and `main` | Tests, builds, typechecks the Worker, runs the Playwright suite |

Deploying to Cloudflare needs two repository secrets:
- `CLOUDFLARE_API_TOKEN`, made from the "Edit Cloudflare Workers" template with **Account → D1 → Edit** added.
- `CLOUDFLARE_ACCOUNT_ID`.

The first run creates the `ipma-mais` D1 database, and later runs find it by name.

## Data source and disclaimer

All data comes from [IPMA, the Instituto Português do Mar e da Atmosfera](https://www.ipma.pt). IPMA+ is an independent project: it is not affiliated with IPMA, it doesn't change the values it collects, and it gives no guarantee about their accuracy or availability. Please credit IPMA when you use the data.

If this project conflicts with IPMA's terms of use, please open an issue and it will be changed or taken down.
