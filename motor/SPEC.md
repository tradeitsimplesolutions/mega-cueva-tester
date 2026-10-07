# Regla por bloques (`spec`) — MEGA CUEVA TESTER

La regla es un JSON. `normalizar_spec()` la valida y da errores en español si falta algo.

## Campos

| Campo | Qué es | Por defecto |
|---|---|---|
| `nombre`, `activo` | Texto libre | "Mi estrategia", "ACTIVO" |
| `temporalidad` | `D1`, `H1`… (solo aviso si no coincide con el CSV) | la del fichero |
| `direccion` | `largo` · `corto` · `ambos` | `largo` |
| `parametros` | Valores con nombre; se usan en los bloques como `"$nombre"` | `{}` |
| `filtros` | Grupo que deben cumplir TODAS las entradas (largas y cortas) | ninguno |
| `largo` / `corto` | `{filtros, entrada, salida}`: grupos de ese lado | — |
| `stop`, `objetivo` | `{"tipo":"atr","n":14,"k":2}` o `{"tipo":"pct","valor":2}` (desde el precio de entrada) | ninguno |
| `salida_tiempo` | Nº de velas; sale en la apertura de la vela entrada+N | sin límite |
| `sizing` | `{"tipo":"nocional","pct":100}` o `{"tipo":"riesgo","pct":1,"apalancamiento_max":1}` (riesgo exige stop) | 100 % |
| `costes` | `spread_pb` (por operación), `comision_pb_lado`, `deslizamiento_pb_lado`, `swap_largo_pb_dia`, `swap_corto_pb_dia` (pb = puntos básicos, 0,01 %; swap negativo = coste) | 0 |
| `corte` | `{"tipo":"pct","valor":70}` o `{"tipo":"fecha","valor":"2018-01-01"}` | 70 % |
| `optimizar` | 2 parámetros × 5 valores, el canónico en el CENTRO (meseta y walk-forward). `null` como lista → rejilla automática ±10 %/±20 % | los 2 primeros parámetros numéricos |

**Ejecución (fija):** la señal se evalúa al cierre de la vela y la orden va a mercado en la apertura de la siguiente.
Stop y objetivo se vigilan dentro de la vela; si se tocan los dos en la misma, se asume el stop. Si en una vela salta
la salida y hay señal de entrada, se sale y se vuelve a entrar en la misma apertura. Señal larga y corta a la vez = no se opera.

## Grupos y bloques

Grupo: `{"op": "Y" | "O", "bloques": [bloque | grupo, ...]}` (una lista sola = Y).

Bloque: `{"indicador": X, <parámetros>, "comparador": C, "valor": número | "$param"}` o `... "contra": {operando}`.

- Comparadores: `>`, `<`, `>=`, `<=`, `cruza_arriba`, `cruza_abajo`.
- Indicadores: `close`, `open`, `high`, `low`, `volumen`, `sma(n, fuente)`, `ema(n, fuente)`, `rsi(n)` (Wilder),
  `atr(n)`, `bollinger_sup/inf(n, k)`, `bollinger_media(n)`, `max_n(n, fuente=high)` y `min_n(n, fuente=low)` (de las n velas
  ANTERIORES, sin la actual: sirven para rupturas), `cambio_pct(n)` (en %), `ibs`, `dia_semana` (1 = lunes), `hora`, `mes`.
- Opcionales en cualquier operando: `desfase` (valor de hace N velas), `factor` (multiplica, p. ej. 1.02 × SMA).
- Cualquier parámetro puede ser `"$nombre"`.

## Ejemplo: Oro RSI(4) 25/55 (Connors)

Cierre > SMA(200) y RSI(4) Wilder < 25 → compra en la apertura siguiente; RSI(4) > 55 → venta en la apertura siguiente; solo largos.
(Fichero: `spec_oro_rsi4.json`; costes = perfil darwinex_mt5 de Sentinel.)

