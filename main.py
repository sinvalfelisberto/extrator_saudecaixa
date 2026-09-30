"""Extrator do demonstrativo Saúde CAIXA.

Uso:  python main.py [--refazer]
Lê CPF/SENHA do arquivo .env, faz login, e grava um CSV por beneficiário/ano/mês em ./extratos
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


def config(chave: str) -> str:
    valor = os.environ.get(chave, "").strip()
    if not valor:
        sys.exit(f"Variável {chave} ausente no .env (veja .env.example).")
    return valor


SITE = config("SITE")
CPF = config("CPF")
SENHA = config("SENHA")
PAGINA_DEMONSTRATIVO = config("PAGINA_DEMOSTRATIVO")  # grafia igual à do .env

PERFIL = BASE / ".browser_profile"  # mantém a sessão entre execuções
SAIDA = BASE / "extratos"


def bloqueado(page) -> bool:
    return "perfdrive.com" in page.url


def login(page) -> None:
    page.goto(SITE)
    page.wait_for_load_state("domcontentloaded")

    if bloqueado(page):
        input("Bloqueio anti-bot da Caixa detectado. Resolva na janela e tecle ENTER...")

    try:
        page.wait_for_selector("#username, .containerLancamentoItem, text=Saúde CAIXA", timeout=30000)
    except PWTimeout:
        sys.exit(f"Tela inesperada: {page.url}")
    if page.query_selector("#username") is None:  # sessão anterior ainda válida
        return

    if page.query_selector("#truste-consent-button"):
        page.click("#truste-consent-button")

    page.fill("#username", CPF)
    page.click("#button-submit")  # "Próximo"

    page.wait_for_selector("input[type=password]", timeout=30000)
    page.fill("input[type=password]", SENHA)
    page.click("#button-submit, button[type=submit]")

    try:
        page.wait_for_url(f"{SITE.rstrip('/')}/**", timeout=30000)
    except PWTimeout:
        input("Login não concluiu (captcha/2FA?). Resolva na janela e tecle ENTER...")


def abrir_navegador(p):
    args = dict(user_data_dir=PERFIL, headless=False, viewport={"width": 1400, "height": 900})
    try:
        return p.chromium.launch_persistent_context(channel="chrome", **args)  # Chrome instalado
    except Exception:
        return p.chromium.launch_persistent_context(**args)  # Chromium do Playwright


def main() -> None:
    refazer = "--refazer" in sys.argv
    with sync_playwright() as p:
        ctx = abrir_navegador(p)
        page = ctx.pages[0] if ctx.pages else ctx.new_page()
        login(page)
        extrair_tudo(page, PAGINA_DEMONSTRATIVO, SAIDA, refazer)
        ctx.close()
    print(f"Concluído. Arquivos em: {SAIDA}")


if __name__ == "__main__":
    main()
