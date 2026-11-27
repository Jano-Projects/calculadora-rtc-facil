/* Calculadora RTC Fácil — Simples Nacional: tabelas da lei e alíquotas efetivas.
 *
 * Quem é do Simples paga quase todos os tributos numa guia só, o DAS. O valor do DAS é a receita do mês vezes a
 * ALÍQUOTA EFETIVA, que depende do anexo da atividade e da receita bruta dos últimos 12 meses (RBT12):
 *
 *     alíquota efetiva = (RBT12 × alíquota nominal da faixa − parcela a deduzir) ÷ RBT12      (LC 123, art. 18, § 1º-A)
 *
 * A PARTILHA diz que parte do DAS é de cada tributo (IRPJ, CSLL, PIS/Cofins ou CBS, CPP, IPI, ICMS ou ISS, IBS).
 * A reforma não muda a alíquota do Simples: muda a partilha, ano a ano (LC 214/2025, Anexos XVIII a XXII, que
 * reescrevem os Anexos I a V da LC 123):
 *   2026        PIS e Cofins como hoje; o Simples não tem CBS nem IBS de teste (LC 214, art. 348, III, "c": as
 *               alíquotas de teste não se aplicam às operações dos optantes pelo Simples Nacional);
 *   2027–2028   a parte do PIS/Cofins vira CBS + uma fração mínima de IBS;
 *   2029–2032   a CBS volta a ocupar toda a antiga parte do PIS/Cofins, e o IBS toma 10% por ano da parte do ICMS/ISS;
 *   2033        o ICMS e o ISS saem; o IBS ocupa a parte deles.
 *
 * Desses números saem as alíquotas efetivas de CBS e IBS dentro do DAS — o que o PGDAS publica para cada empresa e o
 * que a calculadora oficial do Simples Nacional recebe para calcular o destaque na nota (pCBSSN e pIBSSN):
 *
 *     pCBSSN = alíquota efetiva × partilha da CBS          pIBSSN = alíquota efetiva × partilha do IBS
 *
 * Fonte das tabelas: LC 214/2025, Anexos XVIII (I, comércio), XIX (II, indústria), XX (III, serviços), XXI (IV,
 * serviços) e XXII (V, serviços), no texto publicado pelo Senado Federal (legis.senado.leg.br/norma/40180341).
 * A partilha de 2026 não está nesses anexos: é a da LC 123 em vigor, e coincide com a de 2029 em diante com
 * PIS/Cofins no lugar da CBS e ICMS/ISS no lugar de ICMS/ISS + IBS (conferido faixa a faixa nos cinco anexos).
 */
"use strict";

/* ---------------------------------------------------------------- tabelas da lei
 * aliquotas: [alíquota nominal %, parcela a deduzir R$] por faixa (1ª a 6ª). "ate2028" vale em 2027 e 2028 (na
 *   6ª faixa a alíquota é um pouco menor nesses dois anos); "desde2029" vale em 2026 e de 2029 em diante.
 * partilha: % do DAS de cada tributo por faixa, nos anos 2027 (= 2027 e 2028), 2029, 2030, 2031, 2032 e 2033.
 *   Colunas na ordem de "colunas". null = o tributo não está no DAS naquela faixa (6ª faixa: acima do sublimite
 *   de R$ 3,6 milhões, ICMS, ISS e IBS são recolhidos fora do Simples).
 * O Anexo IV não tem CPP: a contribuição previdenciária dessas atividades é paga à parte, sobre a folha. */
const FAIXAS_RBT12 = [180000, 360000, 720000, 1800000, 3600000, 4800000];

