/* ---------- EL ROBOT DE TISS (Cuevi) · portado de BotMariel / BotCara de ia-mariel, sin React ni WebGL ----------
   La misma criatura: cuerpo redondeado de tinta verde (#0E2A1A), antena con bolita verde TIS (#16B25F), dos ojos-cápsula y una boca
   que emiten luz. Flota, parpadea, guiña, SIGUE EL CURSOR y cambia de gesto según el estado:
     normal      · mira el cursor; parpadea y de vez en cuando guiña
     pensando    · entrecierra los ojos, mira hacia arriba a la izquierda, inclina la cabeza y la bolita late
     escribiendo · la boca «habla»
     celebra     · sonrisa grande, salta y salen chispas (hitos y fiestas)
   Es un SVG con sombreado y un giro en perspectiva (rotateX/rotateY en CSS), así abre con doble clic y sin red, y no depende de WebGL.
   API: window.MCT_BOT = { html(estado), estado(nodo, estado), mira(nodo, elemento|null), deSprite(pose) }.
   Respeta prefers-reduced-motion (queda quieto). */
(function(){
  if(window.MCT_BOT)return;
  var D=document,RM=false;try{RM=window.matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){}
  var DEFS='<svg id="mctbot-defs" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>'+
    '<linearGradient id="mb-gc" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#245f3f"/><stop offset=".42" stop-color="#0e2a1a"/><stop offset="1" stop-color="#050f09"/></linearGradient>'+
    '<radialGradient id="mb-gh" cx=".28" cy=".2" r=".62"><stop offset="0" stop-color="#fff" stop-opacity=".30"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>'+
    '<linearGradient id="mb-gr" x1="0" y1=".25" x2="1" y2=".75"><stop offset="0" stop-color="#16b25f" stop-opacity=".95"/><stop offset=".4" stop-color="#16b25f" stop-opacity=".14"/><stop offset="1" stop-color="#16b25f" stop-opacity="0"/></linearGradient>'+
    '<linearGradient id="mb-go" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5df2a3"/><stop offset=".55" stop-color="#16b25f"/><stop offset="1" stop-color="#0f8a49"/></linearGradient>'+
    '<filter id="mb-glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="1.7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'+
    '</defs></svg>';
  function defs(){if(!D.getElementById('mctbot-defs')&&D.body)D.body.insertAdjacentHTML('afterbegin',DEFS)}
  var SVG='<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">'+
    '<ellipse class="b-sombra" cx="50" cy="96" rx="27" ry="3.4" fill="rgba(0,0,0,.38)"/>'+
    '<g class="b-cuerpo">'+
      '<rect x="48" y="11" width="4" height="15" rx="2" fill="#0e2a1a"/>'+
      '<circle class="b-bola" cx="50" cy="9" r="5" fill="url(#mb-go)" filter="url(#mb-glow)"/>'+
      '<rect x="10" y="24" width="80" height="65" rx="26" fill="url(#mb-gc)"/>'+
      '<rect x="10" y="24" width="80" height="65" rx="26" fill="url(#mb-gh)"/>'+
      '<rect x="11" y="25" width="78" height="63" rx="25" fill="none" stroke="url(#mb-gr)" stroke-width="2.2"/>'+
      '<g class="b-cara">'+
        '<g class="b-ojos">'+
          '<rect class="b-ojo" x="29" y="43" width="14" height="25" rx="7" fill="url(#mb-go)" filter="url(#mb-glow)"/>'+
          '<rect class="b-ojo b-ojo-d" x="57" y="43" width="14" height="25" rx="7" fill="url(#mb-go)" filter="url(#mb-glow)"/>'+
          '<rect x="32.5" y="46" width="3.6" height="8.5" rx="1.8" fill="#d6ffe8" opacity=".6"/>'+
          '<rect x="60.5" y="46" width="3.6" height="8.5" rx="1.8" fill="#d6ffe8" opacity=".6"/>'+
        '</g>'+
        '<path class="b-boca b-boca-n" d="M38 74 Q50 82 62 74" fill="none" stroke="#16b25f" stroke-width="3.6" stroke-linecap="round" filter="url(#mb-glow)"/>'+
        '<path class="b-boca b-boca-s" d="M36 72 Q50 90 64 72 Z" fill="#16b25f" stroke="#16b25f" stroke-width="2.4" stroke-linejoin="round" filter="url(#mb-glow)"/>'+
      '</g>'+
    '</g>'+
    '<g class="b-chispas" fill="#d6ffe8"><path d="M14 20l1.6 3.4 3.4 1.6-3.4 1.6L14 30l-1.6-3.4L9 25l3.4-1.6z"/><path d="M88 14l1.2 2.6 2.6 1.2-2.6 1.2L88 22l-1.2-2.6L84.2 18l2.6-1.2z"/><path d="M92 48l1 2.2 2.2 1-2.2 1L92 54.4l-1-2.2-2.2-1 2.2-1z"/></g>'+
  '</svg>';
  function html(est,alt){defs();return '<span class="mct-bot" data-estado="'+(est||'normal')+'"'+(alt?' role="img" aria-label="'+String(alt).replace(/"/g,'&quot;')+'"':' aria-hidden="true"')+'><span class="b-flota">'+SVG+'</span></span>'}
  function estado(n,e){if(n&&n.dataset&&n.dataset.estado!==e)n.dataset.estado=e}
  function mira(n,el){if(n)n.__mira=el||null}
  function deSprite(k){return k==='duda'?'pensando':(k==='bien'||k==='trofeo')?'celebra':'normal'}
  window.MCT_BOT={html:html,estado:estado,mira:mira,deSprite:deSprite};
  if(D.body)defs();else D.addEventListener('DOMContentLoaded',defs);

  /* seguir el cursor (o el elemento señalado) con suavidad: giro en perspectiva + el rostro se desplaza un poco más que el cuerpo */
  var ptr={x:innerWidth/2,y:innerHeight/2};
  addEventListener('pointermove',function(e){ptr.x=e.clientX;ptr.y=e.clientY},{passive:true});
  function cl(v){return Math.max(-1,Math.min(1,v))}
  function frame(){
    if(!D.hidden){var bots=D.querySelectorAll('.mct-bot');
      for(var i=0;i<bots.length;i++){var b=bots[i];if(!b.offsetParent&&getComputedStyle(b).position!=='fixed')continue;
        var r=b.getBoundingClientRect();if(!r.width)continue;var cx=r.left+r.width/2,cy=r.top+r.height/2,tx,ty,e=b.dataset.estado,m=b.__mira;
        if(m&&D.body.contains(m)&&m.offsetParent!==null){var q=m.getBoundingClientRect();tx=cl((q.left+q.width/2-cx)/(innerWidth/2));ty=cl((q.top+q.height/2-cy)/(innerHeight/2))}
        else{tx=cl((ptr.x-cx)/(innerWidth/2));ty=cl((ptr.y-cy)/(innerHeight/2))}
        if(e==='pensando'){tx=-.35;ty=-.25}
        var z=e==='pensando'?7:0;
        b.__x=(b.__x||0)+(tx-(b.__x||0))*.08;b.__y=(b.__y||0)+(ty-(b.__y||0))*.08;b.__z=(b.__z||0)+(z-(b.__z||0))*.06;
        var s=b.style;s.setProperty('--ry',(b.__x*26).toFixed(2)+'deg');s.setProperty('--rx',(-b.__y*14).toFixed(2)+'deg');s.setProperty('--rz',b.__z.toFixed(2)+'deg');
        s.setProperty('--px',(b.__x*3.2).toFixed(2)+'px');s.setProperty('--py',(b.__y*2.2).toFixed(2)+'px')}}
    requestAnimationFrame(frame)}
  if(!RM)requestAnimationFrame(frame);
})();
