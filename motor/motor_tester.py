# -*- coding: utf-8 -*-
"""motor_tester.py — motor de MEGA CUEVA TESTER (Trade It Simple).

El alumno sube un CSV OHLC, describe su regla con bloques (JSON, ver SPEC.md) y el motor
aplica el método TIS de validación en 5 fases. Python puro (numpy + pandas): corre igual
en local y en el navegador con Pyodide. Sin ficheros, sin hilos, sin dependencias nativas.

API pública
    cargar_csv(texto)               -> DataFrame OHLC (índice = fecha) o ErrorDatos legible
    normalizar_spec(spec)           -> spec completa con valores por defecto, o ErrorSpec legible
    pseudocodigo(spec)              -> la regla en español llano
    validar(df, spec)               -> dict con el formato de datos_terminal_v2.json (+ spec, pseudocodigo, paridad…)
    reconciliar_mt5(trades, texto)  -> cuadre contra el informe del Strategy Tester de MT5
    ejecutar(texto_csv, spec_json)  -> atajo para la interfaz: JSON (str) de validar()
    ejecutar_spec_app(csv, spec_app) -> igual, con la spec v1 del formulario de la app (README); corte "auto" = 70/30

Lógica de ejecución (la misma que el motor de Sentinel, codigo/sentinel/ejecucion.py):
  · la señal se evalúa al CIERRE de la vela t y la orden se ejecuta en la APERTURA de t+1;
  · stop/objetivo se evalúan dentro de la vela (si los dos se tocan en la misma vela, se asume el stop);
  · costes: spread una vez por operación + comisión y deslizamiento por lado; swap por cada día
    natural que la posición cruza la medianoche;
  · equity = producto de (1 + retorno de cada vela) con la fracción del capital del sizing.

Rendimiento: la simulación salta de evento en evento (entradas, salidas, stops) en lugar de recorrer
vela a vela, así que el coste crece con el nº de operaciones, no con el de velas. Se simulan 25
combinaciones (rejilla 5×5) + 1 con costes ×2. El walk-forward NO resimula: re-optimiza eligiendo,
en cada ventana, la mejor de esas 25 corridas ya hechas (igual que Sentinel).
"""
from __future__ import annotations

import io
import json
import math
import re
import time

import numpy as np
import pandas as pd

VERSION = "1.2.0"
MAX_VELAS = 250_000
MIN_VELAS = 300
PF_INF = 99.0

# Umbrales del protocolo TIS (docs/PROTOCOLO_VALIDACION.md de Sentinel). No se bajan.
UMBRAL = dict(
    split=0.70, pf_oos=1.3, n_oos=30, dd_oos=0.20, pf_sin_mejor=1.0,
    wf_is_anios=3, wf_oos_anios=1, wf_paso_anios=1, wf_eficiencia=0.50, wf_pct_pos=0.60, wf_dd=0.20, wf_min_trades_is=10,
    meseta_tol=0.20, meseta_cliff=0.30, meseta_min_trades=20,
    mc_sims=5000, mc_p5_ret=0.0, mc_p95_dd=0.25, mc_ruina=0.50, mc_prob_ruina=0.05,
    stress_factor=2.0, stress_pf=1.1, stress_dd=0.25, stress_min_trades=10, stress_dd_sin_exposicion=0.10,
    anio_regimen_fijo=2022,
)


class ErrorDatos(ValueError):
    """El CSV no se puede leer sin riesgo de analizarlo mal. El mensaje es para el alumno."""


class ErrorSpec(ValueError):
    """La regla (spec) está incompleta o es contradictoria. El mensaje es para el alumno."""


# ═══════════════════════════════════════════════════════════════════════════════════════════════
# 1. CARGA DEL CSV
# ═══════════════════════════════════════════════════════════════════════════════════════════════
def _norm(s) -> str:
    s = str(s).replace("﻿", "").strip().strip("\"'").strip().lower()
    s = s.replace("<", "").replace(">", "").replace("_", " ").replace(".", " ").strip()
    return re.sub(r"\s+", " ", s)


_ALIAS = {
    "fecha": ["date", "fecha", "datetime", "date time", "timestamp", "day", "dia", "día", "fecha/hora", "fecha hora",
              "gmt time", "local time", "date/time", "open time", "opentime", "fechahora", "time (utc)", "datetime utc"],
    "hora": ["time", "hora"],
    "open": ["open", "apertura", "abre", "o", "first", "open price", "precio apertura"],
    "high": ["high", "maximo", "máximo", "max", "alto", "h", "high price"],
    "low": ["low", "minimo", "mínimo", "min", "bajo", "l", "low price"],
    "close": ["close", "cierre", "last", "c", "ultimo", "último", "price", "precio", "close price", "precio cierre"],
    "adj": ["adj close", "adjclose", "adjusted close", "cierre ajustado"],
    "volumen": ["volume", "volumen", "vol", "tickvol", "tick volume", "real volume", "vol ", "tickvolume"],
    "spread": ["spread", "diferencial"],
}
_ALIAS = {k: {_norm(a) for a in v} for k, v in _ALIAS.items()}


def _decodificar(texto) -> str:
    if isinstance(texto, (bytes, bytearray, memoryview)):
        b = bytes(texto)
        if b[:2] in (b"\xff\xfe", b"\xfe\xff"):
            return b.decode("utf-16")
        if b"\x00" in b[:200]:
            return b.decode("utf-16-le", errors="replace")
        try:
            return b.decode("utf-8-sig")
        except UnicodeDecodeError:
            return b.decode("latin-1")
    return str(texto).lstrip("﻿")


def _detectar_separador(lineas: list[str]) -> str:
    mejor, mejor_n = None, 0
    for sep in ["\t", ";", ",", "|"]:
        cuentas = [ln.count(sep) for ln in lineas]
        if not cuentas or min(cuentas) < 1:
            continue
        # separador bueno = mismo nº de apariciones en casi todas las líneas
        moda = max(set(cuentas), key=cuentas.count)
        if cuentas.count(moda) >= 0.8 * len(cuentas) and moda >= 3 and moda > mejor_n:
            mejor, mejor_n = sep, moda
    if mejor is None:
        if all(len(ln.split()) >= 5 for ln in lineas):
            return r"\s+"
        for sep in [";", "\t", ","]:
            cuentas = [ln.count(sep) for ln in lineas]
            if cuentas and min(cuentas) >= 1 and len(set(cuentas)) == 1:
                raise ErrorDatos(f"Solo veo {cuentas[0] + 1} columnas; hacen falta al menos 5: "
                                 "fecha, apertura (Open), máximo (High), mínimo (Low) y cierre (Close).")
        raise ErrorDatos("No encuentro el separador de columnas. El fichero debe tener al menos 5 columnas "
                         "(fecha, apertura, máximo, mínimo, cierre) separadas por coma, punto y coma o tabulador.")
    return mejor


def _es_numero(x: str) -> bool:
    x = str(x).strip().strip("\"'")
    return bool(re.fullmatch(r"-?\d+([.,]\d+)?([eE][-+]?\d+)?", x)) or bool(re.fullmatch(r"-?\d{1,3}(,\d{3})+(\.\d+)?", x))


def _a_numero(s: pd.Series, decimal_coma: bool) -> pd.Series:
    s = s.astype(str).str.strip().str.strip("\"'")
    if decimal_coma:
        s = s.str.replace(".", "", regex=False).str.replace(",", ".", regex=False)
    else:
        s = s.where(~s.str.fullmatch(r"-?\d{1,3}(,\d{3})+(\.\d+)?"), s.str.replace(",", "", regex=False))
    return pd.to_numeric(s, errors="coerce")


_FORMATOS = [
    "%Y.%m.%d %H:%M:%S", "%Y.%m.%d %H:%M", "%Y.%m.%d",
    "%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%d", "%Y-%m-%d %H:%M:%S.%f",
    "%Y/%m/%d %H:%M:%S", "%Y/%m/%d %H:%M", "%Y/%m/%d",
    "%Y%m%d %H:%M:%S", "%Y%m%d %H%M%S", "%Y%m%d",
]
_FORMATOS_DM = ["{d}/{m}/%Y %H:%M:%S", "{d}/{m}/%Y %H:%M", "{d}/{m}/%Y",
                "{d}.{m}.%Y %H:%M:%S", "{d}.{m}.%Y %H:%M", "{d}.{m}.%Y",
                "{d}-{m}-%Y %H:%M:%S", "{d}-{m}-%Y %H:%M", "{d}-{m}-%Y",
                "{d}/{m}/%y", "{d}.{m}.%y"]


def _parsear_fechas(s: pd.Series, avisos: list) -> pd.Series:
    s = s.astype(str).str.strip().str.strip("\"'")
    # Unix (TradingView exporta a veces segundos desde 1970)
    if s.str.fullmatch(r"\d{9,13}(\.\d+)?").mean() > 0.99:
        v = pd.to_numeric(s, errors="coerce")
        unidad = "ms" if v.median() > 1e11 else "s"
        avisos.append(f"Fechas en formato Unix ({'milisegundos' if unidad == 'ms' else 'segundos'}); se interpretan en UTC.")
        return pd.to_datetime(v, unit=unidad, errors="coerce")
    # ISO con zona horaria (TradingView): se conserva la hora local que muestra el fichero
    if s.str.contains(r"\d[T ]\d{1,2}:\d{2}", regex=True).mean() > 0.5 and s.str.contains(r"(?:Z|[+-]\d{2}:?\d{2})$", regex=True).mean() > 0.5:
        s = s.str.replace(r"(Z|[+-]\d{2}:?\d{2})$", "", regex=True)
        avisos.append("Las fechas traen zona horaria: se usa la hora tal como aparece en el fichero (si la regla tiene «sesion», se convierte a la hora de la sesión).")
    s = s.str.replace("T", " ", regex=False)
    mejor, mejor_ok, mejor_fmt = None, 0.0, None
    for f in _FORMATOS:
        r = pd.to_datetime(s, format=f, errors="coerce")
        ok = r.notna().mean()
        if ok > mejor_ok:
            mejor, mejor_ok, mejor_fmt = r, ok, f
        if ok == 1.0:
            break
    if mejor_ok < 0.99:
        dm = [(pd.to_datetime(s, format=f.format(d="%d", m="%m"), errors="coerce"), f.format(d="%d", m="%m")) for f in _FORMATOS_DM]
        md = [(pd.to_datetime(s, format=f.format(d="%m", m="%d").replace("%m/%d", "%m/%d"), errors="coerce"),
               f.format(d="%m", m="%d")) for f in _FORMATOS_DM]
        best_dm = max(dm, key=lambda x: x[0].notna().mean())
        best_md = max(md, key=lambda x: x[0].notna().mean())
        ok_dm, ok_md = best_dm[0].notna().mean(), best_md[0].notna().mean()
        if max(ok_dm, ok_md) > mejor_ok:
            if ok_dm >= ok_md:
                mejor, mejor_ok, mejor_fmt = best_dm[0], ok_dm, best_dm[1]
                if ok_md == ok_dm:
                    avisos.append("Fechas ambiguas (todos los días ≤ 12): se han leído como DÍA/MES/AÑO. "
                                  "Si tu fichero es MES/DÍA/AÑO, conviértelo a AAAA-MM-DD.")
            else:
                mejor, mejor_ok, mejor_fmt = best_md[0], ok_md, best_md[1]
                avisos.append("Fechas leídas como MES/DÍA/AÑO (formato de EE. UU.).")
    if mejor_ok < 0.99:
        try:
            r = pd.to_datetime(s, errors="coerce", format="mixed")
        except (TypeError, ValueError):
            r = pd.to_datetime(s, errors="coerce")
        if r.notna().mean() > mejor_ok:
            mejor, mejor_ok = r, r.notna().mean()
    if mejor is None or mejor_ok < 0.99:
        malos = s[mejor.isna()] if mejor is not None else s
        ej = malos.iloc[0] if len(malos) else s.iloc[0]
        fila = int(malos.index[0]) + 1 if len(malos) else 1
        raise ErrorDatos(f"No entiendo las fechas: {100 * (1 - mejor_ok):.0f} % no se pueden leer "
                         f"(ejemplo en la fila {fila}: «{ej}»). Usa AAAA-MM-DD, AAAA.MM.DD o DD/MM/AAAA, con hora opcional HH:MM.")
    return mejor


def _fechas_utc(s: pd.Series, local: pd.Series):
    """Hora exacta en UTC (naive) si el texto trae zona horaria (ISO con desfase o Z) o es UNIX; si no, None.
    `local` = las mismas fechas ya leídas sin el desfase. UTC = local − desfase, calculado en bloque (pandas con
    desfases por fila carga la base de zonas en cada fila: en el navegador tarda 15 s con 30.000 velas)."""
    s = s.astype(str).str.strip().str.strip("\"'")
    if s.str.fullmatch(r"\d{9,13}(\.\d+)?").mean() > 0.99:
        return pd.DatetimeIndex(local).to_numpy()          # UNIX ya se leyó en UTC
    off = s.str.extract(r"(Z|[+-]\d{2}:?\d{2})$", expand=False)
    if off.notna().mean() <= 0.99:
        return None
    o = off.fillna("Z").str.replace(":", "", regex=False)
    signo = np.where(o.str.startswith("-"), -1, 1)
    hh = pd.to_numeric(o.str[1:3], errors="coerce").fillna(0).to_numpy()
    mm = pd.to_numeric(o.str[3:5], errors="coerce").fillna(0).to_numpy()
    minutos = np.where(o.to_numpy() == "Z", 0, signo * (hh * 60 + mm)).astype("int64")
    return (pd.DatetimeIndex(local) - pd.to_timedelta(minutos, unit="m")).to_numpy()


def _clasificar_columnas(nombres: list[str]) -> dict:
    n = [_norm(x) for x in nombres]
    col = {}
    usados = set()
    for clave in ["adj", "open", "high", "low", "close", "volumen", "spread"]:
        for i, x in enumerate(n):
            if i not in usados and x in _ALIAS[clave]:
                col[clave] = i; usados.add(i); break
    fecha = next((i for i, x in enumerate(n) if x in _ALIAS["fecha"] and i not in usados), None)
    hora = next((i for i, x in enumerate(n) if x in _ALIAS["hora"] and i not in usados and i != fecha), None)
    if fecha is None and hora is not None:   # TradingView: la columna «time» es la fecha completa
        fecha, hora = hora, None
    if fecha is not None:
        col["fecha"] = fecha
    if hora is not None:
        col["hora"] = hora
    return col


def _detectar_tf(idx: pd.DatetimeIndex) -> tuple[str, float]:
    d = np.diff(idx.values.astype("datetime64[s]").astype(np.int64)) / 60.0
    d = d[d > 0]
    if d.size == 0:
        return "?", 0.0
    m = float(np.median(d))
    tabla = [(1, "M1"), (5, "M5"), (15, "M15"), (30, "M30"), (60, "H1"), (240, "H4"), (1440, "D1"), (10080, "W1"), (43200, "MN")]
    tf = min(tabla, key=lambda x: abs(math.log(m / x[0])))[1]
    return tf, m


def _fusionar_fin_de_semana(df: pd.DataFrame) -> pd.DataFrame:
    """Velas D1 de domingo (sesión de la noche) → se funden en el lunes; sábados sueltos → en el viernes.
    Es lo que hace Sentinel con los históricos de Darwinex anteriores a 2013: así cada vela = un día hábil."""
    dow = df.index.dayofweek
    destino = np.arange(len(df))
    for i in np.where(dow == 6)[0]:
        if i + 1 < len(df):
            destino[i] = i + 1
    for i in np.where(dow == 5)[0]:
        if i - 1 >= 0:
            destino[i] = destino[i - 1] if dow[i - 1] == 6 else i - 1
    g = df.groupby(destino)
    agg = {"open": "first", "high": "max", "low": "min", "close": "last"}
    for extra in ("spread", "volumen"):
        if extra in df:
            agg[extra] = "last" if extra == "spread" else "sum"
    out = g.agg(agg)
    out.index = df.index[out.index.to_numpy()]
    return out


def cargar_csv(texto) -> pd.DataFrame:
    """Lee un CSV OHLC (MT5, MT4, TradingView, Yahoo, Investing, genérico). Devuelve un DataFrame con índice de fecha
    y columnas open, high, low, close (+ spread, volumen si existen). df.attrs: tf, avisos, filas_leidas.
    Lanza ErrorDatos con un mensaje claro si algo no se entiende: nunca adivina en silencio."""
    texto = _decodificar(texto)
    lineas = [ln for ln in texto.splitlines() if ln.strip()]
    if len(lineas) < 2:
        raise ErrorDatos("El fichero está vacío o tiene una sola línea.")
    avisos: list[str] = []
    muestra = lineas[:30] if len(lineas) > 30 else lineas
    sep = _detectar_separador(muestra[1:] if len(muestra) > 2 else muestra)
    try:
        crudo = pd.read_csv(io.StringIO("\n".join(lineas)), sep=sep, header=None, dtype=str, skip_blank_lines=True,
                            engine="python" if sep == r"\s+" else "c", on_bad_lines="skip")
    except Exception as e:  # noqa: BLE001
        raise ErrorDatos(f"No puedo leer el fichero como tabla ({e}).")
    crudo = crudo.dropna(axis=1, how="all")
    crudo.columns = range(crudo.shape[1])
    if crudo.shape[1] < 5:
        raise ErrorDatos(f"Solo encuentro {crudo.shape[1]} columnas; hacen falta al menos 5: fecha, apertura, máximo, mínimo, cierre.")
    primera = crudo.iloc[0].fillna("").tolist()
    n_num = sum(_es_numero(x) for x in primera)
    tiene_cabecera = n_num < 3
    if tiene_cabecera:
        nombres = primera
        cuerpo = crudo.iloc[1:].reset_index(drop=True)
        col = _clasificar_columnas(nombres)
        faltan = [k for k in ("fecha", "open", "high", "low", "close") if k not in col]
        if "close" in faltan and "adj" in col:
            col["close"] = col.pop("adj"); faltan.remove("close")
        if faltan:
            nombres_es = {"fecha": "fecha", "open": "apertura (Open)", "high": "máximo (High)", "low": "mínimo (Low)", "close": "cierre (Close)"}
            raise ErrorDatos("No encuentro la(s) columna(s) " + ", ".join(nombres_es[f] for f in faltan) +
                             f". Columnas que veo: {', '.join(str(x) for x in nombres)}.")
        if "adj" in col:
            avisos.append("El fichero trae «Adj Close»; se usa el cierre normal (Close) para ser coherente con apertura/máximo/mínimo.")
    else:
        cuerpo = crudo
        segunda = str(cuerpo.iloc[0, 1]).strip()
        if re.fullmatch(r"\d{1,2}:\d{2}(:\d{2})?", segunda):     # MT4/MT5 «Centro de historial»: fecha, hora, O, H, L, C, vol
            col = {"fecha": 0, "hora": 1, "open": 2, "high": 3, "low": 4, "close": 5}
            if crudo.shape[1] > 6:
                col["volumen"] = 6
        else:
            col = {"fecha": 0, "open": 1, "high": 2, "low": 3, "close": 4}
            if crudo.shape[1] > 5:
                col["volumen"] = 5
        avisos.append("El fichero no tiene cabecera: se asume el orden fecha" + (", hora" if "hora" in col else "") +
                      ", apertura, máximo, mínimo, cierre" + (", volumen" if "volumen" in col else "") + ".")
    filas = len(cuerpo)
    if filas < MIN_VELAS:
        raise ErrorDatos(f"Hacen falta al menos {MIN_VELAS} velas para validar una estrategia; el fichero tiene {filas}.")
    if filas > MAX_VELAS:
        raise ErrorDatos(f"El fichero tiene {filas:,} velas; el máximo en el navegador es {MAX_VELAS:,}. "
                         "Usa una temporalidad mayor o recorta el periodo.".replace(",", "."))
    # decimal con coma (Excel en español: 1234,56 con separador ;)
    muestra_px = cuerpo[col["close"]].astype(str).head(200)
    decimal_coma = sep != "," and muestra_px.str.fullmatch(r"-?\d+,\d+").mean() > 0.5
    if decimal_coma:
        avisos.append("Decimales con coma detectados (formato español).")
    fechas_txt = cuerpo[col["fecha"]].astype(str).str.strip()
    if "hora" in col:
        fechas_txt = fechas_txt + " " + cuerpo[col["hora"]].astype(str).str.strip()
    fechas = _parsear_fechas(fechas_txt, avisos)
    df = pd.DataFrame({k: _a_numero(cuerpo[col[k]], decimal_coma).to_numpy() for k in ("open", "high", "low", "close")},
                      index=pd.DatetimeIndex(fechas.to_numpy()))
    utc = _fechas_utc(fechas_txt, fechas)
    if utc is not None:
        df["_utc"] = utc
    for extra in ("spread", "volumen"):
        if extra in col:
            df[extra] = _a_numero(cuerpo[col[extra]], decimal_coma).to_numpy()
    df.index.name = "fecha"
    malos = df[["open", "high", "low", "close"]].isna().any(axis=1)
    if malos.mean() > 0.02:
        i = int(np.flatnonzero(malos.to_numpy())[0])
        raise ErrorDatos(f"{100 * malos.mean():.0f} % de las filas tienen precios que no son números "
                         f"(primera: fila {i + 1 + int(tiene_cabecera)}). Revisa el separador decimal y que no haya texto en los precios.")
    if malos.any():
        avisos.append(f"{int(malos.sum())} fila(s) con precios vacíos o no numéricos descartadas.")
        df = df[~malos.to_numpy()]
    df = df[df.index.notna()]
    if not df.index.is_monotonic_increasing:
        avisos.append("Las velas no estaban en orden cronológico; se han ordenado (de la más antigua a la más reciente).")
        df = df.sort_index(kind="mergesort")
    dup = df.index.duplicated(keep="last")
    if dup.any():
        avisos.append(f"{int(dup.sum())} vela(s) con fecha repetida; se conserva la última.")
        df = df[~dup]
    # coherencia OHLC: si el máximo casi nunca es el máximo, las columnas están cambiadas
    o, h, l, c = (df[k].to_numpy() for k in ("open", "high", "low", "close"))
    tol = 1e-9 * np.abs(c)
    incoh = (h + tol < np.maximum(o, c)) | (l - tol > np.minimum(o, c))
    if incoh.mean() > 0.05:
        raise ErrorDatos(f"En el {100 * incoh.mean():.0f} % de las velas el máximo/mínimo no envuelve a la apertura y el cierre. "
                         "Parece que las columnas están en otro orden (debe ser Open, High, Low, Close).")
    malas = (h < l) | (c <= 0) | (o <= 0)
    if malas.any():
        avisos.append(f"{int(malas.sum())} vela(s) imposibles (máximo < mínimo o precio ≤ 0) descartadas.")
        df = df[~malas]
    if incoh.any():
        avisos.append(f"{int(incoh.sum())} vela(s) con apertura/cierre fuera del rango máximo-mínimo (se conservan).")
    tf, med_min = _detectar_tf(df.index)
    if tf == "D1":
        dow = df.index.dayofweek
        finde = (dow >= 5).mean()
        if 0 < finde < 0.05:
            n0 = len(df)
            df = _fusionar_fin_de_semana(df)
            avisos.append(f"{n0 - len(df)} vela(s) de sábado/domingo (sesiones sueltas del broker) fundidas con el día hábil contiguo.")
    if len(df) < MIN_VELAS:
        raise ErrorDatos(f"Tras limpiar el fichero quedan {len(df)} velas; hacen falta al menos {MIN_VELAS}.")
    dif = np.diff(df.index.values.astype("datetime64[s]").astype(np.int64)) / 60.0
    if med_min > 0 and dif.size:
        lim = max(30 * med_min, 14 * 1440 if tf in ("D1", "H4", "H1") else 5 * 1440)   # intradía: noches y fines de semana no son huecos
        huecos = np.flatnonzero(dif > lim)
        if huecos.size:
            k = huecos[0]
            avisos.append(f"{huecos.size} hueco(s) grandes en el histórico (p. ej. de {df.index[k].date()} a {df.index[k + 1].date()}).")
    df.attrs["tf"] = tf
    df.attrs["avisos"] = avisos
    df.attrs["filas_leidas"] = int(filas)
    return df


