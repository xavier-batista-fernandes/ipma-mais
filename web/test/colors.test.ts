import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readableOn } from '../src/colors.ts';

/** WCAG contrast between two `rgb(r, g, b)` or `#rrggbb` colours. */
function contrast(a: string, b: string) {
    const lum = (c: string) => {
        const hex = /^#(..)(..)(..)$/.exec(c);
        const parts = hex
            ? hex.slice(1).map((h) => Number.parseInt(h, 16))
            : c
                  .match(/[\d.]+/g)!
                  .slice(0, 3)
                  .map(Number);
        const [r, g, b] = parts.map((v) => {
            const s = v / 255;
            return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
}

const DARK_TOOLTIP = '#0b0d10';
const LIGHT_TOOLTIP = '#e6e9ee';

test('readableOn keeps a colour that already reads well', () => {
    assert.equal(readableOn('#e8ee6b', DARK_TOOLTIP), '#e8ee6b');
    assert.equal(readableOn('rgb(27, 47, 122)', LIGHT_TOOLTIP), 'rgb(27, 47, 122)');
});

test('readableOn shades a colour until it reads well on either tooltip', () => {
    for (const color of ['#3b0f70', '#1f5fa8', '#e8483a', '#8ee08a', '#e8ee6b', '#2fd0c8']) {
        for (const bg of [DARK_TOOLTIP, LIGHT_TOOLTIP]) {
            assert.ok(contrast(readableOn(color, bg), bg) >= 4.5, `${color} on ${bg}`);
        }
    }
});

test('readableOn lightens on a dark background and darkens on a light one', () => {
    const lum = (c: string) =>
        c
            .match(/[\d.]+/g)!
            .slice(0, 3)
            .map(Number)
            .reduce((a, b) => a + b);
    assert.ok(lum(readableOn('#3b0f70', DARK_TOOLTIP)) > lum('rgb(59, 15, 112)'));
    assert.ok(lum(readableOn('#e8ee6b', LIGHT_TOOLTIP)) < lum('rgb(232, 238, 107)'));
});
