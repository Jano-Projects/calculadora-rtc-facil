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
3. Comente o código como o resto do projeto: cada função nova com uma linha dizendo o que faz e, nas regras tributárias, a fonte (lei e artigo). Veja as [convenções](docs/desenvolvimento.md#convenções).
4. Atualize o `CHANGELOG.md` e a documentação que o seu ajuste afeta. O modelo de *pull request* tem a lista.
5. O *pull request* só pode ser mesclado com as verificações **Análise estática** e **Teste de fumaça e de tela** aprovadas. A mesclagem é sempre por *squash* (um commit por pull request), e o ramo é apagado em seguida: o repositório mantém só a `main`.

Participar do projeto implica seguir o [código de conduta](CODE_OF_CONDUCT.md).

As versões seguem `MAIOR.MENOR.CORREÇÃO`, e cada release tem a tag `vX.Y.Z`. A página de Releases é montada pelo workflow *Lançamento* ao enviar a tag: veja [publicar uma versão](docs/desenvolvimento.md#publicar-uma-versão).
