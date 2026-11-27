# Desenvolvimento

## Estrutura

```
iniciar.sh, iniciar.bat, scripts/iniciar.ps1   inicialização (JDK portátil)
empacotar/icone/                                ícone do aplicativo (SVG, PNGs e .ico) e o gerador
empacotar/linux/                                lançador sem terminal, .desktop e montagem do .deb e do .rpm
empacotar/windows/                              lançador sem console (C#) e instalador (Inno Setup)
dev/notas-da-versao.py                          notas da página de Releases, tiradas do CHANGELOG.md
app/CalculadoraRTC.java                         gerenciador: atualização, motor, proxy, servidor web
web/                                            front-end (HTML, CSS e JS puros, sem build)
web/nfe.js                                      leitura do XML de NF-e/NFC-e e conferência
web/exemplos/                                   nota fiscal de exemplo (fictícia)
dev/motor_simulado.py                           motor falso para trabalhar no front sem compilar o oficial
dev/gerar_banco_dev.sh                          gera o banco SQLite a partir dos scripts oficiais
dev/gerar_relacao_dev.py                        gera a relação NCM × classificação a partir desse banco
dev/teste_fumaca.sh                             sobe o painel com o motor simulado e faz chamadas reais
dev/teste_tela.py                               usa as abas num navegador sem janela (Playwright)
.github/workflows/                              CI
```

Não há etapa de build: o Java roda direto do código-fonte (`java app/CalculadoraRTC.java`, recurso do Java 11+) e o front é estático.

## Roteiro para estudar o código

Todo o código é comentado em português: cada função diz o que faz e por quê, e as regras citam a lei de onde vêm. Uma ordem de leitura que funciona:

1. **`iniciar.sh`** (ou `scripts/iniciar.ps1`): como o Java portátil é baixado, renovado e iniciado.
2. **`app/CalculadoraRTC.java`**, de cima para baixo: `main` → `prepararNaInicializacao` → `verificarEAtualizar` → `instalarVersao` (baixar, gerar o banco, compilar) → `trocarMotor` → `tratarProxy`. É o ciclo de vida do motor oficial.
3. **`web/app.js`**: comece por `montarOperacao` (o JSON enviado à calculadora oficial, com a estrutura comentada) e `interpretar` (onde fica cada valor na resposta). Depois, `aliquotasReferencia` e `ESTIMATIVAS` (alíquotas de 2027 em diante) e o bloco do Imposto Seletivo (`INICIO_IS`, `sugestaoIS2027`).
4. **Aba *Antes e depois*** (`web/app.js`, a partir do comentário "antes e depois da reforma"): as fórmulas dos tributos de hoje e `tributosAtuais`.
5. **`web/simples.js`**: as tabelas do Simples da LC 214/2025 (`ANEXOS_SN`), a alíquota efetiva e a partilha (`aliquotaEfetivaSN`, `partilhaSN`, `simplesNoAno`), o painel *Quem emite a nota* e `calcularNota`, que decide entre a calculadora do regime regular e a do Simples.
6. **`web/nfe.js`**: leitura do XML (`lerNfe`), base oficial de cada item (`basesOficiais`) e a conferência (`conferirNfe`).
7. **`dev/motor_simulado.py`**: uma versão simplificada das contas da calculadora oficial, boa para entender a lógica sem ler o código Java dela.

## Trabalhar no front sem compilar a calculadora oficial

```bash
# 1. banco de desenvolvimento (precisa de git e sqlite3)
bash dev/gerar_banco_dev.sh /tmp/calc-dev.db

# 2. relação NCM × classificação (as sugestões da tela)
python3 dev/gerar_relacao_dev.py /tmp/calc-dev.db /tmp/ncm-classificacoes.json

# 3. motor simulado (contas aproximadas, mas com os códigos e as alíquotas reais da base)
python3 dev/motor_simulado.py --db /tmp/calc-dev.db --porta 18080

# 4. painel usando o motor simulado
CALC_RTC_RELACAO=/tmp/ncm-classificacoes.json bash iniciar.sh --api-externa http://127.0.0.1:18080
```

Edite os arquivos em `web/` e recarregue o navegador.

> O motor simulado serve **só** para desenvolver a tela. Os valores reais vêm sempre da calculadora oficial.

## Testar contra outro repositório

`CALC_RTC_REPO` aponta para qualquer repositório com a mesma estrutura, por exemplo um fork:

```bash
CALC_RTC_REPO=https://github.com/meu-usuario/calculadora-rtc-regime-regular bash iniciar.sh
```

## CI

- **verificacao.yml** (a cada push e PR):
  - análise estática (`shellcheck`, PSScriptAnalyzer, `javac -Xlint`, `node --check`, `py_compile`);
  - teste de fumaça e de tela: painel + motor simulado + chamadas reais pelo proxy + `dev/teste_tela.py`.
- **motor-oficial.yml**:
  - roda **todo dia**, mas só testa quando a Receita publicou uma versão que ainda não foi testada (o registro fica no cache do GitHub Actions, com a chave `motor-testado-<versão>`); às segundas-feiras, a cada push que muda a tela ou a instalação e à mão, testa sempre;
  - instala a **última versão oficial de verdade** com `--instalar-e-sair` em Ubuntu, Debian, Fedora (contêineres) e Windows;
  - abre a tela com o motor oficial e roda `dev/teste_tela.py --motor-real`: calcular em 2026, em janeiro de 2027 (IS zero) e em março de 2027, comparar, antes e depois (inclusive o Imposto Seletivo do refrigerante) e a conferência da NF-e de exemplo;
  - se uma execução agendada falhar, abre um aviso (*issue*) no repositório, ou comenta no aviso que já estiver aberto.

