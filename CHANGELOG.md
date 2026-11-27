# Mudanças

## 1.8.0 — 2026-11-27

O regime de quem emite a nota passa a valer em todas as abas, com o Simples Nacional calculado como na realidade: sem CBS e IBS em 2026, e de 2027 em diante pela calculadora oficial do Simples Nacional da Receita, com o DAS da nota tributo por tributo.

### Simples Nacional
- **Painel Quem emite a nota** (aba *Calcular nota*, vale em todas as abas): lucro real, lucro presumido ou Simples Nacional. No Simples: receita dos últimos 12 meses (RBT12), atividade dos produtos e dos serviços (lista da calculadora oficial), fator "r", ISS retido e CBS e IBS dentro ou fora do DAS de 2027 em diante. Mostra anexo, faixa, alíquota efetiva e as alíquotas de CBS e IBS dentro do DAS.
- **Tabelas da LC 214/2025** (Anexos XVIII a XXII) em `web/simples.js`: alíquotas, parcela a deduzir e partilha de cada anexo e faixa, de 2026 a 2033, com o teto do ISS na 5ª faixa, o par sem redistribuição do ISS e o sublimite.
- **Calculadora oficial do Simples Nacional** (`calculadora-rtc-simples-nacional`) instalada, atualizada e iniciada junto com a do regime regular, usando o mesmo banco. A tela a usa por `/api-simples`. Sem ela, a tela estima pelas mesmas regras e avisa.
- **Calcular nota:** em 2026, sem CBS e IBS (LC 214, art. 348, III, "c"), com a referência do regime regular; de 2027 em diante, dentro do DAS, CBS e IBS do Simples (NFS-e com alíquota de 2 casas); por fora, pelo regime regular. O cupom traz o **DAS desta nota**, somado como no PGDAS.
- **Comparar datas:** cada cartão mostra o DAS da nota, e o terceiro cartão mostra a diferença no DAS.
- **Antes e depois:** usa as tabelas da lei pela faixa e pelo anexo do painel; saem os campos próprios de regime e de anexo da aba.
- **Conferir NF-e:** o CRT ajusta o painel. Nota do Simples em 2026 e MEI: não se aplica. De 2027 em diante: calcula os valores do Evento de Tributação do Simples Nacional; acima do sublimite, confere o IBS da nota.
- Novo exemplo: *Serviço de uma microempresa do Simples Nacional*.

### Desenvolvimento
- Motor simulado com as rotas do Simples; teste de tela e teste de fumaça com casos do Simples; o teste diário do motor oficial também acompanha as versões da calculadora do Simples.
- Teste de fumaça sem falso erro de SIGPIPE (`grep -c` no lugar de `grep -q`).

## 1.7.0 — 2026-11-27

Instaladores com ícone para Windows, Debian/Ubuntu e Fedora: a calculadora abre pelo menu, sem terminal, e se encerra sozinha quando você fecha a aba. A aba *Ajuda* virou um manual completo do que a ferramenta é, de como usar e do que cada número significa.

### Instaladores
- **Windows** (`CalculadoraRTC-<versão>-instalador-windows.exe`): assistente em português, instala sem pedir administrador, cria os atalhos *Calculadora RTC* e *Encerrar a Calculadora RTC* no Menu Iniciar e, se marcado, na Área de Trabalho. A desinstalação encerra a calculadora aberta e apaga o Java e o motor baixados.
- **Debian e Ubuntu** (`.deb`) e **Fedora** (`.rpm`): ícone no menu de aplicativos, com a ação *Encerrar a calculadora* no botão direito.
- Os instaladores têm menos de 1 MB: o Java e a calculadora oficial continuam sendo baixados na primeira abertura, agora na pasta do usuário (`%LOCALAPPDATA%\CalculadoraRTC` ou `~/.local/share/calculadora-rtc`).
- **Primeira abertura com janela de progresso:** o download do Java aparece numa janela (PowerShell no Windows; zenity ou kdialog no Linux), e a instalação da calculadora oficial aparece no navegador, como antes.
- **Ícone novo** de aplicativo (o recibo sobre fundo verde), legível em menus claros e escuros.
- A versão portátil (ZIP ou `git clone`, com `iniciar.bat` e `iniciar.sh`) continua igual.

### Abrir e fechar
- **Encerramento sozinho:** aberta pelo ícone, a calculadora se encerra 20 minutos depois que a última aba é fechada (`CALC_RTC_ENCERRAR_MIN` muda o tempo).
- **Botão *Encerrar a calculadora*** na aba *Ajuda*, que funciona também na versão portátil.
- **Uma calculadora por vez:** abrir de novo com ela aberta só abre outra aba na mesma, em vez de subir uma segunda cópia que disputaria a pasta do motor.
- Novas opções `--dados` (ou `CALC_RTC_DADOS`), `--atalho` e `--so-java`.