# ═══════════════════════════════════════════════════════════════════════════════════════════════
# 2. LA REGLA (spec) — normalización y validación
# ═══════════════════════════════════════════════════════════════════════════════════════════════
INDICADORES = {
    # nombre: (parámetros por defecto, es_precio)
    "close": ({}, True), "open": ({}, True), "high": ({}, True), "low": ({}, True),
    "volumen": ({}, False), "valor": ({"valor": 0.0}, False),
    "sma": ({"n": 20, "fuente": "close"}, True), "ema": ({"n": 20, "fuente": "close"}, True),
    "rsi": ({"n": 14, "fuente": "close"}, False), "atr": ({"n": 14}, False),
    "bollinger_sup": ({"n": 20, "k": 2.0, "fuente": "close"}, True),
    "bollinger_inf": ({"n": 20, "k": 2.0, "fuente": "close"}, True),
    "bollinger_media": ({"n": 20, "fuente": "close"}, True),
    "max_n": ({"n": 20, "fuente": "high"}, True), "min_n": ({"n": 20, "fuente": "low"}, True),
    "cambio_pct": ({"n": 1, "fuente": "close"}, False), "ibs": ({}, False),
    "dia_semana": ({}, False), "hora": ({}, False), "mes": ({}, False),
    # sesión intradía (necesitan «sesion»): sesión anterior, sesión actual hasta ahora, vela k de la sesión, nº de vela
    "sesion_anterior_max": ({}, True), "sesion_anterior_min": ({}, True),
    "sesion_anterior_apertura": ({}, True), "sesion_anterior_cierre": ({}, True),
    "sesion_max": ({}, True), "sesion_min": ({}, True), "sesion_apertura": ({}, True),
    "vela_sesion_max": ({"k": 1}, True), "vela_sesion_min": ({"k": 1}, True),
    "vela_sesion_apertura": ({"k": 1}, True), "vela_sesion_cierre": ({"k": 1}, True),
    "vela_sesion": ({}, False), "en_sesion": ({}, False),
    "nivel": ({"nombre": ""}, True),
}
_OPS_SESION = {k for k in INDICADORES if k.startswith(("sesion_", "vela_sesion")) or k == "en_sesion"}
_SINONIMOS = {"cierre": "close", "apertura": "open", "maximo": "high", "máximo": "high", "minimo": "low", "mínimo": "low",
              "media": "sma", "media_simple": "sma", "media_exponencial": "ema", "volume": "volumen", "roc": "cambio_pct",
              "maximo_n": "max_n", "minimo_n": "min_n", "bb_sup": "bollinger_sup", "bb_inf": "bollinger_inf"}
COMPARADORES = {">", "<", ">=", "<=", "cruza_arriba", "cruza_abajo"}


def _ind_nombre(x) -> str:
    n = str(x).strip().lower()
    n = _SINONIMOS.get(n, n)
    if n not in INDICADORES:
        raise ErrorSpec(f"Indicador desconocido «{x}». Disponibles: {', '.join(sorted(INDICADORES))}.")
    return n


def _operando(d) -> dict:
    """Normaliza un operando: {'indicador': 'rsi', 'n': 4, ...}. Acepta los parámetros planos o dentro de 'params'."""
    if isinstance(d, (int, float, str)) and not isinstance(d, bool):
        return {"indicador": "valor", "valor": d}
    if not isinstance(d, dict):
        raise ErrorSpec(f"Operando no válido: {d!r}")
    nombre = _ind_nombre(d.get("indicador", d.get("ind", "")))
    out = {"indicador": nombre}
    out.update(INDICADORES[nombre][0])
    params = dict(d.get("params") or d.get("parametros") or {})
    for k, v in d.items():
        if k in ("n", "k", "fuente", "desfase", "factor", "suma", "valor", "nombre", "_nivel"):
            params[k] = v
    out.update(params)
    if "fuente" in out:
        out["fuente"] = _ind_nombre(out["fuente"]) if out["fuente"] else "close"
        if out["fuente"] not in ("close", "open", "high", "low", "volumen"):
            raise ErrorSpec(f"La fuente de {nombre} debe ser close, open, high, low o volumen (no «{out['fuente']}»).")
    return out


def _grupo(g, donde: str):
    """Grupo de condiciones → {'op': 'Y'|'O', 'bloques': [...]} o None (sin condición)."""
    if g is None or g == [] or g == {}:
        return None
    if isinstance(g, list):
        g = {"op": "Y", "bloques": g}
    if not isinstance(g, dict):
        raise ErrorSpec(f"{donde}: debe ser una lista de bloques o un grupo {{op, bloques}}.")
    if "bloques" not in g:            # un bloque suelto
        g = {"op": "Y", "bloques": [g]}
    op = str(g.get("op", "Y")).upper().replace("AND", "Y").replace("OR", "O")
    if op not in ("Y", "O"):
        raise ErrorSpec(f"{donde}: «op» debe ser Y u O.")
    bloques = []
    for i, b in enumerate(g["bloques"]):
        if isinstance(b, dict) and "bloques" in b:
            sub = _grupo(b, f"{donde} › grupo {i + 1}")
            if sub:
                bloques.append(sub)
            continue
        if not isinstance(b, dict):
            raise ErrorSpec(f"{donde} › bloque {i + 1}: formato no válido.")
        comp = str(b.get("comparador", b.get("comp", ""))).strip().lower()
        if comp not in COMPARADORES:
            raise ErrorSpec(f"{donde} › bloque {i + 1}: comparador «{comp}» no válido; usa >, <, >=, <=, cruza_arriba o cruza_abajo.")
        izq = _operando({k: v for k, v in b.items() if k not in ("comparador", "comp", "contra", "valor")} | (
            {"valor": b["valor"]} if _ind_nombre(b.get("indicador", b.get("ind", ""))) == "valor" else {}))
        if "contra" in b and b["contra"] is not None:
            der = _operando(b["contra"])
        elif "valor" in b:
            der = _operando(b["valor"]) if isinstance(b["valor"], dict) else {"indicador": "valor", "valor": b["valor"]}
        else:
            raise ErrorSpec(f"{donde} › bloque {i + 1}: falta con qué comparar («valor» o «contra»).")
        bloques.append({"izq": izq, "comparador": comp, "der": der})
    return {"op": op, "bloques": bloques} if bloques else None


def _nivel(d, que: str):
    if d is None or d is False or d == {}:
        return None
    t = str(d.get("tipo", "")).lower()
    if t in ("ninguno", "none", ""):
        return None
    if t == "atr":
        return {"tipo": "atr", "n": d.get("n", 14), "k": d.get("k", 2.0)}
    if t == "nivel":
        op = d.get("operando", d.get("valor"))
        if op is None:
            raise ErrorSpec(f"{que}: con tipo «nivel» hace falta «operando» (p. ej. el mínimo de la vela de la señal).")
        out = {"tipo": "nivel", "operando": _operando(op)}
        if d.get("operando_corto") is not None:
            out["operando_corto"] = _operando(d["operando_corto"])
        return out
    if t in ("pct", "%", "porcentaje"):
        if "valor" not in d:
            raise ErrorSpec(f"{que}: con tipo «pct» hace falta «valor» (en %).")
        return {"tipo": "pct", "valor": d["valor"]}
    raise ErrorSpec(f"{que}: tipo «{t}» no válido (usa «atr» o «pct»).")


def _pasos(lista, lado: str):
    """Secuencia de pasos con nombre (máquina de estados): [{nombre, cuando, ventana:{tipo, velas}}]."""
    if not lista:
        return None
    if not isinstance(lista, list):
        raise ErrorSpec(f"Pasos {lado}: debe ser una lista.")
    out = []
    for i, p in enumerate(lista):
        if not isinstance(p, dict):
            raise ErrorSpec(f"Pasos {lado} › paso {i + 1}: formato no válido.")
        nombre = str(p.get("nombre") or f"PASO {i + 1}")
        g = _grupo(p.get("cuando", p.get("condiciones")), f"Paso «{nombre}»")
        if g is None:
            raise ErrorSpec(f"Paso «{nombre}»: falta la condición.")
        v = p.get("ventana") or None
        if v:
            t = str(v.get("tipo", "")).lower()
            t = {"primeras_velas": "primeras_velas_sesion", "velas_siguientes": "velas_tras_anterior",
                 "velas_tras_paso_anterior": "velas_tras_anterior"}.get(t, t)
            if t not in ("primeras_velas_sesion", "velas_tras_anterior"):
                raise ErrorSpec(f"Paso «{nombre}»: ventana «{t}» no válida (primeras_velas_sesion o velas_tras_anterior).")
            if t == "velas_tras_anterior" and i == 0:
                raise ErrorSpec(f"Paso «{nombre}»: es el primero; no hay paso anterior desde el que contar velas.")
            if v.get("velas") in (None, ""):
                raise ErrorSpec(f"Paso «{nombre}»: falta el nº de velas de la ventana.")
            v = {"tipo": t, "velas": v["velas"]}
        out.append({"nombre": nombre, "cuando": g, "ventana": v})
    return out


_ZONAS = {"nueva_york": "America/New_York", "new_york": "America/New_York", "ny": "America/New_York",
          "madrid": "Europe/Madrid", "londres": "Europe/London", "utc": "UTC", "servidor_gmt3_usdst": "Etc/GMT-3"}


def _sesion_spec(d):
    if not d:
        return None
    if not isinstance(d, dict):
        raise ErrorSpec("«sesion» debe ser {zona_horaria, inicio, fin}.")
    tz = str(d.get("zona_horaria") or d.get("zona") or "America/New_York")
    tz = _ZONAS.get(tz.lower(), tz)
    try:
        pd.Timestamp("2024-01-02").tz_localize(tz)
    except Exception:  # noqa: BLE001
        raise ErrorSpec(f"Zona horaria «{tz}» desconocida (usa p. ej. America/New_York, Europe/Madrid o UTC).")
    zd = d.get("zona_datos")
    zd = None if zd in (None, "", "auto", "misma") else _ZONAS.get(str(zd).lower(), str(zd))
    out = {"zona_horaria": tz, "inicio": str(d.get("inicio", "09:30")), "fin": str(d.get("fin", "16:00")),
           "zona_datos": zd, "cerrar_al_final": bool(d.get("cerrar_al_final", True))}
    out["inicio_min"] = _hhmm(out["inicio"], "inicio"); out["fin_min"] = _hhmm(out["fin"], "fin")
    if out["inicio_min"] == out["fin_min"]:
        raise ErrorSpec("Sesión: inicio y fin no pueden ser la misma hora.")
    return out


def _recorrer_ops(s: dict, fn):
    """Aplica fn(operando) → operando a todos los operandos de la regla (grupos, pasos, stop/objetivo de tipo nivel)."""
    def grupo(g):
        if not g:
            return
        for b in g["bloques"]:
            if "bloques" in b:
                grupo(b)
            else:
                b["izq"] = fn(b["izq"]); b["der"] = fn(b["der"])
    grupo(s["filtros"])
    for lado in ("largo", "corto"):
        r = s[lado]
        for k in ("filtros", "entrada", "salida"):
            grupo(r[k])
        for p in r.get("pasos") or []:
            grupo(p["cuando"])
    for k in ("stop", "objetivo"):
        if s.get(k) and s[k]["tipo"] == "nivel":
            s[k]["operando"] = fn(s[k]["operando"])
            if s[k].get("operando_corto"):
                s[k]["operando_corto"] = fn(s[k]["operando_corto"])


def _poner_niveles(s: dict):
    niv = s["niveles"]

    def fn(op):
        if op.get("indicador") != "nivel":
            return op
        nom = str(op.get("nombre", ""))
        if nom not in niv:
            raise ErrorSpec(f"Nivel «{nom}» no definido en «niveles» (definidos: {', '.join(niv) or 'ninguno'}).")
        base = niv[nom]
        if base.get("indicador") == "nivel":
            raise ErrorSpec(f"Nivel «{nom}»: un nivel no puede apuntar a otro nivel.")
        return {**base, **{k: v for k, v in op.items() if k in ("desfase", "factor", "suma")}, "_nivel": nom}
    _recorrer_ops(s, fn)


def _usa_ops_sesion(s: dict) -> bool:
    hay = []

    def fn(op):
        hay.append(op["indicador"] in _OPS_SESION)
        return op
    _recorrer_ops(s, fn)
    return any(hay) or any(p.get("ventana") and p["ventana"]["tipo"] == "primeras_velas_sesion"
                           for lado in ("largo", "corto") for p in (s[lado].get("pasos") or []))


def _rejilla_auto(nombre, v):
    if isinstance(v, bool) or not isinstance(v, (int, float)):
        raise ErrorSpec(f"El parámetro «{nombre}» no es numérico; no se puede usar en la meseta.")
    if isinstance(v, int) or float(v).is_integer():
        paso = max(1, int(round(abs(v) * 0.1)))
        vals = [int(v) + paso * k for k in (-2, -1, 0, 1, 2)]
        if v >= 1 and vals[0] < 1:          # periodos y nº de velas: nunca < 1 (el canónico se desplaza del centro)
            vals = [1 + paso * k for k in range(5)] if (int(v) - 1) % paso == 0 else [1, 2, 3, 4, 5]
        return vals
    paso = abs(v) * 0.1 or 0.1
    return [round(v + paso * k, 6) for k in (-2, -1, 0, 1, 2)]


def normalizar_spec(spec) -> dict:
    """Valida la regla y completa los valores por defecto. Devuelve una copia lista para el motor."""
    if isinstance(spec, str):
        try:
            spec = json.loads(spec)
        except json.JSONDecodeError as e:
            raise ErrorSpec(f"La regla no es un JSON válido: {e}")
    if not isinstance(spec, dict):
        raise ErrorSpec("La regla debe ser un objeto JSON.")
    s = {}
    s["nombre"] = str(spec.get("nombre") or "Mi estrategia")
    s["activo"] = str(spec.get("activo") or "ACTIVO")
    s["temporalidad"] = str(spec.get("temporalidad") or "").upper() or None
    d = str(spec.get("direccion", "largo")).lower()
    d = {"long": "largo", "short": "corto", "both": "ambos", "largos": "largo", "cortos": "corto"}.get(d, d)
    if d not in ("largo", "corto", "ambos"):
        raise ErrorSpec("«direccion» debe ser largo, corto o ambos.")
    s["direccion"] = d
    s["parametros"] = dict(spec.get("parametros") or {})
    s["filtros"] = _grupo(spec.get("filtros"), "Filtros")
    for lado in ("largo", "corto"):
        r = spec.get(lado) or {}
        if lado == "largo" and not r and d in ("largo", "ambos") and ("entrada" in spec):
            r = {"entrada": spec.get("entrada"), "salida": spec.get("salida")}
        if lado == "corto" and not r and d == "corto" and ("entrada" in spec):
            r = {"entrada": spec.get("entrada"), "salida": spec.get("salida")}
        s[lado] = {"filtros": _grupo(r.get("filtros"), f"Filtros {lado}"),
                   "entrada": _grupo(r.get("entrada"), f"Entrada {lado}"),
                   "salida": _grupo(r.get("salida"), f"Salida {lado}"),
                   "pasos": _pasos(r.get("pasos") or r.get("secuencia"), lado)}
    lados = ["largo"] if d == "largo" else ["corto"] if d == "corto" else ["largo", "corto"]
    for lado in lados:
        if s[lado]["entrada"] is None and not s[lado]["pasos"]:
            raise ErrorSpec(f"Falta la condición de ENTRADA para {lado}s.")
    s["stop"] = _nivel(spec.get("stop"), "Stop")
    s["objetivo"] = _nivel(spec.get("objetivo"), "Objetivo")
    st = spec.get("salida_tiempo")
    if isinstance(st, dict):
        st = st.get("barras", st.get("velas"))
    s["salida_tiempo"] = int(st) if st else 0
    for lado in lados:
        if s[lado]["salida"] is None and not s["stop"] and not s["objetivo"] and not s["salida_tiempo"]:
            raise ErrorSpec(f"Los {lado}s no tienen forma de salir: añade una condición de salida, un stop, un objetivo o una salida por tiempo.")
    sz = dict(spec.get("sizing") or {"tipo": "nocional", "pct": 100})
    t = str(sz.get("tipo", "nocional")).lower()
    if t == "nocional":
        pct = float(sz.get("pct", 100))
        if not 0 < pct <= 100:
            raise ErrorSpec("Sizing nocional: «pct» debe estar entre 0 y 100 (sin apalancamiento).")
        s["sizing"] = {"tipo": "nocional", "pct": pct}
    elif t == "riesgo":
        if not s["stop"]:
            raise ErrorSpec("El sizing por riesgo necesita un stop (si no, no hay distancia a la que arriesgar).")
        s["sizing"] = {"tipo": "riesgo", "pct": float(sz.get("pct", 1.0)), "apalancamiento_max": float(sz.get("apalancamiento_max", 1.0))}
    else:
        raise ErrorSpec("«sizing.tipo» debe ser nocional o riesgo.")
    c = dict(spec.get("costes") or {})
    s["costes"] = {k: float(c.get(k, 0.0)) for k in ("spread_pb", "comision_pb_lado", "deslizamiento_pb_lado",
                                                       "swap_largo_pb_dia", "swap_corto_pb_dia")}
    corte = spec.get("corte") or {"tipo": "pct", "valor": 70}
    if str(corte.get("tipo", "pct")) == "fecha":
        try:
            pd.Timestamp(corte["valor"])
        except Exception:  # noqa: BLE001
            raise ErrorSpec(f"Fecha de corte IS/OOS no válida: {corte.get('valor')!r}")
        s["corte"] = {"tipo": "fecha", "valor": str(corte["valor"])}
    else:
        v = float(corte.get("valor", 70))
        if not 30 <= v <= 90:
            raise ErrorSpec("El corte IS/OOS en % debe estar entre 30 y 90 (TIS usa 70).")
        s["corte"] = {"tipo": "pct", "valor": v}
    # ejecución: apertura de la vela siguiente (por defecto) o cierre de la misma vela
    ej = spec.get("ejecucion")
    mom = str((ej.get("momento") if isinstance(ej, dict) else ej) or "apertura_siguiente").lower()
    mom = "cierre_misma_vela" if mom.startswith("cierre") else "apertura_siguiente" if mom.startswith(("apertura", "señal")) else mom
    if mom not in ("apertura_siguiente", "cierre_misma_vela"):
        raise ErrorSpec("«ejecucion» debe ser apertura_siguiente o cierre_misma_vela.")
    s["momento"] = mom
    s["ejecucion"] = ("señal al cierre de la vela; orden a mercado en la apertura de la vela siguiente" if mom == "apertura_siguiente"
                      else "señal al cierre de la vela; orden a mercado al CIERRE de esa misma vela")
    ses_in = spec.get("sesion")
    s["sesion"] = _sesion_spec(ses_in)
    mx = spec.get("max_operaciones_dia")
    if mx in (None, "", 0) and isinstance(ses_in, dict):
        mx = ses_in.get("max_operaciones_dia")
    s["max_operaciones_dia"] = mx if mx not in (None, "", 0) else None
    # niveles con nombre: se sustituyen en todos los bloques (el texto conserva el nombre)
    niv = spec.get("niveles") or {}
    if isinstance(niv, list):
        niv = {x.get("nombre"): x.get("valor", x.get("operando")) for x in niv}
    s["niveles"] = {str(k): _operando(v) for k, v in niv.items()}
    _poner_niveles(s)
    if _usa_ops_sesion(s) and not s["sesion"]:
        raise ErrorSpec("La regla usa datos de sesión (sesión anterior, vela de la sesión, primeras velas…): "
                        "define «sesion» con zona horaria, inicio y fin.")
    # parámetros optimizables: 2 ejes × 5 valores con el canónico en el centro
    opt = spec.get("optimizar") or {}
    if not opt:
        numericos = [k for k, v in s["parametros"].items() if isinstance(v, (int, float)) and not isinstance(v, bool)]
        if len(numericos) >= 2:
            opt = {numericos[0]: None, numericos[1]: None}
    if opt and len(opt) != 2:
        raise ErrorSpec("«optimizar» debe tener exactamente 2 parámetros (los ejes de la meseta).")
    grid = {}
    for k, v in opt.items():
        if k not in s["parametros"]:
            raise ErrorSpec(f"«optimizar» usa «{k}», que no está en «parametros».")
        canon = s["parametros"][k]
        if v is None or isinstance(v, dict):
            vals = _rejilla_auto(k, canon) if not (isinstance(v, dict) and "paso" in v) else \
                [canon + v["paso"] * j for j in (-2, -1, 0, 1, 2)]
        else:
            vals = list(v)
        if len(vals) != 5 or canon not in vals[1:4]:
            raise ErrorSpec(f"Eje «{k}»: hacen falta 5 valores con el canónico ({canon}) en el centro (o en 2.ª/4.ª posición "
                            f"si no caben valores menores); recibido {vals}.")
        grid[k] = vals
    s["optimizar"] = grid
    _comprobar_refs(s)
    return s


