# Perguntas frequentes

### Por que uma nota de 2026 mostra só centavos de tributo?
Porque 2026 é o ano de teste: CBS de 0,9% e IBS de 0,1%, e itens com benefício (como a cesta básica) zeram até isso. A tela também não mostra PIS, Cofins, ICMS, ISS nem IPI, que continuam valendo integralmente em 2026. Veja o [ponto de atenção 1](pontos-de-atencao.md#1-o-resultado-mostra-só-os-tributos-novos).

### A comparação 2026 × 2027 mostra que os preços vão subir dez vezes?
Não. Em 2027 a CBS substitui o PIS e a Cofins, que deixam de existir, mas a calculadora não mostra os tributos que saem. O aumento que aparece é a troca de um tributo pelo outro, e não um aumento de preço. Veja o [ponto de atenção 2](pontos-de-atencao.md#2-comparar-2026-com-2027-não-mostra-aumento-de-preço).

### Por que o resultado de 2027 aparece como "Simulado"?
Porque, a partir de 2027, a calculadora oficial exige que as alíquotas sejam informadas e marca o resultado como simulação. A base oficial ainda não traz as alíquotas de referência desses anos, então a tela preenche estimativas e mostra de onde vem cada uma.

### De onde vêm os 8,8% de CBS?
É a estimativa usada no exemplo da documentação oficial da calculadora. A alíquota de referência oficial ainda não foi publicada. Você pode trocar o valor no quadro de alíquotas.

### Qual alíquota de Imposto Seletivo devo usar?
Para 2027, as da Medida Provisória 1.399/2026, que variam por produto (bebidas açucaradas 2,6%, cerveja de malte 4,2%, destilados 24%…). Confira o seu produto no texto da MP. Veja a [tabela](entenda-a-reforma.md#imposto-seletivo-em-2027).

### Como descubro a classificação tributária (cClassTrib) de um item?
Digite o NCM: a tela mostra as classificações vinculadas a ele na base oficial, com o trecho da lei. Escolha a que corresponde à sua operação. Na dúvida, confira na NF-e do fornecedor ou com o contador. Veja [como escolher](guia-de-uso.md#como-escolher-a-classificação-tributária).

### O que significa o erro REG-011?
A classificação escolhida tem uma lista própria de NCMs, e o NCM do item não está nela. Por exemplo, um produto que não é da cesta básica marcado como `200003`. A tela já avisa antes de calcular. Troque a classificação ou confira o NCM.

### O total do cupom é diferente da soma dos itens. Está errado?
Pode ser arredondamento (centavos) ou um item com erro, que fica fora do total. Confira a coluna *Situação* do detalhamento.

### Posso usar o resultado para emitir nota fiscal?
A calculadora serve para simular e conferir. A emissão deve seguir o seu sistema emissor e a orientação do contador. O botão *Ver JSON* ajuda a comparar o que o ERP calcula com o que a calculadora oficial calcula.

### O resultado de hoje é diferente do da semana passada. Por quê?
Provavelmente a Receita publicou uma versão nova da calculadora, e ela foi instalada sozinha. A versão em uso aparece no canto superior direito. Veja o [ponto de atenção 10](pontos-de-atencao.md#10-a-versão-da-calculadora-oficial-muda-os-resultados).

### Meus dados vão para a internet?
Não. Os cálculos rodam no seu computador. A internet só é usada para baixar o Java, a calculadora oficial e as atualizações dela.

### Posso usar de outro computador (por exemplo, fora da máquina virtual)?
Sim: inicie com `--rede` e acesse `http://IP-DA-MÁQUINA:8090`. Não há senha, então use só em redes de confiança.

### Como volto para uma versão anterior da calculadora oficial?
Inicie com `--versao 1.7.2` (ou a versão desejada). A ferramenta mantém instaladas a versão em uso e a anterior. Se você pedir outra, ela é baixada e compilada.
