/* Calculadora RTC Fácil — importação e conferência de NF-e / NFC-e (XML).
 * Lê o XML no próprio navegador (nada é enviado para fora), leva os itens para a nota e
 * confere CBS, IBS e Imposto Seletivo destacados contra a calculadora oficial.
 * Usa as funções de app.js ($, api, num, brl, pct, esc, novoItem...). */
"use strict";

/* ====================================================================== leitura do XML */
// filhos diretos pelo nome local (o XML da NF-e usa namespace)
const filho = (el, nome) => (el ? [...el.children].find((c) => c.localName === nome) || null : null);
const caminho = (el, ...nomes) => nomes.reduce((e, n) => filho(e, n), el);
const texto = (el, ...nomes) => { const e = caminho(el, ...nomes); return e ? e.textContent.trim() : ""; };
const valorXml = (el, ...nomes) => { const t = texto(el, ...nomes); return t === "" ? null : Number(t); };
const primeiroFilho = (el) => (el && el.children.length ? el.children[0] : null);

/** Lê o texto de um XML de NF-e (modelo 55) ou NFC-e (modelo 65), com ou sem o protocolo de autorização. */
function lerNfe(xmlTexto) {
  const doc = new DOMParser().parseFromString(xmlTexto, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) throw new Error("o arquivo não é um XML válido.");
  const inf = doc.getElementsByTagNameNS("*", "infNFe")[0];
  if (!inf) throw new Error("não encontrei uma NF-e ou NFC-e neste XML (falta o grupo infNFe).");
  const ide = filho(inf, "ide"), emit = filho(inf, "emit"), dest = filho(inf, "dest");
  const endEmit = filho(emit, "enderEmit"), endDest = filho(dest, "enderDest");
  const tot = filho(inf, "total");
  const dh = texto(ide, "dhEmi") || texto(ide, "dEmi");
  if (!dh) throw new Error("a nota não tem data de emissão.");
  const cab = {
    chave: (inf.getAttribute("Id") || "").replace(/^NFe/, ""),
    modelo: Number(texto(ide, "mod")) || 55,
    numero: texto(ide, "nNF"), serie: texto(ide, "serie"),
    dhEmi: dh.length === 10 ? `${dh}T12:00:00-03:00` : dh,
    emitente: { nome: texto(emit, "xFant") || texto(emit, "xNome"), doc: texto(emit, "CNPJ") || texto(emit, "CPF"), crt: texto(emit, "CRT"),
      uf: texto(endEmit, "UF"), mun: texto(endEmit, "cMun") },
    destino: endDest && texto(endDest, "UF") && texto(endDest, "UF") !== "EX"
      ? { nome: texto(dest, "xNome"), uf: texto(endDest, "UF"), mun: texto(endDest, "cMun") } : null,
    totais: {
      vNF: valorXml(tot, "ICMSTot", "vNF"), vProd: valorXml(tot, "ICMSTot", "vProd"),
      vBC: valorXml(tot, "IBSCBSTot", "vBCIBSCBS"), vCBS: valorXml(tot, "IBSCBSTot", "gCBS", "vCBS"),
      vIBS: valorXml(tot, "IBSCBSTot", "gIBS", "vIBS"), vIS: valorXml(tot, "ISTot", "vIS"),
    },
  };
  // local da operação: o destino (o IBS e a CBS vão para onde a mercadoria chega); sem destinatário, o emitente
  const local = cab.destino || cab.emitente;
  cab.local = { uf: local.uf, mun: local.mun };

  const itens = [...inf.children].filter((c) => c.localName === "det").map((det) => {
    const prod = filho(det, "prod"), imp = filho(det, "imposto");
    const icms = primeiroFilho(filho(imp, "ICMS"));
    const pis = primeiroFilho(filho(imp, "PIS")), cofins = primeiroFilho(filho(imp, "COFINS"));
    const ipiTrib = caminho(imp, "IPI", "IPITrib");
    const ufDest = filho(imp, "ICMSUFDest");
    const ib = filho(imp, "IBSCBS"), g = filho(ib, "gIBSCBS");
    const is = filho(imp, "IS");
    const v = (el, n) => valorXml(el, n);
    return {
      nItem: det.getAttribute("nItem"),
      cProd: texto(prod, "cProd"), xProd: texto(prod, "xProd"), ncm: texto(prod, "NCM"), cfop: texto(prod, "CFOP"),
      uCom: texto(prod, "uCom"), qCom: v(prod, "qCom"),
      comp: {
        vProd: v(prod, "vProd"), vFrete: v(prod, "vFrete"), vSeg: v(prod, "vSeg"), vOutro: v(prod, "vOutro"), vDesc: v(prod, "vDesc"),
        vII: valorXml(imp, "II", "vII"),
        vPIS: v(pis, "vPIS"), vCOFINS: v(cofins, "vCOFINS"),
        vICMS: v(icms, "vICMS"), vICMSUFDest: v(ufDest, "vICMSUFDest"), vFCP: v(icms, "vFCP"), vFCPUFDest: v(ufDest, "vFCPUFDest"),
        vICMSMono: v(icms, "vICMSMono"), vISSQN: valorXml(imp, "ISSQN", "vISSQN"), vIS: v(is, "vIS"),
      },
      icms: { grupo: icms?.localName || "", cst: texto(icms, "CST"), csosn: texto(icms, "CSOSN"),
        p: v(icms, "pICMS"), pST: v(icms, "pICMSST") ?? v(icms, "pST"), pFCP: v(icms, "pFCP") },
      pis: { cst: texto(pis, "CST"), p: v(pis, "pPIS") }, cofins: { cst: texto(cofins, "CST"), p: v(cofins, "pCOFINS") },
      ipi: { p: v(ipiTrib, "pIPI"), v: v(ipiTrib, "vIPI") },
      ibscbs: ib ? {
        cst: texto(ib, "CST"), cClassTrib: texto(ib, "cClassTrib"), vBC: v(g, "vBC"),
        pCBS: valorXml(g, "gCBS", "pCBS"), vCBS: valorXml(g, "gCBS", "vCBS"),
        pIBSUF: valorXml(g, "gIBSUF", "pIBSUF"), pIBSMun: valorXml(g, "gIBSMun", "pIBSMun"),
        vIBS: v(g, "vIBS") ?? ((valorXml(g, "gIBSUF", "vIBSUF") || 0) + (valorXml(g, "gIBSMun", "vIBSMun") || 0)),
      } : null,
      is: is ? { cst: texto(is, "CSTIS"), cClassTrib: texto(is, "cClassTribIS"), vBC: v(is, "vBCIS"), p: v(is, "pIS"),
        pEspec: v(is, "pISEspec"), uTrib: texto(is, "uTrib"), qTrib: v(is, "qTrib"), vIS: v(is, "vIS") } : null,
    };
  });
  if (!itens.length) throw new Error("a nota não tem itens.");
  return { cab, itens };
}