const ANEXOS_SN = {
  I: {
    nome: "Anexo I — comércio",
    local: "icms",
    colunas: ["irpj", "csll", "cbs", "cpp", "icms", "ibs"],
    aliquotas: {
      ate2028: [[4, 0], [7.3, 5940], [9.5, 13860], [10.7, 22500], [14.3, 87300], [18.9, 378000]],
      desde2029: [[4, 0], [7.3, 5940], [9.5, 13860], [10.7, 22500], [14.3, 87300], [19, 378000]],
    },
    partilha: {
      2027: [[5.5, 3.5, 15.33, 41.5, 34, 0.17], [5.5, 3.5, 15.33, 41.5, 34, 0.17], [5.5, 3.5, 15.33, 42, 33.5, 0.17],
        [5.5, 3.5, 15.33, 42, 33.5, 0.17], [5.5, 3.5, 15.33, 42, 33.5, 0.17], [13.58, 10.06, 34.02, 42.34, null, null]],
      2029: [[5.5, 3.5, 15.5, 41.5, 30.6, 3.4], [5.5, 3.5, 15.5, 41.5, 30.6, 3.4], [5.5, 3.5, 15.5, 42, 30.15, 3.35],
        [5.5, 3.5, 15.5, 42, 30.15, 3.35], [5.5, 3.5, 15.5, 42, 30.15, 3.35], [13.5, 10, 34.4, 42.1, null, null]],
      2030: [[5.5, 3.5, 15.5, 41.5, 27.2, 6.8], [5.5, 3.5, 15.5, 41.5, 27.2, 6.8], [5.5, 3.5, 15.5, 42, 26.8, 6.7],
        [5.5, 3.5, 15.5, 42, 26.8, 6.7], [5.5, 3.5, 15.5, 42, 26.8, 6.7], [13.5, 10, 34.4, 42.1, null, null]],
      2031: [[5.5, 3.5, 15.5, 41.5, 23.8, 10.2], [5.5, 3.5, 15.5, 41.5, 23.8, 10.2], [5.5, 3.5, 15.5, 42, 23.45, 10.05],
        [5.5, 3.5, 15.5, 42, 23.45, 10.05], [5.5, 3.5, 15.5, 42, 23.45, 10.05], [13.5, 10, 34.4, 42.1, null, null]],
      2032: [[5.5, 3.5, 15.5, 41.5, 20.4, 13.6], [5.5, 3.5, 15.5, 41.5, 20.4, 13.6], [5.5, 3.5, 15.5, 42, 20.1, 13.4],
        [5.5, 3.5, 15.5, 42, 20.1, 13.4], [5.5, 3.5, 15.5, 42, 20.1, 13.4], [13.5, 10, 34.4, 42.1, null, null]],
      2033: [[5.5, 3.5, 15.5, 41.5, 0, 34], [5.5, 3.5, 15.5, 41.5, 0, 34], [5.5, 3.5, 15.5, 42, 0, 33.5],
        [5.5, 3.5, 15.5, 42, 0, 33.5], [5.5, 3.5, 15.5, 42, 0, 33.5], [13.5, 10, 34.4, 42.1, null, null]],
    },
  },
  II: {
    nome: "Anexo II — indústria",
    local: "icms",
    colunas: ["irpj", "csll", "cbs", "cpp", "ipi", "icms", "ibs"],
    aliquotas: {
      ate2028: [[4.5, 0], [7.8, 5940], [10, 13860], [11.2, 22500], [14.7, 85500], [29.9, 720000]],
      desde2029: [[4.5, 0], [7.8, 5940], [10, 13860], [11.2, 22500], [14.7, 85500], [30, 720000]],
    },
    partilha: {
      2027: [...Array(5)].map(() => [5.5, 3.5, 13.85, 37.5, 7.5, 32, 0.15]).concat([[8.53, 7.53, 25.22, 23.59, 35.13, null, null]]),
      2029: [...Array(5)].map(() => [5.5, 3.5, 14, 37.5, 7.5, 28.8, 3.2]).concat([[8.5, 7.5, 25.5, 23.5, 35, null, null]]),
      2030: [...Array(5)].map(() => [5.5, 3.5, 14, 37.5, 7.5, 25.6, 6.4]).concat([[8.5, 7.5, 25.5, 23.5, 35, null, null]]),
      2031: [...Array(5)].map(() => [5.5, 3.5, 14, 37.5, 7.5, 22.4, 9.6]).concat([[8.5, 7.5, 25.5, 23.5, 35, null, null]]),
      2032: [...Array(5)].map(() => [5.5, 3.5, 14, 37.5, 7.5, 19.2, 12.8]).concat([[8.5, 7.5, 25.5, 23.5, 35, null, null]]),
      2033: [...Array(5)].map(() => [5.5, 3.5, 14, 37.5, 7.5, 0, 32]).concat([[8.5, 7.5, 25.5, 23.5, 35, null, null]]),
    },
  },
  III: {
    nome: "Anexo III — serviços",
    local: "iss",
    colunas: ["irpj", "csll", "cbs", "cpp", "iss", "ibs"],
    aliquotas: {
      ate2028: [[6, 0], [11.2, 9360], [13.5, 17640], [16, 35640], [21, 125640], [32.9, 648000]],
      desde2029: [[6, 0], [11.2, 9360], [13.5, 17640], [16, 35640], [21, 125640], [33, 648000]],
    },
    partilha: {
      2027: [[4, 3.5, 15.43, 43.4, 33.5, 0.17], [4, 3.5, 16.91, 43.4, 32, 0.19], [4, 3.5, 16.42, 43.4, 32.5, 0.19],
        [4, 3.5, 16.42, 43.4, 32.5, 0.19], [4, 3.5, 15.43, 43.4, 33.5, 0.17], [35.09, 15.04, 19.29, 30.58, null, null]],
      2029: [[4, 3.5, 15.6, 43.4, 30.15, 3.35], [4, 3.5, 17.1, 43.4, 28.8, 3.2], [4, 3.5, 16.6, 43.4, 29.25, 3.25],
        [4, 3.5, 16.6, 43.4, 29.25, 3.25], [4, 3.5, 15.6, 43.4, 30.15, 3.35], [35, 15, 19.5, 30.5, null, null]],
      2030: [[4, 3.5, 15.6, 43.4, 26.8, 6.7], [4, 3.5, 17.1, 43.4, 25.6, 6.4], [4, 3.5, 16.6, 43.4, 26, 6.5],
        [4, 3.5, 16.6, 43.4, 26, 6.5], [4, 3.5, 15.6, 43.4, 26.8, 6.7], [35, 15, 19.5, 30.5, null, null]],
      2031: [[4, 3.5, 15.6, 43.4, 23.45, 10.05], [4, 3.5, 17.1, 43.4, 22.4, 9.6], [4, 3.5, 16.6, 43.4, 22.75, 9.75],
        [4, 3.5, 16.6, 43.4, 22.75, 9.75], [4, 3.5, 15.6, 43.4, 23.45, 10.05], [35, 15, 19.5, 30.5, null, null]],
      2032: [[4, 3.5, 15.6, 43.4, 20.1, 13.4], [4, 3.5, 17.1, 43.4, 19.2, 12.8], [4, 3.5, 16.6, 43.4, 19.5, 13],
        [4, 3.5, 16.6, 43.4, 19.5, 13], [4, 3.5, 15.6, 43.4, 20.1, 13.4], [35, 15, 19.5, 30.5, null, null]],
      2033: [[4, 3.5, 15.6, 43.4, 0, 33.5], [4, 3.5, 17.1, 43.4, 0, 32], [4, 3.5, 16.6, 43.4, 0, 32.5],
        [4, 3.5, 16.6, 43.4, 0, 32.5], [4, 3.5, 15.6, 43.4, 0, 33.5], [35, 15, 19.5, 30.5, null, null]],
    },
    // 5ª faixa: o ISS efetivo é limitado a 5% da receita; acima de 14,92537% de alíquota efetiva, o excedente vai
    // para os tributos federais por estas frações de (alíquota efetiva − 5%). De 2029 a 2032, os 5 pontos se
    // dividem entre ISS e IBS (ISS 4,5 + IBS 0,5 em 2029... ISS 3 + IBS 2 em 2032).
    teto: {
      limite: 14.92537,
      hoje: { irpj: 6.02, csll: 5.26, pc: 23.46, cpp: 65.26, local: 5 },
      2027: { irpj: 6.02, csll: 5.26, cbs: 23.2, cpp: 65.26, ibsFracao: 0.26, local: 5 },
      2029: { irpj: 6.02, csll: 5.26, cbs: 23.46, cpp: 65.26, local: 4.5, ibs: 0.5 },
      2030: { irpj: 6.02, csll: 5.26, cbs: 23.46, cpp: 65.26, local: 4, ibs: 1 },
      2031: { irpj: 6.02, csll: 5.26, cbs: 23.46, cpp: 65.26, local: 3.5, ibs: 1.5 },
      2032: { irpj: 6.02, csll: 5.26, cbs: 23.46, cpp: 65.26, local: 3, ibs: 2 },
    },
  },
  IV: {
    nome: "Anexo IV — serviços (sem CPP no DAS)",
    local: "iss",
    colunas: ["irpj", "csll", "cbs", "iss", "ibs"],
    aliquotas: {
      ate2028: [[4.5, 0], [9, 8100], [10.2, 12420], [14, 39780], [22, 183780], [32.9, 828000]],
      desde2029: [[4.5, 0], [9, 8100], [10.2, 12420], [14, 39780], [22, 183780], [33, 828000]],
    },
    partilha: {
      2027: [[18.8, 15.2, 21.26, 44.5, 0.24], [19.8, 15.2, 24.73, 40, 0.27], [20.8, 15.2, 23.74, 40, 0.26],
        [17.8, 19.2, 22.75, 40, 0.25], [18.8, 19.2, 21.76, 40, 0.24], [53.71, 21.59, 24.7, null, null]],
      2029: [[18.8, 15.2, 21.5, 40.05, 4.45], [19.8, 15.2, 25, 36, 4], [20.8, 15.2, 24, 36, 4],
        [17.8, 19.2, 23, 36, 4], [18.8, 19.2, 22, 36, 4], [53.5, 21.5, 25, null, null]],
      2030: [[18.8, 15.2, 21.5, 35.6, 8.9], [19.8, 15.2, 25, 32, 8], [20.8, 15.2, 24, 32, 8],
        [17.8, 19.2, 23, 32, 8], [18.8, 19.2, 22, 32, 8], [53.5, 21.5, 25, null, null]],
      2031: [[18.8, 15.2, 21.5, 31.15, 13.35], [19.8, 15.2, 25, 28, 12], [20.8, 15.2, 24, 28, 12],
        [17.8, 19.2, 23, 28, 12], [18.8, 19.2, 22, 28, 12], [53.5, 21.5, 25, null, null]],
      2032: [[18.8, 15.2, 21.5, 26.7, 17.8], [19.8, 15.2, 25, 24, 16], [20.8, 15.2, 24, 24, 16],
        [17.8, 19.2, 23, 24, 16], [18.8, 19.2, 22, 24, 16], [53.5, 21.5, 25, null, null]],
      2033: [[18.8, 15.2, 21.5, 0, 44.5], [19.8, 15.2, 25, 0, 40], [20.8, 15.2, 24, 0, 40],
        [17.8, 19.2, 23, 0, 40], [18.8, 19.2, 22, 0, 40], [53.5, 21.5, 25, null, null]],
    },
    teto: {
      limite: 12.5,
      hoje: { irpj: 31.33, csll: 32, pc: 36.67, local: 5 },
      2027: { irpj: 31.33, csll: 32, cbs: 36.27, ibsFracao: 0.4, local: 5 },
      2029: { irpj: 31.33, csll: 32, cbs: 36.67, local: 4.5, ibs: 0.5 },
      2030: { irpj: 31.33, csll: 32, cbs: 36.67, local: 4, ibs: 1 },
      2031: { irpj: 31.33, csll: 32, cbs: 36.67, local: 3.5, ibs: 1.5 },
      2032: { irpj: 31.33, csll: 32, cbs: 36.67, local: 3, ibs: 2 },
    },
  },
  V: {
    nome: "Anexo V — serviços",
    local: "iss",
    colunas: ["irpj", "csll", "cbs", "cpp", "iss", "ibs"],
    aliquotas: {
      ate2028: [[15.5, 0], [18, 4500], [19.5, 9900], [20.5, 17100], [23, 62100], [30.4, 540000]],
      desde2029: [[15.5, 0], [18, 4500], [19.5, 9900], [20.5, 17100], [23, 62100], [30.5, 540000]],
    },
    partilha: {
      2027: [[25, 15, 16.96, 28.85, 14, 0.19], [23, 15, 16.96, 27.85, 17, 0.19], [24, 15, 17.95, 23.85, 19, 0.2],
        [21, 15, 18.94, 23.85, 21, 0.21], [23, 12.5, 16.96, 23.85, 23.5, 0.19], [35.1, 15.54, 19.78, 29.58, null, null]],
      2029: [[25, 15, 17.15, 28.85, 12.6, 1.4], [23, 15, 17.15, 27.85, 15.3, 1.7], [24, 15, 18.15, 23.85, 17.1, 1.9],
        [21, 15, 19.15, 23.85, 18.9, 2.1], [23, 12.5, 17.15, 23.85, 21.15, 2.35], [35, 15.5, 20, 29.5, null, null]],
      2030: [[25, 15, 17.15, 28.85, 11.2, 2.8], [23, 15, 17.15, 27.85, 13.6, 3.4], [24, 15, 18.15, 23.85, 15.2, 3.8],
        [21, 15, 19.15, 23.85, 16.8, 4.2], [23, 12.5, 17.15, 23.85, 18.8, 4.7], [35, 15.5, 20, 29.5, null, null]],
      2031: [[25, 15, 17.15, 28.85, 9.8, 4.2], [23, 15, 17.15, 27.85, 11.9, 5.1], [24, 15, 18.15, 23.85, 13.3, 5.7],
        [21, 15, 19.15, 23.85, 14.7, 6.3], [23, 12.5, 17.15, 23.85, 16.45, 7.05], [35, 15.5, 20, 29.5, null, null]],
      2032: [[25, 15, 17.15, 28.85, 8.4, 5.6], [23, 15, 17.15, 27.85, 10.2, 6.8], [24, 15, 18.15, 23.85, 11.4, 7.6],
        [21, 15, 19.15, 23.85, 12.6, 8.4], [23, 12.5, 17.15, 23.85, 14.1, 9.4], [35, 15.5, 20, 29.5, null, null]],
      2033: [[25, 15, 17.15, 28.85, 0, 14], [23, 15, 17.15, 27.85, 0, 17], [24, 15, 18.15, 23.85, 0, 19],
        [21, 15, 19.15, 23.85, 0, 21], [23, 12.5, 17.15, 23.85, 0, 23.5], [35, 15.5, 20, 29.5, null, null]],
    },
  },
};