### Aba Ajuda
- Manual dentro da tela, que funciona offline: o que é a ferramenta e o que ela faz além da calculadora oficial; como abrir e fechar; como usar cada aba; o que cada número mostra (base, CBS, IBS, IS, redução, alíquota efetiva, situações, memória de cálculo) e o que não mostra; de onde vem cada número (calculadora oficial, estimativa da tela ou você); a reforma num quadro; e como funciona por dentro, com o caminho de um cálculo e a pasta onde ficam os arquivos.

### Correções
- **Downloads recusados por excesso de pedidos (HTTP 429):** a instalação do motor esperava só 5 e 10 segundos entre tentativas. Agora respeita o tempo que o servidor pede (`Retry-After`) ou espera 30, 60 e 120 segundos, com até 5 tentativas, e o Maven espera mais quando o repositório recusa. Foi o que derrubou o teste do Ubuntu em 27/11/2026.
- O teste diário com o motor oficial guarda as dependências do Maven entre execuções, e quase não baixa nada do Maven Central.
- **Windows: o Java baixa e extrai muito mais rápido na primeira abertura.** O script usava o `Invoke-WebRequest` e o `Expand-Archive` do PowerShell 5.1, que são lentíssimos com arquivos grandes: só extrair o Java podia levar mais de 10 minutos. Agora usa as rotinas do .NET (`WebClient` e `ZipFile`). O que a janela do download mostra fica registrado em `logs\java.log`.

### Repositório
- Novo workflow **Lançamento**: ao enviar a tag, monta a versão portátil e os três instaladores, homologa cada um num sistema limpo (instala, abre pelo lançador baixando o Java de verdade, abre de novo, encerra e desinstala, em Debian, Ubuntu LTS e mais recente, Fedora e Windows) e só então publica a release, com as notas do CHANGELOG e o `SHA256SUMS.txt`.
- A verificação a cada push também monta o `.deb` e confere o lançador, a tela e o ícone.

### Documentação
- README com a instalação pelos instaladores e a versão portátil como alternativa.
- *Como funciona*: lançadores, instaladores, pasta de dados, instância única e encerramento automático. *Solução de problemas*: onde ficam os registros, SmartScreen, como desinstalar. *Desenvolvimento*: como publicar uma versão e montar os pacotes. Novas perguntas frequentes e a comparação *Instalada × portátil* em *Diferenças*.

## 1.6.2 — 2026-11-27

Revisão contra as publicações do governo até 27/11/2026: calculadora oficial 1.7.3 (26/11), MP 1.399/2026 (Imposto Seletivo), cálculo do TCU para a CBS de 2027 (ainda pendente de resolução do Senado até 15/12/2026) e Anexos XVIII a XX da LC 214/2025 (Simples Nacional).

### Segurança
- **Java4Shell (CVE-2026-114938).** O painel e o motor oficial passam a subir com `-XX:-UseBASE64Intrinsics`, a mesma mitigação que a Receita adotou na versão oficial 1.7.1.
- **O Java portátil agora se atualiza.** Antes ele era baixado uma única vez e nunca mais trocado. Agora é baixado de novo a cada 90 dias (e na primeira abertura desta versão, para quem já tinha a pasta `dados/jdk`). Se o download falhar, a cópia atual continua em uso.

### Imposto Seletivo
- **Início em 2 de fevereiro de 2027.** Pela MP 1.399/2026 (art. 19), o IS só produz efeitos a partir de 02/02/2027, mas a base oficial começa em 01/01/2027 e exige o grupo do IS. Para datas de 1º de janeiro a 1º de fevereiro de 2027, a tela envia o IS com alíquota zero e avisa. A conferência de NF-e faz o mesmo.
- **Alíquotas sugeridas.** A base oficial (até a 1.7.3) não traz as alíquotas do IS. Itens de refrigerante e bebida açucarada (NCM 2202.10.00) e de cerveja de malte (2203) passam a vir com 2,6% e 4,2%, as alíquotas da MP. O campo continua editável.

### Correções
- **Conferir NF-e:** uma diferença de exatamente 1 centavo aparecia como *Diverge*, embora a tela dissesse que até 1 centavo era arredondamento. Relevante desde a 1.7.2 oficial, que mudou o arredondamento.
- **Simples Nacional de 2029 em diante:** a nota do quadro "dentro ou fora do DAS" informava o crédito do cliente só com a parte da CBS, sem a parte do IBS que entra no DAS. Os valores da tabela já estavam certos.
- **Partilha do Simples:** os Anexos II e III de 2027 e 2028 usavam uma divisão proporcional estimada; agora usam os percentuais da LC 214/2025 (13,85% + 0,15% e 15,43% + 0,17%). A diferença era menor que 0,01 ponto.

