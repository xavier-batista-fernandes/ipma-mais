const PT_MONTHS = {
    jan: 1,
    fev: 2,
    mar: 3,
    abr: 4,
    mai: 5,
    jun: 6,
    jul: 7,
    ago: 8,
    set: 9,
    out: 10,
    nov: 11,
    dez: 12,
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parses the Portuguese date IPMA puts in its page payloads, e.g. "Sáb, 14 Mar 2026",
 * into an ISO date ("2026-03-14"). Throws on anything it does not recognise.
 */
export function parsePtDate(text) {
    const match = /(\d{1,2})\s+([A-Za-zçÇ]{3})[a-zç]*\.?\s+(\d{4})/.exec(text ?? '');
    const month = match && PT_MONTHS[match[2].toLowerCase()];
    if (!match || !month) throw new Error(`Unrecognised IPMA date: "${text}"`);

    const iso = `${match[3]}-${String(month).padStart(2, '0')}-${match[1].padStart(2, '0')}`;
    if (!isIsoDate(iso)) throw new Error(`Invalid IPMA date: "${text}"`);
    return iso;
}

/** True for a real calendar date written as YYYY-MM-DD. */
export function isIsoDate(text) {
    if (!ISO_DATE.test(text)) return false;
    const date = new Date(`${text}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(text);
}

/** Whole days from `from` to `to`, both ISO dates. */
export function daysBetween(from, to) {
    return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
}

export function todayIso() {
    return new Date().toISOString().slice(0, 10);
}
