# Diferenças que confundem

Coisas parecidas que funcionam de jeitos diferentes, lado a lado.

## Calculadora oficial × Calculadora RTC Fácil

| | Calculadora oficial (Receita Federal) | Calculadora RTC Fácil |
|---|---|---|
| O que é | Uma API, ou seja, um serviço sem tela, que faz os cálculos | Instalador, atualizador e uma tela para a calculadora oficial |
| Quem calcula | Ela mesma | **A oficial.** Esta ferramenta não tem regra tributária própria. |
| Instalação | Manual: Java 25, Git, Maven, gerar o banco, compilar | Um clique; o Java vem junto |
| Atualização | Manual (baixar e recompilar) | Automática, sem fechar a tela |
| Como usar | Enviando JSON pela API ou pelo Swagger | Formulário, exemplos prontos e resultado em cupom |
| Classificação tributária | Você precisa saber o código | Sugere a partir do NCM, com o trecho do anexo |
| Alíquotas de 2027 em diante | Você precisa informar | Preenche com a referência oficial ou com uma estimativa marcada |

O que a ferramenta **acrescenta** são conveniências de entrada e leitura. Toda conta, validação e mensagem de erro vem da calculadora oficial. O botão *Ver JSON* mostra exatamente o que foi enviado e recebido.

## Comparar datas × Antes e depois

| | Comparar datas | Antes e depois |
|---|---|---|
| Mostra | Só os tributos novos (CBS, IBS, IS) em duas datas | Os tributos de hoje (PIS/Cofins, ICMS/ISS, IPI) **e** os de depois (CBS, IBS, IS e o ICMS/ISS que fica) |
| Valor do item | Usado como base de cálculo | Tratado como preço de hoje, com tributos embutidos |
| De onde vêm os números | Todos da calculadora oficial | Os novos da calculadora oficial; os atuais são **estimados** pela tela |
| Responde | "Como cada item passa a ser tributado?" | "Quanto pago hoje, quanto vou pagar, o que migra e o que fica?" |
| Preço estimado | Não | Sim, com margem constante e repasse integral |

## Calculado × Simulado × Erro

| Situação | Quando aparece | Confiável para… |
|---|---|---|
| **Calculado** | Datas de 2026: alíquotas e reduções vêm da base oficial | Conferir o destaque na nota fiscal |
| **Simulado** | Datas de 2027 em diante: as alíquotas foram informadas (por você ou por estimativa da tela) | Simular cenários. O número depende das alíquotas usadas. |
| **Erro nos dados** | Combinação inválida (NCM × classificação, campo faltando…) | Nada. O item fica fora do total. |
| **Não implementado / Falha técnica** | A calculadora oficial não cobre o caso ou teve um problema | Nada. Veja a mensagem e o log. |

## O que vale em todas as abas × o que é de cada aba

| Dado | Calcular nota | Comparar datas | Consultar códigos |
|---|---|---|---|
| Itens da nota | ✔ (edita aqui) | ✔ (usa os mesmos) | — |
| Alíquota de Imposto Seletivo de cada item | ✔ | ✔ (o mesmo valor) | — |
| UF e município | ✔ (edita aqui) | ✔ (usa os mesmos) | — |
| Data | uma, só desta aba | duas, só desta aba | segue a data da aba Calcular |
| Alíquotas de CBS e IBS (2027 em diante) | só desta aba | uma por data, só desta aba | — |

Na tela, os selos **vale em todas as abas** e **só nesta aba** marcam cada bloco.

## CBS × IBS × Imposto Seletivo

| | CBS | IBS | Imposto Seletivo |
|---|---|---|---|
| Esfera | Federal | Estadual + municipal | Federal |
| Substitui | PIS e Cofins | ICMS e ISS | Parte do IPI |
| Incide sobre | Quase tudo | Quase tudo | Só produtos listados |
| Gera crédito para quem compra | Sim | Sim | Não |
| Na base da CBS e do IBS | — | — | **Entra:** a base da CBS e do IBS é o valor mais o IS |
| Valor cheio a partir de | 2027 | 2033 (sobe de 2029 a 2032) | 2027 (pela MP, a partir de 2 de fevereiro) |

## Redução de 100% × imunidade × isenção

Todas zeram o tributo, mas por motivos diferentes e com códigos diferentes. Isso importa na nota fiscal e para o crédito de quem compra.

| | O que é | CST típico | Exemplo |
|---|---|---|---|
| **Redução de 100%** | A alíquota existe, mas é reduzida a zero por lei | `200` (alíquota reduzida) | Cesta Básica Nacional |
| **Imunidade / não incidência** | A Constituição impede a cobrança, ou a operação nem é tributável | `410` | Exportações (`410004`), livros e jornais (`410008`), transferências entre filiais (`410002`) |
| **Isenção** | A lei dispensa o tributo | `400` | Transporte público coletivo de passageiros (`400001`) |

## NCM × NBS

| | NCM | NBS |
|---|---|---|
| Classifica | Produtos (mercadorias) | Serviços |
| Dígitos | 8 | 9 |
| Na tela | Tipo **Produto**, com autocompletar e sugestão de classificação | Tipo **Serviço**; a classificação é escolhida na lista |

## CST × cClassTrib

| | CST | cClassTrib |
|---|---|---|
| Dígitos | 3 | 6 (os 3 primeiros são o CST) |
| Diz | O tipo de tratamento (integral, reduzida, isenção…) | Qual benefício exatamente (cesta básica, higiene, educação…) |
| Na tela | Preenchido sozinho | Escolhido por você, com sugestões |

## Calcular por item × total oficial

| | Soma dos itens | Total oficial (cupom) |
|---|---|---|
| Arredondamento | Cada item é arredondado | A calculadora arredonda o total |
| Itens com erro | Aparecem com valor zero | Ficam de fora |

Diferenças de centavos são esperadas. Para conferir um ERP, compare item a item.

## Endpoint de observabilidade × endpoint do regime geral

A tela usa o endpoint **com observabilidade** da calculadora oficial.

| | `/observabilidade/regime-geral` (usado pela tela) | `/regime-geral` |
|---|---|---|
| Item com erro | Os outros itens são calculados; o erro aparece no item | A nota inteira é recusada (HTTP 422) |
| Uso típico | Simular e conferir | Integrar com o emissor de notas |

## Atualizar o motor × atualizar a ferramenta

| | Motor (calculadora oficial) | Ferramenta (tela e scripts) |
|---|---|---|
| Quem publica | Receita Federal | Este projeto |
| Como atualiza | Sozinho, ao abrir e a cada 6 horas | `git pull` ou baixar a release nova (copie a pasta `dados/`) |
| Onde ver a versão | Selo no canto superior direito | Arquivo `CHANGELOG.md` |