def _refs(obj, acc: set):
    if isinstance(obj, dict):
        for v in obj.values():
            _refs(v, acc)
    elif isinstance(obj, list):
        for v in obj:
            _refs(v, acc)
    elif isinstance(obj, str) and obj.startswith("$"):
        acc.add(obj[1:])


def _comprobar_refs(s: dict):
    acc: set = set()
    _refs({k: s[k] for k in ("filtros", "largo", "corto", "stop", "objetivo")}, acc)
    faltan = sorted(a for a in acc if a not in s["parametros"])
    if faltan:
        raise ErrorSpec("La regla usa parámetro(s) que no están definidos en «parametros»: " + ", ".join("$" + f for f in faltan))


def _r(v, P):
    """Resuelve una referencia «$nombre» al valor del parámetro."""
    if isinstance(v, str) and v.startswith("$"):
        return P[v[1:]]
    return v


# ═══════════════════════════════════════════════════════════════════════════════════════════════
# 3. INDICADORES (mismas fórmulas que codigo/sentinel/indicadores.py)
# ═══════════════════════════════════════════════════════════════════════════════════════════════
def rsi_wilder(s: pd.Series, n: int) -> pd.Series:
    d = s.diff()
    g = d.clip(lower=0); l = (-d).clip(lower=0)
    ag = g.ewm(alpha=1.0 / n, min_periods=n, adjust=False).mean()
    al = l.ewm(alpha=1.0 / n, min_periods=n, adjust=False).mean()
    return 100 - 100 / (1 + ag / al.replace(0, np.nan))


def _atr(df: pd.DataFrame, n: int) -> pd.Series:
    pc = df.close.shift(1)
    tr = pd.concat([df.high - df.low, (df.high - pc).abs(), (df.low - pc).abs()], axis=1).max(axis=1)
    return tr.ewm(alpha=1.0 / n, min_periods=n, adjust=False).mean()


def _calc(df: pd.DataFrame, op: dict, P: dict, cache: dict) -> np.ndarray:
    """Valor del operando en cada vela (float, NaN donde no está definido)."""
    q = {k: _r(v, P) for k, v in op.items()}
    clave = json.dumps(q, sort_keys=True, default=str)
    if clave in cache:
        return cache[clave]
    nombre = q["indicador"]
    n = int(q["n"]) if "n" in q else None
    if n is not None and n < 1:
        raise ErrorSpec(f"{nombre}: el periodo n debe ser ≥ 1.")
    fuente = df[q["fuente"]] if "fuente" in q and q["fuente"] in df else df.close
    if nombre in ("close", "open", "high", "low"):
        v = df[nombre]
    elif nombre == "volumen":
        if "volumen" not in df:
            raise ErrorSpec("La regla usa el volumen, pero el CSV no tiene columna de volumen.")
        v = df["volumen"]
    elif nombre == "valor":
        v = pd.Series(float(q["valor"]), index=df.index)
    elif nombre == "sma":
        v = fuente.rolling(n, min_periods=n).mean()
    elif nombre == "ema":
        v = fuente.ewm(span=n, min_periods=n, adjust=False).mean()
    elif nombre == "rsi":
        v = rsi_wilder(fuente, n)
    elif nombre == "atr":
        v = _atr(df, n)
    elif nombre in ("bollinger_sup", "bollinger_inf", "bollinger_media"):
        m = fuente.rolling(n, min_periods=n).mean()
        sd = fuente.rolling(n, min_periods=n).std(ddof=0)
        k = float(q.get("k", 2.0))
        v = m + k * sd if nombre == "bollinger_sup" else m - k * sd if nombre == "bollinger_inf" else m
    elif nombre == "max_n":      # máximo de las n velas ANTERIORES (sin la actual): sirve para rupturas
        v = fuente.rolling(n, min_periods=n).max().shift(1)
    elif nombre == "min_n":
        v = fuente.rolling(n, min_periods=n).min().shift(1)
    elif nombre == "cambio_pct":
        v = (fuente / fuente.shift(n) - 1.0) * 100.0
    elif nombre == "ibs":
        rng = (df.high - df.low).replace(0, np.nan)
        v = ((df.close - df.low) / rng).fillna(0.5)
    elif nombre == "dia_semana":
        v = pd.Series(df.index.dayofweek + 1, index=df.index, dtype=float)
    elif nombre == "hora":
        v = pd.Series(df.index.hour, index=df.index, dtype=float)
    elif nombre == "mes":
        v = pd.Series(df.index.month, index=df.index, dtype=float)
    elif nombre in _OPS_SESION:
        info = cache.get("__sesion__")
        if info is None:
            raise ErrorSpec(f"«{nombre}» es un dato de sesión: define «sesion» (zona horaria, inicio y fin).")
        v = pd.Series(info.calc(nombre, int(q.get("k", 1))), index=df.index)
    elif nombre == "nivel":
        raise ErrorSpec(f"Nivel «{q.get('nombre')}» no definido en «niveles».")
    else:  # pragma: no cover
        raise ErrorSpec(f"Indicador no implementado: {nombre}")
    d = int(q.get("desfase", 0) or 0)
    if d:
        v = v.shift(d)
    arr = v.to_numpy(dtype=np.float64, na_value=np.nan) * float(q.get("factor", 1.0)) + float(q.get("suma", 0.0) or 0.0)
    cache[clave] = arr
    return arr


def _eval_grupo(df, g, P, cache) -> np.ndarray | None:
    if g is None:
        return None
    res = None
    for b in g["bloques"]:
        if "bloques" in b:
            x = _eval_grupo(df, b, P, cache)
        else:
            a = _calc(df, b["izq"], P, cache); c = _calc(df, b["der"], P, cache)
            comp = b["comparador"]
            with np.errstate(invalid="ignore"):
                if comp == ">":
                    x = a > c
                elif comp == "<":
                    x = a < c
                elif comp == ">=":
                    x = a >= c
                elif comp == "<=":
                    x = a <= c
                else:
                    a1 = np.r_[np.nan, a[:-1]]; c1 = np.r_[np.nan, c[:-1]]
                    x = (a > c) & (a1 <= c1) if comp == "cruza_arriba" else (a < c) & (a1 >= c1)
            x = np.asarray(x, dtype=bool)
        res = x if res is None else (res & x if g["op"] == "Y" else res | x)
    return res


# ═══════════════════════════════════════════════════════════════════════════════════════════════
# 4. SIMULACIÓN (evento a evento)
# ═══════════════════════════════════════════════════════════════════════════════════════════════
class _Datos:
    """Arrays de precios precalculados una vez por validación."""

    def __init__(self, df: pd.DataFrame):
        self.df = df
        self.idx = df.index
        self.o = df.open.to_numpy(float); self.h = df.high.to_numpy(float)
        self.l = df.low.to_numpy(float); self.c = df.close.to_numpy(float)
        self.n = len(df)
        dia = df.index.normalize().values.astype("datetime64[D]").astype(np.int64)
        self.dias = np.r_[0, np.diff(dia)].astype(float)           # días naturales que cruza cada vela
        self.ret_cc = np.r_[0.0, self.c[1:] / self.c[:-1] - 1.0]    # cierre a cierre


class Corrida:
    def __init__(self, P, trades, r_bar, idx):
        self.p = P
        self.trades = trades          # DataFrame
        self.r = r_bar                # np.ndarray
        self.idx = idx                # DatetimeIndex
        self.cp = np.r_[1.0, np.cumprod(1.0 + r_bar)]
        self.i_in = trades.i_in.to_numpy() if len(trades) else np.zeros(0, int)

    @property
    def r_bar(self) -> pd.Series:
        return pd.Series(self.r, index=self.idx, name="r")


def _senales(D: _Datos, s: dict, P: dict, cache: dict):
    n = D.n
    falso = np.zeros(n, dtype=bool)
    filtro = _eval_grupo(D.df, s["filtros"], P, cache)
    out = {}
    for lado in ("largo", "corto"):
        activo = s["direccion"] == lado or s["direccion"] == "ambos"
        if not activo:
            out[lado] = (falso, falso)
            continue
        r = s[lado]
        ent = _eval_grupo(D.df, r["entrada"], P, cache)
        if ent is None:
            ent = falso.copy()
        for f in (filtro, _eval_grupo(D.df, r["filtros"], P, cache)):
            if f is not None:
                ent = ent & f
        sal = _eval_grupo(D.df, r["salida"], P, cache)
        out[lado] = (ent, falso if sal is None else sal)
    return out


def _correr(D: _Datos, s: dict, P: dict, cache: dict, factor_costes: float = 1.0) -> Corrida:
    if _usa_simulador_pasos(s):
        return _correr_pasos(D, s, P, cache, factor_costes)
    cst = s["costes"]
    k = factor_costes
    coste_lado = (cst["spread_pb"] + 2 * (cst["deslizamiento_pb_lado"] + cst["comision_pb_lado"])) / 1e4 / 2.0 * k
    sw = {1: D.dias * cst["swap_largo_pb_dia"] / 1e4 * k, -1: D.dias * cst["swap_corto_pb_dia"] / 1e4 * k}
    sig = _senales(D, s, P, cache)
    ent_l, sal_l = sig["largo"]; ent_s, sal_s = sig["corto"]
    idx_ent = np.flatnonzero(ent_l | ent_s)
    idx_sal = {1: np.flatnonzero(sal_l), -1: np.flatnonzero(sal_s)}
    stop_cfg, obj_cfg = s["stop"], s["objetivo"]
    atr_stop = _calc(D.df, {"indicador": "atr", "n": stop_cfg["n"]}, P, cache) if stop_cfg and stop_cfg["tipo"] == "atr" else None
    atr_obj = _calc(D.df, {"indicador": "atr", "n": obj_cfg["n"]}, P, cache) if obj_cfg and obj_cfg["tipo"] == "atr" else None
    sz = s["sizing"]
    max_barras = int(s["salida_tiempo"] or 0)
    o, h, l, c, n = D.o, D.h, D.l, D.c, D.n
    filas = []
    t_min = 0
    kk = 0
    while True:
        kk = int(np.searchsorted(idx_ent, t_min))
        t = None
        while kk < len(idx_ent):
            tt = int(idx_ent[kk])
            if tt + 1 >= n:
                break
            if ent_l[tt] and ent_s[tt]:     # señal larga y corta a la vez: ambigua, no se opera
                kk += 1; continue
            t = tt; break
        if t is None:
            break
        e = t + 1; ld = 1 if ent_l[t] else -1
        px_in = o[e]
        stop = tgt = np.nan
        if stop_cfg:
            if stop_cfg["tipo"] == "atr":
                a = atr_stop[e - 1]
                if np.isfinite(a):
                    stop = px_in - ld * float(_r(stop_cfg["k"], P)) * a
            else:
                stop = px_in * (1 - ld * float(_r(stop_cfg["valor"], P)) / 100.0)
        if obj_cfg:
            if obj_cfg["tipo"] == "atr":
                a = atr_obj[e - 1]
                if np.isfinite(a):
                    tgt = px_in + ld * float(_r(obj_cfg["k"], P)) * a
            else:
                tgt = px_in * (1 + ld * float(_r(obj_cfg["valor"], P)) / 100.0)
        if sz["tipo"] == "nocional":
            f = sz["pct"] / 100.0
        else:
            f = sz["apalancamiento_max"]
            if np.isfinite(stop) and abs(px_in - stop) > 0:
                f = min(f, (sz["pct"] / 100.0) / (abs(px_in - stop) / px_in))
        # salida en apertura: por señal (evaluada desde la vela de entrada) o por tiempo
        isal = idx_sal[ld]
        j = int(np.searchsorted(isal, e))
        x_sig = int(isal[j]) + 1 if j < len(isal) else n
        x_open = min(x_sig, e + max_barras) if max_barras > 0 else x_sig
        fin = min(x_open, n)
        # salida dentro de la vela: stop / objetivo en las velas e .. fin-1
        j_int, px_int, mot_int = n, np.nan, ""
        if np.isfinite(stop):
            seg = (l[e:fin] <= stop) if ld == 1 else (h[e:fin] >= stop)
            hit = np.flatnonzero(seg)
            if hit.size:
                js = e + int(hit[0])
                px = stop if js == e else (min(stop, o[js]) if ld == 1 else max(stop, o[js]))
                j_int, px_int, mot_int = js, px, "stop"
        if np.isfinite(tgt):
            lim = min(fin, j_int + 1)
            seg = (h[e:lim] >= tgt) if ld == 1 else (l[e:lim] <= tgt)
            hit = np.flatnonzero(seg)
            if hit.size:
                jt = e + int(hit[0])
                if jt < j_int:      # misma vela que el stop → manda el stop (peor caso)
                    px = tgt if jt == e else (max(tgt, o[jt]) if ld == 1 else min(tgt, o[jt]))
                    j_int, px_int, mot_int = jt, px, "objetivo"
        if j_int < fin:
            i_out, px_out, mot, forzado = j_int, px_int, mot_int, False
            t_min = i_out                      # la siguiente señal puede ser la de esta misma vela
        elif x_open < n:
            i_out, px_out, forzado = x_open, o[x_open], False
            mot = "señal" if x_open == x_sig else "tiempo"
            t_min = x_open - 1                 # reentrada en la misma apertura si hay señal en la vela anterior
        else:
            i_out, px_out, mot, forzado = n - 1, c[n - 1], "fin_datos", True
        swap_ac = float(sw[ld][e + 1:i_out + 1].sum()) if i_out > e else 0.0
        ret = f * (ld * (px_out / px_in - 1.0) - 2.0 * coste_lado + swap_ac)
        filas.append((e, i_out, ld, px_in, px_out, ret, f * swap_ac, mot, f, forzado))
        if forzado:
            break
    return _a_corrida(D, P, filas, coste_lado, sw)


def _a_corrida(D: _Datos, P: dict, filas: list, coste_lado: float, sw: dict, flags: list | None = None) -> Corrida:
    """Operaciones → retorno vela a vela + DataFrame de trades (común a los dos simuladores)."""
    n, c = D.n, D.c
    r = np.zeros(n)
    for (e, i_out, ld, px_in, px_out, ret, swp, mot, f, forzado) in filas:
        if i_out == e:
            if forzado:
                r[e] += -f * coste_lado + f * ld * (c[e] / px_in - 1.0)
            else:
                r[e] += -f * coste_lado + f * (ld * (px_out / px_in - 1.0) - coste_lado)
            continue
        r[e] += -f * coste_lado + f * ld * (c[e] / px_in - 1.0)
        if i_out > e + 1:
            r[e + 1:i_out] += f * (ld * D.ret_cc[e + 1:i_out] + sw[ld][e + 1:i_out])
        if forzado:
            r[i_out] += f * (ld * D.ret_cc[i_out] + sw[ld][i_out])
        else:
            r[i_out] += f * (ld * (px_out / c[i_out - 1] - 1.0) - coste_lado + sw[ld][i_out])
    if filas:
        a = np.array([x[:2] for x in filas], dtype=int)
        trades = pd.DataFrame({
            "i_in": a[:, 0], "i_out": a[:, 1],
            "fecha_in": D.idx.values[a[:, 0]], "fecha_out": D.idx.values[a[:, 1]],
            "lado": [x[2] for x in filas], "px_in": [x[3] for x in filas], "px_out": [x[4] for x in filas],
            "ret": [x[5] for x in filas], "swap": [x[6] for x in filas], "motivo": [x[7] for x in filas],
            "f": [x[8] for x in filas]})
        trades["barras"] = trades.i_out - trades.i_in
        if flags is not None:
            trades["ent_cierre"] = [x[0] for x in flags]; trades["sal_cierre"] = [x[1] for x in flags]
    else:
        trades = pd.DataFrame(columns=["i_in", "i_out", "fecha_in", "fecha_out", "lado", "px_in", "px_out", "ret", "swap",
                                       "motivo", "f", "barras"])
        trades["fecha_in"] = pd.to_datetime(trades["fecha_in"]); trades["ret"] = trades["ret"].astype(float)
    return Corrida(P, trades, r, D.idx)


# ═══════════════════════════════════════════════════════════════════════════════════════════════
# 4b. SESIONES INTRADÍA Y SIMULADOR POR PASOS (máquina de estados, ejecución al cierre, salidas ordenadas)
# ═══════════════════════════════════════════════════════════════════════════════════════════════
def _hhmm(x, que: str) -> int:
    m = re.fullmatch(r"\s*(\d{1,2}):(\d{2})\s*", str(x or ""))
    if not m or int(m.group(1)) > 24 or int(m.group(2)) > 59:
        raise ErrorSpec(f"Sesión: la hora de {que} debe ser HH:MM (recibido «{x}»).")
    return int(m.group(1)) * 60 + int(m.group(2))


def _a_zona(df: pd.DataFrame, ses: dict, avisos: list) -> pd.DataFrame:
    """Pasa el índice a la hora de la sesión. CSV con zona (ISO con desfase) o UNIX → conversión exacta desde UTC;
    CSV sin zona → se asume `zona_datos` (si se declara) o, si no, que ya está en la hora de la sesión."""
    tz = ses["zona_horaria"]
    if "_utc" in df.columns:
        utc = pd.DatetimeIndex(df["_utc"].to_numpy()).tz_localize("UTC")
        nuevo = utc.tz_convert(tz).tz_localize(None)
        avisos.append(f"Horas convertidas a {tz} desde la zona horaria del fichero.")
    elif ses.get("zona_datos") and ses["zona_datos"] != tz:
        loc = df.index.tz_localize(ses["zona_datos"], ambiguous="NaT", nonexistent="shift_forward")
        nuevo = loc.tz_convert(tz).tz_localize(None)
        avisos.append(f"Horas del fichero leídas en {ses['zona_datos']} y convertidas a {tz}.")
    else:
        return df
    out = df.copy()
    out.index = pd.DatetimeIndex(nuevo, name=df.index.name)
    out = out[out.index.notna()]
    out = out[~out.index.duplicated(keep="last")].sort_index(kind="mergesort")
    out.attrs = dict(df.attrs)
    return out


class _InfoSesion:
    """Arrays por vela de la sesión: a qué sesión pertenece, nº de vela dentro de ella, inicio/fin, agregados."""

    def __init__(self, D: _Datos, ses: dict):
        self.D = D
        idx = D.idx
        mins = idx.hour.to_numpy() * 60 + idx.minute.to_numpy()
        ini, fin = ses["inicio_min"], ses["fin_min"]
        dentro = (mins >= ini) & (mins < fin) if ini < fin else (mins >= ini) | (mins < fin)
        dentro &= idx.dayofweek.to_numpy() < 5 if ini < fin else True
        dia = idx.normalize().values.astype("datetime64[D]").astype(np.int64)
        if ini >= fin:                      # sesión que cruza la medianoche: pertenece al día en que empieza
            dia = dia - (mins < fin).astype(np.int64)
        self.dentro = dentro
        pos_d = np.flatnonzero(dentro)
        n = D.n
        self.sid = np.full(n, -1, dtype=np.int64)
        self.pos = np.full(n, np.nan)
        if pos_d.size == 0:
            raise ErrorSpec(f"Ninguna vela cae dentro de la sesión {ses['inicio']}–{ses['fin']} ({ses['zona_horaria']}). "
                            "Revisa el horario o la zona horaria del fichero.")
        d_in = dia[pos_d]
        nuevo = np.r_[True, d_in[1:] != d_in[:-1]]
        sid_in = np.cumsum(nuevo) - 1
        self.sid[pos_d] = sid_in
        self.n_ses = int(sid_in[-1]) + 1
        self.ini = pos_d[nuevo]                                         # índice de la 1.ª vela de cada sesión
        self.fin = np.r_[pos_d[np.flatnonzero(nuevo)[1:] - 1], pos_d[-1]]   # índice de la última
        k_in = np.arange(pos_d.size) - np.flatnonzero(nuevo)[sid_in]
        self.pos[pos_d] = k_in + 1
        o, h, l, c = D.o[pos_d], D.h[pos_d], D.l[pos_d], D.c[pos_d]
        g = pd.DataFrame({"s": sid_in, "o": o, "h": h, "l": l, "c": c})
        agg = g.groupby("s").agg(o=("o", "first"), h=("h", "max"), l=("l", "min"), c=("c", "last"))
        self.agg = {k: agg[k].to_numpy() for k in ("o", "h", "l", "c")}
        self.hasta = {"h": g.groupby("s").h.cummax().to_numpy(), "l": g.groupby("s").l.cummin().to_numpy()}
        self.pos_d, self.sid_in, self.k_in = pos_d, sid_in, k_in

    def por_vela(self, vals_ses: np.ndarray) -> np.ndarray:
        out = np.full(len(self.sid), np.nan)
        out[self.pos_d] = vals_ses[self.sid_in]
        return out

    def calc(self, nombre: str, k: int = 1) -> np.ndarray:
        D = self.D
        if nombre == "en_sesion":
            return self.dentro.astype(float)
        if nombre == "vela_sesion":
            return self.pos.copy()
        if nombre.startswith("sesion_anterior_"):
            campo = {"max": "h", "min": "l", "apertura": "o", "cierre": "c"}[nombre.rsplit("_", 1)[1]]
            prev = np.r_[np.nan, self.agg[campo][:-1]]
            return self.por_vela(prev)
        if nombre == "sesion_apertura":
            return self.por_vela(self.agg["o"])
        if nombre in ("sesion_max", "sesion_min"):
            out = np.full(len(self.sid), np.nan)
            out[self.pos_d] = self.hasta["h" if nombre == "sesion_max" else "l"]
            return out
        if nombre.startswith("vela_sesion_"):
            campo = {"max": D.h, "min": D.l, "apertura": D.o, "cierre": D.c}[nombre.rsplit("_", 1)[1]]
            k = int(k)
            if k < 1:
                raise ErrorSpec("vela de la sesión: k debe ser ≥ 1 (1 = la primera vela).")
            v = np.full(self.n_ses, np.nan)
            tiene = (self.fin - self.ini + 1) >= k
            v[tiene] = campo[self.ini[tiene] + k - 1]
            out = self.por_vela(v)
            out[self.pos < k] = np.nan              # aún no ha cerrado esa vela
            return out
        raise ErrorSpec(f"Operando de sesión desconocido: {nombre}")  # pragma: no cover


