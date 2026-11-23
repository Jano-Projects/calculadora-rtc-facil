# Mudanças

## 1.4.0 — 2026-11-23

### Novidades na aba "Antes e depois"
- **Quem vende: comércio ou indústria.** No comércio (o padrão), IPI, Imposto Seletivo e PIS/Cofins monofásico incidem uma vez, na indústria, sobre um **preço de fábrica** informado (padrão: 60% do preço), e o ICMS-ST chega já pago. Todos entram como custo embutido. Na indústria, tudo é destacado na própria venda.
- **Novos campos por item:** FCP %, PIS/Cofins monofásico (marcador e alíquota) e ICMS-ST (marcador). Padrões:
  - monofásico de 13% nas bebidas frias, 12,5% em perfumaria e higiene e 12% em medicamentos;
  - ICMS-ST nas bebidas.
- **Cenário do ICMS de 2027 em diante:** CBS e IBS fora da base do ICMS (padrão, como em 2026) ou dentro da base, já que a lei não diz expressamente.
- **Quadro "Tributos sobre o consumo do produto":** separa o destacado nesta venda do embutido no custo e lista o que não entra (renda, folha, resíduos da cadeia, DIFAL, importação). Na tabela por item, os valores embutidos aparecem em itálico.

### Correções
- **IPI e Imposto Seletivo eram calculados sobre o preço de venda.** Na venda do comércio isso superestimava os dois, porque eles incidem uma vez, na indústria, sobre o preço de fábrica.
- **Diferenças de arredondamento.** Diferenças menores que 2 centavos entre o tributo antigo e o novo aparecem como "sem mudança".

### Documentação
- **Novo: [Tributos e bases](docs/tributos-e-bases.md).** A base de cada tributo hoje e depois, o que é "por dentro" e "por fora", indústria × comércio, destacado × embutido × não incluído, e por que o destacado na venda final representa a cadeia nos tributos não cumulativos.
- **Pontos de atenção:** o 14 foi reescrito, e entram o 15 (CBS e IBS na base do ICMS, ponto em aberto) e o 16 (o total não é a carga tributária completa). No ponto 5, a observação de que o IS é cobrado na indústria.

## 1.3.0 — 2026-11-23

### Novidades
- **Aba "Antes e depois".** Compara a carga de hoje com a de depois da reforma, item a item e no total.
  - **Hoje:** PIS/Cofins, ICMS ou ISS e IPI, mais a CBS e o IBS de teste, destacados e compensados.
  - **Depois:** CBS, IBS, Imposto Seletivo e o ICMS/ISS que continua.
  - **O que migra:** PIS/Cofins → CBS; IPI → Imposto Seletivo ou zero.
  - **O que fica:** ICMS/ISS, com a redução de 2029 a 2032.
  - **Preço estimado:** com margem constante e repasse integral.
  - **Composição do preço:** barras com cada tributo.
- Os tributos novos vêm da calculadora oficial, com a base de cálculo pelas regras da base unificada: sem ICMS/ISS e PIS/Cofins, e com o Imposto Seletivo. Os tributos atuais são estimados a partir de padrões editáveis:
  - ICMS pela alíquota geral de cada estado em 2026;
  - PIS/Cofins pelo regime (9,25% ou 3,65%), com zero na cesta básica e no hortifrúti;
  - ISS de 5% nos serviços;
  - IPI igual ao Imposto Seletivo nos produtos sujeitos a ele.
- Documentação: guia da aba nova, ponto de atenção 14 (premissas da estimativa) e a diferença entre *Comparar datas* e *Antes e depois*.

## 1.2.0 — 2026-11-23

### Documentação
- **Novo: [Pontos de atenção](docs/pontos-de-atencao.md).** Treze situações em que o resultado pode enganar, cada uma com o que fazer. Entre elas: o cupom mostra só os tributos novos; a comparação 2026 × 2027 não é aumento de preço; os valores de 2026 são de teste; as alíquotas de 2027 em diante são estimativas; a classificação depende da operação; itens com erro ficam fora do total; a versão do motor muda resultados.
- **Novo: [Entenda a reforma](docs/entenda-a-reforma.md).** Os tributos, o cronograma de 2026 a 2033, os benefícios por anexo, o Imposto Seletivo de 2027 e um glossário dos termos da tela.
- **Novo: [Diferenças que confundem](docs/diferencas.md).** Comparações lado a lado, como calculado × simulado, redução de 100% × imunidade × isenção, NCM × NBS, CST × cClassTrib e o que vale em todas as abas × o que é de cada aba.
- **Novo: [Perguntas frequentes](docs/perguntas-frequentes.md).**
- README e aba *Ajuda* destacam os pontos de atenção antes do uso.

### Imposto Seletivo
- Textos da tela e exemplos atualizados com as alíquotas de 2027 da **Medida Provisória 1.399/2026** (bebidas açucaradas 2,6%, cerveja de malte 4,2%…) e com o início da cobrança em 2 de fevereiro de 2027. Antes, a tela dizia que a lei ainda não havia definido as alíquotas, e os exemplos usavam 10%.

## 1.1.0 — 2026-11-23

### Novidades
- **Sugestão da classificação tributária pelo NCM.** Abaixo de cada item aparecem as classificações às quais o NCM está vinculado na base oficial, com o percentual de redução e o trecho do anexo da LC 214. Basta um clique para escolher. Quando o NCM não tem benefício vinculado, a tela usa `000001` e avisa. A tela também avisa, antes de calcular, quando a classificação escolhida não vale para o NCM (erro REG-011). A relação é extraída do banco de cada versão instalada e se atualiza junto com o motor.
- A aba **Consultar códigos** mostra a quais classificações cada NCM está vinculado.
- **Selos "vale em todas as abas" e "só nesta aba"** deixam claro o que é compartilhado (itens e local) e o que é de cada aba (data e alíquotas).
- **Aba Comparar datas refeita:**
  - mostra o resumo da nota usada, com o botão de editar;
  - tem campos próprios de alíquotas para cada data de 2027 em diante;
  - tem um quadro de Imposto Seletivo para os itens que pagam IS.

### Correções
- **Comparar datas pedia uma alíquota sem campo na tela.** Quando a nota estava numa data de 2026, a comparação pedia a alíquota do Imposto Seletivo, mas o campo não existia. Agora o campo aparece no item sempre que o produto paga IS, e também no quadro da comparação.
- **Alíquotas de 2027 em diante.** A partir da versão 1.7.2, a base oficial não traz mais alíquotas de referência para esses anos. A tela preenchia 0% ou deixava os campos vazios sem explicar. Agora ela preenche estimativas marcadas: CBS de 8,8%, como no exemplo da documentação oficial, e IBS de 0,05% + 0,05% em 2027 e 2028, fixados pela EC 132. De 2029 em diante pede o IBS.

## 1.0.0 — 2026-11-23

Primeira versão.

- Inicialização com um clique no Windows (`iniciar.bat`) e no Linux (`iniciar.sh`), com JDK 25 portátil.
- Instalação e atualização automáticas da calculadora oficial da Receita Federal (por tag), com troca do motor sem interromper o uso.
- Front-end com montagem de nota, autocompletar de NCM, classificações por data, alíquotas de referência pré-preenchidas a partir de 2027, Imposto Seletivo, cupom de resultado, detalhamento com memória de cálculo, CSV e JSON.
- Comparação da mesma nota em duas datas.
- Consulta de NCM e de classificações tributárias.
- Exemplos prontos: cesta básica, compras do dia a dia e o exemplo oficial.
- CI: análise estática, teste de fumaça e instalação real semanal em Ubuntu, Debian, Fedora e Windows.
