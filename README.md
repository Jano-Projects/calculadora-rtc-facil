# Calculadora RTC Fácil

Calcule **CBS, IBS e Imposto Seletivo** da Reforma Tributária do Consumo (LC 214/2025) no seu computador, com uma tela simples, **usando a calculadora oficial da Receita Federal**, que se atualiza sozinha.

- **Um clique para abrir** no Windows, no Fedora, no Debian e no Ubuntu.
- **Sem instalar nada antes**: não precisa de administrador, `sudo`, Git nem Java. O Java 25 vem junto, dentro da pasta.
- **Sempre na versão mais recente**: quando a Receita publica uma versão nova da [calculadora oficial](https://github.com/ReceitaFederal/calculadora-rtc-regime-regular), ela é baixada, compilada e colocada em uso automaticamente, sem fechar a tela.
- **Tela amigável**: monte a nota item a item, com autocompletar de NCM e lista de classificações tributárias. O resultado sai em forma de cupom e com detalhamento por item.
- **Compare datas**: veja a mesma nota em 2026 (ano de teste) e em 2027 (CBS para valer + Imposto Seletivo).
- **Antes e depois**: os tributos sobre o consumo de hoje (PIS/Cofins, ICMS/ISS, FCP, IPI, monofásico, ICMS-ST) ao lado dos de depois da reforma. Mostra o que migra (PIS/Cofins → CBS, IPI → Imposto Seletivo), o que fica (ICMS/ISS até 2028), o que é destacado na venda e o que vem embutido no custo, e o preço estimado. Funciona para venda da indústria ou do comércio.
- **Tudo local**: os cálculos rodam na sua máquina. Nenhum dado da sua nota sai do computador.
- **100% código aberto** (licença MIT).

> Esta ferramenta não é da Receita Federal. Ela só automatiza a instalação e oferece uma tela mais simples para a calculadora oficial, que continua fazendo todos os cálculos.

---

## Como usar

### 1. Baixe

Na página de **[Releases](https://github.com/Jano-Projects/calculadora-rtc-facil/releases/latest)**, baixe o arquivo **`calculadora-rtc-facil-<versão>.zip`** e extraia numa pasta de sua preferência, por exemplo `Documentos\calculadora-rtc-facil`.

Se você usa Git, pode clonar:

```bash
git clone https://github.com/Jano-Projects/calculadora-rtc-facil.git
```

### 2. Abra

| Sistema | O que fazer |
|---|---|
| **Windows 10/11** | Dê dois cliques em **`iniciar.bat`**. |
| **Linux** (Fedora, Debian, Ubuntu e derivados) | Abra o terminal na pasta e rode `bash iniciar.sh`. |

O navegador abre sozinho em **http://localhost:8090**. **Deixe a janela preta (terminal) aberta** enquanto usa. Para encerrar, feche essa janela ou aperte `Ctrl+C`.

**Na primeira vez** o processo leva de **5 a 15 minutos**: ele baixa o Java (~200 MB) e a calculadora oficial, e então gera o banco de dados e compila tudo. A tela mostra o andamento. Nas próximas vezes abre em segundos.

### 3. Atalho (opcional)

- Windows: `iniciar.bat --criar-atalho` cria **Calculadora RTC** na Área de Trabalho.
- Linux: `bash iniciar.sh --criar-atalho` cria **Calculadora RTC** no menu de aplicativos.

### 4. Calcule

1. Escolha a **data** e o **local** da operação.
2. Adicione os itens (NCM ou NBS, classificação tributária, valor e quantidade). Se preferir, comece por um exemplo: *Cesta básica*, *Compras do dia a dia* ou *Exemplo da documentação oficial*.
3. Clique em **Calcular tributos**.

Veja o [guia de uso](docs/guia-de-uso.md) para entender cada campo e o resultado.

---

## Atualização automática

| O que atualiza | Como |
|---|---|
| **Calculadora oficial** (motor de cálculo) | Sozinha. Ao abrir e depois a cada 6 horas, o programa consulta as versões (tags) publicadas no repositório da Receita. Se houver uma nova, ele baixa, gera o banco, compila, sobe a versão nova e só então desliga a antiga, sem interromper quem está usando. Se algo falhar, a versão anterior continua funcionando. |
| **Esta ferramenta** (tela e scripts) | Se você clonou com Git: `git pull`. Se baixou o ZIP: baixe a release nova e copie a pasta `dados/` antiga para dentro dela, assim nada é baixado nem compilado de novo. |

A versão em uso aparece no canto superior direito da tela. Clique nela para ver detalhes ou forçar uma verificação.

## Opções

```
bash iniciar.sh [opções]       (Linux)
iniciar.bat  [opções]          (Windows)

  --porta N            porta do painel (padrão 8090)
  --rede               permite acessar de outros computadores da rede (ex.: de fora de uma VM)
  --sem-navegador      não abre o navegador automaticamente
  --sem-atualizacao    não procura versões novas (usa a instalada)
  --versao X           fixa uma versão da calculadora oficial (ex.: 1.7.2)
  --instalar-e-sair    só instala/atualiza o motor, testa e encerra
  --criar-atalho       cria o atalho e encerra
```

Variáveis de ambiente: `CALC_RTC_PORTA`, `CALC_RTC_HORAS_VERIFICACAO` (0 desliga a verificação periódica), `CALC_RTC_VERSAO`, `CALC_RTC_JAVA_HOME` (usar um JDK 25 já instalado) e `CALC_RTC_REPO` (outro repositório/fork).

## Requisitos

- Windows 10/11 (x64 ou ARM64), ou Linux x64/ARM64 com `curl` ou `wget` e `tar` (vêm instalados no Fedora, Debian e Ubuntu).
- ~1,5 GB livres (Java, dependências do Maven e motor compilado).
- Internet na primeira execução e para receber atualizações. Depois disso funciona offline.

## Documentação

> **Antes de usar os resultados, leia os [pontos de atenção](docs/pontos-de-atencao.md).** O cupom mostra só os tributos novos, a comparação 2026 × 2027 não é aumento de preço, e de 2027 em diante as alíquotas são estimativas.

**Para quem usa**
- [Pontos de atenção](docs/pontos-de-atencao.md): o que pode enganar nos resultados e o que fazer.
- [Entenda a reforma](docs/entenda-a-reforma.md): CBS, IBS, Imposto Seletivo, cronograma de 2026 a 2033 e glossário.
- [Tributos e bases](docs/tributos-e-bases.md): a base de cada tributo, o que é "imposto sobre imposto", destacado × embutido e o que não entra.
- [Diferenças que confundem](docs/diferencas.md): calculado × simulado, redução × imunidade × isenção, NCM × NBS, CST × cClassTrib e outras.
- [Perguntas frequentes](docs/perguntas-frequentes.md).
- [Guia de uso](docs/guia-de-uso.md): a tela, os campos e como ler o resultado.

**Técnico**
- [Como funciona](docs/como-funciona.md): a arquitetura, o processo de atualização e onde ficam os arquivos.
- [Solução de problemas](docs/solucao-de-problemas.md): o que fazer quando algo não abre.
- [Desenvolvimento](docs/desenvolvimento.md): como contribuir, testar com o motor simulado e a CI.

## Licença

[MIT](LICENSE). A calculadora oficial tem licença própria, definida no [repositório da Receita Federal](https://github.com/ReceitaFederal/calculadora-rtc-regime-regular). O Java é o [Eclipse Temurin](https://adoptium.net) (GPLv2 com Classpath Exception).
