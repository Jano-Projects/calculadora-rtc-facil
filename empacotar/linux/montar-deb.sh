#!/bin/sh
# ==========================================================================
#  Calculadora RTC Fácil — gera o pacote .deb (Debian, Ubuntu, Mint...)
#     -> saida/calculadora-rtc_<versão>_all.deb
#  Instalar:  sudo apt install ./calculadora-rtc_<versão>_all.deb   (ou dois cliques no arquivo)
#  Precisa de: dpkg-deb (já vem no Debian/Ubuntu)
# ==========================================================================
set -e
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
VERSAO="$(sh "$RAIZ/empacotar/linux/versao.sh")"
MANTENEDOR="${CALC_RTC_MANTENEDOR:-Jano-Projects <354442016+Jano-Projects@users.noreply.github.com>}"
TMP="$RAIZ/build/deb/calculadora-rtc_${VERSAO}_all"
rm -rf "$TMP"; mkdir -p "$TMP/DEBIAN" "$RAIZ/saida"
sh "$RAIZ/empacotar/linux/preparar-arvore.sh" "$TMP"

TAMANHO=$(du -sk "$TMP/usr" | cut -f1)
cat > "$TMP/DEBIAN/control" <<CTRL
Package: calculadora-rtc
Version: $VERSAO
Architecture: all
Section: utils
Priority: optional
Installed-Size: $TAMANHO
Depends: bash, tar, gzip, curl | wget
Recommends: zenity | kdialog, libnotify-bin, xdg-utils
Maintainer: $MANTENEDOR
Homepage: https://github.com/Jano-Projects/calculadora-rtc-facil
Description: Calculadora RTC Facil - CBS, IBS e Imposto Seletivo
 Tela simples para a calculadora oficial da Reforma Tributaria do Consumo
 (LC 214/2025), da Receita Federal. Na primeira abertura baixa o Java e a
 calculadora oficial para a pasta do usuario; depois se atualiza sozinha.
 Os calculos rodam no proprio computador.
CTRL
for s in postinst postrm; do
  printf '#!/bin/sh\nset -e\ncommand -v update-desktop-database >/dev/null 2>&1 && update-desktop-database -q /usr/share/applications || true\ncommand -v gtk-update-icon-cache >/dev/null 2>&1 && gtk-update-icon-cache -q -t /usr/share/icons/hicolor || true\n' > "$TMP/DEBIAN/$s"
  chmod 755 "$TMP/DEBIAN/$s"
done
dpkg-deb --root-owner-group -Zxz --build "$TMP" "$RAIZ/saida/calculadora-rtc_${VERSAO}_all.deb"
echo "pronto: saida/calculadora-rtc_${VERSAO}_all.deb"
