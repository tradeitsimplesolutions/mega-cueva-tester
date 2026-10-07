"""Verificación con Playwright: recorre la app a 1920x1080, 1440x900 y móvil.

Uso: python herramientas/verificar.py   (capturas en capturas/)
"""
import json
import pathlib
import tempfile

from playwright.sync_api import sync_playwright

RAIZ = pathlib.Path(__file__).resolve().parent.parent
APP = (RAIZ / "app" / "index.html").as_uri()
CAP = RAIZ / "capturas"
CAP.mkdir(exist_ok=True)
VISTAS = ["fases", "resumen", "estrategia", "prueba", "backtest", "operaciones", "protocolo"]
TMP = pathlib.Path(tempfile.mkdtemp())


def ficheros_prueba():
    d = json.loads((RAIZ / "datos" / "oro_rsi4.json").read_text(encoding="utf-8"))
    d["meta"] = {"nombre": "Prueba de carga", "activo": "XAUUSD", "tf": "diario"}
    for k in ("velas", "meseta", "arbol", "estado"):
        d.pop(k, None)
    j = TMP / "prueba_carga.json"
    j.write_text(json.dumps(d), encoding="utf-8")
    st = TMP / "informe_st.html"
    st.write_text("<html><body><table><tr><td>Initial Deposit</td><td>10 000.00</td></tr>"
                  "<tr><td>Total Net Profit</td><td>7 580.00</td></tr><tr><td>Total Trades</td><td>149</td></tr></table></body></html>",
                  encoding="utf-16")
    return j, st


def main():
    j, st = ficheros_prueba()
    errores = []
    notas = []
    with sync_playwright() as p:
        nav = p.chromium.launch()
        for (w, h, tag) in [(1920, 1080, "1920"), (1440, 900, "1440")]:
            pg = nav.new_page(viewport={"width": w, "height": h})
            pg.on("console", lambda m: errores.append(f"{tag} consola {m.type}: {m.text}") if m.type in ("error", "warning") else None)
            pg.on("pageerror", lambda e: errores.append(f"{tag} pageerror: {e}"))
            pg.goto(APP)
            pg.wait_for_timeout(1200)
            for nivel in ("entender", "avanzado"):
                pg.click(f'#nivel button[data-n="{nivel}"]')
                for i, v in enumerate(VISTAS):
                    pg.keyboard.press(str(i))
                    pg.wait_for_timeout(350)
                    pg.screenshot(path=str(CAP / f"{tag}_{nivel}_E{i}_{v}.png"))
                    # desbordamiento horizontal
                    ow = pg.evaluate(f"(()=>{{const e=document.querySelector('#v-{v}');return e.scrollWidth-e.clientWidth}})()")
                    if ow > 2:
                        notas.append(f"{tag} {nivel} {v}: desborda en horizontal {ow}px")
            pg.click('#nivel button[data-n="entender"]')
            # prueba inicial: editar y comprobar pseudocódigo
            pg.keyboard.press("3")
            antes = pg.inner_text("#pi-codigo")
            pg.fill('#bl-entrada .bloque[data-i="0"] input[data-p="valor"]', "30")
            pg.wait_for_timeout(200)
            despues = pg.inner_text("#pi-codigo")
            notas.append(f"{tag} pseudocódigo cambia al editar: {antes != despues and 'RSI(4) < 30' in despues}")
            pg.click('[data-add="salida"]')
            pg.select_option("#f-stop-t", "pct")
            pg.fill("#f-stop-v", "2")
            pg.wait_for_timeout(300)
            pg.screenshot(path=str(CAP / f"{tag}_prueba_editada.png"))
            notas.append(f"{tag} stop en pseudocódigo: {'stop −2,0 %' in pg.inner_text('#pi-codigo')}")
            pg.click('[data-fmt="json"]')
            pg.wait_for_timeout(200)
            pg.screenshot(path=str(CAP / f"{tag}_prueba_json.png"))
            pg.click('[data-fmt="pseudo"]')
            pg.click("#pi-correr")
            pg.wait_for_timeout(2200)
            pg.screenshot(path=str(CAP / f"{tag}_prueba_resultado.png"))
            notas.append(f"{tag} resultado visible: {pg.is_visible('#pi-res .crit4')}")
            pg.click("#pi-volver")
            pg.click("#pi-demo")
            # protocolo: cada prueba
            pg.keyboard.press("6")
            for k in range(6):
                pg.click(f'#p-lista .pf[data-i="{k}"]')
                pg.wait_for_timeout(250)
                pg.screenshot(path=str(CAP / f"{tag}_protocolo_{k}.png"))
            pg.set_input_files("#f-st", str(st))
            pg.wait_for_timeout(500)
            pg.screenshot(path=str(CAP / f"{tag}_paridad_informe.png"))
            notas.append(f"{tag} reconciliación: {pg.inner_text('#p-det .paso-par:nth-of-type(3)')[:160]!r}")
            # galería de fases
            pg.keyboard.press("0")
            pg.click('.g-est[data-i="4"]')
            pg.wait_for_timeout(200)
            pg.screenshot(path=str(CAP / f"{tag}_fases_montecarlo.png"))
            # presentación
            pg.keyboard.press("p")
            pg.wait_for_timeout(400)
            pg.screenshot(path=str(CAP / f"{tag}_pres_E0.png"))
            for n in range(4):
                pg.keyboard.press("ArrowRight")
                pg.wait_for_timeout(150)
            pg.screenshot(path=str(CAP / f"{tag}_pres_avance.png"))
            pg.keyboard.press("1")
            pg.wait_for_timeout(300)
            pg.screenshot(path=str(CAP / f"{tag}_pres_E1.png"))
            pg.keyboard.press("Escape")
            # carga de JSON
            pg.set_input_files("#f-json", str(j))
            pg.wait_for_timeout(600)
            notas.append(f"{tag} carga JSON -> nombre: {pg.inner_text('#st-nombre')!r}")
            for i, v in enumerate(VISTAS):
                pg.keyboard.press(str(i))
                pg.wait_for_timeout(250)
                if v in ("resumen", "estrategia", "protocolo"):
                    pg.screenshot(path=str(CAP / f"{tag}_cargado_{v}.png"))
            # tema claro
            pg.goto(APP + "#resumen")
            pg.wait_for_timeout(800)
            pg.click("#b-tema")
            pg.wait_for_timeout(300)
            pg.screenshot(path=str(CAP / f"{tag}_claro_resumen.png"))
            pg.keyboard.press("6")
            pg.wait_for_timeout(300)
            pg.screenshot(path=str(CAP / f"{tag}_claro_protocolo.png"))
            pg.click("#b-tema")
            pg.close()
        # móvil
        pg = nav.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)
        pg.on("pageerror", lambda e: errores.append(f"movil pageerror: {e}"))
        pg.goto(APP)
        pg.wait_for_timeout(1000)
        for v in ("fases", "resumen", "prueba", "protocolo"):
            pg.goto(APP + "#" + v)
            pg.wait_for_timeout(700)
            pg.screenshot(path=str(CAP / f"movil_{v}.png"), full_page=True)
            ow = pg.evaluate("document.documentElement.scrollWidth-document.documentElement.clientWidth")
            if ow > 2:
                notas.append(f"movil {v}: desborda {ow}px")
        nav.close()
    print("ERRORES:", len(errores))
    for e in errores:
        print(" ", e)
    for n in notas:
        print("-", n)


if __name__ == "__main__":
    main()
