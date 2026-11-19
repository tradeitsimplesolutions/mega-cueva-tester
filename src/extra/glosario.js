/* ---------- GLOSARIO · «qué significa cada palabra técnica» (capa opcional, src/extra; pública y laboratorio) ----------
   Autocontenido: sin dependencias, sin fetch. Con la herramienta quieta solo deja un botón fijo «Glosario»; el cuadro de
   diálogo (<dialog> modal con buscador y temas) se construye la primera vez que se abre. Lee el DOM lo justo (dónde está el
   botón «¿Tienes feedback?», para no tapar nada) y guarda solo clases y atributos con prefijo glo-.
   API: window.MCT_GLOSARIO = { abrir(termino), cerrar(), leyendaAED(), ids() }
     · abrir()            abre el glosario; abrir('efecto') lo abre en ese término (por id o por nombre; si no existe, lo busca).
     · leyendaAED()       devuelve el HTML de la leyenda de columnas de la tabla 02 del AED (para engancharla bajo la tabla).
     · cualquier [data-glosario="id"] de la página abre el glosario en ese término al pulsarlo.
   Atajo: G (no choca con 0-8, M, N, P, H, ? de la app; se ignora al escribir en un campo o con otro cuadro abierto).
   Las definiciones de EFECTO, T y ÉPOCA salen de motor/motor_tester.py (_welch_t, _hallazgos_tis); ver SPEC.md «Hallazgos del AED». */
