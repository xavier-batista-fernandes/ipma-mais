/** Number and date formatters for one locale; get them from `useI18n().format`. */
export function createFormat(locale: string) {
    const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
    const longDate = new Intl.DateTimeFormat(locale, {
        weekday: 'short',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
    });
    const shortDate = new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
    });
    const monthName = new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' });
    const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

    const date = (iso: string) => longDate.format(parseIsoDate(iso));
    return {
        value: (value: number, unit: string) => `${number.format(value)} ${unit}`,
        number: (value: number) => number.format(value),
        date,
        dateTitle: (iso: string) => {
            const text = date(iso);
            return text.charAt(0).toUpperCase() + text.slice(1);
        },
        shortDate: (value: Date) => shortDate.format(value),
        month: (iso: string) => monthName.format(parseIsoDate(iso)).replace('.', ''),
        /** "Yesterday", "3 days ago"…, capitalised. */
        relative: (amount: number, unit: Intl.RelativeTimeFormatUnit) => {
            const text = relative.format(amount, unit);
            return text.charAt(0).toUpperCase() + text.slice(1);
        },
    };
}

export type Format = ReturnType<typeof createFormat>;

export const parseIsoDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
