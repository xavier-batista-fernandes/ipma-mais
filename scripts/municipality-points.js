/**
 * Writes `inputs/municipality-points.json`: one point well inside each municipality, as
 * `{ dico: [lon, lat] }`, from the boundaries Cartis ships. Map-server sources that only answer
 * point queries (IPMA's WMS GetFeatureInfo) are sampled there.
 *
 *   node scripts/municipality-points.js
 *
 * The point is the municipality's pole of inaccessibility (the spot furthest from its border,
 * on its largest polygon), found by refining a grid, so it is never outside the boundary the
 * way a centroid of a crescent-shaped municipality can be.
 */
import fs from 'fs';
import path from 'path';
import { feature } from 'topojson-client';

const TOPOLOGY = path.join(
    import.meta.dirname,
    '..',
    'node_modules/cartis/dist/data/portugal/municipalities.json'
);
const OUT = path.join(import.meta.dirname, '..', 'inputs', 'municipality-points.json');

export function interiorPoint(rings) {
    const outer = rings[0];
    let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity];
    for (const [x, y] of outer) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
    }
    // Longitude degrees are shorter than latitude degrees at Portugal's latitude.
    const kx = Math.cos((((minY + maxY) / 2) * Math.PI) / 180);
    const score = (x, y) => (inside(x, y, rings) ? edgeDistance(x, y, rings, kx) : -1);

    let best = { x: (minX + maxX) / 2, y: (minY + maxY) / 2, d: -1 };
    let [x0, y0, w, h] = [minX, minY, maxX - minX, maxY - minY];
    for (let round = 0; round < 6; round++) {
        const n = 24;
        for (let i = 0; i <= n; i++) {
            for (let j = 0; j <= n; j++) {
                const x = x0 + (w * i) / n;
                const y = y0 + (h * j) / n;
                const d = score(x, y);
                if (d > best.d) best = { x, y, d };
            }
        }
        // Zoom in around the best cell so far.
        w /= 4;
        h /= 4;
        x0 = best.x - w / 2;
        y0 = best.y - h / 2;
    }
    if (best.d < 0) throw new Error('No interior point found');
    return [round(best.x), round(best.y)];
}

function inside(x, y, rings) {
    let odd = false;
    for (const ring of rings) {
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
            const [xi, yi] = ring[i];
            const [xj, yj] = ring[j];
            if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) odd = !odd;
        }
    }
    return odd;
}

function edgeDistance(x, y, rings, kx) {
    let min = Infinity;
    for (const ring of rings) {
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
            min = Math.min(min, segmentDistance(x, y, ring[j], ring[i], kx));
        }
    }
    return min;
}

function segmentDistance(px, py, [ax, ay], [bx, by], kx) {
    const [x, y, x1, y1, x2, y2] = [px * kx, py, ax * kx, ay, bx * kx, by];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const t =
        dx || dy
            ? Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)))
            : 0;
    return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
}

function ringArea(ring) {
    let area = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        area += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
    }
    return Math.abs(area / 2);
}

const round = (value) => Math.round(value * 1e4) / 1e4;

function main() {
    const topology = JSON.parse(fs.readFileSync(TOPOLOGY, 'utf-8'));
    const { features } = feature(topology, topology.objects.municipalities);
    const points = {};
    for (const { geometry, properties } of features) {
        const polygons =
            geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
        const largest = polygons.reduce((a, b) => (ringArea(b[0]) > ringArea(a[0]) ? b : a));
        points[properties.CC_2] = interiorPoint(largest);
    }
    const sorted = Object.fromEntries(
        Object.entries(points).sort(([a], [b]) => a.localeCompare(b))
    );
    fs.writeFileSync(OUT, JSON.stringify(sorted, null, 4) + '\n');
    console.log(
        `${Object.keys(sorted).length} points written to ${path.relative(process.cwd(), OUT)}`
    );
}

if (import.meta.url === `file://${process.argv[1]}`) main();
