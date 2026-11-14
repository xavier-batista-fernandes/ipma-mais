import { useEffect } from 'react';
import type { Location } from './paths';
import { pageMeta, type SeoContext, type SeoLanguage } from './seo';

const setMeta = (selector: string, content: string) =>
    document.head.querySelector(selector)?.setAttribute('content', content);

/**
 * Keeps the tab's title and the page's description in step with the page shown, as the Worker
 * wrote them for the first one (see seo.ts): search engines read them after running the app too.
 * Waits for the municipality on its page, so the title doesn't flash "not found" while loading.
 */
export function usePageMeta(
    location: Location,
    language: SeoLanguage,
    context: SeoContext & { ready: boolean }
) {
    const { ready, municipality, knownVariable } = context;
    const { route, slug, variable } = location;
    useEffect(() => {
        if (!ready && (route === 'municipality' || route === 'variable')) return;
        const { title, description } = pageMeta({ route, slug, variable }, language, {
            municipality,
            knownVariable,
        });
        document.title = title;
        setMeta('meta[name="description"]', description);
        setMeta('meta[property="og:title"]', title);
        setMeta('meta[property="og:description"]', description);
    }, [ready, route, slug, variable, language, municipality, knownVariable]);
}
