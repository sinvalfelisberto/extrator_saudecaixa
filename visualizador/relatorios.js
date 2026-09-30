// Relatórios de auditoria. Funções puras: recebem as linhas dos CSVs (window.EXTRATOS, já filtradas)
// e devolvem tabelas. Reutiliza num, brl, formataData e COL_RECEBIDO definidos em app.js.
//
// Formato de um relatório:
//   { id, titulo, descricao, auditavel, colunas:[{k, r, t}], linhas:[{...}], cards:[{r, v}] }
//   - t (tipo da coluna): texto | moeda | int | pct | dec
//   - auditavel: se true, cada linha pode trazer `_alerta` (texto do motivo); sem `_alerta` = "OK"
//   - linha com `_total: true` é exibida em negrito (linha de totais)

const PARAMS_PADRAO = { variacaoPct: 30, mesesAntigo: 3, desvioPct: 50 };
const TOL = 0.005; // tolerância de meio centavo nas conferências de valores

const cmp = (x, y) => (x < y ? -1 : x > y ? 1 : 0);
const idxMes = (a, m) => a * 12 + (m - 1);
const rotuloPeriodo = (ano, mes) => `${mes}/${ano}`;
const soma = (lista, f) => lista.reduce((s, x) => s + f(x), 0);
const arred = n => Math.round(n * 100) / 100;
const variacao = (novo, velho) => (velho ? ((novo - velho) / Math.abs(velho)) * 100 : null);
const col = (k, r, t = "texto") => ({ k, r, t });

