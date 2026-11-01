import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { parseIsoDate } from '../format';
import { useI18n } from '../i18n';
import { Icon } from './Icon';
import { usePopover } from './usePopover';

interface Props {
    /** Every day with data, ascending. Only these can be picked. */
    dates: string[];
    value: string;
    onChange: (date: string) => void;
    /** The button's content; the calendar opens from it. */
    children: ReactNode;
}

const DAY = 86400000;
const iso = (time: number) => new Date(time).toISOString().slice(0, 10);
const addDays = (date: string, days: number) => iso(parseIsoDate(date).getTime() + days * DAY);
const monthOf = (date: string) => date.slice(0, 7);
const addMonths = (month: string, delta: number) => {
    const d = parseIsoDate(`${month}-01`);
    d.setUTCMonth(d.getUTCMonth() + delta);
    return iso(d.getTime()).slice(0, 7);
};

/**
 * A month calendar in a pop-over. Days without data are greyed out and can't be picked, so the
 * map never lands on an empty day. Arrows move a day or a week, PageUp/PageDown a month, Enter
 * picks and Escape closes.
 */
export function DatePicker({ dates, value, onChange, children }: Props) {
    const { t, locale } = useI18n();
    const { ref, triggerRef, open, setOpen, close } = usePopover<HTMLDivElement>();
    const gridRef = useRef<HTMLDivElement>(null);
    const [focused, setFocused] = useState(value);
    const available = useMemo(() => new Set(dates), [dates]);
    const first = dates[0] ?? value;
    const last = dates.at(-1) ?? value;
    const month = monthOf(focused);

    const labels = useMemo(() => {
        const title = new Intl.DateTimeFormat(locale, {
            month: 'long',
            year: 'numeric',
            timeZone: 'UTC',
        });
        const weekday = new Intl.DateTimeFormat(locale, { weekday: 'narrow', timeZone: 'UTC' });
        const full = new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeZone: 'UTC' });
        // 2024-01-01 was a Monday; weeks start on Monday in both languages.
        const weekdays = Array.from({ length: 7 }, (_, i) =>
            weekday.format(parseIsoDate(addDays('2024-01-01', i)))
        );
        return {
            title: (m: string) => {
                const text = title.format(parseIsoDate(`${m}-01`));
                return text.charAt(0).toUpperCase() + text.slice(1);
            },
            weekdays,
            full: (d: string) => full.format(parseIsoDate(d)),
        };
    }, [locale]);

    // Six rows of seven days starting on the Monday on or before the 1st.
    const days = useMemo(() => {
        const firstDay = parseIsoDate(`${month}-01`);
        const offset = (firstDay.getUTCDay() + 6) % 7;
        const start = iso(firstDay.getTime() - offset * DAY);
        return Array.from({ length: 42 }, (_, i) => addDays(start, i));
    }, [month]);

    useEffect(() => {
        if (open) setFocused(value);
    }, [open, value]);

    // Keep keyboard focus on the focused day as it moves (also across months).
    useEffect(() => {
        if (!open) return;
        gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${focused}"]`)?.focus();
    }, [open, focused]);

    const clamp = (date: string) => (date < first ? first : date > last ? last : date);
    const pick = (date: string) => {
        if (!available.has(date)) return;
        onChange(date);
        close(true);
    };
    const moveMonth = (delta: number) => {
        const target = addMonths(month, delta);
        // Land on the first day with data in that month, or the nearest end of the range.
        const inMonth = dates.find((d) => monthOf(d) === target);
        setFocused(clamp(inMonth ?? `${target}-01`));
    };

    const onGridKeyDown = (event: React.KeyboardEvent) => {
        const moves: Record<string, () => string> = {
            ArrowLeft: () => addDays(focused, -1),
            ArrowRight: () => addDays(focused, 1),
            ArrowUp: () => addDays(focused, -7),
            ArrowDown: () => addDays(focused, 7),
            Home: () => first,
            End: () => last,
        };
        if (moves[event.key]) setFocused(clamp(moves[event.key]()));
        else if (event.key === 'PageUp') moveMonth(-1);
        else if (event.key === 'PageDown') moveMonth(1);
        else if (event.key === 'Enter' || event.key === ' ') pick(focused);
        else return;
        event.preventDefault();
        event.stopPropagation();
    };

    return (
        <div className="date-picker" ref={ref}>
            <button
                ref={triggerRef}
                type="button"
                className="date-trigger"
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-label={`${t('controls.pickDay')}: ${labels.full(value)}`}
                onClick={() => setOpen((o) => !o)}
            >
                {children}
            </button>
            {open && (
                <div className="popover calendar" role="dialog" aria-label={t('controls.pickDay')}>
                    <div className="calendar-head">
                        <button
                            type="button"
                            className="icon-button ghost"
                            aria-label={t('calendar.previousMonth')}
                            disabled={month <= monthOf(first)}
                            onClick={() => moveMonth(-1)}
                        >
                            <Icon name="chevronLeft" />
                        </button>
                        <strong aria-live="polite">{labels.title(month)}</strong>
                        <button
                            type="button"
                            className="icon-button ghost"
                            aria-label={t('calendar.nextMonth')}
                            disabled={month >= monthOf(last)}
                            onClick={() => moveMonth(1)}
                        >
                            <Icon name="chevronRight" />
                        </button>
                    </div>
                    <div
                        className="calendar-grid"
                        role="grid"
                        ref={gridRef}
                        onKeyDown={onGridKeyDown}
                    >
                        <div role="row" className="calendar-row">
                            {labels.weekdays.map((d, i) => (
                                <span key={i} role="columnheader" className="calendar-weekday">
                                    {d}
                                </span>
                            ))}
                        </div>
                        {Array.from({ length: 6 }, (_, row) => (
                            <div key={row} role="row" className="calendar-row">
                                {days.slice(row * 7, row * 7 + 7).map((d) => {
                                    const outside = monthOf(d) !== month;
                                    return (
                                        <span key={d} role="gridcell">
                                            <button
                                                type="button"
                                                className="calendar-day"
                                                data-date={d}
                                                data-outside={outside || undefined}
                                                aria-label={labels.full(d)}
                                                aria-selected={d === value}
                                                aria-disabled={!available.has(d) || undefined}
                                                tabIndex={d === focused ? 0 : -1}
                                                onClick={() => pick(d)}
                                            >
                                                {Number(d.slice(8))}
                                            </button>
                                        </span>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                    <div className="calendar-foot">
                        <span className="muted small">{t('calendar.onlyDataDays')}</span>
                        <button
                            type="button"
                            className="chip"
                            disabled={value === last}
                            onClick={() => pick(last)}
                        >
                            {t('calendar.latest')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
