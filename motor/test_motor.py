# -*- coding: utf-8 -*-
"""test_motor.py — comprueba el motor de MEGA CUEVA TESTER contra la referencia de Sentinel.

Se ejecuta en local con Python normal:   python test_motor.py
1. Lee el CSV de ejemplo (formato MT5) con cargar_csv y comprueba que da las MISMAS velas que el cargador de Sentinel.
2. Corre la regla Oro RSI(4) 25/55 con tamaño 100 % y los costes del perfil darwinex_mt5 (leídos del yaml).
3. Compara con reportes/oro_rsi4/nocional100 (validacion.json, trades.csv) y con datos_terminal_v2.json (formato).
4. Prueba reconciliar_mt5 con un informe sintético y los errores legibles de cargar_csv.
Solo LEE de c:/Users/trade/sentinel; no escribe nada allí.
"""
from __future__ import annotations
import json
import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
import motor_tester as mt  # noqa: E402

SENTINEL = Path(r"c:/Users/trade/sentinel")
REF = SENTINEL / "reportes" / "oro_rsi4"
CSV = AQUI.parent / "datos" / "XAUUSD_D1_ejemplo.csv"
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

fallos: list[str] = []


def check(cond: bool, msg: str):
    print(("  OK   " if cond else "  FALLO ") + msg)
    if not cond:
        fallos.append(msg)


def costes_perfil() -> dict:
    import yaml
    p = yaml.safe_load((SENTINEL / "codigo/sentinel/perfiles/darwinex_mt5.yaml").read_text(encoding="utf-8"))
    d = p["simbolos"]["XAUUSD"]
    assert d["swap_modo"] == 1
    return {"spread_pb": d["spread_bps_apertura_d1"], "comision_pb_lado": d["comision_bps_lado"],
            "deslizamiento_pb_lado": p["supuestos"]["slippage_bps_lado"],
            "swap_largo_pb_dia": d["swap_long"] * d["point"] / d["precio_lectura"] * 1e4,
            "swap_corto_pb_dia": d["swap_short"] * d["point"] / d["precio_lectura"] * 1e4}


