"""Capturas v7 con Playwright (file://): 3 temas × 1920x1080 y 1440x900, las 9 vistas e interacciones nuevas.

Uso: python herramientas/capturas_v7.py [--solo 1440] [--tema cueva] [--sin-vistas]
Capturas en capturas/v7/. Imprime errores de consola y prueba el traductor de lenguaje natural.
"""
import pathlib
import sys

from playwright.sync_api import sync_playwright

RAIZ = pathlib.Path(__file__).resolve().parent.parent
APP = (RAIZ / "app" / "index.html").as_uri()
CAP = RAIZ / "capturas" / "v7"
CAP.mkdir(parents=True, exist_ok=True)
VISTAS = ["mesa", "fases", "resumen", "estrategia", "prueba", "backtest", "operaciones", "validacion", "protocolo"]
TEMAS = ["cueva", "oscuro", "blanco"]
IDEAS = [
    "Compro oro en diario cuando el RSI de 4 baja de 25 y el precio está por encima de la media de 200. Vendo cuando el RSI sube de 55.",
    "Compro cuando la media de 20 cruza por encima de la media de 50, con un stop del 2% y objetivo de 3 ATR. Salgo a las 10 velas.",
    "Entro largo en el Nasdaq en velas de 1 hora si el precio rompe el máximo de las últimas 20 velas; cierro cuando el cierre está por debajo de la EMA de 10 o con stop de 1,5 ATR.",
    "Vendo en corto cuando el RSI de 14 supera 70 y el precio está por debajo de la media de 200. Recompro cuando el RSI baja de 50. Además miro la luna llena.",
]


def main():
    args = sys.argv[1:]
    solo = args[args.index("--solo") + 1] if "--solo" in args else None
    temas = [args[args.index("--tema") + 1]] if "--tema" in args else TEMAS
    errores, avisos = [], []
    with sync_playwright() as p:
        nav = p.chromium.launch()
        for (w, h) in [(1920, 1080), (1440, 900)]:
            if solo and str(w) != solo:
                continue
            for tema in temas:
                ctx = nav.new_context(viewport={"width": w, "height": h})
                ctx.grant_permissions(["clipboard-read", "clipboard-write"])
                pg = ctx.new_page()
                pg.on("console", lambda m, t=f"{w}/{tema}": errores.append(f"[{t}] {m.text}") if m.type == "error" else None)
                pg.on("pageerror", lambda e, t=f"{w}/{tema}": errores.append(f"[{t}] EXC {e}"))
                pg.goto(APP)
                pg.evaluate(f"localStorage.clear();localStorage.setItem('tis5_theme','{tema}')")
                pg.reload()
                pg.wait_for_timeout(900)
                if "--sin-vistas" not in args:
                    for i, v in enumerate(VISTAS):
                        pg.keyboard.press(str(i))
                        pg.wait_for_timeout(500 if v == "mesa" else 350)
                        pg.screenshot(path=str(CAP / f"{w}_{tema}_{i}_{v}.png"))
                # TU MESA con un agente abierto
                pg.keyboard.press("0"); pg.wait_for_timeout(300)
                pg.click('#of-tags [data-ag="reg"]'); pg.wait_for_timeout(1500)
                pg.screenshot(path=str(CAP / f"{w}_{tema}_0_mesa_reglas.png"))
                # menú plegado
                pg.click("#b-rail"); pg.wait_for_timeout(500)
                pg.screenshot(path=str(CAP / f"{w}_{tema}_0_menu_plegado.png"))
                pg.keyboard.press("3"); pg.wait_for_timeout(400)
                pg.screenshot(path=str(CAP / f"{w}_{tema}_3_arbol_plegado.png"))
                pg.click("#b-rail"); pg.wait_for_timeout(400)
                # prueba inicial: (a) mensaje al agente 03 y (b) traducir aquí
                pg.keyboard.press("4"); pg.wait_for_timeout(300)
                pg.fill("#pi-idea-t", IDEAS[0])
                pg.click("#pi-a03"); pg.wait_for_timeout(300)
                pg.screenshot(path=str(CAP / f"{w}_{tema}_4_idea_agente03.png"))
                pg.fill("#pi-idea-t", IDEAS[3])
                pg.click("#pi-trad"); pg.wait_for_timeout(400)
                pg.screenshot(path=str(CAP / f"{w}_{tema}_4_idea_traducir.png"))
                pg.evaluate("document.querySelector('#pi-izq').scrollTop=1100"); pg.wait_for_timeout(200)
                pg.screenshot(path=str(CAP / f"{w}_{tema}_4_bloques_color.png"))
                ctx.close()
        # traductor: resultados en texto
        ctx = nav.new_context(viewport={"width": 1440, "height": 900})
        pg = ctx.new_page()
        pg.on("pageerror", lambda e: errores.append(f"[nl] EXC {e}"))
        pg.goto(APP + "#prueba"); pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(600)
        for idea in IDEAS:
            pg.fill("#pi-idea-t", idea)
            pg.click("#pi-trad"); pg.wait_for_timeout(250)
            r = pg.evaluate("""()=>({items:[...document.querySelectorAll('#pi-idea-out .res li')].map(l=>l.innerText.replace(/\\n/g,' ')),
              pseudo:document.querySelector('#pi-codigo').innerText.split('\\n').slice(0,14).join(' | ')})""")
            avisos.append("IDEA: " + idea)
            for it in r["items"]:
                avisos.append("    " + it)
            avisos.append("    PSEUDO: " + r["pseudo"][:400])
        # pegar lo del agente 04 sigue funcionando
        pg.click("#pi-pegar summary"); pg.click("#pi-pegar-ej"); pg.click("#pi-pegar-b"); pg.wait_for_timeout(250)
        avisos.append("PEGAR 04: " + " / ".join(pg.evaluate("[...document.querySelectorAll('#pi-pegar-r li')].map(l=>l.innerText.replace(/\\n/g,' '))")))
        ctx.close()
        nav.close()
    print("ERRORES DE CONSOLA:", len(errores))
    for e in errores[:30]:
        print("  ", e)
    for a in avisos:
        print(a)


if __name__ == "__main__":
    main()
