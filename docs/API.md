# IPMA+ API

A free, read-only JSON API with daily weather data for the 278 municipalities of mainland Portugal, collected from [IPMA](https://www.ipma.pt) since April 2025. It keeps the history that IPMA itself only serves for a few weeks.

**Base URL:** `https://ipma-mais.xavierbatistafernandes-001.workers.dev/v1`

No sign-up or key is needed. Every response is JSON, allows cross-origin requests (CORS `*`), and may be cached for up to 10 minutes. Each IP address can make up to **600 requests a minute**.

```bash
curl https://ipma-mais.xavierbatistafernandes-001.workers.dev/v1/et0/latest
```

## Data

| Metric | What it is | Unit | Updated |
| --- | --- | --- | --- |
| `et0` | Reference evapotranspiration | mm per day | Twice a day, from IPMA's agrometeorology page |
| `tmax` | Maximum air temperature | °C | Twice a day, from IPMA's open-data temperature file. No data from 2025-11-12 to 2026-10-21 |
| `tmin` | Minimum air temperature | °C | Twice a day, from IPMA's open-data temperature file. No data from 2025-11-12 to 2026-10-21 |

- **Municipalities** are identified by their **DICO** code: 4 digits, where the first two are the district (for example `1106` is Lisboa and `1312` is Porto). `/v1/index` lists all of them with their names and districts.
- **Dates** are `YYYY-MM-DD` and are the observation day IPMA reports, not the day it was collected.
- **Values** are the municipality's mean, rounded to 2 decimals. Where the source gives them, `min` and `max` are the lowest and highest values across the municipality's area. They are `null` for values from the agrometeorology page, which only publishes the mean.
- **Gaps:** some days are missing because IPMA published nothing for them. A missing day is absent from lists and `null` in matrices; it is never `0`.

## Endpoints

| Endpoint | Returns |
| --- | --- |
| [`GET /v1`](#get-v1) | The list of endpoints |
| [`GET /v1/index`](#get-v1index) | Metrics with their available dates, municipalities, and source status |
| [`GET /v1/{metric}/latest`](#get-v1metriclatest-and-get-v1metricdaysdate) | Every municipality's value on the most recent day |
| [`GET /v1/{metric}/days/{date}`](#get-v1metriclatest-and-get-v1metricdaysdate) | Every municipality's value on one day |
| [`GET /v1/{metric}/series/{dico}`](#get-v1metricseriesdico) | One municipality's daily values |
| [`GET /v1/{metric}/values`](#get-v1metricvalues) | Every municipality × every day, as a matrix |
| [`GET /v1/{metric}/stats`](#get-v1metricstats) | Per-municipality totals and averages over a period |

`series`, `values` and `stats` take optional `from` and `to` query parameters (inclusive, `YYYY-MM-DD`). Without them, the whole history is used.

Every path also works with a `.json` suffix (`/v1/et0/latest.json`) and under `/api/` instead of `/v1/`, which were the paths of the earlier static files.

### `GET /v1`

Lists the endpoints and metrics.

### `GET /v1/index`

The catalogue: which days exist for each metric, every municipality, and when each source last succeeded. `domain` is the value range the app's colour scale uses (2nd to 98th percentile of all values).

```json
{
  "generatedAt": "2026-11-10T23:32:37.468Z",
  "metrics": [
    {
      "id": "et0",
      "label": "Evapotranspiração de referência (ET0)",
      "unit": "mm",
      "firstDate": "2025-04-23",
      "lastDate": "2026-11-08",
      "domain": [0, 8],
      "dates": ["2025-04-23", "2025-04-24", "…"]
    }
  ],
  "municipalities": [
    { "dico": "0101", "name": "Águeda", "district": "Aveiro" },
    { "dico": "0102", "name": "Albergaria-a-Velha", "district": "Aveiro" }
  ],
  "sources": {
    "page": { "lastSuccess": "2026-11-10T02:34:13.124Z", "latestDate": "2026-11-08" }
  }
}
```

### `GET /v1/{metric}/latest` and `GET /v1/{metric}/days/{date}`

Every municipality's mean on the newest day, or on the given day. Use these for a map.

```bash
curl https://ipma-mais.xavierbatistafernandes-001.workers.dev/v1/et0/days/2026-11-08
```

```json
{ "date": "2026-11-08", "values": { "1001": 2.75, "1002": 2.31, "1003": 2.25 } }
```

### `GET /v1/{metric}/series/{dico}`

One municipality's daily rows as `[date, mean, min, max]`, oldest first. Use this for a chart.

```bash
curl "https://ipma-mais.xavierbatistafernandes-001.workers.dev/v1/et0/series/1106?from=2026-11-06&to=2026-11-08"
```

```json
{ "dico": "1106", "rows": [["2026-11-06", 1.65, null, null], ["2026-11-07", 1.63, null, null], ["2026-11-08", 1.39, null, null]] }
```

From the open-data source, `min` and `max` are filled in:

```json
{ "dico": "1106", "rows": [["2025-08-01", 32.5, 32.12, 32.65], ["2025-08-02", 31.75, 31.46, 31.89]] }
```

### `GET /v1/{metric}/values`

All municipalities over a period in one response. `values[dico][i]` is the mean on `dates[i]`, or `null` when that municipality has no value that day. Use this to run your own analysis across the country.

```bash
curl "https://ipma-mais.xavierbatistafernandes-001.workers.dev/v1/et0/values?from=2026-11-06&to=2026-11-08"
```

```json
{ "dates": ["2026-11-06", "2026-11-07", "2026-11-08"], "values": { "1001": [1.19, 1.17, 2.75], "1002": [1.37, 1.35, 2.31] } }
```

### `GET /v1/{metric}/stats`

Aggregates for each municipality over a period, computed on the server: `n` days with data, and the `sum`, `mean`, `min` and `max` of the daily means. For `et0`, `sum` is the total evapotranspiration in mm over the period. `from` and `to` in the response are the first and last days that actually have data.

```bash
curl "https://ipma-mais.xavierbatistafernandes-001.workers.dev/v1/et0/stats?from=2026-10-01&to=2026-10-31"
```

```json
{
  "metric": "et0",
  "from": "2026-10-01",
  "to": "2026-10-31",
  "days": 28,
  "values": { "1001": { "n": 28, "sum": 64.26, "mean": 2.3, "min": 1.69, "max": 3.06 } }
}
```

## Errors

Errors use the HTTP status and a JSON body with an `error` message:

| Status | When |
| --- | --- |
| `400` | A malformed date or DICO code, or `from` after `to` |
| `404` | An unknown metric or path, or no data for that day or municipality |
| `405` | Any method other than `GET`, `HEAD` or `OPTIONS` |
| `429` | More than 600 requests in a minute from your IP. Wait for the number of seconds in the `Retry-After` header |
| `503` | The database has not been loaded yet |

```json
{ "error": "No et0 data for 2020-01-01" }
```

## Examples

JavaScript, for October's total ET0 in Lisboa:

```js
const base = 'https://ipma-mais.xavierbatistafernandes-001.workers.dev/v1';
const stats = await fetch(`${base}/et0/stats?from=2026-10-01&to=2026-10-31`).then((r) => r.json());
console.log(stats.values['1106'].sum); // mm
```

Python, for a CSV of one municipality's series:

```python
import csv, json, sys, urllib.request

base = "https://ipma-mais.xavierbatistafernandes-001.workers.dev/v1"
series = json.load(urllib.request.urlopen(f"{base}/et0/series/1106"))
writer = csv.writer(sys.stdout)
writer.writerow(["date", "mean", "min", "max"])
writer.writerows(series["rows"])
```

## Fair use and attribution

- The API is free and unauthenticated, with a limit of 600 requests a minute per IP. The limit is counted separately in each Cloudflare location, so treat it as approximate. Please cache responses on your side, and prefer a single `values` or `stats` request over hundreds of `days` requests. The service runs on a free tier shared with the IPMA+ app.
- The data comes from IPMA (Instituto Português do Mar e da Atmosfera). Credit IPMA as the source when you publish anything built on it.
- There is no uptime guarantee. The full history is also in the repository as CSV ([`data/`](../data/)).
