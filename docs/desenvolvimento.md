# Desenvolvimento

## Estrutura

```
iniciar.sh, iniciar.bat, scripts/iniciar.ps1   inicialização (JDK portátil)
app/CalculadoraRTC.java                         gerenciador: atualização, motor, proxy, servidor web
web/                                            front-end (HTML, CSS e JS puros, sem build)
dev/motor_simulado.py                           motor falso para trabalhar no front sem compilar o oficial
dev/gerar_banco_dev.sh                          gera o banco SQLite a partir dos scripts oficiais
dev/gerar_relacao_dev.py                        gera a relação NCM × classificação a partir desse banco
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
  - análise estática (`shellcheck`, PSScriptAnalyzer, `javac -Xlint`, `node --check`);
  - teste de fumaça: painel + motor simulado + chamadas reais pelo proxy.
- **motor-oficial.yml** (semanal, manual e a cada push):
  - instala a **última versão oficial de verdade** com `--instalar-e-sair` em Ubuntu, Windows e Fedora (container);
  - avisa se uma versão nova da Receita quebrar a instalação.

## Convenções

- Textos da interface em português, voltados ao usuário final, sem jargão interno.
- O front não guarda regras tributárias: quem decide é sempre a calculadora oficial. A única regra no front é enviar ou não `aliquotasNominais` conforme o ano, porque a API exige isso.
- Nada de dependências externas no Java nem no front.
