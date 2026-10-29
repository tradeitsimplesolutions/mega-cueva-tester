"""Batería fija de pruebas: se pasa ANTES DE CADA PUSH (el hook pre-push la lanza solo).

    python herramientas/bateria.py              # todo, con el motor (≈1-2 min)
    python herramientas/bateria.py --rapida     # sin correr el motor: estático, abrir, capas, móvil
    python herramientas/bateria.py --fijar      # tras un cambio QUERIDO de números: guarda los nuevos de referencia
    python herramientas/bateria.py --instalar-hook   # instala .git/hooks/pre-push (lanza la batería antes de cada push)

A · estático: sintaxis de los JS, montaje al día, el laboratorio cifrado abre con la clave y no se filtra en claro.
B · laboratorio con el motor: AED → Misión 2 (RSI(2) de Connors) → bloques → backtest → examen → TU UNIDAD,
    con sus números comparados con herramientas/bateria_referencia.json (todo es determinista: semilla fija).
C · capas: premium/original × básico sí/no en todas las fases; móvil 390 px; recargar no pierde lo hecho.
D · Cueva Tester pública: abre sin errores y corre una regla en BASIC.
Sale con código 1 si algo falla. Capturas en capturas/bateria/.
"""
import base64
import functools
import http.server
import io
import json
import re
import shutil
import subprocess
import sys
import threading
import time
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

RAIZ = Path(__file__).resolve().parent.parent
CAP = RAIZ / "capturas" / "bateria"
REF = RAIZ / "herramientas" / "bateria_referencia.json"
CLAVE_F = RAIZ / "herramientas" / "clave_reto.txt"
FASES = ["aed", "hip", "reg", "bt", "unidad"]
FRASE_BASIC = ("Comprar el nasdaq cuando el RSI de 2 baje de 15, solo si el precio está sobre la media de 200, "
               "y salir tras 2 velas verdes seguidas")
# ruido conocido que no es un fallo: la IA remota no acepta 127.0.0.1 y, sin red, las fuentes de Google
RUIDO = ("workers.dev", "net::ERR_FAILED", "fonts.googleapis", "fonts.gstatic", "127.0.0.1:8080")

resultados = []   # (bloque, nombre, ok, detalle)
medidos = {}      # números para comparar con la referencia


def ok(bloque, nombre, cond, detalle=""):
    resultados.append((bloque, nombre, bool(cond), detalle))
    print(f"  {'OK   ' if cond else 'FALLO'} [{bloque}] {nombre}" + (f" · {detalle}" if detalle else ""), flush=True)
    return cond