/* Atividades do Simples (cAtivSN), com o anexo de cada uma. A lista oficial vem do motor do Simples
 * (GET /simples-nacional/atividades); esta é a reserva para quando ele não estiver disponível, copiada do banco
 * oficial (tabela ATIVIDADE_SIMPLES_NACIONAL). A atividade 09 vai para o Anexo III com fator "r" ≥ 28% e para o V
 * sem ele. */
// [código, anexo sem fator "r", anexo com fator "r", descrição, documento: "nfe" (NF-e/NFC-e) ou "nfse"]
const ATIVIDADES_SN_RESERVA = [
  ["01", "I", null, "Revenda de mercadorias, venda de mercadorias industrializadas pelo contribuinte", "nfe"],
  ["02", "I", null, "Operações com os demais bens materiais, sem incidência de ICMS", "nfe"],
  ["03", "II", null, "Venda de mercadorias industrializadas pelo contribuinte, com industrialização incentivada na Zona Franca de Manaus", "nfe"],
  ["04", "II", null, "Operações com os demais bens materiais, com industrialização incentivada na Zona Franca de Manaus, sem incidência de ICMS", "nfe"],
  ["07", "III", null, "Prestação de serviços, cessão de direitos, de uso ou de espaço com incidência do ISS, tributados exclusivamente pelo Anexo III", "nfse"],
  ["08", "III", null, "Prestação de serviços contábeis autorizados a pagar o ISS em valor fixo em guia do Município", "nfse"],
  ["09", "V", "III", "Prestação de serviços — sujeitos ao fator \"r\"", "nfse"],
  ["10", "III", null, "Prestação de serviços de transporte municipal de passageiros (subitem 16.01 da LC 116/2003)", "nfse"],
  ["11", "III", null, "Locação de bens móveis e operações com serviços, bens imateriais e direitos, inclusive com bens imóveis, sem incidência de ISS", "nfse"],
  ["12", "III", null, "Prestação de serviços da construção civil (subitens 7.02 e 7.05 da LC 116/2003) — Anexo III", "nfse"],
  ["13", "IV", null, "Prestação de serviços da construção civil (subitens 7.02 e 7.05 da LC 116/2003) — Anexo IV", "nfse"],
  ["14", "IV", null, "Prestação de serviços do Anexo IV", "nfse"],
];
// As atividades 05 (transporte intermunicipal, no CT-e) e 06 (comunicação, na NFCom) usam documentos que esta tela
// não monta. A 90 ("operações não tributáveis") não tem anexo.

