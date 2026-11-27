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
    """Registra o resultado de uma verificação; as falhas são contadas no fim e definem o código de saída."""
    print(("  ok   " if cond else "  FALHA ") + msg)
    if not cond:
        falhas.append(msg)


def status(pg, sel):
    """Texto da linha de status de uma aba (vazia ou "Pronto." quando deu certo)."""
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

    print("Calcular nota em janeiro de 2027 (antes do início do Imposto Seletivo)")
    pg.fill("#op-data", "2027-01-15"); pg.dispatch_event("#op-data", "change"); pg.wait_for_timeout(2500)
    pg.click("#btn-calcular"); pg.wait_for_function("!document.querySelector('#btn-calcular').disabled", timeout=60_000)
    r = pg.evaluate("estado.ultimoCalculo?.resultado")
    conferir(r and r["comErro"] == 0, "nenhum item com erro em janeiro de 2027")
    conferir(r and r["tot"]["is"] == 0, f"Imposto Seletivo zero antes de 02/02/2027 (MP 1.399/2026): {r and r['tot']['is']}")
    conferir("2 de fevereiro de 2027" in status(pg, "#calc-status"), f"aviso do início do IS: {status(pg, '#calc-status')!r}")
    pg.fill("#op-data", "2027-03-01"); pg.dispatch_event("#op-data", "change"); pg.wait_for_timeout(1500)

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

    print("Simples Nacional (exemplo: serviço de microempresa, Anexo III, 1ª faixa)")
    pg.click("[data-aba=calcular]")
    pg.select_option("#sel-exemplo", "simples")
    pg.wait_for_function("estado.itens.length === 1 && document.querySelector('#em-regime').value === 'simples'")
    conferir(pg.is_visible("#em-sn"), "painel do Simples visível")

    def calcular_em(data):
        pg.fill("#op-data", data); pg.dispatch_event("#op-data", "change"); pg.wait_for_timeout(1500)
        pg.click("#btn-calcular"); pg.wait_for_function("!document.querySelector('#btn-calcular').disabled", timeout=60_000)
        return pg.evaluate("estado.ultimoCalculo?.resultado")

    r = calcular_em("2026-10-15")
    conferir(r and r["modo"] == "sn-2026" and r["tot"]["cbs"] == 0 and r["tot"]["ibs"] == 0, f"2026: Simples sem CBS e IBS: {r and (r['modo'], r['tot'])}")
    conferir(r and r["regular"] and r["regular"]["cbs"] > 0, "2026: referência do regime regular calculada")
    # DAS de 6%: IRPJ 24,07 + CSLL 21,06 + PIS/Cofins 93,86 + CPP 261,12 + ISS 201,55 = 601,66 (soma das partes, como no PGDAS)
    conferir(r and r["das"]["total"] == 601.66, f"2026: DAS da nota R$ 601,66: {r and r['das']['total']}")
    conferir(pg.is_hidden("#bloco-aliquotas"), "2026: sem quadro de alíquotas")

    r = calcular_em("2027-03-01")
    conferir(pg.is_hidden("#bloco-aliquotas"), "2027 dentro do DAS: sem quadro de alíquotas do regime regular")
    # NFS-e: alíquota com 2 casas (0,9258% → 0,93%); 10.027,50 × 0,93% = 93,26; IBS 0,0102% → 0,01% = 1,00
    conferir(r and r["modo"] == "sn-dentro" and r["tot"]["cbs"] == 93.26 and r["tot"]["ibs"] == 1.0, f"2027: CBS 93,26 e IBS 1,00 dentro do DAS: {r and (r['modo'], r['tot'])}")
    conferir(r and r["itens"][0]["estado"] == "CALCULADO", f"2027: calculado pela calculadora do Simples: {r and r['itens'][0]['estado']}")
    conferir(r and abs(r["das"]["total"] - 601.66) <= 0.01, f"2027: o DAS não muda: {r and r['das']['total']}")
    conferir("DAS desta nota" in pg.inner_text("#cupom"), "cupom mostra o DAS da nota")

    pg.select_option("#em-opcao", "fora"); pg.wait_for_timeout(1500)
    conferir(pg.is_visible("#bloco-aliquotas"), "2027 por fora: quadro de alíquotas do regime regular")
    r = calcular_em("2027-03-01")
    conferir(r and r["modo"] == "sn-fora" and r["tot"]["cbs"] > 900, f"2027 por fora: CBS do regime regular: {r and r['tot']['cbs']}")
    conferir(r and r["das"]["total"] < 520, f"2027 por fora: DAS sem CBS e IBS: {r and r['das']['total']}")
    pg.select_option("#em-opcao", "dentro"); pg.wait_for_timeout(1000)

    print("Simples: comparar 2026 × 2027")
    pg.click("[data-aba=comparar]")
    pg.fill("#cmp-a", "2026-10-15"); pg.dispatch_event("#cmp-a", "change")
    pg.fill("#cmp-b", "2027-03-01"); pg.dispatch_event("#cmp-b", "change"); pg.wait_for_timeout(2000)
    pg.click("#btn-comparar"); pg.wait_for_function("!document.querySelector('#btn-comparar').disabled", timeout=60_000)
    c = pg.evaluate("estado.ultimaComparacao")
    conferir(status(pg, "#cmp-status") == "", f"status: {status(pg, '#cmp-status')!r}")
    conferir(c and abs(c["ra"]["das"]["total"] - c["rb"]["das"]["total"]) < 0.02, "DAS igual nas duas datas")
    conferir("o mesmo nas duas datas" in pg.inner_text("#cmp-resultado"), "explicação do Simples na comparação")

    print("Simples: antes e depois")
    pg.click("[data-aba=antesdepois]"); pg.wait_for_timeout(1500)
    pg.click("#btn-antesdepois"); pg.wait_for_function("!document.querySelector('#btn-antesdepois').disabled", timeout=60_000)
    ad = pg.evaluate("(estado.ultimoAntesDepois || []).map(x => ({erro: x.erro || null, simples: !!x.simples, P: x.P, preco: x.preco, pc: x.antes.pc}))")
    conferir(status(pg, "#ad-status") == "", f"status: {status(pg, '#ad-status')!r}")
    conferir(ad and all(x["simples"] and not x["erro"] for x in ad), f"antes e depois pelo Simples: {ad}")
    # PIS/Cofins de hoje = parte do DAS (6% × 15,6% do Anexo III) + o do fornecedor do lucro real embutido nas compras
    # (padrão: compras de 60% do preço, 9,25%)
    esperado = 10027.5 * 0.06 * 0.156 + 0.0925 * 0.6 * 10027.5
    conferir(ad and abs(ad[0]["pc"] - esperado) < 0.05, f"PIS/Cofins de hoje pela partilha do Anexo III: {ad and ad[0]['pc']} (esperado {esperado:.2f})")

    print("Simples: conferir NF-e de emitente do Simples (CRT 1, 2027)")
    pg.click("[data-aba=nfe]")
    pg.evaluate("""async () => { const t = await (await fetch('exemplos/nfe-exemplo-2027.xml')).text();
        await importarNfe(t.replace('<CRT>3</CRT>', '<CRT>1</CRT>').replace(/<IBSCBS>[\\s\\S]*?<\\/IBSCBS>/g, '')); }""")
    pg.wait_for_function("estado.nfe && estado.nfe.cab.emitente.crt === '1'", timeout=30_000); pg.wait_for_timeout(1500)
    conferir(pg.input_value("#em-regime") == "simples", "CRT 1 leva o painel para o Simples")
    pg.click("#btn-conferir"); pg.wait_for_function("!document.querySelector('#btn-conferir').disabled", timeout=60_000)
    sit = pg.evaluate("(estado.nfeConferencia?.linhas || []).map(l => [l.situacao, l.of.vCBS])")
    conferir(sit and all(s == "evento" and v > 0 for s, v in sit), f"valores do Simples calculados para o evento: {sit}")

    conferir(not erros_js, f"sem erros de JavaScript: {erros_js}")
    nav.close()

print(f"\n{'Teste de tela OK' if not falhas else f'{len(falhas)} falha(s)'}")
sys.exit(1 if falhas else 0)
