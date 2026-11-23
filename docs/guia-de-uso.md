# Guia de uso

> Antes de usar os resultados, leia os [pontos de atenção](pontos-de-atencao.md). Para entender CBS, IBS, Imposto Seletivo e o cronograma, veja [entenda a reforma](entenda-a-reforma.md).

## A tela

| Aba | Para que serve |
|---|---|
| **Calcular nota** | Montar uma nota com seus itens e calcular CBS, IBS e Imposto Seletivo. |
| **Comparar datas** | Calcular a mesma nota em duas datas e ver a diferença item a item. |
| **Consultar códigos** | Procurar NCM por código ou descrição e ver as classificações tributárias vigentes. |
| **Ajuda** | Versão em uso, botão de atualização, registro técnico e acesso à API (Swagger). |

## O que vale em todas as abas e o que é de cada aba

| Dado | Onde vale |
|---|---|
| Itens da nota (inclusive a alíquota estimada do Imposto Seletivo de cada item) | Em todas as abas |
| UF e município | Em todas as abas |
| Data | Só na aba onde foi escolhida: o cálculo tem uma data, a comparação tem duas |
| Alíquotas de CBS e IBS (2027 em diante) | Só na aba onde foram preenchidas |

Na tela, esses dados aparecem com os selos **vale em todas as abas** e **só nesta aba**.

## Operação

- **Data da operação**: define as regras aplicadas. Na API ela corresponde ao campo `dhFatoGerador`.
  - **2026**: ano de teste. CBS de 0,9% e IBS de 0,1%, compensados com PIS/Cofins. As alíquotas vêm da base oficial, e a calculadora **não aceita** alíquotas informadas.
  - **A partir de 2027**: a calculadora oficial **exige** que as alíquotas sejam informadas, e o resultado aparece como *cálculo simulado*. A partir da versão 1.7.2, a base oficial não traz alíquotas de referência para esses anos. Por isso a tela preenche **estimativas, sempre avisando**: CBS de 8,8% (a do exemplo da documentação oficial) e IBS de 0,05% + 0,05% em 2027 e 2028, fixados pela Emenda Constitucional 132. De 2029 em diante o IBS fica em branco para você informar. Se a Receita voltar a publicar referências, elas passam a ser usadas automaticamente.
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
| Imposto Seletivo % (a partir de 2027) | Aparece só nos produtos sujeitos ao IS (bebidas açucaradas e alcoólicas, cigarros, veículos...), mesmo com a data em 2026, porque é usado na comparação com 2027. As alíquotas de 2027 estão na MP 1.399/2026 e variam por produto: veja a [tabela](entenda-a-reforma.md#imposto-seletivo-em-2027). |

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
- **Compras do dia a dia (com Imposto Seletivo)**: itens com tributação cheia, itens de higiene com redução e bebidas sujeitas ao IS.
- **Exemplo da documentação oficial**: o mesmo caso do repositório da Receita.

### Salvar e abrir

**Salvar itens** gera um arquivo `.json` com a nota. **Abrir itens** aceita esse arquivo e também um JSON no formato da API oficial. Os itens também ficam salvos no navegador entre um uso e outro.

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

Usa os itens, a UF e o município da aba *Calcular nota*. O resumo da nota aparece no topo, com um botão para voltar e editar. As datas e as alíquotas são próprias desta aba: para datas a partir de 2027, os campos de CBS e IBS aparecem ao lado da data, já preenchidos (com estimativa, quando a base oficial não tem o valor). Se algum item paga Imposto Seletivo, aparece também o quadro **Imposto Seletivo**, com a alíquota estimada de cada um. O mesmo valor fica guardado no item.

**Atenção ao interpretar**: a calculadora mostra só os tributos **novos**. PIS, Cofins, ICMS, ISS e IPI não aparecem. Em 2027 a CBS **substitui** o PIS e a Cofins, então o aumento que aparece na comparação não é o aumento de preço para o consumidor. O que é realmente novo é o **Imposto Seletivo**.

## Acesso pela rede (por exemplo, de fora de uma máquina virtual)

Inicie com `--rede` e acesse `http://IP-DA-MAQUINA:8090` de outro computador. Use só em redes de confiança: não há senha.
