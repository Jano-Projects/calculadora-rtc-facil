/*
 * Calculadora RTC Fácil - gerenciador local
 *
 * Programa único (sem dependências) que:
 *   1. descobre a versão mais recente da calculadora oficial no GitHub;
 *   2. baixa o código-fonte da versão, gera o banco e compila o JAR;
 *   3. sobe o motor de cálculo (backend oficial) em segundo plano;
 *   4. serve o front-end amigável e repassa /api/** para o motor;
 *   5. verifica novas versões periodicamente e troca o motor sem parar o painel.
 *
 * Executado pelos scripts iniciar.sh / iniciar.bat com:
 *   java app/CalculadoraRTC.java --base <pasta-do-projeto> [opções]
 *
 * Licença MIT.
 */

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.awt.Desktop;
import java.io.*;
import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
import java.util.regex.*;
import java.util.stream.*;
import java.util.zip.*;

public class CalculadoraRTC {

    // ------------------------------------------------------------------ configuração
    static final String REPO_PADRAO = "https://github.com/ReceitaFederal/calculadora-rtc-regime-regular";
    static final String VERSAO_PAINEL = "1.7.0";

    // Pastas: base = onde estão app/ e web/; dados = o que é baixado e gerado (motores, fontes, logs, JDK).
    // Na versão portátil (ZIP ou git clone), dados fica dentro da própria pasta (base/dados). Na versão
    // instalada, a pasta do programa não é gravável, e os lançadores apontam dados para a pasta do usuário
    // (CALC_RTC_DADOS ou --dados): ~/.local/share/calculadora-rtc no Linux, %LOCALAPPDATA%\CalculadoraRTC no Windows.
    static Path base, dados, dirWeb, dirMotores, dirFontes, dirLogs;
    static String dadosEscolhido = env("CALC_RTC_DADOS", null);
    static String repo = env("CALC_RTC_REPO", REPO_PADRAO);
    static int portaWeb = Integer.parseInt(env("CALC_RTC_PORTA", "8090"));
    static long horasEntreVerificacoes = Long.parseLong(env("CALC_RTC_HORAS_VERIFICACAO", "6"));
    static boolean abrirNavegador = true, rede = false, semAtualizacao = false, instalarESair = false;
    static String apiExterna = null; // modo desenvolvimento: não gerencia o motor
    static String versaoFixa = env("CALC_RTC_VERSAO", null);
    // Modo atalho (aberto pelo ícone, sem terminal): não há Ctrl+C, então o painel se encerra sozinho
    // depois de alguns minutos sem nenhuma aba da calculadora aberta (a tela consulta /painel/status a cada minuto).
    static boolean atalho = false;
    static long minutosSemUso = Long.parseLong(env("CALC_RTC_ENCERRAR_MIN", "20"));
    static final AtomicLong ultimoAcesso = new AtomicLong(System.currentTimeMillis());
    static volatile int portaPainel = -1;

    // ------------------------------------------------------------------ estado
    static final Object trava = new Object();
    static volatile String estado = "iniciando";      // iniciando|verificando|baixando|compilando|subindo|pronto|erro
    static volatile String mensagem = "Iniciando o painel...";
    static volatile String versaoInstalada = null;
    static volatile String versaoDisponivel = null;
    static volatile String ultimaVerificacao = null;
    static volatile String erroAtualizacao = null;
    static volatile boolean atualizando = false;
    static volatile Process motor = null;
    static volatile int portaMotor = -1;
    static final AtomicReference<Path> ultimoLog = new AtomicReference<>();

