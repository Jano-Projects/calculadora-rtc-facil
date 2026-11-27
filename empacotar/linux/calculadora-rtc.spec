# Calculadora RTC Fácil — receita do pacote .rpm (Fedora, openSUSE, RHEL...). Use montar-rpm.sh.
Name:           calculadora-rtc
Version:        %{versao}
Release:        1%{?dist}
Summary:        CBS, IBS e Imposto Seletivo pela calculadora oficial da Receita Federal
License:        MIT
URL:            https://github.com/Jano-Projects/calculadora-rtc-facil
BuildArch:      noarch
Requires:       bash, tar, gzip, (curl or wget)
Recommends:     zenity, libnotify, xdg-utils

%description
Tela simples para a calculadora oficial da Reforma Tributaria do Consumo
(LC 214/2025), da Receita Federal. Na primeira abertura baixa o Java e a
calculadora oficial para a pasta do usuario; depois se atualiza sozinha.
Os calculos rodam no proprio computador.

%install
sh %{raiz}/empacotar/linux/preparar-arvore.sh %{buildroot}

%files
/usr/bin/calculadora-rtc
/usr/share/calculadora-rtc
/usr/share/applications/calculadora-rtc.desktop
/usr/share/icons/hicolor/*/apps/calculadora-rtc.*
%doc /usr/share/doc/calculadora-rtc
