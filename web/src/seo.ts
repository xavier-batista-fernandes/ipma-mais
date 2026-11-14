import { en, type Messages } from './i18n/en';
import { pt } from './i18n/pt';
import type { Location } from './paths';

/**
 * Each page's title and description for search engines and link previews, in both languages.
 * Shared by the app (which sets `document.title` as you move around) and the Worker (which
 * writes them into the HTML it answers each address with), so both always say the same thing.
 * Kept free of React and the DOM.
 */
export type SeoLanguage = 'pt' | 'en';

export const SITE_NAME = 'IPMA+';

/** The `lang` of each language, and its locale for `og:locale`. */
export const LANG_TAG: Record<SeoLanguage, string> = { pt: 'pt-PT', en: 'en' };
export const OG_LOCALE: Record<SeoLanguage, string> = { pt: 'pt_PT', en: 'en_GB' };

const MESSAGES: Record<SeoLanguage, Messages> = { pt, en };

/** Words only these titles and descriptions need, so they stay out of the app's dictionaries. */
const WORDS = {
    pt: {
        map: 'Mapa diário por município',
        municipalities: 'Os 278 municípios de Portugal continental',
        variableTitle: '{metric} por município',
        municipalityTitle: '{name}: temperatura, chuva e evapotranspiração',
        municipalityDescription:
            'Tempo e clima em {name}, distrito de {district}: temperatura máxima e mínima, precipitação, evapotranspiração (ET0), risco de incêndio e água no solo, dia a dia e com o histórico completo, com dados do IPMA.',
        notFound: 'Página não encontrada',
        notFoundDescription: 'Não há nenhuma página neste endereço.',
    },
    en: {
        map: 'Daily map by municipality',
        municipalities: 'The 278 municipalities of mainland Portugal',
        variableTitle: '{metric} by municipality',
        municipalityTitle: '{name}: temperature, rain and evapotranspiration',
        municipalityDescription:
            'Weather and climate in {name}, {district} district: maximum and minimum temperature, rainfall, evapotranspiration (ET0), fire risk and soil water, day by day with the full history, from IPMA data.',
        notFound: 'Page not found',
        notFoundDescription: 'There is no page at this address.',
    },
} satisfies Record<SeoLanguage, Record<string, string>>;

const fill = (text: string, values: Record<string, string>) =>
    text.replace(/\{(\w+)\}/g, (match, name: string) => values[name] ?? match);

/** Cuts a description to what search results show (about 160 characters), at a word. */
export function clip(text: string, length = 160) {
    if (text.length <= length) return text;
    const cut = text.slice(0, length - 1);
    return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[,.;:]$/, '')}…`;
}

export interface PageMeta {
    title: string;
    description: string;
}

export interface SeoContext {
    /** The municipality, on its page. */
    municipality?: { name: string; district: string };
    /** Whether the page's variable exists, on a variable's page (unknown ids are "not found"). */
    knownVariable?: boolean;
}

/** A page's title and description. `null` location: no page at this address. */
export function pageMeta(
    location: Location | null,
    language: SeoLanguage,
    { municipality, knownVariable = true }: SeoContext = {}
): PageMeta {
    const m: Messages = MESSAGES[language];
    const w = WORDS[language];
    const title = (text: string) => `${text} · ${SITE_NAME}`;
    const notFound = { title: title(w.notFound), description: w.notFoundDescription };
    switch (location?.route) {
        case 'home':
            return {
                title: `${SITE_NAME} · ${m['home.title']}`,
                description: clip(m['home.lead']),
            };
        case 'map':
            return { title: title(w.map), description: clip(m['home.explore.map']) };
        case 'municipalities':
            return {
                title: title(w.municipalities),
                description: clip(m['home.explore.municipalities']),
            };
        case 'query':
            return { title: title(m['nav.query']), description: clip(m['home.explore.query']) };
        case 'data':
            return { title: title(m['data.title']), description: clip(m['home.explore.data']) };
        case 'variables':
            return { title: title(m['variables.title']), description: clip(m['variables.lead']) };
        case 'variable': {
            const id = location.variable ?? '';
            const name = `metric.${id}` as keyof Messages;
            const summary = `metricInfo.${id}.summary` as keyof Messages;
            const what = `metricInfo.${id}.what` as keyof Messages;
            if (!knownVariable || !(name in m) || !(summary in m)) return notFound;
            return {
                title: title(fill(w.variableTitle, { metric: m[name] })),
                description: clip(`${m[summary]} ${what in m ? m[what] : ''}`.trim()),
            };
        }
        case 'municipality':
            if (!municipality) return notFound;
            return {
                title: title(fill(w.municipalityTitle, municipality)),
                description: clip(fill(w.municipalityDescription, municipality), 240),
            };
        default:
            return notFound;
    }
}
