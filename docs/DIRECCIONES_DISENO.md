# MEGA CUEVA TESTER — direcciones de diseño

Punto de partida: la Terminal TIS v5 (azul noche + cian + oro con brillo, Chakra Petch).
La clienta la ve "AI genérico". Se exploraron tres identidades nuevas; se aplica la **A**.

Reglas comunes a las tres: texto ≥14 px (mínimo 12 px en etiquetas), cifras con
`tabular-nums`, **color semántico (pasa / falla / pendiente) separado del acento**,
tema oscuro principal y claro opcional con los mismos tokens, nada de emojis como iconos.

---

## A · TOPOGRAFÍA DE CUEVA  ← elegida

**Idea.** La app es el *levantamiento topográfico* de una cueva. Cada sección es una
**estación** (E0…E6) de una travesía que baja de lo general a lo concreto: E0 las fases,
E6 el protocolo completo. La navegación es la poligonal de la travesía (estaciones unidas
por una visual discontinua) y el protocolo se dibuja como una **galería que se estrecha**:
cada fase es un estrechamiento por el que la estrategia tiene que pasar.

| Token | Oscuro | Claro | Uso |
|---|---|---|---|
| `--roca` | `#0D1012` | `#ECEEEB` | fondo |
| `--roca-2` | `#151A1D` | `#F8F9F7` | superficies |
| `--veta` | `#2B353A` | `#C9CFCB` | líneas, rejilla |
| `--caliza` | `#ECE8DF` | `#14191C` | texto |
| `--cinta` | `#FFD23F` | `#FFD23F` (relleno) / `#7A5C00` (texto) | acento: cinta de topógrafo |
| `--pasa` / `--falla` / `--pendiente` | `#4CD9A0` / `#FF6B5E` / `#8FB3FF` | `#0B7A52` / `#C2322A` / `#2F5BC4` | semántica, nunca decorativa |

**Tipografía.** *Big Shoulders Display* (titulares y cifras grandes: condensada, de
rotulación industrial, se lee desde el fondo de una sala) + *Atkinson Hyperlegible*
(texto: diseñada para máxima legibilidad, no es la opción "segura" de siempre) +
*IBM Plex Mono* (cifras de tabla, pseudocódigo, etiquetas de ejes).

**Rasgo distintivo.** Curvas de nivel tenues en el fondo, estaciones topográficas
(círculo con cruz) como marcadores, la cinta amarilla como único acento y los veredictos
como **sellos de inspección** rectangulares (APRUEBA / NO APRUEBA / PENDIENTE).

**Por qué gana.** Es la única de las tres que convierte el *método* en la metáfora:
"bajar a la cueva" = pasar de la idea a las pruebas, y el embudo de fases es literalmente
una galería que se estrecha. Encaja con el nombre del evento sin caer en el disfraz
(nada de antorchas ni piedra pintada), el amarillo de cinta separa limpiamente el acento
del verde/rojo de pasa/falla, y la pareja Big Shoulders + Atkinson aguanta un proyector.

---

## B · BANCO DE PRUEBAS (descartada)

**Idea.** Laboratorio de ensayos de choque: la estrategia es la pieza que se mete en la
máquina y sale con su hoja de ensayo.

- Paleta: grafito `#16181A`, acero `#2A2E33`, papel de ensayo `#E6E6E1`, amarillo de
  seguridad `#F5C400`, negro `#0A0A0A` (franjas de peligro), azul de plano `#3A7BD5`.
- Tipografía: *Archivo* (ejes de anchura: Expanded para titulares, Condensed para tablas)
  + *JetBrains Mono*.
- Rasgo: dianas de crash-test (círculo cuarteado) como marcadores de datos y franjas
  amarillo/negro en los umbrales que no se pueden cruzar.
- Por qué no: el amarillo y negro de peligro grita "aviso" en toda la pantalla y compite
  con el rojo de "no pasa"; además se aleja de la "cueva".

## C · EXPEDIENTE SELLADO (descartada)

**Idea.** Cada estrategia es un expediente de auditoría: fichas, tampones de goma y
papel milimetrado oscuro.

- Paleta: azul pizarra `#1B2430`, papel milimetrado `#22303F`, tinta clara `#E9EEF2`,
  tampón rojo `#E5484D`, tampón verde `#2EB67D`, lápiz azul `#7FB2FF`.
- Tipografía: *Courier Prime* (mecanografiado) + *Archivo Narrow*.
- Rasgo: sellos de goma con textura, clips y fichas apiladas por fase.
- Por qué no: la máquina de escribir resta legibilidad a la cifra proyectada y el
  "expediente" transmite burocracia, no la sensación de "lo entiendo y lo puedo usar".
