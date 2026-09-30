"""Extrai o demonstrativo (Extrato Financeiro > Lançamentos) de cada beneficiário/ano/mês em CSV."""
import csv
import re
import unicodedata
from pathlib import Path

MESES = {
    "Janeiro": 1, "Fevereiro": 2, "Março": 3, "Abril": 4, "Maio": 5, "Junho": 6,
    "Julho": 7, "Agosto": 8, "Setembro": 9, "Outubro": 10, "Novembro": 11, "Dezembro": 12,
}
SEM_SELECAO = "Selecione uma opção"

COLUNAS = [
    "beneficiario", "ano", "mes", "mensalidade", "coparticipacao_mes", "total_mes",
    "prestador", "cnpj", "data_atendimento", "valor_lancamento",
    "evento_data", "evento_descricao", "evento_coparticipacao", "Recebido pelo Prestador",
]

# Roda dentro da página: lê totais do cabeçalho e cada lançamento (com seus eventos, que
# já estão no DOM dentro do bloco de cada registro).
JS_EXTRAIR = """() => {
  const t = e => (e ? e.textContent : '').replace(/\\s+/g, ' ').trim();
  const totais = {};
  document.querySelectorAll('div.info-financ').forEach(e => {
    const m = t(e).match(/^(Mensalidade|Coparticipação|Total):\\s*(.*)$/);
    if (m && !e.closest('asc-viewport')) totais[m[1]] = m[2];
  });
  const registros = [...document.querySelectorAll('p.remb-cpfcnpj')].map(p => {
    const rec = p.parentElement;
    const escopo = rec.querySelector('asc-viewport') || rec;
    const eventos = [];
    let data = null, ev = null, proximoRecebido = false;
    // Uma data pode ter vários procedimentos abaixo dela: cada .nome-prestador após a data é um evento.
    escopo.querySelectorAll('.info-financDate, .nome-prestador, div.info-financ, p.float-right')
      .forEach(e => {
        if (e.matches('.info-financDate')) { data = t(e); ev = null; proximoRecebido = false; }
        else if (data === null) return;  // cabeçalho (nome do prestador) vem antes da 1ª data
        else if (e.matches('.nome-prestador')) { ev = {data, descricao: t(e)}; eventos.push(ev); proximoRecebido = false; }
        else if (!ev) return;
        else if (e.matches('div.info-financ')) proximoRecebido = /Recebido pelo prestador/i.test(t(e));
        else if (proximoRecebido) { ev.recebido = t(e); proximoRecebido = false; }
        else if (ev.copart === undefined) ev.copart = t(e);
      });
    return {
      prestador: t(escopo.querySelector('.nome-prestador')),
      valor: t(rec.querySelector('.valueCP')),
      cnpj: t(p),
      data_atendimento: t(rec.querySelector('.comp-data p.float-right')),
      eventos,
    };
  });
  return {totais, registros};
}"""


def slug(texto: str) -> str:
    sem_acento = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode()
    return re.sub(r"[^A-Za-z0-9]+", "_", sem_acento).strip("_").upper()


def aguardar(page) -> None:
    """Espera o overlay 'Carregando...' sumir e a tela assentar."""
    page.wait_for_timeout(300)
    page.get_by_text("Carregando...").first.wait_for(state="hidden", timeout=60000)
    page.wait_for_timeout(700)


def opcoes(dropdown) -> list[str]:
    return [o.strip() for o in dropdown.locator("select option").all_inner_texts()
            if o.strip() and o.strip() != SEM_SELECAO]


def escolher(page, dropdown, texto: str) -> None:
    dropdown.locator(".ui-dropdown-trigger").click()
    dropdown.locator(".ui-dropdown-items li").filter(has_text=texto).first.click()
    aguardar(page)


def selecionar_ano(page, ano: str) -> None:
    dd = page.locator("p-dropdown.selectAno").first
    if dd.locator("label.ui-dropdown-label").inner_text().strip() != ano:
        escolher(page, dd, ano)
    page.wait_for_selector(".containerLancamentoItem")