/* ---------------------------------------------------------------- contas */

/** Faixa (1 a 6) da receita bruta dos últimos 12 meses; acima de R$ 4,8 milhões a empresa sai do Simples (7). */
function faixaSN(rbt12) {
  const i = FAIXAS_RBT12.findIndex((limite) => rbt12 <= limite);
  return i < 0 ? 7 : i + 1;
}

/** Ano da tabela de partilha (2026 = "hoje"; 2027 e 2028 usam a mesma; 2033 em diante, a final). */
const anoPartilhaSN = (ano) => (ano <= 2026 ? "hoje" : ano <= 2028 ? 2027 : Math.min(ano, 2033));

/** Alíquota efetiva do DAS, em %: (RBT12 × nominal − parcela a deduzir) ÷ RBT12. Sem receita nos 12 meses (início de
 *  atividade), vale a nominal da 1ª faixa — simplificação: a lei manda proporcionalizar a receita do início. */
function aliquotaEfetivaSN(anexo, rbt12, ano) {
  const tab = ANEXOS_SN[anexo].aliquotas[ano >= 2027 && ano <= 2028 ? "ate2028" : "desde2029"];
  const f = Math.min(faixaSN(rbt12), 6);
  const [nominal, deduzir] = tab[f - 1];
  if (!(rbt12 > 0)) return tab[0][0];
  return (rbt12 * nominal / 100 - deduzir) / rbt12 * 100;
}

/** Partilha do DAS no ano, em % do DAS, com os tributos com nome: { irpj, csll, cpp, pc, cbs, ipi, icms, iss, ibs }.
 *  pc = PIS + Cofins (só em 2026). Valores null = fora do DAS (6ª faixa). Com o teto do ISS (5ª faixa dos Anexos III
 *  e IV), a partilha é recalculada a partir da alíquota efetiva, como manda a nota (*) dos anexos. */
function partilhaSN(anexo, faixa, ano, efetiva, comTeto = true) {
  const a = ANEXOS_SN[anexo];
  const chave = anoPartilhaSN(ano);
  const linha = (tab) => Object.fromEntries(a.colunas.map((c, i) => [c, tab[faixa - 1][i]]));
  let p;
  if (chave === "hoje") {
    // 2026: PIS/Cofins = CBS de 2029; ICMS/ISS = ICMS/ISS + IBS de 2029; sem CBS nem IBS
    const l29 = linha(a.partilha[2029]);
    p = { ...l29, pc: l29.cbs, cbs: 0, ibs: 0 };
    p[a.local] = l29[a.local] === null ? null : l29[a.local] + l29.ibs;
  } else {
    p = { ...linha(a.partilha[chave]), pc: 0 };
  }
  for (const c of ["irpj", "csll", "cpp", "ipi", "icms", "iss", "ibs", "cbs", "pc"]) if (p[c] === undefined) p[c] = 0;

  // teto do ISS na 5ª faixa (Anexos III e IV), até 2032
  const teto = a.teto && faixa === 5 && comTeto && efetiva > a.teto.limite ? a.teto[chave === "hoje" ? "hoje" : chave] : null;
  if (teto) {
    const resto = efetiva - 5; // pontos percentuais da receita que vão para os tributos federais
    const emReceita = { irpj: resto * teto.irpj / 100, csll: resto * teto.csll / 100, cpp: resto * (teto.cpp || 0) / 100,
      pc: resto * (teto.pc || 0) / 100, cbs: resto * (teto.cbs || 0) / 100,
      ibs: teto.ibs !== undefined ? teto.ibs : resto * (teto.ibsFracao || 0) / 100 };
    emReceita[a.local] = teto.local;
    p = { ...p, ...Object.fromEntries(Object.entries(emReceita).map(([k, v]) => [k, v / efetiva * 100])) };
  }
  return p;
}

/** Tudo o que a tela precisa do Simples numa data, para um anexo:
 *  { anexo, faixa, efetiva (%), partilha (% do DAS), pCBSSN e pIBSSN (% da receita, com e sem o teto do ISS),
 *    foraDoSimples (RBT12 acima de R$ 4,8 mi), acimaSublimite (6ª faixa: ICMS, ISS e IBS fora do DAS) }. */
function simplesNoAno(anexo, rbt12, data) {
  const ano = anoDe(data);
  const faixa = faixaSN(rbt12);
  if (faixa > 6) return { anexo, faixa, foraDoSimples: true };
  const efetiva = aliquotaEfetivaSN(anexo, rbt12, ano);
  const partilha = partilhaSN(anexo, faixa, ano, efetiva, true);
  const semTeto = partilhaSN(anexo, faixa, ano, efetiva, false);
  const p = (part, k) => (part[k] === null ? null : efetiva * part[k] / 100);
  return {
    anexo, faixa, efetiva, partilha, ano,
    acimaSublimite: faixa === 6,
    pCBSSN: p(partilha, "cbs"), pIBSSN: faixa === 6 ? null : p(partilha, "ibs"),
    semRedistribuicao: { pCBSSN: p(semTeto, "cbs"), pIBSSN: faixa === 6 ? null : p(semTeto, "ibs") },
  };
}

/** Alíquota em texto para o motor do Simples: pontos percentuais, sem notação científica (até 10 casas). */
const textoAliquotaSN = (v) => (v === null || v === undefined ? null : Number(v).toFixed(10).replace(/0+$/, "").replace(/\.$/, ""));

/** Partes do DAS de um valor de receita, em R$, com nomes para exibir. */
function dasDaReceita(sn, receita) {
  const nomes = { irpj: "IRPJ", csll: "CSLL", pc: "PIS e Cofins", cbs: "CBS", cpp: "CPP (previdência)", ipi: "IPI",
    icms: "ICMS", iss: "ISS", ibs: "IBS" };
  const partes = [];
  for (const k of ["irpj", "csll", "pc", "cbs", "cpp", "ipi", "icms", "iss", "ibs"]) {
    const v = sn.partilha[k];
    if (v) partes.push({ chave: k, nome: nomes[k], pct: v, valor: receita * sn.efetiva / 100 * v / 100 });
  }
  return { total: receita * sn.efetiva / 100, partes };
}

