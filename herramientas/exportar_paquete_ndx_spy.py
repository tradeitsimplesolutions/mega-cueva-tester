# -*- coding: utf-8 -*-
"""Genera datos/paquete_ndx_spy/: Nasdaq 100 (NDX) y S&P 500 ETF (SPY) de Darwinex, listos para el MEGA CUEVA TESTER.

Fuente: parquet de Darwinex que ya tiene Sentinel (solo se LEE), con la hora del servidor MT5 (GMT+2 en invierno,
GMT+3 en verano, cambia con el DST de EEUU → es Nueva York + 7 h todo el año).

- D1: formato «Exportar datos del gráfico» de TradingView, fecha AAAA-MM-DD (sin hora: el motor la trata como diaria).
- H1: fecha ISO con zona horaria de Nueva York (2021-08-02T09:30:00-04:00), para que el bloque `sesion` del motor
  cuadre con el horario real del mercado sin que el alumno tenga que configurar nada.

Uso:  python herramientas/exportar_paquete_ndx_spy.py
"""
from __future__ import annotations
import sys
from pathlib import Path

import pandas as pd

SENTINEL = r"c:/Users/trade/sentinel/codigo"
DESTINO = Path(__file__).resolve().parents[1] / "datos" / "paquete_ndx_spy"
SERVIDOR_A_NY = pd.Timedelta(hours=7)   # verificado: mismas horas de servidor en enero y en julio
PIEZAS = [("NDX", "D1"), ("NDX", "H1"), ("SPY", "D1"), ("SPY", "H1")]


def exportar(df: pd.DataFrame, tf: str, destino: Path) -> int:
    if tf == "D1":
        time = df.index.strftime("%Y-%m-%d")
    else:
        ny = (df.index - SERVIDOR_A_NY).tz_localize("America/New_York", ambiguous="infer", nonexistent="shift_forward")
        time = ny.strftime("%Y-%m-%dT%H:%M:%S%z").str.replace(r"(\d{2})(\d{2})$", r"\1:\2", regex=True)
    out = pd.DataFrame({"time": time, **{k: df[k].round(2).to_numpy() for k in ("open", "high", "low", "close")}})
    out.to_csv(destino, index=False, lineterminator="\n")
    return len(out)


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    sys.path.insert(0, SENTINEL)
    from sentinel import datos
    DESTINO.mkdir(parents=True, exist_ok=True)
    for simbolo, tf in PIEZAS:
        df = datos.cargar(simbolo, tf).sort_index()
        fichero = DESTINO / f"{simbolo}_{tf}.csv"
        n = exportar(df, tf, fichero)
        pb = (df["spread"] / df["close"] * 10_000).mean()
        print(f"{fichero.name} · {n} velas · {df.index[0]:%Y-%m-%d} → {df.index[-1]:%Y-%m-%d} · "
              f"{fichero.stat().st_size / 1e6:.1f} MB · spread medio {pb:.1f} pb")


if __name__ == "__main__":
    main()
