# Guia de uso

## A tela

| Aba | Para que serve |
|---|---|
| **Calcular nota** | Montar uma nota com seus itens e calcular CBS, IBS e Imposto Seletivo. |
| **Comparar datas** | Calcular a mesma nota em duas datas e ver a diferença item a item. |
| **Consultar códigos** | Procurar NCM por código ou descrição e ver as classificações tributárias vigentes. |
| **Ajuda** | Versão em uso, botão de atualização, registro técnico e acesso à API (Swagger). |

## Operação

- **Data da operação**: define as regras aplicadas. Na API ela corresponde ao campo `dhFatoGerador`.
  - **2026**: ano de teste. CBS de 0,9% e IBS de 0,1%, compensados com PIS/Cofins. As alíquotas vêm da base oficial, e a calculadora **não aceita** alíquotas informadas.
  - **A partir de 2027**: a calculadora oficial **exige** que as alíquotas sejam informadas. A tela já preenche com as alíquotas de referência da base oficial para a data e o local escolhidos. Você pode alterar para simular outros cenários. Nesse caso o resultado aparece como *cálculo simulado*.
- **UF e município**: local da operação. Importa para o IBS.

## Itens

| Campo | O que informar |
|---|---|
| Descrição | Só para você se orientar. Não é enviada à calculadora. |
| Tipo | **Produto** (código NCM, 8 dígitos) ou **Serviço** (código NBS, 9 dígitos). |
| NCM / NBS | Digite os primeiros dígitos para ver sugestões. Abaixo do campo aparece a descrição oficial. |
| Classificação tributária | O `cClassTrib`. Define o tratamento, por exemplo `000001` tributação integral, `200003` cesta básica (redução de 100%) ou `200035` higiene e limpeza (redução de 60%). O CST é preenchido automaticamente. |
| Valor | Valor do item (base de cálculo). |
| Quantidade e unidade | Opcionais para a maioria dos itens. |
| Imposto Seletivo % | Aparece só a partir de 2027 e só para produtos sujeitos ao IS (bebidas açucaradas, alcoólicas, cigarros, veículos...). As alíquotas definitivas ainda dependem de lei. Quando a base oficial não tem um valor, informe uma estimativa. |

Se a classificação não combina com o NCM, por exemplo um item que não é da cesta básica marcado como `200003`, a calculadora devolve o erro **REG-011** naquele item. Os outros itens são calculados normalmente.

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

Usa os itens, a UF e o município da aba *Calcular nota*. Em datas a partir de 2027 usa as alíquotas de referência da base oficial.

**Atenção ao interpretar**: a calculadora mostra só os tributos **novos**. PIS, Cofins, ICMS, ISS e IPI não aparecem. Em 2027 a CBS **substitui** o PIS e a Cofins, então o aumento que aparece na comparação não é o aumento de preço para o consumidor. O que é realmente novo é o **Imposto Seletivo**.

## Acesso pela rede (por exemplo, de fora de uma máquina virtual)

Inicie com `--rede` e acesse `http://IP-DA-MAQUINA:8090` de outro computador. Use só em redes de confiança: não há senha.
