#!/usr/bin/env bash
# =============================================================================
#  Calculadora RTC Fácil - inicialização no Linux (Fedora, Debian, Ubuntu...)
#
#  Uso:  ./iniciar.sh                 abre a calculadora no navegador
#        ./iniciar.sh --criar-atalho  cria um atalho no menu de aplicativos
#        ./iniciar.sh --ajuda         mostra todas as opções
#
#  Não precisa de sudo: o Java 25 é baixado para dentro da pasta "dados/".
# =============================================================================
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DADOS="$DIR/dados"
JDK="$DADOS/jdk"
VERSAO_JAVA=25

info() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
erro() { printf '\033[1;31m[ERRO]\033[0m %s\n' "$*" >&2; exit 1; }

# ---------------------------------------------------------------- atalho no menu
if [[ "${1:-}" == "--criar-atalho" ]]; then
    destino="$HOME/.local/share/applications"
    mkdir -p "$destino"
    cat > "$destino/calculadora-rtc-facil.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Calculadora RTC
Comment=Calculadora de CBS, IBS e Imposto Seletivo (Reforma Tributária)
Exec=bash "$DIR/iniciar.sh"
Icon=$DIR/web/icone.svg
Terminal=true
Categories=Office;Finance;
EOF
    chmod +x "$destino/calculadora-rtc-facil.desktop"
    info "Atalho criado. Procure por \"Calculadora RTC\" no menu de aplicativos."
    exit 0
fi

# ---------------------------------------------------------------- Java 25 portátil
java_ok() {
    [[ -x "$1/bin/java" && -x "$1/bin/javac" ]] || return 1
    local v
    v=$("$1/bin/java" -XshowSettings:properties -version 2>&1 | sed -n 's/^ *java\.specification\.version = //p')
    [[ "${v%%.*}" -ge $VERSAO_JAVA ]] 2>/dev/null
}

baixar() { # url destino
    if command -v curl >/dev/null 2>&1; then
        curl -fL --retry 3 --progress-bar -o "$2" "$1"
    elif command -v wget >/dev/null 2>&1; then
        wget -q --show-progress -O "$2" "$1"
    else
        erro "Preciso do 'curl' ou do 'wget' para baixar o Java. Instale um deles (ex.: sudo apt install curl)."
    fi
}

if [[ -n "${CALC_RTC_JAVA_HOME:-}" ]]; then
    JDK="$CALC_RTC_JAVA_HOME"
    java_ok "$JDK" || erro "CALC_RTC_JAVA_HOME=$JDK não é um JDK $VERSAO_JAVA ou mais novo."
elif ! java_ok "$JDK"; then
    case "$(uname -m)" in
        x86_64|amd64)   ARQ=x64 ;;
        aarch64|arm64)  ARQ=aarch64 ;;
        *) erro "Arquitetura $(uname -m) não suportada." ;;
    esac
    command -v tar >/dev/null 2>&1 || erro "O comando 'tar' não foi encontrado."
    info "Baixando o Java $VERSAO_JAVA (Eclipse Temurin, ~200 MB). Isso só acontece na primeira vez..."
    mkdir -p "$DADOS"
    TMP="$DADOS/jdk-download.tar.gz"
    baixar "https://api.adoptium.net/v3/binary/latest/$VERSAO_JAVA/ga/linux/$ARQ/jdk/hotspot/normal/eclipse" "$TMP"
    rm -rf "$JDK" "$JDK.tmp"
    mkdir -p "$JDK.tmp"
    tar -xzf "$TMP" -C "$JDK.tmp" --strip-components=1
    mv "$JDK.tmp" "$JDK"
    rm -f "$TMP"
    java_ok "$JDK" || erro "O Java baixado não funcionou. Apague a pasta '$JDK' e tente de novo."
    info "Java instalado em $JDK"
fi

# ---------------------------------------------------------------- inicia o gerenciador
exec "$JDK/bin/java" -Xshare:auto --enable-native-access=ALL-UNNAMED -Dfile.encoding=UTF-8 -Dstdout.encoding=UTF-8 -Dstderr.encoding=UTF-8 "$DIR/app/CalculadoraRTC.java" --base "$DIR" "$@"
