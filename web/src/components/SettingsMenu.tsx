import { useEffect } from 'react';
import { useI18n } from '../i18n';
import { LANGUAGES, THEMES, useSettings } from '../settings';
import { Icon } from './Icon';
import { usePopover } from './usePopover';

/**
 * The settings (theme, language, map borders) in a panel that opens from the gear in the top bar.
 * They are a few switches rather than a place to go, so they don't get a page of their own.
 */
export function SettingsMenu({ initiallyOpen = false }: { initiallyOpen?: boolean }) {
    const { t } = useI18n();
    const { ref, triggerRef, open, setOpen, close } = usePopover<HTMLDivElement>();
    const { theme, setTheme, language, setLanguage, borders, setBorders } = useSettings();

    useEffect(() => {
        if (initiallyOpen) setOpen(true);
    }, [initiallyOpen, setOpen]);

    return (
        <div className="settings-menu" ref={ref}>
            <button
                ref={triggerRef}
                type="button"
                className="icon-button"
                aria-label={t('nav.settings')}
                title={t('nav.settings')}
                aria-haspopup="dialog"
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
            >
                <Icon name="settings" />
            </button>
            {open && (
                <div
                    className="popover settings-panel"
                    role="dialog"
                    aria-labelledby="settings-title"
                >
                    <div className="settings-head">
                        <div>
                            <h2 id="settings-title">{t('settings.title')}</h2>
                            <p className="muted small">{t('settings.subtitle')}</p>
                        </div>
                        <button
                            type="button"
                            className="icon-button ghost"
                            aria-label={t('panel.close')}
                            onClick={() => close(true)}
                        >
                            <Icon name="close" />
                        </button>
                    </div>

                    <section>
                        <h3 id="theme-label" className="field-label">
                            {t('settings.theme')}
                        </h3>
                        <div className="choices" role="radiogroup" aria-labelledby="theme-label">
                            {THEMES.map((id) => (
                                <button
                                    key={id}
                                    type="button"
                                    role="radio"
                                    aria-checked={theme === id}
                                    onClick={() => setTheme(id)}
                                >
                                    <Icon name={id} />
                                    {t(`settings.theme.${id}`)}
                                </button>
                            ))}
                        </div>
                        <p className="muted small">{t('settings.themeHint')}</p>
                    </section>

                    <section>
                        <h3 id="language-label" className="field-label">
                            {t('settings.language')}
                        </h3>
                        <div className="choices" role="radiogroup" aria-labelledby="language-label">
                            {LANGUAGES.map(({ id, name }) => (
                                <button
                                    key={id}
                                    type="button"
                                    role="radio"
                                    lang={id}
                                    aria-checked={language === id}
                                    onClick={() => setLanguage(id)}
                                >
                                    <span className="choice-badge">{id.toUpperCase()}</span>
                                    {name}
                                </button>
                            ))}
                        </div>
                    </section>

                    <section>
                        <h3 id="borders-label" className="field-label">
                            {t('settings.borders')}
                        </h3>
                        <div className="choices" role="radiogroup" aria-labelledby="borders-label">
                            {([false, true] as const).map((on) => (
                                <button
                                    key={String(on)}
                                    type="button"
                                    role="radio"
                                    aria-checked={borders === on}
                                    onClick={() => setBorders(on)}
                                >
                                    <Icon name={on ? 'borders' : 'map'} />
                                    {t(on ? 'settings.borders.on' : 'settings.borders.off')}
                                </button>
                            ))}
                        </div>
                        <p className="muted small">{t('settings.bordersHint')}</p>
                    </section>
                </div>
            )}
        </div>
    );
}
