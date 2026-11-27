#!/bin/sh
# ==========================================================================
#  Calculadora RTC Fácil — gera o pacote .rpm (Fedora...)
#     -> saida/calculadora-rtc-<versão>-1.noarch.rpm
#  Instalar:  sudo dnf install ./calculadora-rtc-<versão>-1.noarch.rpm   (ou dois cliques)
#  Precisa de: rpmbuild  (Fedora: sudo dnf install rpm-build | Debian/Ubuntu: sudo apt install rpm)
# ==========================================================================
set -e
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
VERSAO="$(sh "$RAIZ/empacotar/linux/versao.sh")"
TOP="$RAIZ/build/rpm"; rm -rf "$TOP"; mkdir -p "$TOP" "$RAIZ/saida"
rpmbuild -bb --quiet --define "_topdir $TOP" --define "versao $VERSAO" --define "raiz $RAIZ" \
  --define "dist %{nil}" --define "_binary_payload w9.xzdio" "$RAIZ/empacotar/linux/calculadora-rtc.spec"
cp "$TOP"/RPMS/noarch/calculadora-rtc-*.rpm "$RAIZ/saida/"
echo "pronto: saida/$(basename "$TOP"/RPMS/noarch/calculadora-rtc-*.rpm)"