def main():
    print("1) Lectura del CSV")
    if not CSV.exists():
        raise SystemExit("Falta el CSV de ejemplo: python exportar_csv_ejemplo.py")
    t0 = time.perf_counter()
    df = mt.cargar_csv(CSV.read_text(encoding="utf-8"))
    print(f"  {len(df)} velas · tf {df.attrs['tf']} · {time.perf_counter() - t0:.2f}s · avisos: {df.attrs['avisos']}")
    sys.path.insert(0, str(SENTINEL / "codigo"))
    try:
        from sentinel import datos as sdatos   # solo lectura
        ref_df = sdatos.cargar("XAUUSD", "D1")
        check(len(ref_df) == len(df), f"mismas velas que Sentinel ({len(df)} vs {len(ref_df)})")
        check(bool((ref_df.index == df.index).all()), "mismas fechas que Sentinel")
        dmax = float(np.abs(ref_df[["open", "high", "low", "close"]].to_numpy() - df[["open", "high", "low", "close"]].to_numpy()).max())
        check(dmax < 1e-6, f"mismos precios que Sentinel (dif. máx. {dmax:.2e})")
    except Exception as e:  # noqa: BLE001
        print(f"  (no se pudo cargar con sentinel.datos: {e})")

    print("\n2) Validación Oro RSI(4) 25/55 · tamaño 100 % · costes del perfil darwinex_mt5")
    spec = json.loads((AQUI / "spec_oro_rsi4.json").read_text(encoding="utf-8"))
    spec["costes"] = costes_perfil()
    print("  costes:", {k: round(v, 4) for k, v in spec["costes"].items()})
    t0 = time.perf_counter()
    res = mt.validar(df, spec)
    dt = time.perf_counter() - t0
    print(f"  validar(): {dt:.2f}s · tiempos acumulados {res['tiempos']}")
    json.dumps(res, allow_nan=False)   # JSON estricto (sin NaN)
    check(True, "salida serializable a JSON estricto")

    ref = json.loads((REF / "nocional100" / "validacion.json").read_text(encoding="utf-8"))
    f1, r1 = res["f1"], ref["fase1"]
    filas = [
        ("Fecha de corte", r1["fecha_split"], f1["fecha_split"]),
        ("Ops IS", r1["IS"]["n"], f1["IS"]["n"]), ("Ops OOS", r1["OOS"]["n"], f1["OOS"]["n"]),
        ("PF IS", r1["IS"]["pf"], f1["IS"]["pf"]), ("PF OOS", r1["OOS"]["pf"], f1["OOS"]["pf"]),
        ("MaxDD IS", r1["IS"]["maxdd"], f1["IS"]["maxdd"]), ("MaxDD OOS", r1["OOS"]["maxdd"], f1["OOS"]["maxdd"]),
        ("PF sin mejor OOS", r1["OOS"]["pf_sin_mejor"], f1["OOS"]["pf_sin_mejor"]),
        ("Ret. total", ref["full"]["ret_total"], res["full"]["ret_total"]),
        ("WF eficiencia", ref["fase2"]["eficiencia"], res["wf_res"]["eficiencia"]),
        ("WF % positivas", ref["fase2"]["pct_positivas"], res["wf_res"]["pct_positivas"]),
        ("WF ventanas", ref["fase2"]["n_ventanas"], res["wf_res"]["n_ventanas"]),
        ("Meseta PF centro", ref["fase3"]["pf_centro"], res["meseta"]["pf"][2][2]),
        ("MC p5 ret", ref["fase4"]["p5_ret"], res["mc"]["p5"]), ("MC p95 DD", ref["fase4"]["p95_dd"], res["mc"]["p95dd"]),
        ("MC ruina", ref["fase4"]["prob_ruina"], res["mc"]["ruina"]),
        ("Stress costes×2 PF", ref["fase5"]["escenarios"]["costes_x2"]["pf"], res["stress"]["costes_x2"]["pf"]),
        ("Stress sin 2 mejores PF", ref["fase5"]["escenarios"]["sin_2_mejores_anios"]["pf"], res["stress"]["sin_2_mejores_anios"]["pf"]),
        ("Stress régimen malo PF", ref["fase5"]["escenarios"]["regimen_malo"]["pf"], res["stress"]["regimen_malo"]["pf"]),
    ]
    print(f"\n  {'métrica':<24}{'Sentinel':>12}{'motor':>12}")
    for nombre, a, b in filas:
        fa = f"{a:.4f}" if isinstance(a, float) else str(a)
        fb = f"{b:.4f}" if isinstance(b, float) else str(b)
        print(f"  {nombre:<24}{fa:>12}{fb:>12}")
    print(f"  {'Fases':<24}{str(ref['fases']):>12}")
    print(f"  {'':<24}{str(res['fases']):>12}")
    print(f"  veredicto: {res['verdict']}")
    check(f1["IS"]["n"] == r1["IS"]["n"] and f1["OOS"]["n"] == r1["OOS"]["n"], "nº de operaciones IS/OOS idéntico")
    check(f1["fecha_split"] == r1["fecha_split"], "misma fecha de corte IS/OOS")
    check(abs(f1["OOS"]["pf"] - r1["OOS"]["pf"]) < 0.02, "PF OOS dentro de ±0,02")
    check(abs(f1["IS"]["pf"] - r1["IS"]["pf"]) < 0.02, "PF IS dentro de ±0,02")
    check(res["fases"] == ref["fases"], "mismo resultado fase a fase (F1✓ F2✓ F3✗ F4✗ F5✓)")
    # operación a operación
    tr = pd.read_csv(REF / "nocional100" / "trades.csv")
    m = pd.DataFrame(res["trades"])
    mismas = (pd.to_datetime(tr.fecha_in).dt.strftime("%Y-%m-%d").to_numpy() == m.fi.to_numpy()).all() and \
             (pd.to_datetime(tr.fecha_out).dt.strftime("%Y-%m-%d").to_numpy() == m.fo.to_numpy()).all()
    check(bool(mismas), "mismas fechas de entrada y salida en las 149 operaciones")
    dret = float(np.abs(tr.ret.to_numpy() - m.ret.to_numpy()).max())
    check(dret < 1e-5, f"mismo retorno por operación (dif. máx. {dret:.2e})")

    # formato datos_terminal_v2.json
    term = json.loads((REF / "datos_terminal_v2.json").read_text(encoding="utf-8"))
    faltan = [k for k in term if k not in res]
    check(not faltan, f"todas las claves de datos_terminal_v2.json presentes (faltan: {faltan})")
    for k in ("trades", "anual", "wf", "eq", "velas"):
        if isinstance(term[k], list) and term[k] and isinstance(term[k][0], dict):
            fk = [x for x in term[k][0] if x not in res[k][0]]
            check(not fk, f"«{k}» con las mismas subclaves (faltan: {fk})")
    for k in ("f1", "wf_res", "mc", "stress", "meseta", "estado", "ultima"):
        fk = [x for x in term[k] if x not in res[k]]
        check(not fk, f"«{k}» con las mismas subclaves (faltan: {fk})")
    check(len(res["eq"]) == len(term["eq"]) and abs(res["eq"][-1][1] - term["eq"][-1][1]) < 1e-3,
          f"curva semanal: {len(res['eq'])} puntos (ref {len(term['eq'])}), final {res['eq'][-1][1]} (ref {term['eq'][-1][1]})")
    check(max(abs(a - b) for a, b in zip(res["dd"], term["dd"])) < 1e-3, "drawdown semanal igual al de la referencia")
    check(res["anual"] == term["anual"], "tabla anual idéntica")
    check([w["r"] for w in res["wf"]] == [w["r"] for w in term["wf"]], "ventanas de walk-forward idénticas")
    check(res["meseta"]["pf"] == term["meseta"]["pf"], "rejilla de la meseta idéntica")
    check(res["estado"]["rsi4"] == term["estado"]["rsi4"] and res["estado"]["senal"] == term["estado"]["senal"],
          f"estado actual: RSI4 {res['estado']['rsi4']} · {res['estado']['senal']} · {res['estado']['tendencia']}")
    check(res["arbol"] == term["arbol"], "árbol de decisión idéntico al del terminal")
    check(res["velas"][-1]["sma"] == term["velas"][-1]["sma"] and res["velas"][-1]["rsi"] == term["velas"][-1]["rsi"], "velas con RSI y SMA")
    print("\n  Pseudocódigo:\n    " + res["pseudocodigo"].replace("\n", "\n    "))

    print("\n3) Paridad MT5 (informe sintético)")
    tm = pd.DataFrame(res["trades"])
    filas_html = ["<tr><td>Time</td><td>Deal</td><td>Symbol</td><td>Type</td><td>Direction</td><td>Volume</td><td>Price</td>"
                  "<td>Order</td><td>Commission</td><td>Swap</td><td>Profit</td><td>Balance</td></tr>",
                  "<tr><td>1998.04.22 00:00:00</td><td>1</td><td></td><td>balance</td><td></td><td></td><td></td><td></td>"
                  "<td>0.00</td><td>0.00</td><td>10 000.00</td><td>10 000.00</td></tr>"]
    for i, r in tm.iterrows():
        filas_html.append(f"<tr><td>{r.fi.replace('-', '.')} 01:00:00</td><td>{2 * i + 2}</td><td>XAUUSD</td><td>buy</td><td>in</td>"
                          f"<td>0.10</td><td>{r.pi}</td><td>1</td><td>-0.01</td><td>0.00</td><td>0.00</td><td>0</td></tr>")
        filas_html.append(f"<tr><td>{r.fo.replace('-', '.')} 01:00:00</td><td>{2 * i + 3}</td><td>XAUUSD</td><td>sell</td><td>out</td>"
                          f"<td>0.10</td><td>{r.po}</td><td>2</td><td>-0.01</td><td>-1.00</td><td>{(r.po - r.pi) * 10:.2f}</td><td>0</td></tr>")
    html = "<html><body><table>" + "".join(filas_html) + "</table></body></html>"
    rec = mt.reconciliar_mt5(res["trades"], html.encode("utf-16"))
    check(rec["cuadra"], f"informe idéntico → {rec['estado']} ({rec['n_motor']} vs {rec['n_mt5']} ops, dif {rec['dif_relativa']:.4f})")
    html2 = html.replace(f"<td>{tm.po.iloc[5]}</td>", f"<td>{tm.po.iloc[5] * 1.05}</td>", 1)
    rec2 = mt.reconciliar_mt5(res["trades"], html2)
    print(f"       informe con una salida alterada → {rec2['estado']} (dif {rec2['dif_relativa']:.4f}, {len(rec2['diferencias'])} diferencias)")

    print("\n4) Errores legibles de cargar_csv")
    casos = {
        "vacío": "",
        "sin OHLC": "fecha;precio\n2020-01-01;1\n2020-01-02;2\n",
        "columnas sin nombre válido": "a,b,c,d,e\n" + "\n".join(f"x{i},1,2,3,4" for i in range(400)),
        "fechas basura": "Date,Open,High,Low,Close\n" + "\n".join(f"hola{i},1,2,0.5,1.5" for i in range(400)),
        "pocas velas": "Date,Open,High,Low,Close\n" + "\n".join(f"2020-01-{i + 1:02d},1,2,0.5,1.5" for i in range(20)),
        "OHLC desordenado": "Date,Open,Low,High,Close\n" + "\n".join(
            f"{(pd.Timestamp('2020-01-01') + pd.Timedelta(days=i)).date()},1,2,0.5,1.5" for i in range(400)),
    }
    for nombre, txt in casos.items():
        try:
            mt.cargar_csv(txt)
            check(False, f"«{nombre}» debería dar error")
        except mt.ErrorDatos as e:
            print(f"  OK   {nombre}: {e}")
    # formatos alternativos que SÍ deben leerse
    base = df.head(400)
    yahoo = "Date,Open,High,Low,Close,Adj Close,Volume\n" + "\n".join(
        f"{d.date()},{r.open},{r.high},{r.low},{r.close},{r.close},100" for d, r in base.iterrows())
    tv = "time,open,high,low,close\n" + "\n".join(
        f"{int(pd.Timestamp(d).timestamp())},{r.open},{r.high},{r.low},{r.close}" for d, r in base.iterrows())
    es = "Fecha;Apertura;Máximo;Mínimo;Cierre\n" + "\n".join(
        f"{d.strftime('%d/%m/%Y')};{str(r.open).replace('.', ',')};{str(r.high).replace('.', ',')};"
        f"{str(r.low).replace('.', ',')};{str(r.close).replace('.', ',')}" for d, r in base.iterrows())
    hist = "\n".join(f"{d.strftime('%Y.%m.%d')},00:00,{r.open},{r.high},{r.low},{r.close},100" for d, r in base.iterrows())
    for nombre, txt in {"Yahoo": yahoo, "TradingView (unix)": tv, "Excel español": es, "MT4 historial sin cabecera": hist}.items():
        try:
            d2 = mt.cargar_csv(txt)
            ok = len(d2) >= 390 and abs(d2.close.iloc[-1] - base.close.iloc[-1]) < 1e-9
            check(ok, f"{nombre}: {len(d2)} velas, tf {d2.attrs['tf']}")
        except mt.ErrorDatos as e:
            check(False, f"{nombre}: {e}")

    print("\n5) Regla con cortos, stop ATR, objetivo y salida por tiempo (humo)")
    spec2 = {"nombre": "Bollinger ambos", "direccion": "ambos", "parametros": {"n": 20, "k": 2.0},
             "largo": {"entrada": [{"indicador": "close", "comparador": "cruza_abajo", "contra": {"indicador": "bollinger_inf", "n": "$n", "k": "$k"}}],
                       "salida": [{"indicador": "close", "comparador": ">", "contra": {"indicador": "bollinger_media", "n": "$n"}}]},
             "corto": {"entrada": [{"indicador": "close", "comparador": "cruza_arriba", "contra": {"indicador": "bollinger_sup", "n": "$n", "k": "$k"}}],
                       "salida": [{"indicador": "close", "comparador": "<", "contra": {"indicador": "bollinger_media", "n": "$n"}}]},
             "stop": {"tipo": "atr", "n": 14, "k": 3}, "objetivo": {"tipo": "pct", "valor": 4}, "salida_tiempo": 15,
             "sizing": {"tipo": "riesgo", "pct": 1, "apalancamiento_max": 3}, "costes": costes_perfil(),
             "optimizar": {"n": [10, 15, 20, 25, 30], "k": [1.5, 1.75, 2.0, 2.25, 2.5]}}
    t0 = time.perf_counter()
    r2 = mt.validar(df, spec2)
    mot = pd.Series([t["motivo"] for t in r2["trades"]]).value_counts().to_dict()
    lados = pd.Series([t["lado"] for t in r2["trades"]]).value_counts().to_dict()
    print(f"  {time.perf_counter() - t0:.2f}s · {len(r2['trades'])} ops · {lados} · motivos {mot} · {r2['verdict']}")
    check(len(lados) == 2 and "stop" in mot and "objetivo" in mot and "tiempo" in mot, "usa largos, cortos, stop, objetivo y tiempo")
    print("    " + r2["pseudocodigo"].replace("\n", "\n    "))

    print("\n6) Rendimiento con ~60.000 velas horarias (XAUUSD H1 de Darwinex)")
    import glob
    fh = glob.glob(str(SENTINEL / "data/darwinex/H1/*-XAUUSD-*-H1.parquet"))
    if fh:
        h = pd.read_parquet(fh[0]).sort_values("datetime_servidor").tail(60000)
        txt = "Date,Open,High,Low,Close\n" + "\n".join(
            f"{d:%Y-%m-%d %H:%M},{o},{hi},{lo},{c}" for d, o, hi, lo, c in zip(pd.to_datetime(h.datetime_servidor), h.open, h.high, h.low, h.close))
        t0 = time.perf_counter(); dh = mt.cargar_csv(txt); tl = time.perf_counter() - t0
        sh = json.loads((AQUI / "spec_oro_rsi4.json").read_text(encoding="utf-8"))
        sh["temporalidad"] = "H1"; sh["costes"] = costes_perfil()
        t0 = time.perf_counter(); rh = mt.validar(dh, sh); tv_ = time.perf_counter() - t0
        print(f"  {len(dh)} velas H1 · lectura {tl:.2f}s · validar {tv_:.2f}s · {len(rh['trades'])} ops · {rh['verdict']}")
        print(f"  tiempos: {rh['tiempos']}")

    print("\n7) Spec v1 de la app (formulario «Prueba inicial») → motor · contrato v3")
    csv_txt = CSV.read_text(encoding="utf-8")
    sa = json.loads((AQUI / "spec_app_oro_rsi4.json").read_text(encoding="utf-8"))
    c_int = costes_perfil()
    sa_perfil = {**sa, "costes": {"perfil": "darwinex_mt5", "spread_pb": c_int["spread_pb"],
                                  "comision_pb_lado": c_int["comision_pb_lado"],
                                  "deslizamiento_pb_lado": c_int["deslizamiento_pb_lado"],
                                  "swap_largo_pb_dia": c_int["swap_largo_pb_dia"], "swap_corto_pb_dia": c_int["swap_corto_pb_dia"]},
                 "optimizar": spec["optimizar"]}
    etapas = []
    t0 = time.perf_counter()
    ra = json.loads(mt.ejecutar_spec_app(csv_txt, json.dumps(sa_perfil), progreso=lambda e, p: etapas.append(e)))
    print(f"  ejecutar_spec_app: {time.perf_counter() - t0:.2f}s · etapas {etapas}")
    check("error" not in ra, "la spec de la app corre sin error")
    check(len(ra["trades"]) == 149 and ra["f1"]["IS"]["n"] == r1["IS"]["n"], "app → 149 operaciones, mismas IS/OOS")
    check(abs(ra["f1"]["OOS"]["pf"] - r1["OOS"]["pf"]) < 1e-9, f"app → PF OOS {ra['f1']['OOS']['pf']:.4f} = Sentinel")
    check(ra["fases"] == ref["fases"], "app → mismo resultado fase a fase que Sentinel")
    check(all(a["fi"] == b["fi"] and a["ret"] == b["ret"] for a, b in zip(ra["trades"], res["trades"])),
          "app → mismas operaciones que la spec interna")
    claves = ["cuenta", "stats_trades", "extremos_por_anio", "velas_full", "corte_auto", "reglas_visual", "core_logic", "codigo"]
    check(all(k in ra for k in claves), "claves nuevas del contrato v3 presentes")
    t0_ = ra["trades"][0]
    check(all(k in t0_ for k in ("mfe_pct", "mae_pct", "ret_usd", "dia_semana_entrada", "mes_entrada", "racha")),
          "trades ampliados (mfe, mae, ret_usd, día, mes, racha)")
    check(all(tr["mfe_pct"] >= 0 >= tr["mae_pct"] for tr in ra["trades"]),
          "MFE ≥ 0 ≥ MAE en todas las operaciones")
    check(len(ra["velas_full"]) == len(df), f"velas_full con todo el periodo ({len(ra['velas_full'])} velas)")
    check(ra["estado"]["ruta"] == ["sma"], f"ruta de hoy desde la spec: {ra['estado']['ruta']} → {ra['estado']['ruta_resultado']}")
    check(ra["reglas_visual"]["trigger"] == "Compra cuando RSI(4) < 25", f"reglas_visual: {ra['reglas_visual']['trigger']}")
    check(abs(ra["cuenta"]["expectancy_usd"] - 1e5 * np.mean([t_["ret"] for t_ in ra["trades"]])) < 0.01, "expectancy en USD (100k)")
    ext = ra["extremos_por_anio"][0]
    check(ra["trades"][ext["mejor"]["n"] - 1]["fi"] == ext["mejor"]["fi"], "extremos_por_anio apunta a la operación correcta")
    auto = json.loads(mt.ejecutar_spec_app(csv_txt, json.dumps({**sa_perfil, "corte": {"tipo": "auto"}})))
    check(auto["corte_auto"] == {"metodo": "70/30 de los datos disponibles", "fecha": r1["fecha_split"], "tipo": "auto"},
          f"corte auto 70/30 → {auto['corte_auto']['fecha']}")
    # mismo caso con el swap en % anual redondeado, como lo manda el formulario (v6): el WF debe cuadrar ventana a ventana
    sa_pct = {**sa_perfil, "costes": {"perfil": "darwinex_mt5", "spread_pb": 0.134, "comision_pb_lado": 0.01,
                                      "deslizamiento_pb_lado": 3, "swap_largo_pct_anual": -5.2443, "swap_corto_pct_anual": 2.9247}}
    for corte in ({"tipo": "fecha", "fecha": "2018-03-08"}, {"tipo": "auto"}):
        rp = mt.correr_spec_app(csv_txt, {**sa_pct, "corte": corte})
        vent_ok = [w["params"]["entrada"] == v["params"]["entrada"] and w["params"]["salida"] == v["params"]["salida"]
                   and w["r"] == round(v["oos_ret_anual"], 5) for w, v in zip(rp["wf"], ref["fase2"]["ventanas"])]
        check(len(vent_ok) == ref["fase2"]["n_ventanas"] and all(vent_ok) and rp["fases"] == ref["fases"]
              and abs(rp["wf_res"]["eficiencia"] - ref["fase2"]["eficiencia"]) < 1e-9,
              f"swap en % anual (corte {corte['tipo']}): WF {rp['wf_res']['eficiencia']:.4f} / "
              f"{rp['wf_res']['pct_positivas']:.0%}, ventanas idénticas a Sentinel ({sum(vent_ok)}/{len(vent_ok)})")
    dflt = json.loads(mt.ejecutar_spec_app(csv_txt, json.dumps(sa)))
    print(f"  con los costes por defecto del formulario (spread 1,03 pb, swap −5,39 %/año): "
          f"{len(dflt['trades'])} ops · PF OOS {dflt['f1']['OOS']['pf']:.3f} · {dflt['verdict']}")
    amb = json.loads(mt.ejecutar_spec_app(csv_txt, json.dumps({**sa, "direccion": "ambos"})))
    check("RSI(4) > 75" in amb["pseudocodigo"] and "Cierre < SMA(200)" in amb["pseudocodigo"], "ambos: el corto usa la regla espejo")
    for nombre, mal, frag in [
        ("sin periodo", {**sa, "reglas": {**sa["reglas"], "entrada": [{"izq": {"tipo": "rsi"}, "op": "<", "der": {"tipo": "num", "valor": 25}}]}}, "periodo"),
        ("sin entrada", {**sa, "reglas": {**sa["reglas"], "entrada": []}}, "entrada"),
        ("lotes fijos", {**sa, "sizing": {"tipo": "lotes_fijos", "valor": 1}}, "lotes"),
        ("csv vacío", None, "vacío")]:
        e = json.loads(mt.ejecutar_spec_app("" if mal is None else csv_txt, json.dumps(mal or sa)))
        check("error" in e and frag in e["error"].lower(), f"error legible ({nombre}): {e.get('error')}")

    sesiones_sinteticas()
    nas100()
    desfase_app()

    print("\n" + ("TODO OK" if not fallos else f"{len(fallos)} FALLO(S): " + " | ".join(fallos)))
    return res