/** Arredondamento "meio para o par" (HALF_EVEN, ABNT NBR 5891), o mesmo da calculadora oficial do Simples:
 *  0,125 → 0,12 e 0,135 → 0,14. Usado só na estimativa local, quando o motor do Simples não responde. */
function arredPar(v, casas = 2) {
  const f = 10 ** casas, x = Number((v * f).toFixed(6));
  const base = Math.floor(x), resto = x - base;
  if (Math.abs(resto - 0.5) < 1e-6) return (base % 2 === 0 ? base : base + 1) / f;
  return Math.round(x) / f;
}

/* ====================================================================== quem emite a nota
 * Painel comum a todas as abas (fica na aba Calcular nota). Define se a nota é de uma empresa do regime regular
 * (lucro real ou presumido) ou do Simples Nacional e, no Simples, os dados que o PGDAS usa: receita dos últimos
 * 12 meses, atividade, fator "r", retenção do ISS e a opção de recolher CBS e IBS por fora a partir de 2027. */

/** Endereço do motor do Simples Nacional (repassado pelo painel local a ele, como /api). */
const API_SN = "/api-simples/calculadora";
let atividadesSN = ATIVIDADES_SN_RESERVA.map(([codigo, semR, comR, descricao, doc]) => ({ codigo, semR, comR, descricao, doc }));

/** O que está no painel "Quem emite a nota". */
function emitente() {
  const regime = $("#em-regime").value || "real";
  return {
    regime, // real | presumido | simples
    rbt12: num($("#em-rbt12").value) ?? 0,
    ativProd: $("#em-ativ-prod").value || "01",
    ativServ: $("#em-ativ-serv").value || "07",
    fatorR: $("#em-fatorr").checked,
    opcao: $("#em-opcao").value || "dentro", // dentro | fora (CBS e IBS pelo regime regular)
    issRetido: $("#em-iss-retido").checked,
  };
}
/** A nota é de empresa do Simples (e ainda dentro do limite de R$ 4,8 milhões)? */
const emiteSimples = (em = emitente()) => em.regime === "simples" && faixaSN(em.rbt12) <= 6;

/** Anexo de uma atividade do Simples; a 09 vai para o III com fator "r" de 28% ou mais, e para o V sem ele. */
function anexoDaAtividade(codigo, fatorR) {
  const a = atividadesSN.find((x) => x.codigo === codigo);
  if (!a) return codigo >= "07" ? "III" : "I";
  return fatorR && a.comR ? a.comR : a.semR;
}
/** Anexo de um item da nota: serviços (NBS) pela atividade dos serviços; produtos (NCM), pela dos produtos. */
const anexoDoItem = (it, em = emitente()) => anexoDaAtividade(it.tipo === "nbs" ? em.ativServ : em.ativProd, em.fatorR);

/** A data e o regime pedem as alíquotas de CBS e IBS do regime regular? (2027 em diante, menos no Simples que
 *  recolhe dentro do DAS abaixo do sublimite: ali valem as alíquotas efetivas do próprio Simples.) */
function precisaAliquotas(data, em = emitente()) {
  if (anoDe(data) < ANO_ALIQ_OBRIGATORIA) return false;
  if (!emiteSimples(em)) return true;
  return em.opcao === "fora" || faixaSN(em.rbt12) === 6; // acima do sublimite o IBS é do regime regular
}

/** Linha de alíquotas efetivas do contribuinte no período, no formato da calculadora oficial do Simples
 *  (pontos percentuais em texto): os cinco anexos, com o par "sem redistribuição do ISS" nos anexos de serviço. */
function aliquotasEfetivasSN(data, em = emitente()) {
  const linha = { fatorR: em.fatorR, impedimentoSublimite: faixaSN(em.rbt12) === 6 };
  for (const anexo of ["I", "II", "III", "IV", "V"]) {
    const s = simplesNoAno(anexo, em.rbt12, data);
    const par = { pCBSSN: textoAliquotaSN(s.pCBSSN), pIBSSN: textoAliquotaSN(s.pIBSSN) };
    if (ANEXOS_SN[anexo].local === "iss") {
      par.semRedistribuicaoISS = { pCBSSN: textoAliquotaSN(s.semRedistribuicao.pCBSSN), pIBSSN: textoAliquotaSN(s.semRedistribuicao.pIBSSN) };
    }
    linha["anexo" + anexo] = par;
  }
  return linha;
}

/** Busca as atividades do Simples no motor oficial (vigentes a partir de 2027); se ele não responder, fica a lista
 *  de reserva. Preenche as listas de atividade dos produtos (NF-e) e dos serviços (NFS-e). */
async function carregarAtividadesSN() {
  try {
    const r = await fetch(`${API_SN}/simples-nacional/atividades?data=2027-01-01`, { headers: { Accept: "application/json" } });
    if (r.ok) {
      const lista = await r.json();
      const doc = (a) => ((a.tpDocsAdmissiveis || []).includes("91") ? "nfse" : (a.tpDocsAdmissiveis || []).some((t) => t === "55" || t === "65") ? "nfe" : null);
      const novas = lista.filter((a) => a.anexoSemFatorR && doc(a))
        .map((a) => ({ codigo: a.codigo, semR: a.anexoSemFatorR, comR: a.anexoComFatorR || null, descricao: a.descricao, doc: doc(a) }));
      if (novas.length) atividadesSN = novas;
    }
  } catch { /* fica a lista de reserva */ }
  const opcoes = (doc, sel) => atividadesSN.filter((a) => a.doc === doc).map((a) =>
    `<option value="${esc(a.codigo)}"${a.codigo === sel ? " selected" : ""}>${esc(a.codigo)} — Anexo ${esc(a.comR ? a.comR + " ou " + a.semR : a.semR)}: ${esc(a.descricao)}</option>`).join("");
  const p = $("#em-ativ-prod").value || $("#em-ativ-prod").dataset.salvo || "01", s = $("#em-ativ-serv").value || $("#em-ativ-serv").dataset.salvo || "07";
  $("#em-ativ-prod").innerHTML = opcoes("nfe", p);
  $("#em-ativ-serv").innerHTML = opcoes("nfse", s);
}

const nFaixa = (f) => `${f}ª faixa`;

/** Mostra ou esconde os campos do Simples e escreve o resumo: anexo, faixa, alíquota efetiva e as alíquotas de CBS
 *  e IBS dentro do DAS na data da aba Calcular nota. */
