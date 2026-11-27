# =============================================================================
#  Calculadora RTC Facil - inicializacao no Windows 10/11
#  Normalmente executado pelo iniciar.bat (duplo clique).
#
#  Opcoes extras:
#    --criar-atalho  cria um atalho "Calculadora RTC" na Area de Trabalho
#    --so-java       so baixa ou atualiza o Java portatil e encerra (usado pelo instalador)
#    Demais opcoes sao repassadas ao gerenciador (ex.: --porta 9000, --rede)
#
#  Nao precisa de administrador: o Java 25 e baixado para a pasta "dados\".
# =============================================================================
# Sem bloco param(): assim opcoes como --porta chegam intactas em $args
$Resto = @($args | ForEach-Object { [string]$_ })
$CriarAtalho = $Resto -contains '--criar-atalho' -or $Resto -contains '-CriarAtalho'

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'   # deixa o download muito mais rapido
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

$Dir = Split-Path -Parent $PSScriptRoot
# Versao instalada: o lancador (CalculadoraRTC.exe) define CALC_RTC_DADOS para %LOCALAPPDATA%\CalculadoraRTC
$Dados = if ($env:CALC_RTC_DADOS) { $env:CALC_RTC_DADOS } else { Join-Path $Dir 'dados' }
$Jdk = Join-Path $Dados 'jdk'
$VersaoJava = 25

function Info($m) { Write-Host "==> $m" -ForegroundColor Cyan }
function Falha($m) {
    Write-Host "[ERRO] $m" -ForegroundColor Red
    if (-not $env:CI) { Read-Host 'Pressione Enter para fechar' }   # na CI nao ha ninguem para apertar Enter
    exit 1
}

# ---------------------------------------------------------------- atalho
if ($CriarAtalho) {
    $desktop = [Environment]::GetFolderPath('Desktop')
    $ws = New-Object -ComObject WScript.Shell
    $lnk = $ws.CreateShortcut((Join-Path $desktop 'Calculadora RTC.lnk'))
    $lnk.TargetPath = Join-Path $Dir 'iniciar.bat'
    $lnk.WorkingDirectory = $Dir
    $lnk.Description = 'Calculadora de CBS, IBS e Imposto Seletivo (Reforma Tributaria)'
    $lnk.Save()
    Info 'Atalho "Calculadora RTC" criado na Area de Trabalho.'
    exit 0
}

# ---------------------------------------------------------------- Java 25 portatil
function Test-Jdk($home_) {
    $java = Join-Path $home_ 'bin\java.exe'
    $javac = Join-Path $home_ 'bin\javac.exe'
    if (-not ((Test-Path $java) -and (Test-Path $javac))) { return $false }
    # java -version escreve no stderr; no PowerShell 5.1 isso vira erro se a preferencia for 'Stop'
    $anterior = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $saida = & $java -XshowSettings:properties -version 2>&1 | Out-String
    $ErrorActionPreference = $anterior
    if ($saida -match 'java\.specification\.version = (\d+)') { return ([int]$Matches[1] -ge $VersaoJava) }
    return $false
}

