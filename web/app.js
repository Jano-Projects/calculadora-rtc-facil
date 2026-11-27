/* Calculadora RTC Fácil — front-end (JavaScript puro, sem build).
 * Conversa com a calculadora oficial pelo proxy local: /api/calculadora/...
 * e com o gerenciador local: /painel/... */
"use strict";

// Endereços: /api/** é repassado pelo gerenciador local (app/CalculadoraRTC.java) ao motor oficial;
// /painel/** é respondido pelo próprio gerenciador (estado do motor, log, relação NCM × classificação).
const API = "/api/calculadora";
// A partir deste ano a calculadora oficial exige que as alíquotas de CBS e IBS sejam informadas (aliquotasNominais).
const ANO_ALIQ_OBRIGATORIA = 2027;
// Atalhos de DOM e de formatação usados no arquivo inteiro.
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const brl = (v) => (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (v, casas = 2) => (Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas }) + "%";
const num = (v) => (v === "" || v === null || v === undefined || isNaN(Number(v)) ? null : Number(v));
const hoje = () => new Date().toLocaleDateString("sv-SE"); // AAAA-MM-DD no fuso local
const anoDe = (d) => Number(String(d).slice(0, 4));
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/** Estado da tela em memória. Os itens da nota são a fonte única: as abas Comparar, Antes e depois
 *  e Conferir NF-e leem e gravam a mesma lista. Tudo o que importa é salvo no navegador por salvar(). */
const estado = {
  itens: [],
  ufs: [],
  ultimoCalculo: null, // { enviado, recebido, resultado }
  seq: 1,
};
const cache = new Map(); // respostas de dados abertos

/* ====================================================================== armazenamento local */
/** Grava no localStorage os itens, o local, as datas e os ajustes das abas. Não há servidor: os dados
 *  ficam só neste navegador. Chamado depois de cada alteração. */
const salvar = () => {
  if (zerando) return;
  try {
    localStorage.setItem("calc-rtc", JSON.stringify({
      itens: estado.itens.map(({ verOpcoes, ...i }) => i), data: $("#op-data").value, uf: $("#op-uf").value, mun: $("#op-mun").value,
      cmpA: $("#cmp-a").value, cmpB: $("#cmp-b").value, adData: $("#ad-data").value,
      adVendedor: $("#ad-vendedor").value, adFabrica: $("#ad-fabrica").value, adIcmsBase: $("#ad-icms-base").value, adRegime: $("#ad-regime").value,
      snAnexo: $("#ad-sn-anexo").value, snAliq: $("#ad-sn-aliq").value, snOpcao: $("#ad-sn-opcao").value,
      nfe: estado.nfe || null,
    }));
  } catch { /* navegador sem armazenamento: segue sem salvar */ }
};
/* Começar do zero: apaga tudo o que esta tela guardou no navegador e recarrega.
 * Também funciona abrindo a página com ?limpar (útil se dados antigos travarem a tela). */