const SIMPLES = new Set(["1", "2", "4"]); // CRT: 1 Simples Nacional, 2 excesso de sublimite, 4 MEI
const ehSimples = (cab) => SIMPLES.has(cab.emitente.crt);
const ICMS_ST = /^(10|30|60|70)$|^(201|202|203|500)$/;

/** Converte um item da NF-e em item da nota, já com os tributos de hoje para a aba "Antes e depois". */
function itemDaNfe(x, cab) {
  const c = x.comp;
  const valor = (c.vProd || 0) + (c.vFrete || 0) + (c.vSeg || 0) + (c.vOutro || 0) - (c.vDesc || 0);
  const ad = {};
  if (!ehSimples(cab)) {
    const monofasico = x.pis.cst === "04" || x.cofins.cst === "04";
    const pcZero = /^0[6-9]$/.test(x.pis.cst);
    if (x.pis.p !== null || x.cofins.p !== null || pcZero) ad.ad_pc = String(pcZero ? 0 : arred2((x.pis.p || 0) + (x.cofins.p || 0)));
    ad.ad_mono = monofasico ? "1" : "0";
  }
  const st = ICMS_ST.test(x.icms.cst || x.icms.csosn);
  ad.ad_st = st ? "1" : "0";
  const pIcms = x.icms.p ?? (st ? x.icms.pST : null) ?? (/^(40|41|50)$/.test(x.icms.cst) ? 0 : null);
  if (pIcms !== null) ad.ad_icms = String(pIcms);
  if (x.icms.pFCP !== null) ad.ad_fcp = String(x.icms.pFCP);
  if (x.ipi.p !== null) ad.ad_ipi = String(x.ipi.p);
  return novoItem({
    descricao: x.xProd.slice(0, 80), tipo: "ncm", codigo: x.ncm, cClassTrib: x.ibscbs?.cClassTrib || "",
    valor: arred2(valor), quantidade: x.qCom ?? "", unidade: (x.uCom || "UN").slice(0, 6).toUpperCase(),
    aliqIS: x.is?.p ?? "", ...ad,
  });
}