def abrir_mes(page, item) -> None:
    benef = page.locator("p-dropdown.custom-border").first
    item.click()
    try:
        benef.wait_for(state="visible", timeout=5000)
    except Exception:  # clique no texto não abriu; tenta na seta à direita
        box = item.bounding_box()
        item.click(position={"x": box["width"] - 10, "y": box["height"] / 2})
        benef.wait_for(state="visible", timeout=15000)
    aguardar(page)


def linhas(beneficiario: str, ano: str, mes: int, dados: dict) -> list[dict]:
    tot = dados["totais"]
    base = {
        "beneficiario": beneficiario, "ano": ano, "mes": f"{mes:02d}",
        "mensalidade": tot.get("Mensalidade", ""),
        "coparticipacao_mes": tot.get("Coparticipação", ""),
        "total_mes": tot.get("Total", ""),
    }
    saida = []
    for r in dados["registros"]:
        lanc = {**base, "prestador": r["prestador"], "cnpj": r["cnpj"],
                "data_atendimento": r["data_atendimento"], "valor_lancamento": r["valor"]}
        for e in r["eventos"] or [{}]:
            saida.append({**lanc, "evento_data": e.get("data", ""),
                          "evento_descricao": e.get("descricao", ""),
                          "evento_coparticipacao": e.get("copart", ""),
                          "Recebido pelo Prestador": e.get("recebido", "")})
    return saida


def gravar(caminho: Path, rows: list[dict]) -> None:
    # ';' + UTF-8 com BOM: abre direto no Excel em pt-BR.
    with open(caminho, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=COLUNAS, delimiter=";")
        w.writeheader()
        w.writerows(rows)


def extrair_tudo(page, destino: Path, refazer: bool = False,
                 ano_filtro: str | None = None, mes_filtro: int | None = None,
                 so_ultimo: bool = False, ultimos_anos: int | None = None) -> None:
    """Sem filtros extrai tudo. Os filtros restringem a um ano/mês; `so_ultimo` pega só o mês mais recente;
    `ultimos_anos` limita aos N anos mais recentes (None = todos)."""
    destino.mkdir(exist_ok=True)
    page.wait_for_selector(".containerLancamentoItem", timeout=60000)
    aguardar(page)

    anos = opcoes(page.locator("p-dropdown.selectAno").first)
    print("Anos disponíveis:", ", ".join(anos))

    if ano_filtro:
        if ano_filtro not in anos:
            raise SystemExit(f"Ano {ano_filtro} indisponível. Disponíveis: {', '.join(anos)}")
        anos = [ano_filtro]

    if ultimos_anos and not ano_filtro:
        anos = anos[:ultimos_anos]  # o site lista do ano mais recente para o mais antigo
        print(f"Extraindo os {len(anos)} ano(s) mais recente(s): {', '.join(anos)}")

    if so_ultimo:
        anos = anos[:1]  # a lista vem do ano mais recente para o mais antigo

    for ano in anos:
        selecionar_ano(page, ano)
        itens = page.locator(".containerLancamentoItem")
        nomes_meses = [m.strip() for m in page.locator(".containerLancamentoItem .strMesLI").all_inner_texts()]
        if so_ultimo:
            nomes_meses = nomes_meses[:1]  # meses vêm do mais recente para o mais antigo
        for i, nome_mes in enumerate(nomes_meses):
            mes = MESES[nome_mes]
            if mes_filtro and mes != mes_filtro:
                continue
            abrir_mes(page, itens.nth(i))
            benef_dd = page.locator("p-dropdown.custom-border").first
            for benef in opcoes(benef_dd):
                arq = destino / f"{slug(benef)}_{ano}_{mes:02d}.csv"
                if arq.exists() and not refazer:
                    print("já existe, pulando:", arq.name)
                    continue
                escolher(page, benef_dd, benef)
                page.get_by_text("Detalhes do Lançamento").first.wait_for(timeout=30000)
                rows = linhas(benef, ano, mes, page.evaluate(JS_EXTRAIR))
                gravar(arq, rows)
                print(f"{arq.name}: {len(rows)} linha(s)")