function zerarTudo() {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith("calc-rtc")) localStorage.removeItem(k);
  } catch { /* sem armazenamento: nada a apagar */ }
  zerando = true;
  location.replace(location.pathname);
}
/* ---------------------------------------------------------------- link da nota (dados dentro do próprio endereço) */
const b64url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const deB64url = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
/** Comprime ("c") ou descomprime ("d") com deflate-raw, para o link da nota caber no endereço. */
async function comprimir(texto, sentido) {
  const fluxo = new Blob([texto]).stream().pipeThrough(sentido === "c" ? new CompressionStream("deflate-raw") : new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(fluxo).arrayBuffer());
}
/** Monta o link que leva a nota inteira no próprio endereço (depois do #, que o navegador não envia a servidor). */
async function linkDaNota() {
  salvar();
  const dados = JSON.parse(localStorage.getItem("calc-rtc") || "{}");
  delete dados.nfe; // a NF-e pode ser grande e tem dados de terceiros: não vai no link
  const json = JSON.stringify(dados);
  const corpo = typeof CompressionStream === "function" ? "z" + b64url(await comprimir(json, "c")) : "j" + b64url(new TextEncoder().encode(json));
  return `${location.origin}${location.pathname}#nota=${corpo}`;
}
/** Abre uma nota recebida por link: grava os dados no navegador e recarrega a página limpa. */
async function abrirLinkDaNota() {
  const m = location.hash.match(/^#nota=([zj])([A-Za-z0-9_-]+)$/);
  if (!m) return;
  try {
    const bytes = deB64url(m[2]);
    const json = m[1] === "z" ? new TextDecoder().decode(await comprimir(bytes, "d")) : new TextDecoder().decode(bytes);
    const dados = JSON.parse(json);
    const atual = carregarSalvo();
    if (atual?.itens?.length && !confirm(`Abrir a nota do link (${dados.itens?.length || 0} itens) no lugar dos ${atual.itens.length} itens atuais?`)) {
      history.replaceState(null, "", location.pathname); return;
    }
    localStorage.setItem("calc-rtc", JSON.stringify({ ...dados, nfe: null }));
  } catch {
    alert("Este link de nota está incompleto ou corrompido.");
  }
  zerando = true; // recarrega sem regravar o estado antigo
  location.replace(location.pathname);
}

let zerando = false; // impede que um salvar() pendente regrave os dados durante o recarregamento
if (new URLSearchParams(location.search).has("limpar")) zerarTudo();
if (location.hash.startsWith("#nota=")) abrirLinkDaNota();

/** Lê o que salvar() gravou; null se não houver nada ou se os dados estiverem corrompidos. */
const carregarSalvo = () => {
  try { return JSON.parse(localStorage.getItem("calc-rtc") || "null"); } catch { return null; }
};

/* ====================================================================== chamadas */
/** Chama a calculadora oficial (pelo proxy local) e devolve { corpo, cabecalhos }. Em erro HTTP, lança um Error
 *  com a mensagem já traduzida por mensagemDeErro() e o corpo original em e.corpo. */
async function api(caminho, opcoes = {}) {
  const r = await fetch(API + caminho, {
    ...opcoes,
    headers: { Accept: "application/json", ...(opcoes.body ? { "Content-Type": "application/json" } : {}), ...(opcoes.headers || {}) },
  });
  const texto = await r.text();
  let corpo = null;
  try { corpo = texto ? JSON.parse(texto) : null; } catch { corpo = texto; }
  if (!r.ok) {
    const e = new Error(mensagemDeErro(corpo, r.status));
    e.status = r.status; e.corpo = corpo;
    throw e;
  }
  return { corpo, cabecalhos: r.headers };
}

/** Transforma a resposta de erro da API oficial (formato "problem+json": title, detail, campos) em texto legível. */
function mensagemDeErro(corpo, status) {
  if (corpo && typeof corpo === "object") {
    const partes = [corpo.title, corpo.detail].filter(Boolean);
    const campos = corpo.fields || corpo.campos || corpo.errors || corpo.objects;
    if (Array.isArray(campos)) campos.forEach((c) => partes.push((c.name || c.pointer || c.campo || "") + " " + (c.userMessage || c.detail || c.message || c.mensagem || "")));
    if (partes.length) return partes.join(" — ");
  }
  if (status === 503) return "O motor de cálculo ainda está sendo preparado. Aguarde alguns instantes.";
  return `Erro ${status} ao falar com a calculadora.`;
}

/** Consulta os "dados abertos" da calculadora oficial (UFs, municípios, NCMs, classificações, alíquotas)
 *  guardando a promessa em cache: a mesma pergunta não vai duas vezes ao motor. */
async function dadoAberto(caminho) {
  if (cache.has(caminho)) return cache.get(caminho);
  const p = api("/dados-abertos" + caminho).then((r) => r.corpo).catch((e) => { cache.delete(caminho); throw e; });
  cache.set(caminho, p);
  return p;
}

/** Data da operação escolhida na aba Calcular nota (AAAA-MM-DD); hoje, se estiver vazia. */
const dataOp = () => $("#op-data").value || hoje();

/* ====================================================================== status do painel / motor */
let jaIniciouApp = false;
/** Consulta o gerenciador a cada poucos segundos: mostra a tela de espera enquanto o motor é instalado ou
 *  atualizado e inicia a aplicação quando ele fica pronto. */
async function acompanharPainel() {
  let s;
  try {
    s = await (await fetch("/painel/status", { cache: "no-store" })).json();
  } catch {
    if (encerrada) return; // encerrada pelo botão: a mensagem já está na tela
    mostrarPreparo({ estado: "erro", mensagem: "Não foi possível falar com a calculadora. Ela pode ter sido encerrada: pela janela do terminal, pelo botão Encerrar ou sozinha, depois de um tempo sem nenhuma aba aberta. Abra-a de novo pelo ícone ou pelo iniciar." });
    setTimeout(acompanharPainel, 4000);
    return;
  }
  atualizarChip(s);
  if (s.pronto) {
    $("#preparo").hidden = true;
    if (!jaIniciouApp) { jaIniciouApp = true; iniciarApp(); }
    setTimeout(acompanharPainel, s.atualizando ? 5000 : 60000);
  } else {
    mostrarPreparo(s);
    setTimeout(acompanharPainel, 2000);
  }
}

/** Tela de espera (primeira instalação) ou de erro, com o log da instalação quando a pessoa abre os detalhes. */
async function mostrarPreparo(s) {
  const p = $("#preparo");
  p.hidden = false;
  p.classList.toggle("erro", s.estado === "erro");
  $("#preparo h1").textContent = s.estado === "erro" ? "Não foi possível preparar a calculadora" : "Preparando a calculadora";
  $("#preparo-msg").textContent = s.mensagem || "Preparando...";
  $("#preparo-tentar").hidden = s.estado !== "erro";
  if ($("#preparo details").open) {
    try { $("#preparo-log").textContent = await (await fetch("/painel/log", { cache: "no-store" })).text(); } catch { /* sem log */ }
  }
}

/** Selo no topo com a versão do motor oficial em uso e o aviso de versão nova ou de falha na atualização. */
function atualizarChip(s) {
  const chip = $("#chip-versao");
  chip.className = "chip";
  let texto, titulo;
  if (s.atualizando) {
    chip.classList.add("atualizando");
    texto = "atualizando motor...";
    titulo = s.mensagem;
  } else if (s.pronto) {
    const nova = s.versaoDisponivel && s.versaoInstalada && s.versaoDisponivel !== s.versaoInstalada;
    chip.classList.add(nova || s.erroAtualizacao ? "erro" : "ok");
    texto = "motor oficial " + (s.versaoInstalada || "?") + (nova ? " (nova: " + s.versaoDisponivel + ")" : "");
    titulo = s.erroAtualizacao ? "Última atualização falhou: " + s.erroAtualizacao
      : s.ultimaVerificacao ? "Verificado em " + s.ultimaVerificacao : "";
  } else {
    texto = "preparando...";
    titulo = s.mensagem;
  }
  chip.textContent = texto;
  chip.title = titulo || "";
  // aba Ajuda: tempo do encerramento automático (só quando aberta pelo ícone) e pasta dos arquivos baixados
  $("#ajuda-minutos").textContent = s.encerraSemUso ? `${s.encerraSemUso} minutos` : "alguns minutos";
  if (s.pastaDados) $("#ajuda-pasta").innerHTML = `Os arquivos baixados e gerados (Java, calculadora oficial e registros) ficam em <code>${esc(s.pastaDados)}</code>. Apagar essa pasta faz tudo ser baixado e preparado de novo na próxima abertura.`;
  $("#ajuda-status").textContent = s.pronto
    ? `Em uso: calculadora oficial versão ${s.versaoInstalada}. Mais recente publicada: ${s.versaoDisponivel || "não verificado"}${s.ultimaVerificacao ? " (verificado em " + s.ultimaVerificacao + ")" : ""}.`
      + (s.atualizacaoAutomatica ? ` Atualização automática ligada (a cada ${s.horasEntreVerificacoes} h).` : " Atualização automática desligada.")
      + (s.erroAtualizacao ? " Última tentativa falhou: " + s.erroAtualizacao : "")
    : s.mensagem;
}

/** Pede ao gerenciador que procure e instale agora a versão mais recente da calculadora oficial. */
/** Botão "Encerrar a calculadora" (aba Ajuda): desliga o painel e o motor oficial neste computador. */
let encerrada = false;
async function encerrarCalculadora() {
  if (!confirm("Encerrar a calculadora? Os itens continuam guardados neste navegador. Para usar de novo, abra pelo ícone.")) return;
  encerrada = true;
  try { await fetch("/painel/encerrar", { method: "POST" }); } catch { /* já estava encerrando */ }
  mostrarPreparo({ estado: "ok", mensagem: "A calculadora foi encerrada. Pode fechar esta aba." });
  $("#preparo h1").textContent = "Calculadora encerrada";
}

async function pedirAtualizacao() {
  const r = await fetch("/painel/atualizar", { method: "POST" });
  if (r.status === 409) alert("A atualização automática está desligada (o painel foi iniciado com --sem-atualizacao, --versao ou --api-externa).");
  setTimeout(acompanharPainel, 1000);
}

/* ====================================================================== operação: data, UF, município */
/** Preenche a lista de UFs com os dados abertos da base oficial. */
async function carregarUfs() {
  estado.ufs = await dadoAberto("/ufs");
  estado.ufs.sort((a, b) => a.sigla.localeCompare(b.sigla));
  $("#op-uf").innerHTML = estado.ufs.map((u) => `<option value="${esc(u.sigla)}">${esc(u.sigla)} — ${esc(u.nome)}</option>`).join("");
}

/** Preenche os municípios da UF (o código IBGE do município define o IBS municipal). */
async function carregarMunicipios(uf, selecionar) {
  const lista = await dadoAberto("/ufs/municipios?siglaUf=" + encodeURIComponent(uf));
  lista.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const sel = $("#op-mun");
  sel.innerHTML = lista.map((m) => `<option value="${m.codigo}">${esc(m.nome)}</option>`).join("");
  if (selecionar && lista.some((m) => String(m.codigo) === String(selecionar))) sel.value = String(selecionar);
}

/** Frase que explica em que fase da transição a data cai (teste em 2026, CBS cheia em 2027, transição do IBS
 *  de 2029 a 2032, sistema completo em 2033) e a classe de cor correspondente. */
function textoFase(data) {
  const ano = anoDe(data);
  if (ano < 2026) return ["Antes de 2026 a CBS e o IBS ainda não existem.", ""];
  if (ano === 2026) return ["2026 é o ano de teste: CBS de 0,9% e IBS de 0,1%, compensados com PIS/Cofins. As alíquotas vêm da base oficial.", ""];
  if (ano < 2029) return [`${ano}: a CBS substitui o PIS e a Cofins, e começa o Imposto Seletivo${data < INICIO_IS ? " (só em 2 de fevereiro de 2027)" : ""}. O IBS ainda é simbólico (0,1%).`, "f2027"];
  if (ano < 2033) return [`${ano}: transição — o IBS sobe aos poucos enquanto ICMS e ISS diminuem.`, "f2027"];
  return [`${ano}: sistema novo completo. ICMS e ISS deixam de existir.`, "f2027"];
}

/** Ao trocar a data: atualiza a fase, as classificações vigentes e as alíquotas de referência do quadro. */
async function aoMudarData() {
  const d = dataOp();
  const [txt, cls] = textoFase(d);
  const f = $("#op-fase");
  f.textContent = txt;
  f.className = "fase " + cls;
  $("#cons-data").textContent = new Date(d + "T12:00").toLocaleDateString("pt-BR");
  $("#bloco-aliquotas").hidden = anoDe(d) < ANO_ALIQ_OBRIGATORIA;
  await Promise.allSettled([carregarClassificacoes(d), preencherAliquotasReferencia(true)]);
  renderizarItens();
  salvar();
}

/** Busca as alíquotas de referência da base oficial para a data e o local. */
async function aliquotasReferencia(data, uf, mun) {
  const u = estado.ufs.find((x) => x.sigla === uf);
  const [cbs, ibsuf, ibsmun] = await Promise.all([
    dadoAberto(`/aliquota-uniao?data=${data}`),
    u ? dadoAberto(`/aliquota-uf?codigoUf=${u.codigo}&data=${data}`) : null,
    dadoAberto(`/aliquota-municipio?codigoMunicipio=${mun}&data=${data}`),
  ].map((p) => Promise.resolve(p).catch(() => null)));
  const valor = (a) => {
    if (!a) return null;
    const ref = num(a.aliquotaReferencia), prop = num(a.aliquotaPropria);
    if (prop === null) return ref;
    if (a.formaAplicacao === "SUBSTITUICAO") return prop;
    if (a.formaAplicacao === "ACRESCIMO") return (ref || 0) + prop;
    if (a.formaAplicacao === "DECRESCIMO") return (ref || 0) - prop;
    return ref;
  };
  const ref = { cbs: valor(cbs), ibsEstadual: valor(ibsuf), ibsMunicipal: valor(ibsmun) };
  // alíquotas que vieram da base oficial e diferem da estimativa que esta ferramenta usaria
  ref.divergentes = [];
  if (anoDe(data) >= ANO_ALIQ_OBRIGATORIA) {
    for (const k of ["cbs", "ibsEstadual", "ibsMunicipal"]) {
      const e = ESTIMATIVAS(anoDe(data))[k];
      if (ref[k] && e !== undefined && Math.abs(ref[k] - e) > 0.0001) ref.divergentes.push({ k, oficial: ref[k], estimativa: e });
    }
  }
  // A partir da versão 1.7.2 a base oficial não traz mais alíquotas de referência de 2027 em diante
  // (por isso a API passou a exigir que sejam informadas). Sem referência, usamos uma estimativa marcada.
  const estimadas = [];
  const ano = anoDe(data);
  for (const k of ["cbs", "ibsEstadual", "ibsMunicipal"]) {
    if (ano >= ANO_ALIQ_OBRIGATORIA && !ref[k]) {
      const e = ESTIMATIVAS(ano)[k];
      ref[k] = e ?? null;
      if (e !== undefined) estimadas.push(k);
    }
  }
  ref.estimadas = estimadas;
  ref.faltando = ["cbs", "ibsEstadual", "ibsMunicipal"].filter((k) => ref[k] === null);
  return ref;
}

/** Estimativas usadas quando a base oficial não tem a alíquota de referência.
 *  CBS: referência de 11,3% para 2027, calculada pelo TCU em 28/10/2026 (pendente de resolução do Senado
 *       até 15/12/2026), menos 0,1 ponto em 2027 e 2028 (LC 214, art. 347) = 11,2%. Depois de 2028 a
 *       referência é recalculada a cada ano; até haver valor, usamos 11,3%.
 *  IBS 2027–2028: 0,05% estadual + 0,05% municipal, fixados pela Emenda Constitucional 132 (ADCT, art. 127). */
const CBS_REFERENCIA_TCU = 11.3;
const PRAZO_SENADO = "2026-12-15"; // prazo para o Senado fixar a alíquota de referência de 2027
const ESTIMATIVAS = (ano) => ({
  cbs: ano <= 2028 ? Math.round((CBS_REFERENCIA_TCU - 0.1) * 100) / 100 : CBS_REFERENCIA_TCU,
  ...(ano <= 2028 ? { ibsEstadual: 0.05, ibsMunicipal: 0.05 } : {}),
});
const NOMES_ALIQ = { cbs: "CBS", ibsEstadual: "IBS estadual", ibsMunicipal: "IBS municipal" };

/** Texto explicando de onde vieram as alíquotas preenchidas. */
function notaAliquotas(ref, d) {
  const partes = [];
  if (ref.estimadas.length) {
    partes.push(`<strong>Estimativa:</strong> a base oficial não traz alíquota de referência de ${anoDe(d)} para ${ref.estimadas.map((k) => NOMES_ALIQ[k]).join(", ")}.`
      + (ref.estimadas.includes("cbs") ? (anoDe(d) <= 2028
        ? " CBS de 11,2%: a referência de 11,3% calculada pelo TCU" + (hoje() <= PRAZO_SENADO
          ? " (pendente de resolução do Senado até 15/12/2026)"
          : " (o prazo do Senado para fixá-la terminou em 15/12/2026: confira se foi mantida)") + ", menos 0,1 ponto em 2027 e 2028."
        : ` CBS de 11,3%: a referência calculada pelo TCU para 2027 (a de ${anoDe(d)} será recalculada).`) : "")
      + (ref.estimadas.some((k) => k !== "cbs") ? " IBS de 0,05% + 0,05%, fixado pela Emenda Constitucional 132 para 2027 e 2028." : ""));
  }
  if (ref.faltando.length) partes.push(`<strong>Informe ${ref.faltando.map((k) => NOMES_ALIQ[k]).join(" e ")}:</strong> ainda não há valor publicado para ${anoDe(d)}.`);
  if (!ref.estimadas.length && !ref.faltando.length) partes.push(`Preenchidas com as alíquotas de referência da base oficial para ${new Date(d + "T12:00").toLocaleDateString("pt-BR")}.`);
  if (ref.divergentes.length) {
    partes.push(`<strong>Atenção:</strong> ${ref.divergentes.map((x) => `a base oficial traz ${NOMES_ALIQ[x.k]} de ${pct(x.oficial, 2)}`).join(", ")},`
      + ` diferente da estimativa que esta ferramenta usaria (${ref.divergentes.map((x) => pct(x.estimativa, 2)).join(", ")}). Vale a oficial.`);
  }
  return partes.join(" ") + " Altere se quiser simular outro cenário.";
}

/** Preenche o quadro de alíquotas da aba Calcular nota. Com forcar = true, sobrescreve o que a pessoa digitou. */
async function preencherAliquotasReferencia(forcar) {
  const d = dataOp();
  if (anoDe(d) < ANO_ALIQ_OBRIGATORIA) return;
  const a = await aliquotasReferencia(d, $("#op-uf").value, $("#op-mun").value);
  for (const [id, v] of [["#aliq-cbs", a.cbs], ["#aliq-ibsuf", a.ibsEstadual], ["#aliq-ibsmun", a.ibsMunicipal]]) {
    if (forcar || $(id).value === "") $(id).value = v ?? "";
  }
  $("#aliq-nota").innerHTML = notaAliquotas(a, d);
}

/* ====================================================================== classificações e NCM */
let classificacoes = []; // [{codigo, descricao, cst, cstDescricao, reducao}]
/** Carrega as classificações tributárias (cClassTrib) vigentes na data, agrupadas pelo CST, com o percentual de
 *  redução de cada uma. O cClassTrib (6 dígitos) diz o tratamento do item: integral, redução de 30%/60%, alíquota
 *  zero, imunidade etc.; os 3 primeiros dígitos são o CST. */
async function carregarClassificacoes(data) {
  const [lista, detalhes] = await Promise.all([
    dadoAberto("/situacoes-tributarias/cbs-ibs?data=" + data),
    dadoAberto("/classificacoes-tributarias/cbs-ibs?data=" + data).catch(() => []),
  ]);
  const det = new Map((detalhes || []).map((d) => [d.codigo, d]));
  const out = [];
  for (const sit of lista || []) {
    for (const c of sit.classificacoesTributarias || []) {
      const d = det.get(c.codigo) || {};
      out.push({ codigo: c.codigo, descricao: c.descricao, cst: sit.codigo, cstDescricao: sit.descricao,
        reducao: d.possuiPercentualReducao ? num(d.percentualReducaoCbs) : null });
    }
  }
  out.sort((a, b) => a.codigo.localeCompare(b.codigo));
  classificacoes = out;
}
/** Dados da classificação tributária pelo código, entre as vigentes carregadas. */
const classificacao = (codigo) => classificacoes.find((c) => c.codigo === codigo);

/* ---------------------------------------------------------------- relação NCM × classificação (base oficial)
 * Gerada pelo gerenciador a partir do banco da versão instalada (tabela NCM_APLICAVEL + anexos da LC 214).
 * regras: [id, prefixoNcm, cClassTrib, inicio, fim, idAnexo]; excecoes: [idRegra, prefixoNcm, inicio, fim] */
let relacao = null;
/** Lê a relação NCM × classificação que o gerenciador extraiu do banco oficial. Sem ela, a tela funciona sem sugestões. */
async function carregarRelacao() {
  try {
    const r = await fetch("/painel/ncm-classificacoes", { cache: "no-cache" });
    if (!r.ok) return;
    const d = await r.json();
    const excecoes = new Map();
    for (const [id, ncm, ini, fim] of d.excecoes || []) {
      if (!excecoes.has(id)) excecoes.set(id, []);
      excecoes.get(id).push({ ncm, ini, fim });
    }
    relacao = { regras: d.regras || [], excecoes, anexos: d.anexos || {},
      comLista: new Set((d.regras || []).map((r) => r[2])) };
  } catch { relacao = null; }
}
/** Vigência como na base oficial: início e fim inclusivos; fim vazio = ainda vigente. Datas como texto AAAA-MM-DD. */
const vigente = (data, ini, fim) => (!ini || ini <= data) && (!fim || fim >= data);

/** Classificações às quais o NCM está vinculado na data, com o item do anexo que justifica. */
function classificacoesDoNcm(ncm, data) {
  if (!relacao || !/^\d{8}$/.test(ncm)) return [];
  const porCodigo = new Map();
  for (const [id, prefixo, codigo, ini, fim, anexo] of relacao.regras) {
    if (!ncm.startsWith(prefixo) || !vigente(data, ini, fim)) continue;
    const exc = relacao.excecoes.get(id) || [];
    if (exc.some((e) => ncm.startsWith(e.ncm) && vigente(data, e.ini, e.fim))) continue;
    const a = relacao.anexos[String(anexo)];
    if (!porCodigo.has(codigo)) porCodigo.set(codigo, { codigo, anexos: [] });
    if (a) porCodigo.get(codigo).anexos.push({ numero: a[0], item: a[1], texto: a[2] });
  }
  // só o que existe para CBS/IBS nesta data
  return [...porCodigo.values()].filter((s) => classificacao(s.codigo)).sort((x, y) => x.codigo.localeCompare(y.codigo));
}

/** HTML do <select> de classificações: primeiro as vinculadas ao NCM (sugeridas), depois todas, agrupadas por CST. */
function opcoesClassificacao(selecionada, sugeridas = []) {
  const grupos = new Map();
  if (sugeridas.length) grupos.set("sug", { rotulo: "Vinculadas a este NCM na base oficial", itens: sugeridas.map((s) => classificacao(s.codigo)) });
  for (const c of classificacoes) {
    if (!grupos.has(c.cst)) grupos.set(c.cst, { rotulo: `CST ${c.cst} — ${c.cstDescricao}`, itens: [] });
    grupos.get(c.cst).itens.push(c);
  }
  let marcada = false;
  let html = `<option value="">Escolha a classificação...</option>`;
  if (selecionada && !classificacoes.some((c) => c.codigo === selecionada)) {
    html += `<option value="${esc(selecionada)}" selected>${esc(selecionada)} (não vigente nesta data)</option>`;
  }
  for (const g of grupos.values()) {
    html += `<optgroup label="${esc(g.rotulo)}">` + g.itens.map((c) => {
      const sel = c.codigo === selecionada && !marcada;
      if (sel) marcada = true;
      return `<option value="${esc(c.codigo)}"${sel ? " selected" : ""}>${esc(c.codigo)} · ${esc(c.descricao)}</option>`;
    }).join("") + "</optgroup>";
  }
  return html;
}

/** CST da classificação: vem da base; se a classificação não estiver carregada, são os 3 primeiros dígitos. */
const cstDe = (cClassTrib) => (classificacoes.find((c) => c.codigo === cClassTrib) || {}).cst || String(cClassTrib || "").slice(0, 3);

/** Todos os NCMs vigentes na data (para o autocompletar). */
async function listaNcm(data) {
  return dadoAberto("/ncm/vigentes?data=" + data).catch(() => []);
}
/** Detalhe de um NCM na data: descrição e se paga Imposto Seletivo (com a alíquota, quando a base tiver). */
async function detalheNcm(ncm, data) {
  return dadoAberto(`/ncm?ncm=${encodeURIComponent(ncm)}&data=${data}`).catch(() => null);
}

/* ====================================================================== editor de itens */
/** Item vazio da nota, com um id único na sessão (usado para ligar o item ao seu elemento na tela). */
function novoItem(dados = {}) {
  return {
    descricao: "", tipo: "ncm", codigo: "", cClassTrib: "", valor: "", quantidade: "", unidade: "UN", aliqIS: "",
    ...dados,
    id: estado.seq++,
  };
}

/** Converte uma linha de web/exemplos.js ([descrição, código, cClassTrib, valor, qtd, unidade, IS %, tipo]) em item. */
function itemDeExemplo([descricao, codigo, cClassTrib, valor, quantidade, unidade, aliqIS, tipo]) {
  return novoItem({
    descricao, codigo, cClassTrib, valor, quantidade: quantidade ?? "", unidade: unidade || "UN",
    aliqIS: aliqIS ?? "", tipo: tipo || "ncm",
  });
}

/** Redesenha a lista de itens a partir de estado.itens, reaproveitando o HTML do <select> entre itens iguais. */
function renderizarItens() {
  const lista = $("#lista-itens");
  lista.innerHTML = "";
  $("#itens-vazio").hidden = estado.itens.length > 0;
  const opcoesPorItem = new Map();
  estado.itens.forEach((it, i) => {
    const el = $("#tpl-item").content.firstElementChild.cloneNode(true);
    el.dataset.id = it.id;
    $(".item-num", el).textContent = String(i + 1).padStart(2, "0");
    for (const campo of $$("[data-c]", el)) {
      const c = campo.dataset.c;
      if (c === "cClassTrib") {
        const sug = it.tipo === "ncm" ? classificacoesDoNcm(it.codigo, dataOp()) : [];
        const chave = it.cClassTrib + "|" + sug.map((x) => x.codigo).join(",");
        if (!opcoesPorItem.has(chave)) opcoesPorItem.set(chave, opcoesClassificacao(it.cClassTrib, sug));
        campo.innerHTML = opcoesPorItem.get(chave);
      }
      campo.value = it[c] ?? "";
    }
    atualizarRotulosItem(el, it);
    lista.appendChild(el);
    atualizarDescricaoCodigo(el, it);
  });
}

/** Ajusta o rótulo e o tamanho do campo de código: NCM (mercadoria, 8 dígitos) ou NBS (serviço, 9 dígitos). */
function atualizarRotulosItem(el, it) {
  $(".rot-codigo", el).textContent = it.tipo === "nbs" ? "NBS (9 dígitos)" : "NCM (8 dígitos)";
  $("[data-c=codigo]", el).maxLength = it.tipo === "nbs" ? 9 : 8;
}

/* ---------------------------------------------------------------- Imposto Seletivo (IS)
 * A base oficial marca o IS a partir de 01/01/2027, mas deixa a alíquota em branco: quem usa precisa informá-la.
 * A MP 1.399/2026 (art. 19) fixou as alíquotas de 2027 e determinou que elas só produzem efeitos a partir de
 * 02/02/2027. Entre 01/01 e 01/02/2027 a calculadora oficial ainda exige o grupo do IS; esta tela o envia com
 * alíquota zero, que é o que a MP determina, e avisa. */
const INICIO_IS = "2027-02-02";

/** Alíquotas de 2027 da MP 1.399/2026 para os casos em que o NCM leva a uma alíquota só, sem depender
 *  de teor alcoólico, porte do produtor, cilindrada ou eficiência do veículo. São sugestões: o campo continua
 *  editável e, se um dia a base oficial trouxer a alíquota, ela é usada no lugar desta. */
function sugestaoIS2027(ncm) {
  if (ncm === "22021000") return 2.6; // bebidas açucaradas (águas com açúcar, refrigerantes)
  if (/^2203/.test(ncm)) return 4.2;  // cervejas de malte
  return null;
}

/** Data usada para saber se o produto paga Imposto Seletivo: o IS só existe a partir de 2027. */
const dataReferenciaIS = (d) => (anoDe(d) >= ANO_ALIQ_OBRIGATORIA ? d : `${ANO_ALIQ_OBRIGATORIA}-01-01`);

/** Detalhe do NCM na base oficial se ele paga Imposto Seletivo na data (ou em 2027, para datas anteriores); senão, null. */
async function pagaImpostoSeletivo(ncm, data) {
  if (!/^\d{8}$/.test(ncm)) return null;
  const det = await detalheNcm(ncm, dataReferenciaIS(data));
  return det && det.tributadoPeloImpostoSeletivo ? det : null;
}

/** Depois de digitar o código: mostra a descrição do NCM, atualiza as classificações sugeridas e, se o produto
 *  paga Imposto Seletivo, mostra o campo do IS já preenchido quando houver alíquota oficial ou sugerida. */
async function atualizarDescricaoCodigo(el, it) {
  const desc = $(".desc-codigo", el);
  const caixaIS = $(".caixa.is", el);
  desc.textContent = "";
  caixaIS.hidden = true;
  renderizarAssistente(el, it);
  if (it.tipo !== "ncm" || !/^\d{8}$/.test(it.codigo)) return;
  const d = dataOp();
  const select = $("[data-c=cClassTrib]", el);
  if (document.activeElement !== select) select.innerHTML = opcoesClassificacao(it.cClassTrib, classificacoesDoNcm(it.codigo, d));
  const lista = await listaNcm(d);
  const achado = lista.find((n) => n.ncm === it.codigo);
  desc.textContent = achado ? achado.descricao.replace(/<[^>]+>/g, "") : "NCM não encontrado nesta data";
  // O campo do IS aparece sempre que o produto paga IS (mesmo com a data em 2026): ele é usado nas datas de 2027 em diante
  const det = await pagaImpostoSeletivo(it.codigo, d);
  if (det) {
    caixaIS.hidden = false;
    // Ordem de preferência: o que a pessoa digitou > alíquota da base oficial > sugestão pela MP 1.399/2026
    if (it.aliqIS === "") {
      const oficial = det.aliquotaAdValorem !== null && det.aliquotaAdValorem !== undefined ? det.aliquotaAdValorem : null;
      const sugerida = oficial ?? sugestaoIS2027(it.codigo);
      if (sugerida !== null) {
        it.aliqIS = sugerida;
        $("[data-c=aliqIS]", el).value = it.aliqIS;
        salvar();
      }
    }
    caixaIS.title = anoDe(d) < ANO_ALIQ_OBRIGATORIA
      ? "Não entra no cálculo desta data (o Imposto Seletivo começa em 2027), mas é usado na aba Comparar datas."
      : d < INICIO_IS
        ? "Pela MP 1.399/2026, o Imposto Seletivo só é cobrado a partir de 2 de fevereiro de 2027: nesta data ele entra com alíquota zero."
        : "Alíquota do Imposto Seletivo do produto. Para 2027, veja a MP 1.399/2026 (ex.: bebidas açucaradas 2,6%, cerveja de malte 4,2%).";
  }
}

/** Mostra, abaixo do item, as classificações que a base oficial vincula ao NCM, e avisa sobre combinações inválidas. */
function renderizarAssistente(el, it) {
  const box = $(".assistente-class", el);
  box.innerHTML = "";
  if (it.tipo !== "ncm") {
    if (/^\d{9}$/.test(it.codigo) && !it.cClassTrib) box.innerHTML = `<p>Para serviços, escolha a classificação na lista. Em geral, <code>000001</code> (tributação integral) quando não há benefício.</p>`;
    return;
  }
  if (!/^\d{8}$/.test(it.codigo)) return;
  if (!relacao) {
    box.innerHTML = `<p>Sugestões automáticas indisponíveis nesta instalação. Escolha a classificação na lista.</p>`;
    return;
  }
  const d = dataOp();
  const sug = classificacoesDoNcm(it.codigo, d);
  const integral = classificacao("000001");
  const botao = (codigo, titulo, detalhe, dica) => `<button type="button" class="sug" data-class="${esc(codigo)}" aria-pressed="${it.cClassTrib === codigo}" title="${esc(dica || "")}">
      <code>${esc(codigo)}</code>${esc(titulo)}${detalhe}</button>`;
  let html = "";
  const escolhida = sug.find((s) => s.codigo === it.cClassTrib);
  if (escolhida && !it.verOpcoes) {
    // já escolheu uma classificação vinculada: só confirma, sem ocupar espaço
    const a = escolhida.anexos[0];
    html += `<p class="ok-class">✓ ${esc(it.cClassTrib)} está vinculada a este NCM${a ? ` (Anexo ${esc(a.numero)}, item ${esc(a.item)})` : ""}.
      <button type="button" class="link-btn" data-ver-opcoes>${sug.length > 1 ? `Ver as outras ${sug.length - 1} opções` : "Ver detalhes"}</button></p>`;
  } else if (sug.length) {
    html += `<p>Classificações vinculadas a este NCM na base oficial. Escolha a que corresponde à sua operação:</p><div class="sugs">`;
    for (const s of sug) {
      const c = classificacao(s.codigo);
      const red = c.reducao ? ` <span class="red">redução de ${pct(c.reducao, 0)}</span>` : "";
      const a = s.anexos[0];
      const anexo = a ? `<span class="anexo">Anexo ${esc(a.numero)}, item ${esc(a.item)}: ${esc(a.texto.length > 110 ? a.texto.slice(0, 110) + "…" : a.texto)}</span>` : "";
      html += botao(s.codigo, c.descricao, red + anexo, s.anexos.map((x) => `Anexo ${x.numero}, item ${x.item}: ${x.texto}`).join("\n"));
    }
    if (integral) html += botao("000001", "Tributação integral", `<span class="anexo">quando a operação não se enquadra em nenhum benefício acima</span>`);
    html += `</div>`;
  } else if (integral) {
    if (!it.cClassTrib) {
      it.cClassTrib = "000001";
      const sel = $("[data-c=cClassTrib]", el);
      sel.innerHTML = opcoesClassificacao("000001");
      salvar();
    }
    html += `<p class="${it.cClassTrib === "000001" ? "ok-class" : ""}">Este NCM não tem benefício vinculado na base oficial, então o normal é <code>000001</code> (tributação integral). Mude só se a operação tiver outro tratamento, por exemplo imunidade ou exportação.</p>`;
  }
  // classificação escolhida que exige uma lista de NCMs da qual este não faz parte → a calculadora recusa (REG-011)
  if (it.cClassTrib && relacao.comLista.has(it.cClassTrib) && !sug.some((s) => s.codigo === it.cClassTrib)) {
    html += `<p class="alerta-class">A classificação ${esc(it.cClassTrib)} vale só para os NCMs listados no anexo dela, e este NCM não está na lista. A calculadora vai recusar o item (erro REG-011).</p>`;
  }
  box.innerHTML = html;
}

/** Item de estado.itens correspondente a um elemento .item da tela. */
function itemDoElemento(el) {
  return estado.itens.find((i) => String(i.id) === el.dataset.id);
}

/** Eventos da lista de itens (delegação: um ouvinte para todos os itens): digitação, troca de tipo ou de
 *  classificação, clique numa sugestão e remoção. */
function ligarEditor() {
  const lista = $("#lista-itens");
  lista.addEventListener("input", (ev) => {
    const el = ev.target.closest(".item");
    const c = ev.target.dataset.c;
    if (!el || !c) return;
    const it = itemDoElemento(el);
    it[c] = ev.target.value;
    ev.target.closest(".caixa")?.classList.remove("invalida");
    if (c === "codigo") {
      ev.target.value = it.codigo = ev.target.value.replace(/\D/g, "");
      sugerirNcm(ev.target, it);
      atualizarDescricaoCodigo(el, it);
    }
    salvar();
  });
  lista.addEventListener("change", (ev) => {
    const el = ev.target.closest(".item");
    if (!el) return;
    const it = itemDoElemento(el);
    if (ev.target.dataset.c === "tipo") {
      it.tipo = ev.target.value;
      atualizarRotulosItem(el, it);
      atualizarDescricaoCodigo(el, it);
    }
    if (ev.target.dataset.c === "cClassTrib") renderizarAssistente(el, it);
    salvar();
  });
  lista.addEventListener("click", (ev) => {
    if (ev.target.closest("[data-ver-opcoes]")) {
      const el = ev.target.closest(".item");
      const it = itemDoElemento(el);
      it.verOpcoes = true;
      renderizarAssistente(el, it);
      return;
    }
    const sug = ev.target.closest(".sug");
    if (sug) {
      const el = sug.closest(".item");
      const it = itemDoElemento(el);
      it.cClassTrib = sug.dataset.class;
      it.verOpcoes = false;
      const select = $("[data-c=cClassTrib]", el);
      select.innerHTML = opcoesClassificacao(it.cClassTrib, classificacoesDoNcm(it.codigo, dataOp()));
      select.closest(".caixa").classList.remove("invalida");
      renderizarAssistente(el, it);
      salvar();
      return;
    }
    if (!ev.target.classList.contains("remover")) return;
    const el = ev.target.closest(".item");
    estado.itens = estado.itens.filter((i) => String(i.id) !== el.dataset.id);
    renderizarItens();
    salvar();
  });
  lista.addEventListener("focusout", () => setTimeout(() => { if (!document.activeElement?.closest("#sugestoes")) fecharSugestoes(); }, 150));
}

/* ---------------------------------------------------------------- autocompletar NCM */
let sugestaoAlvo = null;
/** Autocompletar do NCM: lista até 40 códigos que começam com o que foi digitado. */
async function sugerirNcm(input, it) {
  if (it.tipo !== "ncm" || input.value.length < 2) return fecharSugestoes();
  const lista = await listaNcm(dataOp());
  const q = input.value;
  const achados = lista.filter((n) => n.ncm.startsWith(q)).slice(0, 40);
  if (!achados.length || (achados.length === 1 && achados[0].ncm === q)) return fecharSugestoes();
  mostrarSugestoes(input, achados, (n) => {
    input.value = n.ncm;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    if (!it.descricao) {
      const el = input.closest(".item");
      it.descricao = n.descricao.replace(/<[^>]+>/g, "").replace(/^[-\s]+/, "").slice(0, 80);
      $("[data-c=descricao]", el).value = it.descricao;
    }
    fecharSugestoes();
    salvar();
  });
}

/** Caixa flutuante de sugestões, posicionada logo abaixo do campo. */
function mostrarSugestoes(input, achados, escolher) {
  const box = $("#sugestoes");
  const r = input.getBoundingClientRect();
  box.style.left = window.scrollX + r.left + "px";
  box.style.top = window.scrollY + r.bottom + 4 + "px";
  box.innerHTML = achados.map((n, i) => `<div role="option" data-i="${i}"><code>${esc(n.ncm)}</code>${esc(n.descricao.replace(/<[^>]+>/g, ""))}</div>`).join("");
  box.hidden = false;
  sugestaoAlvo = { input, achados, escolher, sel: -1 };
  box.onmousedown = (ev) => {
    const d = ev.target.closest("[data-i]");
    if (d) { ev.preventDefault(); escolher(achados[Number(d.dataset.i)]); }
  };
}
function fecharSugestoes() { $("#sugestoes").hidden = true; sugestaoAlvo = null; }
document.addEventListener("keydown", (ev) => {
  if (!sugestaoAlvo || $("#sugestoes").hidden) return;
  const s = sugestaoAlvo, itens = $$("#sugestoes [data-i]");
  if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
    ev.preventDefault();
    s.sel = Math.max(0, Math.min(itens.length - 1, s.sel + (ev.key === "ArrowDown" ? 1 : -1)));
    itens.forEach((d, i) => d.setAttribute("aria-selected", i === s.sel));
    itens[s.sel]?.scrollIntoView({ block: "nearest" });
  } else if (ev.key === "Enter" && s.sel >= 0) {
    ev.preventDefault();
    s.escolher(s.achados[s.sel]);
  } else if (ev.key === "Escape") fecharSugestoes();
});

