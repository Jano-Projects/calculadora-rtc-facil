#!/usr/bin/env bash
# Teste de fumaça: sobe o motor simulado + o painel e faz chamadas reais pelo proxy.
# Uso: bash dev/teste_fumaca.sh /caminho/banco-dev.db
# Requer: JDK 25 (CALC_RTC_JAVA_HOME ou dados/jdk), python3, curl.
set -euo pipefail
# grep -c (e não -q) lê a resposta inteira: com -q o grep sai no primeiro achado, o curl recebe SIGPIPE e, com
# pipefail, a linha falharia mesmo com o texto presente
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB="${1:?informe o banco gerado por dev/gerar_banco_dev.sh}"
PORTA_MOTOR=18181
PORTA=18190
LOGS="$(mktemp -d)"

python3 "$DIR/dev/gerar_relacao_dev.py" "$DB" "$LOGS/relacao.json" >/dev/null
export CALC_RTC_RELACAO="$LOGS/relacao.json"
python3 "$DIR/dev/motor_simulado.py" --db "$DB" --porta $PORTA_MOTOR >"$LOGS/motor.log" 2>&1 &
PID_MOTOR=$!
bash "$DIR/iniciar.sh" --sem-navegador --porta $PORTA --api-externa "http://127.0.0.1:$PORTA_MOTOR" >"$LOGS/painel.log" 2>&1 &
PID_PAINEL=$!
trap 'kill $PID_MOTOR $PID_PAINEL 2>/dev/null || true' EXIT

falhar() { echo "FALHOU: $*"; echo "--- painel"; cat "$LOGS/painel.log"; echo "--- motor"; cat "$LOGS/motor.log"; exit 1; }
for _ in $(seq 1 60); do curl -fs "http://127.0.0.1:$PORTA/painel/status" >/dev/null 2>&1 && break; sleep 1; done

URL="http://127.0.0.1:$PORTA"
curl -fs "$URL/painel/status" | grep -c '"pronto":true' >/dev/null || falhar "painel não ficou pronto"
curl -fs "$URL/" | grep -c "Calculadora RTC" >/dev/null || falhar "front-end não foi servido"
curl -fs "$URL/app.js" >/dev/null || falhar "app.js não foi servido"
for c in "/../app/CalculadoraRTC.java" "/%2e%2e/app/CalculadoraRTC.java" "/..%2fapp/CalculadoraRTC.java"; do
    curl -fs --path-as-is "$URL$c" >/dev/null 2>&1 && falhar "path traversal permitido: $c"
done
curl -fs "$URL/api/calculadora/dados-abertos/ufs" | grep -c '"SP"' >/dev/null || falhar "proxy /api não repassou GET"
curl -fs "$URL/painel/ncm-classificacoes" | grep -c '"200003"' >/dev/null || falhar "relação NCM × classificação indisponível"

RESP=$(curl -fs -X POST -H 'Content-Type: application/json' "$URL/api/calculadora/observabilidade/regime-geral" -d '{
  "id":"fumaca","versao":"1.0.0","dhFatoGerador":"2026-11-23T12:00:00-03:00","municipio":3533403,"uf":"SP",
  "itens":[{"numero":1,"ncm":"10063021","cst":"200","cClassTrib":"200003","baseCalculo":100,"quantidade":1,"unidade":"KG"},
           {"numero":2,"ncm":"18063210","cst":"000","cClassTrib":"000001","baseCalculo":100,"quantidade":1,"unidade":"KG"}]}')
echo "$RESP" | grep -c '"objetos"' >/dev/null || falhar "proxy /api não repassou POST"
echo "$RESP" | python3 -c '
import json, sys
d = json.load(sys.stdin)
o = {x["nObj"]: x for x in d["objetos"]}
cbs = lambda n: float(o[n]["tribCalc"]["IBSCBS"]["gIBSCBS"]["gCBS"]["vCBS"])
assert cbs(1) == 0.0, "cesta básica deveria ter CBS zero"
assert cbs(2) == 0.9, "item integral em 2026 deveria ter CBS de 0,9%%"
' || falhar "valores inesperados"
# proxy do motor do Simples Nacional: /api-simples/** → /api/** (aqui, o mesmo motor simulado)
curl -fs "$URL/api-simples/calculadora/simples-nacional/atividades?data=2027-01-01" | grep -c '"07"' >/dev/null || falhar "proxy /api-simples não repassou GET"
curl -fs -X POST -H 'Content-Type: application/json' "$URL/api-simples/calculadora/observabilidade/simples-nacional/nao-assistido" -d '{
  "id":"fumaca-sn","versao":"3.0.0","data":"2027-03-01","tpDoc":"91","opSimpNac":"3","regApIBSCBSSN":"1","regApTribSN":"1",
  "aliquotasEfetivas":{"fatorR":false,"impedimentoSublimite":false,"anexoIII":{"pCBSSN":"0.9258","pIBSSN":"0.0102"}},
  "itens":[{"numero":1,"cAtivSN":"07","cClassTrib":"000001","nbs":"115013000","baseCalculo":"10027.50","tribISSQN":"1","tpRetISSQN":"1"}]}' \
  | grep -c '"vCBSSN": 93.26' >/dev/null || falhar "cálculo do Simples pelo proxy /api-simples"
echo "Teste de fumaça OK"

# Com TESTE_TELA=1, também usa a tela num navegador sem janela (requer o Playwright para Python)
if [[ "${TESTE_TELA:-0}" == "1" ]]; then
    python3 "$DIR/dev/teste_tela.py" "$URL" || falhar "teste de tela"
fi
