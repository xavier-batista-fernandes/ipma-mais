import { Icon } from '../components/Icon';
import { useI18n } from '../i18n';

export function AboutPage({ generatedAt }: { generatedAt: string | null }) {
    const { t, format } = useI18n();

    return (
        <main className="page">
            <h1>{t('about.title')}</h1>
            <p className="lead">{t('about.intro')}</p>

            <section className="card">
                <h2>{t('about.dataTitle')}</h2>
                <ul>
                    <li>{t('about.et0')}</li>
                    <li>{t('about.temperature')}</li>
                </ul>
                {generatedAt && (
                    <p className="muted small">
                        {t('about.updated', { date: format.date(generatedAt.slice(0, 10)) })}
                    </p>
                )}
            </section>

            <section className="card">
                <h2>{t('about.howTitle')}</h2>
                <p>{t('about.how')}</p>
            </section>

            <a className="button" href="https://github.com/xavier-batista-fernandes/ipma-mais">
                <Icon name="github" />
                {t('about.code')}
            </a>
        </main>
    );
}
