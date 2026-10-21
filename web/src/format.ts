const number = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 2 });
const longDate = new Intl.DateTimeFormat('pt-PT', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
});
const shortDate = new Intl.DateTimeFormat('pt-PT', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
});

export const formatValue = (value: number, unit: string) => `${number.format(value)} ${unit}`;
export const formatNumber = (value: number) => number.format(value);
export const formatDate = (iso: string) => longDate.format(new Date(`${iso}T00:00:00Z`));
export const formatDateTitle = (iso: string) => {
    const text = formatDate(iso);
    return text.charAt(0).toUpperCase() + text.slice(1);
};
export const formatShortDate = (date: Date) => shortDate.format(date);
export const parseIsoDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