/* ====================================================================== montagem da requisição */
/** Arredonda para 2 casas (centavos), meio para cima. EPSILON corrige casos como 1.005 → 1.01. */
const arred2 = (v) => Math.round((v + Number.EPSILON) * 100) / 100;

/** Valida os itens e devolve o JSON no formato da calculadora oficial (POST /calculadora/regime-geral).
 *
 *  Estrutura enviada (os nomes são os da API oficial):
 *    { id, versao, dhFatoGerador, uf, municipio, itens: [ { numero, ncm|nbs, cst, cClassTrib, baseCalculo,
 *      quantidade?, unidade?, aliquotasNominais?, impostoSeletivo? } ] }
 *  - Até 2026 as alíquotas vêm da base oficial e "aliquotasNominais" não é enviado.
 *  - De 2027 em diante a API exige "aliquotasNominais" (CBS, IBS estadual, IBS municipal) e marca o
 *    resultado como CALCULO_SIMULADO.
 *  - Produto com IS: envia-se o grupo "impostoSeletivo" com a base e o valor do IS, e NÃO a base de CBS/IBS;
 *    a calculadora oficial monta essa base como base do IS + IS (o IS entra na base da CBS e do IBS).
 *
 *  opcoes: { aliquotas, bases, aliqIS, uf, municipio } — usadas pelas abas Comparar e Antes e depois,
 *  que trocam as alíquotas, as bases ou o local sem mexer no que está na tela.
 *  Devolve { erros, avisos, operacao }: com erros a operação não deve ser enviada; avisos são só informativos. */
async function montarOperacao(data, opcoes = {}) {
  const ano = anoDe(data);
  const erros = [];
  const avisos = [];
  let aliq = null;
  if (ano >= ANO_ALIQ_OBRIGATORIA) {
    aliq = opcoes.aliquotas || {
      cbs: num($("#aliq-cbs").value), ibsEstadual: num($("#aliq-ibsuf").value), ibsMunicipal: num($("#aliq-ibsmun").value),
    };
    if (aliq.cbs === null || aliq.ibsEstadual === null || aliq.ibsMunicipal === null) erros.push("Informe as alíquotas de CBS e IBS (obrigatórias a partir de 2027).");
  }
  const itens = [];
  for (const [i, it] of estado.itens.entries()) {
    const n = i + 1;
    const rot = `Item ${n}${it.descricao ? " (" + it.descricao + ")" : ""}`;
    const tam = it.tipo === "nbs" ? 9 : 8;
    if (!new RegExp(`^\\d{${tam}}$`).test(it.codigo)) erros.push(`${rot}: o ${it.tipo.toUpperCase()} deve ter ${tam} dígitos.`);
    if (!/^\d{6}$/.test(it.cClassTrib)) erros.push(`${rot}: escolha a classificação tributária.`);
    if (num(it.valor) === null || num(it.valor) < 0) erros.push(`${rot}: informe o valor.`);
    // A aba "Antes e depois" envia bases calculadas (valor sem os tributos atuais); as outras usam o valor digitado
    const valor = opcoes.bases ? opcoes.bases[i] : num(it.valor);
    const qtd = num(it.quantidade);
    if (qtd !== null && qtd <= 0) erros.push(`${rot}: a quantidade deve ser maior que zero.`);

    const item = { numero: n, cst: cstDe(it.cClassTrib), cClassTrib: it.cClassTrib };
    item[it.tipo] = it.codigo;
    item.baseCalculo = valor;
    if (qtd !== null) { item.quantidade = qtd; item.unidade = it.unidade || "UN"; }

    if (aliq) {
      item.aliquotasNominais = { cbs: aliq.cbs, ibsEstadual: aliq.ibsEstadual, ibsMunicipal: aliq.ibsMunicipal };
      if (it.tipo === "ncm" && /^\d{8}$/.test(it.codigo)) {
        const det = await pagaImpostoSeletivo(it.codigo, data);
        if (det) {
          let a = opcoes.aliqIS ? opcoes.aliqIS[i] : num(it.aliqIS);
          if (a === null && det.aliquotaAdValorem !== null && det.aliquotaAdValorem !== undefined) a = Number(det.aliquotaAdValorem);
          if (a === null) a = sugestaoIS2027(it.codigo);
          if (data < INICIO_IS) {
            // MP 1.399/2026, art. 19: o IS só produz efeitos a partir de 02/02/2027. A calculadora oficial exige o
            // grupo do IS desde 01/01/2027; mandamos alíquota zero para que ela calcule CBS e IBS sem o IS.
            if (a) avisos.push(`${rot}: o Imposto Seletivo só é cobrado a partir de 2 de fevereiro de 2027 (MP 1.399/2026, art. 19). Nesta data ele entrou com alíquota zero.`);
            a = 0;
          }
          if (a === null) {
            erros.push(`${rot}: este produto paga Imposto Seletivo a partir de 2027. Informe a alíquota no campo "Imposto Seletivo %" do item (para 2027, veja a MP 1.399/2026: bebidas açucaradas 2,6%, cerveja de malte 4,2%...).`);
          } else if (valor !== null) {
            const imposto = arred2(valor * a / 100);
            delete item.baseCalculo; // a calculadora soma base do IS + IS para chegar à base de CBS/IBS
            item.impostoSeletivo = {
              cst: "000", cClassTrib: "000001", baseCalculo: valor, impostoInformado: imposto,
              ...(qtd !== null ? { quantidade: qtd, unidade: it.unidade || "UN" } : {}),
            };
            item.aliquotasNominais.impostoSeletivo = { adValorem: a };
          }
        }
      }
    }
    itens.push(item);
  }
  if (!itens.length) erros.push("Adicione pelo menos um item.");
  const uf = opcoes.uf || $("#op-uf").value, mun = Number(opcoes.municipio || $("#op-mun").value);
  if (!mun) erros.push("Escolha o município.");
  return {
    erros,
    avisos,
    operacao: {
      id: "calc-rtc-facil-" + Date.now(),
      versao: "1.0.0",
      dhFatoGerador: `${data}T12:00:00-03:00`,
      municipio: mun,
      uf,
      itens,
    },
  };
}