# ---------------------------------------------------------------- A · estático
def estatico():
    print("\nA · ESTÁTICO")
    node = shutil.which("node")
    js = [RAIZ / "app" / "motor_puente.js", *sorted((RAIZ / "src" / "v6").glob("*.js")),
          *sorted((RAIZ / "src" / "extra").glob("*.js")), *sorted((RAIZ / "src" / "lab").glob("*.js"))]
    for f in js:
        if not node:
            ok("A", f"sintaxis {f.name}", False, "no está node en el PATH")
            break
        r = subprocess.run([node, "--check", str(f)], capture_output=True, text=True, encoding="utf-8", errors="replace")
        ok("A", f"sintaxis {f.relative_to(RAIZ).as_posix()}", r.returncode == 0, r.stderr.strip().splitlines()[0] if r.returncode else "")

    # montaje al día: si una fuente es más nueva que lo montado, el navegador probaría una versión vieja
    def nuevo(fs):
        fs = [f for f in fs if f.exists()]
        return max(fs, key=lambda f: f.stat().st_mtime) if fs else None
    m_puente = RAIZ / "app" / "motor_puente.js"
    f = nuevo([RAIZ / "motor" / "motor_tester.py", RAIZ / "motor" / "puente_plantilla.js"])
    ok("A", "motor_puente.js al día con motor_tester.py", f.stat().st_mtime <= m_puente.stat().st_mtime + 1,
       "" if f.stat().st_mtime <= m_puente.stat().st_mtime + 1 else f"{f.name} es más nuevo → python motor/construir_puente.py")
    fuentes = [*(RAIZ / "src").rglob("*.*"), m_puente, RAIZ / "herramientas" / "montar_v6.py"]
    for salida in (RAIZ / "app" / "index.html", RAIZ / "reto" / "index.html"):
        f = nuevo([x for x in fuentes if x.suffix in (".js", ".css", ".html", ".py")])
        bien = f.stat().st_mtime <= salida.stat().st_mtime + 1
        ok("A", f"{salida.relative_to(RAIZ).as_posix()} montado con lo último", bien,
           "" if bien else f"{f.relative_to(RAIZ).as_posix()} es más nuevo → python herramientas/montar_v6.py")

    # el laboratorio: descifra con la clave, y nada suyo aparece en claro en lo público
    claro = None
    if not ok("A", "existe herramientas/clave_reto.txt", CLAVE_F.exists()):
        return None
    try:
        from cryptography.hazmat.primitives import hashes
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
        from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
        html = (RAIZ / "reto" / "index.html").read_text(encoding="utf-8")
        d = json.loads(re.search(r'\{"s":.*?"c":\s*"[^"]+"\}', html).group(0))
        b = base64.b64decode
        clave = "".join(CLAVE_F.read_text(encoding="utf-8").split()).upper()
        k = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=b(d["s"]), iterations=d["it"]).derive(clave.encode())
        claro = AESGCM(k).decrypt(b(d["i"]), b(d["c"]), None).decode("utf-8")
        ok("A", "reto/index.html descifra con la clave y es el laboratorio", "window.MCT_LAB=true" in claro)
    except Exception as e:  # noqa: BLE001
        ok("A", "reto/index.html descifra con la clave", False, str(e)[:120])
    # huellas del laboratorio que nunca deben verse en claro en lo que va a GitHub
    huellas = ["LABORATORIO RETO CUEVA · aplicación", "window.MCT_LAB=true", "MCT_LAB_PLANTILLA="]
    r = subprocess.run(["git", "ls-files"], cwd=RAIZ, capture_output=True, text=True, encoding="utf-8")
    fugas = []
    for rel in r.stdout.splitlines():
        p = RAIZ / rel
        if p.suffix not in (".html", ".js", ".css", ".json", ".md", ".txt") or p == Path(__file__) or not p.exists():
            continue
        t = p.read_text(encoding="utf-8", errors="replace")
        fugas += [f"{rel}: «{h}»" for h in huellas if h in t]
    ok("A", "nada del laboratorio en claro en los ficheros públicos", not fugas, "; ".join(fugas[:3]))
    ok("A", "src/lab/ y la clave fuera de git", not any(x.startswith(("src/lab/", "herramientas/clave_reto")) for x in r.stdout.splitlines()))

    # la prueba antigua del motor contra Sentinel: informativa (su referencia es de datos más viejos)
    t = RAIZ / "motor" / "test_motor.py"
    if t.exists() and Path(r"c:/Users/trade/sentinel").exists():
        r = subprocess.run([sys.executable, str(t)], cwd=t.parent, capture_output=True, text=True, encoding="utf-8",
                           errors="replace", env={**__import__("os").environ, "PYTHONIOENCODING": "utf-8"})
        ult = [x for x in r.stdout.splitlines() if "FALLO(S)" in x or "TODO OK" in x.upper()]
        print(f"  info  [A] motor/test_motor.py contra Sentinel (no bloquea): {(ult[-1] if ult else 'sin resumen')[:90]}")
    return claro


