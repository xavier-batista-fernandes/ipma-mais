import { Icon } from '../components/Icon';
import { useI18n } from '../i18n';
import { LANGUAGES, THEMES, useSettings } from '../settings';

export function SettingsPage() {
    const { t } = useI18n();
    const { theme, setTheme, language, setLanguage } = useSettings();

    return (
        <main className="page">
            <h1>{t('settings.title')}</h1>
            <p className="muted">{t('settings.subtitle')}</p>

            <section className="card">
                <h2 id="theme-label">{t('settings.theme')}</h2>
                <p className="muted small">{t('settings.themeHint')}</p>
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
            </section>

            <section className="card">
                <h2 id="language-label">{t('settings.language')}</h2>
                <p className="muted small">{t('settings.languageHint')}</p>
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
        </main>
    );
}
