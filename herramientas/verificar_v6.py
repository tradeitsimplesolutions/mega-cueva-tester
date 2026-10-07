"""Verificación v6 con Playwright (file://): 3 diseños × 1920x1080 y 1440x900, 8 vistas e interacciones.

Uso: python herramientas/verificar_v6.py [--motor] [--solo 1440] [--tema cueva]
Capturas en capturas/v6/. Imprime errores de consola y textos cortados / desbordados.
"""
import pathlib
import sys

from playwright.sync_api import sync_playwright

RAIZ = pathlib.Path(__file__).resolve().parent.parent
APP = (RAIZ / "app" / "index.html").as_uri()
CAP = RAIZ / "capturas" / "v6"
CAP.mkdir(parents=True, exist_ok=True)
VISTAS = ["fases", "resumen", "estrategia", "prueba", "backtest", "operaciones", "validacion", "protocolo"]
TEMAS = ["cueva", "oscuro", "blanco"]

# elementos con texto que se sale de su caja (recorte por overflow o desbordamiento horizontal)
JS_CORTES = """() => {
  const v = document.querySelector('.view.on'); if (!v) return [];
  const out = [];
  v.querySelectorAll('h1,h2,h3,h4,b,span,dt,dd,td,th,p,button,small,label,li').forEach(el => {
    if (!el.offsetParent || el.closest('.tscroll,pre,.cv,svg,select,.chk small,.tab small')) return;
    const cs = getComputedStyle(el);
    if (el.children.length === 0 && el.scrollWidth > el.clientWidth + 2 && (cs.overflow === 'hidden' || cs.textOverflow === 'ellipsis'))
      out.push('cortado: ' + el.tagName + ' «' + el.textContent.trim().slice(0, 40) + '»');
    const p = el.closest('.panel');
    if (p && el.children.length === 0) {
      const r = el.getBoundingClientRect(), q = p.getBoundingClientRect();
      if (r.width > 0 && (r.right > q.right + 2 || r.left < q.left - 2)) out.push('se sale del panel: ' + el.tagName + ' «' + el.textContent.trim().slice(0, 40) + '»');
    }
  });
  if (v.scrollWidth > v.clientWidth + 2) out.push('scroll horizontal en la vista');
  return [...new Set(out)].slice(0, 12);
}"""


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
                pg = ctx.new_page()
                pg.on("console", lambda m, t=f"{w}/{tema}": errores.append(f"[{t}] {m.text}") if m.type == "error" else None)
                pg.on("pageerror", lambda e, t=f"{w}/{tema}": errores.append(f"[{t}] EXC {e}"))
                pg.goto(APP)
                pg.evaluate(f"localStorage.setItem('tis5_theme','{tema}')")
                pg.reload()
                pg.wait_for_timeout(700)
                for i, v in enumerate(VISTAS):
                    pg.keyboard.press(str(i + 1))
                    pg.wait_for_timeout(350)
                    pg.screenshot(path=str(CAP / f"{w}_{tema}_{i + 1}_{v}.png"))
                    for c in pg.evaluate(JS_CORTES):
                        avisos.append(f"[{w}/{tema}/{v}] {c}")
                if tema == temas[0]:
                    # interacciones
                    pg.keyboard.press("3"); pg.wait_for_timeout(200)
                    pg.click("#e-mejor"); pg.wait_for_timeout(300)
                    pg.screenshot(path=str(CAP / f"{w}_{tema}_3_mejor_del_anio.png"))
                    pg.select_option("#e-anio", "2008"); pg.click("#e-peor"); pg.wait_for_timeout(300)
                    pg.screenshot(path=str(CAP / f"{w}_{tema}_3_peor_2008.png"))
                    pg.keyboard.press("6"); pg.wait_for_timeout(200)
                    pg.click("#o-body tr:nth-child(5) .vbtn"); pg.wait_for_timeout(400)
                    pg.screenshot(path=str(CAP / f"{w}_{tema}_6_ver_en_velas.png"))
                    pg.keyboard.press("Escape")
                    pg.keyboard.press("5"); pg.wait_for_timeout(200)
                    pg.evaluate("document.querySelector('#v-backtest').scrollTop=99999"); pg.wait_for_timeout(200)
                    ctx.grant_permissions(["clipboard-read", "clipboard-write"])
                    pg.click("#b-copiar"); pg.wait_for_timeout(250)
                    toast = pg.inner_text("#toast")
                    avisos.append(f"[{w}/{tema}] copiar código → «{toast}»")
                    pg.screenshot(path=str(CAP / f"{w}_{tema}_5_codigo.png"))
                    pg.keyboard.press("4"); pg.wait_for_timeout(200)
                    pg.select_option("#f-corte-t", "auto"); pg.wait_for_timeout(150)
                    avisos.append(f"[{w}/{tema}] corte auto → «{pg.inner_text('#f-corte-auto')}»")
                    pg.evaluate("document.querySelector('#f-corte-t').scrollIntoView()")
                    pg.screenshot(path=str(CAP / f"{w}_{tema}_4_corte_auto.png"))
                ctx.close()
        if "--motor" in args:
            ctx = nav.new_context(viewport={"width": 1440, "height": 900})
            pg = ctx.new_page()
            pg.on("pageerror", lambda e: errores.append(f"[motor] EXC {e}"))
            pg.goto(APP + "#prueba")
            pg.evaluate("localStorage.clear();sessionStorage.clear()")
            pg.reload(); pg.wait_for_timeout(500)
            pg.click("#pi-demo")
            pg.click("#pi-correr")
            pg.wait_for_function("sessionStorage.getItem('mct_res')!==null || /No se pudo/.test(document.querySelector('#pi-nota-motor')?.textContent||'')", timeout=180000)
            pg.wait_for_timeout(2500)
            r = pg.evaluate("(()=>{const j=JSON.parse(sessionStorage.getItem('mct_res')||'null');return j?{n:j.trades.length,pf:j.f1.OOS.pf,fases:j.fases}:document.querySelector('#pi-nota-motor').textContent})()")
            avisos.append(f"[motor] resultado: {r}")
            pg.screenshot(path=str(CAP / "1440_motor_resultado.png"))
            for i, v in enumerate(VISTAS):
                pg.keyboard.press(str(i + 1)); pg.wait_for_timeout(300)
                pg.screenshot(path=str(CAP / f"1440_motor_{i + 1}_{v}.png"))
            ctx.close()
            # ejemplo NAS100 de la Mega Cueva (sesión intradía + pasos): esperado 224 op. (150 IS / 74 OOS), 0/5 fases
            cap7 = RAIZ / "capturas" / "v7"; cap7.mkdir(parents=True, exist_ok=True)
            ctx = nav.new_context(viewport={"width": 1440, "height": 900})
            pg = ctx.new_page()
            pg.on("console", lambda m: errores.append(f"[nas] {m.text}") if m.type == "error" else None)
            pg.on("pageerror", lambda e: errores.append(f"[nas] EXC {e}"))
            pg.goto(APP + "#prueba")
            pg.evaluate("localStorage.clear();sessionStorage.clear()")
            pg.reload(); pg.wait_for_timeout(500)
            pg.click("#pi-nas")
            pg.wait_for_function("document.querySelector('#pi-csv-n').textContent.includes('NAS100')", timeout=30000)
            pg.wait_for_timeout(300)
            pg.screenshot(path=str(cap7 / "nas_v_formulario.png"))
            pg.click("#pi-correr")
            pg.wait_for_function("sessionStorage.getItem('mct_res')!==null || /No se pudo/.test(document.querySelector('#pi-nota-motor')?.textContent||'')", timeout=300000)
            pg.wait_for_timeout(2500)
            r = pg.evaluate("(()=>{const j=JSON.parse(sessionStorage.getItem('mct_res')||'null');return j?{n:j.trades.length,is:j.f1.IS.n,oos:j.f1.OOS.n,pf_is:+j.f1.IS.pf.toFixed(2),pf_oos:+j.f1.OOS.pf.toFixed(2),fases:Object.values(j.fases).filter(Boolean).length}:document.querySelector('#pi-nota-motor').textContent})()")
            avisos.append(f"[nas100] resultado: {r}")
            if not (isinstance(r, dict) and r["n"] == 224 and r["is"] == 150 and r["oos"] == 74):
                errores.append(f"[nas100] esperaba 224 operaciones (150/74): {r}")
            pg.screenshot(path=str(cap7 / "nas_v_resultado.png"))
            for i, v in enumerate(VISTAS):
                pg.keyboard.press(str(i + 1)); pg.wait_for_timeout(300)
                if v in ("resumen", "estrategia", "operaciones", "validacion"):
                    pg.screenshot(path=str(cap7 / f"nas_v_{i + 1}_{v}.png"))
                for c in pg.evaluate(JS_CORTES):
                    avisos.append(f"[nas100/{v}] {c}")
            ctx.close()
        nav.close()
    print("ERRORES DE CONSOLA:", len(errores))
    for e in errores[:30]:
        print("  ", e)
    print("AVISOS:", len(avisos))
    for a in avisos:
        print("  ", a)


if __name__ == "__main__":
    main()