# ── 8) Reglas de sesión intradía: casos hechos a mano ──────────────────────────────────────────────
SPEC_NAS = json.loads((AQUI / "spec_nas100_apertura_ny.json").read_text(encoding="utf-8"))


def _dias(escenario: dict, n_dias_antes: int = 1, fuera: bool = True) -> pd.DataFrame:
    """Días de 26 velas de 15 min (9:30-15:45 NY). Día(s) previos: todo a 100 con un máximo de 110 (NIVEL = 110).
    Último día: velas a 105 salvo las que fija el escenario {nº de vela: (o, h, l, c)}. Con `fuera`, añade velas
    fuera de sesión (8:00-9:15 y 16:00-17:00) que no deben contar."""
    filas = []
    dia0 = pd.Timestamp("2024-03-04")          # lunes
    for d in range(n_dias_antes + 1):
        fecha = dia0 + pd.Timedelta(days=d)
        if fuera:
            for k in range(6):
                filas.append((fecha + pd.Timedelta(hours=8, minutes=15 * k), 150, 160, 140, 150))
        for k in range(1, 27):
            t = fecha + pd.Timedelta(hours=9, minutes=30 + 15 * (k - 1))
            if d < n_dias_antes:
                filas.append((t, 100, 110 if k == 5 else 100.5, 99.5, 100))
            else:
                filas.append((t, *escenario.get(k, (105, 105.5, 104.5, 105))))
        if fuera:
            for k in range(4):
                filas.append((fecha + pd.Timedelta(hours=16, minutes=15 * k), 150, 160, 140, 150))
    df = pd.DataFrame(filas, columns=["t", "open", "high", "low", "close"]).set_index("t")
    df.index.name = "fecha"
    return df.astype(float)


