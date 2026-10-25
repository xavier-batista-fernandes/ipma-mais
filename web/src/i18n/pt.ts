import type { Messages } from './en';

/** Portuguese (Portugal) strings. Keys mirror `en.ts`. */
export const pt: Messages = {
    'app.tagline': 'Dados diários do IPMA por município',
    'app.loading': 'A carregar…',
    'app.loadError': 'Não foi possível carregar os dados: {error}',

    'nav.home': 'Início do IPMA+',
    'nav.menu': 'Menu',
    'nav.map': 'Mapa',
    'nav.about': 'Sobre',
    'nav.settings': 'Definições',

    'metric.et0': 'Evapotranspiração de referência (ET0)',
    'metric.tmax': 'Temperatura máxima',
    'metric.tmin': 'Temperatura mínima',

    'controls.metric': 'Variável',
    'controls.day': 'Dia',
    'controls.previousDay': 'Dia anterior',
    'controls.nextDay': 'Dia seguinte',
    'controls.pickDay': 'Escolher dia',

    'timeline.label': 'Linha do tempo',
    'timeline.dayOf': 'dia {day} de {total}',
    'timeline.firstDay': 'Primeiro dia',
    'timeline.lastDay': 'Último dia',
    'timeline.play': 'Reproduzir a evolução',
    'timeline.pause': 'Pausar',
    'timeline.speed': 'Velocidade',

    'search.placeholder': 'Procurar município…',
    'search.label': 'Procurar município',

    'map.label': 'Mapa de Portugal continental por município',
    'map.loading': 'A carregar o mapa…',
    'map.error': 'Não foi possível desenhar o mapa: {error}',
    'map.zoomIn': 'Aproximar',
    'map.zoomOut': 'Afastar',
    'map.reset': 'Ver o país todo',

    'common.noData': 'sem dados',

    'panel.noData': 'Sem dados',
    'panel.stale': 'O IPMA não publica esta série desde {date}.',
    'panel.district': 'Distrito de {district}',
    'panel.close': 'Fechar',
    'panel.noDataThisDay': 'Sem dados neste dia',
    'panel.loadingSeries': 'A carregar a série…',

    'ranking.hint': 'Clique num município para ver a sua evolução.',
    'ranking.highest': 'Valores mais altos',
    'ranking.lowest': 'Valores mais baixos',

    'chart.range': 'Período',
    'chart.range30': '30 d',
    'chart.range90': '90 d',
    'chart.range365': '1 ano',
    'chart.rangeAll': 'Tudo',
    'chart.noData': 'Sem dados para este município.',
    'chart.label': 'Série diária em {unit}',
    'chart.hint': 'Clique no gráfico para ver esse dia no mapa.',

    'footer.source': 'Fonte:',
    'footer.collectedBy': 'recolhido por',
    'footer.mapBy': 'Mapa desenhado com',
    'footer.updated': 'Atualizado em {date}.',

    'settings.title': 'Definições',
    'settings.subtitle': 'As suas escolhas ficam guardadas neste navegador.',
    'settings.theme': 'Tema',
    'settings.themeHint': 'Sistema segue o modo claro ou escuro do seu dispositivo.',
    'settings.theme.system': 'Sistema',
    'settings.theme.light': 'Claro',
    'settings.theme.dark': 'Escuro',
    'settings.language': 'Idioma',
    'settings.languageHint': 'Muda o idioma da interface, das datas e dos números.',

    'about.title': 'Sobre o IPMA+',
    'about.intro':
        'O IPMA mantém alguns dos seus dados meteorológicos online apenas durante algumas semanas. O IPMA+ recolhe-os todos os dias e guarda o histórico completo, para que possa explorar a evolução de cada município ao longo do tempo.',
    'about.dataTitle': 'Dados',
    'about.et0':
        'Evapotranspiração de referência (ET0): a água que uma cultura de referência perde num dia, em milímetros. Recolhida duas vezes por dia da página de agrometeorologia do IPMA.',
    'about.temperature':
        'Temperatura máxima e mínima: dos dados abertos do IPMA, que não são atualizados desde o final de 2025.',
    'about.howTitle': 'Como usar',
    'about.how':
        'Escolha uma variável e um dia, passe o cursor sobre um município para ver o seu valor e clique nele para ver o histórico diário. A barra de endereço guarda sempre a vista atual, para que a possa partilhar.',
    'about.updated': 'Dados atualizados em {date}.',
    'about.code': 'Código-fonte no GitHub',
};
