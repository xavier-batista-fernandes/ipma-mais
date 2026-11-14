import { useEffect, useRef, useState } from 'react';

/** Whether a CSS media query matches, kept up to date as the window turns or resizes. */
export function useMediaQuery(query: string) {
    const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
    useEffect(() => {
        const list = window.matchMedia(query);
        const update = () => setMatches(list.matches);
        update();
        list.addEventListener('change', update);
        return () => list.removeEventListener('change', update);
    }, [query]);
    return matches;
}

/**
 * Phones, held either way: narrow (the tab bar layout) or short (landscape). Must match the
 * `max-width: 720px` and `max-height: 500px` blocks in styles.css.
 */
export const PHONE_QUERY = '(max-width: 720px), (max-height: 500px) and (orientation: landscape)';

/** Touch screens, where a tap also fires hover events that would leave a tooltip behind. */
export const NO_HOVER_QUERY = '(hover: none)';

/**
 * The width of an element in CSS pixels, kept up to date as it resizes. Charts draw at this
 * width so their text keeps its size instead of shrinking with the drawing on a phone.
 */
export function useElementWidth<T extends HTMLElement>(fallback: number) {
    const ref = useRef<T>(null);
    const [width, setWidth] = useState(fallback);
    useEffect(() => {
        const element = ref.current;
        if (!element) return;
        const measure = () => {
            const measured = Math.round(element.clientWidth);
            if (measured > 0) setWidth(measured);
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(element);
        return () => observer.disconnect();
    }, []);
    return [ref, width] as const;
}
