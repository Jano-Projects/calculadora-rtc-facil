# Desenvolvimento

## Estrutura

```
iniciar.sh, iniciar.bat, scripts/iniciar.ps1   inicialização (JDK portátil)
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
  - abre a tela com o motor oficial e roda `dev/teste_tela.py --motor-real`: calcular em 2026 e 2027, comparar, antes e depois (inclusive o Imposto Seletivo do refrigerante) e a conferência da NF-e de exemplo;
  - se uma execução agendada falhar, abre um aviso (*issue*) no repositório, ou comenta no aviso que já estiver aberto.

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

## Convenções

- Textos da interface em português, voltados ao usuário final, sem jargão interno.
- CBS, IBS e Imposto Seletivo são sempre calculados pela calculadora oficial, inclusive a base de cálculo da conferência de NF-e (endpoint `base-calculo/base-calculo-unificada`). As regras que ficam no front são as estimativas que a calculadora oficial não cobre: alíquotas de referência ainda não publicadas, os tributos de hoje do *Antes e depois* e a partilha do DAS do Simples Nacional. Todas estão comentadas no código, com a fonte, e documentadas nos [pontos de atenção](pontos-de-atencao.md).
- Nada de dependências externas no Java nem no front.
