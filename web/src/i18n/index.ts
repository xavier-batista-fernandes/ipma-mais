import { useMemo } from 'react';
import { createFormat } from '../format';
import { useSettings, type Language } from '../settings';
import { en, type MessageKey, type Messages } from './en';
import { pt } from './pt';

export type { MessageKey };

const MESSAGES: Record<Language, Messages> = { en, pt };
const LOCALES: Record<Language, string> = { en: 'en-GB', pt: 'pt-PT' };

/**
 * Strings and number/date formatting for the current language.
 *
 * To add a string, add its key to `en.ts` and `pt.ts`, then call `t('my.key')` (or
 * `t('my.key', { name })` to fill a `{name}` placeholder). Use `format` for numbers and dates.
 */
export function useI18n() {
    const { language } = useSettings();
    return useMemo(() => {
        const messages = MESSAGES[language];
        const t = (key: MessageKey, values?: Record<string, string | number>) =>
            messages[key].replace(/\{(\w+)\}/g, (match, name: string) =>
                values && name in values ? String(values[name]) : match
            );
        return { language, locale: LOCALES[language], t, format: createFormat(LOCALES[language]) };
    }, [language]);
}
