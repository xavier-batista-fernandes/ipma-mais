import { getMunicipalitiesFromString, type Municipality } from 'cartis';
import { useId, useMemo, useState } from 'react';

interface Props {
    onSelect: (name: Municipality) => void;
}

/** Search-as-you-type over the 278 municipality names (accent and case insensitive). */
export function Search({ onSelect }: Props) {
    const [query, setQuery] = useState('');
    const [active, setActive] = useState(0);
    const listId = useId();

    const matches = useMemo(
        () =>
            query.trim()
                ? getMunicipalitiesFromString(query)
                      .sort((a, b) => a.localeCompare(b, 'pt'))
                      .slice(0, 8)
                : [],
        [query]
    );

    const choose = (name: Municipality) => {
        onSelect(name);
        setQuery('');
        setActive(0);
    };

    return (
        <div className="search">
            <input
                type="search"
                placeholder="Procurar município…"
                aria-label="Procurar município"
                role="combobox"
                aria-expanded={matches.length > 0}
                aria-controls={listId}
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setActive(0);
                }}
                onKeyDown={(e) => {
                    if (e.key === 'ArrowDown')
                        setActive((i) => Math.min(i + 1, matches.length - 1));
                    else if (e.key === 'ArrowUp') setActive((i) => Math.max(i - 1, 0));
                    else if (e.key === 'Enter' && matches[active]) choose(matches[active]);
                    else if (e.key === 'Escape') setQuery('');
                    else return;
                    e.preventDefault();
                }}
            />
            {matches.length > 0 && (
                <ul id={listId} role="listbox">
                    {matches.map((name, i) => (
                        <li
                            key={name}
                            role="option"
                            aria-selected={i === active}
                            onPointerDown={(e) => {
                                e.preventDefault();
                                choose(name);
                            }}
                        >
                            {name}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
