#!/bin/sh
# ==========================================================================
#  Calculadora RTC Fácil — monta a árvore de arquivos instalada no Linux (usada pelo .deb e pelo .rpm)
#    /usr/bin/calculadora-rtc                       lançador (o ícone; sem terminal)
#    /usr/share/calculadora-rtc/                    app/, web/ e iniciar.sh (o mesmo da versão portátil)
#    /usr/share/applications/calculadora-rtc.desktop   o ícone no menu de aplicativos
#    /usr/share/icons/hicolor/*/apps/               o ícone em vários tamanhos
#  O Java, o motor oficial e os logs NÃO vão no pacote: são baixados na primeira abertura,
#  na pasta de cada usuário (~/.local/share/calculadora-rtc).
#  Uso: preparar-arvore.sh <pasta-destino>
# ==========================================================================
set -e
DEST="$1"; [ -n "$DEST" ] || { echo "uso: $0 <pasta-destino>"; exit 1; }
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
APP="$DEST/usr/share/calculadora-rtc"

install -d "$DEST/usr/bin" "$APP/app" "$APP/web/exemplos" "$DEST/usr/share/applications" "$DEST/usr/share/doc/calculadora-rtc"
install -m 755 "$RAIZ/empacotar/linux/calculadora-rtc" "$DEST/usr/bin/calculadora-rtc"
install -m 755 "$RAIZ/iniciar.sh" "$APP/iniciar.sh"
install -m 644 "$RAIZ/app/CalculadoraRTC.java" "$APP/app/CalculadoraRTC.java"
for f in "$RAIZ"/web/*; do [ -f "$f" ] && install -m 644 "$f" "$APP/web/"; done
install -m 644 "$RAIZ"/web/exemplos/* "$APP/web/exemplos/"
install -m 644 "$RAIZ/empacotar/linux/calculadora-rtc.desktop" "$DEST/usr/share/applications/calculadora-rtc.desktop"
for n in 16 24 32 48 64 128 256 512; do
  install -d "$DEST/usr/share/icons/hicolor/${n}x${n}/apps"
  install -m 644 "$RAIZ/empacotar/icone/png/calculadora-rtc-$n.png" "$DEST/usr/share/icons/hicolor/${n}x${n}/apps/calculadora-rtc.png"
done
install -d "$DEST/usr/share/icons/hicolor/scalable/apps"
install -m 644 "$RAIZ/empacotar/icone/calculadora-rtc.svg" "$DEST/usr/share/icons/hicolor/scalable/apps/calculadora-rtc.svg"
install -m 644 "$RAIZ/LICENSE" "$DEST/usr/share/doc/calculadora-rtc/copyright"
install -m 644 "$RAIZ/README.md" "$RAIZ/CHANGELOG.md" "$DEST/usr/share/doc/calculadora-rtc/"
