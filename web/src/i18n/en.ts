/**
 * English strings: the reference dictionary. Every key here must also exist in `pt.ts` (the
 * compiler enforces it). Use `{name}` placeholders for values passed to `t(key, { name })`.
 */
export const en = {
    'app.tagline': 'Daily IPMA data by municipality',
    'app.loading': 'Loading…',
    'app.loadError': 'Could not load the data: {error}',

    'nav.home': 'IPMA+ home',
    'nav.pages': 'Pages',
    'nav.map': 'Map',
    'nav.query': 'Queries',
    'nav.settings': 'Settings',

    'metric.et0': 'Reference evapotranspiration (ET0)',
    'metric.tmax': 'Maximum temperature',
    'metric.tmin': 'Minimum temperature',
    'metric.tmean': 'Mean temperature',
    'metric.prec': 'Precipitation',
    'metric.fire': 'Fire risk (class 1–5)',
    'metric.vhi': 'Vegetation health (VHI)',
    'metric.smi': 'Soil moisture (SMI)',

    'controls.metric': 'Variable',
    'controls.day': 'Day',
    'controls.previousDay': 'Previous day',
    'controls.nextDay': 'Next day',
    'controls.pickDay': 'Choose a day',

    'calendar.previousMonth': 'Previous month',
    'calendar.nextMonth': 'Next month',
    'calendar.onlyDataDays': 'Only days with data can be picked',
    'calendar.latest': 'Latest day',

    'timeline.label': 'Timeline',
    'timeline.dayOf': 'day {day} of {total}',
    'timeline.firstDay': 'First day',
    'timeline.lastDay': 'Last day',
    'timeline.play': 'Play how it evolves',
    'timeline.pause': 'Pause',
    'timeline.speed': 'Speed',

    'search.placeholder': 'Search municipality…',
    'search.label': 'Search municipality',
    'search.noResults': 'No municipality matches',
    'search.clear': 'Clear search',

    'map.label': 'Map of mainland Portugal by municipality',
    'map.loading': 'Loading the map…',
    'map.error': 'Could not draw the map: {error}',
    'map.zoomIn': 'Zoom in',
    'map.zoomOut': 'Zoom out',
    'map.reset': 'Show the whole country',
    'map.borders': 'Municipality borders',

    'common.noData': 'no data',
    'legend.step': 'one colour = {step}',

    'panel.noData': 'No data',
    'panel.stale': 'IPMA has not published this series since {date}.',
    'panel.district': '{district} district',
    'panel.close': 'Close',
    'panel.noDataThisDay': 'No data on this day',
    'panel.loadingSeries': 'Loading the series…',

    'ranking.hint': 'Click a municipality to see how it evolves.',
    'ranking.highest': 'Highest values',
    'ranking.lowest': 'Lowest values',

    'query.question': 'The question',
    'query.type': 'Question',
    'query.type.threshold': 'Days above or below a value',
    'query.type.total': 'Total or average over a period',
    'query.type.streak': 'Longest run of consecutive days',
    'query.type.ranking': 'Ranking on one day',
    'query.type.compare': 'Compare two periods',
    'query.comparison': 'Condition',
    'query.value': 'Value ({unit})',
    'query.minDays': 'On at least (days)',
    'query.minRun': 'For at least (days in a row)',
    'query.statistic': 'Statistic',
    'query.statistic.sum': 'Total',
    'query.statistic.mean': 'Average',
    'query.statistic.max': 'Highest day',
    'query.statistic.min': 'Lowest day',
    'query.order': 'Order',
    'query.order.desc': 'Highest first',
    'query.order.asc': 'Lowest first',
    'query.order.increase': 'Largest increase first',
    'query.order.decrease': 'Largest decrease first',
    'query.limit': 'Show',
    'query.limit.n': 'Top {count}',
    'query.limit.all': 'All',
    'query.from': 'From',
    'query.to': 'To',
    'query.baseFrom': 'Compared with, from',
    'query.baseTo': 'Compared with, to',
    'query.day': 'Day',
    'query.preset': 'Last {count} days',
    'query.loading': 'Loading every day of data…',
    'query.loadError': 'Could not load the data for queries: {error}',
    'query.hint':
        'Results update as you change the question. Click a municipality to see its history.',
    'query.streakHint': 'A day without data ends a run.',
    'query.matches': '{count} of {total} municipalities match',
    'query.shown': 'Showing {count} of {total} municipalities',
    'query.none': 'No municipality matches. Try a lower minimum or a longer period.',
    'query.notInResults': 'Not in the results',
    'query.result': 'Query result',
    'query.unitDays': 'days',
    'query.oneDay': '1 day',
    'query.manyDays': '{count} days',
    'query.hitsOf': 'of {days} days with data',
    'query.daysWithData': '{days} days with data',
    'query.runDates': '{start} – {end}',
    'query.versus': '{current} vs {base}',
    'query.describe.gt': 'above',
    'query.describe.lt': 'below',
    'query.describe.threshold': 'Days {comparison} {value}, at least {minDays}, {from} – {to}',
    'query.describe.streak':
        'Days in a row {comparison} {value}, at least {minDays}, {from} – {to}',
    'query.describe.total': '{statistic}, {from} – {to}',
    'query.describe.ranking': 'Ranking on {day}',
    'query.sentence.threshold':
        'Municipalities with {metric} {comparison} {value} on at least {minDays} {days}, from {from} to {to}',
    'query.sentence.streak':
        'Municipalities with {metric} {comparison} {value} for at least {minDays} {days} in a row, from {from} to {to}',
    'query.sentence.total':
        'Municipalities by {statistic} of {metric} from {from} to {to}, {order}, {limit}',
    'query.sentence.ranking': 'Municipalities by {metric} on {day}, {order}, {limit}',
    'query.sentence.compare':
        'Municipalities by {statistic} of {metric} from {from} to {to}, compared with {baseFrom} to {baseTo}, {order}, {limit}',
    'query.sentence.day': 'day',
    'query.sentence.days': 'days',
    'query.describe.compare': '{statistic}, {from} – {to} vs {baseFrom} – {baseTo}',

    'export.label': 'Export',
    'export.hint': 'Download the results as a table, or the map as an image.',
    'export.csv': 'CSV',
    'export.json': 'JSON',
    'export.svg': 'Map SVG',
    'export.png': 'Map PNG',
    'export.csvTitle': 'Table for spreadsheets',
    'export.jsonTitle': 'Data with the query, for scripts',
    'export.svgTitle': 'Map as a vector image',
    'export.pngTitle': 'Map as a picture',
    'export.source': 'Data: IPMA, collected by IPMA+ · {url}',

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
    'settings.borders': 'Map borders',
    'settings.bordersHint': 'Thin lines between municipalities. They stay thin at any zoom.',
    'settings.borders.off': 'Hidden',
    'settings.borders.on': 'Thin lines',

    'about.title': 'About IPMA+',
    'about.intro':
        'IPMA keeps some of its weather data online for only a few weeks. IPMA+ collects it every day and keeps the full history, so you can explore how each municipality has changed over time.',
    'about.et0':
        'Reference evapotranspiration (ET0): how much water a reference crop loses in a day, in millimetres. Collected twice a day from the IPMA agrometeorology page.',
    'about.temperature':
        'Maximum and minimum temperature: from IPMA’s open data, updated daily, since January 2000. There is no data from 12 November 2025 to 21 October 2026. Mean temperature starts in October 2026.',
    'about.precipitation':
        'Precipitation: the total rain in a day, in millimetres, from IPMA’s open data, updated daily, since January 2000. There is no data from 12 November 2025 to 19 October 2026.',
    'about.fire':
        'Fire risk: IPMA’s daily forecast of rural fire risk, from 1 (reduced) to 5 (maximum). IPMA keeps no history, so IPMA+ stores each day’s forecast from November 2026 on. The newest day is tomorrow’s forecast.',
    'about.vhi':
        'Vegetation health index (VHI): how healthy the vegetation looks from satellite, from 0 to 100; below 35 means drought stress. One value a week since January 2018, from IPMA’s map server.',
    'about.smi':
        'Soil moisture (SMI): how much water the soil holds, from 0% (wilting point) to 100% (field capacity), from IPMA’s ECMWF-based product. Daily, from November 2026 on, read at a point inside each municipality.',
    'about.how':
        'Pick a variable and a day, tap or hover over a municipality to see its value, and open it to see its daily history. Open Queries to ask questions over a period, such as which municipalities went above a value, for how many days in a row, or how a period compares with another, and export the results as a table or a map image. The address bar always holds the current view, so you can share it.',
    'about.code': 'Source code on GitHub',
    'chart.thisYear': 'This period',
    'chart.yearBefore': 'A year earlier',
    'municipality.open': 'Open the municipality page',
    'municipality.notFound': 'There is no municipality at this address',
    'municipality.backToMap': 'Back to the map',
    'municipality.code': 'DICO {code}',
    'municipality.since': 'data since {date}',
    'municipality.follow': 'Follow',
    'municipality.following': 'Following',
    'municipality.followHint':
        'Followed municipalities are saved in this browser and shown on the map page.',
    'municipality.showOnMap': 'Show on the map',
    'municipality.csv': 'CSV',
    'municipality.summary': 'Summary',
    'municipality.lastDay': 'Latest day · {date}',
    'municipality.vsCountry': '{diff} vs the country’s average',
    'municipality.week.sum': 'Last 7 days · total',
    'municipality.week.mean': 'Last 7 days · average',
    'municipality.vsWeek': '{diff} vs the 7 days before',
    'municipality.daysWithData': '{days} of {total} days with data',
    'municipality.month.sum': '{month} 1–{day} · total',
    'municipality.month.mean': '{month} 1–{day} · average',
    'municipality.vsPeriod': '{diff} vs the same days of {period}',
    'municipality.noLastYear': 'No data for {period}',
    'municipality.highest': 'Highest on record',
    'municipality.lowest': 'Lowest on record',
    'municipality.daily': 'Daily value',
    'municipality.monthly.sum': 'Total per month',
    'municipality.monthly.mean': 'Average per month',
    'municipality.monthlyHint': 'Lighter bars: months with days missing.',
    'municipality.location': 'Location',
    'municipality.districtOn': '{district} district on {date}',
    'following.title': 'Following',
    'nav.municipalities': 'Municipalities',
    'nav.data': 'Data',
    'municipalities.title': 'Municipalities',
    'municipalities.subtitle':
        'The {count} municipalities of mainland Portugal · {metric} on {date}',
    'municipalities.filter': 'Filter',
    'municipalities.filterPlaceholder': 'Name or district',
    'municipalities.districts': 'Districts',
    'municipalities.order': 'Order',
    'municipalities.order.district': 'By district',
    'municipalities.order.name': 'A–Z',
    'municipalities.order.value': 'Value',
    'municipalities.follow': 'Follow {name}',
    'municipalities.unfollow': 'Stop following {name}',
    'municipalities.vsCountry': '{diff} vs country',
    'data.title': 'Data and API',
    'data.variables': 'Variables',
    'data.days': '{count} days',
    'data.current': 'Updated twice a day',
    'data.archive': 'Archive: nothing new since {date}',
    'data.lastCollection': 'Last collection: {date}',
    'data.coverage': 'Days with data',
    'data.coverageHint': 'One square per day. Gaps are days IPMA published nothing for.',
    'data.coverageLabel': 'Calendar of days with data, {missing} days missing',
    'data.withData': 'with data',
    'data.withoutData': 'no data ({count} days)',
    'data.api': 'Public API',
    'data.apiIntro':
        'Everything in the app comes from a free JSON API you can use too. No key is needed, it allows cross-origin requests, and each address can make up to 600 requests a minute.',
    'data.api.index': 'Variables with their dates, municipalities and collection status',
    'data.api.latest': "Every municipality's value on the latest day",
    'data.api.series': "One municipality's daily values",
    'data.api.values': 'Every municipality × every day, for analysis',
    'data.api.stats': 'Totals and averages per municipality over a period (from, to)',
    'data.docs': 'Full API documentation',
    'nav.variables': 'Variables',

    'home.title': 'Weather and climate for every municipality in mainland Portugal',
    'home.lead':
        'IPMA+ collects IPMA’s daily data for the 278 municipalities every day and keeps the full history, so you can see today’s values, look back and compare.',
    'home.search': 'Find your municipality',
    'home.updated': 'Data updated {date}',
    'home.latest': 'The latest day',
    'home.latestHint':
        'Each variable on the last day IPMA published it. Open one to explore it on the map.',
    'home.average': 'Country average',
    'home.highest': 'Highest',
    'home.lowest': 'Lowest',
    'home.openMap': 'See on the map',
    'home.about': 'What is it?',
    'home.following': 'Your municipalities',
    'home.followingHint': 'Follow a municipality on its page to keep it here.',
    'home.explore': 'Explore',
    'home.explore.map': 'Every municipality on one day, and how it evolves day by day.',
    'home.explore.municipalities': 'The full list, with the latest value and the last 30 days.',
    'home.explore.query': 'Questions over a period: rankings, streaks, comparisons and exports.',
    'home.explore.data': 'Where the data comes from, what is missing, and the free API.',
    'home.variables': 'What the variables mean',
    'home.variablesHint': 'What each one measures, how to read its values and where it comes from.',
    'home.stale': 'Archive, up to {date}',

    'variable.group.water': 'Water',
    'variable.group.temperature': 'Temperature',
    'variable.group.vegetation': 'Vegetation',
    'variable.group.fire': 'Fire',
    'variable.cadence.daily': 'Daily',
    'variable.cadence.weekly': 'Weekly',
    'variable.method.stations': 'Weather stations',
    'variable.method.satellite': 'Satellite',
    'variable.method.forecast': 'Forecast',
    'variable.method.model': 'Model',
    'variable.aggregate.sum': 'Adds up over a period',
    'variable.aggregate.mean': 'Averaged over a period',
    'variable.what': 'What it measures',
    'variable.read': 'How to read the values',
    'variable.uses': 'What it is useful for',
    'variable.source': 'Where it comes from',
    'variable.sourceLink': 'More at IPMA',
    'variable.scale': 'Map colours',
    'variable.scaleHint': 'The same colour always means the same value, on every day.',
    'variable.latest': 'On {date}',
    'variable.history': 'History',
    'variable.historyValue': '{first} → {last} · {count} days',
    'variable.openMap': 'See on the map',
    'variable.openQuery': 'Ask a question',
    'variable.others': 'Other variables',
    'variable.notFound': 'There is no variable at this address',
    'variable.info': 'What does {name} mean?',
    'variables.title': 'Variables',
    'variables.lead':
        'What each variable in IPMA+ measures, how to read it and where it comes from.',

    'metricInfo.et0.summary': 'How much water the soil and plants lose to the air in a day.',
    'metricInfo.et0.what':
        'Reference evapotranspiration is the water a well-watered grass lawn would lose in a day, by evaporation from the soil and transpiration through its leaves. It depends only on the weather (sun, temperature, humidity and wind), not on any particular crop, so it measures how “thirsty” the air was. It is given in millimetres: 1 mm is one litre of water per square metre.',
    'metricInfo.et0.read':
        'In mainland Portugal it goes from under 1 mm a day on cloudy winter days to 6–8 mm on hot, dry, windy summer days. Higher values mean the air takes more water from the soil. Over a period it adds up: a week at 5 mm a day is 35 mm, or 35 litres per square metre.',
    'metricInfo.et0.uses':
        'Planning irrigation. A crop needs roughly ET0 × its crop coefficient (Kc), minus the rain that fell, so comparing ET0 with rainfall shows how much water is missing. It is also a good everyday index of drying conditions.',
    'metricInfo.et0.source':
        'Calculated by IPMA with the FAO Penman-Monteith method from weather station observations and interpolated to each municipality. IPMA+ collects it twice a day from the IPMA agrometeorology page.',

    'metricInfo.tmax.summary': 'The highest air temperature of the day.',
    'metricInfo.tmax.what':
        'The highest temperature the air reached during the day, measured in the shade at 2 metres above the ground, averaged over the municipality’s area.',
    'metricInfo.tmax.read':
        'IPMA calls a day with a maximum above 25 °C a summer day, and one at or above 35 °C a very hot day. Inland municipalities in the Alentejo and the Douro valley are usually the hottest in summer; the coast and the mountains are milder. Over a period the app shows the average of the daily maxima.',
    'metricInfo.tmax.uses':
        'Following heat waves and hot spells, heat stress for people, animals and crops, and comparing a period with the same time a year earlier.',
    'metricInfo.tmax.source':
        'IPMA open data: weather station observations interpolated to each municipality (inverse distance weighting), published daily. Before May 2025, only the municipality’s mean is available, not its range. There is no data from 12 November 2025 to 21 October 2026.',

    'metricInfo.tmin.summary': 'The lowest air temperature of the day, usually around dawn.',
    'metricInfo.tmin.what':
        'The lowest temperature the air reached during the day, usually just before sunrise, measured in the shade at 2 metres above the ground and averaged over the municipality’s area.',
    'metricInfo.tmin.read':
        'Below 0 °C there is a risk of frost, mostly in the interior north and centre in winter. IPMA calls a night with a minimum at or above 20 °C a tropical night. The record that matters most is the lowest value. Over a period the app shows the average of the daily minima.',
    'metricInfo.tmin.uses':
        'Frost risk for crops, cold spells, tropical nights during heat waves and the chill hours fruit trees need in winter.',
    'metricInfo.tmin.source':
        'IPMA open data: weather station observations interpolated to each municipality (inverse distance weighting), published daily. Before May 2025, only the municipality’s mean is available, not its range. There is no data from 12 November 2025 to 21 October 2026.',

    'metricInfo.tmean.summary': 'The average air temperature over the whole day.',
    'metricInfo.tmean.what':
        'The average temperature of the air over the day and night, measured in the shade at 2 metres above the ground and averaged over the municipality’s area.',
    'metricInfo.tmean.read':
        'It sits between the minimum and the maximum, and changes more slowly than either. In mainland Portugal it goes from around 5 °C in winter in the interior to 25–28 °C in summer. Over a period the app shows the average.',
    'metricInfo.tmean.uses':
        'Comparing how warm periods and places are overall, and growing degree days for crops (days above a base temperature).',
    'metricInfo.tmean.source':
        'IPMA open data: weather station observations interpolated to each municipality (inverse distance weighting), published daily.',

    'metricInfo.prec.summary': 'How much rain fell in the day.',
    'metricInfo.prec.what':
        'The total precipitation (rain, and the rare snow or hail as water) that fell during the day, in millimetres: 1 mm is one litre of water per square metre.',
    'metricInfo.prec.read':
        '0 mm is a dry day. Under 1 mm is little more than a drizzle; 10 mm is a properly rainy day; above 30–40 mm in a day is heavy rain. Over a period it adds up, so a month’s total can be compared with ET0 to see whether the soil gained or lost water.',
    'metricInfo.prec.uses':
        'Following droughts and wet spells, deciding when to irrigate, and comparing a season with the year before.',
    'metricInfo.prec.source':
        'IPMA open data: weather station and rain gauge observations interpolated to each municipality, published daily, since January 2000. Before August 2025, only the municipality’s mean is available, not its range.',

    'metricInfo.vhi.summary': 'How healthy the vegetation looks from space, from 0 to 100.',
    'metricInfo.vhi.what':
        'The Vegetation Health Index combines two satellite measurements: how green and dense the vegetation is compared with the same week in other years, and how hot the land surface is. It goes from 0 (very stressed vegetation) to 100 (very healthy), and is calculated for each week.',
    'metricInfo.vhi.read':
        'Below 40 the vegetation is under stress, usually from drought or heat; below 20 the stress is severe and below 10 extreme. Above 60 conditions are good. Because each week is compared with the same week in other years, a low value in August means a worse August than usual, not just summer.',
    'metricInfo.vhi.uses':
        'Spotting agricultural drought before it shows in yields, following how pastures and forests recover after rain, and judging how dry the vegetation is ahead of the fire season.',
    'metricInfo.vhi.source':
        'IPMA, from satellite images, averaged over each municipality and published weekly on the IPMA agrometeorology pages.',

    'metricInfo.fire.summary': 'IPMA’s rural fire danger class for the day, from 1 to 5.',
    'metricInfo.fire.what':
        'The rural fire danger forecast: how easily a fire could start and spread in the municipality that day. It combines the weather (temperature, humidity, wind and how long since it rained) with the land’s own danger (vegetation and terrain).',
    'metricInfo.fire.read':
        '1 low, 2 moderate, 3 high, 4 very high, 5 maximum. Classes 4 and 5 usually come with restrictions on burning, machinery and access to forests. Each day IPMA+ keeps the forecast for that day.',
    'metricInfo.fire.uses':
        'Knowing whether burning or work with machinery is allowed, and following how the danger builds up through the summer.',
    'metricInfo.fire.source':
        'IPMA rural fire danger forecast, issued every day for today and the next days. IPMA does not keep old forecasts, so the history starts on the day IPMA+ began collecting it.',

    'metricInfo.smi.summary': 'How much water the soil holds that plants can use, from 0 to 1.',
    'metricInfo.smi.what':
        'The Soil Moisture Index measures the water in the root zone that plants can still take up: 0 is the wilting point (plants can’t extract any more) and 1 is field capacity (the soil holds all it can after draining).',
    'metricInfo.smi.read':
        'Near 1 the soil is wet; below about 0.4 plants start to feel the lack of water; near 0 they can’t take up any. It rises after rain and falls on dry, sunny days.',
    'metricInfo.smi.uses': 'Deciding when to irrigate or sow, and following agricultural drought.',
    'metricInfo.smi.source':
        'IPMA, from a weather model (ECMWF) run over a grid, sampled at each municipality.',
} as const;

export type MessageKey = keyof typeof en;
export type Messages = Record<MessageKey, string>;
