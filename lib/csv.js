/**
 * Minimal CSV helpers for the simple, unquoted files IPMA serves and IPMA+ stores
 * (dates, numbers and short identifiers only).
 */

export function parseCsv(text) {
    const lines = text
        .replace(/^﻿/, '')
        .split(/\r?\n/)
        .filter((line) => line.trim() !== '');
    if (lines.length === 0) return [];

    const header = lines[0].split(',').map((cell) => cell.trim());
    return lines.slice(1).map((line) => {
        const cells = line.split(',');
        return Object.fromEntries(header.map((key, i) => [key, (cells[i] ?? '').trim()]));
    });
}

export function stringifyCsv(columns, rows) {
    const lines = rows.map((row) => columns.map((column) => row[column] ?? '').join(','));
    return [columns.join(','), ...lines].join('\n') + '\n';
}

/** Parses a numeric cell; returns null for empty or non-numeric values. */
export function toNumber(cell) {
    if (cell === undefined || cell === null || String(cell).trim() === '') return null;
    const value = Number(cell);
    return Number.isFinite(value) ? value : null;
}
