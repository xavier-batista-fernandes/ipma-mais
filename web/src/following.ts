import { useCallback, useEffect, useState } from 'react';

/**
 * The municipalities a visitor follows ("Seguir"), by DICO code. Kept in this browser only, like
 * the settings; no account. Every `useFollowing()` stays in sync through a window event.
 */
const STORAGE_KEY = 'ipma-mais:following';
const CHANGED = 'ipma-mais:following';

function load(): string[] {
    try {
        const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
        return Array.isArray(saved) ? saved.filter((d): d is string => typeof d === 'string') : [];
    } catch {
        return [];
    }
}

export function useFollowing() {
    const [following, setFollowing] = useState(load);

    useEffect(() => {
        const update = () => setFollowing(load());
        window.addEventListener(CHANGED, update);
        // Another tab changed the list.
        window.addEventListener('storage', update);
        return () => {
            window.removeEventListener(CHANGED, update);
            window.removeEventListener('storage', update);
        };
    }, []);

    const toggle = useCallback((dico: string) => {
        const current = load();
        const next = current.includes(dico)
            ? current.filter((d) => d !== dico)
            : [...current, dico];
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
            // Storage can be blocked: the star still works until the page is reloaded.
            setFollowing(next);
            return;
        }
        window.dispatchEvent(new Event(CHANGED));
    }, []);

    return { following, toggle };
}