/* ====================================================================== interpretação da resposta */
/** Número de um campo da resposta (que pode vir ausente). */
const n2 = (v) => Number(v || 0);

/** Lê a resposta da calculadora oficial e devolve, por item: base (vBC), alíquota e valor da CBS, valor do IBS
 *  (estadual + municipal), IS, redução, alíquota efetiva, memória de cálculo e erros; e os totais da nota.
 *  Caminhos na resposta: objetos[].tribCalc.IBSCBS.gIBSCBS.{vBC, gCBS, gIBSUF, gIBSMun, vIBS} e objetos[].tribCalc.IS.
 *  Desde a versão oficial 1.7.2, cada total é a soma dos valores exibidos nos itens (sem diferença de centavos). */
function interpretar(resposta, operacao) {
  const itens = (resposta.objetos || []).map((o) => {
    const env = operacao.itens.find((i) => i.numero === o.nObj) || {};
    const orig = estado.itens[o.nObj - 1] || {};
    const ibscbs = o.tribCalc?.IBSCBS;
    const g = ibscbs?.gIBSCBS || {};
    const is = o.tribCalc?.IS;
    const memorias = [];
    for (const m of [is?.memoriaCalculo, g.gCBS?.memoriaCalculo, g.gIBSUF?.memoriaCalculo, g.gIBSMun?.memoriaCalculo]) if (m && !memorias.includes(m)) memorias.push(m);
    const valor = env.impostoSeletivo ? n2(env.impostoSeletivo.baseCalculo) : n2(env.baseCalculo);
    return {
      numero: o.nObj,
      descricao: orig.descricao || "",
      codigo: env.ncm || env.nbs || "",
      cClassTrib: env.cClassTrib,
      valor,
      estado: o.estadoItem || (ibscbs || is ? "CALCULADO" : "—"),
      erros: o.erros || [],
      vBC: n2(g.vBC),
      pCBS: n2(g.gCBS?.pCBS),
      red: n2(g.gCBS?.gRed?.pRedAliq),
      pEfet: g.gCBS?.gRed ? n2(g.gCBS.gRed.pAliqEfet) : n2(g.gCBS?.pCBS),
      cbs: n2(g.gCBS?.vCBS),
      ibs: n2(g.vIBS ?? (n2(g.gIBSUF?.vIBSUF) + n2(g.gIBSMun?.vIBSMun))),
      is: n2(is?.vIS),
      pIS: is ? n2(is.pIS) : null,
      memorias,
    };
  });
  const soma = (k) => arred2(itens.reduce((a, i) => a + (i.erros.length ? 0 : i[k]), 0));
  const tot = { valor: soma("valor"), cbs: soma("cbs"), ibs: soma("ibs"), is: soma("is") };
  const t = resposta.total?.tribCalc;
  if (t?.IBSCBSTot) {
    tot.cbs = n2(t.IBSCBSTot.gCBS?.vCBS ?? tot.cbs);
    tot.ibs = n2(t.IBSCBSTot.gIBS?.vIBS ?? tot.ibs);
  }
  if (t?.ISTot) tot.is = n2(t.ISTot.vIS);
  tot.tributos = arred2(tot.cbs + tot.ibs + tot.is);
  return { itens, tot, comErro: itens.filter((i) => i.erros.length).length };
}

/** Situação de cada item na resposta oficial → texto e cor do selo. CALCULO_SIMULADO = usou alíquotas informadas. */
const nomeEstado = {
  CALCULADO: ["Calculado", "ok"], CALCULO_SIMULADO: ["Simulado", "sim"], INCONSISTENCIA_ENTRADA: ["Erro nos dados", "erro"],
  NAO_IMPLEMENTADO: ["Não implementado", "erro"], FALHA_TECNICA: ["Falha técnica", "erro"],
};
const selo = (e) => { const [t, c] = nomeEstado[e] || [e, ""]; return `<span class="selo ${c}">${esc(t)}</span>`; };

/* ====================================================================== calcular */
/** Botão Calcular: monta a operação, chama a rota de observabilidade (que devolve também a memória de cálculo)
 *  e mostra o cupom e o detalhamento. */
async function calcular() {
  const st = $("#calc-status");
  const btn = $("#btn-calcular");
  $$(".caixa.invalida").forEach((c) => c.classList.remove("invalida"));
  st.className = "calc-status";
  st.textContent = "Calculando...";
  btn.disabled = true;
  try {
    const data = dataOp();
    const { erros, avisos, operacao } = await montarOperacao(data);
    if (erros.length) {
      st.className = "calc-status erro";
      st.textContent = erros[0] + (erros.length > 1 ? ` (+${erros.length - 1} pendência${erros.length > 2 ? "s" : ""})` : "");
      marcarInvalidos();
      return;
    }
    const r = await api("/observabilidade/regime-geral", { method: "POST", body: JSON.stringify(operacao) });
    const resultado = interpretar(r.corpo, operacao);
    estado.ultimoCalculo = { enviado: operacao, recebido: r.corpo, resultado, aviso: r.cabecalhos.get("x-warning-dados-simulados"), data };
    renderizarCupom(estado.ultimoCalculo);
    renderizarDetalhe(resultado);
    st.textContent = resultado.comErro ? `${resultado.comErro} item(ns) com erro — veja o detalhamento.` : "Pronto.";
    if (avisos.length) st.textContent += " " + avisos[0] + (avisos.length > 1 ? ` (o mesmo vale para mais ${avisos.length - 1} item(ns))` : "");
    if (resultado.comErro) st.className = "calc-status erro";
  } catch (e) {
    st.className = "calc-status erro";
    st.textContent = e.message;
    estado.ultimoCalculo = { enviado: null, recebido: e.corpo || e.message };
  } finally {
    btn.disabled = false;
  }
}

/** Marca em vermelho os campos que impediram o cálculo. */
function marcarInvalidos() {
  for (const el of $$("#lista-itens .item")) {
    const it = itemDoElemento(el);
    const tam = it.tipo === "nbs" ? 9 : 8;
    if (!new RegExp(`^\\d{${tam}}$`).test(it.codigo)) $("[data-c=codigo]", el).closest(".caixa").classList.add("invalida");
    if (!/^\d{6}$/.test(it.cClassTrib)) $("[data-c=cClassTrib]", el).closest(".caixa").classList.add("invalida");
    if (num(it.valor) === null) $("[data-c=valor]", el).closest(".caixa").classList.add("invalida");
    const cis = $(".caixa.is", el);
    if (!cis.hidden && num(it.aliqIS) === null) cis.classList.add("invalida");
  }
}

/** Cupom-resumo: valor dos itens, CBS, IBS, IS e a proporção dos tributos novos sobre o valor. */
function renderizarCupom({ resultado: r, data, aviso }) {
  const uf = $("#op-uf").value;
  const mun = $("#op-mun").selectedOptions[0]?.textContent || "";
  const t = r.tot;
  const carga = t.valor ? (t.tributos / t.valor) * 100 : 0;
  const linhas = r.itens.map((i) => `
    <div class="linha"><span>${String(i.numero).padStart(2, "0")} ${esc((i.descricao || i.codigo).slice(0, 22))}</span><span>${brl(i.valor)}</span></div>`).join("");
  $("#cupom").className = "cupom";
  $("#cupom").innerHTML = `
    <h2>SIMULAÇÃO DE TRIBUTOS</h2>
    <p class="sub">${esc(mun)} / ${esc(uf)} — ${new Date(data + "T12:00").toLocaleDateString("pt-BR")}</p>
    <hr>${linhas}<hr>
    <div class="linha"><span>Valor dos itens</span><span>${brl(t.valor)}</span></div>
    <div class="linha cbs"><span>CBS (federal)</span><span>${brl(t.cbs)}</span></div>
    <div class="linha"><span>IBS (estado + município)</span><span>${brl(t.ibs)}</span></div>
    ${t.is || anoDe(data) >= 2027 ? `<div class="linha is"><span>Imposto Seletivo</span><span>${brl(t.is)}</span></div>` : ""}
    <hr>
    <div class="linha total"><span>Tributos novos</span><span>${brl(t.tributos)}</span></div>
    <div class="carga">${pct(carga)} do valor dos itens</div>
    ${aviso || r.itens.some((i) => i.estado === "CALCULO_SIMULADO") ? `<p class="alerta">Cálculo simulado: usa alíquotas informadas, ainda não definitivas.</p>` : ""}
    ${r.comErro ? `<p class="alerta erro">${r.comErro} item(ns) não entraram no total por erro nos dados.</p>` : ""}
    <p class="sub">Calculado pela calculadora oficial da Receita Federal</p>`;
  $("#cupom-acoes").hidden = false;
}

/** Tabela por item; clicar numa linha mostra a memória de cálculo devolvida pela calculadora oficial. */
function renderizarDetalhe(r) {
  const tab = $("#tab-detalhe");
  const temIS = r.itens.some((i) => i.is || i.pIS !== null);
  let html = `<thead><tr><th>#</th><th>Item</th><th>Código</th><th>cClassTrib</th><th class="n">Valor</th>
    <th class="n">Redução</th><th class="n">CBS efetiva</th><th class="n">CBS</th><th class="n">IBS</th>${temIS ? '<th class="n">IS</th>' : ""}<th>Situação</th></tr></thead><tbody>`;
  for (const i of r.itens) {
    html += `<tr class="clicavel" data-n="${i.numero}" title="Clique para ver a memória de cálculo">
      <td>${i.numero}</td><td>${esc(i.descricao)}</td><td>${esc(i.codigo)}</td><td>${esc(i.cClassTrib)}</td>
      <td class="n">${brl(i.valor)}</td><td class="n">${i.erros.length ? "—" : pct(i.red)}</td>
      <td class="n">${i.erros.length ? "—" : pct(i.pEfet)}</td><td class="n">${brl(i.cbs)}</td><td class="n">${brl(i.ibs)}</td>
      ${temIS ? `<td class="n">${i.pIS !== null ? brl(i.is) : "—"}</td>` : ""}<td>${selo(i.estado)}</td></tr>
      <tr class="memoria" data-m="${i.numero}" hidden><td></td><td colspan="${temIS ? 10 : 9}">
        ${i.erros.map((e) => `<p class="erro-item"><strong>${esc(e.code || "")} ${esc(e.title || "")}</strong> — ${esc(e.detail || "")}</p>`).join("")}
        ${i.memorias.map((m) => `<p>${esc(m)}</p>`).join("") || (i.erros.length ? "" : "<p>Sem memória de cálculo.</p>")}
      </td></tr>`;
  }
  const t = r.tot;
  html += `</tbody><tfoot><tr><td></td><td colspan="3">Total</td><td class="n">${brl(t.valor)}</td><td></td><td></td>
    <td class="n">${brl(t.cbs)}</td><td class="n">${brl(t.ibs)}</td>${temIS ? `<td class="n">${brl(t.is)}</td>` : ""}<td></td></tr></tfoot>`;
  tab.innerHTML = html;
  r.itens.filter((i) => i.erros.length).forEach((i) => { tab.querySelector(`tr[data-m="${i.numero}"]`).hidden = false; });
  $("#detalhe-itens").hidden = false;
}

/* ====================================================================== comparar */
/** AAAA-MM-DD → DD/MM/AAAA. O T12:00 evita que o fuso horário mude o dia. */
const fmtData = (d) => new Date(String(d).slice(0, 10) + "T12:00").toLocaleDateString("pt-BR");
const ladosCmp = { a: "#cmp-a", b: "#cmp-b" };
const refAliqCmp = {}; // lado -> chave (data|uf|mun) das alíquotas já preenchidas

/** Atualiza o resumo da nota (que vem da aba Calcular), as alíquotas de cada data e o quadro do IS. */
async function renderizarPainelComparacao() {
  const uf = $("#op-uf").value, munNome = $("#op-mun").selectedOptions[0]?.textContent || "", mun = $("#op-mun").value;
  const total = estado.itens.reduce((a, i) => a + (num(i.valor) || 0), 0);
  $("#cmp-resumo").innerHTML = estado.itens.length
    ? `<strong>${estado.itens.length} ${estado.itens.length === 1 ? "item" : "itens"}</strong> · ${esc(munNome)} / ${esc(uf)} · ${brl(total)}`
    : `Nenhum item na nota. Adicione itens na aba <strong>Calcular nota</strong>.`;
  $("#cmp-itens").innerHTML = `<thead><tr><th>#</th><th>Item</th><th>Código</th><th>Classificação</th><th class="n">Valor</th></tr></thead><tbody>`
    + estado.itens.map((i, n) => `<tr><td>${n + 1}</td><td>${esc(i.descricao)}</td><td>${esc(i.codigo)}</td>
      <td>${esc(i.cClassTrib)} ${esc((classificacao(i.cClassTrib) || {}).descricao || "")}</td><td class="n">${brl(i.valor)}</td></tr>`).join("") + "</tbody>";

  let algumaPos2027 = false;
  for (const [lado, sel] of Object.entries(ladosCmp)) {
    const d = $(sel).value;
    const box = $(`.cmp-data[data-lado="${lado}"] .cmp-aliq`);
    box.hidden = !d;
    if (!d) continue;
    if (anoDe(d) < ANO_ALIQ_OBRIGATORIA) {
      box.innerHTML = `<p class="cmp-sem-aliq">Antes de 2027 as alíquotas vêm da base oficial. Não há nada a informar.</p>`;
      delete refAliqCmp[lado];
      continue;
    }
    algumaPos2027 = true;
    const chave = `${d}|${uf}|${mun}`;
    if (refAliqCmp[lado] !== chave) {
      const ref = await aliquotasReferencia(d, uf, mun);
      refAliqCmp[lado] = chave;
      box.innerHTML = `<div class="campos">
          <label class="caixa"><span>CBS %</span><input type="number" step="0.0001" min="0" data-aliq="cbs" value="${ref.cbs ?? ""}"></label>
          <label class="caixa"><span>IBS estadual %</span><input type="number" step="0.0001" min="0" data-aliq="ibsEstadual" value="${ref.ibsEstadual ?? ""}"></label>
          <label class="caixa"><span>IBS municipal %</span><input type="number" step="0.0001" min="0" data-aliq="ibsMunicipal" value="${ref.ibsMunicipal ?? ""}"></label>
        </div>
        <p class="nota">Obrigatórias a partir de 2027. ${notaAliquotas(ref, d)}</p>`;
    }
  }

  // Imposto Seletivo: o valor fica no item (compartilhado com a aba Calcular nota)
  const blocoIS = $("#cmp-bloco-is");
  const itensIS = [];
  if (algumaPos2027) {
    for (const it of estado.itens) {
      if (it.tipo === "ncm" && await pagaImpostoSeletivo(it.codigo, $(ladosCmp.b).value || dataOp())) itensIS.push(it);
    }
  }
  blocoIS.hidden = !itensIS.length;
  $("#cmp-is").innerHTML = itensIS.map((it) => `<label class="caixa is"><span>${esc(it.descricao || it.codigo)} — IS %</span>
      <input type="number" step="0.01" min="0" data-is="${it.id}" value="${esc(it.aliqIS)}" placeholder="estimativa"></label>`).join("");
}

