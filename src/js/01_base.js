/* =====================================================================
   MEGA CUEVA TESTER · núcleo
   Contrato: cargarResultados(json) re-pinta toda la app con un JSON
   del motor TIS (formato datos_terminal_v2). correrMotor(spec) es el
   gancho del motor real (Pyodide); ver README.md.
   ===================================================================== */
"use strict";
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const nf=(x,d=2)=>{if(x==null||isNaN(x))return '—';const s=Math.abs(x).toFixed(d);let [i,f]=s.split('.');i=i.replace(/\B(?=(\d{3})+(?!\d))/g,'.');return (x<0&&+s!==0?'−':'')+i+(f?','+f:'')};
const pct=(x,d=1,sg=true)=>x==null||isNaN(x)?'—':(x>0&&sg?'+':'')+nf(x*100,d)+' %';
const fd=s=>s?String(s).slice(0,10).split('-').reverse().join('-'):'—';
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const ts=s=>Date.parse(String(s).slice(0,10)+'T00:00:00Z');
const store={get(k){try{return localStorage.getItem('mct_'+k)}catch(e){return null}},set(k,v){try{localStorage.setItem('mct_'+k,v)}catch(e){}}};
const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
const ico=(id,cl='')=>`<svg class="${cl}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
const EST={pasa:{t:'Pasa',i:'ok'},falla:{t:'No pasa',i:'ko'},pend:{t:'Pendiente',i:'pend'}};
const sello=(e,txt,cl='')=>`<span class="sello ${e} ${cl}">${ico(EST[e].i)}${esc(txt||EST[e].t)}</span>`;
const yr=s=>String(s).slice(0,4);

/* ---------- metadatos de la demo (lo que el JSON no trae) ---------- */
const DEMO_META={
  id:'oro_rsi4', nombre:'Oro RSI(4) 25/55', titulo_html:'Oro <span>RSI(4) 25/55</span>',
  activo:'XAUUSD', tf:'diario',
  lema:'Compra el oro <b>cuando cae con fuerza dentro de una tendencia alcista</b> y vende en el rebote. Gráfico diario, solo compras.',
  origen:'Connors &amp; Alvarez (2009), <i>High Probability ETF Trading</i>, «The RSI 25 &amp; RSI 75 Strategy», aplicada al oro (XAUUSD).',
  regla_html:'<span class="k">COMPRA</span> si cierre &gt; <span class="term" data-t="sma">media 200</span> y <span class="term" data-t="rsi">RSI(4)</span> &lt; 25<br><span class="k">VENDE</span>&nbsp; si <span class="term" data-t="rsi">RSI(4)</span> &gt; 55<br><span class="c-dim2">órdenes en la apertura siguiente</span>',
  osc:{nombre:'RSI(4)', compra:25, venta:55}, media:'media 200',
  pasos:['Cada día, al cierre, mira si el oro está <b>por encima de su <span class="term" data-t="sma">media de 200 días</span></b>. Si no, no hace nada.',
    'Si lo está, espera una <b>caída fuerte</b>: <span class="term" data-t="rsi">RSI(4)</span> por debajo de <b class="c-cinta">25</b>.',
    'Entonces <b>compra</b> en la apertura del día siguiente, con el 100 % del capital.',
    'Mantiene hasta que el RSI(4) supera <b class="c-cinta">55</b> (el rebote) y <b>vende</b> en la apertura siguiente. Sin stop de pérdidas.'],
  glosario:[['Media de 200 días','Precio medio de unos 10 meses. Por encima = tendencia de fondo alcista.'],
    ['RSI(4)','Oscilador de 0 a 100 sobre los últimos 4 días. Bajo 25 = ha caído mucho en muy poco tiempo.'],
    ['Reversión a la media','Tras una caída brusca, el precio tiende a volver a su nivel habitual.']]
};
const DEMO_PARIDAD={
  zona:{estado:'pasa',txt:'Velas diarias en hora del servidor Darwinex (GMT+3 con horario de verano de EE. UU.), perfil darwinex_mt5.'},
  costes:{estado:'pasa',txt:'Spread, comisión y swap leídos del terminal Darwinex (perfil del 23-09-2026). Swap de compras −61,5 puntos por lote y día; deslizamiento supuesto de 3 pb por lado.'},
  reconciliacion:{estado:'pend',txt:'Falta correr el mismo periodo en el Strategy Tester de MT5 con el EA real y comparar.'}
};

/* ---------- estado global (se rehace en cada carga) ---------- */
let D,M,P,T,F1,IS,OOS,FULL,E,U,eqT,eqV,splitT,nPass,ES_DEMO=true,RECON=null;
const charts={};

/* ---------- glosario ---------- */
const GL={
 pf:['Factor de beneficio (PF)','Lo ganado en las operaciones ganadoras dividido por lo perdido en las perdedoras. Por encima de 1 gana dinero; TIS pide al menos 1,3 en la prueba honesta.'],
 oos:['Fuera de muestra (OOS)','La parte del histórico que NO se usó para diseñar la regla. Es la prueba honesta: cómo se habría comportado con datos «nuevos».'],
 is:['Dentro de muestra (IS)','La parte del histórico con la que se diseñó y ajustó la regla. Sus resultados son optimistas por definición.'],
 dd:['Caída máxima (drawdown)','La mayor bajada del capital desde un máximo hasta el mínimo posterior. El peor mal trago que habría que aguantar.'],
 rsi:['RSI','Índice de fuerza relativa: oscila de 0 a 100. Muy bajo = el precio ha caído mucho en poco tiempo; alto = ya ha rebotado.'],
 sma:['Media móvil (SMA)','Precio medio de las últimas N sesiones. Si el cierre está por encima de la de 200, la tendencia de fondo se considera alcista.'],
 expo:['Tiempo invertido','Porcentaje de días con una posición abierta. El resto del tiempo el dinero está parado.'],
 cagr:['Rentabilidad anual (CAGR)','Crecimiento medio compuesto por año del capital.'],
 wf:['Walk-forward','Se ajusta la regla con unos años y se prueba en el siguiente, y se repite avanzando año a año. Simula usarla en tiempo real.'],
 ef:['Eficiencia walk-forward','Lo que rinde en los años de prueba dividido por lo que rinde en los de ajuste. Se pide al menos 0,50.'],
 mc:['Monte Carlo','Se barajan y remuestrean las operaciones miles de veces para ver qué resultados y caídas eran posibles con otra suerte en el orden.'],
 mes:['Meseta de parámetros','Se prueban valores vecinos de los números elegidos. Una regla robusta da resultados parecidos alrededor: una meseta, no un pico aislado.'],
 st:['Stress','Se empeoran las condiciones a propósito: costes dobles, quitar los 2 mejores años y un régimen de mercado malo.'],
 pfsm:['PF sin la mejor operación','El factor de beneficio quitando la operación más rentable. Si sigue por encima de 1, no depende de un golpe de suerte.'],
 par:['Paridad MT5','Comprobar que el backtest y MetaTrader 5 son el mismo sistema: misma hora, mismos costes y mismas operaciones en el Strategy Tester.'],
 pb:['Punto básico (pb)','Una centésima de punto porcentual: 1 pb = 0,01 %. 10 pb sobre 10.000 € son 10 €.']
};
const tip=()=>$('#tip');
function showTip(el){const g=GL[el.dataset.t];if(!g)return;const t=tip();t.innerHTML='<b>'+esc(g[0])+'</b>'+esc(g[1]);t.style.display='block';
  const r=el.getBoundingClientRect(),w=t.offsetWidth,h=t.offsetHeight;let x=Math.min(Math.max(8,r.left),innerWidth-w-8),y=r.bottom+8;if(y+h>innerHeight-8)y=r.top-h-8;t.style.left=x+'px';t.style.top=y+'px'}
function hideTip(){const t=tip();if(t)t.style.display='none'}
function wireTerms(root=document){$$('.term',root).forEach(el=>{if(el._t)return;el._t=1;el.tabIndex=0;el.setAttribute('role','button');
  const g=GL[el.dataset.t]||['',''];el.setAttribute('aria-label',el.textContent+'. '+g[0]+': '+g[1]);
  el.addEventListener('mouseenter',()=>showTip(el));el.addEventListener('mouseleave',hideTip);el.addEventListener('focus',()=>showTip(el));el.addEventListener('blur',hideTip);
  el.addEventListener('click',e=>{e.stopPropagation();showTip(el)})})}

/* ---------- lienzo base ---------- */
function chart(id,draw,opts={}){const wrap=document.getElementById(id);if(!wrap)return null;const old=charts[id];if(old&&old.ro)old.ro.disconnect();
  const cv=$('canvas',wrap),tt=$('.tt',wrap),c={wrap,cv,tt,draw,hover:null,opts};
  c.render=()=>{if(!wrap.isConnected)return;const r=wrap.getBoundingClientRect();if(r.width<10||r.height<10)return;const dpr=window.devicePixelRatio||1;
    const W=Math.round(r.width),H=Math.round(r.height);if(cv.width!==Math.round(W*dpr)||cv.height!==Math.round(H*dpr)){cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr)}
    const g=cv.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,W,H);c.W=W;c.H=H;g.lineJoin='round';try{draw(g,W,H,c)}catch(e){console.warn('gráfico',id,e)}};
  c.ro=new ResizeObserver(()=>c.render());c.ro.observe(wrap);
  cv.addEventListener('mousemove',e=>{const r=cv.getBoundingClientRect();c.hover={x:e.clientX-r.left,y:e.clientY-r.top};c.render()});
  cv.addEventListener('mouseleave',()=>{c.hover=null;if(tt)tt.style.display='none';c.render()});
  charts[id]=c;return c}
function fsz(m=.8){return Math.max(12,parseFloat(getComputedStyle(document.documentElement).fontSize)*m)}
function font(g,m=.8,w=''){const f=fsz(m);g.font=(w?w+' ':'')+f+'px '+css('--f-num');return f}
function showTT(c,html,x,y){const tt=c.tt;tt.innerHTML=html;tt.style.display='block';const w=tt.offsetWidth,h=tt.offsetHeight;
  let L=x+14;if(L+w>c.W-4)L=x-w-14;let Tp=y-h-10;if(Tp<4)Tp=y+14;tt.style.left=Math.max(4,L)+'px';tt.style.top=Math.max(2,Math.min(c.H-h-4,Tp))+'px'}
function niceTicks(lo,hi,n=5){const sp=(hi-lo)||1,st0=sp/n,mag=Math.pow(10,Math.floor(Math.log10(st0))),r=st0/mag,st=(r<1.5?1:r<3?2:r<7?5:10)*mag;const out=[];for(let v=Math.ceil(lo/st)*st;v<=hi+1e-9;v+=st)out.push(+v.toFixed(10));return out}
function rgba(v,a){return 'rgba('+css(v)+','+a+')'}
function rejillaH(g,L,R,y,fuerte){g.strokeStyle=fuerte?rgba('--linea-rgb',.35):rgba('--veta-rgb',.35);g.lineWidth=1;g.beginPath();g.moveTo(L,Math.round(y)+.5);g.lineTo(R,Math.round(y)+.5);g.stroke()}
function vacioCv(id,txt){const o=charts[id];if(o){o.ro&&o.ro.disconnect();delete charts[id]}const w=document.getElementById(id);if(w)w.innerHTML='<div class="vacio">'+esc(txt)+'</div>'}
