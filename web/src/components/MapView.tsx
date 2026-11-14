import {
    Country,
    CountryMap,
    type District,
    type Municipality,
    type MunicipalityInteractionEvent,
} from 'cartis';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MISSING_FILL } from '../colors';
import { Icon } from './Icon';
import { useI18n } from '../i18n';
import { useSettings } from '../settings';

/**
 * No visible borders: each municipality is stroked in its own fill colour, just wide enough to
 * cover the anti-aliasing seams between neighbouring polygons. Strokes don't scale with zoom
 * (`vector-effect: non-scaling-stroke` in styles.css), so the overlap stays the same
 * 1.5 screen pixels at any zoom (narrower still lets the background show through at 1x DPR).
 */
const SEAM_WIDTH = 1.5;
/**
 * Optional borders (a setting): always a hairline in the theme's `--map-border` colour, which is
 * the page background, so they read as thin gaps between municipalities. The stroke is opaque
 * and doesn't scale with zoom either, so a shared edge, stroked by both neighbours, looks the
 * same as a coastline and stays this thin however far in you zoom.
 */
const BORDER_WIDTH = 0.5;
const SELECTED_STROKE_WIDTH = 1;

/**
 * A theme colour token, such as the selected municipality's `--map-outline`. Cartis sets colours
 * as SVG attributes, where `var()` doesn't work, so it is read here and re-read whenever the
 * theme changes (a Settings choice or the system's light/dark switch).
 */
function useThemeColor(token: string, fallback: string) {
    const { theme } = useSettings();
    const read = () =>
        getComputedStyle(document.documentElement).getPropertyValue(token).trim() || fallback;
    const [color, setColor] = useState(read);
    useEffect(() => {
        setColor(read());
        const query = window.matchMedia('(prefers-color-scheme: dark)');
        const update = () => setColor(read());
        query.addEventListener('change', update);
        return () => query.removeEventListener('change', update);
    }, [theme]);
    return color;
}

/**
 * A municipality's path. Cartis has no API for this, so it is found through the feature D3 bound
 * to it; if that ever changes, this returns null and the selection is simply not highlighted.
 */
function findPath(container: HTMLElement | null, name: Municipality) {
    for (const path of container?.querySelectorAll('svg path') ?? []) {
        const datum = (path as { __data__?: { properties?: { NAME_2?: string } } }).__data__;
        if (datum?.properties?.NAME_2 === name) return path;
    }
    return null;
}

interface Props {
    /** Fill colour per municipality; municipalities left out are drawn as missing data. */
    fills: Map<Municipality, string>;
    allNames: Municipality[];
    selected: Municipality | null;
    onHover: (event: MunicipalityInteractionEvent | null) => void;
    onSelect: (name: Municipality) => void;
    /** Zooms in on the selected municipality (off for a locator, which shows the whole country). */
    zoomToSelected?: boolean;
    /** Frames this district instead of the whole country (a locator that shows the neighbours). */
    frameDistrict?: District;
}

