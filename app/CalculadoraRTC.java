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
    static final String VERSAO_PAINEL = "1.0.0";

    static Path base, dados, dirWeb, dirMotores, dirFontes, dirLogs;
    static String repo = env("CALC_RTC_REPO", REPO_PADRAO);
    static int portaWeb = Integer.parseInt(env("CALC_RTC_PORTA", "8090"));
    static long horasEntreVerificacoes = Long.parseLong(env("CALC_RTC_HORAS_VERIFICACAO", "6"));
    static boolean abrirNavegador = true, rede = false, semAtualizacao = false, instalarESair = false;
    static String apiExterna = null; // modo desenvolvimento: não gerencia o motor
    static String versaoFixa = env("CALC_RTC_VERSAO", null);

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
    public static void main(String[] args) throws Exception {
        lerArgumentos(args);
        dados = base.resolve("dados");
        dirWeb = base.resolve("web");
        dirMotores = dados.resolve("motor");
        dirFontes = dados.resolve("fontes");
        dirLogs = dados.resolve("logs");
        for (Path p : List.of(dados, dirMotores, dirFontes, dirLogs)) Files.createDirectories(p);

        log("Calculadora RTC Fácil " + VERSAO_PAINEL + " | Java " + Runtime.version());
        log("Pasta: " + base);

        Runtime.getRuntime().addShutdownHook(new Thread(() -> pararMotor(motor), "desligamento"));

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
        log("Deixe esta janela aberta enquanto usa a calculadora. Para encerrar: Ctrl+C (ou feche a janela).");
        Thread.currentThread().join();
    }

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
                case "--ajuda", "-h", "--help" -> { ajuda(); System.exit(0); }
                default -> { System.err.println("Opção desconhecida: " + args[i]); ajuda(); System.exit(2); }
            }
        }
        base = Paths.get(b != null ? b : ".").toAbsolutePath().normalize();
    }

    static void ajuda() {
        System.out.println("""
            Uso: iniciar.sh | iniciar.bat [opções]

              --porta N            porta do painel (padrão 8090)
              --rede               aceita acessos de outros computadores da rede
              --sem-navegador      não abre o navegador automaticamente
              --sem-atualizacao    não procura versões novas (usa a instalada)
              --versao X           usa uma versão específica da calculadora oficial (ex.: 1.7.2)
              --instalar-e-sair    só instala/atualiza o motor, testa e encerra (útil para CI)
              --api-externa URL    não gerencia o motor; usa um já em execução (desenvolvimento)
            """);
    }

    // ================================================================== ciclo do motor
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

    static int compararVersoes(String a, String b) {
        int[] x = numeros(a), y = numeros(b);
        for (int i = 0; i < Math.max(x.length, y.length); i++) {
            int c = Integer.compare(i < x.length ? x[i] : 0, i < y.length ? y[i] : 0);
            if (c != 0) return c;
        }
        return a.compareTo(b);
    }

    static int[] numeros(String v) {
        return Arrays.stream(v.replaceFirst("^v", "").split("\\D+")).filter(s -> !s.isEmpty())
                .mapToInt(s -> (int) Math.min(Integer.MAX_VALUE, Long.parseLong(s))).toArray();
    }

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
        int porta = portaLivre();
        Path dir = dirMotores.resolve(versao);
        Path log = dirLogs.resolve("motor.log");
        ultimoLog.set(log);
        List<String> cmd = List.of(javaExe(), "-Xms128m", "-Dspring.profiles.active=offline",
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
                ? ",\"aliquotasNominais\":{\"cbs\":8.8,\"ibsEstadual\":0.05,\"ibsMunicipal\":0.05}" : "";
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
    static void executar(Path dir, Path log, List<String> argsMaven) throws Exception {
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
        pb.environment().put("JAVA_HOME", javaHome);
        pb.environment().put("PATH", Paths.get(javaHome, "bin") + File.pathSeparator + pb.environment().getOrDefault("PATH", ""));
        Files.writeString(log, "\n$ " + String.join(" ", cmd) + "\n", StandardOpenOption.APPEND);
        Process p = pb.start();
        if (!p.waitFor(60, TimeUnit.MINUTES)) {
            p.destroyForcibly();
            throw new IOException("o Maven demorou demais (veja " + log + ")");
        }
        if (p.exitValue() != 0) {
            throw new IOException("falha ao executar 'mvnw " + String.join(" ", argsMaven.subList(0, 1))
                    + "' (código " + p.exitValue() + "). Detalhes em " + log);
        }
    }

    static void baixar(String url, Path destino) throws IOException, InterruptedException {
        log("Baixando " + url);
        HttpResponse<Path> r = http.send(HttpRequest.newBuilder(URI.create(url))
                .header("User-Agent", "calculadora-rtc-facil").timeout(Duration.ofMinutes(10)).build(),
                HttpResponse.BodyHandlers.ofFile(destino));
        if (r.statusCode() != 200) {
            Files.deleteIfExists(destino);
            throw new IOException("download falhou (HTTP " + r.statusCode() + "): " + url);
        }
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

    static void apagar(Path p) throws IOException {
        if (!Files.exists(p)) return;
        try (Stream<Path> s = Files.walk(p)) {
            for (Path x : s.sorted(Comparator.reverseOrder()).toList()) {
                x.toFile().setWritable(true);
                Files.deleteIfExists(x);
            }
        }
    }

    static long tamanho(Path p) {
        try {
            return Files.size(p);
        } catch (IOException e) {
            return -1;
        }
    }

    static String lerTexto(Path p) {
        try {
            String s = Files.readString(p).trim();
            return s.isEmpty() ? null : s;
        } catch (IOException e) {
            return null;
        }
    }

    static int portaLivre() throws IOException {
        try (ServerSocket s = new ServerSocket(0, 0, InetAddress.getLoopbackAddress())) {
            return s.getLocalPort();
        }
    }

    static String javaExe() {
        return Paths.get(System.getProperty("java.home"), "bin", windows() ? "java.exe" : "java").toString();
    }

    static boolean windows() {
        return System.getProperty("os.name").toLowerCase().contains("win");
    }

    // ================================================================== servidor web + proxy
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

    static void tratarPainel(HttpExchange ex) throws IOException {
        try (ex) {
            String caminho = ex.getRequestURI().getPath();
            switch (caminho) {
                case "/painel/status" -> responderJson(ex, 200, statusJson());
                case "/painel/atualizar" -> {
                    if (!"POST".equals(ex.getRequestMethod())) { responderJson(ex, 405, "{\"erro\":\"use POST\"}"); return; }
                    if (apiExterna != null) { responderJson(ex, 409, "{\"erro\":\"modo motor externo\"}"); return; }
                    Process m = motor;
                    boolean parado = m == null || !m.isAlive();
                    if (!parado && (semAtualizacao || versaoFixa != null)) { responderJson(ex, 409, "{\"erro\":\"atualização automática desativada\"}"); return; }
                    if (!atualizando) agendador.execute(parado ? CalculadoraRTC::prepararNaInicializacao : () -> verificarEAtualizar(false));
                    responderJson(ex, 202, statusJson());
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
                + q("versaoPainel") + ":" + q(VERSAO_PAINEL)
                + "}";
    }

    static final Set<String> CABECALHOS_PROIBIDOS = Set.of("connection", "content-length", "host", "upgrade",
            "expect", "keep-alive", "transfer-encoding", "te", "trailer", "proxy-connection", "http2-settings");

    static void tratarProxy(HttpExchange ex) throws IOException {
        try (ex) {
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

    static final Map<String, String> TIPOS = Map.ofEntries(
            Map.entry("html", "text/html; charset=utf-8"), Map.entry("js", "text/javascript; charset=utf-8"),
            Map.entry("css", "text/css; charset=utf-8"), Map.entry("json", "application/json; charset=utf-8"),
            Map.entry("svg", "image/svg+xml"), Map.entry("png", "image/png"), Map.entry("ico", "image/x-icon"),
            Map.entry("md", "text/markdown; charset=utf-8"), Map.entry("txt", "text/plain; charset=utf-8"));

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

    static void responderJson(HttpExchange ex, int status, String json) throws IOException {
        byte[] b = json.getBytes(StandardCharsets.UTF_8);
        ex.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        ex.getResponseHeaders().set("Cache-Control", "no-store");
        ex.sendResponseHeaders(status, b.length);
        ex.getResponseBody().write(b);
    }

    // ================================================================== utilidades
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

    static String descrever(Throwable e) {
        if (e instanceof ConnectException || e instanceof UnknownHostException || e instanceof HttpConnectTimeoutException
                || (e.getCause() != null && (e.getCause() instanceof ConnectException || e.getCause() instanceof UnknownHostException))) {
            return "sem conexão com o GitHub (verifique a internet ou o proxy)";
        }
        if (e instanceof HttpTimeoutException) return "o GitHub demorou demais para responder";
        return e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
    }

    static String agora() {
        return LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
    }

    static void log(String m) {
        System.out.println("[" + LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss")) + "] " + m);
    }

    static String env(String k, String padrao) {
        String v = System.getenv(k);
        return v == null || v.isBlank() ? padrao : v;
    }

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
