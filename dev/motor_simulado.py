#!/usr/bin/env python3
"""
Motor SIMULADO para desenvolver o front-end sem compilar a calculadora oficial.

NÃO use para cálculos reais: as contas aqui são uma aproximação simplificada.
Os dados (UFs, municípios, NCMs, classificações, alíquotas de referência e reduções)
vêm de um banco SQLite gerado a partir dos scripts oficiais (pasta flyway/ do
repositório da Receita), então os códigos são reais.

Uso:
    python3 dev/motor_simulado.py --db caminho/calculadora-pro.db --porta 18080
    ./iniciar.sh --api-externa http://127.0.0.1:18080

Para gerar o banco sem Maven (só para desenvolvimento), veja dev/README.md.
"""
import argparse
import json
import re
import sqlite3
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

DB = None
D2 = Decimal("0.01")


def q(sql, *args):
    con = sqlite3.connect(f"file:{DB}?mode=ro", uri=True)
    try:
        return con.execute(sql, args).fetchall()
    finally:
        con.close()


def vigente(prefixo, data):
    return (f"{prefixo}_INICIO_VIGENCIA <= '{data}' AND "
            f"({prefixo}_FIM_VIGENCIA IS NULL OR {prefixo}_FIM_VIGENCIA >= '{data}')")


def dinheiro(v):
    return str(Decimal(v).quantize(D2, ROUND_HALF_UP))


def aliquota_ref(tributo, data):
    r = q(f"select ALRE_VALOR from ALIQUOTA_REFERENCIA where ALRE_TBTO_ID=? and {vigente('ALRE', data)}", tributo, )
    return Decimal(str(r[0][0])) if r else Decimal(0)


def classificacao(codigo, data):
    r = q(f"""select c.CLTR_ID, c.CLTR_CD, c.CLTR_DESCRICAO, s.SITR_CD from CLASSIFICACAO_TRIBUTARIA c
              join SITUACAO_TRIBUTARIA s on s.SITR_ID=c.CLTR_SITR_ID
              where c.CLTR_CD=? and {vigente('c.CLTR', data)} order by c.CLTR_ID limit 1""",
          codigo)
    return r[0] if r else None


def reducao(cltr_id, data):
    r = q(f"select PERE_VALOR from PERCENTUAL_REDUCAO where PERE_CLTR_ID=? and PERE_TBTO_ID=2 and {vigente('PERE', data)}", cltr_id)
    return Decimal(str(r[0][0])) if r else Decimal(0)


def ncm_vinculado(ncm, cltr_id, data):
    tem_lista = q("select count(*) from NCM_APLICAVEL where NCMA_CLTR_ID=?", cltr_id)[0][0]
    if not tem_lista:
        return True
    r = q(f"select count(*) from NCM_APLICAVEL where NCMA_CLTR_ID=? and ? like NCMA_NCM_CD || '%' and {vigente('NCMA', data)}",
          cltr_id, ncm)
    return r[0][0] > 0


def ncm_is(ncm, data):
    r = q(f"""select count(*) from NCM_APLICAVEL a join CLASSIFICACAO_TRIBUTARIA c on c.CLTR_ID=a.NCMA_CLTR_ID
              join SITUACAO_TRIBUTARIA s on s.SITR_ID=c.CLTR_SITR_ID
              where s.SITR_DESCRICAO like '%Imposto Seletivo%' and c.CLTR_CD='000001'
              and ? like a.NCMA_NCM_CD || '%' and {vigente('a.NCMA', data)}""", ncm)
    return r[0][0] > 0


def erro_item(n, code, title, detail, pointer):
    return {"nObj": n, "estadoItem": "INCONSISTENCIA_ENTRADA",
            "erros": [{"code": code, "title": title, "detail": detail, "pointer": pointer}]}