def _simular(df: pd.DataFrame, cambios: dict | None = None) -> pd.DataFrame:
    sp = {**SPEC_NAS, "costes": {}, "optimizar": None, **(cambios or {})}
    s = mt.normalizar_spec(sp)
    D = mt._Datos(df)
    cache = {"__sesion__": mt._InfoSesion(D, s["sesion"])}
    return mt._correr(D, s, dict(s["parametros"]), cache).trades


def sesiones_sinteticas():
    print("\n8) Reglas de sesión (NAS100 ruptura + retesteo): casos a mano")
    ARR = (111.5, 112, 111.2, 111.8)           # vela por encima del nivel sin tocarlo
    rup = {1: (109, 111, 108.5, 109.5)}         # vela 1: el máximo supera 110 → RUPTURA
    # a) ruptura sin retesteo
    t = _simular(_dias({**rup, **{k: ARR for k in range(2, 27)}}))
    check(len(t) == 0, "ruptura sin retesteo → 0 operaciones")
    # b) retesteo en la 8.ª vela tras la ruptura (vela 9) → entra al cierre; sale al cierre de la sesión
    esc = {**rup, **{k: ARR for k in range(2, 27)}, 9: (111, 111.2, 109.5, 110.5)}
    t = _simular(_dias(esc))
    ok = len(t) == 1 and t.px_in.iat[0] == 110.5 and t.motivo.iat[0] == "fin_sesion" and t.px_out.iat[0] == 111.8 \
        and pd.Timestamp(t.fecha_in.iat[0]).strftime("%H:%M") == "11:30" and pd.Timestamp(t.fecha_out.iat[0]).strftime("%H:%M") == "15:45"
    check(ok, f"retesteo en la vela 8 tras la ruptura → compra al cierre 110,5 y sale a las 15:45 ({len(t)} op.)")
    # c) retesteo en la 9.ª vela tras la ruptura (vela 10) → fuera de ventana
    esc_c = {**rup, **{k: ARR for k in range(2, 27)}, 10: (111, 111.2, 109.5, 110.5)}
    check(len(_simular(_dias(esc_c))) == 0, "retesteo en la vela 9 tras la ruptura → 0 operaciones")
    # d) en la misma vela toca el stop (109,5) y cierra bajo el nivel → manda el stop
    base = {**rup, 2: ARR, 3: (111, 111.2, 109.5, 110.5)}
    t = _simular(_dias({**base, 4: (110.4, 110.6, 109.0, 109.8), **{k: ARR for k in range(5, 27)}}))
    check(len(t) == 1 and t.motivo.iat[0] == "stop" and t.px_out.iat[0] == 109.5, "stop y cierre bajo el nivel en la misma vela → stop")
    # e) cierre bajo el nivel sin tocar el stop → sale al cierre de esa vela
    t = _simular(_dias({**base, 4: (110.4, 110.6, 109.8, 109.9), **{k: ARR for k in range(5, 27)}}))
    check(len(t) == 1 and t.motivo.iat[0] == "señal" and t.px_out.iat[0] == 109.9, "cierre bajo el nivel → sale al cierre (109,9)")
    # f) máx. 1 operación al día: un segundo retesteo tras salir no abre otra; con 2 al día, sí
    esc_f = {**base, 4: (110.4, 110.6, 109.8, 109.9), 5: (110.2, 110.8, 109.9, 110.6), **{k: ARR for k in range(6, 27)}}
    t1 = _simular(_dias(esc_f))
    check(len(t1) == 1, "una operación por día: no reentra tras salir")
    # g) ruptura en la vela 3 (fuera de las 2 primeras) → no opera
    check(len(_simular(_dias({3: (109, 111, 108.5, 109.5), 5: (111, 111.2, 109.5, 110.5)}))) == 0,
          "ruptura en la vela 3 → 0 operaciones")
    # h) ejecución en la apertura siguiente: entra a la apertura de la vela 10
    t = _simular(_dias(esc), {"ejecucion": "apertura_siguiente"})
    check(len(t) == 1 and t.px_in.iat[0] == 111.5, f"ejecución apertura siguiente → entra a 111,5 en la vela 10")
    # i) zona horaria: el mismo histórico en UTC (Z), con desfase NY y sin zona da las mismas velas en hora NY
    df = _dias({**base, 4: (110.4, 110.6, 109.8, 109.9)}, n_dias_antes=12, fuera=False)
    loc = df.index.tz_localize("America/New_York")
    cab = "time,open,high,low,close\n"
    cuerpo = lambda idx: "\n".join(f"{t},{o},{h},{l},{c}" for t, (o, h, l, c) in zip(idx, df.to_numpy()))  # noqa: E731
    utc_txt = cab + cuerpo(loc.tz_convert("UTC").strftime("%Y-%m-%dT%H:%M:%SZ"))
    ny_txt = cab + cuerpo([x.isoformat() for x in loc])
    unix_txt = cab + cuerpo([str(int(x.timestamp())) for x in loc])
    ses = mt.normalizar_spec(SPEC_NAS)["sesion"]
    idxs = [mt._a_zona(mt.cargar_csv(x), ses, []).index for x in (utc_txt, ny_txt, unix_txt)]
    check(all(len(i) == len(df) and (i == df.index).all() for i in idxs), "CSV en UTC (Z), ISO con desfase NY y UNIX → mismas horas NY")
    # j) la spec de la app (formulario) produce la misma regla
    sa = json.loads((AQUI / "spec_app_nas100_apertura_ny.json").read_text(encoding="utf-8"))
    s_app, _, _ = mt.adaptar_spec_app(sa)
    s_app = {**s_app, "costes": {}, "optimizar": None}
    D = mt._Datos(_dias(esc)); s_n = mt.normalizar_spec(s_app)
    t_app = mt._correr(D, s_n, dict(s_n["parametros"]), {"__sesion__": mt._InfoSesion(D, s_n["sesion"])}).trades
    check(len(t_app) == 1 and t_app.px_in.iat[0] == 110.5, "la spec del formulario (app) da la misma operación")