/** Abre o XML: guarda a nota para a conferência e leva os itens, a data e o local para as outras abas. */
async function importarNfe(xmlTexto) {
  const nfe = lerNfe(xmlTexto);
  if (estado.itens.length && !confirm(`Substituir os ${estado.itens.length} itens atuais pelos ${nfe.itens.length} itens da nota fiscal?`)) return false;
  estado.nfe = nfe;
  estado.nfeConferencia = null;
  estado.itens = nfe.itens.map((x) => itemDaNfe(x, nfe.cab));
  const uf = estado.ufs.find((u) => u.sigla === nfe.cab.local.uf);
  if (uf) { $("#op-uf").value = uf.sigla; await carregarMunicipios(uf.sigla, Number(nfe.cab.local.mun)); }
  $("#op-data").value = nfe.cab.dhEmi.slice(0, 10);
  if (ehSimples(nfe.cab)) $("#ad-regime").value = "simples";
  else if ($("#ad-regime").value === "simples") $("#ad-regime").value = "9.25";
  await aoMudarData();
  await renderizarNfe();
  return true;
}

/* ====================================================================== aba Conferir NF-e */
const nomeCrt = { 1: "Simples Nacional", 2: "Simples Nacional (excesso de sublimite)", 3: "Regime normal", 4: "MEI" };
let refAliqNfe = null;

async function renderizarNfe() {
  const n = estado.nfe;
  $("#nfe-vazio").hidden = !!n;
  $("#nfe-conteudo").hidden = !n;
  if (!n) return;
  const c = n.cab, d = c.dhEmi.slice(0, 10);
  const munNome = $("#op-mun").selectedOptions[0]?.textContent || c.local.mun;
  const comGrupo = n.itens.filter((x) => x.ibscbs).length;
  $("#nfe-resumo").innerHTML = `
    <dl class="nfe-cab">
      <div><dt>${c.modelo === 65 ? "NFC-e" : "NF-e"}</dt><dd>nº ${esc(c.numero)}, série ${esc(c.serie)}</dd></div>
      <div><dt>Emissão</dt><dd>${fmtData(d)}</dd></div>
      <div><dt>Emitente</dt><dd>${esc(c.emitente.nome)} · ${esc(nomeCrt[c.emitente.crt] || "regime " + c.emitente.crt)}</dd></div>
      <div><dt>Local da operação</dt><dd>${esc(munNome)} / ${esc(c.local.uf)} ${c.destino ? "(destino)" : "(emitente)"}</dd></div>
      <div><dt>Itens</dt><dd>${n.itens.length}, ${comGrupo === n.itens.length ? "todos com" : comGrupo ? `${comGrupo} com` : "nenhum com"} CBS e IBS destacados</dd></div>
      <div><dt>Valor da nota</dt><dd>${brl(c.totais.vNF)}</dd></div>
    </dl>
    ${c.chave ? `<p class="nota">Chave de acesso: <code>${esc(c.chave)}</code></p>` : ""}
    ${ehSimples(c) ? `<p class="aviso-nfe"><strong>Emitente do Simples Nacional.</strong> A calculadora oficial calcula pelas regras do regime regular. Se o emitente recolhe CBS e IBS dentro do DAS, a nota não destaca esses tributos e a conferência mostra só o que seria devido no regime regular.</p>` : ""}
    ${!comGrupo ? `<p class="aviso-nfe">Esta nota não traz o grupo de CBS e IBS (IBSCBS). A conferência mostra o que a calculadora oficial calcularia para ela.</p>` : ""}`;

  // alíquotas: a partir de 2027 são obrigatórias; preenchidas com a referência para a data da nota
  const box = $("#nfe-aliq");
  if (anoDe(d) < ANO_ALIQ_OBRIGATORIA) {
    box.innerHTML = `<p class="cmp-sem-aliq">Nota de ${anoDe(d)}: as alíquotas vêm da base oficial. Não há nada a informar.</p>`;
    refAliqNfe = null;
  } else {
    const chave = `${d}|${$("#op-uf").value}|${$("#op-mun").value}`;
    if (refAliqNfe !== chave) {
      const ref = await aliquotasReferencia(d, $("#op-uf").value, $("#op-mun").value);
      const daNota = (k) => { const vs = n.itens.map((x) => x.ibscbs?.[k]).filter((v) => v !== null && v !== undefined); return vs.length ? vs[0] : null; };
      refAliqNfe = chave;
      box.innerHTML = `<div class="campos">
          <label class="caixa"><span>CBS %</span><input type="number" step="0.0001" min="0" data-aliq="cbs" value="${ref.cbs ?? ""}"></label>
          <label class="caixa"><span>IBS estadual %</span><input type="number" step="0.0001" min="0" data-aliq="ibsEstadual" value="${ref.ibsEstadual ?? ""}"></label>
          <label class="caixa"><span>IBS municipal %</span><input type="number" step="0.0001" min="0" data-aliq="ibsMunicipal" value="${ref.ibsMunicipal ?? ""}"></label>
        </div>
        <p class="nota">Alíquotas de referência para ${fmtData(d)}, e não as da nota: assim a conferência mostra se a nota usou a alíquota certa.
        ${daNota("pCBS") !== null ? `A nota usa CBS de ${pct(daNota("pCBS"), 2)}, IBS estadual de ${pct(daNota("pIBSUF") ?? 0, 2)} e municipal de ${pct(daNota("pIBSMun") ?? 0, 2)} (antes de reduções).` : ""}
        ${notaAliquotas(ref, d)}</p>`;
    }
  }
  if (estado.nfeConferencia) renderizarConferencia(estado.nfeConferencia);
  else $("#nfe-resultado").innerHTML = "";
}

