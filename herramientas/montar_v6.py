"""Monta app/index.html (v6) a partir de src/v6/ + datos de la demo + motor, todo inline.

    python herramientas/montar_v6.py [datos.json] [motor.js]

Por defecto: datos/oro_rsi4_v3.json y app/motor_puente.js (si existe).
El resultado abre con doble clic (sin fetch): los datos y el motor van incrustados.
"""
import base64
import gzip
import json
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SRC = RAIZ / "src" / "v6"

# ---------- librería de datos ----------
# Cada juego de datos es una fila: el fichero, a qué activo y temporalidad corresponde, y cómo se llama en los
# botones. Los CSV van incrustados comprimidos (gzip + base64) y la app los descomprime al pulsarlos, así que la
# herramienta sigue abriendo con doble clic sin descargar nada. `var` = constante JS que ya lleva ese CSV, para no
# duplicar su peso ("null" = el oro, que va entero en CSV_EJEMPLO).
LIBRERIA = [
    dict(id="oro_d1", fichero="XAUUSD_D1_ejemplo.csv", ruta="datos/XAUUSD_D1_ejemplo.csv",
         sim="XAUUSD", clase="metal", tf="D1", zona="servidor_gmt3_usdst", var="null",
         b_t="Oro", b_s="diario", txt="los de ejemplo del oro (XAUUSD diario)",
         nombre="Oro (XAUUSD) diario \u00b7 Darwinex"),
    dict(id="ndx_d1", fichero="NDX_D1.csv", ruta="datos/paquete_ndx_spy/NDX_D1.csv",
         sim="NDX", clase="indice", tf="D1", zona="servidor_gmt3_usdst", var="CSV_NDX_GZ",
         b_t="Nasdaq", b_s="diario", txt="los del Nasdaq 100 (NDX diario)",
         nombre="Nasdaq 100 (NDX) diario \u00b7 Darwinex"),
    dict(id="ndx_h1", fichero="NDX_H1.csv", ruta="datos/paquete_ndx_spy/NDX_H1.csv",
         sim="NDX", clase="indice", tf="H1", zona="nueva_york", var=None,
         b_t="Nasdaq", b_s="1 hora", txt="los del Nasdaq 100 (NDX por horas)",
         nombre="Nasdaq 100 (NDX) en 1 hora \u00b7 Darwinex, hora de Nueva York"),
    dict(id="spy_d1", fichero="SPY_D1.csv", ruta="datos/paquete_ndx_spy/SPY_D1.csv",
         sim="SPY", clase="etf", tf="D1", zona="servidor_gmt3_usdst", var=None,
         b_t="S&P 500", b_s="diario \u00b7 SPY", txt="los del S&P 500 (SPY diario)",
         nombre="S&P 500 (SPY, CFD del ETF) diario \u00b7 Darwinex"),
    dict(id="spy_h1", fichero="SPY_H1.csv", ruta="datos/paquete_ndx_spy/SPY_H1.csv",
         sim="SPY", clase="etf", tf="H1", zona="nueva_york", var=None,
         b_t="S&P 500", b_s="1 hora \u00b7 SPY", txt="los del S&P 500 (SPY por horas)",
         nombre="S&P 500 (SPY, CFD del ETF) en 1 hora \u00b7 Darwinex, hora de Nueva York"),
    dict(id="nas100_m15", fichero="NAS100_M15_ejemplo.csv", ruta="datos/NAS100_M15_ejemplo.csv",
         sim="NAS100", clase="indice", tf="M15", zona="nueva_york", var="CSV_NAS_GZ", ejemplo=True,
         b_t="NAS100", b_s="15 minutos", txt="los de ejemplo del NAS100 en 15 min",
         nombre="Ejemplo NAS100 \u00b7 15 min"),
]
CLAVES = ("id", "fichero", "sim", "clase", "tf", "zona", "b_t", "b_s", "txt", "nombre", "ejemplo",
          "velas", "desde", "hasta")
_FECHA = re.compile(r"(\d{4})[.\-/](\d{2})[.\-/](\d{2})")


def seguro(txt: str) -> str:
    """Evita que un </... (cualquier mayúscula/minúscula) dentro de los datos o del motor cierre la etiqueta.
    Igual que motor/construir_puente.py: escapar TODO «</» es más seguro que solo "</script" en minúsculas."""
    return txt.replace("</", "<\\/").replace("<!--", "<\\!--")


def ficha(texto: str) -> dict:
    """Velas y primera/última fecha del CSV: los botones dicen el periodo sin descomprimir nada."""
    fechas = [m.group(1) + "-" + m.group(2) + "-" + m.group(3)
              for m in (_FECHA.match(ln[:40]) for ln in texto.splitlines()) if m]
    return dict(velas=len(fechas), desde=fechas[0] if fechas else None, hasta=fechas[-1] if fechas else None)


