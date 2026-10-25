/**
 * English strings: the reference dictionary. Every key here must also exist in `pt.ts` (the
 * compiler enforces it). Use `{name}` placeholders for values passed to `t(key, { name })`.
 */
export const en = {
    'app.tagline': 'Daily IPMA data by municipality',
    'app.loading': 'Loading…',
    'app.loadError': 'Could not load the data: {error}',

    'nav.home': 'IPMA+ home',
    'nav.menu': 'Menu',
    'nav.map': 'Map',
    'nav.about': 'About',
    'nav.settings': 'Settings',

    'metric.et0': 'Reference evapotranspiration (ET0)',
    'metric.tmax': 'Maximum temperature',
    'metric.tmin': 'Minimum temperature',

    'controls.metric': 'Variable',
    'controls.day': 'Day',
    'controls.previousDay': 'Previous day',
    'controls.nextDay': 'Next day',
    'controls.pickDay': 'Choose a day',

    'timeline.label': 'Timeline',
    'timeline.dayOf': 'day {day} of {total}',
    'timeline.firstDay': 'First day',
    'timeline.lastDay': 'Last day',
    'timeline.play': 'Play how it evolves',
    'timeline.pause': 'Pause',
    'timeline.speed': 'Speed',

    'search.placeholder': 'Search municipality…',
    'search.label': 'Search municipality',

    'map.label': 'Map of mainland Portugal by municipality',
    'map.loading': 'Loading the map…',
    'map.error': 'Could not draw the map: {error}',
    'map.zoomIn': 'Zoom in',
    'map.zoomOut': 'Zoom out',
    'map.reset': 'Show the whole country',

    'common.noData': 'no data',

    'panel.noData': 'No data',
    'panel.stale': 'IPMA has not published this series since {date}.',
    'panel.district': '{district} district',
    'panel.close': 'Close',
    'panel.noDataThisDay': 'No data on this day',
    'panel.loadingSeries': 'Loading the series…',

    'ranking.hint': 'Click a municipality to see how it evolves.',
    'ranking.highest': 'Highest values',
    'ranking.lowest': 'Lowest values',

    'chart.range': 'Period',
    'chart.range30': '30 d',
    'chart.range90': '90 d',
    'chart.range365': '1 yr',
    'chart.rangeAll': 'All',
    'chart.noData': 'No data for this municipality.',
    'chart.label': 'Daily series in {unit}',
    'chart.hint': 'Click the chart to see that day on the map.',

    'footer.source': 'Source:',
    'footer.collectedBy': 'collected by',
    'footer.mapBy': 'Map drawn with',
    'footer.updated': 'Updated {date}.',

    'settings.title': 'Settings',
    'settings.subtitle': 'Your choices are saved in this browser.',
    'settings.theme': 'Theme',
    'settings.themeHint': 'System follows your device’s light or dark setting.',
    'settings.theme.system': 'System',
    'settings.theme.light': 'Light',
    'settings.theme.dark': 'Dark',
    'settings.language': 'Language',
    'settings.languageHint': 'Changes the interface language, dates and numbers.',

    'about.title': 'About IPMA+',
    'about.intro':
        'IPMA keeps some of its weather data online for only a few weeks. IPMA+ collects it every day and keeps the full history, so you can explore how each municipality has changed over time.',
    'about.dataTitle': 'Data',
    'about.et0':
        'Reference evapotranspiration (ET0): how much water a reference crop loses in a day, in millimetres. Collected twice a day from the IPMA agrometeorology page.',
    'about.temperature':
        'Maximum and minimum temperature: from IPMA’s open data, which has not been updated since late 2025.',
    'about.howTitle': 'How to use it',
    'about.how':
        'Pick a variable and a day, hover over a municipality to see its value, and click it to see its daily history. The address bar always holds the current view, so you can share it.',
    'about.updated': 'Data last updated {date}.',
    'about.code': 'Source code on GitHub',
} as const;

export type MessageKey = keyof typeof en;
export type Messages = Record<MessageKey, string>;
