# MEGA CUEVA TESTER

Lead magnet de **Trade It Simple** para el evento Mega Cueva. Es una web que enseña y aplica el
método TIS para validar una estrategia: las 5 fases, la paridad con MT5 y una prueba inicial guiada.
Tiene dos niveles, **Entender** (lenguaje llano) y **Avanzado** (cifras y criterios), que se cambian
abajo a la izquierda o con la tecla `N`.

Trae cargada una demo real: **Oro RSI(4) 25/55** (XAUUSD diario, 1998–2026, tamaño 100 %).
Sus cifras salen de `sentinel/reportes/oro_rsi4/datos_terminal_v2.json` y aquí no se ha inventado ninguna.

## Cómo se abre
Doble clic en `app/index.html`. Es un solo fichero con los datos de la demo dentro. Necesita internet
solo para las fuentes de Google; sin internet funciona igual, con fuentes de sistema.

Teclas: `0`–`6` para las estaciones · `←` `→` · `P` para presentar · `N` para el nivel · `?` para la ayuda · `Esc` para salir.

## Estaciones
E0 Las fases (qué es validar, 3 trampas, galería interactiva de fases) · E1 Resumen · E2 Estrategia
(árbol de decisión + precio) · E3 Prueba inicial (formulario → pseudocódigo/spec en vivo + checklist) ·
E4 Backtest · E5 Operaciones · E6 Protocolo completo (F1–F5 + paridad MT5, con subida del informe del Strategy Tester).

## Estructura
```
app/index.html            ← la app: v5 + páginas nuevas (se edita a mano; NO la genera construir.py)
app/avanzado.html         ← terminal del oro (modo AVANZADO)
app/alternativa_topografia.html ← diseño descartado, generado por construir.py
src/plantilla.html        ← HTML con marcadores /*__CSS__*/ /*__DATOS__*/ /*__JS__*/
src/estilos.css           ← tokens y estilos (dirección «Topografía de cueva»)
src/js/01..05_*.js        ← código, concatenado en orden
datos/oro_rsi4.json       ← demo (copia de datos_terminal_v2.json)
docs/DIRECCIONES_DISENO.md← las 3 direcciones visuales y por qué se eligió una
herramientas/construir.py ← python herramientas/construir.py [json_demo]  → app/alternativa_topografia.html
herramientas/verificar.py ← recorrido con Playwright; capturas en capturas/
```

## Contrato de datos

### 1 · Resultados → `cargarResultados(json)`
Es la única función que pinta resultados (`window.cargarResultados`). La usan el botón «Cargar resultados (.json)»
(también se puede arrastrar el fichero a la ventana) y el motor. El formato es el de `datos/oro_rsi4.json`:

| Campo | Oblig. | Contenido |
|---|---|---|
| `f1` | sí | `{fecha_split, IS:{…}, OOS:{…}, criterios:{pf_oos,n_oos,dd_oos,pf_sin_mejor}, frontera, pasa}`; IS/OOS con `n, pf, pf_sin_mejor, maxdd, ret_total, cagr, sharpe, win_rate, exposicion` |
| `full` | sí | las mismas métricas sobre el periodo completo |
| `fases` | sí | `{F1..F5: bool}` |
| `eq`, `dd` | sí | `[[fecha, capital_base_1], …]` y caída (≤0) para cada punto |
| `trades` | sí | `[{n, fi, fo, pi, po, mov, dias, ret, oos}]` |
| `split, desde, hasta, sizing, anual, wf, wf_res, meseta, mc, stress, velas, estado, arbol, verdict, dias_medio` | no | igual que la demo; si faltan, esa pieza dice «sin datos» |
| `meta` | no | `{nombre, activo, tf, lema, origen, regla_html, osc:{nombre,compra,venta}, media, pasos[], glosario[[t,d]]}` |
| `paridad` | no | `{zona, costes, reconciliacion}`, cada uno con `{estado:'pasa'|'falla'|'pend', txt}` |

### 2 · Prueba inicial → `correrMotor(spec)`
«Correr prueba inicial» llama a `correrMotor(spec)`. Si existe `window.MCT_MOTOR = async spec => resultados`, lo usa
y pinta lo que devuelva con `cargarResultados`. Si no existe, enseña la Fase 1 de la demo y lo avisa.
`spec`, versión 1:

