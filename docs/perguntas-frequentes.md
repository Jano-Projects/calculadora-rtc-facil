# Perguntas frequentes

### Instalo ou uso a versão portátil?
Para usar no dia a dia, **instale**: abre pelo ícone, sem terminal, e se encerra sozinha. A versão portátil (ZIP ou `git clone`) serve para levar num pendrive, rodar sem instalar nada ou mexer no código. As duas fazem os mesmos cálculos. Veja [como usar](../README.md#como-usar).

### Fechei o navegador. A calculadora continua rodando?
Por até 20 minutos, na versão instalada; depois ela se encerra sozinha. Para encerrar na hora, use **Encerrar a calculadora**, na aba *Ajuda*, ou o atalho *Encerrar a Calculadora RTC* do menu. Na versão portátil, ela roda enquanto a janela do terminal estiver aberta.

### Como desinstalo?
Pelo próprio sistema: *Aplicativos instalados* no Windows, `sudo apt remove calculadora-rtc` no Debian e no Ubuntu, `sudo dnf remove calculadora-rtc` no Fedora. No Linux, apague também a pasta `~/.local/share/calculadora-rtc`. Veja [desinstalar](solucao-de-problemas.md#desinstalar).

### Por que uma nota de 2026 mostra só centavos de tributo?
Porque 2026 é o ano de teste: CBS de 0,9% e IBS de 0,1%, e itens com benefício (como a cesta básica) zeram até isso. A tela também não mostra PIS, Cofins, ICMS, ISS nem IPI, que continuam valendo integralmente em 2026. Veja o [ponto de atenção 1](pontos-de-atencao.md#1-o-resultado-mostra-só-os-tributos-novos).

### A comparação 2026 × 2027 mostra que os preços vão subir dez vezes?
Não. Em 2027 a CBS substitui o PIS e a Cofins, que deixam de existir, mas a calculadora não mostra os tributos que saem. O aumento que aparece é a troca de um tributo pelo outro, e não um aumento de preço. Veja o [ponto de atenção 2](pontos-de-atencao.md#2-comparar-2026-com-2027-não-mostra-aumento-de-preço).

### Por que o resultado de 2027 aparece como "Simulado"?
Porque, a partir de 2027, a calculadora oficial exige que as alíquotas sejam informadas e marca o resultado como simulação. A base oficial ainda não traz as alíquotas de referência desses anos, então a tela preenche estimativas e mostra de onde vem cada uma.

### De onde vêm os 11,2% de CBS?
Em 28/10/2026, o Tribunal de Contas da União calculou a alíquota de referência da CBS para 2027 em 11,3%. Em 2027 e 2028 ela é reduzida em 0,1 ponto (LC 214, art. 347), o que dá 11,2%. O Senado tem até 15/12/2026 para fixar a referência por resolução; se não fixar, vale a do TCU. Você pode trocar o valor no quadro de alíquotas.

### Os preços vão subir ou cair depois da reforma?
Depende do produto, de quem vende e do ano. A reforma foi desenhada para manter a arrecadação total, então ela redistribui o peso entre setores.
- **Tendem a cair ou ficar estáveis:** cesta básica e hortifrúti (alíquota zero), medicamentos da lista oficial, e bens industrializados de cadeia longa, que hoje acumulam imposto sobre imposto.
- **Tendem a subir:** serviços, sobretudo de empresas do lucro presumido, cujo PIS/Cofins de 3,65% vira CBS de 11,2%; e produtos do Imposto Seletivo.
- **Em 2027**, produtos comprados no comércio do lucro real tendem a ficar parecidos, porque a CBS de 11,2% sobre a base sem ICMS pesa quase o mesmo que o PIS/Cofins de 9,25% de hoje.
- **O teste maior vem de 2029 a 2033**, quando o IBS cheio substitui o ICMS e o ISS.

Repasse não é automático: as empresas podem absorver parte ou repassar de outro jeito. Use a aba *Antes e depois* para simular os seus itens, lembrando das [premissas](pontos-de-atencao.md#14-antes-e-depois-é-uma-estimativa-com-premissas).

### Qual alíquota de Imposto Seletivo devo usar?
Para 2027, as da Medida Provisória 1.399/2026, que variam por produto (bebidas açucaradas 2,6%, cerveja de malte 4,2%, destilados 24%…). A tela já preenche as duas primeiras; nos outros produtos, confira o seu no texto da MP. Veja a [tabela](entenda-a-reforma.md#imposto-seletivo-em-2027).

### Por que o Imposto Seletivo saiu zero numa data de janeiro de 2027?
Porque, pela MP 1.399/2026 (art. 19), ele só é cobrado a partir de 2 de fevereiro de 2027. A calculadora oficial ainda considera 1º de janeiro, então a tela manda o IS com alíquota zero nessas datas e avisa. Veja o [ponto de atenção 5](pontos-de-atencao.md#5-imposto-seletivo-alíquotas-provisórias-e-início-em-fevereiro-de-2027).

### Como descubro a classificação tributária (cClassTrib) de um item?
Digite o NCM: a tela mostra as classificações vinculadas a ele na base oficial, com o trecho da lei. Escolha a que corresponde à sua operação. Na dúvida, confira na NF-e do fornecedor ou com o contador. Veja [como escolher](guia-de-uso.md#como-escolher-a-classificação-tributária).

### O que significa o erro REG-011?
A classificação escolhida tem uma lista própria de NCMs, e o NCM do item não está nela. Por exemplo, um produto que não é da cesta básica marcado como `200003`. A tela já avisa antes de calcular. Troque a classificação ou confira o NCM.

### O total do cupom é diferente da soma dos itens. Está errado?
Provavelmente há um item com erro, que fica fora do total: confira a coluna *Situação* do detalhamento. Desde a versão oficial 1.7.2, os totais são sempre a soma dos valores exibidos nos itens, sem diferença de centavos. Veja o [ponto de atenção 11](pontos-de-atencao.md#11-centavos-de-diferença).

### Posso usar o resultado para emitir nota fiscal?
A calculadora serve para simular e conferir. A emissão deve seguir o seu sistema emissor e a orientação do contador. O botão *Ver JSON* ajuda a comparar o que o ERP calcula com o que a calculadora oficial calcula.

### O resultado de hoje é diferente do da semana passada. Por quê?
Provavelmente a Receita publicou uma versão nova da calculadora, e ela foi instalada sozinha. A versão em uso aparece no canto superior direito. Veja o [ponto de atenção 10](pontos-de-atencao.md#10-a-versão-da-calculadora-oficial-muda-os-resultados).

### Minha empresa é do Simples Nacional. Recolho CBS e IBS dentro ou fora do DAS?

Depende de para quem você vende. Dentro do DAS, o cliente empresa só aproveita como crédito a parte de CBS e IBS paga na guia (na 1ª faixa do comércio, 0,62% da venda). Por fora, ele aproveita a CBS e o IBS cheios, e você passa a aproveitar o que o seu fornecedor cobrou, mas paga a alíquota cheia e faz a apuração. Na aba *Antes e depois*, escolha *Simples Nacional* no regime e compare as duas opções no quadro do Simples. Leve os números ao seu contador: veja o [ponto de atenção 17](pontos-de-atencao.md#17-simples-nacional-dentro-ou-fora-do-das-é-uma-decisão-com-o-contador).

### Como confiro se o meu sistema emissor calcula a CBS e o IBS certo?

Emita notas de teste no sistema, abra os XMLs na aba *Conferir NF-e* e clique em **Conferir com a calculadora oficial**. A tela mostra, item por item, se a base, a CBS, o IBS e o Imposto Seletivo batem, e o que diverge. **Exportar CSV** gera uma planilha para registrar a homologação. Veja o [guia de uso](guia-de-uso.md#conferir-nf-e).

### Como mando uma nota para outra pessoa?

Clique em **Copiar link**. O endereço leva a nota inteira (itens, local, datas e ajustes) e abre na Calculadora RTC Fácil de quem receber. Os dados vão dentro do próprio link e não passam por nenhum servidor. Para quem não tem a ferramenta, use **Imprimir ou salvar PDF**.

### Meus dados vão para a internet?
Não. Os cálculos rodam no seu computador. A internet só é usada para baixar o Java, a calculadora oficial e as atualizações dos dois.

### Por que a calculadora baixou o Java de novo?
O Java portátil é renovado a cada 90 dias, para receber as correções de segurança. Isso acontece ao abrir, leva alguns minutos (~200 MB) e não muda nada nos cálculos. Se não houver internet, a cópia atual continua em uso. Veja a [política de segurança](../SECURITY.md).

### Posso usar de outro computador (por exemplo, fora da máquina virtual)?
Sim: inicie com `--rede` e acesse `http://IP-DA-MÁQUINA:8090`. Não há senha, então use só em redes de confiança.

### Como volto para uma versão anterior da calculadora oficial?
Inicie com `--versao` e a versão desejada, por exemplo `--versao 1.7.2` para voltar da 1.7.3. A ferramenta mantém instaladas a versão em uso e a anterior. Se você pedir outra, ela é baixada e compilada.