def calcular(op):
    data = op["dhFatoGerador"][:10]
    ano = int(data[:4])
    objetos, tot = [], {"vBC": Decimal(0), "cbs": Decimal(0), "ibs": Decimal(0), "is": Decimal(0)}
    for idx, it in enumerate(op.get("itens", [])):
        n = it["numero"]
        an = it.get("aliquotasNominais")
        if ano < 2027 and an:
            objetos.append(erro_item(n, "REG-020", "Alíquotas nominais indevidas",
                                     "Alíquotas nominais não podem ser informadas antes de 2027", f"#/itens/{idx}/aliquotasNominais"))
            continue
        if ano >= 2027 and not an:
            objetos.append(erro_item(n, "REG-021", "Alíquotas nominais não informadas",
                                     "Alíquotas nominais são obrigatórias a partir de 2027", f"#/itens/{idx}/aliquotasNominais"))
            continue
        cl = classificacao(it["cClassTrib"], data)
        if not cl:
            objetos.append(erro_item(n, "REG-010", "Classificação inexistente",
                                     f"Classificação Tributária {it['cClassTrib']} não vigente", f"#/itens/{idx}/cClassTrib"))
            continue
        cltr_id = cl[0]
        if it.get("ncm") and not ncm_vinculado(it["ncm"], cltr_id, data):
            objetos.append(erro_item(n, "REG-011", "NCM não vinculada",
                                     f"NCM de código {it['ncm']} não vinculada à Classificação Tributária de código {it['cClassTrib']} (CBS e IBS)",
                                     f"#/itens/{idx}/ncm"))
            continue
        trib = {}
        base = Decimal(str(it.get("baseCalculo") or 0))
        if it.get("impostoSeletivo"):
            g = it["impostoSeletivo"]
            bis = Decimal(str(g["baseCalculo"]))
            pis = Decimal(str((an or {}).get("impostoSeletivo", {}).get("adValorem") or 0))
            vis = (bis * pis / 100).quantize(D2, ROUND_HALF_UP)
            trib["IS"] = {"CSTIS": g["cst"], "cClassTribIS": g["cClassTrib"], "vBCIS": dinheiro(bis), "pIS": dinheiro(pis),
                          "vIS": dinheiro(vis),
                          "memoriaCalculo": f"[SIMULADO] Base R$ {bis}, alíquota ad valorem de {pis}%."}
            base = bis + vis
            tot["is"] += vis
        if ano >= 2027:
            pcbs = Decimal(str(an["cbs"]))
            puf = Decimal(str(an["ibsEstadual"]))
            pmun = Decimal(str(an["ibsMunicipal"]))
        else:
            pcbs, puf, pmun = aliquota_ref(2, data), aliquota_ref(3, data), aliquota_ref(4, data)
        red = reducao(cltr_id, data)
        f = (100 - red) / 100
        def grupo(p):
            ef = (p * f).quantize(Decimal("0.0001"))
            return ef, (base * ef / 100).quantize(D2, ROUND_HALF_UP)
        ecbs, vcbs = grupo(pcbs)
        euf, vuf = grupo(puf)
        emun, vmun = grupo(pmun)
        mem = lambda p: f"[SIMULADO] {cl[2]}. Base de cálculo R$ {base}, alíquota de {p}% com redução de {red}%."
        trib["IBSCBS"] = {"CST": cl[3], "cClassTrib": cl[1], "gIBSCBS": {
            "vBC": dinheiro(base),
            "gIBSUF": {"pIBSUF": dinheiro(puf), "gRed": {"pRedAliq": dinheiro(red), "pAliqEfet": dinheiro(euf)}, "vIBSUF": dinheiro(vuf), "memoriaCalculo": mem(puf)},
            "gIBSMun": {"pIBSMun": dinheiro(pmun), "gRed": {"pRedAliq": dinheiro(red), "pAliqEfet": dinheiro(emun)}, "vIBSMun": dinheiro(vmun), "memoriaCalculo": mem(pmun)},
            "vIBS": dinheiro(vuf + vmun),
            "gCBS": {"pCBS": dinheiro(pcbs), "gRed": {"pRedAliq": dinheiro(red), "pAliqEfet": dinheiro(ecbs)}, "vCBS": dinheiro(vcbs), "memoriaCalculo": mem(pcbs)},
        }}
        tot["vBC"] += base
        tot["cbs"] += vcbs
        tot["ibs"] += vuf + vmun
        objetos.append({"nObj": n, "estadoItem": "CALCULO_SIMULADO" if ano >= 2027 else "CALCULADO", "tribCalc": trib})
    total = {"tribCalc": {"IBSCBSTot": {"vBCIBSCBS": dinheiro(tot["vBC"]), "gIBS": {"vIBS": dinheiro(tot["ibs"])},
                                        "gCBS": {"vCBS": dinheiro(tot["cbs"])}}}}
    if tot["is"]:
        total["tribCalc"]["ISTot"] = {"vIS": dinheiro(tot["is"])}
    return {"objetos": objetos, "total": total}