def _siguiente(cond: np.ndarray) -> np.ndarray:
    """sig[i] = primer j ≥ i con cond[j] verdadero (n si no hay). Un solo pase vectorizado."""
    n = cond.size
    a = np.where(cond, np.arange(n), n)
    return np.r_[np.minimum.accumulate(a[::-1])[::-1], n]


def _usa_simulador_pasos(s: dict) -> bool:
    lados = [s[l] for l in ("largo", "corto")]
    return bool(s.get("sesion") or s.get("momento") == "cierre_misma_vela" or s.get("max_operaciones_dia")
                or any(r.get("pasos") for r in lados)
                or any(x and x.get("tipo") == "nivel" for x in (s["stop"], s["objetivo"])))


def _grupos_dias(D: _Datos, s: dict, cache: dict):
    """(inicio, fin) de cada bloque en el que se buscan entradas: sesiones si hay sesión; si no, todo el histórico."""
    info = cache.get("__sesion__")
    if info is not None:
        return list(zip(info.ini.tolist(), info.fin.tolist())), info
    return [(0, D.n - 1)], None


def _buscar_entrada(pasos_arr, pos: int, ini: int, fin: int):
    """Máquina de estados: recorre los pasos en orden; cada uno debe cumplirse dentro de su ventana.
    Devuelve (vela de la señal, [velas de cada paso]) o (None, [velas de los pasos cumplidos])."""
    prev, marcas = None, []
    for k, (sig, ventana, nv) in enumerate(pasos_arr):
        lo = pos if prev is None else prev + 1
        hi = fin
        if ventana == "primeras_velas_sesion":
            hi = min(hi, ini + nv - 1)
        elif ventana == "velas_tras_anterior" and prev is not None:
            hi = min(hi, prev + nv)
        if lo > hi:
            return None, marcas
        j = int(sig[lo])
        if j > hi:
            return None, marcas
        prev = j; marcas.append(j)
    return prev, marcas


def _preparar_lado(D, s, P, cache, lado, info, fil_global):
    r = s[lado]
    n = D.n
    base = np.ones(n, dtype=bool) if info is None else info.dentro.copy()
    filtro = base.copy()
    for g in (fil_global, r["filtros"]):
        if g is not None:
            filtro &= _eval_grupo(D.df, g, P, cache)
    pasos = []
    lista = r.get("pasos") or [{"nombre": "entrada", "cuando": r["entrada"], "ventana": None}]
    for k, p in enumerate(lista):
        cond = base & _eval_grupo(D.df, p["cuando"], P, cache)
        if k == len(lista) - 1:
            if r.get("pasos") and r["entrada"] is not None:
                cond &= _eval_grupo(D.df, r["entrada"], P, cache)
            cond &= filtro
        v = p.get("ventana") or {}
        pasos.append((_siguiente(cond), v.get("tipo"), int(_r(v.get("velas"), P)) if v.get("velas") is not None else 0))
    sal = _eval_grupo(D.df, r["salida"], P, cache)
    sig_sal = _siguiente(sal if sal is not None else np.zeros(n, dtype=bool))
    return pasos, sig_sal


def _correr_pasos(D: _Datos, s: dict, P: dict, cache: dict, factor_costes: float = 1.0) -> Corrida:
    """Simulador para reglas con sesión, pasos (RUPTURA → RETESTEO), ejecución al cierre, niveles y máx. operaciones/día.
    Coste: un pase vectorizado por condición (próxima vela verdadera) + un bucle por sesión con aritmética escalar;
    solo la búsqueda del stop usa una porción numpy por operación."""
    cst = s["costes"]; k_ = factor_costes
    coste_lado = (cst["spread_pb"] + 2 * (cst["deslizamiento_pb_lado"] + cst["comision_pb_lado"])) / 1e4 / 2.0 * k_
    sw = {1: D.dias * cst["swap_largo_pb_dia"] / 1e4 * k_, -1: D.dias * cst["swap_corto_pb_dia"] / 1e4 * k_}
    o, h, l, c, n = D.o, D.h, D.l, D.c, D.n
    al_cierre = s.get("momento") == "cierre_misma_vela"
    ses = s.get("sesion") or {}
    cerrar = bool(ses.get("cerrar_al_final", True)) if ses else False
    max_dia = int(_r(s.get("max_operaciones_dia") or 0, P) or 0) or 10 ** 9
    grupos, info = _grupos_dias(D, s, cache)
    lados = [ld for ld in ("largo", "corto") if s["direccion"] in (ld, "ambos")]
    prep = {ld: _preparar_lado(D, s, P, cache, ld, info, s["filtros"]) for ld in lados}
    stop_cfg, obj_cfg = s["stop"], s["objetivo"]
    atr_stop = _calc(D.df, {"indicador": "atr", "n": stop_cfg["n"]}, P, cache) if stop_cfg and stop_cfg["tipo"] == "atr" else None
    atr_obj = _calc(D.df, {"indicador": "atr", "n": obj_cfg["n"]}, P, cache) if obj_cfg and obj_cfg["tipo"] == "atr" else None
    def _niv(cfg):
        if not cfg or cfg["tipo"] != "nivel":
            return None
        return {1: _calc(D.df, cfg["operando"], P, cache), -1: _calc(D.df, cfg.get("operando_corto") or cfg["operando"], P, cache)}
    niv_stop, niv_obj = _niv(stop_cfg), _niv(obj_cfg)
    sz = s["sizing"]
    max_barras = int(_r(s["salida_tiempo"], P) or 0)
    filas, flags = [], []
    libre = 0                                   # primera vela en la que se puede buscar otra entrada
    dia_ops: dict = {}
    for (ini, fin) in grupos:
        if fin < libre:
            continue
        pos = max(ini, libre)
        while pos <= fin:
            dkey = int(D.idx[pos].normalize().value) if info is None else ini
            if dia_ops.get(dkey, 0) >= max_dia:
                break
            mejor = None
            for nm in lados:
                t, _ = _buscar_entrada(prep[nm][0], pos, ini, fin)
                if t is not None and (mejor is None or t < mejor[0]):
                    mejor = (t, nm)
            if mejor is None:
                break
            t, nm = mejor
            ld = 1 if nm == "largo" else -1
            if info is None and dia_ops.get(int(D.idx[t].normalize().value), 0) >= max_dia:
                pos = t + 1; continue
            if al_cierre:
                if cerrar and t >= fin:          # señal en la última vela: no queda sesión para operar
                    break
                e, px_in, k0 = t, c[t], t + 1
            else:
                if t + 1 > (fin if cerrar else n - 1):
                    break
                e, px_in, k0 = t + 1, o[t + 1], t + 1
            # stop / objetivo
            stop = tgt = np.nan
            if stop_cfg:
                if stop_cfg["tipo"] == "nivel":
                    stop = niv_stop[ld][t]
                elif stop_cfg["tipo"] == "atr":
                    a = atr_stop[t]
                    stop = px_in - ld * float(_r(stop_cfg["k"], P)) * a if np.isfinite(a) else np.nan
                else:
                    stop = px_in * (1 - ld * float(_r(stop_cfg["valor"], P)) / 100.0)
            if obj_cfg:
                if obj_cfg["tipo"] == "nivel":
                    tgt = niv_obj[ld][t]
                elif obj_cfg["tipo"] == "atr":
                    a = atr_obj[t]
                    tgt = px_in + ld * float(_r(obj_cfg["k"], P)) * a if np.isfinite(a) else np.nan
                else:
                    tgt = px_in * (1 + ld * float(_r(obj_cfg["valor"], P)) / 100.0)
            if sz["tipo"] == "nocional":
                f = sz["pct"] / 100.0
            else:
                f = sz["apalancamiento_max"]
                if np.isfinite(stop) and abs(px_in - stop) > 0:
                    f = min(f, (sz["pct"] / 100.0) / (abs(px_in - stop) / px_in))
            lim = fin if cerrar else n - 1
            # candidatos de salida: (instante, prioridad, vela, precio, motivo, al_cierre, forzado)
            # instante = 2·vela + 0 (apertura) | 1 (dentro de la vela) | 2 (cierre)
            cands = []
            if np.isfinite(stop) and k0 <= lim:
                seg = (l[k0:lim + 1] <= stop) if ld == 1 else (h[k0:lim + 1] >= stop)
                hit = np.flatnonzero(seg)
                if hit.size:
                    js = k0 + int(hit[0])
                    px = stop if (js == e and not al_cierre) else (min(stop, o[js]) if ld == 1 else max(stop, o[js]))
                    cands.append((2 * js + 1, 0, js, px, "stop", False, False))
            if np.isfinite(tgt) and k0 <= lim:
                seg = (h[k0:lim + 1] >= tgt) if ld == 1 else (l[k0:lim + 1] <= tgt)
                hit = np.flatnonzero(seg)
                if hit.size:
                    jt = k0 + int(hit[0])
                    px = tgt if (jt == e and not al_cierre) else (max(tgt, o[jt]) if ld == 1 else min(tgt, o[jt]))
                    cands.append((2 * jt + 1, 1, jt, px, "objetivo", False, False))
            # al cierre: la salida se mira desde la vela siguiente a la entrada; en apertura, desde la vela de entrada
            jsal = int(prep[nm][1][k0 if al_cierre else e])
            if jsal <= lim:
                if al_cierre:
                    cands.append((2 * jsal + 2, 2, jsal, c[jsal], "señal", True, False))
                elif jsal + 1 <= lim:
                    cands.append((2 * (jsal + 1), 2, jsal + 1, o[jsal + 1], "señal", False, False))
            if max_barras > 0:
                jt = e + max_barras
                if jt <= lim:
                    if al_cierre:
                        cands.append((2 * jt + 2, 3, jt, c[jt], "tiempo", True, False))
                    else:
                        cands.append((2 * jt, 3, jt, o[jt], "tiempo", False, False))
            if cerrar:
                cands.append((2 * fin + 2, 4, fin, c[fin], "fin_sesion", True, False))
            else:
                cands.append((2 * (n - 1) + 2, 5, n - 1, c[n - 1], "fin_datos", True, True))
            _, _, i_out, px_out, mot, sal_c, forzado = min(cands)
            swap_ac = float(sw[ld][e + 1:i_out + 1].sum()) if i_out > e else 0.0
            ret = f * (ld * (px_out / px_in - 1.0) - 2.0 * coste_lado + swap_ac)
            filas.append((e, i_out, ld, px_in, px_out, ret, f * swap_ac, mot, f, forzado))
            flags.append((al_cierre, sal_c))
            dk = ini if info is not None else int(D.idx[e].normalize().value)
            dia_ops[dk] = dia_ops.get(dk, 0) + 1
            if forzado:
                break
            libre = i_out + 1 if sal_c else i_out
            pos = libre
        if filas and filas[-1][9]:
            break
    return _a_corrida(D, P, filas, coste_lado, sw, flags)


def _pasos_hoy(D: _Datos, s: dict, lado: str, P: dict, cache: dict) -> dict:
    """Hasta qué paso llegó la ÚLTIMA sesión (para la ruta de hoy en el árbol)."""
    grupos, info = _grupos_dias(D, s, cache)
    ini, fin = grupos[-1]
    pasos, _ = _preparar_lado(D, s, P, cache, lado, info, s["filtros"])
    t, marcas = _buscar_entrada(pasos, ini, ini, fin)
    return {"marcas": marcas, "senal": t, "ini": ini, "fin": fin}


# ═══════════════════════════════════════════════════════════════════════════════════════════════
# 5. MÉTRICAS (mismas definiciones que codigo/sentinel/metricas.py)
# ═══════════════════════════════════════════════════════════════════════════════════════════════
def pf(rets) -> float:
    r = np.asarray(rets, dtype=float)
    if r.size == 0:
        return float("nan")
    g = r[r > 0].sum(); p = -r[r <= 0].sum()
    if p <= 0:
        return PF_INF if g > 0 else float("nan")
    return float(g / p)


def pf_sin_mejor(rets) -> float:
    r = np.asarray(rets, dtype=float)
    if r.size < 2:
        return float("nan")
    return pf(np.delete(r, r.argmax()))


def maxdd(r) -> float:
    r = np.asarray(r, dtype=float)
    if r.size == 0:
        return 0.0
    eq = np.cumprod(1.0 + r)
    pico = np.maximum.accumulate(eq)
    return float(-((eq - pico) / pico).min())


def _resumen(rets: np.ndarray, r: np.ndarray, idx: pd.DatetimeIndex) -> dict:
    rets = np.asarray(rets, dtype=float)
    yrs = max((idx[-1] - idx[0]).days / 365.25, 1e-9) if len(idx) > 1 else float("nan")
    barras_anio = len(r) / yrs if yrs and yrs > 0 else 252
    tot = float(np.prod(1.0 + r) - 1.0) if r.size else 0.0
    cagr = float((1.0 + tot) ** (1.0 / yrs) - 1.0) if yrs and yrs > 0 and (1.0 + tot) > 0 else float("nan")
    sd = r.std() if r.size >= 2 else 0.0
    return {
        "n": int(rets.size), "pf": pf(rets), "pf_sin_mejor": pf_sin_mejor(rets),
        "maxdd": maxdd(r), "maxdd_trades": maxdd(rets), "ret_total": tot, "cagr": cagr,
        "sharpe": float(r.mean() / sd * np.sqrt(barras_anio)) if sd > 0 else float("nan"),
        "win_rate": float((rets > 0).mean()) if rets.size else float("nan"),
        "media_trade": float(rets.mean()) if rets.size else float("nan"),
        "anios": yrs, "exposicion": float((r != 0).mean()) if r.size else 0.0,
    }


def _tramo(c: Corrida, ini, fin) -> dict:
    a = int(np.searchsorted(c.idx.values, np.datetime64(pd.Timestamp(ini)), "left"))
    b = int(np.searchsorted(c.idx.values, np.datetime64(pd.Timestamp(fin)), "left"))
    m = (c.i_in >= a) & (c.i_in < b)
    rets = c.trades.ret.to_numpy(float)[m] if len(c.trades) else np.zeros(0)
    return _resumen(rets, c.r[a:b], c.idx[a:b])


def _tramo_rapido(c: Corrida, a: int, b: int) -> tuple[int, float]:
    """(nº de trades, retorno total) entre las posiciones a y b, sin construir nada (walk-forward)."""
    n = int(np.searchsorted(c.i_in, b, "left") - np.searchsorted(c.i_in, a, "left"))
    return n, float(c.cp[b] / c.cp[a] - 1.0)


# ═══════════════════════════════════════════════════════════════════════════════════════════════
# 6. LAS 5 FASES
# ═══════════════════════════════════════════════════════════════════════════════════════════════
def _fecha_split(c: Corrida, s: dict) -> pd.Timestamp:
    if s["corte"]["tipo"] == "fecha":
        f = pd.Timestamp(s["corte"]["valor"])
        if not (c.idx[0] < f < c.idx[-1]):
            raise ErrorSpec(f"La fecha de corte {f.date()} está fuera del histórico ({c.idx[0].date()} → {c.idx[-1].date()}).")
        return c.idx[int(np.searchsorted(c.idx.values, np.datetime64(f)))]
    return c.idx[int(len(c.r) * s["corte"]["valor"] / 100.0)]


def fase1(c: Corrida, fs: pd.Timestamp) -> dict:
    fin = c.idx[-1] + pd.Timedelta(days=1)
    IS = _tramo(c, c.idx[0], fs); OOS = _tramo(c, fs, fin)
    crit = {"pf_oos": bool(OOS["pf"] >= UMBRAL["pf_oos"]), "n_oos": bool(OOS["n"] >= UMBRAL["n_oos"]),
            "dd_oos": bool(OOS["maxdd"] < UMBRAL["dd_oos"]), "pf_sin_mejor": bool(OOS["pf_sin_mejor"] > UMBRAL["pf_sin_mejor"])}
    return {"fecha_split": str(fs.date()), "IS": IS, "OOS": OOS, "criterios": crit,
            "frontera": bool(1.25 <= OOS["pf"] <= 1.35), "pasa": all(crit.values())}


def fase2(cache: dict, idx: pd.DatetimeIndex) -> dict:
    isy, oosy, paso = UMBRAL["wf_is_anios"], UMBRAL["wf_oos_anios"], UMBRAL["wf_paso_anios"]
    t0, tN = idx[0], idx[-1]
    iv = idx.values
    pos = lambda t: int(np.searchsorted(iv, np.datetime64(pd.Timestamp(t)), "left"))  # noqa: E731
    ventanas = []
    k = 0
    while True:
        a = t0 + pd.DateOffset(years=k * paso); b = a + pd.DateOffset(years=isy); cfin = b + pd.DateOffset(years=oosy)
        if b + pd.DateOffset(months=6) > tN:
            break
        cfin = min(cfin, tN + pd.Timedelta(days=1))
        pa, pb, pc = pos(a), pos(b), pos(cfin)
        mejor, mejor_ret = None, -np.inf
        for key, c in cache.items():
            n_is, ret_is = _tramo_rapido(c, pa, pb)
            if n_is >= UMBRAL["wf_min_trades_is"] and ret_is > mejor_ret:
                mejor, mejor_ret = key, ret_is
        if mejor is None:
            ventanas.append({"is_ini": str(a.date()), "oos_ini": str(b.date()), "oos_fin": str(cfin.date()),
                             "params": None, "is_ret_anual": np.nan, "oos_ret_anual": np.nan, "oos_dd": np.nan, "oos_n": 0})
        else:
            c = cache[mejor]
            mi = _tramo(c, a, b); mo = _tramo(c, b, cfin)
            yrs_o = max((cfin - b).days / 365.25, 1e-6)
            ventanas.append({"is_ini": str(a.date()), "oos_ini": str(b.date()), "oos_fin": str(cfin.date()),
                             "params": dict(c.p), "is_ret_anual": mi["ret_total"] / isy,
                             "oos_ret_anual": mo["ret_total"] / yrs_o, "oos_dd": mo["maxdd"], "oos_n": mo["n"]})
        k += 1
    ok = [v for v in ventanas if not (isinstance(v["oos_ret_anual"], float) and math.isnan(v["oos_ret_anual"]))]
    if not ok:
        return {"ventanas": ventanas, "n_ventanas": len(ventanas), "eficiencia": float("nan"), "pct_positivas": float("nan"),
                "peor_dd": float("nan"), "criterios": {"eficiencia": False, "pct_positivas": False, "dd_ventanas": False,
                                                      "ventanas_sin_trades": False},
                "pasa": False, "nota": "histórico demasiado corto o sin operaciones suficientes en las ventanas (hacen falta ≥4,5 años)"}
    is_media = float(np.mean([v["is_ret_anual"] for v in ok])); oos_media = float(np.mean([v["oos_ret_anual"] for v in ok]))
    efic = oos_media / is_media if is_media > 0 else (float("nan") if oos_media <= 0 else 9.0)
    pct = float(np.mean([v["oos_ret_anual"] > 0 for v in ok])); peor_dd = float(max(v["oos_dd"] for v in ok))
    crit = {"eficiencia": bool(efic >= UMBRAL["wf_eficiencia"]) if not math.isnan(efic) else False,
            "pct_positivas": bool(pct >= UMBRAL["wf_pct_pos"]), "dd_ventanas": bool(peor_dd < UMBRAL["wf_dd"]),
            "ventanas_sin_trades": len(ok) == len(ventanas)}
    return {"ventanas": ventanas, "n_ventanas": len(ventanas), "eficiencia": float(efic), "pct_positivas": pct,
            "peor_dd": peor_dd, "is_ret_anual_medio": is_media, "oos_ret_anual_medio": oos_media,
            "criterios": crit, "pasa": all(crit.values())}


