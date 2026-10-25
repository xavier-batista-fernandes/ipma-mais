# IPMA+

This project works around a limitation of the [Portuguese Institute for Sea and Atmosphere (IPMA)](https://www.ipma.pt/en/index.html) API, which does not keep some weather data available for long.

For example, evapotranspiration data is only available up to about two months before the current date.

This repository therefore provides scripts that collect and store that data on a schedule, preserving it over time for historical lookup and analysis.

## Features
- Automatic collection (GitHub Actions) of IPMA data:
  - **Daily ET0** from the IPMA agrometeorology page, twice a day;
  - **ET0, maximum and minimum temperature** from the open-data API, weekly.
- Each value is stored by its actual observation date (the one in the IPMA data) and by the municipality's DICO code. Repeating a collection never duplicates rows.
- Collection fails visibly (a red run) when a source doesn't respond or returns invalid data, and warns when a source stops having recent data.
- Generates static JSON files designed for a web app (one file per day for the map, one per municipality for the charts).

## Layout

| Path | Contents |
| --- | --- |
| `data/{et0,tmax,tmin}/{dico}.csv` | Daily series for each municipality: `date,mean,min,max,std,source` (`source` is `api` or `page`; the API takes priority). |
| `data/raw/et0-page/{date}.json` | Full copy of each day published on the ET0 page. |
| `data/meta.json` | Last successful collection and the most recent date from each source. |
| `inputs/municipalities.json` | The 278 mainland municipalities with their DICO code. Canonical names come from the [Cartis](https://github.com/xavier-batista-fernandes/cartis) library. |
| `outputs/` | Old format, kept temporarily. No longer updated. |

## Commands

```bash
npm ci
npm run collect               # all sources (or collect:page / collect:api)
npm run build:api             # generates dist/api/ from data/
npm test
```

`npm run build:api` writes:

- `index.json`: metrics, available dates and municipalities (DICO, name, district);
- `{metric}/days/{date}.json`: `{ date, values: { dico: value } }`;
- `{metric}/series/{dico}.json`: `{ dico, rows: [[date, mean, min, max]] }`;
- `{metric}/latest.json`: the most recent day.

## Web app

`web/` is a React + Vite app that shows the data on a map of mainland Portugal drawn with [Cartis](https://github.com/xavier-batista-fernandes/cartis): pick the variable and the day, hover over a municipality to see its value, and click it to see its daily history. The current view is kept in the URL (`?m=et0&d=2026-10-20&c=1106`), so it can be shared.

```bash
cd web
npm ci
npm run dev        # generates public/api from ../data and starts the dev server
npm run build      # type-checks and builds web/dist
```

The `Deploy site` workflow publishes the app and the data to GitHub Pages whenever the app changes and after each collection. It requires GitHub Pages to be enabled on the repository with **GitHub Actions** as the source (Settings → Pages).

## Disclaimer and Liability
This project's sole purpose is to collect and store data made available by the Portuguese Institute for Sea and Atmosphere (IPMA) API, without altering or redistributing it.

If, for any reason, this project violates IPMA's terms and conditions of use, please contact us directly so that we can take the necessary steps, including discontinuing the project immediately.
