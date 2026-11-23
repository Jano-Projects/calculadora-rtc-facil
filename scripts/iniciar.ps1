# =============================================================================
#  Calculadora RTC Facil - inicializacao no Windows 10/11
#  Normalmente executado pelo iniciar.bat (duplo clique).
#
#  Opcoes extras:
#    --criar-atalho  cria um atalho "Calculadora RTC" na Area de Trabalho
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
$Dados = Join-Path $Dir 'dados'
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

if ($env:CALC_RTC_JAVA_HOME) {
    $Jdk = $env:CALC_RTC_JAVA_HOME
    if (-not (Test-Jdk $Jdk)) { Falha "CALC_RTC_JAVA_HOME=$Jdk nao e um JDK $VersaoJava ou mais novo." }
}
elseif (-not (Test-Jdk $Jdk)) {
    $arq = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { 'aarch64' } else { 'x64' }
    Info "Baixando o Java $VersaoJava (Eclipse Temurin, ~200 MB). Isso so acontece na primeira vez..."
    New-Item -ItemType Directory -Force -Path $Dados | Out-Null
    $zip = Join-Path $Dados 'jdk-download.zip'
    $tmp = Join-Path $Dados 'jdk-tmp'
    $url = "https://api.adoptium.net/v3/binary/latest/$VersaoJava/ga/windows/$arq/jdk/hotspot/normal/eclipse"
    try {
        Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
    } catch {
        Falha "Nao consegui baixar o Java. Verifique a internet/proxy. Detalhe: $($_.Exception.Message)"
    }
    if (Test-Path $tmp) { Remove-Item -Recurse -Force $tmp }
    if (Test-Path $Jdk) { Remove-Item -Recurse -Force $Jdk }
    Expand-Archive -Path $zip -DestinationPath $tmp -Force
    $interno = Get-ChildItem -Path $tmp -Directory | Select-Object -First 1
    Move-Item -Path $interno.FullName -Destination $Jdk
    Remove-Item -Recurse -Force $tmp
    Remove-Item -Force $zip
    if (-not (Test-Jdk $Jdk)) { Falha "O Java baixado nao funcionou. Apague a pasta '$Jdk' e tente de novo." }
    Info "Java instalado em $Jdk"
}

# ---------------------------------------------------------------- inicia o gerenciador
$java = Join-Path $Jdk 'bin\java.exe'
$app = Join-Path $Dir 'app\CalculadoraRTC.java'
$argumentos = @('--enable-native-access=ALL-UNNAMED', '-Dfile.encoding=UTF-8', '-Dstdout.encoding=UTF-8', $app, '--base', $Dir)
if ($Resto.Count -gt 0) { $argumentos += $Resto }
& $java @argumentos
# 130 / -1073741510 = encerrada com Ctrl+C (normal)
if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne 130 -and $LASTEXITCODE -ne -1073741510) {
    Falha "A calculadora encerrou com erro (codigo $LASTEXITCODE). Veja as mensagens acima."
}
exit $LASTEXITCODE
