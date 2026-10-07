# -*- coding: utf-8 -*-
"""construir_puente.py — genera app/motor_puente.js metiendo motor_tester.py dentro de puente_plantilla.js.

    python motor/construir_puente.py

El resultado no lee ningún fichero local (funciona con doble clic, file://) y se puede incrustar inline en
index.html: el código Python va como cadena JSON con «</» escapado, así que no puede cerrar un <script>.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

AQUI = Path(__file__).resolve().parent
SALIDA = AQUI.parent / "app" / "motor_puente.js"


def construir() -> Path:
    py = (AQUI / "motor_tester.py").read_text(encoding="utf-8")
    plantilla = (AQUI / "puente_plantilla.js").read_text(encoding="utf-8")
    version = re.search(r'^VERSION = "([^"]+)"', py, re.M).group(1)
    cadena = json.dumps(py, ensure_ascii=True).replace("</", "<\\/").replace("<!--", "<\\!--")
    js = plantilla.replace("/*__MOTOR_PY__*/''", cadena).replace("/*__MOTOR_VERSION__*/''", json.dumps(version))
    assert cadena in js and "__MOTOR_PY__" not in js, "marcadores de la plantilla no encontrados"
    assert "</script" not in js.lower(), "el JS no puede contener </script> (se incrusta inline)"
    SALIDA.write_text(js, encoding="utf-8", newline="\n")
    return SALIDA


if __name__ == "__main__":
    p = construir()
    print(f"{p} · {p.stat().st_size / 1024:.0f} KB")
