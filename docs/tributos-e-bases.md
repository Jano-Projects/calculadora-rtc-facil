# Tributos sobre o consumo e suas bases

Cada tributo incide sobre uma base diferente, e alguns incidem sobre outros tributos ("imposto sobre imposto"). Este guia mostra o que a ferramenta considera, como calcula e o que fica de fora.

> Os valores de **CBS, IBS e Imposto Seletivo** vêm da calculadora oficial da Receita. Os de **PIS/Cofins, ICMS/ISS, FCP e IPI** são **estimados** pela aba *Antes e depois*, a partir de alíquotas que você pode ajustar.

## "Por dentro" e "por fora"

- **Por dentro:** o tributo faz parte da própria base, ou seja, incide sobre si mesmo. Com ICMS de 18% "por dentro", ele é 18% do preço final, o que equivale a cerca de 21,95% sobre o valor sem ICMS. É o caso do ICMS, do ISS e do PIS/Cofins.
- **Por fora:** o tributo é somado ao preço e não entra na própria base. É o caso do IPI, da CBS e do IBS.

## Hoje (regras de 2026)

| Tributo | Base | Incide sobre outros tributos? | Na ferramenta |
|---|---|---|---|
| **ICMS** | Preço de venda, incluindo o próprio ICMS e o PIS/Cofins embutidos (e o IPI, na venda a consumidor final) | Sim: sobre si mesmo e sobre PIS/Cofins | ✔ `ICMS = alíquota × preço` |
| **FCP** (fundo de combate à pobreza) | A mesma do ICMS, só nos produtos listados pelo estado (1% a 4%) | Igual ao ICMS | ✔ campo FCP %, somado à alíquota do ICMS |
| **ICMS-ST** (substituição tributária) | Preço presumido do consumidor final (com margem de valor agregado), pago antecipado pela indústria | Igual ao ICMS | ✔ marcador ST: na venda do comércio, o ICMS passa a contar como embutido no custo; o preço presumido é aproximado pelo preço de venda |
| **PIS/Cofins** (regime normal) | Receita da venda **sem o ICMS** (STF, Tema 69) | Não incide sobre o ICMS | ✔ `PIS/Cofins = alíquota × (preço − ICMS)`; 9,25% no lucro real, 3,65% no presumido |
| **PIS/Cofins monofásico** | Venda da indústria, com alíquota concentrada (bebidas frias 13%, perfumaria e higiene 12,5%, medicamentos 12%); revenda com zero | — | ✔ marcador mono.: na venda do comércio, incide sobre o preço de fábrica e conta como embutido |
| **IPI** | Preço de saída da indústria ("por fora") | Entra na base do ICMS na venda a consumidor final | ✔ no comércio, sobre o preço de fábrica, como custo embutido; na indústria, sobre o valor da venda |
| **ISS** (serviços) | Preço do serviço ("por dentro"), de 2% a 5% | Sobre si mesmo | ✔ |
| **CBS e IBS de teste** | Valor da venda **sem** ICMS, ISS, PIS e Cofins | Não | ✔ pela calculadora oficial; destacados na nota, mas compensados com PIS/Cofins e fora do preço |

## Depois (2027 em diante)

| Tributo | Base | Incide sobre outros tributos? | Na ferramenta |
|---|---|---|---|
| **CBS e IBS** | Valor da venda **sem** eles mesmos, sem IPI e, durante a transição, sem ICMS, ISS, PIS e Cofins. **Inclui** o Imposto Seletivo e o imposto de importação. | Sim, sobre o IS | ✔ pela calculadora oficial |
| **Imposto Seletivo** | Venda da indústria ou do importador, **uma única vez** (primeiro fornecimento), a partir de 2/2/2027 | Entra na base do ICMS, do ISS, da CBS e do IBS | ✔ no comércio, sobre o preço de fábrica, como custo embutido; na indústria, sobre o valor da venda |
| **ICMS e ISS** (até 2032) | Como hoje, agora **com** o Imposto Seletivo e **sem** PIS/Cofins, que deixam de existir | Sobre si mesmo e sobre o IS. A CBS e o IBS ficam de fora no padrão, ou dentro como cenário opcional (veja abaixo). | ✔ com a redução de 10% ao ano de 2029 a 2032 |
| PIS/Cofins, IPI | Extintos (o IPI zerado, exceto produtos com industrialização incentivada na Zona Franca de Manaus) | — | ✔ zerados; a exceção da Zona Franca não é modelada |

