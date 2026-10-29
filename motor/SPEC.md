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
| `stop`, `objetivo` | `{"tipo":"atr","n":14,"k":2}` o `{"tipo":"pct","valor":2}` (desde el precio de entrada); `nivel` (ver sesiones). Solo objetivo: `{"tipo":"r","k":2}`. Solo stop: `{"tipo":"trailing",…}` (ver «Stop móvil y objetivo a k·R») | ninguno |
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
- `hora` = hora **con minutos** de la apertura de la vela: hora + minuto/60 (16:15 → 16,25; 09:30 → 9,5). En velas de hora
  entera (H1, D1) da lo mismo que antes. Con horas enteras, `>=` y `<` dan lo mismo que antes también en M15/M30; **`>` y `<=`
  cambian** en velas de menos de una hora (antes `hora > 15` era falso a las 15:30; ahora 15,5 > 15 es verdadero): para
  «desde las 16:00» usa `hora >= 16`. El `valor` puede escribirse como texto `"HH:MM"` (`"15:30"` → 15,5); el texto de la
  regla lo muestra como «hora ≥ 15:30».
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

## Stop móvil y objetivo a k·R (v1.3)

| Tipo | Spec | Qué hace |
|---|---|---|
| Objetivo a k veces el riesgo | `"objetivo": {"tipo": "r", "k": 2}` | entrada ± k·\|entrada − stop inicial\| (largo +, corto −). **Exige stop** (si no, `ErrorSpec`: «El objetivo a k veces el riesgo (p. ej. 2R) necesita un STOP…»). Vale con stop `pct`, `atr`, `nivel` y `trailing` (con el móvil, R se mide con el stop de la primera vela). `k` > 0, admite `"$param"`. Si la distancia al stop es 0 o no se puede calcular, esa operación va sin objetivo. |
| Stop móvil por ATR | `"stop": {"tipo": "trailing", "modo": "atr", "n": 14, "k": 3}` | Largo: (máximo desde la entrada) − k·ATR(n); corto: (mínimo desde la entrada) + k·ATR(n). «Desde la entrada» = el precio de entrada y los máximos/mínimos de las velas YA CERRADAS con la posición abierta. Se recalcula al cierre de cada vela con el ATR de esa vela y solo se mueve a favor. Primera vela: entrada − k·ATR de la vela de la señal (igual que el stop `atr`). |
| Stop móvil por mínimo de n velas | `"stop": {"tipo": "trailing", "modo": "min_n", "n": 10}` | Largo: mínimo de los mínimos de las n velas ANTERIORES; corto: máximo de los máximos. Solo se mueve a favor. Si aún no hay n velas antes de la de entrada, no se entra. |

Reglas comunes del stop móvil: el stop vigente en la vela j se calcula con datos hasta el cierre de j−1 (sin mirar el futuro) y se
vigila DENTRO de la vela j; si la vela abre ya más allá del stop (hueco), sale a la apertura (largo: min(stop, apertura); corto:
max). Si stop y objetivo se tocan en la misma vela, manda el stop. La salida se marca con `motivo = "stop"` (con stop móvil un
«stop» puede cerrar con ganancia). El sizing por riesgo usa la distancia al stop de la primera vela. Con `ejecucion =
cierre_misma_vela` la vigilancia empieza en la vela siguiente a la de entrada y el extremo «desde la entrada» parte del cierre de
entrada. `n` y `k` admiten `"$param"` (entran en la meseta si se optimizan). Errores en español: modo distinto de `atr`/`min_n`,
`k ≤ 0`, `n < 1`, `trailing` como objetivo o `r` como stop.

Spec del formulario (app): `{"tipo": "r", "valor": 2}` (objetivo) · `{"tipo": "trailing", "modo": "atr", "periodo": 14, "valor": 3}`
· `{"tipo": "trailing", "modo": "min_n", "valor": 10}` (stop).

## «PF sin su mejor operación» sobre el total (v1.3)

Igual que las 30 operaciones, el criterio «PF sin su mejor operación > 1» se mide sobre TODAS las operaciones juntas, quitando la
mejor del conjunto (con 10 operaciones en un tramo, quitar la mejor de ese tramo tumba casi siempre a las estrategias de tendencia).
- Cueva Tester (`validar`, Fase 1): sobre diseño + prueba (IS + OOS). `f1.criterios.pf_sin_mejor` usa ese valor; claves nuevas
  `f1.pf_sin_mejor_total` (número; null si hay < 2 operaciones) y `f1.n_total` (nº de operaciones IS + OOS). `f1.OOS.pf_sin_mejor`
  sigue existiendo (el del tramo, informativo); coincide con `full.pf_sin_mejor`.
