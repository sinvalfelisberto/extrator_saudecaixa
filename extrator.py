"""Extrai o demonstrativo (Extrato Financeiro > Lançamentos) de cada beneficiário/ano/mês em CSV."""
import csv
import re
import unicodedata
from pathlib import Path

from playwright.sync_api import TimeoutError as PWTimeout

MESES = {
    "Janeiro": 1, "Fevereiro": 2, "Março": 3, "Abril": 4, "Maio": 5, "Junho": 6,
    "Julho": 7, "Agosto": 8, "Setembro": 9, "Outubro": 10, "Novembro": 11, "Dezembro": 12,
}
SEM_SELECAO = "Selecione uma opção"
TENTATIVAS = 5  # quantas vezes tentar cada arquivo (e cada mês) antes de desistir e ir para o próximo

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


def abrir_mes(page, item, nome_mes: str, ano: str) -> None:
    """Abre o mês e só retorna quando o painel da direita mostra 'Mês Ano' (ex.: 'Maio 2026').

    O clique só abre o painel na seta à direita do item. Sem conferir o título, um clique que não
    funcionou deixaria na tela o mês anterior, e o CSV sairia com os dados do mês errado.
    """
    titulo = page.get_by_text(f"{nome_mes} {ano}", exact=True).first
    caixa = item.bounding_box()
    tentativas = [{"x": caixa["width"] - 18, "y": caixa["height"] / 2},  # seta
                  {"x": caixa["width"] / 2, "y": caixa["height"] / 2}]  # centro (reserva)
    for posicao in tentativas:
        item.click(position=posicao)
        try:
            titulo.wait_for(state="visible", timeout=5000)
            break
        except Exception:
            continue
    else:
        raise RuntimeError(f"Não consegui abrir {nome_mes}/{ano}: o painel não mostrou o mês.")
    page.locator("p-dropdown.custom-border").first.wait_for(state="visible", timeout=15000)
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
    if not saida:  # mês sem lançamentos: guarda ao menos os totais do mês
        saida.append(base)
    return saida


def gravar(caminho: Path, rows: list[dict]) -> None:
    # ';' + UTF-8 com BOM: abre direto no Excel em pt-BR.
    with open(caminho, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=COLUNAS, delimiter=";")
        w.writeheader()
        w.writerows(rows)


def ler_beneficiario(page, item, nome_mes: str, ano: str, benef: str, tentativas: int = TENTATIVAS) -> dict:
    """Escolhe o beneficiário e lê a tela. Se a tela não responder, reabre o mês e tenta de novo."""
    erro: Exception | None = None
    for n in range(1, tentativas + 1):
        try:
            benef_dd = page.locator("p-dropdown.custom-border").first
            escolher(page, benef_dd, benef)
            # Garante que o beneficiário escolhido é o que está na tela antes de ler.
            benef_dd.locator("label.ui-dropdown-label").filter(has_text=benef).wait_for(timeout=15000)
            page.get_by_text("Detalhes do Lançamento").first.wait_for(timeout=30000)
            return page.evaluate(JS_EXTRAIR)
        except PWTimeout as e:
            erro = e
            print(f"  tentativa {n}/{tentativas} falhou para {benef} ({nome_mes}/{ano})")
            page.keyboard.press("Escape")  # fecha lista aberta, se houver
            if n < tentativas:
                page.wait_for_timeout(2000 * n)  # pausa crescente: dá tempo da página se recuperar
                try:
                    abrir_mes(page, item, nome_mes, ano)  # reabre o mês e tenta de novo
                except (PWTimeout, RuntimeError):
                    pass  # a próxima tentativa reporta o erro, se persistir
    raise erro


def abrir_mes_com_tentativas(page, item, nome_mes: str, ano: str) -> bool:
    for n in range(1, TENTATIVAS + 1):
        try:
            abrir_mes(page, item, nome_mes, ano)
            return True
        except (PWTimeout, RuntimeError):
            print(f"  tentativa {n}/{TENTATIVAS} de abrir {nome_mes}/{ano} falhou")
            page.keyboard.press("Escape")
            page.wait_for_timeout(2000 * n)
    return False


def registrar_falha(page, destino: Path, falhas: list[str], nome: str, motivo: str) -> None:
    """Anota a falha, guarda uma captura da tela para diagnóstico e segue para o próximo arquivo."""
    falhas.append(nome)
    pasta = destino.parent / "diagnostico"
    pasta.mkdir(exist_ok=True)
    try:
        page.screenshot(path=str(pasta / f"{nome}.png"))
    except Exception:
        pass
    print(f"✗ FALHOU {nome}: {motivo}")


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

    ultima: dict = {}  # beneficiário -> conteúdo do último mês gravado (detecta leitura desatualizada)
    falhas: list[str] = []

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
            if not abrir_mes_com_tentativas(page, itens.nth(i), nome_mes, ano):
                registrar_falha(page, destino, falhas, f"{ano}_{mes:02d}", f"não abriu o mês após {TENTATIVAS} tentativas")
                continue
            for benef in opcoes(page.locator("p-dropdown.custom-border").first):
                arq = destino / f"{slug(benef)}_{ano}_{mes:02d}.csv"
                if arq.exists() and not refazer:
                    print("já existe, pulando:", arq.name)
                    continue
                try:
                    dados = ler_beneficiario(page, itens.nth(i), nome_mes, ano, benef)
                except (PWTimeout, RuntimeError) as erro:
                    registrar_falha(page, destino, falhas, arq.stem, f"falhou após {TENTATIVAS} tentativas ({type(erro).__name__})")
                    continue
                rows = linhas(benef, ano, mes, dados)
                gravar(arq, rows)
                if not dados["registros"]:
                    print(f"{arq.name}: sem lançamentos no mês")
                    continue
                print(f"{arq.name}: {len(rows)} linha(s)")
                # Alerta de leitura desatualizada: o mês não deveria sair igual ao anterior do mesmo beneficiário.
                assinatura = tuple(tuple(r[c] for c in COLUNAS if c not in ("ano", "mes")) for r in rows)
                if ultima.get(benef) == assinatura:
                    print(f"  ⚠ ATENÇÃO: {arq.name} é idêntico ao mês anterior. A tela pode não ter atualizado; confira no site.")
                ultima[benef] = assinatura

    if falhas:
        print(f"\n✗ {len(falhas)} arquivo(s) NÃO foram gerados: {', '.join(falhas)}")
        print("  Rode o programa de novo (ele pula o que já está pronto e tenta só o que faltou).")
        print(f"  Capturas de tela do que aparecia em cada falha: {destino.parent / 'diagnostico'}")
