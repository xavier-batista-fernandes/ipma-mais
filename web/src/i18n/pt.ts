import type { Messages } from './en';

/** Portuguese (Portugal) strings. Keys mirror `en.ts`. */
export const pt: Messages = {
    'app.tagline': 'Dados diários do IPMA por município',
    'app.loading': 'A carregar…',
    'app.loadError': 'Não foi possível carregar os dados: {error}',

    'nav.home': 'Início do IPMA+',
    'nav.pages': 'Páginas',
    'nav.map': 'Mapa',
    'nav.query': 'Consultas',
    'nav.settings': 'Definições',

    'metric.et0': 'Evapotranspiração de referência (ET0)',
    'metric.tmax': 'Temperatura máxima',
    'metric.tmin': 'Temperatura mínima',
    'metric.tmean': 'Temperatura média',
    'metric.prec': 'Precipitação',
    'metric.fire': 'Risco de incêndio (classe 1–5)',
    'metric.vhi': 'Saúde da vegetação (VHI)',
    'metric.smi': 'Água no solo (SMI)',

    'controls.metric': 'Variável',
    'controls.day': 'Dia',
    'controls.previousDay': 'Dia anterior',
    'controls.nextDay': 'Dia seguinte',
    'controls.pickDay': 'Escolher dia',

    'calendar.previousMonth': 'Mês anterior',
    'calendar.nextMonth': 'Mês seguinte',
    'calendar.onlyDataDays': 'Só pode escolher dias com dados',
    'calendar.latest': 'Último dia',

    'timeline.label': 'Linha do tempo',
    'timeline.dayOf': 'dia {day} de {total}',
    'timeline.firstDay': 'Primeiro dia',
    'timeline.lastDay': 'Último dia',
    'timeline.play': 'Reproduzir a evolução',
    'timeline.pause': 'Pausar',
    'timeline.speed': 'Velocidade',

    'search.placeholder': 'Procurar município…',
    'search.label': 'Procurar município',
    'search.noResults': 'Nenhum município encontrado',
    'search.clear': 'Limpar pesquisa',

    'map.label': 'Mapa de Portugal continental por município',
    'map.loading': 'A carregar o mapa…',
    'map.error': 'Não foi possível desenhar o mapa: {error}',
    'map.zoomIn': 'Aproximar',
    'map.zoomOut': 'Afastar',
    'map.reset': 'Ver o país todo',
    'map.borders': 'Limites dos concelhos',

    'common.noData': 'sem dados',
    'legend.step': 'uma cor = {step}',

    'panel.noData': 'Sem dados',
    'panel.stale': 'O IPMA não publica esta série desde {date}.',
    'panel.district': 'Distrito de {district}',
    'panel.close': 'Fechar',
    'panel.noDataThisDay': 'Sem dados neste dia',
    'panel.loadingSeries': 'A carregar a série…',

    'ranking.hint': 'Clique num município para ver a sua evolução.',
    'ranking.highest': 'Valores mais altos',
    'ranking.lowest': 'Valores mais baixos',

    'query.question': 'A pergunta',
    'query.type': 'Pergunta',
    'query.type.threshold': 'Dias acima ou abaixo de um valor',
    'query.type.total': 'Total ou média num período',
    'query.type.streak': 'Maior sequência de dias seguidos',
    'query.type.ranking': 'Classificação num dia',
    'query.type.compare': 'Comparar dois períodos',
    'query.comparison': 'Condição',
    'query.comparison.gt': 'Acima de',
    'query.comparison.lt': 'Abaixo de',
    'query.value': 'Valor ({unit})',
    'query.minDays': 'Em pelo menos (dias)',
    'query.minRun': 'Durante pelo menos (dias seguidos)',
    'query.statistic': 'Estatística',
    'query.statistic.sum': 'Total',
    'query.statistic.mean': 'Média',
    'query.statistic.max': 'Dia mais alto',
    'query.statistic.min': 'Dia mais baixo',
    'query.order': 'Ordem',
    'query.order.desc': 'Mais altos primeiro',
    'query.order.asc': 'Mais baixos primeiro',
    'query.order.increase': 'Maior subida primeiro',
    'query.order.decrease': 'Maior descida primeiro',
    'query.limit': 'Mostrar',
    'query.limit.n': 'Primeiros {count}',
    'query.limit.all': 'Todos',
    'query.period': 'Período',
    'query.basePeriod': 'Comparado com',
    'query.from': 'De',
    'query.to': 'Até',
    'query.baseFrom': 'Comparado com, de',
    'query.baseTo': 'Comparado com, até',
    'query.day': 'Dia',
    'query.preset': 'Últimos {count} dias',
    'query.loading': 'A carregar todos os dias de dados…',
    'query.loadError': 'Não foi possível carregar os dados para consultas: {error}',
    'query.hint':
        'Os resultados atualizam-se à medida que muda a pergunta. Clique num município para ver o seu histórico.',
    'query.streakHint': 'Um dia sem dados interrompe a sequência.',
    'query.matches': '{count} de {total} municípios correspondem',
    'query.shown': 'A mostrar {count} de {total} municípios',
    'query.none':
        'Nenhum município corresponde. Experimente um mínimo mais baixo ou um período mais longo.',
    'query.notInResults': 'Fora dos resultados',
    'query.result': 'Resultado da consulta',
    'query.unitDays': 'dias',
    'query.oneDay': '1 dia',
    'query.manyDays': '{count} dias',
    'query.hitsOf': 'de {days} dias com dados',
    'query.daysWithData': '{days} dias com dados',
    'query.runDates': '{start} – {end}',
    'query.versus': '{current} vs {base}',
    'query.describe.gt': 'acima de',
    'query.describe.lt': 'abaixo de',
    'query.describe.threshold': 'Dias {comparison} {value}, pelo menos {minDays}, {from} – {to}',
    'query.describe.streak':
        'Dias seguidos {comparison} {value}, pelo menos {minDays}, {from} – {to}',
    'query.describe.total': '{statistic}, {from} – {to}',
    'query.describe.ranking': 'Classificação em {day}',
    'query.describe.compare': '{statistic}, {from} – {to} vs {baseFrom} – {baseTo}',

    'export.label': 'Exportar',
    'export.hint': 'Descarregue os resultados como tabela, ou o mapa como imagem.',
    'export.csv': 'CSV',
    'export.json': 'JSON',
    'export.svg': 'Mapa SVG',
    'export.png': 'Mapa PNG',
    'export.csvTitle': 'Tabela para folhas de cálculo',
    'export.jsonTitle': 'Dados com a consulta, para scripts',
    'export.svgTitle': 'Mapa como imagem vetorial',
    'export.pngTitle': 'Mapa como imagem',
    'export.source': 'Dados: IPMA, recolhidos pelo IPMA+ · {url}',

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
    'settings.borders': 'Limites no mapa',
    'settings.bordersHint': 'Linhas finas entre concelhos. Mantêm-se finas em qualquer zoom.',
    'settings.borders.off': 'Ocultos',
    'settings.borders.on': 'Linhas finas',

    'about.title': 'Sobre o IPMA+',
    'about.intro':
        'O IPMA mantém alguns dos seus dados meteorológicos online apenas durante algumas semanas. O IPMA+ recolhe-os todos os dias e guarda o histórico completo, para que possa explorar a evolução de cada município ao longo do tempo.',
    'about.et0':
        'Evapotranspiração de referência (ET0): a água que uma cultura de referência perde num dia, em milímetros. Recolhida duas vezes por dia da página de agrometeorologia do IPMA.',
    'about.temperature':
        'Temperatura máxima e mínima: dos dados abertos do IPMA, atualizados diariamente, desde janeiro de 2000. Não há dados de 12 de novembro de 2025 a 21 de outubro de 2026. A temperatura média começa em outubro de 2026.',
    'about.precipitation':
        'Precipitação: a chuva total de um dia, em milímetros, dos dados abertos do IPMA, atualizados diariamente, desde janeiro de 2000. Não há dados de 12 de novembro de 2025 a 19 de outubro de 2026.',
    'about.fire':
        'Risco de incêndio: a previsão diária do IPMA para o risco de incêndio rural, de 1 (reduzido) a 5 (máximo). O IPMA não guarda histórico, por isso o IPMA+ guarda a previsão de cada dia a partir de novembro de 2026. O dia mais recente é a previsão para amanhã.',
    'about.vhi':
        'Índice de saúde da vegetação (VHI): o estado da vegetação visto por satélite, de 0 a 100; abaixo de 35 indica stress por seca. Um valor por semana desde janeiro de 2018, do servidor de mapas do IPMA.',
    'about.smi':
        'Água no solo (SMI): a água que o solo tem, de 0% (ponto de emurchecimento) a 100% (capacidade de campo), do produto do IPMA baseado no ECMWF. Diário, a partir de novembro de 2026, lido num ponto dentro de cada município.',
    'about.how':
        'Escolha uma variável e um dia, toque num município ou passe-lhe o cursor por cima para ver o seu valor e abra-o para ver o histórico diário. Abra Consultas para fazer perguntas sobre um período, como que municípios ultrapassaram um valor, durante quantos dias seguidos, ou como um período se compara com outro, e exporte os resultados como tabela ou imagem do mapa. A barra de endereço guarda sempre a vista atual, para que a possa partilhar.',
    'about.code': 'Código-fonte no GitHub',
    'chart.thisYear': 'Este período',
    'chart.yearBefore': 'Um ano antes',
    'municipality.open': 'Abrir a página do município',
    'municipality.notFound': 'Não há nenhum município neste endereço',
    'municipality.backToMap': 'Voltar ao mapa',
    'municipality.code': 'DICO {code}',
    'municipality.since': 'dados desde {date}',
    'municipality.follow': 'Seguir',
    'municipality.following': 'A seguir',
    'municipality.followHint':
        'Os municípios que segue ficam guardados neste navegador e aparecem na página do mapa.',
    'municipality.showOnMap': 'Ver no mapa',
    'municipality.csv': 'CSV',
    'municipality.summary': 'Resumo',
    'municipality.lastDay': 'Último dia · {date}',
    'municipality.vsCountry': '{diff} face à média do país',
    'municipality.week.sum': 'Últimos 7 dias · total',
    'municipality.week.mean': 'Últimos 7 dias · média',
    'municipality.vsWeek': '{diff} face aos 7 dias anteriores',
    'municipality.daysWithData': '{days} de {total} dias com dados',
    'municipality.month.sum': '{month} até dia {day} · total',
    'municipality.month.mean': '{month} até dia {day} · média',
    'municipality.vsPeriod': '{diff} face aos mesmos dias de {period}',
    'municipality.noLastYear': 'Sem dados de {period}',
    'municipality.highest': 'Máximo registado',
    'municipality.lowest': 'Mínimo registado',
    'municipality.daily': 'Valor diário',
    'municipality.monthly.sum': 'Total por mês',
    'municipality.monthly.mean': 'Média por mês',
    'municipality.monthlyHint': 'Barras mais claras: meses com dias em falta.',
    'municipality.location': 'Localização',
    'municipality.districtOn': 'Distrito de {district} em {date}',
    'following.title': 'A seguir',
    'nav.municipalities': 'Municípios',
    'nav.data': 'Dados',
    'municipalities.title': 'Municípios',
    'municipalities.subtitle': 'Os {count} municípios de Portugal continental · {metric} em {date}',
    'municipalities.filter': 'Filtrar',
    'municipalities.filterPlaceholder': 'Nome ou distrito',
    'municipalities.order': 'Ordem',
    'municipalities.order.district': 'Por distrito',
    'municipalities.order.name': 'A–Z',
    'municipalities.order.value': 'Valor',
    'municipalities.follow': 'Seguir {name}',
    'municipalities.unfollow': 'Deixar de seguir {name}',
    'municipalities.vsCountry': '{diff} face ao país',
    'data.title': 'Dados e API',
    'data.variables': 'Variáveis',
    'data.days': '{count} dias',
    'data.current': 'Atualizada duas vezes por dia',
    'data.archive': 'Arquivo: nada de novo desde {date}',
    'data.lastCollection': 'Última recolha: {date}',
    'data.coverage': 'Dias com dados',
    'data.coverageHint': 'Um quadrado por dia. As falhas são dias em que o IPMA não publicou nada.',
    'data.coverageLabel': 'Calendário dos dias com dados, faltam {missing} dias',
    'data.withData': 'com dados',
    'data.withoutData': 'sem dados ({count} dias)',
    'data.api': 'API pública',
    'data.apiIntro':
        'Tudo o que a app mostra vem de uma API JSON gratuita que também pode usar. Não precisa de chave, aceita pedidos de outros sites e cada endereço pode fazer até 600 pedidos por minuto.',
    'data.api.index': 'Variáveis com as suas datas, municípios e estado da recolha',
    'data.api.latest': 'O valor de cada município no último dia',
    'data.api.series': 'Os valores diários de um município',
    'data.api.values': 'Todos os municípios × todos os dias, para análise',
    'data.api.stats': 'Totais e médias por município num período (from, to)',
    'data.docs': 'Documentação completa da API',
    'nav.start': 'Início',
    'nav.variables': 'Variáveis',

    'home.title': 'Tempo e clima em cada município de Portugal continental',
    'home.lead':
        'O IPMA+ recolhe todos os dias os dados diários do IPMA para os 278 municípios e guarda o histórico completo, para que possa ver os valores de hoje, olhar para trás e comparar.',
    'home.search': 'Encontre o seu município',
    'home.updated': 'Dados atualizados {date}',
    'home.latest': 'O último dia',
    'home.latestHint':
        'Cada variável no último dia publicado pelo IPMA. Abra uma para a explorar no mapa.',
    'home.average': 'Média do país',
    'home.highest': 'Mais alto',
    'home.lowest': 'Mais baixo',
    'home.openMap': 'Ver no mapa',
    'home.about': 'O que é?',
    'home.following': 'Os seus municípios',
    'home.followingHint': 'Siga um município na sua página para o manter aqui.',
    'home.explore': 'Explorar',
    'home.explore.map': 'Todos os municípios num dia, e como evoluem dia a dia.',
    'home.explore.municipalities': 'A lista completa, com o último valor e os últimos 30 dias.',
    'home.explore.query':
        'Perguntas sobre um período: rankings, sequências, comparações e exportação.',
    'home.explore.data': 'De onde vêm os dados, o que falta e a API gratuita.',
    'home.variables': 'O que significam as variáveis',
    'home.variablesHint': 'O que cada uma mede, como ler os valores e de onde vem.',
    'home.stale': 'Arquivo, até {date}',

    'variable.group.water': 'Água',
    'variable.group.temperature': 'Temperatura',
    'variable.group.vegetation': 'Vegetação',
    'variable.group.fire': 'Incêndios',
    'variable.cadence.daily': 'Diária',
    'variable.cadence.weekly': 'Semanal',
    'variable.method.stations': 'Estações meteorológicas',
    'variable.method.satellite': 'Satélite',
    'variable.method.forecast': 'Previsão',
    'variable.method.model': 'Modelo',
    'variable.aggregate.sum': 'Soma-se ao longo de um período',
    'variable.aggregate.mean': 'Faz-se a média ao longo de um período',
    'variable.what': 'O que mede',
    'variable.read': 'Como ler os valores',
    'variable.uses': 'Para que serve',
    'variable.source': 'De onde vem',
    'variable.sourceLink': 'Mais no IPMA',
    'variable.scale': 'Cores do mapa',
    'variable.scaleHint': 'A mesma cor significa sempre o mesmo valor, em qualquer dia.',
    'variable.latest': 'Em {date}',
    'variable.history': 'Histórico',
    'variable.historyValue': '{first} → {last} · {count} dias',
    'variable.openMap': 'Ver no mapa',
    'variable.openQuery': 'Fazer uma consulta',
    'variable.others': 'Outras variáveis',
    'variable.notFound': 'Não há nenhuma variável neste endereço',
    'variable.info': 'O que significa {name}?',
    'variables.title': 'Variáveis',
    'variables.lead': 'O que mede cada variável do IPMA+, como a ler e de onde vem.',

    'metricInfo.et0.summary': 'Quanta água o solo e as plantas perdem para o ar num dia.',
    'metricInfo.et0.what':
        'A evapotranspiração de referência é a água que um relvado bem regado perderia num dia, por evaporação do solo e transpiração das folhas. Depende só do tempo (sol, temperatura, humidade e vento) e não de uma cultura em particular, por isso mede a “sede” do ar. É dada em milímetros: 1 mm é um litro de água por metro quadrado.',
    'metricInfo.et0.read':
        'Em Portugal continental vai de menos de 1 mm por dia em dias de inverno nublados a 6–8 mm em dias de verão quentes, secos e ventosos. Valores mais altos significam que o ar tira mais água ao solo. Ao longo de um período soma-se: uma semana a 5 mm por dia são 35 mm, ou 35 litros por metro quadrado.',
    'metricInfo.et0.uses':
        'Planear a rega. Uma cultura precisa de cerca de ET0 × o seu coeficiente cultural (Kc), menos a chuva que caiu, por isso comparar a ET0 com a precipitação mostra quanta água falta. É também um bom índice diário de quão secas estão as condições.',
    'metricInfo.et0.source':
        'Calculada pelo IPMA com o método FAO Penman-Monteith a partir das observações das estações meteorológicas e interpolada para cada município. O IPMA+ recolhe-a duas vezes por dia da página de agrometeorologia do IPMA.',

    'metricInfo.tmax.summary': 'A temperatura do ar mais alta do dia.',
    'metricInfo.tmax.what':
        'A temperatura mais alta que o ar atingiu durante o dia, medida à sombra a 2 metros do solo, em média sobre a área do município.',
    'metricInfo.tmax.read':
        'O IPMA chama dia de verão a um dia com máxima acima de 25 °C, e dia muito quente a um com 35 °C ou mais. Os municípios do interior do Alentejo e do vale do Douro são normalmente os mais quentes no verão; o litoral e as serras são mais amenos. Num período, a app mostra a média das máximas diárias.',
    'metricInfo.tmax.uses':
        'Acompanhar ondas de calor e períodos quentes, o stress térmico em pessoas, animais e culturas, e comparar um período com a mesma altura do ano anterior.',
    'metricInfo.tmax.source':
        'Dados abertos do IPMA: observações das estações meteorológicas interpoladas para cada município (inverso da distância), publicadas diariamente. Antes de maio de 2025 só há a média do município, não o intervalo. Não há dados de 12 de novembro de 2025 a 21 de outubro de 2026.',

    'metricInfo.tmin.summary': 'A temperatura do ar mais baixa do dia, normalmente de madrugada.',
    'metricInfo.tmin.what':
        'A temperatura mais baixa que o ar atingiu durante o dia, normalmente pouco antes do nascer do sol, medida à sombra a 2 metros do solo e em média sobre a área do município.',
    'metricInfo.tmin.read':
        'Abaixo de 0 °C há risco de geada, sobretudo no interior norte e centro no inverno. O IPMA chama noite tropical a uma noite com mínima de 20 °C ou mais. O recorde que mais interessa é o valor mais baixo. Num período, a app mostra a média das mínimas diárias.',
    'metricInfo.tmin.uses':
        'Risco de geada para as culturas, vagas de frio, noites tropicais durante as ondas de calor e as horas de frio de que as árvores de fruto precisam no inverno.',
    'metricInfo.tmin.source':
        'Dados abertos do IPMA: observações das estações meteorológicas interpoladas para cada município (inverso da distância), publicadas diariamente. Antes de maio de 2025 só há a média do município, não o intervalo. Não há dados de 12 de novembro de 2025 a 21 de outubro de 2026.',

    'metricInfo.tmean.summary': 'A temperatura média do ar ao longo do dia.',
    'metricInfo.tmean.what':
        'A temperatura média do ar ao longo do dia e da noite, medida à sombra a 2 metros do solo e em média sobre a área do município.',
    'metricInfo.tmean.read':
        'Fica entre a mínima e a máxima e varia mais devagar do que qualquer uma delas. Em Portugal continental vai de cerca de 5 °C no inverno no interior a 25–28 °C no verão. Num período, a app mostra a média.',
    'metricInfo.tmean.uses':
        'Comparar quão quentes são, no geral, diferentes períodos e locais, e calcular graus-dia para as culturas (dias acima de uma temperatura base).',
    'metricInfo.tmean.source':
        'Dados abertos do IPMA: observações das estações meteorológicas interpoladas para cada município (inverso da distância), publicadas diariamente.',

    'metricInfo.prec.summary': 'Quanta chuva caiu no dia.',
    'metricInfo.prec.what':
        'A precipitação total (chuva e, raramente, neve ou granizo em água) que caiu durante o dia, em milímetros: 1 mm é um litro de água por metro quadrado.',
    'metricInfo.prec.read':
        '0 mm é um dia seco. Menos de 1 mm é pouco mais do que um chuvisco; 10 mm é um dia de chuva a sério; acima de 30–40 mm num dia é chuva forte. Ao longo de um período soma-se, por isso o total de um mês pode ser comparado com a ET0 para ver se o solo ganhou ou perdeu água.',
    'metricInfo.prec.uses':
        'Acompanhar secas e períodos chuvosos, decidir quando regar e comparar uma estação com a do ano anterior.',
    'metricInfo.prec.source':
        'Dados abertos do IPMA: observações das estações meteorológicas e udómetros interpoladas para cada município, publicadas diariamente, desde janeiro de 2000. Antes de agosto de 2025 só há a média do município, não o intervalo.',

    'metricInfo.vhi.summary': 'Quão saudável a vegetação parece vista do espaço, de 0 a 100.',
    'metricInfo.vhi.what':
        'O Índice de Saúde da Vegetação (VHI) junta duas medições de satélite: quão verde e densa está a vegetação em comparação com a mesma semana noutros anos, e quão quente está a superfície. Vai de 0 (vegetação muito afetada) a 100 (muito saudável) e é calculado para cada semana.',
    'metricInfo.vhi.read':
        'Abaixo de 40 a vegetação está em stress, normalmente por seca ou calor; abaixo de 20 o stress é severo e abaixo de 10 extremo. Acima de 60 as condições são boas. Como cada semana é comparada com a mesma semana noutros anos, um valor baixo em agosto significa um agosto pior do que o habitual, não apenas verão.',
    'metricInfo.vhi.uses':
        'Detetar a seca agrícola antes de se notar nas colheitas, acompanhar a recuperação de pastagens e florestas depois da chuva e avaliar quão seca está a vegetação antes da época de incêndios.',
    'metricInfo.vhi.source':
        'IPMA, a partir de imagens de satélite, em média sobre cada município e publicado semanalmente nas páginas de agrometeorologia do IPMA.',

    'metricInfo.fire.summary': 'A classe de perigo de incêndio rural do IPMA para o dia, de 1 a 5.',
    'metricInfo.fire.what':
        'A previsão do perigo de incêndio rural: com que facilidade um incêndio poderia começar e propagar-se no município nesse dia. Junta o tempo (temperatura, humidade, vento e há quanto tempo choveu) com o perigo próprio do território (vegetação e relevo).',
    'metricInfo.fire.read':
        '1 reduzido, 2 moderado, 3 elevado, 4 muito elevado, 5 máximo. As classes 4 e 5 trazem normalmente restrições a queimas, uso de maquinaria e acesso às florestas. Todos os dias o IPMA+ guarda a previsão para esse dia.',
    'metricInfo.fire.uses':
        'Saber se é permitido fazer queimas ou trabalhar com maquinaria, e acompanhar como o perigo aumenta ao longo do verão.',
    'metricInfo.fire.source':
        'Previsão do perigo de incêndio rural do IPMA, emitida todos os dias para hoje e os dias seguintes. O IPMA não guarda as previsões antigas, por isso o histórico começa no dia em que o IPMA+ começou a recolhê-la.',

    'metricInfo.smi.summary': 'Quanta água utilizável pelas plantas o solo tem, de 0 a 1.',
    'metricInfo.smi.what':
        'O Índice de Humidade do Solo (SMI) mede a água na zona das raízes que as plantas ainda conseguem absorver: 0 é o ponto de emurchecimento (as plantas já não conseguem extrair mais) e 1 é a capacidade de campo (o solo retém tudo o que consegue depois de drenar).',
    'metricInfo.smi.read':
        'Perto de 1 o solo está húmido; abaixo de cerca de 0,4 as plantas começam a sentir falta de água; perto de 0 já não conseguem absorver nenhuma. Sobe depois da chuva e desce nos dias secos e de sol.',
    'metricInfo.smi.uses': 'Decidir quando regar ou semear, e acompanhar a seca agrícola.',
    'metricInfo.smi.source':
        'IPMA, a partir de um modelo meteorológico (ECMWF) calculado numa grelha e amostrado em cada município.',
};