- Laboratorio (`backtest_lab`): sobre los tramos ABIERTOS (los mismos que cuentan para `n_total`; el examen oculto no entra).
  `criterios.pf_sin_mejor` y `criterios_examen.pf_sin_mejor` usan ese valor; clave nueva `pf_sin_mejor_total`.
  `tramos.<tramo>.pf_sin_mejor` sigue siendo el de cada tramo (informativo).

## Hallazgos del AED: rangos de fuerza contra el azar del propio activo (v1.4)

Sustituye al semáforo por |t| (t ≥ 2 / 1,5 / «3 épocas con |t| ≥ 1») y a la corrección de Bonferroni que estaba
preparada sin activar. Idea (charla del Sersan Summit, caso BTC): cada prueba es un análisis de sangre con razón detrás;
lo que importa es **qué tan fuerte** es lo que vemos, medido contra el **rango de referencia de ese mismo activo**.

- **Efecto** = media de la vela siguiente cuando se cumple la condición − media de una vela cualquiera de su universo
  (universo = todas las velas; en «sobre/bajo su media de 200», solo las velas donde la media ya existe).
- **t** = t de **Welch** del grupo frente al resto de su universo (robusta a que el grupo sea más tranquilo o más movido:
  sin ella, «sobre la media de 200» —tramo de calma— salía artificialmente fuerte).
- **Azar** = los retornos del DISEÑO barajados (permutación), `AED_BARAJADOS` = 400 réplicas, semilla fija
  `AED_SEMILLA` = 20260208 (la ficha no cambia entre recargas). Vectorizado: sumas por producto de matrices, por bloques.
- **fuerza_pct** = % de barajados con |t| menor que el real (empates a medias).
  · `tipo: "mecanismo"` (media de 200, caídas/subidas fuertes, vela de alza/baja, rachas de 3, memoria) → contra su propio barajado.
  · `tipo: "calendario"` (día de la semana, hora, mes; `familia`: `dia` / `hora` / `mes`) → contra el **mejor de su familia**
    en cada barajado («el mejor mono»): más exigente, porque si miras 24 horas alguna sale bonita por suerte.
- **Rangos** (`AED_LIMITE` = 90, `AED_CLARO` = 97,5): `NADA` (rango `ruido`) < 90 · `SE INSINÚA` (`límite`) 90–97,5 ·
  `CLARA` (`claro`) ≥ 97,5 **y** mismo signo en las 3 épocas. Si llega a 97,5 pero no mantiene el signo, se queda en
  SE INSINÚA con `nota`. Los meses no pasan de SE INSINÚA con menos de `AED_MES_ANIOS` = 10 años de diseño.
- **Memoria a 1 vela** (prueba nueva, mecanismo): pendiente de la vela siguiente sobre la de hoy, t robusta
  Σab/√Σ(ab)². `efecto` = lo que cambia la vela siguiente tras una caída de tamaño normal (−movimiento medio):
  positivo = reversión (terreno del RSI corto), negativo = momentum. Claves extra `autocorr`, `detalle`.
- Pruebas nuevas de calendario: «La vela de enero» … «La vela de diciembre» (`que: "horario"`).

Claves por hallazgo (se mantienen `h, que, n, efecto, t, epocas, semaforo, pos`): `tipo`, `familia`, `rango`, `fuerza_pct`,
`epocas_ef` (efecto en cada época, fracción), `media`, `media_ref`, `azar_ref` (frase), `azar_t` (`p50`, `limite`, `claro`:
|t| del azar), `azar_efecto` (`limite`, `claro`: |efecto| que alcanza el azar, fracción), `descartado` (frase con la evidencia,
solo en NADA), `nota`. En `hallazgos`: `azar` (`barajados, semilla, limite, claro, mes_anios_min, anios_diseno, criterio`)
y `n_pruebas`.

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
- Un activo, una posición a la vez; sin órdenes límite/stop de entrada, sin piramidar, sin series externas. El stop móvil
  (`trailing`) solo tiene los modos `atr` y `min_n`, y el objetivo a k·R se fija con el stop inicial (no se mueve con él).
- Pasos: sin reintento dentro del día si una ventana caduca; una sesión no puede cruzar el fin de semana.
- El swap se cobra por día natural cruzado (sin el triple del miércoles), igual que Sentinel.