export function MapView({
    fills,
    allNames,
    selected,
    onHover,
    onSelect,
    zoomToSelected = true,
    frameDistrict,
}: Props) {
    const { t } = useI18n();
    const containerRef = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<CountryMap | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [movedAway, setMovedAway] = useState(false);
    const { borders, setBorders } = useSettings();
    const outline = useThemeColor('--map-outline', '#111827');
    const borderColor = useThemeColor('--map-border', '#ffffff');
    // Light grey in the light theme, dark grey in the dark one (a pale map glares at night).
    const missing = useThemeColor('--map-missing', MISSING_FILL);
    const selectedBorder = useMemo(
        () => ({ strokeColor: outline, strokeWidth: SELECTED_STROKE_WIDTH }),
        [outline]
    );
    /** The stroke of an unselected municipality filled in `fill`: a thin border or a seam. */
    const strokeFor = useCallback(
        (fill: string) =>
            borders
                ? { strokeColor: borderColor, strokeWidth: BORDER_WIDTH }
                : { strokeColor: fill, strokeWidth: SEAM_WIDTH },
        [borders, borderColor]
    );

    // Latest callbacks, so the map's single registered handler never goes stale.
    const handlers = useRef({ onHover, onSelect });
    handlers.current = { onHover, onSelect };
    // Read by the effects below without making them re-run (and re-zoom) on every change.
    const latest = useRef({ fills, selected, selectedBorder, strokeFor, missing });
    latest.current = { fills, selected, selectedBorder, strokeFor, missing };

    useEffect(() => {
        let cancelled = false;
        let instance: CountryMap | null = null;
        const unsubscribe: (() => void)[] = [];

        CountryMap.create(Country.PORTUGAL, containerRef.current!, {
            style: {
                fill: latest.current.missing,
                ...latest.current.strokeFor(latest.current.missing),
            },
        })
            .then((created) => {
                // StrictMode mounts twice: a create() that resolves after cleanup is discarded.
                if (cancelled) {
                    created.destroy();
                    return;
                }
                instance = created;
                unsubscribe.push(
                    created.onMunicipalityHover((e) => handlers.current.onHover(e)),
                    created.onMunicipalityLeave(() => handlers.current.onHover(null)),
                    created.onMunicipalityClick((e) => handlers.current.onSelect(e.municipality)),
                    created.onZoomChange((e) => setMovedAway(!e.isDefaultView))
                );
                setMap(created);
            })
            .catch((e: unknown) => !cancelled && setError(String(e)));

        return () => {
            cancelled = true;
            unsubscribe.forEach((fn) => fn());
            instance?.destroy();
            setMap(null);
        };
    }, []);

    // Choropleth: one style call per colour, plus one for municipalities without data.
    useEffect(() => {
        if (!map) return;
        const byColor = new Map<string, Municipality[]>();
        for (const name of allNames) {
            const color = fills.get(name) ?? missing;
            if (!byColor.has(color)) byColor.set(color, []);
            byColor.get(color)!.push(name);
        }
        for (const [fill, names] of byColor) {
            map.styleMunicipalities(names, { fill, ...strokeFor(fill) });
        }
        // Recolouring just reset the selected municipality's stroke too; put its outline back.
        const { selected, selectedBorder } = latest.current;
        if (selected) map.styleMunicipalities([selected], selectedBorder);
    }, [map, fills, allNames, strokeFor, missing]);

    // Outline and frame the selected municipality.
    useEffect(() => {
        if (!map || !selected) return;
        // The rest of the map is dimmed (CSS `.map.has-selection path`) and this one isn't. It
        // also moves to the end of its group so its outline paints above its neighbours' strokes
        // (otherwise every neighbour drawn later covers half of it).
        const path = findPath(containerRef.current, selected);
        path?.classList.add('selected');
        path?.parentNode?.appendChild(path);
        map.styleMunicipalities([selected], latest.current.selectedBorder);
        // Deferred a little: right after the map first renders, Cartis' resize handling can still
        // reproject once and would interrupt a zoom transition started in the same frame.
        const timer = zoomToSelected
            ? window.setTimeout(
                  () => map.fitToMunicipalities([selected], { zoom: 0.4, duration: 750 }),
                  250
              )
            : undefined;
        return () => {
            window.clearTimeout(timer);
            path?.classList.remove('selected');
            const fill = latest.current.fills.get(selected) ?? latest.current.missing;
            map.styleMunicipalities([selected], latest.current.strokeFor(fill));
        };
    }, [map, selected, zoomToSelected]);

    // Frame a district, a little zoomed out so its neighbours show around it.
    useEffect(() => {
        if (!map || !frameDistrict) return;
        const timer = window.setTimeout(
            () => map.fitToDistricts([frameDistrict], { zoom: 0.8, duration: 0 }),
            250
        );
        return () => window.clearTimeout(timer);
    }, [map, frameDistrict]);

    // A theme change only recolours the outline; it doesn't re-zoom.
    useEffect(() => {
        if (map && selected) map.styleMunicipalities([selected], selectedBorder);
    }, [map, selected, selectedBorder]);

    return (
        <div className="map-wrap">
            <div
                ref={containerRef}
                className={selected ? 'map has-selection' : 'map'}
                aria-label={t('map.label')}
            />
            {!map && !error && <div className="map-status">{t('map.loading')}</div>}
            {error && <div className="map-status error">{t('map.error', { error })}</div>}
            {map && (
                <div className="zoom-controls">
                    <button type="button" onClick={() => map.zoomIn()} aria-label={t('map.zoomIn')}>
                        +
                    </button>
                    <button
                        type="button"
                        onClick={() => map.zoomOut()}
                        aria-label={t('map.zoomOut')}
                    >
                        −
                    </button>
                    <button
                        type="button"
                        onClick={() => setBorders(!borders)}
                        aria-label={t('map.borders')}
                        aria-pressed={borders}
                        title={t('map.borders')}
                    >
                        <Icon name="borders" />
                    </button>
                    {movedAway && (
                        <button
                            type="button"
                            onClick={() => map.fitToCountry()}
                            aria-label={t('map.reset')}
                        >
                            ⟲
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