### Conferido e sem mudança
- CBS de 11,2% em 2027 e 2028 (referência de 11,3% calculada pelo TCU em 28/10/2026, menos 0,1 ponto) e IBS de 0,05% + 0,05%. O Senado ainda não votou a resolução; o prazo é 15/12/2026.
- Calculadora oficial 1.7.3: só ajusta datas de vigência de tabelas de NBS (indicador de operação), de 30/11 para 06/12/2026. Nada muda no uso desta ferramenta.

### Documentação e código
- Comentários para estudo em todo o código: cada função do front-end, do gerenciador Java e do motor simulado diz o que faz e por quê; as fórmulas e regras citam a lei de onde vêm.
- Pontos de atenção 5 (Imposto Seletivo), 11 (centavos, com a regra de arredondamento da 1.7.2) e 17 (Simples) atualizados. Política de segurança com a atualização do Java.
- Teste de tela: novo caso de janeiro de 2027, que confere o IS zero e o aviso.
- Revisão de toda a documentação para a 1.6.2:
  - **README:** Java renovado sozinho na lista de atualizações; o "teste semanal" passa a ser descrito como é (diário quando há versão nova da Receita, toda segunda em qualquer caso); exemplos com a versão oficial 1.7.3.
  - **Guia de uso:** campo do Imposto Seletivo (valores sugeridos e janeiro de 2027), o exemplo *Serviços de uma empresa do lucro presumido*, que faltava, e a regra de 1 centavo da conferência de NF-e.
  - **Entenda a reforma:** situação da CBS no Senado em 27/11/2026, partilha do Simples nos três anexos e em 2029, IS na tela; fontes oficiais do TCU, do Senado e do Congresso.
  - **Perguntas frequentes:** IS zero em janeiro, total do cupom após a 1.7.2 e por que o Java é baixado de novo.
  - **Como funciona:** quadro "O que a tela faz além de repassar", com cada estimativa e onde ela fica no código.
  - **Desenvolvimento:** *Roteiro para estudar o código* e convenções de comentário.
  - **Diferenças, Tributos e bases, Pontos de atenção (4 e 10), Solução de problemas, Como contribuir** e a aba *Ajuda* da tela atualizados.

## 1.6.1 — 2026-11-24

### Documentação e repositório
- **README novo**: ícone, selos de status (verificação, teste com o motor oficial, versão, versão da calculadora oficial, licença, downloads, sistemas, Java e JavaScript), navegação, tabela "O que ela faz" e a seção **Telas**, com capturas das abas *Calcular nota*, *Antes e depois*, *Conferir NF-e* e do quadro do Simples Nacional.
- **Índice da documentação** (`docs/README.md`), organizado pelo que você quer fazer.
- **Modelos de issue** (*Problema*, *Resultado estranho* e *Sugestão*), com link para informar erros de cálculo direto no repositório oficial da Receita.
- **Modelo de pull request**, com a lista de testes e de documentação.
- **Política de segurança** (`SECURITY.md`): como avisar sobre falhas em sigilo e o que a ferramenta faz com os seus dados.
- **Como contribuir** reescrito, e atualização mensal automática das *actions* do GitHub (Dependabot).

## 1.6.0 — 2026-11-24

### Conferir NF-e (aba nova)
- **Abra o XML de uma NF-e ou NFC-e** e confira, item por item, se a base, a CBS, o IBS e o Imposto Seletivo destacados batem com a calculadora oficial. A base de cada item é montada pela própria calculadora oficial com os valores da nota (produto, frete, seguro, outras despesas, desconto, ICMS, FCP, PIS/Cofins quando vigentes, Imposto Seletivo), pelas regras do ano de emissão.
- Cada item sai como *Confere*, *Diverge* (com o valor da nota e o oficial), *Erro* (com a mensagem da calculadora oficial) ou *Sem destaque*. Também há totais, avisos sobre a base, **Exportar CSV** e **Ver JSON**.
- Os itens, a data de emissão e o local vão para as outras abas. No *Antes e depois*, cada item já chega com os tributos de hoje que a nota traz: ICMS, FCP, PIS/Cofins, monofásico, substituição tributária e IPI.
- **Abrir itens ou NF-e**, na aba *Calcular nota*, também aceita o XML.
- Nota de exemplo (fictícia) de 2027, com um item calculado errado de propósito.