def nas100():
    print("\n9) Ejemplo NAS100 15 min (Dukascopy, sesión NY) · 5 fases en intradía")
    f = AQUI.parent / "datos" / "NAS100_M15_ejemplo.csv"
    if not f.exists():
        print("  (falta datos/NAS100_M15_ejemplo.csv: python exportar_nas100_ejemplo.py)")
        return
    txt = f.read_text(encoding="utf-8")
    sa = json.loads((AQUI / "spec_app_nas100_apertura_ny.json").read_text(encoding="utf-8"))
    t0 = time.perf_counter()
    r = mt.correr_spec_app(txt, sa)
    dt = time.perf_counter() - t0
    f1 = r["f1"]
    print(f"  {r['n_velas']} velas · {dt:.2f}s · {len(r['trades'])} ops ({f1['IS']['n']} IS / {f1['OOS']['n']} OOS) · "
          f"PF IS {f1['IS']['pf']:.2f} / OOS {f1['OOS']['pf']:.2f} · WF {r['wf_res']['n_ventanas']} ventanas · {r['verdict']}")
    check(len(r["trades"]) > 100 and all(set(r["fases"]) == {"F1", "F2", "F3", "F4", "F5"} for _ in [0]),
          "NAS100: las 5 fases corren en intradía")
    dias_ = pd.to_datetime(pd.Series([t["fi"] for t in r["trades"]])).dt.date
    check(dias_.is_unique, "NAS100: como máximo una operación por día")
    horas = {t["fo"][-5:] for t in r["trades"]}
    check(max(horas) <= "15:45" and min(t["fi"][-5:] for t in r["trades"]) >= "09:30", "NAS100: todo dentro de la sesión 9:30-16:00")
    check(r["meseta"]["ejes"] == {"n_ruptura": [1, 2, 3, 4, 5], "n_retesteo": [4, 6, 8, 10, 12]}, "NAS100: meseta sobre nº de velas de ruptura y de retesteo")