def fase3(cache: dict, grid: dict, canon: dict, fs) -> dict:
    (k1, v1), (k2, v2) = list(grid.items())[:2]
    ini = pd.Timestamp("1900-01-01")
    matriz = np.full((5, 5), np.nan); ntr = np.zeros((5, 5), dtype=int)
    for i, a in enumerate(v1):
        for j, b in enumerate(v2):
            m = _tramo(cache[(a, b)], ini, fs)
            ntr[i, j] = m["n"]
            matriz[i, j] = m["pf"] if m["n"] >= UMBRAL["meseta_min_trades"] else np.nan
    ci, cj = list(v1).index(canon[k1]), list(v2).index(canon[k2])      # el canónico (normalmente el centro)
    centro = matriz[ci, cj]
    vec = np.array([matriz[i, j] for i in range(ci - 1, ci + 2) for j in range(cj - 1, cj + 2) if (i, j) != (ci, cj)], dtype=float)
    completos = bool(np.all(np.isfinite(vec)))
    ok_centro = bool(np.isfinite(centro) and centro > 1.0)
    dentro20 = bool(ok_centro and completos and np.all(vec >= (1 - UMBRAL["meseta_tol"]) * centro))
    anticliff = bool(ok_centro and completos and np.all(vec >= (1 - UMBRAL["meseta_cliff"]) * centro))
    fin = np.isfinite(matriz)
    pct_pos = float((matriz[fin] > 1.0).mean()) if fin.any() else 0.0
    mejor = np.unravel_index(np.nanargmax(np.where(fin, matriz, -np.inf)), matriz.shape) if fin.any() else (ci, cj)
    crit = {"centro_pf>1": ok_centro, "vecinos_dentro_20pct": dentro20, "anti_cliff_30pct": anticliff,
            "meseta_3x3_completa": bool(completos and np.all(vec > 1.0))}
    return {"ejes": {k1: list(v1), k2: list(v2)}, "pf_is": matriz.tolist(), "n_is": ntr.tolist(), "centro": (ci, cj),
            "pf_centro": float(centro) if np.isfinite(centro) else None, "mejor_celda": (int(mejor[0]), int(mejor[1])),
            "pct_celdas_pf>1": pct_pos, "criterios": crit, "pasa": all(crit.values())}