class H(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def responder(self, status, obj, extra=None):
        b = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(b)))
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(b)

    def do_GET(self):
        u = urlparse(self.path)
        p = u.path.replace("/api/calculadora/dados-abertos", "")
        a = {k: v[0] for k, v in parse_qs(u.query).items()}
        data = a.get("data", date.today().isoformat())
        if p == "/versao":
            return self.responder(200, {"versaoApp": "SIMULADO", "versaoDb": "simulado", "ambiente": "offline"})
        if p == "/ufs":
            return self.responder(200, [{"sigla": s, "nome": n, "codigo": c} for c, n, s in q("select UF_CD, UF_NOME, UF_SIGLA from UF")])
        if p == "/ufs/municipios":
            r = q("select m.MUNI_CD, m.MUNI_NOME from MUNICIPIO m join UF u on u.UF_CD=m.MUNI_UF_CD where u.UF_SIGLA=?", a.get("siglaUf", ""))
            return self.responder(200, [{"codigo": c, "nome": n} for c, n in r])
        if p == "/situacoes-tributarias/cbs-ibs":
            sits = q(f"select SITR_ID, SITR_CD, SITR_DESCRICAO from SITUACAO_TRIBUTARIA where {vigente('SITR', data)} order by SITR_CD")
            out = []
            for sid, cd, desc in sits:
                cls = q(f"select CLTR_CD, CLTR_DESCRICAO from CLASSIFICACAO_TRIBUTARIA where CLTR_SITR_ID=? and {vigente('CLTR', data)} order by CLTR_CD", sid)
                if cls and not (cd == "000" and sid != 1):
                    out.append({"id": sid, "codigo": cd, "descricao": desc,
                                "classificacoesTributarias": [{"codigo": c, "descricao": d} for c, d in cls]})
            return self.responder(200, out)
        if p == "/classificacoes-tributarias/cbs-ibs":
            r = q(f"""select c.CLTR_CD, c.CLTR_DESCRICAO, c.CLTR_NOMENCLATURA,
                      (select PERE_VALOR from PERCENTUAL_REDUCAO p where p.PERE_CLTR_ID=c.CLTR_ID and p.PERE_TBTO_ID=2 limit 1)
                      from CLASSIFICACAO_TRIBUTARIA c where {vigente('c.CLTR', data)} order by c.CLTR_ID""")
            vistos, out = set(), []
            for cd, desc, nom, red in r:
                if cd in vistos:
                    continue
                vistos.add(cd)
                out.append({"codigo": cd, "descricao": desc, "nomenclatura": nom,
                            "possuiPercentualReducao": red is not None, "percentualReducaoCbs": red})
            return self.responder(200, out)
        if p == "/ncm/vigentes":
            r = q(f"select NCM_CD, NCM_DESCRICAO from NCM where length(NCM_CD)=8 and {vigente('NCM', data)}")
            return self.responder(200, [{"ncm": c, "descricao": d} for c, d in r])
        if p == "/ncm":
            ncm = a.get("ncm", "")
            if not re.fullmatch(r"\d{8}", ncm):
                return self.responder(400, {"title": "NCM inválida"})
            trib = ncm_is(ncm, data) and int(data[:4]) >= 2027
            r = q(f"""select a.AADV_VALOR from ALIQUOTA_AD_VALOREM_PRODUTO p join ALIQUOTA_AD_VALOREM a on a.AADV_ID=p.AAVP_AADV_ID
                      where p.AAVP_NCM_CD=? and {vigente('p.AAVP', data)} limit 1""", ncm)
            return self.responder(200, {"tributadoPeloImpostoSeletivo": trib, "temAliquotaAdValorem": bool(r),
                                        "aliquotaAdValorem": r[0][0] if r else None})
        if p in ("/aliquota-uniao", "/aliquota-uf", "/aliquota-municipio"):
            t = {"/aliquota-uniao": 2, "/aliquota-uf": 3, "/aliquota-municipio": 4}[p]
            return self.responder(200, {"aliquotaReferencia": float(aliquota_ref(t, data))})
        return self.responder(404, {"title": "não implementado no simulador", "detail": p})

    def do_POST(self):
        if not self.path.startswith("/api/calculadora/observabilidade/regime-geral"):
            return self.responder(404, {"title": "não implementado no simulador"})
        op = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))))
        if not op.get("municipio"):
            return self.responder(400, {"title": "Dados inválidos", "detail": "municipio é obrigatório"})
        simulado = int(op.get("dhFatoGerador", "2026")[:4]) >= 2027
        self.responder(200, calcular(op), {"x-warning-dados-simulados": "aliquotas informadas"} if simulado else None)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", required=True)
    ap.add_argument("--porta", type=int, default=18080)
    a = ap.parse_args()
    DB = a.db
    print(f"Motor SIMULADO em http://127.0.0.1:{a.porta}/api (dados de {DB})")
    ThreadingHTTPServer(("127.0.0.1", a.porta), H).serve_forever()