function renderizarEmitente() {
  const em = emitente();
  const sn = em.regime === "simples";
  $("#em-sn").hidden = !sn;
  $("#em-fatorr-caixa").hidden = em.ativServ !== "09";
  const r = $("#em-resumo");
  if (!sn) { r.innerHTML = ""; return; }
  const d = dataOp(), ano = anoDe(d), faixa = faixaSN(em.rbt12);
  if (faixa > 6) {
    r.innerHTML = `<strong>Receita acima de R$ 4,8 milhões:</strong> a empresa é excluída do Simples Nacional (LC 123, art. 3º, II). As abas calculam como regime regular.`;
    return;
  }
  const usados = [...new Set(estado.itens.map((it) => anexoDoItem(it, em)))];
  if (!usados.length) usados.push(anexoDaAtividade(em.ativProd, em.fatorR));
  const linhas = usados.map((anexo) => {
    const s = simplesNoAno(anexo, em.rbt12, d);
    const pares = ano < ANO_ALIQ_OBRIGATORIA
      ? `sem CBS e IBS em ${ano}`
      : em.opcao === "fora" ? "CBS e IBS por fora, pelo regime regular"
      : `CBS ${pct(s.pCBSSN, 4)} e IBS ${s.pIBSSN === null ? "fora do DAS" : pct(s.pIBSSN, 4)} da receita`;
    return `<li><strong>${esc(ANEXOS_SN[anexo].nome)}</strong>, ${nFaixa(faixa)}: alíquota efetiva do DAS de ${pct(s.efetiva, 4)} · ${pares}</li>`;
  });
  r.innerHTML = `<ul class="em-lista">${linhas.join("")}</ul>
    ${ano < ANO_ALIQ_OBRIGATORIA ? `Em ${ano}, o Simples não destaca a CBS e o IBS de teste (LC 214/2025, art. 348, III, "c"). ` : ""}
    ${faixa === 6 ? `<strong>Acima do sublimite de R$ 3,6 milhões:</strong> ICMS, ISS e IBS saem do DAS e são pagos pelas regras do regime regular (na NF-e, CRT 2). ` : ""}
    ${em.issRetido ? "Com o ISS retido pelo tomador, a parte do ISS sai do DAS, e a CBS e o IBS usam o par de alíquotas sem redistribuição do ISS. " : ""}
    Valores calculados pelas tabelas da LC 214/2025 (Anexos XVIII a XXII) a partir da receita informada: confira com o extrato do PGDAS do mês.
    MEI não está coberto: paga valor fixo mensal (DAS-MEI), sem CBS e IBS por nota.`;
}

/** Partes do DAS de uma nota, somadas por tributo, com o anexo e a faixa de cada grupo de itens.
 *  semCbsIbs: de 2027 em diante, quem recolhe CBS e IBS por fora tira os percentuais deles do DAS
 *  (LC 123, art. 18, com a redação da LC 214). Itens com erro no cálculo não entram. */
function dasDaNota(data, itens, em = emitente(), semCbsIbs = false) {
  const grupos = new Map();
  for (const it of itens) {
    if (!(it.valor > 0)) continue;
    const anexo = anexoDoItem(it, em);
    grupos.set(anexo, (grupos.get(anexo) || 0) + it.valor);
  }
  const porTributo = new Map(), detalhe = [];
  let retido = 0;
  for (const [anexo, receita] of grupos) {
    const sn = simplesNoAno(anexo, em.rbt12, data);
    const das = dasDaReceita(sn, receita);
    detalhe.push({ anexo, nome: ANEXOS_SN[anexo].nome, faixa: sn.faixa, efetiva: sn.efetiva, receita });
    for (const p of das.partes) {
      if (semCbsIbs && (p.chave === "cbs" || p.chave === "ibs")) continue;
      if (em.issRetido && p.chave === "iss") { retido += p.valor; continue; }
      porTributo.set(p.nome, (porTributo.get(p.nome) || 0) + p.valor);
    }
  }
  const ordem = ["IRPJ", "CSLL", "PIS e Cofins", "CBS", "CPP (previdência)", "IPI", "ICMS", "ISS", "IBS"];
  const linhas = ordem.filter((n) => porTributo.has(n)).map((nome) => ({ nome, valor: arred2(porTributo.get(nome)) }));
  // como no PGDAS, cada tributo é arredondado e o total é a soma das partes (pode diferir 1 centavo de receita × alíquota)
  const total = linhas.reduce((a, l) => a + l.valor, 0);
  return { linhas, total: arred2(total), retido: arred2(retido), grupos: detalhe, semCbsIbs, acimaSublimite: faixaSN(em.rbt12) === 6 };
}

/* ====================================================================== cálculo da nota conforme o regime
 * Uma função só para as abas Calcular nota e Comparar datas. Devolve o mesmo formato de interpretar()
 * ({ itens, tot, comErro }) com mais três campos: modo, das (partes do DAS, no Simples) e regular (o que o
 * regime regular destacaria, para comparação). Modos:
 *   regular     regime regular: calculadora oficial do regime regular (rota /regime-geral);
 *   sn-2026     Simples em 2026: sem CBS e IBS (LC 214, art. 348, III, "c"); o regime regular é calculado só para
 *               validar os códigos e mostrar, como referência, o que outra empresa destacaria;
 *   sn-dentro   Simples de 2027 em diante, CBS e IBS dentro do DAS: calculadora oficial do Simples Nacional;
 *   sn-fora     Simples de 2027 em diante com CBS e IBS por fora: regime regular para eles, DAS sem as partes deles. */
async function calcularNota(data, opcoes = {}) {
  const em = emitente();
  const ano = anoDe(data);
  const simples = emiteSimples(em);
  const precisa = precisaAliquotas(data, em);
  const avisos = [];
  if (em.regime === "simples" && !simples) avisos.push("Receita acima de R$ 4,8 milhões: calculado como regime regular.");
  // sem as alíquotas do regime regular (Simples dentro do DAS), a operação é montada com zero, só para validar os
  // itens e calcular o Imposto Seletivo
  const aliquotas = ano >= ANO_ALIQ_OBRIGATORIA && !precisa ? { cbs: 0, ibsEstadual: 0, ibsMunicipal: 0 } : opcoes.aliquotas;
  const m = await montarOperacao(data, { ...opcoes, aliquotas });
  if (m.erros.length) return { erros: m.erros, avisos: [...avisos, ...m.avisos] };
  avisos.push(...m.avisos);
  const operacao = m.operacao;
  const modo = !simples ? "regular" : ano < ANO_ALIQ_OBRIGATORIA ? "sn-2026" : em.opcao === "fora" ? "sn-fora" : "sn-dentro";
  const regularNecessario = modo !== "sn-dentro" || faixaSN(em.rbt12) === 6;

  let reg = null, rReg = null;
  if (regularNecessario) {
    rReg = await api("/observabilidade/regime-geral", { method: "POST", body: JSON.stringify(operacao) });
    reg = interpretar(rReg.corpo, operacao);
  }
  let resultado, enviado = operacao, recebido = rReg?.corpo, aviso = rReg?.cabecalhos.get("x-warning-dados-simulados");
  if (modo === "regular" || modo === "sn-fora") {
    resultado = reg;
  } else if (modo === "sn-2026") {
    // o Simples não destaca a CBS e o IBS de teste: zera os valores e guarda os do regime regular como referência
    resultado = { ...reg, itens: reg.itens.map((i) => ({ ...i, cbs: 0, ibs: 0, pCBS: 0, pEfet: 0, red: 0, estado: i.erros.length ? i.estado : "SIMPLES_SEM_TESTE",
      memorias: i.erros.length ? i.memorias : ["Simples Nacional em 2026: sem CBS e IBS de teste (LC 214/2025, art. 348, III, \"c\")."] })),
      tot: { valor: reg.tot.valor, cbs: 0, ibs: 0, is: 0, tributos: 0 } };
  } else {
    const sn = await calcularSimplesDentro(data, operacao, em, reg);
    resultado = sn.resultado; enviado = sn.enviado; recebido = sn.recebido;
    if (sn.estimado) avisos.push("O motor do Simples Nacional não respondeu: CBS e IBS estimados pelas tabelas da lei.");
  }
  const itensDas = resultado.itens.filter((i) => !i.erros.length).map((i) => ({ tipo: estado.itens[i.numero - 1]?.tipo || "ncm", valor: i.valor }));
  resultado.modo = modo;
  resultado.das = simples ? dasDaNota(data, itensDas, em, modo === "sn-fora") : null;
  resultado.regular = modo === "sn-2026" || modo === "sn-dentro" ? reg?.tot || null : null;
  return { erros: [], avisos, resultado, enviado, recebido, aviso };
}