A base da CBS e do IBS é exatamente a que a calculadora oficial usa no cálculo da base unificada. Ela soma valor do produto, frete, seguro, outras despesas, imposto de importação e Imposto Seletivo. Ela subtrai desconto, ICMS, FCP, DIFAL, ICMS monofásico, ISS e, só em 2026, PIS e Cofins.

## Ponto em aberto: CBS e IBS na base do ICMS

A lei exclui a CBS e o IBS das bases deles mesmos, do Imposto Seletivo e do PIS/Cofins. Mas **não diz expressamente** se eles entram na base do ICMS e do ISS de 2027 a 2032. Para 2026, a Secretaria da Fazenda de São Paulo já respondeu que não entram, porque o PIS e a Cofins entram na base do ICMS pelas alíquotas cheias. Para os anos seguintes, há defesa nos dois sentidos.

A aba *Antes e depois* tem as duas opções:
- **Fora da base (padrão):** como em 2026.
- **Dentro da base:** `ICMS = alíquota × (valor + IS + CBS + IBS) / (1 − alíquota)`. Mostra quanto o ICMS sobe se os estados incluírem.

## Quem vende: indústria × comércio

| | Indústria ou importador | Comércio (varejo ou atacado) |
|---|---|---|
| IPI e Imposto Seletivo | Destacados na própria venda | Pagos pela indústria e embutidos no custo |
| PIS/Cofins monofásico | Cobrado nesta venda, com a alíquota concentrada | Embutido no custo; na revenda, alíquota zero |
| ICMS-ST | Retido e destacado pela indústria | Já pago; embutido no custo |
| O que a nota da venda destaca | Tudo | ICMS normal, PIS/Cofins normal, CBS e IBS |

O **preço de fábrica** (padrão: 60% do preço de venda) é a base usada no comércio para IPI, Imposto Seletivo e PIS/Cofins monofásico. Ajuste conforme a margem real da cadeia.

## Destacado × embutido × não incluído

| Grupo | O que é | Exemplos |
|---|---|---|
| **Destacado nesta venda** | Aparece na nota fiscal de quem vende | ICMS, PIS/Cofins normal, CBS, IBS |
| **Embutido no custo** | Pago em etapa anterior, sem crédito para quem vende; vira custo e entra no preço | IPI e IS (no comércio), PIS/Cofins monofásico, ICMS-ST |
| **Não incluído** | Faz parte do preço, mas a ferramenta não calcula | IRPJ, CSLL e INSS patronal das empresas da cadeia; resíduos de etapas sem crédito (fornecedores do Simples, regime cumulativo); DIFAL; tributos de importação; taxas |

Por isso o total da ferramenta fica abaixo dos "tributos aproximados" impressos nos cupons fiscais (Lei 12.741/2012), que incluem também renda e folha.

## Por que o destacado na venda final representa a cadeia inteira

ICMS, PIS/Cofins do lucro real, CBS e IBS são **não cumulativos**: cada empresa da cadeia abate o que foi pago na etapa anterior. Somando todas as etapas, o total arrecadado é igual ao valor destacado na venda ao consumidor final. Isso deixa de valer quando alguma etapa não gera crédito: Simples Nacional, regime cumulativo, isenção no meio da cadeia, ou um produto que entra como uso e consumo.

## Fontes

- Lei Complementar 214/2025, art. 12 (base de cálculo da CBS e do IBS); Emenda Constitucional 132/2023 (ADCT, arts. 125 a 133).
- Calculadora oficial da Receita: regra da base de cálculo unificada (`ElementoBaseCalculo`).
- STF, RE 574.706 (Tema 69): ICMS fora da base do PIS/Cofins.
- Secretaria da Fazenda de São Paulo, Resposta à Consulta 32303/2025 (CBS e IBS fora da base do ICMS em 2026).
- Leis 10.147/2000 e 13.097/2015 (PIS/Cofins monofásico).
