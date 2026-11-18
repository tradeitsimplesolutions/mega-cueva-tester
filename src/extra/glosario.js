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
   v:['paridad','fases']}
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