/** Alíquotas digitadas no quadro de um lado da comparação (a, b) ou do cenário Depois (ad). */
function aliquotasDoLado(lado) {
  const box = $(`.cmp-data[data-lado="${lado}"] .cmp-aliq`);
  const v = (k) => num($(`[data-aliq="${k}"]`, box)?.value);
  return { cbs: v("cbs"), ibsEstadual: v("ibsEstadual"), ibsMunicipal: v("ibsMunicipal") };
}

/** Calcula a mesma nota em duas datas pela calculadora oficial e mostra a diferença dos tributos novos, item a item. */
async function comparar() {
  const st = $("#cmp-status");
  const a = $("#cmp-a").value, b = $("#cmp-b").value;
  st.className = "calc-status erro";
  if (!a || !b) { st.textContent = "Escolha as duas datas."; return; }
  if (!estado.itens.length) { st.textContent = "A nota está vazia. Adicione itens na aba Calcular nota."; return; }
  await renderizarPainelComparacao();
  st.className = "calc-status";
  st.textContent = "Calculando as duas datas...";
  $("#btn-comparar").disabled = true;
  const avisosCmp = [];
  try {
    // Calcula a mesma nota numa data, com as alíquotas do quadro daquele lado (a ou b)
    const rodar = async (d, lado) => {
      let aliquotas = null;
      if (anoDe(d) >= ANO_ALIQ_OBRIGATORIA) {
        aliquotas = aliquotasDoLado(lado);
        if (aliquotas.cbs === null || aliquotas.ibsEstadual === null || aliquotas.ibsMunicipal === null) {
          throw new Error(`Preencha as alíquotas de ${fmtData(d)} no quadro "Datas e alíquotas", acima.`);
        }
      }
      const { erros, avisos, operacao } = await montarOperacao(d, { aliquotas });
      if (erros.length) {
        const msg = erros[0].replace(`no campo "Imposto Seletivo %" do item`, `no quadro "Imposto Seletivo", acima,`);
        throw new Error(`Em ${fmtData(d)}: ${msg}`);
      }
      if (avisos.length) avisosCmp.push(`Em ${fmtData(d)}: ${avisos[0]}`);
      const r = await api("/observabilidade/regime-geral", { method: "POST", body: JSON.stringify(operacao) });
      return interpretar(r.corpo, operacao);
    };
    const [ra, rb] = await Promise.all([rodar(a, "a"), rodar(b, "b")]);
    estado.ultimaComparacao = { a, b, ra, rb };
    renderizarComparacao(a, b, ra, rb);
    st.textContent = avisosCmp.join(" ");
    salvar();
  } catch (e) {
    st.className = "calc-status erro";
    st.textContent = e.message;
  } finally {
    $("#btn-comparar").disabled = false;
  }
}

/** Cartões com o total de cada data e a tabela por item, com barras proporcionais ao maior valor. */
function renderizarComparacao(a, b, ra, rb) {
  const fmt = (d) => new Date(d + "T12:00").toLocaleDateString("pt-BR");
  const card = (d, r) => `<div class="cmp-card"><h3>${fmt(d)}</h3><div class="valor">${brl(r.tot.tributos)}</div>
    <div class="det">CBS ${brl(r.tot.cbs)} · IBS ${brl(r.tot.ibs)}${r.tot.is ? " · IS " + brl(r.tot.is) : ""}<br>
    ${pct(r.tot.valor ? r.tot.tributos / r.tot.valor * 100 : 0)} do valor dos itens${r.comErro ? ` · <span class="mais">${r.comErro} com erro</span>` : ""}</div></div>`;
  const dif = rb.tot.tributos - ra.tot.tributos;
  const maxT = Math.max(...ra.itens.map((i) => i.cbs + i.ibs + i.is), ...rb.itens.map((i) => i.cbs + i.ibs + i.is), 0.01);
  let linhas = "";
  for (const ia of ra.itens) {
    const ib = rb.itens.find((x) => x.numero === ia.numero) || { cbs: 0, ibs: 0, is: 0, erros: [] };
    const ta = ia.cbs + ia.ibs + ia.is, tb = ib.cbs + ib.ibs + ib.is, d = tb - ta;
    linhas += `<tr><td>${ia.numero}</td><td>${esc(ia.descricao || ia.codigo)}</td><td class="n">${brl(ia.valor)}</td>
      <td class="n">${ia.erros.length ? '<span class="mais">erro</span>' : brl(ta)}</td><td><div class="barra-cmp"><span style="width:${ta / maxT * 100}%"></span></div></td>
      <td class="n">${ib.erros.length ? '<span class="mais">erro</span>' : brl(tb)}</td><td><div class="barra-cmp b"><span style="width:${tb / maxT * 100}%"></span></div></td>
      <td class="n ${d > 0.004 ? "mais" : d < -0.004 ? "menos" : ""}">${d > 0.004 ? "+" : ""}${brl(d)}</td></tr>`;
  }
  $("#cmp-resultado").innerHTML = `
    <div class="cmp-cards">${card(a, ra)}${card(b, rb)}
      <div class="cmp-card"><h3>Diferença</h3><div class="valor ${dif > 0 ? "mais" : dif < 0 ? "menos" : ""}">${dif > 0 ? "+" : ""}${brl(dif)}</div>
      <div class="det">nos tributos novos da nota, de uma data para a outra</div></div></div>
    <div class="tabela-rolagem"><table><thead><tr><th>#</th><th>Item</th><th class="n">Valor</th>
      <th class="n">${fmt(a)}</th><th></th><th class="n">${fmt(b)}</th><th></th><th class="n">Diferença</th></tr></thead>
      <tbody>${linhas}</tbody></table></div>`;
}

/* ====================================================================== antes e depois da reforma
 * Os tributos NOVOS (CBS, IBS, IS) vêm da calculadora oficial. Os ATUAIS (PIS/Cofins, ICMS/ISS, FCP, IPI)
 * são estimados aqui, a partir de alíquotas padrão editáveis. P = preço de venda de hoje.
 *
 * Venda da INDÚSTRIA (ou serviço): tudo é destacado na própria venda.
 *   hoje:   ICMS = i·P (por dentro, i = ICMS + FCP) · PIS/Cofins = c·(P − ICMS) (STF, Tema 69; c = monofásico se marcado)
 *           A = P·(1−i)(1−c) · L (valor sem tributos) = A/(1+ipi) · IPI = L·ipi · base CBS/IBS de teste = A
 *   depois: IS = L·is · A' = L + IS
 * Venda do COMÉRCIO: IPI, IS e PIS/Cofins monofásico incidem uma vez, na indústria, sobre o preço de fábrica F;
 *   o ICMS-ST foi pago antecipado pela indústria. Tudo isso chega embutido no custo.
 *   hoje:   F = f·P · IPI = F·ipi · PIS/Cofins mono = m·F · ICMS = i·P · PIS/Cofins do comércio = c·(P − ICMS) (zero se mono)
 *           L = P − ICMS − PIS/Cofins − mono − IPI · base CBS/IBS de teste = P − ICMS − PIS/Cofins do comércio
 *   depois: IS = F·is (embutido) · A' = L + IS
 * Depois, nos dois casos: base CBS/IBS = A' (sem ICMS/ISS, com IS) · ICMS = i'·(A' [+ CBS + IBS]) / (1 − i'),
 *   i' = i × fator da transição · preço = A' + ICMS + CBS + IBS (CBS e IBS por fora)                               */

// Alíquota geral (modal) do ICMS em 2026, sem fundo de pobreza. Fonte: buscadorncm.com.br/icms (conferido em 16/11/2026).
const ICMS_MODAL_2026 = {
  AC: 19, AL: 20.5, AM: 20, AP: 18, BA: 20.5, CE: 20, DF: 20, ES: 17, GO: 19, MA: 23, MG: 18, MS: 17, MT: 17, PA: 19,
  PB: 20, PE: 20.5, PI: 22.5, PR: 19.5, RJ: 20, RN: 20, RO: 19.5, RR: 20, RS: 17, SC: 17, SE: 19, SP: 18, TO: 20,
};
const CLASSIF_PISCOFINS_ZERO = new Set(["200003", "200014"]); // cesta básica e hortifrúti: PIS/Cofins zero é comum (Lei 10.925/2004)

/** PIS/Cofins monofásico típico por NCM (alíquota somada, cobrada na indústria). */
function monofasicoPadrao(ncm) {
  if (/^220[123]/.test(ncm)) return 13;                       // bebidas frias: 2,32% + 10,68% (Lei 13.097/2015)
  if (/^330[3-7]/.test(ncm) || /^3401(1190|2010)/.test(ncm) || /^96032100/.test(ncm)) return 12.5; // perfumaria e higiene: 2,2% + 10,3% (Lei 10.147/2000)
  if (/^300[34]/.test(ncm)) return 12;                        // medicamentos: 2,1% + 9,9% (Lei 10.147/2000)
  return null;
}
const stPadrao = (ncm) => /^220[123]/.test(ncm); // bebidas: ICMS-ST é comum em todos os estados

/** Simples Nacional: parte de cada tributo sobre o consumo dentro do DAS, na 1ª faixa.
 *  Hoje (LC 123/2006, Anexos I a III): pc = PIS + Cofins, icms = ICMS (ou ISS no Anexo III), ipi = IPI.
 *    Anexo I: Cofins 12,74% + PIS 2,76% = 15,50%; ICMS 34%. Anexo II: Cofins 11,51% + PIS 2,49% = 14,00%; IPI 7,5%;
 *    ICMS 32%. Anexo III: Cofins 12,82% + PIS 2,78% = 15,60%; ISS 33,5%.
 *  2027 e 2028 (LC 214/2025, Anexos XVIII, XIX e XX, que reescrevem os Anexos I a III da LC 123): a parte de
 *    PIS/Cofins vira CBS + um pouco de IBS — Anexo I 15,33% + 0,17%, Anexo II 13,85% + 0,15%, Anexo III 15,43% + 0,17%.
 *  2029 a 2032: a CBS volta a ocupar toda a antiga parte de PIS/Cofins e o IBS absorve 10% por ano da parte do
 *    ICMS/ISS (ex.: Anexo I em 2029: CBS 15,50%, ICMS 30,60%, IBS 3,40%). Em 2033 o ICMS/ISS sai do DAS.
 *  A alíquota total do Simples não muda: só a divisão interna (a "partilha"). */
const PARTILHA_SN = {
  I: { nome: "Anexo I (comércio)", aliqFaixa1: 4, pc: 0.155, icms: 0.34, ipi: 0, cbs27: 0.1533, ibs27: 0.0017 },
  II: { nome: "Anexo II (indústria)", aliqFaixa1: 4.5, pc: 0.14, icms: 0.32, ipi: 0.075, cbs27: 0.1385, ibs27: 0.0015 },
  III: { nome: "Anexo III (serviços)", aliqFaixa1: 6, pc: 0.156, icms: 0.335, ipi: 0, cbs27: 0.1543, ibs27: 0.0017 },
};
/** O regime escolhido no Antes e depois é o Simples Nacional? */
const ehSimplesAd = () => $("#ad-regime").value === "simples";
/** Partilha do anexo escolhido (serviços usam sempre o Anexo III) e a alíquota efetiva do DAS informada. */
function parametrosSimples(servico) {
  const anexo = servico ? "III" : $("#ad-sn-anexo").value;
  return { anexo, ...PARTILHA_SN[anexo], a: (num($("#ad-sn-aliq").value) ?? PARTILHA_SN[anexo].aliqFaixa1) / 100, opcao: $("#ad-sn-opcao").value };
}
/** Partes de CBS, IBS e ICMS/ISS no DAS em cada ano. */
function partesSimplesNoAno(sn, ano, fator) {
  if (ano <= 2028) return { cbs: sn.cbs27, ibs: sn.ibs27, icms: sn.icms };
  return { cbs: sn.pc, ibs: sn.icms * (1 - fator), icms: sn.icms * fator };
}

/** Parte do ICMS/ISS que ainda existe no ano (transição da EC 132: −10% ao ano de 2029 a 2032, extinto em 2033). */
const fatorIcmsIss = (ano) => (ano <= 2028 ? 1 : ano >= 2033 ? 0 : 1 - (ano - 2028) / 10);
/** Data do cenário "hoje": a data atual, limitada a 31/12/2026 (último dia das regras antigas completas). */
const dataAntes = () => { const h = hoje(); return h <= "2026-12-31" ? h : "2026-12-31"; };
/** Quem vende é o comércio (e não a indústria)? Muda onde o IPI, o IS e o monofásico incidem. */
const vendeComercio = () => $("#ad-vendedor").value === "comercio";

/** Alíquotas atuais padrão de um item, antes dos ajustes manuais: PIS/Cofins do regime (zero na cesta básica e
 *  hortifrúti), monofásico pelo NCM, ICMS da UF ou ISS, ICMS-ST nas bebidas e IPI igual ao IS do produto. */
function padroesAntigos(it, isDet) {
  const regime = num($("#ad-regime").value) ?? 9.25;
  const servico = it.tipo === "nbs";
  const mono = servico ? null : monofasicoPadrao(it.codigo);
  return {
    pc: CLASSIF_PISCOFINS_ZERO.has(it.cClassTrib) ? 0 : regime,
    mono: mono !== null, monoPct: mono ?? 12.5,
    icms: servico ? (num($("#ad-iss").value) ?? 5) : (num($("#ad-icms").value) ?? 18),
    fcp: 0,
    st: !servico && stPadrao(it.codigo),
    ipi: !servico && isDet && num(it.aliqIS) !== null ? num(it.aliqIS) : 0,
  };
}
/** Valor ajustado à mão na tabela do Antes e depois (guardado no item como ad_<campo>) ou o padrão. */
const valorAntigo = (it, campo, padrao) => {
  const v = it["ad_" + campo];
  if (v === undefined || v === "") return padrao;
  if (typeof padrao === "boolean") return v === true || v === "1";
  return num(v);
};

