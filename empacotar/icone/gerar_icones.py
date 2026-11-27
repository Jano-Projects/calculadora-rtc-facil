#!/usr/bin/env python3
"""
Gera os ícones dos instaladores a partir de calculadora-rtc.svg:

    png/calculadora-rtc-<N>.png   16 a 512 px (o Linux usa vários tamanhos no menu)
    calculadora-rtc.ico           Windows (instalador, lançador e atalhos)

Precisa de: rsvg-convert (pacote librsvg2-bin no Debian/Ubuntu, librsvg2-tools no Fedora) e Pillow
(pip install pillow). Os arquivos gerados já estão no repositório: só rode de novo se mudar o desenho.
"""
import pathlib
import subprocess

from PIL import Image

AQUI = pathlib.Path(__file__).resolve().parent
SVG = AQUI / "calculadora-rtc.svg"
TAMANHOS = [16, 24, 32, 48, 64, 128, 256, 512]


def main() -> None:
    pasta = AQUI / "png"
    pasta.mkdir(exist_ok=True)
    for n in TAMANHOS:
        subprocess.run(["rsvg-convert", "-w", str(n), "-h", str(n), str(SVG),
                        "-o", str(pasta / f"calculadora-rtc-{n}.png")], check=True)
    # o .ico guarda vários tamanhos num arquivo só; o Windows escolhe o certo para cada lugar
    Image.open(pasta / "calculadora-rtc-256.png").save(
        AQUI / "calculadora-rtc.ico", sizes=[(n, n) for n in (16, 24, 32, 48, 64, 128, 256)])
    print("ícones gerados em", AQUI)


if __name__ == "__main__":
    main()