/** Bases de cada item calculadas pela calculadora oficial (endpoint de base unificada), com os componentes da
 *  própria nota: valor do produto, frete, seguro, outras despesas, desconto, ICMS, PIS/Cofins (só 2026), IS... */
async function basesOficiais(n) {
  const ano = anoDe(n.cab.dhEmi);
  return Promise.all(n.itens.map(async (x) => {
    const comp = Object.fromEntries(Object.entries(x.comp).filter(([, v]) => v !== null && v !== 0));
    const r = await api("/base-calculo/base-calculo-unificada", { method: "POST",
      body: JSON.stringify({ anoFatoGerador: ano, tipoDocumento: n.cab.modelo, natureza: x.comp.vISSQN ? "SERVICO" : "BEM", ...comp }) });
    return { rg: num(r.corpo.baseRG) ?? 0, is: num(r.corpo.baseIS) ?? 0, avisos: r.corpo.avisos || [] };
  }));
}

/** Monta a operação para a calculadora oficial a partir da nota e das bases oficiais. */
function operacaoDaNfe(n, aliq, bases) {
  const c = n.cab, ano = anoDe(c.dhEmi);
  const itens = n.itens.map((x, k) => {
    const item = { numero: k + 1, ncm: x.ncm, cst: x.ibscbs?.cst || "000", cClassTrib: x.ibscbs?.cClassTrib || "000001" };
    if (x.qCom) { item.quantidade = x.qCom; item.unidade = (x.uCom || "UN").slice(0, 6).toUpperCase(); }
    item.baseCalculo = bases[k].rg;
    if (aliq) item.aliquotasNominais = { cbs: aliq.cbs, ibsEstadual: aliq.ibsEstadual, ibsMunicipal: aliq.ibsMunicipal };
    if (x.is && ano >= ANO_ALIQ_OBRIGATORIA) {
      // base de CBS/IBS = base do IS + IS informado na nota; a calculadora troca o informado pelo que ela calcula
      item.impostoSeletivo = { cst: x.is.cst || "000", cClassTrib: x.is.cClassTrib || "000001", baseCalculo: bases[k].is, impostoInformado: x.is.vIS ?? 0 };
      item.baseCalculo = arred2(bases[k].is + (x.is.vIS ?? 0));
      if (x.is.qTrib) { item.impostoSeletivo.quantidade = x.is.qTrib; item.impostoSeletivo.unidade = (x.is.uTrib || "UN").slice(0, 6).toUpperCase(); }
      item.aliquotasNominais.impostoSeletivo = { ...(x.is.p !== null ? { adValorem: x.is.p } : {}), ...(x.is.pEspec ? { adRem: x.is.pEspec } : {}) };
    }
    return item;
  });
  return { id: "conferencia-" + (c.chave || Date.now()), versao: "1.0.0", dhFatoGerador: c.dhEmi, tpDoc: c.modelo,
    municipio: Number($("#op-mun").value || c.local.mun), uf: $("#op-uf").value || c.local.uf, itens };
}

