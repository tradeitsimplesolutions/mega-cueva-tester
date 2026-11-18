/* ---------- «VISTAS» · el botón de arriba a la derecha (pública y laboratorio) ----------
   Un solo sitio, siempre el mismo, para cómo se ve y cómo se usa la herramienta:
     · Modo   → «Más básico» (Cuevi te guía)                    [lo crea basico.js y se coloca aquí]
     · Diseño → Premium / Original                               [lo crea premium.js y se coloca aquí]
     · Tema   → Cueva · TISS dark · TISS clear                   [los botones se crean aquí; el cambio lo hace app.js (window.MCT_TEMA)]
   Va ANTES que basico.js y premium.js (orden alfabético de src/extra): ellos piden su sitio con window.MCT_VISTAS.slot('modo'|'diseno').
   Si esta capa no está, cada conmutador se queda donde estaba. Sin dependencias, sin red. */
(function(){
  if(window.MCT_VISTAS)return;
  var D=document,BTN=null,PAN=null,abierto=false;
  var TEMAS=[['cueva','Cueva'],['tiss-dark','TISS dark'],['tiss-clear','TISS clear']];
  function q(s,r){return (r||D).querySelector(s)}
  function crear(){
    if(BTN||!D.body)return;
    BTN=D.createElement('button');BTN.type='button';BTN.id='vistas-btn';BTN.className='vistas-btn';
    BTN.setAttribute('aria-haspopup','dialog');BTN.setAttribute('aria-expanded','false');BTN.setAttribute('aria-controls','vistas-pan');
    BTN.title='Vistas: modo, diseño y tema';
    BTN.innerHTML='<span class="vb-ic" aria-hidden="true">◐</span><span class="vb-t">Vistas</span>';
    PAN=D.createElement('div');PAN.id='vistas-pan';PAN.className='vistas-pan';PAN.hidden=true;PAN.setAttribute('role','dialog');PAN.setAttribute('aria-label','Vistas');
    PAN.innerHTML='<p class="vp-t">Cómo lo ves</p>'+
      '<div class="vp-g"><span class="vp-l">Modo</span><div class="vp-s" data-slot="modo"></div><small>«Más básico»: Cuevi te guía paso a paso y se pliega lo técnico.</small></div>'+
      '<div class="vp-g"><span class="vp-l">Diseño</span><div class="vp-s" data-slot="diseno"></div></div>'+
      '<div class="vp-g"><span class="vp-l">Tema</span><div class="vp-s vp-temas" data-slot="tema" role="group" aria-label="Tema"></div></div>';
    var T=q('[data-slot="tema"]',PAN);
    TEMAS.forEach(function(t){var b=D.createElement('button');b.type='button';b.className='vp-tema';b.dataset.th=t[0];b.textContent=t[1];
      b.addEventListener('click',function(){if(typeof window.MCT_TEMA==='function')window.MCT_TEMA(t[0]);sync()});T.appendChild(b)});
    D.body.appendChild(BTN);D.body.appendChild(PAN);D.body.classList.add('vistas-on');
    BTN.addEventListener('click',function(e){e.stopPropagation();abierto?cerrar(true):abrir()});
    PAN.addEventListener('keydown',function(e){e.stopPropagation();if(e.key==='Escape'){e.preventDefault();cerrar(true)}});
    BTN.addEventListener('keydown',function(e){e.stopPropagation()});
    D.addEventListener('click',function(e){if(abierto&&!PAN.contains(e.target)&&!BTN.contains(e.target))cerrar(false)});
    try{new MutationObserver(sync).observe(D.documentElement,{attributes:true,attributeFilter:['data-theme']})}catch(e){}
    sync();
  }
  function sync(){if(!PAN)return;var th=D.documentElement.dataset.theme||'cueva';
    Array.prototype.forEach.call(PAN.querySelectorAll('.vp-tema'),function(b){b.setAttribute('aria-pressed',String(b.dataset.th===th))})}
  function abrir(){crear();abierto=true;PAN.hidden=false;BTN.setAttribute('aria-expanded','true');BTN.classList.add('on');
    var b=q('button',PAN);if(b)try{b.focus({preventScroll:true})}catch(e){}}
  function cerrar(foco){if(!PAN)return;abierto=false;PAN.hidden=true;BTN.setAttribute('aria-expanded','false');BTN.classList.remove('on');if(foco)try{BTN.focus({preventScroll:true})}catch(e){}}
  function slot(n){crear();return PAN?q('[data-slot="'+n+'"]',PAN):null}
  window.MCT_VISTAS={slot:slot,abrir:abrir,cerrar:cerrar};
  if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',crear);else crear();
})();