- **lancamento.yml** (ao criar uma tag `v*`): monta a versão portátil, o `.deb`, o `.rpm` e o instalador do Windows; homologa cada um num sistema limpo (Debian, Ubuntu LTS e mais recente, Fedora e Windows) como uma pessoa faria pelo ícone: instala, confere arquivos e atalhos, abre (o lançador baixa o Java de verdade), abre de novo, encerra pelo atalho e desinstala. Só se tudo passar, publica a release com as notas do `CHANGELOG.md` e o `SHA256SUMS.txt`.

- **dependabot-automerge.yml**: liga a mesclagem automática nos pedidos do Dependabot, que chegam uma vez por mês com todas as atualizações de *actions* juntas. O pedido só entra na `main` com as verificações aprovadas, e o ramo é apagado em seguida.

## Configuração do repositório no GitHub

`dev/configurar-github.sh` guarda a configuração do repositório como código. Ele pode ser rodado de novo a qualquer momento e só cria ou atualiza o que falta:

| Área | O que fica configurado |
|---|---|
| Apresentação | Descrição, tópicos; Wiki e Projects desligados (a documentação fica em `docs/`) |
| Pull requests | Só *squash*, ramo apagado ao mesclar, mesclagem automática liberada |
| Segurança | Alertas e correções do Dependabot, aviso de falhas em sigilo, varredura de segredos com bloqueio de push, análise de código CodeQL |
| Actions | Token só com leitura por padrão; cada workflow declara as permissões que usa |
| Regra "Proteção da main" | Não pode ser apagada nem reescrita (*force push*), histórico linear e pull requests só com **Análise estática** e **Teste de fumaça e de tela** aprovados. O administrador pode publicar direto, e o `git push` mostra o aviso "Bypassed rule violations", que é esperado |
| Regra "Proteção das versões" | Tags `v*` só podem ser apagadas ou movidas pelo administrador |
| Rótulos | `problema`, `resultado`, `sugestão` e `dependências` |
| Ramos | Remove qualquer ramo além da `main`, fechando o pull request correspondente |

A imagem de prévia (`docs/imagens/previa-social.png`, 1280 × 640) é enviada à mão, em *Settings > General > Social preview*.

### Teste de tela no seu computador

```bash
pip install playwright && python3 -m playwright install chromium
TESTE_TELA=1 bash dev/teste_fumaca.sh /tmp/calc-dev.db            # com o motor simulado
python3 dev/teste_tela.py http://localhost:8090 --motor-real       # com a calculadora já aberta
```

## Publicar uma versão

1. Mude `VERSAO_PAINEL` em `app/CalculadoraRTC.java`. É a única fonte da versão: os pacotes e o workflow a leem de lá.
2. Escreva a seção `## <versão> — <data>` no `CHANGELOG.md`. Ela vira o texto da release.
3. Faça o commit e envie a tag:
   ```bash
   git tag -a v1.7.0 -m "Calculadora RTC Fácil 1.7.0"
   git push origin main v1.7.0
   ```
4. Acompanhe em *Actions → Lançamento*. A release aparece sozinha quando as homologações passam. Se a tag não bater com `VERSAO_PAINEL` ou faltar a seção no CHANGELOG, o workflow para antes de montar.

### Montar os pacotes no seu computador

```bash
sh empacotar/linux/montar-deb.sh      # saida/calculadora-rtc_<versão>_all.deb (precisa de dpkg-deb)
sh empacotar/linux/montar-rpm.sh      # saida/calculadora-rtc-<versão>-1.noarch.rpm (precisa de rpmbuild)
python3 empacotar/icone/gerar_icones.py   # só se mudar o desenho do ícone (precisa de rsvg-convert e Pillow)
```

O instalador do Windows é montado na CI (compilar `Lancador.cs` e rodar o Inno Setup; os comandos estão no cabeçalho de cada arquivo).

## Convenções

- Textos da interface em português, voltados ao usuário final, sem jargão interno.
- CBS, IBS e Imposto Seletivo são sempre calculados pela calculadora oficial, inclusive a base de cálculo da conferência de NF-e (endpoint `base-calculo/base-calculo-unificada`). As regras que ficam no front são as estimativas que a calculadora oficial não cobre: alíquotas de referência ainda não publicadas, os tributos de hoje do *Antes e depois* e a partilha do DAS do Simples Nacional. Todas estão comentadas no código, com a fonte, e documentadas nos [pontos de atenção](pontos-de-atencao.md).
- Nada de dependências externas no Java nem no front.
- Toda função nova ganha um comentário curto dizendo o que faz e, se não for óbvio, por quê. Regras tributárias citam a fonte (lei, artigo, nota técnica) no próprio comentário.
- Valores que dependem de decisão do governo (alíquotas estimadas, datas de início) ficam em constantes com nome (`ESTIMATIVAS`, `INICIO_IS`, `PARTILHA_SN`...), para serem achados e trocados num lugar só.