const parseBR = s => {
  const m = String(s || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? { d: +m[1], m: +m[2], a: +m[3] } : null;
};
const agrupa = (lista, chave) => {
  const mapa = new Map();
  for (const x of lista) {
    const k = chave(x);
    if (!mapa.has(k)) mapa.set(k, []);
    mapa.get(k).push(x);
  }
  return mapa;
};
const mediana = nums => {
  const s = [...nums].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// Uma linha de CSV -> objeto com números e datas já interpretados.
const preparar = r => ({
  beneficiario: r.beneficiario, ano: +r.ano, mes: r.mes, periodo: `${r.ano}-${r.mes}`,
  mensalidade: num(r.mensalidade), copartMes: num(r.coparticipacao_mes), totalMes: num(r.total_mes),
  prestador: r.prestador || "", cnpj: r.cnpj || "", dataAt: r.data_atendimento || "",
  valorLanc: num(r.valor_lancamento), dataEv: formataData(r.evento_data), desc: r.evento_descricao || "",
  copart: num(r.evento_coparticipacao), recebido: num(r[COL_RECEBIDO]),
  temRecebido: String(r[COL_RECEBIDO] || "").trim() !== "",
});

// Um item por beneficiário+mês (valores do cabeçalho do extrato).
function baseMeses(L) {
  return [...agrupa(L, r => `${r.beneficiario}|${r.periodo}`).values()]
    .map(it => ({ ...it[0], itens: it }))
    .sort((a, b) => cmp(a.beneficiario, b.beneficiario) || cmp(a.periodo, b.periodo));
}
// Um item por atendimento (lançamento): beneficiário+mês+prestador+CNPJ+data do atendimento.
function baseLancamentos(L) {
  return [...agrupa(L, r => [r.beneficiario, r.periodo, r.prestador, r.cnpj, r.dataAt].join("|")).values()]
    .map(it => ({ ...it[0], itens: it }))
    .sort((a, b) => cmp(a.beneficiario, b.beneficiario) || cmp(a.periodo, b.periodo) || cmp(a.prestador, b.prestador));
}

// ---------------------------------------------------------------- relatórios

function relResumo(ctx) {
  const linhas = [...agrupa(ctx.meses, m => m.beneficiario)].map(([b, ms]) => {
    const lanc = ctx.lanc.filter(l => l.beneficiario === b);
    const itens = ms.flatMap(m => m.itens);
    return {
      beneficiario: b, meses: ms.length, atendimentos: lanc.length, procedimentos: itens.length,
      mensalidade: soma(ms, m => m.mensalidade), copartMes: soma(ms, m => m.copartMes),
      totalMes: soma(ms, m => m.totalMes), recebido: soma(itens, r => r.recebido),
    };
  });
  if (linhas.length > 1) {
    const t = { beneficiario: "TOTAL", _total: true };
    for (const k of ["meses", "atendimentos", "procedimentos", "mensalidade", "copartMes", "totalMes", "recebido"])
      t[k] = soma(linhas, l => l[k]);
    linhas.push(t);
  }
  return {
    id: "resumo", titulo: "Resumo consolidado por beneficiário",
    descricao: "Visão geral do período selecionado: quantos meses, atendimentos e procedimentos cada beneficiário teve e quanto foi cobrado e repassado aos prestadores.",
    colunas: [col("beneficiario", "Beneficiário"), col("meses", "Meses", "int"), col("atendimentos", "Atendimentos", "int"),
      col("procedimentos", "Procedimentos", "int"), col("mensalidade", "Mensalidade", "moeda"),
      col("copartMes", "Coparticipação", "moeda"), col("totalMes", "Total cobrado", "moeda"),
      col("recebido", "Recebido pelos prestadores", "moeda")],
    linhas,
  };
}

function relEvolucao(ctx, p) {
  const lancPorMes = agrupa(ctx.lanc, l => `${l.beneficiario}|${l.periodo}`);
  let ant = null;
  const linhas = ctx.meses.map(m => {
    if (ant && ant.beneficiario !== m.beneficiario) ant = null;
    const varTotal = ant ? variacao(m.totalMes, ant.totalMes) : null;
    const motivos = [];
    if (varTotal !== null && Math.abs(varTotal) > p.variacaoPct) motivos.push(`total variou ${varTotal.toFixed(1).replace(".", ",")}% (limite ${p.variacaoPct}%)`);
    if (ant && Math.abs(m.mensalidade - ant.mensalidade) > TOL) motivos.push("mensalidade alterada");
    ant = m;
    return {
      beneficiario: m.beneficiario, periodo: rotuloPeriodo(m.ano, m.mes), mensalidade: m.mensalidade,
      copartMes: m.copartMes, totalMes: m.totalMes, atendimentos: (lancPorMes.get(`${m.beneficiario}|${m.periodo}`) || []).length,
      procedimentos: m.itens.length, recebido: soma(m.itens, r => r.recebido), variacao: varTotal,
      _alerta: motivos.join("; "),
    };
  });
  return {
    id: "evolucao", titulo: "Evolução mensal e variações", auditavel: true,
    descricao: `Mês a mês, por beneficiário. Destaca meses em que o total variou mais de ${p.variacaoPct}% em relação ao mês anterior disponível e mudanças no valor da mensalidade (reajustes).`,
    colunas: [col("beneficiario", "Beneficiário"), col("periodo", "Mês"), col("mensalidade", "Mensalidade", "moeda"),
      col("copartMes", "Coparticipação", "moeda"), col("totalMes", "Total", "moeda"), col("atendimentos", "Atend.", "int"),
      col("procedimentos", "Proced.", "int"), col("recebido", "Recebido prestadores", "moeda"), col("variacao", "Var. total", "pct")],
    linhas,
  };
}

function relConferenciaMes(ctx) {
  const lancPorMes = agrupa(ctx.lanc, l => `${l.beneficiario}|${l.periodo}`);
  const linhas = ctx.meses.map(m => {
    const esperado = arred(m.mensalidade + m.copartMes);
    const copartLanc = arred(soma(lancPorMes.get(`${m.beneficiario}|${m.periodo}`) || [], l => l.valorLanc));
    const difTotal = arred(m.totalMes - esperado), difCopart = arred(m.copartMes - copartLanc);
    const motivos = [];
    if (Math.abs(difTotal) > TOL) motivos.push("total ≠ mensalidade + coparticipação");
    if (Math.abs(difCopart) > TOL) motivos.push("coparticipação do mês ≠ soma dos atendimentos");
    return {
      beneficiario: m.beneficiario, periodo: rotuloPeriodo(m.ano, m.mes), mensalidade: m.mensalidade, copartMes: m.copartMes,
      totalMes: m.totalMes, esperado, difTotal, copartLanc, difCopart, _alerta: motivos.join("; "),
    };
  });
  return {
    id: "conf-mes", titulo: "Conferência de valores do mês", auditavel: true,
    descricao: "Confere se o total informado é igual à mensalidade mais a coparticipação, e se a coparticipação do mês é igual à soma da coparticipação dos atendimentos. Diferenças indicam erro de cobrança ou de leitura.",
    ajuda: "Duas contas simples: (1) Mensalidade + Coparticipação deve ser igual ao Total do mês; (2) a Coparticipação do mês deve ser igual à soma da coparticipação de todos os atendimentos. Se uma conta não fecha, a linha aparece em vermelho com a diferença.",
    colunas: [col("beneficiario", "Beneficiário"), col("periodo", "Mês"), col("mensalidade", "Mensalidade", "moeda"),
      col("copartMes", "Copart. do mês", "moeda"), col("totalMes", "Total informado", "moeda"), col("esperado", "Total esperado", "moeda"),
      col("difTotal", "Dif. total", "moeda"), col("copartLanc", "Σ copart. atendimentos", "moeda"), col("difCopart", "Dif. copart.", "moeda")],
    linhas,
  };
}

function relConferenciaLanc(ctx) {
  const linhas = ctx.lanc.map(l => {
    const somaEv = arred(soma(l.itens, r => r.copart));
    const dif = arred(l.valorLanc - somaEv);
    return {
      beneficiario: l.beneficiario, periodo: rotuloPeriodo(l.ano, l.mes), prestador: l.prestador, dataAt: l.dataAt,
      procedimentos: l.itens.length, valorLanc: l.valorLanc, somaEv, dif,
      _alerta: Math.abs(dif) > TOL ? "coparticipação do atendimento ≠ soma dos procedimentos" : "",
    };
  });
  return {
    id: "conf-lanc", titulo: "Conferência de coparticipação por atendimento", auditavel: true,
    descricao: "Para cada atendimento, compara a \"Coparticipação Total\" com a soma da coparticipação dos procedimentos dele.",
    colunas: [col("beneficiario", "Beneficiário"), col("periodo", "Extrato"), col("prestador", "Prestador"), col("dataAt", "Data atend."),
      col("procedimentos", "Proced.", "int"), col("valorLanc", "Copart. do atendimento", "moeda"),
      col("somaEv", "Σ procedimentos", "moeda"), col("dif", "Diferença", "moeda")],
    linhas,
  };
}

function relPrestadores(ctx) {
  const totalRec = soma(ctx.L, r => r.recebido);
  const linhas = [...agrupa(ctx.L, r => `${r.prestador}|${r.cnpj}`).values()].map(it => {
    const at = new Set(it.map(r => [r.beneficiario, r.periodo, r.dataAt].join("|")));
    const rec = soma(it, r => r.recebido);
    return {
      prestador: it[0].prestador, cnpj: it[0].cnpj, atendimentos: at.size, procedimentos: it.length,
      beneficiarios: new Set(it.map(r => r.beneficiario)).size, copart: soma(it, r => r.copart), recebido: rec,
      parte: totalRec ? (rec / totalRec) * 100 : 0,
    };
  }).sort((a, b) => b.recebido - a.recebido);
  return {
    id: "prestadores", titulo: "Ranking de prestadores",
    descricao: "Quem mais recebeu no período, em ordem decrescente, com a participação de cada prestador no total repassado. Útil para identificar concentração e prestadores inesperados.",
    colunas: [col("prestador", "Prestador"), col("cnpj", "CNPJ"), col("atendimentos", "Atend.", "int"), col("procedimentos", "Proced.", "int"),
      col("beneficiarios", "Benef.", "int"), col("copart", "Coparticipação", "moeda"), col("recebido", "Recebido", "moeda"), col("parte", "% do total", "pct0")],
    linhas,
  };
}

function relProcedimentos(ctx) {
  const linhas = [...agrupa(ctx.L.filter(r => r.desc), r => r.desc).values()].map(it => {
    const vals = it.map(r => r.recebido);
    return {
      desc: it[0].desc, qtd: it.length, prestadores: new Set(it.map(r => r.cnpj || r.prestador)).size,
      medio: soma(it, r => r.recebido) / it.length, minimo: Math.min(...vals), maximo: Math.max(...vals), recebido: soma(it, r => r.recebido),
    };
  }).sort((a, b) => b.recebido - a.recebido);
  return {
    id: "procedimentos", titulo: "Ranking de procedimentos",
    descricao: "Procedimentos por valor total repassado: quantidade, valor médio, mínimo e máximo. Diferença grande entre mínimo e máximo merece conferência (veja também \"Valores atípicos\").",
    colunas: [col("desc", "Procedimento"), col("qtd", "Qtd.", "int"), col("prestadores", "Prestadores", "int"), col("medio", "Valor médio", "moeda"),
      col("minimo", "Mínimo", "moeda"), col("maximo", "Máximo", "moeda"), col("recebido", "Total recebido", "moeda")],
    linhas,
  };
}

function relDuplicidades(ctx) {
  const linhas = [...agrupa(ctx.L.filter(r => r.desc), r => [r.beneficiario, r.cnpj || r.prestador, r.dataEv, r.desc].join("|")).values()]
    .filter(it => it.length > 1)
    .map(it => {
      const periodos = [...new Set(it.map(r => rotuloPeriodo(r.ano, r.mes)))];
      const valores = it.map(r => r.recebido);
      const total = soma(it, r => r.recebido);
      const aMais = arred(total - Math.max(...valores)); // estimativa: tudo o que passa de um lançamento
      const vezes = `${it.length} vezes`;
      return {
        beneficiario: it[0].beneficiario, prestador: it[0].prestador, dataEv: it[0].dataEv, desc: it[0].desc, vezes: it.length,
        onde: periodos.join(", "), cadaUm: Math.max(...valores), aMais,
        _alerta: periodos.length > 1
          ? `Em meses diferentes — mais suspeito`
          : `No mesmo mês`,
      };
    }).sort((a, b) => b.aMais - a.aMais);
  return {
    id: "duplicidades", titulo: "Possíveis duplicidades", auditavel: true,
    descricao: "Procedimentos que aparecem mais de uma vez com o mesmo beneficiário, prestador, data e nome: possível cobrança em duplicidade.",
    ajuda: "Cada linha é UM procedimento que foi lançado mais de uma vez. Exemplo: \"Consulta\" na CLINICA A, em 10/06/2026, lançada 2 vezes — uma no extrato de 06/2026 e outra no de 07/2026. " +
      "Se o procedimento foi feito só uma vez, o segundo lançamento é cobrança em duplicidade e o valor da coluna \"Recebido a mais (estimado)\" foi pago ao prestador indevidamente. " +
      "Se na verdade foram duas sessões no mesmo dia, pode ignorar. Lançamentos em meses diferentes costumam ser mais suspeitos do que no mesmo mês. " +
      "Atenção: se esse relatório mostrar MUITAS linhas, os CSVs podem estar desatualizados — rode python main.py --refazer.",
    colunas: [col("beneficiario", "Beneficiário"), col("prestador", "Prestador"), col("dataEv", "Data"), col("desc", "Procedimento"),
      col("vezes", "Vezes lançado", "int"), col("onde", "Nos extratos de"), col("cadaUm", "Valor de cada", "moeda"),
      col("aMais", "Recebido a mais (est.)", "moeda")],
    linhas,
    cards: [{ r: "Recebido a mais (estimado)", v: brl(soma(linhas, l => l.aMais)) }],
  };
}

function relAntigos(ctx, p) {
  const linhas = ctx.lanc.map(l => {
    const d = parseBR(l.dataAt);
    const defas = d ? idxMes(l.ano, +l.mes) - idxMes(d.a, d.m) : null;
    let alerta = "";
    if (defas === null) alerta = "data do atendimento ausente ou inválida";
    else if (defas < 0) alerta = "atendimento posterior ao mês do extrato";
    else if (defas > p.mesesAntigo) alerta = `atendimento ${defas} meses antes do extrato (limite ${p.mesesAntigo})`;
    return {
      beneficiario: l.beneficiario, periodo: rotuloPeriodo(l.ano, l.mes), prestador: l.prestador, dataAt: l.dataAt,
      defas, recebido: soma(l.itens, r => r.recebido), _alerta: alerta,
    };
  }).sort((a, b) => (b.defas ?? -999) - (a.defas ?? -999));
  return {
    id: "antigos", titulo: "Atendimentos antigos ou fora do período", auditavel: true,
    descricao: `Distância, em meses, entre a data do atendimento e o mês do extrato em que ele foi lançado. Destaca atendimentos com mais de ${p.mesesAntigo} meses de atraso, datas futuras e datas inválidas.`,
    ajuda: "A \"defasagem\" é quantos meses se passaram entre o dia do atendimento e o mês do extrato em que ele foi cobrado. Exemplo: atendimento em 02/07/2024 cobrado no extrato de 09/2026 = 26 meses. Atrasos grandes podem ser cobranças tardias, erro de data ou lançamento indevido.",
    colunas: [col("beneficiario", "Beneficiário"), col("periodo", "Extrato"), col("prestador", "Prestador"), col("dataAt", "Data atend."),
      col("defas", "Defasagem (meses)", "int"), col("recebido", "Recebido", "moeda")],
    linhas,
  };
}

function relAtipicos(ctx, p) {
  const linhas = [];
  for (const it of agrupa(ctx.L.filter(r => r.desc && r.temRecebido && r.recebido > 0), r => r.desc).values()) {
    if (it.length < 3) continue; // poucos casos: sem base para comparar
    const med = mediana(it.map(r => r.recebido));
    for (const r of it) {
      const desv = variacao(r.recebido, med);
      linhas.push({
        beneficiario: r.beneficiario, periodo: rotuloPeriodo(r.ano, r.mes), prestador: r.prestador, dataEv: r.dataEv, desc: r.desc,
        recebido: r.recebido, mediana: med, desvio: desv,
        _alerta: Math.abs(desv) > p.desvioPct ? `${desv.toFixed(0)}% em relação à mediana (limite ${p.desvioPct}%)` : "",
      });
    }
  }
  linhas.sort((a, b) => Math.abs(b.desvio) - Math.abs(a.desvio));
  return {
    id: "atipicos", titulo: "Valores atípicos por procedimento", auditavel: true,
    descricao: `Compara cada procedimento (com pelo menos 3 ocorrências) com a mediana do valor recebido por ele. Destaca quem fica mais de ${p.desvioPct}% acima ou abaixo da mediana.`,
    ajuda: "Para cada procedimento, o sistema calcula o valor \"típico\" (a mediana) entre todas as vezes em que ele aparece. Aqui estão as vezes em que o valor recebido ficou muito acima ou abaixo disso. Exemplo: uma consulta que costuma render R$ 10,00 e aparece com R$ 100,00 (+900%). Pode ser erro de valor, ou apenas um procedimento de outra complexidade com o mesmo nome.",
    colunas: [col("beneficiario", "Beneficiário"), col("periodo", "Extrato"), col("prestador", "Prestador"), col("dataEv", "Data"),
      col("desc", "Procedimento"), col("recebido", "Recebido", "moeda"), col("mediana", "Mediana", "moeda"), col("desvio", "Desvio", "pct")],
    linhas,
  };
}

function relLacunas(ctx) {
  const todos = ctx.meses.map(m => idxMes(m.ano, +m.mes));
  const linhas = [];
  if (todos.length) {
    const ini = Math.min(...todos), fim = Math.max(...todos);
    const rot = i => rotuloPeriodo(Math.floor(i / 12), String((i % 12) + 1).padStart(2, "0"));
    for (const [b, ms] of agrupa(ctx.meses, m => m.beneficiario)) {
      const tem = new Set(ms.map(m => idxMes(m.ano, +m.mes)));
      const falta = [];
      for (let i = ini; i <= fim; i++) if (!tem.has(i)) falta.push(rot(i));
      linhas.push({
        beneficiario: b, de: rot(ini), ate: rot(fim), presentes: tem.size, esperados: fim - ini + 1,
        ausentes: falta.join(", ") || "—", _alerta: falta.length ? `${falta.length} mês(es) sem extrato` : "",
      });
    }
  }
  return {
    id: "lacunas", titulo: "Cobertura dos dados (meses faltando)", auditavel: true,
    descricao: "Confere se todo beneficiário tem extrato em todos os meses do intervalo coberto. Mês ausente pode ser falha na extração (rode de novo com --refazer) ou ausência real de lançamento.",
    ajuda: "Mostra se algum beneficiário está sem extrato em algum mês do período. Mês ausente pode ser falha ao baixar os dados (rode python main.py --refazer) ou simplesmente um mês em que o site não trouxe lançamentos.",
    colunas: [col("beneficiario", "Beneficiário"), col("de", "De"), col("ate", "Até"), col("presentes", "Meses presentes", "int"),
      col("esperados", "Meses esperados", "int"), col("ausentes", "Meses ausentes")],
    linhas,
  };
}

function relIncompletos(ctx) {
  const linhas = ctx.L.map(r => {
    const pr = [];
    if (!r.prestador) pr.push("sem prestador");
    if (!r.cnpj) pr.push("sem CNPJ");
    if (!r.desc) pr.push("sem procedimento");
    if (!r.temRecebido) pr.push("sem valor recebido");
    else if (r.recebido === 0) pr.push("valor recebido zerado");
    if (!parseBR(r.dataAt)) pr.push("data do atendimento inválida");
    return { r, pr };
  }).filter(x => x.pr.length).map(({ r, pr }) => ({
    beneficiario: r.beneficiario, periodo: rotuloPeriodo(r.ano, r.mes), prestador: r.prestador, dataEv: r.dataEv, desc: r.desc,
    recebido: r.recebido, _alerta: pr.join("; "),
  }));
  return {
    id: "incompletos", titulo: "Dados incompletos ou zerados", auditavel: true,
    descricao: "Procedimentos com informação faltando (prestador, CNPJ, descrição, data) ou com valor recebido ausente/zerado.",
    colunas: [col("beneficiario", "Beneficiário"), col("periodo", "Extrato"), col("prestador", "Prestador"), col("dataEv", "Data"),
      col("desc", "Procedimento"), col("recebido", "Recebido", "moeda")],
    linhas,
  };
}

function relCopart(ctx) {
  const linhas = ctx.L.filter(r => r.copart > 0).map(r => ({
    beneficiario: r.beneficiario, periodo: rotuloPeriodo(r.ano, r.mes), prestador: r.prestador, dataEv: r.dataEv, desc: r.desc, copart: r.copart,
  })).sort((a, b) => b.copart - a.copart);
  return {
    id: "copart", titulo: "Coparticipações cobradas",
    descricao: "Todos os procedimentos em que houve coparticipação (valor pago pelo beneficiário), do maior para o menor.",
    colunas: [col("beneficiario", "Beneficiário"), col("periodo", "Extrato"), col("prestador", "Prestador"), col("dataEv", "Data"),
      col("desc", "Procedimento"), col("copart", "Coparticipação", "moeda")],
    linhas,
    cards: [{ r: "Total de coparticipação", v: brl(soma(linhas, l => l.copart)) }],
  };
}

function construirRelatorios(brutas, params = {}) {
  const p = { ...PARAMS_PADRAO, ...params };
  const L = brutas.map(preparar);
  const ctx = { L, meses: baseMeses(L), lanc: baseLancamentos(L) };
  return [relResumo, relEvolucao, relConferenciaMes, relConferenciaLanc, relPrestadores, relProcedimentos,
    relDuplicidades, relAntigos, relAtipicos, relLacunas, relIncompletos, relCopart].map(f => f(ctx, p));
}
