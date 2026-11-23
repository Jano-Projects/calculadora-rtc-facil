# Solução de problemas

O registro técnico está em **Ajuda → Ver registro técnico** e nos arquivos de `dados/logs/`.

### A primeira abertura está demorando
É normal levar de 5 a 15 minutos: o programa baixa o Java, a calculadora oficial e as dependências do Maven, e compila tudo. Acompanhe pela tela ou pelo terminal. Nas próximas vezes abre em segundos.

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

### Começar do zero
Feche a calculadora e apague a pasta `dados/`. Na próxima abertura tudo é baixado de novo.
