-- One row per metric and observation day. `mean` holds { dico: mean } (rounded to 2 decimals,
-- exactly what the map draws) and `detail` holds { dico: [min, max, std, source] }.
-- A day row instead of a row per municipality keeps writes tiny (a collection touches about
-- 7 rows, not 2,000) and every read cheap: a whole series is one row per day.
CREATE TABLE day (
    metric TEXT NOT NULL,
    date TEXT NOT NULL,
    mean TEXT NOT NULL,
    detail TEXT NOT NULL,
    hash TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (metric, date)
) WITHOUT ROWID;

-- Small JSON documents generated from data/, served as they are (today only `index`).
CREATE TABLE document (
    key TEXT PRIMARY KEY,
    body TEXT NOT NULL,
    hash TEXT NOT NULL,
    updated_at TEXT NOT NULL
) WITHOUT ROWID;
