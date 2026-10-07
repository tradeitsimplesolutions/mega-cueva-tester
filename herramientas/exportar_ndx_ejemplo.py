# -*- coding: utf-8 -*-
"""Genera datos/NDX_D1_ejemplo.csv: Nasdaq 100 (NDX) diario de Darwinex, tal como lo guarda Sentinel.

Origen: sentinel.datos.cargar("NDX") (parquet de Darwinex, hora del servidor MT5). Formato de «Exportar datos del
gráfico» de TradingView: time,open,high,low,close con la fecha AAAA-MM-DD.

Uso:  python herramientas/exportar_ndx_ejemplo.py
"""
from __future__ import annotations
import sys
from pathlib import Path

DESTINO = Path(__file__).resolve().parents[1] / "datos" / "NDX_D1_ejemplo.csv"


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    sys.path.insert(0, r"c:/Users/trade/sentinel/codigo")
    from sentinel import datos
    df = datos.cargar("NDX").sort_index()
    lineas = ["time,open,high,low,close"] + [
        f"{t:%Y-%m-%d},{o:.2f},{h:.2f},{l:.2f},{c:.2f}"
        for t, o, h, l, c in zip(df.index, df["open"], df["high"], df["low"], df["close"])]
    DESTINO.write_text("\n".join(lineas) + "\n", encoding="utf-8")
    print(f"{DESTINO} · {len(df)} velas · {df.index[0]:%Y-%m-%d} → {df.index[-1]:%Y-%m-%d}")


if __name__ == "__main__":
    main()
