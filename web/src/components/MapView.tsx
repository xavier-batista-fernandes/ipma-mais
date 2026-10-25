import { Country, CountryMap, type Municipality, type MunicipalityInteractionEvent } from 'cartis';
import { useEffect, useRef, useState } from 'react';
import { MISSING_FILL } from '../colors';
import { useI18n } from '../i18n';

const BORDER = { strokeColor: '#ffffff', strokeWidth: 0.3 };
const SELECTED_BORDER = { strokeColor: '#111827', strokeWidth: 1.5 };

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

    useEffect(() => {
        let cancelled = false;
        let instance: CountryMap | null = null;
        const unsubscribe: (() => void)[] = [];

        CountryMap.create(Country.PORTUGAL, containerRef.current!, {
            style: { fill: MISSING_FILL, ...BORDER },
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
        for (const [fill, names] of byColor) map.styleMunicipalities(names, { fill });
    }, [map, fills, allNames]);

    // Outline and frame the selected municipality.
    useEffect(() => {
        if (!map || !selected) return;
        map.styleMunicipalities([selected], SELECTED_BORDER);
        // Deferred a little: right after the map first renders, Cartis' resize handling can still
        // reproject once and would interrupt a zoom transition started in the same frame.
        const timer = window.setTimeout(
            () => map.fitToMunicipalities([selected], { zoom: 0.4, duration: 750 }),
            250
        );
        return () => {
            window.clearTimeout(timer);
            map.styleMunicipalities([selected], BORDER);
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
