"""Gera os dados do visualizador (a partir dos CSVs em ./extratos) e abre no navegador.

Uso:  python visualizar.py
Só usa a biblioteca padrão do Python (não precisa instalar nada).
"""
import csv
import json
import webbrowser
from pathlib import Path

BASE = Path(__file__).parent
EXTRATOS = BASE / "extratos"
PASTA = BASE / "visualizador"


def gerar_dados(origem: Path = EXTRATOS, destino: Path = PASTA) -> int:
    """Junta todos os CSVs em visualizador/dados.js. Retorna a quantidade de linhas."""
    linhas = []
    for arq in sorted(origem.glob("*.csv")):
        with open(arq, newline="", encoding="utf-8-sig") as f:
            linhas.extend(csv.DictReader(f, delimiter=";"))
    destino.mkdir(exist_ok=True)
    # Arquivo .js (e não .json) para o index.html carregar via duplo clique, sem servidor.
    (destino / "dados.js").write_text(
        "window.EXTRATOS = " + json.dumps(linhas, ensure_ascii=False) + ";\n", encoding="utf-8"
    )
    return len(linhas)


def main() -> None:
    n = gerar_dados()
    print(f"{n} linha(s) carregada(s) de {EXTRATOS}")
    if n == 0:
        print("Nenhum extrato encontrado. Rode primeiro: python main.py")
    webbrowser.open((PASTA / "index.html").as_uri())


if __name__ == "__main__":
    main()