def fase4(c: Corrida, semilla: int = 7) -> dict:
    """Monte Carlo: la mitad reordena los trades, la otra mitad los remuestrea con reemplazo (mismo flujo que Sentinel)."""
    r = c.trades.ret.to_numpy(float) if len(c.trades) else np.zeros(0)
    n = len(r); sims = UMBRAL["mc_sims"]
    if n < 5:
        return {"n_trades": n, "sims": sims, "p5_ret": float("nan"), "p50_ret": float("nan"), "p95_dd": float("nan"),
                "p50_dd": float("nan"), "prob_ruina": float("nan"), "hist_ret": [], "hist_ret_bins": [],
                "criterios": {"p5_ret>0": False, "p95_dd<25": False, "ruina<5": False}, "pasa": False}
    rng = np.random.default_rng(semilla)
    mitad = sims // 2
    bloque = max(1, int(2e6 // n))         # bloques de ≤2 millones de celdas: cabe en la memoria del navegador
    tot = np.empty(sims); dd = np.empty(sims); minimo = np.empty(sims)

    def acumular(X, i0):
        eq = np.cumprod(1.0 + X, axis=1)
        pico = np.maximum.accumulate(eq, axis=1)
        k = len(X)
        tot[i0:i0 + k] = eq[:, -1] - 1.0
        dd[i0:i0 + k] = ((eq - pico) / pico).min(axis=1)
        minimo[i0:i0 + k] = eq.min(axis=1)

    for i0 in range(0, mitad, bloque):
        k = min(bloque, mitad - i0)
        acumular(np.stack([rng.permutation(r) for _ in range(k)]), i0)
    for i0 in range(mitad, sims, bloque):
        k = min(bloque, sims - i0)
        acumular(r[rng.integers(0, n, size=(k, n))], i0)
    ruina = float((minimo <= 1.0 - UMBRAL["mc_ruina"]).mean())
    tot_boot = tot[mitad:]
    p5, p50 = np.percentile(tot_boot, 5), np.percentile(tot_boot, 50)
    p95dd, p50dd = -np.percentile(dd, 5), -np.percentile(dd, 50)
    hr, hb = np.histogram(tot_boot, bins=40)
    hd, hdb = np.histogram(-dd, bins=40)
    crit = {"p5_ret>0": bool(p5 > UMBRAL["mc_p5_ret"]), "p95_dd<25": bool(p95dd < UMBRAL["mc_p95_dd"]),
            "ruina<5": bool(ruina < UMBRAL["mc_prob_ruina"])}
    return {"n_trades": n, "sims": sims, "p5_ret": float(p5), "p50_ret": float(p50), "p95_dd": float(p95dd),
            "p50_dd": float(p50dd), "prob_ruina": ruina, "hist_ret": hr.tolist(), "hist_ret_bins": hb.tolist(),
            "hist_dd": hd.tolist(), "hist_dd_bins": hdb.tolist(), "criterios": crit, "pasa": all(crit.values())}


def _juzgar_stress(m: dict) -> tuple[bool, str]:
    if m["n"] >= UMBRAL["stress_min_trades"]:
        ok = (m["pf"] >= UMBRAL["stress_pf"]) and (m["maxdd"] < UMBRAL["stress_dd"])
        return bool(ok), "PF≥1.1 y DD<25%" if ok else "falla PF/DD"
    ok = m["maxdd"] < UMBRAL["stress_dd_sin_exposicion"]
    return bool(ok), ("sin exposición relevante (<10 trades, DD<10%)" if ok else "pocos trades y DD>10%")


def fase5(D: _Datos, s: dict, c: Corrida, fs, cache_ind: dict) -> dict:
    fin = c.idx[-1] + pd.Timedelta(days=1)
    c2 = _correr(D, s, c.p, cache_ind, factor_costes=UMBRAL["stress_factor"])
    m_costes = _tramo(c2, fs, fin)
    t = c.trades
    anios_t = pd.DatetimeIndex(t.fecha_in).year if len(t) else pd.Index([])
    anual = pd.Series(t.ret.to_numpy(float), index=anios_t).groupby(level=0).sum().sort_values(ascending=False) if len(t) else pd.Series(dtype=float)
    mejores = [int(a) for a in anual.index[:2]]
    yr_bar = c.idx.year
    m_tr = (t.fecha_in >= fs).to_numpy() & ~np.isin(anios_t, mejores) if len(t) else np.zeros(0, bool)
    m_r = (c.idx >= fs) & ~np.isin(yr_bar, mejores)
    m_sin = _resumen(t.ret.to_numpy(float)[m_tr] if len(t) else np.zeros(0), c.r[m_r], c.idx[m_r])
    # régimen malo: peor año del activo (comprar y mantener, sin el primer año incompleto) ∪ 2022
    cl = D.df.close
    an = cl.groupby(cl.index.year).agg(["first", "last"])
    an = an[an.index > an.index.min()]
    ra = an["last"] / an["first"] - 1
    peor = int(ra.idxmin()) if len(ra) else None
    anios_malos = sorted({a for a in [peor, UMBRAL["anio_regimen_fijo"]] if a is not None and a in set(yr_bar)})
    m_tr = np.isin(anios_t, anios_malos) if len(t) else np.zeros(0, bool)
    m_r = np.isin(yr_bar, anios_malos)
    m_reg = _resumen(t.ret.to_numpy(float)[m_tr] if len(t) else np.zeros(0), c.r[m_r], c.idx[m_r]) if m_r.any() else \
        _resumen(np.zeros(0), np.zeros(0), c.idx[:0])
    esc = {}
    for nombre, m in [("costes_x2", m_costes), ("sin_2_mejores_anios", m_sin), ("regimen_malo", m_reg)]:
        ok, nota = _juzgar_stress(m)
        esc[nombre] = {**m, "pasa": ok, "nota": nota}
    esc["sin_2_mejores_anios"]["anios_quitados"] = mejores
    esc["regimen_malo"]["anios_regimen"] = anios_malos
    return {"escenarios": esc, "pasa": all(e["pasa"] for e in esc.values())}


# ═══════════════════════════════════════════════════════════════════════════════════════════════
# 7. TEXTOS: pseudocódigo, árbol de decisión
# ═══════════════════════════════════════════════════════════════════════════════════════════════
_NOM = {"close": "Cierre", "open": "Apertura", "high": "Máximo", "low": "Mínimo", "volumen": "Volumen"}
_COMP = {">": ">", "<": "<", ">=": "≥", "<=": "≤", "cruza_arriba": "cruza por encima de", "cruza_abajo": "cruza por debajo de"}
_DIAS = {1: "lunes", 2: "martes", 3: "miércoles", 4: "jueves", 5: "viernes", 6: "sábado", 7: "domingo"}


def _num(v) -> str:
    if isinstance(v, str):
        return v
    v = float(v)
    return str(int(v)) if v.is_integer() else f"{v:g}".replace(".", ",")


_TXT_SESION = {"sesion_anterior_max": "máximo de la sesión anterior", "sesion_anterior_min": "mínimo de la sesión anterior",
               "sesion_anterior_apertura": "apertura de la sesión anterior", "sesion_anterior_cierre": "cierre de la sesión anterior",
               "sesion_max": "máximo de la sesión hasta ahora", "sesion_min": "mínimo de la sesión hasta ahora",
               "sesion_apertura": "apertura de la sesión", "vela_sesion": "nº de vela de la sesión",
               "en_sesion": "dentro de la sesión"}


def _txt_op(op: dict, P: dict) -> str:
    if op.get("_nivel"):
        return str(op["_nivel"])
    q = {k: _r(v, P) for k, v in op.items()}
    n = q.get("indicador")
    if n in _TXT_SESION:
        return _TXT_SESION[n]
    if n and n.startswith("vela_sesion_"):
        campo = {"max": "máximo", "min": "mínimo", "apertura": "apertura", "cierre": "cierre"}[n.rsplit("_", 1)[1]]
        return f"{campo} de la vela {_num(q.get('k', 1))} de la sesión"
    fuente = q.get("fuente")
    de = "" if fuente in (None, "close") else f" del {_NOM.get(fuente, fuente).lower()}"
    if n in _NOM:
        t = _NOM[n]
    elif n == "valor":
        v = q["valor"]
        if isinstance(v, (int, float)) and not isinstance(v, bool):
            v = round(float(v) * float(q.get("factor", 1.0)) + float(q.get("suma", 0.0) or 0.0), 10)
        return _num(v)
    elif n in ("sma", "ema"):
        t = f"{n.upper()}({_num(q['n'])}){de}"
    elif n == "rsi":
        t = f"RSI({_num(q['n'])}){de}"
    elif n == "atr":
        t = f"ATR({_num(q['n'])})"
    elif n == "bollinger_sup":
        t = f"Bollinger superior({_num(q['n'])}, {_num(q.get('k', 2))})"
    elif n == "bollinger_inf":
        t = f"Bollinger inferior({_num(q['n'])}, {_num(q.get('k', 2))})"
    elif n == "bollinger_media":
        t = f"media de Bollinger({_num(q['n'])})"
    elif n == "max_n":
        t = f"máximo{de if fuente != 'high' else ''} de las {_num(q['n'])} velas anteriores"
    elif n == "min_n":
        t = f"mínimo{de if fuente != 'low' else ''} de las {_num(q['n'])} velas anteriores"
    elif n == "cambio_pct":
        t = f"cambio % en {_num(q['n'])} vela(s){de}"
    elif n == "ibs":
        t = "IBS (posición del cierre en el rango)"
    elif n == "dia_semana":
        t = "día de la semana"
    elif n == "hora":
        t = "hora"
    elif n == "mes":
        t = "mes"
    else:
        t = n
    if float(q.get("factor", 1.0)) != 1.0:
        t = f"{_num(q['factor'])} × {t}"
    d = int(q.get("desfase", 0) or 0)
    if d:
        t += f" de hace {d} vela{'s' if d > 1 else ''}"
    return t


def _txt_bloque(b: dict, P: dict) -> str:
    izq = _txt_op(b["izq"], P); der = _txt_op(b["der"], P)
    if b["izq"]["indicador"] == "dia_semana" and b["der"]["indicador"] == "valor":
        der = _DIAS.get(int(float(_r(b["der"]["valor"], P))), der)
    return f"{izq} {_COMP[b['comparador']]} {der}"


def _txt_grupo(g, P: dict) -> str:
    if g is None:
        return "—"
    partes = []
    for b in g["bloques"]:
        partes.append(f"({_txt_grupo(b, P)})" if "bloques" in b else _txt_bloque(b, P))
    return (" Y " if g["op"] == "Y" else " O ").join(partes)


def _txt_nivel(d, P, que):
    if not d:
        return "sin " + que
    if d["tipo"] == "atr":
        return f"{_num(_r(d['k'], P))} × ATR({_num(_r(d['n'], P))}) desde el precio de entrada"
    if d["tipo"] == "nivel":
        return f"{_txt_op(d['operando'], P)} de la vela de la señal"
    return f"{_num(_r(d['valor'], P))} % desde el precio de entrada"


def _txt_ventana(v, P) -> str:
    if not v:
        return ""
    n = _num(_r(v["velas"], P))
    return (f" en las {n} primeras velas de la sesión" if v["tipo"] == "primeras_velas_sesion"
            else f" en las {n} velas siguientes")


def _txt_sesion(ses: dict) -> str:
    return (f"Sesión: de {ses['inicio']} a {ses['fin']} ({ses['zona_horaria']}); vela 1 = la de las {ses['inicio']}"
            + ("; al cerrar la última vela de la sesión se sale" if ses["cerrar_al_final"] else ""))


def _txt_costes(c: dict) -> str:
    return (f"spread {_num(c['spread_pb'])} pb por operación · comisión {_num(c['comision_pb_lado'])} pb por lado · "
            f"deslizamiento {_num(c['deslizamiento_pb_lado'])} pb por lado · swap {_num(c['swap_largo_pb_dia'])} pb/día en largos y "
            f"{_num(c['swap_corto_pb_dia'])} pb/día en cortos")


def _txt_sizing(sz: dict) -> str:
    if sz["tipo"] == "nocional":
        p = _num(sz["pct"])
        return f"{p} % del capital por operación (sin apalancamiento)"
    return (f"riesgo del {_num(sz['pct'])} % del capital hasta el stop (apalancamiento máximo "
            f"{_num(sz['apalancamiento_max'])}×)")


def pseudocodigo(spec) -> str:
    s = spec if isinstance(spec, dict) and "ejecucion" in spec else normalizar_spec(spec)
    P = s["parametros"]
    dir_txt = {"largo": "solo largos (compras)", "corto": "solo cortos (ventas)", "ambos": "largos y cortos"}[s["direccion"]]
    L = [f"ESTRATEGIA «{s['nombre']}» · {s['activo']} · {s['temporalidad'] or 'temporalidad del fichero'} · {dir_txt}",
         "Cada vez que CIERRA una vela, el sistema revisa:"]
    if P:
        L.insert(1, "Parámetros: " + ", ".join(f"{k} = {_num(v)}" for k, v in P.items()))
    if s.get("sesion"):
        L.insert(-1, _txt_sesion(s["sesion"]))
    for nom, op in (s.get("niveles") or {}).items():
        L.insert(-1, f"Nivel {nom} = {_txt_op({k: v for k, v in op.items() if k != '_nivel'}, P)}")
    cuando = "en la APERTURA de la vela siguiente" if s.get("momento", "apertura_siguiente") == "apertura_siguiente" \
        else "al CIERRE de esa misma vela"
    if s["filtros"]:
        L.append(f"  FILTRO (para cualquier entrada): {_txt_grupo(s['filtros'], P)}")
    for lado in ("largo", "corto"):
        if s["direccion"] not in (lado, "ambos"):
            continue
        r = s[lado]
        verbo_in = "COMPRA" if lado == "largo" else "VENDE EN CORTO"
        verbo_out = "VENDE (cierra el largo)" if lado == "largo" else "RECOMPRA (cierra el corto)"
        pre = "y pasa el filtro, " if s["filtros"] else ""
        if r.get("pasos"):
            for k, pz in enumerate(r["pasos"]):
                L.append(f"  PASO {k + 1} · {pz['nombre']}: {_txt_grupo(pz['cuando'], P)}{_txt_ventana(pz['ventana'], P)}"
                         + (" (si no ocurre, hoy no se opera)" if pz["ventana"] else ""))
            cond = f"se completa {r['pasos'][-1]['nombre']}"
            if r["entrada"]:
                cond += f" Y {_txt_grupo(r['entrada'], P)}"
        else:
            cond = _txt_grupo(r["entrada"], P)
        if r["filtros"]:
            cond += f" Y además {_txt_grupo(r['filtros'], P)}"
        L.append(f"  ENTRADA {lado.upper()}: si no hay posición, {pre}y {cond} → {verbo_in} {cuando}.")
        if r["salida"]:
            L.append(f"  SALIDA {lado.upper()}: si hay posición y {_txt_grupo(r['salida'], P)} → {verbo_out} {cuando}.")
    L.append(f"  Stop: {_txt_nivel(s['stop'], P, 'stop')} · Objetivo: {_txt_nivel(s['objetivo'], P, 'objetivo')}"
             + (f" · Salida por tiempo: a las {s['salida_tiempo']} velas" if s["salida_tiempo"] else " · Sin salida por tiempo"))
    if s["stop"] or s["objetivo"]:
        L.append("  (stop y objetivo se vigilan dentro de cada vela; si los dos se tocan en la misma vela se asume el stop)")
    if _usa_simulador_pasos(s):
        L.append("  Orden de salida en cada vela: 1) stop/objetivo dentro de la vela, 2) condición de salida al cierre, "
                 + ("3) fin de la sesión (cierre de la última vela)." if s.get("sesion") and s["sesion"]["cerrar_al_final"] else "3) salida por tiempo."))
    if s.get("max_operaciones_dia"):
        L.append(f"  Como máximo {_num(_r(s['max_operaciones_dia'], P))} operación(es) por día; tras salir no se vuelve a entrar ese día"
                 if str(_r(s['max_operaciones_dia'], P)) == "1" else
                 f"  Como máximo {_num(_r(s['max_operaciones_dia'], P))} operaciones por día.")
    L.append(f"Tamaño: {_txt_sizing(s['sizing'])}.")
    L.append(f"Costes: {_txt_costes(s['costes'])}.")
    cor = s["corte"]
    L.append("Validación: " + (f"primer {_num(cor['valor'])} % del histórico = muestra (IS), el resto = fuera de muestra (OOS)"
                               if cor["tipo"] == "pct" else f"IS hasta {cor['valor']}, OOS desde esa fecha"))
    if s["optimizar"]:
        (k1, v1), (k2, v2) = list(s["optimizar"].items())
        L.append(f"Meseta: {k1} ∈ {[_num(x) for x in v1]} × {k2} ∈ {[_num(x) for x in v2]} (canónico en el centro"
                 + ("" if v1[2] == P.get(k1) and v2[2] == P.get(k2) else " o junto al borde si no caben valores menores") + ").")
    return "\n".join(L)


def _id_grupo(g, defecto):
    if not g:
        return defecto
    for b in g["bloques"]:
        if "bloques" in b:
            return _id_grupo(b, defecto)
        for op in (b["izq"], b["der"]):
            if op["indicador"] not in ("close", "open", "high", "low", "valor"):
                return op["indicador"]
    return defecto


def _nodos_arbol(s: dict, lado: str) -> list:
    """Nodos del árbol de decisión con el grupo de condiciones que evalúa cada pregunta (para la ruta de hoy)."""
    P = s["parametros"]; r = s[lado]
    out, usados = [], set()

    def uid(x):
        base, k = x, 2
        while x in usados or x in ("buy", "hold", "sell"):
            x = f"{base}_{k}"; k += 1
        usados.add(x)
        return x
    for g in (s["filtros"], r["filtros"]):
        if g:
            out.append(({"id": uid(_id_grupo(g, "filtro")), "q": f"¿{_txt_grupo(g, P)}?", "no": "FUERA · no se opera"}, g))
    for k, pz in enumerate(r.get("pasos") or []):
        out.append(({"id": uid(re.sub(r"\W+", "_", pz["nombre"].lower()).strip("_") or f"paso{k + 1}"),
                     "q": f"¿{pz['nombre']}: {_txt_grupo(pz['cuando'], P)}{_txt_ventana(pz['ventana'], P)}?",
                     "no": "hoy no se opera" if pz["ventana"] else "ESPERAR", "paso": k + 1}, ("__paso__", k)))
    if r["entrada"] is not None:
        out.append(({"id": uid(_id_grupo(r["entrada"], "entrada")), "q": f"¿{_txt_grupo(r['entrada'], P)}?", "no": "ESPERAR"},
                    r["entrada"]))
    al_c = s.get("momento") == "cierre_misma_vela"
    cu = "al cierre de la vela" if al_c else "en la apertura siguiente"
    out.append(({"id": "buy", "a": (f"COMPRA {cu}" if lado == "largo" else f"VENTA EN CORTO {cu}")}, None))
    if _usa_simulador_pasos(s):
        partes = (["toca el stop"] if s["stop"] else []) + (["toca el objetivo"] if s["objetivo"] else []) + \
                 ([_txt_grupo(r["salida"], P)] if r["salida"] else []) + \
                 ([f"pasan {s['salida_tiempo']} velas"] if s["salida_tiempo"] else []) + \
                 (["es la última vela de la sesión"] if s.get("sesion") and s["sesion"]["cerrar_al_final"] else [])
        q = "¿" + " o ".join(partes) + "?"
    elif r["salida"]:
        q = f"¿{_txt_grupo(r['salida'], P)}?"
    else:
        partes = [x for x in (("stop" if s["stop"] else ""), ("objetivo" if s["objetivo"] else ""),
                              (f"{s['salida_tiempo']} velas" if s["salida_tiempo"] else "")) if x]
        q = "¿Toca " + " u ".join(partes) + "?"
    out.append(({"id": "hold", "q": q, "no": "MANTENER"}, r["salida"]))
    out.append(({"id": "sell", "a": (f"VENTA {cu}" if lado == "largo" else f"RECOMPRA {cu}")}, None))
    return out


def _arbol(s: dict, lado: str) -> list:
    return [nodo for nodo, _ in _nodos_arbol(s, lado)]


def _ruta_hoy(D, s: dict, lado: str, P: dict, cache: dict, en_posicion: bool) -> dict:
    """Ruta de la última vela por el árbol: ids de nodo visitados, con SÍ/NO en cada pregunta."""
    i = D.n - 1
    nodos = _nodos_arbol(s, lado)
    ruta, detalle = [], []
    fin = None
    hoy = _pasos_hoy(D, s, lado, P, cache) if s[lado].get("pasos") else None
    for nodo, g in nodos:
        nid = nodo["id"]
        if isinstance(g, tuple) and g[0] == "__paso__":
            ok = en_posicion or g[1] < len(hoy["marcas"])
            ruta.append(nid); detalle.append({"id": nid, "cumple": bool(ok),
                                              **({"vela": int(hoy["marcas"][g[1]] - hoy["ini"] + 1)} if g[1] < len(hoy["marcas"]) else {})})
            if not ok:
                fin = nodo["no"]; break
            continue
        if nid == "buy":
            ruta.append(nid)
            if not en_posicion:
                fin = nodo["a"]; break
            continue
        if nid == "sell":
            ruta.append(nid); fin = nodo["a"]; break
        if nid == "hold":
            if not en_posicion:
                break
            ok = bool(g is not None and _eval_grupo(D.df, g, P, cache)[i])
            ruta.append(nid); detalle.append({"id": nid, "cumple": ok})
            if not ok:
                fin = "MANTENER"; break
            continue
        ok = bool(_eval_grupo(D.df, g, P, cache)[i])
        ruta.append(nid); detalle.append({"id": nid, "cumple": ok})
        if not ok and not en_posicion:
            fin = nodo["no"]; break
    return {"ruta": ruta, "detalle": detalle, "resultado": fin}


def _operandos(s: dict) -> list[dict]:
    """Indicadores (no precios) que usa la regla, en orden de aparición, sin repetir."""
    vistos, out = set(), []

    def recorrer(g):
        if not g:
            return
        for b in g["bloques"]:
            if "bloques" in b:
                recorrer(b); continue
            for op in (b["izq"], b["der"]):
                if op["indicador"] in ("close", "open", "high", "low", "valor", "dia_semana", "hora", "mes", "en_sesion"):
                    continue
                k = json.dumps(op, sort_keys=True, default=str)
                if k not in vistos:
                    vistos.add(k); out.append(op)
    recorrer(s["filtros"])
    for lado in ("largo", "corto"):
        if s["direccion"] in (lado, "ambos"):
            for pz in s[lado].get("pasos") or []:
                recorrer(pz["cuando"])
            for g in ("filtros", "entrada", "salida"):
                recorrer(s[lado][g])
    for k in ("stop", "objetivo"):
        if s.get(k) and s[k]["tipo"] == "nivel" and s[k]["operando"]["indicador"] not in ("close", "open", "high", "low"):
            recorrer({"op": "Y", "bloques": [{"izq": s[k]["operando"], "der": {"indicador": "valor", "valor": 0}}]})
    return out


def _etiqueta(op: dict, P: dict) -> str:
    q = {k: _r(v, P) for k, v in op.items()}
    e = q["indicador"]
    if "n" in q:
        e += _num(q["n"])
    if q["indicador"].startswith("bollinger") and "k" in q and float(q["k"]) != 2.0:
        e += "_" + _num(q["k"]).replace(",", ".")
    if q.get("fuente") not in (None, "close", "high" if e.startswith("max_n") else None, "low" if e.startswith("min_n") else None):
        e += "_" + q["fuente"]
    if int(q.get("desfase", 0) or 0):
        e += f"_d{int(q['desfase'])}"
    return e


# ═══════════════════════════════════════════════════════════════════════════════════════════════
# 8. VALIDAR — orquesta las 5 fases y empaqueta la salida para la interfaz
# ═══════════════════════════════════════════════════════════════════════════════════════════════
def _limpio(x):
    """JSON seguro: NaN/inf → None, numpy → python, tuplas → listas."""
    if isinstance(x, dict):
        return {str(k): _limpio(v) for k, v in x.items()}
    if isinstance(x, (list, tuple)):
        return [_limpio(v) for v in x]
    if isinstance(x, (np.bool_, bool)):
        return bool(x)
    if isinstance(x, (np.integer,)):
        return int(x)
    if isinstance(x, (np.floating, float)):
        return None if not math.isfinite(float(x)) else float(x)
    if isinstance(x, (pd.Timestamp, np.datetime64)):
        return str(pd.Timestamp(x))
    return x


def _rd(x, k):
    return None if x is None or not math.isfinite(float(x)) else round(float(x), k)


def _fecha_txt(ts, intradia: bool) -> str:
    ts = pd.Timestamp(ts)
    return ts.strftime("%Y-%m-%d %H:%M") if intradia else ts.strftime("%Y-%m-%d")


_NOMBRES_FASE = {"F1": "F1 IS/OOS", "F2": "F2 walk-forward", "F3": "F3 meseta", "F4": "F4 Monte Carlo", "F5": "F5 stress"}


def _veredicto(fases: dict) -> str:
    ok = sum(fases.values())
    malas = [_NOMBRES_FASE[k] for k, v in fases.items() if not v]
    if not malas:
        return "PASA · 5/5 (falta la Paridad MT5: sube tu informe del Strategy Tester)"
    if len(malas) == 1:
        det = f"{malas[0]} no superada"
    else:
        det = ", ".join(malas[:-1]) + " y " + malas[-1] + " no superadas"
    return f"NO PASA · {ok}/5 ({det})"


def validar(df: pd.DataFrame, spec, semilla: int = 7, progreso=None) -> dict:
    """Corre las 5 fases del método TIS. Devuelve un dict serializable a JSON con el formato de datos_terminal_v2.json."""
    t_ini = time.perf_counter()
    tiempos = {}

    def marca(etapa, pct):
        tiempos[etapa] = round(time.perf_counter() - t_ini, 3)
        if progreso is not None:
            try:
                progreso(etapa, pct)
            except Exception:  # noqa: BLE001
                pass

    s = normalizar_spec(spec)
    avisos = list(df.attrs.get("avisos", [])) if hasattr(df, "attrs") else []
    faltan = [k for k in ("open", "high", "low", "close") if k not in df.columns]
    if faltan:
        raise ErrorDatos(f"Faltan columnas {faltan} en los datos.")
    if not isinstance(df.index, pd.DatetimeIndex):
        raise ErrorDatos("El índice de los datos debe ser la fecha (usa cargar_csv).")
    if s.get("sesion"):
        df = _a_zona(df, s["sesion"], avisos)
    df = df[[c for c in ("open", "high", "low", "close", "volumen", "spread") if c in df.columns]].astype(float)
    if len(df) < MIN_VELAS:
        raise ErrorDatos(f"Hacen falta al menos {MIN_VELAS} velas; hay {len(df)}.")
    tf, _ = _detectar_tf(df.index)
    if s["temporalidad"] and s["temporalidad"] != tf:
        avisos.append(f"La regla dice temporalidad {s['temporalidad']} pero el fichero parece {tf}; se usa el fichero tal cual.")
    intradia = tf not in ("D1", "W1", "MN")
    D = _Datos(df)
    P0 = dict(s["parametros"])
    grid = s["optimizar"]
    cache_ind: dict = {}
    if s.get("sesion"):
        cache_ind["__sesion__"] = _InfoSesion(D, s["sesion"])
    cache: dict = {}
    if grid:
        (k1, v1), (k2, v2) = list(grid.items())
        for a in v1:
            for b in v2:
                cache[(a, b)] = _correr(D, s, {**P0, k1: a, k2: b}, cache_ind)
        c = cache[(P0[k1], P0[k2])]
    else:
        c = _correr(D, s, P0, cache_ind)
        cache[("canon",)] = c
    marca("simulaciones_rejilla", 0.45)
    if len(c.trades) == 0:
        raise ErrorSpec("La regla no genera ninguna operación en este histórico. Revisa las condiciones (¿son demasiado estrictas?).")
    fs = _fecha_split(c, s)
    f1 = fase1(c, fs); marca("F1", 0.5)
    f2 = fase2(cache, c.idx); marca("F2", 0.6)
    if grid:
        f3 = fase3(cache, grid, P0, fs)
    else:
        f3 = {"ejes": {}, "pf_is": [], "criterios": {"centro_pf>1": False, "vecinos_dentro_20pct": False,
                                                     "anti_cliff_30pct": False, "meseta_3x3_completa": False},
              "pct_celdas_pf>1": 0.0, "pasa": False, "nota": "sin parámetros numéricos que mover: no hay meseta que medir"}
    marca("F3", 0.65)
    f4 = fase4(c, semilla); marca("F4", 0.85)
    f5 = fase5(D, s, c, fs, cache_ind); marca("F5", 0.95)
    fases = {"F1": f1["pasa"], "F2": f2["pasa"], "F3": f3["pasa"], "F4": f4["pasa"], "F5": f5["pasa"]}
    full = _resumen(c.trades.ret.to_numpy(float), c.r, c.idx)

    # ── empaquetado para la interfaz (formato datos_terminal_v2.json) ───────────────────────────
    eq_d = pd.Series(np.cumprod(1.0 + c.r), index=c.idx)
    eq_w = eq_d.resample("W").last().dropna()
    dd_w = eq_w / eq_w.cummax() - 1.0          # drawdown sobre la curva semanal (como el terminal)
    t = c.trades
    fi = pd.DatetimeIndex(t.fecha_in); fo = pd.DatetimeIndex(t.fecha_out)
    mov = t.lado.to_numpy() * (t.px_out.to_numpy(float) / t.px_in.to_numpy(float) - 1.0)
    dias = ((fo - fi).total_seconds() / 86400.0).to_numpy()
    trades = []
    for i in range(len(t)):
        trades.append({"n": i + 1, "fi": _fecha_txt(fi[i], intradia), "fo": _fecha_txt(fo[i], intradia),
                       "pi": float(t.px_in.iat[i]), "po": float(t.px_out.iat[i]), "mov": round(float(mov[i]), 5),
                       "dias": int(round(dias[i])) if not intradia else round(float(dias[i]), 2),
                       "ret": round(float(t.ret.iat[i]), 6), "oos": bool(fi[i] >= fs),
                       "lado": "largo" if t.lado.iat[i] == 1 else "corto", "motivo": t.motivo.iat[i]})
    anual = pd.DataFrame({"y": fo.year, "ret": t.ret.to_numpy(float)}).groupby("y").ret.agg(["count", "sum"])   # por año de cierre
    anual_l = [{"y": int(y), "n": int(r["count"]), "ret": round(float(r["sum"]), 5)} for y, r in anual.iterrows()]
    meseta = {"ejes": f3["ejes"], "pf": [[_rd(x, 2) for x in fila] for fila in f3["pf_is"]],
              "crit": f3["criterios"], "pct": round(float(f3["pct_celdas_pf>1"]), 4)}
    if "n_is" in f3:
        meseta["n"] = f3["n_is"]
    if "nota" in f3:
        meseta["nota"] = f3["nota"]
    wf = [{"o": v["oos_ini"][:4], "r": _rd(v["oos_ret_anual"], 5), "n": int(v["oos_n"]),
           "params": v["params"]} for v in f2["ventanas"]]
    wf_res = {k: f2.get(k) for k in ("n_ventanas", "eficiencia", "pct_positivas", "peor_dd", "is_ret_anual_medio",
                                     "oos_ret_anual_medio", "criterios", "pasa")}
    if "nota" in f2:
        wf_res["nota"] = f2["nota"]
    mc = {"p5": f4["p5_ret"], "p50": f4["p50_ret"], "p95dd": f4["p95_dd"], "p50dd": f4["p50_dd"], "ruina": f4["prob_ruina"],
          "hist": f4.get("hist_ret", []), "bins": [round(b, 5) for b in f4.get("hist_ret_bins", [])],
          "nota": f"histograma de retorno = {UMBRAL['mc_sims'] // 2:,} remuestreos; DD y ruina sobre {UMBRAL['mc_sims']:,}".replace(",", "."),
          "criterios": f4["criterios"], "n_trades": f4["n_trades"]}
    stress = {}
    for k, e in f5["escenarios"].items():
        stress[k] = {"pf": _rd(e["pf"], 2), "dd": _rd(e["maxdd"], 5), "n": e["n"], "pasa": e["pasa"], "nota": e["nota"]}
    stress["sin_2_mejores_anios"]["anios"] = f5["escenarios"]["sin_2_mejores_anios"]["anios_quitados"]
    stress["regimen_malo"]["anios"] = f5["escenarios"]["regimen_malo"]["anios_regimen"]

    # velas recientes + estado actual con los indicadores de la regla
    ops = _operandos(s)
    etiquetas = [(_etiqueta(op, P0), op) for op in ops]
    vals = {et: _calc(df, op, P0, cache_ind) for et, op in etiquetas}
    alias = {}
    for et, op in etiquetas:
        if op["indicador"] == "rsi" and "rsi" not in alias:
            alias["rsi"] = et
        if op["indicador"] in ("sma", "ema") and "sma" not in alias:
            alias["sma"] = et
    dec = lambda et: 1 if et.startswith(("rsi", "ibs")) else 5  # noqa: E731
    velas = []
    for i in range(max(0, D.n - 170), D.n):
        v = {"t": _fecha_txt(D.idx[i], intradia), "o": float(D.o[i]), "h": float(D.h[i]), "l": float(D.l[i]), "c": float(D.c[i])}
        for a, et in alias.items():
            v[a] = _rd(vals[et][i], dec(et))
        for et, _ in etiquetas:
            v[et] = _rd(vals[et][i], dec(et))
        velas.append(v)
    ult = t.iloc[-1]
    ultima = {"fi": _fecha_txt(ult.fecha_in, intradia), "fo": _fecha_txt(ult.fecha_out, intradia),
              "pi": float(ult.px_in), "po": float(ult.px_out), "ret": round(float(ult.ret), 6),
              "abierta": bool(ult.motivo == "fin_datos")}
    sig = _senales(D, s, P0, cache_ind)
    ultimo = D.n - 1
    if ult.motivo == "fin_datos":
        ld = int(ult.lado)
        sal = sig["largo" if ld == 1 else "corto"][1]
        senal_txt = ("VENTA en la apertura siguiente" if ld == 1 else "RECOMPRA en la apertura siguiente") if sal[ultimo] else \
            ("EN POSICIÓN · largo" if ld == 1 else "EN POSICIÓN · corto")
    elif sig["largo"][0][ultimo] and not sig["corto"][0][ultimo]:
        senal_txt = "COMPRA en la apertura siguiente"
    elif sig["corto"][0][ultimo] and not sig["largo"][0][ultimo]:
        senal_txt = "VENTA EN CORTO en la apertura siguiente"
    else:
        senal_txt = "EN ESPERA"
    estado = {"fecha": _fecha_txt(D.idx[-1], intradia), "precio": float(D.c[-1])}
    for et, _ in etiquetas:
        estado[et] = _rd(vals[et][-1], dec(et))
    if "sma" in alias:
        m = vals[alias["sma"]][-1]
        estado["tendencia"] = None if not np.isfinite(m) else ("ALCISTA" if D.c[-1] > m else "BAJISTA")
    else:
        estado["tendencia"] = None
    estado["senal"] = senal_txt
    lado_arbol = "largo" if s["direccion"] in ("largo", "ambos") else "corto"
    salida = {
        "sizing": _txt_sizing(s["sizing"]),
        "split": f1["fecha_split"], "desde": str(c.idx[0].date()), "hasta": str(c.idx[-1].date()),
        "eq": [[str(d.date()), round(float(v), 5)] for d, v in eq_w.items()],
        "dd": [round(float(v), 5) for v in dd_w.to_numpy()],
        "f1": f1, "full": full, "fases": fases, "verdict": _veredicto(fases),
        "trades": trades, "anual": anual_l, "meseta": meseta, "wf": wf, "wf_res": wf_res, "mc": mc, "stress": stress,
        "mov_medio": round(float(np.mean(mov)), 4), "dias_medio": round(float(np.mean(dias)), 1),
        "velas": velas, "ultima": ultima, "estado": estado, "arbol": _arbol(s, lado_arbol),
        "agentes": [
            {"n": "Lector de datos", "t": "cargar_csv", "h": "formato, fechas, velas imposibles"},
            {"n": "Traductor de reglas", "t": "pseudocodigo", "h": "tus bloques en español llano"},
            {"n": "Simulador", "t": "motor_tester", "h": "cierre → apertura siguiente, costes y swap"},
            {"n": "Juez TIS", "t": "validar", "h": "5 fases del método TIS"},
            {"n": "Auditor MT5", "t": "reconciliar_mt5", "h": "cuadre con el Strategy Tester"},
        ],
        # ── añadidos del tester ──
        "spec": s, "pseudocodigo": pseudocodigo(s),
        "paridad": {"estado": "pendiente: sube tu informe del Strategy Tester", "cuadra": None},
        "avisos": avisos, "activo": s["activo"], "tf": tf, "nombre": s["nombre"],
        "n_velas": int(D.n), "motor": f"motor_tester {VERSION}",
        "fases_detalle": {"F2": {"ventanas": f2["ventanas"]}, "F4": {"hist_dd": f4.get("hist_dd", []),
                                                                   "hist_dd_bins": f4.get("hist_dd_bins", [])},
                          "F5": f5["escenarios"]},
    }
    if s["direccion"] == "ambos":
        salida["arbol_corto"] = _arbol(s, "corto")
    # ── contrato v3: cuenta 100k, operaciones ampliadas, estadísticas, velas completas, ruta de hoy ──
    abierta_lado = int(ult.lado) if ult.motivo == "fin_datos" else 0
    r_hoy = _ruta_hoy(D, s, lado_arbol, P0, cache_ind, abierta_lado == (1 if lado_arbol == "largo" else -1))
    estado["ruta"] = r_hoy["ruta"]; estado["ruta_detalle"] = r_hoy["detalle"]; estado["ruta_resultado"] = r_hoy["resultado"]
    if s["direccion"] == "ambos":
        r_c = _ruta_hoy(D, s, "corto", P0, cache_ind, abierta_lado == -1)
        estado["ruta_corto"] = r_c["ruta"]; estado["ruta_corto_detalle"] = r_c["detalle"]
        estado["ruta_corto_resultado"] = r_c["resultado"]
    salida.update(_contrato_v3(D, s, c, fs, trades, alias, etiquetas, vals, dec, intradia))
    marca("empaquetado", 1.0)
    salida["tiempos"] = tiempos
    return _limpio(salida)


# ═══════════════════════════════════════════════════════════════════════════════════════════════
# 8b. CONTRATO v3 — cuenta de 100.000 USD, operaciones ampliadas, estadísticas, velas completas
# ═══════════════════════════════════════════════════════════════════════════════════════════════
CAPITAL_CUENTA = 100_000.0
_DIAS_NOM = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
_MESES_NOM = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre",
              "noviembre", "diciembre"]


def _excursiones(D, t) -> tuple:
    """MFE / MAE de cada operación (fracción sobre el precio de entrada, en la dirección de la operación:
    MFE ≥ 0, MAE ≤ 0). Usa máximos y mínimos de las velas con la posición abierta: de la vela de entrada a la
    anterior a la de salida, más el precio de salida (o la vela de salida entera si se cierra al final de los datos)."""
    n = len(t)
    mfe = np.zeros(n); mae = np.zeros(n)
    if not n:
        return mfe, mae
    e_ = t.i_in.to_numpy(int); o_ = t.i_out.to_numpy(int)
    ld_ = t.lado.to_numpy(int); pin = t.px_in.to_numpy(float); pout = t.px_out.to_numpy(float)
    mot = t.motivo.to_numpy()
    ec = t["ent_cierre"].to_numpy(bool) if "ent_cierre" in t else np.zeros(n, bool)
    sc = t["sal_cierre"].to_numpy(bool) if "sal_cierre" in t else np.zeros(n, bool)
    for k in range(n):
        e, x = e_[k], o_[k]
        fin = x + 1 if (mot[k] == "fin_datos" or sc[k]) else x
        e = e + 1 if ec[k] else e
        hi = max(float(D.h[e:fin].max()) if fin > e else -np.inf, pout[k], pin[k])
        lo = min(float(D.l[e:fin].min()) if fin > e else np.inf, pout[k], pin[k])
        if ld_[k] == 1:
            mfe[k] = hi / pin[k] - 1.0; mae[k] = lo / pin[k] - 1.0
        else:
            mfe[k] = 1.0 - lo / pin[k]; mae[k] = 1.0 - hi / pin[k]
    return mfe, mae


def _rachas(rets) -> np.ndarray:
    """+n = n-ésima ganadora seguida; −n = n-ésima perdedora seguida (ret ≤ 0 cuenta como perdedora)."""
    out = np.zeros(len(rets), dtype=int)
    cur = 0
    for k, r in enumerate(rets):
        cur = (cur + 1 if cur > 0 else 1) if r > 0 else (cur - 1 if cur < 0 else -1)
        out[k] = cur
    return out


def _partes(g, op_lista: str) -> list:
    """Divide un grupo en frases: si el grupo es del tipo op_lista, una por bloque; si no, una sola frase."""
    if not g:
        return []
    return g["bloques"] if g["op"] == op_lista else [g]


def _frase(b, P) -> str:
    return _txt_grupo(b, P) if "bloques" in b else _txt_bloque(b, P)


def _frases_regla(s: dict) -> dict:
    """reglas_visual: frases cortas para las tarjetas, generadas desde la spec."""
    P = s["parametros"]
    lados = ["largo", "corto"] if s["direccion"] == "ambos" else [s["direccion"]]
    verbo_in = {"largo": "Compra", "corto": "Vende en corto"}
    verbo_out = {"largo": "Vende", "corto": "Recompra"}
    trig, filtros, sal = [], [], []
    filtros += [f"Solo si {_frase(b, P)}" for b in _partes(s["filtros"], "Y")]
    for lado in lados:
        r = s[lado]
        pre = "" if len(lados) == 1 else ("Largos: " if lado == "largo" else "Cortos: ")
        if r.get("pasos"):
            cadena = " → ".join(f"{pz['nombre']} ({_txt_grupo(pz['cuando'], P)}{_txt_ventana(pz['ventana'], P)})" for pz in r["pasos"])
            trig.append(f"{pre}{verbo_in[lado]} {'al cierre' if s.get('momento') == 'cierre_misma_vela' else 'en la apertura siguiente'} "
                        f"tras {cadena}" + (f" y {_txt_grupo(r['entrada'], P)}" if r["entrada"] else ""))
        else:
            trig.append(f"{pre}{verbo_in[lado]} cuando {_txt_grupo(r['entrada'], P)}")
        filtros += [f"{pre}{'s' if pre else 'S'}olo si {_frase(b, P)}" for b in _partes(r["filtros"], "Y")]
        sal += [f"{pre}{verbo_out[lado]} cuando {_frase(b, P)}" for b in _partes(r["salida"], "O")]
    if s["stop"]:
        sal.append("Stop de pérdidas a " + _txt_nivel(s["stop"], P, "stop"))
    if s["objetivo"]:
        sal.append("Objetivo de beneficio a " + _txt_nivel(s["objetivo"], P, "objetivo"))
    if s["salida_tiempo"]:
        sal.append(f"Salida por tiempo a las {s['salida_tiempo']} velas")
    if s.get("sesion") and s["sesion"]["cerrar_al_final"]:
        sal.append(f"Cierra al final de la sesión ({s['sesion']['fin']} {s['sesion']['zona_horaria']})")
    if s.get("niveles"):
        filtros += [f"Nivel {k}: {_txt_op({a: b for a, b in v.items() if a != '_nivel'}, P)}" for k, v in s["niveles"].items()]
    return {"trigger": " · ".join(trig), "filtros": filtros, "salida": sal,
            "gestion": "Tamaño: " + _txt_sizing(s["sizing"]) + ". Una posición a la vez."
                        + (f" Máximo {_num(_r(s['max_operaciones_dia'], P))} operación(es) al día." if s.get("max_operaciones_dia") else ""),
            "ejecucion": ("La señal se mira al cierre de la vela; la orden va a mercado en la apertura de la siguiente."
                          if s.get("momento", "apertura_siguiente") == "apertura_siguiente" else
                          "La señal se mira al cierre de la vela y la orden va a mercado a ese mismo cierre.")
                         + (" " + _txt_sesion(s["sesion"]) + "." if s.get("sesion") else "")}


def _contrato_v3(D, s, c, fs, trades, alias, etiquetas, vals, dec, intradia) -> dict:
    """Claves nuevas del contrato v3 (docs/CONTRATO_V3.md) calculables desde los datos. Amplía `trades` en sitio."""
    t = c.trades
    rets = t.ret.to_numpy(float)
    mfe, mae = _excursiones(D, t)
    racha = _rachas(rets)
    fi = pd.DatetimeIndex(t.fecha_in)
    for k, tr in enumerate(trades):
        tr["mfe_pct"] = round(float(mfe[k]), 5); tr["mae_pct"] = round(float(mae[k]), 5)
        tr["ret_usd"] = round(float(rets[k]) * CAPITAL_CUENTA, 2)
        tr["dia_semana_entrada"] = int(fi[k].dayofweek) + 1; tr["mes_entrada"] = int(fi[k].month)
        tr["racha"] = int(racha[k])
    gan, per = rets[rets > 0], rets[rets <= 0]
    media_g = float(gan.mean()) if gan.size else 0.0
    media_p = float(per.mean()) if per.size else 0.0
    expectancy = float(rets.mean())
    # duración: días naturales redondeados; el último cubo agrupa las más largas
    dd = np.maximum(np.round(np.array([tr["dias"] for tr in trades], dtype=float)).astype(int), 0)
    tope = 30 if not intradia else int(max(1, np.ceil(np.percentile(dd, 95))))
    cnt = pd.Series(np.minimum(dd, tope)).value_counts().sort_index()
    duracion_hist = []
    for d, nn in cnt.items():
        fila = {"dias": int(d), "n": int(nn)}
        if int(d) == tope and dd.max() > tope:
            fila["o_mas"] = True
        duracion_hist.append(fila)
    df_t = pd.DataFrame({"ret": rets, "dia": fi.dayofweek + 1, "mes": fi.month})
    por_dia = [{"dia": int(d), "nombre": _DIAS_NOM[int(d) - 1], "n": int(len(g)), "ret_medio": round(float(g.ret.mean()), 6),
                "acierto": round(float((g.ret > 0).mean()), 4)} for d, g in df_t.groupby("dia")]
    por_mes = [{"mes": int(m), "nombre": _MESES_NOM[int(m) - 1], "n": int(len(g)), "ret_medio": round(float(g.ret.mean()), 6),
                "acierto": round(float((g.ret > 0).mean()), 4)} for m, g in df_t.groupby("mes")]
    stats = {
        "racha_max_ganadora": int(max(racha.max(), 0)), "racha_max_perdedora": int(-min(racha.min(), 0)),
        "mfe_medio": _rd(mfe.mean(), 5), "mae_medio": _rd(mae.mean(), 5),
        "mfe_medio_ganadoras": _rd(mfe[rets > 0].mean(), 5) if gan.size else None,
        "mae_medio_perdedoras": _rd(mae[rets <= 0].mean(), 5) if per.size else None,
        "duracion_hist": duracion_hist, "por_dia_semana": por_dia, "por_mes": por_mes,
        "ganancia_media": _rd(media_g, 6), "perdida_media": _rd(media_p, 6),
        "payoff": _rd(media_g / abs(media_p), 3) if media_p < 0 else None,
        "expectancy_r": _rd(expectancy / abs(media_p), 3) if media_p < 0 else None,
        "unidades": "mfe/mae/ret en fracción (0,01 = 1 %); expectancy_r en múltiplos de la pérdida media (R)",
    }
    extremos = []
    anios_ent = fi.year.to_numpy()
    for y in sorted(set(anios_ent.tolist())):
        pos = np.flatnonzero(anios_ent == y)
        kb = int(pos[np.argmax(rets[pos])]); kw = int(pos[np.argmin(rets[pos])])
        extremos.append({"anio": int(y), "n_ops": int(len(pos)),
                         "mejor": {"n": kb + 1, "fi": trades[kb]["fi"], "ret": round(float(rets[kb]), 6)},
                         "peor": {"n": kw + 1, "fi": trades[kw]["fi"], "ret": round(float(rets[kw]), 6)}})
    # velas completas: OHLC + indicadores de la regla (rsi/sma = el primero de cada tipo; el resto con su etiqueta)
    aliased = set(alias.values())
    cols = {a: np.round(vals[et], dec(et)) for a, et in alias.items()}
    cols.update({et: np.round(vals[et], dec(et)) for et, _ in etiquetas if et not in aliased})
    tt = [_fecha_txt(x, intradia) for x in D.idx]
    o_, h_, l_, c_ = D.o.tolist(), D.h.tolist(), D.l.tolist(), D.c.tolist()
    cols_l = {a: [None if not math.isfinite(x) else x for x in arr.tolist()] for a, arr in cols.items()}
    velas_full = []
    for i in range(D.n):
        v = {"t": tt[i], "o": o_[i], "h": h_[i], "l": l_[i], "c": c_[i]}
        for a, arr in cols_l.items():
            v[a] = arr[i]
        velas_full.append(v)
    anios = max((c.idx[-1] - c.idx[0]).days / 365.25, 1e-9)
    oos_m = np.array([tr["oos"] for tr in trades], dtype=bool)
    anios_oos = max((c.idx[-1] - fs).days / 365.25, 1e-9)
    gan_oos = float(rets[oos_m].sum()) * CAPITAL_CUENTA / anios_oos if oos_m.any() else None
    cuenta = {
        "capital": int(CAPITAL_CUENTA), "moneda": "USD", "compuesto": False,
        "expectancy_usd": round(expectancy * CAPITAL_CUENTA, 2), "expectancy_pct": round(expectancy, 6),
        "expectancy_usd_oos": round(float(rets[oos_m].mean()) * CAPITAL_CUENTA, 2) if oos_m.any() else None,
        "ganancia_media_anual_usd": round(float(rets.sum()) * CAPITAL_CUENTA / anios, 2),
        "ops_por_anio": round(len(rets) / anios, 2),
        "objetivo_anual_usd": None if gan_oos is None else round(gan_oos, 2),
        "objetivo_nota": ("Referencia honesta: ganancia media anual FUERA DE MUESTRA (desde " + str(fs.date()) +
                          ") con 100.000 USD fijos por operación, sin componer y con costes."),
        "ganancia_total_compuesta_usd": round(float(np.prod(1.0 + c.r) - 1.0) * CAPITAL_CUENTA, 2),
        "nota": f"Tamaño de la regla: {_txt_sizing(s['sizing'])}, sobre 100.000 USD. Las cifras en USD no reinvierten "
                "lo ganado (compuesto = false); la curva de capital sí compone.",
    }
    corte = s["corte"]
    metodo = (f"{_num(corte['valor'])}/{_num(100 - corte['valor'])} de los datos disponibles" if corte["tipo"] == "pct"
              else f"fecha elegida ({corte['valor']})")
    return {"cuenta": cuenta, "stats_trades": stats, "extremos_por_anio": extremos, "velas_full": velas_full,
            "corte_auto": {"metodo": metodo, "fecha": str(fs.date()), "tipo": corte["tipo"]},
            "reglas_visual": _frases_regla(s), "core_logic": None, "codigo": None}


def ejecutar(texto_csv, spec_json) -> str:
    """Atajo para la interfaz (Pyodide): CSV en texto + regla en JSON → JSON con el resultado o con el error legible."""
    try:
        df = cargar_csv(texto_csv)
        res = validar(df, spec_json)
        return json.dumps(res, ensure_ascii=False)
    except (ErrorDatos, ErrorSpec) as e:
        return json.dumps({"error": str(e), "tipo": type(e).__name__}, ensure_ascii=False)


# ═══════════════════════════════════════════════════════════════════════════════════════════════
# 9. PARIDAD MT5 — reconciliación con el informe del Strategy Tester
# ═══════════════════════════════════════════════════════════════════════════════════════════════
_COLS_MT5 = {
    "tiempo": ["time", "hora", "fecha/hora", "fecha", "date", "tiempo", "fecha hora"],
    "tipo": ["type", "tipo"],
    "direccion": ["direction", "dirección", "direccion", "entry"],
    "volumen": ["volume", "volumen"],
    "precio": ["price", "precio"],
    "comision": ["commission", "comisión", "comision"],
    "swap": ["swap"],
    "beneficio": ["profit", "beneficio", "ganancia"],
}


def _filas_informe(texto: str) -> list[list[str]]:
    if re.search(r"<tr", texto, re.I):
        filas = []
        for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", texto, re.I | re.S):
            celdas = re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", tr, re.I | re.S)
            celdas = [re.sub(r"<[^>]+>", "", x).replace("&nbsp;", " ").replace("\xa0", " ").strip() for x in celdas]
            if celdas:
                filas.append(celdas)
        return filas
    lineas = [ln for ln in texto.splitlines() if ln.strip()]
    if not lineas:
        return []
    sep = "\t" if sum("\t" in ln for ln in lineas) > len(lineas) / 2 else (";" if sum(";" in ln for ln in lineas) > len(lineas) / 2 else ",")
    return [[x.strip().strip('"') for x in ln.split(sep)] for ln in lineas]


def _num_mt5(x: str) -> float:
    x = str(x).replace("\xa0", "").replace(" ", "").strip()
    if re.fullmatch(r"-?\d+(\.\d{3})*,\d+", x):
        x = x.replace(".", "").replace(",", ".")
    else:
        x = x.replace(",", "")
    try:
        return float(x)
    except ValueError:
        return float("nan")


def leer_informe_mt5(texto) -> pd.DataFrame:
    """Operaciones (entrada + salida emparejadas) de un informe del Strategy Tester de MT5 (HTML o tabla de «Transacciones»
    copiada/exportada). Devuelve DataFrame: fecha_in, fecha_out, lado, px_in, px_out, resultado (beneficio+comisión+swap)."""
    texto = _decodificar(texto)
    filas = _filas_informe(texto)
    cab_i, cols = None, {}
    for i, f in enumerate(filas):
        n = [_norm(x) for x in f]
        m = {}
        for clave, alias in _COLS_MT5.items():
            for j, x in enumerate(n):
                if x in {_norm(a) for a in alias} and clave not in m:
                    m[clave] = j
        if {"tiempo", "direccion", "precio", "beneficio", "tipo"} <= set(m):
            cab_i, cols = i, m
            break
    if cab_i is None:
        raise ErrorDatos("No encuentro la tabla de transacciones (Deals) en el informe. Exporta el informe del Strategy Tester "
                         "(clic derecho → Informe → HTML) o copia la pestaña «Transacciones» con sus columnas "
                         "Hora, Tipo, Dirección, Precio, Beneficio.")
    ops, abierta = [], None
    for f in filas[cab_i + 1:]:
        if len(f) <= max(cols.values()):
            continue
        dire = _norm(f[cols["direccion"]]); tipo = _norm(f[cols["tipo"]])
        if tipo in ("balance", "credit", "crédito", "credito") or not dire:
            continue
        try:
            t = pd.Timestamp(f[cols["tiempo"]].replace(".", "-", 2))
        except Exception:  # noqa: BLE001
            continue
        px = _num_mt5(f[cols["precio"]])
        res = sum(_num_mt5(f[cols[k]]) if k in cols else 0.0 for k in ("beneficio", "comision", "swap"))
        es_compra = tipo in ("buy", "compra", "buy limit", "buy stop")
        if dire in ("in", "entrada"):
            abierta = {"fecha_in": t, "lado": 1 if es_compra else -1, "px_in": px, "resultado": res}
        elif dire in ("out", "salida", "in/out", "out by") and abierta is not None:
            ops.append({**abierta, "fecha_out": t, "px_out": px, "resultado": abierta["resultado"] + res})
            abierta = None
            if dire == "in/out":
                abierta = {"fecha_in": t, "lado": 1 if es_compra else -1, "px_in": px, "resultado": 0.0}
    if not ops:
        raise ErrorDatos("El informe no contiene operaciones cerradas.")
    return pd.DataFrame(ops)


def reconciliar_mt5(df_trades_motor, texto_informe_mt5, tolerancia: float = 0.02) -> dict:
    """Compara las operaciones del motor con las del Strategy Tester: nº de operaciones (exacto) y resultado (±2 %).
    df_trades_motor: DataFrame de la corrida (fecha_in, fecha_out, px_in, px_out, lado) o la lista «trades» de validar().
    El «resultado» comparable es la suma de los movimientos de precio de cada operación (en %), que no depende del tamaño
    de lote; la equity en dinero depende del sizing de cada plataforma y se compara aparte si el informe trae depósito."""
    if isinstance(df_trades_motor, list):
        m = pd.DataFrame(df_trades_motor)
        m = pd.DataFrame({"fecha_in": pd.to_datetime(m.fi), "fecha_out": pd.to_datetime(m.fo), "px_in": m.pi, "px_out": m.po,
                          "lado": m["lado"].map({"largo": 1, "corto": -1}).fillna(1) if "lado" in m else 1})
    else:
        m = df_trades_motor[["fecha_in", "fecha_out", "px_in", "px_out", "lado"]].copy()
    x = leer_informe_mt5(texto_informe_mt5)
    # solo el tramo común
    ini = max(m.fecha_in.min().normalize(), x.fecha_in.min().normalize())
    fin = min(m.fecha_in.max().normalize(), x.fecha_in.max().normalize()) + pd.Timedelta(days=1)
    mm = m[(m.fecha_in >= ini) & (m.fecha_in < fin)].reset_index(drop=True)
    xx = x[(x.fecha_in >= ini) & (x.fecha_in < fin)].reset_index(drop=True)
    mov_m = mm.lado * (mm.px_out / mm.px_in - 1.0)
    mov_x = xx.lado * (xx.px_out / xx.px_in - 1.0)
    res_m, res_x = float(mov_m.sum()), float(mov_x.sum())
    dif = abs(res_x - res_m) / max(abs(res_m), 1e-9)
    # emparejado por día de entrada
    claves_x = {d: i for i, d in enumerate(xx.fecha_in.dt.normalize())}
    detalle, emparejadas = [], 0
    for i, r in mm.iterrows():
        j = claves_x.get(r.fecha_in.normalize())
        if j is None:
            detalle.append({"motor_fi": str(r.fecha_in.date()), "mt5_fi": None, "nota": "solo en el motor"})
            continue
        emparejadas += 1
        s_ = xx.iloc[j]
        d_px = max(abs(s_.px_in / r.px_in - 1.0), abs(s_.px_out / r.px_out - 1.0))
        if r.fecha_out.normalize() != s_.fecha_out.normalize() or d_px > 0.002:
            detalle.append({"motor_fi": str(r.fecha_in.date()), "mt5_fi": str(s_.fecha_in.date()),
                            "motor_fo": str(r.fecha_out.date()), "mt5_fo": str(s_.fecha_out.date()),
                            "dif_px_max": round(d_px, 5), "nota": "salida o precio distinto"})
    solo_mt5 = len(xx) - emparejadas
    cuadra_n = len(mm) == len(xx)
    cuadra_r = dif <= tolerancia
    return _limpio({
        "tramo": [str(ini.date()), str((fin - pd.Timedelta(days=1)).date())],
        "n_motor": int(len(mm)), "n_mt5": int(len(xx)), "cuadra_n": bool(cuadra_n),
        "resultado_motor": res_m, "resultado_mt5": res_x, "dif_relativa": dif, "cuadra_resultado": bool(cuadra_r),
        "resultado_mt5_dinero": float(xx.resultado.sum()),
        "emparejadas": emparejadas, "solo_mt5": int(solo_mt5), "diferencias": detalle[:50],
        "cuadra": bool(cuadra_n and cuadra_r),
        "estado": "CUADRA" if (cuadra_n and cuadra_r) else "NO CUADRA",
        "nota": "nº de operaciones exacto y suma de movimientos de precio ±2 % (docs/PARIDAD_MT5.md de Sentinel)",
    })


# ═══════════════════════════════════════════════════════════════════════════════════════════════
# 10. ADAPTADOR — spec v1 de la app (formulario «Prueba inicial», README) → spec interna del motor
# ═══════════════════════════════════════════════════════════════════════════════════════════════
_TIPO_APP = {"precio": "close", "cierre": "close", "close": "close", "apertura": "open", "open": "open",
             "maximo": "high", "máximo": "high", "high": "high", "minimo": "low", "mínimo": "low", "low": "low",
             "num": "valor", "numero": "valor", "número": "valor", "valor": "valor"}
_SECCION_APP = {"filtros": "Filtros", "entrada": "Entrada", "salida": "Salida"}
_OSC_ESPEJO = {"rsi": (-1.0, 100.0), "ibs": (-1.0, 1.0), "cambio_pct": (-1.0, 0.0)}   # valor espejo = factor·v + suma
_NEUTROS = {"atr", "volumen", "dia_semana", "hora", "mes", "vela_sesion", "en_sesion"}                           # no tienen dirección
_CAMBIO_LADO = {"max_n": "min_n", "min_n": "max_n", "bollinger_sup": "bollinger_inf", "bollinger_inf": "bollinger_sup",
                "high": "low", "low": "high",
                "sesion_anterior_max": "sesion_anterior_min", "sesion_anterior_min": "sesion_anterior_max",
                "sesion_max": "sesion_min", "sesion_min": "sesion_max",
                "vela_sesion_max": "vela_sesion_min", "vela_sesion_min": "vela_sesion_max"}
_COMP_ESPEJO = {">": "<", "<": ">", ">=": "<=", "<=": ">=", "cruza_arriba": "cruza_abajo", "cruza_abajo": "cruza_arriba"}
# Perfil darwinex_mt5 de Sentinel (codigo/sentinel/perfiles/darwinex_mt5.yaml): swaps en puntos, leídos del terminal.
PERFIL_DARWINEX = {
    "XAUUSD": {"point": 0.01, "precio_lectura": 4280.42, "swap_largo": -61.5, "swap_corto": 34.3},
}
_PROGRESO_FASES = {"simulaciones_rejilla": ("Fase 1 · IS/OOS", 45), "F1": ("Fase 2 · walk-forward", 50),
                   "F2": ("Fase 3 · meseta", 60), "F3": ("Fase 4 · Monte Carlo", 65), "F4": ("Fase 5 · stress", 85),
                   "F5": ("Preparando resultados", 95), "empaquetado": ("Listo", 100)}


def _es_spec_app(spec: dict) -> bool:
    return isinstance(spec, dict) and isinstance(spec.get("reglas"), dict)


def _numero(x, donde: str) -> float:
    if isinstance(x, bool) or x is None or x == "":
        raise ErrorSpec(f"{donde}: falta el número.")
    try:
        v = float(str(x).replace(",", ".")) if isinstance(x, str) else float(x)
    except ValueError:
        raise ErrorSpec(f"{donde}: «{x}» no es un número.")
    if not math.isfinite(v):
        raise ErrorSpec(f"{donde}: «{x}» no es un número.")
    return int(v) if v.is_integer() else v


class _Params:
    """Convierte los números de la regla en parámetros con nombre (para la meseta y el walk-forward)."""

    def __init__(self):
        self.ventanas: dict = {}     # nombre → nº de velas de la ventana de un paso (n_ruptura…)
        self.umbrales: dict = {}     # nombre → valor (entrada, salida, filtro…)
        self.periodos: dict = {}     # nombre → valor (rsi_n, sma_n…)
        self._per_clave: dict = {}

    @staticmethod
    def _nuevo(base, usados):
        k, nombre = 2, base
        while nombre in usados:
            nombre = f"{base}_{k}"; k += 1
        return nombre

    def umbral(self, seccion: str, v) -> str:
        base = {"filtros": "filtro", "entrada": "entrada", "salida": "salida"}[seccion]
        nombre = self._nuevo(base, set(self.umbrales) | set(self.periodos))
        self.umbrales[nombre] = v
        return "$" + nombre

    def periodo(self, ind: str, v) -> str:
        clave = (ind, v)
        if clave not in self._per_clave:
            nombre = self._nuevo(f"{ind}_n", set(self.umbrales) | set(self.periodos))
            self.periodos[nombre] = v
            self._per_clave[clave] = nombre
        return "$" + self._per_clave[clave]

    def ventana(self, paso: str, v) -> str:
        base = "n_" + (re.sub(r"\W+", "_", str(paso).lower()).strip("_") or "paso")
        nombre = self._nuevo(base, set(self.umbrales) | set(self.periodos) | set(self.ventanas))
        self.ventanas[nombre] = v
        return "$" + nombre

    def todos(self) -> dict:
        orden = [k for base in ("entrada", "salida", "filtro") for k in self.umbrales if k.split("_")[0] == base]
        return {**self.ventanas, **{k: self.umbrales[k] for k in orden}, **self.periodos}


def _op_app(o, donde: str, seccion: str, prm: _Params, otro_tipo: str | None) -> dict:
    if isinstance(o, (int, float)) and not isinstance(o, bool):
        o = {"tipo": "num", "valor": o}
    if not isinstance(o, dict):
        raise ErrorSpec(f"{donde}: operando no válido.")
    tipo = str(o.get("tipo", "")).strip().lower()
    if not tipo:
        raise ErrorSpec(f"{donde}: elige qué comparar (precio, media, RSI, número…).")
    ind = _TIPO_APP.get(tipo) or _ind_nombre(tipo)
    if ind == "valor":
        v = _numero(o.get("valor"), donde)
        # los umbrales contra calendario (día, hora, mes) no se mueven en la meseta
        return {"indicador": "valor", "valor": v if otro_tipo in ("dia_semana", "hora", "mes") else prm.umbral(seccion, v)}
    out = {"indicador": ind}
    defecto = INDICADORES[ind][0]
    if "n" in defecto:
        per = o.get("periodo", o.get("n"))
        if per is None or per == "":
            raise ErrorSpec(f"{donde}: falta el periodo de {ind.upper()}.")
        per = _numero(per, donde)
        if not float(per).is_integer() or per < 1:
            raise ErrorSpec(f"{donde}: el periodo de {ind.upper()} debe ser un entero ≥ 1 (recibido {per}).")
        out["n"] = prm.periodo(ind, int(per))
    for k in ("k", "fuente", "desfase", "factor", "nombre"):
        if o.get(k) not in (None, ""):
            out[k] = o[k]
    if ind == "nivel" and not out.get("nombre"):
        raise ErrorSpec(f"{donde}: elige qué nivel (nombre).")
    return out


def _bloques_app(lista, seccion: str, prm: _Params) -> list:
    if lista is None:
        return []
    if not isinstance(lista, list):
        raise ErrorSpec(f"{_SECCION_APP[seccion]}: debe ser una lista de condiciones.")
    out = []
    for i, b in enumerate(lista):
        donde = f"{_SECCION_APP[seccion]} › condición {i + 1}"
        if not isinstance(b, dict):
            raise ErrorSpec(f"{donde}: formato no válido.")
        comp = str(b.get("op", b.get("comparador", ""))).strip().lower()
        comp = {"≥": ">=", "≤": "<=", "=>": ">=", "=<": "<="}.get(comp, comp)
        if comp not in COMPARADORES:
            raise ErrorSpec(f"{donde}: comparador «{comp}» no válido; usa >, <, >=, <=, cruza_arriba o cruza_abajo.")
        ti = lambda o: (_TIPO_APP.get(str(o.get("tipo", "")).lower()) or str(o.get("tipo", "")).lower()) if isinstance(o, dict) else "valor"  # noqa: E731
        izq_raw, der_raw = b.get("izq"), b.get("der")
        if izq_raw is None or der_raw is None:
            raise ErrorSpec(f"{donde}: falta uno de los dos lados de la comparación.")
        izq = _op_app(izq_raw, donde + " (izquierda)", seccion, prm, ti(der_raw))
        der = _op_app(der_raw, donde + " (derecha)", seccion, prm, ti(izq_raw))
        if izq["indicador"] == "valor" and der["indicador"] == "valor":
            raise ErrorSpec(f"{donde}: compara dos números fijos; uno de los lados debe ser precio o indicador.")
        out.append({"izq": izq, "comparador": comp, "der": der})
    return out


def _espejo_op(op: dict) -> dict:
    op = dict(op)
    op["indicador"] = _CAMBIO_LADO.get(op["indicador"], op["indicador"])
    if op.get("fuente") in ("high", "low"):
        op["fuente"] = _CAMBIO_LADO[op["fuente"]]
    return op


def _espejo(b: dict) -> dict:
    """Condición espejo para el lado corto: RSI < 25 → RSI > 75; Cierre > SMA → Cierre < SMA; ruptura de máximos → de mínimos."""
    izq, der = dict(b["izq"]), dict(b["der"])
    ii, di = izq["indicador"], der["indicador"]
    if "valor" in (ii, di):
        otro = di if ii == "valor" else ii
        if otro in _NEUTROS:
            return {"izq": izq, "comparador": b["comparador"], "der": der}
        if otro in _OSC_ESPEJO:
            f, sm = _OSC_ESPEJO[otro]
            num = izq if ii == "valor" else der
            num["factor"] = f; num["suma"] = sm
            return {"izq": izq, "comparador": _COMP_ESPEJO[b["comparador"]], "der": der}
    if ii in _NEUTROS and di in _NEUTROS:
        return {"izq": izq, "comparador": b["comparador"], "der": der}
    for op in (izq, der):
        op["indicador"] = _CAMBIO_LADO.get(op["indicador"], op["indicador"])
        if op.get("fuente") in ("high", "low"):
            op["fuente"] = _CAMBIO_LADO[op["fuente"]]
    return {"izq": izq, "comparador": _COMP_ESPEJO[b["comparador"]], "der": der}


def _a_bloque_motor(b: dict) -> dict:
    """{izq, comparador, der} → bloque de entrada de normalizar_spec."""
    return {**b["izq"], "comparador": b["comparador"], "contra": b["der"]}


def _grupo_motor(bloques: list, op: str):
    return {"op": op, "bloques": [_a_bloque_motor(b) for b in bloques]} if bloques else None


def _nivel_app(d, que: str, prm=None):
    if not d or not isinstance(d, dict):
        return None
    t = str(d.get("tipo", "ninguno")).lower()
    if t in ("ninguno", "", "none", "no"):
        return None
    if t == "nivel":
        op = d.get("valor", d.get("operando"))
        if not isinstance(op, dict):
            raise ErrorSpec(f"{que}: con tipo «nivel» elige el precio (p. ej. el mínimo de la vela de la señal).")
        return {"tipo": "nivel", "operando": _op_app(op, que, "salida", prm or _Params(), None)}
    v = d.get("valor")
    if v is None or v == "":
        raise ErrorSpec(f"{que}: con tipo «{t}» hace falta el valor.")
    v = _numero(v, que)
    if v <= 0:
        raise ErrorSpec(f"{que}: el valor debe ser mayor que 0.")
    if t == "pct":
        return {"tipo": "pct", "valor": v}
    if t == "atr":
        return {"tipo": "atr", "n": int(d.get("periodo", d.get("n", 14)) or 14), "k": v}
    raise ErrorSpec(f"{que}: tipo «{t}» no válido (usa ninguno, pct, atr o nivel).")


def adaptar_spec_app(spec_app, df: pd.DataFrame | None = None) -> tuple:
    """spec v1 de la app → (spec interna para validar(), avisos, extras). `df` (opcional) para recortar por fechas."""
    if isinstance(spec_app, str):
        try:
            spec_app = json.loads(spec_app)
        except json.JSONDecodeError as e:
            raise ErrorSpec(f"La especificación no es un JSON válido: {e}")
    if not isinstance(spec_app, dict):
        raise ErrorSpec("La especificación debe ser un objeto JSON.")
    a = spec_app
    avisos, extras = [], {}
    if a.get("version") not in (None, 1, "1"):
        avisos.append(f"Especificación versión {a.get('version')}: el motor entiende la versión 1; se intenta igual.")
    act = a.get("activo") or {}
    simbolo = (act.get("simbolo") if isinstance(act, dict) else str(act)) or "ACTIVO"
    d = str(a.get("direccion") or "largo").lower()
    if d not in ("largo", "corto", "ambos"):
        raise ErrorSpec("Dirección: elige largo, corto o ambos.")
    reglas = a.get("reglas") or {}
    prm = _Params()
    # pasos con nombre (RUPTURA → RETESTEO): la ventana de cada paso pasa a parámetro (n_ruptura…) para la meseta
    pasos = []
    for i, pz in enumerate(reglas.get("pasos") or []):
        nombre = str(pz.get("nombre") or f"PASO {i + 1}")
        conds = _bloques_app(pz.get("condiciones", pz.get("cuando")), "entrada", prm)
        if not conds:
            raise ErrorSpec(f"Paso «{nombre}»: añade al menos una condición.")
        v = pz.get("ventana") or {}
        vt = str(v.get("tipo") or "").lower()
        ventana = None
        if vt and vt != "ninguna":
            nv = int(_numero(v.get("velas"), f"Paso «{nombre}» › ventana"))
            if nv < 1:
                raise ErrorSpec(f"Paso «{nombre}»: la ventana debe ser de al menos 1 vela.")
            ventana = {"tipo": vt, "velas": prm.ventana(nombre, nv)}
        pasos.append({"nombre": nombre, "cuando": conds, "ventana": ventana})
    filtros = _bloques_app(reglas.get("filtros"), "filtros", prm)
    entrada = _bloques_app(reglas.get("entrada"), "entrada", prm)
    salida = _bloques_app(reglas.get("salida"), "salida", prm)
    if not entrada and not pasos:
        raise ErrorSpec("Entrada: añade al menos una condición de entrada (o los pasos de la secuencia).")
    niveles = {}
    for i, nv in enumerate(a.get("niveles") or []):
        nom = str(nv.get("nombre") or "").strip()
        if not nom:
            raise ErrorSpec(f"Nivel {i + 1}: ponle un nombre (p. ej. NIVEL).")
        niveles[nom] = _op_app(nv.get("valor", nv.get("operando")), f"Nivel «{nom}»", "filtros", _Params(), None)
    g = a.get("gestion") or {}
    stop = _nivel_app(g.get("stop"), "Stop", prm)
    objetivo = _nivel_app(g.get("objetivo"), "Objetivo", prm)
    st = g.get("salida_tiempo_velas")
    st = int(_numero(st, "Salida por tiempo")) if st not in (None, "", 0) else None
    if not salida and not stop and not objetivo and not st:
        raise ErrorSpec("Salida: añade una condición de salida, un stop, un objetivo o una salida por tiempo.")
    spec = {"nombre": a.get("nombre") or "Mi estrategia", "activo": simbolo,
            "temporalidad": a.get("temporalidad") or None, "direccion": d, "parametros": prm.todos()}
    # salida: basta una condición (por defecto) o todas a la vez (`reglas.salida_modo = "todas"`, p. ej. 2 velas verdes seguidas)
    op_sal = "Y" if str(reglas.get("salida_modo") or "cualquiera").lower() in ("todas", "y", "and") else "O"
    lado_dir = {"filtros": _grupo_motor(filtros, "Y"), "entrada": _grupo_motor(entrada, "Y"),
                "salida": _grupo_motor(salida, op_sal)}
    if pasos:
        lado_dir["pasos"] = [{**pz, "cuando": _grupo_motor(pz["cuando"], "Y")} for pz in pasos]
    if niveles:
        spec["niveles"] = niveles
    if d == "ambos":
        spec["largo"] = lado_dir
        if niveles:                         # el corto usa el nivel espejo (máximo de ayer → mínimo de ayer)
            for k, op in list(niveles.items()):
                spec["niveles"][k + "_corto"] = _espejo_op(op)

        def esp(b):
            b2 = _espejo(b)
            for lado_ in ("izq", "der"):
                if b2[lado_]["indicador"] == "nivel":
                    b2[lado_] = {**b2[lado_], "nombre": b2[lado_]["nombre"] + "_corto"}
            return b2
        spec["corto"] = {"filtros": _grupo_motor([esp(b) for b in filtros], "Y"),
                         "entrada": _grupo_motor([esp(b) for b in entrada], "Y"),
                         "salida": _grupo_motor([esp(b) for b in salida], op_sal)}
        if pasos:
            spec["corto"]["pasos"] = [{**pz, "cuando": _grupo_motor([esp(b) for b in pz["cuando"]], "Y")} for pz in pasos]
        for k_, cfg in (("stop", stop), ("objetivo", objetivo)):
            if cfg and cfg["tipo"] == "nivel":
                cfg["operando_corto"] = _espejo_op(cfg["operando"])
        avisos.append("Largos y cortos: el corto usa las condiciones espejo (p. ej. RSI < 25 → RSI > 75; "
                      "Cierre > SMA → Cierre < SMA).")
    else:
        spec[d] = lado_dir
    spec["stop"], spec["objetivo"], spec["salida_tiempo"] = stop, objetivo, st
    # tamaño
    sz = a.get("sizing") or {"tipo": "pct_capital", "valor": 100}
    t = str(sz.get("tipo", "pct_capital")).lower()
    if t in ("pct_capital", "nocional"):
        v = _numero(sz.get("valor", sz.get("pct", 100)), "Tamaño")
        if not 0 < v <= 100:
            raise ErrorSpec("Tamaño: el % del capital debe estar entre 0 y 100 (el motor no usa apalancamiento).")
        spec["sizing"] = {"tipo": "nocional", "pct": v}
    elif t in ("riesgo_pct", "riesgo"):
        if not stop:
            raise ErrorSpec("Tamaño por riesgo: necesita un stop (si no, no hay distancia a la que arriesgar).")
        spec["sizing"] = {"tipo": "riesgo", "pct": _numero(sz.get("valor", sz.get("pct", 1)), "Tamaño"),
                          "apalancamiento_max": _numero(sz.get("apalancamiento_max", 1), "Apalancamiento máximo")}
    elif t == "lotes_fijos":
        raise ErrorSpec("Tamaño en lotes fijos: el motor trabaja en % del capital. Elige «% del capital» "
                        "(100 % = un lote cuyo nocional iguala tu cuenta) o «riesgo %» con stop.")
    else:
        raise ErrorSpec(f"Tamaño: tipo «{t}» no válido (pct_capital o riesgo_pct).")
    # costes (pb = puntos básicos sobre el nocional; swap de % anual a pb por día natural)
    c = a.get("costes") or {}
    cst = {k: _numero(c.get(k, 0) or 0, f"Costes › {k}") for k in ("spread_pb", "comision_pb_lado", "deslizamiento_pb_lado")}
    for lado in ("largo", "corto"):
        if c.get(f"swap_{lado}_pb_dia") not in (None, ""):
            cst[f"swap_{lado}_pb_dia"] = _numero(c[f"swap_{lado}_pb_dia"], f"Costes › swap {lado}")
        else:
            cst[f"swap_{lado}_pb_dia"] = _numero(c.get(f"swap_{lado}_pct_anual", 0) or 0, f"Costes › swap {lado}") * 100.0 / 365.0
    # perfil darwinex_mt5: el formulario enseña el swap redondeado en % anual; si coincide con el del perfil (±0,001 %),
    # se usa el valor EXACTO del terminal (puntos × point / precio). El walk-forward elige entre corridas casi empatadas
    # y una diferencia de 0,00002 pb/día basta para cambiar la elección de alguna ventana.
    perf = PERFIL_DARWINEX.get(str(simbolo).upper()) if str(c.get("perfil", "")).lower() == "darwinex_mt5" else None
    if perf:
        for lado in ("largo", "corto"):
            exacto = perf[f"swap_{lado}"] * perf["point"] / perf["precio_lectura"] * 1e4
            if abs(cst[f"swap_{lado}_pb_dia"] - exacto) * 365.0 / 100.0 <= 1e-3 + 1e-12:
                cst[f"swap_{lado}_pb_dia"] = exacto
    spec["costes"] = cst
    if sum(cst[k] for k in ("spread_pb", "comision_pb_lado", "deslizamiento_pb_lado")) <= 0:
        avisos.append("Costes a cero: el backtest sale mejor de lo que sería en real.")
    # corte IS/OOS
    co = a.get("corte") or {"tipo": "auto"}
    ct = str(co.get("tipo", "auto")).lower()
    if ct == "auto":
        spec["corte"] = {"tipo": "pct", "valor": 70}
        extras["corte_auto"] = "70/30 de los datos disponibles"
    elif ct == "pct":
        spec["corte"] = {"tipo": "pct", "valor": _numero(co.get("is_pct", co.get("valor", 70)), "Corte IS/OOS")}
    elif ct == "fecha":
        f = co.get("fecha_efectiva") or co.get("fecha") or co.get("valor")
        if not f:
            raise ErrorSpec("Corte IS/OOS: falta la fecha.")
        spec["corte"] = {"tipo": "fecha", "valor": str(f)[:10]}
    else:
        raise ErrorSpec(f"Corte IS/OOS: tipo «{ct}» no válido (auto, pct o fecha).")
    # ejecución: apertura de la vela siguiente o cierre de la misma vela
    ej = a.get("ejecucion") or {}
    spec["ejecucion"] = str(ej.get("momento") or "apertura_siguiente")
    # sesión intradía
    ses = a.get("sesion")
    if ses:
        ses = dict(ses)
        zd = ((a.get("datos") or {}).get("zona_horaria"))
        if not ses.get("zona_datos") and zd:
            ses["zona_datos"] = zd          # zona de un CSV sin zona horaria (si el CSV trae zona, manda la del CSV)
        spec["sesion"] = ses
    mx = (ses or {}).get("max_operaciones_dia") or g.get("max_operaciones_dia")
    if mx:
        spec["max_operaciones_dia"] = int(_numero(mx, "Máx. operaciones al día"))
    if str(ej.get("orden", "mercado")) not in ("mercado", ""):
        avisos.append("Órdenes: el motor solo simula órdenes a mercado.")
    if isinstance(a.get("optimizar"), dict) and a["optimizar"]:
        spec["optimizar"] = a["optimizar"]
    for k in ("core_logic", "codigo"):
        if a.get(k):
            extras[k] = a[k]
    # rango de fechas pedido
    datos = a.get("datos") or {}
    extras["desde"], extras["hasta"] = datos.get("desde"), datos.get("hasta")
    return spec, avisos, extras


def _recortar(df: pd.DataFrame, desde, hasta, avisos: list) -> pd.DataFrame:
    if not desde and not hasta:
        return df
    try:
        d0 = pd.Timestamp(desde) if desde else df.index[0]
        d1 = pd.Timestamp(hasta) + pd.Timedelta(days=1) if hasta else df.index[-1] + pd.Timedelta(days=1)
    except Exception:  # noqa: BLE001
        avisos.append("Las fechas desde/hasta no se entienden; se usa todo el fichero.")
        return df
    sub = df[(df.index >= d0) & (df.index < d1)]
    if len(sub) < MIN_VELAS:
        avisos.append(f"El rango pedido ({desde} → {hasta}) deja {len(sub)} velas del fichero; se usa el fichero entero "
                      f"({df.index[0].date()} → {df.index[-1].date()}).")
        return df
    if len(sub) < len(df):
        avisos.append(f"Se usan las velas entre {sub.index[0].date()} y {sub.index[-1].date()} "
                      f"({len(sub)} de {len(df)}), como pide la especificación.")
    holgura = pd.Timedelta(days=10)
    if desde and sub.index[0] - d0 > holgura:
        avisos.append(f"Tu fichero empieza el {sub.index[0].date()}, después de la fecha pedida ({desde}).")
    if hasta and (d1 - pd.Timedelta(days=1)) - sub.index[-1] > holgura:
        avisos.append(f"Tu fichero termina el {sub.index[-1].date()}, antes de la fecha pedida ({hasta}).")
    sub = sub.copy()
    sub.attrs = dict(df.attrs)
    return sub


def correr_spec_app(texto_csv, spec_app, progreso=None, semilla: int = 7) -> dict:
    """CSV en texto + spec de la app (dict o JSON) → dict de resultados (contrato v3). Lanza ErrorDatos/ErrorSpec."""
    def avisar(etapa, pct):
        if progreso is not None:
            try:
                progreso(etapa, pct)
            except Exception:  # noqa: BLE001
                pass
    avisar("Leyendo datos", 5)
    df = cargar_csv(texto_csv)
    avisar("Traduciendo la regla", 10)
    if isinstance(spec_app, str):
        try:
            spec_app = json.loads(spec_app)
        except json.JSONDecodeError as e:
            raise ErrorSpec(f"La especificación no es un JSON válido: {e}")
    if _es_spec_app(spec_app):
        spec, avisos_spec, extras = adaptar_spec_app(spec_app)
        df = _recortar(df, extras.get("desde"), extras.get("hasta"), avisos_spec)
    else:                                   # ya viene en el lenguaje interno (SPEC.md)
        spec, avisos_spec, extras = spec_app, [], {}
    avisar("Simulando la regla (26 corridas)", 15)
    res = validar(df, spec, semilla=semilla,
                  progreso=lambda e, p: avisar(*_PROGRESO_FASES.get(e, (e, int(p * 100)))))
    res["avisos"] = list(res.get("avisos", [])) + avisos_spec
    if extras.get("corte_auto"):
        res["corte_auto"]["metodo"] = extras["corte_auto"]; res["corte_auto"]["tipo"] = "auto"
    for k in ("core_logic", "codigo"):
        if extras.get(k):
            res[k] = extras[k]
    if _es_spec_app(spec_app):
        res["spec_app"] = spec_app
    return _limpio(res)


def ejecutar_spec_app(texto_csv, spec_app_json, progreso=None) -> str:
    """Atajo para la interfaz (Pyodide): CSV + spec de la app → JSON (str) con el resultado o {"error", "tipo"}."""
    try:
        return json.dumps(correr_spec_app(texto_csv, spec_app_json, progreso), ensure_ascii=False, allow_nan=False)
    except (ErrorDatos, ErrorSpec) as e:
        return json.dumps({"error": str(e), "tipo": type(e).__name__}, ensure_ascii=False)
    except Exception as e:  # noqa: BLE001
        return json.dumps({"error": f"Error interno del motor ({type(e).__name__}: {e}). Revisa el CSV y la regla; "
                                    "si persiste, avisa a TIS con el fichero.", "tipo": "ErrorInterno"}, ensure_ascii=False)
