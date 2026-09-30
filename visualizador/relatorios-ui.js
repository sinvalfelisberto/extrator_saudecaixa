// Aba "Relatórios de auditoria": filtros, lista de relatórios, tabela e exportação para PDF.
// Usa helpers de app.js ($, el, brl, unicos, dados) e construirRelatorios de relatorios.js.
(function () {
  const estado = { relatorios: [], selecionado: "resumo" };

  // ------------------------------------------------------------ formatação
  const fmt = {
    moeda: v => (v === null || v === undefined ? "—" : brl(v)),
    int: v => (v === null || v === undefined ? "—" : Number(v).toLocaleString("pt-BR")),
    pct: v => (v === null || v === undefined ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(1).replace(".", ",")}%`),
    pct0: v => (v === null || v === undefined ? "—" : `${v.toFixed(1).replace(".", ",")}%`),
    dec: v => (v === null || v === undefined ? "—" : v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })),
    texto: v => (v === null || v === undefined || v === "" ? "—" : String(v)),
  };
  const ehNumero = t => t !== "texto";

  // ------------------------------------------------------------ filtros
  const lerFiltros = () => ({
    beneficiario: $("r-beneficiario").value,
    ano: $("r-ano").value,
    params: {
      variacaoPct: Number($("r-variacao").value) || 0,
      mesesAntigo: Number($("r-antigo").value) || 0,
      desvioPct: Number($("r-desvio").value) || 0,
    },
    soOcorrencias: $("r-so-ocorrencias").checked,
  });

  const textoFiltros = f =>
    `Beneficiário: ${f.beneficiario || "Todos"} · Ano: ${f.ano || "Todos"} · Gerado em ${new Date().toLocaleString("pt-BR")}`;

  function preencherSelect(select, valores, rotuloTodos) {
    const atual = select.value;
    select.replaceChildren(...[["", rotuloTodos], ...valores.map(v => [v, v])].map(([v, r]) => {
      const o = el("option", "", r);
      o.value = v;
      return o;
    }));
    if ([...select.options].some(o => o.value === atual)) select.value = atual;
  }

  function linhasFiltradas(f) {
    return dados.filter(r => (!f.beneficiario || r.beneficiario === f.beneficiario) && (!f.ano || r.ano === f.ano));
  }

  // ------------------------------------------------------------ renderização
  const ocorrencias = rel => rel.linhas.filter(l => l._alerta).length;

  function linhasVisiveis(rel, soOcorrencias) {
    return rel.auditavel && soOcorrencias ? rel.linhas.filter(l => l._alerta) : rel.linhas;
  }

  function bloco(rel, f) {
    const sec = el("article", "rel-bloco");
    sec.append(el("h2", "", rel.titulo), el("p", "rel-desc", rel.descricao));
    if (rel.ajuda) {
      const aj = el("div", "rel-ajuda");
      aj.append(el("strong", "", "Como ler este relatório: "), document.createTextNode(rel.ajuda));
      sec.append(aj);
    }
    sec.append(el("p", "rel-filtros", textoFiltros(f)));

    const linhas = linhasVisiveis(rel, f.soOcorrencias);
    const cards = el("div", "cards pequenos");
    const card = (r, v, cls = "") => {
      const c = el("div", "card " + cls);
      c.append(el("span", "", r), el("strong", "", v));
      cards.append(c);
    };
    card("Registros", fmt.int(rel.linhas.filter(l => !l._total).length));
    if (rel.auditavel) card("Ocorrências", fmt.int(ocorrencias(rel)), ocorrencias(rel) ? "alerta" : "ok");
    (rel.cards || []).forEach(c => card(c.r, c.v));
    sec.append(cards);

    if (!linhas.length) {
      sec.append(el("p", "vazio", rel.auditavel && f.soOcorrencias ? "Nenhuma ocorrência encontrada. ✔" : "Sem dados para os filtros escolhidos."));
      return sec;
    }

    const tabela = el("table", "rel-tabela");
    const cab = el("tr");
    rel.colunas.forEach(c => cab.append(el("th", ehNumero(c.t) ? "num" : "", c.r)));
    if (rel.auditavel) cab.append(el("th", "", "Situação"));
    const thead = el("thead");
    thead.append(cab);
    tabela.append(thead);

    const corpo = el("tbody");
    for (const l of linhas) {
      const tr = el("tr", [l._alerta ? "alerta" : "", l._total ? "total" : ""].join(" ").trim());
      rel.colunas.forEach(c => tr.append(el("td", ehNumero(c.t) ? "num" : "", fmt[c.t](l[c.k]))));
      if (rel.auditavel) {
        const td = el("td", "situacao");
        td.append(el("span", l._alerta ? "selo verificar" : "selo ok", l._alerta ? `Verificar: ${l._alerta}` : "OK"));
        tr.append(td);
      }
      corpo.append(tr);
    }
    tabela.append(corpo);
    const envolve = el("div", "tabela-wrap");
    envolve.append(tabela);
    sec.append(envolve);
    return sec;
  }

  function desenharNav(f) {
    const nav = $("rel-nav");
    nav.replaceChildren(...estado.relatorios.map(rel => {
      const b = el("button", "item-rel" + (rel.id === estado.selecionado ? " ativo" : ""));
      b.type = "button";
      b.append(el("span", "", rel.titulo));
      if (rel.auditavel) {
        const n = ocorrencias(rel);
        b.append(el("span", "selo " + (n ? "verificar" : "ok"), n ? String(n) : "✔"));
      }
      b.addEventListener("click", () => { estado.selecionado = rel.id; desenhar(); });
      return b;
    }));
  }

  function desenhar() {
    const f = lerFiltros();
    estado.relatorios = construirRelatorios(linhasFiltradas(f), f.params);
    const rel = estado.relatorios.find(r => r.id === estado.selecionado) || estado.relatorios[0];
    desenharNav(f);
    $("rel-conteudo").replaceChildren(bloco(rel, f));
  }

  // ------------------------------------------------------------ exportação (PDF via impressão)
  const slug = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "");

  function imprimir(todos) {
    const f = lerFiltros();
    const tituloOriginal = document.title;
    const sufixo = slug(`${f.beneficiario || "Todos"}_${f.ano || "todos_os_anos"}`);
    const rel = estado.relatorios.find(r => r.id === estado.selecionado);

    if (todos) {
      const capa = el("header", "capa-impressao");
      capa.append(el("h1", "", "Relatório de auditoria — Extratos Saúde CAIXA"), el("p", "", textoFiltros(f)));
      $("rel-impressao").replaceChildren(capa, ...estado.relatorios.map(r => bloco(r, f)));
      document.body.classList.add("imprimir-todos");
      document.title = `Auditoria_completa_${sufixo}`;
    } else {
      document.title = `Auditoria_${slug(rel.titulo)}_${sufixo}`;
    }
    const limpar = () => {
      document.body.classList.remove("imprimir-todos");
      $("rel-impressao").replaceChildren();
      document.title = tituloOriginal;
    };
    window.addEventListener("afterprint", limpar, { once: true });
    window.print();
  }

  // ------------------------------------------------------------ abas e inicialização
  function trocarAba(nome) {
    document.querySelectorAll(".aba").forEach(b => b.classList.toggle("ativa", b.dataset.aba === nome));
    $("aba-extratos").hidden = nome !== "extratos";
    $("aba-relatorios").hidden = nome !== "relatorios";
    document.body.classList.toggle("aba-relatorios", nome === "relatorios");
    if (nome === "relatorios" && dados.length) desenhar();
  }

  function iniciar() {
    document.querySelectorAll(".aba").forEach(b => b.addEventListener("click", () => trocarAba(b.dataset.aba)));
    if (!dados.length) {
      $("rel-vazio").hidden = false;
      $("rel-app").hidden = true;
      return;
    }
    preencherSelect($("r-beneficiario"), unicos(dados.map(r => r.beneficiario)).sort(), "Todos os beneficiários");
    preencherSelect($("r-ano"), unicos(dados.map(r => r.ano)).sort().reverse(), "Todos os anos");
    ["r-beneficiario", "r-ano"].forEach(id => $(id).addEventListener("change", desenhar));
    ["r-variacao", "r-antigo", "r-desvio"].forEach(id => $(id).addEventListener("input", desenhar));
    $("r-so-ocorrencias").addEventListener("change", desenhar);
    $("r-pdf").addEventListener("click", () => imprimir(false));
    $("r-pdf-todos").addEventListener("click", () => imprimir(true));
  }

  iniciar();
})();
