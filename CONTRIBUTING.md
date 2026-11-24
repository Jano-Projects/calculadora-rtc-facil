# Como contribuir

Sugestões e correções são bem-vindas.

## Issues

Abra uma *issue* escolhendo o modelo:

- **Problema**: a ferramenta não abre, trava ou mostra erro. Anexe as últimas linhas de `dados/logs/`.
- **Resultado estranho**: um número parece errado. Cole o link da nota (botão **Copiar link**) para que dê para abrir a mesma nota.
- **Sugestão**: uma ideia de melhoria.

Use sempre dados fictícios: nada de CNPJ, chave de acesso ou XML de notas reais de clientes.

CBS, IBS e Imposto Seletivo são calculados pela calculadora oficial da Receita Federal. Se o valor também sai errado no Swagger oficial (`http://localhost:8090/api/swagger-ui.html`), informe no [repositório oficial](https://github.com/ReceitaFederal/calculadora-rtc-regime-regular/issues).

Falhas de segurança seguem a [política de segurança](SECURITY.md), e não vão em *issue* pública.

## Código

1. Leia [docs/desenvolvimento.md](docs/desenvolvimento.md). Ele mostra como rodar a tela com o motor simulado em segundos, sem compilar a calculadora oficial.
2. Antes do *pull request*, rode:
   ```bash
   bash dev/teste_fumaca.sh /tmp/calc-dev.db
   TESTE_TELA=1 bash dev/teste_fumaca.sh /tmp/calc-dev.db   # se mexeu na tela
   shellcheck iniciar.sh dev/*.sh                           # se mexeu em scripts
   ```
3. Atualize o `CHANGELOG.md` e a documentação que o seu ajuste afeta. O modelo de *pull request* tem a lista.

As versões seguem `MAIOR.MENOR.CORREÇÃO`, e cada release tem a tag `vX.Y.Z`.