/** Simples de 2027 em diante, CBS e IBS dentro do DAS: monta as operações da calculadora oficial do Simples
 *  (rota não assistida, que escolhe o par de alíquotas de cada item pela atividade):
 *    - os produtos (NCM) vão juntos, como NF-e (tpDoc 55), CRT 1 (ou 2, acima do sublimite);
 *    - cada serviço (NBS) vai sozinho, como NFS-e (tpDoc 91, que aceita um item por documento), com opSimpNac 3
 *      (ME/EPP), IBS e CBS pelo Simples (regApIBSCBSSN 1; 2 acima do sublimite), tributos federais e ISS pelo
 *      Simples (regApTribSN 1; 2 acima do sublimite), operação tributável (tribISSQN 1) e retenção conforme o painel.
 *  Acima do sublimite o IBS é do regime regular e vem do cálculo regular (reg). Se o motor do Simples não
 *  responder, estima pelas mesmas regras: base × alíquota efetiva, alíquota com 2 casas na NFS-e, arredondamento
 *  meio-para-o-par. */
async function calcularSimplesDentro(data, operacao, em, reg) {
  const sub = faixaSN(em.rbt12) === 6;
  const linha = aliquotasEfetivasSN(data, em);
  const base = (i) => (i.impostoSeletivo ? i.impostoSeletivo.baseCalculo : i.baseCalculo);
  const ops = [];
  const prods = operacao.itens.filter((i) => i.ncm);
  if (prods.length) {
    ops.push({ numeros: prods.map((i) => i.numero), tpDoc: "55", corpo: { id: `calc-rtc-sn-${Date.now()}-nfe`, versao: "3.0.0", data, tpDoc: "55",
      CRT: sub ? "2" : "1", aliquotasEfetivas: linha,
      itens: prods.map((i, k) => ({ numero: k + 1, cAtivSN: em.ativProd, cClassTrib: i.cClassTrib, ncm: i.ncm,
        baseCalculo: Number(base(i)).toFixed(2), valorImpostoSeletivo: Number(i.impostoSeletivo?.impostoInformado || 0).toFixed(2) })) } });
  }
  for (const i of operacao.itens.filter((x) => x.nbs)) {
    ops.push({ numeros: [i.numero], tpDoc: "91", corpo: { id: `calc-rtc-sn-${Date.now()}-nfse-${i.numero}`, versao: "3.0.0", data, tpDoc: "91",
      opSimpNac: "3", regApIBSCBSSN: sub ? "2" : "1", regApTribSN: sub ? "2" : "1", aliquotasEfetivas: linha,
      itens: [{ numero: 1, cAtivSN: em.ativServ, cClassTrib: i.cClassTrib, nbs: i.nbs, baseCalculo: Number(base(i)).toFixed(2),
        tribISSQN: "1", tpRetISSQN: em.issRetido ? "2" : "1" }] } });
  }
  let estimado = false;
  const respostas = await Promise.all(ops.map(async (op) => {
    try {
      const r = await api("", { caminhoCompleto: `${API_SN}/observabilidade/simples-nacional/nao-assistido`, method: "POST", body: JSON.stringify(op.corpo) });
      return r.corpo;
    } catch (e) {
      if (e.status && e.status !== 502 && e.status !== 503) throw e; // erro nos dados: mostra
      estimado = true;
      return estimarSimples(op, em, data);
    }
  }));
  // junta as respostas, voltando à numeração da nota
  const itens = [];
  ops.forEach((op, k) => {
    for (const o of respostas[k].objetos || []) {
      const numero = op.numeros[o.nObj - 1];
      const env = operacao.itens.find((i) => i.numero === numero);
      const orig = estado.itens[numero - 1] || {};
      const t = o.tribCalc || {};
      const ibsReg = sub ? (reg?.itens.find((x) => x.numero === numero)?.ibs || 0) : 0;
      const memorias = [t.memoriaCalculo?.cbs, t.memoriaCalculo?.ibs, o.motivoEstado?.descricao].filter(Boolean);
      if (sub) memorias.push("Acima do sublimite: IBS pelo regime regular, destacado no grupo IBSCBS da nota.");
      itens.push({
        numero, descricao: orig.descricao || "", codigo: env.ncm || env.nbs, cClassTrib: env.cClassTrib, valor: Number(base(env)),
        estado: o.estadoItem || "—", erros: o.erros || [], vBC: n2(t.vBC), pCBS: n2(t.pCBSSN), red: 0, pEfet: n2(t.pCBSSN), pIBS: n2(t.pIBSSN),
        cbs: n2(t.vCBSSN), ibs: n2(t.vIBSSN) + ibsReg, is: n2(t.IS?.valor), pIS: env.impostoSeletivo ? 0 : null, memorias,
        tpDoc: op.tpDoc,
      });
    }
  });
  itens.sort((a, b) => a.numero - b.numero);
  const soma = (k) => arred2(itens.reduce((a, i) => a + (i.erros.length ? 0 : i[k]), 0));
  const tot = { valor: soma("valor"), cbs: soma("cbs"), ibs: soma("ibs"), is: soma("is") };
  tot.tributos = arred2(tot.cbs + tot.ibs + tot.is);
  return { resultado: { itens, tot, comErro: itens.filter((i) => i.erros.length).length }, estimado,
    enviado: ops.map((o) => o.corpo), recebido: respostas };
}