    // http: downloads no GitHub (segue redirecionamentos); httpLocal: conversa com o motor em 127.0.0.1
    static final HttpClient http = HttpClient.newBuilder()
            .followRedirects(HttpClient.Redirect.NORMAL)
            .connectTimeout(Duration.ofSeconds(20))
            .build();
    static final HttpClient httpLocal = HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_1_1)
            .connectTimeout(Duration.ofSeconds(5))
            .build();
    static final ScheduledExecutorService agendador = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "atualizador");
        t.setDaemon(true);
        return t;
    });

    // ================================================================== main
    /** Ponto de entrada: lê as opções, cria as pastas, sobe o painel web e prepara o motor em segundo plano.
     *  Com --instalar-e-sair (usado na CI), só instala, faz um cálculo de teste e termina. */
    public static void main(String[] args) throws Exception {
        lerArgumentos(args);
        dados = dadosEscolhido != null ? Paths.get(dadosEscolhido).toAbsolutePath().normalize() : base.resolve("dados");
        dirWeb = base.resolve("web");
        dirMotores = dados.resolve("motor");
        dirFontes = dados.resolve("fontes");
        dirLogs = dados.resolve("logs");
        for (Path p : List.of(dados, dirMotores, dirFontes, dirLogs)) Files.createDirectories(p);

        log("Calculadora RTC Fácil " + VERSAO_PAINEL + " | Java " + Runtime.version());
        log("Pasta: " + base + (dados.startsWith(base) ? "" : " | dados: " + dados));

        // Já existe uma calculadora aberta com esta mesma pasta de dados? Então só abre o navegador nela.
        // Duas instâncias disputariam a pasta do motor (instalação e troca de versão).
        if (!instalarESair && apiExterna == null) {
            int aberta = painelJaAberto();
            if (aberta > 0) {
                String url = "http://localhost:" + aberta + "/";
                log("A calculadora já está aberta em " + url + " (abrindo no navegador).");
                if (abrirNavegador) { abrirNoNavegador(url); Thread.sleep(3000); }
                System.exit(0);
            }
        }

        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            pararMotor(motor);
            apagarArquivoDaPorta();
        }, "desligamento"));

        if (instalarESair) { // usado na CI e para pré-instalar: prepara, testa o motor e sai
            prepararNaInicializacao();
            boolean ok = "pronto".equals(estado) && motor != null && motor.isAlive();
            if (ok) {
                String falha = calculoDeTeste();
                ok = falha == null;
                if (!ok) mensagem = falha;
            }
            log(ok ? "OK: motor " + versaoInstalada + " instalado e calculando." : "FALHOU: " + mensagem);
            pararMotor(motor);
            System.exit(ok ? 0 : 1);
        }

        int porta = iniciarServidorWeb();
        portaPainel = porta;
        Files.writeString(dados.resolve(ARQ_PORTA), String.valueOf(porta)); // para a próxima abertura achar esta
        String url = "http://localhost:" + porta + "/";
        log("Painel disponível em " + url + (rede ? " (também acessível pela rede local)" : ""));
        if (abrirNavegador) abrirNoNavegador(url);

        if (apiExterna != null) {
            estado = "pronto";
            mensagem = "Usando motor externo em " + apiExterna;
            versaoInstalada = "externo";
        } else {
            // Primeira preparação (pode levar alguns minutos na primeira vez)
            agendador.execute(CalculadoraRTC::prepararNaInicializacao);
            if (!semAtualizacao && versaoFixa == null && horasEntreVerificacoes > 0) {
                agendador.scheduleWithFixedDelay(() -> verificarEAtualizar(false),
                        horasEntreVerificacoes, horasEntreVerificacoes, TimeUnit.HOURS);
            }
        }
        if (atalho && minutosSemUso > 0) {
            vigiarUso();
            log("Aberta pelo atalho: encerra sozinha " + minutosSemUso + (minutosSemUso == 1 ? " minuto" : " minutos")
                    + " depois que a última aba for fechada.");
        } else {
            log("Deixe esta janela aberta enquanto usa a calculadora. Para encerrar: Ctrl+C (ou feche a janela).");
        }
        Thread.currentThread().join();
    }

    /** Interpreta as opções da linha de comando (as mesmas de iniciar.sh / iniciar.bat). */
    static void lerArgumentos(String[] args) {
        String b = null;
        for (int i = 0; i < args.length; i++) {
            switch (args[i]) {
                case "--base" -> b = args[++i];
                case "--porta" -> portaWeb = Integer.parseInt(args[++i]);
                case "--sem-navegador" -> abrirNavegador = false;
                case "--rede" -> rede = true;
                case "--sem-atualizacao" -> semAtualizacao = true;
                case "--instalar-e-sair" -> { instalarESair = true; abrirNavegador = false; }
                case "--versao" -> versaoFixa = args[++i];
                case "--api-externa" -> apiExterna = args[++i].replaceAll("/+$", "");
                case "--dados" -> dadosEscolhido = args[++i];
                case "--atalho" -> atalho = true;
                case "--ajuda", "-h", "--help" -> { ajuda(); System.exit(0); }
                default -> { System.err.println("Opção desconhecida: " + args[i]); ajuda(); System.exit(2); }
            }
        }
        base = Paths.get(b != null ? b : ".").toAbsolutePath().normalize();
    }

    /** Texto de --ajuda. */
    static void ajuda() {
        System.out.println("""
            Uso: iniciar.sh | iniciar.bat [opções]

              --porta N            porta do painel (padrão 8090)
              --rede               aceita acessos de outros computadores da rede
              --sem-navegador      não abre o navegador automaticamente
              --sem-atualizacao    não procura versões novas (usa a instalada)
              --versao X           usa uma versão específica da calculadora oficial (ex.: 1.7.3)
              --instalar-e-sair    só instala/atualiza o motor, testa e encerra (útil para CI)
              --api-externa URL    não gerencia o motor; usa um já em execução (desenvolvimento)
              --dados PASTA        onde guardar o Java, o motor e os logs (padrão: ./dados)
              --atalho             modo do ícone: encerra sozinha quando nenhuma aba estiver aberta
              --so-java            (só nos scripts) baixa ou atualiza o Java portátil e encerra
            """);
    }

    // ================================================================== ciclo do motor
    /** Primeira preparação ao abrir: usa a versão fixada (--versao), ou procura a mais recente e instala se preciso;
     *  sem internet, sobe a última versão já instalada. */
    static void prepararNaInicializacao() {
        try {
            versaoInstalada = lerTexto(dirMotores.resolve("atual"));
            if (versaoFixa != null) {
                if (!motorValido(versaoFixa)) instalarVersao(versaoFixa);
                trocarMotor(versaoFixa);
                return;
            }
            if (!semAtualizacao) verificarEAtualizar(true); // instala e sobe se houver versão nova
            if (motor == null || !motor.isAlive()) {
                if (!motorValido(versaoInstalada)) {
                    throw new IllegalStateException("Nenhuma versão do motor de cálculo está instalada e não foi possível instalar: "
                            + (erroAtualizacao != null ? erroAtualizacao : "verifique a conexão com a internet."));
                }
                trocarMotor(versaoInstalada);
            }
        } catch (Exception e) {
            estado = "erro";
            mensagem = descrever(e);
            log("ERRO: " + mensagem);
        }
    }

    /** Procura uma versão nova; se houver, instala e troca o motor em execução. */
    static void verificarEAtualizar(boolean inicializacao) {
        synchronized (trava) {
            if (atualizando) return;
            atualizando = true;
        }
        try {
            if (inicializacao) definir("verificando", "Procurando a versão mais recente da calculadora oficial...");
            String ultima = descobrirUltimaVersao();
            versaoDisponivel = ultima;
            ultimaVerificacao = agora();
            erroAtualizacao = null;
            log("Versão mais recente publicada: " + ultima + " | instalada: " + Objects.toString(versaoInstalada, "nenhuma"));
            if (!ultima.equals(versaoInstalada) || !motorValido(ultima)) {
                if (!motorValido(ultima)) instalarVersao(ultima);
                trocarMotor(ultima);
            } else if (motor != null) {
                definir("pronto", "Motor de cálculo " + versaoInstalada + " pronto (já é a versão mais recente).");
            }
        } catch (Exception e) {
            erroAtualizacao = descrever(e);
            ultimaVerificacao = agora();
            log("Não foi possível atualizar agora: " + erroAtualizacao);
            if (motor != null) definir("pronto", "Motor " + versaoInstalada + " em uso (a atualização falhou e será tentada de novo depois).");
        } finally {
            atualizando = false;
        }
    }

    /** Maior tag de versão publicada no repositório oficial (ex.: 1.7.3). */
    static String descobrirUltimaVersao() throws IOException, InterruptedException {
        // Endpoint "smart HTTP" do git: lista as tags sem precisar de git nem da API (sem limite de requisições)
        String url = repo + ".git/info/refs?service=git-upload-pack";
        HttpResponse<String> r = http.send(HttpRequest.newBuilder(URI.create(url))
                .header("User-Agent", "calculadora-rtc-facil").timeout(Duration.ofSeconds(30)).build(),
                HttpResponse.BodyHandlers.ofString(StandardCharsets.ISO_8859_1));
        if (r.statusCode() != 200) throw new IOException("GitHub respondeu " + r.statusCode() + " ao listar as versões");
        Matcher m = Pattern.compile("refs/tags/([^\\s^{}\\x00]+)").matcher(r.body());
        Set<String> tags = new TreeSet<>(CalculadoraRTC::compararVersoes);
        while (m.find()) if (m.group(1).matches("v?\\d+(\\.\\d+)*")) tags.add(m.group(1));
        if (tags.isEmpty()) throw new IOException("nenhuma versão (tag) encontrada no repositório oficial");
        return ((TreeSet<String>) tags).last();
    }

    /** Compara versões pelos números (1.10.0 > 1.9.2), e não como texto. */
    static int compararVersoes(String a, String b) {
        int[] x = numeros(a), y = numeros(b);
        for (int i = 0; i < Math.max(x.length, y.length); i++) {
            int c = Integer.compare(i < x.length ? x[i] : 0, i < y.length ? y[i] : 0);
            if (c != 0) return c;
        }
        return a.compareTo(b);
    }

    /** "v1.7.3" → [1, 7, 3]. */
    static int[] numeros(String v) {
        return Arrays.stream(v.replaceFirst("^v", "").split("\\D+")).filter(s -> !s.isEmpty())
                .mapToInt(s -> (int) Math.min(Integer.MAX_VALUE, Long.parseLong(s))).toArray();
    }

    /** A versão está instalada por completo (JAR e banco)? A instalação só publica a pasta no fim, de forma atômica. */
    static boolean motorValido(String versao) {
        if (versao == null) return false;
        Path d = dirMotores.resolve(versao);
        return Files.isRegularFile(d.resolve("api-regime-geral.jar"))
                && tamanho(d.resolve("calculadora/db/calculadora-pro.db")) > 0;
    }

    /** Baixa o código-fonte da versão, gera o banco e compila o JAR. */
    static void instalarVersao(String versao) throws Exception {
        if (!versao.matches("[A-Za-z0-9._-]+")) throw new IllegalArgumentException("versão inválida: " + versao);
        Path log = dirLogs.resolve("instalacao-" + versao + ".log");
        ultimoLog.set(log);
        Files.writeString(log, "Instalação da versão " + versao + " em " + agora() + "\n");

        boolean primeira = versaoInstalada == null;
        String sufixo = primeira ? " (a primeira instalação pode levar de 5 a 15 minutos)" : " (o motor atual continua funcionando enquanto isso)";

        // 1. Download
        definirSe(primeira, "baixando", "Baixando a versão " + versao + " da calculadora oficial" + sufixo);
        Path zip = dirFontes.resolve(versao + ".zip");
        String url = repo + "/archive/refs/tags/" + versao + ".zip";
        baixar(url, zip);
        Path destino = dirFontes.resolve(versao);
        apagar(destino);
        Path raiz = extrairZip(zip, destino);
        Files.deleteIfExists(zip);

        // 2. Banco de dados (passo 3 do README oficial)
        definirSe(primeira, "compilando", "Gerando o banco de dados da versão " + versao + sufixo);
        Files.createDirectories(raiz.resolve("calculadora/db"));
        Path mvnw = raiz.resolve(windows() ? "mvnw.cmd" : "mvnw");
        if (!Files.exists(mvnw)) throw new IOException("o pacote baixado não contém o Maven Wrapper (" + mvnw.getFileName() + ")");
        mvnw.toFile().setExecutable(true);
        // O repositório oficial guarda o mvnw.cmd com quebras de linha LF. Quem clona com o Git para Windows
        // recebe CRLF, mas o ZIP do GitHub vem com LF, e o cmd.exe se perde nos "goto" e nas linhas com "^".
        if (windows()) converterParaCrlf(raiz);
        garantirWrapperJar(raiz, log);
        executar(raiz, log, List.of("flyway:migrate", "-Dflyway.configFiles=./flyway/flyway-pro.conf", "--batch-mode", "--errors"));
        Path db = raiz.resolve("calculadora/db/calculadora-pro.db");
        if (tamanho(db) <= 0) throw new IOException("o banco de dados não foi gerado (veja " + log + ")");

        // 3. Compilação (passo 6 do README oficial, sem testes para ser rápido)
        definirSe(primeira, "compilando", "Compilando o motor de cálculo " + versao + sufixo);
        executar(raiz, log, List.of("clean", "package", "-DskipTests", "--batch-mode", "--errors"));
        Path jar;
        try (Stream<Path> s = Files.list(raiz.resolve("target"))) {
            jar = s.filter(p -> p.getFileName().toString().matches("api-regime-geral.*\\.jar"))
                    .filter(p -> !p.getFileName().toString().endsWith("-plain.jar"))
                    .findFirst().orElseThrow(() -> new IOException("o JAR não foi gerado (veja " + log + ")"));
        }

        // 4. Publica a versão na pasta de motores (de forma atômica)
        Path tmp = dirMotores.resolve(versao + ".tmp");
        apagar(tmp);
        Files.createDirectories(tmp.resolve("calculadora/db"));
        Files.copy(jar, tmp.resolve("api-regime-geral.jar"));
        Files.copy(db, tmp.resolve("calculadora/db/calculadora-pro.db"));
        Path final_ = dirMotores.resolve(versao);
        apagar(final_);
        Files.move(tmp, final_, StandardCopyOption.ATOMIC_MOVE);
        apagar(destino); // o código-fonte não é mais necessário
        log("Versão " + versao + " instalada com sucesso.");
    }

    /** Sobe o motor da versão indicada; quando estiver respondendo, desliga o anterior. */
    static void trocarMotor(String versao) throws Exception {
        boolean primeira = motor == null;
        definirSe(primeira, "subindo", "Iniciando o motor de cálculo " + versao + "...");
        Path dir = dirMotores.resolve(versao);
        if (!Files.exists(dir.resolve(ARQ_RELACAO))) gerarRelacaoNcm(dir);
        int porta = portaLivre();
        Path log = dirLogs.resolve("motor.log");
        ultimoLog.set(log);
        // -XX:-UseBASE64Intrinsics: mitigação da falha Java4Shell (CVE-2026-114938, 17/11/2026) no decodificador
        // Base64 acelerado do HotSpot, a mesma que a Receita adotou na versão oficial 1.7.1. Desliga só a versão
        // otimizada do Base64 (o resultado é idêntico) e vale mesmo que o Java portátil ainda não tenha a correção.
        List<String> cmd = List.of(javaExe(), "-XX:-UseBASE64Intrinsics", "-Xms128m", "-Dspring.profiles.active=offline",
                "-Dserver.address=127.0.0.1", "-Dserver.port=" + porta, "-jar", "api-regime-geral.jar");
        Process novo = new ProcessBuilder(cmd).directory(dir.toFile()).redirectErrorStream(true)
                .redirectOutput(ProcessBuilder.Redirect.to(log.toFile())).start();
        log("Motor " + versao + " iniciando na porta interna " + porta + " (log: " + log + ")");

        long limite = System.currentTimeMillis() + 240_000;
        while (true) {
            if (!novo.isAlive()) throw new IOException("o motor " + versao + " encerrou ao iniciar (veja " + log + ")");
            if (respondendo(porta)) break;
            if (System.currentTimeMillis() > limite) {
                novo.destroyForcibly();
                throw new IOException("o motor " + versao + " não respondeu em 4 minutos (veja " + log + ")");
            }
            Thread.sleep(1000);
        }
        Process antigo = motor;
        motor = novo;
        portaMotor = porta;
        versaoInstalada = versao;
        Files.writeString(dirMotores.resolve("atual"), versao);
        pararMotor(antigo);
        limparVersoesAntigas(versao);
        definir("pronto", "Motor de cálculo " + versao + " pronto.");
        log("Pronto! Motor " + versao + " em uso.");
    }

    /** Faz um cálculo simples (arroz da cesta básica) no motor; devolve null se deu certo ou a falha. */
    static String calculoDeTeste() {
        LocalDate hoje = LocalDate.now();
        String aliquotas = hoje.getYear() >= 2027
                ? ",\"aliquotasNominais\":{\"cbs\":11.2,\"ibsEstadual\":0.05,\"ibsMunicipal\":0.05}" : "";
        String corpo = "{\"id\":\"teste\",\"versao\":\"1.0.0\",\"dhFatoGerador\":\"" + hoje + "T12:00:00-03:00\","
                + "\"municipio\":3550308,\"uf\":\"SP\",\"itens\":[{\"numero\":1,\"ncm\":\"10063021\",\"cst\":\"200\","
                + "\"cClassTrib\":\"200003\",\"baseCalculo\":100.00,\"quantidade\":1,\"unidade\":\"KG\"" + aliquotas + "}]}";
        try {
            var r = httpLocal.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + portaMotor
                    + "/api/calculadora/observabilidade/regime-geral")).timeout(Duration.ofMinutes(1))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(corpo)).build(), HttpResponse.BodyHandlers.ofString());
            String b = r.body();
            if (r.statusCode() != 200 || !b.contains("\"objetos\"") || b.contains("\"erros\"")) {
                return "cálculo de teste falhou (HTTP " + r.statusCode() + "): " + b.substring(0, Math.min(500, b.length()));
            }
            log("Cálculo de teste OK: " + b.replaceAll("\\s+", " ").substring(0, Math.min(300, b.length())));
            return null;
        } catch (Exception e) {
            return "cálculo de teste falhou: " + descrever(e);
        }
    }

    // ================================================================== relação NCM × classificação
    static final String ARQ_RELACAO = "ncm-classificacoes.json";

    /**
     * Lê do banco oficial a relação "quais NCMs estão vinculados a cada classificação tributária"
     * (tabela NCM_APLICAVEL, com o texto do anexo da LC 214) e grava em JSON para o front sugerir
     * a classificação de cada item. Usa o driver SQLite que já vem dentro do JAR oficial, então
     * a relação acompanha cada versão instalada. Se falhar, a calculadora funciona sem as sugestões.
     */
    static void gerarRelacaoNcm(Path dirMotor) {
        Path jar = dirMotor.resolve("api-regime-geral.jar");
        Path db = dirMotor.resolve("calculadora/db/calculadora-pro.db");
        Path dirDriver = dirMotor.resolve("driver-sqlite");
        try {
            // O driver SQLite e a biblioteca de log que ele usa (slf4j-api) vêm dentro do JAR oficial
            List<URL> urls = new ArrayList<>();
            Files.createDirectories(dirDriver);
            try (ZipFile z = new ZipFile(jar.toFile())) {
                for (ZipEntry e : Collections.list(z.entries())) {
                    String n = e.getName();
                    if (!n.matches("BOOT-INF/lib/(sqlite-jdbc|slf4j-api)-[^/]*\\.jar")) continue;
                    Path destino = dirDriver.resolve(n.substring(n.lastIndexOf('/') + 1));
                    try (InputStream in = z.getInputStream(e)) {
                        Files.copy(in, destino, StandardCopyOption.REPLACE_EXISTING);
                    }
                    urls.add(destino.toUri().toURL());
                }
            }
            if (urls.stream().noneMatch(u -> u.getPath().contains("sqlite-jdbc"))) {
                throw new IOException("driver SQLite não encontrado no JAR oficial");
            }
            String json;
            PrintStream errOriginal = System.err; // o driver e o slf4j escrevem avisos sem importância no terminal
            System.setErr(new PrintStream(OutputStream.nullOutputStream()));
            try (URLClassLoader cl = new URLClassLoader(urls.toArray(URL[]::new), CalculadoraRTC.class.getClassLoader())) {
                java.sql.Driver driver = (java.sql.Driver) Class.forName("org.sqlite.JDBC", true, cl).getDeclaredConstructor().newInstance();
                Properties props = new Properties();
                props.setProperty("open_mode", "1"); // somente leitura
                try (java.sql.Connection c = driver.connect("jdbc:sqlite:" + db.toAbsolutePath(), props)) {
                    json = montarRelacaoJson(c);
                }
            } finally {
                System.setErr(errOriginal);
            }
            Files.writeString(dirMotor.resolve(ARQ_RELACAO), json, StandardCharsets.UTF_8);
            log("Relação NCM × classificação tributária gerada para as sugestões da tela.");
        } catch (Throwable t) {
            log("Aviso: não foi possível gerar as sugestões de classificação (" + descrever(t) + "). A calculadora funciona normalmente sem elas.");
        }
    }

    /** Consulta as tabelas NCM_APLICAVEL, EXCECAO_NCM_APLICAVEL e ANEXO e monta o JSON compacto lido pela tela
     *  (formato descrito em web/app.js, antes de carregarRelacao). */
    static String montarRelacaoJson(java.sql.Connection c) throws java.sql.SQLException {
        StringBuilder sb = new StringBuilder("{\"regras\":[");
        // Só classificações de CBS/IBS (o Imposto Seletivo tem classificações próprias com os mesmos códigos)
        String sqlRegras = """
                select a.NCMA_ID, a.NCMA_NCM_CD, c.CLTR_CD, a.NCMA_INICIO_VIGENCIA, a.NCMA_FIM_VIGENCIA, a.NCMA_ANXO_ID
                from NCM_APLICAVEL a join CLASSIFICACAO_TRIBUTARIA c on c.CLTR_ID = a.NCMA_CLTR_ID
                where exists (select 1 from TRIBUTO_SITUACAO_TRIBUTARIA t
                              where t.TRST_SITR_ID = c.CLTR_SITR_ID and t.TRST_TBTO_ID = 2)
                order by a.NCMA_NCM_CD""";
        Set<Long> anexosUsados = new TreeSet<>();
        try (var st = c.createStatement(); var rs = st.executeQuery(sqlRegras)) {
            boolean primeiro = true;
            while (rs.next()) {
                long anexo = rs.getLong(6);
                boolean temAnexo = !rs.wasNull();
                if (temAnexo) anexosUsados.add(anexo);
                sb.append(primeiro ? "" : ",").append('[').append(rs.getLong(1)).append(',').append(q(rs.getString(2)))
                        .append(',').append(q(rs.getString(3))).append(',').append(q(dataCurta(rs.getString(4))))
                        .append(',').append(q(dataCurta(rs.getString(5)))).append(',').append(temAnexo ? anexo : "null").append(']');
                primeiro = false;
            }
        }
        sb.append("],\"excecoes\":[");
        try (var st = c.createStatement(); var rs = st.executeQuery(
                "select ENCM_NCMA_ID, ENCM_NCM_CD, ENCM_INICIO_VIGENCIA, ENCM_FIM_VIGENCIA from EXCECAO_NCM_APLICAVEL")) {
            boolean primeiro = true;
            while (rs.next()) {
                sb.append(primeiro ? "" : ",").append('[').append(rs.getLong(1)).append(',').append(q(rs.getString(2)))
                        .append(',').append(q(dataCurta(rs.getString(3)))).append(',').append(q(dataCurta(rs.getString(4)))).append(']');
                primeiro = false;
            }
        }
        sb.append("],\"anexos\":{");
        try (var st = c.createStatement(); var rs = st.executeQuery(
                "select ANXO_ID, ANXO_NUMERO, ANXO_NUMERO_ITEM, ANXO_TEXTO_ITEM from ANEXO")) {
            boolean primeiro = true;
            while (rs.next()) {
                if (!anexosUsados.contains(rs.getLong(1))) continue;
                sb.append(primeiro ? "" : ",").append(q(String.valueOf(rs.getLong(1)))).append(":[")
                        .append(q(rs.getString(2))).append(',').append(q(rs.getString(3))).append(',').append(q(rs.getString(4))).append(']');
                primeiro = false;
            }
        }
        return sb.append("}}").toString();
    }

    /** "2026-01-01 00:00:00" → "2026-01-01". */
    static String dataCurta(String s) {
        return s == null ? null : s.length() >= 10 ? s.substring(0, 10) : s;
    }

    /** Arquivo da relação NCM × classificação da versão em uso (ou o indicado em CALC_RTC_RELACAO, no desenvolvimento). */
    static Path arquivoRelacao() {
        String dev = env("CALC_RTC_RELACAO", null); // desenvolvimento com motor externo/simulado
        if (dev != null) return Paths.get(dev);
        return versaoInstalada == null ? null : dirMotores.resolve(versaoInstalada).resolve(ARQ_RELACAO);
    }

    /** O motor na porta indicada já responde? Usa uma rota leve dos dados abertos. */
    static boolean respondendo(int porta) {
        try {
            var r = httpLocal.send(HttpRequest.newBuilder(URI.create(
                    "http://127.0.0.1:" + porta + "/api/calculadora/dados-abertos/versao"))
                    .timeout(Duration.ofSeconds(5)).build(), HttpResponse.BodyHandlers.discarding());
            return r.statusCode() == 200;
        } catch (Exception e) {
            return false;
        }
    }

    /** Encerra um motor: pede com educação e, se não sair em 15 s, força. */
    static void pararMotor(Process p) {
        if (p == null || !p.isAlive()) return;
        p.destroy();
        try {
            if (!p.waitFor(15, TimeUnit.SECONDS)) p.destroyForcibly();
        } catch (InterruptedException ignored) {
            p.destroyForcibly();
        }
    }

    /** Mantém a versão em uso e a anterior (para voltar atrás manualmente se precisar). */
    static void limparVersoesAntigas(String atual) {
        try (Stream<Path> s = Files.list(dirMotores)) {
            List<String> versoes = s.filter(Files::isDirectory).map(p -> p.getFileName().toString())
                    .filter(v -> !v.endsWith(".tmp")).sorted(CalculadoraRTC::compararVersoes).toList();
            for (String v : versoes) {
                if (compararVersoes(v, atual) < 0 && versoes.indexOf(v) < versoes.indexOf(atual) - 1) {
                    apagar(dirMotores.resolve(v));
                    log("Versão antiga removida: " + v);
                }
            }
        } catch (IOException ignored) {
        }
    }

    // ================================================================== Maven / arquivos
    /** Roda o Maven Wrapper; se falhar (em geral, download interrompido), tenta de novo até 2 vezes.
     *  Se o log mostrar que o repositório recusou por excesso de pedidos (HTTP 429), espera mais. */
    static void executar(Path dir, Path log, List<String> argsMaven) throws Exception {
        for (int tentativa = 1; ; tentativa++) {
            try {
                executarUmaVez(dir, log, argsMaven);
                return;
            } catch (IOException falha) {
                if (tentativa >= 3 || (falha.getMessage() != null && falha.getMessage().contains("demorou demais"))) throw falha;
                String fim = ultimasLinhas(log, 60);
                boolean excesso = fim.contains("429") || fim.contains("Too Many Requests");
                long espera = excesso ? 60_000L * tentativa : 10_000L;
                log("O Maven falhou" + (excesso ? " (o repositório recusou por excesso de pedidos)" : "")
                        + "; tentando de novo em " + espera / 1000 + " segundos...");
                Files.writeString(log, "\n--- nova tentativa ---\n", StandardOpenOption.APPEND);
                Thread.sleep(espera);
                garantirWrapperJar(dir, log);
            }
        }
    }

    /**
     * O mvnw baixa o .mvn/wrapper/maven-wrapper.jar na primeira execução. Se esse download falha,
     * o script apaga o arquivo e o erro só aparece depois ("MavenWrapperMain" não encontrado).
     * Aqui o arquivo é baixado antes, pelo Java, com até 3 tentativas (e sem depender do PowerShell no Windows).
     */
    static void garantirWrapperJar(Path raiz, Path log) throws Exception {
        Path jar = raiz.resolve(".mvn/wrapper/maven-wrapper.jar");
        if (tamanho(jar) > 0) return;
        String url = "https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.2.0/maven-wrapper-3.2.0.jar";
        Path props = raiz.resolve(".mvn/wrapper/maven-wrapper.properties");
        if (Files.exists(props)) {
            for (String linha : Files.readAllLines(props)) {
                if (linha.startsWith("wrapperUrl=")) url = linha.substring("wrapperUrl=".length()).trim();
            }
        }
        Files.createDirectories(jar.getParent());
        IOException ultimo = null;
        final int tentativas = 5;
        for (int tentativa = 1; tentativa <= tentativas; tentativa++) {
            try {
                baixar(url, jar);
                if (tamanho(jar) > 0) {
                    Files.writeString(log, "maven-wrapper.jar baixado de " + url + "\n", StandardOpenOption.APPEND);
                    return;
                }
            } catch (IOException e) {
                ultimo = e;
                Files.deleteIfExists(jar);
                if (tentativa == tentativas) break;
                long espera = esperaAntesDe(tentativa, e);
                log("Download do Maven Wrapper falhou (tentativa " + tentativa + " de " + tentativas + "): " + descrever(e)
                        + ". Nova tentativa em " + espera / 1000 + " s.");
                Thread.sleep(espera);
            }
        }
        throw new IOException("não foi possível baixar o Maven Wrapper de " + url + ": " + (ultimo != null ? descrever(ultimo) : "arquivo vazio"));
    }

    /** Roda o mvnw com o Java desta instalação (JAVA_HOME e PATH ajustados) e grava a saída no log. */
    static void executarUmaVez(Path dir, Path log, List<String> argsMaven) throws Exception {
        List<String> cmd = new ArrayList<>();
        if (windows()) {
            cmd.addAll(List.of("cmd.exe", "/c", "mvnw.cmd"));
        } else {
            cmd.add("./mvnw");
        }
        cmd.addAll(argsMaven);
        ProcessBuilder pb = new ProcessBuilder(cmd).directory(dir.toFile()).redirectErrorStream(true)
                .redirectOutput(ProcessBuilder.Redirect.appendTo(log.toFile()));
        String javaHome = System.getProperty("java.home");
        Map<String, String> ambiente = pb.environment();
        ambiente.put("JAVA_HOME", javaHome);
        // No Windows a variável se chama "Path" (no Linux, "PATH"); o mapa do Java diferencia maiúsculas.
        // Procura sem diferenciar, para acrescentar o Java sem perder o resto do caminho (onde está o PowerShell).
        String chavePath = ambiente.keySet().stream().filter(k -> k.equalsIgnoreCase("PATH")).findFirst().orElse("PATH");
        String caminhoAtual = ambiente.getOrDefault(chavePath, "");
        ambiente.keySet().removeIf(k -> k.equalsIgnoreCase("PATH"));
        ambiente.put(chavePath, Paths.get(javaHome, "bin") + (caminhoAtual.isEmpty() ? "" : File.pathSeparator + caminhoAtual));
        Files.writeString(log, "\n$ " + String.join(" ", cmd) + "\n", StandardOpenOption.APPEND);
        Process p = pb.start();
        if (!p.waitFor(60, TimeUnit.MINUTES)) {
            p.destroyForcibly();
            throw new IOException("o Maven demorou demais (veja " + log + ")");
        }
        if (p.exitValue() != 0) {
            log("Últimas linhas de " + log.getFileName() + ":\n" + ultimasLinhas(log, 25));
            throw new IOException("falha ao executar 'mvnw " + String.join(" ", argsMaven.subList(0, 1))
                    + "' (código " + p.exitValue() + "). Detalhes em " + log);
        }
    }

    /** Converte as quebras de linha de todos os .cmd e .bat da pasta para CRLF (exigência do cmd.exe). */
    static void converterParaCrlf(Path raiz) throws IOException {
        List<Path> scripts;
        try (Stream<Path> s = Files.walk(raiz)) {
            scripts = s.filter(Files::isRegularFile).filter(p -> {
                String n = p.getFileName().toString().toLowerCase(Locale.ROOT);
                return n.endsWith(".cmd") || n.endsWith(".bat");
            }).toList();
        }
        for (Path p : scripts) {
            String texto = Files.readString(p, StandardCharsets.ISO_8859_1); // preserva os bytes como estão
            String crlf = texto.replace("\r\n", "\n").replace("\n", "\r\n");
            if (!crlf.equals(texto)) Files.writeString(p, crlf, StandardCharsets.ISO_8859_1);
        }
    }

    /** Baixa um arquivo para o disco; qualquer resposta diferente de 200 é erro. */
    static void baixar(String url, Path destino) throws IOException, InterruptedException {
        log("Baixando " + url);
        HttpResponse<Path> r = http.send(HttpRequest.newBuilder(URI.create(url))
                .header("User-Agent", "calculadora-rtc-facil").timeout(Duration.ofMinutes(10)).build(),
                HttpResponse.BodyHandlers.ofFile(destino));
        if (r.statusCode() != 200) {
            Files.deleteIfExists(destino);
            long esperar = r.headers().firstValue("Retry-After").filter(v -> v.matches("\\d{1,6}")).map(Long::parseLong).orElse(0L);
            throw new FalhaDeDownload(r.statusCode(), esperar, url);
        }
    }

    /** Download recusado pelo servidor. 429 (Too Many Requests) e 503 são passageiros: o servidor pede para
     *  esperar, às vezes dizendo quanto no cabeçalho Retry-After. Acontece no Maven Central quando muitas máquinas
     *  saem pelo mesmo IP (servidores do GitHub Actions, redes de empresa). */
    static final class FalhaDeDownload extends IOException {
        private static final long serialVersionUID = 1L;
        final int status;
        final long retryAfterSegundos;

        FalhaDeDownload(int status, long retryAfterSegundos, String url) {
            super("download falhou (HTTP " + status + (status == 429 ? ", servidor com excesso de pedidos" : "") + "): " + url);
            this.status = status;
            this.retryAfterSegundos = retryAfterSegundos;
        }

        boolean passageira() { return status == 429 || status == 503 || status == 502 || status == 504; }
    }

    /** Quanto esperar antes da tentativa seguinte: o que o servidor pediu (até 5 min) ou 30 s, 60 s, 120 s...
     *  para recusas passageiras; 5 s, 10 s... para as demais falhas. */
    static long esperaAntesDe(int tentativa, IOException falha) {
        if (falha instanceof FalhaDeDownload f && f.passageira()) {
            if (f.retryAfterSegundos > 0) return Math.min(f.retryAfterSegundos, 300) * 1000;
            return Math.min(30_000L << (tentativa - 1), 240_000L);
        }
        return 5_000L * tentativa;
    }

    /** Extrai o zip e devolve a pasta raiz do projeto (o GitHub coloca tudo dentro de uma pasta). */
    static Path extrairZip(Path zip, Path destino) throws IOException {
        Files.createDirectories(destino);
        Path destinoNorm = destino.toAbsolutePath().normalize();
        try (ZipInputStream z = new ZipInputStream(new BufferedInputStream(Files.newInputStream(zip)))) {
            for (ZipEntry e; (e = z.getNextEntry()) != null; ) {
                Path alvo = destinoNorm.resolve(e.getName()).normalize();
                if (!alvo.startsWith(destinoNorm)) throw new IOException("zip com caminho inválido: " + e.getName());
                if (e.isDirectory()) Files.createDirectories(alvo);
                else {
                    Files.createDirectories(alvo.getParent());
                    Files.copy(z, alvo, StandardCopyOption.REPLACE_EXISTING);
                }
            }
        }
        try (Stream<Path> s = Files.list(destino)) {
            List<Path> itens = s.toList();
            if (itens.size() == 1 && Files.isDirectory(itens.get(0))) return itens.get(0);
        }
        return destino;
    }

    /** Apaga uma pasta inteira (como rm -rf), tirando antes a proteção contra escrita (o Windows a usa no .git). */
    static void apagar(Path p) throws IOException {
        if (!Files.exists(p)) return;
        try (Stream<Path> s = Files.walk(p)) {
            for (Path x : s.sorted(Comparator.reverseOrder()).toList()) {
                x.toFile().setWritable(true);
                Files.deleteIfExists(x);
            }
        }
    }

    /** Tamanho do arquivo em bytes, ou -1 se não existir. */
    static long tamanho(Path p) {
        try {
            return Files.size(p);
        } catch (IOException e) {
            return -1;
        }
    }

    /** Conteúdo de um arquivo de texto curto (sem espaços nas pontas), ou null se não existir ou estiver vazio. */
    static String lerTexto(Path p) {
        try {
            String s = Files.readString(p).trim();
            return s.isEmpty() ? null : s;
        } catch (IOException e) {
            return null;
        }
    }

    /** Porta livre escolhida pelo sistema, só na interface local. */
    static int portaLivre() throws IOException {
        try (ServerSocket s = new ServerSocket(0, 0, InetAddress.getLoopbackAddress())) {
            return s.getLocalPort();
        }
    }

    /** Caminho do executável java desta mesma instalação, usado para subir o motor. */
    static String javaExe() {
        return Paths.get(System.getProperty("java.home"), "bin", windows() ? "java.exe" : "java").toString();
    }

    static boolean windows() {
        return System.getProperty("os.name").toLowerCase().contains("win");
    }

    // ================================================================== instância única e encerramento
    static final String ARQ_PORTA = "painel.porta"; // porta do painel em uso, gravada dentro da pasta de dados

    /** Porta de uma calculadora já aberta com a mesma pasta de dados (que responde em /painel/status), ou -1. */
    static int painelJaAberto() {
        String texto = lerTexto(dados.resolve(ARQ_PORTA));
        if (texto == null || !texto.matches("\\d{1,5}")) return -1;
        int porta = Integer.parseInt(texto);
        try {
            var r = httpLocal.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + porta + "/painel/status"))
                    .timeout(Duration.ofSeconds(3)).build(), HttpResponse.BodyHandlers.ofString());
            return r.statusCode() == 200 && r.body().contains("\"versaoPainel\"") ? porta : -1;
        } catch (Exception e) {
            return -1; // arquivo de uma execução que terminou sem apagá-lo (queda de energia, kill -9...)
        }
    }

    /** Apaga o arquivo da porta, se ainda for o desta execução. */
    static void apagarArquivoDaPorta() {
        Path p = dados.resolve(ARQ_PORTA);
        if (String.valueOf(portaPainel).equals(lerTexto(p))) {
            try { Files.deleteIfExists(p); } catch (IOException ignored) { }
        }
    }

    /** Modo atalho: a cada minuto, confere há quanto tempo a tela não fala com o painel. Sem nenhuma aba aberta
     *  por minutosSemUso minutos (e sem instalação em andamento), encerra o painel e o motor. */
    static void vigiarUso() {
        ScheduledExecutorService vigia = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "vigia-de-uso");
            t.setDaemon(true);
            return t;
        });
        vigia.scheduleWithFixedDelay(() -> {
            long parado = (System.currentTimeMillis() - ultimoAcesso.get()) / 60_000;
            boolean ocupado = atualizando || !"pronto".equals(estado) && !"erro".equals(estado);
            if (parado >= minutosSemUso && !ocupado) {
                log("Nenhuma aba da calculadora aberta há " + parado + (parado == 1 ? " minuto" : " minutos") + ": encerrando.");
                System.exit(0);
            }
        }, 1, 1, TimeUnit.MINUTES);
    }

    /** Encerra o painel e o motor logo depois de responder (botão "Encerrar a calculadora" da aba Ajuda). */
    static void encerrarEmSeguida() {
        Thread t = new Thread(() -> {
            try { Thread.sleep(500); } catch (InterruptedException ignored) { }
            log("Encerrada pela tela.");
            System.exit(0);
        }, "encerrar");
        t.setDaemon(false);
        t.start();
    }

    // ================================================================== servidor web + proxy
    /** Sobe o servidor HTTP do painel (só localhost, a menos que --rede): /painel/ (estado), /api/ (proxy para o motor)
     *  e / (arquivos da pasta web/). Se a porta estiver ocupada, tenta as 19 seguintes. */
    static int iniciarServidorWeb() throws IOException {
        InetAddress endereco = rede ? InetAddress.getByName("0.0.0.0") : InetAddress.getLoopbackAddress();
        IOException ultimo = null;
        for (int p = portaWeb; p < portaWeb + 20; p++) {
            try {
                HttpServer s = HttpServer.create(new InetSocketAddress(endereco, p), 64);
                s.createContext("/painel/", CalculadoraRTC::tratarPainel);
                s.createContext("/api/", CalculadoraRTC::tratarProxy);
                s.createContext("/", CalculadoraRTC::tratarEstatico);
                s.setExecutor(Executors.newFixedThreadPool(16));
                s.start();
                if (p != portaWeb) log("A porta " + portaWeb + " estava ocupada; usando " + p + ".");
                return p;
            } catch (BindException e) {
                ultimo = e;
            }
        }
        throw new IOException("nenhuma porta livre entre " + portaWeb + " e " + (portaWeb + 19), ultimo);
    }

    /** Rotas do próprio gerenciador: status, pedido de atualização, relação NCM × classificação e log. */
    static void tratarPainel(HttpExchange ex) throws IOException {
        try (ex) {
            ultimoAcesso.set(System.currentTimeMillis());
            String caminho = ex.getRequestURI().getPath();
            switch (caminho) {
                case "/painel/status" -> responderJson(ex, 200, statusJson());
                case "/painel/encerrar" -> {
                    if (!"POST".equals(ex.getRequestMethod())) { responderJson(ex, 405, "{\"erro\":\"use POST\"}"); return; }
                    responderJson(ex, 202, "{\"encerrando\":true}");
                    encerrarEmSeguida();
                }
                case "/painel/atualizar" -> {
                    if (!"POST".equals(ex.getRequestMethod())) { responderJson(ex, 405, "{\"erro\":\"use POST\"}"); return; }
                    if (apiExterna != null) { responderJson(ex, 409, "{\"erro\":\"modo motor externo\"}"); return; }
                    Process m = motor;
                    boolean parado = m == null || !m.isAlive();
                    if (!parado && (semAtualizacao || versaoFixa != null)) { responderJson(ex, 409, "{\"erro\":\"atualização automática desativada\"}"); return; }
                    if (!atualizando) agendador.execute(parado ? CalculadoraRTC::prepararNaInicializacao : () -> verificarEAtualizar(false));
                    responderJson(ex, 202, statusJson());
                }
                case "/painel/ncm-classificacoes" -> {
                    Path a = arquivoRelacao();
                    if (a == null || !Files.isRegularFile(a)) { responderJson(ex, 404, "{\"erro\":\"relação indisponível\"}"); return; }
                    byte[] b = Files.readAllBytes(a);
                    ex.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
                    ex.getResponseHeaders().set("Cache-Control", "no-cache");
                    ex.sendResponseHeaders(200, b.length);
                    ex.getResponseBody().write(b);
                }
                case "/painel/log" -> {
                    Path l = ultimoLog.get();
                    String txt = l == null ? "(sem log ainda)" : ultimasLinhas(l, 200);
                    byte[] b = txt.getBytes(StandardCharsets.UTF_8);
                    ex.getResponseHeaders().set("Content-Type", "text/plain; charset=utf-8");
                    ex.sendResponseHeaders(200, b.length);
                    ex.getResponseBody().write(b);
                }
                default -> responderJson(ex, 404, "{\"erro\":\"não encontrado\"}");
            }
        }
    }

    /** Estado atual em JSON, lido pela tela a cada poucos segundos. */
    static String statusJson() {
        Process m = motor;
        boolean pronto = apiExterna != null || (m != null && m.isAlive() && portaMotor > 0);
        String est = pronto ? "pronto" : (m != null && !m.isAlive() ? "erro" : estado);
        String msg = m != null && !m.isAlive() && apiExterna == null
                ? "O motor de cálculo parou inesperadamente. Feche e abra a calculadora de novo. (log: dados/logs/motor.log)"
                : mensagem;
        return "{"
                + q("estado") + ":" + q(est) + ","
                + q("mensagem") + ":" + q(msg) + ","
                + q("pronto") + ":" + pronto + ","
                + q("atualizando") + ":" + atualizando + ","
                + q("versaoInstalada") + ":" + q(versaoInstalada) + ","
                + q("versaoDisponivel") + ":" + q(versaoDisponivel) + ","
                + q("ultimaVerificacao") + ":" + q(ultimaVerificacao) + ","
                + q("erroAtualizacao") + ":" + q(erroAtualizacao) + ","
                + q("atualizacaoAutomatica") + ":" + (apiExterna == null && !semAtualizacao && versaoFixa == null) + ","
                + q("horasEntreVerificacoes") + ":" + horasEntreVerificacoes + ","
                + q("repositorio") + ":" + q(repo) + ","
                + q("encerraSemUso") + ":" + (atalho && minutosSemUso > 0 ? String.valueOf(minutosSemUso) : "null") + ","
                + q("pastaDados") + ":" + q(dados.toString()) + ","
                + q("versaoPainel") + ":" + q(VERSAO_PAINEL)
                + "}";
    }

    // Cabeçalhos "hop-by-hop" que um proxy não deve repassar (e que o HttpClient do Java recusa)
    static final Set<String> CABECALHOS_PROIBIDOS = Set.of("connection", "content-length", "host", "upgrade",
            "expect", "keep-alive", "transfer-encoding", "te", "trailer", "proxy-connection", "http2-settings");

    /** Repassa /api/** ao motor oficial (método, corpo, cabeçalhos e resposta) — o navegador fala com uma origem só. */
    static void tratarProxy(HttpExchange ex) throws IOException {
        try (ex) {
            ultimoAcesso.set(System.currentTimeMillis());
            String alvo = apiExterna != null ? apiExterna : (portaMotor > 0 ? "http://127.0.0.1:" + portaMotor : null);
            if (alvo == null || (apiExterna == null && (motor == null || !motor.isAlive()))) {
                responderJson(ex, 503, "{\"title\":\"Motor de cálculo ainda não está pronto\",\"detail\":" + q(mensagem) + "}");
                return;
            }
            URI uri = URI.create(alvo + ex.getRequestURI().getRawPath()
                    + (ex.getRequestURI().getRawQuery() != null ? "?" + ex.getRequestURI().getRawQuery() : ""));
            byte[] corpo = ex.getRequestBody().readAllBytes();
            HttpRequest.Builder rb = HttpRequest.newBuilder(uri).timeout(Duration.ofMinutes(2))
                    .method(ex.getRequestMethod(), corpo.length == 0 ? HttpRequest.BodyPublishers.noBody()
                            : HttpRequest.BodyPublishers.ofByteArray(corpo));
            ex.getRequestHeaders().forEach((k, vs) -> {
                if (!CABECALHOS_PROIBIDOS.contains(k.toLowerCase(Locale.ROOT))) vs.forEach(v -> rb.header(k, v));
            });
            HttpResponse<byte[]> r;
            try {
                r = httpLocal.send(rb.build(), HttpResponse.BodyHandlers.ofByteArray());
            } catch (Exception e) {
                responderJson(ex, 502, "{\"title\":\"Falha ao falar com o motor de cálculo\",\"detail\":" + q(String.valueOf(e.getMessage())) + "}");
                return;
            }
            r.headers().map().forEach((k, vs) -> {
                String kl = k.toLowerCase(Locale.ROOT);
                if (!CABECALHOS_PROIBIDOS.contains(kl) && !kl.startsWith(":")) vs.forEach(v -> ex.getResponseHeaders().add(k, v));
            });
            byte[] b = r.body();
            boolean semCorpo = "HEAD".equals(ex.getRequestMethod()) || r.statusCode() == 204 || r.statusCode() == 304;
            ex.sendResponseHeaders(r.statusCode(), semCorpo ? -1 : (b.length == 0 ? -1 : b.length));
            if (!semCorpo && b.length > 0) ex.getResponseBody().write(b);
        }
    }

    // Tipo de conteúdo pela extensão dos arquivos servidos da pasta web/
    static final Map<String, String> TIPOS = Map.ofEntries(
            Map.entry("html", "text/html; charset=utf-8"), Map.entry("js", "text/javascript; charset=utf-8"),
            Map.entry("css", "text/css; charset=utf-8"), Map.entry("json", "application/json; charset=utf-8"),
            Map.entry("svg", "image/svg+xml"), Map.entry("png", "image/png"), Map.entry("ico", "image/x-icon"),
            Map.entry("md", "text/markdown; charset=utf-8"), Map.entry("txt", "text/plain; charset=utf-8"));

    /** Serve os arquivos da pasta web/, recusando caminhos que saiam dela (path traversal). */
    static void tratarEstatico(HttpExchange ex) throws IOException {
        try (ex) {
            String caminho = URLDecoder.decode(ex.getRequestURI().getRawPath(), StandardCharsets.UTF_8);
            if (caminho.equals("/")) caminho = "/index.html";
            Path raiz = dirWeb.toAbsolutePath().normalize();
            Path arq = raiz.resolve(caminho.substring(1)).normalize();
            if (!arq.startsWith(raiz) || !Files.isRegularFile(arq)) {
                responderJson(ex, 404, "{\"erro\":\"não encontrado\"}");
                return;
            }
            String nome = arq.getFileName().toString();
            String ext = nome.contains(".") ? nome.substring(nome.lastIndexOf('.') + 1) : "";
            ex.getResponseHeaders().set("Content-Type", TIPOS.getOrDefault(ext, "application/octet-stream"));
            ex.getResponseHeaders().set("Cache-Control", "no-cache");
            ex.getResponseHeaders().set("X-Content-Type-Options", "nosniff");
            byte[] b = Files.readAllBytes(arq);
            ex.sendResponseHeaders(200, b.length);
            ex.getResponseBody().write(b);
        }
    }

    /** Responde com JSON e sem cache. */
    static void responderJson(HttpExchange ex, int status, String json) throws IOException {
        byte[] b = json.getBytes(StandardCharsets.UTF_8);
        ex.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        ex.getResponseHeaders().set("Cache-Control", "no-store");
        ex.sendResponseHeaders(status, b.length);
        ex.getResponseBody().write(b);
    }

    // ================================================================== utilidades
    /** Muda o estado mostrado na tela e registra a mensagem no terminal. */
    static void definir(String e, String m) {
        estado = e;
        mensagem = m;
        log(m);
    }

    /** Na primeira instalação muda o estado (tela de espera); nas atualizações só informa. */
    static void definirSe(boolean mudarEstado, String e, String m) {
        if (mudarEstado) definir(e, m);
        else { mensagem = m; log(m); }
    }

    /** Texto como string JSON (com aspas e escapes); null vira null. */
    static String q(String s) {
        if (s == null) return "null";
        StringBuilder b = new StringBuilder("\"");
        for (char c : s.toCharArray()) {
            switch (c) {
                case '"' -> b.append("\\\"");
                case '\\' -> b.append("\\\\");
                case '\n' -> b.append("\\n");
                case '\r' -> b.append("\\r");
                case '\t' -> b.append("\\t");
                default -> { if (c < 0x20) b.append(String.format("\\u%04x", (int) c)); else b.append(c); }
            }
        }
        return b.append('"').toString();
    }

    /** Últimas n linhas de um log (tenta UTF-8 e, se falhar, ISO-8859-1, comum no Maven do Windows). */
    static String ultimasLinhas(Path p, int n) {
        try {
            List<String> l = Files.readAllLines(p, StandardCharsets.UTF_8);
            return String.join("\n", l.subList(Math.max(0, l.size() - n), l.size()));
        } catch (IOException e) {
            try {
                List<String> l = Files.readAllLines(p, StandardCharsets.ISO_8859_1);
                return String.join("\n", l.subList(Math.max(0, l.size() - n), l.size()));
            } catch (IOException e2) {
                return "(não foi possível ler o log: " + e2.getMessage() + ")";
            }
        }
    }

    /** Mensagem curta e compreensível para uma exceção (sem rede, tempo esgotado ou a própria mensagem). */
    static String descrever(Throwable e) {
        if (e instanceof ConnectException || e instanceof UnknownHostException || e instanceof HttpConnectTimeoutException
                || (e.getCause() != null && (e.getCause() instanceof ConnectException || e.getCause() instanceof UnknownHostException))) {
            return "sem conexão com o GitHub (verifique a internet ou o proxy)";
        }
        if (e instanceof HttpTimeoutException) return "o GitHub demorou demais para responder";
        return e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
    }

    /** Data e hora atuais no formato brasileiro. */
    static String agora() {
        return LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
    }

    /** Mensagem no terminal, com horário. */
    static void log(String m) {
        System.out.println("[" + LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss")) + "] " + m);
    }

    /** Variável de ambiente, ou o padrão se não existir ou estiver vazia. */
    static String env(String k, String padrao) {
        String v = System.getenv(k);
        return v == null || v.isBlank() ? padrao : v;
    }

    /** Abre o painel no navegador padrão (Desktop do Java; se não houver, rundll32 no Windows ou xdg-open no Linux). */
    static void abrirNoNavegador(String url) {
        new Thread(() -> {
            try {
                Thread.sleep(800);
                if (Desktop.isDesktopSupported() && Desktop.getDesktop().isSupported(Desktop.Action.BROWSE)) {
                    Desktop.getDesktop().browse(URI.create(url));
                    return;
                }
            } catch (Throwable ignored) {
            }
            try {
                if (windows()) new ProcessBuilder("rundll32", "url.dll,FileProtocolHandler", url).start();
                else new ProcessBuilder("xdg-open", url).redirectErrorStream(true)
                        .redirectOutput(ProcessBuilder.Redirect.DISCARD).start();
            } catch (Throwable e) {
                log("Abra no navegador: " + url);
            }
        }, "navegador").start();
    }
}
