# -*- coding: utf-8 -*-
"""exportar_nas100_ejemplo.py — genera datos/NAS100_M15_ejemplo.csv en formato TradingView (time ISO con zona horaria).

Fuente: velas de 1 min del Nasdaq 100 CFD de Dukascopy (USATECHIDXUSD), ya descargadas por Sentinel en
sentinel/data/dukascopy/DUKASCOPY-USATECHIDXUSD-2011_2021-M1.parquet y ..._2021_2026-M1.parquet (solo se LEEN):
desde 2011, para que el diseño del Reto (lo que se mira) cubra más de 5 años. Se agregan a 15 min en hora de
Nueva York (como un gráfico de TradingView con la zona «New York») y se escribe:
    time,open,high,low,close
    2021-08-02T09:30:00-04:00,15010.9,...
Por defecto solo la sesión regular 9:30-16:00 NY (el fichero queda en ~2 MB); con --24h todas las horas del CFD.
"""
from __future__ import annotations

import sys
from pathlib import Path

import lzma
import struct
import time

import pandas as pd

ORIGEN = [Path(r"c:/Users/trade/sentinel/data/dukascopy/DUKASCOPY-USATECHIDXUSD-2011_2021-M1.parquet"),
          Path(r"c:/Users/trade/sentinel/data/dukascopy/DUKASCOPY-USATECHIDXUSD-2021_2026-M1.parquet")]
DESTINO = Path(__file__).resolve().parent.parent / "datos" / "NAS100_M15_ejemplo.csv"
# los días que faltan en los parquet de Sentinel (huecos del descargador) se piden al datafeed público de Dukascopy
# y se guardan aquí (no se versiona): con --rellenar
CACHE = Path(__file__).resolve().parent.parent / "datos" / "cache_dukascopy" / "USATECHIDXUSD"
HOST = "https://www.dukascopy.com/datafeed"
# Dukascopy no tiene la sesión de 2011-09-22 a 2012-01-18 ni la de 2013-10-14/16: se empieza después del último hueco,
# así el fichero sale sin huecos (13 años: el diseño del Reto cubre más de 7).
DESDE = "2013-10-17"
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0 Safari/537.36", "Referer": "https://www.dukascopy.com/"}


def dia_dukascopy(d: pd.Timestamp) -> pd.DataFrame:
    """Velas de 1 min de un día (hora UTC). Caché por día; un día que el servidor no sirve NUNCA se guarda vacío."""
    import requests
    f = CACHE / f"{d.date()}.parquet"
    if f.exists():
        return pd.read_parquet(f)
    url = f"{HOST}/USATECHIDXUSD/{d.year}/{d.month - 1:02d}/{d.day:02d}/BID_candles_min_1.bi5"
    for intento in range(30):
        try:
            r = requests.get(url, headers=UA, timeout=120)
        except Exception:  # noqa: BLE001
            time.sleep(3 * (intento + 1)); continue
        if r.status_code == 429:
            time.sleep(60); continue
        break
    else:
        raise RuntimeError(f"Dukascopy no sirve {d.date()}")
    time.sleep(1.0)
    try:
        raw = lzma.decompress(r.content) if (r.status_code == 200 and r.content) else b""
    except lzma.LZMAError:
        raw = b""
    if raw:
        rec = [struct.unpack(">iiiiif", raw[i * 24:(i + 1) * 24]) for i in range(len(raw) // 24)]
        df = pd.DataFrame(rec, columns=["t", "open", "close", "low", "high", "vol"])
        df["hora"] = pd.Timestamp(d.date(), tz="UTC") + pd.to_timedelta(df.t, unit="s")
        for c in ("open", "high", "low", "close"):
            df[c] = df[c] / 1000.0
        df = df[["hora", "open", "high", "low", "close"]]
    else:
        df = pd.DataFrame(columns=["hora", "open", "high", "low", "close"])
    CACHE.mkdir(parents=True, exist_ok=True)
    if r.status_code == 200:
        df.to_parquet(f, index=False)
    return df


def rellenar(m1: pd.DataFrame) -> pd.DataFrame:
    """Pide los días laborables con la sesión de Nueva York incompleta (menos de 300 de sus 390 minutos)."""
    ny = pd.DatetimeIndex(m1.hora).tz_convert("America/New_York")
    hm = ny.hour * 60 + ny.minute
    en_ses = (hm >= 9 * 60 + 30) & (hm < 16 * 60)
    cuenta = pd.Series(1, index=ny[en_ses].normalize()).groupby(level=0).size()
    todos = pd.bdate_range(ny[0].normalize().tz_localize(None), ny[-1].normalize().tz_localize(None))
    falta = [d for d in todos if cuenta.get(pd.Timestamp(d).tz_localize("America/New_York"), 0) < 300]
    print(f"días con la sesión incompleta: {len(falta)}", flush=True)
    nuevos = []
    for k, d in enumerate(falta):
        x = dia_dukascopy(pd.Timestamp(d))
        if len(x):
            nuevos.append(x)
        if k % 50 == 0:
            print(f"  {k}/{len(falta)} {pd.Timestamp(d).date()}", flush=True)
    if not nuevos:
        return m1
    x = pd.concat(nuevos); x["hora"] = pd.to_datetime(x.hora, utc=True)
    return pd.concat([m1, x]).drop_duplicates("hora", keep="first").sort_values("hora")


def main(todo_el_dia: bool = False, completar: bool = False):
    m1 = pd.concat([pd.read_parquet(f) for f in ORIGEN]).drop_duplicates("hora", keep="last").sort_values("hora")
    m1["hora"] = pd.to_datetime(m1.hora, utc=True)
    if completar:
        m1 = rellenar(m1)
    m1 = m1[m1.hora >= pd.Timestamp(DESDE, tz="America/New_York")]
    m1 = m1.set_index(pd.DatetimeIndex(m1.hora).tz_convert("America/New_York")).drop(columns="hora")
    m1 = m1[m1.index.dayofweek < 5]
    if not todo_el_dia:
        hm = m1.index.hour * 60 + m1.index.minute
        m1 = m1[(hm >= 9 * 60 + 30) & (hm < 16 * 60)]
    # los minutos sin cotización (planos al cierre del CFD) no forman vela
    m15 = m1.resample("15min", label="left", closed="left").agg(
        {"open": "first", "high": "max", "low": "min", "close": "last"}).dropna()
    m15 = m15[m15.high > m15.low]
    iso = m15.index.strftime("%Y-%m-%dT%H:%M:%S%z").str.replace(r"(\d{2})(\d{2})$", r"\1:\2", regex=True)
    out = pd.DataFrame({"time": iso, **{k: m15[k].round(2).to_numpy() for k in ("open", "high", "low", "close")}})
    DESTINO.parent.mkdir(exist_ok=True)
    out.to_csv(DESTINO, index=False, lineterminator="\n")
    print(f"{DESTINO} - {len(out)} velas - {out.time.iloc[0]} a {out.time.iloc[-1]} - {DESTINO.stat().st_size / 1e6:.1f} MB")


if __name__ == "__main__":
    main("--24h" in sys.argv, "--rellenar" in sys.argv)
