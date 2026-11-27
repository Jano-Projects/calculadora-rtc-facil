# Guia de uso

> Antes de usar os resultados, leia os [pontos de atenção](pontos-de-atencao.md). Para entender CBS, IBS, Imposto Seletivo e o cronograma, veja [entenda a reforma](entenda-a-reforma.md).

## A tela

| Aba | Para que serve |
|---|---|
| **Calcular nota** | Montar uma nota com seus itens e calcular CBS, IBS e Imposto Seletivo. |
| **Comparar datas** | Calcular a mesma nota em duas datas e ver a diferença nos tributos novos, item a item. |
| **Antes e depois** | Comparar a carga de hoje (PIS/Cofins, ICMS/ISS, IPI) com a de depois da reforma (CBS, IBS, IS e o ICMS/ISS que fica), com o preço estimado. |
| **Conferir NF-e** | Abrir o XML de uma NF-e ou NFC-e, conferir CBS, IBS e Imposto Seletivo destacados contra a calculadora oficial e levar os itens para as outras abas. |
| **Consultar códigos** | Procurar NCM por código ou descrição e ver as classificações tributárias vigentes. |
| **Ajuda** | Versão em uso, botão de atualização, registro técnico e acesso à API (Swagger). |

## O que vale em todas as abas e o que é de cada aba

| Dado | Onde vale |
|---|---|
| Itens da nota (inclusive a alíquota estimada do Imposto Seletivo de cada item) | Em todas as abas |
| UF e município | Em todas as abas |
| Data | Só na aba onde foi escolhida: o cálculo tem uma data, a comparação tem duas |
| Alíquotas de CBS e IBS (2027 em diante) | Só na aba onde foram preenchidas |
| NF-e aberta | Os itens, a data e o local vão para todas as abas; a conferência fica na aba *Conferir NF-e* |

Na tela, esses dados aparecem com os selos **vale em todas as abas** e **só nesta aba**.

## Operação

- **Data da operação**: define as regras aplicadas. Na API ela corresponde ao campo `dhFatoGerador`.
  - **2026**: ano de teste. CBS de 0,9% e IBS de 0,1%, compensados com PIS/Cofins. As alíquotas vêm da base oficial, e a calculadora **não aceita** alíquotas informadas.
  - **A partir de 2027**: a calculadora oficial **exige** que as alíquotas sejam informadas, e o resultado aparece como *cálculo simulado*. Desde a versão 1.7.2 (e ainda na 1.7.3), a base oficial não traz alíquotas de referência para esses anos. Por isso a tela preenche **estimativas, sempre avisando**: CBS de 11,2% em 2027 e 2028 (a referência de 11,3% calculada pelo TCU, pendente de resolução do Senado até 15/12/2026, menos 0,1 ponto) e IBS de 0,05% + 0,05% em 2027 e 2028, fixados pela Emenda Constitucional 132. De 2029 em diante o IBS fica em branco para você informar. Se a Receita voltar a publicar referências, elas passam a ser usadas automaticamente.
- **UF e município**: local da operação. Importa para o IBS.

## Itens

