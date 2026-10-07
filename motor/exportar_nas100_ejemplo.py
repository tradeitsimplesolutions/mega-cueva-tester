# -*- coding: utf-8 -*-
"""exportar_nas100_ejemplo.py — genera datos/NAS100_M15_ejemplo.csv en formato TradingView (time ISO con zona horaria).

Fuente: velas de 1 min del Nasdaq 100 CFD de Dukascopy (USATECHIDXUSD), ya descargadas por Sentinel en
sentinel/data/dukascopy/DUKASCOPY-USATECHIDXUSD-2021_2026-M1.parquet (solo se LEE). Se agregan a 15 min en hora de
Nueva York (como un gráfico de TradingView con la zona «New York») y se escribe:
    time,open,high,low,close
    2021-08-02T09:30:00-04:00,15010.9,...
Por defecto solo la sesión regular 9:30-16:00 NY (el fichero queda en ~2 MB); con --24h todas las horas del CFD.
"""
from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

ORIGEN = Path(r"c:/Users/trade/sentinel/data/dukascopy/DUKASCOPY-USATECHIDXUSD-2021_2026-M1.parquet")
DESTINO = Path(__file__).resolve().parent.parent / "datos" / "NAS100_M15_ejemplo.csv"


def main(todo_el_dia: bool = False):
    m1 = pd.read_parquet(ORIGEN)
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
    print(f"{DESTINO} · {len(out)} velas · {out.time.iloc[0]} → {out.time.iloc[-1]} · {DESTINO.stat().st_size / 1e6:.1f} MB")


if __name__ == "__main__":
    main("--24h" in sys.argv)