const TOLERANCIA = 0.009; // diferenças de até 1 centavo são arredondamento

async function conferirNfe() {
  const st = $("#nfe-status"), n = estado.nfe;
  st.className = "calc-status erro";
  if (!n) { st.textContent = "Abra o XML de uma nota primeiro."; return; }
  let aliq = null;
  if (anoDe(n.cab.dhEmi) >= ANO_ALIQ_OBRIGATORIA) {
    aliq = aliquotasDoLado("nfe");
    if (aliq.cbs === null || aliq.ibsEstadual === null || aliq.ibsMunicipal === null) { st.textContent = "Preencha as alíquotas de CBS e IBS."; return; }
  }
  st.className = "calc-status"; st.textContent = "Conferindo com a calculadora oficial...";
  $("#btn-conferir").disabled = true;
  try {
    const bases = await basesOficiais(n);
    const operacao = operacaoDaNfe(n, aliq, bases);
    const r = await api("/observabilidade/regime-geral", { method: "POST", body: JSON.stringify(operacao) });
    const porItem = new Map((r.corpo.objetos || []).map((o) => [o.nObj, o]));
    const linhas = n.itens.map((x, k) => {
      const o = porItem.get(k + 1) || {};
      const g = o.tribCalc?.IBSCBS?.gIBSCBS || {};
      const of = {
        vBC: num(g.vBC), vCBS: num(g.gCBS?.vCBS), vIBS: num(g.vIBS ?? (n2(g.gIBSUF?.vIBSUF) + n2(g.gIBSMun?.vIBSMun))),
        pCBS: g.gCBS ? (g.gCBS.gRed ? num(g.gCBS.gRed.pAliqEfet) : num(g.gCBS.pCBS)) : null,
        vIS: o.tribCalc?.IS ? num(o.tribCalc.IS.vIS) : null,
      };
      const nota = x.ibscbs ? { vBC: x.ibscbs.vBC, vCBS: x.ibscbs.vCBS, vIBS: x.ibscbs.vIBS, pCBS: x.ibscbs.pCBS } : null;
      const erros = o.erros || [];
      const div = [];
      if (!erros.length && nota) {
        const cmp = (rot, a, b) => { if (a !== null && b !== null && Math.abs(a - b) > TOLERANCIA) div.push(`${rot}: nota ${brl(a)}, oficial ${brl(b)}`); };
        cmp("Base", nota.vBC, of.vBC);
        cmp("CBS", nota.vCBS, of.vCBS);
        cmp("IBS", nota.vIBS, of.vIBS);
        if (x.is && of.vIS !== null) cmp("Imposto Seletivo", x.is.vIS, of.vIS);
        if (x.ibscbs.cClassTrib && o.tribCalc?.IBSCBS?.cClassTrib && x.ibscbs.cClassTrib !== o.tribCalc.IBSCBS.cClassTrib) div.push(`Classificação: nota ${x.ibscbs.cClassTrib}, oficial ${o.tribCalc.IBSCBS.cClassTrib}`);
      }
      const situacao = erros.length ? "erro" : !nota ? "sem-destaque" : div.length ? "diverge" : "confere";
      return { k: k + 1, x, nota, of, erros, div, situacao, avisos: bases[k].avisos };
    });
    estado.nfeConferencia = { linhas, enviado: operacao, recebido: r.corpo, aliq, em: new Date().toISOString() };
    estado.ultimoCalculo = { enviado: operacao, recebido: r.corpo };
    renderizarConferencia(estado.nfeConferencia);
    st.textContent = "";
    salvar();
  } catch (e) {
    st.className = "calc-status erro"; st.textContent = e.message;
  } finally {
    $("#btn-conferir").disabled = false;
  }
}

const NOME_SITUACAO = { confere: "Confere", diverge: "Diverge", erro: "Erro", "sem-destaque": "Sem destaque" };

