# -*- coding: utf-8 -*-
"""Genera datos/XAUUSD_D1_ejemplo.csv para que el alumno pruebe MEGA CUEVA TESTER.

Origen: histórico D1 de XAUUSD de Darwinex (hora del servidor MT5, GMT+3 con horario de EE. UU.) que guarda Sentinel
en c:/Users/trade/sentinel/data/darwinex/D1/. Se exporta TAL CUAL lo da el terminal (sin fundir los domingos antiguos:
eso lo hace cargar_csv), con el formato de «Exportar barras» de MT5: tabulador, cabecera <DATE> <OPEN> <HIGH> <LOW> <CLOSE>
y fechas AAAA.MM.DD.

Uso:  python exportar_csv_ejemplo.py
"""
from __future__ import annotations
import glob
import sys
from pathlib import Path

import pandas as pd

ORIGEN = Path(r"c:/Users/trade/sentinel/data/darwinex/D1")
DESTINO = Path(__file__).resolve().parents[1] / "datos" / "XAUUSD_D1_ejemplo.csv"


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    f = glob.glob(str(ORIGEN / "*-XAUUSD-*-D1.parquet"))
    if not f:
        raise SystemExit(f"No encuentro el parquet de XAUUSD D1 en {ORIGEN}")
    df = pd.read_parquet(f[0]).sort_values("datetime_servidor")
    out = pd.DataFrame({
        "<DATE>": pd.to_datetime(df["datetime_servidor"]).dt.strftime("%Y.%m.%d"),
        "<OPEN>": df["open"].round(2), "<HIGH>": df["high"].round(2),
        "<LOW>": df["low"].round(2), "<CLOSE>": df["close"].round(2),
    })
    DESTINO.parent.mkdir(parents=True, exist_ok=True)
    out.to_csv(DESTINO, sep="\t", index=False, lineterminator="\n")
    print(f"{DESTINO} · {len(out)} velas · {out['<DATE>'].iloc[0]} → {out['<DATE>'].iloc[-1]}")


if __name__ == "__main__":
    main()
