import { useEffect, useState } from 'react';
import { useSettings } from './settings';

/**
 * A theme colour token, such as `--text`, for code that needs the colour itself rather than a
 * `var()` (inline styles computed in JS, SVG attributes). Re-read whenever the theme changes: a
 * Settings choice or the system's light/dark switch.
 */
export function useThemeColor(token: string, fallback: string) {
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
