import type { Municipality } from 'cartis';
import { useMemo } from 'react';
import type { DayValues, MunicipalityInfo } from '../api';
import type { ColorScale } from '../colors';
import { MapView } from './MapView';

interface Props {
    day: DayValues | null;
    scale: ColorScale;
    byDico: Map<string, MunicipalityInfo>;
    allNames: Municipality[];
    onSelect: (name: Municipality) => void;
}

/**
 * A small, still map of one day (no zoom buttons): a thumbnail of the variable. Always drawn
 * without borders, whatever the map setting, since at this size they'd cover the colours.
 */
export function MiniMap({ day, scale, byDico, allNames, onSelect }: Props) {
    const fills = useMemo(() => {
        const result = new Map<Municipality, string>();
        for (const [dico, value] of Object.entries(day?.values ?? {})) {
            const info = byDico.get(dico);
            if (info) result.set(info.name, scale.color(value));
        }
        return result;
    }, [day, scale, byDico]);
    return (
        <div className="mini-map">
            <MapView
                fills={fills}
                allNames={allNames}
                selected={null}
                onHover={() => {}}
                onSelect={onSelect}
                zoomToSelected={false}
                borders={false}
            />
        </div>
    );
}

/** The country average and the two ends of a day's values. */
export function summarizeDay(day: DayValues | null) {
    const entries = Object.entries(day?.values ?? {});
    if (entries.length === 0) return null;
    let high = entries[0];
    let low = entries[0];
    let sum = 0;
    for (const entry of entries) {
        sum += entry[1];
        if (entry[1] > high[1]) high = entry;
        if (entry[1] < low[1]) low = entry;
    }
    return {
        mean: sum / entries.length,
        high: { dico: high[0], value: high[1] },
        low: { dico: low[0], value: low[1] },
    };
}
