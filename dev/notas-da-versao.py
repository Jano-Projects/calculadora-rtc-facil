#!/usr/bin/env python3
"""
Monta as notas da página de Releases a partir do CHANGELOG.md: a seção "## <versão> — <data>" inteira,
mais o quadro "Como instalar". Usado pelo workflow de lançamento (.github/workflows/lancamento.yml).

Uso: python3 dev/notas-da-versao.py 1.7.0 > notas.md
Sai com erro se a seção da versão não existir: assim não se publica uma versão sem notas.
"""
import pathlib
import re
import sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent

COMO_INSTALAR = """
### Como instalar

| Sistema | Arquivo | Como |
|---|---|---|
| **Windows 10/11** | `CalculadoraRTC-{v}-instalador-windows.exe` | Dois cliques e *Avançar*. Não pede administrador. |
| **Debian, Ubuntu e derivados** | `calculadora-rtc_{v}_all.deb` | Dois cliques no arquivo, ou `sudo apt install ./calculadora-rtc_{v}_all.deb` |
| **Fedora** | `calculadora-rtc-{v}-1.noarch.rpm` | Dois cliques no arquivo, ou `sudo dnf install ./calculadora-rtc-{v}-1.noarch.rpm` |
| **Qualquer sistema, sem instalar** | `calculadora-rtc-facil-{v}.zip` | Extraia e rode `iniciar.bat` (Windows) ou `bash iniciar.sh` (Linux) |

Depois de instalar, abra **Calculadora RTC** no Menu Iniciar ou no menu de aplicativos. Na primeira vez ela baixa o Java e a calculadora oficial da Receita (de 5 a 15 minutos, com o andamento na tela); nas outras, abre em segundos. Para atualizar, instale a versão nova por cima: o que já foi baixado é aproveitado.

Cada instalador foi instalado, aberto, encerrado e desinstalado automaticamente em Windows, Debian, Ubuntu e Fedora antes desta publicação. `SHA256SUMS.txt` traz as somas de conferência dos arquivos.
"""


def main() -> None:
    versao = sys.argv[1]
    texto = (RAIZ / "CHANGELOG.md").read_text(encoding="utf-8")
    achado = re.search(rf"^## {re.escape(versao)}\b.*?$(.*?)(?=^## |\Z)", texto, re.M | re.S)
    if not achado:
        sys.exit(f"CHANGELOG.md não tem a seção da versão {versao}")
    corpo = achado.group(1).strip()
    print(corpo + "\n" + COMO_INSTALAR.format(v=versao))


if __name__ == "__main__":
    main()