/** Monta a aba Antes e depois: resumo da nota, alíquotas do cenário Depois e a tabela editável de tributos atuais. */
async function renderizarAntesDepois() {
  const uf = $("#op-uf").value, munNome = $("#op-mun").selectedOptions[0]?.textContent || "";
  const total = estado.itens.reduce((a, i) => a + (num(i.valor) || 0), 0);
  $("#ad-resumo").innerHTML = estado.itens.length
    ? `<strong>${estado.itens.length} ${estado.itens.length === 1 ? "item" : "itens"}</strong> · ${esc(munNome)} / ${esc(uf)} · ${brl(total)} a preço de hoje`
    : `Nenhum item na nota. Adicione itens na aba <strong>Calcular nota</strong>.`;
  const simples = ehSimplesAd();
  $("#ad-sn").hidden = !simples;
  $("#ad-antes-texto").innerHTML = simples
    ? `Regras de 2026, em ${fmtData(dataAntes())}: PIS/Cofins e ICMS ou ISS dentro do DAS. O Simples não destaca a CBS e o IBS de teste.`
    : `Regras de 2026, em ${fmtData(dataAntes())}: PIS/Cofins, ICMS/ISS e IPI integrais, mais CBS e IBS de teste (compensados).`;
  $("#ad-uf").textContent = uf;
  $("#ad-fabrica-caixa").hidden = !vendeComercio() && !simples;
  $("#ad-fabrica-caixa span").textContent = simples ? "Custo das compras (% do preço de venda)" : "Preço de fábrica (% do preço de venda)";
  if ($("#ad-icms").dataset.uf !== uf) { $("#ad-icms").value = ICMS_MODAL_2026[uf] ?? 18; $("#ad-icms").dataset.uf = uf; }
  $("#ad-padroes-nota").innerHTML = (simples ? `<strong>Simples Nacional:</strong> PIS/Cofins e ICMS (ou ISS) saem do DAS pela partilha da 1ª faixa do ${esc(PARTILHA_SN[$("#ad-sn-anexo").value].nome)}; serviços usam o Anexo III. A coluna de ICMS só vale para itens com ICMS-ST, que sai do DAS. IRPJ, CSLL e contribuição previdenciária também estão no DAS, mas são renda e folha e não entram na conta. ` : "") + `ICMS padrão: alíquota geral de ${esc(uf)} em 2026 (${pct(ICMS_MODAL_2026[uf] ?? 18, 1)}), sem fundo de pobreza. <strong>Atenção:</strong> itens de cesta básica, medicamentos, combustíveis e outros costumam ter ICMS reduzido, isento ou por substituição tributária no estado. Ajuste esses itens na tabela.`;

  // alíquotas de CBS/IBS do cenário "depois" (mesmo quadro da comparação)
  const d = $("#ad-data").value;
  const box = $('.cmp-data[data-lado="ad"] .cmp-aliq');
  box.hidden = !d;
  if (d && anoDe(d) >= ANO_ALIQ_OBRIGATORIA) {
    const chave = `${d}|${uf}|${$("#op-mun").value}`;
    if (refAliqCmp.ad !== chave) {
      const ref = await aliquotasReferencia(d, uf, $("#op-mun").value);
      refAliqCmp.ad = chave;
      box.innerHTML = `<div class="campos">
          <label class="caixa"><span>CBS %</span><input type="number" step="0.0001" min="0" data-aliq="cbs" value="${ref.cbs ?? ""}"></label>
          <label class="caixa"><span>IBS estadual %</span><input type="number" step="0.0001" min="0" data-aliq="ibsEstadual" value="${ref.ibsEstadual ?? ""}"></label>
          <label class="caixa"><span>IBS municipal %</span><input type="number" step="0.0001" min="0" data-aliq="ibsMunicipal" value="${ref.ibsMunicipal ?? ""}"></label>
        </div><p class="nota">${notaAliquotas(ref, d)}</p>`;
    }
  }

  // tabela de alíquotas atuais por item
  const linhas = [];
  for (const [n, it] of estado.itens.entries()) {
    const isDet = it.tipo === "ncm" ? await pagaImpostoSeletivo(it.codigo, "2027-02-02") : null;
    const p = padroesAntigos(it, isDet);
    const servico = it.tipo === "nbs";
    const campo = (c, v) => `<input type="number" step="0.01" min="0" class="ad-in" data-ad="${c}" data-id="${it.id}" value="${valorAntigo(it, c, v) ?? ""}">`;
    const marca = (c, v, rot) => `<label class="ad-marca"><input type="checkbox" data-ad="${c}" data-id="${it.id}" ${valorAntigo(it, c, v) ? "checked" : ""}> ${rot}</label>`;
    linhas.push(`<tr><td>${n + 1}</td><td>${esc(it.descricao || it.codigo)}</td><td class="n">${brl(it.valor)}</td>
      <td>${simples ? `<span class="nota">no DAS</span>` : campo("pc", p.pc)}</td>
      <td>${servico ? "—" : `${marca("mono", p.mono, "mono.")} ${campo("monoPct", p.monoPct)}`}</td>
      <td>${campo("icms", p.icms)}</td>
      <td>${servico ? "—" : campo("fcp", p.fcp)}</td>
      <td>${servico ? "—" : marca("st", p.st, "ST")}</td>
      <td>${servico ? "—" : campo("ipi", p.ipi)}</td>
      <td class="n">${isDet ? `${esc(it.aliqIS === "" ? "?" : it.aliqIS)}%` : "—"}</td></tr>`);
  }
  $("#ad-itens").innerHTML = `<thead><tr><th>#</th><th>Item</th><th class="n">Preço hoje</th><th>PIS/Cofins %</th><th>Monofásico %</th>
    <th>ICMS ou ISS %</th><th>FCP %</th><th>ICMS-ST</th><th>IPI %</th><th class="n">IS % (2027)</th></tr></thead><tbody>${linhas.join("")}</tbody>`;
}

/** Tributos atuais e valor sem tributos (L) de um item, conforme quem vende. */
function tributosAtuais(it, isDet) {
  const P = num(it.valor) || 0;
  const p = padroesAntigos(it, isDet);
  const servico = it.tipo === "nbs";
  const icmsPct = (valorAntigo(it, "icms", p.icms) || 0) + (servico ? 0 : (valorAntigo(it, "fcp", p.fcp) || 0));
  const i = icmsPct / 100;
  const mono = !servico && valorAntigo(it, "mono", p.mono);
  const m = (valorAntigo(it, "monoPct", p.monoPct) || 0) / 100;
  const c = (valorAntigo(it, "pc", p.pc) || 0) / 100;
  const st = !servico && valorAntigo(it, "st", p.st);
  const ipi = servico ? 0 : (valorAntigo(it, "ipi", p.ipi) || 0) / 100;
  const isPct = isDet ? num(it.aliqIS) : null;
  const comercio = vendeComercio() && !servico;
  const r = { P, i, st, servico, comercio, isPct, destacado: {}, embutido: {} };
  if (ehSimplesAd()) {
    // Simples: PIS/Cofins, ICMS/ISS (e IPI no Anexo II) saem do DAS; IRPJ, CSLL e CPP são renda e folha e ficam no valor.
    // A empresa do Simples não aproveita crédito do que compra: o PIS/Cofins e o ICMS pagos pelo fornecedor
    // (aqui, do lucro real) ficam embutidos no custo. Monofásico e ICMS-ST também chegam pagos e saem do DAS.
    const sn = parametrosSimples(servico);
    const F = ((num($("#ad-fabrica").value) ?? 60) / 100) * P;
    const ipiCadeia = servico ? 0 : F * ipi, monoV = mono ? m * F : 0;
    const icmsUp = st || servico ? 0 : i * F;
    const pcUp = mono ? 0 : 0.0925 * (F - icmsUp);
    const pcDas = mono ? 0 : sn.a * sn.pc * P;
    const icmsDas = st ? 0 : sn.a * sn.icms * P, icmsSt = st ? i * P : 0;
    const ipiV = ipiCadeia + sn.a * sn.ipi * P;
    const Fsem = F - icmsUp - pcUp - ipiCadeia - monoV;
    Object.assign(r, { sn, F, Fsem, ipiV, ipiCadeia, monoV, icmsUp, pcUp, icmsSt, pcV: pcDas + pcUp, icms: icmsDas + icmsSt + icmsUp,
      L: P - pcDas - pcUp - icmsDas - icmsSt - icmsUp - monoV - ipiV, baseTeste: P - icmsDas - pcDas });
    return r;
  }
  if (comercio) {
    const F = ((num($("#ad-fabrica").value) ?? 60) / 100) * P;
    const ipiV = F * ipi, monoV = mono ? m * F : 0, icms = i * P, pcV = mono ? 0 : c * (P - icms);
    Object.assign(r, { F, ipiV, monoV, icms, pcV, L: P - icms - pcV - monoV - ipiV, baseTeste: P - icms - pcV });
  } else {
    const cEff = mono ? m : c;
    const icms = i * P, pcV = cEff * (P - icms), A = P * (1 - i) * (1 - cEff), L = A / (1 + ipi);
    Object.assign(r, { F: L, ipiV: L * ipi, monoV: 0, icms, pcV, L, baseTeste: A });
  }
  return r;
}

/** Calcula os dois cenários. Hoje: tributos atuais estimados aqui + CBS/IBS de teste pela calculadora oficial.
 *  Depois: CBS, IBS e IS pela calculadora oficial sobre o valor sem tributos (L), ICMS/ISS reduzido pela transição.
 *  O preço estimado supõe repasse integral: margens e custos não mudam, só os tributos. */
async function calcularAntesDepois() {
  const st = $("#ad-status");
  st.className = "calc-status erro";
  const d = $("#ad-data").value;
  if (!estado.itens.length) { st.textContent = "A nota está vazia. Adicione itens na aba Calcular nota."; return; }
  if (!d || anoDe(d) < ANO_ALIQ_OBRIGATORIA) { st.textContent = "Escolha a data do cenário Depois (2027 em diante)."; return; }
  await renderizarAntesDepois();
  const aliquotas = aliquotasDoLado("ad");
  if (aliquotas.cbs === null || aliquotas.ibsEstadual === null || aliquotas.ibsMunicipal === null) {
    st.textContent = `Preencha as alíquotas de CBS e IBS do cenário Depois (quadro "Cenários").`; return;
  }
  st.className = "calc-status"; st.textContent = "Calculando...";
  $("#btn-antesdepois").disabled = true;
  try {
    const fator = fatorIcmsIss(anoDe(d));
    const cbsNaBaseIcms = $("#ad-icms-base").value === "dentro";
    // 1. tributos atuais de cada item
    const atuais = [];
    for (const it of estado.itens) {
      const isDet = it.tipo === "ncm" ? await pagaImpostoSeletivo(it.codigo, "2027-02-02") : null;
      atuais.push(tributosAtuais(it, isDet));
    }
    // 2. tributos novos pela calculadora oficial.
    // Depois: a base do IS enviada é L; a alíquota é ajustada para que o IS calculado seja o do modelo
    // (no comércio, IS = F × alíquota, embutido no custo), e a base de CBS/IBS fique L + IS.
    const isAlvo = atuais.map((a) => (a.isPct === null || a.isPct === undefined || isNaN(a.isPct) ? null : a.F * a.isPct / 100));
    const aliqISEnvio = atuais.map((a, k) => (isAlvo[k] === null ? null : a.L > 0 ? Math.round(isAlvo[k] / a.L * 1e6) / 1e4 : 0));
    const rodar = async (data, bases, aliq, aliqIS) => {
      const { erros, operacao } = await montarOperacao(data, { aliquotas: aliq, bases: bases.map(arred2), aliqIS });
      if (erros.length) throw new Error(`Em ${fmtData(data)}: ${erros[0].replace(`no campo "Imposto Seletivo %" do item`, `no campo "Imposto Seletivo %" do item, na aba Calcular nota,`)}`);
      const r = await api("/observabilidade/regime-geral", { method: "POST", body: JSON.stringify(operacao) });
      return interpretar(r.corpo, operacao);
    };
    const [rAntes, rDepois] = await Promise.all([
      rodar(dataAntes(), atuais.map((a) => a.baseTeste), null, null),
      rodar(d, atuais.map((a) => a.L), aliquotas, aliqISEnvio),
    ]);
    // 3. monta os dois cenários
    const itens = estado.itens.map((it, k) => {
      const a = atuais[k];
      const na = rAntes.itens.find((x) => x.numero === k + 1) || {}, nd = rDepois.itens.find((x) => x.numero === k + 1) || {};
      const is = nd.is || 0, Ad = a.L + is, i2 = a.i * fator;
      const cbs = nd.cbs || 0, ibs = nd.ibs || 0;
      const icmsD = i2 < 1 ? i2 * (Ad + (cbsNaBaseIcms ? cbs + ibs : 0)) / (1 - i2) : 0;
      const antes = { pc: a.pcV + a.monoV, icms: a.icms, ipi: a.ipiV, cbsTeste: na.cbs || 0, ibsTeste: na.ibs || 0 };
      antes.total = antes.pc + antes.icms + antes.ipi;
      // o que chega embutido no custo (comércio) e o que é destacado nesta venda
      // no comércio, o ICMS-ST chegou pago pela indústria; na venda da própria indústria ele é retido e destacado
      antes.embutido = a.comercio ? a.ipiV + a.monoV + (a.st ? a.icms : 0) : 0;
      let depois = { cbs, ibs, is, icms: icmsD }, preco = Ad + icmsD + cbs + ibs, simples = null;
      let embD = null;
      if (a.sn) {
        // Simples: em 2026 não há CBS/IBS de teste. Depois, compara CBS e IBS dentro do DAS com o regime regular (por fora).
        // Dentro do DAS, a CBS e o IBS que o fornecedor cobrou ficam no custo (sem crédito); por fora, viram crédito,
        // e o total da cadeia é a CBS/IBS da calculadora oficial sobre o valor sem tributos.
        antes.cbsTeste = 0; antes.ibsTeste = 0;
        antes.embutido = a.ipiCadeia + a.monoV + a.icmsSt + a.icmsUp + a.pcUp;
        const ps = partesSimplesNoAno(a.sn, anoDe(d), fator);
        const tc = (aliquotas.cbs || 0) / 100, ti = ((aliquotas.ibsEstadual || 0) + (aliquotas.ibsMunicipal || 0)) / 100;
        const baseUp = a.Fsem + is;
        const cbsUp = tc * baseUp, ibsUp = ti * baseUp;
        const icmsUp2 = a.icmsUp > 0 && i2 < 1 ? i2 * baseUp / (1 - i2) : 0;
        const icmsSt = a.st ? icmsD : 0;
        const Pd = (a.L + is + icmsUp2 + cbsUp + ibsUp + icmsSt) / (1 - a.sn.a * (ps.cbs + ps.ibs + (a.st ? 0 : ps.icms)));
        const dentro = { cbs: a.sn.a * ps.cbs * Pd + cbsUp, ibs: a.sn.a * ps.ibs * Pd + ibsUp, icms: (a.st ? icmsSt : a.sn.a * ps.icms * Pd) + icmsUp2,
          preco: Pd, credito: a.sn.a * (ps.cbs + ps.ibs) * Pd, embutido: is + icmsSt + icmsUp2 + cbsUp + ibsUp };
        const Pf = (a.L + is + cbs + ibs + icmsUp2 + icmsSt) / (1 - (a.st ? 0 : a.sn.a * ps.icms));
        const fora = { cbs, ibs, icms: (a.st ? icmsSt : a.sn.a * ps.icms * Pf) + icmsUp2, preco: Pf, credito: cbs + ibs, embutido: is + icmsSt + icmsUp2 };
        simples = { dentro, fora };
        const e = a.sn.opcao === "fora" ? fora : dentro;
        depois = { cbs: e.cbs, ibs: e.ibs, is, icms: e.icms };
        preco = e.preco; embD = e.embutido;
      }
      depois.total = depois.cbs + depois.ibs + is + depois.icms;
      depois.embutido = embD ?? (a.comercio ? is + (a.st ? depois.icms : 0) : 0);
      return { n: k + 1, it, P: a.P, L: a.L, servico: a.servico, comercio: a.comercio, st: a.st && a.comercio, pcEmb: a.comercio && a.monoV > 0.004, antes, depois,
        preco, simples, erro: [...(na.erros || []), ...(nd.erros || [])][0] };
    });
    estado.ultimoAntesDepois = itens; // usado também pelo teste de tela
    renderizarResultadoAntesDepois(itens, d, fator, cbsNaBaseIcms);
    st.textContent = itens.some((x) => x.erro) ? "Há itens com erro: veja a tabela." : "";
    if (itens.some((x) => x.erro)) st.className = "calc-status erro";
  } catch (e) {
    st.className = "calc-status erro"; st.textContent = e.message;
  } finally {
    $("#btn-antesdepois").disabled = false;
  }
}

