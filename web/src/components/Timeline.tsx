import { useEffect, useMemo, useRef, useState } from 'react';
import { formatDateTitle, formatMonth, parseIsoDate } from '../format';

/** Milliseconds each day stays on screen while playing. */
const SPEEDS = [
    { label: '½×', ms: 1600 },
    { label: '1×', ms: 800 },
    { label: '2×', ms: 400 },
    { label: '4×', ms: 200 },
];

interface Props {
    /** Every day with data, ascending. */
    dates: string[];
    value: string;
    onChange: (date: string) => void;
    /** Resolves once a day's values are loaded, so playback never waits on a blank map. */
    preload: (date: string) => Promise<unknown>;
}

/**
 * The day picker: a scrubbable track over every day with data, with play/pause to step the map
 * through time. Space toggles playback and ←/→ step a day, unless the focus is in a text field.
 */
export function Timeline({ dates, value, onChange, preload }: Props) {
    const [playing, setPlaying] = useState(false);
    const [speed, setSpeed] = useState(1);
    const index = Math.max(0, dates.indexOf(value));
    const last = dates.length - 1;
    const atEnd = index >= last;

    const latest = useRef({ index, dates, onChange, preload });
    latest.current = { index, dates, onChange, preload };

    // One step per tick; the next day is loaded before it's shown, and the two after it are
    // fetched in the background so a slow connection only slows playback down.
    useEffect(() => {
        if (!playing) return;
        let cancelled = false;
        let timer = 0;
        const tick = () => {
            const { index, dates, onChange, preload } = latest.current;
            const next = dates[index + 1];
            if (!next) return setPlaying(false);
            dates.slice(index + 2, index + 4).forEach((d) => void preload(d).catch(() => {}));
            const started = performance.now();
            preload(next)
                .catch(() => {})
                .then(() => {
                    if (cancelled) return;
                    onChange(next);
                    const wait = SPEEDS[speed].ms - (performance.now() - started);
                    timer = window.setTimeout(tick, Math.max(0, wait));
                });
        };
        timer = window.setTimeout(tick, SPEEDS[speed].ms);
        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [playing, speed]);

    // A different metric brings a different set of days: stop rather than jump around.
    useEffect(() => setPlaying(false), [dates]);

    const togglePlay = () => {
        if (playing) return setPlaying(false);
        // Playing from the last day starts over from the first.
        if (atEnd && dates.length > 1) onChange(dates[0]);
        setPlaying(true);
    };

    const step = (delta: number) => {
        setPlaying(false);
        const target = dates[Math.min(last, Math.max(0, index + delta))];
        if (target) onChange(target);
    };

    const keys = useRef({ togglePlay, step });
    keys.current = { togglePlay, step };
    useEffect(() => {
        // Text fields keep their keys; the slider keeps its own arrows but space still plays.
        const ignored = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement;
            if (event.altKey || event.ctrlKey || event.metaKey) return true;
            if (target.closest('select, textarea, [contenteditable="true"]')) return true;
            const input = target.closest('input');
            return !!input && (input.type !== 'range' || event.key !== ' ');
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (ignored(event)) return;
            if (event.key === ' ') keys.current.togglePlay();
            else if (event.key === 'ArrowLeft') keys.current.step(-1);
            else if (event.key === 'ArrowRight') keys.current.step(1);
            else return;
            event.preventDefault();
        };
        // A focused button "clicks" when space comes back up: cancel that so space only toggles.
        const onKeyUp = (event: KeyboardEvent) => {
            if (event.key === ' ' && !ignored(event)) event.preventDefault();
        };
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
        };
    }, []);

    const marks = useMemo(() => monthMarks(dates), [dates]);
    const percent = (i: number) => (last > 0 ? (i / last) * 100 : 0);
    const relative = relativeDay(value);

    return (
        <section className="timeline" aria-label="Linha do tempo">
            <div className="timeline-head">
                <div className="timeline-date" aria-live={playing ? 'off' : 'polite'}>
                    <strong key={value}>{formatDateTitle(value)}</strong>
                    <span className="muted">
                        {relative} · dia {index + 1} de {dates.length}
                    </span>
                </div>
                <div className="timeline-buttons">
                    <button
                        type="button"
                        aria-label="Primeiro dia"
                        disabled={index <= 0}
                        onClick={() => step(-Infinity)}
                    >
                        ⏮
                    </button>
                    <button
                        type="button"
                        aria-label="Dia anterior"
                        disabled={index <= 0}
                        onClick={() => step(-1)}
                    >
                        ‹
                    </button>
                    <button
                        type="button"
                        className="play"
                        aria-label={playing ? 'Pausar' : 'Reproduzir a evolução'}
                        aria-pressed={playing}
                        disabled={dates.length < 2}
                        onClick={togglePlay}
                    >
                        {playing ? '❚❚' : '▶'}
                    </button>
                    <button
                        type="button"
                        aria-label="Dia seguinte"
                        disabled={atEnd}
                        onClick={() => step(1)}
                    >
                        ›
                    </button>
                    <button
                        type="button"
                        aria-label="Último dia"
                        disabled={atEnd}
                        onClick={() => step(Infinity)}
                    >
                        ⏭
                    </button>
                </div>
                <div className="timeline-options">
                    <div className="segmented" role="group" aria-label="Velocidade">
                        {SPEEDS.map((s, i) => (
                            <button
                                key={s.label}
                                type="button"
                                aria-pressed={speed === i}
                                onClick={() => setSpeed(i)}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                    <input
                        type="date"
                        aria-label="Escolher dia"
                        min={dates[0]}
                        max={dates[last]}
                        value={value}
                        onChange={(e) => {
                            setPlaying(false);
                            const nearest = nearestDate(dates, e.target.value);
                            if (nearest) onChange(nearest);
                        }}
                    />
                </div>
            </div>

            <div
                className="timeline-track"
                style={{ '--progress': `${percent(index)}%` } as React.CSSProperties}
            >
                <input
                    type="range"
                    aria-label="Dia"
                    aria-valuetext={formatDateTitle(value)}
                    min={0}
                    max={last}
                    step={1}
                    value={index}
                    onChange={(e) => {
                        setPlaying(false);
                        onChange(dates[Number(e.target.value)]);
                    }}
                />
                <div className="timeline-marks" aria-hidden="true">
                    {marks.map((m) => (
                        <span
                            key={m.index}
                            className={m.year ? 'year' : undefined}
                            style={{ left: `${percent(m.index)}%` }}
                        >
                            {m.label}
                        </span>
                    ))}
                </div>
            </div>
        </section>
    );
}

/** The first available day of each month, labelled; January carries the year. */
function monthMarks(dates: string[]) {
    const marks: { index: number; label: string; year: boolean }[] = [];
    dates.forEach((date, i) => {
        if (i > 0 && date.slice(0, 7) === dates[i - 1].slice(0, 7)) return;
        const year = i === 0 || date.slice(0, 4) !== dates[i - 1].slice(0, 4);
        marks.push({ index: i, label: year ? date.slice(0, 4) : formatMonth(date), year });
    });
    // Too many months for the track's width: keep every other or every third label.
    const every = Math.ceil(marks.length / 14);
    return marks.filter((m, i) => m.year || i % every === 0);
}

function relativeDay(iso: string) {
    const today = new Date();
    const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    const days = Math.round((todayUtc - parseIsoDate(iso).getTime()) / 86400000);
    if (days === 0) return 'Hoje';
    if (days === 1) return 'Ontem';
    if (days < 0) return `Daqui a ${-days} dias`;
    if (days < 60) return `Há ${days} dias`;
    if (days < 730) return `Há ${Math.round(days / 30.44)} meses`;
    return `Há ${Math.round(days / 365.25)} anos`;
}

/** The available date closest to `target` (the picker allows days with no data). */
function nearestDate(dates: string[], target: string) {
    if (!target || dates.length === 0) return dates.at(-1) ?? null;
    const t = Date.parse(target);
    return dates.reduce((best, d) =>
        Math.abs(Date.parse(d) - t) < Math.abs(Date.parse(best) - t) ? d : best
    );
}