function renderizarConferencia({ linhas }) {
  const n = estado.nfe;
  const conta = (s) => linhas.filter((l) => l.situacao === s).length;
  const soma = (f) => arred2(linhas.reduce((a, l) => a + (f(l) || 0), 0));
  const T = {
    notaBC: soma((l) => l.nota?.vBC), notaCBS: soma((l) => l.nota?.vCBS), notaIBS: soma((l) => l.nota?.vIBS), notaIS: soma((l) => l.x.is?.vIS),
    ofBC: soma((l) => l.of.vBC), ofCBS: soma((l) => l.of.vCBS), ofIBS: soma((l) => l.of.vIBS), ofIS: soma((l) => l.of.vIS),
  };
  const cel = (a, b, temNota = true) => {
    const d = temNota && a !== null && a !== undefined && b !== null && Math.abs(a - b) > TOLERANCIA;
    return `<td class="n">${temNota && a !== null && a !== undefined ? brl(a) : "—"}</td><td class="n${d ? " diverge" : ""}">${b !== null && b !== undefined ? brl(b) : "—"}</td>`;
  };
  const temGrupo = linhas.some((l) => l.nota);
  const linhaTot = (rot, a, b) => `<tr><td>${rot}</td><td class="n">${temGrupo ? brl(a) : "—"}</td><td class="n">${brl(b)}</td>
    <td class="n ${temGrupo && Math.abs(a - b) > TOLERANCIA ? "diverge" : ""}">${temGrupo ? (Math.abs(a - b) > TOLERANCIA ? brl(b - a) : "—") : ""}</td></tr>`;
  const totaisNota = n.cab.totais;
  const avisoTotal = temGrupo && totaisNota.vCBS !== null && Math.abs(totaisNota.vCBS - T.notaCBS) > TOLERANCIA
    ? `<p class="aviso-nfe">O total de CBS da nota (${brl(totaisNota.vCBS)}) não bate com a soma dos itens (${brl(T.notaCBS)}).</p>` : "";

  $("#nfe-resultado").innerHTML = `
    <div class="nfe-placar">
      <div class="placar confere"><strong>${conta("confere")}</strong> conferem</div>
      <div class="placar diverge"><strong>${conta("diverge")}</strong> divergem</div>
      <div class="placar erro"><strong>${conta("erro")}</strong> com erro na calculadora</div>
      ${conta("sem-destaque") ? `<div class="placar"><strong>${conta("sem-destaque")}</strong> sem destaque na nota</div>` : ""}
    </div>
    ${avisoTotal}
    <div class="tabela-rolagem"><table class="tab-nfe-tot">
      <thead><tr><th>Total</th><th class="n">Na nota</th><th class="n">Calculadora oficial</th><th class="n">Diferença</th></tr></thead>
      <tbody>${linhaTot("Base de CBS e IBS", T.notaBC, T.ofBC)}${linhaTot("CBS", T.notaCBS, T.ofCBS)}${linhaTot("IBS", T.notaIBS, T.ofIBS)}
        ${T.ofIS || T.notaIS ? linhaTot("Imposto Seletivo", T.notaIS, T.ofIS) : ""}</tbody></table></div>

    <h3 class="sub-ad">Por item</h3>
    <div class="tabela-rolagem"><table class="tab-nfe">
      <thead>
        <tr><th colspan="3"></th><th colspan="2" class="grupo">Base</th><th colspan="2" class="grupo">CBS</th><th colspan="2" class="grupo">IBS</th><th colspan="2" class="grupo">Imposto Seletivo</th><th></th></tr>
        <tr><th>#</th><th>Item</th><th>NCM · classificação</th><th class="n">Nota</th><th class="n">Oficial</th><th class="n">Nota</th><th class="n">Oficial</th>
          <th class="n">Nota</th><th class="n">Oficial</th><th class="n">Nota</th><th class="n">Oficial</th><th>Situação</th></tr></thead>
      <tbody>${linhas.map((l) => `
        <tr class="sit-${l.situacao}"><td>${l.k}</td><td>${esc(l.x.xProd)}</td><td><code>${esc(l.x.ncm)}</code> · <code>${esc(l.x.ibscbs?.cClassTrib || "000001")}</code></td>
          ${cel(l.nota?.vBC, l.of.vBC, !!l.nota)}${cel(l.nota?.vCBS, l.of.vCBS, !!l.nota)}${cel(l.nota?.vIBS, l.of.vIBS, !!l.nota)}${cel(l.x.is?.vIS ?? null, l.of.vIS, !!l.x.is)}
          <td><span class="selo-nfe ${l.situacao}">${NOME_SITUACAO[l.situacao]}</span></td></tr>
        ${l.erros.length || l.div.length ? `<tr class="sit-detalhe"><td></td><td colspan="11">${l.erros.map((e) => `<strong>${esc(e.code || "")}</strong> ${esc(e.detail || e.title || "")}`).join("<br>")}${l.div.map(esc).join(" · ")}</td></tr>` : ""}`).join("")}
      </tbody></table></div>
    ${(() => { const av = [...new Set(linhas.flatMap((l) => l.avisos))]; return av.length
      ? `<details class="nfe-avisos"><summary>Avisos da calculadora oficial sobre a base (${av.length})</summary><ul>${av.map((a) => `<li>${esc(a)}</li>`).join("")}</ul></details>` : ""; })()}
    <p class="nota">A calculadora oficial monta a base de cada item com os valores da própria nota (produto, frete, seguro, outras despesas, desconto, ICMS, PIS/Cofins quando vigentes...) e calcula CBS, IBS e Imposto Seletivo pelas regras da data de emissão. Diferenças de até 1 centavo são tratadas como arredondamento.</p>`;
}

