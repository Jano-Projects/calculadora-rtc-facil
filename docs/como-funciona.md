# Como funciona

```
 iniciar.sh / iniciar.bat
   │  baixa o JDK 25 portátil (Eclipse Temurin) para dados/jdk na 1ª vez,
   │  e de novo a cada 90 dias (correções de segurança)
   ▼
 app/CalculadoraRTC.java  ← um único arquivo Java, sem dependências
   │
   ├─ servidor web local (porta 8090)
   │    ├─ /            → front-end (pasta web/)
   │    ├─ /api/**      → repassa para o motor oficial (proxy)
   │    └─ /painel/**   → status, atualização e log
   │
   └─ motor de cálculo = JAR oficial da Receita (porta interna aleatória,
        só em 127.0.0.1, com -XX:-UseBASE64Intrinsics contra o Java4Shell)
        dados/motor/<versão>/api-regime-geral.jar
        dados/motor/<versão>/calculadora/db/calculadora-pro.db
```

## Conferência de NF-e

O XML é lido no navegador (`web/nfe.js`). Para cada item, a tela:

1. chama `POST /api/calculadora/base-calculo/base-calculo-unificada` com os componentes da nota (`vProd`, `vFrete`, `vSeg`, `vOutro`, `vDesc`, `vII`, `vPIS`, `vCOFINS`, `vICMS`, `vICMSUFDest`, `vFCP`, `vFCPUFDest`, `vICMSMono`, `vISSQN`, `vIS`), o ano de emissão e o modelo (55 ou 65). A calculadora oficial devolve a base de CBS e IBS (`baseRG`) e a do Imposto Seletivo (`baseIS`), aplicando a vigência de cada componente;
2. manda a operação para `POST /api/calculadora/observabilidade/regime-geral` com `tpDoc`, a data e o local da nota, o CST e a classificação de cada item e essas bases. Nos itens com Imposto Seletivo, envia o grupo `impostoSeletivo` com a base do IS e o valor informado na nota, e a calculadora troca o informado pelo que ela calcula;
3. compara base, CBS, IBS e Imposto Seletivo com o que a nota destacou, aceitando até 1 centavo de diferença (`TOLERANCIA` em `web/nfe.js`).

Numa nota emitida antes de 2 de fevereiro de 2027, o grupo `impostoSeletivo` vai com alíquota zero (MP 1.399/2026, art. 19).

## Link da nota

**Copiar link** grava o estado da tela (o mesmo do `localStorage`, sem a NF-e) em JSON, comprime com `deflate-raw` (`CompressionStream` do navegador) e põe no endereço depois de `#nota=`. A parte depois de `#` não é enviada a nenhum servidor. Ao abrir, a tela descomprime, grava no `localStorage` e recarrega.

## O que a tela faz além de repassar

Toda conta de CBS, IBS e Imposto Seletivo é da calculadora oficial. A tela acrescenta só o que a calculadora ainda não cobre, sempre avisando na própria tela:

| O quê | Onde no código | Por quê |
|---|---|---|
| CBS de 11,2% e IBS de 0,05% + 0,05% de 2027 em diante | `ESTIMATIVAS` em `web/app.js` | A base oficial não traz a referência desses anos e a API exige as alíquotas |
| IS de 2,6% (2202.10.00) e 4,2% (2203) | `sugestaoIS2027` em `web/app.js` | A base oficial traz o IS sem alíquota; a MP 1.399/2026 fixou essas |
| IS zero de 1º/1 a 1º/2/2027 | `INICIO_IS` em `web/app.js` e `web/nfe.js` | A MP só produz efeitos em 2/2/2027; a base oficial começa em 1º/1 |
| Tributos de hoje, partilha do Simples, ICMS por estado | aba *Antes e depois*, em `web/app.js` | A calculadora oficial não calcula PIS/Cofins, ICMS, ISS nem IPI |

## Por que assim

