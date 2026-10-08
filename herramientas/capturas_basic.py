"""Capturas y comprobaciones de la vista BASIC (Playwright, file://).

Uso: python herramientas/capturas_basic.py [--sin-motor]
Flujo: frase del RSI(2) del Nasdaq → Traducir aquí → Nasdaq diario → Correr → veredicto.
Corre el motor una vez (1440×900, CUEVA) y reutiliza el resultado en las demás medidas.
Comprueba además que AVANZADO no se ve y que ?avanzado sí lo abre. Capturas en capturas/basic/.
"""
import pathlib
import io
import sys

from playwright.sync_api import sync_playwright

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

RAIZ = pathlib.Path(__file__).resolve().parent.parent
APP = (RAIZ / "app" / "index.html").as_uri()
CAP = RAIZ / "capturas" / "basic"
CAP.mkdir(parents=True, exist_ok=True)
FRASE = ("Comprar el nasdaq cuando el RSI de 2 baje de 15, solo si el precio está sobre la media de 200, "
         "y salir tras 2 velas verdes seguidas")

# texto que se sale de su caja dentro de BASIC
JS_CORTES = """() => {
  const b = document.querySelector('#basic'), out = [];
  b.querySelectorAll('h1,h2,b,span,p,button,small,li,dd,dt,strong,label').forEach(el => {
    if (!el.offsetParent || el.closest('pre')) return;
    const cs = getComputedStyle(el);
    if (el.children.length === 0 && el.scrollWidth > el.clientWidth + 2 && (cs.overflow === 'hidden' || cs.textOverflow === 'ellipsis'))
      out.push('cortado: ' + el.tagName + ' «' + el.textContent.trim().slice(0, 40) + '»');
    const p = el.closest('.panel');
    if (p && el.children.length === 0) { const r = el.getBoundingClientRect(), q = p.getBoundingClientRect();
      if (r.width > 0 && (r.right > q.right + 2 || r.left < q.left - 2)) out.push('se sale del panel: ' + el.tagName + ' «' + el.textContent.trim().slice(0, 40) + '»'); }
  });
  if (document.documentElement.scrollWidth > window.innerWidth + 1) out.push('scroll horizontal en la página');
  return [...new Set(out)].slice(0, 12);
}"""

# ¿hay algo visible que diga AVANZADO?
JS_AVZ_VISIBLE = """() => [...document.querySelectorAll('button,a,span,b')].filter(e => e.offsetParent && /avanzado/i.test(e.textContent) && e.children.length === 0).map(e => e.textContent.trim())"""


def nuevo(nav, w, h, tema, errores, etiqueta):
    ctx = nav.new_context(viewport={"width": w, "height": h}, device_scale_factor=1)
    pg = ctx.new_page()
    pg.on("console", lambda m: errores.append(f"[{etiqueta}] {m.text}") if m.type == "error" and "deepseek" not in m.text.lower() and "127.0.0.1" not in m.text else None)
    pg.on("pageerror", lambda e: errores.append(f"[{etiqueta}] EXC {e}"))
    pg.goto(APP)
    pg.evaluate(f"localStorage.clear();sessionStorage.clear();localStorage.setItem('tis5_theme','{tema}')")
    pg.reload()
    pg.wait_for_timeout(600)
    return ctx, pg