;(function(){
  if(window.__MCT_GLOSARIO)return;window.__MCT_GLOSARIO=true;
  var D=document,W=window;

  /* ===================================================== el contenido ===================================================== */
  var TEMAS=[
    {id:'aed',c:'El AED',t:'El AED: cómo se comporta tu activo'},
    {id:'val',c:'Validar',t:'Validar: diseño, examen y sello'},
    {id:'res',c:'Resultados',t:'Leer los resultados de un backtest'},
    {id:'costes',c:'Costes',t:'Costes y ejecución'},
    {id:'reglas',c:'Reglas',t:'Piezas de una regla'},
    {id:'robu',c:'Robustez',t:'Robustez, azar y estrés'},
    {id:'riesgo',c:'Riesgo',t:'Riesgo y tamaño de la posición'},
    {id:'real',c:'Dinero real',t:'Del test al dinero real'}
  ];

  /* leyenda de columnas de la tabla 02 del AED (también es la primera entrada del glosario). `enDlg` quita el enlace de pie. */
  function leyenda(enDlg){
    var L=function(id,nom){return '<button type="button" class="glo-lnk" data-glosario="'+id+'" aria-label="Abrir en el glosario: '+nom+'">→ glosario</button>'};
    return '<section class="glo-ley" aria-label="Cómo leer la tabla 02 del AED">'+
      '<h3>Cómo leer la tabla 02, columna a columna</h3>'+
      '<p>Cada fila responde a una pregunta: <i>cuando se cumple esto, ¿cómo rinde la vela siguiente frente a una vela cualquiera?</i> '+
        'Todo se mide solo en el tramo de <b>diseño</b>; el examen y el sello no se tocan. Las pruebas que asoman (CLARA o SE INSINÚA) salen como '+
        'tarjeta con todos los datos; las que no tienen señal (NADA) van en la tabla plegada, que solo trae cuatro columnas: Hallazgo, Efecto, Fuerza y Épocas.</p>'+
      '<dl>'+
      '<dt>Hallazgo</dt><dd>Lo que se prueba: una condición que se cumple en una vela, como «Tras una caída fuerte (10 % peor)», «Bajo su media de 200» o «La vela del lunes». '+
        'Siempre se mide la vela que viene <b>después</b> (en el calendario, la del propio día, hora o mes). Al lado va la etiqueta: <i>mecanismo</i> (tiene una razón detrás) o '+
        '<i>calendario</i>, y si haría de <i>contexto</i>, <i>disparador</i> u <i>horario</i> en una regla. '+L('hallazgo','Hallazgo')+'</dd>'+
      '<dt>Casos</dt><dd>Cuántas velas del diseño cumplen la condición. Con menos de 30 no se mide; cuantos menos casos, más fácil es que el efecto sea pura suerte.</dd>'+
      '<dt>Efecto</dt><dd>La diferencia, en <b>pb</b> (1 pb = 0,01 %), entre cómo rinde de media la vela siguiente cuando se cumple la condición y cómo rinde una vela cualquiera. '+
        'El efecto es el número «de diferencia» de la tarjeta: «+9,0 pb por vela siguiente frente a +4,0 pb de una vela cualquiera (<b>+5,0 pb de diferencia</b> · 480 casos)». '+
        '<b>+</b> = rinde más que una cualquiera, <b>−</b> = rinde menos. Es el <i>tamaño</i> de la ventaja, no si es de fiar. '+L('efecto','Efecto')+'</dd>'+
      '<dt>T</dt><dd>Cuánto destaca ese efecto sobre el ruido normal de las velas (<i>t de Welch</i>): la diferencia de medias entre las velas que cumplen la condición y las que no, '+
        'dividida por su error típico. En la tarjeta sale como «t 2,7». Lejos de 0 (en + o en −) destaca; cerca de 0 es ruido. Sola no decide, porque se hacen ~26 pruebas a la vez y '+
        'alguna sale alta por suerte: por eso mira la columna Fuerza. '+L('t','T')+'</dd>'+
      '<dt>Fuerza</dt><dd>«Supera al 96 % del azar»: en el 96 % de tus mismos datos barajados salió una T menor que la tuya (sin contar el signo). Es el rango de referencia de <i>tu</i> activo, y de ella '+
        'sale el semáforo. En el calendario (día, hora, mes) el rival es el <b>mejor</b> día, hora o mes de cada barajado, así que no te extrañe ver muchos 0 %. '+L('fuerza','Fuerza')+'</dd>'+
      '<dt>Semáforo</dt><dd><span class="sem nada">NADA</span> fuerza por debajo del 90 %: ruido, se descarta. <span class="sem insinua">SE INSINÚA</span> entre el 90 y el 97,5 %: '+
        'en el límite, vale de pista. <span class="sem clara">CLARA</span> 97,5 % o más <b>y</b> el mismo signo en las 3 épocas. '+L('semaforo','Semáforo')+'</dd>'+
      '<dt>Época</dt><dd>El diseño se corta en 3 tercios con el mismo número de velas (no «3 años»). Cada punto de la tarjeta es un tercio: verde = el efecto sale con el mismo signo que en el total, '+
        'rojo = con el contrario, vacío = menos de 8 casos. «2/3» = el signo se mantuvo en 2 de los 3 tercios. Pasa el ratón por un punto y verás el efecto de esa época. '+L('epoca-aed','Época')+'</dd>'+
      '<dt>«El azar ya llega a ±X pb»</dt><dd>Lo que alcanza el puro azar en esa prueba (el efecto, en valor absoluto, que supera solo el 2,5 % de los barajados). '+
        'Si tu efecto no pasa de esa cifra, el azar ya lo produce solo.</dd>'+
      '</dl>'+
      '<p class="glo-ley-ej"><b>Ejemplo A · se queda en NADA</b> (fila de la tabla plegada): «Tras una caída fuerte (10 % peor)» → Efecto +5,0 pb · Fuerza 77 % · Épocas 2/3. '+
        'Con 480 casos, +5 pb da una T de ~1,2: se pierde en el ruido.</p>'+
      '<p class="glo-ley-ej"><b>Ejemplo B · sale CLARA</b> (tarjeta): «Tras una subida fuerte (10 % mejor)»: +16,0 pb por vela siguiente frente a +4,0 pb de una vela cualquiera '+
        '(+12,0 pb de diferencia · 470 casos) · ●●● 3/3 épocas con el mismo signo · supera al 99,4 % del azar · el azar ya llega a ±10,0 pb (97,5 %) · t 2,7. '+
        '<span class="glo-nota">(Números de ejemplo.)</span></p>'+
      (enDlg?'':'<p class="glo-ley-pie"><button type="button" class="glo-lnk" data-glosario="">Abrir el glosario completo</button></p>')+
      '</section>';
  }

  /* cada término: id, tema, n (nombre), a (otras formas de buscarlo), d (definición), e (ejemplo con números), v (ver también) */
  var TER=[
  /* ---------- el AED ---------- */
  {id:'aed',tema:'aed',n:'AED · análisis exploratorio del activo',a:['misión 1','perfil del activo','ficha del activo','análisis exploratorio de datos'],
   d:`Mirar cómo se mueve un activo <b>antes</b> de inventar reglas: cuánto sube a la larga, qué pasa tras una caída, si hay días u horas mejores. Son pistas para saber por dónde buscar, no un veredicto: una idea solo se valida pasando el examen y las 5 fases. Se hace <b>solo con el tramo de diseño</b>; el examen y el sello ni se miran.`,
   e:`El AED te puede decir que tras un día muy malo la vela siguiente suele rendir más que una cualquiera. Con esa pista tiene sentido probar una regla de rebote (tipo RSI corto); no quiere decir que ya funcione.`,
   v:['tabla-02','hallazgo','particion']},
  {id:'tabla-02',tema:'aed',n:'Tabla 02 del AED · qué es cada columna',a:['columnas','leyenda','cómo se comporta','efecto','t','época','épocas','fuerza','casos','hallazgo'],
   html:true,d:'',v:['efecto','t','fuerza','semaforo','epoca-aed']},
  {id:'hallazgo',tema:'aed',n:'Hallazgo',a:['prueba','condición','disparador','contexto'],
   d:`Una pregunta con respuesta en números: «cuando se cumple X, ¿cómo rinde la vela siguiente frente a una vela cualquiera?». X puede ser estar bajo la media de 200, venir de una caída fuerte, ser lunes o ser enero; en velas diarias el AED prueba unas 26 a la vez (más en intradía, por las horas) y exige al menos 30 casos para medir cada una.`,
   e:`«Tras una caída fuerte (10 % peor)»: se cogen solo las velas que vienen justo después de uno de los días del 10 % peor y se mira cómo rinde la siguiente. Si hay 480 de esos días, son 480 casos.`,
   v:['vela-cualquiera','efecto','semaforo']},
  {id:'vela-cualquiera',tema:'aed',n:'Vela siguiente · vela cualquiera',a:['línea base','universo','media de una vela','referencia'],
   d:`Todo se mide sobre la <b>vela siguiente</b> a la que cumple la condición (cierre contra cierre) y se compara con «una vela cualquiera»: la media de todas las velas del diseño. Sin esa vara de medir, en un activo que sube de fondo cualquier condición parecería «funcionar»; en «sobre/bajo la media de 200» la comparación es solo con las velas donde esa media ya existe.`,
   e:`Si una vela cualquiera rinde +4 pb de media y la vela posterior a una caída fuerte rinde +9 pb, lo que aporta la condición es +5 pb.`,
   v:['efecto','pb']},
  {id:'efecto',tema:'aed',n:'Efecto (en pb y en %)',a:['efecto','diferencia','ventaja','pb de diferencia'],
   d:`Lo que cambia la condición: la media de la vela siguiente cuando se cumple <b>menos</b> la media de una vela cualquiera. Se da en <b>pb</b> (1 pb = 0,01 %): +5 pb son +0,05 %. Con signo: <b>+</b> = esa vela rinde más que una cualquiera, <b>−</b> = rinde menos. Es el <i>tamaño</i> de la ventaja, no su fiabilidad: de eso se ocupan la T y la fuerza.`,
   e:`La vela siguiente a una caída fuerte rinde +9 pb frente a +4 pb de una vela cualquiera: efecto = +5 pb (+0,05 %). Un 0,05 % por operación se lo come casi cualquier coste: mira la regla del 10 %.`,
   v:['t','fuerza','pb','regla-10']},
  {id:'t',tema:'aed',n:'T · t de Welch · estadístico t',a:['t','welch','estadístico','t-student','significación','valor absoluto'],
   d:`Mide cuánto destaca el efecto sobre el ruido normal de esas velas: la diferencia de medias entre las velas que cumplen la condición y las que no, dividida por su error típico. En el AED es la <b>t de Welch</b>, que aguanta que el grupo sea más tranquilo o más movido que el resto (la volatilidad viene en rachas). Cuanto más lejos de 0 (en + o en −), más destaca; pero la T sola no decide, porque se hacen ~26 pruebas a la vez y alguna sale alta por suerte: el semáforo se fija con la fuerza contra el azar.`,
   e:`Con 480 casos y velas que se mueven un 1 % al día, un efecto de +5 pb da una T de ~1,2 (se pierde en el ruido) y uno de +25 pb daría ~6. Para una prueba suelta, una T de 2 (en + o en −) ya sería rara por azar; con 26 pruebas a la vez ya no basta.`,
   v:['fuerza','efecto','barajados']},
  {id:'fuerza',tema:'aed',n:'Fuerza contra el azar',a:['fuerza','percentil','supera al','azar','rango de referencia'],
   d:`El porcentaje de «azares» al que gana tu T (sin contar el signo): «supera al 96 % del azar» = en el 96 % de los datos barajados salió una T menor que la tuya. Es tu rango de referencia, como en una analítica de sangre: el valor importa según dónde cae frente a lo normal <i>en ese activo</i>. De ella salen los semáforos.`,
   e:`Aproximadamente: una T de 1,2 supera al ~77 % del azar (ruido); una de 2,0, al ~95 % (en el límite); una de 2,4, al ~98 % (clara, si además aguanta las 3 épocas).`,
   v:['semaforo','barajados','mec-cal']},
  {id:'semaforo',tema:'aed',n:'Semáforo: NADA · SE INSINÚA · CLARA',a:['nada','se insinúa','clara','rangos','ruido','límite','claro','semáforo'],
   d:`<span class="sem nada">NADA</span> fuerza por debajo del 90 %: es ruido y se descarta (queda anotado por qué). <span class="sem insinua">SE INSINÚA</span> entre el 90 y el 97,5 %: en el límite, vale de pista pero no te fíes. <span class="sem clara">CLARA</span> 97,5 % o más <i>y</i> el mismo signo en las 3 épocas; si llega al 97,5 % pero cambia de signo en alguna época se queda en SE INSINÚA (y los meses, con menos de 10 años de diseño, tampoco pasan de ahí).`,
   e:`«Tras una subida fuerte»: fuerza 98,1 % y 3/3 épocas con el mismo signo → CLARA. El mismo hallazgo con 2/3 épocas → SE INSINÚA. Ni siquiera CLARA es «estrategia buena»: solo dice que ese rasgo no parece azar en el diseño; falta pasar el examen.`,
   v:['fuerza','epoca-aed','mec-cal']},
  {id:'barajados',tema:'aed',n:'Datos barajados (el azar de tu activo)',a:['permutación','semilla','azar','ruido','barajar'],
   d:`El azar se fabrica con tus propios datos: se cogen los retornos del diseño y se <b>reordenan al azar</b> unas 400-1.000 veces (menos cuantas más velas haya). Cada barajado conserva los mismos números (misma volatilidad, mismas colas) pero destruye cualquier patrón real de orden o calendario, así que enseña hasta dónde llega el puro ruido en <i>ese</i> activo. La semilla es fija: la ficha no cambia al recargar.`,
   e:`Es como barajar un mazo: las mismas cartas, otro orden. Si con el mazo barajado salen muchas veces rachas tan buenas como la tuya, tu racha no demuestra nada.`,
   v:['fuerza','mec-cal']},
  {id:'mec-cal',tema:'aed',n:'Mecanismo · calendario («el mejor mono»)',a:['calendario','mecanismo','contexto','disparador','horario','día de la semana','mes','hora'],
   d:`Dos clases de hallazgo. <b>Mecanismo</b>: tiene una razón detrás (media de 200, caídas o subidas fuertes, rachas, memoria) y se mide contra su propio barajado. <b>Calendario</b> (día, hora, mes): con tantas casillas alguna sale bonita por pura suerte, así que compite contra el <b>mejor</b> día, hora o mes de cada barajado —«el mejor mono»— y es más exigente. En la tarjeta verás además si haría de <i>contexto</i> (en qué estado está el activo), <i>disparador</i> (algo que acaba de pasar) u <i>horario</i>.`,
   e:`Para llegar a una fuerza del 97,5 % hace falta, aproximadamente, una T de 2,2 en un mecanismo, ≈ 2,8 para el mejor de 5 días y ≈ 3,1 para el mejor de 12 meses.`,
   v:['fuerza','semaforo','barajados']},
  {id:'epoca-aed',tema:'aed',n:'Época (en el AED)',a:['época','épocas','tercios','3/3','2/3','mismo signo','puntos'],
   d:`El tramo de diseño se corta en <b>3 trozos consecutivos con el mismo número de velas</b> (tercios, no «3 años»). En cada uno se mira, por separado, si el efecto sale con el <b>mismo signo</b> que en el total: en la tarjeta son 3 puntos (verde = mismo signo, rojo = contrario, vacío = menos de 8 casos, no cuenta) y el resumen «2/3 épocas». Sirve para ver si el efecto es constante o lo hizo una sola época; CLARA exige 3/3.`,
   e:`Diseño de 2000 a 2014: épocas de unos 2000-05, 2005-10 y 2010-14. «Tras una caída fuerte» da +12, +9 y −3 pb: efecto positivo en el total pero solo 2/3 épocas con el mismo signo, así que no pasa de SE INSINÚA aunque su fuerza sea alta. No es lo mismo que las épocas de 3 años de la fase F2.`,
   v:['semaforo','persistencia']},
  {id:'memoria',tema:'aed',n:'Memoria a 1 vela (autocorrelación)',a:['autocorrelación','reversión','momentum','rebote','revierte'],
   d:`¿Lo que hace una vela se parece a lo que hace la siguiente? Si tras una caída tiende a venir rebote hay <b>reversión</b> (terreno del RSI corto); si tras una subida tiende a seguir, hay <b>momentum</b>. En el AED se mide la pendiente de «la siguiente» sobre «la de hoy»; el efecto es lo que cambia la vela siguiente tras una caída de tamaño normal (positivo = reversión, negativo = momentum).`,
   e:`Pendiente −0,05 y movimiento medio del 1 %: tras una caída normal (−1 %), la vela siguiente rinde unos +5 pb más de lo normal (0,05 × 1 %). Es reversión, pero pequeña.`,
   v:['efecto','rsi']},
  {id:'volatilidad',tema:'aed',n:'Volatilidad · racimos · colas gordas',a:['volatilidad','racimos','colas gordas','curtosis','desviación típica'],
   d:`<b>Volatilidad</b>: cuánto se mueve el activo (la desviación típica de sus retornos, anualizada). Viene en <b>racimos</b>: tras una vela movida suele venir otra movida. Con <b>colas gordas</b> (curtosis en exceso &gt; 0) hay más días extremos de los que daría una campana normal.`,
   e:`En una campana normal solo el 0,27 % de las velas se alejan más de 3 desviaciones; si en tu activo son el 1 %, tiene colas casi 4 veces más gordas y los stops «improbables» saltan más a menudo.`,
   v:['atr','stop']},

  /* ---------- validar ---------- */
  {id:'particion',tema:'val',n:'Partición (diseño · examen · validación)',a:['split','corte 70/30','70/30','tramos'],
   d:`Cómo se reparte el histórico para no engañarte: <b>diseño</b> (donde inventas y ajustas), <b>examen</b> (donde compruebas con datos que no usaste) y <b>validación sellada</b> (el último 20 %). Primero se aparta el sello (último 20 %, con un mínimo de 1 año) y de lo que queda, un 70 % es diseño y un 30 % examen.`,
   e:`Con 20 años de datos: el sello son los últimos 4; de los 16 restantes, unos 11,2 años son de diseño y 4,8 de examen.`,
   v:['in-sample','out-of-sample','sello']},
  {id:'in-sample',tema:'val',n:'In-sample (IS · diseño)',a:['is','dentro de muestra','diseño','tramo de diseño'],
   d:`Los datos con los que diseñas y ajustas la regla. Sus resultados son optimistas por definición, porque la regla se ha moldeado mirándolos. El AED y la hipótesis usan solo este tramo.`,
   e:`Un PF de 2,4 en el diseño solo dice que la regla encaja con esos años; lo que importa es si se mantiene en el examen.`,
   v:['out-of-sample','sobreajuste']},
  {id:'out-of-sample',tema:'val',n:'Out-of-sample (OOS · examen · prueba honesta)',a:['oos','fuera de muestra','examen','prueba honesta'],
   d:`Datos que <b>no</b> se usaron para diseñar la regla: cómo se habría comportado con datos «nuevos». Es lo que cuenta de verdad en la Fase 1: PF ≥ 1,30 en el examen, al menos 30 operaciones en total, una caída menor que la de comprar y mantener y PF sin la mejor operación &gt; 1. Si lo miras, retocas la regla y lo vuelves a mirar, deja de ser out-of-sample: lo has convertido en diseño.`,
   e:`Diseño con PF 2,0 → examen con PF 1,1: la regla estaba aprendida de memoria. Diseño 1,6 → examen 1,4: aguanta.`,
   v:['in-sample','sello','sobreajuste']},
  {id:'sello',tema:'val',n:'Validación y SELLO (el último 20 %)',a:['sello','validación','sellado','tramo sellado','último 20 %'],
   d:`El último 20 % del histórico (mínimo 1 año) queda <b>sellado</b>: no se mira ni se usa para elegir nada, en ninguna fase. Se abre <b>una sola vez</b>, al final, como comprobación, y no entra en el veredicto. Es tu último freno contra engañarte a ti mismo.`,
   e:`Si lo abres, ves que no funciona y retocas la regla hasta que funcione, ese tramo ya es diseño: has gastado tu único examen de verdad.`,
   v:['particion','out-of-sample']},
  {id:'backtest',tema:'val',n:'Backtest',a:['simulación','prueba histórica','retroprueba'],
   d:`Simular cómo habría operado una regla con datos del pasado, operación a operación y con costes. Sirve más para descartar que para demostrar: un backtest bonito solo dice que la regla <i>habría</i> funcionado en esos datos, y por eso va acompañado del examen, el sello y las 5 fases.`,
   e:`Regla: «compro cuando el RSI(4) baja de 25 y vendo cuando pasa de 55». El backtest cuenta cuántas veces habría saltado, cuánto habría ganado o perdido en cada una y cuánto habrías pagado en costes.`,
   v:['fases','out-of-sample']},
  {id:'fases',tema:'val',n:'Las 5 fases (F1 a F5)',a:['protocolo','fase 1','f1','f2','f3','f4','f5','protocolo tis'],
   d:`El protocolo TIS para decidir si una regla merece dinero real: <b>F1</b> diseño/examen, <b>F2</b> persistencia de la meseta, <b>F3</b> robustez moviendo todos los números, <b>F4</b> Monte Carlo + bootstrap por bloques y por regímenes, <b>F5</b> stress (costes ×2, sin los 2 mejores años, régimen malo). Después, la paridad con MT5. Los umbrales no se bajan por estrategia.`,
   e:`Una regla que supera 4 de las 5 fases no «casi aprueba»: está suspendida, y el informe te dice cuál falla.`,
   v:['out-of-sample','meseta','montecarlo','stress','paridad']},

  /* ---------- leer un backtest ---------- */
  {id:'pf',tema:'res',n:'PF · profit factor (factor de beneficio)',a:['pf','profit factor','factor de beneficio'],
   d:`Lo ganado en las operaciones ganadoras dividido por lo perdido en las perdedoras. Por encima de 1 gana dinero; por debajo, pierde. TIS pide al menos 1,30 en el examen. Ojo: solo mira la proporción, no el riesgo ni la caída.`,
   e:`Las ganadoras suman 13.000 $ y las perdedoras 10.000 $: PF = 13.000 / 10.000 = 1,3.`,
   v:['pf-sin-mejor','drawdown']},
  {id:'pf-sin-mejor',tema:'res',n:'PF sin la mejor operación',a:['sin la mejor','pf sin mejor','golpe de suerte'],
   d:`El PF quitando la operación más rentable: si sigue por encima de 1, la estrategia no depende de un golpe de suerte. Aquí se mide con todas las operaciones del diseño y del examen juntas (sin el sello), porque quitar la mejor de un tramo con pocas operaciones tumba casi siempre a las estrategias de tendencia.`,
   e:`PF 1,6 con todas las operaciones, pero 0,9 sin la mejor: una sola operación sostenía toda la estrategia.`,
   v:['pf','sobreajuste']},
  {id:'drawdown',tema:'res',n:'Drawdown (caída máxima)',a:['caída máxima','maxdd','max dd','dd','peor caída'],
   d:`La mayor bajada del capital desde un máximo hasta el mínimo posterior: el peor mal trago de la curva. Se mide en % y recuperarse cuesta más de lo que cayó: tras caer un 30 % hay que ganar un 43 % para volver al punto de partida.`,
   e:`El capital sube de 100.000 a 120.000 y luego baja a 96.000: drawdown = (120.000 − 96.000) / 120.000 = 20 %.`,
   v:['ruina','p5-p95']},
  {id:'expectancy',tema:'res',n:'Expectancy (esperanza por operación)',a:['esperanza','expectativa','ganancia media por operación'],
   d:`Lo que ganas de media por operación contando ganadoras y perdedoras: si es positiva, a la larga el sistema suma; si es negativa, resta, aciertes mucho o poco. En la herramienta se da en dinero (sobre una cuenta de 100.000 $, con el tamaño de tu regla) y en R (dividida entre la pérdida media de tus operaciones).`,
   e:`Aciertas el 40 %, ganas 300 $ cuando ganas y pierdes 100 $ cuando pierdes: 0,4 × 300 − 0,6 × 100 = +60 $ por operación.`,
   v:['payoff','win-rate','r']},
  {id:'payoff',tema:'res',n:'Payoff (ganancia media / pérdida media)',a:['ratio','riesgo beneficio','ratio ganancia pérdida'],
   d:`La ganancia media de las ganadoras dividida por la pérdida media de las perdedoras. Con un payoff bajo necesitas acertar mucho; con uno alto puedes acertar poco. El win rate y el payoff van siempre juntos: ninguno de los dos mide la calidad por sí solo.`,
   e:`Payoff 2 (ganas 200 $, pierdes 100 $): te basta acertar más de 1 / (1 + 2) = 33 % para no perder dinero.`,
   v:['win-rate','expectancy']},
  {id:'win-rate',tema:'res',n:'Win rate (tasa de acierto)',a:['acierto','porcentaje de aciertos','% ganadoras'],
   d:`El porcentaje de operaciones que cierran en positivo. Un win rate alto no garantiza nada: puedes acertar el 80 % y perder dinero si las pocas perdedoras son enormes.`,
   e:`10 operaciones: 8 ganan 50 $ y 2 pierden 300 $. Acierto del 80 %, pero resultado de 8 × 50 − 2 × 300 = −200 $.`,
   v:['payoff','expectancy']},
  {id:'r',tema:'res',n:'R · múltiplos de R',a:['r','riesgo','múltiplo de r','2r','1r','kr'],
   d:`R es lo que arriesgas en una operación: la distancia entre la entrada y el stop. Medir en R permite comparar operaciones de distinto tamaño: «+2R» es ganar el doble de lo arriesgado y «−1R» es perder justo lo que ibas a arriesgar. En el motor, un objetivo «a k veces el riesgo» es entrada ± k × distancia al stop; ojo: en las estadísticas de la herramienta la «expectancy en R» usa como R la <i>pérdida media</i> de tus operaciones, no la distancia al stop.`,
   e:`Compras a 100 con el stop en 98 (R = 2). Objetivo a 2R = 104: si cierra en 104, +2R; si salta el stop en 98, −1R.`,
   v:['stop','objetivo','expectancy']},
  {id:'mae-mfe',tema:'res',n:'MAE / MFE (excursiones)',a:['mae','mfe','excursión adversa','excursión favorable'],
   d:`Cuánto se fue la operación en tu contra (MAE) y a tu favor (MFE) antes de cerrarse, aunque acabara en otra cosa. Sirven para colocar el stop y el objetivo con datos y no a ojo.`,
   e:`Una operación que cerró en +1 % pero llegó a ir un −3 % en contra: un stop al 2 % la habría sacado a pérdidas.`,
   v:['stop','objetivo']},

  /* ---------- costes y ejecución ---------- */
  {id:'spread',tema:'costes',n:'Spread',a:['diferencia compra venta','bid ask','horquilla'],
   d:`La diferencia entre el precio de compra (ask) y el de venta (bid): te la cobra el bróker en cada operación (una vez por operación, ida y vuelta). En el backtest se da en pb.`,
   e:`Spread de 3 pb en un índice que cotiza a 20.000: 0,0003 × 20.000 = 6 puntos por operación.`,
   v:['comision','slippage','regla-10']},
  {id:'comision',tema:'costes',n:'Comisión',a:['comisiones','fee'],
   d:`Lo que cobra el bróker por ejecutar la orden, por cada lado (entrar y salir cuentan por separado). En el backtest se da en pb por lado.`,
   e:`0,5 pb por lado son 1 pb por la operación completa.`,
   v:['spread','regla-10']},
  {id:'swap',tema:'costes',n:'Swap (coste de dormir la posición)',a:['rollover','overnight','interés nocturno','financiación'],
   d:`El interés que pagas o cobras por mantener una posición abierta de un día para otro; en el motor se cuenta por cada día natural que la posición cruza la medianoche, y largos y cortos tienen swap distinto (puede ser negativo o positivo). En operaciones de muchas noches se suma.`,
   e:`Swap de compras de −1,4 pb por día y una operación de 10 noches: −14 pb (≈ 0,14 %).`,
   v:['pb','spread']},
  {id:'slippage',tema:'costes',n:'Slippage (deslizamiento)',a:['deslizamiento','derrape'],
   d:`La diferencia entre el precio al que querías ejecutar y el precio al que se ejecuta de verdad, porque el mercado se mueve mientras tanto. Casi siempre juega en tu contra, sobre todo en aperturas y noticias; en el backtest se modela como pb por lado.`,
   e:`Querías comprar a 100,00 y entras a 100,03: slippage de 3 pb.`,
   v:['spread','gap']},
  {id:'pb',tema:'costes',n:'pb · punto básico',a:['punto básico','puntos básicos','bp','bps','basis point'],
   d:`1 pb = 0,01 % = 0,0001. Se usa para hablar de cantidades pequeñas sin arrastrar decimales: 25 pb = 0,25 % y 100 pb = 1 %. Los costes y el efecto del AED se dan en pb.`,
   e:`Un efecto de +5 pb por vela son +0,05 %. Un spread de 3 pb en una operación de 10.000 $ cuesta 3 $.`,
   v:['efecto','spread']},
  {id:'regla-10',tema:'costes',n:'Regla del 10 %',a:['coste de entrar y salir','10 %','coste se come'],
   d:`Lo que pagas por entrar y salir (spread + 2 × (comisión + deslizamiento)) no debería pasar del 10 % de lo que se mueve una vela normal; si no, las operaciones de una vela trabajan para el bróker.`,
   e:`Una vela normal se mueve 100 pb y entrar y salir cuesta 12 pb: te comes el 12 % y no pasa. Con 8 pb, sí.`,
   v:['spread','comision','slippage']},
  {id:'apertura-siguiente',tema:'costes',n:'Apertura siguiente',a:['ejecución','orden a mercado','señal al cierre'],
   d:`Regla fija de ejecución: la señal se evalúa al <b>cierre</b> de la vela y la orden se ejecuta en la <b>apertura de la vela siguiente</b>, que es lo único que puedes hacer en la vida real (no puedes comprar al cierre que acabas de ver).`,
   e:`Hoy el RSI cierra por debajo de 25: la señal nace al cierre de hoy y la compra entra al precio de apertura de mañana, que puede ser distinto del cierre de hoy.`,
   v:['look-ahead','gap','hora-servidor']},
  {id:'hora-servidor',tema:'costes',n:'Hora del servidor (GMT+3 con US-DST)',a:['gmt+3','us-dst','zona horaria','hora de mt5','utc','hora del bróker','dst'],
   d:`La hora a la que están las velas en MT5/Darwinex: GMT+3 y sigue el cambio de horario de EE. UU., así que el desfase real va de GMT+2 a GMT+3 según la época del año. Los datos se alinean a esa hora: si tu backtest usa UTC o Nueva York, la vela diaria y los cortes de sesión caen en otro sitio y las señales no coinciden con MT5.`,
   e:`Una regla «entrar a las 16:30» no es lo mismo en hora de Nueva York que en hora del servidor: hay varias horas de diferencia y la señal puede acabar en otra vela.`,
   v:['paridad','apertura-siguiente']},
  {id:'paridad',tema:'costes',n:'Paridad MT5',a:['paridad','reconciliación','strategy tester','mt5','metatrader'],
   d:`Comprobar que el backtest y el MetaTrader real son el mismo sistema: mismas velas (hora del servidor), costes leídos del terminal (spread, comisión, swap) y que el Strategy Tester de MT5 dé las <b>mismas operaciones</b> y el resultado dentro de ±2 %. Hasta que cuadra, la regla no está validada.`,
   e:`Tu backtest da 112 operaciones y el Strategy Tester 112: bien. Si el Tester da 108, algo no se ejecuta igual (hora, costes o tipo de orden) y hay que encontrar qué.`,
   v:['hora-servidor','fases']},
  {id:'gap',tema:'costes',n:'Gap (hueco)',a:['hueco','salto','apertura con hueco'],
   d:`Cuando una vela abre lejos del cierre anterior (fin de semana, noticias, resultados): el precio salta sin pasar por los niveles intermedios. Si abre más allá de tu stop no sales en el stop sino en la apertura, a un precio peor; el motor lo modela así.`,
   e:`Entras a 100 con el stop en 98 y la vela abre en 95: sales a 95, no a 98. La pérdida es de 5 en vez de 2, 2,5 veces lo previsto.`,
   v:['stop','slippage']},

  /* ---------- piezas de una regla ---------- */
  {id:'stop',tema:'reglas',n:'Stop (stop loss)',a:['stop loss','sl','stop de pérdidas'],
   d:`Una orden de salida que cierra la operación si pierde una cantidad fijada: un % del precio de entrada, k veces el ATR o un nivel. Se vigila dentro de cada vela, y si el stop y el objetivo se tocan en la misma vela el motor asume que saltó el stop, el supuesto prudente.`,
   e:`Compras a 100 con el stop al 2 %: si el precio toca 98, sales a 98 (salvo gap).`,
   v:['r','trailing','gap']},
  {id:'objetivo',tema:'reglas',n:'Objetivo (take profit)',a:['take profit','tp','target'],
   d:`Una orden que cierra la operación con ganancia al llegar a un nivel: un % de la entrada, k veces el ATR o k veces el riesgo (kR). Ponerlo muy cerca sube el win rate pero recorta el payoff.`,
   e:`Entrada 100, stop 98, objetivo a 2R: 104.`,
   v:['stop','r','payoff']},
  {id:'trailing',tema:'reglas',n:'Trailing (stop móvil)',a:['stop móvil','trailing stop','stop encadenado'],
   d:`Un stop que solo se mueve a favor: sube con el precio y nunca baja (en largos). El motor tiene dos: por ATR (máximo desde la entrada − k × ATR) o por el mínimo de las n velas anteriores; el stop de cada vela se calcula con datos hasta el cierre de la anterior, sin mirar el futuro. Con trailing, un «stop» puede cerrar con ganancia.`,
   e:`Entras a 100 con trailing de 2 × ATR (ATR = 1): el stop empieza en 98. Si el precio llega a 106, el stop sube a 104; si luego cae, sales en 104 con +4.`,
   v:['stop','atr','look-ahead']},
  {id:'atr',tema:'reglas',n:'ATR (rango medio verdadero)',a:['average true range','rango medio','volatilidad en puntos'],
   d:`Cuánto se mueve de media una vela en puntos, contando los huecos entre velas: el rango verdadero (el mayor entre máximo − mínimo, |máximo − cierre anterior| y |mínimo − cierre anterior|) suavizado a n velas (14 por defecto). Sirve para poner stops y objetivos que se adaptan a la volatilidad del momento.`,
   e:`ATR(14) = 50 puntos: un stop a 2 × ATR está a 100 puntos de la entrada, y a 25 si el ATR baja a 12,5.`,
   v:['stop','trailing','volatilidad']},
  {id:'rsi',tema:'reglas',n:'RSI (índice de fuerza relativa)',a:['rsi','relative strength index','sobrecompra','sobreventa','wilder'],
   d:`Un oscilador de 0 a 100 que compara las subidas y las caídas recientes (suavizado de Wilder; 14 velas por defecto). Bajo se interpreta como «ha caído mucho» y alto como «ha subido mucho»; con periodos cortos (RSI de 2 a 4) se usa para buscar rebotes.`,
   e:`En las reglas de ejemplo, RSI(4) &lt; 25 = ha caído mucho en muy pocos días y RSI(4) &gt; 55 = ya ha rebotado.`,
   v:['memoria','sma-ema']},
  {id:'sma-ema',tema:'reglas',n:'SMA / EMA (medias móviles)',a:['media móvil','media de 200','sma 200','media de 50','ema','sma'],
   d:`La <b>SMA</b> es la media simple de los últimos n cierres y la <b>EMA</b> la exponencial, que da más peso a lo reciente. La media de 200 (SMA 200) se usa como termómetro de la tendencia de fondo: cierre por encima = tendencia de fondo alcista.`,
   e:`SMA(5) de los cierres 10, 11, 12, 11, 11 = 55 / 5 = 11.`,
   v:['rsi','hallazgo']},
  {id:'ibs',tema:'reglas',n:'IBS (Internal Bar Strength)',a:['ibs','fuerza interna de la vela','dónde cierra la vela'],
   d:`Dónde cerró la vela dentro de su rango: (cierre − mínimo) / (máximo − mínimo). 0 = cerró en el mínimo, 1 = en el máximo y 0,5 = en medio. Un IBS bajo (cerrar cerca del mínimo) se usa como señal de posible rebote.`,
   e:`Máximo 105, mínimo 100, cierre 101: IBS = (101 − 100) / (105 − 100) = 0,2.`,
   v:['rsi','memoria']},

  /* ---------- robustez, azar y estrés ---------- */
  {id:'meseta',tema:'robu',n:'Meseta',a:['meseta','plateau','zona buena','vecinos','entorno'],
   d:`Una zona de números vecinos que dan resultados parecidos: si mueves un poco los parámetros (RSI 4 → 3 o 5, umbral 25 → 20 o 30) y el resultado se mantiene, la regla recoge algo real y no un punto afortunado. Es lo que se busca; lo contrario son el pico y la silla de montar.`,
   e:`PF de las vecinas: 1,4 / 1,5 / 1,6 / 1,5 / 1,3 → meseta. 0,8 / 0,9 / 1,9 / 0,9 / 0,7 → un pico, y probablemente suerte.`,
   v:['pico','silla','robustez','persistencia']},
  {id:'silla',tema:'robu',n:'Silla de montar',a:['silla','saddle'],
   d:`Una falsa meseta: la regla aguanta si mueves casi todos los números pero se hunde si mueves <i>uno</i> concreto, como una silla de montar, plana en un sentido y con caída en el otro. En F3 salta si el peor número quita más del 30 % del PF y mucho más que los demás; el informe te dice cuál es.`,
   e:`Mover el RSI ±40 % deja el PF en 1,4-1,6, pero mover la salida un 20 % lo baja de 1,5 a 0,9 (−40 %): silla de montar, y el culpable es la salida.`,
   v:['meseta','pico','robustez']},
  {id:'pico',tema:'robu',n:'Pico',a:['pico','punto afortunado'],
   d:`Un punto afortunado: el PF de tu regla es mucho mejor que el de sus vecinas (más de 1,5 veces la mediana) y a menos de la mitad de las vecinas les va bien. No es una zona, es una casualidad que no se repetirá.`,
   e:`Tu PF es 2,4 y el de las vecinas ronda 0,9: es un pico.`,
   v:['meseta','silla','sobreajuste']},
  {id:'walkforward',tema:'robu',n:'Walk-forward',a:['walk forward','wf','reoptimizar','reajustar','pardo'],
   d:`Reajustar los números con unos años y probarlos en el siguiente, avanzar un año y repetir. Era el juez de la fase 2 hasta octubre de 2026. <b>Ya no puntúa</b>: reoptimizaba cada vez, y quien opera los números de un libro no reoptimiza. Ahora la fase 2 mira si la zona buena sigue ahí época tras época sin reajustar nada (<i>persistencia</i>). El walk-forward se guarda solo como dato.`,
   e:`Antes: ajustar el RSI con 3 años y probar en el 4.º, y repetir. Ahora: dejar el RSI donde está y mirar en cada época de 3 años si sigue entre las buenas variantes.`,
   v:['persistencia','meseta','sobreajuste']},
  {id:'persistencia',tema:'robu',n:'Persistencia (épocas de 3 años)',a:['f2','persistencia','épocas de 3 años','walk-forward'],
   d:`Fase F2: ¿la zona buena sigue ahí época tras época? El histórico sin el sello se corta en <b>épocas de 3 años de calendario</b> y en cada una se mira dónde cae tu regla entre sus vecinas, sin reajustar nada. Se pide: al menos 4 épocas juzgables, percentil medio ≥ 40 % y PF &gt; 1 en al menos el 60 % de las épocas.`,
   e:`En 6 épocas ganas en 4 (67 %) y caes de media en el percentil 55 %: pasa. Si ganas en 3 de 6 (50 %), no. No confundir con las épocas (tercios) de la tabla 02 del AED.`,
   v:['percentil-mediana','epoca-aed','meseta']},
  {id:'percentil-mediana',tema:'robu',n:'Percentil · mediana del entorno',a:['percentil','mediana','entorno','vecinas','variantes'],
   d:`El <b>entorno</b> de tu regla son sus vecinas: la misma regla con los números un poco movidos (±20 %, ±40 %). El <b>percentil</b> dice en qué posición de ese entorno cae la tuya (100 % = la mejor, 50 % = en medio) y la <b>mediana</b> es el valor del medio. Se compara siempre con la mediana, nunca con la mejor, porque la mejor de cada época suele ser una variante con pocas operaciones y un PF absurdo.`,
   e:`Tu PF es 1,6 y entre 25 variantes tuyas hay 20 con un PF menor o igual: caes en el percentil 80 %.`,
   v:['persistencia','meseta']},
  {id:'robustez',tema:'robu',n:'Robustez (F3)',a:['f3','robustez','parámetros','mover los números'],
   d:`Fase F3: ¿aguanta si muevo <b>todos</b> los números de la regla? Se mueven todos (±20 % y ±40 %), salvo las categorías (día, hora, sesión…). Se pide que al menos el 70 % de las variantes tenga PF &gt; 1, que ningún número quite más del 30 % del PF y que no sea silla de montar ni pico; tener pocos parámetros es una virtud, porque no hay dónde esconder una silla.`,
   e:`Tu regla usa un RSI de 4, una entrada en 25 y una salida en 55. Se prueban RSI de 2 a 6, entradas de 15 a 35, salidas de 33 a 77… (cientos de combinaciones). Si 8 de cada 10 siguen ganando, bien. Si al mover solo la salida de 55 a 61 el PF cae de 1,6 a 1,0, ese número es una silla de montar: la regla vivía de él.`,
   v:['meseta','silla','pico','sobreajuste']},
  {id:'montecarlo',tema:'robu',n:'Monte Carlo',a:['simulación','simulaciones','5.000','f4','remuestreo'],
   d:`Reordenar y remuestrear tus operaciones miles de veces (5.000 simulaciones) para ver qué caminos eran posibles con otra suerte: no predice el futuro, enseña cuánto de tu resultado dependía del orden en que vinieron. Se mira el peor 5 % de los caminos: debe seguir ganando (p5 &gt; 0), con una caída por debajo del 30 % y una ruina por debajo del 5 %.`,
   e:`Tu regla hizo 100 operaciones y ganó un 40 %. Se barajan esas 100 operaciones 5.000 veces: en la mitad de los caminos ganas más de un 38 %, pero en el peor 5 % ganas solo un 4 % o incluso pierdes. Si ese peor 5 % pierde, la ventaja dependía de que las ganadoras vinieran primero.`,
   v:['p5-p95','ruina','bloques','regimenes']},
  {id:'bloques',tema:'robu',n:'Bootstrap por bloques',a:['bloques','rachas','block bootstrap'],
   d:`Como el Monte Carlo, pero se mezclan <b>bloques</b> de operaciones consecutivas en vez de operaciones sueltas, para que las rachas (varias perdedoras seguidas) sobrevivan. El Monte Carlo suelto las destruye y sale más optimista que la realidad. El bloque mide √n operaciones (mínimo 5).`,
   e:`Con 100 operaciones, bloques de 10: se pegan trozos de 10 operaciones seguidas, no una a una.`,
   v:['montecarlo','regimenes']},
  {id:'regimenes',tema:'robu',n:'Bootstrap por regímenes',a:['regímenes','años completos','remuestreo por años'],
   d:`Se arman historias nuevas con <b>años completos</b> reales, repetidos y en otro orden (con reemplazo): «¿y si me tocan tres 2013 seguidos?». Mide si tu edge depende de que los años buenos y malos vinieran justo como vinieron; hacen falta operaciones en al menos 5 años.`,
   e:`Si tu mejor año fue +30 % y el peor −18 %, una historia posible son tres −18 % seguidos: ¿sigues vivo?`,
   v:['montecarlo','bloques','regimen-malo']},
  {id:'ruina',tema:'robu',n:'Ruina',a:['probabilidad de ruina','perder la mitad'],
   d:`En el Monte Carlo, la probabilidad de que el capital llegue a tocar el 50 % del inicial en algún momento (perder la mitad). Se pide que sea menor del 5 %.`,
   e:`En 5.000 simulaciones, 120 pierden la mitad: ruina = 120 / 5.000 = 2,4 %: pasa.`,
   v:['montecarlo','drawdown']},
  {id:'p5-p95',tema:'robu',n:'p5 / p95 (percentiles 5 y 95)',a:['p5','p95','percentil 5','percentil 95','peor 5 %'],
   d:`p5 es el valor por debajo del cual queda el 5 % de las simulaciones (el 5 % peor) y p95 el valor por debajo del cual queda el 95 % (solo el 5 % es peor). «p5 del retorno &gt; 0» significa que ganas incluso en el peor 5 % de los caminos; «p95 de la caída &lt; 30 %», que solo 1 de cada 20 caminos cae más del 30 %.`,
   e:`Si p5 del retorno = +4 %: en el 95 % de las simulaciones ganas más de un 4 %. Si p95 de la caída = 24 %: solo 1 de cada 20 caminos pierde más del 24 %.`,
   v:['montecarlo','ruina']},
  {id:'stress',tema:'robu',n:'Stress',a:['f5','estrés','costes x2','sin los 2 mejores años'],
   d:`Fase F5: empeorar las condiciones a propósito. Se doblan los costes y se quitan los 2 mejores años (en los dos se pide PF ≥ 1,10 y caída &lt; 25 %), y se mira el régimen malo. Si la ventaja era más pequeña que lo que cuesta operar, aquí se ve.`,
   e:`PF 1,35 con los costes normales y 0,98 con los costes ×2: la ventaja se la comía el coste.`,
   v:['regimen-malo','slippage','spread']},
  {id:'regimen-malo',tema:'robu',n:'Régimen malo',a:['año malo','peor año del activo','captura','2022'],
   d:`El peor año del activo (el año en que más llegó a caer, no el que peor cerró) más 2022. Aquí no se pide ganar mientras el activo se hunde, sino <b>no empeorar su caída</b>: pasa si gana o si se come como mucho el 50 % de la caída del activo, y suspende si se come más o si se deja más del 25 % pase lo que pase. No hay excepción por «pocas operaciones»: ausentarse no se premia.`,
   e:`El activo cayó un 30 % ese año: tu regla puede caer hasta un 15 % y aprobar; si cae un 18 %, suspende.`,
   v:['stress','drawdown']},
  {id:'sobreajuste',tema:'robu',n:'Sobreajuste (overfitting)',a:['overfitting','curve fitting','ajustar a los datos','memorizar'],
   d:`Ajustar la regla tanto a los datos del pasado que aprende el ruido en vez de la señal: queda preciosa en el diseño y se aplana en el examen. Los síntomas son muchos parámetros, resultados que se hunden al moverlos un poco y un PF del diseño muy superior al del examen; las 5 fases existen para cazarlo.`,
   e:`Pruebas 500 combinaciones de números y te quedas con la mejor: parece un PF de 2,5, pero la mejor de 500 siempre lo parece. El examen dirá la verdad.`,
   v:['in-sample','out-of-sample','meseta','pico']},
  {id:'look-ahead',tema:'robu',n:'Look-ahead (mirar el futuro)',a:['lookahead','mirar el futuro','sesgo de anticipación','información futura'],
   d:`Usar en una decisión información que en ese momento todavía no existía, por ejemplo el cierre de hoy para entrar «a la apertura de hoy». Da backtests espectaculares y falsos. Aquí se evita con reglas fijas: señal al cierre, orden en la apertura siguiente y stops calculados con datos hasta la vela anterior.`,
   e:`Una regla que «compra cuando el cierre del día es el máximo del día» parece perfecta, pero no puedes saber que el cierre será el máximo hasta que el día ha terminado.`,
   v:['apertura-siguiente','trailing']},

  /* ---------- riesgo y tamaño ---------- */
  {id:'tamano',tema:'riesgo',n:'Tamaño de posición',a:['position sizing','sizing','tamaño','lotes','riesgo por operación'],
   d:`Cuánto compras o vendes en cada operación. Aquí hay dos formas: <b>% del capital</b> (100 % = una posición cuyo valor iguala tu cuenta) o <b>riesgo %</b> (arriesgas un % del capital hasta el stop; exige tener stop), donde el tamaño sale de dividir el riesgo entre la distancia al stop.`,
   e:`Cuenta de 10.000 $, riesgo del 1 % (100 $) y stop al 2 % del precio: posición = 100 / 0,02 = 5.000 $, la mitad de la cuenta.`,
   v:['nocional','apalancamiento','r']},
  {id:'nocional',tema:'riesgo',n:'Nocional',a:['valor de la posición','exposición'],
   d:`El valor total de la posición (cantidad × precio), no el dinero que pones como margen. Es lo que se mueve con el mercado: lo que ganas o pierdes es la variación del precio por el nocional.`,
   e:`Nocional de 10.000 $ y el activo sube un 1 %: ganas 100 $, aunque solo hayas puesto 2.000 $ de margen.`,
   v:['apalancamiento','tamano']},
  {id:'apalancamiento',tema:'riesgo',n:'Apalancamiento',a:['leverage','margen','palanca'],
   d:`Cuántas veces el nocional supera tu capital (nocional ÷ capital): con 1× no hay apalancamiento y con 5× un 1 % en contra te quita el 5 % del capital. Multiplica ganancias y pérdidas por igual. La Cueva Tester no apalanca por defecto (nocional hasta el 100 % del capital); con «riesgo %» hay un tope, el «apalancamiento máximo».`,
   e:`Capital de 10.000 $ y nocional de 30.000 $: apalancamiento 3×; una caída del 10 % del activo es una pérdida del 30 % del capital.`,
   v:['nocional','tamano','drawdown']},

  /* ---------- del test al dinero real ---------- */
  {id:'forward',tema:'real',n:'Incubación · forward',a:['forward','incubación','paper','demo','forward test','live','dinero real'],
   d:`Probar la estrategia en vivo sin arriesgar dinero real (cuenta demo o paper) o arriesgando muy poco, vigilando que se comporta como esperaba el backtest. Es el paso que viene después de la paridad MT5 y antes del <b>live</b> (dinero real con semáforo de salud).`,
   e:`El backtest esperaba unas 12 operaciones al año y una caída máxima del 15 %: tras 6 meses en demo llevas 6 operaciones y una caída del 5 %, va como se esperaba. Con 1 operación y una caída del 20 %, algo falla.`,
   v:['paridad','fases']},

  /* ---------- ampliación del glosario (2026-11-19): más palabras de cada tema, de lo básico a lo avanzado ---------- */
/* ---------- el AED (nuevos) ---------- */
  {id:'vela-ohlc',tema:'aed',n:'Vela (OHLC) y su rango',a:['vela','velas','candle','candlestick','ohlc','open high low close','apertura máximo mínimo cierre','rango de la vela','range','barra','bar'],
   d:`Cada vela resume un tramo de tiempo con cuatro precios: <b>open</b> (apertura), <b>high</b> (máximo), <b>low</b> (mínimo) y <b>close</b> (cierre). El <b>rango</b> de la vela es máximo − mínimo: lo que se movió el precio dentro de ella, aunque cerrara casi donde abrió.`,
   e:`Vela diaria: abre en 100, llega a 105, baja a 99 y cierra en 102. Rango = 105 − 99 = 6, aunque entre la apertura y el cierre solo avanzó 2.`,
   v:['marco-temporal','atr','ibs']},
  {id:'marco-temporal',tema:'aed',n:'Marco temporal (timeframe)',a:['timeframe','temporalidad','tf','d1','h1','m15','velas diarias','velas horarias','periodo de la vela'],
   d:`Lo que dura cada vela: un día (D1), una hora (H1), 15 minutos (M15)… Cambiar de marco cambia el número de velas, el ruido y el peso de los costes: en velas cortas cada una se mueve menos y el spread pesa mucho más frente a lo que se mueve.`,
   e:`Un año tiene unas 250 velas D1, pero más de 5.000 H1 si el mercado opera casi 24 horas. Más velas no son más evidencia independiente, y en H1 el coste de cada operación pesa más.`,
   v:['vela-ohlc','regla-10','hora-servidor']},
  {id:'activo-subyacente',tema:'aed',n:'Activo y subyacente',a:['activo','subyacente','underlying','instrumento','símbolo','symbol','ticker'],
   d:`El <b>activo</b> es lo que operas (un índice, el oro, una acción, un par de divisas). El <b>subyacente</b> es el activo real del que depende un derivado: un CFD o un futuro sobre el Nasdaq 100 tiene ese índice de subyacente, pero sus costes y su horario dependen del producto y del bróker.`,
   e:`Operas en tu bróker un CFD llamado, por ejemplo, «NAS100»: el subyacente es el índice Nasdaq 100, y el CFD añade su propio spread, su swap y su horario.`,
   v:['cfd-contado','futuro-continuo']},
  {id:'rendimiento',tema:'aed',n:'Rendimiento simple y logarítmico',a:['retorno','rendimiento','return','retorno simple','retorno logarítmico','log return','log-return','rentabilidad','variación porcentual'],
   d:`El rendimiento <b>simple</b> es la variación porcentual del precio: (final / inicial) − 1. El <b>logarítmico</b> es ln(final / inicial), con ln = logaritmo natural. Para movimientos pequeños casi coinciden; los logarítmicos se suman a lo largo del tiempo y los simples no.`,
   e:`De 100 a 110: simple +10 %, logarítmico +9,53 %. De 110 a 100: simple −9,09 %, logarítmico −9,53 %. Los logarítmicos suman 0 (vuelves al punto de partida); los simples no.`,
   v:['pb','retorno-cagr','desviacion-tipica']},
  {id:'media-mediana',tema:'aed',n:'Media y mediana',a:['media','mediana','promedio','average','mean','median','valor típico'],
   d:`La <b>media</b> suma todo y divide entre el número de datos; la <b>mediana</b> es el valor que queda en el medio al ordenarlos. Un solo valor enorme arrastra la media pero apenas mueve la mediana: por eso conviene mirar las dos.`,
   e:`Diez operaciones: nueve de +1 % y una de +91 %. La media es +10 % y la mediana +1 %. La media «dice» que una operación típica da un 10 %, y no es verdad.`,
   v:['outlier','percentil-mediana','mejor-peor-operacion']},
  {id:'desviacion-tipica',tema:'aed',n:'Desviación típica (standard deviation)',a:['desviación estándar','desviación típica','sigma','σ','std','standard deviation','dispersión','varianza','variance'],
   d:`Mide cuánto se suelen alejar los datos de su media. Con retornos, una desviación alta es un activo que se mueve mucho. Es la base de la volatilidad, del Sharpe y de las bandas de Bollinger, y describe bien lo «normal»: no avisa de los días extremos.`,
   e:`Si las velas diarias se desvían un 1 % de su media, la volatilidad anualizada ronda el 16 % (1 % × √252, con unas 252 velas al año).`,
   v:['volatilidad','sharpe','asimetria-curtosis']},
  {id:'correlacion',tema:'aed',n:'Correlación',a:['correlación','correlation','se mueven juntos','coeficiente de correlación','correl','r de pearson'],
   d:`Un número de −1 a +1 que dice si dos series suben y bajan a la vez. +1: siempre juntas; 0: sin relación lineal; −1: en sentido contrario. Mide cuánto se acompañan, no si una causa la otra, y cambia con el tiempo (en las crisis tiende a subir).`,
   e:`Dos índices bursátiles con correlación 0,9 son casi la misma apuesta; un índice y el oro con 0,1 apenas se parecen en el día a día (cifras de ejemplo).`,
   v:['correlacion-estrategias','diversificacion-cartera']},
  {id:'asimetria-curtosis',tema:'aed',n:'Asimetría (skew) y curtosis',a:['skew','skewness','asimetría','curtosis','kurtosis','colas gordas','fat tails','forma de la distribución'],
   d:`Dos rasgos de la forma de los retornos. La <b>asimetría</b> dice hacia qué lado se estira la cola: negativa = más caídas bruscas que subidas bruscas. La <b>curtosis</b> dice lo gordas que son las colas: en exceso &gt; 0, hay más días extremos que en una campana normal.`,
   e:`Un activo que sube despacio y se desploma de golpe de vez en cuando tiene asimetría negativa y curtosis alta: la media engaña y los días «imposibles» ocurren.`,
   v:['volatilidad','riesgo-cola','desviacion-tipica']},
  {id:'outlier',tema:'aed',n:'Outlier (valor atípico)',a:['outlier','outliers','valor atípico','dato atípico','valor extremo','pico raro','spike','dato erróneo'],
   d:`Un dato muy alejado del resto. Puede ser un <b>error</b> (un precio mal registrado) o un suceso <b>real</b> (un desplome). Los errores se corrigen o se descartan; los reales se dejan, porque también ocurrirán en vivo. Nunca quites outliers solo porque estropean el resultado.`,
   e:`Una vela con el mínimo un 40 % por debajo de las vecinas y vuelta inmediata al precio normal: probable error. Un −12 % en un día en que todo el mercado se desploma: real, y debe contar.`,
   v:['limpieza-datos','media-mediana','mejor-peor-operacion']},
  {id:'limpieza-datos',tema:'aed',n:'Limpieza de datos y datos faltantes',a:['limpieza','datos faltantes','missing data','huecos','duplicados','velas duplicadas','calidad de datos','data cleaning','velas imposibles','csv'],
   d:`Revisar el histórico antes de usarlo: velas repetidas, precios imposibles (un mínimo por encima del máximo), huecos y velas de fin de semana. No rellenes los huecos con precios inventados: falsean el resultado.`,
   e:`Tu CSV trae 3 velas repetidas y un hueco de 20 días: de cada repetida se queda la última y el hueco se avisa, no se rellena con precios inventados.`,
   v:['outlier','splits-dividendos','sesgo-supervivencia']},
  {id:'splits-dividendos',tema:'aed',n:'Ajuste por splits y dividendos',a:['split','splits','contrasplit','precio ajustado','adjusted close','datos ajustados','ajuste'],
   d:`En acciones, un <b>split</b> cambia el precio sin cambiar tu riqueza, y un dividendo baja el precio el día ex-dividendo. Los datos <b>ajustados</b> corrigen el pasado para que esos saltos no parezcan caídas reales. Comprueba si tu CSV viene ajustado: depende del proveedor.`,
   e:`Acción a 100 con un split 2 a 1: al día siguiente cotiza a 50. Sin ajustar, el backtest vería un −50 % que nunca ocurrió y quizá saltaría un stop falso.`,
   v:['limpieza-datos','dividendos','cfd-contado']},
  {id:'cfd-contado',tema:'aed',n:'CFD vs contado (spot)',a:['cfd','contrato por diferencias','contado','spot','precio al contado','derivado','contract for difference'],
   d:`Al <b>contado</b> (spot) compras el activo o su precio directo. Un <b>CFD</b> es un contrato con tu bróker que replica la variación de un subyacente sin poseerlo: lleva spread, swap y apalancamiento, y su precio (a veces basado en un futuro) y su horario dependen del bróker.`,
   e:`Un CFD de un índice de EE. UU. no te hace dueño de nada: pagas o cobras swap por mantenerlo de un día a otro y el resultado depende de cómo cotice tu bróker.`,
   v:['swap','activo-subyacente','futuro-continuo']},
  {id:'futuro-continuo',tema:'aed',n:'Futuro continuo y rollover',a:['futuro','futuros','futures','contrato continuo','continuous contract','rollover','roll','vencimiento','contrato de futuros','back-adjusted','ajustado hacia atrás'],
   d:`Un contrato de futuros caduca. Para tener un histórico largo se encadenan contratos en un «futuro continuo»; al pasar de uno al siguiente (<b>rollover</b>) el precio salta porque no valen igual. Sin ajuste, ese salto parece un gap que nunca pudiste operar.`,
   e:`El contrato de marzo cierra en 5.000 y el de junio abre en 5.020: una serie sin ajustar muestra +20 que nadie pudo ganar; la serie ajustada lo corrige hacia atrás.`,
   v:['gap','cfd-contado','limpieza-datos']},
  {id:'sesgo-supervivencia',tema:'aed',n:'Sesgo de supervivencia',a:['survivorship bias','supervivencia','empresas quebradas','delisted','exclusiones del índice','sesgo de supervivencia'],
   d:`Probar solo con lo que sigue existiendo hoy y olvidar lo que desapareció. Las empresas que quebraron o salieron del índice no están en tu lista, así que el pasado parece más fácil de lo que fue y los resultados salen mejores que los reales.`,
   e:`Testear una regla sobre las acciones que hoy forman parte de un índice, 20 años hacia atrás, deja fuera a las que quebraron por el camino: justo las que más habrían dolido.`,
   v:['limpieza-datos','sobreajuste','por-que-fallan']},
  {id:'tendencia-reversion',tema:'aed',n:'Tendencia vs reversión a la media (mean reversion)',a:['tendencia','trend','reversión a la media','mean reversion','reversión','rebote','contrarian','contratendencia'],
   d:`Dos formas de comportarse un precio. En <b>tendencia</b>, lo que sube tiende a seguir subiendo; en <b>reversión a la media</b>, lo que se aleja de lo normal tiende a volver. Un activo puede mostrar una u otra según el plazo y la época, y cada regla se diseña para una de ellas.`,
   e:`Una caída fuerte seguida de rebote favorece una regla de reversión (RSI corto); una ruptura que sigue y sigue favorece una de tendencia. El AED mira cuál asoma en tu activo.`,
   v:['memoria','trend-following','rsi']},
  {id:'estacionalidad',tema:'aed',n:'Estacionalidad y efecto calendario',a:['estacionalidad','seasonality','efecto calendario','calendar effect','día de la semana','mes del año','efecto enero','efecto lunes','hora del día'],
   d:`Un patrón que se repite según el calendario: día de la semana, mes u hora. Con tantas casillas (5 días, 12 meses, 24 horas) alguna sale bonita por pura suerte; por eso el AED la compara con el <b>mejor</b> día, hora o mes del azar, no con uno cualquiera.`,
   e:`Diez años de datos dan unos 500 lunes: una diferencia de +4 pb frente a otros días puede ser solo ruido. Antes de fiarte pide una razón detrás y que se repita en las épocas.`,
   v:['mec-cal','hallazgo','comparaciones-multiples']},
  {id:'sesion-mercado',tema:'aed',n:'Sesión: apertura, cierre, overnight e intradía',a:['sesión','session','apertura','cierre','open','close','overnight','intradía','intraday','sesión regular','premarket'],
   d:`La <b>sesión</b> es el tramo del día en que opera un mercado, con su apertura y su cierre. <b>Intradía</b> es lo que ocurre dentro de la sesión; <b>overnight</b>, lo que ocurre entre el cierre y la apertura siguiente, que es donde nacen los gaps.`,
   e:`En la sesión regular de la bolsa de EE. UU. (9:30 a 16:00, hora de Nueva York), comprar al cierre y vender a la apertura del día siguiente es una operación solo overnight.`,
   v:['gap','hora-servidor','horario-festivos']},
  {id:'liquidez-volumen',tema:'aed',n:'Liquidez y volumen',a:['liquidez','liquidity','volumen','volume','tick volume','volumen de ticks','profundidad','mercado fino','iliquidez'],
   d:`<b>Liquidez</b> es lo fácil que es comprar o vender sin mover el precio. <b>Volumen</b> es lo que se negocia en una vela. Con poca liquidez, el spread y el slippage suben. Ojo: en divisas y CFD el volumen suele ser un recuento del propio bróker, no el de todo el mercado.`,
   e:`En plena sesión, un índice grande se opera con costes de pocos pb; una acción pequeña y poco negociada puede moverse un 1 % solo por tu orden (cifras de ejemplo).`,
   v:['spread','slippage','volatilidad']},

  /* ---------- validar (nuevos) ---------- */
  {id:'hipotesis',tema:'val',n:'Hipótesis (qué explotas y por qué existe)',a:['hipótesis','hypothesis','razón','por qué funciona','tesis','lógica de la estrategia'],
   d:`La frase que explica <b>qué</b> comportamiento del mercado explotas y <b>por qué</b> debería existir (quién pierde, qué se repite). Se escribe antes de probar. Sin una razón detrás, un buen resultado en el backtest es más fácil de atribuir a la suerte.`,
   e:`Hipótesis de ejemplo, sin demostrar: «tras una caída brusca, parte de las ventas son forzadas y el precio rebota algo». El AED y el backtest dicen si los datos la apoyan.`,
   v:['aed','edge','regla-mecanica']},
  {id:'edge',tema:'val',n:'Ventaja o edge',a:['edge','ventaja','ventaja estadística','expectativa positiva','statistical edge'],
   d:`Una expectativa positiva que se repite <b>después de costes</b> y tiene una razón de ser. No es acertar mucho: con buen payoff puedes tener edge acertando el 40 %, y con un 80 % de acierto puedes no tenerlo. Y tenerlo no garantiza ganar en un periodo concreto.`,
   e:`Ganas 300 $ el 40 % de las veces y pierdes 100 $ el 60 %: esperanza de +60 $ por operación (cifras de ejemplo). Hay edge, pero con rachas malas seguirías perdiendo un tiempo.`,
   v:['expectancy','win-rate','payoff','por-que-fallan']},
  {id:'regla-mecanica',tema:'val',n:'Regla mecánica (sistema)',a:['regla','sistema','sistema mecánico','mecánico','sistemático','discrecional','algoritmo'],
   d:`Una regla que no deja nada a la interpretación: con los mismos datos da siempre la misma decisión (entrar, salir, cuánto). Solo lo mecánico se puede testear. «Entro cuando el mercado se ve fuerte» no lo es; «entro si el cierre supera el máximo de 20 velas» sí.`,
   e:`«Compro si RSI(4) &lt; 25 con el cierre sobre la media de 200 y vendo si RSI(4) &gt; 55»: dos personas con el mismo gráfico tomarán exactamente las mismas decisiones.`,
   v:['plantilla-reglas','entrada-salida','parametro']},
  {id:'parametro',tema:'val',n:'Parámetro',a:['parámetro','parámetros','parameter','periodo','umbral','número de la regla','input','variable'],
   d:`Un número que eliges tú dentro de la regla: el periodo de una media, el umbral de un RSI, la k de un ATR. Cada parámetro es una perilla más para ajustar al pasado; con pocos hay menos dónde esconder un resultado afortunado.`,
   e:`«RSI(4) &lt; 25» tiene dos parámetros: el periodo (4) y el umbral (25). Añadir una media de 200 y un stop del 2 % suma otros dos.`,
   v:['optimizacion-rejilla','sobreajuste','sensibilidad-parametro']},
  {id:'buy-and-hold',tema:'val',n:'Comprar y mantener (buy and hold) y benchmark',a:['buy and hold','buy & hold','comprar y mantener','benchmark','referencia','índice de referencia','pasivo'],
   d:`Comprar el activo al principio y no tocarlo: la vara de medir más honesta. Una regla debe aportar algo frente a eso: más retorno, o menos caída para un retorno parecido. El «régimen malo» de la Fase 5 se mide contra el activo, es decir, contra comprar y mantener.`,
   e:`El activo da +80 % con una caída del 35 %. Tu regla da +50 % con una caída del 12 %: gana menos, pero el camino es mucho más llevadero (cifras de ejemplo).`,
   v:['regimen-malo','drawdown','retorno-cagr']},
  {id:'tamano-muestra',tema:'val',n:'Tamaño de muestra y mínimo de operaciones',a:['muestra','tamaño de muestra','sample size','pocas operaciones','número mínimo de operaciones','mínimo de operaciones','30 operaciones','casos'],
   d:`Cuantas más operaciones, más fiable es el promedio que ves; con pocas, manda el azar. La Fase 1 exige al menos 30 operaciones, y es un mínimo, no una garantía: con 30 operaciones, el acierto medido tiene un error típico de unos ±9 puntos.`,
   e:`Acierto medido del 60 % con 30 operaciones: el verdadero podría ser un 50 %. Con 300 operaciones el error baja a unos ±3 puntos (cifras de ejemplo).`,
   v:['criterios-fase1','ruido','pf-sin-mejor']},
  {id:'optimizacion-rejilla',tema:'val',n:'Optimización y rejilla (grid)',a:['optimización','optimizar','grid','rejilla','grid search','barrido','mapa de calor','heatmap','buscar los mejores parámetros'],
   d:`Probar todas las combinaciones de varios parámetros en una <b>rejilla</b> y mirar cómo sale cada casilla. Elegir la mejor casilla es la receta del sobreajuste; buscar una <b>zona</b> de casillas buenas es lo sano. El mapa de la fase Optimizar enseña esa rejilla para que busques una meseta, no la casilla más alta.`,
   e:`RSI de 2 a 6 y umbrales de 15 a 35: 25 combinaciones. Si 20 tienen PF &gt; 1 hay una zona; si solo una sale bien, es un pico.`,
   v:['meseta','pico','sobreajuste','data-snooping']},
  {id:'criterios-fase1',tema:'val',n:'Los 4 criterios de la Fase 1',a:['fase 1','f1','criterios','criterios duros','4 criterios','pf 1,3','aprobar fase 1'],
   d:`Para pasar la Fase 1 hacen falta las cuatro a la vez: PF en el examen ≥ 1,30; al menos 30 operaciones en total (diseño y examen, sin el sello); una caída máxima en el examen menor que la de comprar y mantener en ese mismo tramo (el 20 % es el objetivo, no un suspenso automático); y PF sin la mejor operación &gt; 1,0. No se bajan por estrategia.`,
   e:`PF OOS 1,45, 42 operaciones, caída del 14 % (el activo cayó un 22 % en ese tramo) y PF sin la mejor 1,12: pasa. Con PF OOS de 1,28 no pasa, aunque lo demás sea perfecto (cifras de ejemplo).`,
   v:['out-of-sample','pf','pf-sin-mejor','veredicto']},
  {id:'veredicto',tema:'val',n:'Veredicto',a:['veredicto','resultado final','pasa','suspende','aprobado','suspendido','verdict','aprueba'],
   d:`La conclusión del informe: la regla <b>pasa</b> solo si cumple todas las fases; si falla una, suspende y el informe dice cuál. Un veredicto positivo no es una promesa de ganar: significa que con estos datos no se ha encontrado razón para descartarla.`,
   e:`Fases 1 a 4 en verde y la Fase 5 en rojo porque con costes ×2 el PF baja de 1,1: veredicto «no pasa». Toca revisar costes o idea, no bajar el umbral.`,
   v:['fases','criterios-fase1','examen-una-vez']},
  {id:'sesgo-confirmacion',tema:'val',n:'Sesgo de confirmación',a:['confirmation bias','sesgo de confirmación','autoengaño','ver lo que quiero ver','cherry picking'],
   d:`La tendencia a dar más peso a lo que confirma lo que ya pensabas e ignorar lo que lo contradice. En trading: enamorarte de una idea y fijarte solo en los gráficos donde funciona. Defensa: escribe antes de probar qué resultado te haría descartarla.`,
   e:`Te gusta una regla y, ante un examen malo, piensas «ese año fue raro». Si de antemano habías decidido que un examen malo la descartaba, no era un año raro: era la señal.`,
   v:['hipotesis','data-snooping','criterios-fase1']},
  {id:'data-snooping',tema:'val',n:'Data snooping y p-hacking',a:['data snooping','data mining','p-hacking','p hacking','pescar datos','minería de datos','espiar los datos','probar hasta que salga','fishing'],
   d:`Probar muchas ideas, variantes o filtros sobre los <b>mismos datos</b> y quedarte con lo que sale bien. Cuantas más pruebas, más seguro es que alguna destaque por azar, aunque no tenga ventaja. Es el motivo de apartar un examen y un sello que nadie haya tocado.`,
   e:`Pruebas 200 combinaciones y la mejor tiene PF 2,1. No es un hallazgo: la mejor de 200 siempre luce bien. Hay que comprobarla donde no se ha mirado.`,
   v:['comparaciones-multiples','sobreajuste','examen-una-vez','sello']},
  {id:'comparaciones-multiples',tema:'val',n:'Comparaciones múltiples',a:['comparaciones múltiples','multiple comparisons','multiple testing','falsos positivos','false positive','bonferroni','muchas pruebas a la vez'],
   d:`Si haces muchas pruebas a la vez, crece la probabilidad de que alguna salga «significativa» por azar. Con un listón del 5 %, en 20 pruebas independientes lo normal es que 1 lo supere sin ventaja real: cuantas más pruebas, más hay que exigir.`,
   e:`Con 20 pruebas independientes, la probabilidad de que al menos una pase el listón del 5 % solo por azar es 1 − 0,95^20 ≈ 64 %. El AED hace unas 26 a la vez.`,
   v:['data-snooping','mec-cal','fuerza']},
  {id:'examen-una-vez',tema:'val',n:'Examen que se abre una sola vez',a:['examen','abrir el examen','contaminar el examen','examen contaminado','gastar el sello','mirar el oos','peeking','mirar y retocar'],
   d:`El examen solo vale mientras no lo uses para decidir. Cada vez que miras el resultado, retocas la regla y vuelves a mirar, el examen se convierte en diseño sin que lo notes. Por eso el último 20 % queda sellado y se abre una sola vez, al final, sin entrar en el veredicto.`,
   e:`Miras el examen: PF 1,1. Cambias el umbral del RSI y sale 1,4. Ese 1,4 ya no es una prueba honesta, porque ha visto las respuestas. Solo vale uno que no hayas mirado.`,
   v:['out-of-sample','sello','data-snooping']},

  /* ---------- leer un backtest (nuevos) ---------- */
  {id:'operacion',tema:'res',n:'Operación (trade) y retorno por operación',a:['operación','trade','trades','operaciones','retorno por operación','return per trade','ganancia por operación','posición cerrada'],
   d:`Una <b>operación</b> es un ciclo completo: abrir una posición y cerrarla. Su <b>retorno</b> es el resultado de ese ciclo en % (o en $, o en R), ya con costes. Casi todas las estadísticas (PF, win rate, expectancy) salen de la lista de operaciones.`,
   e:`Compras a 100,0 y vendes a 102,0, con 0,1 de costes en total: (102 − 100) / 100 = +2 % menos 0,1 % de costes = retorno de +1,9 %.`,
   v:['expectancy','r','retorno-cagr']},
  {id:'curva-capital',tema:'res',n:'Curva de capital (equity curve)',a:['equity','equity curve','curva de equity','curva de capital','curva de saldo','balance','evolución del capital'],
   d:`El gráfico del valor de tu cuenta a lo largo del tiempo. Una curva sana sube con altibajos moderados; una escalera de un solo escalón (casi todo el beneficio en una operación) o una curva que se aplana tras el diseño son señales de alarma. De ella sale el drawdown.`,
   e:`Dos reglas acaban en +50 %. Una llega con una subida regular durante 10 años; la otra da +45 % en una sola operación y el resto es plano. Mismo final, historias muy distintas.`,
   v:['drawdown','mejor-peor-operacion','recuperacion-drawdown']},
  {id:'beneficio-neto-bruto',tema:'res',n:'Beneficio neto vs bruto',a:['neto','bruto','net profit','gross profit','gross loss','beneficio neto','beneficio bruto','después de costes','antes de costes'],
   d:`<b>Neto</b> es lo que queda después de costes (spread, comisión, deslizamiento y swap); <b>bruto</b>, antes. Ojo: en el informe del Strategy Tester de MT5, «Gross Profit» y «Gross Loss» son la suma de las ganadoras y de las perdedoras, y «Total Net Profit» es el resultado final.`,
   e:`Una regla de 100 operaciones da +1.200 $ antes de costes; spread, comisión y swap suman 450 $. Beneficio neto: 750 $. Con costes ×2 quedarían 300 $.`,
   v:['pf','regla-10','costes-por-dos']},
  {id:'retorno-cagr',tema:'res',n:'Retorno total y CAGR (anualizado)',a:['retorno total','cagr','rentabilidad anual','retorno anualizado','anualizado','compound annual growth rate','tasa anual compuesta','total return'],
   d:`El <b>retorno total</b> es cuánto creció el capital en todo el periodo. El <b>CAGR</b> lo expresa como un ritmo anual constante: (final / inicial) elevado a 1/años, menos 1. Sirve para comparar periodos de distinta duración.`,
   e:`De 100.000 $ a 180.000 $ en 6 años: retorno total +80 %, CAGR = 1,8^(1/6) − 1 ≈ +10,3 % anual (no 80 / 6 = 13,3 %).`,
   v:['interes-compuesto','calmar','buy-and-hold']},
  {id:'interes-compuesto',tema:'res',n:'Capital inicial y reinversión (interés compuesto)',a:['interés compuesto','compounding','reinversión','reinvertir','capital inicial','efecto bola de nieve','initial capital','compuesto'],
   d:`Si cada operación se dimensiona sobre el capital que tienes <b>ahora</b>, las ganancias se reinvierten y crecen sobre sí mismas (las pérdidas también). Si se dimensiona sobre el capital inicial, no hay reinversión. Con tamaño proporcional, el capital inicial cambia los dólares, no los %.`,
   e:`10.000 $ al 10 % anual durante 5 años: con reinversión acabas en 16.105 $; sin reinversión (ganas 1.000 $ cada año), en 15.000 $.`,
   v:['retorno-cagr','tamano','tamano-fijo-fraccion']},
  {id:'exposicion-duracion',tema:'res',n:'Exposición y duración de las operaciones',a:['exposición','tiempo en mercado','time in market','duración media','duración de la operación','holding period','velas por operación','días en posición'],
   d:`La <b>exposición</b> es el porcentaje del tiempo con una posición abierta; la <b>duración</b> media, lo que dura cada operación. Con poca exposición el capital pasa parado el resto del tiempo, y la duración decide cuánto swap pagas y cuánto te afectan los gaps.`,
   e:`Una regla que está dentro el 20 % del tiempo y rinde un 6 % anual lo logró arriesgando el capital solo 1 de cada 5 días. Frente a comprar y mantener (100 % dentro), no es el mismo riesgo.`,
   v:['swap','buy-and-hold','coste-oportunidad']},
  {id:'mejor-peor-operacion',tema:'res',n:'Mejor y peor operación',a:['mejor operación','peor operación','best trade','worst trade','operación extrema','dependencia de una operación','golpe de suerte'],
   d:`Las dos operaciones extremas del historial. Si el beneficio depende de unas pocas ganadoras enormes (por eso existe el PF sin la mejor operación), o una sola pérdida puede borrar meses de ganancias, la curva es frágil. Compara siempre la peor operación con la pérdida media.`,
   e:`Beneficio total de 10.000 $, y la mejor operación aporta 7.000 $: sin ella quedan 3.000 $. Si la peor pierde 2.500 $ y la perdedora media 150 $, hay una cola de pérdidas.`,
   v:['pf-sin-mejor','cola-perdidas','media-mediana']},
  {id:'racha-perdedora',tema:'res',n:'Racha perdedora',a:['racha perdedora','racha de pérdidas','losing streak','pérdidas consecutivas','consecutive losses','mala racha','racha negativa'],
   d:`Operaciones perdedoras seguidas. Es normal y no es mala señal por sí sola: incluso con un 50 % de acierto, en unas 100 operaciones lo habitual es ver una racha de unas 6 perdedoras seguidas. Sirve para dimensionar el riesgo y para saber cuándo no hay que asustarse.`,
   e:`Con un 40 % de acierto, rachas de 7 u 8 perdedoras son corrientes sin que la regla esté rota. Con un riesgo del 1 % por operación, 10 seguidas son unos −9,6 % de la cuenta.`,
   v:['montecarlo','bloques','riesgo-por-operacion','drawdown-tolerable']},
  {id:'recuperacion-drawdown',tema:'res',n:'Recuperación del drawdown',a:['recuperación','recovery','tiempo de recuperación','recovery time','recuperar la caída','underwater','bajo el agua','volver al máximo'],
   d:`Cuánto tardas en volver al máximo anterior tras una caída. Dos caídas iguales pueden ser muy distintas si una se recupera en 3 meses y la otra en 3 años. Además, recuperar cuesta más de lo que se cayó: tras perder un 20 % hay que ganar un 25 %.`,
   e:`La curva sube a 120.000 $, cae a 96.000 $ (−20 %) y necesita +24.000 $ (+25 %) para volver a 120.000 $. Si tarda 18 meses, esos 18 meses también cuentan.`,
   v:['drawdown','drawdown-tolerable','curva-capital']},
  {id:'sharpe',tema:'res',n:'Ratio de Sharpe',a:['sharpe','ratio de sharpe','sharpe ratio','retorno ajustado al riesgo','rentabilidad por riesgo','riesgo ajustado'],
   d:`El retorno medio (por encima de la tasa sin riesgo, que a veces se ignora) dividido por la desviación típica de los retornos, normalmente anualizado. Dice cuánto retorno obtienes por unidad de volatilidad. Trata igual las subidas que las caídas y se fía mal con pocos datos.`,
   e:`Retorno anual del 10 % y desviación del 12 %: Sharpe ≈ 0,83 (ignorando la tasa sin riesgo). Dos reglas con el mismo Sharpe pueden tener caídas máximas muy distintas.`,
   v:['sortino','calmar','desviacion-tipica']},
  {id:'sortino',tema:'res',n:'Ratio de Sortino',a:['sortino','ratio de sortino','sortino ratio','desviación a la baja','downside deviation'],
   d:`Como el Sharpe, pero en el denominador solo cuenta la volatilidad de los retornos <b>negativos</b> (la desviación a la baja). Así no castiga a la estrategia por tener subidas grandes. Es más justo con sistemas de pocas pérdidas y ganancias a veces grandes.`,
   e:`Retorno anual del 10 %, desviación total del 12 % y desviación a la baja del 8 %: Sharpe ≈ 0,83 y Sortino = 10 / 8 = 1,25 (cifras de ejemplo).`,
   v:['sharpe','calmar']},
  {id:'calmar',tema:'res',n:'Ratio de Calmar',a:['calmar','ratio de calmar','calmar ratio','retorno entre drawdown','cagr entre drawdown'],
   d:`El CAGR dividido entre el drawdown máximo: cuánto ganas por cada punto de la peor caída. Es fácil de leer y mira justo lo que más duele, pero depende de una sola caída (la peor), que es un dato muy ruidoso.`,
   e:`CAGR del 12 % con un drawdown máximo del 20 %: Calmar = 12 / 20 = 0,6. Con el mismo CAGR y un drawdown del 10 %, sería 1,2.`,
   v:['retorno-cagr','drawdown','sharpe']},
  {id:'cola-perdidas',tema:'res',n:'Cola de pérdidas',a:['cola de pérdidas','cola izquierda','left tail','pérdidas extremas','peores operaciones','loss tail','peor 5 %'],
   d:`Las pérdidas más grandes de la lista de operaciones, comparadas con la pérdida normal. Una cola larga significa que de vez en cuando una operación pierde varias veces lo habitual (gaps, noticias). Mira el peor 5 % de las operaciones y la peor de todas frente a la pérdida media.`,
   e:`Pérdida media de 100 $, pero el 5 % peor de las operaciones pierde 400 $ o más y la peor, 1.100 $: la regla tiene cola. El stop no te protegió del gap (cifras de ejemplo).`,
   v:['riesgo-cola','gap','mejor-peor-operacion']},

  /* ---------- costes y ejecución (nuevos) ---------- */
  {id:'bid-ask',tema:'costes',n:'Bid y ask (precio de compra y de venta)',a:['bid','ask','offer','precio de compra','precio de venta','oferta y demanda','cotización','mid','precio medio','compra y venta'],
   d:`Todo activo tiene dos precios a la vez: el <b>ask</b> (al que compras) y el <b>bid</b> (al que vendes), con el ask por encima. La diferencia es el spread. Muchas plataformas, MT5 entre ellas, dibujan las velas con el bid: al comprar pagas algo más de lo que muestra el gráfico.`,
   e:`Bid 19.998 y ask 20.002: spread de 4 puntos. Si compras a 20.002 y vendes enseguida a 19.998, pierdes 4 puntos sin que el mercado se haya movido.`,
   v:['spread','orden-mercado-limite-stop','fill']},
  {id:'orden-mercado-limite-stop',tema:'costes',n:'Orden a mercado, límite y stop',a:['orden a mercado','market order','limit order','orden limitada','stop order','buy stop','sell stop','buy limit','sell limit','tipos de orden','orden pendiente'],
   d:`A <b>mercado</b>: se ejecuta ya, al precio que haya. <b>Límite</b>: solo a tu precio o mejor, y puede no ejecutarse. <b>Stop</b>: se activa al tocar un nivel y entonces sale a mercado. En el backtest, la señal se ejecuta a mercado en la apertura de la vela siguiente.`,
   e:`Precio 100. Buy limit a 99: compras solo si baja a 99 (quizá nunca). Buy stop a 101: compras si rompe 101. A mercado: compras ya, a unos 100.`,
   v:['apertura-siguiente','fill','rotura-breakout']},
  {id:'fill',tema:'costes',n:'Fill (ejecución de una orden)',a:['fill','fills','ejecución','precio de ejecución','execution','fill parcial','partial fill','relleno','ejecutado'],
   d:`El fill es el momento en que tu orden se ejecuta de verdad y el precio al que ocurre. Puede diferir del esperado (slippage) o llegar en parte (fill parcial). El backtest supone un fill limpio en la apertura de la vela siguiente más los costes que pongas; en real, manda el bróker.`,
   e:`Pides 10 contratos a mercado: 6 se ejecutan a 100,0 y 4 a 100,1. El precio medio de fill es 100,04, es decir, 0,04 de slippage frente a 100,0.`,
   v:['slippage','apertura-siguiente','desviacion-backtest-real']},
  {id:'pip-tick-punto',tema:'costes',n:'Pip, tick y punto',a:['pip','pips','tick','ticks','punto','puntos','point','tamaño del tick','valor del tick','mínima variación'],
   d:`Unidades para medir el movimiento del precio. El <b>tick</b> es la mínima variación posible del instrumento; el <b>pip</b> es la unidad típica de las divisas (0,0001 en la mayoría de pares y 0,01 en los del yen); el <b>punto</b> cambia según la plataforma: mira las especificaciones del símbolo.`,
   e:`En un bróker de 5 decimales, el EURUSD pasa de 1,10000 a 1,10010: es 1 pip (0,0001), que son 10 puntos de MT5. En un índice, un «punto» suele ser 1,0 del precio, según el bróker.`,
   v:['pb','lote-contrato','spread']},
  {id:'lote-contrato',tema:'costes',n:'Lote, contrato y multiplicador',a:['lote','lotes','lot','contrato','contratos','multiplicador','multiplier','valor del punto','tamaño del contrato','contract size','micro','mini'],
   d:`El <b>lote</b> o el <b>contrato</b> es la unidad de tamaño del bróker; el <b>multiplicador</b> dice cuántos dólares vale cada punto. Nocional = precio × multiplicador × nº de contratos. Cada instrumento tiene el suyo y se consulta en sus especificaciones.`,
   e:`Un futuro con multiplicador de 50 $ por punto y el índice en 5.000: un contrato mueve 5.000 × 50 = 250.000 $ de nocional, y cada punto de movimiento son 50 $ (cifras de ejemplo).`,
   v:['nocional','pip-tick-punto','margen']},
  {id:'comision-lado-ida-vuelta',tema:'costes',n:'Comisión por lado vs ida y vuelta',a:['por lado','ida y vuelta','round turn','round trip','comisión por lado','comisión ida y vuelta','per side','roundturn','comisión por lote'],
   d:`Cada operación tiene dos lados: entrar y salir. Algunos brókeres anuncian la comisión <b>por lado</b> (se paga dos veces) y otros <b>por ida y vuelta</b> (ya incluye las dos). Al comparar costes o rellenar el backtest, comprueba cuál es, o te equivocarás por un factor de 2.`,
   e:`3,5 $ por lado y por lote = 7 $ de ida y vuelta. Si el bróker anuncia «7 $ round turn» y lo metes como «por lado», el backtest paga 14 $ por operación.`,
   v:['comision','regla-10','spread']},
  {id:'margen',tema:'costes',n:'Margen',a:['margen','margin','margen requerido','margen libre','free margin','margin call','stop out','llamada de margen','depósito de garantía'],
   d:`El dinero que el bróker bloquea como garantía para mantener una posición apalancada. No es un coste: sigue siendo tuyo. Si tu equity baja demasiado respecto al margen, el bróker puede cerrarte posiciones (margin call o stop out); los niveles dependen del bróker.`,
   e:`Nocional de 10.000 $ con margen del 5 % (20:1): se bloquean 500 $. Con una cuenta de 600 $, una pérdida de 150 $ deja el equity en 450 $, por debajo del margen: riesgo de cierre forzoso.`,
   v:['apalancamiento','nocional','lote-contrato']},
  {id:'horario-festivos',tema:'costes',n:'Horario de sesión y festivos',a:['horario','horario de mercado','festivos','festivo','holidays','cierre anticipado','early close','medio día','calendario de mercado','trading hours','fin de semana'],
   d:`Los mercados cierran de noche, en fines de semana y en festivos, y el horario de un CFD puede diferir del de su subyacente. Una vela «que falta» en un festivo no es un error. El backtest debe ver los mismos cierres y horarios que tu bróker.`,
   e:`El día después de Acción de Gracias la bolsa de EE. UU. cierra a las 13:00 (hora de Nueva York): una regla que «sale al cierre» opera a otra hora esa jornada.`,
   v:['hora-servidor','sesion-mercado','paridad']},
  {id:'dividendos',tema:'costes',n:'Dividendos',a:['dividendo','dividendos','dividend','ex-dividendo','ex dividend','ajuste por dividendo','dividend adjustment','pago de dividendos'],
   d:`Cuando una acción o un índice paga un dividendo, el precio cae por ese importe el día ex-dividendo. Con acciones o CFD, ir largo suele cobrarlo (o un ajuste equivalente) e ir corto, pagarlo; depende del bróker. Si los datos van sin ajustar, parecerá una caída que no existió.`,
   e:`Corto en una acción a 50 $ que paga 0,80 $: el día ex-dividendo cotiza ~49,20 $, pero te cargan 0,80 $, así que esa «bajada» no es ganancia.`,
   v:['splits-dividendos','cfd-contado','swap']},
  {id:'latencia',tema:'costes',n:'Latencia',a:['latencia','latency','retraso de ejecución','milisegundos','retardo','velocidad de ejecución'],
   d:`El tiempo entre que tu sistema decide y el bróker ejecuta. En estrategias lentas (velas diarias, entrada en la apertura) casi no importa; en las rápidas puede decidir el resultado. El backtest entra en la apertura de la vela siguiente y suma el slippage que pongas, pero no mide la latencia real de tu conexión.`,
   e:`Una señal diaria que se ejecuta en la apertura: 200 ms de más o de menos no cambian nada. Una regla que busca 3 pb en un minuto sí puede perderse por unos cientos de milisegundos.`,
   v:['slippage','vps-latencia','apertura-siguiente']},
  {id:'coste-oportunidad',tema:'costes',n:'Coste de oportunidad',a:['coste de oportunidad','opportunity cost','lo que dejas de ganar','alternativa','capital parado','tasa sin riesgo'],
   d:`Lo que dejas de ganar por elegir una cosa en vez de otra: tu capital, tu margen y tu tiempo podrían estar en otra alternativa. Una regla puede ganar dinero y aun así no compensar si lo mismo se conseguía con menos esfuerzo o menos riesgo.`,
   e:`Una regla que da +300 $ al año con 10.000 $ (3 %) compite con una alternativa de bajo riesgo que dé, por ejemplo, un 4 %: la regla es positiva, pero la alternativa rinde más (tasas de ejemplo).`,
   v:['buy-and-hold','exposicion-duracion','sharpe']},

  /* ---------- piezas de una regla (nuevos) ---------- */
  {id:'entrada-salida',tema:'reglas',n:'Entrada, salida y señal',a:['entrada','salida','señal','signal','entry','exit','condición de entrada','condición de salida','disparo'],
   d:`La <b>señal</b> es la condición que se cumple en una vela. La <b>entrada</b> abre la posición y la <b>salida</b> la cierra: por una condición, por stop, por objetivo o por tiempo. En la herramienta la señal se mira al cierre de la vela y la orden se ejecuta en la apertura de la siguiente.`,
   e:`Entrada: RSI(4) &lt; 25 al cierre. Salida: RSI(4) &gt; 55 al cierre, o un stop del 2 %. Cada cierre se evalúa y las órdenes entran en la apertura siguiente.`,
   v:['apertura-siguiente','stop','time-stop','plantilla-reglas']},
  {id:'largo-corto',tema:'reglas',n:'Largo y corto (long y short)',a:['largo','corto','long','short','comprar','vender en corto','venta en corto','short selling','ambos','posición larga','posición corta'],
   d:`Una posición <b>larga</b> (long) compra y gana si el precio sube. Una <b>corta</b> (short) vende primero y gana si baja; su pérdida teórica no tiene techo porque el precio puede subir sin límite. En acciones, ir corto puede exigir tomar prestados los títulos, y el swap de largos y cortos difiere.`,
   e:`Vendes en corto a 100 y el precio baja a 94: ganas 6. Si sube a 108, pierdes 8, y mientras no cierres esa pérdida puede seguir creciendo.`,
   v:['swap','stop','cfd-contado']},
  {id:'plantilla-reglas',tema:'reglas',n:'Plantilla de reglas (regla por bloques)',a:['plantilla','bloques','regla por bloques','constructor de reglas','rule builder','pseudocódigo','filtros entrada salida','y / o','and or'],
   d:`La herramienta arma la regla con bloques: filtros, entrada y salida (por cada lado), más stop, objetivo, salida por tiempo, tamaño y costes. Los números de la regla son sus parámetros: los que luego se mueven en la robustez.`,
   e:`Filtro: cierre &gt; SMA(200). Entrada: RSI(4) &lt; 25. Salida: RSI(4) &gt; 55. Parámetros: 4, 25, 55 y 200. Sin stop ni objetivo.`,
   v:['regla-mecanica','parametro','condicion-contexto-disparador']},
  {id:'condicion-contexto-disparador',tema:'reglas',n:'Contexto y disparador',a:['contexto','disparador','trigger','context','estado','evento','condición de contexto'],
   d:`El <b>contexto</b> es un estado que dura (el precio está sobre su media de 200); el <b>disparador</b> es un hecho puntual que dice «ahora» (el RSI baja de 25). Una regla suele juntar un contexto que filtra y un disparador que entra: el primero dice dónde estás y el segundo, cuándo actuar.`,
   e:`Contexto: cierre sobre la media de 200 (tendencia de fondo alcista). Disparador: RSI(4) &lt; 25 (caída corta y fuerte). Sin contexto compras todas las caídas; sin disparador, compras en cada vela sobre la media.`,
   v:['hallazgo','filtro-tendencia','entrada-salida']},
  {id:'time-stop',tema:'reglas',n:'Salida por tiempo (time stop)',a:['time stop','salida por tiempo','tiempo máximo','salir tras n velas','salida temporal','cerrar tras n días','max holding'],
   d:`Cerrar la operación tras un número fijo de velas, haya ganado o perdido. Pone un techo al tiempo que el capital está atado y al swap que pagas, y evita esperar un rebote que no llega. En la herramienta sale en la apertura de la vela de entrada más N.`,
   e:`Entras en la apertura del lunes con salida por tiempo a 5 velas diarias: si ni el stop ni el objetivo han saltado, sales en la apertura del lunes siguiente.`,
   v:['stop','objetivo','swap']},
  {id:'min-max-n',tema:'reglas',n:'Máximo y mínimo de N velas',a:['máximo de n velas','mínimo de n velas','highest high','lowest low','máximo de 20 días','mínimo de 20 días','max_n','min_n','nuevo máximo','nuevo mínimo','máximo de ayer'],
   d:`El precio más alto (o más bajo) de las últimas N velas. Es la base de las roturas: superar el máximo de 20 velas es «hacer un nuevo máximo». Para no mirar el futuro, el máximo o el mínimo de referencia debe calcularse con las N velas <b>anteriores</b>, sin contar la actual.`,
   e:`Los máximos de las últimas 5 velas son 101, 103, 102, 104 y 103: el máximo de 5 velas es 104. Un cierre de 105 lo supera; un cierre de 104, no.`,
   v:['rotura-breakout','donchian','look-ahead']},
  {id:'filtro-tendencia',tema:'reglas',n:'Filtro de tendencia',a:['filtro de tendencia','trend filter','filtro','media de 200 como filtro','sobre la media','solo largos con tendencia alcista','filtro de régimen'],
   d:`Una condición que solo deja operar en la dirección de la tendencia de fondo, por ejemplo largos solo con el cierre sobre la media de 200. Suele recortar operaciones malas, pero también buenas, y llega con retraso. No es una garantía: es una elección más que tiene que sobrevivir a las fases.`,
   e:`RSI(4) &lt; 25 con el mercado sobre su media de 200: compra. Con el mercado bajo la media de 200: se salta. Hay menos operaciones; si el PF mejora lo dicen el examen y las fases.`,
   v:['sma-ema','condicion-contexto-disparador','pullback']},
  {id:'cruce-medias',tema:'reglas',n:'Cruce de medias',a:['cruce de medias','golden cross','death cross','cruz dorada','cruz de la muerte','moving average crossover','media rápida y lenta','cruza arriba','cruza abajo','crossover'],
   d:`Una media rápida (periodo corto) cruza a una lenta (periodo largo): hacia arriba se interpreta como inicio de tendencia alcista y hacia abajo, como bajista. Reacciona tarde y, en mercados laterales, genera cruces falsos que van dando pérdidas pequeñas.`,
   e:`SMA(20) pasa de 99 a 101 con SMA(100) en 100: cruce hacia arriba, compra. Si el precio se queda de lado y vuelve a cruzar hacia abajo, cierras con pérdida: eso es un cruce falso.`,
   v:['sma-ema','trend-following','rotura-breakout']},
  {id:'rotura-breakout',tema:'reglas',n:'Rotura (breakout)',a:['breakout','rotura','ruptura','romper máximo','falsa rotura','fakeout','false breakout','romper el máximo','break'],
   d:`El precio supera un máximo anterior (o pierde un mínimo anterior) y se entra a favor de ese movimiento, esperando que continúe. Funciona cuando nace una tendencia y falla con las <b>falsas roturas</b>, en las que el precio vuelve dentro. Si entras en la apertura siguiente, parte del movimiento ya se ha ido.`,
   e:`El máximo de 20 velas es 105 y cierras en 106: señal. Si la apertura siguiente es 107,5, entras 1,5 por encima del cierre de la señal; si luego vuelve a 103, fue una falsa rotura.`,
   v:['min-max-n','donchian','gap','orden-mercado-limite-stop']},
  {id:'donchian',tema:'reglas',n:'Canal de Donchian',a:['donchian','canal de donchian','donchian channel','tortugas','turtle','turtles','canal de máximos y mínimos','rotura de 20 días'],
   d:`Dos líneas: el máximo y el mínimo de las últimas N velas. Comprar al superar el máximo y salir al perder el mínimo de un periodo más corto es la base de los sistemas de las Tortugas. Es una regla de rotura pura y con pocos parámetros: el N de entrada y el N de salida.`,
   e:`Donchian 20/10: compras al romper el máximo de 20 velas y sales al perder el mínimo de 10 velas. Dos números, la regla entera.`,
   v:['min-max-n','rotura-breakout','trend-following']},
  {id:'pullback',tema:'reglas',n:'Pullback (retroceso)',a:['pullback','retroceso','corrección','comprar la caída','buy the dip','dip','retroceso en tendencia'],
   d:`Un retroceso corto dentro de una tendencia: el precio sube, baja unas velas y retoma. Se entra durante el retroceso para conseguir mejor precio que con una rotura. Riesgo: lo que parecía un retroceso es el comienzo de un giro y salta el stop.`,
   e:`Cierre sobre la media de 200 (tendencia alcista) y tres días de caída hasta RSI(4) &lt; 25: se compra el retroceso esperando el rebote. Si la caída sigue, era un giro y no un pullback.`,
   v:['filtro-tendencia','rsi','tendencia-reversion']},
  {id:'trend-following',tema:'reglas',n:'Seguimiento de tendencia (trend following)',a:['trend following','seguimiento de tendencia','seguir la tendencia','sistema de tendencia','tendencial','cut losses short'],
   d:`Subirse a lo que ya se mueve y mantenerlo hasta que gire. Suele acertar pocas veces (win rate bajo), pero con ganadoras grandes frente a pérdidas pequeñas (payoff alto), y sufre en mercados laterales con muchas pérdidas seguidas. Una sola ganadora puede sostener meses.`,
   e:`Win rate del 35 %, ganadora media de 300 $ y perdedora media de 100 $: 0,35 × 300 − 0,65 × 100 = +40 $ por operación, con rachas largas de perdedoras (cifras de ejemplo).`,
   v:['payoff','win-rate','pf-sin-mejor','rotura-breakout']},
  {id:'momentum',tema:'reglas',n:'Momentum',a:['momentum','impulso','inercia','fuerza relativa','cambio porcentual','rate of change','roc','persistencia de la subida'],
   d:`La idea de que lo que sube sigue subiendo (y al revés), medida con el cambio porcentual de las últimas N velas. Es lo contrario de la reversión a la media: según el activo y el plazo funciona una u otra, y no siempre. La «memoria» del AED mide cuál asoma en tu activo.`,
   e:`Cambio de las últimas 20 velas = +6 %: «tiene momentum». Una regla de momentum compraría eso; una de reversión esperaría un retroceso. Cuál acierta depende del activo.`,
   v:['tendencia-reversion','memoria','trend-following']},
  {id:'bandas-bollinger',tema:'reglas',n:'Bandas de Bollinger',a:['bollinger','bandas de bollinger','bollinger bands','banda superior','banda inferior','canal de volatilidad','bandas'],
   d:`Una media móvil con dos bandas a k desviaciones típicas por encima y por debajo (típicamente 20 velas y k = 2). Se ensanchan cuando el activo se mueve más y se estrechan cuando se calma. Un cierre fuera de la banda indica «estirado», pero no es un techo ni un suelo.`,
   e:`Media de 20 velas = 100 y desviación típica = 2: banda superior 104 y banda inferior 96. Un cierre en 95 queda fuera de la inferior: estirado, no necesariamente a punto de rebotar.`,
   v:['desviacion-tipica','sma-ema','tendencia-reversion']},
  {id:'estocastico',tema:'reglas',n:'Estocástico',a:['estocástico','estocastico','stochastic','oscilador estocástico','%k','%d','sobrecompra','sobreventa'],
   d:`Un oscilador de 0 a 100 que dice dónde cerró la vela dentro del rango de las últimas N velas: (cierre − mínimo) / (máximo − mínimo) × 100. Es el IBS, pero sobre N velas en vez de una. Cerca de 0, cierra abajo; cerca de 100, arriba.`,
   e:`Máximo de 14 velas = 110, mínimo = 100, cierre = 102: (102 − 100) / (110 − 100) × 100 = 20. Cierra en la zona baja del rango reciente.`,
   v:['ibs','rsi','min-max-n']},
  {id:'macd',tema:'reglas',n:'MACD',a:['macd','moving average convergence divergence','convergencia divergencia de medias','línea macd','línea de señal','histograma macd'],
   d:`La diferencia entre dos medias exponenciales (clásicamente EMA de 12 y de 26), con una línea de señal que es la EMA de 9 de esa diferencia. Es un indicador de tendencia y momentum con retraso. Que el MACD pase de negativo a positivo equivale a que la EMA rápida cruce sobre la lenta.`,
   e:`EMA(12) = 101,2 y EMA(26) = 100,5: MACD = +0,7 (positivo: la media rápida va por encima de la lenta). Cuando se vuelva negativo, la rápida habrá cruzado hacia abajo.`,
   v:['sma-ema','cruce-medias','momentum']},

  /* ---------- robustez, azar y estrés (nuevos) ---------- */
  {id:'ruido',tema:'robu',n:'Ruido',a:['ruido','noise','aleatoriedad','variación aleatoria','señal y ruido','signal to noise'],
   d:`La parte del movimiento del precio que no responde a ninguna razón explotable: oscila al azar. Con pocos datos el ruido domina y cualquier patrón puede ser casualidad. Casi todo el trabajo de validar es separar la <b>señal</b> (lo repetible) del ruido.`,
   e:`Lanzas una moneda 10 veces y salen 7 caras: no está trucada, es ruido. Con 7 de 10 operaciones ganadoras no sabes si tu regla tiene ventaja o solo tuvo suerte.`,
   v:['suerte-ventaja','tamano-muestra','barajados']},
  {id:'suerte-ventaja',tema:'robu',n:'Suerte vs ventaja',a:['suerte','ventaja real','luck vs skill','skill','casualidad','suerte o ventaja','coincidencia'],
   d:`Un buen resultado puede venir de una ventaja real o de la suerte, y el backtest por sí solo no las distingue. Se separan con un examen fuera de la muestra, muchas operaciones, mesetas de parámetros y comparando contra el azar. Entre mucha gente probando, a alguien le sale bien por casualidad.`,
   e:`Entre 100 personas que lancen una moneda 10 veces, se espera que 1 saque 9 o más caras (probabilidad ≈ 1 %). No es un lanzador excepcional: es que había 100 intentos.`,
   v:['data-snooping','ruido','out-of-sample']},
  {id:'estabilidad-epocas',tema:'robu',n:'Estabilidad entre épocas',a:['estabilidad','consistencia','estable','épocas','subperiodos','sub-periodos','stability','regla estable','año a año'],
   d:`Una regla fiable gana de forma parecida en varios tramos distintos del histórico, no solo en uno. Si casi todo el beneficio sale de una época, la estabilidad es baja. La Fase 2 lo comprueba por épocas de 3 años y el AED, por tercios.`,
   e:`Una regla con PF &gt; 1 en 4 de 6 épocas tiene cierta estabilidad; otra que gana solo en 2013-2015 y pierde en el resto, no (cifras de ejemplo).`,
   v:['persistencia','epoca-aed','regimen-mercado']},
  {id:'regimen-mercado',tema:'robu',n:'Régimen de mercado (alcista, bajista, lateral)',a:['régimen','regimen','mercado alcista','mercado bajista','mercado lateral','bull market','bear market','sideways','régimen de volatilidad','cambio de régimen'],
   d:`La «época de carácter» del mercado: <b>alcista</b>, <b>bajista</b> o <b>lateral</b> (o de volatilidad alta o baja). No hay una definición única; una posible es el cierre sobre o bajo la media de 200. Una regla que solo funciona en un régimen sufre cuando cambia. El bootstrap por regímenes usa años completos.`,
   e:`Una regla de rebote puede ganar en un mercado lateral y perder en uno bajista que sigue cayendo. Mirar 2022 o el peor año del activo enseña qué hace en un régimen malo.`,
   v:['regimen-malo','regimenes','tendencia-reversion']},
  {id:'sensibilidad-parametro',tema:'robu',n:'Sensibilidad a un parámetro (entorno)',a:['sensibilidad','sensitivity','sensibilidad a parámetros','entorno de parámetros','vecindad','neighborhood','mover un parámetro','un eje','eje'],
   d:`Cuánto cambia el resultado al mover <b>un</b> parámetro y dejar los demás. Si el PF cambia poco al moverlo ±20 % o ±40 %, la regla es robusta en ese eje; si se desploma, ese número es el culpable. La Fase 3 lo mide con todos los parámetros y nombra el eje culpable.`,
   e:`Mueves la salida (55) a 44 y 66: PF 1,5 / 1,6 / 1,5, poco sensible. Mueves la entrada (25) a 20: el PF pasa de 1,6 a 0,9. Ese eje es el frágil.`,
   v:['robustez','meseta','silla']},
  {id:'bootstrap',tema:'robu',n:'Remuestreo (bootstrap) y semilla',a:['bootstrap','bootstrapping','remuestreo','resampling','con reemplazo','semilla','seed','aleatoriedad reproducible','random seed'],
   d:`Crear datos nuevos sacando al azar <b>con reemplazo</b> de tus propios datos (una operación puede salir varias veces) para ver cuánto varía el resultado. La <b>semilla</b> (seed) fija la secuencia aleatoria: con la misma semilla sale siempre lo mismo, así que el resultado se puede repetir.`,
   e:`De 5 operaciones (+2, −1, +3, −1, +1) sacas 5 con reemplazo: (+3, +3, −1, +2, +3). Es una historia posible que no ocurrió. Repetida 5.000 veces da el rango de resultados.`,
   v:['montecarlo','bloques','camino-simulado']},
  {id:'camino-simulado',tema:'robu',n:'Camino simulado (por qué 5.000)',a:['camino','caminos','path','simulaciones','5.000 simulaciones','5000 simulaciones','curva simulada','historias alternativas','abanico'],
   d:`Cada simulación del Monte Carlo es un <b>camino</b>: una curva de capital alternativa con tus mismas operaciones. Se hacen 5.000 para que los percentiles extremos sean estables: el p5 se apoya en unos 250 caminos; con 50 simulaciones saltaría de una ejecución a otra.`,
   e:`En 5.000 caminos, 4.600 acaban en positivo y la mitad tiene una caída máxima menor del 18 %. Mirar el peor 5 % (250 caminos) es mirar el borde del abanico (cifras de ejemplo).`,
   v:['montecarlo','p5-p95','caida-esperada-maxima']},
  {id:'intervalo-confianza',tema:'robu',n:'Intervalo de confianza',a:['intervalo de confianza','confidence interval','margen de error','rango plausible'],
   d:`Un rango de valores compatibles con tus datos en vez de una cifra única. «PF 1,4 con intervalo de 0,9 a 2,1» dice que el PF verdadero podría estar por debajo de 1. Con pocos datos los intervalos son anchos; el p5–p95 del Monte Carlo cumple un papel parecido sobre caminos simulados.`,
   e:`Dos reglas con PF 1,4: la de 400 operaciones tiene un intervalo de 1,2 a 1,7; la de 25, de 0,8 a 2,4. La segunda no es mejor: tiene mucha más incertidumbre (cifras de ejemplo).`,
   v:['p5-p95','tamano-muestra','p-valor']},
  {id:'p-valor',tema:'robu',n:'P-valor y significancia',a:['p-valor','p valor','p-value','significancia','significación estadística','estadísticamente significativo','nivel de significancia','alfa','0,05'],
   d:`La probabilidad de ver un resultado al menos tan bueno <b>si no hubiera ninguna ventaja</b> (solo azar). Un p-valor de 0,03 no significa «97 % de que la ventaja es real». Hacer muchas pruebas lo infla. La «fuerza contra el azar» del AED se lee de forma parecida: se compara con tus datos barajados.`,
   e:`Un PF de 1,6 con p = 0,02: solo el 2 % de los resultados por azar lo iguala. Pero si has mirado 50 variantes, esperabas ver alguna así: ya no es especial.`,
   v:['comparaciones-multiples','fuerza','intervalo-confianza']},
  {id:'caida-esperada-maxima',tema:'robu',n:'Caída esperada vs caída máxima',a:['caída esperada','caída máxima','expected drawdown','max drawdown','peor caída posible','caída típica','drawdown esperado','drawdown simulado'],
   d:`La caída máxima del backtest es solo una de las muchas posibles: con otro orden de las mismas operaciones habría sido distinta. El Monte Carlo da la distribución: la mediana es la caída «normal», el p95 es la mala, y la peor de la historia real aún no ha ocurrido.`,
   e:`Backtest: caída máxima 15 %. Monte Carlo: mediana 17 %, p95 27 %. Prepárate para 27 %, no para 15: la del backtest fue una de las suertes buenas (cifras de ejemplo).`,
   v:['drawdown','p5-p95','drawdown-tolerable']},
  {id:'costes-por-dos',tema:'robu',n:'Estrés de costes ×2',a:['costes x2','costes por dos','costes ×2','doblar costes','stress de costes','cost stress','margen de seguridad de costes','duplicar spread'],
   d:`Se repite el backtest con spread, comisión y slippage dobles. Si la regla aguanta (en la Fase 5, PF OOS ≥ 1,1 y caída &lt; 25 %), la ventaja tiene margen frente a un bróker peor o un mercado más caro. Si se hunde, la ventaja era del tamaño de los costes.`,
   e:`PF 1,35 con costes normales y 1,18 con costes ×2: aguanta. PF 1,35 y 0,97: la ventaja se la comía el coste (cifras de ejemplo).`,
   v:['stress','regla-10','slippage']},
  {id:'sin-mejores-anios',tema:'robu',n:'Quitar los mejores años',a:['sin los mejores años','quitar los mejores años','sin 2 mejores años','best years removed','dependencia de pocos años','años afortunados'],
   d:`Se repite el cálculo sin los 2 mejores años de la regla. Si el resultado se sostiene (en la Fase 5, PF OOS ≥ 1,1 y caída &lt; 25 %), no depende de que un par de años afortunados cuadraran. Si se hunde, la regla vivía de ellos.`,
   e:`PF 1,5 en total; sin 2020 y 2021 pasa a 1,12: sigue en positivo. Si pasara a 0,95, esos dos años eran la ventaja entera (cifras de ejemplo).`,
   v:['stress','pf-sin-mejor','estabilidad-epocas']},

  /* ---------- riesgo y tamaño (nuevos) ---------- */
  {id:'riesgo-por-operacion',tema:'riesgo',n:'Riesgo por operación (% de la cuenta)',a:['riesgo por operación','risk per trade','1 % por operación','riesgo %','porcentaje de riesgo','riesgo en % de la cuenta','riesgo fijo'],
   d:`El porcentaje de tu cuenta que perderías si salta el stop de una operación. No hay una cifra correcta para todos: depende de la caída que aguantes y de las rachas que pueden venir. Menos riesgo = curva más suave y crecimiento más lento. Hace falta un stop para calcularlo.`,
   e:`Cuenta de 20.000 $ y riesgo del 1 %: 200 $ por operación. Diez perdedoras seguidas son unos −9,6 %, no −10 %, porque el tamaño se ajusta al capital que queda.`,
   v:['tamano','r','racha-perdedora']},
  {id:'tamano-fijo-fraccion',tema:'riesgo',n:'Tamaño fijo vs fracción fija',a:['tamaño fijo','fracción fija','fixed fractional','fixed size','sizing fijo','sizing porcentual','tamaño proporcional','lote fijo','porcentual','tamaño constante'],
   d:`Con <b>tamaño fijo</b> operas siempre lo mismo (1 lote, 10.000 $) pase lo que pase. Con <b>fracción fija</b> arriesgas siempre el mismo % del capital actual: tras perder, el tamaño baja; tras ganar, sube. Reduce el tamaño cuando vas mal, pero reinvierte y amplifica las rachas buenas y las malas.`,
   e:`Cuenta de 10.000 $ que cae a 8.000 $. Tamaño fijo: sigues con 1 lote y el riesgo pesa más. Fracción fija del 1 %: bajas de arriesgar 100 $ a 80 $.`,
   v:['riesgo-por-operacion','tamano','interes-compuesto']},
  {id:'apalancamiento-implicito',tema:'riesgo',n:'Apalancamiento implícito',a:['apalancamiento implícito','implied leverage','apalancamiento oculto','apalancamiento real','leverage efectivo','nocional sobre capital','tope de apalancamiento'],
   d:`Aunque no «pidas» apalancamiento, tu posición puede valer más que tu cuenta: nocional ÷ capital. Con un stop muy corto y riesgo fijo, el tamaño sale enorme. Por eso, con «riesgo %», la herramienta pone un tope: el apalancamiento máximo.`,
   e:`Riesgo del 1 % con un stop a solo el 0,5 % del precio: nocional = 1 % / 0,5 % = 200 % de la cuenta, apalancamiento 2×. Con un stop al 0,1 % serían 10×.`,
   v:['apalancamiento','nocional','riesgo-por-operacion']},
  {id:'drawdown-tolerable',tema:'riesgo',n:'Drawdown tolerable',a:['drawdown tolerable','caída tolerable','aguantar la caída','tolerancia al riesgo','risk tolerance','abandonar','psicología','caída que soportas'],
   d:`La caída que de verdad aguantarías sin tocar la estrategia ni abandonar, en dinero y en ánimo. El drawdown de un backtest se queda corto, así que compárala con el p95 de caída del Monte Carlo. Si no la aguantas, reduce el tamaño: las caídas se escalan casi en proporción.`,
   e:`Abandonarías al −15 % y el Monte Carlo da p95 = 27 %. Con la mitad de tamaño, ese 27 % pasa a ser unos 14 %. Una buena regla con un tamaño que no soportas no sirve.`,
   v:['drawdown','caida-esperada-maxima','riesgo-por-operacion']},
  {id:'limite-perdida-diaria',tema:'riesgo',n:'Límite de pérdida diaria y stop de cuenta',a:['límite diario','daily loss limit','stop de cuenta','max daily loss','pérdida máxima diaria','límite de pérdida','prop firm','cuenta fondeada','drawdown máximo de la cuenta','circuit breaker'],
   d:`Un tope fijado de antemano: si pierdes un X % en el día, dejas de operar hasta mañana; si la cuenta cae un Y %, paras del todo. Evita que un mal día se encadene con decisiones emocionales. Las prop firms suelen imponer límites así, cada una con sus reglas: mira las de la tuya.`,
   e:`Límite diario del 3 % en una cuenta de 10.000 $: al llegar a −300 $ no se abre nada más ese día. El límite total puede ser del 10 %: al −1.000 $ se detiene todo (cifras de ejemplo).`,
   v:['kill-switch','drawdown-tolerable','riesgo-por-operacion']},
  {id:'diversificacion-cartera',tema:'riesgo',n:'Diversificación y cartera',a:['diversificación','diversification','cartera','portfolio','varias estrategias','no poner todos los huevos','portafolio','repartir el riesgo'],
   d:`Repartir el capital entre varios activos o estrategias que no se muevan igual. Si sus pérdidas no coinciden, la curva conjunta es más suave que la de cada una. Pero no es gratis: en las crisis las correlaciones tienden a subir, y diversificar entre cosas casi iguales no diversifica.`,
   e:`Dos reglas con caída máxima del 20 % cada una que no pierden a la vez pueden dar una cartera con caída del 12 %; si pierden juntas, seguirá cerca del 20 % (cifras de ejemplo).`,
   v:['correlacion-estrategias','correlacion','drawdown']},
  {id:'correlacion-estrategias',tema:'riesgo',n:'Correlación entre estrategias',a:['correlación entre estrategias','strategy correlation','estrategias correlacionadas','misma apuesta','solapamiento','correlation of returns'],
   d:`Mide si dos estrategias ganan y pierden a la vez, comparando los retornos de ambas en cada periodo. Dos reglas sobre el mismo índice con ideas parecidas suelen estar muy correlacionadas: sumarlas es casi apostar doble. A la cartera le aporta lo poco correlacionado.`,
   e:`Dos reglas de rebote sobre el mismo índice, con correlación 0,8, comparten casi todas las malas rachas. Una de tendencia sobre otro activo, con 0,1, sí amortigua (cifras de ejemplo).`,
   v:['correlacion','diversificacion-cartera','tendencia-reversion']},
  {id:'riesgo-cola',tema:'riesgo',n:'Riesgo de cola',a:['riesgo de cola','tail risk','cola','cisne negro','black swan','evento extremo','días extremos','crash','riesgo extremo'],
   d:`El riesgo de sucesos raros y extremos que quizá no aparezcan en tu histórico. Un stop no te protege de un gap que lo salta. Si el peor día que viste fue −6 %, dimensiona sabiendo que puede haber uno de −12 %. Por eso un apalancamiento alto es peligroso.`,
   e:`Con apalancamiento 5× y el peor día del backtest en −6 %, perdiste un 30 % de la cuenta en un día. Si en vivo llega un −12 %, perderías el 60 % (cifras de ejemplo).`,
   v:['cola-perdidas','asimetria-curtosis','gap','apalancamiento-implicito']},
  {id:'volatility-targeting',tema:'riesgo',n:'Volatility targeting (objetivo de volatilidad)',a:['volatility targeting','objetivo de volatilidad','vol target','tamaño por volatilidad','sizing por atr','ajustar tamaño por volatilidad','volatilidad constante','risk parity'],
   d:`Ajustar el tamaño para que el riesgo se mantenga estable: más posición cuando el activo está tranquilo y menos cuando se mueve mucho. Así cada operación aporta un riesgo parecido. Su límite: un salto repentino de volatilidad te pilla con el tamaño de la calma.`,
   e:`Objetivo: 10 % anual. Activo con volatilidad del 20 %: posición = 10 / 20 = 50 % del capital. Si la volatilidad sube al 40 %, la bajas al 25 % (cifras de ejemplo).`,
   v:['volatilidad','atr','tamano']},
  {id:'kelly',tema:'riesgo',n:'Criterio de Kelly',a:['kelly','criterio de kelly','kelly criterion','fracción de kelly','half kelly','medio kelly','tamaño óptimo','optimal f'],
   d:`Una fórmula del tamaño que maximizaría el crecimiento a largo plazo: f = p − (1 − p) / b, con p la probabilidad de ganar y b el payoff. No se usa entero porque exige conocer p y b con exactitud y provoca caídas enormes; se usa una fracción (medio Kelly, un cuarto…) o solo como techo.`,
   e:`p = 0,5 y payoff 2: f = 0,5 − 0,5 / 2 = 25 % de riesgo por operación. Es una cifra enorme y con estimaciones inciertas: no conviene usarla tal cual (cifras de ejemplo).`,
   v:['riesgo-por-operacion','payoff','drawdown-tolerable']},

  /* ---------- del test al dinero real (nuevos) ---------- */
  {id:'paper-trading',tema:'real',n:'Paper trading y cuenta demo',a:['paper trading','demo','cuenta demo','paper','simulado','operar en simulador','cuenta de práctica','trading en papel'],
   d:`Operar en vivo con dinero ficticio: una cuenta demo del bróker o apuntar las operaciones en papel. Sirve para comprobar que la regla y la ejecución funcionan. No prueba el dinero real: las demos pueden dar fills más favorables que en real (depende del bróker) y no hay presión emocional.`,
   e:`Tras 3 meses en demo ves que la regla se ejecuta bien y las señales cuadran con el backtest. Eso confirma la mecánica, no que en real saldrán los mismos precios ni que aguantes un mal mes.`,
   v:['forward','plan-incubacion','conciliacion']},
  {id:'plan-incubacion',tema:'real',n:'Plan de incubación (dinero real, poco)',a:['incubación','plan de incubación','capital de prueba','tamaño reducido','dinero real poco','live pequeño','prueba con dinero real','incubation','test capital','fase de incubación'],
   d:`El paso entre la demo y el tamaño completo: operar con dinero real, pero muy poco, durante un tiempo fijado de antemano. Se decide qué se vigila, cuántas operaciones o meses hacen falta y qué resultado permite subir el tamaño, mantenerlo o parar. Detecta lo que el backtest no veía.`,
   e:`Ejemplo: 3 meses con el 25 % del tamaño final, revisando cada semana y anotando cada diferencia con el backtest. Si todo cuadra, se sube el tamaño poco a poco. Las cifras las fijas tú antes de empezar.`,
   v:['paper-trading','kill-switch','desviacion-backtest-real','forward']},
  {id:'diario-revision',tema:'real',n:'Diario de operaciones y revisión periódica',a:['diario','diario de trading','trading journal','journal','revisión periódica','revisión mensual','registro de operaciones','bitácora','review'],
   d:`El <b>diario</b> apunta cada operación: señal, hora, precio esperado y obtenido, y si te saltaste la regla y por qué. La <b>revisión</b> periódica (semanal o mensual) lo compara con el backtest. Sin registro no hay conciliación; sin revisión, los errores pequeños se acumulan.`,
   e:`En tu diario ves que tras dos pérdidas seguidas te saltas la siguiente señal, y que esas señales saltadas eran justo las ganadoras. Solo lo ves si lo apuntas y lo revisas.`,
   v:['conciliacion','desviacion-backtest-real','plan-incubacion']},
  {id:'vps-latencia',tema:'real',n:'VPS y tiempo de conexión',a:['vps','servidor virtual','servidor privado virtual','latencia vps','ping','24/7','mt5 en vps','cortes de internet','ordenador siempre encendido'],
   d:`Un VPS es un ordenador alquilado, siempre encendido y conectado, donde deja corriendo tu robot. Evita que un corte de luz o de internet, o apagar el portátil, te deje sin ejecutar una señal. Cuanto más rápida es la estrategia, más importa que esté cerca del servidor del bróker.`,
   e:`Un robot diario que opera en la apertura necesita estar conectado a esa hora: un portátil apagado es una señal perdida. Un robot de minutos notaría además diferencias de milisegundos.`,
   v:['latencia','conciliacion','plan-incubacion']},
  {id:'desviacion-backtest-real',tema:'real',n:'Desviación backtest vs real',a:['desviación','backtest vs real','slippage real','diferencia con el backtest','tracking error','real vs backtest','por qué no cuadra'],
   d:`La diferencia entre lo que dijo el backtest y lo que pasa en la cuenta real. Suele venir de costes subestimados, slippage, datos distintos, horarios o rechazos de órdenes. Algo peor que el backtest es lo normal; mucho peor indica que algo falla o que se subestimaron los costes.`,
   e:`Backtest: +0,30 % por operación. Real tras 40 operaciones: +0,18 %. Los 0,12 puntos de diferencia son lo que toca explicar: ¿spread, slippage o señales distintas? (cifras de ejemplo)`,
   v:['conciliacion','slippage','paridad']},
  {id:'conciliacion',tema:'real',n:'Conciliación (backtest vs cuenta real)',a:['conciliación','conciliar','reconciliation','reconciliar','cuadrar operaciones','operaciones una a una','auditar la cuenta'],
   d:`Comparar, operación a operación, lo que hizo la cuenta real con lo que habría hecho el backtest en el mismo periodo: ¿mismas señales, mismas horas, precios parecidos? Cada operación que sobra, falta o difiere hay que explicarla. Es la versión en real de la paridad con el Strategy Tester.`,
   e:`El backtest habría hecho 8 operaciones en el mes y la cuenta tiene 7. Buscas la que falta: un festivo, un rechazo del bróker, una hora mal alineada… hasta que cuadran.`,
   v:['paridad','desviacion-backtest-real','diario-revision']},
  {id:'salud-estrategia',tema:'real',n:'Salud de una estrategia en vivo',a:['salud','salud de la estrategia','strategy health','estado de la estrategia','semáforo de salud','monitorización','vigilar la estrategia','live health'],
   d:`Comparar cómo va la estrategia en vivo con el rango que esperaban el backtest y el Monte Carlo (caída, resultado, número de operaciones) para decidir si está bien, hay que vigilarla o hay que pararla. Se puede resumir en un semáforo, verde, amarillo o rojo, con límites fijados de antemano.`,
   e:`El Monte Carlo daba un p95 de caída del 24 % y la cuenta lleva −9 %: dentro de lo esperado, verde. A −22 % pasaría a amarillo; por encima del límite que fijaste, rojo (ejemplo).`,
   v:['kill-switch','caida-esperada-maxima','edge-decay']},
  {id:'kill-switch',tema:'real',n:'Criterio de parada (kill switch)',a:['kill switch','criterio de parada','stop de estrategia','apagar la estrategia','cuándo parar','parar la estrategia','límite de parada','criterio de apagado'],
   d:`La regla, escrita antes de empezar, que dice cuándo apagas la estrategia: por ejemplo, si la caída pasa de un límite o si una serie de operaciones queda muy por debajo de lo esperado. Evita decidir en caliente y también el error contrario, mantener una regla rota por esperanza. Parar es revisar, no abandonar.`,
   e:`Criterio de ejemplo: si la caída supera el 24 % (el p95 del Monte Carlo), se apaga la estrategia y se revisa antes de volver a operar. El número lo fijas antes de empezar.`,
   v:['salud-estrategia','limite-perdida-diaria','edge-decay']},
  {id:'edge-decay',tema:'real',n:'Decaimiento de la ventaja (edge decay)',a:['edge decay','decay','decaimiento','deriva','alpha decay','la ventaja desaparece','ventaja que se agota','strategy decay','drift'],
   d:`Cuando una ventaja que existía se debilita o desaparece: el mercado cambia, otros la explotan o suben los costes. Es difícil distinguirlo de una mala racha: una mala racha sigue dentro del rango del Monte Carlo; el decaimiento mantiene el rendimiento por debajo durante mucho más de lo esperable.`,
   e:`Una regla que ganó 15 años y lleva 2 años por debajo del p5 del Monte Carlo no está en una simple mala racha: hay que sospechar que se agotó. Tres meses de caída dentro del rango son ruido.`,
   v:['salud-estrategia','kill-switch','caida-esperada-maxima']},
  {id:'por-que-fallan',tema:'real',n:'Por qué un backtest brillante suele fallar en real',a:['por qué falla','backtest brillante','backtest perfecto','falla en real','demasiado bueno','too good to be true','causas del fallo','por qué fallan los backtests','resultados perfectos'],
   d:`Las causas habituales: sobreajuste, mirar el futuro, costes subestimados, pocas operaciones, sesgo de supervivencia y datos de otra hora o de otro régimen. Un backtest muy bonito es sospechoso, no una buena noticia: las 5 fases existen para cazar justo esos errores, y la prueba final es el forward.`,
   e:`PF de 3,5 con 18 operaciones, costes en cero y 7 parámetros afinados: dice más del ajuste que del mercado. Antes de creerlo, revisa la muestra, los costes y los parámetros.`,
   v:['sobreajuste','look-ahead','sesgo-supervivencia','forward']}
  ];

  /* nombre corto de un término (para «ver también» y para buscarlo por nombre) */
  var CORTO={t:'T (t de Welch)',semaforo:'Semáforo',pf:'PF','mec-cal':'Mecanismo y calendario',r:'R (múltiplos de R)','percentil-mediana':'Percentil y mediana',
    forward:'Incubación / forward','vela-cualquiera':'Vela cualquiera','tabla-02':'Tabla 02 del AED'};
  var corto=function(t){return CORTO[t.id]||t.n.split(' · ')[0].split(' (')[0]};

  /* ===================================================== utilidades ===================================================== */
  var q=function(s,r){try{return (r||D).querySelector(s)}catch(e){return null}};
  var esc=function(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
  var norm=function(s){return String(s==null?'':s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')};
  var RM=!!(W.matchMedia&&W.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var tactil=function(){return !!(W.matchMedia&&W.matchMedia('(pointer: coarse)').matches)};
  var visible=function(el){return !!(el&&(el.offsetParent||el.getClientRects().length))};
  var POR_ID={},POR_TEMA={};
  TER.forEach(function(t){POR_ID[t.id]=t;(POR_TEMA[t.tema]=POR_TEMA[t.tema]||[]).push(t)});
  var TEMA_ND={};TEMAS.forEach(function(x){TEMA_ND[x.id]=x});
  /* texto plano de cada término (para buscar): se calcula una vez, al construir */
  function plano(html){var d=D.createElement('div');d.innerHTML=html;return d.textContent||''}
  function indexar(){TER.forEach(function(t){
    t.nn=norm(t.n);t.na=norm((t.a||[]).join(' | '));
    t.nt=norm(TEMA_ND[t.tema].t);
    t.nb=norm(plano(t.html?leyenda(true):t.d)+' '+plano(t.e||''));
  })}

  /* ===================================================== el diálogo ===================================================== */
  var BTN=null,DLG=null,INP=null,CUERPO=null,CNT=null,GRUPOS=null,FLAT=null,VACIO=null,CHIPS=null;
  var EL={},SEC={},TEMA_SEL='',PREV=null,HIT=null;

  function htmlTermino(t){
    var ver=(t.v||[]).filter(function(i){return POR_ID[i]}).map(function(i){
      return '<button type="button" class="glo-lnk" data-glosario="'+i+'">'+esc(corto(POR_ID[i]))+'</button>'}).join(', ');
    return '<div class="glo-t" id="glo-t-'+t.id+'" data-id="'+t.id+'" tabindex="-1">'+
      '<dt class="glo-nom"><span class="glo-nom-t">'+esc(t.n)+'</span><span class="glo-tag">'+esc(TEMA_ND[t.tema].c)+'</span></dt>'+
      '<dd class="glo-def">'+(t.html?leyenda(true):'<p>'+t.d+'</p>')+(t.e?'<p class="glo-ej"><b>Ejemplo.</b> '+t.e+'</p>':'')+
      (ver?'<p class="glo-ver"><span>Ver también:</span> '+ver+'</p>':'')+'</dd></div>'}

  function construir(){
    if(DLG)return;
    indexar();
    DLG=D.createElement('dialog');DLG.className='glo-dlg';DLG.id='glo-dlg';DLG.setAttribute('aria-label','Glosario de la herramienta');
    DLG.innerHTML='<div class="glo-in">'+
      '<header class="glo-cab"><div><h2 id="glo-tit" tabindex="-1">Glosario</h2><p class="glo-sub">Qué significa cada palabra técnica de la herramienta, con un ejemplo con números. Atajo para abrirlo: tecla G.</p></div>'+
        '<button type="button" class="glo-x" data-glo="cerrar" aria-label="Cerrar el glosario" title="Cerrar (Esc)">✕</button></header>'+
      '<div class="glo-barra"><label class="glo-bus"><span class="glo-sr">Buscar en el glosario</span>'+
        '<input type="search" id="glo-q" placeholder="Busca: efecto, drawdown, spread…" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" aria-label="Buscar en el glosario"></label>'+
        '<div class="glo-temas" role="group" aria-label="Filtrar por tema">'+
          '<button type="button" class="glo-chip" data-tema="" aria-pressed="true">Todos</button>'+
          TEMAS.map(function(x){return '<button type="button" class="glo-chip" data-tema="'+x.id+'" aria-pressed="false">'+esc(x.c)+'</button>'}).join('')+'</div>'+
        '<p class="glo-n" id="glo-n" role="status" aria-live="polite"></p></div>'+
      '<div class="glo-cuerpo" id="glo-cuerpo" tabindex="0" role="region" aria-label="Términos del glosario">'+
        '<div class="glo-grupos">'+TEMAS.map(function(x){return '<section class="glo-sec" data-tema="'+x.id+'" aria-labelledby="glo-h-'+x.id+'"><h3 id="glo-h-'+x.id+'">'+esc(x.t)+'</h3><dl class="glo-lista"></dl></section>'}).join('')+'</div>'+
        '<div class="glo-flat" hidden><dl class="glo-lista"></dl></div>'+
        '<p class="glo-vacio" hidden></p></div></div>';
    D.body.appendChild(DLG);
    INP=q('#glo-q',DLG);CUERPO=q('#glo-cuerpo',DLG);CNT=q('#glo-n',DLG);GRUPOS=q('.glo-grupos',DLG);FLAT=q('.glo-flat dl',DLG);
    VACIO=q('.glo-vacio',DLG);CHIPS=Array.prototype.slice.call(DLG.querySelectorAll('.glo-chip'));
    TEMAS.forEach(function(x){SEC[x.id]=q('.glo-sec[data-tema="'+x.id+'"] dl',DLG)});
    var caja=D.createElement('div');
    TER.forEach(function(t){caja.innerHTML=htmlTermino(t);EL[t.id]=caja.firstChild});
    INP.addEventListener('input',function(){pintar()});
    DLG.addEventListener('click',function(e){
      if(e.target===DLG){cerrar();return}                                   /* clic fuera de la caja (en el fondo) */
      var b=e.target.closest&&e.target.closest('button');if(!b)return;
      if(b.getAttribute('data-glo')==='cerrar'){cerrar();return}
      if(b.classList.contains('glo-chip')){TEMA_SEL=b.getAttribute('data-tema')||'';pintarChips();pintar();CUERPO.scrollTop=0;return}
      if(b.getAttribute('data-glo')==='limpiar'){INP.value='';TEMA_SEL='';pintarChips();pintar();INP.focus();return}
      if(b.getAttribute('data-glo')==='limpiar-tema'){TEMA_SEL='';pintarChips();pintar();INP.focus();return}
    });
    DLG.addEventListener('keydown',function(e){
      e.stopPropagation();                                                  /* que las teclas de la app (0-8, M, N, P, ?…) no se disparen aquí */
      if(e.key==='Escape'){e.preventDefault();cerrar();return}
      if(e.key==='Tab'){var f=Array.prototype.slice.call(DLG.querySelectorAll('button,input,[tabindex="0"],a[href]')).filter(function(n){return !n.disabled&&visible(n)});
        if(!f.length)return;var a=f[0],z=f[f.length-1],ac=D.activeElement;
        if(e.shiftKey&&(ac===a||ac===DLG||!DLG.contains(ac))){e.preventDefault();z.focus()}
        else if(!e.shiftKey&&(ac===z||!DLG.contains(ac))){e.preventDefault();a.focus()}}
    });
    DLG.addEventListener('cancel',function(e){e.preventDefault();cerrar()});
    DLG.addEventListener('close',function(){soltar()});
    pintar();
  }

  function pintarChips(){CHIPS.forEach(function(c){c.setAttribute('aria-pressed',String((c.getAttribute('data-tema')||'')===TEMA_SEL))})}

  /* puntuación de un término para una búsqueda (todas las palabras tienen que aparecer): nombre > otras formas > tema > texto */
  function puntua(t,pal){var s=0;
    for(var i=0;i<pal.length;i++){var p=pal[i],x=0;
      if(t.nn.indexOf(p)===0)x=14;else if(t.nn.indexOf(p)>0)x=10;
      else if(t.na.indexOf(p)>=0)x=7;
      else if(t.nt.indexOf(p)>=0)x=3;
      else if(t.nb.indexOf(p)>=0)x=1;
      if(!x)return 0;s+=x}
    return s}

  function pintar(){
    var pal=norm(INP.value).split(/\s+/).filter(Boolean),vis=[];
    TER.forEach(function(t,i){if(TEMA_SEL&&t.tema!==TEMA_SEL)return;
      var s=pal.length?puntua(t,pal):1;if(!s)return;vis.push({t:t,s:s,i:i})});
    var buscando=pal.length>0;
    DLG.classList.toggle('glo-buscando',buscando);
    if(buscando){vis.sort(function(a,b){return b.s-a.s||a.i-b.i});
      FLAT.parentNode.hidden=false;GRUPOS.hidden=true;
      vis.forEach(function(v){EL[v.t.id].hidden=false;FLAT.appendChild(EL[v.t.id])});
      TER.forEach(function(t){if(!vis.some(function(v){return v.t===t}))EL[t.id].hidden=true})}
    else{FLAT.parentNode.hidden=true;GRUPOS.hidden=false;
      TEMAS.forEach(function(x){var n=0;(POR_TEMA[x.id]||[]).forEach(function(t){var on=!TEMA_SEL||TEMA_SEL===x.id;SEC[x.id].appendChild(EL[t.id]);EL[t.id].hidden=!on;if(on)n++});
        SEC[x.id].parentNode.hidden=!n})}
    if(!vis.length){VACIO.hidden=false;
      var fuera=TEMA_SEL&&buscando?TER.filter(function(t){return puntua(t,pal)}).length:0;      /* ¿aparece en otros temas? */
      VACIO.innerHTML=fuera?
        'En el tema «'+esc(TEMA_ND[TEMA_SEL].c)+'» no sale «'+esc(INP.value.trim())+'», pero hay '+fuera+(fuera>1?' términos':' término')+' en otros temas: <button type="button" class="glo-lnk" data-glo="limpiar-tema">ver todos los temas</button>.':
        'Ninguna palabra coincide con «'+esc(INP.value.trim())+'». Prueba con otra (vale sin tildes) o <button type="button" class="glo-lnk" data-glo="limpiar">quita los filtros</button>.'}
    else VACIO.hidden=true;
    CNT.textContent=vis.length?((buscando||TEMA_SEL)?vis.length+' de '+TER.length+' términos':TER.length+' términos'):'Sin resultados';
  }

  /* ¿a qué término se refiere `x`? por id, por nombre o por una de sus otras formas (sin tildes ni mayúsculas) */
  function buscar(x){
    if(!x)return null;var s=String(x).trim();if(POR_ID[s])return POR_ID[s];
    var n=norm(s),i,t;if(!n)return null;
    for(i=0;i<TER.length;i++){t=TER[i];if(t.nn===n||norm(corto(t))===n)return t}
    for(i=0;i<TER.length;i++){t=TER[i];if((t.a||[]).some(function(a){return norm(a)===n}))return t}
    return null}

  function irA(id){var el=EL[id];if(!el||el.hidden)return;
    var top=el.getBoundingClientRect().top-CUERPO.getBoundingClientRect().top+CUERPO.scrollTop-48;
    var lejos=Math.abs(top-CUERPO.scrollTop)>900;
    try{CUERPO.scrollTo({top:Math.max(0,top),behavior:RM||lejos?'auto':'smooth'})}catch(e){CUERPO.scrollTop=Math.max(0,top)}
    if(HIT)HIT.classList.remove('glo-hit');HIT=el;el.classList.add('glo-hit');
    try{el.focus({preventScroll:true})}catch(e){}
    clearTimeout(irA.t);irA.t=setTimeout(function(){if(HIT===el){el.classList.remove('glo-hit');HIT=null}},3200)}

  function abrir(x){
    if(x&&typeof x==='object')x=undefined;                                /* por si lo enganchan directamente como manejador de un evento */
    construir();
    var t=buscar(x);
    if(!DLG.open){PREV=D.activeElement;try{DLG.showModal()}catch(e){DLG.setAttribute('open','')}}
    if(BTN)BTN.setAttribute('aria-expanded','true');
    if(t){INP.value='';TEMA_SEL='';pintarChips();pintar();irA(t.id);return}
    if(x){INP.value=String(x).trim();TEMA_SEL='';pintarChips();pintar();CUERPO.scrollTop=0}
    else{INP.value='';TEMA_SEL='';pintarChips();pintar();CUERPO.scrollTop=0}
    if(tactil()){var h=q('#glo-tit',DLG);if(h)h.focus()}else INP.focus();
  }
  function cerrar(){if(!DLG||!DLG.open)return;try{DLG.close()}catch(e){DLG.removeAttribute('open');soltar()}}
  function soltar(){if(BTN)BTN.setAttribute('aria-expanded','false');
    if(HIT){HIT.classList.remove('glo-hit');HIT=null}
    var p=PREV;PREV=null;if(p&&p.focus&&D.contains(p)&&visible(p)){try{p.focus()}catch(e){}}else if(BTN)BTN.focus()}

  /* ===================================================== el botón ===================================================== */
  /* Va a la izquierda del botón «¿Tienes feedback?» (misma fila, para no tapar el bocadillo de Cuevi, que se sienta más arriba).
     Si ese botón no está o está oculto, usa su misma esquina. Se recalcula al redimensionar y cuando cambia el feedback. */
  function colocar(){if(!BTN)return;
    var fb=D.getElementById('fb-abrir'),rc=fb&&!fb.hidden?fb.getBoundingClientRect():null,E=D.documentElement;
    if(rc&&rc.width>0&&rc.height>0){
      BTN.style.setProperty('--glo-r',Math.round(E.clientWidth-rc.left+8)+'px');
      BTN.style.setProperty('--glo-b',Math.round(E.clientHeight-rc.bottom)+'px')}
    else{BTN.style.removeProperty('--glo-r');BTN.style.removeProperty('--glo-b')}}
  function montarBoton(){
    if(!D.body||q('#glo-btn'))return;
    BTN=D.createElement('button');BTN.type='button';BTN.id='glo-btn';BTN.className='glo-btn';
    BTN.setAttribute('aria-haspopup','dialog');BTN.setAttribute('aria-expanded','false');BTN.setAttribute('aria-label','Glosario: qué significa cada término');
    BTN.title='Glosario: qué significa cada término (tecla G)';
    BTN.innerHTML='<span aria-hidden="true">📖</span><span class="glo-btn-t">Glosario</span>';
    BTN.addEventListener('click',function(e){e.stopPropagation();abrir()});
    BTN.addEventListener('keydown',function(e){e.stopPropagation()});     /* que M, N, P… no se disparen estando aquí */
    D.body.appendChild(BTN);
    colocar();
    W.addEventListener('resize',colocar);W.addEventListener('orientationchange',colocar);
    try{var fb=D.getElementById('fb-abrir');if(fb)new MutationObserver(colocar).observe(fb,{attributes:true,attributeFilter:['hidden','class','style']})}catch(e){}
    setInterval(function(){if(!D.hidden)colocar()},1500);
  }

  /* ===================================================== enganches globales ===================================================== */
  /* cualquier [data-glosario="id"] de la página (por ejemplo en la leyenda del AED) abre el glosario en ese término */
  D.addEventListener('click',function(e){var el=e.target&&e.target.closest&&e.target.closest('[data-glosario]');
    if(!el||(DLG&&DLG.contains(el)&&!el.classList.contains('glo-lnk')))return;
    var v=el.getAttribute('data-glosario');e.preventDefault();abrir(v||undefined)});
  /* atajo G: no choca con 0-8, M, N, P, H, ? ni con las flechas de la app; se ignora al escribir o con otro cuadro abierto */
  D.addEventListener('keydown',function(e){
    if(e.defaultPrevented||e.ctrlKey||e.metaKey||e.altKey||e.repeat||(e.key!=='g'&&e.key!=='G'))return;
    var t=e.target,tag=(t&&t.tagName||'').toLowerCase();
    if(tag==='input'||tag==='textarea'||tag==='select'||(t&&t.isContentEditable))return;
    if(DLG&&DLG.open)return;
    if(q('.ovl.on,#fb-modal:not([hidden]),.mb-fiesta:not([hidden])'))return;
    e.preventDefault();abrir()});

  W.MCT_GLOSARIO={abrir:abrir,cerrar:cerrar,leyendaAED:function(){return leyenda(false)},ids:function(){return TER.map(function(t){return t.id})}};

  if(D.body)montarBoton();else D.addEventListener('DOMContentLoaded',montarBoton);
})();
