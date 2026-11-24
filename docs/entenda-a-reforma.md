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
| **2027 e 2028** | Alíquota cheia, reduzida em 0,1 ponto percentual (referência de 11,3% para 2027 calculada pelo TCU, pendente de resolução do Senado; cobrada: 11,2%) | 0,05% estadual + 0,05% municipal | PIS e Cofins **extintos**; IPI zerado, exceto produtos com industrialização incentivada na Zona Franca de Manaus; **IS começa**; ICMS e ISS continuam integralmente | Alíquotas informadas; resultado *Simulado* |
| **2029 a 2032** | Alíquota cheia | Sobe a cada ano: 10%, 20%, 30% e 40% da alíquota cheia | ICMS e ISS caem na mesma proporção: 90%, 80%, 70% e 60% | Alíquotas informadas; IBS sem valor publicado |
| **2033** | Alíquota cheia | Alíquota cheia | ICMS e ISS **extintos** | Alíquotas informadas |

Fonte: Emenda Constitucional 132/2023 (ADCT, arts. 125 a 129) e Lei Complementar 214/2025.

## Alíquota de referência da CBS em 2027

Em 28/10/2026, o Tribunal de Contas da União calculou a alíquota de referência da CBS para 2027 em **11,3%**. O valor ficou acima dos 9,21% usados antes como estimativa. O Senado tem até 15/12/2026 para fixá-la por resolução; se não fixar, vale a do TCU. Em 2027 e 2028 a CBS cobrada é a referência menos 0,1 ponto, ou seja, **11,2%**, ao lado do IBS de teste de 0,1%. A referência é recalculada a cada ano durante a transição.

Para a soma de CBS e IBS depois da transição (2033), as estimativas oficiais variam: 26,5% na aprovação da lei e cerca de 28% em estimativas posteriores do Comitê Gestor do IBS.

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

## Simples Nacional

A empresa do Simples continua no Simples. O que muda é a divisão da guia (DAS), pelas novas tabelas dos Anexos I a V da LC 123/2006, que estão nos Anexos XVIII a XXII da LC 214/2025 e valem a partir de 1º/1/2027:

- **2027 e 2028:** a parte de PIS e Cofins vira CBS e uma pequena parte de IBS. No Anexo I (comércio), 1ª faixa, os 15,50% de PIS/Cofins passam a ser 15,33% de CBS e 0,17% de IBS. A alíquota efetiva não muda.
- **2029 a 2032:** a cada ano, o IBS absorve mais 10% da parte do ICMS ou do ISS.
- **2033:** o ICMS e o ISS saem do DAS.

A partir de 2027, a empresa pode escolher, por semestre, recolher **CBS e IBS por fora do DAS**, pelo regime regular, mantendo os demais tributos na guia. É o chamado Simples híbrido (LC 214/2025, art. 41, § 3º; Resolução CGSN 186/2026). Isso muda o crédito de quem compra dela:

| Fornecedor do Simples | Crédito de CBS e IBS do cliente empresa |
|---|---|
| Dentro do DAS | Só o valor pago na guia: alíquota efetiva × parte de CBS e IBS (Anexo I, 1ª faixa: 4% × 15,50% = 0,62% da venda) |
| Por fora | A CBS e o IBS cheios destacados na nota |

Na aba *Antes e depois*, escolha *Simples Nacional* no regime para comparar as duas opções. Veja o [guia de uso](guia-de-uso.md#simples-nacional) e o [ponto de atenção 17](pontos-de-atencao.md#17-simples-nacional-dentro-ou-fora-do-das-é-uma-decisão-com-o-contador).

## Termos que aparecem na tela

| Termo | Significado |
|---|---|
| **NCM** | Nomenclatura Comum do Mercosul: o código de 8 dígitos que classifica **produtos**. |
| **NBS** | Nomenclatura Brasileira de Serviços: o código de 9 dígitos que classifica **serviços**. |
| **CST** | Código de Situação Tributária: o tipo de tratamento, por exemplo `000` tributação integral, `200` alíquota reduzida, `410` imunidade e não incidência. É preenchido sozinho a partir da classificação. |
| **cClassTrib** | Classificação tributária: detalha o CST e diz qual benefício se aplica, por exemplo `200003` para cesta básica. |
| **Base de cálculo** | Valor sobre o qual a alíquota incide. Na tela, é o campo *Valor* do item. |
| **Alíquota nominal** | Alíquota antes de reduções, por exemplo CBS de 11,2%. |
| **Alíquota efetiva** | Alíquota depois da redução. Com 11,2% e redução de 60%, a efetiva é 4,48%. |
| **Fato gerador** | O momento da operação que define as regras aplicáveis. Na API é o campo `dhFatoGerador`. |
| **Memória de cálculo** | Texto da calculadora oficial explicando a conta de cada item. Clique na linha do detalhamento para ver. |
| **Calculado / Simulado** | *Calculado* usa só dados da base oficial (2026). *Simulado* usa alíquotas que você informou (2027 em diante). |
| **REG-011** e outros códigos | Erros de dados devolvidos pela calculadora oficial. A descrição aparece embaixo do item. |

## Fontes

- [Senado: novos tributos começam a ser testados em 2026, e a transição vai até 2033](https://www12.senado.leg.br/noticias/materias/2024/12/16/novos-tributos-comecam-a-ser-testados-em-2026-e-transicao-vai-ate-2033)
- [Receita Federal: material de apoio do curso sobre a Reforma Tributária do Consumo](https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/reforma-tributaria-do-consumo/curso/material-de-apoio/curso-cfc-rfb-modulo-1-mombelli_maio-2026-final.pdf)
- [Mattos Filho: TCU propõe alíquota de referência de 11,35% para a CBS em 2027](https://www.mattosfilho.com.br/unico/tcu-aliquota-cbs-2027/)
- [Congresso em Foco: TCU propõe alíquota de 11,3% para a CBS; Senado terá decisão final](https://www.congressoemfoco.com.br/noticia/129639/tcu-propoe-aliquota-de-11-3-para-cbs-senado-tera-decisao-final)
- [TCU: painel da Reforma Tributária, cronograma](https://sites.tcu.gov.br/recursos/reforma-tributaria/Painel%20da%20Reforma%20Tribut%C3%A1ria_Cronograma_v5.pdf)
- [Receita Federal: manual da opção pelo regime regular de IBS e CBS no Simples Nacional](https://www8.receita.fazenda.gov.br/SimplesNacional/Arquivos/manual/Manual%20op%C3%A7%C3%A3o%20regime%20regular%20IBS%20e%20CBS%20no%20Simples%20Nacional.pdf)
- [Agência Gov: empresas do Simples já podem optar por IBS e CBS fora do regime unificado em 2027](https://agenciagov.ebc.com.br/noticias/202609/empresas-do-simples-nacional-ja-podem-optar-pelo-recolhimento-de-ibs-e-cbs-fora-do-regime-unificado)
- [Nota Técnica 2025.002-RTC (NF-e e NFC-e: grupos de IBS, CBS e IS), versão 1.53](https://www.reformatributaria.com/wp-content/uploads/2026/10/NT_2025.002_v1.53_RTC_NF-e_IBS_CBS_IS.pdf)
- Emenda Constitucional 132/2023, Lei Complementar 214/2025, Lei Complementar 123/2006 (com a redação da LC 227/2026), Resolução CGSN 186/2026 e Medida Provisória 1.399/2026 (Diário Oficial da União)