```json
{
  "nombre": "Oro RSI(4) 25/55", "activo": "XAUUSD", "temporalidad": "D1", "direccion": "largo",
  "parametros": {"rsi_n": 4, "entrada": 25, "salida": 55, "sma": 200},
  "filtros": {"op": "Y", "bloques": [
    {"indicador": "close", "comparador": ">", "contra": {"indicador": "sma", "n": "$sma"}}]},
  "largo": {
    "entrada": {"op": "Y", "bloques": [{"indicador": "rsi", "n": "$rsi_n", "comparador": "<", "valor": "$entrada"}]},
    "salida":  {"op": "O", "bloques": [{"indicador": "rsi", "n": "$rsi_n", "comparador": ">", "valor": "$salida"}]}
  },
  "stop": null, "objetivo": null, "salida_tiempo": null,
  "sizing": {"tipo": "nocional", "pct": 100},
  "costes": {"spread_pb": 0.134, "comision_pb_lado": 0.01, "deslizamiento_pb_lado": 3.0,
             "swap_largo_pb_dia": -1.4368, "swap_corto_pb_dia": 0.8013},
  "corte": {"tipo": "pct", "valor": 70},
  "optimizar": {"entrada": [15, 20, 25, 30, 35], "salida": [45, 50, 55, 60, 65]}
}
```

`pseudocodigo(spec)` lo traduce a:

```
ESTRATEGIA «Oro RSI(4) 25/55» · XAUUSD · D1 · solo largos (compras)
Parámetros: rsi_n = 4, entrada = 25, salida = 55, sma = 200
Cada vez que CIERRA una vela, el sistema revisa:
  FILTRO (para cualquier entrada): Cierre > SMA(200)
  ENTRADA LARGO: si no hay posición, y pasa el filtro, y RSI(4) < 25 → COMPRA en la APERTURA de la vela siguiente.
  SALIDA LARGO: si hay posición y RSI(4) > 55 → VENDE (cierra el largo) en la APERTURA de la vela siguiente.
  ...
```

## Salida de `validar(df, spec)`

Mismo formato que `sentinel/reportes/oro_rsi4/datos_terminal_v2.json` (`sizing, split, desde, hasta, eq, dd, f1, full, fases,
verdict, trades, anual, meseta, wf, wf_res, mc, stress, mov_medio, dias_medio, velas, ultima, estado, arbol, agentes`) más:
`spec`, `pseudocodigo`, `paridad` (`{"estado": "pendiente: sube tu informe del Strategy Tester"}`), `avisos` (limpieza del CSV),
`tf`, `n_velas`, `tiempos`, `fases_detalle`; `arbol_corto` si la dirección es `ambos`. En `velas` y `estado` cada indicador
aparece con su etiqueta (`rsi4`, `sma200`…) y además como `rsi` / `sma` (el primero de cada tipo). `trades` añade `lado` y `motivo`.
Todo es JSON estricto (NaN → null).

Para la interfaz: `ejecutar(texto_csv, spec_json)` devuelve el JSON en texto, o `{"error": "...", "tipo": "ErrorDatos|ErrorSpec"}`.
Spec del formulario de la app (README, versión 1): `ejecutar_spec_app(texto_csv, spec_app, progreso=None)` la traduce
(`adaptar_spec_app`): los números de las condiciones pasan a parámetros con nombre (`entrada`, `salida`, `filtro`, `rsi_n`,
`sma_n`…; la meseta mueve los 2 primeros salvo que la spec traiga `optimizar`), swap % anual → pb/día natural (÷365),
`corte.tipo = "auto"` = 70/30, `ambos` = el corto con la regla espejo (RSI < 25 → RSI > 75; Cierre > SMA → Cierre < SMA),
`datos.desde/hasta` recortan el CSV. Añade las claves del contrato v3 (`docs/CONTRATO_V3.md`): `cuenta`, trades ampliados,
`stats_trades`, `extremos_por_anio`, `velas_full`, `corte_auto`, `reglas_visual`, `estado.ruta`; `core_logic`/`codigo` = null
salvo que la spec los traiga. En el navegador: `app/motor_puente.js` (generado con `python motor/construir_puente.py`).

Paridad: `reconciliar_mt5(resultado["trades"], texto_o_bytes_del_informe)` → `{n_motor, n_mt5, cuadra_n, dif_relativa, cuadra, estado, diferencias…}`.

## Reglas de sesión intradía (v1.2)

Para reglas del tipo «rompe el máximo de ayer en la apertura y lo retestea» (ejemplo: `spec_nas100_apertura_ny.json`,
ficha `mesa-tis/fichas/EJEMPLO_nas100_apertura_ny.md`). Campos nuevos (todos opcionales):

