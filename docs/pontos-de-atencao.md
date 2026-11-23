# Pontos de atenção

Leia antes de usar os resultados para qualquer decisão. Cada item diz **o que pode enganar** e **o que fazer**.

> A calculadora oficial e esta ferramenta servem para **estudo, simulação e conferência**. Elas não substituem a orientação de um contador nem o sistema emissor de notas fiscais.

---

## 1. O resultado mostra só os tributos novos

**O que pode enganar.** O total do cupom soma apenas **CBS, IBS e Imposto Seletivo**. PIS, Cofins, ICMS, ISS e IPI não aparecem, porque a calculadora oficial não os calcula. Em 2026, por exemplo, uma nota inteira mostra centavos de tributo, mas o produto continua carregando todos os tributos antigos.

**O que fazer.** Não leia o cupom como "o imposto do produto" nem como variação de preço. Para saber a carga total de um período, some os tributos antigos que ainda existem naquele ano. O [cronograma da transição](entenda-a-reforma.md#cronograma-da-transição) mostra quais são.

## 2. Comparar 2026 com 2027 não mostra aumento de preço

**O que pode enganar.** Na aba *Comparar datas*, a nota de 2027 costuma aparecer com dez vezes mais tributo que a de 2026. Isso acontece porque, em 2027, a **CBS substitui o PIS e a Cofins**, que saem do preço ao mesmo tempo. A comparação mostra a CBS entrando, mas não mostra o PIS e a Cofins saindo.

**O que fazer.** Use a comparação para ver **como cada item passa a ser tributado** (quanto de CBS, se tem redução, se paga Imposto Seletivo), e não como "quanto ficou mais caro". O que é aumento líquido de verdade em 2027 é o **Imposto Seletivo**, porque ele não substitui nenhum tributo antigo de forma direta, e ainda entra na base da CBS e do IBS.

## 3. Em 2026 os valores são de teste

**O que pode enganar.** A calculadora aplica 0,9% de CBS e 0,1% de IBS em 2026, e o resultado sai como *Calculado*. Mas, em 2026, quem cumpre as obrigações acessórias (emite a nota com os campos de IBS e CBS) é dispensado de recolher esses valores, e o que for pago é compensado com PIS e Cofins.

**O que fazer.** Trate os valores de 2026 como **destaque obrigatório na nota fiscal**, não como custo. Empresas do Simples Nacional não aplicam as alíquotas de teste.

## 4. De 2027 em diante o cálculo é simulado e as alíquotas são estimativas

**O que pode enganar.** A partir de 2027, a calculadora oficial **exige que as alíquotas sejam informadas** e marca o resultado como *Simulado*. Na versão 1.7.2, a base oficial não traz mais alíquotas de referência para esses anos. Por isso a tela preenche:

| Alíquota | Valor preenchido | De onde vem |
|---|---|---|
| CBS (2027 e 2028) | 11,2% | Referência de 11,3% calculada pelo TCU em 28/10/2026, menos 0,1 ponto em 2027 e 2028 (LC 214, art. 347). O Senado tem até 15/12/2026 para fixar a referência por resolução; se não fixar, vale a do TCU. |
| CBS (2029 em diante) | 11,3% | A referência de 2027, só como ponto de partida: ela é recalculada a cada ano. |
| IBS estadual e municipal (2027 e 2028) | 0,05% + 0,05% | Fixado pela Emenda Constitucional 132. |
| IBS (2029 em diante) | em branco | Não há valor publicado; você informa. |

**O que fazer.** Antes de usar um resultado de 2027 em diante, confira as alíquotas no quadro da tela, onde aparece a origem de cada uma. Quando a resolução do Senado for publicada, a calculadora oficial deve trazer a alíquota numa versão nova, a ferramenta se atualiza sozinha e passa a usá-la no lugar da estimativa.

## 5. Imposto Seletivo: alíquotas provisórias e início em fevereiro de 2027

**O que pode enganar.**
- **Alíquotas provisórias.** As alíquotas de 2027 foram fixadas pela **Medida Provisória 1.399/2026**. Alguns exemplos: bebidas açucaradas 2,6%, cerveja de malte 4,2%, vinhos 8%, destilados 24%. Uma medida provisória que cria ou aumenta imposto precisa virar lei para valer no ano seguinte, então esses números ainda podem mudar.
- **Início em fevereiro.** Pela MP, o IS começa a produzir efeitos em **2 de fevereiro de 2027**. A calculadora oficial não aplica essa data: se você informar uma alíquota de IS para uma operação de janeiro de 2027, ela calcula.
- **Valor estimado.** A alíquota é informada por você em cada item. O campo pode vir vazio ou com uma estimativa dos exemplos.

- **Cobrado uma vez, na indústria.** O IS é cobrado na venda da indústria ou do importador, sobre o preço de fábrica. Nas abas *Calcular nota* e *Comparar datas*, informar o IS num item trata aquela venda como **venda da indústria**. Para simular uma compra no comércio, use a aba *Antes e depois* com "Quem vende: comércio".

**O que fazer.** Confira a alíquota do seu produto na MP, porque ela varia por tipo de bebida, cigarro, veículo etc. Para operações entre 1º de janeiro e 1º de fevereiro de 2027, avalie com o contador se o IS deve entrar. Lembre que o IS entra na base de cálculo da CBS e do IBS.

## 6. A classificação tributária depende da operação, não só do produto

**O que pode enganar.** A tela sugere as classificações às quais o NCM está vinculado na base oficial. O mesmo NCM pode ter várias:
- **arroz:** cesta básica (Anexo I), fornecimento de alimentos (Anexo VII) e insumos agropecuários (Anexo IX);
- **óleo de soja:** não está na cesta básica, mas tem redução de 60% (Anexo VII).

Qual delas vale depende de **quem vende, para quem e com que finalidade**.

**O que fazer.** Use as sugestões como ponto de partida e confira o texto do anexo que aparece junto. Na dúvida, veja o `cClassTrib` na NF-e do fornecedor ou pergunte ao contador. Alguns benefícios não dependem do NCM (medicamentos registrados na Anvisa, compras governamentais, exportação) e por isso não aparecem nas sugestões.

## 7. "Valor" é a base de cálculo

**O que pode enganar.** O valor informado no item é enviado como **base de cálculo**. A tela não desconta nem acrescenta nada.

**O que fazer.** Informe o valor da operação já com descontos e acréscimos, como manda a legislação. Para montar a base a partir dos campos da NF-e (produto, frete, seguro, desconto, outros), use o endpoint oficial de base de cálculo unificada, disponível no Swagger (aba *Ajuda* → *Abrir a API*).

## 8. Item com erro não entra no total

**O que pode enganar.** Quando um item tem erro de dados (por exemplo REG-011, NCM não vinculado à classificação), a nota é calculada assim mesmo e o total **exclui** esse item. O cupom avisa, mas é fácil não perceber.

**O que fazer.** Antes de usar um total, confira a coluna *Situação* do detalhamento. Todos os itens devem estar *Calculado* ou *Simulado*.

## 9. A data define as regras

**O que pode enganar.** A mesma nota dá resultados diferentes conforme a data: alíquotas, classificações vigentes, NCMs vigentes, início do IS. Um dia de diferença na virada do ano muda tudo.

**O que fazer.** Use a data do fato gerador (a data da operação), e não a data de hoje. As listas de NCM e de classificações da tela também seguem a data escolhida.

## 10. A versão da calculadora oficial muda os resultados

**O que pode enganar.** A Receita publica versões novas com correções de regras, tabelas e alíquotas, e a ferramenta as instala sozinha. Um cálculo feito hoje pode não bater com o mesmo cálculo feito há um mês.

**O que fazer.** Ao registrar uma conferência (em homologação de ERP, por exemplo), anote a **versão do motor** que aparece no canto superior direito. Compare resultados só entre cálculos feitos na mesma versão. Se precisar repetir um cálculo antigo, inicie com `--versao X`.

## 11. Centavos de diferença

**O que pode enganar.** Os totais oficiais da calculadora podem diferir em centavos da soma dos itens, por causa do arredondamento feito item a item.

**O que fazer.** Para conferir com um ERP, compare **item a item**. O botão *Ver JSON* mostra exatamente o que a calculadora oficial devolveu.

## 12. Os exemplos têm preços fictícios

**O que pode enganar.** Os exemplos *Cesta básica* e *Compras do dia a dia* usam preços aproximados e alíquotas de IS da MP 1.399/2026 só para ilustrar.

**O que fazer.** Troque pelos valores reais antes de tirar conclusões.

## 13. Acesso pela rede não tem senha

**O que pode enganar.** Com a opção `--rede`, qualquer computador da rede local consegue abrir a calculadora.

**O que fazer.** Use `--rede` só em redes de confiança (sua casa, uma VM no seu computador). Sem essa opção, a calculadora só aceita acessos do próprio computador.

## 14. "Antes e depois" é uma estimativa com premissas

**O que pode enganar.** A aba *Antes e depois* mostra a carga de hoje, a de depois e um preço estimado. Os tributos novos vêm da calculadora oficial, mas os atuais (PIS/Cofins, ICMS/ISS, FCP, IPI) são **estimados** pela tela a partir de padrões:
- ICMS pela alíquota geral do estado;
- PIS/Cofins pelo regime escolhido, com zero na cesta básica e no hortifrúti, e monofásico em bebidas, perfumaria, higiene e medicamentos;
- ICMS-ST nas bebidas;
- IPI igual ao Imposto Seletivo nos produtos sujeitos a ele;
- preço de fábrica de 60% do preço de venda.

O modelo supõe **margem constante e repasse integral**. Os padrões podem errar muito em itens com regra estadual própria (cesta básica com ICMS reduzido, por exemplo).

**O que fazer.**
- Escolha corretamente **quem vende** (indústria ou comércio).
- Ajuste por item as alíquotas que a empresa realmente aplica (veja no ERP ou na nota de venda).
- Leia o preço estimado como "o que aconteceria se nada além dos tributos mudasse", e não como previsão de preço.
- Para conferência fiscal, use os valores de CBS, IBS e IS, que vêm da calculadora oficial.

A regra de base de cada tributo está em [tributos e bases](tributos-e-bases.md).

## 15. A CBS e o IBS podem entrar na base do ICMS a partir de 2027

**O que pode enganar.** A lei não diz expressamente se, de 2027 a 2032, a CBS e o IBS entram na base de cálculo do ICMS e do ISS. Em 2026 não entram (resposta da Sefaz-SP). O padrão da ferramenta supõe que continue assim. Se os estados incluírem, o ICMS fica maior do que o mostrado.

**O que fazer.** Na aba *Antes e depois*, compare as duas opções de "ICMS de 2027 em diante" para ver o tamanho do efeito, e acompanhe a posição do seu estado.

## 16. O total não é a carga tributária completa do produto

**O que pode enganar.** Mesmo na aba *Antes e depois*, o total inclui só os **tributos sobre o consumo**, destacados na venda ou embutidos no custo. Não entram os tributos sobre a renda e a folha das empresas da cadeia (IRPJ, CSLL, INSS patronal), os resíduos de etapas sem crédito, o DIFAL nem os tributos de importação. Por isso o valor fica abaixo dos "tributos aproximados" impressos nos cupons fiscais.

**O que fazer.** Use a ferramenta para entender a **troca de tributos sobre o consumo** na reforma, e não como medida da carga total.
