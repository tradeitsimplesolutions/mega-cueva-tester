/* ---------- MODO «MÁS BÁSICO» · Cuevi, el muñequito pixel que guía (pública y laboratorio) ----------
   Capa opcional (src/extra): se monta detrás de todo el JS. Con el modo apagado no deja nada en la página salvo el conmutador.
   Solo LEE la página y el estado (DOM, localStorage 'mct_ficha' / 'lab_m2' / 'lab_m3' / 'lab_unidad'); lo suyo lo guarda en 'mb_*'.
   Sprites: los personajes pixel de la marca (reto_heroe + accesorios de reto_alumno_duda / reto_alumna_feliz + reto_trofeo), a su
   resolución nativa (21×21, la marca los escala ×24) y pintados con image-rendering: pixelated. */
(function(){
  if(window.__MB_BASICO)return;window.__MB_BASICO=true;
  var IMG={"guia":[21,21,"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAVCAYAAACpF6WWAAABF0lEQVR42s2Vrw7CMBDGvy6EERQGMTeLJGGzqA1L4BFwWDwCjyKZ4xFIsIw3YCQkPAEOgUEt28xQJW1puz8gONPkLvfLfd81LfCv0Wy1858D8+swZ8HGt8D05AAA0pPznpjUkZUlMWGBbJhupIY2W+08HNvSmr+/ScGmGyFLYmJUBQJAOLY5FaYbcXVSFShOzNqRJTEBgIauqT+fSvOXYMf5y57a7auARTUllDb1JpuPGs3pwFJPH+GilKddf83JVk6aJTHp+msAwHZ1+ADRnAqovfx0YhE8W460QCWUvYOiFVSFuPFCT63A43K3wRMAYJ87XP4+PxZ7KgPqwgo86ftg1AXqwI0yjaLsovjqPS21/brfgrisFwCdfFSUQjTgAAAAAElFTkSuQmCC"],"duda":[21,21,"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAVCAYAAACpF6WWAAABFElEQVR42mNkoBCwcXD9R+b/+vGNkZFSAy/PMUcR0005ycBIDQN1U04yMDAwMMD4jNTw+q8f3xiRLWEkJbyQww2fqxnxGbgrQAGrnNuGB3CD0Q3EGVH4DMRlMLIPGMkxENlg5AiCuZQFnybDrGCs4uenrUUJX92UkyguZSLVQGxyv358Y0SOPCZ8mjSDJmPIwcTwWYo1TF/vKiYqTEXdejGSF1aX/vrxjVHUrZeBgYGBYW7TTgyDYGK4DMSb+GEuRjc4uc4dr4E4DUXOSehBAfMFtpyFN0wlp7miiD0w+cDAwMDAoHBGAEX8edZuwmGKzUB8QHKaK9bygYlcA/EZzEKMRnRvEwJMDDQAjMSUn4QAemQBAGwhkRUVnOT2AAAAAElFTkSuQmCC"],"bien":[21,21,"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAVCAYAAACpF6WWAAABDklEQVR42tXUIW/CUBDA8X+bhhDUTAUOOSTJZC3FEvgCS+aw8xN41JK6Jf0CJNgxO0mCrcQhMFOEYJi6hb5377UNmF1Sc5f3y929vMJ/iFa7cwnvDT5+PxPeipgg4Edb7c5F+64RyQlYJDmBD1yPe2otXe0AEEiiSHLOp2MQNgUBpFYkuQUCdqdVoNYx8AcCRL5Dg9lUzW+zpYpJhE3BqpoTlUP9ybtVk5wPVnd6WL/W2mmcLuqNfz4dgzhdAPAx/7QgyblAtVOzYxN+eRt5QSd6/fzMVcgUrpt37rSbDUu53dMPAL3NQym/n31V71QDfdHNhqWpLLQp6IOjOgfNsavirj9p9aK0/dQJ87J+AWkhdiZWQsUUAAAAAElFTkSuQmCC"],"senala":[21,21,"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAVCAYAAACpF6WWAAABC0lEQVR42mNgGKyAjYPrPxsH138Yn5ESg2Dsn6dMGRgYGBjYzU4z/PrxjZEiQ2GGIQN2s9P4XYrsGmTw68c3RrJcysbB9X9XgAJWObcNDxh+/fjGiG45TIyRVANxGYwMmMgxkIGBgWFXgALO4GHBp9EwKxir+Plpa/FayESqgYTkcBoK06QZNBlDDiaGz2BGbGH6elcxUWlV1K0Xa2QxYUuDom69DAwMDAxzm3ZiGAQTw2Ug3mwKczG6wcl17ngNxJtOYWz0oID5AjmxExWmktNcUcQemHxgYGBgYFA4I4Ai/jxrN+EwxWYgPiA5zRVrBmAi10B8BrMQoxHd24QAEy1qAkZiyk9CAD2yAG3QcjZOSLFsAAAAAElFTkSuQmCC"],"trofeo":[36,21,"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAVCAYAAAAuJkyQAAABfElEQVR42t2Wv0rDUBTGvxtKGjK5ZOiWwcVugu3q1LgWhb6AW8GpQwfBQejgkEnI5gsIiqvxDVpBcNDFoZtDl06l7XI7Be7N/VtzC8UDIXBOLvnxne8cLvAfww9Culcw9POUuoLyqsKsxi0AwGrccqIU+Usr1ssFYWHYqLcnWC8XxDmQH4Q078bSWvIylUJVhVG2TAcDAHk35tSrtyfOPEm2hSkrxbawqjoAUNMVj/sX0vxH9sT5iX3vbMpUMKaaygK6x9iyWT4AAByd3+P7+Yqrs7koSbXKFD+TTWN5MguVtUCm0AEJa+HwDvgZGsE82Y6JkhQA8HD7KhwqciZ1tplA9puaavFFSUpn+UCAurw5s4bhwqCOdjGyRiu3r1DPZrJU21ylktJDjazD5aYncwBA/H7A5X/7b1ZQOmOzhhYUksHogGyhZGBlEGEPqWBM0cg6Tu9DpCqQjUp+ENJRrymtXT9+cWc9YPcXOBUMAIx6TU5h4uIqamtsm/MbRTzVVD/Gzv4AAAAASUVORK5CYII="]};
  var D=document,q=function(s,r){try{return (r||D).querySelector(s)}catch(e){return null}},qa=function(s,r){try{return Array.prototype.slice.call((r||D).querySelectorAll(s))}catch(e){return []}};
  var RM=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  var LS={get:function(k){try{return localStorage.getItem(k)}catch(e){return null}},set:function(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
  var cacheJ={};function leeJ(k){var s=LS.get(k);if(!s)return null;var c=cacheJ[k];if(c&&c.s===s)return c.v;var v=null;try{v=JSON.parse(s)}catch(e){}cacheJ[k]={s:s,v:v};return v}
  var EST=leeJ('mb_estado')||{};function marca(k,v){EST[k]=v==null?true:v;LS.set('mb_estado',JSON.stringify(EST))}
  var esc=function(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
  /* números a la española */
  function nf(x,d){if(x==null||!isFinite(x))return '—';d=d||0;var s=Math.abs(x).toFixed(d).split('.'),e=s[0].replace(/\B(?=(\d{3})+(?!\d))/g,'.');return (x<0&&+s.join('')!==0?'−':'')+e+(s[1]?','+s[1]:'')}
  function num(t){if(t==null)return null;var m=String(t).replace(/−/g,'-').match(/-?\d[\d.]*(?:,\d+)?/);if(!m)return null;var v=parseFloat(m[0].replace(/\.(?=\d{3}(\D|$))/g,'').replace(',','.'));return isFinite(v)?v:null}
  var visible=function(el){return !!(el&&(el.offsetParent||el.getClientRects().length))};
  var esLab=function(){return !!window.MCT_LAB&&!!q('#lab')};
  var on=function(){return D.body&&D.body.classList.contains('modo-basico')};

  /* ===== conmutador, guía, mini y celebración ===== */
  var T,G,M,F,ultimaClave='',ultimoHtml='',focoT=null;
  function img(k,alt){var i=IMG[k];return i?'<img src="'+i[2]+'" width="'+i[0]*4+'" height="'+i[1]*4+'" alt="'+esc(alt||'')+'">':''}
  function montar(){
    T=D.createElement('button');T.type='button';T.className='mb-toggle';T.id='mb-toggle';
    T.innerHTML='<span aria-hidden="true">🧩</span> Más básico <span class="mb-sw" aria-hidden="true"></span>';
    T.setAttribute('aria-pressed','false');T.title='Modo más básico: Cuevi te guía paso a paso y se pliegan los bloques técnicos';
    T.addEventListener('click',function(){activar(!on(),true)});
    G=D.createElement('aside');G.className='mb-guia';G.id='mb-guia';G.hidden=true;G.setAttribute('role','complementary');G.setAttribute('aria-labelledby','mb-tit');
    G.innerHTML='<img class="mb-cuevi" alt="" width="76" height="76">'+
      '<div class="mb-boc"><div class="mb-cab"><p class="mb-etapa mono" id="mb-etapa"></p><button type="button" class="mb-x" data-mb="plegar" aria-expanded="true" aria-controls="mb-guia" aria-label="Plegar la guía" title="Plegar la guía (Esc)">▾</button></div>'+
      '<h2 class="mb-tit" id="mb-tit"></h2><ul class="mb-ruta" aria-label="Tu recorrido"></ul><div class="mb-txt" aria-live="polite" aria-atomic="true"></div>'+
      '<div class="mb-acc"><button type="button" class="mb-sig" data-mb="sig">Siguiente paso →</button></div></div>';
    G.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;var a=b.dataset.mb;
      if(a==='plegar'){plegar(true);return}
      if(a==='pq'){var ab=LS.get('mb_porque')!=='1';LS.set('mb_porque',ab?'1':'0');b.setAttribute('aria-expanded',String(ab));b.textContent=(ab?'▾':'▸')+' ¿Por qué?';var t=q('#mb-pq',G);if(t)t.hidden=!ab;ultimoHtml='';reserva();colocar();return}
      if(a==='sig'){var p=PASO;if(!p)return;if(p.hacer)p.hacer();else if(p.obj)resaltar(p.obj);setTimeout(aplicar,60);return}
      if(a==='extra'){var x=PASO&&PASO.extra&&PASO.extra[+b.dataset.i];if(x&&x.f){x.f();setTimeout(aplicar,60)}}});
    G.addEventListener('keydown',function(e){if(e.key==='Escape'){e.preventDefault();plegar(true)}});
    M=D.createElement('button');M.type='button';M.className='mb-mini';M.id='mb-mini';M.hidden=true;M.setAttribute('aria-label','Abrir la guía de Cuevi');M.setAttribute('aria-controls','mb-guia');M.setAttribute('aria-expanded','false');
    M.innerHTML=img('guia','')+'<span class="mb-punto" aria-hidden="true" hidden></span>';
    M.addEventListener('click',function(){plegar(false)});
    F=D.createElement('div');F.className='mb-fiesta';F.id='mb-fiesta';F.hidden=true;F.setAttribute('role','dialog');F.setAttribute('aria-modal','true');F.setAttribute('aria-labelledby','mb-fiesta-t');F.setAttribute('aria-describedby','mb-fiesta-d');
    F.addEventListener('click',function(e){if(e.target===F||e.target.closest('[data-mb="fiesta-ok"]'))cerrarFiesta()});
    F.addEventListener('keydown',function(e){if(e.key==='Escape'){e.preventDefault();cerrarFiesta()}if(e.key==='Tab'){e.preventDefault();var b=q('[data-mb="fiesta-ok"]',F);if(b)b.focus()}});
    D.body.appendChild(G);D.body.appendChild(M);D.body.appendChild(F);D.body.appendChild(T);
    /* acciones del alumno que el estado no guarda: se apuntan al vuelo (fase de captura: antes que la app) */
    D.addEventListener('click',function(e){var t=e.target;if(!t||!t.closest)return;
      if(t.closest('#m1-ejs [data-ej],#m1-csv-b,#m1-cargar'))marca('m1elegido');
      if(t.closest('#m1-analizar,#m1-movil-si'))marca('m1elegido');
      var b2=t.closest('[data-m2-imprimir]');if(b2&&/ENTREGA/i.test(b2.textContent)){marca('m2entregada');pendiente='m2'}
      if(t.closest('[data-m3-imprimir]')){marca('m3entregada');pendiente='m3'}
      if(t.closest('[data-un-imprimir]')){marca('unimpresa');pendiente='unidad'}},true);
    D.addEventListener('change',function(e){if(e.target&&e.target.id==='m1-csv')marca('m1elegido')},true);
    window.addEventListener('resize',function(){sitioToggle();reserva();colocar()});
    var rq=false;D.addEventListener('scroll',function(){if(!on()||rq)return;rq=true;requestAnimationFrame(function(){rq=false;colocar()})},{capture:true,passive:true});
  }
  var pendiente=null;
  function plegar(si){LS.set('mb_plegado',si?'1':'0');pintarCaja();if(si)M.focus();else{var b=q('.mb-sig',G);if(b&&!b.disabled)b.focus();else q('.mb-x',G).focus()}}
  function pintarCaja(){var o=on(),pl=LS.get('mb_plegado')==='1';G.hidden=!o||pl;M.hidden=!o||!pl;q('.mb-x',G).setAttribute('aria-expanded',String(!pl));reserva();colocar()}
  function reserva(){if(!D.body||!on())return;var h=on()&&G&&!G.hidden&&!G.classList.contains('mb-lado')?G.getBoundingClientRect().height+80:on()?90:0;D.body.style.setProperty('--mb-reserva',Math.round(h)+'px')}
  function activar(si,usuario){LS.set('mb_on',si?'1':'0');D.body.classList.toggle('modo-basico',si);T.setAttribute('aria-pressed',String(si));
    if(!si){limpiar();G.hidden=true;M.hidden=true;D.body.style.removeProperty('--mb-reserva');if(D.body.getAttribute('style')==='')D.body.removeAttribute('style');ultimaClave='';ultimoHtml='';return}
    if(usuario)LS.set('mb_plegado','0');antes.m1=m1Hecho();pintarCaja();aplicar();if(usuario){var b=q('.mb-sig',G);if(b&&!b.disabled)b.focus()}}
  /* quita todo lo que pone el modo (al apagarlo, la página queda como sin él) */
  function limpiar(){qa('.mb-detalle,.mb-card').forEach(function(n){n.remove()});
    Array.prototype.slice.call(D.body.classList).forEach(function(c){if(c.indexOf('mb-')===0)D.body.classList.remove(c)});
    qa('.mb-foco').forEach(function(n){n.classList.remove('mb-foco')});cerrarFiesta(true)}

  /* resaltar lo que hay que tocar: lo trae a la vista, lo marca y le pone el foco */
  function resaltar(sel){var el=typeof sel==='string'?q(sel):sel;if(!el||!visible(el))return false;
    qa('.mb-foco').forEach(function(n){if(n!==el)n.classList.remove('mb-foco')});if(!el.classList.contains('mb-foco'))el.classList.add('mb-foco');
    try{el.scrollIntoView({block:window.innerWidth<=700?'start':'center',behavior:RM?'auto':'smooth'})}catch(e){el.scrollIntoView()}setTimeout(colocar,RM?30:600);
    var f=el.matches('button,select,input,textarea,a[href],[tabindex]')?el:q('button:not([disabled]),select,input,textarea,a[href]',el);
    if(f)setTimeout(function(){try{f.focus({preventScroll:true})}catch(e){}},RM?0:350);
    clearTimeout(focoT);focoT=setTimeout(function(){if(el.classList.contains('mb-foco'))el.classList.remove('mb-foco')},6000);return true}
  function pulsa(sel){var el=q(sel);if(el&&!el.disabled){el.click();return true}return false}
  function abrirFase(id){if(window.MCT_LAB_ABRIR){window.MCT_LAB_ABRIR(id);var m=q('.lab-main');if(m&&m.scrollTo)m.scrollTo({top:0});window.scrollTo(0,0)}}
  function elegirOpcion(sel,pred){var s=q(sel);if(!s)return;var o=Array.prototype.slice.call(s.options).find(pred);if(!o)return;s.value=o.value||o.textContent;s.dispatchEvent(new Event('change',{bubbles:true}));setTimeout(function(){resaltar(sel)},120)}

  /* ===== ¿dónde está el alumno? ===== */
  function pantalla(){var b=D.body.classList;
    if(esLab()&&b.contains('lab')){var v=q('#lab .lab-vista.on');return v?(v.id||'').replace('lab-v-',''):'aed'}
    if(b.contains('landing'))return 'landing';if(b.contains('misiones'))return 'misiones';if(b.contains('mision1'))return 'm1';return 'tester'}
  function m1Hecho(){var r=q('#m1-res');return !!(r&&!r.hidden&&q('#m1-perfil .m1p-veredicto'))}
  function hayAed(){try{if(typeof m1Ultimo!=='undefined'&&m1Ultimo)return true}catch(e){}return m1Hecho()}
  function x6(){var b=q('#lab-v-hip .m2-x b');var n=b?num(b.textContent):null;return n==null?null:n}
  function m3(){return leeJ('lab_m3')||{}}
  function unidad(){var u=leeJ('lab_unidad')||{},r=u.resp&&typeof u.resp==='object'?u.resp:{};return {n:Object.keys(r).filter(function(k){return r[k]}).length,firma:!!u.firma,nombre:!!(u.nombre&&String(u.nombre).trim()),acepto:!!u.acepto}}
  function ruta(aqui){if(!esLab())return [['Misión 1',hayAed(),aqui==='m1'],['Laboratorio · con clave',false,false]];
    var M3=m3(),U=unidad();
    return [['01 · Tu activo',hayAed(),aqui==='aed'],['02 · Tu idea',!!EST.m2entregada,aqui==='hip'],['03 · Bloques',!!(M3.entrada&&M3.entrada.length),aqui==='reg'],
      ['04 · Backtest',!!EST.m3entregada,aqui==='bt'],['★ · Tu unidad',!!EST.unimpresa||(U.n>=15&&U.firma),aqui==='unidad']]}

  /* ===== los pasos: QUÉ hacer ahora (h, siempre a la vista) y POR QUÉ (p, se despliega), en llano ===== */
  var PASO=null;
  function pasoM1(lab){var et=(lab?'Fase 01 · Misión 1':'Misión 1')+' · paso ',hecho=m1Hecho(),anal=!!q('#mision1.analizando'),movil=visible(q('#m1-movil'));
    if(anal)return {k:'m1-anal',e:et+'2 de 3',t:'Estoy mirando tus velas…',pose:'duda',sinBtn:true,
      h:'<p>Tarda unos segundos. No cierres la página.</p>',p:'<p>Son miles de días de datos: miro cuánto sube, cuánto cae y qué pasa después de cada día.</p>'};
    if(!hecho&&!EST.m1elegido)return {k:'m1-elige',e:et+'1 de 3',t:'Elige qué vas a estudiar',pose:'senala',obj:'#m1-ejs',
      h:'<p>Toca un activo en «1 · Elige el activo». Si dudas, <b>Nasdaq · diario</b>.</p>',
      p:'<p>Un <b>activo</b> es lo que compras o vendes: el oro, el Nasdaq (las 100 grandes tecnológicas de EE. UU.) o el S&amp;P 500 (las 500 grandes empresas de EE. UU.).</p><p>«Diario» quiere decir que cada vela es un día. Es lo más fácil de seguir.</p>',
      extra:[{t:'Elegir Nasdaq diario por mí',f:function(){pulsa('#m1-ejs [data-ej="ndx_d1"]');marca('m1elegido');setTimeout(function(){resaltar('#m1-analizar')},300)}}]};
    if(!hecho)return {k:'m1-anal0',e:et+'2 de 3',t:'Ahora, pulsa ANALIZAR',pose:'senala',obj:movil?'#m1-movil-si':'#m1-analizar',
      hacer:function(){if(movil)resaltar('#m1-movil');else if(!pulsa('#m1-analizar'))resaltar('#m1-analizar')},
      h:movil?'<p>En el móvil va lento: mejor en el ordenador. Si quieres, pulsa «probar igualmente».</p>':'<p>Pulsa «Siguiente paso» y lo pongo en marcha.</p>',
      p:'<p>Vas a ver cómo se ha movido tu activo durante años. Eso es el <b>AED</b> (análisis exploratorio de datos): mirar antes de inventar reglas.</p><p>Una regla tiene que encajar con el carácter del activo. Por eso se mira primero.</p>'};
    if(!EST.m1leido)return {k:'m1-lee',e:et+'3 de 3',t:'Lee los 3 rasgos de tu activo',pose:'senala',obj:'#mb-m1-card',auto:true,hacer:function(){marca('m1leido')},
      h:'<p>Te he puesto una tarjeta con 3 preguntas. Léela y pulsa «Siguiente paso».</p>',
      p:'<ol><li><b>¿Sube a la larga?</b> Si de fondo sube, comprar va con el viento a favor.</li><li><b>¿Rebota tras caer?</b> Si suele rebotar, comprar después de un mal día tiene sentido.</li>'+
        '<li><b>¿Cuánto se mueve un día normal?</b> Lo que puedes ganar o perder en un día cualquiera.</li></ol><p>Las tablas y figuras están plegadas en «ver detalle», por si te pica la curiosidad.</p>'};
    if(lab)return {k:'m1-fin-lab',e:'Fase 01 · Misión 1 · hecha',t:'¡Misión 1 hecha!',pose:'bien',hacer:function(){abrirFase('hip')},
      h:'<p>Siguiente: la <b>Fase 02 · Hipótesis</b>. Pulsa «Siguiente paso».</p>',
      p:'<p>Ya conoces a tu activo. Tu ficha se guarda sola en este ordenador.</p><p>En la Fase 02 conviertes lo que has visto en una idea con piezas.</p>'};
    return {k:'m1-fin-pub',e:'Misión 1 · hecha',t:'¡Misión 1 hecha!',pose:'bien',hacer:function(){location.href='../reto/index.html#f2'},
      h:'<p>La Misión 2 se hace en el <b>Laboratorio Reto Cueva</b>, con la clave del reto. Pulsa «Siguiente paso» y te llevo.</p>',
      p:'<p>Ya conoces a tu activo. Tu ficha se guarda sola en este navegador y el laboratorio la recupera.</p><p>La clave te la dieron en el curso. Si quieres, guarda también tu ficha en un archivo.</p>',
      extra:[{t:'Guardar mi ficha (.json)',f:function(){pulsa('#m1-guardar')}}]}}
  function pasoHip(){var V=q('#lab-v-hip'),M2=leeJ('lab_m2')||{},et='Fase 02 · Misión 2 · paso ';
    if(q('.lab-bloq',V)||!hayAed())return {k:'hip-sin',e:'Fase 02 · Misión 2',t:'Primero, la Fase 01',pose:'duda',hacer:function(){abrirFase('aed')},
      h:'<p>Pulsa «Siguiente paso» y vamos a la Fase 01.</p>',p:'<p>Tu idea sale de lo que viste en tu activo. Sin eso, no hay de dónde sacarla.</p>'};
    var sub=M2.sub||'piezas',X=x6(),B=M2.camino==='B';
    if(EST.m2entregada)return {k:'hip-fin',e:'Fase 02 · Misión 2 · hecha',t:'¡Misión 2 entregada!',pose:'bien',hacer:function(){abrirFase('reg')},
      h:'<p>Siguiente: la <b>Fase 03 · Reglas</b>. Pulsa «Siguiente paso».</p>',p:'<p>Tu idea ya está escrita sin dudas. En la Fase 03 se convierte en bloques que la máquina entiende.</p>'};
    if(sub==='piezas'&&(!B||!M2.doc))return {k:'hip-doc'+(B?'B':'A'),e:et+'1 de 3',t:'Parte de una estrategia conocida',pose:'senala',obj:B?'[data-m2-doc]':'[data-m2-camino="B"]',
      hacer:B?null:function(){pulsa('[data-m2-camino="B"]');setTimeout(function(){resaltar('[data-m2-doc]')},200)},
      h:B?'<p>Abre la lista «Estrategia documentada» y elige una. Las de tu familia van primero.</p>':'<p>Pulsa «Siguiente paso» y elijo el camino <b>B · desde una documentada</b>.</p>',
      p:'<p>Una <b>hipótesis</b> es tu idea de por qué el precio hará algo. Se escribe en 5 piezas: cuándo miras, cuándo sí operas, qué te hace entrar, cuándo cortas pérdidas (el <b>stop</b>) y cuándo recoges.</p>'+
        '<p>Lo más fácil para empezar: copiar una estrategia <b>documentada</b>, publicada por un autor y probada por otros.</p>',
      extra:B?[{t:'Elegir la primera de mi familia',f:function(){elegirOpcion('[data-m2-doc]',function(o){return o.className==='fam'})}}]:null};
    if(sub==='piezas')return {k:'hip-pz',e:et+'2 de 3',t:'Marca las 3 casillas y sigue',pose:'senala',obj:'#lab-v-hip .m2-sesgos',hacer:function(){pulsa('#lab-v-hip .m2-pzs [data-m2-sub="arbol"]')},
      h:'<p>Las piezas ya están rellenas. Lee las 3 casillas «sin sesgos», márcalas si son verdad y pulsa «Siguiente paso».</p>',
      p:'<p>Las 5 piezas llevan las reglas del autor. No las cambies: son suyas.</p><p>Un <b>sesgo</b> es una trampa de la cabeza: elegir algo porque te gusta la historia o porque acaba de pasar. Las casillas te obligan a pararte a pensarlo.</p>',
      extra:[{t:'Llévame a las casillas',f:function(){resaltar('#lab-v-hip .m2-sesgos')}}]};
    if(sub==='arbol')return {k:'hip-arbol',e:et+'3 de 3',t:'Tu idea en preguntas de sí o no',pose:'guia',obj:'#lab-v-hip .m2-arbol-w',hacer:function(){pulsa('#lab-v-hip [data-m2-sub="pseudo"]')},
      h:'<p>Lee tu árbol de arriba abajo y pulsa «Siguiente paso».</p>',
      p:'<p>Tu <b>árbol</b> es tu idea en preguntas que solo se responden con <b>sí</b> o <b>no</b>. Si una pregunta necesita opinión, no vale.</p><p>Después comprobamos si está escrita sin dudas.</p>'};
    if(X!==6)return {k:'hip-x'+X,e:et+'3 de 3',t:'Casi: te faltan '+(X==null?'algunas':(6-X))+' de 6',pose:'duda',obj:'#lab-v-hip .m2-obj',
      h:'<p>Mira la lista «¿Es objetiva?»: cada <b>NO</b> dice qué falta. Arréglalo en las piezas.</p>',
      p:'<p>El <b>pseudocódigo</b> es tu regla escrita en pasos, tan clara que un ordenador no tenga que adivinar nada. Hacen falta 6 de 6 para entregarla.</p>',
      extra:[{t:'Volver a las piezas',f:function(){pulsa('#lab-v-hip [data-m2-sub="piezas"]')}}]};
    return {k:'hip-6',e:et+'3 de 3',t:'¡6 de 6! Entrega tu Misión 2',pose:'bien',obj:'#lab-v-hip [data-m2-imprimir]',
      h:'<p>Pulsa <b>ENTREGA MISIÓN 2</b>. En la impresión, elige «Guardar como PDF» y súbelo en la lección del curso.</p>',
      p:'<p>Tu <b>pseudocódigo</b> (la regla escrita en pasos, sin nada que adivinar) pasa las 6 comprobaciones.</p><p>No hace falta que gane dinero. Hace falta que sea clara, y lo es.</p>',
      extra:[{t:'Ya la he entregado',f:function(){marca('m2entregada');fiesta('m2')}}]}}
  function pasoReg(){var M3=m3(),et='Fase 03 · Misión 3 · paso ';
    if(q('#lab-v-reg .lab-bloq')||!q('#lab-v-reg [data-m3-plant]'))return {k:'reg-sin',e:'Fase 03 · Misión 3',t:'Primero, la Fase 01',pose:'duda',hacer:function(){abrirFase('aed')},
      h:'<p>Pulsa «Siguiente paso» y vamos a la Fase 01.</p>',p:'<p>La regla se prueba con el activo que analizaste.</p>'};
    if(!(M3.entrada&&M3.entrada.length))return {k:'reg-pl',e:et+'1 de 2',t:'Elige la plantilla «IBS bajo»',pose:'senala',obj:'#lab-v-reg [data-m3-plant]',
      h:'<p>En «Empezar desde», elige <b>IBS bajo</b>. O pulsa «Ponerla por mí».</p>',
      p:'<p>Ahora tu idea pasa a <b>bloques</b>: piezas que la máquina sabe leer.</p><p><b>IBS</b> dice dónde cerró el día dentro de su recorrido: 0 = en lo más bajo, 1 = en lo más alto. La idea: comprar cuando cierra muy abajo y salir cuando cierra arriba.</p>',
      extra:[{t:'Ponerla por mí',f:function(){elegirOpcion('#lab-v-reg [data-m3-plant]',function(o){return /^IBS bajo/.test(o.textContent)})}}]};
    return {k:'reg-lee',e:et+'2 de 2',t:'Así se lee tu regla',pose:'guia',obj:'#lab-v-reg .m3-ed',hacer:function(){abrirFase('bt')},
      h:'<p><b>1</b> = cuándo sí se opera · <b>2</b> = qué te hace entrar · <b>3</b> = cuándo sales. Pulsa «Siguiente paso» para probarla.</p>',
      p:'<p>Las <b>perillas</b> son los números que eliges tú (aquí, 0,2 y 0,8). Cuantas menos, mejor: cada número es una forma de ajustarte al pasado sin querer.</p><p>A la izquierda ya ves una curva de prueba. En la Fase 04 la miramos con calma.</p>'}}
  function pasoBt(){var M3=m3(),et='Fase 04 · Misión 3 · paso ';
    if(q('#lab-v-bt .lab-bloq')||!q('#lab-v-bt [data-m3-correr]'))return {k:'bt-sin',e:'Fase 04 · Misión 3',t:'Primero, tu regla',pose:'duda',hacer:function(){abrirFase(hayAed()?'reg':'aed')},
      h:'<p>Pulsa «Siguiente paso» y vamos a la fase que falta.</p>',p:'<p>Para probar una regla, antes hay que tenerla.</p>'};
    if(!M3.res)return {k:'bt-run',e:et+'1 de 3',t:'Pulsa CORRER EL BACKTEST',pose:'senala',obj:'#lab-v-bt [data-m3-correr]',hacer:function(){if(!pulsa('#lab-v-bt [data-m3-correr]'))resaltar('#lab-v-bt [data-m3-correr]')},
      h:'<p>Pulsa «Siguiente paso» y lo pongo en marcha.</p>',
      p:'<p>Un <b>backtest</b> es jugar tu regla en el pasado, como si la hubieras seguido de verdad, pagando lo que cobra el bróker.</p><p>Se usan solo los años de <b>diseño</b> (los primeros). Los últimos se guardan para el final, como un examen sorpresa.</p>'};
    if(EST.m3entregada)return {k:'bt-fin',e:'Fase 04 · Misión 3 · hecha',t:'¡Misión 3 entregada!',pose:'bien',hacer:function(){pulsa('#lab-fases [data-unidad]')},
      h:'<p>Último paso: <b>TU UNIDAD</b>. Pulsa «Siguiente paso».</p>',p:'<p>Has hecho tu primer backtest. Eso ya es más de lo que hace mucha gente.</p><p>En tu unidad decides cómo quieres operar tú.</p>'};
    if(!EST.btleido)return {k:'bt-lee',e:et+'2 de 3',t:'Mira tu curva en sencillo',pose:'senala',obj:'#mb-bt-card',auto:true,hacer:function(){marca('btleido');resaltar('#lab-v-bt [data-m3-imprimir]')},
      h:'<p>Te he puesto tu resultado en sencillo: si hubieras empezado con 100, cuánto tendrías. Léelo y pulsa «Siguiente paso».</p>',
      p:'<p>La herramienta hace 4 preguntas a tu regla. El <b>PF</b> (factor de beneficio) es lo que ganas dividido entre lo que pierdes: 1,30 quiere decir que por cada 1 € perdido ganas 1,30 €.</p>'+
        '<p><b>No abras aún el examen.</b> Los años de diseño son el <b>IS</b> («dentro de la muestra»); los guardados, el <b>OOS</b> («fuera de la muestra»). Esa <b>partición</b> es lo que hace honrada la prueba: el examen se abre una sola vez, al final.</p>'};
    return {k:'bt-ent',e:et+'3 de 3',t:'Entrega tu curva',pose:'senala',obj:'#lab-v-bt [data-m3-imprimir]',
      h:'<p>Pulsa <b>ENTREGA MISIÓN 3</b>. En la impresión, elige «Guardar como PDF» y súbelo en la lección «Entrega tu Misión 3».</p>',
      p:'<p>Vale aunque ponga <b>NO PASA</b>. Lo importante es hacerlo bien, no ganar a la primera.</p>',
      extra:[{t:'Ya la he entregado',f:function(){marca('m3entregada');fiesta('m3')}}]}}
  function pasoUnidad(){var U=unidad(),et='Tu unidad · paso ';
    if(U.n<15)return {k:'un-q'+U.n,e:et+'1 de 3',t:'Responde las 15 preguntas',pose:U.n?'guia':'senala',obj:'#lab-v-unidad .un-test',
      h:'<p>Van en 4 pestañas: tu vida, tu mercado, tu estilo y tu riesgo. Llevas <b>'+U.n+' de 15</b>.</p>',
      p:'<p>Aquí decides cómo quieres operar <b>tú</b>. No hay respuestas buenas ni malas.</p><p>Cada opción te dice su «precio»: léelo antes de elegir. Debajo se va construyendo tu plan solo.</p>'};
    if(!U.firma||!U.nombre)return {k:'un-firma',e:et+'2 de 3',t:'Firma tu unidad',pose:'senala',obj:'#un-firma',
      h:'<p>Escribe tu nombre, marca la casilla y firma con el ratón o con el dedo.</p>',p:'<p>Es un compromiso contigo: así vas a operar.</p>'};
    if(!EST.unimpresa)return {k:'un-imp',e:et+'3 de 3',t:'Imprímela y guárdala',pose:'senala',obj:'#lab-v-unidad [data-un-imprimir]',
      h:'<p>Pulsa <b>IMPRIMIR MI UNIDAD</b> y guárdala como PDF.</p>',p:'<p>Tenla a mano cuando operes: es tu plan.</p>',
      extra:[{t:'Ya la he guardado',f:function(){marca('unimpresa');fiesta('unidad')}}]};
    return {k:'un-fin',e:'Recorrido completado',t:'¡Lo has conseguido!',pose:'bien',sinBtn:true,
      h:'<p>De conocer tu activo a tener tu plan firmado. Enhorabuena.</p>',p:'<p>Las fases 05 a 08 se abren durante el reto. Te espero allí.</p>'}}
  function paso(){var P=pantalla();
    if(P==='landing')return {k:'landing',e:'Empezamos',t:'¡Hola! Soy Cuevi y voy contigo',pose:'guia',obj:'#land-misiones',hacer:function(){pulsa('#land-misiones')},
      h:'<p>Te llevo paso a paso. Pulsa «Siguiente paso» (o la tarjeta <b>MISIONES</b>).</p>',
      p:'<p>Primero vas a conocer tu <b>activo</b>: el mercado que vas a estudiar. Luego, tu idea; luego, la pruebas.</p><p>Si una palabra es rara, aquí te la explico.</p>'};
    if(P==='misiones')return {k:'misiones',e:'Misiones',t:'Empieza por la Misión 1',pose:'senala',obj:'#mis-1',hacer:function(){pulsa('#mis-1')},
      h:'<p>Pulsa «Siguiente paso» (o la tarjeta <b>MISIÓN 1</b>).</p>',
      p:'<p>Cada misión es un paso corto y van en orden.</p><p>La Misión 1 te enseña cómo se mueve tu activo. Sin eso, cualquier regla sería a ciegas.</p>'};
    if(P==='tester')return {k:'tester',e:'Cueva Tester',t:'Esto es el tester libre',pose:'duda',hacer:function(){try{if(typeof m1Abrir==='function'){m1Abrir();return}}catch(e){}pulsa('#bx-mision1')},
      h:'<p>Si es tu primera vez, empieza por la <b>Misión 1</b>. Pulsa «Siguiente paso» y te llevo.</p>',p:'<p>Aquí se prueban ideas que ya tienes escritas. Primero hay que conocer el activo.</p>'};
    if(P==='m1'||P==='aed')return pasoM1(P==='aed');
    if(P==='hip')return pasoHip();if(P==='reg')return pasoReg();if(P==='bt')return pasoBt();if(P==='unidad')return pasoUnidad();
    return {k:'bloq',e:'Fase cerrada',t:'Esta fase aún está cerrada',pose:'duda',hacer:function(){pulsa('#lab-v-bloq [data-ir-fase]')},
      h:'<p>Pulsa «Siguiente paso» y seguimos por donde ibas.</p>',p:'<p>Se abre durante el reto, cuando llegue su día.</p>'}}

  function pintarGuia(){var p=PASO=paso(),r=ruta(pantalla());
    var htmlR=r.map(function(x){var corto=x[2]||r.length<3?x[0]:x[0].split(' · ')[0];return '<li class="'+(x[2]?'aqui':x[1]?'hecho':'')+'"'+(x[2]?' aria-current="step"':'')+' title="'+esc(x[0]+(x[1]?' · hecho':''))+'">'+(x[1]?'✓ ':'')+(corto===x[0]?esc(x[0]):'<span aria-hidden="true">'+esc(corto)+'</span><span class="sr">'+esc(x[0])+'</span>')+'</li>'}).join('');
    var extra=(p.extra||[]).map(function(x,i){return '<button type="button" class="mb-otro" data-mb="extra" data-i="'+i+'">'+esc(x.t)+'</button>'}).join('');
    var pq=LS.get('mb_porque')==='1',firma=p.k+'|'+p.h+'|'+p.p+'|'+pq+'|'+htmlR+'|'+extra+'|'+p.pose;if(firma===ultimoHtml){colocar();return}
    var nueva=p.k!==ultimaClave;ultimoHtml=firma;ultimaClave=p.k;
    q('#mb-etapa',G).textContent=p.e||'';q('#mb-tit',G).textContent=p.t||'';q('.mb-ruta',G).innerHTML=htmlR;
    var tx=q('.mb-txt',G);tx.innerHTML=(p.h||'')+(p.p?'<button type="button" class="mb-pq" data-mb="pq" aria-expanded="'+pq+'" aria-controls="mb-pq">'+(pq?'▾':'▸')+' ¿Por qué?</button><div class="mb-pqt" id="mb-pq"'+(pq?'':' hidden')+'>'+p.p+'</div>':'');if(nueva)tx.scrollTop=0;
    var ac=q('.mb-acc',G),sig=q('.mb-sig',ac);qa('.mb-otro',ac).forEach(function(n){n.remove()});sig.hidden=!!p.sinBtn;sig.insertAdjacentHTML('afterend',extra);
    var im=q('.mb-cuevi',G),I=IMG[p.pose==='trofeo'?'guia':p.pose]||IMG.guia;if(I&&im.getAttribute('src')!==I[2])im.src=I[2];
    var mi=q('img',M);if(I&&mi&&mi.getAttribute('src')!==I[2])mi.src=I[2];
    var pu=q('.mb-punto',M);if(pu&&nueva&&!M.hidden)pu.hidden=false;if(pu&&!M.hidden)M.setAttribute('aria-label','Abrir la guía de Cuevi: '+(p.t||''));
    if(nueva&&p.auto&&p.obj)setTimeout(function(){resaltar(p.obj)},250);
    reserva();colocar()}
  /* si lo que hay que tocar queda debajo de la guía, la guía se pasa al otro lado (en escritorio) */
  function sitioToggle(){if(!T)return;var cab=D.body.classList.contains('lab')&&window.innerWidth>900?q('#lab .lab-top-r'):null;
    if(cab){if(T.parentNode!==cab){cab.insertBefore(T,cab.firstChild);T.classList.add('mb-en-cab')}}
    else if(T.parentNode!==D.body){D.body.appendChild(T);T.classList.remove('mb-en-cab')}}
  function lado(){var si=false;if(D.body.classList.contains('lab')&&window.innerWidth>900){var u=q('#lab-fases [data-unidad]')||q('#lab-fases .lab-fase[data-fase="bt"]'),pie=q('.lab-side-pie');
      if(u&&visible(u)){var top=u.getBoundingClientRect().bottom+10,bot=pie&&visible(pie)?pie.getBoundingClientRect().top-8:window.innerHeight-90,h=bot-top;
        if(h>=230){si=true;G.style.setProperty('--mb-maxh',Math.floor(h-62)+'px');G.style.setProperty('--mb-bot',Math.ceil(window.innerHeight-bot)+'px');M.style.setProperty('--mb-bot',Math.ceil(window.innerHeight-bot)+'px')}}}
    var vis=si&&!G.hidden;if(G.classList.contains('mb-lado')!==si)G.classList.toggle('mb-lado',si);if(D.body.classList.contains('mb-lado-on')!==vis)D.body.classList.toggle('mb-lado-on',vis);return si}
  function colocar(){if(!G)return;if(G.hidden&&D.body.classList.contains('mb-lado-on'))D.body.classList.remove('mb-lado-on');if(G.hidden&&M.hidden)return;var der=false;if(lado()){if(G.classList.contains('mb-der')){G.classList.remove('mb-der');M.classList.remove('mb-der')}return}
    if(window.innerWidth>700&&PASO&&PASO.obj){var el=q(PASO.obj);if(el&&visible(el)){var r=el.getBoundingClientRect(),gr=G.getBoundingClientRect(),w=gr.width||400,h=G.hidden?64:(gr.height||300),
      xi=D.body.classList.contains('lab')&&window.innerWidth>900?parseFloat(getComputedStyle(D.documentElement).fontSize)*17.5+14:14,xd=window.innerWidth-14-w,
      choca=function(x0,bot){var y0=window.innerHeight-bot-h;return r.left<x0+w&&r.right>x0&&r.top<y0+h&&r.bottom>y0};der=choca(xi,64)&&!choca(xd,104)}}
    if(G.classList.contains('mb-der')!==der){G.classList.toggle('mb-der',der);M.classList.toggle('mb-der',der)}}

  /* ===== «ver detalle»: un botón delante de cada bloque técnico plegado ===== */
  var PLIEGUES=[
    ['cal','#m1-calidad','Calidad de los datos','si los datos tienen huecos o errores'],
    ['part','#m1-perfil .m1t-part','Cómo se reparten los años','diseño, examen y validación'],
    ['rasgos','#m1-perfil .m1p-rasgos','Los rasgos en versión técnica','con sus números'],
    ['ficha','#m1-ficha-tis','Ficha técnica','tablas con todos los números'],
    ['figs','#m1-vista','Las 7 figuras del análisis','gráficos avanzados'],
    ['mapa','#m1-arbol','Mapa del activo y estrategias documentadas',''],
    ['m2extra','#lab-v-hip .m2-extra','Opciones avanzadas','dirección, entrada exacta y tope de tiempo'],
    ['m3m2','#lab-v-reg .m3-m2>pre.codigo','Tu Misión 2 en pseudocódigo',''],
    ['m3adv','#lab-v-reg .m3-niv','Opciones avanzadas de la regla','horario, stop, objetivo y tope de tiempo'],
    ['part4','#lab-v-bt .m3-part','Examen y validación','todavía no: se abren una sola vez, al final'],
    ['curva','#lab-v-bt section.m1t-ficha','Curva completa, tramos y operaciones','la versión técnica'],
    ['unmapa','#lab-v-unidad .un-mapa-w','Mapa de referentes','traders conocidos y sus libros']];
  function pliegues(){PLIEGUES.forEach(function(P){var el=q(P[1]);if(!el||!el.parentNode)return;
    if(P[0]==='cal'&&!el.innerHTML.trim())return;
    var prev=el.previousElementSibling;if(prev&&prev.classList.contains('mb-detalle')&&prev.dataset.mbFold===P[0])return;
    var b=D.createElement('button');b.type='button';b.className='mb-detalle';b.dataset.mbFold=P[0];
    var abierto=D.body.classList.contains('mb-ver-'+P[0]);b.setAttribute('aria-expanded',String(abierto));
    b.innerHTML='<span class="mb-fl" aria-hidden="true">'+(abierto?'▾':'▸')+'</span><span>'+(abierto?'Ocultar':'Ver detalle')+': <b>'+esc(P[2])+'</b>'+(P[3]?' <small>· '+esc(P[3])+'</small>':'')+'</span>';
    b.addEventListener('click',function(){var k='mb-ver-'+P[0],a=!D.body.classList.contains(k);D.body.classList.toggle(k,a);qa('.mb-detalle[data-mb-fold="'+P[0]+'"]').forEach(function(x){x.remove()});pliegues();var nb=q('.mb-detalle[data-mb-fold="'+P[0]+'"]');if(nb)nb.focus()});
    el.parentNode.insertBefore(b,el)})}

  /* ===== tarjetas grandes y gráficos sencillos (SVG) ===== */
  function rasgo(lbl){var r=null;qa('#m1-perfil .m1p-rasgo').some(function(d){var s=q('span',d);if(s&&s.textContent.trim().toLowerCase().indexOf(lbl)===0){r={v:(q('b',d)||{}).textContent||'',d:(q('small',d)||{}).textContent||''};return true}});return r}
  function tile(lbl){var r=null;qa('#m1-ficha-tis .m1t-tile').some(function(d){var s=q('span',d);if(s&&s.textContent.trim().toLowerCase().indexOf(lbl)===0){r={v:(q('b',d)||{}).textContent||'',d:(q('small',d)||{}).textContent||''};return true}});return r}
  function barra(v,min,max,txtIzq,txtDer,cero,etq){var W=300,x=function(t){return 10+(W-20)*(Math.max(min,Math.min(max,t))-min)/(max-min)},x0=x(cero==null?min:cero),xv=x(v);
    var col=v>=(cero||0)?'var(--ok,#16B25F)':'var(--red,#FF6B5E)';
    return '<svg viewBox="0 0 '+W+' 46" role="img" aria-label="'+esc(etq)+'"><rect x="10" y="10" width="'+(W-20)+'" height="14" rx="7" fill="var(--line,#2B353A)"/>'+
      '<rect x="'+Math.min(x0,xv).toFixed(1)+'" y="10" width="'+Math.max(3,Math.abs(xv-x0)).toFixed(1)+'" height="14" rx="7" fill="'+col+'"/>'+
      (cero!=null?'<line x1="'+x0.toFixed(1)+'" x2="'+x0.toFixed(1)+'" y1="6" y2="28" stroke="var(--dim,#B9B5AB)" stroke-width="2"/>':'')+
      '<text class="mb-svg-t" x="10" y="42">'+esc(txtIzq)+'</text><text class="mb-svg-t" x="'+(W-10)+'" y="42" text-anchor="end">'+esc(txtDer)+'</text></svg>'}
  function tresPos(i,etq){var L=['Sigue igual','Ni fu ni fa','Rebota'],W=300,w=(W-20)/3;
    return '<svg viewBox="0 0 '+W+' 50" role="img" aria-label="'+esc(etq)+'">'+L.map(function(t,j){var on=j===i;return '<rect x="'+(10+j*w+2).toFixed(1)+'" y="6" width="'+(w-4).toFixed(1)+'" height="24" rx="6" fill="'+(on?'var(--gold,#FFD23F)':'var(--line,#2B353A)')+'"/>'+
      '<text x="'+(10+j*w+w/2).toFixed(1)+'" y="46" text-anchor="middle" class="'+(on?'mb-svg-tb':'mb-svg-t')+'">'+t+'</text>'}).join('')+'</svg>'}
  function cartaM1(){var res=q('#m1-res');if(!res||res.hidden||!q('#m1-perfil .m1p-veredicto'))return;
    var fondo=rasgo('tendencia'),dia=rasgo('día a día'),mov=tile('movimiento medio'),act=(q('#m1-perfil .m1p-veredicto .m1p-eyebrow')||{}).textContent||'';
    act=act.replace(/^.*PERSONALIDAD DE\s*/i,'').trim();var tf=/diario/i.test(act)?'día':/hora/i.test(act)?'hora':/min/i.test(act)?'vela':'día';
    var tiles=[];
    if(fondo){var a=num(fondo.d),v=fondo.v.toLowerCase(),si=/alcista/.test(v),no=/bajista/.test(v);
      tiles.push('<div class="mb-t"><h3>¿Sube a la larga?</h3><span class="mb-big '+(si?'ok':no?'bad':'gold')+'">'+(si?'Sí':no?'No, baja':'Ni sube ni baja')+'</span>'+
        (a!=null?'<p>De media, '+(a>=0?'ha subido':'ha bajado')+' un <b>'+nf(Math.abs(a),1)+' % al año</b>.</p>':'')+
        (a!=null?barra(a,-20,20,'baja','sube',0,'Rentabilidad media anual: '+nf(a,1)+' %'):'')+
        '<p>'+(si?'Comprar va con el viento a favor.':no?'Comprar va contra el viento.':'El fondo no ayuda ni estorba.')+'</p></div>')}
    if(dia){var d=dia.v.toLowerCase(),i=/revierte/.test(d)?2:/sigue/.test(d)?0:1;
      tiles.push('<div class="mb-t"><h3>¿Rebota tras caer?</h3><span class="mb-big '+(i===2?'ok':i===0?'gold':'')+'">'+(i===2?'Sí, suele rebotar':i===0?'No, suele seguir':'Ni una cosa ni otra')+'</span>'+
        tresPos(i,'Tras un mal '+tf+': '+['suele seguir igual','no se nota nada','suele rebotar'][i])+
        '<p>'+(i===2?'Tras un mal '+tf+', el siguiente tiende a compensar un poco. Comprar caídas tiene sentido.':i===0?'Lo que hace hoy tiende a repetirse mañana. Seguir el movimiento tiene más sentido que llevarle la contraria.':'Lo de hoy apenas dice nada de lo de mañana.')+'</p></div>')}
    if(mov){var m=num(mov.v);if(m!=null)tiles.push('<div class="mb-t"><h3>¿Cuánto se mueve un'+(tf==='hora'?'a hora':tf==='vela'?'a vela':' día')+' normal?</h3><span class="mb-big gold">± '+nf(m,2)+' %</span>'+
        barra(m,0,3,'0 %','3 %',null,'Movimiento medio: '+nf(m,2)+' %')+
        '<p>Con <b>1.000 €</b> dentro, un'+(tf==='hora'?'a hora':tf==='vela'?'a vela':' día')+' normal sube o baja unos <b>'+nf(10*m,2)+' €</b>.</p></div>')}
    if(!tiles.length)return;
    var html='<div class="mb-card-h">'+img('senala','')+'<div><p>Misión 1 · en sencillo'+(act?' · '+esc(act):'')+'</p><h2>Tus 3 rasgos clave</h2></div></div><div class="mb-tiles">'+tiles.join('')+'</div>'+
      '<p class="mb-nota">Son pistas sobre el pasado, no promesas. Debajo tienes la personalidad de tu activo y, plegado, todo el detalle.</p>';
    poner('mb-m1-card',html,function(n){res.insertBefore(n,res.firstChild)},'Tus 3 rasgos clave')}
  function cartaBt(){var V=q('#lab-v-bt');if(!V||!V.classList.contains('on'))return;var M3=m3(),R=M3.res,ver=q('section.m3-ver',V);if(!R||!ver)return;
    var e=R.eq||{},v=e.v||[],f=e.f||[],tr=(R.tramos&&(R.tramos[R.juez]||R.tramos.diseno))||null;if(v.length<2)return;
    var fin=100*v[v.length-1],desde=String(f[0]||'').slice(0,4),hasta=String(f[f.length-1]||'').slice(0,4);
    var W=Math.round(Math.min(1000,Math.max(300,(ver.parentNode.clientWidth||680)-70))),H=W<520?170:230,pl=40,pr=14,pt=16,pb=24,N=v.length,paso=Math.max(1,Math.floor(N/320)),pts=[],lo=Infinity,hi=-Infinity;
    for(var i=0;i<N;i+=paso){var y=100*v[i];if(isFinite(y)){lo=Math.min(lo,y);hi=Math.max(hi,y)}}lo=Math.min(lo,100,fin);hi=Math.max(hi,100,fin);var pad=(hi-lo)*.08||5;lo-=pad;hi+=pad;
    var sx=function(i){return pl+(W-pl-pr)*i/(N-1)},sy=function(y){return pt+(H-pt-pb)*(1-(y-lo)/(hi-lo))};
    for(i=0;i<N;i+=paso)if(isFinite(v[i]))pts.push(sx(i).toFixed(1)+','+sy(100*v[i]).toFixed(1));pts.push(sx(N-1).toFixed(1)+','+sy(fin).toFixed(1));
    var gana=fin>=100,col=gana?'var(--gold,#FFD23F)':'var(--red,#FF6B5E)';
    var svg='<svg class="mb-curva" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Tu cuenta, de 100 a '+nf(fin,0)+' entre '+desde+' y '+hasta+'">'+
      '<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+sy(100).toFixed(1)+'" y2="'+sy(100).toFixed(1)+'" stroke="var(--dim2,#959186)" stroke-width="1.5" stroke-dasharray="5 5"/>'+
      '<text class="mb-svg-t" x="'+(pl-6)+'" y="'+(sy(100)+4).toFixed(1)+'" text-anchor="end">100</text>'+
      '<polyline points="'+pts.join(' ')+'" fill="none" stroke="'+col+'" stroke-width="2.5" stroke-linejoin="round"/>'+
      '<circle cx="'+sx(N-1).toFixed(1)+'" cy="'+sy(fin).toFixed(1)+'" r="4.5" fill="'+col+'"/>'+
      '<text class="mb-svg-tb" x="'+(sx(N-1)-8).toFixed(1)+'" y="'+(sy(fin)+(fin>=hi-(hi-lo)*.15?18:-10)).toFixed(1)+'" text-anchor="end">'+nf(fin,0)+'</text>'+
      '<text class="mb-svg-t" x="'+pl+'" y="'+(H-6)+'">'+esc(desde)+'</text><text class="mb-svg-t" x="'+(W-pr)+'" y="'+(H-6)+'" text-anchor="end">'+esc(hasta)+'</text></svg>';
    var C=R.criterios||{},ks=Object.keys(C),ok=ks.filter(function(k){return C[k]}).length,t=[];
    if(tr){var n=tr.n,an=tr.anios;
      t.push('<div class="mb-t"><h3>¿Cuántas veces operó?</h3><span class="mb-big">'+nf(n,0)+'</span><p>'+(an?'Unas <b>'+nf(n/an,0)+' al año</b>. ':'')+'Hacen falta 30 o más para fiarse algo.</p></div>');
      if(tr.win_rate!=null)t.push('<div class="mb-t"><h3>¿Cuántas acierta?</h3><span class="mb-big">'+nf(100*tr.win_rate,0)+' de 100</span><p>Acertar mucho no basta: importa cuánto ganas cuando aciertas.</p></div>');
      if(tr.maxdd!=null)t.push('<div class="mb-t"><h3>¿Cuál fue su peor bajón?</h3><span class="mb-big bad">−'+nf(100*tr.maxdd,0)+' %</span><p>Desde su mejor momento, llegó a perder <b>'+nf(100*tr.maxdd,0)+' de cada 100</b>. ¿Aguantarías eso sin apagarla?</p></div>');
      if(tr.pf!=null)t.push('<div class="mb-t"><h3>¿Gana más de lo que pierde?</h3><span class="mb-big '+(tr.pf>=1.3?'ok':tr.pf>=1?'gold':'bad')+'">PF '+nf(tr.pf,2)+'</span><p>Por cada <b>1 €</b> que pierde, gana <b>'+nf(tr.pf,2)+' €</b>. El método pide 1,30 o más.</p></div>')}
    var html='<div class="mb-card-h">'+img(R.pasa?'bien':'guia','')+'<div><p>Fase 04 · tu backtest en sencillo</p><h2>'+(ks.length?ok+' de '+ks.length+' preguntas superadas':'Tu curva')+'</h2></div></div>'+
      '<p class="mb-frase">Si hubieras empezado con <b>100</b>, tu cuenta habría pasado de 100 a <b>'+nf(fin,0)+'</b>'+(desde&&hasta?' entre '+esc(desde)+' y '+esc(hasta):'')+'.</p>'+svg+
      '<div class="mb-tiles">'+t.join('')+'</div><p class="mb-nota">Con lo que cobra el bróker incluido y solo con los años '+(R.abierto&&R.abierto.length>1?'que has abierto':'de diseño')+'. '+
      (R.pasa?'¡Pasa! Aun así, el examen final dirá la última palabra.':'Todavía no pasa, y no pasa nada: para la Misión 3 vale igual.')+'</p>';
    poner('mb-bt-card',html,function(n){ver.parentNode.insertBefore(n,ver)},'Tu backtest en sencillo')}
  function poner(id,html,inserta,etq){var n=D.getElementById(id);
    if(n&&n.isConnected&&n.dataset.h===String(html.length)+html.slice(-80)&&n.parentNode)return;
    if(!n){n=D.createElement('section');n.id=id;n.className='mb-card';n.setAttribute('aria-label',etq);}
    n.innerHTML=html;n.dataset.h=String(html.length)+html.slice(-80);if(!n.isConnected)inserta(n)}

  /* ===== momentos de logro ===== */
  var FIESTA={m1:['¡Misión 1 completada!','Ya tienes la ficha de tu activo. Ahora te la explico en sencillo.'],
    m2:['¡Misión 2 entregada!','Tu idea ya está escrita sin una sola duda.'],
    m3:['¡Misión 3 entregada!','Tu primera curva. Así empiezan todos los sistemas.'],
    unidad:['¡Tu unidad está lista!','Tienes tu plan, tus reglas y tu firma. Enhorabuena.']},fiestaVuelta=null;
  function fiesta(k){if(!on()||!FIESTA[k])return;var h=EST.fiestas||{};if(h[k])return;h[k]=1;marca('fiestas',h);
    var c='';if(!RM)for(var i=0;i<14;i++)c+='<i class="mb-conf" aria-hidden="true" style="left:'+(4+i*7)+'%;animation-delay:'+(i%5*.22).toFixed(2)+'s"></i>';
    F.innerHTML='<div class="mb-fiesta-in">'+c+img('trofeo','Cuevi levanta un trofeo')+'<h2 id="mb-fiesta-t">'+esc(FIESTA[k][0])+'</h2><p id="mb-fiesta-d">'+esc(FIESTA[k][1])+'</p>'+
      '<button type="button" class="mb-sig" data-mb="fiesta-ok">¡Seguimos! →</button></div>';
    fiestaVuelta=D.activeElement;F.hidden=false;var b=q('[data-mb="fiesta-ok"]',F);if(b)setTimeout(function(){b.focus()},30)}
  function cerrarFiesta(sinFoco){if(!F||F.hidden)return;F.hidden=true;F.innerHTML='';
    if(!sinFoco){var b=G&&!G.hidden?q('.mb-sig',G):null;var t=b&&!b.hidden?b:fiestaVuelta;try{if(t&&t.focus)t.focus()}catch(e){}}}

  /* ===== bucle: se reaplica cuando la página cambia ===== */
  var antes={m1:null},pend=false;
  function aplicar(){pend=false;if(!on())return;
    var h=m1Hecho();if(antes.m1===false&&h&&EST.m1elegido)fiesta('m1');antes.m1=h;
    if(pendiente){var k=pendiente;pendiente=null;setTimeout(function(){fiesta(k);aplicar()},400)}
    try{pliegues()}catch(e){}try{cartaM1()}catch(e){}try{cartaBt()}catch(e){}
    try{pintarGuia()}catch(e){if(window.console)console.warn('modo básico:',e)}}
  function programa(){if(pend)return;pend=true;(window.requestAnimationFrame||setTimeout)(aplicar)}
  function iniciar(){if(!D.body||q('#mb-toggle'))return;montar();
    antes.m1=m1Hecho();sitioToggle();setTimeout(sitioToggle,300);
    if(LS.get('mb_on')==='1')activar(true,false);
    if(window.MutationObserver)new MutationObserver(function(){if(on())programa()}).observe(D.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden']});
    window.addEventListener('hashchange',programa);
    /* la app restaura la ficha y repinta un poco después de cargar */
    setTimeout(programa,400);setTimeout(programa,1500)}
  if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',iniciar);else setTimeout(iniciar,0);
})();