| Campo | Qué es |
|---|---|
| `sesion` | `{"zona_horaria": "America/New_York", "inicio": "09:30", "fin": "16:00", "cerrar_al_final": true, "zona_datos": null}`. Vela 1 = la que empieza a la hora de inicio; las velas fuera de la sesión no cuentan. `cerrar_al_final` = sale al cierre de la última vela de la sesión. |
| hora del CSV | Si el CSV trae zona (ISO `2026-01-05T09:30:00-05:00`, `Z`) o es UNIX, se pasa a `zona_horaria` exacta (con DST). Si no trae zona, se asume `zona_datos` (p. ej. `UTC`) o, si falta, que ya está en la hora de la sesión. |
| `ejecucion` | `"apertura_siguiente"` (por defecto) o `"cierre_misma_vela"` (entra y sale al cierre de la vela de la señal). |
| `max_operaciones_dia` | Nº máximo de operaciones por sesión/día; tras salir solo se reentra si queda cupo. |
| `niveles` | Precios con nombre: `{"NIVEL": {"indicador": "sesion_anterior_max"}}`. En los bloques: `{"indicador": "nivel", "nombre": "NIVEL"}`; el texto dice «NIVEL». |
| `largo.pasos` / `corto.pasos` | Máquina de estados: `[{nombre, cuando: grupo, ventana: {tipo, velas}}]`. Los pasos se cumplen en orden; la entrada es la vela en la que se completa el último (y `entrada`, si existe). Ventanas: `primeras_velas_sesion` (el paso debe ocurrir en las N primeras velas de la sesión) y `velas_tras_anterior` (en las N velas siguientes a la del paso anterior). Si una ventana caduca, ese día no se opera (no se reintenta). `velas` admite `"$param"`. |
| `stop` / `objetivo` tipo `nivel` | `{"tipo": "nivel", "operando": {"indicador": "low"}}` = el precio de ese operando en la vela de la señal (STOP = mínimo de la vela de retesteo). `operando_corto` opcional para los cortos. |

Operandos de sesión: `sesion_anterior_max|min|apertura|cierre` (sesión anterior con datos), `sesion_max|min` (de la sesión actual
hasta la vela actual incluida), `sesion_apertura`, `vela_sesion_max|min|apertura|cierre` con `k` (vela k de la sesión; vacío hasta
que cierra), `vela_sesion` (nº de vela dentro de la sesión, 1 = la primera) y `en_sesion` (1/0).

**Salidas, en cada vela y en este orden:** 1) stop y objetivo dentro de la vela (si los dos, el stop; con hueco de apertura, al
precio de apertura); 2) condición de salida al cierre (con `cierre_misma_vela` sale a ese cierre; con `apertura_siguiente`, en la
apertura siguiente); 3) salida por tiempo; 4) fin de sesión (cierre de la última vela). Con entrada al cierre, la vigilancia empieza
en la vela siguiente. No se entra en la última vela de la sesión.

**Rendimiento:** cada condición se evalúa una vez para todo el histórico (numpy) y se convierte en «próxima vela verdadera desde i»
con un único pase vectorizado; el simulador recorre las sesiones con aritmética escalar y solo busca el stop con una porción numpy
por operación. 32.000 velas de 15 min (5 años) × 26 corridas: ~0,4 s en local, ~0,7 s en el navegador (+ ~1,5 s de lectura del CSV).

Meseta con nº de velas: la rejilla automática nunca baja de 1; si el canónico no cabe en el centro (p. ej. 2 → `[1,2,3,4,5]`) va en
la 2.ª posición y la meseta 3×3 se mide alrededor de él. El walk-forward usa ventanas por años (IS 3 + OOS 1).

## Límites

- 300 a 250.000 velas. Se simulan 26 corridas (rejilla 5×5 + costes ×2); el walk-forward re-optimiza ELIGIENDO entre esas 25
  corridas en cada ventana (no resimula), como Sentinel: por eso solo puede re-optimizar sobre los 2 ejes de la meseta.
- Walk-forward necesita ≥ 4,5 años de histórico (IS 3 años + OOS 1 año).
- Régimen malo de la Fase 5 = peor año del activo (comprar y mantener) ∪ 2022, como en Sentinel.
- Un activo, una posición a la vez; sin órdenes límite/stop de entrada, sin piramidar, sin trailing stop, sin series externas.
- Pasos: sin reintento dentro del día si una ventana caduca; una sesión no puede cruzar el fin de semana.
- El swap se cobra por día natural cruzado (sin el triple del miércoles), igual que Sentinel.