### Simples Nacional no Antes e depois
- Novo regime **Simples Nacional**, com anexo (comércio, indústria ou serviços), alíquota efetiva do DAS e a escolha de recolher CBS e IBS **dentro ou fora do DAS** a partir de 2027.
- O quadro novo compara as duas opções: preço, crédito que um cliente empresa aproveita e custo para esse cliente depois de descontar o crédito.
- A conta considera que a empresa do Simples não aproveita crédito do que compra: o PIS/Cofins, o ICMS e, dentro do DAS, a CBS e o IBS do fornecedor ficam no custo.

### Compartilhar e imprimir
- **Copiar link**: gera um endereço com a nota inteira dentro dele (itens, local, datas, alíquotas e ajustes). Os dados não passam por nenhum servidor.
- **Imprimir ou salvar PDF** nas abas *Comparar datas*, *Antes e depois* e *Conferir NF-e*. A impressão sai sem botões e com data e versão do motor no topo. O *Antes e depois* ganha o quadro **Premissas deste cálculo**.

### Alíquota oficial da CBS
- Quando a base da calculadora oficial trouxer a alíquota de referência, a tela usa a oficial e avisa se ela for diferente da estimativa desta ferramenta. Depois de 15/12/2026, a nota da estimativa passa a pedir que se confira a decisão do Senado.

### Verificação automática da versão do governo
- A verificação com o motor oficial passa a rodar **todo dia** e só testa quando a Receita publicou uma versão ainda não testada. Às segundas-feiras, testa sempre.
- Novo **teste de tela** (`dev/teste_tela.py`): usa as abas num navegador sem janela, com a calculadora oficial de verdade, e confere, por exemplo, o Imposto Seletivo do refrigerante e a conferência da nota de exemplo. Ele também roda a cada push, com o motor simulado.
- Se uma execução agendada falhar, um aviso (*issue*) é aberto no repositório.

### Outros
- Novo exemplo: **Serviços de uma empresa do lucro presumido**, o caso em que a troca de PIS/Cofins por CBS mais pesa.
- Celular: as abas ficam numa linha só, com rolagem lateral, e o cabeçalho ocupa menos espaço.
- *Começar do zero* também apaga a NF-e aberta.
- Documentação: guia de uso (Conferir NF-e, Simples Nacional, link, impressão), pontos de atenção 17 e 18, perguntas frequentes, *Entenda a reforma* (Simples Nacional), como funciona, desenvolvimento e solução de problemas.

## 1.5.0 — 2026-11-23

### Alíquota da CBS
- **A estimativa padrão da CBS passa de 8,8% para 11,2% em 2027 e 2028.** O Tribunal de Contas da União calculou em 28/10/2026 a alíquota de referência da CBS para 2027 em 11,3%, pendente de resolução do Senado até 15/12/2026. Pela LC 214 (art. 347), em 2027 e 2028 ela é reduzida em 0,1 ponto. De 2029 em diante, a tela usa 11,3% como ponto de partida, porque a referência é recalculada a cada ano.
- A nota ao lado das alíquotas explica a origem do valor. Quando a calculadora oficial trouxer a alíquota fixada pelo Senado, ela é usada no lugar da estimativa.
- **Impacto:** com 11,2%, produtos comprados no comércio do lucro real ficam parecidos com hoje em 2027, e não mais baratos como sugeria a estimativa antiga. Serviços do lucro presumido sobem mais.

### Começar do zero
- **Novo botão no alto da tela** que apaga tudo o que a calculadora guardou no navegador (itens, local, datas, alíquotas e ajustes do *Antes e depois*) e recarrega a página. Útil para limpar restos de testes antigos.
- A janela de confirmação mostra o que é apagado e o que continua (motor instalado, relação de NCM) e oferece salvar os itens num arquivo antes.
- Se dados antigos travarem a tela, abrir o endereço com `?limpar` tem o mesmo efeito.

### Documentação
- Nova pergunta frequente: *Os preços vão subir ou cair depois da reforma?*
- *Entenda a reforma* ganha a seção sobre a alíquota de referência da CBS em 2027, com as fontes.
- Pontos de atenção, guia de uso, glossário e a aba *Ajuda* atualizados com a nova estimativa.

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
- **Instalação mais resistente a falhas de rede.** O programa baixa por conta própria o Maven Wrapper da calculadora oficial, com até 3 tentativas, e repete uma vez cada etapa do Maven que falhar. Antes, uma queda no download desse arquivo fazia a instalação falhar com "MavenWrapperMain não encontrado".

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
