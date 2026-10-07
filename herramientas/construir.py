"""Construye app/alternativa_topografia.html (diseño descartado) (un solo fichero autocontenido) a partir de src/.

Uso:  python herramientas/construir.py [ruta_json_demo]
Por defecto embebe datos/oro_rsi4.json como demo.
"""
import json
import pathlib
import sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
SRC = RAIZ / "src"


def main() -> None:
    demo = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else RAIZ / "datos" / "oro_rsi4.json"
    datos = json.loads(demo.read_text(encoding="utf-8"))
    css = (SRC / "estilos.css").read_text(encoding="utf-8")
    js = "\n".join(p.read_text(encoding="utf-8") for p in sorted((SRC / "js").glob("*.js")))
    html = (SRC / "plantilla.html").read_text(encoding="utf-8")
    datos_txt = json.dumps(datos, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    html = html.replace("/*__CSS__*/", css).replace("/*__DATOS__*/", datos_txt).replace("/*__JS__*/", js)
    salida = RAIZ / "app" / "alternativa_topografia.html"  # index.html es la v5 fusionada: no se genera
    salida.write_text(html, encoding="utf-8")
    (RAIZ / "app" / "_app.js").unlink(missing_ok=True)
    print(f"{salida}  {salida.stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    main()
