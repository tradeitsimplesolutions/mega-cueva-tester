"""Monta app/index.html (v6) a partir de src/v6/ + datos de la demo + motor, todo inline.

    python herramientas/montar_v6.py [datos.json] [motor.js]

Por defecto: datos/oro_rsi4_v3.json y app/motor_puente.js (si existe).
El resultado abre con doble clic (sin fetch): los datos y el motor van incrustados.
"""
import base64
import gzip
import json
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SRC = RAIZ / "src" / "v6"


def seguro(txt: str) -> str:
    """Evita que un </script> dentro de los datos o del motor cierre la etiqueta."""
    return txt.replace("</script", "<\\/script").replace("<!--", "<\\!--")


def main():
    datos = Path(sys.argv[1]) if len(sys.argv) > 1 else RAIZ / "datos" / "oro_rsi4_v3.json"
    motor = Path(sys.argv[2]) if len(sys.argv) > 2 else RAIZ / "app" / "motor_puente.js"
    d = json.loads(datos.read_text(encoding="utf-8"))
    d.pop("agentes", None)
    js_datos = "const D_DEMO = " + json.dumps(d, ensure_ascii=False, separators=(",", ":")) + ";"
    motor_js = ""
    if motor.exists():
        motor_js = "<script>\n/* motor: " + motor.name + " */\n" + seguro(motor.read_text(encoding="utf-8")) + "\n</script>"
    csv = RAIZ / "datos" / "XAUUSD_D1_ejemplo.csv"
    js_csv = "const CSV_EJEMPLO = " + json.dumps(csv.read_text(encoding="utf-8")) + ";" if csv.exists() else "const CSV_EJEMPLO = null;"
    # ejemplo NAS100 de la Mega Cueva: spec + CSV M15 (~2 MB) comprimido con gzip y en base64 (~0,7 MB);
    # la app lo descomprime al pulsar «Cargar el ejemplo NAS100» con DecompressionStream('gzip').
    nas_spec = RAIZ / "motor" / "spec_app_nas100_apertura_ny.json"
    nas_csv = RAIZ / "datos" / "NAS100_M15_ejemplo.csv"
    if nas_spec.exists() and nas_csv.exists():
        b64 = base64.b64encode(gzip.compress(nas_csv.read_bytes(), compresslevel=9, mtime=0)).decode("ascii")
        js_csv += ("\nconst NAS_SPEC = " + json.dumps(json.loads(nas_spec.read_text(encoding="utf-8")), ensure_ascii=False) + ";"
                   + "\nconst CSV_NAS_GZ = \"" + b64 + "\";")
    else:
        js_csv += "\nconst NAS_SPEC = null; const CSV_NAS_GZ = null;"
    # Nasdaq 100 (NDX) diario de Darwinex (herramientas/exportar_ndx_ejemplo.py), también comprimido
    ndx = RAIZ / "datos" / "NDX_D1_ejemplo.csv"
    js_csv += ("\nconst CSV_NDX_GZ = \"" + base64.b64encode(gzip.compress(ndx.read_bytes(), compresslevel=9, mtime=0)).decode("ascii") + "\";"
               if ndx.exists() else "\nconst CSV_NDX_GZ = null;")
    plantilla = (SRC / "cuerpo.html").read_text(encoding="utf-8")
    html = (plantilla
            .replace("/*__CSS__*/", (SRC / "estilos.css").read_text(encoding="utf-8"))
            .replace("<!--__MOTOR__-->", motor_js)
            .replace("/*__DATOS__*/", seguro(js_datos))
            .replace("/*__CSV__*/", seguro(js_csv))
            .replace("/*__JS__*/", (SRC / "app.js").read_text(encoding="utf-8")))
    out = RAIZ / "app" / "index.html"
    out.write_text(html, encoding="utf-8")
    print(f"{out} · {len(html)/1e6:.2f} MB · datos {datos.name} · motor {'sí' if motor_js else 'no'}")


if __name__ == "__main__":
    main()
