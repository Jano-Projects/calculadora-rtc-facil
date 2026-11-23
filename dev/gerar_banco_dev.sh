#!/usr/bin/env bash
# Gera um banco SQLite de DESENVOLVIMENTO a partir dos scripts SQL oficiais,
# sem Maven/Flyway. Serve só para o motor simulado (dev/motor_simulado.py).
# Uso: bash dev/gerar_banco_dev.sh /tmp/calc-dev.db [tag]
set -euo pipefail
DESTINO="${1:?informe o arquivo de saída, ex.: /tmp/calc-dev.db}"
TAG="${2:-}"
command -v sqlite3 >/dev/null || { echo "instale o sqlite3" >&2; exit 1; }
TMP="$(mktemp -d)"
trap 'rm -rf -- "$TMP"' EXIT
git clone -q --depth 1 ${TAG:+--branch "$TAG"} https://github.com/ReceitaFederal/calculadora-rtc-regime-regular.git "$TMP/repo"
SQL="$TMP/repo/flyway/sql"
{
    cat "$SQL/criacao/beforeMigrate.sql"; echo ";"
    cat "$SQL/criacao/B0001__sistema_tributario_completo.sql"; echo ";"
    while IFS= read -r f; do cat "$f"; echo ";"; done < <(find "$SQL/manutencao" -name "V*.sql" | sort -V)
    cat "$SQL/criacao/afterMigrate.sql"; echo ";"
} > "$TMP/tudo.sql"
rm -f -- "$DESTINO"
# Alguns comandos dependem do Flyway e falham no sqlite3 puro; para o simulador isso não importa.
sqlite3 "$DESTINO" < "$TMP/tudo.sql" >/dev/null 2>"$TMP/erros.txt" || true
echo "Banco gerado em $DESTINO ($(wc -l < "$TMP/erros.txt") avisos ignorados)."
