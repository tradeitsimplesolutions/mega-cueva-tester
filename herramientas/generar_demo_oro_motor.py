# -*- coding: utf-8 -*-
"""Regenera datos/oro_rsi4_v3.json (la DEMO del oro) con el motor actual.

    python herramientas/generar_demo_oro_motor.py

Sustituye a generar_oro_rsi4_v3.py, que partía de los reportes de Sentinel con el protocolo ANTIGUO (walk-forward y meseta
2×5 como jueces, sin sello): la demo enseñaba F2/F3 con otros criterios que los de la herramienta. Aquí la demo es
exactamente lo que el motor da para la regla de ejemplo (motor/spec_app_oro_rsi4.json sobre datos/XAUUSD_D1_ejemplo.csv),
con las mismas claves que la demo anterior más las del protocolo vigente (persistencia, robustez, sello, n_variantes).
Las claves que solo existen cuando el alumno corre su propia regla (spec, spec_app, nombre, motor…) no se incluyen: la
app distingue demo de resultado propio por el objeto, pero así queda también limpio en el JSON.
"""
import json
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ / "motor"))
import motor_tester as M  # noqa: E402

SAL = RAIZ / "datos" / "oro_rsi4_v3.json"
viejo = json.loads(SAL.read_text(encoding="utf-8"))
txt = (RAIZ / "datos" / "XAUUSD_D1_ejemplo.csv").read_text(encoding="utf-8", errors="replace")
spec = json.loads((RAIZ / "motor" / "spec_app_oro_rsi4.json").read_text(encoding="utf-8"))
res = M.correr_spec_app(txt, spec)
claves = set(viejo) | {"persistencia", "robustez", "sello", "n_variantes"}
nuevo = {k: res[k] for k in res if k in claves}
faltan = sorted(set(viejo) - set(nuevo))
assert not faltan, f"el motor no da estas claves de la demo anterior: {faltan}"
SAL.write_text(json.dumps(nuevo, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(f"{SAL} · {SAL.stat().st_size / 1024:.0f} KB · fases {nuevo['fases']} · {nuevo['verdict']}")
