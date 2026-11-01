import { Country, CountryMap, type Municipality, type MunicipalityInteractionEvent } from 'cartis';
import { useEffect, useRef, useState } from 'react';
import { MISSING_FILL } from '../colors';
import { useI18n } from '../i18n';

/**
 * No visible borders: each municipality is stroked in its own fill colour, just wide enough to
 * cover the anti-aliasing seams between neighbouring polygons. Strokes don't scale with zoom
 * (`vector-effect: non-scaling-stroke` in styles.css), so the overlap stays the same
 * 1.5 screen pixels at any zoom (narrower still lets the background show through at 1x DPR).
 */
const SEAM_WIDTH = 1.5;
const SELECTED_BORDER = { strokeColor: '#111827', strokeWidth: 2 };

/**
 * Moves a municipality's path to the end of its group so its outline paints above its
 * neighbours' seam strokes (otherwise every neighbour drawn later covers half of it). Cartis has
 * no API for this, so it finds the path through the feature D3 bound to it; if that ever
 * changes, this quietly does nothing and the outline is just thinner on some sides.
 */
function bringToFront(container: HTMLElement | null, name: Municipality) {
    for (const path of container?.querySelectorAll('svg path') ?? []) {
        const datum = (path as { __data__?: { properties?: { NAME_2?: string } } }).__data__;
        if (datum?.properties?.NAME_2 === name) {
            path.parentNode?.appendChild(path);
            return;
        }
    }
}

interface Props {
    /** Fill colour per municipality; municipalities left out are drawn as missing data. */
    fills: Map<Municipality, string>;
    allNames: Municipality[];
    selected: Municipality | null;
    onHover: (event: MunicipalityInteractionEvent | null) => void;
    onSelect: (name: Municipality) => void;
}

export function MapView({ fills, allNames, selected, onHover, onSelect }: Props) {
    const { t } = useI18n();
    const containerRef = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<CountryMap | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [movedAway, setMovedAway] = useState(false);

    // Latest callbacks, so the map's single registered handler never goes stale.
    const handlers = useRef({ onHover, onSelect });
    handlers.current = { onHover, onSelect };
    // Read by the effects below without making them re-run (and re-zoom) on every change.
    const latest = useRef({ fills, selected });
    latest.current = { fills, selected };

    useEffect(() => {
        let cancelled = false;
        let instance: CountryMap | null = null;
        const unsubscribe: (() => void)[] = [];

        CountryMap.create(Country.PORTUGAL, containerRef.current!, {
            style: { fill: MISSING_FILL, strokeColor: MISSING_FILL, strokeWidth: SEAM_WIDTH },
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
            const color = fills.get(name) ?? MISSING_FILL;
            if (!byColor.has(color)) byColor.set(color, []);
            byColor.get(color)!.push(name);
        }
        for (const [fill, names] of byColor) {
            map.styleMunicipalities(names, { fill, strokeColor: fill, strokeWidth: SEAM_WIDTH });
        }
        // Recolouring just reset the selected municipality's stroke too; put its outline back.
        const { selected } = latest.current;
        if (selected) map.styleMunicipalities([selected], SELECTED_BORDER);
    }, [map, fills, allNames]);

    // Outline and frame the selected municipality.
    useEffect(() => {
        if (!map || !selected) return;
        bringToFront(containerRef.current, selected);
        map.styleMunicipalities([selected], SELECTED_BORDER);
        // Deferred a little: right after the map first renders, Cartis' resize handling can still
        // reproject once and would interrupt a zoom transition started in the same frame.
        const timer = window.setTimeout(
            () => map.fitToMunicipalities([selected], { zoom: 0.4, duration: 750 }),
            250
        );
        return () => {
            window.clearTimeout(timer);
            const fill = latest.current.fills.get(selected) ?? MISSING_FILL;
            map.styleMunicipalities([selected], { strokeColor: fill, strokeWidth: SEAM_WIDTH });
        };
    }, [map, selected]);

    return (
        <div className="map-wrap">
            <div ref={containerRef} className="map" aria-label={t('map.label')} />
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