function exportarConferenciaCsv() {
  const c = estado.nfeConferencia;
  if (!c) return;
  const f = (v) => (v === null || v === undefined ? "" : String(v).replace(".", ","));
  const linhas = [["item", "descricao", "ncm", "cClassTrib", "base_nota", "base_oficial", "cbs_nota", "cbs_oficial", "ibs_nota", "ibs_oficial", "is_nota", "is_oficial", "situacao", "detalhes"].join(";")];
  for (const l of c.linhas) {
    linhas.push([l.k, `"${l.x.xProd.replace(/"/g, "'")}"`, l.x.ncm, l.x.ibscbs?.cClassTrib || "", f(l.nota?.vBC), f(l.of.vBC), f(l.nota?.vCBS), f(l.of.vCBS),
      f(l.nota?.vIBS), f(l.of.vIBS), f(l.x.is?.vIS), f(l.of.vIS), NOME_SITUACAO[l.situacao],
      `"${[...l.erros.map((e) => `${e.code || ""} ${e.detail || e.title || ""}`), ...l.div].join(" | ").replace(/"/g, "'")}"`].join(";"));
  }
  baixarArquivo(`conferencia-nfe-${estado.nfe.cab.numero || "nota"}.csv`, "﻿" + linhas.join("\r\n"), "text/csv");
}

async function abrirArquivoNfe(arquivo) {
  const st = $("#nfe-status");
  try {
    if (await importarNfe(await arquivo.text())) {
      st.className = "calc-status"; st.textContent = `Nota aberta: ${estado.nfe.itens.length} itens levados para a aba Calcular nota.`;
    }
  } catch (e) {
    st.className = "calc-status erro"; st.textContent = "Não consegui ler a nota: " + e.message;
  }
}

/* ====================================================================== eventos */
$("#inp-nfe").addEventListener("change", (ev) => { if (ev.target.files[0]) abrirArquivoNfe(ev.target.files[0]); ev.target.value = ""; });
$("#btn-nfe-exemplo").addEventListener("click", async () => {
  try {
    const r = await fetch("exemplos/nfe-exemplo-2027.xml");
    if (await importarNfe(await r.text())) { $("#nfe-status").className = "calc-status"; $("#nfe-status").textContent = "Nota de exemplo aberta."; }
  } catch (e) { $("#nfe-status").className = "calc-status erro"; $("#nfe-status").textContent = e.message; }
});
$("#btn-conferir").addEventListener("click", conferirNfe);
$("#btn-nfe-csv").addEventListener("click", exportarConferenciaCsv);
$("#btn-nfe-json").addEventListener("click", () => {
  const c = estado.nfeConferencia || {};
  $("#json-env").textContent = JSON.stringify(c.enviado, null, 2);
  $("#json-rec").textContent = JSON.stringify(c.recebido, null, 2);
  $("#dlg-json").showModal();
});