- **Uma só lógica para todos os sistemas.** Toda a inteligência (descobrir versões, baixar, compilar, subir, trocar) está em Java, que roda igual no Windows e no Linux. Os scripts só cuidam do Java portátil.
- **Nada a instalar no sistema.** O JDK fica em `dados/jdk`. Não é preciso `sudo`/administrador, `apt`/`dnf`, Git nem Docker.
- **Front e API na mesma origem.** O painel repassa `/api/**` para o motor, então o navegador não esbarra em CORS e a porta do motor fica escondida. O Swagger oficial continua acessível em `/api/swagger-ui.html`.
- **Só aceita conexões do próprio computador** (`127.0.0.1`), a não ser que você use `--rede`.

## Atualização do motor

1. **Descobrir versões.** O programa lê `https://github.com/ReceitaFederal/calculadora-rtc-regime-regular.git/info/refs?service=git-upload-pack`, o mesmo endpoint que o `git` usa, e pega a maior tag de versão (ex.: `1.7.3`). Esse endpoint não tem o limite de requisições da API do GitHub.
2. **Baixar.** `…/archive/refs/tags/<versão>.zip` vai para `dados/fontes/<versão>`.
3. **Gerar o banco** (passo 3 do README oficial): `mvnw flyway:migrate -Dflyway.configFiles=./flyway/flyway-pro.conf`.
4. **Compilar** (passo 6 do README oficial, sem os testes): `mvnw clean package -DskipTests`.
5. **Publicar** o JAR e o banco em `dados/motor/<versão>/`. A pasta é montada como `.tmp` e renomeada no fim, para não deixar uma versão pela metade.
6. **Trocar sem parar.** O motor novo sobe numa porta livre. Quando `GET /api/calculadora/dados-abertos/versao` responde 200, o proxy passa a apontar para ele e o antigo é desligado.
7. **Limpar.** Ficam a versão em uso e a anterior. As mais antigas e o código-fonte são apagados.

Se qualquer passo falhar, a versão em uso continua ativa e o erro aparece na tela (chip de versão e aba *Ajuda*). A próxima tentativa acontece na verificação seguinte ou pelo botão *Procurar atualização agora*.

A verificação roda ao iniciar e a cada `CALC_RTC_HORAS_VERIFICACAO` horas (padrão 6). Para fixar uma versão use `--versao 1.7.3`. Para não procurar novidades use `--sem-atualizacao`.

## Sugestões de classificação tributária

Ao subir cada versão do motor, o gerenciador lê do banco oficial a relação entre NCMs e classificações tributárias: a tabela `NCM_APLICAVEL`, com as exceções e o texto dos anexos da LC 214. Ele grava essa relação em `dados/motor/<versão>/ncm-classificacoes.json`, servida em `/painel/ncm-classificacoes`. Para ler o SQLite, usa o driver que já vem dentro do JAR oficial (`BOOT-INF/lib/sqlite-jdbc-*.jar`), então nenhuma dependência extra é baixada. Se algo falhar, a calculadora funciona normalmente, só sem as sugestões.

## Onde ficam os arquivos

```
dados/
├── jdk/                       Java 25 portátil (.baixado-em guarda a data do download)
├── motor/
│   ├── atual                  versão em uso
│   ├── 1.7.3/                 JAR + banco + relação NCM × classificação de cada versão
│   └── ...
├── fontes/                    temporário durante a compilação
└── logs/
    ├── instalacao-<versão>.log    saída do Maven
    └── motor.log                  saída da calculadora oficial
```

As dependências do Maven ficam no cache padrão do usuário (`~/.m2`). Para "zerar" a ferramenta, apague a pasta `dados/`.

## Endpoints do painel

| Método e caminho | Retorno |
|---|---|
| `GET /painel/status` | Estado (`verificando`, `baixando`, `compilando`, `subindo`, `pronto`, `erro`), versão instalada e disponível, última verificação e erro. |
| `POST /painel/atualizar` | Procura versão nova agora. Se o motor estiver parado, tenta subir de novo. |
| `GET /painel/log` | Últimas 200 linhas do log mais recente. |
| `GET /painel/ncm-classificacoes` | Relação NCM × classificação tributária da versão em uso (base das sugestões da tela). |
