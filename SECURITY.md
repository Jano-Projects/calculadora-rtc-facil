# Segurança

## Como avisar sobre uma falha

Não abra uma *issue* pública. Use **[Reportar uma vulnerabilidade](https://github.com/Jano-Projects/calculadora-rtc-facil/security/advisories/new)**, na aba *Security* do repositório. A mensagem fica visível só para quem mantém o projeto.

Diga o que acontece, como reproduzir e qual versão você usa. A resposta vem em alguns dias, e a correção sai numa versão nova com crédito para quem avisou, se você quiser.

## O que a ferramenta faz para proteger os seus dados

- Os cálculos rodam no seu computador. A internet só é usada para baixar o Java, a calculadora oficial e as atualizações dela, sempre de `github.com` e `api.adoptium.net`, por HTTPS.
- O painel só aceita conexões do próprio computador (`127.0.0.1`). A opção `--rede` libera o acesso pela rede **sem senha**: use só em redes de confiança.
- O XML de notas fiscais é lido no navegador e não é enviado a nenhum servidor. O **link da nota** leva os dados dentro do próprio endereço, depois de `#`, que o navegador não envia a servidores. Mesmo assim, quem receber o link vê a nota inteira.
- Os dados da tela ficam no armazenamento do navegador. **Começar do zero** apaga tudo.

## Versões que recebem correção

Só a versão mais recente. Atualize com `git pull` ou baixe a última release.
