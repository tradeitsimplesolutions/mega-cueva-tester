# Paquete de datos NDX y SPY — MEGA CUEVA TESTER

Generado con `herramientas/exportar_paquete_ndx_spy.py` (vuelve a correrlo para actualizarlo). Fuente: históricos de
**Darwinex** que ya tiene Sentinel — los mismos precios de la cuenta real, no Yahoo. Van también dentro de la app, en
la librería de datos (botones «Nasdaq · diario», «S&P 500 · 1 hora»…).

| Fichero | Velas | Periodo | Hora |
|---|---|---|---|
| `NDX_D1.csv` | 4.639 | 2008-08-06 → 2026-10-02 | fecha sola (diario) |
| `NDX_H1.csv` | 54.708 | 2017-04-19 → 2026-07-31 | Nueva York, con zona (`-04:00`/`-05:00`) |
| `SPY_D1.csv` | 4.209 | 2010-01-11 → 2026-10-02 | fecha sola (diario) |
| `SPY_H1.csv` | 29.068 | 2010-01-11 → 2026-07-30 | Nueva York, con zona |

Formato `time,open,high,low,close` (el de «Exportar datos del gráfico» de TradingView). Los cuatro pasan por
`cargar_csv()` sin avisos de limpieza y corren las 5 fases enteras.

## Costes (perfil `darwinex_mt5` de Sentinel)
Si los cargas desde la librería, la app ya los pone. Si subes el CSV a mano:

| | spread | comisión/lado | deslizamiento/lado | swap compras |
|---|---|---|---|---|
| NDX | 0,33 pb | 0,01 pb | 3 pb | −5,55 %/año |
| SPY | 0,32 pb | **1 pb** (es un ETF) | 3 pb | −5,58 %/año |

## Lo que hay que saber
- **La hora.** El servidor de Darwinex es GMT+2 en invierno y GMT+3 en verano (sigue el cambio de hora de EEUU), o sea
  Nueva York + 7 h todo el año. El H1 se exporta ya convertido a Nueva York con su zona, así que el bloque `sesion`
  con `"zona_horaria": "America/New_York"` cuadra sin tocar nada. El D1 va con la fecha de la vela del servidor.
- **SPY no lleva dividendos en el precio.** Es el CFD del ETF: el precio cae el día del ex-dividendo y el dividendo
  llega aparte. Un largo mantenido rinde en real algo más (~1,3 %/año) de lo que dice el backtest.
- **El H1 está exportado hasta el 31 de julio de 2026**; el diario llega al 2 de octubre. Para refrescarlo hay que
  volver a exportar desde el terminal MT5.
- **No hay columna de volumen**: los bloques con `volumen` no se pueden usar con estos ficheros.