/** Resumo das hipóteses usadas, para quem lê o resultado impresso ou pelo link. */
function premissasAntesDepois(d, itens) {
  const aliq = aliquotasDoLado("ad");
  const uf = $("#op-uf").value, mun = $("#op-mun").selectedOptions[0]?.textContent || "";
  const ajustados = itens.filter((x) => Object.keys(x.it).some((k) => k.startsWith("ad_"))).length;
  const regime = ehSimplesAd()
    ? `Simples Nacional, ${PARTILHA_SN[$("#ad-sn-anexo").value].nome}, alíquota efetiva de ${pct(num($("#ad-sn-aliq").value) ?? 0, 2)}, CBS e IBS ${$("#ad-sn-opcao").value === "fora" ? "por fora (regime regular)" : "dentro do DAS"} de 2027 em diante; compras de ${pct(num($("#ad-fabrica").value) ?? 60, 0)} do preço, de fornecedores do lucro real`
    : `PIS/Cofins ${$("#ad-regime").value === "3.65" ? "cumulativo (lucro presumido), 3,65%" : "não cumulativo (lucro real), 9,25%"}`;
  return `<div class="premissas"><h3>Premissas deste cálculo</h3><ul>
    <li>Local: ${esc(mun)} / ${esc(uf)}. Hoje: regras de 2026 (${fmtData(dataAntes())}). Depois: ${fmtData(d)}, CBS de ${pct(aliq.cbs ?? 0, 2)} e IBS de ${pct((aliq.ibsEstadual ?? 0) + (aliq.ibsMunicipal ?? 0), 2)}.</li>
    <li>Quem vende: ${vendeComercio() ? `comércio, com preço de fábrica de ${pct(num($("#ad-fabrica").value) ?? 60, 0)} do preço` : "indústria ou importador"}. ${esc(regime)}.</li>
    <li>ICMS padrão de ${pct(num($("#ad-icms").value) ?? 0, 2)} e ISS de ${pct(num($("#ad-iss").value) ?? 0, 2)}; de 2027 em diante, CBS e IBS ${$("#ad-icms-base").value === "dentro" ? "dentro" : "fora"} da base do ICMS. ${ajustados ? `${ajustados} ${ajustados === 1 ? "item com alíquotas ajustadas" : "itens com alíquotas ajustadas"} à mão.` : "Todos os itens com os padrões."}</li>
    <li>Preço estimado com repasse integral das mudanças de tributo; margens e custos não mudam.</li></ul></div>`;
}

/** Simples Nacional: compara CBS e IBS dentro do DAS com o regime regular (por fora), inclusive para o cliente empresa. */
function blocoSimples(ok, d) {
  const its = ok.filter((x) => x.simples);
  if (!its.length) return "";
  const s = (lado, k) => its.reduce((a, x) => a + x.simples[lado][k], 0);
  const op = { dentro: {}, fora: {} };
  for (const lado of ["dentro", "fora"]) {
    for (const k of ["cbs", "ibs", "icms", "preco", "credito"]) op[lado][k] = s(lado, k);
    op[lado].liquido = op[lado].preco - op[lado].credito;
  }
  const escolhida = $("#ad-sn-opcao").value;
  const sn = parametrosSimples(false);
  const partesAno = partesSimplesNoAno(sn, anoDe(d), fatorIcmsIss(anoDe(d))); // CBS e IBS no DAS no ano escolhido
  const col = (lado, k) => `<td class="n${lado === escolhida ? " forte" : ""}">${brl(op[lado][k])}</td>`;
  const linha = (rot, k) => `<tr><td>${rot}</td>${col("dentro", k)}${col("fora", k)}</tr>`;
  const melhorCliente = op.fora.liquido < op.dentro.liquido - 0.005 ? "fora" : "dentro";
  return `<div class="simples-ad">
      <h3>Simples Nacional: CBS e IBS dentro ou fora do DAS (${fmtData(d)})</h3>
      <div class="tabela-rolagem"><table>
        <thead><tr><th></th><th class="n${escolhida === "dentro" ? " forte" : ""}">Dentro do DAS</th><th class="n${escolhida === "fora" ? " forte" : ""}">Por fora (regime regular)</th></tr></thead>
        <tbody>
          ${linha("CBS", "cbs")}${linha("IBS", "ibs")}${linha("ICMS/ISS (no DAS e embutido no custo)", "icms")}
          ${linha("Preço estimado", "preco")}
          ${linha("Crédito que um cliente empresa do regime regular aproveita", "credito")}
          ${linha("Custo para esse cliente, descontado o crédito", "liquido")}
        </tbody></table></div>
      <p class="nota">Dentro do DAS, a nota informa ao cliente só a parte de CBS e IBS paga na guia (aqui, ${pct(sn.a * 100 * (partesAno.cbs + partesAno.ibs), 2)} da venda) e é esse o crédito dele.
        Por fora, o crédito é a CBS e o IBS cheios, e você também passa a aproveitar como crédito a CBS e o IBS que o seu fornecedor cobrou (dentro do DAS, eles ficam no seu custo).
        Para o consumidor final, que não usa crédito, o que importa é o preço. Para um cliente empresa, <strong>${melhorCliente === "fora" ? "comprar de quem recolhe por fora sai mais barato" : "a diferença de custo é pequena ou favorece o DAS"}</strong> neste cenário.
        A conta supõe fornecedores do lucro real e compras de ${pct(num($("#ad-fabrica").value) ?? 60, 0)} do preço. Recolher por fora exige apuração própria de CBS e IBS, e a opção é feita por semestre, no prazo do Comitê Gestor do Simples. Converse com o seu contador.</p>
    </div>`;
}

/** Quadros e tabela do resultado do Antes e depois: totais, preço estimado, o que migra e o que fica. */
function renderizarResultadoAntesDepois(itens, d, fator, cbsNaBaseIcms) {
  const ok = itens.filter((x) => !x.erro);
  const soma = (f) => ok.reduce((a, x) => a + f(x), 0);
  const T = {
    P: soma((x) => x.P), L: soma((x) => x.L), preco: soma((x) => x.preco),
    pc: soma((x) => x.antes.pc), icmsA: soma((x) => x.antes.icms), ipi: soma((x) => x.antes.ipi), antes: soma((x) => x.antes.total),
    embA: soma((x) => x.antes.embutido), embD: soma((x) => x.depois.embutido),
    cbsT: soma((x) => x.antes.cbsTeste), ibsT: soma((x) => x.antes.ibsTeste),
    cbs: soma((x) => x.depois.cbs), ibs: soma((x) => x.depois.ibs), is: soma((x) => x.depois.is), icmsD: soma((x) => x.depois.icms), depois: soma((x) => x.depois.total),
  };
  const temServ = ok.some((x) => x.servico), temProd = ok.some((x) => !x.servico);
  const rotIcms = temServ && temProd ? "ICMS/ISS" : temServ ? "ISS" : "ICMS";
  const varPct = T.P ? (T.preco / T.P - 1) * 100 : 0;
  const sinal = (v) => (v > 0.004 ? "+" : "");
  const anoD = anoDe(d);
  const comercio = ok.some((x) => x.comercio);
  // diferença de migração; menos de 2 centavos é arredondamento
  const dif = (a, b) => (Math.abs(b - a) < 0.02 ? `<span>(sem mudança)</span>` : `<span class="${b > a ? "mais" : "menos"}">(${sinal(b - a)}${brl(b - a)})</span>`);
  // valor embutido no custo aparece em itálico
  const v = (valor, emb) => `<td class="n${emb && valor > 0.004 ? " emb" : ""}">${brl(valor)}</td>`;

  const segs = (lista, totalBarra) => lista.filter(([, val]) => val > 0.004).map(([cls, val, rot]) =>
    `<span class="seg ${cls}" style="width:${(val / totalBarra) * 100}%" title="${esc(rot)}: ${brl(val)}"></span>`).join("");
  const maxBarra = Math.max(T.P, T.preco);
  const barra = (rot, valor, lista) => `<div class="comp-linha"><span class="comp-rot">${rot}</span>
      <div class="comp-barra" style="width:${(valor / maxBarra) * 100}%">${segs(lista, valor)}</div><span class="comp-val">${brl(valor)}</span></div>`;

  const linhas = itens.map((x) => x.erro
    ? `<tr><td>${x.n}</td><td>${esc(x.it.descricao || x.it.codigo)}</td><td colspan="12" class="erro-item">${esc(x.erro.code || "")} ${esc(x.erro.title || "")}: ${esc(x.erro.detail || "")}</td></tr>`
    : `<tr><td>${x.n}</td><td>${esc(x.it.descricao || x.it.codigo)}</td><td class="n">${brl(x.P)}</td>
      ${v(x.antes.pc, x.pcEmb)}${v(x.antes.icms, x.st)}${v(x.antes.ipi, x.comercio)}<td class="n forte">${brl(x.antes.total)}</td>
      ${v(x.depois.cbs)}${v(x.depois.ibs)}${v(x.depois.is, x.comercio)}${v(x.depois.icms, x.st)}<td class="n forte">${brl(x.depois.total)}</td>
      <td class="n">${brl(x.preco)}</td><td class="n ${x.preco > x.P + 0.004 ? "mais" : x.preco < x.P - 0.004 ? "menos" : ""}">${sinal(x.preco - x.P)}${pct((x.preco / x.P - 1) * 100, 1)}</td></tr>`).join("");

  $("#ad-resultado").innerHTML = `
    <div class="cmp-cards">
      <div class="cmp-card"><h3>Hoje (regras de 2026)</h3><div class="valor">${brl(T.antes)}</div>
        <div class="det">${pct(T.P ? T.antes / T.P * 100 : 0, 1)} do preço · PIS/Cofins ${brl(T.pc)} · ${rotIcms} ${brl(T.icmsA)} · IPI ${brl(T.ipi)}<br>
        CBS/IBS de teste destacados: ${brl(T.cbsT + T.ibsT)} (compensados, fora do preço)</div></div>
      <div class="cmp-card"><h3>Depois (${fmtData(d)})</h3><div class="valor">${brl(T.depois)}</div>
        <div class="det">${pct(T.preco ? T.depois / T.preco * 100 : 0, 1)} do preço · CBS ${brl(T.cbs)} · IBS ${brl(T.ibs)} · IS ${brl(T.is)} · ${rotIcms} ${brl(T.icmsD)}</div></div>
      <div class="cmp-card"><h3>Preço estimado</h3><div class="valor ${varPct > 0.05 ? "mais" : varPct < -0.05 ? "menos" : ""}">${brl(T.preco)}</div>
        <div class="det">hoje ${brl(T.P)} · ${sinal(varPct)}${pct(varPct, 1)} com repasse integral</div></div>
    </div>

    <div class="carga-consumo">
      <h3>Tributos sobre o consumo do produto</h3>
      <table><thead><tr><th></th><th class="n">Destacado nesta venda</th><th class="n">Embutido no custo</th><th class="n">Total</th><th class="n">% do preço</th></tr></thead>
        <tbody>
          <tr><td>Hoje</td><td class="n">${brl(T.antes - T.embA)}</td><td class="n">${brl(T.embA)}</td><td class="n forte">${brl(T.antes)}</td><td class="n">${pct(T.P ? T.antes / T.P * 100 : 0, 1)}</td></tr>
          <tr><td>Depois</td><td class="n">${brl(T.depois - T.embD)}</td><td class="n">${brl(T.embD)}</td><td class="n forte">${brl(T.depois)}</td><td class="n">${pct(T.preco ? T.depois / T.preco * 100 : 0, 1)}</td></tr>
        </tbody></table>
      <p class="nota">${comercio ? "Embutido no custo: IPI, Imposto Seletivo e PIS/Cofins monofásico pagos pela indústria, e ICMS por substituição tributária. " : ""}Não entram: tributos sobre a renda e a folha das empresas da cadeia, resíduos de etapas sem crédito, DIFAL e tributos de importação.</p>
    </div>

    <div class="migracao">
      <div class="mig"><h3>Migra</h3>
        <p><strong>PIS/Cofins</strong> ${brl(T.pc)} → <strong>CBS</strong> ${brl(T.cbs)} ${dif(T.pc, T.cbs)}</p>
        <p><strong>IPI</strong> ${brl(T.ipi)} → <strong>Imposto Seletivo</strong> ${brl(T.is)} ${dif(T.ipi, T.is)} · nos demais produtos o IPI é zerado</p>
        <p><strong>IBS</strong> ${brl(T.ibs)}: ${anoD <= 2028 ? "ainda simbólico (0,1%)" : "cresce enquanto o ICMS/ISS cai"}</p></div>
      <div class="mig"><h3>Fica</h3>
        <p><strong>${rotIcms}</strong> ${brl(T.icmsA)} → ${brl(T.icmsD)}: ${fator === 1 ? "a alíquota continua a mesma até 2028" : fator === 0 ? "extinto em 2033" : `alíquota a ${pct(fator * 100, 0)} da atual em ${anoD}`}</p>
        <p class="nota">${fator === 1 ? "O valor muda mesmo com a alíquota igual porque o PIS/Cofins sai do preço, e o ICMS/ISS é calculado sobre ele. " : ""}${cbsNaBaseIcms ? "Cenário com CBS e IBS dentro da base do ICMS. " : "Cenário com CBS e IBS fora da base do ICMS, como em 2026. "}O ICMS e o ISS só começam a cair em 2029 e deixam de existir em 2033.</p></div>
    </div>

    ${blocoSimples(ok, d)}
    ${premissasAntesDepois(d, itens)}

    <h3 class="sub-ad">Composição do preço</h3>
    <div class="composicao">
      ${barra("Hoje", T.P, [["s-liq", T.L, "Valor sem tributos"], ["s-pc", T.pc, "PIS/Cofins"], ["s-ipi", T.ipi, "IPI"], ["s-icms", T.icmsA, rotIcms]])}
      ${barra("Depois", T.preco, [["s-liq", T.L, "Valor sem tributos"], ["s-is", T.is, "Imposto Seletivo"], ["s-icms", T.icmsD, rotIcms], ["s-cbs", T.cbs, "CBS"], ["s-ibs", T.ibs, "IBS"]])}
      <p class="legenda-comp"><span class="seg s-liq"></span>Valor sem tributos <span class="seg s-pc"></span>PIS/Cofins <span class="seg s-ipi"></span>IPI
        <span class="seg s-icms"></span>${rotIcms} <span class="seg s-cbs"></span>CBS <span class="seg s-ibs"></span>IBS <span class="seg s-is"></span>Imposto Seletivo</p>
    </div>

    <h3 class="sub-ad">Por item</h3>
    <div class="tabela-rolagem"><table class="tab-ad"><thead>
      <tr><th colspan="3"></th><th colspan="4" class="grupo">Hoje</th><th colspan="5" class="grupo">Depois (${fmtData(d)})</th><th colspan="2"></th></tr>
      <tr><th>#</th><th>Item</th><th class="n">Preço hoje</th><th class="n">PIS/Cofins</th><th class="n">${rotIcms}</th><th class="n">IPI</th><th class="n">Total</th>
        <th class="n">CBS</th><th class="n">IBS</th><th class="n">IS</th><th class="n">${rotIcms}</th><th class="n">Total</th><th class="n">Preço estimado</th><th class="n">Variação</th></tr></thead>
      <tbody>${linhas}</tbody>
      <tfoot><tr><td></td><td>Total</td><td class="n">${brl(T.P)}</td><td class="n">${brl(T.pc)}</td><td class="n">${brl(T.icmsA)}</td><td class="n">${brl(T.ipi)}</td><td class="n">${brl(T.antes)}</td>
        <td class="n">${brl(T.cbs)}</td><td class="n">${brl(T.ibs)}</td><td class="n">${brl(T.is)}</td><td class="n">${brl(T.icmsD)}</td><td class="n">${brl(T.depois)}</td>
        <td class="n">${brl(T.preco)}</td><td class="n">${sinal(varPct)}${pct(varPct, 1)}</td></tr></tfoot></table></div>
    <p class="nota">Valores em <em>itálico</em> chegam embutidos no custo: não são destacados nesta venda, mas fazem parte do preço.</p>`;
}

