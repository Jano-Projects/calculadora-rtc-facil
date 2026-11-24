#!/usr/bin/env python3
"""Teste de ponta a ponta pela tela: abre a calculadora num navegador sem janela e usa as abas como uma pessoa.

Uso:  python3 dev/teste_tela.py http://localhost:8090 [--motor-real]

Com --motor-real (calculadora oficial de verdade) também confere valores que dependem das regras oficiais,
como o Imposto Seletivo do refrigerante. Requer: pip install playwright && playwright install chromium
"""
import sys
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8090"
REAL = "--motor-real" in sys.argv
falhas = []


def conferir(cond, msg):
    print(("  ok   " if cond else "  FALHA ") + msg)
    if not cond:
        falhas.append(msg)


def status(pg, sel):
    return pg.inner_text(sel).strip()


with sync_playwright() as p:
    nav = p.chromium.launch()
    pg = nav.new_page(viewport={"width": 1300, "height": 900})
    erros_js = []
    pg.on("pageerror", lambda e: erros_js.append(str(e)))
    pg.on("dialog", lambda d: d.accept())
    pg.goto(URL + "/?limpar")
    pg.wait_for_url(lambda u: "limpar" not in u)
    pg.wait_for_function("typeof jaIniciouApp !== 'undefined' && jaIniciouApp && document.querySelectorAll('#op-mun option').length > 1", timeout=180_000)
    pg.wait_for_timeout(1500)

    print("Exemplo do dia a dia")
    pg.select_option("#sel-exemplo", "diaadia")
    pg.wait_for_function("estado.itens.length > 5")

    print("Calcular nota em 2026")
    pg.fill("#op-data", "2026-12-01"); pg.dispatch_event("#op-data", "change"); pg.wait_for_timeout(1500)
    pg.click("#btn-calcular"); pg.wait_for_function("!document.querySelector('#btn-calcular').disabled", timeout=60_000)
    r = pg.evaluate("estado.ultimoCalculo?.resultado")
    conferir(status(pg, "#calc-status") == "Pronto.", f"status: {status(pg, '#calc-status')!r}")
    conferir(r and r["comErro"] == 0, "nenhum item com erro em 2026")
    conferir(r and r["tot"]["cbs"] > 0, f"CBS de teste calculada: {r and r['tot']['cbs']}")

    print("Calcular nota em 2027")
    pg.fill("#op-data", "2027-03-01"); pg.dispatch_event("#op-data", "change"); pg.wait_for_timeout(2500)
    conferir(pg.input_value("#aliq-cbs") != "", f"alíquota da CBS preenchida: {pg.input_value('#aliq-cbs')}")
    pg.click("#btn-calcular"); pg.wait_for_function("!document.querySelector('#btn-calcular').disabled", timeout=60_000)
    r = pg.evaluate("estado.ultimoCalculo?.resultado")
    conferir(status(pg, "#calc-status") == "Pronto.", f"status: {status(pg, '#calc-status')!r}")
    conferir(r and r["comErro"] == 0, "nenhum item com erro em 2027")
    conferir(r and r["tot"]["is"] > 0, f"Imposto Seletivo calculado: {r and r['tot']['is']}")

    print("Comparar datas")
    pg.click("[data-aba=comparar]")
    pg.fill("#cmp-a", "2026-12-01"); pg.dispatch_event("#cmp-a", "change")
    pg.fill("#cmp-b", "2027-07-15"); pg.dispatch_event("#cmp-b", "change"); pg.wait_for_timeout(2500)
    pg.click("#btn-comparar"); pg.wait_for_function("!document.querySelector('#btn-comparar').disabled", timeout=60_000)
    c = pg.evaluate("estado.ultimaComparacao")
    conferir(status(pg, "#cmp-status") == "", f"status: {status(pg, '#cmp-status')!r}")
    conferir(c and c["ra"]["comErro"] == 0 and c["rb"]["comErro"] == 0, "comparação sem itens com erro")

    print("Antes e depois (comércio)")
    pg.click("[data-aba=antesdepois]"); pg.wait_for_timeout(2500)
    pg.click("#btn-antesdepois"); pg.wait_for_function("!document.querySelector('#btn-antesdepois').disabled", timeout=60_000)
    ad = pg.evaluate("(estado.ultimoAntesDepois || []).map(x => ({d: x.it.descricao, erro: x.erro || null, is: x.depois.is, P: x.P, preco: x.preco}))")
    conferir(status(pg, "#ad-status") == "", f"status: {status(pg, '#ad-status')!r}")
    conferir(ad and not any(x["erro"] for x in ad), "antes e depois sem itens com erro")
    refri = next((x for x in ad if x["d"].startswith("Refrigerante")), None)
    if REAL:
        # comércio: IS = preço de fábrica (60% de R$ 10,00) × 2,6% = R$ 0,156
        conferir(refri and abs(refri["is"] - 0.156) < 0.02, f"IS do refrigerante perto de R$ 0,16: {refri and refri['is']}")
    conferir(all(0.7 < x["preco"] / x["P"] < 1.3 for x in ad if x["P"]), "preços estimados dentro de ±30%")

    print("Conferir NF-e (nota de exemplo de 2027)")
    pg.click("[data-aba=nfe]")
    pg.click("#btn-nfe-exemplo"); pg.wait_for_function("estado.nfe && estado.itens.length === 4", timeout=30_000); pg.wait_for_timeout(2500)
    conferir(pg.input_value("#op-data") == "2027-03-01", f"data da nota levada para a nota: {pg.input_value('#op-data')}")
    pg.click("#btn-conferir"); pg.wait_for_function("!document.querySelector('#btn-conferir').disabled", timeout=60_000)
    sit = pg.evaluate("(estado.nfeConferencia?.linhas || []).map(l => [l.situacao, l.erros.map(e => e.detail || e.title).join(' ')])")
    conferir(status(pg, "#nfe-status") == "", f"status: {status(pg, '#nfe-status')!r}")
    conferir([s for s, _ in sit] == ["confere", "confere", "diverge", "confere"], f"situações esperadas (itens 1, 2 e 4 conferem; 3 diverge): {sit}")

    conferir(not erros_js, f"sem erros de JavaScript: {erros_js}")
    nav.close()

print(f"\n{'Teste de tela OK' if not falhas else f'{len(falhas)} falha(s)'}")
sys.exit(1 if falhas else 0)