def libreria_js() -> str:
    """CSV_NDX_GZ / CSV_NAS_GZ (compatibilidad) + const LIBRERIA con metadatos y datos comprimidos."""
    partes, filas = [], []
    for e in LIBRERIA:
        f = RAIZ / e["ruta"]
        if not f.exists():
            print(f"  ! falta {e['ruta']}: {e['id']} se queda fuera de la librería")
            continue
        b64 = base64.b64encode(gzip.compress(f.read_bytes(), compresslevel=9, mtime=0)).decode("ascii")
        if e["var"] == "null":
            gz = "null"
        elif e["var"]:
            partes.append(f'const {e["var"]} = "{b64}";')
            gz = e["var"]
        else:
            gz = '"' + b64 + '"'
        d = dict(e, **ficha(f.read_text(encoding="utf-8", errors="replace")))
        campos = ",".join(f"{k}:{json.dumps(d[k], ensure_ascii=False)}" for k in CLAVES if d.get(k) is not None)
        filas.append("{" + campos + ",gz:" + gz + "}")
        print(f"  {e['id']:11s} {d['velas']:6d} velas  {d['desde']} -> {d['hasta']}  ·  {len(b64) / 1e6:.2f} MB")
    for v in ("CSV_NDX_GZ", "CSV_NAS_GZ"):     # si faltara su fichero, que la app no se rompa
        if not any(p.startswith(f"const {v} ") for p in partes):
            partes.append(f"const {v} = null;")
    return "\n".join(partes) + "\nconst LIBRERIA = [\n" + ",\n".join(filas) + "\n];"


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
    nas_spec = RAIZ / "motor" / "spec_app_nas100_apertura_ny.json"
    js_csv += ("\nconst NAS_SPEC = " + json.dumps(json.loads(nas_spec.read_text(encoding="utf-8")), ensure_ascii=False) + ";"
               if nas_spec.exists() else "\nconst NAS_SPEC = null;")
    js_csv += "\n" + libreria_js()
    plantilla = (SRC / "cuerpo.html").read_text(encoding="utf-8")
    ia = (SRC / "ia_remota.js").read_text(encoding="utf-8") if (SRC / "ia_remota.js").exists() else ""
    app_js = (SRC / "app.js").read_text(encoding="utf-8")
    css = (SRC / "estilos.css").read_text(encoding="utf-8")

    def montar(lab: bool) -> str:
        """Pública (app/index.html) o laboratorio (src/lab/* dentro; luego se cifra en reto/index.html)."""
        L = RAIZ / "src" / "lab"
        lab_html = (L / "lab.html").read_text(encoding="utf-8") if lab else ""
        lab_css = (L / "lab.css").read_text(encoding="utf-8") if lab else ""
        lab_js = (L / "lab.js").read_text(encoding="utf-8") if lab else ""
        # módulo «TU UNIDAD» (opcional): va detrás de lab.css / lab.js; si no existe, no pasa nada
        if lab and (L / "unidad.css").exists():
            lab_css += "\n" + (L / "unidad.css").read_text(encoding="utf-8")
        if lab and (L / "unidad.js").exists():
            lab_js += "\n" + (L / "unidad.js").read_text(encoding="utf-8")
        js = ("window.MCT_LAB=true;\n" if lab else "") + ia + app_js.replace("/*__LAB_JS__*/", lab_js)
        # capas opcionales para las dos herramientas (modo premium, modo básico…): src/extra/*.css y *.js, en orden alfabético
        X = RAIZ / "src" / "extra"
        extra_css = "".join("\n" + f.read_text(encoding="utf-8") for f in sorted(X.glob("*.css"))) if X.exists() else ""
        js += "".join("\n" + f.read_text(encoding="utf-8") for f in sorted(X.glob("*.js"))) if X.exists() else ""
        return (plantilla
                .replace("/*__CSS__*/", css + lab_css + extra_css)
                .replace("<!--__LAB__-->", lab_html)
                .replace("<!--__MOTOR__-->", motor_js)
                .replace("/*__DATOS__*/", seguro(js_datos))
                .replace("/*__CSV__*/", seguro(js_csv))
                .replace("/*__JS__*/", js))

    html = montar(False)
    out = RAIZ / "app" / "index.html"
    out.write_text(html, encoding="utf-8")
    print(f"{out} · {len(html)/1e6:.2f} MB · datos {datos.name} · motor {'sí' if motor_js else 'no'}")

    # Laboratorio Reto Cueva: el repo es público, así que src/lab/ y la clave NO se versionan (.gitignore);
    # a GitHub solo va reto/index.html cifrado (AES-GCM, clave derivada con PBKDF2) — sin la clave es ilegible.
    clave_f = RAIZ / "herramientas" / "clave_reto.txt"
    clave = (clave_f.read_text(encoding="utf-8").strip() if clave_f.exists() else "")
    if not (RAIZ / "src" / "lab" / "lab.html").exists() or not clave:
        print("  laboratorio: sin src/lab/ o sin herramientas/clave_reto.txt → no se monta reto/index.html")
        return
    cifrado = cifrar_pagina(montar(True), clave)
    out_lab = RAIZ / "reto" / "index.html"
    out_lab.parent.mkdir(exist_ok=True)
    out_lab.write_text(cifrado, encoding="utf-8")
    print(f"{out_lab} · {len(cifrado)/1e6:.2f} MB · cifrado con la clave del reto")


def _norm_clave(c: str) -> str:
    return "".join(c.split()).upper()


def cifrar_pagina(html: str, clave: str) -> str:
    import os
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
    sal, iv, it = os.urandom(16), os.urandom(12), 310_000
    k = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=sal, iterations=it).derive(_norm_clave(clave).encode())
    ct = AESGCM(k).encrypt(iv, html.encode("utf-8"), None)
    b = lambda x: base64.b64encode(x).decode("ascii")  # noqa: E731
    return (SRC.parent / "lab_puerta.html").read_text(encoding="utf-8").replace(
        "/*__CIFRADO__*/", json.dumps({"s": b(sal), "i": b(iv), "it": it, "c": b(ct)}))


if __name__ == "__main__":
    main()