/** Estimativa local, no formato da resposta da calculadora oficial do Simples, para quando ela não responde. */
function estimarSimples(op, em, data) {
  const c = op.corpo, nfse = c.tpDoc === "91";
  return {
    estimado: true,
    objetos: c.itens.map((i) => {
      const anexo = anexoDaAtividade(i.cAtivSN, em.fatorR);
      const s = simplesNoAno(anexo, em.rbt12, data);
      // o par sem redistribuição vale quando o ISS não entra no Simples: retido, ou acima do sublimite
      const semRed = ANEXOS_SN[anexo].local === "iss" && (i.tpRetISSQN === "2" || c.regApTribSN === "2");
      let pc = semRed ? s.semRedistribuicao.pCBSSN : s.pCBSSN, pi = semRed ? s.semRedistribuicao.pIBSSN : s.pIBSSN;
      if (nfse) { pc = arredPar(pc, 2); pi = pi === null ? null : arredPar(pi, 2); }
      const b = Number(i.baseCalculo);
      const vc = arredPar(b * pc / 100), vi = pi === null ? 0 : arredPar(b * pi / 100);
      return { nObj: i.numero, estadoItem: "ESTIMADO", erros: [], tribCalc: { vBC: b, pCBSSN: pc, vCBSSN: vc, pIBSSN: pi, vIBSSN: vi,
        IS: { valor: Number(i.valorImpostoSeletivo || 0) },
        memoriaCalculo: { cbs: `Estimativa: ${brl(b)} × ${pct(pc, nfse ? 2 : 4)} = ${brl(vc)} (${ANEXOS_SN[anexo].nome}, ${nFaixa(s.faixa)}${semRed ? ", par sem redistribuição do ISS" : ""}).`,
          ibs: pi === null ? null : `Estimativa: ${brl(b)} × ${pct(pi, nfse ? 2 : 4)} = ${brl(vi)}.` } } };
    }),
  };
}

/** Bloco do cupom com o DAS da nota (Simples). */
function blocoDasCupom(r, data) {
  const das = r.das;
  if (!das) return "";
  const grupos = das.grupos.map((g) => `${esc(g.nome.replace(/ —.*/, ""))}, ${nFaixa(g.faixa)}, alíquota efetiva ${pct(g.efetiva, 2)}`).join("; ");
  const ano = anoDe(data);
  const nota = r.modo === "sn-2026"
    ? `Em ${ano} a nota do Simples não destaca CBS nem IBS. ${r.regular ? `Uma empresa do regime regular destacaria CBS ${brl(r.regular.cbs)} e IBS ${brl(r.regular.ibs)} de teste nesta mesma nota.` : ""}`
    : r.modo === "sn-dentro"
      ? `A CBS e o IBS acima já estão dentro do DAS: não são pagos à parte. São o valor informado no documento fiscal e o crédito que um cliente empresa pode aproveitar.${r.regular ? ` No regime regular, esta nota destacaria CBS ${brl(r.regular.cbs)} e IBS ${brl(r.regular.ibs)}.` : ""}`
      : `CBS e IBS por fora: pagos pelo regime regular, fora do DAS, com crédito das compras. O DAS fica sem as partes deles.`;
  // na NFS-e a calculadora do Simples usa a alíquota com 2 casas (0,9258% → 0,93%): o destaque difere um pouco da parte no DAS
  const cbsDas = das.linhas.find((l) => l.nome === "CBS")?.valor;
  const difNfse = r.modo === "sn-dentro" && r.itens.some((i) => i.tpDoc === "91") && cbsDas !== undefined && Math.abs(cbsDas - r.tot.cbs) >= 0.01
    ? ` Na NFS-e a alíquota efetiva vai com 2 casas decimais (${r.itens.filter((i) => i.tpDoc === "91").map((i) => pct(i.pCBS, 2))[0]} de CBS), por isso a CBS destacada (${brl(r.tot.cbs)}) difere um pouco da parte da CBS no DAS (${brl(cbsDas)}).`
    : "";
  return `<hr><p class="sub">DAS desta nota (estimativa) — ${grupos}</p>
    ${das.linhas.map((l) => `<div class="linha"><span>${esc(l.nome)}</span><span>${brl(l.valor)}</span></div>`).join("")}
    <div class="linha total"><span>Total no DAS</span><span>${brl(das.total)}</span></div>
    ${das.retido ? `<div class="linha"><span>ISS retido pelo tomador (fora do DAS)</span><span>${brl(das.retido)}</span></div>` : ""}
    ${das.acimaSublimite ? `<p class="alerta">Acima do sublimite: ICMS, ISS e IBS são pagos fora do DAS, pelas regras do regime regular.</p>` : ""}
    <p class="nota-cupom">${nota}${difNfse}</p>`;
}

/** Coloca no painel um emitente salvo (no navegador, num link, num exemplo ou num arquivo de itens). */
function aplicarEmitente(o) {
  if (!o) return;
  if (o.regime) $("#em-regime").value = o.regime;
  if (o.rbt12 !== undefined && o.rbt12 !== null && o.rbt12 !== "") $("#em-rbt12").value = o.rbt12;
  for (const [id, v] of [["#em-ativ-prod", o.ativProd], ["#em-ativ-serv", o.ativServ]]) {
    if (!v) continue;
    $(id).dataset.salvo = v; // as listas de atividade podem ainda não ter sido carregadas
    if ([...$(id).options].some((op) => op.value === v)) $(id).value = v;
  }
  if (o.fatorR !== undefined) $("#em-fatorr").checked = !!o.fatorR;
  if (o.opcao) $("#em-opcao").value = o.opcao;
  if (o.issRetido !== undefined) $("#em-iss-retido").checked = !!o.issRetido;
  renderizarEmitente();
}

/** Ao mudar qualquer campo do painel: resumo, quadro de alíquotas e a aba aberta. */
async function aoMudarEmitente() {
  renderizarEmitente();
  $("#bloco-aliquotas").hidden = !precisaAliquotas(dataOp());
  await preencherAliquotasReferencia(false);
  salvar();
  const aba = $(".abas button[aria-selected=true]")?.dataset.aba;
  if (aba === "comparar") renderizarPainelComparacao();
  if (aba === "antesdepois") renderizarAntesDepois();
}

/** Uma linha sobre quem emite, para os resumos das abas que usam a nota da aba Calcular nota. */
function textoEmitente(em = emitente()) {
  if (em.regime === "real") return "Emitente do regime regular, lucro real";
  if (em.regime === "presumido") return "Emitente do regime regular, lucro presumido";
  if (!emiteSimples(em)) return "Emitente com receita acima do limite do Simples (calculado como regime regular)";
  const anexos = [...new Set(estado.itens.map((it) => anexoDoItem(it, em)))].map((a) => "Anexo " + a).join(" e ") || "Anexo " + anexoDaAtividade(em.ativProd, em.fatorR);
  return `Emitente do Simples Nacional (${anexos}, ${nFaixa(faixaSN(em.rbt12))}; CBS e IBS ${em.opcao === "fora" ? "por fora" : "dentro do DAS"} de 2027 em diante)`;
}
