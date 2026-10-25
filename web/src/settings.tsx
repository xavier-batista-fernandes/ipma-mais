import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Theme = 'system' | 'light' | 'dark';
export type Language = 'pt' | 'en';

export const THEMES: Theme[] = ['system', 'light', 'dark'];
export const LANGUAGES: { id: Language; name: string }[] = [
    { id: 'pt', name: 'Português' },
    { id: 'en', name: 'English' },
];

interface Settings {
    theme: Theme;
    language: Language;
}

interface SettingsContext extends Settings {
    setTheme: (theme: Theme) => void;
    setLanguage: (language: Language) => void;
}

// Also read by the inline script in index.html, which applies the theme before first paint.
const STORAGE_KEY = 'ipma-mais:settings';

function loadSettings(): Settings {
    let saved: Partial<Settings> = {};
    try {
        saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    } catch {
        // Storage can be blocked or hold junk: fall back to defaults.
    }
    const theme = THEMES.includes(saved.theme as Theme) ? (saved.theme as Theme) : 'system';
    const language = LANGUAGES.some((l) => l.id === saved.language)
        ? (saved.language as Language)
        : navigator.language.toLowerCase().startsWith('pt')
          ? 'pt'
          : 'en';
    return { theme, language };
}

const Context = createContext<SettingsContext | null>(null);

/** Theme and language, persisted in localStorage and applied to the `<html>` element. */
export function SettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState(loadSettings);

    useEffect(() => {
        const root = document.documentElement;
        if (settings.theme === 'system') delete root.dataset.theme;
        else root.dataset.theme = settings.theme;
        root.lang = settings.language;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        } catch {
            // Not saved, but still applied for this visit.
        }
    }, [settings]);

    const value = useMemo<SettingsContext>(
        () => ({
            ...settings,
            setTheme: (theme) => setSettings((s) => ({ ...s, theme })),
            setLanguage: (language) => setSettings((s) => ({ ...s, language })),
        }),
        [settings]
    );

    return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSettings() {
    const context = useContext(Context);
    if (!context) throw new Error('useSettings() needs a <SettingsProvider> above it');
    return context;
}