def main():
    sin_motor = "--sin-motor" in sys.argv
    errores, avisos = [], []
    with sync_playwright() as p:
        nav = p.chromium.launch()

        # 1 · flujo completo con motor en 1440×900 CUEVA
        ctx, pg = nuevo(nav, 1440, 900, "cueva", errores, "1440/cueva")
        avisos.append(f"[inicio] nivel: body.basic={pg.evaluate('document.body.classList.contains(\"basic\")')} · hash={pg.evaluate('location.hash')}")
        vis = pg.evaluate(JS_AVZ_VISIBLE)
        if vis:
            errores.append(f"[avanzado] se ve en BASIC: {vis}")
        pg.screenshot(path=str(CAP / "1440_cueva_0_vacio.png"), full_page=True)
        pg.fill("#bx-idea", FRASE)
        pg.click("#bx-trad"); pg.wait_for_timeout(400)
        pg.screenshot(path=str(CAP / "1440_cueva_1_traducida.png"), full_page=True)
        avisos.append("[traducir] " + pg.inner_text("#bx-out").replace("\n", " | ")[:400])
        pg.click("[data-ej=ndx]")
        pg.wait_for_function("document.querySelector('#bx-dat').textContent.includes('Nasdaq')", timeout=30000)
        pg.wait_for_timeout(300)
        avisos.append(f"[datos] sello «{pg.inner_text('#bx-sello')}» · nota «{pg.inner_text('#bx-nota')}»")
        pg.screenshot(path=str(CAP / "1440_cueva_2_datos.png"), full_page=True)
        estado = None
        if not sin_motor:
            pg.click("#bx-correr")
            pg.wait_for_timeout(1500)
            pg.screenshot(path=str(CAP / "1440_cueva_3_corriendo.png"), full_page=True)
            pg.wait_for_function("sessionStorage.getItem('mct_res')!==null || /No se pudo/.test(document.querySelector('#bx-nota')?.textContent||'')", timeout=300000)
            pg.wait_for_timeout(3000)
            r = pg.evaluate("(()=>{const j=JSON.parse(sessionStorage.getItem('mct_res')||'null');return j?{n:j.trades.length,oos:j.f1.OOS.n,pf_oos:+j.f1.OOS.pf.toFixed(2)}:document.querySelector('#bx-nota').textContent})()")
            avisos.append(f"[motor] {r} · tras recargar: basic={pg.evaluate('document.body.classList.contains(\"basic\")')}")
            pg.screenshot(path=str(CAP / "1440_cueva_4_veredicto.png"), full_page=True)
            avisos.append("[veredicto] " + pg.inner_text("#bx-res").replace("\n", " | ")[:500])
            for c in pg.evaluate(JS_CORTES):
                avisos.append(f"[1440/cueva] {c}")
            estado = pg.evaluate("({s:JSON.stringify(Object.assign({},sessionStorage)),l:JSON.stringify(Object.assign({},localStorage))})")
            # «Ver el análisis completo →» lleva a COMPLETO
            pg.click("#bx-completo"); pg.wait_for_timeout(500)
            avisos.append(f"[completo] basic={pg.evaluate('document.body.classList.contains(\"basic\")')} · vista={pg.evaluate('location.hash')}")
            pg.screenshot(path=str(CAP / "1440_cueva_5_completo.png"))
            vis = pg.evaluate(JS_AVZ_VISIBLE)
            if vis:
                errores.append(f"[avanzado] se ve en COMPLETO: {vis}")
            pg.keyboard.press("n"); pg.wait_for_timeout(300)
            avisos.append(f"[tecla N] basic={pg.evaluate('document.body.classList.contains(\"basic\")')}")
        ctx.close()

        # 2 · el resto de medidas y temas, con el mismo resultado ya calculado
        for (w, h, tema) in [(1920, 1080, "cueva"), (1440, 900, "blanco"), (390, 844, "cueva"), (1920, 1080, "oscuro")]:
            et = f"{w}/{tema}"
            ctx, pg = nuevo(nav, w, h, tema, errores, et)
            pg.screenshot(path=str(CAP / f"{w}_{tema}_0_vacio.png"), full_page=True)
            if estado:
                pg.evaluate("e=>{const s=JSON.parse(e.s),l=JSON.parse(e.l);Object.entries(s).forEach(([k,v])=>sessionStorage.setItem(k,v));Object.entries(l).forEach(([k,v])=>{if(k!=='tis5_theme')localStorage.setItem(k,v)})}", estado)
                pg.goto(APP + "#basic"); pg.reload(); pg.wait_for_timeout(900)
                pg.click("[data-ej=ndx]")
                pg.wait_for_function("document.querySelector('#bx-dat').textContent.includes('Nasdaq')", timeout=30000)
                pg.wait_for_timeout(400)
                pg.screenshot(path=str(CAP / f"{w}_{tema}_4_veredicto.png"), full_page=True)
                if w < 760:
                    avisos.append(f"[móvil] aviso visible={pg.is_visible('#bx-movil')} · botón visible={pg.is_visible('#bx-correr')}")
            for c in pg.evaluate(JS_CORTES):
                avisos.append(f"[{et}] {c}")
            ctx.close()

        # 3 · AVANZADO oculto: ?avanzado y Mayús+A lo abren
        ctx, pg = nuevo(nav, 1440, 900, "cueva", errores, "avanzado")
        pg.goto(APP + "?avanzado"); pg.wait_for_timeout(1200)
        avisos.append(f"[?avanzado] body.avz={pg.evaluate('document.body.classList.contains(\"avz\")')} · iframe={pg.evaluate('document.querySelector(\"#avz iframe\").getAttribute(\"src\")')}")
        pg.screenshot(path=str(CAP / "1440_avanzado_url.png"))
        pg.goto(APP); pg.reload(); pg.wait_for_timeout(600)
        pg.keyboard.press("Shift+A"); pg.wait_for_timeout(600)
        avisos.append(f"[Mayús+A] body.avz={pg.evaluate('document.body.classList.contains(\"avz\")')}")
        pg.keyboard.press("Shift+A"); pg.wait_for_timeout(300)
        avisos.append(f"[Mayús+A otra vez] body.avz={pg.evaluate('document.body.classList.contains(\"avz\")')}")
        ctx.close()
        nav.close()
    print("ERRORES:", len(errores))
    for e in errores[:30]:
        print("  ", e)
    print("AVISOS:", len(avisos))
    for a in avisos:
        print("  ", a)


if __name__ == "__main__":
    main()
