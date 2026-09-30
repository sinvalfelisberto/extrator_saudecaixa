"""Extrator do demonstrativo Saúde CAIXA.

Uso:  python main.py [--refazer] [--teste] [--ano 2026] [--mes 9] [--anos N | --todos]
Por padrão extrai os 2 anos mais recentes (ULTIMOS_ANOS).
Abre o site, espera você fazer o login na janela e grava um CSV por beneficiário/ano/mês em ./extratos
(NOME_BENEFICIARIO_ANO_MES.csv).
"""
import subprocess
import sys
from pathlib import Path

BASE = Path(__file__).parent


def preparar_ambiente() -> None:
    """Instala dependências e o navegador na primeira execução, para rodar só com `python main.py`."""
    try:
        import dotenv  # noqa: F401
        import playwright  # noqa: F401
    except ImportError:
        print("Instalando dependências (primeira execução)...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", str(BASE / "requirements.txt")])
    marcador = BASE / ".browser_profile" / ".chromium_ok"
    if not marcador.exists():
        subprocess.check_call([sys.executable, "-m", "playwright", "install", "chromium"])
        marcador.parent.mkdir(exist_ok=True)
        marcador.touch()


preparar_ambiente()

import os  # noqa: E402

from dotenv import load_dotenv  # noqa: E402
from playwright.sync_api import TimeoutError as PWTimeout, sync_playwright  # noqa: E402

from extrator import extrair_tudo  # noqa: E402

load_dotenv(BASE / ".env")


SITE = os.environ.get("SITE", "https://atendimentosaude.caixa.gov.br/").strip()

PERFIL = BASE / ".browser_profile"  # mantém a sessão entre execuções
SAIDA = BASE / "extratos"
ESPERA_LOGIN_MIN = 10
ULTIMOS_ANOS = 2  # quantos anos (do mais recente para trás) extrair por padrão


def aguardar_login(page) -> None:
    """Abre o site e espera a PESSOA logar e abrir a página do extrato financeiro."""
    page.goto(SITE)
    print("\n>>> 1) Faça o login na janela do navegador que abriu.")
    print(">>> 2) Depois, abra a página do Extrato Financeiro (Meus Dados > Financeiro > Extrato).")
    print(f">>> O programa continua sozinho quando a página abrir (espera até {ESPERA_LOGIN_MIN} min).\n")
    try:
        # A lista de meses (Lançamentos) só existe na página do extrato, já logado.
        page.locator(".containerLancamentoItem").first.wait_for(timeout=ESPERA_LOGIN_MIN * 60 * 1000)
    except PWTimeout:
        sys.exit("Tempo esgotado esperando o login/página do extrato. Rode o programa de novo.")
    print("Página do extrato detectada. Iniciando a extração...")


def abrir_navegador(p):
    args = dict(user_data_dir=PERFIL, headless=False, viewport={"width": 1400, "height": 900})
    try:
        return p.chromium.launch_persistent_context(channel="chrome", **args)  # Chrome instalado
    except Exception:
        return p.chromium.launch_persistent_context(**args)  # Chromium do Playwright


def argumento(nome: str) -> str | None:
    """Valor de `--nome valor` ou `--nome=valor` na linha de comando."""
    for i, a in enumerate(sys.argv):
        if a == nome and i + 1 < len(sys.argv):
            return sys.argv[i + 1]
        if a.startswith(nome + "="):
            return a.split("=", 1)[1]
    return None


def main() -> None:
    refazer = "--refazer" in sys.argv
    ano = argumento("--ano")
    mes = int(argumento("--mes")) if argumento("--mes") else None
    if "--todos" in sys.argv:
        ultimos_anos = None
    else:
        ultimos_anos = int(argumento("--anos") or ULTIMOS_ANOS)
    so_ultimo = "--teste" in sys.argv and not (ano or mes)  # teste rápido: só o mês mais recente
    with sync_playwright() as p:
        ctx = abrir_navegador(p)
        page = ctx.pages[0] if ctx.pages else ctx.new_page()
        aguardar_login(page)
        extrair_tudo(page, SAIDA, refazer, ano, mes, so_ultimo, ultimos_anos)
        ctx.close()
    print(f"Concluído. Arquivos em: {SAIDA}")


if __name__ == "__main__":
    main()
