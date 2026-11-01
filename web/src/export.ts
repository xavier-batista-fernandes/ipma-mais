import type { ColorScale } from './colors';

/** Saves `content` as a file through a temporary link. */
export function download(filename: string, content: Blob | string, type = 'text/plain') {
    const blob = content instanceof Blob ? content : new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    // Some browsers read the URL after click() returns.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** RFC 4180 CSV: values with a comma, quote or line break are quoted, quotes doubled. */
export function toCsv(header: string[], rows: (string | number | null | undefined)[][]) {
    const cell = (value: string | number | null | undefined) => {
        const text = value === null || value === undefined ? '' : String(value);
        return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    // A BOM so spreadsheet apps read accented names as UTF-8.
    return `﻿${[header, ...rows].map((row) => row.map(cell).join(',')).join('\r\n')}\r\n`;
}

/** A file-name-safe slug: "Évora, 1–31 Oct" → "evora-1-31-oct". */
export function slug(text: string) {
    return text
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

export interface MapImageOptions {
    title: string;
    subtitle: string;
    scale: ColorScale;
    /** Formats a legend tick. */
    tick: (value: number) => string;
    unit: string;
    missingColor: string;
    missingLabel: string;
    source: string;
    /** Theme colours of the page, so the image matches what is on screen. */
    background: string;
    text: string;
    muted: string;
}

const XML_ESCAPES: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
};
const escape = (text: string) => text.replace(/[&<>"]/g, (c) => XML_ESCAPES[c]);

/**
 * A standalone SVG of the map as drawn on screen: the whole country (any zoom is reset), each
 * municipality in its current fill, with a title, the legend and the data source.
 */
export function mapToSvg(
    mapSvg: SVGSVGElement,
    fillOf: (path: SVGPathElement) => string,
    options: MapImageOptions
) {
    // The drawing's own bounds, without the zoom transform on its group: the whole country,
    // however the page is laid out or zoomed.
    const group = mapSvg.querySelector('g');
    const box = group ? group.getBBox() : mapSvg.getBBox();
    const fit = Math.min(1, 900 / box.height);
    const mapWidth = Math.round(box.width * fit);
    const mapHeight = Math.round(box.height * fit);
    const pad = 24;
    const head = 64;
    const foot = 88;
    const width = Math.max(mapWidth, 480) + pad * 2;
    const height = mapHeight + head + foot;

    const paths = [...mapSvg.querySelectorAll<SVGPathElement>('path')]
        .map((path) => {
            const fill = fillOf(path);
            return `<path d="${path.getAttribute('d') ?? ''}" fill="${fill}" stroke="${fill}" stroke-width="1"/>`;
        })
        .join('');

    const { scale, tick } = options;
    const [lo, hi] = scale.domain;
    const legendWidth = Math.min(360, width - pad * 2);
    const swatch = legendWidth / scale.colors.length;
    const legendY = head + mapHeight + 16;
    const at = (value: number) => pad + ((value - lo) / (hi - lo)) * legendWidth;
    const swatches = scale.colors
        .map(
            (color, i) =>
                `<rect x="${pad + i * swatch}" y="${legendY}" width="${swatch + 0.5}" height="10" fill="${color}"/>`
        )
        .join('');
    const ticks = [lo, ...scale.labels, hi]
        .filter((value, i, all) => all.indexOf(value) === i)
        .map(
            (value) =>
                `<text x="${at(value)}" y="${legendY + 26}" text-anchor="middle">${escape(tick(value))}</text>`
        )
        .join('');
    const missingX = pad + legendWidth + 24;

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="Inter, system-ui, sans-serif">
<rect width="100%" height="100%" fill="${options.background}"/>
<text x="${pad}" y="32" font-size="18" font-weight="700" fill="${options.text}">${escape(options.title)}</text>
<text x="${pad}" y="52" font-size="13" fill="${options.muted}">${escape(options.subtitle)}</text>
<g transform="translate(${(width - mapWidth) / 2} ${head}) scale(${fit}) translate(${-box.x} ${-box.y})">${paths}</g>
<g font-size="11" fill="${options.muted}">
<text x="${pad}" y="${legendY - 6}">${escape(options.unit)}</text>
${swatches}${ticks}
<rect x="${missingX}" y="${legendY}" width="10" height="10" fill="${options.missingColor}"/>
<text x="${missingX + 16}" y="${legendY + 9}">${escape(options.missingLabel)}</text>
<text x="${pad}" y="${height - 14}">${escape(options.source)}</text>
</g>
</svg>
`;
}

/** Renders an SVG document to a PNG at `pixelRatio` times its size. */
export async function svgToPng(svg: string, pixelRatio = 2): Promise<Blob> {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    try {
        const image = new Image();
        image.src = url;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth * pixelRatio;
        canvas.height = image.naturalHeight * pixelRatio;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas is not available');
        context.scale(pixelRatio, pixelRatio);
        context.drawImage(image, 0, 0);
        return await new Promise<Blob>((resolve, reject) =>
            canvas.toBlob(
                (blob) => (blob ? resolve(blob) : reject(new Error('PNG failed'))),
                'image/png'
            )
        );
    } finally {
        URL.revokeObjectURL(url);
    }
}
