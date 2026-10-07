"""Genera datos/oro_rsi4_v3.json (contrato v3) a partir de los reportes de Sentinel.

Lee (no escribe) c:/Users/trade/sentinel: datos_terminal_v2.json, nocional100/trades.csv y equity.parquet,
y las velas D1 de XAUUSD con el cargador de Sentinel. Ejecutar: python herramientas/generar_oro_rsi4_v3.py
"""
import json, sys
from pathlib import Path
import numpy as np
import pandas as pd

SENT = Path(r"c:\Users\trade\sentinel")
RAIZ = Path(__file__).resolve().parents[1]
REP = SENT / "reportes" / "oro_rsi4"
sys.path.insert(0, str(SENT / "codigo"))
from sentinel import datos  # noqa: E402
from sentinel.indicadores import rsi_wilder, sma  # noqa: E402

CAP = 100_000.0
DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
r2 = lambda x: None if x is None or (isinstance(x, float) and np.isnan(x)) else round(float(x), 2)
r6 = lambda x: round(float(x), 6)

base = json.loads((REP / "datos_terminal_v2.json").read_text(encoding="utf-8"))
tr = pd.read_csv(REP / "nocional100" / "trades.csv")
df = datos.cargar("XAUUSD")
df["rsi"] = rsi_wilder(df.close, 4)
df["sma"] = sma(df.close, 200)

assert len(tr) == len(base["trades"]) == 149
assert np.allclose(df.open.values[tr.i_in], tr.px_in) and np.allclose(df.open.values[tr.i_out], tr.px_out)

# ---------- trades extendidos ----------
eq_antes, eq = [], 1.0
for r in tr.ret:
    eq_antes.append(eq); eq *= 1 + r
trades, racha = [], 0
for k, (t, row) in enumerate(zip(base["trades"], tr.itertuples())):
    tramo = df.iloc[row.i_in:row.i_out]               # velas con la posición abierta (sale en la apertura de i_out)
    hi = max(tramo.high.max(), row.px_out); lo = min(tramo.low.min(), row.px_out)
    ret = float(row.ret)
    # MFE/MAE en las mismas unidades que ret (neto): nunca por debajo/encima del resultado final
    mfe = max(hi / row.px_in - 1, ret); mae = min(lo / row.px_in - 1, ret)
    racha = (racha + 1 if racha > 0 else 1) if ret > 0 else (racha - 1 if racha < 0 else -1)
    fi = pd.Timestamp(row.fecha_in)
    t = dict(t)
    t.update(mfe_pct=r6(mfe), mae_pct=r6(mae), ret_usd=round(ret * CAP, 2),
             ret_usd_comp=round(ret * eq_antes[k] * CAP, 2),
             dia_semana_entrada=DIAS[fi.dayofweek], mes_entrada=int(fi.month), racha=racha)
    trades.append(t)

R = tr.ret.values
gan, per = R[R > 0], R[R <= 0]
n = len(R)
pf = gan.sum() / -per.sum()
ret_total = float(np.prod(1 + R) - 1)
oos = np.array([t["oos"] for t in trades])
f1, full = base["f1"], base["full"]
eqf = pd.read_parquet(REP / "nocional100" / "equity.parquet").equity.values
assert abs(pf - full["pf"]) < 1e-9 and abs(eqf[-1] - 1 - full["ret_total"]) < 1e-6
# La curva diaria (marca a mercado, swap diario) da +75,78 %; componer los ret por operación da +75,61 %.
assert abs(ret_total - full["ret_total"]) < 0.005
ret_total = full["ret_total"]
assert oos.sum() == 47 and (~oos).sum() == 102
for t in trades:
    assert t["mfe_pct"] >= t["ret"] - 1e-6 >= t["mae_pct"] - 2e-6, t

# ---------- cuenta ----------
anios_full, anios_oos = full["anios"], f1["OOS"]["anios"]
exp_usd = R.mean() * CAP
exp_usd_comp = np.mean([t["ret_usd_comp"] for t in trades])
gma = R.sum() * CAP / anios_full
gma_comp = ret_total * CAP / anios_full
gma_oos = R[oos].sum() * CAP / anios_oos
gma_oos_comp = f1["OOS"]["ret_total"] * CAP / anios_oos
cuenta = dict(
    capital=100000, moneda="USD", compuesto=False,
    expectancy_usd=round(exp_usd, 2), expectancy_pct=r6(R.mean()),
    expectancy_usd_compuesto=round(float(exp_usd_comp), 2),
    expectancy_usd_oos=round(R[oos].mean() * CAP, 2),
    ganancia_media_anual_usd=round(gma, 2), ganancia_media_anual_usd_compuesto=round(gma_comp, 2),
    ganancia_media_anual_usd_oos=round(gma_oos, 2), ganancia_media_anual_usd_oos_compuesto=round(gma_oos_comp, 2),
    cagr_oos_usd=round(f1["OOS"]["cagr"] * CAP, 2),
    operaciones_por_anio=round(n / anios_full, 2),
    objetivo_anual_usd=round(gma_oos, 2),
    objetivo_nota=("Objetivo base de dinero: lo que la estrategia aspira a ganar al año con 100.000 USD según el "
                   "backtest fuera de muestra (2018-2026), sin componer. Es una referencia media, no una promesa: "
                   "hay años en negativo."),
)