def desfase_app():
    print("\n10) Spec de la app con DESFASE (velas anteriores) y salida «todas a la vez»: RSI(2) NDX, 2 velas verdes")
    f = AQUI.parent / "datos" / "NDX_D1_ejemplo.csv"
    if not f.exists():
        print("  (falta datos/NDX_D1_ejemplo.csv: python herramientas/exportar_ndx_ejemplo.py)")
        return
    verde = lambda d: {"izq": {"tipo": "precio", "desfase": d}, "op": ">", "der": {"tipo": "apertura", "desfase": d}}  # noqa: E731
    sa = {"version": 1, "nombre": "RSI2 NDX", "activo": {"simbolo": "NDX", "clase": "indice"}, "temporalidad": "D1", "direccion": "largo",
          "reglas": {"filtros": [{"izq": {"tipo": "precio"}, "op": ">", "der": {"tipo": "sma", "periodo": 200}}],
                     "entrada": [{"izq": {"tipo": "rsi", "periodo": 2}, "op": "<", "der": {"tipo": "num", "valor": 15}}],
                     "salida": [verde(0), verde(1)], "salida_modo": "todas"},
          "ejecucion": {"momento": "apertura_siguiente"}, "gestion": {"stop": {"tipo": "ninguno"}, "objetivo": {"tipo": "ninguno"}},
          "sizing": {"tipo": "pct_capital", "valor": 100},
          "costes": {"spread_pb": 0.326, "comision_pb_lado": 0.01, "deslizamiento_pb_lado": 3, "swap_largo_pct_anual": -5.55, "swap_corto_pct_anual": 2.25},
          "corte": {"tipo": "auto"}}
    s_in, _, _ = mt.adaptar_spec_app(sa)
    sal = s_in["largo"]["salida"]
    check(sal["op"] == "Y" and len(sal["bloques"]) == 2, "salida_modo «todas» → grupo Y")
    check(any(b.get("desfase") == 1 for b in sal["bloques"]) or any((b.get("contra") or {}).get("desfase") == 1 for b in sal["bloques"]),
          "el desfase pasa al motor")
    txt = f.read_text(encoding="utf-8")
    df = mt.cargar_csv(txt)
    r = mt.correr_spec_app(txt, sa)
    T = r["trades"]
    verdes = (df["close"] > df["open"]).to_numpy()
    idx = {d.strftime("%Y-%m-%d"): i for i, d in enumerate(df.index)}
    ok = 0; malos = 0
    for t in T:
        if t["fo"][:10] not in idx or t is T[-1]:
            continue
        i = idx[t["fo"][:10]] - 1          # vela de la señal: la anterior a la de salida (sale en la apertura)
        ok += 1
        malos += not (verdes[i] and verdes[i - 1])
    f1 = r["f1"]
    print(f"  {len(T)} ops ({f1['IS']['n']} IS / {f1['OOS']['n']} OOS) · PF IS {f1['IS']['pf']:.2f} / OOS {f1['OOS']['pf']:.2f} · {r['verdict']}")
    check(ok > 50 and malos == 0, f"cada salida llega tras 2 velas verdes seguidas ({ok} revisadas, {malos} mal)")
    sa2 = json.loads(json.dumps(sa)); sa2["reglas"]["salida_modo"] = "cualquiera"
    n2 = len(mt.correr_spec_app(txt, sa2)["trades"])
    check(n2 > len(T), f"con «basta una» sale antes y hay más operaciones ({n2} > {len(T)})")


if __name__ == "__main__":
    main()
