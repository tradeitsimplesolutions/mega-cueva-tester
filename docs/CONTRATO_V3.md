# Contrato de datos v3 — MEGA CUEVA TESTER

Un único JSON de resultados alimenta toda la app. Lo produce el **motor** (Pyodide, `motor/motor_tester.py`) para
cualquier estrategia, y para la demo del oro existe precalculado en `datos/oro_rsi4_v3.json`. La app NO carga JSON
a mano: lo recibe del motor (`window.MCT_MOTOR(spec, csvTexto) → Promise<json>`) o usa la demo embebida.

Base: todas las claves de `datos_terminal_v2.json` (eq, dd, split, f1, full, fases, verdict, trades, anual, meseta,
wf, wf_res, mc, stress, mov_medio, dias_medio, velas, ultima, estado, arbol, sizing) **más**:

| Clave | Contenido |
|---|---|
| `cuenta` | `{capital: 100000, moneda: "USD", expectancy_usd, expectancy_pct, ganancia_media_anual_usd, objetivo_anual_usd, objetivo_nota}` — expectancy = ganancia media por operación con cuenta de 100.000 USD (tamaño 100 %, compuesto o no: indicar `compuesto: true/false`) |
| `trades[i]` | además de lo actual: `mfe_pct`, `mae_pct` (máxima excursión a favor/en contra entre entrada y salida, con máximos/mínimos de vela), `ret_usd` (cuenta 100k), `dia_semana_entrada`, `mes_entrada`, `racha` (+n ganadoras seguidas / −n perdedoras) |
| `stats_trades` | `{racha_max_ganadora, racha_max_perdedora, mfe_medio, mae_medio, mfe_medio_ganadoras, mae_medio_perdedoras, duracion_hist:[{dias, n}], por_dia_semana:[{dia, n, ret_medio, acierto}], por_mes:[{mes, n, ret_medio}], payoff, expectancy_r}` |
| `extremos_por_anio` | `[{anio, mejor:{n, fi, ret}, peor:{n, fi, ret}}]` — `n` = índice de la operación en `trades` (1-based) |
| `velas_full` | OHLC diario completo del periodo (t, o, h, l, c, rsi, sma) para poder ver CUALQUIER operación en velas |
| `core_logic` | `{titulo, ventaja_estructural, explicacion_simple, cuando_falla}` — textos cortos (≤2 frases cada uno) |
| `reglas_visual` | `{trigger, filtros:[...], salida:[...], gestion, ejecucion}` — frases cortas para tarjetas |
| `codigo` | `{pine: "...", mql5: "...", notas}` — código listo para copiar |
| `corte_auto` | `{metodo: "70/30 de los datos disponibles", fecha}` |

Spec de entrada (formulario «Prueba inicial» → motor): la `spec` v1 documentada en `README.md`
(`reglas.filtros/entrada/salida` con bloques `{izq, op, der}`). `corte.tipo` admite `"auto"` (70/30 de los datos
disponibles). El motor traduce esa spec a su lenguaje interno (`motor/SPEC.md`).