| Campo | O que informar |
|---|---|
| Descrição | Só para você se orientar. Não é enviada à calculadora. |
| Tipo | **Produto** (código NCM, 8 dígitos) ou **Serviço** (código NBS, 9 dígitos). |
| NCM / NBS | Digite os primeiros dígitos para ver sugestões. Abaixo do campo aparece a descrição oficial. |
| Classificação tributária | O `cClassTrib`. Define o tratamento, por exemplo `000001` tributação integral, `200003` cesta básica (redução de 100%) ou `200035` higiene e limpeza (redução de 60%). O CST é preenchido automaticamente. Veja como escolher logo abaixo. |
| Valor | Valor do item (base de cálculo). |
| Quantidade e unidade | Opcionais para a maioria dos itens. |
| Imposto Seletivo % (a partir de 2027) | Aparece só nos produtos sujeitos ao IS (bebidas açucaradas e alcoólicas, cigarros, veículos...), mesmo com a data em 2026, porque é usado na comparação com 2027. As alíquotas de 2027 estão na MP 1.399/2026 e variam por produto: veja a [tabela](entenda-a-reforma.md#imposto-seletivo-em-2027). Refrigerantes e bebidas açucaradas (NCM 2202.10.00) já vêm com 2,6%, e cervejas de malte (2203) com 4,2%; nos outros produtos, informe a alíquota. Para datas de 1º de janeiro a 1º de fevereiro de 2027, o IS entra com **zero**, porque pela MP ele só é cobrado a partir de 2 de fevereiro, e um aviso aparece ao lado do botão *Calcular*. |

### Como escolher a classificação tributária

Ao digitar o NCM, aparecem abaixo do item as **classificações vinculadas a esse NCM na base oficial**. Cada uma traz o percentual de redução e o trecho do anexo da LC 214 que a justifica, por exemplo *Anexo I, item 1: Arroz das subposições 1006.20…*. Clique na que corresponde à sua operação.

- **Um NCM pode ter várias opções.** O arroz, por exemplo, aparece na cesta básica (Anexo I), no fornecimento de alimentos (Anexo VII) e em insumos agropecuários (Anexo IX). A escolha depende de quem vende, para quem e para quê. Na venda comum ao consumidor, costuma ser o Anexo I.
- **NCM sem benefício vinculado:** a tela já escolhe `000001` (tributação integral) e avisa. Mude só se a operação tiver outro tratamento, como imunidade ou exportação.
- **Benefícios que não dependem do NCM** (medicamentos registrados na Anvisa, compras governamentais, exportação…) não aparecem nas sugestões. Escolha-os na lista.
- **Classificação que não vale para o NCM:** se você escolher uma classificação com lista própria de NCMs e o item não estiver nela, a tela avisa antes de calcular. Se mesmo assim enviar, a calculadora devolve o erro **REG-011** naquele item e calcula os outros normalmente.

Na dúvida, confira o `cClassTrib` na NF-e do fornecedor ou com o contador.

A relação NCM × classificação é extraída do banco da versão instalada da calculadora oficial. Ela se atualiza sozinha junto com o motor.

### Exemplos prontos

- **Cesta básica completa**: 22 itens em Nova Odessa/SP, incluindo hortifrúti (Anexo XV) e óleo de soja (Anexo VII, redução de 60%).
- **Compras do dia a dia (com Imposto Seletivo)**: 12 itens com tributação cheia, itens de higiene com redução e bebidas sujeitas ao IS.
- **Serviços de uma empresa do lucro presumido**: 3 serviços (NBS), o caso em que a troca do PIS/Cofins de 3,65% pela CBS mais pesa. Bom para testar a aba *Antes e depois*.
- **Exemplo da documentação oficial**: o mesmo caso do repositório da Receita, em Porto Alegre/RS.

### Salvar e abrir

**Salvar itens** gera um arquivo `.json` com a nota. **Abrir itens ou NF-e** aceita esse arquivo, um JSON no formato da API oficial e o XML de uma NF-e ou NFC-e (nesse caso, a tela vai para a aba *Conferir NF-e*). Os itens também ficam salvos no navegador entre um uso e outro.

### Copiar link

**Copiar link** gera um endereço com a nota inteira dentro dele: itens, local, datas, alíquotas e ajustes do *Antes e depois*. Quem abrir o link numa Calculadora RTC Fácil vê a mesma nota. Os dados não passam por nenhum servidor, porque vão no próprio endereço, e a pessoa precisa ter a ferramenta rodando no computador dela. Se ela usar outra porta, basta trocar o número depois de `localhost:`. A NF-e aberta não vai no link.

### Imprimir ou salvar PDF

As abas *Comparar datas*, *Antes e depois* e *Conferir NF-e* têm o botão **Imprimir ou salvar PDF**. A impressão tira botões e campos de edição e põe no topo a data e a versão do motor. No *Antes e depois*, o quadro **Premissas deste cálculo** registra as hipóteses usadas. Para gerar PDF, escolha "Salvar como PDF" na janela de impressão do navegador.

### Começar do zero

O botão **Começar do zero**, no alto da tela, apaga tudo o que a calculadora guardou neste navegador e recarrega a página:

| É apagado | Continua como está |
|---|---|
| Itens da nota | Motor de cálculo oficial instalado |
| Data, UF e município da operação | Relação de NCM e classificações |
| Datas e alíquotas da aba Comparar datas | Arquivos que você já salvou |
| Ajustes da aba Antes e depois (preço de fábrica, regime, ICMS, monofásico, ST) | |

Antes de apagar, a janela mostra quantos itens existem e oferece **Salvar os itens antes**. O botão **Limpar**, ao lado de *Adicionar item*, é diferente: tira só os itens e mantém as outras escolhas.

Se a tela travar por causa de dados antigos e o botão não responder, abra o endereço com `?limpar` no final, por exemplo `http://localhost:8090/?limpar`. O efeito é o mesmo.

## Resultado

- **Cupom**: total dos itens, CBS, IBS, Imposto Seletivo e o total de tributos novos, com a carga em % do valor.
- **Detalhamento por item**: redução aplicada, alíquota efetiva da CBS, valores e situação de cada item. **Clique numa linha** para ver a *memória de cálculo* oficial, ou seja, o texto da calculadora explicando a conta.
- **Situação**:
  - *Calculado*: cálculo normal.
  - *Simulado*: usou alíquotas informadas (2027 em diante).
  - *Erro nos dados*: o item não entrou no total. O motivo aparece logo abaixo da linha.
- **Baixar planilha (CSV)**: abre no Excel ou no LibreOffice (separador `;`).
- **Ver JSON**: mostra exatamente o que foi enviado e recebido da calculadora oficial. Serve para conferir integrações e para homologação de ERP.

## Comparar datas

Usa os itens, a UF e o município da aba *Calcular nota*. O resumo da nota aparece no topo, com um botão para voltar e editar. As datas e as alíquotas são próprias desta aba: para datas a partir de 2027, os campos de CBS e IBS aparecem ao lado da data, já preenchidos (com estimativa, quando a base oficial não tem o valor). Se algum item paga Imposto Seletivo, aparece também o quadro **Imposto Seletivo**, com a alíquota de cada um (a da MP, quando a tela a conhece, ou a que você informou). O mesmo valor fica guardado no item. Se uma das datas cair entre 1º de janeiro e 1º de fevereiro de 2027, o IS dela entra com zero e a tela avisa.

**Atenção ao interpretar**: a calculadora mostra só os tributos **novos**. PIS, Cofins, ICMS, ISS e IPI não aparecem. Em 2027 a CBS **substitui** o PIS e a Cofins, então o aumento que aparece na comparação não é o aumento de preço para o consumidor. O que é realmente novo é o **Imposto Seletivo**.

## Antes e depois

Esta aba responde "quanto pago hoje, quanto vou pagar e o que muda de lugar". Ela usa os itens e o local da aba *Calcular nota* e trata o **Valor** de cada item como o **preço de venda de hoje**, com os tributos atuais embutidos.

1. **Cenários.** *Antes* usa as regras de 2026, na data de hoje. *Depois* é a data que você escolher, de 2027 em diante, e traz o mesmo quadro de alíquotas de CBS e IBS da comparação.
2. **Tributos atuais.**
   - **Quem vende:** *comércio* (varejo ou atacado) ou *indústria/importador*. No comércio, IPI, Imposto Seletivo, PIS/Cofins monofásico e ICMS-ST chegam **embutidos no custo**, calculados sobre o **preço de fábrica** (padrão: 60% do preço de venda).
   - **Regime de PIS/Cofins:** não cumulativo (lucro real, 9,25%), cumulativo (lucro presumido, 3,65%) ou **Simples Nacional**. Veja [Simples Nacional](#simples-nacional) abaixo.
   - **ICMS e ISS:** o ICMS vem com a alíquota geral do estado em 2026, e o ISS dos serviços com 5%.
   - **ICMS de 2027 em diante:** CBS e IBS fora da base (padrão, como em 2026) ou dentro da base (se os estados incluírem).
   - **Tabela por item:** PIS/Cofins %, monofásico (marcador e %), ICMS/ISS %, FCP %, ICMS-ST (marcador) e IPI %. Ajuste o que for diferente: ICMS reduzido da cesta básica no seu estado, IPI da TIPI, FCP.
3. **Resultado.**
   - **Cartões:** a carga de hoje, a de depois e o preço estimado.
   - **Tributos sobre o consumo do produto:** separa o que é **destacado nesta venda** do que vem **embutido no custo**.
   - **Migra:** o PIS/Cofins virando CBS, e o IPI virando Imposto Seletivo ou zero.
   - **Fica:** o ICMS/ISS, que continua até 2028 e cai de 2029 a 2032.
   - **Composição do preço:** barras com o valor sem tributos e cada tributo, hoje e depois.
   - **Tabela por item:** todos os valores lado a lado. Os embutidos no custo aparecem em itálico.

### Simples Nacional

Escolha *Simples Nacional* em **Regime de PIS/Cofins**. Aparecem três campos:

- **Anexo:** I (comércio), II (indústria) ou III (serviços). Itens de serviço (NBS) usam sempre o Anexo III.
- **Alíquota efetiva do DAS:** a que a empresa paga hoje. O padrão é a da 1ª faixa (4%, 4,5% e 6%).
- **De 2027 em diante, CBS e IBS:** *dentro do DAS* (padrão) ou *por fora, pelo regime regular* (o chamado Simples híbrido).

O campo de preço de fábrica vira **Custo das compras**, porque a empresa do Simples não aproveita crédito do que compra. O PIS/Cofins e o ICMS que o fornecedor pagou ficam no custo dela. De 2027 em diante, dentro do DAS, a CBS e o IBS do fornecedor também ficam.

| | Hoje | Dentro do DAS (2027 e 2028) | Por fora |
|---|---|---|---|
| PIS/Cofins | Parte do DAS (Anexo I, 1ª faixa: 15,50% da guia) | Vira CBS (15,33%) e IBS (0,17%) dentro da guia | CBS e IBS cheios, com crédito do que comprar |
| ICMS ou ISS | Parte do DAS (Anexo I: 34% da guia) | Continua no DAS | Continua no DAS |
| Crédito do cliente empresa | Não se aplica | Só a parte de CBS e IBS paga no DAS (Anexo I, 1ª faixa: 0,62% da venda) | A CBS e o IBS cheios |

O resultado ganha o quadro **Simples Nacional: CBS e IBS dentro ou fora do DAS**, com as duas opções lado a lado. Ele mostra o preço, o crédito que um cliente empresa aproveita e o custo para esse cliente depois de descontar o crédito. Em geral, recolher dentro do DAS deixa o preço menor para o consumidor final, e recolher por fora deixa a compra mais barata para clientes empresa. Veja o [ponto de atenção 17](pontos-de-atencao.md#17-simples-nacional-dentro-ou-fora-do-das-é-uma-decisão-com-o-contador).

Os tributos novos vêm da calculadora oficial. Os atuais são **estimativas** a partir das alíquotas da tela. Antes de usar os números, leia as premissas no fim da aba, os pontos de atenção [14](pontos-de-atencao.md#14-antes-e-depois-é-uma-estimativa-com-premissas), [15](pontos-de-atencao.md#15-a-cbs-e-o-ibs-podem-entrar-na-base-do-icms-a-partir-de-2027) e [16](pontos-de-atencao.md#16-o-total-não-é-a-carga-tributária-completa-do-produto), e o guia de [tributos e bases](tributos-e-bases.md).

## Conferir NF-e

Abra o XML de uma NF-e (modelo 55) ou NFC-e (modelo 65), com ou sem o protocolo de autorização, ou clique em **Usar uma nota de exemplo**. O XML é lido no navegador e não sai do computador.

**O que vai para as outras abas.** Cada item da nota vira um item da nota da tela, com descrição, NCM, classificação tributária, quantidade e valor (produto + frete + seguro + outras despesas − desconto). A data de emissão vira a data da operação, e o local passa a ser o do destinatário, ou o do emitente quando a nota não tem destinatário (NFC-e). No *Antes e depois*, cada item já chega com os tributos de hoje que a nota traz: ICMS, FCP, PIS/Cofins (incluindo o monofásico, pelo CST 04), substituição tributária e IPI. Se o emitente for do Simples Nacional, o regime muda para Simples.

**A conferência.** Para cada item, a calculadora oficial:

1. monta a base de CBS e IBS e a do Imposto Seletivo com os valores da própria nota, pelas regras do ano de emissão. Por exemplo, o ICMS sai da base até 2032, o PIS/Cofins só em 2026 e o Imposto Seletivo entra de 2027 em diante;
2. calcula CBS, IBS e Imposto Seletivo com o CST e a classificação tributária da nota;
3. a tela compara com o que a nota destacou.

As alíquotas usadas são as de **referência** para a data da nota, não as da nota, para mostrar se a nota usou a alíquota certa. Elas podem ser alteradas no quadro *Alíquotas da conferência*. Numa nota emitida antes de 2 de fevereiro de 2027, o Imposto Seletivo é conferido com alíquota zero.

| Situação | Significado |
|---|---|
| **Confere** | Base, CBS, IBS e Imposto Seletivo iguais, com até 1 centavo de diferença (a calculadora oficial arredonda cada valor uma vez só, e um sistema emissor que arredonde no fim pode ficar 1 centavo diferente). |
| **Diverge** | Algum valor ou a classificação é diferente. A linha de baixo mostra o que diverge, com o valor da nota e o oficial. |
| **Erro** | A calculadora oficial recusou o item, por exemplo com uma classificação que não vale para o NCM ou para o tipo de documento. A linha de baixo mostra o código e a mensagem. |
| **Sem destaque** | A nota não traz o grupo de CBS e IBS. A tela mostra o que a calculadora oficial calcularia. |

**Exportar CSV** gera a conferência numa planilha (separador `;`), e **Ver JSON** mostra exatamente o que foi enviado e recebido da calculadora oficial. É útil para homologar o cálculo de um sistema emissor: emita notas de teste, abra os XMLs aqui e veja onde o sistema diverge da calculadora oficial.

## Acesso pela rede (por exemplo, de fora de uma máquina virtual)

Inicie com `--rede` e acesse `http://IP-DA-MAQUINA:8090` de outro computador. Use só em redes de confiança: não há senha.
