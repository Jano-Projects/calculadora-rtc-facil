# Entenda a reforma (o essencial para usar a calculadora)

Este guia resume o que é preciso saber da Reforma Tributária do Consumo para interpretar os resultados. Ele não substitui a legislação nem a orientação de um contador.

## Os tributos

| Tributo | De quem é | O que substitui | Na calculadora |
|---|---|---|---|
| **CBS**: Contribuição sobre Bens e Serviços | União | PIS e Cofins | Calculada |
| **IBS**: Imposto sobre Bens e Serviços | Estados, DF e municípios (uma parte estadual e uma municipal) | ICMS e ISS | Calculado, separado em estadual e municipal |
| **IS**: Imposto Seletivo | União | Parte do IPI, para produtos prejudiciais à saúde ou ao meio ambiente | Calculado nos itens sujeitos a ele, a partir de 2027 |
| PIS, Cofins, ICMS, ISS, IPI | (os atuais) | — | **Não aparecem** |

CBS e IBS formam o chamado **IVA dual**: incidem sobre o valor da operação, com crédito do que foi pago nas etapas anteriores. O Imposto Seletivo incide uma vez, sobre os produtos listados em lei (bebidas açucaradas e alcoólicas, cigarros, veículos, embarcações, aeronaves, bens minerais e apostas).

## Cronograma da transição

| Período | CBS | IBS | Tributos antigos | Na calculadora |
|---|---|---|---|---|
| **2026** | 0,9% (teste) | 0,1% estadual (teste) | Todos continuam integralmente | Alíquotas vêm da base oficial; resultado *Calculado*. Valores compensados com PIS/Cofins para quem cumpre as obrigações acessórias. |
| **2027 e 2028** | Alíquota cheia, reduzida em 0,1 ponto percentual | 0,05% estadual + 0,05% municipal | PIS e Cofins **extintos**; IPI zerado, exceto produtos com industrialização incentivada na Zona Franca de Manaus; **IS começa**; ICMS e ISS continuam integralmente | Alíquotas informadas; resultado *Simulado* |
| **2029 a 2032** | Alíquota cheia | Sobe a cada ano: 10%, 20%, 30% e 40% da alíquota cheia | ICMS e ISS caem na mesma proporção: 90%, 80%, 70% e 60% | Alíquotas informadas; IBS sem valor publicado |
| **2033** | Alíquota cheia | Alíquota cheia | ICMS e ISS **extintos** | Alíquotas informadas |

Fonte: Emenda Constitucional 132/2023 (ADCT, arts. 125 a 129) e Lei Complementar 214/2025.

## Benefícios por tipo de produto

A LC 214 lista produtos e serviços com tratamento favorecido em **anexos**. Cada anexo corresponde a uma ou mais **classificações tributárias** (`cClassTrib`). Por exemplo:

| Tratamento | Exemplos | Classificação típica |
|---|---|---|
| Redução de 100% (alíquota zero) | Cesta Básica Nacional (Anexo I); hortícolas, frutas e ovos (Anexo XV) | `200003`, `200014` |
| Redução de 60% | Alimentos (Anexo VII), higiene pessoal e limpeza (Anexo VIII), insumos agropecuários (Anexo IX), serviços de educação e saúde | `200034`, `200035`, `200038`, `200028`… |
| Tributação integral | Tudo o que não tem benefício | `000001` |

A tela sugere essas classificações a partir do NCM. Veja o [guia de uso](guia-de-uso.md#como-escolher-a-classificação-tributária) e o [ponto de atenção 6](pontos-de-atencao.md#6-a-classificação-tributária-depende-da-operação-não-só-do-produto).

## Imposto Seletivo em 2027

A Medida Provisória 1.399/2026 fixou as alíquotas do IS para 2027, em geral equivalentes às do IPI atual. Alguns exemplos:

| Produto | Alíquota em 2027 |
|---|---|
| Bebidas açucaradas | 2,6% |
| Cervejas de malte | 4,2% |
| Vinhos e outras fermentadas | 8% |
| Vermutes | 12% |
| Cachaça e aguardentes de cana | 20% |
| Uísque, vodca, gim e outros destilados | 24% |
| Cigarros (regime específico) | 66,7% sobre o valor de referência, mais um valor fixo por maço de 20 |
| Bens minerais extraídos | zero até o fim de 2027 |

Pela MP, o IS começa a produzir efeitos em **2 de fevereiro de 2027**. A MP precisa ser convertida em lei, e as alíquotas de 2028 em diante virão de um projeto de lei. Consulte o texto oficial da MP para o seu produto.

## Termos que aparecem na tela

| Termo | Significado |
|---|---|
| **NCM** | Nomenclatura Comum do Mercosul: o código de 8 dígitos que classifica **produtos**. |
| **NBS** | Nomenclatura Brasileira de Serviços: o código de 9 dígitos que classifica **serviços**. |
| **CST** | Código de Situação Tributária: o tipo de tratamento, por exemplo `000` tributação integral, `200` alíquota reduzida, `410` imunidade e não incidência. É preenchido sozinho a partir da classificação. |
| **cClassTrib** | Classificação tributária: detalha o CST e diz qual benefício se aplica, por exemplo `200003` para cesta básica. |
| **Base de cálculo** | Valor sobre o qual a alíquota incide. Na tela, é o campo *Valor* do item. |
| **Alíquota nominal** | Alíquota antes de reduções, por exemplo CBS de 8,8%. |
| **Alíquota efetiva** | Alíquota depois da redução. Com 8,8% e redução de 60%, a efetiva é 3,52%. |
| **Fato gerador** | O momento da operação que define as regras aplicáveis. Na API é o campo `dhFatoGerador`. |
| **Memória de cálculo** | Texto da calculadora oficial explicando a conta de cada item. Clique na linha do detalhamento para ver. |
| **Calculado / Simulado** | *Calculado* usa só dados da base oficial (2026). *Simulado* usa alíquotas que você informou (2027 em diante). |
| **REG-011** e outros códigos | Erros de dados devolvidos pela calculadora oficial. A descrição aparece embaixo do item. |

## Fontes

- [Senado: novos tributos começam a ser testados em 2026, e a transição vai até 2033](https://www12.senado.leg.br/noticias/materias/2024/12/16/novos-tributos-comecam-a-ser-testados-em-2026-e-transicao-vai-ate-2033)
- [Receita Federal: material de apoio do curso sobre a Reforma Tributária do Consumo](https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/reforma-tributaria-do-consumo/curso/material-de-apoio/curso-cfc-rfb-modulo-1-mombelli_maio-2026-final.pdf)
- [TCU: painel da Reforma Tributária, cronograma](https://sites.tcu.gov.br/recursos/reforma-tributaria/Painel%20da%20Reforma%20Tribut%C3%A1ria_Cronograma_v5.pdf)
- Emenda Constitucional 132/2023, Lei Complementar 214/2025 e Medida Provisória 1.399/2026 (Diário Oficial da União)
