import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/chivo';
import '@fontsource-variable/chivo-mono';
import { App } from './App';
import { redirectOldLinks } from './route';
import { SettingsProvider } from './settings';
import './styles.css';

const { openSettings } = redirectOldLinks();

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <SettingsProvider>
            <App openSettings={openSettings} />
        </SettingsProvider>
    </StrictMode>
);
