# Paquete de datos NDX y SPY — MEGA CUEVA TESTER

Generado el 2026-10-07 con `herramientas/exportar_paquete_ndx_spy.py` (vuelve a correrlo para actualizarlo).
Fuente: históricos de **Darwinex** que ya tiene Sentinel — los mismos precios de la cuenta real, no Yahoo.

| Fichero | Velas | Periodo | Hora | Spread medio |
|---|---|---|---|---|
| `NDX_D1.csv` | 4.639 | 2008-08-06 → 2026-10-02 | fecha sola (diario) | 1,7 pb |
| `NDX_H1.csv` | 54.708 | 2017-04-20 → 2026-07-31 | Nueva York, con zona (`-04:00`/`-05:00`) | 3,9 pb |
| `SPY_D1.csv` | 4.209 | 2010-01-11 → 2026-10-02 | fecha sola (diario) | 10,0 pb |
| `SPY_H1.csv` | 29.068 | 2010-01-11 → 2026-07-30 | Nueva York, con zona | 10,4 pb |

Formato `time,open,high,low,close` (el de «Exportar datos del gráfico» de TradingView). Los cuatro pasan por
`cargar_csv()` sin avisos de limpieza y corren las 5 fases enteras.

## Cómo usarlos
1. En el tester, **Subir CSV** → el fichero que toque. El motor solo acepta `.csv` / `.txt`: los `.xlsx` son para mirar.
2. En **costes**, pon el `spread_pb` de la tabla (+ `deslizamiento_pb_lado` 1–3; comisión 0 en CFD de índice).
3. En H1, la hora ya viene con zona horaria: el bloque `sesion` con `"zona_horaria": "America/New_York"` cuadra
   con el horario real del mercado sin tocar nada. En D1 no hace falta sesión.

## Lo que hay que saber
- **La hora.** El servidor de Darwinex es GMT+2 en invierno y GMT+3 en verano (sigue el cambio de hora de EEUU),
  o sea Nueva York + 7 h todo el año. El H1 se exporta ya convertido a Nueva York con su zona; el D1 va con la
  fecha de la vela del servidor.
- **SPY no lleva dividendos en el precio.** Es el CFD del ETF: el precio cae el día del ex-dividendo y el dividendo
  llega aparte. Un largo mantenido rinde en real algo más (~1,3 %/año) de lo que dice el backtest.
- **El H1 está exportado hasta el 31 de julio de 2026**; el diario llega al 2 de octubre. Para refrescarlo hay que
  volver a exportar desde el terminal MT5.
- **No hay columna de volumen**: los bloques con `volumen` no se pueden usar con estos ficheros.
- El spread de SPY es ancho y desigual (mediana 10 pb, pero 1 día de cada 10 pasa de 42 pb). Si una regla de SPY
  hace muchas operaciones, prueba también con el spread al doble.
