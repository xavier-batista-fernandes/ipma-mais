# IPMA+

Este projeto tem como objetivo colmatar a limitação da API do [Instituto Português do Mar e da Atmosfera (IPMA)](https://www.ipma.pt/pt/index.html), que não disponibiliza certos dados meteorológicos até datas muito recentes.

Por exemplo, os dados de evapotranspiração apenas estão acessíveis até cerca de dois meses antes da data atual.

Deste modo, este repositório disponibiliza scripts que recolhem e armazenam esses dados de forma recorrente, garantindo a sua preservação ao longo do tempo para consulta e análise histórica.

## Funcionalidades
- Recolha automática (GitHub Actions) de dados do IPMA:
  - **ET0 diária** a partir da página de agrometeorologia do IPMA, duas vezes por dia;
  - **ET0, temperatura máxima e mínima** a partir da API de dados abertos, semanalmente.
- Cada valor é guardado pela data real da observação (a que vem nos dados do IPMA) e pelo código DICO do município. Repetir uma recolha nunca duplica linhas.
- A recolha falha de forma visível (execução a vermelho) quando uma fonte não responde ou devolve dados inválidos, e avisa quando uma fonte deixa de ter dados recentes.
- Gera ficheiros JSON estáticos pensados para uma aplicação web (um ficheiro por dia para o mapa, um por município para os gráficos).

## Estrutura

| Caminho | Conteúdo |
| --- | --- |
| `data/{et0,tmax,tmin}/{dico}.csv` | Série diária de cada município: `date,mean,min,max,std,source` (`source` é `api` ou `page`; a API tem prioridade). |
| `data/raw/et0-page/{data}.json` | Cópia integral de cada dia publicado na página de ET0. |
| `data/meta.json` | Última recolha bem-sucedida e data mais recente de cada fonte. |
| `inputs/municipalities.json` | Os 278 municípios do continente com o código DICO. Os nomes canónicos vêm da biblioteca [Cartis](https://github.com/xavier-batista-fernandes/cartis). |
| `outputs/` | Formato antigo, mantido temporariamente. Já não é atualizado. |

## Comandos

```bash
npm ci
npm run collect               # todas as fontes (ou collect:page / collect:api)
npm run build:api             # gera dist/api/ a partir de data/
npm test
```

`npm run build:api` escreve:

- `index.json`: métricas, datas disponíveis e municípios (DICO, nome, distrito);
- `{métrica}/days/{data}.json`: `{ date, values: { dico: valor } }`;
- `{métrica}/series/{dico}.json`: `{ dico, rows: [[data, média, mín, máx]] }`;
- `{métrica}/latest.json`: o dia mais recente.

## Aviso Legal e Responsabilidade
Este projeto tem unicamente o propósito de recolher e armazenar dados disponibilizados pela API do Instituto Português do Mar e da Atmosfera (IPMA), sem alterar ou redistribuir os mesmos.

Caso, por algum motivo, este projeto viole os termos e condições de utilização do IPMA, solicitamos que entrem em contacto connosco diretamente para que possamos tomar as medidas necessárias, incluindo a descontinuação imediata do projeto.