```json
{
  "version": 1, "nombre": "Oro RSI(4) 25/55",
  "activo": {"simbolo": "XAUUSD", "clase": "metal|indice|forex|accion_etf|cripto|energia"},
  "temporalidad": "M5|M15|H1|H4|D1|W1",
  "direccion": "largo|corto|ambos",
  "datos": {"fuente": "darwinex_mt5|csv_propio|dukascopy|yahoo", "desde": "1998-04-22", "hasta": "2026-10-02",
            "zona_horaria": "servidor_gmt3_usdst|utc|nueva_york|madrid"},
  "reglas": {
    "filtros": [{"izq": {"tipo": "precio"}, "op": ">", "der": {"tipo": "sma", "periodo": 200}}],
    "entrada": [{"izq": {"tipo": "rsi", "periodo": 4}, "op": "<", "der": {"tipo": "num", "valor": 25}}],
    "salida":  [{"izq": {"tipo": "rsi", "periodo": 4}, "op": ">", "der": {"tipo": "num", "valor": 55}}]
  },
  "ejecucion": {"momento": "apertura_siguiente|cierre_misma_vela", "orden": "mercado"},
  "gestion": {"stop": {"tipo": "ninguno|pct|atr", "valor": null},
              "objetivo": {"tipo": "ninguno|pct|atr", "valor": null},
              "salida_tiempo_velas": null},
  "sizing": {"tipo": "pct_capital|riesgo_pct|lotes_fijos", "valor": 100},
  "costes": {"perfil": "darwinex_mt5|manual", "spread_pb": 1.03, "comision_pb_lado": 0.01,
             "deslizamiento_pb_lado": 3, "swap_largo_pct_anual": -5.39, "swap_corto_pct_anual": 3.07},
  "corte": {"tipo": "fecha|pct", "fecha": "2018-03-08", "is_pct": 70, "fecha_efectiva": "2018-03-08"}
}
```
- Operando `tipo`: `precio` (cierre), `apertura`, `maximo`, `minimo`, `sma`/`ema`/`rsi`/`atr`/`max_n`/`min_n`
  (con `periodo`) o `num` (con `valor`). `op`: `>`, `<`, `>=`, `<=`, `cruza_arriba`, `cruza_abajo`.
- Entrar = todos los filtros **y** todas las condiciones de entrada. Salir = cualquiera de salida, stop, objetivo o tiempo.
  Se evalúa al cierre de la vela. `ambos` = el corto usa las condiciones espejo.
- `pb` = puntos básicos sobre el nocional. El spread es el total; la comisión y el deslizamiento van por lado.
- `corte.fecha_efectiva` es el primer día de la prueba honesta (OOS), ya calculado aunque el corte sea por %.
- Los costes que vienen puestos salen del perfil `darwinex_mt5` del terminal (la fuente se indica en el formulario).

**Reglas de sesión intradía** (motor v1.2; ejemplo completo en `motor/spec_app_nas100_apertura_ny.json`), campos añadidos a la spec v1:
```json
"sesion": {"zona_horaria": "America/New_York", "inicio": "09:30", "fin": "16:00", "cerrar_al_final": true, "max_operaciones_dia": 1},
"niveles": [{"nombre": "NIVEL", "valor": {"tipo": "sesion_anterior_max"}}],
"reglas": {"pasos": [
   {"nombre": "RUPTURA",  "condiciones": [{"izq": {"tipo": "maximo"}, "op": ">", "der": {"tipo": "nivel", "nombre": "NIVEL"}}],
    "ventana": {"tipo": "primeras_velas_sesion", "velas": 2}},
   {"nombre": "RETESTEO", "condiciones": [{"izq": {"tipo": "minimo"}, "op": "<=", "der": {"tipo": "nivel", "nombre": "NIVEL"}},
                                          {"izq": {"tipo": "precio"}, "op": ">",  "der": {"tipo": "nivel", "nombre": "NIVEL"}}],
    "ventana": {"tipo": "velas_tras_anterior", "velas": 8}}],
  "entrada": [], "salida": [{"izq": {"tipo": "precio"}, "op": "<", "der": {"tipo": "nivel", "nombre": "NIVEL"}}]},
"ejecucion": {"momento": "cierre_misma_vela"},
"gestion": {"stop": {"tipo": "nivel", "valor": {"tipo": "minimo"}}}
```
- Operandos nuevos (`tipo`): `sesion_anterior_max|min|apertura|cierre`, `sesion_max|min|apertura` (sesión actual hasta ahora),
  `vela_sesion_max|min|apertura|cierre` (+ `k`: vela k de la sesión), `vela_sesion` (nº de vela en la sesión), `nivel` (+ `nombre`).
- `pasos` se cumplen en orden; la ventana de cada paso pasa a parámetro (`n_ruptura`, `n_retesteo`) y la meseta los mueve.
- `datos.zona_horaria` = zona de un CSV SIN zona horaria; si el CSV de TradingView trae `time` ISO con desfase o UNIX, se convierte solo.
- Salidas por orden en cada vela: stop dentro de la vela → condición de salida al cierre → fin de sesión.
- La app trae el ejemplo NAS100 (botón «Cargar el ejemplo NAS100 de la Mega Cueva»): `montar_v6.py` incrusta la spec y el CSV M15
  comprimido (gzip + base64, ~0,7 MB en vez de 2 MB) y la app lo descomprime al pulsar con `DecompressionStream('gzip')`.
  Resultado esperado con el motor: 224 operaciones (150 IS / 74 OOS), PF 0,77 / 0,64, 0/5 fases. Es el ejemplo didáctico, no una estrategia ganadora.

## Limitaciones
- No calcula nada por sí sola: sin el motor, la prueba inicial enseña los resultados de la demo.
- La lectura del informe del Strategy Tester es orientativa. Busca el nº de operaciones, el beneficio neto y el
  depósito inicial en el HTML de MT5, en inglés o en español. No sustituye a la reconciliación operación a operación.
- El árbol de decisión y la «ruta de hoy» se adaptan a cualquier `arbol` y `estado`, pero la frase de hoy
  está pensada para filtros de media (`estado.sma200`). En otro caso, manda `estado.ruta` (lista de ids de nodo).
