/* ---------- MODO PREMIUM (capa opcional, src/extra) ----------
   Solo añade clases y el conmutador «✦ Premium / Original». Todo el diseño está en premium.css bajo body.tema-premium:
   en «Original» se quita la clase y la herramienta queda como siempre. Se recuerda en localStorage ('tis_premium').
   No toca la lógica de la app: lee el DOM (botones ocupados, fases hechas) y escribe solo clases y atributos data-tp-*. */
(function(){
  if(window.__tisPremium)return;window.__tisPremium=true;
  var KEY='tis_premium',B=document.body;if(!B)return;
  var lee=function(){try{return localStorage.getItem(KEY)}catch(e){return null}},
      guarda=function(v){try{localStorage.setItem(KEY,v)}catch(e){}};
  var on=lee()!=='0';                      /* por defecto: premium */

  /* tipografía de cuerpo (Manrope, la de la marca); si no hay red, el tema cae en la fuente que ya trae la herramienta */
  if(!document.getElementById('tp-fuentes')){var l=document.createElement('link');l.id='tp-fuentes';l.rel='stylesheet';
    l.href='https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap';(document.head||B).appendChild(l)}

  /* el conmutador */
  var t=document.createElement('button');t.type='button';t.id='tp-toggle';t.className='tp-toggle';
  t.setAttribute('aria-label','Diseño premium');
  t.innerHTML='<span class="tp-op tp-op-p" aria-hidden="true"><i>✦</i> Premium</span><span class="tp-op tp-op-o" aria-hidden="true">Original</span>';
  function aplicar(v,guardar){on=v;B.classList.toggle('tema-premium',v);t.setAttribute('aria-pressed',String(v));
    t.title=v?'Diseño premium activado · pulsa para volver al diseño original':'Diseño original · pulsa para activar el diseño premium';
    if(guardar)guarda(v?'1':'0')}
  t.addEventListener('click',function(e){e.stopPropagation();aplicar(!on,true)});
  t.addEventListener('keydown',function(e){e.stopPropagation()});   /* que las teclas de la app (0-8, M, N, P…) no se disparen aquí */

  /* dónde vive: en el laboratorio, al pie de la barra de fases; en el recorrido completo, al pie del menú; si no, flotando abajo a la izquierda */
  function colocar(){var c=B.classList,dest=null,modo='flota';
    if(c.contains('lab')){dest=document.querySelector('#lab .lab-side-pie');modo='lab'}
    else if(c.contains('basic')){dest=document.querySelector('#basic .bx-pie');modo='pie'}
    else if(!c.contains('basic')&&!c.contains('landing')&&!c.contains('misiones')&&!c.contains('mision1')){dest=document.querySelector('.app .rail-pie');modo='rail'}
    if(!dest){dest=B;modo='flota'}
    if(t.parentNode!==dest){if(dest===B)B.appendChild(t);else dest.insertBefore(t,dest.firstChild)}
    t.setAttribute('data-tp-lugar',modo)}

  /* estado del motor y pantallas de carga: botón ocupado → su nota recibe tp-carga y el mensaje correcto */
  var OCUP=[['#m1-analizar','#m1-nota','#m1-calidad'],['[data-m3-correr]','#m3-nota',null],['#bx-correr','#bx-nota',null],['#pi-correr','#pi-nota',null]];
  var MSG_FRIO='La primera vez tarda 1-4 min: se descarga y arranca el motor (Python) dentro de tu navegador. No cierres la pestaña; las siguientes veces son segundos.',
      MSG_LISTO='Motor listo · calculando, son unos segundos.';
  function vigilar(){var M=window.MCT_MOTOR,listo=!!(M&&M.listo);B.classList.toggle('tp-motor-listo',listo);
    OCUP.forEach(function(o){var b=document.querySelector(o[0]);if(!b)return;
      var ocupado=b.disabled&&/ANALIZANDO|CORRIENDO|CARGANDO/i.test(b.textContent||'');
      [o[1],o[2]].forEach(function(s){if(!s)return;var n=document.querySelector(s);if(!n)return;
        if(ocupado){n.classList.add('tp-carga');n.setAttribute('data-tp-msg',listo?MSG_LISTO:MSG_FRIO)}
        else if(n.classList.contains('tp-carga')){n.classList.remove('tp-carga');n.removeAttribute('data-tp-msg')}})});
    /* laboratorio: progreso de las fases abiertas (barra fina sobre la lista) */
    var nav=document.getElementById('lab-fases');
    if(nav){var ab=nav.querySelectorAll('.lab-fase.abierta').length,he=nav.querySelectorAll('.lab-fase.abierta.hecha').length,
      txt='Tu progreso · '+he+' de '+ab;
      if(nav.getAttribute('data-tp-prog')!==txt){nav.setAttribute('data-tp-prog',txt);nav.style.setProperty('--tp-prog',(ab?Math.round(he/ab*100):0)+'%')}}}

  aplicar(on,false);colocar();vigilar();
  try{new MutationObserver(colocar).observe(B,{attributes:true,attributeFilter:['class']})}catch(e){}
  setInterval(function(){if(!document.hidden)vigilar()},400);
})();
