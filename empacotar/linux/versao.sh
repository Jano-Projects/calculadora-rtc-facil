#!/bin/sh
# Versão desta ferramenta, lida do único lugar onde ela é definida: VERSAO_PAINEL em app/CalculadoraRTC.java
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
sed -n 's/.*VERSAO_PAINEL = "\([^"]*\)".*/\1/p' "$RAIZ/app/CalculadoraRTC.java"
