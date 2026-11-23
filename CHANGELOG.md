# Mudanças

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
