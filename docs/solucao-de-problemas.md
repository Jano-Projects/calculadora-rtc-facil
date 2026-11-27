# Solução de problemas

O registro técnico está em **Ajuda → Ver registro técnico** e nos arquivos da pasta `logs`, dentro da pasta de dados:

| Versão | Pasta de dados |
|---|---|
| Instalada no Windows | `%LOCALAPPDATA%\CalculadoraRTC` (cole na barra do Explorador de Arquivos) |
| Instalada no Linux | `~/.local/share/calculadora-rtc` |
| Portátil | `dados/`, ao lado do `iniciar.bat` ou `iniciar.sh` |

### Abri pelo ícone e nada apareceu
- **Na primeira vez**, espere: a janela do download do Java pode demorar alguns segundos para aparecer, e o navegador só abre depois dela.
- Abra `logs/painel.log` na pasta de dados: o fim do arquivo mostra o que aconteceu.
- No Linux, rode `calculadora-rtc` num terminal: ele mostra o registro na tela, como o `iniciar.sh`.
- Se a calculadora já estava aberta, o ícone só abre outra aba nela. Se o navegador não abriu, acesse `http://localhost:8090`.

### O instalador do Windows mostra "O Windows protegeu o computador"
O instalador não tem assinatura digital paga, então o SmartScreen avisa que o editor é desconhecido. Clique em **Mais informações → Executar assim mesmo**. Para conferir que o arquivo é o publicado, compare a soma SHA-256 dele (`Get-FileHash CalculadoraRTC-*.exe` no PowerShell) com a do `SHA256SUMS.txt` da release.

### A calculadora continua rodando depois que fechei o navegador
Na versão instalada, ela se encerra sozinha 20 minutos depois que a última aba é fechada. Para encerrar na hora, use o atalho *Encerrar a Calculadora RTC* do menu. Na versão portátil, feche a janela do terminal.

### A primeira abertura está demorando
É normal levar de 5 a 15 minutos: o programa baixa o Java, a calculadora oficial e as dependências do Maven, e compila tudo. Acompanhe pela tela ou pelo terminal. Nas próximas vezes abre em segundos.

### A calculadora está baixando o Java de novo
É a renovação a cada 90 dias, para receber as correções de segurança do Java (~200 MB). Acontece também na primeira abertura depois de atualizar para a 1.6.2. Se aparecer **"Não foi possível atualizar o Java agora; continuando com o atual"**, a calculadora abre normalmente e tenta de novo na próxima vez. Se o seu computador estiver sempre sem internet, ignore o aviso.

### "sem conexão com o GitHub"
- Confira a internet.
- Em rede corporativa com proxy, o Java precisa conhecê-lo. Inicie assim:
  - Linux: `JDK_JAVA_OPTIONS="-Dhttps.proxyHost=proxy.empresa -Dhttps.proxyPort=8080" bash iniciar.sh`
  - Windows (PowerShell): `$env:JDK_JAVA_OPTIONS="-Dhttps.proxyHost=proxy.empresa -Dhttps.proxyPort=8080"; .\iniciar.bat`
  - O Maven também precisa do proxy. Configure `~/.m2/settings.xml` (seção `<proxies>`).
- Se já existe uma versão instalada, a calculadora abre com ela mesmo sem internet.

### "falha ao executar 'mvnw …'"
Abra `dados/logs/instalacao-<versão>.log` e procure a primeira linha com `ERROR`. As causas mais comuns:
- **Download de dependências interrompido.** Tente de novo pelo botão *Procurar atualização agora*.
- **Pouco espaço em disco.** São necessários ~1,5 GB.
- **A Receita publicou uma versão que não compila.** A versão anterior continua funcionando. Aguarde a correção ou fixe uma versão com `--versao`.

### "A porta 8090 estava ocupada"
O programa escolhe a próxima livre sozinho (8091, 8092…) e mostra o endereço no terminal. Para escolher a porta: `--porta 9000`.

### Windows: "O Windows protegeu o computador" (SmartScreen)
Aparece porque o `.bat` veio da internet. Clique em **Mais informações → Executar assim mesmo**. Outra opção: botão direito no ZIP **antes de extrair** → Propriedades → marque **Desbloquear**.

### Windows: a janela abre e fecha
Abra o **Prompt de Comando** na pasta e rode `iniciar.bat` por ali para ver a mensagem de erro.

### Linux: "Permission denied" ao rodar `./iniciar.sh`
Use `bash iniciar.sh`, ou dê permissão uma vez com `chmod +x iniciar.sh`.

### O motor parou ("O motor de cálculo parou inesperadamente")
Veja `dados/logs/motor.log`. Feche a janela da calculadora e abra de novo. Se o problema continuar numa versão nova, volte para a anterior com `--versao <anterior>`.

### "Não consegui ler a nota"
- **"o arquivo não é um XML válido"**: o arquivo está incompleto ou não é XML. Baixe o XML de novo no sistema emissor ou no portal da NF-e. O PDF (DANFE) não serve.
- **"não encontrei uma NF-e ou NFC-e neste XML"**: o arquivo é outro documento, como um evento de cancelamento, uma CT-e ou uma NFS-e. Abra o XML da nota.

### Conferência da NF-e com todos os itens em "Erro"
Veja a mensagem embaixo de cada item. As mais comuns são a classificação tributária sem vínculo com o NCM (REG-011) ou com o tipo de documento, e a falta de alíquota a partir de 2027. Para notas de 2027 em diante, confira se o quadro *Alíquotas da conferência* está preenchido.

### A tela mostra itens ou valores de testes antigos
Clique em **Começar do zero**, no alto da tela. Isso apaga os itens e as escolhas guardadas neste navegador e não mexe no motor instalado. Se a tela nem chegar a abrir direito, acesse o endereço com `?limpar` no final (por exemplo `http://localhost:8090/?limpar`). Veja os detalhes no [guia de uso](guia-de-uso.md#começar-do-zero).

### Desinstalar
- **Windows:** *Configurações → Aplicativos → Calculadora RTC Fácil → Desinstalar*. A calculadora aberta é encerrada e a pasta de dados é apagada junto.
- **Debian e Ubuntu:** `sudo apt remove calculadora-rtc`. **Fedora:** `sudo dnf remove calculadora-rtc`.
  No Linux, a pasta de dados de cada usuário fica (cerca de 1 GB). Para apagá-la: `rm -r ~/.local/share/calculadora-rtc`.
- **Portátil:** apague a pasta da calculadora.
- Em todos os casos, as dependências do Maven ficam em `~/.m2` (Linux) ou `%USERPROFILE%\.m2` (Windows), cache compartilhado com outros programas Java. Se você não usa Maven para mais nada, pode apagar também.

### Reinstalar tudo
Feche a calculadora e apague a pasta de dados (veja a tabela no início desta página). Na próxima abertura o Java, o motor oficial e a relação de NCM são baixados e preparados de novo. Os itens guardados no navegador não são afetados; para eles, use **Começar do zero**.
