// Visualizador dos extratos. Os dados vêm dos CSVs (via dados.js -> window.EXTRATOS).
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
               "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const COL_RECEBIDO = "Recebido pelo Prestador";
const dados = window.EXTRATOS || [];

const $ = id => document.getElementById(id);
const el = (tag, cls, texto) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (texto !== undefined) e.textContent = texto;  // textContent: nunca interpreta HTML vindo do CSV
  return e;
};

// "R$ 1.215,90" -> 1215.9
const num = s => {
  const n = parseFloat(String(s || "").replace(/[^\d,-]/g, "").replace(",", "."));
  return isNaN(n) ? 0 : n;
};
const brl = n => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const ABREV = { jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12 };
// "04 jul. 2026" -> "04/07/2026" (dd/MM/aaaa). Datas já nesse formato, ou desconhecidas, ficam como estão.
const formataData = s => {
  const m = String(s || "").trim().match(/^(\d{1,2})\s+([a-zç]{3})\.?\s+(\d{4})$/i);
  const mes = m && ABREV[m[2].toLowerCase()];
  return mes ? `${m[1].padStart(2, "0")}/${String(mes).padStart(2, "0")}/${m[3]}` : (s || "");
};
const unicos = (lista) => [...new Set(lista)];
const normaliza = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const sel = { beneficiario: $("f-beneficiario"), ano: $("f-ano"), mes: $("f-mes") };

function preencher(select, opcoes, rotulo = v => v, manter) {
  select.replaceChildren(...opcoes.map(v => {
    const o = el("option", "", rotulo(v));
    o.value = v;
    return o;
  }));
  if (manter && opcoes.includes(manter)) select.value = manter;
}

function linhasDe(b, a, m) {
  return dados.filter(r => r.beneficiario === b && r.ano === a && r.mes === m);
}

function atualizarFiltros(origem) {
  const b = sel.beneficiario.value;
  if (origem === "beneficiario" || origem === "inicio") {
    const anos = unicos(dados.filter(r => r.beneficiario === b).map(r => r.ano)).sort().reverse();
    preencher(sel.ano, anos, v => v, sel.ano.value);
  }
  if (origem !== "mes") {
    const meses = unicos(dados.filter(r => r.beneficiario === b && r.ano === sel.ano.value).map(r => r.mes))
      .sort().reverse();
    preencher(sel.mes, meses, v => MESES[parseInt(v, 10) - 1] || v, sel.mes.value);
  }
  render();
}

function agrupar(linhas) {
  const grupos = new Map();
  for (const r of linhas) {
    const chave = [r.prestador, r.cnpj, r.data_atendimento].join("|");
    if (!grupos.has(chave)) grupos.set(chave, { ...r, itens: [] });
    grupos.get(chave).itens.push(r);
  }
  return [...grupos.values()];
}

function render() {
  const todas = linhasDe(sel.beneficiario.value, sel.ano.value, sel.mes.value);
  const termo = normaliza($("f-busca").value.trim());
  const linhas = termo
    ? todas.filter(r => normaliza([r.prestador, r.cnpj, r.evento_descricao].join(" ")).includes(termo))
    : todas;

  // Totais do mês (não mudam com a busca)
  const base = todas[0] || {};
  $("c-mensalidade").textContent = base.mensalidade || "—";
  $("c-copart").textContent = base.coparticipacao_mes || "—";
  $("c-total").textContent = base.total_mes || "—";

  const grupos = agrupar(linhas);
  $("c-atend").textContent = grupos.length;
  $("c-recebido").textContent = brl(linhas.reduce((s, r) => s + num(r[COL_RECEBIDO]), 0));

  const lista = $("lista");
  lista.replaceChildren(...grupos.map(cartaoGrupo));
  $("sem-resultado").hidden = grupos.length > 0 || todas.length === 0;
}

function cartaoGrupo(g) {
  const det = el("details", "grupo");
  const sum = el("summary");

  const esq = el("div", "grupo-info");
  esq.append(el("strong", "", g.prestador || "(sem nome)"));
  esq.append(el("span", "sub", `${g.cnpj || ""}${g.data_atendimento ? " · Atendimento em " + formataData(g.data_atendimento) : ""}`));

  const dir = el("div", "grupo-valores");
  const recebido = g.itens.reduce((s, r) => s + num(r[COL_RECEBIDO]), 0);
  dir.append(el("span", "chip", `${g.itens.length} procedimento${g.itens.length > 1 ? "s" : ""}`));
  dir.append(el("span", "valor", `Copart. ${g.valor_lancamento || "R$ 0,00"}`));
  dir.append(el("span", "valor forte", `Recebido ${brl(recebido)}`));

  sum.append(esq, dir);

  const tabela = el("table");
  const cab = el("tr");
  ["Data", "Procedimento", "Coparticipação", "Recebido pelo Prestador"].forEach((t, i) => {
    const th = el("th", i > 1 ? "num" : "", t);
    cab.append(th);
  });
  const thead = el("thead");
  thead.append(cab);
  tabela.append(thead);
  const corpo = el("tbody");
  for (const r of g.itens) {
    const tr = el("tr");
    tr.append(el("td", "", formataData(r.evento_data)), el("td", "", r.evento_descricao || ""),
              el("td", "num", r.evento_coparticipacao || ""), el("td", "num", r[COL_RECEBIDO] || ""));
    corpo.append(tr);
  }
  tabela.append(corpo);

  const envolve = el("div", "tabela-wrap");
  envolve.append(tabela);
  det.append(sum, envolve);
  return det;
}

function iniciar() {
  const vazio = dados.length === 0;
  $("vazio").hidden = !vazio;
  $("conteudo").hidden = vazio;
  document.querySelector(".filtros").hidden = vazio;
  if (vazio) return;

  const benefs = unicos(dados.map(r => r.beneficiario)).sort();
  preencher(sel.beneficiario, benefs);
  const anosTotal = unicos(dados.map(r => r.ano)).sort();
  $("resumo-geral").textContent =
    `${benefs.length} beneficiário(s) · ${anosTotal[0]}${anosTotal.length > 1 ? "–" + anosTotal[anosTotal.length - 1] : ""}`;

  sel.beneficiario.addEventListener("change", () => atualizarFiltros("beneficiario"));
  sel.ano.addEventListener("change", () => atualizarFiltros("ano"));
  sel.mes.addEventListener("change", () => atualizarFiltros("mes"));
  $("f-busca").addEventListener("input", render);
  $("b-expandir").addEventListener("click", () => document.querySelectorAll("details.grupo").forEach(d => d.open = true));
  $("b-recolher").addEventListener("click", () => document.querySelectorAll("details.grupo").forEach(d => d.open = false));

  atualizarFiltros("inicio");
}

iniciar();