# ---------- stats_trades ----------
rachas = [t["racha"] for t in trades]
mfe = np.array([t["mfe_pct"] for t in trades]); mae = np.array([t["mae_pct"] for t in trades])
fechas = pd.to_datetime(tr.fecha_in)
dias = np.array([t["dias"] for t in trades])
payoff = gan.mean() / -per.mean()
stats = dict(
    racha_max_ganadora=int(max(rachas)), racha_max_perdedora=int(-min(rachas)),
    mfe_medio=r6(mfe.mean()), mae_medio=r6(mae.mean()),
    mfe_medio_ganadoras=r6(mfe[R > 0].mean()), mae_medio_perdedoras=r6(mae[R <= 0].mean()),
    duracion_hist=[{"dias": int(d), "n": int((dias == d).sum())} for d in sorted(set(dias))],
    por_dia_semana=[{"dia": DIAS[d], "n": int(m.sum()), "ret_medio": r6(R[m].mean()), "acierto": r6((R[m] > 0).mean())}
                    for d in range(7) if (m := (fechas.dt.dayofweek == d).values).any()],
    por_mes=[{"mes": MESES[mm - 1], "n": int(m.sum()), "ret_medio": r6(R[m].mean()) if m.any() else 0.0}
             for mm in range(1, 13) for m in [(fechas.dt.month == mm).values]],
    payoff=round(float(payoff), 3), expectancy_r=round(float(R.mean() / -per.mean()), 3),
    ganadoras=int((R > 0).sum()), perdedoras=int((R <= 0).sum()),
    ganancia_media=r6(gan.mean()), perdida_media=r6(per.mean()),
)

# ---------- extremos por año ----------
ext = []
for y in sorted(set(fechas.dt.year)):
    idx = np.where(fechas.dt.year.values == y)[0]
    b, w = idx[R[idx].argmax()], idx[R[idx].argmin()]
    ext.append({"anio": int(y), "mejor": {"n": int(b + 1), "fi": trades[b]["fi"], "ret": r6(R[b])},
                "peor": {"n": int(w + 1), "fi": trades[w]["fi"], "ret": r6(R[w])}})

# ---------- velas_full ----------
velas_full = [{"t": ix.strftime("%Y-%m-%d"), "o": r2(o), "h": r2(h), "l": r2(l), "c": r2(c),
               "rsi": None if np.isnan(rs) else round(float(rs), 1), "sma": r2(sm)}
              for ix, o, h, l, c, rs, sm in zip(df.index, df.open, df.high, df.low, df.close, df.rsi, df.sma)]

corte = df.index[int(len(df) * 0.7)].strftime("%Y-%m-%d")

out = dict(base)
out.update(
    trades=trades, cuenta=cuenta, stats_trades=stats, extremos_por_anio=ext, velas_full=velas_full,
    corte_auto={"metodo": "70/30 de los datos disponibles", "fecha": corte,
                "nota": (f"Coincide con el corte del protocolo Sentinel ({f1['fecha_split']})." if corte == f1["fecha_split"] else
                         f"La demo usa el corte del protocolo Sentinel ({f1['fecha_split']}); el 70/30 de las velas cae en {corte}.")},
    reglas_visual={
        "trigger": "El RSI(4) cierra por debajo de 25",
        "filtros": ["El cierre está por encima de la media de 200 sesiones (tendencia alcista)"],
        "salida": ["El RSI(4) cierra por encima de 55"],
        "gestion": "Solo largos, una posición a la vez, 100 % del capital, sin stop ni objetivo fijo",
        "ejecucion": "Señal al cierre diario; orden a mercado en la apertura siguiente (hora servidor Darwinex)",
    },
    core_logic={
        "titulo": "Comprar el susto dentro de una tendencia alcista",
        "ventaja_estructural": ("Reversión a la media de corto plazo dentro de tendencia: las caídas bruscas de pocos días "
                                "suelen ser sobrerreacción, liquidaciones forzadas o toma de beneficios. En un activo con "
                                "deriva alcista como el oro, ese exceso tiende a corregirse en días."),
        "explicacion_simple": ("Cuando el oro está subiendo a largo plazo y de repente cae fuerte varios días, compramos. "
                               "Vendemos en cuanto rebota un poco, sin esperar a que suba mucho."),
        "cuando_falla": ("Falla en tendencias bajistas largas y en caídas que no rebotan, porque compra una caída que "
                         "sigue cayendo. Por eso solo opera con el precio por encima de su media de 200 sesiones."),
    },
    codigo={
        "pine": (RAIZ / "codigo_plataformas" / "oro_rsi4_25_55.pine").read_text(encoding="utf-8"),
        "mql5": (RAIZ / "codigo_plataformas" / "OroRSI4_25_55.mq5").read_text(encoding="utf-8"),
        "notas": ("Pine v6 para TradingView (Añadir al gráfico de XAUUSD diario). El EA MQL5 compila sin errores en "
                  "MetaEditor de Darwinex: copiar a MQL5/Experts, compilar y arrastrar al gráfico XAUUSD D1. Ambos "
                  "usan RSI de Wilder y ejecutan en la apertura siguiente. TradingView no modela el swap y usa otro "
                  "feed, así que sus cifras no cuadrarán al céntimo con las de Sentinel."),
    },
)
dst = RAIZ / "datos" / "oro_rsi4_v3.json"
dst.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(dst, f"{dst.stat().st_size/1e6:.2f} MB")
print(json.dumps({"cuenta": cuenta, **{k: stats[k] for k in ["racha_max_ganadora", "racha_max_perdedora", "mfe_medio",
      "mae_medio", "mfe_medio_ganadoras", "mae_medio_perdedoras", "payoff", "expectancy_r"]}, "corte": corte},
      ensure_ascii=False, indent=1))