# O Java portatil recebe correcoes de seguranca a cada trimestre (e fora de epoca, como a do Java4Shell em
# 17/11/2026). Por isso e baixado de novo quando a copia tem mais de $DiasJava dias ou nao tem a marca de data
# (copias de versoes anteriores desta ferramenta). Se o download falhar, a copia antiga continua em uso.
$DiasJava = 90
function Test-JdkAntigo($home_) {
    $marca = Join-Path $home_ '.baixado-em'
    if (-not (Test-Path $marca)) { return $true }
    $baixado = [DateTime]::MinValue
    if (-not [DateTime]::TryParse((Get-Content $marca -Raw).Trim(), [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::RoundtripKind, [ref]$baixado)) { return $true }
    return ((Get-Date) - $baixado).TotalDays -gt $DiasJava
}

if ($env:CALC_RTC_JAVA_HOME) {
    $Jdk = $env:CALC_RTC_JAVA_HOME
    if (-not (Test-Jdk $Jdk)) { Falha "CALC_RTC_JAVA_HOME=$Jdk nao e um JDK $VersaoJava ou mais novo." }
}
elseif (-not (Test-Jdk $Jdk) -or (Test-JdkAntigo $Jdk)) {
    $temJava = Test-Jdk $Jdk
    $arq = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { 'aarch64' } else { 'x64' }
    if ($temJava) { Info "Atualizando o Java $VersaoJava portatil (correcoes de seguranca, ~200 MB)..." }
    else { Info "Baixando o Java $VersaoJava (Eclipse Temurin, ~200 MB). Isso so acontece na primeira vez..." }
    New-Item -ItemType Directory -Force -Path $Dados | Out-Null
    $zip = Join-Path $Dados 'jdk-download.zip'
    $tmp = Join-Path $Dados 'jdk-tmp'
    $url = "https://api.adoptium.net/v3/binary/latest/$VersaoJava/ga/windows/$arq/jdk/hotspot/normal/eclipse"
    try {
        Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
        if (Test-Path $tmp) { Remove-Item -Recurse -Force $tmp }
        Expand-Archive -Path $zip -DestinationPath $tmp -Force
        $interno = Get-ChildItem -Path $tmp -Directory | Select-Object -First 1
        if (-not (Test-Jdk $interno.FullName)) { throw 'o Java baixado nao funcionou' }
        # Renomeia o Java atual antes de trocar: se ele estiver em uso por outra janela, o Windows recusa o
        # Move-Item e nada e apagado (a troca fica para a proxima vez)
        $antigo = "$Jdk-antigo"
        if (Test-Path $antigo) { Remove-Item -Recurse -Force $antigo }
        if (Test-Path $Jdk) { Move-Item -Path $Jdk -Destination $antigo }
        Move-Item -Path $interno.FullName -Destination $Jdk
        (Get-Date).ToString('o') | Set-Content -Path (Join-Path $Jdk '.baixado-em')
        if (Test-Path $antigo) { Remove-Item -Recurse -Force $antigo -ErrorAction SilentlyContinue }
        Info "Java instalado em $Jdk"
    } catch {
        if (-not (Test-Path $Jdk) -and (Test-Path "$Jdk-antigo")) { Move-Item -Path "$Jdk-antigo" -Destination $Jdk }
        if ($temJava) { Info "Nao foi possivel atualizar o Java agora; continuando com o atual. ($($_.Exception.Message))" }
        else { Falha "Nao consegui baixar o Java. Verifique a internet/proxy. Detalhe: $($_.Exception.Message)" }
    } finally {
        if (Test-Path $tmp) { Remove-Item -Recurse -Force $tmp }
        if (Test-Path $zip) { Remove-Item -Force $zip }
    }
}

if ($Resto -contains '--so-java') { Info "Java pronto em $Jdk"; exit 0 }

# ---------------------------------------------------------------- inicia o gerenciador
$java = Join-Path $Jdk 'bin\java.exe'
$app = Join-Path $Dir 'app\CalculadoraRTC.java'
# -XX:-UseBASE64Intrinsics: mitigacao do Java4Shell (CVE-2026-114938); o motor oficial tambem recebe a opcao.
$argumentos = @('-XX:-UseBASE64Intrinsics', '--enable-native-access=ALL-UNNAMED', '-Dfile.encoding=UTF-8', '-Dstdout.encoding=UTF-8', $app, '--base', $Dir)
if ($Resto.Count -gt 0) { $argumentos += $Resto }
if ($Resto -contains '--atalho') {
    # Aberto pelo icone (CalculadoraRTC.exe), sem janela: o registro vai para dados\logs\painel.log
    $logs = Join-Path $Dados 'logs'
    New-Item -ItemType Directory -Force -Path $logs | Out-Null
    $ErrorActionPreference = 'Continue'   # linhas do Java no stderr nao devem interromper o script
    try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch { Write-Verbose 'sem console' }
    "===== $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss') =====" | Out-File -FilePath (Join-Path $logs 'painel.log') -Append -Encoding utf8
    & $java @argumentos 2>&1 | ForEach-Object { "$_" } | Out-File -FilePath (Join-Path $logs 'painel.log') -Append -Encoding utf8
    exit $LASTEXITCODE
}
& $java @argumentos
# 130 / -1073741510 = encerrada com Ctrl+C (normal)
if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne 130 -and $LASTEXITCODE -ne -1073741510) {
    Falha "A calculadora encerrou com erro (codigo $LASTEXITCODE). Veja as mensagens acima."
}
exit $LASTEXITCODE
