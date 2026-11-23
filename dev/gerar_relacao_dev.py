#!/usr/bin/env python3
"""
Gera a relação NCM × classificação (o mesmo JSON que o gerenciador extrai do banco oficial
com o driver SQLite do JAR) a partir de um banco de desenvolvimento. Só para desenvolvimento.

Uso: python3 dev/gerar_relacao_dev.py /tmp/calc-dev.db /tmp/ncm-classificacoes.json
     CALC_RTC_RELACAO=/tmp/ncm-classificacoes.json bash iniciar.sh --api-externa http://127.0.0.1:18080
"""
import json
import sqlite3
import sys

db, saida = sys.argv[1], sys.argv[2]
con = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
d10 = lambda v: v[:10] if v else None
regras = [[i, ncm, cd, d10(ini), d10(fim), anx] for i, ncm, cd, ini, fim, anx in con.execute("""
    select a.NCMA_ID, a.NCMA_NCM_CD, c.CLTR_CD, a.NCMA_INICIO_VIGENCIA, a.NCMA_FIM_VIGENCIA, a.NCMA_ANXO_ID
    from NCM_APLICAVEL a join CLASSIFICACAO_TRIBUTARIA c on c.CLTR_ID = a.NCMA_CLTR_ID
    where exists (select 1 from TRIBUTO_SITUACAO_TRIBUTARIA t where t.TRST_SITR_ID = c.CLTR_SITR_ID and t.TRST_TBTO_ID = 2)
    order by a.NCMA_NCM_CD""")]
excecoes = [[i, ncm, d10(ini), d10(fim)] for i, ncm, ini, fim in con.execute(
    "select ENCM_NCMA_ID, ENCM_NCM_CD, ENCM_INICIO_VIGENCIA, ENCM_FIM_VIGENCIA from EXCECAO_NCM_APLICAVEL")]
usados = {r[5] for r in regras if r[5] is not None}
anexos = {str(i): [n, it, t] for i, n, it, t in con.execute(
    "select ANXO_ID, ANXO_NUMERO, ANXO_NUMERO_ITEM, ANXO_TEXTO_ITEM from ANEXO") if i in usados}
with open(saida, "w", encoding="utf-8") as f:
    json.dump({"regras": regras, "excecoes": excecoes, "anexos": anexos}, f, ensure_ascii=False, separators=(",", ":"))
print(f"{len(regras)} regras, {len(excecoes)} exceções, {len(anexos)} itens de anexo -> {saida}")
