import { getMunicipalitiesFromString, type Municipality } from 'cartis';
import { useId, useMemo, useState } from 'react';
import { useI18n } from '../i18n';
import { Icon } from './Icon';

interface Props {
    onSelect: (name: Municipality) => void;
    /** A second line under each match, such as its district. */
    describe?: (name: Municipality) => string | undefined;
}

/** Search-as-you-type over the 278 municipality names (accent and case insensitive). */
export function Search({ onSelect, describe }: Props) {
    const { t } = useI18n();
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
            <Icon name="search" />
            <input
                type="search"
                placeholder={t('search.placeholder')}
                aria-label={t('search.label')}
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
            {query && (
                <button
                    type="button"
                    className="icon-button ghost search-clear"
                    aria-label={t('search.clear')}
                    onClick={() => {
                        setQuery('');
                        setActive(0);
                    }}
                >
                    <Icon name="close" />
                </button>
            )}
            {query.trim() && matches.length === 0 && (
                <p className="popover search-empty">{t('search.noResults')}</p>
            )}
            {matches.length > 0 && (
                <ul id={listId} role="listbox" className="popover">
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
                            <span>{name}</span>
                            {describe?.(name) && (
                                <span className="muted small">{describe(name)}</span>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