# ---------------------------------------------------------------- navegador
class Callado(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


class Servidor:
    """http.server en un hilo: el laboratorio necesita http (crypto.subtle no va en file://)."""
    def __enter__(self):
        h = functools.partial(Callado, directory=str(RAIZ))
        self.s = http.server.ThreadingHTTPServer(("127.0.0.1", 0), h)
        threading.Thread(target=self.s.serve_forever, daemon=True).start()
        self.url = f"http://127.0.0.1:{self.s.server_address[1]}"
        return self

    def __exit__(self, *a):
        self.s.shutdown()


def pagina(nav, w, h, errores, etiqueta, estado=None, movil=False):
    ctx = nav.new_context(viewport={"width": w, "height": h}, is_mobile=movil, has_touch=movil, device_scale_factor=1)
    if estado is not None:   # localStorage de partida (modos, misiones hechas) antes de que cargue nada
        ctx.add_init_script("(e=>{if(sessionStorage.getItem('__bat'))return;sessionStorage.setItem('__bat','1');"
                            "localStorage.clear();Object.entries(e).forEach(([k,v])=>localStorage.setItem(k,v))})("
                            + json.dumps(estado) + ")")
    pg = ctx.new_page()
    pg.on("console", lambda m: errores.append(f"[{etiqueta}] consola: {m.text[:220]}")
          if m.type == "error" and not any(r in m.text for r in RUIDO) else None)
    pg.on("pageerror", lambda e: errores.append(f"[{etiqueta}] EXCEPCIÓN: {str(e)[:220]}"))
    pg.on("dialog", lambda d: d.accept())
    return ctx, pg


def entrar_lab(pg, url):
    pg.goto(url + "/reto/index.html")
    pg.fill("#k", CLAVE_F.read_text(encoding="utf-8").strip())
    pg.click("#b")
    pg.wait_for_selector("#lab-fases .lab-fase", timeout=60000)
    pg.wait_for_timeout(600)


def cerrar_fiestas(pg, vistas=None):
    """El modo básico celebra cada misión con una ventana («¡Seguimos!»): se cierra como lo haría el alumno."""
    for _ in range(6):
        if not pg.is_visible("#mb-fiesta"):
            return
        if vistas is not None:
            vistas.append(pg.inner_text("#mb-fiesta-t"))
        pg.click("#mb-fiesta button")
        pg.wait_for_timeout(350)


def ir(pg, fase):
    cerrar_fiestas(pg)
    sel = "[data-unidad]" if fase == "unidad" else f"#lab-fases [data-fase={fase}]"
    pg.click(sel)
    pg.wait_for_timeout(450)


JS_DESBORDA = """() => {const o=[];const de=document.documentElement;if(de.scrollWidth>innerWidth+1)o.push('página '+(de.scrollWidth-innerWidth)+'px');
  const m=document.querySelector('.lab-main');if(m&&m.scrollWidth>m.clientWidth+2)o.push('panel '+(m.scrollWidth-m.clientWidth)+'px');return o}"""
JS_SOLAPE = """() => {const a=document.querySelector('#tp-toggle'),b=document.querySelector('#mb-toggle');if(!a||!b)return 'falta '+(!a?'#tp-toggle':'#mb-toggle');
  const r=a.getBoundingClientRect(),s=b.getBoundingClientRect();if(!r.width||!s.width)return '';
  return (r.left<s.right-1&&s.left<r.right-1&&r.top<s.bottom-1&&s.top<r.bottom-1)?'se tapan':''}"""


def texto(pg, sel):
    return pg.inner_text(sel).replace("\u00a0", " ")


def num(s):
    return float(s.replace("−", "-").replace(".", "").replace(",", ".")) if s is not None else None


# ---------------------------------------------------------------- B · laboratorio con el motor
def laboratorio(nav, url, errores):
    print("\nB · LABORATORIO CON EL MOTOR (Oro diario · RSI(2) de Connors)")
    ctx, pg = pagina(nav, 1440, 900, errores, "lab 1440", estado={})
    pg.goto(url + "/reto/index.html")
    pg.fill("#k", "CLAVE-QUE-NO-ES")
    pg.click("#b")
    pg.wait_for_timeout(2500)
    ok("B", "puerta: una clave mala no abre", pg.query_selector("#lab-fases") is None and pg.is_visible("#k"))
    entrar_lab(pg, url)
    ok("B", "puerta: la clave buena abre el laboratorio", pg.evaluate("document.body.classList.contains('lab')"))
    bloqueadas = [f for f in ("hip", "reg", "bt") if (ir(pg, f), "IR A LA FASE 01" in texto(pg, f"#lab-v-{f}"))[1]]
    ok("B", "sin AED, las fases 02-04 piden hacer antes el AED", len(bloqueadas) == 3, ",".join(bloqueadas))

    # Misión 1 · AED
    ir(pg, "aed")
    t = time.time()
    pg.click("#m1-analizar")
    pg.wait_for_function("!document.querySelector('#mision1').classList.contains('analizando') && "
                         "/ANALIZAR ESTE/.test(document.querySelector('#m1-analizar').textContent)", timeout=420000)
    if not ok("B", "Misión 1: el motor analiza el oro", pg.is_visible("#m1-res"), f"{time.time() - t:.0f} s · {texto(pg, '#m1-nota')[:80]}"):
        pg.screenshot(path=str(CAP / "B_fallo_aed.png"), full_page=True)
        ctx.close()
        return None
    h = pg.evaluate("(()=>{const f=JSON.parse(localStorage.getItem('mct_ficha')||'null');const h=f&&f.perfil&&f.perfil.hallazgos;"
                    "if(!h)return null;const c={};h.lista.forEach(x=>c[x.semaforo]=(c[x.semaforo]||0)+1);"
                    "return {pruebas:h.n_pruebas,clara:c['CLARA']||0,insinua:c['SE INSINÚA']||0,nada:c['NADA']||0,"
                    "diseno:f.perfil.particion.diseno.velas,examen:f.perfil.particion.examen.velas,validacion:f.perfil.particion.validacion.velas}})()")
    ok("B", "Misión 1: la ficha se guarda con sus hallazgos", h is not None)
    if h:
        medidos.update({f"aed_{k}": v for k, v in h.items()})
    pg.screenshot(path=str(CAP / "B1_aed.png"), full_page=True)

    # Misión 2 · documentada
    ir(pg, "hip")
    pg.click("[data-m2-camino=B]")
    pg.select_option("[data-m2-doc]", label="RSI(2) de Connors")
    pg.wait_for_timeout(400)
    pg.click("[data-m2-sub=pseudo]")
    pg.wait_for_timeout(400)
    obj = re.search(r"OBJETIVIDAD\s*(\d)\s*/\s*6", pg.evaluate("[...document.querySelectorAll('[data-m2-sub=pseudo]')].map(e=>e.textContent).join(' ')"))
    medidos["m2_objetividad"] = int(obj.group(1)) if obj else None
    pseudo = pg.evaluate("(document.querySelector('#m2-pseudo')||{}).innerText||''")
    ok("B", "Misión 2: la documentada da su pseudocódigo", "RSI de 2 por debajo de 10" in pseudo and "COMPRO" in pseudo)
    pg.screenshot(path=str(CAP / "B2_mision2.png"), full_page=True)

    # Misión 3 · bloques y vista previa del diseño
    ir(pg, "reg")
    pg.click("[data-m3-m2]")
    pg.wait_for_function("/ops/.test(document.querySelector('#m3-prev').innerText)", timeout=120000)
    pv = texto(pg, "#m3-prev")
    m = re.search(r"PF\s*([\d,]+)\s*\|?\s*(\d+)\s*ops", pv.replace("\n", " | "))
    ok("B", "Misión 3: montar en bloques da la curva del diseño", m is not None, pv[:80].replace("\n", " "))
    pg.screenshot(path=str(CAP / "B3_reglas.png"), full_page=True)

    # Fase 04 · backtest
    pg.click("[data-m3-ir-bt]")
    pg.wait_for_timeout(300)
    pg.click("[data-m3-correr]")
    pg.wait_for_function("/\\d\\s*\\/\\s*4\\s*·/.test(document.querySelector('#lab-v-bt').innerText)", timeout=300000)
    bt = texto(pg, "#lab-v-bt")
    lin = [x.strip() for x in bt.splitlines() if x.strip()]

    def tras(pregunta, patron):
        for i, x in enumerate(lin):
            if pregunta in x and i + 1 < len(lin):
                mm = re.search(patron, lin[i + 1])
                return mm.group(1) if mm else None
    v = re.search(r"(\d)\s*/\s*4\s*·\s*(NO PASA|PASA)", bt)
    medidos.update(bt_veredicto=f"{v.group(1)}/4 {v.group(2)}" if v else None,
                   bt_pf=num(tras("¿Gana más de lo que pierde?", r"PF\s*([\d,]+)")),
                   bt_ops=int(tras("¿Hay operaciones suficientes?", r"(\d+)") or 0),
                   bt_caida=num(tras("¿Se aguanta la peor racha?", r"([−-]?[\d,]+)\s*%")),
                   bt_pf_sin_mejor=num(tras("¿Gana sin su mejor operación?", r"PF\s*([\d,]+)")))
    ok("B", "Fase 04: el backtest da veredicto X/4 y las 4 cifras", v and None not in (medidos["bt_pf"], medidos["bt_caida"], medidos["bt_pf_sin_mejor"]))
    ok("B", "Fase 04: la curva del diseño se pinta", pg.evaluate("!!document.querySelector('#lab-v-bt svg, #lab-v-bt canvas')"))
    ok("B", "Fase 04: el examen y la validación siguen cerrados", "🔒 VER EL EXAMEN" in bt and "🔒 VER LA VALIDACIÓN" in bt)
    pg.screenshot(path=str(CAP / "B4_backtest.png"), full_page=True)

    # el examen: casillas obligatorias → se abre
    pg.click("[data-m3-pedir=examen]")
    pg.wait_for_selector("[data-m3-abrir=examen]")
    ok("B", "Examen: el botón no se habilita sin las casillas", pg.is_disabled("[data-m3-abrir=examen]"))
    for k in pg.eval_on_selector_all("[data-m3-conf]", "es=>es.map(e=>e.dataset.m3Conf)"):
        pg.check(f"[data-m3-conf={k}]")   # cada casilla repinta la caja: se busca de nuevo
    pg.click("[data-m3-abrir=examen]")
    pg.wait_for_timeout(2500)
    pg.wait_for_function("/\\d\\s*\\/\\s*4\\s*·/.test(document.querySelector('#lab-v-bt').innerText)", timeout=300000)
    bt2 = texto(pg, "#lab-v-bt")
    tr = re.search(r"EXAMEN\s+[\d-]+\s*→\s*[\d-]+\s+(\d+)\s+([\d,]+)", bt2.replace("\t", " "))
    medidos.update(oos_ops=int(tr.group(1)) if tr else None, oos_pf=num(tr.group(2)) if tr else None)
    ok("B", "Examen: abierto, con su fila en la tabla por tramos", tr is not None and "🔒 VER EL EXAMEN" not in bt2)
    pg.screenshot(path=str(CAP / "B5_examen.png"), full_page=True)

    # TU UNIDAD
    ir(pg, "unidad")
    ok("B", "TU UNIDAD: 4 pasos, frase y firma", pg.evaluate("document.querySelectorAll('[data-un-paso]').length>=4 && !!document.querySelector('#un-cv') && !!document.querySelector('#un-frase')"))
    for i in range(4):   # en cada paso, la primera opción de cada pregunta (la casilla va oculta tras su etiqueta)
        pg.click(f"#un-tab-{i}")
        pg.wait_for_timeout(250)
        for rid in pg.evaluate("[...new Set([...document.querySelectorAll('#lab-v-unidad input.un-rad')].filter(r=>r.nextElementSibling&&"
                               "r.nextElementSibling.offsetParent).map(r=>r.name))].map(n=>document.querySelector('input[name=\"'+n+'\"]').id)"):
            pg.click(f"label[for={rid}]")
            pg.wait_for_timeout(120)
    pg.wait_for_timeout(400)
    ok("B", "TU UNIDAD: responder guarda las respuestas", pg.evaluate("!!localStorage.getItem('lab_unidad')"))
    pg.screenshot(path=str(CAP / "B6_unidad.png"), full_page=True)

    estado = pg.evaluate("Object.assign({},localStorage)")
    ctx.close()

    # recargar no pierde lo hecho
    ctx, pg = pagina(nav, 1440, 900, errores, "lab recarga", estado=estado)
    entrar_lab(pg, url)
    ir(pg, "hip")
    ok("B", "Recargar: la Misión 2 sigue ahí", "RSI(2) de Connors" in pg.evaluate(
        "[...document.querySelectorAll('[data-m2-doc] option:checked')].map(o=>o.textContent).join()") or
        "OBJETIVIDAD 6" in texto(pg, "#lab-v-hip").replace("\n", " "))
    ir(pg, "bt")
    ok("B", "Recargar: la regla de la Misión 3 sigue ahí", "RSI de 2 menor que 10" in texto(pg, "#lab-v-bt"))
    ctx.close()
    return estado


# ---------------------------------------------------------------- C · capas y tamaños
def capas(nav, url, errores, estado):
    print("\nC · CAPAS (premium / original × básico) Y MÓVIL")
    base = {k: v for k, v in (estado or {}).items() if k not in ("tis_premium", "mb_on")}
    combos = [("premium", "1", "0"), ("original", "0", "0"), ("premium+básico", "1", "1"), ("original+básico", "0", "1")]
    for nombre, prem, bas in combos:
        et = f"lab {nombre}"
        n0 = len(errores)
        ctx, pg = pagina(nav, 1440, 900, errores, et, estado={**base, "tis_premium": prem, "mb_on": bas})
        entrar_lab(pg, url)
        fiestas = []
        cerrar_fiestas(pg, fiestas)
        if fiestas:
            print(f"  info  [C] {nombre}: celebraciones al entrar → {', '.join(fiestas)}")
        clases = pg.evaluate("document.body.className")
        ok("C", f"{nombre}: el modo se aplica", ("tema-premium" in clases) == (prem == "1") and ("modo-basico" in clases) == (bas == "1"), clases)
        desb = []
        for f in FASES:
            ir(pg, f)
            desb += [f"{f}: {d}" for d in pg.evaluate(JS_DESBORDA)]
            pg.screenshot(path=str(CAP / f"C_{nombre.replace('+', '_').replace('á', 'a')}_{f}.png"))
        ok("C", f"{nombre}: las 5 vistas sin scroll horizontal", not desb, "; ".join(desb[:3]))
        # el conmutador cambia de verdad y se puede volver
        pg.click("#tp-toggle")
        pg.wait_for_timeout(200)
        cambia = pg.evaluate("document.body.classList.contains('tema-premium')") != (prem == "1")
        pg.click("#tp-toggle")
        ok("C", f"{nombre}: el conmutador premium va y vuelve", cambia and pg.evaluate("document.body.classList.contains('tema-premium')") == (prem == "1"))
        ok("C", f"{nombre}: sin errores en la consola", len(errores) == n0, errores[n0] if len(errores) > n0 else "")
        ctx.close()

    # móvil: lo que más se rompe con capas superpuestas
    for nombre, bas in (("móvil premium", "0"), ("móvil premium+básico", "1")):
        n0 = len(errores)
        ctx, pg = pagina(nav, 390, 844, errores, nombre, estado={**base, "tis_premium": "1", "mb_on": bas}, movil=True)
        entrar_lab(pg, url)
        desb, solapes = [], []
        for f in FASES:
            cerrar_fiestas(pg)
            pg.evaluate("(s=>{const b=document.querySelector(s);if(b)b.click()})('" +
                        ("[data-unidad]" if f == "unidad" else f"#lab-fases [data-fase={f}]") + "')")
            pg.wait_for_timeout(450)
            desb += [f"{f}: {d}" for d in pg.evaluate(JS_DESBORDA)]
            s = pg.evaluate(JS_SOLAPE)
            if s:
                solapes.append(f"{f}: {s}")
            pg.screenshot(path=str(CAP / f"C_{nombre.replace(' ', '_').replace('+', '_').replace('á', 'a').replace('ó', 'o')}_{f}.png"))
        ok("C", f"{nombre}: sin scroll horizontal", not desb, "; ".join(desb[:3]))
        ok("C", f"{nombre}: los conmutadores no se tapan", not solapes, "; ".join(solapes[:3]))
        ok("C", f"{nombre}: sin errores en la consola", len(errores) == n0, errores[n0] if len(errores) > n0 else "")
        ctx.close()


# ---------------------------------------------------------------- D · Cueva Tester pública
def publica(nav, url, errores, con_motor):
    print("\nD · CUEVA TESTER PÚBLICA")
    n0 = len(errores)
    ctx, pg = pagina(nav, 1440, 900, errores, "pública", estado={})
    pg.goto(url + "/app/index.html#basic")
    pg.wait_for_timeout(1200)
    ok("D", "abre sin el laboratorio dentro", not pg.evaluate("!!window.MCT_LAB || !!document.querySelector('#lab')"))
    pg.fill("#bx-idea", FRASE_BASIC)
    pg.click("#bx-trad")
    pg.wait_for_timeout(400)
    ok("D", "BASIC: traduce la frase", "RSI" in texto(pg, "#bx-out"), texto(pg, "#bx-out")[:70].replace("\n", " "))
    pg.click("#bx-ejs [data-ej=ndx_d1]")
    pg.wait_for_function("document.querySelector('#bx-dat').textContent.includes('Nasdaq')", timeout=30000)
    if con_motor:
        pg.click("#bx-correr")
        fin = time.time() + 300   # al acabar, la app recarga la página con el resultado: se reintenta tras la recarga
        while time.time() < fin:
            try:
                if pg.evaluate("sessionStorage.getItem('mct_res')!==null || /No se pudo/.test(document.querySelector('#bx-nota')?.textContent||'')"):
                    break
            except Exception:  # noqa: BLE001
                pass
            pg.wait_for_timeout(1000)
        pg.wait_for_load_state("load")
        pg.wait_for_timeout(800)
        r = pg.evaluate("(()=>{const j=JSON.parse(sessionStorage.getItem('mct_res')||'null');return j?{n:j.trades.length,oos:j.f1.OOS.n,pf_oos:+j.f1.OOS.pf.toFixed(2)}:null})()")
        if ok("D", "BASIC: el motor corre la regla y da veredicto", r is not None, str(r)):
            medidos.update(publica_ops=r["n"], publica_oos_ops=r["oos"], publica_pf_oos=r["pf_oos"])
        pg.wait_for_timeout(1500)
        pg.screenshot(path=str(CAP / "D_publica_veredicto.png"), full_page=True)
    ok("D", "sin errores en la consola", len(errores) == n0, errores[n0] if len(errores) > n0 else "")
    ctx.close()


# ---------------------------------------------------------------- referencia
def comparar(fijar):
    print("\nREFERENCIA · los números deben ser los mismos que la última vez que se fijaron")
    if fijar:
        REF.write_text(json.dumps(medidos, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"  fijada en {REF.relative_to(RAIZ).as_posix()}: {medidos}")
        return
    if not REF.exists():
        ok("R", "hay valores de referencia", False, "corre una vez con --fijar")
        return
    ref = json.loads(REF.read_text(encoding="utf-8"))
    for k, esperado in ref.items():
        if k not in medidos:
            continue
        ok("R", k, medidos[k] == esperado, f"ahora {medidos[k]} · referencia {esperado}" if medidos[k] != esperado else str(esperado))


def instalar_hook():
    h = RAIZ / ".git" / "hooks" / "pre-push"
    h.write_text("#!/bin/sh\n# batería fija antes de cada push (herramientas/bateria.py). Saltarla solo en una urgencia: git push --no-verify\n"
                 "cd \"$(git rev-parse --show-toplevel)\" || exit 1\n"
                 "python herramientas/bateria.py || { echo; echo 'PUSH PARADO: la batería tiene fallos (arriba).'; exit 1; }\n",
                 encoding="utf-8", newline="\n")
    print(f"instalado {h}")


def main():
    a = sys.argv[1:]
    if "--instalar-hook" in a:
        instalar_hook()
        return 0
    rapida, fijar = "--rapida" in a, "--fijar" in a
    CAP.mkdir(parents=True, exist_ok=True)
    t0 = time.time()
    estatico()
    errores = []
    from playwright.sync_api import sync_playwright
    with Servidor() as srv, sync_playwright() as p:
        nav = p.chromium.launch()
        estado = None
        if not rapida:
            try:
                estado = laboratorio(nav, srv.url, errores)
            except Exception as e:  # noqa: BLE001
                ok("B", "el recorrido del laboratorio llega al final", False, f"{type(e).__name__}: {str(e)[:160]}")
        try:
            capas(nav, srv.url, errores, estado)
        except Exception as e:  # noqa: BLE001
            ok("C", "el recorrido de capas llega al final", False, f"{type(e).__name__}: {str(e)[:160]}")
        try:
            publica(nav, srv.url, errores, not rapida)
        except Exception as e:  # noqa: BLE001
            ok("D", "el recorrido de la pública llega al final", False, f"{type(e).__name__}: {str(e)[:160]}")
        nav.close()
    if not rapida:
        b_err = [e for e in errores if e.startswith("[lab 1440]") or e.startswith("[lab recarga]")]
        ok("B", "sin errores en la consola en todo el recorrido", not b_err, b_err[0] if b_err else "")
        comparar(fijar)
    fallos = [r for r in resultados if not r[2]]
    print(f"\n{'=' * 70}\n{len(resultados) - len(fallos)}/{len(resultados)} OK · {time.time() - t0:.0f} s · capturas en {CAP.relative_to(RAIZ).as_posix()}/")
    if errores:
        print(f"errores de consola ({len(errores)}):")
        for e in errores[:15]:
            print("  ", e)
    if fallos:
        print(f"{len(fallos)} FALLO(S):")
        for b, n, _, d in fallos:
            print(f"   [{b}] {n}" + (f" · {d}" if d else ""))
        return 1
    print("TODO OK" + (" (rápida: sin motor ni números de referencia)" if rapida else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