/* ====================================================================== consultar */
async function buscarNcm() {
  const q = $("#busca-ncm").value.trim().toLowerCase();
  const ul = $("#res-ncm");
  if (q.length < 2) { ul.innerHTML = ""; return; }
  const d = dataOp();
  const lista = await listaNcm(d);
  const so = q.replace(/\D/g, "");
  const achados = lista.filter((n) => (so && so === q ? n.ncm.startsWith(so) : n.descricao.toLowerCase().includes(q))).slice(0, 60);
  const vinculos = (ncm) => {
    const v = classificacoesDoNcm(ncm, d);
    return v.length ? `<small>Vinculado a: ${v.map((x) => `<code>${esc(x.codigo)}</code> ${esc(classificacao(x.codigo).descricao)}`).join("; ")}</small>` : "";
  };
  ul.innerHTML = achados.length ? achados.map((n) => `<li><code>${esc(n.ncm)}</code><span>${esc(n.descricao.replace(/<[^>]+>/g, ""))}${vinculos(n.ncm)}<small data-ncm="${esc(n.ncm)}"></small></span>
    <button class="btn btn-sec btn-mini acao" data-add="${esc(n.ncm)}">Adicionar à nota</button></li>`).join("")
    : "<li>Nada encontrado. Tente outra palavra ou só os primeiros dígitos do código.</li>";
  if (anoDe(d) >= ANO_ALIQ_OBRIGATORIA) {
    for (const n of achados.slice(0, 15)) {
      detalheNcm(n.ncm, d).then((det) => {
        const s = ul.querySelector(`small[data-ncm="${n.ncm}"]`);
        if (s && det?.tributadoPeloImpostoSeletivo) s.innerHTML = `<span class="tag-is">Paga Imposto Seletivo</span>`;
      });
    }
  }
}

/** Aba Ajuda: busca classificações tributárias pelo código ou pela descrição (até 120 resultados). */
function buscarClassificacao() {
  const q = $("#busca-class").value.trim().toLowerCase();
  const ul = $("#res-class");
  const achados = classificacoes.filter((c) => !q || c.codigo.includes(q) || c.descricao.toLowerCase().includes(q)).slice(0, 120);
  ul.innerHTML = achados.map((c) => `<li><code>${esc(c.codigo)}</code><span>${esc(c.descricao)}<small>CST ${esc(c.cst)} — ${esc(c.cstDescricao)}</small></span></li>`).join("")
    || "<li>Nenhuma classificação encontrada.</li>";
}

/* ====================================================================== arquivos e exportação */
function baixarArquivo(nome, conteudo, tipo) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = Object.assign(document.createElement("a"), { href: url, download: nome });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Exporta o detalhamento do último cálculo em CSV (separador ;, vírgula decimal, para abrir no Excel/LibreOffice). */
function exportarCsv() {
  const c = estado.ultimoCalculo;
  if (!c?.resultado) return;
  const f = (v) => String(v).replace(".", ",");
  const linhas = [["Item", "Descricao", "Codigo", "cClassTrib", "Valor", "Reducao %", "CBS efetiva %", "CBS", "IBS", "IS", "Situacao"]];
  for (const i of c.resultado.itens) linhas.push([i.numero, i.descricao, i.codigo, i.cClassTrib, f(i.valor), f(i.red), f(i.pEfet), f(i.cbs), f(i.ibs), f(i.is), (nomeEstado[i.estado] || [i.estado])[0]]);
  const t = c.resultado.tot;
  linhas.push(["", "TOTAL", "", "", f(t.valor), "", "", f(t.cbs), f(t.ibs), f(t.is), ""]);
  const csv = "﻿" + linhas.map((l) => l.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(";")).join("\r\n");
  baixarArquivo(`tributos-${c.data}.csv`, csv, "text/csv;charset=utf-8");
}

/** Salva os itens da nota num arquivo JSON, para reabrir depois ou em outro computador. */
function exportarItens() {
  const dados = { formato: "calculadora-rtc-facil/itens@1", uf: $("#op-uf").value, municipio: $("#op-mun").value, data: dataOp(),
    itens: estado.itens.map(({ id, verOpcoes, ...resto }) => resto) };
  baixarArquivo("itens-nota.json", JSON.stringify(dados, null, 2), "application/json");
}

/** Abre itens de um JSON salvo por exportarItens(), de um JSON no formato da API oficial ou do XML de uma NF-e/NFC-e. */
async function importarItens(arquivo) {
  try {
    const conteudo = await arquivo.text();
    if (/^\s*</.test(conteudo)) { // XML de NF-e ou NFC-e
      if (await importarNfe(conteudo)) trocarAba("nfe");
      return;
    }
    const d = JSON.parse(conteudo);
    // aceita o formato desta ferramenta ou um JSON no formato da API oficial
    const itens = d.itens || [];
    estado.itens = itens.map((i) => i.cClassTrib && (i.ncm || i.nbs)
      ? novoItem({ tipo: i.nbs ? "nbs" : "ncm", codigo: i.ncm || i.nbs, cClassTrib: i.cClassTrib,
          valor: i.impostoSeletivo?.baseCalculo ?? i.baseCalculo ?? "", quantidade: i.quantidade ?? "", unidade: i.unidade || "UN",
          aliqIS: i.aliquotasNominais?.impostoSeletivo?.adValorem ?? "" })
      : novoItem(i));
    if (d.uf) { $("#op-uf").value = d.uf; await carregarMunicipios(d.uf, d.municipio); }
    if (d.data) $("#op-data").value = d.data;
    else if (d.dhFatoGerador) $("#op-data").value = d.dhFatoGerador.slice(0, 10);
    await aoMudarData();
  } catch (e) {
    alert("Não consegui ler o arquivo: " + e.message);
  }
}

/* ====================================================================== inicialização */
async function carregarExemplo(chave) {
  const ex = window.EXEMPLOS[chave];
  if (!ex) return;
  if (estado.itens.length && !confirm(`Substituir os ${estado.itens.length} itens atuais pelo exemplo "${ex.nome}"?`)) return;
  estado.itens = ex.itens.map(itemDeExemplo);
  if (ex.local) {
    $("#op-uf").value = ex.local.uf;
    await carregarMunicipios(ex.local.uf, ex.local.municipio);
  }
  if (ex.antesDepois?.regime) $("#ad-regime").value = ex.antesDepois.regime;
  if (ex.antesDepois?.iss !== undefined) $("#ad-iss").value = ex.antesDepois.iss;
  await preencherAliquotasReferencia(true);
  renderizarItens();
  salvar();
}

/** Mostra a aba pedida e prepara o conteúdo dela com os itens atuais. */
function trocarAba(nome) {
  $$(".abas button").forEach((b) => b.setAttribute("aria-selected", b.dataset.aba === nome));
  $(`.abas button[data-aba="${nome}"]`)?.scrollIntoView({ block: "nearest", inline: "nearest" });
  $$(".aba").forEach((s) => { s.hidden = s.id !== "aba-" + nome; });
  if (nome === "calcular") renderizarItens();
  if (nome === "consultar") { buscarClassificacao(); buscarNcm(); }
  if (nome === "comparar") renderizarPainelComparacao();
  if (nome === "antesdepois") renderizarAntesDepois();
  if (nome === "nfe") renderizarNfe();
}

/** Primeira carga, quando o motor fica pronto: UFs, municípios, relação NCM × classificação e dados salvos. */
async function iniciarApp() {
  const salvo = carregarSalvo();
  $("#op-data").value = salvo?.data || hoje();
  $("#cmp-a").value = salvo?.cmpA || hoje();
  $("#cmp-b").value = salvo?.cmpB || "2027-07-15";
  $("#ad-data").value = salvo?.adData || "2027-03-01";
  if (salvo?.adVendedor) $("#ad-vendedor").value = salvo.adVendedor;
  if (salvo?.adFabrica) $("#ad-fabrica").value = salvo.adFabrica;
  if (salvo?.adIcmsBase) $("#ad-icms-base").value = salvo.adIcmsBase;
  if (salvo?.adRegime) $("#ad-regime").value = salvo.adRegime;
  if (salvo?.snAnexo) $("#ad-sn-anexo").value = salvo.snAnexo;
  if (salvo?.snAliq) $("#ad-sn-aliq").value = salvo.snAliq;
  if (salvo?.snOpcao) $("#ad-sn-opcao").value = salvo.snOpcao;
  $("#sel-exemplo").innerHTML += Object.entries(window.EXEMPLOS).map(([k, e]) => `<option value="${k}">${esc(e.nome)}</option>`).join("");
  try {
    await carregarUfs();
    const uf = salvo?.uf || "SP";
    $("#op-uf").value = uf;
    await carregarMunicipios(uf, salvo?.mun || (uf === "SP" ? 3550308 : null));
  } catch (e) {
    $("#calc-status").className = "calc-status erro";
    $("#calc-status").textContent = "Não consegui carregar as UFs: " + e.message;
  }
  if (salvo?.nfe) estado.nfe = salvo.nfe;
  if (salvo?.itens?.length) {
    estado.itens = salvo.itens.map((i) => novoItem(i));
  }
  await carregarRelacao();
  await aoMudarData();
  listaNcm(dataOp()); // pré-carrega a lista de NCM para o autocompletar
}

/** Liga os botões e campos da página às funções acima. */
function ligarEventos() {
  $$(".abas button").forEach((b) => b.addEventListener("click", () => trocarAba(b.dataset.aba)));
  $("#chip-versao").addEventListener("click", () => trocarAba("ajuda"));
  $("#btn-zerar").addEventListener("click", () => {
    const n = estado.itens.length;
    $("#zerar-qtd").textContent = n === 1 ? "1 item" : `${n} itens`;
    $("#zerar-exportar").hidden = n === 0;
    $("#dlg-zerar").showModal();
  });
  $("#zerar-exportar").addEventListener("click", exportarItens);
  $$("[data-link]").forEach((b) => b.addEventListener("click", async () => {
    const url = await linkDaNota();
    $("#link-url").value = url;
    let copiou = false;
    try { await navigator.clipboard.writeText(url); copiou = true; } catch { /* sem permissão: a pessoa copia do campo */ }
    $("#link-msg").textContent = (copiou ? "Link copiado. " : "Copie o link abaixo. ") + "Quem abrir vê os mesmos itens, local, datas e ajustes.";
    $("#dlg-link").showModal();
    $("#link-url").select();
  }));
  $$("[data-imprimir]").forEach((b) => b.addEventListener("click", () => window.print()));
  window.addEventListener("beforeprint", () => {
    const aba = $(".abas button[aria-selected=true]")?.textContent || "";
    $("#cabecalho-impressao").textContent = `Calculadora RTC Fácil · ${aba} · ${new Date().toLocaleString("pt-BR")} · motor ${$("#chip-versao").textContent.replace(/^motor\s*/, "")}`;
  });
  $("#zerar-confirmar").addEventListener("click", zerarTudo);
  $("#op-data").addEventListener("change", aoMudarData);
  $("#op-uf").addEventListener("change", async () => { await carregarMunicipios($("#op-uf").value); await preencherAliquotasReferencia(true); salvar(); });
  $("#op-mun").addEventListener("change", async () => { await preencherAliquotasReferencia(true); salvar(); });
  $("#btn-add").addEventListener("click", () => {
    estado.itens.push(novoItem());
    renderizarItens();
    $$("#lista-itens .item").at(-1)?.querySelector("[data-c=descricao]")?.focus();
    salvar();
  });
  $("#sel-exemplo").addEventListener("change", async (ev) => { await carregarExemplo(ev.target.value); ev.target.value = ""; });
  $("#btn-limpar").addEventListener("click", () => {
    if (estado.itens.length && !confirm("Remover todos os itens?")) return;
    estado.itens = []; renderizarItens(); salvar();
  });
  $("#btn-exportar").addEventListener("click", exportarItens);
  $("#inp-importar").addEventListener("change", (ev) => { if (ev.target.files[0]) importarItens(ev.target.files[0]); ev.target.value = ""; });
  $("#btn-calcular").addEventListener("click", calcular);
  $("#btn-comparar").addEventListener("click", comparar);
  for (const sel of Object.values(ladosCmp)) $(sel).addEventListener("change", () => { renderizarPainelComparacao(); salvar(); });
  $("#btn-editar-nota").addEventListener("click", () => trocarAba("calcular"));
  $$("[data-ir]").forEach((b) => b.addEventListener("click", () => trocarAba(b.dataset.ir)));
  $("#btn-antesdepois").addEventListener("click", calcularAntesDepois);
  $("#ad-data").addEventListener("change", () => { renderizarAntesDepois(); salvar(); });
  for (const id of ["#ad-regime", "#ad-icms", "#ad-iss", "#ad-sn-opcao"]) $(id).addEventListener("change", () => { renderizarAntesDepois(); salvar(); });
  $("#ad-sn-anexo").addEventListener("change", () => { $("#ad-sn-aliq").value = PARTILHA_SN[$("#ad-sn-anexo").value].aliqFaixa1; renderizarAntesDepois(); salvar(); });
  $("#ad-sn-aliq").addEventListener("change", salvar);
  $("#ad-itens").addEventListener("input", (ev) => {
    const it = estado.itens.find((i) => String(i.id) === ev.target.dataset.id);
    if (!it) return;
    it["ad_" + ev.target.dataset.ad] = ev.target.type === "checkbox" ? (ev.target.checked ? "1" : "0") : ev.target.value;
    salvar();
  });
  $("#ad-restaurar").addEventListener("click", () => {
    for (const it of estado.itens) for (const k of Object.keys(it)) if (k.startsWith("ad_")) delete it[k];
    salvar(); renderizarAntesDepois();
  });
  for (const id of ["#ad-vendedor", "#ad-fabrica", "#ad-icms-base"]) $(id).addEventListener("change", () => { renderizarAntesDepois(); salvar(); });
  $("#cmp-is").addEventListener("input", (ev) => {
    const it = estado.itens.find((i) => String(i.id) === ev.target.dataset.is);
    if (it) { it.aliqIS = ev.target.value; salvar(); }
  });
  $("#btn-csv").addEventListener("click", exportarCsv);
  $("#btn-imprimir").addEventListener("click", () => window.print());
  $("#btn-json").addEventListener("click", () => {
    const c = estado.ultimoCalculo || {};
    $("#json-env").textContent = JSON.stringify(c.enviado, null, 2);
    $("#json-rec").textContent = typeof c.recebido === "string" ? c.recebido : JSON.stringify(c.recebido, null, 2);
    $("#dlg-json").showModal();
  });
  $$("[data-copiar]").forEach((b) => b.addEventListener("click", async (ev) => {
    ev.preventDefault();
    try { await navigator.clipboard.writeText($("#" + b.dataset.copiar).textContent); b.textContent = "Copiado"; }
    catch { b.textContent = "Selecione e copie"; }
    setTimeout(() => { b.textContent = "Copiar"; }, 1500);
  }));
  let tBusca;
  $("#busca-ncm").addEventListener("input", () => { clearTimeout(tBusca); tBusca = setTimeout(buscarNcm, 200); });
  $("#busca-class").addEventListener("input", buscarClassificacao);
  $("#res-ncm").addEventListener("click", (ev) => {
    const ncm = ev.target.dataset?.add;
    if (!ncm) return;
    estado.itens.push(novoItem({ codigo: ncm, descricao: ev.target.closest("li").querySelector("span").firstChild.textContent.slice(0, 80) }));
    renderizarItens(); salvar();
    ev.target.textContent = "Adicionado";
  });
  $("#tab-detalhe").addEventListener("click", (ev) => {
    const tr = ev.target.closest("tr.clicavel");
    if (tr) { const m = $(`#tab-detalhe tr[data-m="${tr.dataset.n}"]`); m.hidden = !m.hidden; }
  });
  $("#btn-verificar").addEventListener("click", pedirAtualizacao);
  $("#btn-encerrar").addEventListener("click", encerrarCalculadora);
  $("#preparo-tentar").addEventListener("click", pedirAtualizacao);
  $("#preparo details").addEventListener("toggle", async (ev) => {
    if (!ev.target.open) return;
    try { $("#preparo-log").textContent = await (await fetch("/painel/log", { cache: "no-store" })).text(); } catch { /* sem log */ }
  });
  ligarEditor();
}

ligarEventos();
acompanharPainel();
