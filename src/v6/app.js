(function(){
"use strict";
/* =====================================================================
   MEGA CUEVA TESTER · v6 — base: v5 fusionada. Contrato de datos v3 (docs/CONTRATO_V3.md).
   D = resultados de TU prueba (motor, guardados en sessionStorage) o la demo incrustada (D_DEMO).
   ===================================================================== */
const D=(()=>{try{const s=sessionStorage.getItem('mct_res');if(s){const j=JSON.parse(s);if(j&&j.trades&&j.f1)return j}}catch(e){}return D_DEMO})(), ES_DEMO=D===D_DEMO;
const SPEC_RES=(()=>{if(ES_DEMO)return null;try{return JSON.parse(sessionStorage.getItem('mct_spec_res')||'null')}catch(e){return null}})();
/* ---------- utilidades ---------- */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const nf=(x,d=2)=>{if(x==null||!isFinite(x))return '—';const s=Math.abs(x).toFixed(d);let [i,f]=s.split('.');i=i.replace(/\B(?=(\d{3})+(?!\d))/g,'.');return (x<0&&+s!==0?'−':'')+i+(f?','+f:'')};
const pct=(x,d=1,sg=true)=>x==null||!isFinite(x)?'—':(x>0&&sg?'+':'')+nf(x*100,d)+' %';
const usd=(x,d=0,sg=false)=>x==null||!isFinite(x)?'—':(x>0&&sg?'+':'')+nf(x,d)+' USD';
const kUsd=v=>Math.abs(v)>=1000?nf(v/1000,0)+'k':nf(v,0);
const fd=s=>String(s).slice(0,10).split('-').reverse().join('-');
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const ts=s=>Date.parse(String(s).slice(0,10)+'T00:00:00Z');
const store={get(k){try{return localStorage.getItem('tis5_'+k)}catch(e){return null}},set(k,v){try{localStorage.setItem('tis5_'+k,v)}catch(e){}}};
const CMPS={'>':'>','<':'<','>=':'≥','<=':'≤','cruza_arriba':'cruza ↑','cruza_abajo':'cruza ↓','x_factor':'×'};
const RM=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
const yr=s=>String(s).slice(0,4);

const T=D.trades, F1=D.f1, IS=F1.IS, OOS=F1.OOS, FULL=D.full, E=D.estado||{}, U=T[T.length-1];
const SPLIT=D.split, splitT=ts(SPLIT);
const CU=D.cuenta||{}, CAP=CU.capital||100000;
const eqT=D.eq.map(p=>ts(p[0])), eqV=D.eq.map(p=>p[1]*CAP);
const idxAt=t=>{let lo=0,hi=eqT.length-1;while(lo<hi){const m=(lo+hi)>>1;if(eqT[m]<t)lo=m+1;else hi=m}return lo};
T.forEach(t=>{t.ei=idxAt(ts(t.fo));if(t.ret_usd==null)t.ret_usd=t.ret*CAP});
const yearsPos=(D.anual||[]).filter(a=>a.ret>0).length;
const nPass=Object.values(D.fases).filter(Boolean).length;
const NOMBRE=ES_DEMO?'Oro RSI(4) 25/55':((SPEC_RES&&SPEC_RES.nombre)||'Tu estrategia');
const SIMB=ES_DEMO?'XAUUSD':((SPEC_RES&&SPEC_RES.activo&&SPEC_RES.activo.simbolo)||'');
const PC={F1:'var(--f1)',F2:'var(--f2)',F3:'var(--f3)',F4:'var(--f4)',F5:'var(--f5)',PAR:'var(--fmt)'};

/* velas completas: lista de objetos {t,o,h,l,c,rsi,sma} (o columnas) → lista normalizada */
const VF=(()=>{let v=D.velas_full;if(v&&!Array.isArray(v)&&v.t)v=v.t.map((t,i)=>({t,o:v.o[i],h:v.h[i],l:v.l[i],c:v.c[i],rsi:v.rsi?v.rsi[i]:null,sma:v.sma?v.sma[i]:null}));
  if(!Array.isArray(v)||!v.length)v=D.velas||[];return v})();
const vfIdx={};VF.forEach((v,i)=>vfIdx[v.t]=i);
const vfAt=s=>{if(vfIdx[s]!=null)return vfIdx[s];const t=ts(s);let lo=0,hi=VF.length-1;while(lo<hi){const m=(lo+hi)>>1;if(ts(VF[m].t)<t)lo=m+1;else hi=m}return lo};
/* umbrales de RSI de la regla (para la banda del gráfico) */
const RSI_TH=(()=>{const sp=ES_DEMO?{reglas:{entrada:[{izq:{tipo:'rsi'},op:'<',der:{tipo:'num',valor:25}}],salida:[{izq:{tipo:'rsi'},op:'>',der:{tipo:'num',valor:55}}]}}:SPEC_RES;
  const f=g=>{const b=sp&&sp.reglas&&(sp.reglas[g]||[]).find(c=>c.izq&&c.izq.tipo==='rsi'&&c.der&&c.der.tipo==='num');return b?+b.der.valor:null};return{e:f('entrada'),s:f('salida')}})();
/* extremos por año (v3) o derivados */
const EXT=D.extremos_por_anio||(()=>{const g={};T.forEach(t=>{const y=+yr(t.fi);(g[y]=g[y]||[]).push(t)});return Object.keys(g).map(y=>{const L=g[y];const b=L.reduce((a,c)=>c.ret>a.ret?c:a),w=L.reduce((a,c)=>c.ret<a.ret?c:a);return{anio:+y,mejor:{n:b.n,fi:b.fi,ret:b.ret},peor:{n:w.n,fi:w.fi,ret:w.ret}}})})();
const ST=D.stats_trades||null;

/* ---------- glosario ---------- */
const GL={
 pf:['Factor de beneficio (PF)','Lo ganado en las ganadoras dividido por lo perdido en las perdedoras. Por encima de 1 gana dinero; TIS pide al menos 1,3 en la prueba honesta.'],
 oos:['Prueba honesta (fuera de muestra)','Datos que NO se usaron para diseñar la regla. Así se habría comportado con datos «nuevos».'],
 is:['Diseño (dentro de muestra)','Tramo con el que se diseñó la regla. Sus resultados son optimistas por definición.'],
 dd:['Caída máxima (drawdown)','La mayor bajada del capital desde un máximo hasta el mínimo posterior: el peor mal trago.'],
 rsi:['RSI(4)','Oscilador de 0 a 100 sobre los últimos 4 días. Bajo 25 = ha caído mucho en muy pocos días; sobre 55 = ya ha rebotado.'],
 sma:['Media de 200 días (SMA 200)','Precio medio de las últimas 200 sesiones. Si el cierre está por encima, la tendencia de fondo es alcista.'],
 expo:['Tiempo invertido','Porcentaje de días con posición abierta. El resto del tiempo el dinero está parado.'],
 cagr:['Rentabilidad anual (CAGR)','Crecimiento medio compuesto por año del capital.'],
 wf:['Walk-forward','Se ajusta con los años anteriores y se prueba en el siguiente, una y otra vez. Simula usarla en tiempo real.'],
 ef:['Eficiencia walk-forward','Lo que rinde en los años de prueba dividido por lo que rinde al ajustar. Se pide al menos 0,50.'],
 mc:['Monte Carlo','Se barajan las operaciones miles de veces para ver qué caídas eran posibles con otra suerte.'],
 mes:['Meseta de parámetros','Se prueban valores vecinos. Una regla robusta da resultados parecidos alrededor: meseta, no pico.'],
 st:['Stress','Se empeoran las condiciones a propósito: costes dobles, sin los 2 mejores años, régimen malo.'],
 pfsm:['PF sin la mejor operación','El factor de beneficio quitando la operación más rentable. Si sigue por encima de 1, no depende de un golpe de suerte.'],
 mfe:['MFE (excursión a favor)','Lo máximo que llegó a ir a favor la operación antes de cerrarse.'],
 mae:['MAE (excursión en contra)','Lo máximo que llegó a ir en contra la operación antes de cerrarse.'],
 exp:['Expectancy','Ganancia media por operación. Con 100.000 USD y el 100 % del capital por operación.'],
 payoff:['Payoff','Ganancia media de las ganadoras dividida por la pérdida media de las perdedoras.']
};
const tip=$('#tip');
function showTip(el){const g=GL[el.dataset.t];if(!g)return;tip.innerHTML='<b>'+esc(g[0])+'</b><br>'+esc(g[1]);tip.style.display='block';
  const r=el.getBoundingClientRect(),w=tip.offsetWidth,h=tip.offsetHeight;let x=Math.min(Math.max(8,r.left),innerWidth-w-8),y=r.bottom+8;if(y+h>innerHeight-8)y=r.top-h-8;tip.style.left=x+'px';tip.style.top=y+'px'}
function hideTip(){tip.style.display='none'}
function wireTerms(root=document){$$('.term',root).forEach(el=>{if(el._t)return;el._t=1;el.tabIndex=0;el.setAttribute('role','button');el.setAttribute('aria-label',(GL[el.dataset.t]||[''])[0]+': '+((GL[el.dataset.t]||['',''])[1]));
  el.addEventListener('mouseenter',()=>showTip(el));el.addEventListener('mouseleave',hideTip);el.addEventListener('focus',()=>showTip(el));el.addEventListener('blur',hideTip);el.addEventListener('click',e=>{e.stopPropagation();showTip(el)})})}

/* ---------- canvas base ---------- */
const charts={};
function chart(id,draw){if(charts[id]&&charts[id].wrap===$('#'+id)){charts[id].draw=draw;return charts[id]}
  const wrap=$('#'+id),cv=$('canvas',wrap),tt=$('.tt',wrap),c={wrap,cv,tt,draw,hover:null};
  c.render=()=>{const r=wrap.getBoundingClientRect();if(r.width<10||r.height<10)return;const dpr=window.devicePixelRatio||1;
    const W=Math.round(r.width),H=Math.round(r.height);if(cv.width!==Math.round(W*dpr)||cv.height!==Math.round(H*dpr)){cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr)}
    const g=cv.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,W,H);c.W=W;c.H=H;g.lineWidth=1;g.setLineDash([]);c.draw(g,W,H,c)};
  new ResizeObserver(()=>c.render()).observe(wrap);
  cv.addEventListener('mousemove',e=>{const r=cv.getBoundingClientRect();c.hover={x:e.clientX-r.left,y:e.clientY-r.top};c.render()});
  cv.addEventListener('mouseleave',()=>{c.hover=null;tt.style.display='none';c.render()});
  charts[id]=c;return c}
function renderAll(){Object.values(charts).forEach(c=>c.render())}
function fsz(m=.78){return Math.max(12,parseFloat(getComputedStyle(document.documentElement).fontSize)*m)}
function showTT(c,html,x,y){const tt=c.tt;tt.innerHTML=html;tt.style.display='block';const w=tt.offsetWidth,h=tt.offsetHeight;
  let L=x+14;if(L+w>c.W-4)L=x-w-14;let Tp=y-h-10;if(Tp<4)Tp=y+14;tt.style.left=Math.max(4,L)+'px';tt.style.top=Math.max(2,Math.min(c.H-h-4,Tp))+'px'}
function niceTicks(lo,hi,n=5){const sp=(hi-lo)||1,st0=sp/n,mag=Math.pow(10,Math.floor(Math.log10(st0))),r=st0/mag,st=(r<1.5?1:r<3?2:r<7?5:10)*mag;const out=[];for(let v=Math.ceil(lo/st)*st;v<=hi+1e-9;v+=st)out.push(+v.toFixed(10));return out}
function rgba(v,a){return 'rgba('+css(v)+','+a+')'}
function okc(x){return x>0?css('--ok'):css('--red')}

/* ---------- curva de capital (USD) ---------- */
const eqState={range:'all',ops:true,sel:null};
function eqRange(r){const last=eqT[eqT.length-1];if(r==='is')return[eqT[0],splitT];if(r==='oos')return[splitT,last];if(r==='10')return[last-10*365.25*864e5,last];if(r==='3')return[last-3*365.25*864e5,last];return[eqT[0],last]}
function drawEq(g,W,H,c){
  const compact=c.compact, st=compact?{range:'all',ops:false,sel:null}:eqState;
  const f=fsz(compact?.78:.8);g.font=f+'px '+css('--f-mono');
  const [t0,t1]=eqRange(st.range);let i0=idxAt(t0),i1=idxAt(t1);if(eqT[i1]>t1&&i1>i0)i1--;
  const L=f*4,R=14,Tp=compact?10:16,B=f*2;
  const ph=compact?H-Tp-B:(H-Tp-B)*.72, dTop=Tp+ph+f*1.4, dh=compact?0:H-B-dTop;
  let lo=1e12,hi=-1e12;for(let i=i0;i<=i1;i++){lo=Math.min(lo,eqV[i]);hi=Math.max(hi,eqV[i])}const pad=(hi-lo)*.08||CAP*.05;lo-=pad;hi+=pad;
  const X=t=>L+(t-eqT[i0])/(eqT[i1]-eqT[i0]||1)*(W-L-R), Y=v=>Tp+(hi-v)/(hi-lo)*ph;
  let hon=null;let ddLo=0;for(let i=i0;i<=i1;i++)ddLo=Math.min(ddLo,D.dd[i]);ddLo=Math.min(ddLo*1.1,-.02);const YD=v=>dTop+(v/ddLo)*dh;
  if(splitT<eqT[i1]){const xs=Math.max(L,X(splitT));g.fillStyle=rgba('--gold-rgb',.07);g.fillRect(xs,Tp,W-R-xs,compact?ph:H-B-Tp);
    g.strokeStyle=rgba('--gold-rgb',.55);g.setLineDash([4,4]);g.beginPath();g.moveTo(xs,Tp);g.lineTo(xs,compact?Tp+ph:H-B);g.stroke();g.setLineDash([]);
    g.fillStyle=css('--gold2');g.textAlign='left';g.textBaseline='alphabetic';g.fillText('PRUEBA HONESTA →',xs+6,Tp+f*1.1);hon={x0:xs+6,x1:xs+6+g.measureText('PRUEBA HONESTA →').width,y1:Tp+f*1.4}}
  if(eqT[i0]<splitT){g.fillStyle=css('--dim2');g.textAlign='left';g.fillText('DISEÑO',L+6,Tp+f*1.1)}
  g.textAlign='right';g.textBaseline='middle';
  niceTicks(lo,hi,compact?4:5).forEach(v=>{const y=Y(v);g.strokeStyle=rgba('--cy-rgb',.1);g.beginPath();g.moveTo(L,y);g.lineTo(W-R,y);g.stroke();g.fillStyle=css('--dim2');g.fillText(kUsd(v),L-6,y)});
  if(!compact){[0,ddLo/1.1/2,ddLo/1.1].forEach(v=>{const y=YD(v);g.strokeStyle=rgba('--cy-rgb',.08);g.beginPath();g.moveTo(L,y);g.lineTo(W-R,y);g.stroke();g.fillStyle=css('--dim2');g.fillText(pct(v,0,false),L-6,y)});
    g.textAlign='left';g.fillStyle=css('--red2');g.fillText('caída desde el máximo',L+6,dTop-f*.6)}
  g.textAlign='center';g.textBaseline='top';const y0=new Date(eqT[i0]).getUTCFullYear(),y1=new Date(eqT[i1]).getUTCFullYear(),span=y1-y0,stp=span>20?4:span>8?2:1;
  for(let y=Math.ceil(y0/stp)*stp;y<=y1;y+=stp){const t=Date.UTC(y,0,1);if(t<eqT[i0])continue;const x=X(t);g.fillStyle=css('--dim2');g.fillText(String(y),x,H-B+f*.45);g.strokeStyle=rgba('--cy-rgb',.06);g.beginPath();g.moveTo(x,Tp);g.lineTo(x,H-B);g.stroke()}
  const grd=g.createLinearGradient(0,Tp,0,Tp+ph);grd.addColorStop(0,rgba('--cy-rgb',.22));grd.addColorStop(1,rgba('--cy-rgb',0));
  g.beginPath();for(let i=i0;i<=i1;i++){const x=X(eqT[i]),y=Y(eqV[i]);i===i0?g.moveTo(x,y):g.lineTo(x,y)}
  g.lineTo(X(eqT[i1]),Tp+ph);g.lineTo(X(eqT[i0]),Tp+ph);g.closePath();g.fillStyle=grd;g.fill();
  g.beginPath();for(let i=i0;i<=i1;i++){const x=X(eqT[i]),y=Y(eqV[i]);i===i0?g.moveTo(x,y):g.lineTo(x,y)}
  g.strokeStyle=css('--cy');g.lineWidth=compact?2.2:2.2;g.stroke();g.lineWidth=1;
  if(compact){const x=X(eqT[i1]),y=Y(eqV[i1]);g.fillStyle=css('--cy');g.beginPath();g.arc(x,y,4,0,7);g.fill();g.font='700 '+f+'px '+css('--f-mono');g.textAlign='right';g.textBaseline='bottom';g.fillStyle=css('--ink');const lb=nf(eqV[i1],0)+' USD',lw=g.measureText(lb).width;
    /* si choca con «PRUEBA HONESTA →», la cifra final va debajo del punto */
    const ly=hon&&x-6-lw<hon.x1+6&&x-6>hon.x0&&y-6-f<hon.y1?(g.textBaseline='top',y+7):y-6;
    g.strokeStyle=css('--bg');g.lineWidth=4;g.lineJoin='round';g.strokeText(lb,x-6,ly);g.lineWidth=1;g.fillText(lb,x-6,ly)}
  if(!compact){g.beginPath();g.moveTo(X(eqT[i0]),YD(0));for(let i=i0;i<=i1;i++)g.lineTo(X(eqT[i]),YD(D.dd[i]));g.lineTo(X(eqT[i1]),YD(0));g.closePath();
    g.fillStyle=rgba('--red-rgb',.3);g.fill();g.strokeStyle=css('--red');g.lineWidth=1.2;g.stroke();g.lineWidth=1}
  c.pts=[];
  if(st.ops){T.forEach(t=>{if(t.ei<i0||t.ei>i1)return;const x=X(eqT[t.ei]),y=Y(eqV[t.ei]);c.pts.push({t,x,y});g.fillStyle=okc(t.ret);g.beginPath();g.arc(x,y,3.2,0,7);g.fill()})}
  const sel=st.sel!=null?T[st.sel]:null;
  if(sel&&sel.ei>=i0&&sel.ei<=i1){const x=X(eqT[sel.ei]),y=Y(eqV[sel.ei]);g.strokeStyle=css('--ink');g.setLineDash([3,3]);g.beginPath();g.moveTo(x,Tp);g.lineTo(x,H-B);g.stroke();g.setLineDash([]);
    g.lineWidth=2.5;g.beginPath();g.arc(x,y,7,0,7);g.stroke();g.lineWidth=1;g.font='700 '+f+'px '+css('--f-mono');g.textAlign=x>W*.75?'right':'left';g.textBaseline='bottom';g.fillStyle=css('--ink');
    g.fillText('#'+sel.n+' '+pct(sel.ret,2),x+(x>W*.75?-10:10),y-8)}
  if(c.hover&&c.hover.x>=L&&c.hover.x<=W-R){let best=null,bd=1e9;c.pts.forEach(p=>{const d=Math.hypot(p.x-c.hover.x,p.y-c.hover.y);if(d<bd){bd=d;best=p}});
    if(best&&bd<9){c.cv.style.cursor='pointer';const t=best.t;c.hovT=t;g.strokeStyle=css('--ink');g.beginPath();g.arc(best.x,best.y,6,0,7);g.stroke();
      showTT(c,'<b>Operación #'+t.n+'</b> · '+(t.oos?'prueba':'diseño')+'<br>'+fd(t.fi)+' → '+fd(t.fo)+'<br>resultado <b class="'+(t.ret>0?'pos':'neg')+'">'+pct(t.ret,2)+'</b> · '+usd(t.ret_usd,0,true),best.x,best.y);return}
    c.hovT=null;c.cv.style.cursor=compact?'pointer':'crosshair';
    const tm=eqT[i0]+(c.hover.x-L)/(W-L-R)*(eqT[i1]-eqT[i0]);let i=Math.min(i1,Math.max(i0,idxAt(tm)));const x=X(eqT[i]);
    g.strokeStyle=rgba('--cy-rgb',.7);g.beginPath();g.moveTo(x,Tp);g.lineTo(x,compact?Tp+ph:H-B);g.stroke();g.fillStyle=css('--ink');g.beginPath();g.arc(x,Y(eqV[i]),4,0,7);g.fill();
    showTT(c,'<b>'+fd(D.eq[i][0])+'</b><br>capital <b>'+usd(eqV[i])+'</b>'+(compact?'':'<br>caída <b class="neg">'+pct(D.dd[i],1,false)+'</b>'),x,Y(eqV[i]))}
  else{c.hovT=null}
}

/* ---------- barras anuales (verde / rojo) ---------- */
function drawAnual(g,W,H,c){const A=D.anual||[];if(!A.length)return;const f=fsz(.74);g.font=f+'px '+css('--f-mono');const L=f*3.6,R=8,Tp=10,B=f*1.8;
  let lo=Math.min(0,...A.map(a=>a.ret)),hi=Math.max(0,...A.map(a=>a.ret));lo*=1.1;hi*=1.1;const Y=v=>Tp+(hi-v)/(hi-lo||1)*(H-Tp-B),bw=(W-L-R)/A.length;
  g.textAlign='right';g.textBaseline='middle';niceTicks(lo,hi,4).forEach(v=>{const y=Y(v);g.strokeStyle=rgba('--cy-rgb',v===0?.4:.08);g.beginPath();g.moveTo(L,y);g.lineTo(W-R,y);g.stroke();g.fillStyle=css('--dim2');g.fillText(pct(v,0,false),L-5,y)});
  let hv=-1;if(c.hover)hv=Math.floor((c.hover.x-L)/bw);
  const sy=+yr(SPLIT);
  A.forEach((a,i)=>{const x=L+i*bw+bw*.15,w=bw*.7,y=Y(Math.max(0,a.ret)),h=Math.abs(Y(a.ret)-Y(0));g.fillStyle=okc(a.ret);g.globalAlpha=hv===i?1:(a.y>=sy?.95:.65);g.fillRect(x,y,w,Math.max(1,h));g.globalAlpha=1;
    if(a.y%4===0||i===A.length-1){g.fillStyle=css('--dim2');g.textAlign='center';g.textBaseline='top';g.fillText("'"+String(a.y).slice(2),x+w/2,H-B+f*.35)}});
  if(hv>=0&&hv<A.length){const a=A[hv];showTT(c,'<b>'+a.y+'</b> · '+a.n+' op.<br>resultado <b class="'+(a.ret>0?'pos':'neg')+'">'+pct(a.ret,1)+'</b>',L+hv*bw+bw/2,Y(Math.max(0,a.ret)))}else c.tt.style.display='none'}

/* ---------- velas (genérico: últimas velas o ventana de una operación) ---------- */
function ventana(t){const n=VF.length;const a=vfAt(t.fi),b=Math.max(a,vfAt(t.fo));const pad=Math.max(25,Math.round((b-a)*1.3));return{V:VF.slice(Math.max(0,a-pad),Math.min(n,b+Math.max(18,Math.round(pad*.6))+1)),sel:t}}
function ultimas(){return{V:VF.length?VF.slice(-170):[],sel:null}}
function xLabels(g,V,X,H,B,f,Tp){const n=V.length,minPx=f*4.6;let lastX=-1e9,pm='';
  for(let i=0;i<n;i++){const t=V[i].t,key=n>700?t.slice(0,4):n>60?t.slice(0,7):t;const isNew=key!==pm;pm=key;if(!isNew)continue;const x=X(i);if(x-lastX<minPx)continue;lastX=x;
    const lab=n>700?t.slice(0,4):n>60?t.slice(5,7)+'/'+t.slice(2,4):t.slice(8,10)+'/'+t.slice(5,7);
    g.fillStyle=css('--dim2');g.textAlign='center';g.textBaseline='top';g.fillText(lab,x,H-B+f*.35);g.strokeStyle=rgba('--cy-rgb',.06);g.beginPath();g.moveTo(x,Tp);g.lineTo(x,H-B);g.stroke()}}
function drawVelas(g,W,H,c){const S=c.src();const V=S.V;if(!V.length){g.fillStyle=css('--dim');g.font=fsz(.9)+'px '+css('--f-body');g.fillText('Sin velas en los datos.',20,30);return}
  const f=fsz(.74);g.font=f+'px '+css('--f-mono');const n=V.length,hasR=V.some(v=>v.rsi!=null);
  const L=8,R=f*6.2,Tp=8,B=f*1.8,gap=f*1.2,ph=hasR?(H-Tp-B-gap)*.7:(H-Tp-B),rTop=Tp+ph+gap,rh=H-B-rTop;
  let lo=1e12,hi=-1e12;V.forEach(v=>{lo=Math.min(lo,v.l,v.sma??v.l);hi=Math.max(hi,v.h,v.sma??v.h)});const sel=S.sel;
  if(sel){lo=Math.min(lo,sel.pi,sel.po);hi=Math.max(hi,sel.pi,sel.po)}const p=(hi-lo)*.07;lo-=p;hi+=p;
  const bw=(W-L-R)/n,X=i=>L+bw*(i+.5),Y=v=>Tp+(hi-v)/(hi-lo)*ph,YR=v=>rTop+(100-v)/100*rh;
  const loc={};V.forEach((v,i)=>loc[v.t]=i);const t0=V[0].t,t1=V[n-1].t;
  const at=s=>{if(loc[s]!=null)return loc[s];if(s<t0)return -1;if(s>t1)return n;let k=0;while(k<n-1&&V[k].t<s)k++;return k};
  g.textAlign='left';g.textBaseline='middle';niceTicks(lo,hi,5).forEach(v=>{const y=Y(v);g.strokeStyle=rgba('--cy-rgb',.08);g.beginPath();g.moveTo(L,y);g.lineTo(W-R,y);g.stroke();g.fillStyle=css('--dim2');g.fillText(nf(v,v<100?2:0),W-R+6,y)});
  xLabels(g,V,X,H,B,f,Tp);
  const trs=T.filter(t=>t.fi<=t1&&t.fo>=t0);c.mk=[];
  trs.forEach(t=>{const a=Math.max(0,at(t.fi)),b=Math.min(n-1,at(t.fo));const s=sel&&sel.n===t.n;g.fillStyle=t.ret>0?rgba('--ok-rgb',s?.16:.08):rgba('--red-rgb',s?.16:.09);g.fillRect(X(a)-bw/2,Tp,X(b)-X(a)+bw,ph)});
  const w=Math.max(1,bw*.64);V.forEach((v,i)=>{const up=v.c>=v.o;g.strokeStyle=up?css('--cy'):css('--red');g.beginPath();g.moveTo(X(i),Y(v.h));g.lineTo(X(i),Y(v.l));g.stroke();
    const y1=Y(Math.max(v.o,v.c)),y2=Y(Math.min(v.o,v.c));g.fillStyle=up?rgba('--cy-rgb',.85):rgba('--red-rgb',.85);g.fillRect(X(i)-w/2,y1,w,Math.max(1,y2-y1))});
  g.beginPath();let st=false;V.forEach((v,i)=>{if(v.sma==null)return;st?g.lineTo(X(i),Y(v.sma)):g.moveTo(X(i),Y(v.sma));st=true});g.strokeStyle=css('--gold');g.lineWidth=2;g.stroke();g.lineWidth=1;
  const lsm=[...V].reverse().find(v=>v.sma!=null);if(lsm){g.fillStyle=css('--gold2');g.textAlign='right';g.textBaseline='bottom';g.fillText('media 200 · '+nf(lsm.sma,2),W-R-4,Y(lsm.sma)-5)}
  trs.forEach(t=>{const isSel=sel&&sel.n===t.n;[['fi',1],['fo',0]].forEach(([k,isE])=>{const i=at(t[k]);if(i<0||i>=n)return;const v=V[i],x=X(i),y=isE?Y(v.l)+11:Y(v.h)-11,s=isSel?10:7;
      g.fillStyle=isE?css('--cy2'):okc(t.ret);g.strokeStyle=css('--bg');g.beginPath();if(isE){g.moveTo(x,y-s);g.lineTo(x-s,y+s);g.lineTo(x+s,y+s)}else{g.moveTo(x,y+s);g.lineTo(x-s,y-s);g.lineTo(x+s,y-s)}g.closePath();g.fill();g.stroke();c.mk.push({t,x,y})});
    if(!sel&&n<400){const i=Math.max(0,at(t.fi));g.fillStyle=css('--txt');g.textAlign='left';g.textBaseline='top';g.font='700 '+f+'px '+css('--f-mono');g.fillText('#'+t.n,X(i)-bw/2+2,Tp+2);g.font=f+'px '+css('--f-mono')}});
  if(sel){const a=at(sel.fi),b=at(sel.fo);if(a>=0&&a<n){const xa=X(a),xb=X(Math.min(n-1,b));g.strokeStyle=css('--cy2');g.setLineDash([5,4]);g.beginPath();g.moveTo(xa,Y(sel.pi));g.lineTo(xb,Y(sel.pi));g.stroke();
      g.strokeStyle=okc(sel.ret);g.beginPath();g.moveTo(xb,Y(sel.po));g.lineTo(Math.min(W-R,xb+bw*4),Y(sel.po));g.stroke();g.setLineDash([]);
      g.font='700 '+f+'px '+css('--f-mono');const lab=(txt,x,y,col,al)=>{g.textAlign=al;g.textBaseline='middle';const tw=g.measureText(txt).width;const bx=al==='right'?x-tw-8:x;g.fillStyle=css('--pan2');g.fillRect(bx,y-f*.8,tw+8,f*1.6);g.strokeStyle=col;g.strokeRect(bx,y-f*.8,tw+8,f*1.6);g.fillStyle=col;g.fillText(txt,al==='right'?x-4:x+4,y)};
      const eL=xa>W*.28;lab('ENTRADA '+fd(sel.fi)+' · '+nf(sel.pi,2),eL?xa-12:xa+12,Y(sel.pi)+(eL?0:f*1.7),css('--cy2'),eL?'right':'left');
      const sR=xb<W*.66;lab('SALIDA '+fd(sel.fo)+' · '+nf(sel.po,2)+' · '+pct(sel.ret,2),sR?xb+12:xb-12,Y(sel.po)-(sR?0:f*1.7),okc(sel.ret),sR?'left':'right');g.font=f+'px '+css('--f-mono')}}
  else{const lv=V[n-1],yl=Y(lv.c);g.fillStyle=css('--ink');g.fillRect(W-R+2,yl-f*.75,R-4,f*1.5);g.fillStyle=css('--bg');g.textAlign='left';g.textBaseline='middle';g.font='700 '+f+'px '+css('--f-mono');g.fillText(nf(lv.c,lv.c<100?2:0),W-R+5,yl);g.font=f+'px '+css('--f-mono')}
  if(hasR){if(RSI_TH.e!=null){g.fillStyle=rgba('--ok-rgb',.1);g.fillRect(L,YR(RSI_TH.e),W-L-R,YR(0)-YR(RSI_TH.e))}
    [[RSI_TH.e,' compra',css('--ok')],[RSI_TH.s,' venta',css('--cy2')]].forEach(([v,l,col])=>{if(v==null)return;g.strokeStyle=col;g.setLineDash([4,4]);g.beginPath();g.moveTo(L,YR(v));g.lineTo(W-R,YR(v));g.stroke();g.setLineDash([]);g.fillStyle=col;g.textAlign='left';g.textBaseline='middle';g.fillText(v+l,W-R+6,YR(v))});
    g.strokeStyle=rgba('--cy-rgb',.25);g.strokeRect(L,rTop,W-L-R,rh);
    g.beginPath();st=false;V.forEach((v,i)=>{if(v.rsi==null)return;st?g.lineTo(X(i),YR(v.rsi)):g.moveTo(X(i),YR(v.rsi));st=true});g.strokeStyle=css('--cy2');g.lineWidth=1.6;g.stroke();g.lineWidth=1;
    g.fillStyle=css('--dim');g.textAlign='left';g.textBaseline='top';g.fillText('RSI'+(ES_DEMO?'(4)':''),L+6,rTop+4)}
  c.cv.style.cursor='crosshair';c.hovT=null;
  if(c.hover){let hit=null;c.mk.forEach(m=>{if(Math.hypot(m.x-c.hover.x,m.y-c.hover.y)<13)hit=m});
    if(hit){c.cv.style.cursor='pointer';c.hovT=hit.t;const t=hit.t;showTT(c,'<b>Operación #'+t.n+'</b><br>entrada '+fd(t.fi)+' · '+nf(t.pi,2)+'<br>salida '+fd(t.fo)+' · '+nf(t.po,2)+'<br>resultado <b class="'+(t.ret>0?'pos':'neg')+'">'+pct(t.ret,2)+'</b> · pulsa para verla',hit.x,hit.y);return}
    const i=Math.max(0,Math.min(n-1,Math.floor((c.hover.x-L)/bw)));const v=V[i],x=X(i);
    g.strokeStyle=rgba('--cy-rgb',.6);g.beginPath();g.moveTo(x,Tp);g.lineTo(x,H-B);g.stroke();
    showTT(c,'<b>'+fd(v.t)+'</b><br>apertura '+nf(v.o,2)+' · cierre <b>'+nf(v.c,2)+'</b><br>máx '+nf(v.h,2)+' · mín '+nf(v.l,2)+(v.sma!=null?'<br>media 200 '+nf(v.sma,2):'')+(v.rsi!=null?' · RSI <b>'+nf(v.rsi,1)+'</b>':''),x,c.hover.y)}}

/* ---------- barras por operación ---------- */
const opState={filter:'all',sort:'n',dir:-1,sel:T.length-1};
function drawBars(g,W,H,c){const f=fsz(.72);g.font=f+'px '+css('--f-mono');const L=f*3.6,R=8,Tp=14,B=f*1.7;
  const lo=Math.min(0,...T.map(t=>t.ret))*1.1,hi=Math.max(0,...T.map(t=>t.ret))*1.15,Y=v=>Tp+(hi-v)/(hi-lo||1)*(H-Tp-B),bw=(W-L-R)/T.length;
  const si=T.findIndex(t=>t.oos);if(si>=0){const xs=L+si*bw;g.fillStyle=rgba('--gold-rgb',.07);g.fillRect(xs,Tp,W-R-xs,H-B-Tp);g.fillStyle=css('--gold2');g.textAlign='left';g.textBaseline='top';g.fillText('PRUEBA HONESTA →',xs+4,0)}
  g.textAlign='right';g.textBaseline='middle';niceTicks(lo,hi,4).forEach(v=>{const y=Y(v);g.strokeStyle=rgba('--cy-rgb',v===0?.4:.08);g.beginPath();g.moveTo(L,y);g.lineTo(W-R,y);g.stroke();g.fillStyle=css('--dim2');g.fillText(pct(v,0,false),L-5,y)});
  let hv=c.hover?Math.floor((c.hover.x-L)/bw):-1;if(hv<0||hv>=T.length)hv=-1;
  T.forEach((t,i)=>{const x=L+i*bw,y=Y(Math.max(0,t.ret)),h=Math.max(1,Math.abs(Y(t.ret)-Y(0)));g.fillStyle=okc(t.ret);g.globalAlpha=(i===opState.sel||i===hv)?1:.62;g.fillRect(x+bw*.12,y,Math.max(1,bw*.76),h);g.globalAlpha=1});
  const s=opState.sel;if(s!=null){const x=L+s*bw+bw/2;g.strokeStyle=css('--ink');g.lineWidth=2;g.beginPath();g.moveTo(x,Tp);g.lineTo(x,H-B);g.stroke();g.lineWidth=1}
  g.textBaseline='top';g.fillStyle=css('--dim2');const N=T.length,marks=[1,...[.25,.5,.75].map(p=>Math.round(N*p)),N];marks.forEach(n=>{g.textAlign=n===N?'right':'center';g.fillText('#'+n,n===N?W-R:L+(n-1)*bw+bw/2,H-B+f*.3)});
  c.cv.style.cursor=hv>=0?'pointer':'default';
  if(hv>=0){const t=T[hv];showTT(c,'<b>#'+t.n+'</b> · '+fd(t.fi)+'<br>resultado <b class="'+(t.ret>0?'pos':'neg')+'">'+pct(t.ret,2)+'</b>',L+hv*bw+bw/2,Y(Math.max(0,t.ret)))}c.hv=hv}

/* ---------- validación: gráficos pequeños ---------- */
function drawWF(g,W,H,c){const A=D.wf||[];if(!A.length)return;const f=fsz(.7);g.font=f+'px '+css('--f-mono');const L=f*3.4,R=6,Tp=6,B=f*1.6;
  const lo=Math.min(0,...A.map(a=>a.r))*1.1,hi=Math.max(0,...A.map(a=>a.r))*1.1,Y=v=>Tp+(hi-v)/(hi-lo||1)*(H-Tp-B),bw=(W-L-R)/A.length;
  g.textAlign='right';g.textBaseline='middle';niceTicks(lo,hi,3).forEach(v=>{const y=Y(v);g.strokeStyle=rgba('--cy-rgb',v===0?.4:.08);g.beginPath();g.moveTo(L,y);g.lineTo(W-R,y);g.stroke();g.fillStyle=css('--dim2');g.fillText(pct(v,0,false),L-4,y)});
  let hv=c.hover?Math.floor((c.hover.x-L)/bw):-1;
  A.forEach((a,i)=>{g.fillStyle=okc(a.r);g.globalAlpha=hv===i?1:.78;g.fillRect(L+i*bw+bw*.15,Y(Math.max(0,a.r)),bw*.7,Math.max(1,Math.abs(Y(a.r)-Y(0))));g.globalAlpha=1;
    if(i%6===0||i===A.length-1){g.fillStyle=css('--dim2');g.textAlign='center';g.textBaseline='top';g.fillText(a.o,L+i*bw+bw/2,H-B+f*.3)}});
  if(hv>=0&&hv<A.length){const a=A[hv];showTT(c,'<b>'+a.o+'</b> (año de prueba)<br>resultado <b>'+pct(a.r,1)+'</b> · '+a.n+' op.',L+hv*bw+bw/2,Y(Math.max(0,a.r)))}else c.tt.style.display='none'}
function drawMC(g,W,H,c){const M=D.mc;if(!M||!M.hist)return;const f=fsz(.7);g.font=f+'px '+css('--f-mono');const L=8,R=8,Tp=f*4,B=f*1.6,hb=M.hist,bn=M.bins,mx=Math.max(...hb);
  const x0=bn[0],x1=bn[bn.length-1],X=v=>L+(v-x0)/(x1-x0)*(W-L-R),Y=v=>Tp+(1-v/mx)*(H-Tp-B);
  hb.forEach((h,i)=>{const a=X(bn[i]),b=X(bn[i+1]);g.fillStyle=bn[i+1]<=0?css('--red'):css('--f4');g.globalAlpha=.8;g.fillRect(a+.5,Y(h),Math.max(1,b-a-1),H-B-Y(h));g.globalAlpha=1});
  [[0,'0 %',css('--dim'),'right'],[M.p5,'peor 5 %: '+pct(M.p5,1),css('--gold'),'left'],[M.p50,'mediana '+pct(M.p50,0),css('--ink'),'left']].forEach(([v,l,col,al],k)=>{const x=X(v);g.strokeStyle=col;g.setLineDash([4,3]);g.beginPath();g.moveTo(x,Tp-2);g.lineTo(x,H-B);g.stroke();g.setLineDash([]);
    g.fillStyle=col;g.textAlign=al;g.textBaseline='top';g.fillText(l,x+(al==='right'?-4:4),2+k*f*1.25)});
  g.fillStyle=css('--dim2');g.textAlign='center';g.textBaseline='top';niceTicks(x0,x1,4).forEach(v=>g.fillText(pct(v,0,false),X(v),H-B+f*.3));
  if(c.hover){const v=x0+(c.hover.x-L)/(W-L-R)*(x1-x0),i=Math.max(0,Math.min(hb.length-1,Math.floor((v-x0)/(x1-x0)*hb.length)));showTT(c,'retorno total entre <b>'+pct(bn[i],0)+'</b> y <b>'+pct(bn[i+1],0)+'</b><br>'+hb[i]+' simulaciones',c.hover.x,c.hover.y)}}

/* ---------- MFE / MAE ---------- */
const MF=T.filter(t=>t.mfe_pct!=null&&t.mae_pct!=null);
function drawMFE(g,W,H,c){if(!MF.length){g.fillStyle=css('--dim');g.font=fsz(.85)+'px '+css('--f-body');g.fillText('Sin datos de MFE/MAE.',12,24);return}
  const f=fsz(.7);g.font=f+'px '+css('--f-mono');const L=f*3.6,R=10,Tp=10,B=f*2.6;
  const xl=Math.min(...MF.map(t=>t.mae_pct))*1.08,yh=Math.max(...MF.map(t=>t.mfe_pct))*1.08;
  const X=v=>L+(v-xl)/(0-xl)*(W-L-R),Y=v=>Tp+(yh-v)/yh*(H-Tp-B);
  g.textAlign='right';g.textBaseline='middle';niceTicks(0,yh,4).forEach(v=>{const y=Y(v);g.strokeStyle=rgba('--cy-rgb',.08);g.beginPath();g.moveTo(L,y);g.lineTo(W-R,y);g.stroke();g.fillStyle=css('--dim2');g.fillText(pct(v,0,false),L-4,y)});
  g.textAlign='center';g.textBaseline='top';niceTicks(xl,0,4).forEach(v=>{const x=X(v);g.strokeStyle=rgba('--cy-rgb',.08);g.beginPath();g.moveTo(x,Tp);g.lineTo(x,H-B);g.stroke();g.fillStyle=css('--dim2');g.fillText(pct(v,0,false),x,H-B+f*.3)});
  g.fillStyle=css('--dim');g.fillText('MAE · en contra',L+(W-L-R)/2,H-B+f*1.4);
  const mm=ST?[ST.mae_medio,ST.mfe_medio]:[MF.reduce((a,t)=>a+t.mae_pct,0)/MF.length,MF.reduce((a,t)=>a+t.mfe_pct,0)/MF.length];
  g.strokeStyle=css('--gold');g.setLineDash([5,4]);g.beginPath();g.moveTo(X(mm[0]),Tp);g.lineTo(X(mm[0]),H-B);g.moveTo(L,Y(mm[1]));g.lineTo(W-R,Y(mm[1]));g.stroke();g.setLineDash([]);
  g.fillStyle=css('--gold2');g.textAlign='left';g.textBaseline='bottom';g.fillText('medias',X(mm[0])+4,Tp+f*1.2);
  c.pts=MF.map(t=>({t,x:X(t.mae_pct),y:Y(t.mfe_pct)}));
  c.pts.forEach(p=>{g.fillStyle=okc(p.t.ret);g.globalAlpha=.75;g.beginPath();g.arc(p.x,p.y,3.6,0,7);g.fill();g.globalAlpha=1});
  c.hovT=null;c.cv.style.cursor='default';
  if(c.hover){let best=null,bd=1e9;c.pts.forEach(p=>{const d=Math.hypot(p.x-c.hover.x,p.y-c.hover.y);if(d<bd){bd=d;best=p}});
    if(best&&bd<10){const t=best.t;c.hovT=t;c.cv.style.cursor='pointer';g.strokeStyle=css('--ink');g.lineWidth=2;g.beginPath();g.arc(best.x,best.y,7,0,7);g.stroke();g.lineWidth=1;
      showTT(c,'<b>#'+t.n+'</b> · '+fd(t.fi)+'<br>a favor <b class="pos">'+pct(t.mfe_pct,1)+'</b> · en contra <b class="neg">'+pct(t.mae_pct,1)+'</b><br>resultado <b class="'+(t.ret>0?'pos':'neg')+'">'+pct(t.ret,2)+'</b> · pulsa: ver en velas',best.x,best.y)}else c.tt.style.display='none'}}

/* ---------- estadísticas por día / mes / duración ---------- */
let statMode='dia';
function statData(){if(!ST)return null;
  if(statMode==='dia')return(ST.por_dia_semana||[]).map(d=>({l:String(d.dia).slice(0,3),v:d.ret_medio,n:d.n,x:d.acierto!=null?'acierto '+pct(d.acierto,0,false):''}));
  if(statMode==='mes')return(ST.por_mes||[]).map(d=>({l:String(d.mes).slice(0,3),v:d.ret_medio,n:d.n,x:''}));
  const B=[[1,3],[4,6],[7,10],[11,15],[16,20],[21,30],[31,1e9]],H=ST.duracion_hist||[];
  return B.map(([a,b])=>({l:b>1e8?'>30':a+'–'+b,v:H.filter(h=>h.dias>=a&&h.dias<=b).reduce((s,h)=>s+h.n,0),n:null,x:'',cnt:1}))}
function drawStat(g,W,H,c){const A=statData();if(!A||!A.length){g.fillStyle=css('--dim');g.font=fsz(.85)+'px '+css('--f-body');g.fillText('Sin estadísticas.',12,24);return}
  const cnt=statMode==='dur',f=fsz(.7);g.font=f+'px '+css('--f-mono');const L=f*3.6,R=8,Tp=f*1.4,B=f*2.8;
  const lo=cnt?0:Math.min(0,...A.map(a=>a.v))*1.15,hi=Math.max(0,...A.map(a=>a.v))*1.15||1,Y=v=>Tp+(hi-v)/(hi-lo||1)*(H-Tp-B),bw=(W-L-R)/A.length;
  g.textAlign='right';g.textBaseline='middle';niceTicks(lo,hi,3).forEach(v=>{const y=Y(v);g.strokeStyle=rgba('--cy-rgb',v===0?.4:.08);g.beginPath();g.moveTo(L,y);g.lineTo(W-R,y);g.stroke();g.fillStyle=css('--dim2');g.fillText(cnt?nf(v,0):pct(v,1,false),L-4,y)});
  let hv=c.hover?Math.floor((c.hover.x-L)/bw):-1;if(hv>=A.length)hv=-1;
  A.forEach((a,i)=>{const x=L+i*bw+bw*.18,w=bw*.64;g.fillStyle=cnt?css('--cy'):okc(a.v);g.globalAlpha=hv===i?1:.82;g.fillRect(x,Y(Math.max(0,a.v)),w,Math.max(1,Math.abs(Y(a.v)-Y(0))));g.globalAlpha=1;
    g.fillStyle=css('--txt');g.textAlign='center';g.textBaseline='top';g.fillText(a.l,x+w/2,H-B+f*.3);if(a.n!=null&&bw>f*4){g.fillStyle=css('--dim2');g.fillText(a.n+(bw>f*5.5?' op.':''),x+w/2,H-B+f*1.45)}
    if(cnt){g.fillStyle=css('--ink');g.textBaseline='bottom';g.fillText(a.v,x+w/2,Y(a.v)-2)}});
  g.fillStyle=css('--dim');g.textAlign='left';g.textBaseline='top';g.fillText(cnt?'nº de operaciones · días':'resultado medio',L,0);
  if(hv>=0){const a=A[hv];showTT(c,'<b>'+a.l+'</b><br>'+(cnt?a.v+' operaciones':'media <b class="'+(a.v>0?'pos':'neg')+'">'+pct(a.v,2)+'</b> · '+a.n+' op.'+(a.x?'<br>'+a.x:'')),L+hv*bw+bw/2,Y(Math.max(0,a.v)))}else c.tt.style.display='none'}

/* ---------- árbol de decisión (grande y aireado) ---------- */
const estState={mode:'hoy',op:T.length-1};
const SP_ARB=ES_DEMO?null:SPEC_RES;
const condCorta=L=>L&&L.length?L.map(c=>condTxt(c)).join(' y '):null;
const NODES=(()=>{let q1=ES_DEMO?'¿Cierre sobre la media de 200?':(SP_ARB&&condCorta(SP_ARB.reglas.filtros)?'¿'+condCorta(SP_ARB.reglas.filtros)+'?':'¿Se cumplen los filtros?');
  let q2=ES_DEMO?'¿RSI(4) menor que 25?':'¿'+(SP_ARB&&condCorta(SP_ARB.reglas.entrada)||'Señal de entrada')+'?';
  let q3=ES_DEMO?'¿RSI(4) mayor que 55?':'¿'+(SP_ARB&&condCorta(SP_ARB.reglas.salida)||'Señal de salida')+'?';
  const corto=SP_ARB&&SP_ARB.direccion==='corto';
  /* reglas intradía (sesión, pasos, ejecución al cierre): textos de vela, no de día */
  const intra=!!SP_ARB&&['M5','M15','H1','H4'].includes(SP_ARB.temporalidad),ses=intra&&SP_ARB.sesion,PZ=SP_ARB&&SP_ARB.reglas&&SP_ARB.reglas.pasos||[];
  const alCierre=!!SP_ARB&&SP_ARB.ejecucion&&SP_ARB.ejecucion.momento==='cierre_misma_vela',ejx=alCierre?'al cierre de la vela':'apertura siguiente';
  const G=SP_ARB&&SP_ARB.gestion||{},sal3=[condCorta(SP_ARB&&SP_ARB.reglas.salida),G.stop&&G.stop.tipo&&G.stop.tipo!=='ninguno'?'stop':null,ses&&ses.cerrar_al_final?'fin de sesión':null].filter(Boolean);
  if(PZ.length)q2='¿'+PZ.map(x=>x.nombre||'paso').join(' → ')+(SP_ARB.reglas.entrada.length?' y '+condCorta(SP_ARB.reglas.entrada):'')+'?';
  if(!ES_DEMO&&sal3.length>1)q3='¿'+sal3.join(', ')+'?';
  if(!ES_DEMO&&ses&&!condCorta(SP_ARB.reglas.filtros))q1='¿Dentro de la sesión?';
  const st=ses?{t:'Cierre de vela',s:ses.inicio+'–'+ses.fin}:intra?{t:'Cierre de vela',s:'cada vela'}:{t:'Cierre del día',s:'cada tarde'};
  return{start:{x:0,y:0,w:200,h:132,t:st.t,s:st.s,k:'act'},
   q1:{x:280,y:0,w:300,h:132,t:q1,k:'q'},
   q2:{x:660,y:0,w:290,h:132,t:q2,k:'q'},
   buy:{x:1030,y:0,w:270,h:132,t:corto?'Venta en corto':'Compra',s:ejx,k:'act'},
   fuera:{x:280,y:182,w:300,h:104,t:'Fuera',s:ses?'esta vela no cuenta':'hoy no se opera',k:'stop'},
   esperar:{x:660,y:182,w:290,h:104,t:'Esperar',s:PZ.length?'si caduca, hasta mañana':intra?'la vela siguiente':'mañana se repite',k:'stop'},
   q3:{x:1030,y:176,w:270,h:132,t:q3,k:'q'},
   venta:{x:1030,y:350,w:270,h:104,t:corto?'Recompra':'Venta',s:ejx,k:'act'},
   mant:{x:1380,y:176,w:220,h:132,t:'Mantener',s:intra?'vela siguiente':'mañana vuelve',k:'act'}}})();
const EDGES=[['start','q1',''],['q1','q2','Sí'],['q1','fuera','No'],['q2','buy','Sí'],['q2','esperar','No'],['buy','q3',''],['q3','venta','Sí'],['q3','mant','No'],['mant','q3','loop']];
function edgePath(a,b,kind){const A=NODES[a],B=NODES[b];
  if(kind==='loop'){const y=B.y+B.h-30;return{d:`M${A.x} ${y} L${B.x+B.w+6} ${y}`,nolab:1}}
  if(a==='q3'&&b==='mant'){const y=A.y+34;return{d:`M${A.x+A.w} ${y} L${B.x-6} ${y}`,lx:(A.x+A.w+B.x)/2,ly:y,h:1}}
  if(Math.abs(A.y-B.y)<5){const y=A.y+A.h/2;return{d:`M${A.x+A.w} ${y} L${B.x-6} ${y}`,lx:(A.x+A.w+B.x)/2,ly:y,h:1}}
  const x=A.x+A.w/2;return{d:`M${x} ${A.y+A.h} L${x} ${B.y-6}`,lx:x,ly:(A.y+A.h+B.y)/2,h:0}}
/* parte un texto en líneas que quepan en el nodo (letra legible, nunca por debajo de 26 unidades) */
function lineas(txt,w,fs){const max=Math.max(8,Math.floor((w-28)/(fs*.5)));const out=[];let cur='';
  String(txt).split(/\s+/).forEach(p=>{if(!cur)cur=p;else if((cur+' '+p).length<=max)cur+=' '+p;else{out.push(cur);cur=p}});if(cur)out.push(cur);return out}
function renderTree(){const svg=$('#tree');let on=new Set(),eon=new Set(),sub={},stop=false,txt='';
  const ec=(a,b)=>a+'>'+b;
  if(estState.mode==='hoy'){const RD=E.ruta_detalle,up=ES_DEMO?E.precio>E.sma200:(RD&&RD.length?RD[0].cumple!==false:!(E.ruta&&E.ruta.includes('fuera')));
    on=new Set(['start','q1',up?'q2':'fuera']);eon=new Set([ec('start','q1'),up?ec('q1','q2'):ec('q1','fuera')]);stop=!up;sub.start=E.fecha?fd(E.fecha):'';
    if(ES_DEMO){sub.q1=nf(E.precio,0)+(up?' > ':' < ')+nf(E.sma200,0);
      txt=up?'Hoy el cierre está por encima de la media 200.':'<b>Hoy ('+fd(E.fecha)+')</b>: el oro (<b>'+nf(E.precio,2)+'</b>) está por debajo de su media 200 (<b>'+nf(E.sma200,2)+'</b>). La regla se para en el primer paso: <b class="c-gold">'+esc(E.senal)+'</b>.'}
    else txt='<b>Hoy ('+(E.fecha?fd(E.fecha):'—')+')</b>: <b class="c-gold">'+esc(E.senal||'—')+'</b>.'}
  else{const t=T[estState.op];on=new Set(['start','q1','q2','buy','q3','mant','venta']);
    eon=new Set([ec('start','q1'),ec('q1','q2'),ec('q2','buy'),ec('buy','q3'),ec('q3','mant'),ec('mant','q3'),ec('q3','venta')]);
    sub.q1='sí';sub.q2='sí';sub.buy=fd(t.fi)+' · '+nf(t.pi,2);sub.mant=t.dias+' días';sub.venta=fd(t.fo)+' · '+pct(t.ret,2);sub.start='antes del '+fd(t.fi);
    txt='<b>Operación #'+t.n+'</b> ('+(t.oos?'prueba':'diseño')+'): entra el <b>'+fd(t.fi)+'</b> a '+nf(t.pi,2)+', mantiene '+t.dias+' días y sale el <b>'+fd(t.fo)+'</b> a '+nf(t.po,2)+': <b class="'+(t.ret>0?'pos':'neg')+'">'+pct(t.ret,2)+'</b> ('+usd(t.ret_usd,0,true)+').'}
  const mk=(id,col)=>`<marker id="${id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="${col}"/></marker>`;
  let h='<defs>'+mk('ar',css('--line2'))+mk('arO',css('--cy'))+mk('arR',css('--red'))+'</defs>',labs='';
  EDGES.forEach(([a,b,l])=>{const p=edgePath(a,b,l==='loop'?'loop':''),act=eon.has(ec(a,b)),st=act&&stop&&b==='fuera';
    h+=`<path class="ed${act?' on':''}${st?' stop':''}" d="${p.d}" marker-end="url(#${act?(st?'arR':'arO'):'ar'})"/>`;
    if(!p.nolab&&l){const w=l.length*17+30;labs+=`<g class="el ${l==='Sí'?'si':'no'}${act?' on':''}"><rect x="${p.lx-w/2}" y="${p.ly-19}" width="${w}" height="38" rx="19"/><text x="${p.lx}" y="${p.ly+9}" text-anchor="middle">${l}</text></g>`}});
  Object.entries(NODES).forEach(([id,n])=>{const a=on.has(id);const s=sub[id]||n.s||'';const fsT=n.k==='q'?30:34,fsS=24;
    let L=lineas(n.t,n.w,fsT);let f=fsT;if(L.length>3){f=26;L=lineas(n.t,n.w,f)}
    const lh=f*1.18,tot=L.length*lh+(s?fsS*1.35:0),y0=n.y+n.h/2-tot/2+f*.8;
    h+=`<g class="nd ${n.k}${a?' on':''}"><rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="${n.k==='q'?30:10}"/>`;
    L.forEach((ln,i)=>h+=`<text class="t" x="${n.x+n.w/2}" y="${y0+i*lh}" text-anchor="middle" font-size="${f}">${esc(ln)}</text>`);
    if(s)h+=`<text class="s" x="${n.x+n.w/2}" y="${y0+L.length*lh+fsS*.25}" text-anchor="middle" font-size="${fsS}">${esc(s)}</text>`;h+='</g>'});
  svg.setAttribute('viewBox','-6 -6 1612 464');svg.innerHTML=h+labs;$('#e-path').innerHTML=txt;
  $('#e-mode').textContent=estState.mode==='hoy'?'ruta de hoy':'operación #'+T[estState.op].n;
  $('#e-hoy').setAttribute('aria-pressed',estState.mode==='hoy');$('#e-op').setAttribute('aria-pressed',estState.mode==='op');
  $('#e-opn').textContent='#'+T[estState.op].n;['#e-prev','#e-next','#e-opn'].forEach(s=>$(s).style.visibility=estState.mode==='op'?'visible':'hidden')}
function treeOp(i){estState.mode='op';estState.op=Math.max(0,Math.min(T.length-1,i));renderTree()}

/* ---------- ESTRATEGIA: reglas como tarjetas + velas con mejor/peor del año ---------- */
const priceState={mode:'ultimas',op:null};
function priceSrc(){return priceState.mode==='op'&&priceState.op!=null?ventana(T[priceState.op]):ultimas()}
function zoomOp(i,origen){priceState.mode='op';priceState.op=i;treeOp(i);const t=T[i];
  $('#e-ptit').innerHTML=(origen?esc(origen)+' · ':'')+'Operación <em>#'+t.n+'</em> · '+fd(t.fi)+' → '+fd(t.fo)+' · <em class="'+(t.ret>0?'pos':'neg')+'">'+pct(t.ret,2)+'</em>';
  $('#e-ultimas').hidden=false;charts['cv-price']&&charts['cv-price'].render()}
function precioUltimas(){priceState.mode='ultimas';priceState.op=null;$('#e-ptit').innerHTML=ES_DEMO?'Precio · últimas velas · <em>media 200</em> y <em>RSI</em>':'Precio · <em>últimas velas</em>';$('#e-ultimas').hidden=true;charts['cv-price']&&charts['cv-price'].render()}
function reglasVisual(){if(D.reglas_visual)return D.reglas_visual;return{trigger:'—',filtros:[],salida:[],gestion:'—',ejecucion:'—'}}
function fillEstrategia(){const R=reglasVisual();if(!ES_DEMO)$('#e-ptit').innerHTML='Precio · <em>últimas velas</em>';
  const card=(ic,k,col,txt)=>`<section class="panel rcard" style="--rc:${col}"><svg aria-hidden="true"><use href="#${ic}"/></svg><div><span class="rk">${k}</span><p>${txt}</p></div></section>`;
  const L=a=>Array.isArray(a)?(a.length?a.map(esc).join('<br>'):'—'):esc(a||'—');
  $('#e-reglas').innerHTML=card('i-trigger','TRIGGER · ENTRADA','var(--ok)',L(R.trigger))+card('i-filtro','FILTRO','var(--f1)',L(R.filtros))+card('i-salida','CONDICIÓN DE SALIDA','var(--red)',L(R.salida))+
    card('i-gestion','GESTIÓN','var(--gold)',L(R.gestion))+card('i-ejec','EJECUCIÓN','var(--f2)',L(R.ejecucion));
  const ys=EXT.map(e=>e.anio).sort((a,b)=>b-a);$('#e-anio').innerHTML=ys.map(y=>`<option value="${y}">${y}</option>`).join('');
  $('#e-head').innerHTML=ES_DEMO?'Así decide la regla cada día. <strong>Hoy: '+esc(E.senal)+'</strong>.':'Así decide <strong>tu</strong> regla cada día.'}
function extremo(tipo){const y=+$('#e-anio').value,e=EXT.find(x=>x.anio===y);if(!e)return;const n=e[tipo].n;const i=T.findIndex(t=>t.n===n);if(i>=0)zoomOp(i,(tipo==='mejor'?'Mejor':'Peor')+' de '+y)}

/* ---------- FICHA TÉCNICA ---------- */
function sello(ok,txt,xl){return `<span class="sello ${ok?'ok':'ko'}${xl?' xl':''}">${ok?'✓':'✗'} ${esc(txt)}</span>`}
function chipsFases(){const nm={F1:'IS/OOS',F2:'Walk-forward',F3:'Meseta',F4:'Monte Carlo',F5:'Stress'};return Object.entries(D.fases).map(([k,v])=>`<span class="chip ${v?'ok':'ko'}" title="${nm[k]}">${v?'✓':'✗'} ${k}</span>`).join('')}
function fillResumen(){
  if(!ES_DEMO){$('#r-tit').innerHTML=esc(NOMBRE.toUpperCase());$('#r-sub').textContent='Ficha técnica · '+(SIMB||'')+' · '+fd(D.desde)+' → '+fd(D.hasta);
    $('#r-regla').innerHTML=D.pseudocodigo?'<span class="c-dim">'+esc(String(D.pseudocodigo).split('\n').slice(0,4).join(' · ')).slice(0,260)+'</span>':'';}
  else $('#r-sub').textContent='Ficha técnica · XAUUSD diario · '+yr(D.desde)+'–'+yr(D.hasta)+' · solo compras';
  $('#r-eqend').textContent=usd(eqV[eqV.length-1])+' ('+pct(FULL.ret_total,1)+')';
  const todo=nPass===5;
  $('#r-verd').innerHTML=`<div class="ph"><h3>Veredicto</h3><button class="link" data-go="protocolo">ver por qué →</button></div>${sello(todo,todo?'APROBADA':'NO APROBADA · '+nPass+'/5')}<div class="phases">${chipsFases()}</div>`;
  const exp=CU.expectancy_usd!=null?CU.expectancy_usd:T.reduce((a,t)=>a+t.ret,0)/T.length*CAP;
  $('#r-exp').textContent=usd(exp,0,true).replace(' USD','');$('#r-exp').insertAdjacentHTML('beforeend','<small style="font-size:.45em"> USD</small>');
  $('#r-exp-pct').textContent=CU.expectancy_pct!=null?pct(CU.expectancy_pct,2):'';
  $('#r-ops-anio').textContent=CU.operaciones_por_anio!=null?nf(CU.operaciones_por_anio,1)+' op./año':'';
  $('#r-money').innerHTML=[['Ganancia media anual',CU.ganancia_media_anual_usd!=null?usd(CU.ganancia_media_anual_usd,0,true):'—','pos'],
    ['Objetivo base anual',CU.objetivo_anual_usd!=null?usd(CU.objetivo_anual_usd,0,true):'—','c-gold'],
    ['Total '+yr(D.desde)+'–'+yr(D.hasta),usd(eqV[eqV.length-1]-CAP,0,true),FULL.ret_total>0?'pos':'neg']].map(([a,b,c])=>`<dt>${a}</dt><dd class="${c}">${b}</dd>`).join('');
  $('#r-obj-nota').textContent=CU.objetivo_nota?CU.objetivo_nota.split('. ').slice(0,1).join('')+'.':'Con 100.000 USD, el 100 % del capital por operación, sin componer.';
  $('#r-obj-nota').title=CU.objetivo_nota||'';
  $('#r-riesgo').innerHTML=[['<span class="term" data-t="dd">Peor caída</span> · prueba',pct(-OOS.maxdd,1)+' · '+usd(-OOS.maxdd*CAP)],['Peor caída · total',pct(-FULL.maxdd,1)+' · '+usd(-FULL.maxdd*CAP)],
    ['Peor caída posible <span class="term" data-t="mc">(MC 95 %)</span>',D.mc&&D.mc.p95dd!=null?pct(-D.mc.p95dd,1)+' · '+usd(-D.mc.p95dd*CAP):'—']].map(([a,b])=>`<dt>${a}</dt><dd class="neg">${b}</dd>`).join('');
  $('#r-senal').textContent=E.senal||'—';$('#hoy-senal').textContent=E.senal||'—';$('#r-fecha').textContent=E.fecha?fd(E.fecha):'';
  const r4=E.rsi4!=null?E.rsi4:E.rsi;if(r4!=null){const gi=document.createElement('i');gi.style.left=r4+'%';gi.title='RSI hoy '+nf(r4,1);$('#r-gauge').appendChild(gi)}else $('#r-gauge').hidden=true;
  if(RSI_TH.e!=null)$('#r-gauge').innerHTML=$('#r-gauge').innerHTML.replace('25 compra',RSI_TH.e+' compra').replace('55 venta',RSI_TH.s+' venta');
  const kq=(v,c)=>`<span class="big ${c}">${v}</span>`;
  const K=[['<span class="term" data-t="pf">PF</span> · prueba',nf(OOS.pf,2),qPF(OOS.pf),'mínimo TIS 1,30'],['Acierto',pct(OOS.win_rate,0,false),qAcierto(OOS.win_rate),'ganadoras · prueba'],
    ['Operaciones',String(FULL.n),'q-neu',OOS.n+' en la prueba'],['<span class="term" data-t="cagr">Rentab. anual</span>',pct(OOS.cagr,1),OOS.cagr>0?'q-ok':'q-ko','prueba, compuesta'],
    ['Duración',nf(D.dias_medio,1)+' d','q-neu','media por operación'],['<span class="term" data-t="expo">Tiempo invertido</span>',pct(FULL.exposicion,0,false),'q-neu','de los días']];
  $('#r-kpis').innerHTML=K.map(([k,v,c,s])=>`<div class="panel kpi"><span class="k">${k}</span>${kq(v,c)}<small>${s}</small></div>`).join('');
  const C=D.core_logic;
  $('#r-core').innerHTML=C?`<div class="ct"><small>CORE LOGIC</small><b>${esc(C.titulo||'')}</b></div>
    <div class="cc"><svg aria-hidden="true"><use href="#i-escudo"/></svg><div><h4>Ventaja que explota</h4><p>${esc(C.ventaja_estructural)}</p></div></div>
    <div class="cc"><svg aria-hidden="true"><use href="#i-trigger"/></svg><div><h4>Qué hace</h4><p>${esc(C.explicacion_simple)}</p></div></div>
    <div class="cc ko"><svg aria-hidden="true"><use href="#i-pico"/></svg><div><h4>Cuándo falla</h4><p>${esc(C.cuando_falla)}</p></div></div>`:
    `<div class="ct"><small>CORE LOGIC</small><b>Tu estrategia</b></div><div class="cc" style="grid-column:2/-1"><div><h4>Qué hace</h4><p>${esc([reglasVisual().trigger,...(reglasVisual().filtros||[])].join(' · '))}</p><p class="nota">La ventaja estructural y cuándo falla los escribes tú: el motor no los adivina.</p></div></div>`}

function pintarHchips(){const nm={F1:'IS/OOS',F2:'Walk-forward',F3:'Meseta',F4:'Monte Carlo',F5:'Stress',PAR:'Paridad'};
  $('#hchips').innerHTML=PR_ORDEN.map((id,i)=>{const e=estFase(id);return `<button type="button" class="chf ${e}" data-pi="${i}" title="${id==='PAR'?'Paridad MT5':id+' · '+nm[id]}: ${EST[e][2].toLowerCase()} · pulsa para verla">${e==='pasa'?'✓':e==='falla'?'✕':'◌'} ${id==='PAR'?'MT5':id}<span> ${nm[id]}</span></button>`}).join('');
  $$('#hchips .chf').forEach(b=>b.onclick=()=>{selPr(+b.dataset.pi);go('protocolo')})}
/* ---------- semáforo respecto a umbrales TIS ---------- */
function qPF(v){return v>=1.35?'q-ok':v>=1.25?'q-fr':'q-ko'}
function qMin(v,thr,band=.1){return v>=thr*(1+band)?'q-ok':v>=thr*(1-band)?'q-fr':'q-ko'}
function qMax(v,thr,band=.1){return v<thr*(1-band)?'q-ok':v<thr*(1+band)?'q-fr':'q-ko'}
function qAcierto(w){const p=ST&&ST.payoff?ST.payoff:null;if(!p)return 'q-neu';const be=1/(1+p);return w>=be+.05?'q-ok':w>=be-.05?'q-fr':'q-ko'}

/* ---------- BACKTEST ---------- */
let codSel='pine';
function fillBacktest(){
  $('#b-head').innerHTML='100.000 USD → <strong>'+usd(eqV[eqV.length-1])+'</strong> ('+pct(FULL.ret_total,1)+'). Prueba honesta: <strong>'+pct(OOS.ret_total,1)+'</strong>, peor caída <strong>'+pct(-OOS.maxdd,1)+'</strong>.';
  const rows=[['Periodo',yr(D.desde)+'–'+yr(SPLIT),yr(SPLIT)+'–'+yr(D.hasta),'Total'],['Operaciones',IS.n,OOS.n,FULL.n],['<span class="term" data-t="pf">Factor de beneficio</span>',nf(IS.pf,2),nf(OOS.pf,2),nf(FULL.pf,2)],
    ['<span class="term" data-t="pfsm">PF sin la mejor</span>',nf(IS.pf_sin_mejor,2),nf(OOS.pf_sin_mejor,2),nf(FULL.pf_sin_mejor,2)],['Acierto',pct(IS.win_rate,0,false),pct(OOS.win_rate,0,false),pct(FULL.win_rate,0,false)],
    ['Retorno total',pct(IS.ret_total,0),pct(OOS.ret_total,0),pct(FULL.ret_total,0)],['<span class="term" data-t="cagr">Rentab. anual</span>',pct(IS.cagr,1),pct(OOS.cagr,1),pct(FULL.cagr,1)],
    ['<span class="term" data-t="dd">Peor caída</span>',pct(-IS.maxdd,1),pct(-OOS.maxdd,1),pct(-FULL.maxdd,1)],['<span class="term" data-t="expo">T. invertido</span>',pct(IS.exposicion,0,false),pct(OOS.exposicion,0,false),pct(FULL.exposicion,0,false)]];
  $('#b-cmp').innerHTML='<thead><tr><th></th><th><span class="term" data-t="is">DISEÑO</span></th><th class="o"><span class="term" data-t="oos">PRUEBA</span></th><th>TOTAL</th></tr></thead><tbody>'+
    rows.slice(1).map(r=>'<tr>'+r.map((v,j)=>j===0?`<td>${v}</td>`:`<td class="${j===2?'o':''}">${v}</td>`).join('')+'</tr>').join('')+'</tbody>';
  $('#b-cmp thead').insertAdjacentHTML('beforeend','<tr><th></th>'+rows[0].slice(1).map((v,j)=>`<th class="${j===1?'o':''}" style="font-weight:500">${v}</th>`).join('')+'</tr>');
  $('#b-anios').textContent=yearsPos+' de '+(D.anual||[]).length+' en positivo';
  const S=ST||{};const R=(v,l,c='',t)=>`<div class="r"><b class="${c}">${v}</b><span>${t?`<span class="term" data-t="${t}">${l}</span>`:l}</span></div>`;
  $('#b-rachas').innerHTML='<div class="ph"><h3>Rachas</h3></div>'+(ST?R(S.racha_max_ganadora,'ganadoras seguidas (máx.)','pos')+R(S.racha_max_perdedora,'perdedoras seguidas (máx.)','neg')+
    R(nf(S.payoff,2),'payoff','','payoff')+R(nf(S.expectancy_r,2)+' R','expectancy','','exp')+R(pct(S.ganancia_media,2),'ganancia media','pos')+R(pct(S.perdida_media,2),'pérdida media','neg'):'<p class="c-dim">Sin datos de rachas.</p>');
  $('#b-mfe-m').textContent=ST?'medias: a favor '+pct(ST.mfe_medio,1)+' · en contra '+pct(ST.mae_medio,1):'';
  pintarCodigo()}
function pintarCodigo(){const C=D.codigo||{};const txt=C[codSel];$('#b-codigo').textContent=txt||'El código para tu plataforma se genera para la demo. Para tu estrategia, usa el pseudocódigo de la Prueba inicial como guía.';
  $('#b-copiar').disabled=!txt;$('#b-cod-nota').textContent=C.notas||'';$$('#b-cod button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.c===codSel))}
function copiarTexto(txt,el){const ok=()=>toast('Copiado al portapapeles'),fallo=()=>{try{const r=document.createRange();r.selectNodeContents(el);const s=getSelection();s.removeAllRanges();s.addRange(r);
    const hecho=document.execCommand&&document.execCommand('copy');toast(hecho?'Copiado al portapapeles':'Texto seleccionado: pulsa Ctrl+C')}catch(e){toast('Selecciónalo y pulsa Ctrl+C')}};
  try{if(navigator.clipboard&&window.isSecureContext!==false)navigator.clipboard.writeText(txt).then(ok,fallo);else fallo()}catch(e){fallo()}}

/* ---------- OPERACIONES ---------- */
function opList(){let L=T.map((t,i)=>({t,i}));const f=opState.filter;
  if(f==='is')L=L.filter(o=>!o.t.oos);if(f==='oos')L=L.filter(o=>o.t.oos);if(f==='win')L=L.filter(o=>o.t.ret>0);if(f==='loss')L=L.filter(o=>o.t.ret<=0);
  const k=opState.sort,d=opState.dir;L.sort((a,b)=>(a.t[k]>b.t[k]?1:a.t[k]<b.t[k]?-1:0)*d);return L}
function renderTable(){const L=opList();$('#o-count').textContent=L.length+' operaciones';
  $('#o-body').innerHTML=L.map(({t,i})=>`<tr tabindex="${i===opState.sel?0:-1}" data-i="${i}" aria-selected="${i===opState.sel}"><td>${t.n} <span class="chip ${t.oos?'oos':'is'}" style="padding:0 .3rem">${t.oos?'P':'D'}</span></td><td>${fd(t.fi)}</td><td>${fd(t.fo)}</td><td>${nf(t.pi,2)}</td><td>${t.dias}</td><td class="${t.ret>0?'pos':'neg'}"><b>${pct(t.ret,2)}</b></td><td><button type="button" class="vbtn" data-v="${i}" title="Ver la operación #${t.n} en velas" aria-label="Ver la operación ${t.n} en velas"><svg><use href="#i-velas"/></svg></button></td></tr>`).join('');
  $$('table.ops th button').forEach(b=>{const s=b.dataset.s;b.parentElement.setAttribute('aria-sort',s===opState.sort?(opState.dir>0?'ascending':'descending'):'none');b.textContent=b.textContent.replace(/ [▲▼]$/,'')+(s===opState.sort?(opState.dir>0?' ▲':' ▼'):'')})}
function selectOp(i,focus,scroll=true){opState.sel=i;eqState.sel=i;$$('#o-body tr').forEach(r=>{const on=+r.dataset.i===i;r.setAttribute('aria-selected',on);r.tabIndex=on?0:-1;if(on){if(scroll)r.scrollIntoView({block:'nearest'});if(focus)r.focus({preventScroll:!scroll})}});
  renderDetail();charts['cv-bars']&&charts['cv-bars'].render();charts['cv-eq']&&charts['cv-eq'].render()}
const ranked=[...T].sort((a,b)=>b.ret-a.ret);const rank=t=>ranked.indexOf(t)+1;
function renderDetail(){const t=T[opState.sel];
  $('#o-det').innerHTML=`<div class="dh"><span class="big ${t.ret>0?'pos':'neg'}">${pct(t.ret,2)}</span><div><div class="c-ink" style="font-family:var(--f-head);font-weight:700;font-size:1.25rem;letter-spacing:.05em">OPERACIÓN #${t.n} · ${usd(t.ret_usd,0,true)}</div>
   <span class="chip ${t.oos?'oos':'is'}">${t.oos?'PRUEBA HONESTA':'DISEÑO'}</span></div></div>
   <dl class="kv"><dt>Entrada</dt><dd>${fd(t.fi)} · ${nf(t.pi,2)}</dd><dt>Salida</dt><dd>${fd(t.fo)} · ${nf(t.po,2)}</dd><dt>Duración</dt><dd>${t.dias} días</dd></dl>
   <dl class="kv"><dt><span class="term" data-t="mfe">A favor (MFE)</span></dt><dd class="pos">${pct(t.mfe_pct,1)}</dd><dt><span class="term" data-t="mae">En contra (MAE)</span></dt><dd class="neg">${pct(t.mae_pct,1)}</dd><dt>Ranking</dt><dd>${rank(t)} de ${T.length}</dd></dl>
   <div class="navops"><button class="btn gold" data-a="velas"><svg class="ic"><use href="#i-velas"/></svg> VER EN VELAS</button><button class="btn" data-a="curve">VER EN LA CURVA →</button><button class="btn" data-a="tree">VER EN EL ÁRBOL →</button><button class="btn" data-a="prev">◀</button><button class="btn" data-a="next">▶</button></div>`;
  wireTerms($('#o-det'));
  $$('#o-det [data-a]').forEach(b=>b.onclick=()=>{const a=b.dataset.a;if(a==='prev'||a==='next'){const L=opList().map(o=>o.i),p=L.indexOf(opState.sel),q=a==='prev'?p-1:p+1;if(q>=0&&q<L.length)selectOp(L[q])}
    if(a==='velas')abrirVelas(opState.sel);if(a==='tree'){zoomOp(opState.sel);go('estrategia')}if(a==='curve'){eqState.range=T[opState.sel].oos?'oos':'all';syncRange();go('backtest')}})}

/* ---------- VER EN VELAS (cualquier operación) ---------- */
const vdState={op:0};
function abrirVelas(i){vdState.op=Math.max(0,Math.min(T.length-1,i));const t=T[vdState.op];
  $('#velas-h').innerHTML='Operación <em>#'+t.n+'</em> en velas';
  $('#velas-info').innerHTML=`<span>entrada <b>${fd(t.fi)}</b> · ${nf(t.pi,2)}</span><span>salida <b>${fd(t.fo)}</b> · ${nf(t.po,2)}</span><span>resultado <b class="${t.ret>0?'pos':'neg'}">${pct(t.ret,2)} · ${usd(t.ret_usd,0,true)}</b></span><span>${t.dias} días</span>${t.mfe_pct!=null?`<span>a favor <b class="pos">${pct(t.mfe_pct,1)}</b> · en contra <b class="neg">${pct(t.mae_pct,1)}</b></span>`:''}<span class="chip ${t.oos?'oos':'is'}">${t.oos?'PRUEBA':'DISEÑO'}</span>`;
  const o=$('#velas-dlg');if(!o.classList.contains('on'))openDlg('velas-dlg');
  const c=chart('cv-velas',drawVelas);c.src=()=>ventana(T[vdState.op]);requestAnimationFrame(()=>c.render())}

/* ---------- VALIDACIÓN ---------- */
function fillVal(){const fs=D.fases,M=D.mc||{},W=D.wf_res||{},S=D.stress||{},Me=D.meseta;
  const fl=['F1','F2','F3','F4','F5'].filter(k=>!fs[k]);
  $('#val-head').innerHTML='<strong>'+nPass+' de 5 pruebas superadas'+(fl.length?' → no aprueba.':' → aprueba.')+'</strong>'+(fl.length?' Falla '+fl.map(k=>NOMF[k].toLowerCase()).join(' y ')+'.':'');
  const ck=(ok,txt,val,lim)=>`<li><span class="${ok?'y':'n'}">${ok?'✓':'✗'}</span><span>${txt} <span class="c-dim">(${lim})</span></span><span class="v">${val}</span></li>`;
  const card=(k,title,q,crit,body,term)=>`<section class="panel fase ${fs[k]?'':'ko'}" style="--fc:${PC[k]}" aria-label="Fase ${k}"><div class="ph"><h3><span class="fcod">${k}</span>${term?`<span class="term" data-t="${term}">${title}</span>`:title}</h3><span class="chip ${fs[k]?'ok':'ko'}">${fs[k]?'✓ SUPERADA':'✗ NO SUPERADA'}</span></div>
    <p class="fq">${q}</p><div><ul class="crit">${crit}</ul></div>${body}</section>`;
  const mx=Math.max(2.2,IS.pf*1.1,OOS.pf*1.1);
  const f1=card('F1','Diseño / prueba','¿Sigue ganando con datos que no se usaron para diseñarla?',
    ck(OOS.pf>=1.3,'Factor de beneficio',nf(OOS.pf,2),'≥ 1,30')+ck(OOS.n>=30,'Operaciones',OOS.n,'≥ 30')+ck(OOS.maxdd<.2,'Peor caída',pct(-OOS.maxdd,1),'< 20 %')+ck(OOS.pf_sin_mejor>1,'PF sin la mejor',nf(OOS.pf_sin_mejor,2),'> 1,00'),
    `<div class="fbody" style="align-content:end"><div class="sbar"><span>Diseño</span><span class="tr"><i style="width:${Math.min(100,IS.pf/mx*100)}%;background:var(--dim2)"></i><u style="left:${1.3/mx*100}%"></u></span><span>${nf(IS.pf,2)}</span></div><div class="sbar"><span>Prueba honesta</span><span class="tr"><i style="width:${Math.min(100,OOS.pf/mx*100)}%;background:var(--f1)"></i><u style="left:${1.3/mx*100}%"></u></span><span>${nf(OOS.pf,2)}</span></div><div class="c-dim" style="font-size:.8rem">raya = mínimo 1,30</div></div>`,'oos');
  const f2=card('F2','Walk-forward','¿Aguanta si se reajusta cada año y se prueba en el siguiente?',
    W.eficiencia!=null?ck(W.eficiencia>=.5,'Eficiencia',nf(W.eficiencia,2),'≥ 0,50')+ck(W.pct_positivas>=.6,'Años en positivo',Math.round(W.pct_positivas*W.n_ventanas)+' de '+W.n_ventanas,'≥ 60 %'):'',
    `<div class="fbody"><div class="cv" id="cv-wf"><canvas role="img" aria-label="Resultado de cada año de prueba"></canvas><div class="tt"></div></div></div>`,'wf');
  let ht='',f3crit='';
  if(Me&&Me.pf){const c=centro(Me),k=Object.keys(Me.ejes),nb=vecinos(Me),pc=Me.pf[c][c],peor=Math.min(...nb);
    ht=`<table class="heat" aria-label="Factor de beneficio por combinación"><tr><th>${esc(k[0])}\\${esc(k[1])}</th>`+Me.ejes[k[1]].map(s=>`<th>${s}</th>`).join('')+'</tr>';
    Me.pf.forEach((row,i)=>{ht+=`<tr><th>${Me.ejes[k[0]][i]}</th>`+row.map((v,j)=>`<td class="${i===c&&j===c?'c':''}" style="${heatBg(v)}">${nf(v,2)}</td>`).join('')+'</tr>'});ht+='</table>';
    f3crit=ck(Me.crit['centro_pf>1'],'PF en el centro',nf(pc,2),'> 1')+ck(Me.crit.vecinos_dentro_20pct,'Vecinos parecidos',nf(Math.min(...nb),2)+'–'+nf(Math.max(...nb),2),'± 20 %')+ck(Me.crit.anti_cliff_30pct,'Sin precipicios','peor −'+nf((1-peor/pc)*100,0)+' %','< 30 %')}
  const f3=card('F3','Meseta','¿Funciona igual si cambio un poco los números?',f3crit,`<div class="fbody">${ht}</div>`,'mes');
  const f4=card('F4','Monte Carlo','¿Qué podría pasar con otro orden de operaciones?',
    M.p95dd!=null?ck(M.p5>0,'Peor 5 % de retornos',pct(M.p5,1),'> 0')+ck(M.p95dd<.25,'Caída en el peor 5 %',pct(-M.p95dd,1),'< 25 %')+ck(M.ruina<.05,'Prob. de ruina',pct(M.ruina,1,false),'< 5 %'):'',
    `<div class="fbody"><div class="cv" id="cv-mc"><canvas role="img" aria-label="Histograma de retornos simulados"></canvas><div class="tt"></div></div></div>`,'mc');
  const sb=(l,o)=>o?`<div class="sbar"><span>${l}</span><span class="tr"><i style="width:${Math.min(100,o.pf/2*100)}%;background:${o.pf>=1.1?'var(--f5)':'var(--red)'}"></i><u style="left:${1.1/2*100}%"></u></span><span>${nf(o.pf,2)}</span></div>`:'';
  const f5=card('F5','Stress','¿Sobrevive si empeoro las condiciones a propósito?',
    (S.costes_x2?ck(S.costes_x2.pasa,'Costes ×2',nf(S.costes_x2.pf,2),'PF ≥ 1,10'):'')+(S.sin_2_mejores_anios?ck(S.sin_2_mejores_anios.pasa,'Sin 2 mejores años',nf(S.sin_2_mejores_anios.pf,2),'PF ≥ 1,10'):'')+(S.regimen_malo?ck(S.regimen_malo.pasa,'Régimen malo',S.regimen_malo.n+' op.','sin exposición relevante'):''),
    `<div class="fbody" style="align-content:end">${sb('Costes ×2',S.costes_x2)}${sb('Sin 2 mejores años',S.sin_2_mejores_anios)}${sb('Régimen malo',S.regimen_malo)}<div class="c-dim" style="font-size:.8rem">raya = mínimo 1,10</div></div>`,'st');
  const SUM=`<section class="panel summ" aria-label="Veredicto"><div class="ph"><h3>Veredicto</h3></div>${sello(nPass===5,nPass===5?'APROBADA':'NO APROBADA · '+nPass+'/5')}
    <div class="phases">${chipsFases()}</div>
    <p>${ES_DEMO?`Tiene ventaja real en la prueba honesta (PF ${nf(OOS.pf,2)}, ${OOS.n} op.), pero <b class="c-ink">no está lista para dinero real</b>: con otros números cercanos se desploma, y en 1 de cada 20 simulaciones la caída supera el ${pct(M.p95dd,1,false)}.`:(nPass===5?'Supera las cinco pruebas. Falta la paridad con MT5.':'<b class="c-ink">No está lista para dinero real.</b> Revisa las pruebas en rojo.')}</p>
    <button class="link" data-go="protocolo" style="align-self:flex-start">ver el protocolo completo →</button></section>`;
  $('#val-grid').innerHTML=f1+f2+f3+f4+f5+SUM;wireTerms($('#v-validacion'));$$('#val-grid [data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));
  delete charts['cv-wf'];delete charts['cv-mc'];chart('cv-wf',drawWF);chart('cv-mc',drawMC)}
function heatBg(v){const a=Math.min(1,Math.max(0,(v-.9)/1.7));return v<1.1?`background:rgba(${css('--red-rgb')},${.22+.3*Math.min(1,(1.1-v)/.3)})`:`background:rgba(${css('--ok-rgb')},${.12+a*.5})`}

/* =====================================================================
   LAS FASES · PRUEBA INICIAL · PROTOCOLO COMPLETO · motor
   ===================================================================== */
const EST={pasa:['ok','✓','PASA'],falla:['ko','✗','NO PASA'],pend:['oos','…','PENDIENTE']};
const chipE=(e,txt)=>`<span class="chip ${EST[e][0]}">${EST[e][1]} ${esc(txt||EST[e][2])}</span>`;
const DEMO_PARIDAD={
  zona:{estado:'pasa',txt:'Velas diarias en hora del servidor Darwinex (GMT+3, horario de verano de EE. UU.).'},
  costes:{estado:'pasa',txt:'Spread, comisión y swap del perfil darwinex_mt5, leído del terminal.'},
  reconciliacion:{estado:'pend',txt:'Falta correr el mismo periodo en el Strategy Tester de MT5 con el EA real y comparar.'}
};
const P=(D.paridad&&D.paridad.zona)?D.paridad:(ES_DEMO?DEMO_PARIDAD:{zona:{estado:'pend',txt:'Comprueba que tus velas están en hora del servidor del bróker.'},costes:{estado:'pend',txt:'Comprueba que los costes son los de tu bróker.'},reconciliacion:{estado:'pend',txt:'Falta la reconciliación con el Strategy Tester.'}});
let RECON=null;
const NOMF={F1:'Diseño / prueba',F2:'Walk-forward',F3:'Meseta de parámetros',F4:'Monte Carlo',F5:'Stress',PAR:'Paridad MT5'};
function estParidad(){if(RECON)return RECON.ok?'pasa':'falla';const r=P.reconciliacion&&P.reconciliacion.estado;return r==='pasa'||r==='falla'?r:'pend'}
function estFase(id){if(id==='PAR')return estParidad();if(/^F\d$/.test(id))return D.fases[id]?'pasa':'falla';return null}
function centro(Me){return Math.floor(Me.pf.length/2)}
function vecinos(Me){const c=centro(Me),v=[];for(let i=c-1;i<=c+1;i++)for(let j=c-1;j<=c+1;j++)if((i!==c||j!==c)&&Me.pf[i]&&Me.pf[i][j]!=null)v.push(Me.pf[i][j]);return v}

/* ---------- LAS FASES ---------- */
const FASES=[
 {id:'F1',cod:'F1',nombre:'Diseño / prueba',corto:'IS / OOS',preg:'¿Sigue ganando con datos que no usé para diseñarla?',
  que:'Se parte el histórico en dos: con una parte diseñas; la otra se guarda bajo llave y se abre al final.',
  umb:[['PF en la prueba honesta','≥ 1,30'],['Operaciones en la prueba','≥ 30'],['Caída máxima en la prueba','< 20 %'],['PF sin la mejor operación','> 1,00']],
  falla:'La curva del diseño sube preciosa y en la parte guardada se aplana: estaba aprendida de memoria.',
  av:'Corte 70/30 por defecto [calibrable]. Los 4 criterios duros se cumplen a la vez sobre el OOS; no se bajan sin orden explícita.'},
 {id:'F2',cod:'F2',nombre:'Walk-forward',corto:'Walk-forward',preg:'¿Aguanta si la reajusto cada año y la pruebo en el siguiente?',
  que:'Muchos cortes seguidos: ajustar con 3 años, probar en el siguiente, avanzar un año y repetir.',
  umb:[['Eficiencia (prueba / ajuste)','≥ 0,50'],['Años de prueba en positivo','≥ 60 %']],
  falla:'Con un corte funciona, pero al rodar la ventana la mitad de los años pierde: era suerte del corte.',
  av:'IS 3 años / OOS 1 año / paso 1 año [calibrable]. Eficiencia = rendimiento medio OOS / IS.'},
 {id:'F3',cod:'F3',nombre:'Meseta de parámetros',corto:'Meseta',preg:'¿Funciona igual si muevo un poco los números?',
  que:'Se prueban los valores vecinos de cada número elegido. Una buena regla está rodeada de buenas reglas.',
  umb:[['Rejilla alrededor del elegido','3 × 3'],['Los vecinos rinden parecido','± 20 %'],['Ningún vecino se desploma','caída < 30 %']],
  falla:'Con 25 gana y con 30 apenas: es un pico. El mercado no sabe que elegiste 25.',
  av:'Vecinos ±1 paso en los 2 parámetros clave; tolerancia 20 %; anti-cliff 30 % [calibrable].'},
 {id:'F4',cod:'F4',nombre:'Monte Carlo',corto:'Monte Carlo',preg:'¿Qué podría haber pasado con otra suerte en el orden?',
  que:'Se barajan las mismas operaciones miles de veces y se miran los caminos malos.',
  umb:[['El peor 5 % de caminos aún gana','> 0'],['Caída en el peor 5 %','< 25 %'],['Prob. de perder la mitad','< 5 %']],
  falla:'La caída real fue moderada, pero 1 de cada 20 caminos supera el 25 %.',
  av:'5.000 simulaciones; reordenación + bootstrap [calibrable].'},
 {id:'F5',cod:'F5',nombre:'Stress',corto:'Stress',preg:'¿Sobrevive si empeoro las condiciones a propósito?',
  que:'Costes dobles, sin los 2 mejores años y en el peor tramo de mercado. Si la ventaja es real, sale viva.',
  umb:[['Costes ×2: PF','≥ 1,10'],['Sin los 2 mejores años: PF','≥ 1,10'],['Régimen malo: caída','< 25 %']],
  falla:'Con costes dobles el PF baja de 1: la ventaja era más pequeña que el coste de operar.',
  av:'Costes y deslizamiento ×2 sobre el perfil de destino; sin los 2 mejores años; régimen malo aislado.'},
 {id:'PAR',cod:'MT5',nombre:'Paridad MT5',corto:'Paridad MT5',preg:'¿El backtest y el MetaTrader real son el mismo sistema?',
  que:'Mismas velas en hora del servidor, costes reales del bróker y el Strategy Tester debe dar las mismas operaciones.',
  umb:[['Velas en hora del servidor','GMT+3 · DST EE. UU.'],['Costes leídos del terminal','spread · comisión · swap'],['Strategy Tester vs backtest','± 2 % · mismas op.']],
  falla:'El backtest usa velas en UTC y MT5 en hora de servidor: las señales caen en otra vela.',
  av:'Reconciliación obligatoria antes de dar por validada: nº de operaciones exacto y PnL dentro de ±2 %.'}
];
let galSel=0;
function demoFase(id){const St=D.stress||{},Mc=D.mc||{},W=D.wf_res||{},Me=D.meseta;
  switch(id){
   case 'F1':return `PF en la prueba <b>${nf(OOS.pf,2)}</b> con <b>${OOS.n}</b> operaciones y caída máxima <b>${pct(OOS.maxdd,1,false)}</b>.`;
   case 'F2':return W.eficiencia!=null?`Eficiencia <b>${nf(W.eficiencia,2)}</b> y <b>${Math.round(W.pct_positivas*W.n_ventanas)} de ${W.n_ventanas}</b> años en positivo.`:'Sin datos.';
   case 'F3':if(!Me||!Me.pf)return 'Sin datos.';{const c=centro(Me),nb=vecinos(Me);return `PF <b>${nf(Me.pf[c][c],2)}</b> en el centro; vecinos de <b>${nf(Math.min(...nb),2)}</b> a <b>${nf(Math.max(...nb),2)}</b>. ${D.fases.F3?'Es una meseta.':'Es un pico.'}`}
   case 'F4':return Mc.p95dd!=null?`En el peor 5 % de caminos la caída llega al <b>${pct(Mc.p95dd,1,false)}</b> (límite 25 %).`:'Sin datos.';
   case 'F5':return St.costes_x2?`Con costes ×2 el PF queda en <b>${nf(St.costes_x2.pf,2)}</b>; sin los 2 mejores años, <b>${nf(St.sin_2_mejores_anios&&St.sin_2_mejores_anios.pf,2)}</b>.`:'Sin datos.';
   case 'PAR':return estParidad()==='pend'?'Hora y costes como en MT5. <b>Falta la reconciliación</b> con el Strategy Tester.':(RECON?RECON.txt:esc(P.reconciliacion.txt||''));
  }return ''}
const FLOW=[['01','Idea','Una regla que un ordenador pueda seguir sin interpretar.',null],['02','AED','Análisis exploratorio del activo: cómo se mueve antes de inventar reglas.',null],
 ['03','Reglas / hipótesis','Por qué debería funcionar y con qué números exactos.',null],['04','Prueba inicial','Primer backtest honesto, con costes y corte diseño/prueba.','prueba'],
 ['F1','IS / OOS','Diseño vs prueba honesta.','F1'],['F2','Walk-forward','Reajustar cada año y probar en el siguiente.','F2'],['F3','Meseta','Números vecinos, resultados parecidos.','F3'],
 ['F4','Monte Carlo','Miles de caminos posibles.','F4'],['F5','Stress','Condiciones peores a propósito.','F5'],['MT5','Paridad MT5','El Strategy Tester da las mismas operaciones.','PAR'],
 ['07','Forward','Cuenta demo o capital pequeño, vigilando que se comporta como se esperaba.',null],['08','Live','Dinero real con semáforo de salud.',null]];
function renderFases(){const Me=D.meseta;
  if(Me&&Me.pf&&ES_DEMO){const c=centro(Me),ej=Me.ejes,k=Object.keys(ej)[0];const v2=Me.pf[c+1]?Me.pf[c+1][c]:null;
    $('#tr-ej1').innerHTML=`Demo: ${esc(k)} ${ej[k][c]} → PF <b>${nf(Me.pf[c][c],2)}</b>; ${ej[k][c+1]} → PF <b>${nf(v2,2)}</b>.`}
  const St=D.stress;$('#tr-ej3').innerHTML=St&&St.costes_x2?`Demo: costes ×2 → PF <b>${nf(OOS.pf,2)}</b> pasa a <b>${nf(St.costes_x2.pf,2)}</b>.`:'';
  $('#flow').innerHTML=FLOW.map(([c,n,d,a])=>{const id=/^F\d$|^PAR$/.test(a||'')?a:null,e=id?estFase(id):null;return `<li><button type="button" title="${esc(d)}" data-flow="${a||''}" style="${id?'--fc:'+PC[id]:''}"><b>${c}</b><span>${esc(n)}</span>${e?`<i class="st ${e}" aria-label="${EST[e][2]}"></i>`:''}</button></li>`}).join('');
  $$('#flow [data-flow]').forEach(b=>b.onclick=()=>{const a=b.dataset.flow;if(!a){toast(b.title);return}if(a==='prueba')go('prueba');else{selGal(FASES.findIndex(f=>f.id===a));$('#fase-det').scrollIntoView({block:'nearest',behavior:RM?'auto':'smooth'})}});
  renderGal()}
function renderGal(){
  $('#gal').innerHTML=FASES.map((f,i)=>{const e=estFase(f.id);return `<button type="button" class="est" style="--fc:${PC[f.id]}" data-i="${i}" aria-pressed="${i===galSel}" aria-label="${esc(f.cod+': '+f.nombre+'. '+EST[e][2].toLowerCase())}"><b>${esc(f.cod)}</b><span class="n">${esc(f.corto)}</span>${chipE(e,EST[e][1])}</button>`}).join('');
  $$('#gal .est').forEach(b=>{b.onclick=()=>selGal(+b.dataset.i);b.onkeydown=e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();e.stopPropagation();const n=Math.max(0,Math.min(FASES.length-1,+b.dataset.i+(e.key==='ArrowRight'?1:-1)));selGal(n);$(`#gal .est[data-i="${n}"]`).focus()}}});
  renderFaseDet()}
function selGal(i){galSel=Math.max(0,i);renderGal()}
function renderFaseDet(){const f=FASES[galSel],e=estFase(f.id),el=$('#fase-det');el.style.setProperty('--fc',PC[f.id]);
  el.innerHTML=`<div><div class="ph"><h3>${esc(f.cod)}${/^F\d$/.test(f.id)?' de 5':''} · <em>${esc(f.nombre)}</em></h3>${chipE(e)}</div>
    <p class="fq">${esc(f.preg)}</p><p>${esc(f.que)}</p></div>
   <div><div class="ph"><h3>Umbral TIS</h3></div><ul class="crit">${f.umb.map(u=>`<li><span class="y">›</span><span>${esc(u[0])}</span><span class="v">${esc(u[1])}</span></li>`).join('')}</ul></div>
   <div><div class="ph"><h3>En la ${ES_DEMO?'demo':'prueba'}</h3></div><div class="pathtxt">${demoFase(f.id)}</div><div class="verd" style="margin-top:.5rem"><b>Así falla:</b> ${esc(f.falla)}</div>
    <div class="navf"><button type="button" class="btn" data-gal="-1" ${galSel===0?'disabled':''}>◀</button><button type="button" class="btn" data-gal="1" ${galSel===FASES.length-1?'disabled':''}>▶</button>
    <button type="button" class="btn gold" data-pver="${f.id}">VER LA PRUEBA COMPLETA →</button></div></div>`;
  $$('[data-gal]',el).forEach(b=>b.onclick=()=>selGal(Math.max(0,Math.min(FASES.length-1,galSel+ +b.dataset.gal))));
  $$('[data-pver]',el).forEach(b=>b.onclick=()=>{selPr(PR_ORDEN.indexOf(b.dataset.pver));go('protocolo')});
  wireTerms(el)}

/* ---------- PRUEBA INICIAL: formulario → spec v1 → pseudocódigo ---------- */
const DEMO_SPEC={
  version:1, nombre:'Oro RSI(4) 25/55',
  activo:{simbolo:'XAUUSD',clase:'metal'}, temporalidad:'D1', direccion:'largo',
  datos:{fuente:'darwinex_mt5',desde:'1998-04-22',hasta:'2026-10-02',zona_horaria:'servidor_gmt3_usdst'},
  reglas:{
    filtros:[{izq:{tipo:'precio'},op:'>',der:{tipo:'sma',periodo:200}}],
    entrada:[{izq:{tipo:'rsi',periodo:4},op:'<',der:{tipo:'num',valor:25}}],
    salida:[{izq:{tipo:'rsi',periodo:4},op:'>',der:{tipo:'num',valor:55}}]},
  ejecucion:{momento:'apertura_siguiente',orden:'mercado'},
  gestion:{stop:{tipo:'ninguno',valor:null},objetivo:{tipo:'ninguno',valor:null},salida_tiempo_velas:null},
  sizing:{tipo:'pct_capital',valor:100},
  costes:{perfil:'darwinex_mt5',spread_pb:0.134,comision_pb_lado:0.01,deslizamiento_pb_lado:3,swap_largo_pct_anual:-5.2443,swap_corto_pct_anual:2.9247},
  corte:{tipo:'auto',fecha:'2018-03-08',is_pct:70},
  optimizar:{entrada:[15,20,25,30,35],salida:[45,50,55,60,65]}
};
const FUENTE_COSTES_ORO='Perfil darwinex_mt5 de Sentinel: spread 0,134 pb (apertura D1), comisión 0,01 pb/lado, deslizamiento 3 pb/lado, swap compras −1,437 pb/día (≈ −5,24 %/año).';
const FUENTE_COSTES=FUENTE_COSTES_ORO;
const NAS=typeof NAS_SPEC!=='undefined'&&NAS_SPEC?NAS_SPEC:null;
const PERFILES={XAUUSD:{costes:DEMO_SPEC.costes,fuente:FUENTE_COSTES_ORO}};
const COSTES_NDX={perfil:'darwinex_mt5',spread_pb:0.326,comision_pb_lado:0.01,deslizamiento_pb_lado:3,swap_largo_pct_anual:-5.55,swap_corto_pct_anual:2.25};
PERFILES.NDX={costes:COSTES_NDX,fuente:'Perfil darwinex_mt5 de Sentinel para el Nasdaq 100 (NDX): spread 0,326 pb, comisión 0,01 pb/lado, deslizamiento 3 pb/lado, swap compras −5,55 %/año.'};
PERFILES.NAS100=PERFILES.NDX;
if(NAS)PERFILES.NAS100={costes:NAS.costes,fuente:'Perfil darwinex_mt5 de Sentinel para el Nasdaq (NDX → NAS100): spread 0,326 pb, comisión 0,01 pb/lado, deslizamiento 3 pb/lado, swap compras −5,55 %/año.'};
function perfilDe(sym){return PERFILES[String(sym||'').toUpperCase()]||{costes:DEMO_SPEC.costes,fuente:'No hay perfil Darwinex de '+(sym||'este activo')+' en el tester: son los costes del oro. Revísalos.'}}
const IND=[['precio','Cierre',0],['apertura','Apertura',0],['maximo','Máximo',0],['minimo','Mínimo',0],['sma','SMA',1],['ema','EMA',1],['rsi','RSI',1],['atr','ATR',1],['max_n','Máx. N velas',1],['min_n','Mín. N velas',1],['num','Número',2],
  ['sesion_anterior_max','Máx. sesión anterior',0,'s'],['sesion_anterior_min','Mín. sesión anterior',0,'s'],['sesion_anterior_apertura','Apertura sesión anterior',0,'s'],['sesion_anterior_cierre','Cierre sesión anterior',0,'s'],
  ['sesion_max','Máx. de la sesión (hasta ahora)',0,'s'],['sesion_min','Mín. de la sesión (hasta ahora)',0,'s'],['sesion_apertura','Apertura de la sesión',0,'s'],
  ['vela_sesion_max','Máx. de la vela k',3,'s'],['vela_sesion_min','Mín. de la vela k',3,'s'],['vela_sesion_apertura','Apertura de la vela k',3,'s'],['vela_sesion_cierre','Cierre de la vela k',3,'s'],['vela_sesion','Nº de vela de la sesión',0,'s'],
  ['nivel','Nivel con nombre',4,'n']];
const OPS_SESION=new Set(IND.filter(x=>x[3]==='s').map(x=>x[0]));
const INTRADIA=tf=>['M5','M15','H1','H4'].includes(tf);
const ZSES={'America/New_York':'hora de Nueva York','Europe/London':'hora de Londres','Europe/Madrid':'hora de Madrid','Europe/Berlin':'hora de Fráncfort','Asia/Tokyo':'hora de Tokio','UTC':'UTC'};
const CMP=[['>','mayor que'],['<','menor que'],['>=','mayor o igual que'],['<=','menor o igual que'],['cruza_arriba','cruza hacia arriba'],['cruza_abajo','cruza hacia abajo'],['x_factor','× múltiplo de']];
const TFN={M5:'vela de 5 minutos',M15:'vela de 15 minutos',H1:'vela horaria',H4:'vela de 4 horas',D1:'vela diaria',W1:'vela semanal'};
const ZN={servidor_gmt3_usdst:'hora servidor GMT+3, DST EE. UU.',utc:'UTC',nueva_york:'hora de Nueva York',madrid:'hora de Madrid'};
const clone=o=>JSON.parse(JSON.stringify(o));
let SPEC=clone(DEMO_SPEC),piFmt='pseudo',piPrev=[],CSV=null;
const getK=(o,k)=>k.split('.').reduce((a,p)=>a==null?a:a[p],o);
function setK(o,k,v){const ps=k.split('.');let a=o;ps.slice(0,-1).forEach(p=>{if(a[p]==null)a[p]={};a=a[p]});a[ps[ps.length-1]]=v}
function DESF_OK(o){return !!o&&o.tipo!=='num'&&o.tipo!=='nivel'&&!/^(sesion_|vela_sesion)/.test(o.tipo)}
function opTxt(o){const t=opTxt0(o);return o&&o.desfase>0&&DESF_OK(o)?t+' de hace '+o.desfase+(o.desfase==1?' vela':' velas'):t}
function opTxt0(o){if(!o)return '?';const p=o.periodo;if(o.tipo==='nivel')return o.nombre||'¿nivel?';if(/^(sesion_|vela_sesion)/.test(o.tipo)){const M={sesion_anterior_max:'máx. sesión anterior',sesion_anterior_min:'mín. sesión anterior',sesion_anterior_apertura:'apertura sesión anterior',sesion_anterior_cierre:'cierre sesión anterior',sesion_max:'máx. de la sesión',sesion_min:'mín. de la sesión',sesion_apertura:'apertura de la sesión',vela_sesion_max:'máx. de la vela k',vela_sesion_min:'mín. de la vela k',vela_sesion_apertura:'apertura de la vela k',vela_sesion_cierre:'cierre de la vela k',vela_sesion:'nº de vela de la sesión'};return(M[o.tipo]||o.tipo).replace(/ k$/,' '+(o.k??'?'))}switch(o.tipo){case 'precio':return 'cierre';case 'apertura':return 'apertura';case 'maximo':return 'máximo';case 'minimo':return 'mínimo';
  case 'sma':return `SMA(${p??'?'})`;case 'ema':return `EMA(${p??'?'})`;case 'rsi':return `RSI(${p??'?'})`;case 'atr':return `ATR(${p??'?'})`;case 'max_n':return `máx. ${p??'?'} velas`;case 'min_n':return `mín. ${p??'?'} velas`;
  case 'num':return o.valor==null||o.valor===''?'?':nf(+o.valor,(+o.valor)%1?2:0)}return '?'}
function condTxt(c){if(c.op==='x_factor')return `${opTxt(c.izq)} × ${c.factor??'?'}`;return `${opTxt(c.izq)} ${CMPS[c.op]||c.op} ${opTxt(c.der)}`}
function nivNombres(s){return((s||SPEC).niveles||[]).map(n=>n&&n.nombre).filter(Boolean)}
function opValido(o,nom){if(!o)return false;const t=IND.find(x=>x[0]===o.tipo);if(!t)return false;if(o.desfase!=null&&!(Number.isInteger(+o.desfase)&&+o.desfase>=0))return false;if(t[2]===1)return o.periodo>0&&Number.isFinite(+o.periodo);if(t[2]===2)return o.valor!==''&&o.valor!=null&&Number.isFinite(+o.valor);
  if(t[2]===3)return o.k>0&&Number.isInteger(+o.k);if(t[2]===4)return !!o.nombre&&(nom||nivNombres()).includes(o.nombre);return true}
function selInd(o,lado){const L=IND.filter(x=>lado==='der'||x[0]!=='num'),opt=x=>`<option value="${x[0]}"${o.tipo===x[0]?' selected':''}>${x[1]}</option>`;
  return `<select data-p="tipo" aria-label="${lado==='izq'?'Qué miras':'Con qué lo comparas'}">${L.filter(x=>!x[3]).map(opt).join('')}<optgroup label="Sesión (intradía)">${L.filter(x=>x[3]==='s').map(opt).join('')}</optgroup>${L.filter(x=>x[3]==='n').map(opt).join('')}</select>`}
function operandoHTML(o,lado){const t=IND.find(x=>x[0]===o.tipo)||IND[0],N=nivNombres();
  const extra=t[2]===1?`<input type="number" data-p="periodo" min="1" step="1" value="${o.periodo??''}" aria-label="Periodo (velas)" title="Periodo (velas)">`:t[2]===2?`<input type="number" data-p="valor" step="any" value="${o.valor??''}" aria-label="Valor" title="Valor">`:
    t[2]===3?`<input type="number" data-p="k" min="1" step="1" value="${o.k??''}" aria-label="Vela k de la sesión" title="k = nº de vela de la sesión (1 = la primera)">`:
    t[2]===4?`<select data-p="nombre" aria-label="Qué nivel">${(N.length?N:['']).map(n=>`<option value="${esc(n)}"${o.nombre===n?' selected':''}>${n?esc(n):'— define un nivel —'}</option>`).join('')}</select>`:'';
  const df=DESF_OK(o)?`<input type="number" class="desf" data-p="desfase" min="0" step="1" value="${o.desfase>0?o.desfase:''}" placeholder="↶0" aria-label="Hace N velas (0 = la vela actual)" title="Hace N velas: 0 = la vela actual, 1 = la anterior…">`:'';
  return `<div class="operando${extra?'':' sinp'}${t[2]===4?' conniv':''}${df?' condesf':''}" data-lado="${lado}">${selInd(o,lado)}${extra}${df}</div>`}
/* edita un operando (obj[key]) desde un control; true = hay que repintar */
function editOp(obj,key,el,e){const p=el.dataset.p,o=obj[key]||{};
  if(p==='desfase'){const v=el.value===''?0:Math.max(0,Math.round(+el.value));if(v>0)o.desfase=v;else delete o.desfase;obj[key]=o;return false}
  if(p==='tipo'){if(e.type!=='change')return false;const t=IND.find(x=>x[0]===el.value),n={tipo:el.value};if(o.desfase>0&&DESF_OK(n))n.desfase=o.desfase;if(t[2]===1)n.periodo=o.periodo||(el.value==='sma'||el.value==='ema'?200:14);if(t[2]===2)n.valor=o.valor??50;
    if(t[2]===3)n.k=o.k||1;if(t[2]===4)n.nombre=nivNombres()[0]||'';obj[key]=n;return true}
  o[p]=p==='nombre'?el.value:el.value===''?null:+el.value;obj[key]=o;return false}
function condList(g){return /^p\d+$/.test(g)?SPEC.reglas.pasos[+g.slice(1)].condiciones:SPEC.reglas[g]}
function bloquesHTML(g,L,vacio){return L.length?L.map((c,i)=>{
  const xf=c.op==='x_factor';
  const derHTML=xf?`<input type="number" class="xf-val" data-p="x_factor_val" step="0.1" min="0.01" value="${c.factor??''}" placeholder="2" aria-label="Multiplicador" title="Escribe el multiplicador. Ej: ATR(14) × 4">`:operandoHTML(c.der,'der');
  return `<div class="bloque" data-g="${g}" data-i="${i}"><span class="y">${i?'Y':'SI'}</span>${operandoHTML(c.izq,'izq')}
    <select data-p="op" aria-label="Comparador">${CMP.map(([k,l])=>`<option value="${k}"${c.op===k?' selected':''}>${l}</option>`).join('')}</select>${derHTML}
    <button type="button" class="quita" aria-label="Quitar este bloque" title="Quitar">✕</button></div>`}).join(''):`<div class="vacio-b">${vacio}</div>`}
function normSpec(s){s=s||SPEC;if(!s.sesion||typeof s.sesion!=='object')s.sesion={zona_horaria:'America/New_York',inicio:'09:30',fin:'16:00',cerrar_al_final:false,max_operaciones_dia:null};
  if(s.sesion_on==null)s.sesion_on=false;if(!Array.isArray(s.niveles))s.niveles=[];if(!s.reglas)s.reglas={};['filtros','entrada','salida','pasos'].forEach(g=>{if(!Array.isArray(s.reglas[g]))s.reglas[g]=[]});
  s.reglas.pasos.forEach(p=>{if(!Array.isArray(p.condiciones))p.condiciones=[]});if(s.reglas.salida_modo!=='todas')s.reglas.salida_modo='cualquiera';if(!s.ejecucion)s.ejecucion={momento:'apertura_siguiente',orden:'mercado'};return s}
/* todos los operandos de la regla: fn(operando, dónde) */
function cadaOp(fn,s){s=s||SPEC;const R=s.reglas||{};['filtros','entrada','salida'].forEach(g=>(Array.isArray(R[g])?R[g]:[]).forEach(c=>{if(c){fn(c.izq,g);fn(c.der,g)}}));
  (Array.isArray(R.pasos)?R.pasos:[]).forEach(p=>(p&&Array.isArray(p.condiciones)?p.condiciones:[]).forEach(c=>{if(c){fn(c.izq,'paso');fn(c.der,'paso')}}));(Array.isArray(s.niveles)?s.niveles:[]).forEach(n=>n&&fn(n.valor,'nivel'));
  if(s.gestion&&s.gestion.stop&&s.gestion.stop.tipo==='nivel')fn(s.gestion.stop.valor,'stop')}
function usaSesion(s){let u=false;cadaOp(o=>{if(o&&OPS_SESION.has(o.tipo))u=true},s);return u}
function renderNiveles(){const L=SPEC.niveles;$('#bl-niveles').innerHTML=L.length?L.map((n,i)=>`<div class="nivel-f" data-ni="${i}"><input type="text" data-nv="nombre" value="${esc(n.nombre||'')}" aria-label="Nombre del nivel" placeholder="NIVEL" maxlength="20">${operandoHTML(n.valor||{tipo:'sesion_anterior_max'},'izq')}<button type="button" class="quita" data-quita-nivel="${i}" aria-label="Quitar este nivel" title="Quitar">✕</button></div>`).join(''):
  '<div class="vacio-b">Sin niveles. En sesión: NIVEL = máximo de la sesión anterior, y luego «máximo &gt; NIVEL».</div>'}
function onNivel(e){const r=e.target.closest('.nivel-f'),n=SPEC.niveles[+r.dataset.ni],el=e.target;if(!n)return;
  if(el.dataset.nv==='nombre'){const v=el.value.toUpperCase().replace(/[^A-Z0-9_ÁÉÍÓÚÑ]/g,'').slice(0,20),old=n.nombre;if(el.value!==v)el.value=v;n.nombre=v;
    if(old&&old!==v)cadaOp(o=>{if(o&&o.tipo==='nivel'&&o.nombre===old)o.nombre=v});renderCond();cambioReglas();return}
  if(!el.dataset.p)return;if(editOp(n,'valor',el,e))renderNiveles();cambioReglas()}
function renderPasos(){const P=SPEC.reglas.pasos;$('#bl-pasos').innerHTML=P.length?P.map((p,i)=>{const v=p.ventana,sel=t=>(v?v.tipo:'ninguna')===t?' selected':'';
  return `<div class="paso" data-pi="${i}"><div class="paso-h"><span class="pn">PASO ${i+1}</span><input type="text" data-ps="nombre" value="${esc(p.nombre||'')}" aria-label="Nombre del paso ${i+1}" placeholder="RUPTURA" maxlength="24">
    <select data-ps="vt" aria-label="Cuándo debe ocurrir el paso ${i+1}"><option value="primeras_velas_sesion"${sel('primeras_velas_sesion')}>primeras N velas</option><option value="velas_tras_anterior"${sel('velas_tras_anterior')}>N velas tras el anterior</option><option value="ninguna"${sel('ninguna')}>sin ventana</option></select>
    <input type="number" data-ps="velas" min="1" step="1" value="${v&&v.velas!=null?v.velas:''}" aria-label="N velas del paso ${i+1}" title="N velas"${v?'':' disabled'}>
    <button type="button" class="btn" data-add-cond="${i}">+ COND.</button><button type="button" class="quita" data-quita-paso="${i}" aria-label="Quitar el paso ${i+1}" title="Quitar">✕</button></div>
    <div class="bloques">${bloquesHTML('p'+i,p.condiciones,'Añade al menos una condición a este paso.')}</div></div>`}).join(''):
  '<div class="vacio-b">Sin pasos: entra en cuanto se cumple la entrada. Con pasos (RUPTURA y luego RETESTEO), entra en la vela que completa el último.</div>'}
function onPaso(e){const el=e.target,box=el.closest('.paso'),p=SPEC.reglas.pasos[+box.dataset.pi],k=el.dataset.ps;if(!k||!p)return;
  if(k==='nombre'){const v=el.value.toUpperCase().slice(0,24);if(el.value!==v)el.value=v;p.nombre=v;cambioReglas();return}
  if(k==='vt'){if(e.type!=='change')return;p.ventana=el.value==='ninguna'?null:{tipo:el.value,velas:(p.ventana&&p.ventana.velas)||(el.value==='primeras_velas_sesion'?2:8)};renderPasos();cambioReglas();return}
  if(k==='velas'&&p.ventana){p.ventana.velas=el.value===''?null:Math.round(+el.value);cambioReglas()}}
function renderStopNv(){const G=SPEC.gestion.stop,on=G.tipo==='nivel';$('#f-stop-nv').hidden=!on;$('#f-stop-vc').hidden=on;
  $('#f-stop-op').innerHTML=on?operandoHTML(G.valor&&typeof G.valor==='object'?G.valor:(G.valor={tipo:'minimo'}),'izq')+'<small class="c-dim">el precio de esa vela: la de la señal de entrada</small>':''}
function onStopNv(e){const el=e.target;if(!el.dataset.p)return;if(editOp(SPEC.gestion.stop,'valor',el,e))renderStopNv();actualizarPI()}
function renderCond(){['filtros','entrada','salida'].forEach(g=>{$('#bl-'+g).innerHTML=bloquesHTML(g,SPEC.reglas[g],g==='filtros'?'Sin filtros: puede entrar en cualquier contexto.':g==='entrada'?(SPEC.reglas.pasos.length?'Sin condición extra: entra al completar los pasos.':'Añade al menos una condición de entrada.'):'Sin salida: usa stop, objetivo, tiempo o el fin de sesión.')});
  renderPasos();renderStopNv()}
function renderBloques(){renderNiveles();renderCond()}
function onBloque(e){const b=e.target.closest('.bloque');if(!b)return;const g=b.dataset.g,i=+b.dataset.i,L=condList(g),c=L[i];if(!c)return;
  if(e.type==='click'){if(e.target.closest('.quita')){L.splice(i,1);renderCond();cambioReglas()}return}
  const el=e.target,p=el.dataset.p;if(!p)return;
  if(p==='op'){c.op=el.value;if(el.value==='x_factor'&&!c.factor)c.factor=2;renderCond()}
  else if(p==='x_factor_val'){c.factor=el.value===''?null:+el.value}
  else{const lado=el.closest('.operando')?.dataset.lado;
    if(lado&&editOp(c,lado,el,e)){renderCond();const nb=$(`.bloque[data-g="${g}"][data-i="${i}"] .operando[data-lado="${lado}"] select`);nb&&nb.focus()}}
  cambioReglas()}
/* parámetros de la meseta: mismos nombres que el motor (adaptar_spec_app) */
function candidatos(){const out=[],usados=new Set(),perKey={};const nuevo=b=>{let n=b,k=2;while(usados.has(n)){n=b+'_'+k;k++}usados.add(n);return n};
  const IMAP={precio:'close',apertura:'open',maximo:'high',minimo:'low'};
  (SPEC.reglas.pasos||[]).forEach((p,i)=>{const v=p.ventana;if(!v||!(v.velas>0))return;const nm=nuevo('n_'+(String(p.nombre||'paso').toLowerCase().replace(/[^\p{L}\p{N}_]+/gu,'_').replace(/^_+|_+$/g,'')||'paso'));out.push({nm,v:+v.velas,lab:`Ventana de ${p.nombre||'paso '+(i+1)} (velas)`,per:true,ven:true})});
  ['filtros','entrada','salida'].forEach(sec=>SPEC.reglas[sec].forEach((c,bi)=>{const other=s=>c[s==='izq'?'der':'izq'];['izq','der'].forEach(s=>{const o=c[s];if(!o)return;
    if(o.tipo==='num'){if(!Number.isFinite(+o.valor))return;const nm=nuevo({filtros:'filtro',entrada:'entrada',salida:'salida'}[sec]);out.push({nm,v:+o.valor,lab:`${{filtros:'Filtro',entrada:'Entrada',salida:'Salida'}[sec]}: ${condTxt(c)} → el ${nf(+o.valor,(+o.valor)%1?2:0)}`,osc:other(s)&&other(s).tipo==='rsi',sec,bi,s,k:'valor'})}
    else if(o.periodo>0){const ind=IMAP[o.tipo]||o.tipo,key=ind+'|'+o.periodo;if(perKey[key])return;const nm=nuevo(ind+'_n');perKey[key]=nm;out.push({nm,v:+o.periodo,lab:`Periodo de ${opTxt(o)}`,per:true,sec,bi,s,k:'periodo'})}})}));
  return out}
function rejilla(c){const v=c.v;if(c.ven){const a=Math.max(1,v-2);return[a,a+1,a+2,a+3,a+4]}let st;if(c.per)st=Math.max(1,Math.round(v*.25));else if(c.osc)st=5;else{const r=Math.abs(v)*.1||1;const m=Math.pow(10,Math.floor(Math.log10(r)));st=Math.round(r/m)*m}
  const g=[-2,-1,0,1,2].map(k=>+(v+k*st).toFixed(6));return c.per?g.map(x=>Math.max(1,Math.round(x))):g}
function renderMeseta(){const C=candidatos(),el=$('#f-meseta');if(C.length<2){SPEC.optimizar=null;el.innerHTML='<p class="c-dim" style="margin:0">Tu regla necesita al menos 2 números (umbrales o periodos) para probar la meseta.</p>';return}
  let O=SPEC.optimizar&&typeof SPEC.optimizar==='object'?SPEC.optimizar:{};let ks=Object.keys(O).filter(k=>C.some(c=>c.nm===k));
  if(ks.length<2){const pref=C.filter(c=>!c.per).concat(C.filter(c=>c.per));ks=[...new Set([...ks,...pref.map(c=>c.nm)])].slice(0,2)}
  const nO={};ks.forEach(k=>{const c=C.find(x=>x.nm===k),g=Array.isArray(O[k])&&O[k].length===5&&(c.ven?O[k].includes(c.v):O[k][2]===c.v)?O[k]:rejilla(c);nO[k]=g});SPEC.optimizar=nO;
  el.innerHTML=ks.map((k,i)=>`<div class="campo"><label for="f-mz${i}">Parámetro ${i+1}</label><select id="f-mz${i}" data-mz="${i}">${C.map(c=>`<option value="${c.nm}"${c.nm===k?' selected':''}${ks.includes(c.nm)&&c.nm!==k?' disabled':''}>${esc(c.lab)}</option>`).join('')}</select>
    <input type="text" id="f-mv${i}" data-mv="${k}" value="${nO[k].join(', ')}" aria-label="Valores a probar de ${esc(k)}"><small>5 valores separados por comas; el central es el tuyo</small></div>`).join('')}
function onMeseta(e){const t=e.target;if(t.dataset.mz!=null&&e.type==='change'){const i=+t.dataset.mz,ks=Object.keys(SPEC.optimizar||{});const C=candidatos();const c=C.find(x=>x.nm===t.value);ks[i]=t.value;
    const nO={};ks.forEach(k=>{nO[k]=k===t.value?rejilla(c):SPEC.optimizar[k]});SPEC.optimizar=nO;renderMeseta();actualizarPI();return}
  if(t.dataset.mv&&e.type==='change'){const v=t.value.split(/[;,\s]+/).filter(Boolean).map(Number);const c=candidatos().find(x=>x.nm===t.dataset.mv);
    if(v.length===5&&v.every(Number.isFinite)&&(!c.ven||(v.includes(c.v)&&v.every(x=>x>=1&&Number.isInteger(x))))){if(!c.ven)v[2]=c.v;SPEC.optimizar[t.dataset.mv]=v;t.value=v.join(', ')}else{toast('Escribe 5 números separados por comas');t.value=SPEC.optimizar[t.dataset.mv].join(', ')}actualizarPI()}}
function cambioReglas(){const C=candidatos();if(SPEC.optimizar)Object.keys(SPEC.optimizar).forEach(k=>{const c=C.find(x=>x.nm===k);if(!c||!(c.ven?SPEC.optimizar[k].includes(c.v):SPEC.optimizar[k][2]===c.v))delete SPEC.optimizar[k]});renderMeseta();actualizarPI()}
function rellenarForm(){normSpec();$$('#pi-form [data-k]').forEach(el=>{const v=getK(SPEC,el.dataset.k);el.value=v==null?'':v});renderBloques();renderMeseta();actualizarPI(true)}
function onCampo(e){const el=e.target;if(!el.dataset||!el.dataset.k)return;let v=el.value;if(el.type==='number')v=v===''?null:+v;if(el.dataset.bool)v=v==='true';setK(SPEC,el.dataset.k,v);
  if(el.dataset.k==='gestion.stop.tipo'){if(v==='nivel')SPEC.gestion.stop.valor={tipo:'minimo'};else if(SPEC.gestion.stop.valor&&typeof SPEC.gestion.stop.valor==='object')SPEC.gestion.stop.valor=null;renderStopNv()}
  if(el.dataset.k==='costes.perfil'&&v==='darwinex_mt5'){Object.assign(SPEC.costes,clone(perfilDe(SPEC.activo.simbolo).costes));rellenarForm();return}
  if(el.dataset.k.startsWith('costes.')&&el.dataset.k!=='costes.perfil'&&SPEC.costes.perfil==='darwinex_mt5'){SPEC.costes.perfil='manual';$('#f-perfil').value='manual'}
  actualizarPI()}
function stopTxt(G){return G.tipo==='nivel'?`STOP = ${opTxt(G.valor)} de la vela de la señal`:`stop ${G.tipo==='pct'?'−'+nf(+G.valor||0,1)+' %':nf(+G.valor||0,1)+' × ATR'}`}
function pseudo(){const s=SPEC,K=t=>`<span class="kw">${t}</span>`,Vv=t=>`<span class="vv">${esc(t)}</span>`,C=t=>`<span class="cm"># ${esc(t)}</span>`,AV=t=>`<span class="ojo"># ¡ojo! ${esc(t)}</span>`;
  normSpec(s);const L=[],R=s.reglas,G=s.gestion,dir=s.direccion,ent=dir==='corto'?'VENDER EN CORTO':'COMPRAR',sal=dir==='corto'?'RECOMPRAR':'VENDER';
  const alCierre=s.ejecucion.momento==='cierre_misma_vela',ej=alCierre?'al cierre de esa vela':'en la apertura siguiente';
  const ses=INTRADIA(s.temporalidad)&&s.sesion_on?s.sesion:null,P=R.pasos||[],NV=s.niveles||[],todas=R.salida_modo==='todas'&&R.salida.length>1;
  L.push(C(`${s.nombre||'Mi estrategia'} · ${s.activo.simbolo||'¿activo?'} · ${(TFN[s.temporalidad]||'').replace('vela ','')}`));
  if(ses){L.push(`${K('SESIÓN')}   ${Vv(ses.inicio+'–'+ses.fin)}  ${C(ZSES[ses.zona_horaria]||ses.zona_horaria)}`);L.push(`         vela 1 = la de las ${Vv(ses.inicio)} · fuera de la sesión no cuenta ninguna vela`)}
  else if(usaSesion(s))L.push(AV('usas operandos de sesión: activa la sesión (velas intradía)'));
  NV.forEach(n=>L.push(`${K(esc(n.nombre||'¿NOMBRE?'))} = ${Vv(opTxt(n.valor))}${n.valor&&String(n.valor.tipo).startsWith('sesion_anterior')?'  '+C('de la sesión del día hábil anterior'):''}`));
  L.push(`${K(ses?'CADA SESIÓN, PARA CADA':'PARA CADA')} ${Vv(TFN[s.temporalidad]||'vela')} cerrada${ses?'':'  '+C(ZN[s.datos.zona_horaria]||'')}`);
  if(!ses&&s.datos.zona_horaria!=='servidor_gmt3_usdst')L.push('  '+AV('TIS alinea las velas a la hora del bróker'));
  if(P.length){
    P.forEach((p,i)=>{const v=p.ventana,prev=i?(P[i-1].nombre||'paso '+i):'';
      const vt=!v?'cuando ocurra':v.tipo==='primeras_velas_sesion'?`en las ${v.velas??'?'} primeras velas de la sesión`:`en las ${v.velas??'?'} velas siguientes a ${prev||'la anterior'}`;
      L.push(`  ${K((i+1)+'. '+(p.nombre||'PASO '+(i+1)))}: ${esc(vt)}`);
      if(!p.condiciones.length)L.push('     '+AV('paso sin condiciones'));
      p.condiciones.forEach((c,j)=>L.push(`     ${K(j?'Y':'SI')} ${Vv(condTxt(c))}`));
      if(v)L.push('     '+C(`si pasan ${v.velas??'?'} velas sin cumplirse → ese día no se opera`))});
    const extra=[...R.filtros.map(c=>[c,'filtro']),...R.entrada.map(c=>[c,''])];
    if(extra.length){L.push(`  ${K('Y ADEMÁS')}, en esa misma vela:`);extra.forEach(([c,t])=>L.push(`     ${K('Y')} ${Vv(condTxt(c))}${t?'   '+C(t):''}`))}
    L.push(`  ${K('ENTONCES')} ${K(ent)} ${esc(ej)} (la de ${esc(P[P.length-1].nombre||'el último paso')})`);
  }else{
    const conds=[...R.filtros.map(c=>[c,'filtro']),...R.entrada.map(c=>[c,''])];
    L.push(`  ${K('SI')} no hay posición`);
    if(!conds.length)L.push('     '+AV('falta una condición de entrada'));
    conds.forEach(([c,t])=>L.push(`     ${K('Y')} ${Vv(condTxt(c))}${t?'   '+C(t):''}`));
    L.push(`  ${K('ENTONCES')} ${K(ent)} ${esc(ej)}`)}
  const siz=s.sizing.tipo==='pct_capital'?`${nf(+s.sizing.valor||0,0)} % del capital`:s.sizing.tipo==='riesgo_pct'?`arriesgando ${nf(+s.sizing.valor||0,2)} %`:`${nf(+s.sizing.valor||0,2)} lotes`;
  L.push(`           tamaño: ${Vv(siz)}`);
  if(G.stop.tipo==='nivel')L.push(`           ${Vv(stopTxt(G.stop))}`);
  if(dir==='ambos')L.push('           '+C('y en corto con las condiciones espejo'));
  const objT=G.objetivo.tipo!=='ninguno'?`objetivo ${G.objetivo.tipo==='pct'?'+'+nf(+G.objetivo.valor||0,1)+' %':nf(+G.objetivo.valor||0,1)+' × ATR'}`:null;
  if(ses||P.length||alCierre||G.stop.tipo==='nivel'){
    L.push(`  ${K('SI')} hay posición, en cada vela y en este orden:`);let n=1;
    if(alCierre)L.push('     '+C('la vigilancia empieza en la vela siguiente a la entrada'));
    if(G.stop.tipo!=='ninguno')L.push(`     ${n++}. toca el ${Vv(G.stop.tipo==='nivel'?'STOP':stopTxt(G.stop))} → ${K('SALE')} en el stop`);
    if(objT)L.push(`     ${n++}. toca el ${Vv(objT)} → ${K('SALE')} en el objetivo`);
    if(R.salida.length)L.push(`     ${n++}. ${R.salida.map(c=>Vv(condTxt(c))).join(` ${K(R.salida_modo==='todas'?'Y':'O')} `)} → ${K(sal)} ${esc(ej)}`);
    if(G.salida_tiempo_velas>0)L.push(`     ${n++}. pasan ${Vv(G.salida_tiempo_velas+' velas')} → ${K('SALE')}`);
    if(ses&&ses.cerrar_al_final)L.push(`     ${n++}. es la última vela de la sesión → ${K('SALE')} a su cierre`);
    if(n===1)L.push('     '+AV('no hay forma de salir'));
    if(G.stop.tipo!=='ninguno'&&objT)L.push('     '+C('si en una vela se tocan stop y objetivo, manda el stop'));
    const mx=ses?ses.max_operaciones_dia:s.sesion&&INTRADIA(s.temporalidad)?s.sesion.max_operaciones_dia:null;
    if(mx>0)L.push(`  ${K('MÁXIMO')} ${Vv(mx+(mx==1?' operación':' operaciones')+' al día')}`);
  }else{
    const outs=R.salida_modo==='todas'&&R.salida.length>1?[R.salida.map(c=>Vv(condTxt(c))).join(` ${K('Y')} `)]:R.salida.map(c=>Vv(condTxt(c)));
    if(G.stop.tipo!=='ninguno')outs.push(Vv(stopTxt(G.stop)));
    if(objT)outs.push(Vv(objT));
    if(G.salida_tiempo_velas>0)outs.push(Vv(`pasan ${G.salida_tiempo_velas} velas`));
    L.push(`  ${K('SI')} hay posición`);
    if(todas)L.push('     '+C('salida: todas sus condiciones en la misma vela'));
    if(!outs.length)L.push('     '+AV('no hay forma de salir'));
    else if(outs.length===1)L.push(`     ${K('Y')} ${outs[0]}`);
    else{L.push(`     ${K('Y')} ( ${outs[0]}`);outs.slice(1).forEach((o,i)=>L.push(`         ${K('O')} ${o}${i===outs.length-2?' )':''}`))}
    L.push(`  ${K('ENTONCES')} ${K(sal)} ${esc(ej)}`)}
  const c=s.costes;L.push(`${K('COSTES')}  spread ${Vv(nf(+c.spread_pb||0,3)+' pb')} · com. ${Vv(nf(+c.comision_pb_lado||0,2))} · desliz. ${Vv(nf(+c.deslizamiento_pb_lado||0,1))} pb/lado`);
  const cs=corteFechas();L.push(`${K('CORTE')}    diseño ${Vv(fdx(s.datos.desde)+' → '+fdx(cs.finIS))} · prueba ${Vv(fdx(cs.ini)+' →')}  ${C(cs.pctOOS!=null?nf(cs.pctOOS,0)+' %':'')}`);
  if(s.optimizar)L.push(`${K('MESETA')}   ${Object.entries(s.optimizar).map(([k,v])=>Vv(k+' '+v.join('/'))).join(' × ')}`);
  return L}
const fdx=s=>s?fd(String(s).slice(0,10)):'—';
let csvFechas=null;
function fechaAuto(){const s=SPEC;if(!csvFechas&&s.datos.desde===D_DEMO.desde&&s.datos.hasta===D_DEMO.hasta&&D_DEMO.corte_auto&&D_DEMO.corte_auto.fecha)return D_DEMO.corte_auto.fecha;
  const F=(csvFechas||VF.map(v=>v.t)).filter(t=>(!s.datos.desde||t>=s.datos.desde)&&(!s.datos.hasta||t<=s.datos.hasta));
  if(F.length>10)return F[Math.floor(F.length*.7)];const a=ts(s.datos.desde),b=ts(s.datos.hasta);return isNaN(a)||isNaN(b)?null:new Date(a+(b-a)*.7).toISOString().slice(0,10)}
function corteFechas(){const s=SPEC,a=ts(s.datos.desde),b=ts(s.datos.hasta);let ini;
  if(s.corte.tipo==='auto')ini=fechaAuto();
  else if(s.corte.tipo==='pct'){const p=Math.max(10,Math.min(95,+s.corte.is_pct||70));ini=isNaN(a)||isNaN(b)?null:new Date(a+(b-a)*p/100).toISOString().slice(0,10)}else ini=s.corte.fecha;
  const it=ts(ini),fin=isNaN(it)?null:new Date(it-864e5).toISOString().slice(0,10);const pctOOS=isNaN(a)||isNaN(b)||isNaN(it)||b<=a?null:(b-it)/(b-a)*100;
  return{ini,finIS:fin,pctOOS}}
function specLimpio(){const s=normSpec(clone(SPEC));const cs=corteFechas();s.corte.fecha_efectiva=cs.ini;if(s.corte.tipo==='auto')s.corte.fecha=cs.ini;if(!s.optimizar)delete s.optimizar;
  const intra=INTRADIA(s.temporalidad),mx=s.sesion.max_operaciones_dia>0?Math.round(s.sesion.max_operaciones_dia):null;
  if(!(intra&&s.sesion_on)){delete s.sesion;if(intra&&mx)s.gestion.max_operaciones_dia=mx}else if(!mx)delete s.sesion.max_operaciones_dia;else s.sesion.max_operaciones_dia=mx;
  delete s.sesion_on;if(s.reglas.salida_modo!=='todas')delete s.reglas.salida_modo;if(!s.niveles.length)delete s.niveles;if(!s.reglas.pasos.length)delete s.reglas.pasos;return s}
function syncSalModo(){const x=$('#f-salmodo');if(x){x.value=SPEC.reglas.salida_modo||'cualquiera';x.disabled=SPEC.reglas.salida.length<2}}
function syncSesion(){syncSalModo();const f=$('#f-sesion');if(!f)return;const intra=INTRADIA(SPEC.temporalidad),on=!!SPEC.sesion_on;f.classList.toggle('intradia',intra);f.classList.toggle('apagada',!on);$('#f-ses-act').checked=on;
  $$('#f-ses-on [data-k]').forEach(x=>x.disabled=!on);$('#f-ses-n').textContent=!intra?'no aplica en '+(TFN[SPEC.temporalidad]||'').replace('vela ','velas '):on?SPEC.sesion.inicio+'–'+SPEC.sesion.fin+' · '+(ZSES[SPEC.sesion.zona_horaria]||SPEC.sesion.zona_horaria):'24 h, sin sesión'}
function jsonHTML(){return esc(JSON.stringify(specLimpio(),null,2)).replace(/(&quot;[a-z_]+&quot;):/g,'<span class="kw">$1</span>:')}
function checklist(){const s=SPEC,R=s.reglas,G=s.gestion,c=s.costes,out=[];const ok=(e,t,d)=>out.push({e,t,d});
  ok(s.activo.simbolo&&s.activo.simbolo.trim()?'pasa':'falla','Activo',s.activo.simbolo?esc(s.activo.simbolo)+' · '+(TFN[s.temporalidad]||'').replace('vela ',''):'Escribe el símbolo');
  const a=ts(s.datos.desde),b=ts(s.datos.hasta),anios=(b-a)/(365.25*864e5);
  ok(isNaN(a)||isNaN(b)||b<=a?'falla':anios<5?'aviso':'pasa','Histórico',isNaN(anios)||b<=a?'Revisa las fechas':nf(anios,1)+' años'+(anios<5?' (pocos)':''));
  ok(s.datos.zona_horaria==='servidor_gmt3_usdst'?'pasa':'aviso','Hora del bróker',s.datos.zona_horaria==='servidor_gmt3_usdst'?'Servidor MT5':'Otra zona: otra vela');
  const P=R.pasos||[],todas=[...R.filtros,...R.entrada,...R.salida,...P.flatMap(x=>x.condiciones)];
  const malas=todas.filter(x=>x.op==='x_factor'?(!opValido(x.izq)||!(x.factor>0)):(!opValido(x.izq)||!opValido(x.der))).length+(s.niveles||[]).filter(n=>!n.nombre||!opValido(n.valor)).length
    +P.filter(x=>!x.condiciones.length||(x.ventana&&!(x.ventana.velas>=1))).length;
  ok(R.entrada.length||P.length?'pasa':'falla','Entrada',P.length?P.length+' paso(s)'+(R.entrada.length?' + '+R.entrada.length+' cond.':'')+(R.filtros.length?' + '+R.filtros.length+' filtro(s)':''):R.entrada.length?R.entrada.length+' cond. + '+R.filtros.length+' filtro(s)':'Añade una condición');
  const intra=INTRADIA(s.temporalidad),sesOn=intra&&s.sesion_on,usa=usaSesion(s);
  if(intra||usa)ok(usa&&!sesOn?'falla':sesOn?'pasa':'aviso','Sesión',usa&&!sesOn?(intra?'Usas operandos de sesión: actívala':'Operandos de sesión: solo en intradía'):sesOn?s.sesion.inicio+'–'+s.sesion.fin+' · '+(ZSES[s.sesion.zona_horaria]||s.sesion.zona_horaria):'24 h, sin sesión');
  ok(malas?'falla':'pasa','Bloques completos',malas?malas+' sin número':'Todo con números');
  const salidas=R.salida.length+(G.stop.tipo!=='ninguno'?1:0)+(G.objetivo.tipo!=='ninguno'?1:0)+(G.salida_tiempo_velas>0?1:0)+(sesOn&&s.sesion.cerrar_al_final?1:0);
  const stopMal=(G.stop.tipo==='nivel'?!opValido(G.stop.valor):G.stop.tipo!=='ninguno'&&!(G.stop.valor>0))||(G.objetivo.tipo!=='ninguno'&&!(G.objetivo.valor>0));
  ok(!salidas||stopMal?'falla':'pasa','Salida',stopMal?'Falta el valor del stop/objetivo':salidas?salidas+' forma(s) de cerrar':'Sin salida no cierra');
  ok(['apertura_siguiente','cierre_misma_vela'].includes(s.ejecucion.momento)?'pasa':'falla','Sin mirar el futuro',s.ejecucion.momento==='apertura_siguiente'?'Apertura siguiente':s.ejecucion.momento==='cierre_misma_vela'?'Al cierre de la vela de la señal':'No soportado');
  const sizMal=!(s.sizing.valor>0)||(s.sizing.tipo==='riesgo_pct'&&G.stop.tipo==='ninguno')||s.sizing.tipo==='lotes_fijos'||(s.sizing.tipo==='pct_capital'&&s.sizing.valor>100);
  ok(sizMal?'falla':'pasa','Tamaño',sizMal?(s.sizing.tipo==='riesgo_pct'&&G.stop.tipo==='ninguno'?'Riesgo % exige stop':s.sizing.valor>100?'Máximo 100 % (sin apalancamiento)':'Indica el tamaño'):'Definido');
  const ct=(+c.spread_pb||0)+(+c.comision_pb_lado||0)+(+c.deslizamiento_pb_lado||0);
  ok(ct>0?(+c.deslizamiento_pb_lado>0?'pasa':'aviso'):'falla','Costes',ct>0?(+c.deslizamiento_pb_lado>0?'Con deslizamiento':'Sin deslizamiento'):'Costes 0: miente');
  const cs=corteFechas(),it=ts(cs.ini);
  ok(isNaN(it)||it<=a||it>=b?'falla':cs.pctOOS<20?'aviso':'pasa','Corte diseño / prueba',isNaN(it)||it<=a||it>=b?'Fuera de los datos':nf(cs.pctOOS,0)+' % para la prueba');
  ok(SPEC.optimizar&&Object.keys(SPEC.optimizar).length===2?'pasa':'aviso','Meseta',SPEC.optimizar&&Object.keys(SPEC.optimizar).length===2?Object.keys(SPEC.optimizar).join(' × '):'Rejilla automática');
  {const nc=datosNoCuadran(s),d=datosCargados();ok(nc?'falla':'pasa','Datos',nc?'No son de tu activo · <button type="button" class="link" data-ir-fuente>sube tus datos aquí →</button>':d?d.txt.replace(/^los /,''):esc(CSV&&CSV.nombre||'tu CSV'))}
  return out}
function actualizarPI(inicial){const pre=$('#pi-codigo');
  if(piFmt==='pseudo'){const L=pseudo(),txt=L.map(l=>l.replace(/<[^>]+>/g,''));
    if(!inicial&&piPrev.length&&JSON.stringify(txt)===JSON.stringify(piPrev)){}else{
    pre.innerHTML=L.map((l,i)=>!inicial&&piPrev.length&&piPrev[i]!==txt[i]&&txt[i].trim()?`<span class="nuevo">${l}</span>`:l).join('\n');piPrev=txt;
    if(!RM)setTimeout(()=>$$('.nuevo',pre).forEach(x=>x.classList.add('ya')),900)}}
  else pre.innerHTML=jsonHTML();
  const C=checklist(),nok=C.filter(x=>x.e!=='falla').length,mal=C.filter(x=>x.e==='falla').length;
  $('#pi-check').innerHTML=C.map(x=>`<li class="${x.e}"><span aria-hidden="true">${x.e==='pasa'?'✓':x.e==='falla'?'✗':'!'}</span><span><b>${esc(x.t)}</b><small title="${esc(x.d)}">${x.d}</small></span></li>`).join('');
  $('#pi-cuenta').textContent=nok+' de '+C.length+' listos';
  {const sl=$('#pi-fuente-sello'),nc=datosNoCuadran(SPEC),d=datosCargados();if(sl){sl.className='fuente-sello '+(nc?'ko':d?'ok':'tuyo');sl.textContent=nc?'✕ no son de tu activo':d?'✓ cuadran con tu regla':'tu CSV: revisa que sea de '+(SPEC.activo.simbolo||'tu activo')}const fz=$('#pi-fuente');if(fz)fz.classList.toggle('mal',!!nc)}
  const btn=$('#pi-correr');if(!corriendo){btn.disabled=mal>0;btn.title=mal?'Completa lo marcado en rojo':'Corre las 5 fases con el motor TIS'}
  if(!corriendo)$('#pi-nota-motor').innerHTML=mal?`Faltan ${mal} punto(s) en rojo.`:motorFn()?'Motor TIS listo: calcula las 5 fases de tu regla.':'Sin motor: se enseñan los resultados de la demo.';
  const cs=corteFechas();$('#f-corte-vis').innerHTML=cs.pctOOS!=null&&cs.pctOOS>0&&cs.pctOOS<100?`<div class="is" style="width:${100-cs.pctOOS}%">DISEÑO ${yr(SPEC.datos.desde)}–${yr(cs.ini)}</div><div class="oos" style="width:${cs.pctOOS}%">PRUEBA ${nf(cs.pctOOS,0)} %</div>`:'';
  $('#f-corte-auto').innerHTML=SPEC.corte.tipo==='auto'&&cs.ini?`Automático: 70/30 de los datos disponibles → la prueba honesta empieza el <b>${fd(cs.ini)}</b>.`:'';
  $('#f-corte-f').disabled=SPEC.corte.tipo!=='fecha';$('#f-corte-p').disabled=SPEC.corte.tipo!=='pct';
  $('#f-stop-v').disabled=SPEC.gestion.stop.tipo==='ninguno';$('#f-obj-v').disabled=SPEC.gestion.objetivo.tipo==='ninguno';
  $('#f-costes-fuente').textContent=SPEC.costes.perfil==='darwinex_mt5'?perfilDe(SPEC.activo.simbolo).fuente:'Costes introducidos a mano.';syncSesion();
  store.set('mct_spec2',JSON.stringify(SPEC))}

/* ---------- pegar lo del agente 04 VALIDADOR (mesa TIS) → formulario ---------- */
const EJ_04='ACTIVO: XAUUSD · diario\nENTRADA: RSI(4) < 25 y cierre > media de 200\nSALIDA: RSI(4) > 55\nSTOP: sin stop\nHORARIO: todo el día (velas diarias)\nDIRECCIÓN: compra\nOPERACIONES POR DÍA: 1\nCOMISIÓN: 0,01 pb por lado (supuesto)\nDESLIZAMIENTO: 3 pb por lado\nREPARTO: 70 % dentro de muestra / 30 % fuera de muestra';
const numES=t=>{const m=String(t).match(/-?\d+(?:[.,]\d+)?/);return m?+m[0].replace(',','.'):null};
const TF_DE=v=>/diari|\bd1\b|daily/i.test(v)?'D1':/4\s*h|\bh4\b/i.test(v)?'H4':/1\s*h\b|\bh1\b|1 hora|horari/i.test(v)?'H1':/15\s*min|\bm15\b/i.test(v)?'M15':/\b5\s*min|\bm5\b/i.test(v)?'M5':/seman|\bw1\b/i.test(v)?'W1':null;
let OD_SPEC=null; /* spec en construcción mientras se lee lo del agente 04 (sus niveles cuentan) */
function operandoDe(t){t=t.trim().toLowerCase().replace(/^(el|la|los|las|de)\s+/,'').replace(/^(el|la)\s+/,'');let m;
  if(/^(?:m[aá]ximo|high)\s+de\s+(?:la\s+)?(?:sesi[oó]n\s+anterior|ayer|la\s+sesi[oó]n\s+de\s+ayer)/.test(t))return{tipo:'sesion_anterior_max'};
  if(/^(?:m[ií]nimo|low)\s+de\s+(?:la\s+)?(?:sesi[oó]n\s+anterior|ayer|la\s+sesi[oó]n\s+de\s+ayer)/.test(t))return{tipo:'sesion_anterior_min'};
  if(/^cierre\s+de\s+(?:la\s+)?(?:sesi[oó]n\s+anterior|ayer)/.test(t))return{tipo:'sesion_anterior_cierre'};
  if(/^apertura\s+de\s+(?:la\s+)?sesi[oó]n/.test(t))return{tipo:'sesion_apertura'};
  {const N=nivNombres(OD_SPEC||SPEC),u=t.toUpperCase().trim();if(N.includes(u))return{tipo:'nivel',nombre:u};if(/^nivel\b/.test(t)&&N.length)return{tipo:'nivel',nombre:N[0]}}
  if((m=t.match(/^rsi\s*\(?\s*(\d+)\s*\)?/)))return{tipo:'rsi',periodo:+m[1]};
  if((m=t.match(/^(sma|ema|atr)\s*\(?\s*(\d+)\s*\)?/)))return{tipo:m[1],periodo:+m[2]};
  if((m=t.match(/^media\s+exponencial\s*(?:de\s*)?(\d+)/)))return{tipo:'ema',periodo:+m[1]};
  if((m=t.match(/^(?:media(?:\s+m[oó]vil)?(?:\s+simple)?|mm)\s*(?:de\s*)?(?:las?\s*)?\(?\s*(\d+)/)))return{tipo:'sma',periodo:+m[1]};
  if((m=t.match(/^m[aá]ximo\s+de\s+(?:las?\s+)?(\d+)/)))return{tipo:'max_n',periodo:+m[1]};
  if((m=t.match(/^m[ií]nimo\s+de\s+(?:las?\s+)?(\d+)/)))return{tipo:'min_n',periodo:+m[1]};
  if(/^(cierre|close|precio)/.test(t))return{tipo:'precio'};if(/^(apertura|open)/.test(t))return{tipo:'apertura'};
  if(/^(m[aá]ximo|high)/.test(t))return{tipo:'maximo'};if(/^(m[ií]nimo|low)/.test(t))return{tipo:'minimo'};
  if(/^-?\d/.test(t))return{tipo:'num',valor:numES(t)};return null}
const COMPS=[[/cruza\s+(?:hacia\s+)?arriba(?:\s+de)?|cruza\s+al\s+alza/,'cruza_arriba'],[/cruza\s+(?:hacia\s+)?abajo(?:\s+de)?|cruza\s+a\s+la\s+baja/,'cruza_abajo'],
  [/>=|≥|mayor\s+o\s+igual\s+(?:que|a)/,'>='],[/<=|≤|menor\s+o\s+igual\s+(?:que|a)/,'<='],
  [/>|por\s+encima\s+de(?:\s+la|\s+el|\s+su)?|mayor\s+(?:que|a)|supera(?:\s+a|\s+el|\s+la)?/,'>'],[/<|por\s+debajo\s+de(?:\s+la|\s+el|\s+su)?|menor\s+(?:que|a)/,'<']];
const INV={'>':'<','<':'>','>=':'<=','<=':'>=','cruza_arriba':'cruza_abajo','cruza_abajo':'cruza_arriba'};
function condDe(t){const x=t.toLowerCase().replace(/\s+/g,' ').trim();
  for(const [re,op] of COMPS){const m=x.match(re);if(!m)continue;
    let iz=x.slice(0,m.index).replace(/\s*\bcierra\s*$/,'').trim(),de=x.slice(m.index+m[0].length).trim();
    if(!iz||/^(el\s+precio|la\s+vela)$/.test(iz))iz='cierre';
    const a=operandoDe(iz),b=operandoDe(de);
    if(a&&b&&!(a.tipo==='num'&&b.tipo==='num'))return a.tipo==='num'?{izq:b,op:INV[op]||op,der:a}:{izq:a,op,der:b}}
  return null}
function condsDe(t){const partes=t.split(/\s+y\s+|;|\s+and\s+/i).map(x=>x.trim()).filter(Boolean),ok=[],mal=[];partes.forEach(p=>{const c=condDe(p);c?ok.push(c):mal.push(p)});return{ok,mal}}
function aplicarAgente04(txt){const out=[],L=txt.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);const nuevo=normSpec(clone(SPEC));OD_SPEC=nuevo;let reglas=false;
  const pon=(e,t)=>out.push({e,t}),pb=x=>/%/.test(x)?numES(x)*100:numES(x),sup=v=>/supuest/i.test(v);
  L.forEach(l=>{const m=l.match(/^[-*·•\d.)\s]*([A-Za-zÁÉÍÓÚÑáéíóúñ][A-Za-zÁÉÍÓÚÑáéíóúñ \/.]*?)\s*[:=]\s*(.+)$/);if(!m){pon('no','No entiendo: «'+l+'»');return}
    const k=m[1].toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g,'').trim(),v=m[2].trim(),vl=v.toLowerCase();
    if(/^(ACTIVO|SIMBOLO|CSV)/.test(k)){const sy=v.match(/\b([A-Z]{3,}[A-Z0-9]*)\b/),tf=TF_DE(v);if(sy){nuevo.activo.simbolo=sy[1];pon('ok','Activo: '+sy[1])}
      if(tf){nuevo.temporalidad=tf;pon('ok','Temporalidad: '+TFN[tf])}if(!sy&&!tf)pon('no','Activo: no reconozco «'+v+'»');return}
    if(/^(TEMPORALIDAD|MARCO)/.test(k)){const tf=TF_DE(v);tf?(nuevo.temporalidad=tf,pon('ok','Temporalidad: '+TFN[tf])):pon('no','Temporalidad: no reconozco «'+v+'»');return}
    if(/^(ENTRADA|SALIDA|FILTRO)/.test(k)){const sec=k.startsWith('ENTRADA')?'entrada':k.startsWith('SALIDA')?'salida':'filtros';let v2=v;
      const fs=/(?:,|;|\s+o\s+)?\s*(?:al|en\s+el)\s+(?:cierre|final)\s+de\s+(?:la\s+)?sesi[oó]n/i;if(sec==='salida'&&fs.test(v2)){v2=v2.replace(fs,'').trim();nuevo.sesion.cerrar_al_final=true;nuevo.sesion_on=true;pon('ok','Salida: al cierre de la sesión')}
      const r=v2?condsDe(v2.replace(/\s+o\s+/gi,sec==='salida'?' ; ':' o ')):{ok:[],mal:[]};
      if(!reglas){nuevo.reglas={filtros:[],entrada:[],salida:[],pasos:[]};reglas=true}
      r.ok.forEach(c=>{const esFiltro=sec!=='salida'&&['>','<','>=','<='].includes(c.op)&&['precio','apertura','maximo','minimo'].includes(c.izq.tipo)&&['sma','ema'].includes(c.der.tipo);const g=esFiltro?'filtros':sec;nuevo.reglas[g].push(c);
        pon('ok',{filtros:'Filtro',entrada:'Entrada',salida:'Salida'}[g]+': '+condTxt(c))});
      r.mal.forEach(x=>pon('no',{filtros:'Filtro',entrada:'Entrada',salida:'Salida'}[sec]+': no sé convertir «'+x+'» en un bloque. Ponlo a mano.'));return}
    if(/^STOP/.test(k)){if(/\bsin\b|ningun|^no\b/.test(vl)){nuevo.gestion.stop={tipo:'ninguno',valor:null};pon('ok','Stop: sin stop')}
      else if(/(m[ií]nimo|m[aá]ximo|apertura)\s+de\s+(?:la\s+)?vela/.test(vl)){const t=/m[ií]nimo/.test(vl)?'minimo':/m[aá]ximo/.test(vl)?'maximo':'apertura';nuevo.gestion.stop={tipo:'nivel',valor:{tipo:t}};pon('ok','Stop: en el '+opTxt({tipo:t})+' de la vela de la señal')}
      else if(/atr/.test(vl)&&numES(v)!=null){nuevo.gestion.stop={tipo:'atr',valor:numES(v)};pon('ok','Stop: '+nf(numES(v),1)+' × ATR')}
      else if(/%/.test(v)&&numES(v)!=null){nuevo.gestion.stop={tipo:'pct',valor:Math.abs(numES(v))};pon('ok','Stop: '+nf(Math.abs(numES(v)),1)+' %')}
      else pon('no','Stop «'+v+'»: el formulario admite % del precio o ATR. Elige el más parecido a mano.');return}
    if(/^(OBJETIVO|TAKE|TP\b)/.test(k)){if(/%/.test(v)&&numES(v)!=null){nuevo.gestion.objetivo={tipo:'pct',valor:Math.abs(numES(v))};pon('ok','Objetivo: '+nf(Math.abs(numES(v)),1)+' %')}
      else if(/atr/.test(vl)&&numES(v)!=null){nuevo.gestion.objetivo={tipo:'atr',valor:numES(v)};pon('ok','Objetivo: '+nf(numES(v),1)+' × ATR')}else if(/\bsin\b|ningun/.test(vl))pon('ok','Objetivo: sin objetivo');else pon('no','Objetivo «'+v+'»: ponlo a mano.');return}
    if(/^DIRECCION/.test(k)){const d=/ambas|las dos|compra.*venta|largo.*corto/.test(vl)?'ambos':/venta|corto|short/.test(vl)?'corto':/compra|largo|long/.test(vl)?'largo':null;
      d?(nuevo.direccion=d,pon('ok','Dirección: '+{largo:'solo compras',corto:'solo ventas',ambos:'compras y ventas'}[d])):pon('no','Dirección: no reconozco «'+v+'»');return}
    if(/^(HORARIO|SESION)/.test(k)){if(/todo el d|diari|sin horario|\b24\b/.test(vl)){nuevo.sesion_on=false;pon('ok','Horario: sin restricción');return}
      const h=v.match(/(\d{1,2})[:.h](\d{2})\s*(?:-|–|—|a|hasta)\s*(\d{1,2})[:.h](\d{2})/i);
      if(!h){pon('no','Horario «'+v+'»: escribe inicio y fin, p. ej. 9:30-16:00 hora de Nueva York');return}
      const zz=[[/nueva york|new york|\bny\b/i,'America/New_York'],[/londres|london/i,'Europe/London'],[/madrid|espa[ñn]a/i,'Europe/Madrid'],[/fr[aá]ncfort|frankfurt|alemania/i,'Europe/Berlin'],[/tokio|tokyo/i,'Asia/Tokyo'],[/\butc\b|\bgmt\b/i,'UTC']].find(([re])=>re.test(v));
      const d2=x=>String(x).padStart(2,'0');nuevo.sesion=Object.assign({},nuevo.sesion,{zona_horaria:zz?zz[1]:'America/New_York',inicio:d2(h[1])+':'+h[2],fin:d2(h[3])+':'+h[4]});nuevo.sesion_on=true;
      if(/cierr|cerr|final/i.test(v))nuevo.sesion.cerrar_al_final=true;
      pon(INTRADIA(nuevo.temporalidad)?'ok':'av','Sesión: '+nuevo.sesion.inicio+'–'+nuevo.sesion.fin+' '+(ZSES[nuevo.sesion.zona_horaria]||'')+(INTRADIA(nuevo.temporalidad)?'':' (solo se usa con velas de 5 min a 4 h)'));
      if(!zz)pon('av','Horario: no dices la zona; supongo hora de Nueva York');return}
    if(/^OPERACIONES/.test(k)){const n=numES(v);if(n>0){nuevo.sesion.max_operaciones_dia=Math.round(n);pon('ok','Operaciones por día: máximo '+Math.round(n))}else pon('no','Operaciones por día «'+v+'»: pon un número');return}
    if(/^(EJECUCION|ORDEN)/.test(k)){nuevo.ejecucion.momento=/cierre/.test(vl)?'cierre_misma_vela':'apertura_siguiente';pon('ok','Ejecución: '+(nuevo.ejecucion.momento==='cierre_misma_vela'?'al cierre de la vela de la señal':'apertura siguiente'));return}
    if(/^NIVEL/.test(k)){const m2=v.match(/^\s*([A-Za-zÁÉÍÓÚÑ_0-9]+)\s*=\s*(.+)$/),nm=m2?m2[1].toUpperCase():'NIVEL',o=operandoDe(m2?m2[2]:v);
      if(o&&o.tipo!=='num'){nuevo.niveles=nuevo.niveles.filter(x=>x.nombre!==nm).concat([{nombre:nm,valor:o}]);pon('ok','Nivel '+nm+' = '+opTxt(o))}else pon('no','Nivel «'+v+'»: no lo entiendo');return}
    if(/^COMISION/.test(k)&&numES(v)!=null){nuevo.costes.comision_pb_lado=pb(v);nuevo.costes.perfil='manual';pon(sup(v)?'av':'ok','Comisión: '+nf(pb(v),3)+' pb por lado'+(sup(v)?' (supuesto: confírmala con tu bróker)':''));return}
    if(/^(DESLIZ|SLIPPAGE)/.test(k)&&numES(v)!=null){nuevo.costes.deslizamiento_pb_lado=pb(v);nuevo.costes.perfil='manual';pon(sup(v)?'av':'ok','Deslizamiento: '+nf(pb(v),2)+' pb por lado'+(sup(v)?' (supuesto)':''));return}
    if(/^SPREAD/.test(k)&&numES(v)!=null){nuevo.costes.spread_pb=pb(v);nuevo.costes.perfil='manual';pon('ok','Spread: '+nf(pb(v),3)+' pb');return}
    if(/^SWAP/.test(k)&&numES(v)!=null){nuevo.costes.swap_largo_pct_anual=numES(v);nuevo.costes.perfil='manual';pon('ok','Swap compras: '+nf(numES(v),2)+' %/año');return}
    if(/^COSTES?/.test(k)){pon('av','Costes «'+v+'»: escribe COMISIÓN, DESLIZAMIENTO y SPREAD en líneas separadas.');return}
    if(/^(REPARTO|CORTE|DIVISION)/.test(k)){const n=numES(v);if(n==null||n===70){nuevo.corte.tipo='auto';pon('ok','Reparto: automático 70/30')}else{nuevo.corte.tipo='pct';nuevo.corte.is_pct=n;pon('ok','Reparto: '+n+' % para diseñar')}return}
    pon('no','No sé dónde va «'+m[1]+'»')});
  if(reglas&&!nuevo.reglas.entrada.length&&!nuevo.reglas.pasos.length){pon('no','No he entendido ninguna condición de ENTRADA: se mantienen tus reglas.');nuevo.reglas=clone(SPEC.reglas)}
  OD_SPEC=null;SPEC=nuevo;SPEC.optimizar=null;piPrev=[];rellenarForm();
  $('#pi-pegar-r').innerHTML=out.map(o=>`<li class="${o.e}"><span>${o.e==='ok'?'✓':o.e==='no'?'✕':'!'}</span><span>${esc(o.t)}</span></li>`).join('');
  const n=out.filter(o=>o.e==='ok').length,k=out.filter(o=>o.e==='no').length;toast(n+' piezas aplicadas'+(k?' · '+k+' sin entender (en rojo)':''))}
/* ---------- los 4 números de la mesa (fase 04): fuera de muestra y con costes ---------- */
function numeros4(){const N4=[['Factor de beneficio',nf(OOS.pf,2),'≥ 1,3',OOS.pf>=1.3],['Operaciones',String(OOS.n),'≥ 30',OOS.n>=30],['Caída máxima',pct(OOS.maxdd,1,false),'< 20 %',OOS.maxdd<.2],['Factor de beneficio sin la mejor operación',nf(OOS.pf_sin_mejor,2),'> 1',OOS.pf_sin_mejor>1]];
  const x4=N4.filter(n=>n[3]).length,ap=x4===4;
  N4TXT=['MEGA CUEVA TESTER · resultado para mi agente 04 VALIDADOR','Estrategia: '+NOMBRE+(SIMB?' · '+SIMB:''),
    'Datos: '+fd(D.desde)+' → '+fd(D.hasta)+' · fuera de muestra desde '+fd(SPLIT)+' · con costes','',
    'Los 4 números (FUERA de muestra, con costes):',...N4.map((n,i)=>`${i+1}. ${n[0]}: ${n[1]} (pide ${n[2]}) ${n[3]?'✓':'✕'}`),'',
    `VEREDICTO: ${x4}/4 · ${ap?'APRUEBA':'NO APRUEBA'}`,`Protocolo completo TIS (5 fases): ${nPass}/5`].join('\n');
  return `<section class="panel"><div class="ph"><h3>Los 4 números · <em>fuera de muestra, con costes</em></h3><button type="button" class="btn gold" id="pi-copiar4"><svg class="ic"><use href="#i-copiar"/></svg> COPIAR RESULTADO PARA MI AGENTE 04</button></div>
    <div class="n4">${N4.map((n,i)=>`<div class="nn ${n[3]?'si':'no'}"><span>${i+1} · ${n[0]}</span><b>${n[1]}</b><small>${n[3]?'✓':'✕'} pide ${n[2]}</small></div>`).join('')}
    <div class="ver">${sello(ap,'VEREDICTO '+x4+'/4 · '+(ap?'APRUEBA':'NO APRUEBA'))}<span class="nota">Fase 04 de tu mesa. El protocolo completo TIS añade 4 pruebas más: aquí ${nPass}/5.</span></div></div></section>`}

/* ---------- motor (window.MCT_MOTOR) ---------- */
function motorFn(){const M=window.MCT_MOTOR;if(M&&typeof M.correr==='function')return (s,c)=>M.correr(s,c);if(typeof M==='function')return M;return null}
async function correrMotor(spec,csv){const f=motorFn();if(!f)return null;return await f(spec,csv)}
window.correrMotor=correrMotor;
let corriendo=false,N4TXT='';
const ETAPAS=['Cargando motor','Leyendo datos','Fase 1','Fase 2','Fase 3','Fase 4','Fase 5','Listo'];
function pintarEtapa(txt,p){const bar=$('#pi-prog');if(p!=null)bar.style.width=Math.max(3,Math.min(100,p))+'%';if(txt)$('#pi-nota-motor').textContent=txt;
  const k=ETAPAS.findIndex(e=>String(txt||'').startsWith(e));if(k>=0)$$('#pi-etapas span').forEach((s,i)=>{s.className=i<k?'ya':i===k?'on':''})}
/* Los datos cargados tienen que ser del activo y la temporalidad de la regla (2026-10-07: corría NAS100 sobre el oro). */
const SIM_ALIAS={NDX:'NAS100',US100:'NAS100',USTEC:'NAS100',NASDAQ:'NAS100',NASDAQ100:'NAS100',NQ:'NAS100',NAS:'NAS100',GOLD:'XAUUSD',ORO:'XAUUSD',XAU:'XAUUSD'};
const simNorm=x=>{const k=String(x||'').toUpperCase().replace(/[^A-Z0-9]/g,'');return SIM_ALIAS[k]||k};
function datosCargados(){if(!CSV)return{s:'XAUUSD',tf:'D1',txt:'los de ejemplo del oro (XAUUSD diario)'};
  if(CSV.nombre==='NDX_D1_ejemplo.csv')return{s:'NAS100',tf:'D1',txt:'los de ejemplo del Nasdaq (NDX diario)'};
  if(CSV.nombre==='NAS100_M15_ejemplo.csv')return{s:'NAS100',tf:'M15',txt:'los de ejemplo del NAS100 en 15 min'};return null}
function datosNoCuadran(spec){const d=datosCargados();if(!d)return null;const s=simNorm(spec.activo&&spec.activo.simbolo),tf=spec.temporalidad;
  if(s===d.s&&tf===d.tf)return null;
  const quiero=(spec.activo&&spec.activo.simbolo||'?')+' · '+(TFN[tf]||tf);
  const sug=s==='NAS100'&&tf==='D1'?' o pulsa «usar datos de ejemplo del Nasdaq (NDX diario)»':s==='NAS100'&&tf==='M15'?' o pulsa «Cargar el ejemplo NAS100 de la Mega Cueva»':s==='XAUUSD'&&tf==='D1'?' o pulsa «quitar» para volver a los datos del oro':'';
  return 'Tu regla es de '+quiero+', pero los datos cargados son '+d.txt+'. No la corro para no darte números de otro activo. Sube tu CSV de '+(spec.activo&&spec.activo.simbolo||'tu activo')+sug}
async function correrPI(){const btn=$('#pi-correr');if(btn.disabled||corriendo)return;corriendo=true;btn.disabled=true;
  {const nc=datosNoCuadran(specLimpio());if(nc){corriendo=false;btn.disabled=false;toast('Los datos no son de tu activo');mostrarResPI(null,new Error(nc));return}}
  $('#pi-etapas').innerHTML=ETAPAS.map(e=>`<span>${e}</span>`).join('');pintarEtapa('Preparando…',2);
  const M=window.MCT_MOTOR,f=motorFn();
  if(!f){for(let i=0;i<4;i++){pintarEtapa(ETAPAS[i+1]+'…',(i+1)*25);if(!RM)await new Promise(r=>setTimeout(r,220))}corriendo=false;btn.disabled=false;$('#pi-etapas').innerHTML='';mostrarResPI(null,new Error('Motor no disponible en esta copia'));return}
  const prev=M&&M.progreso;if(M)M.progreso=(e,p)=>{pintarEtapa(e,p);try{prev&&prev(e,p)}catch(x){}};
  let res=null,err=null;const spec=specLimpio();
  try{res=await correrMotor(spec,CSV?CSV.texto:CSV_EJEMPLO)}catch(e){err=e}
  if(M)M.progreso=prev||null;
  if(res&&res.error){err=new Error(res.error);res=null}
  if(res){const v=validarRes(res);if(v)err=new Error(v);else{pintarEtapa('Listo',100);try{sessionStorage.setItem('mct_tras','prueba');sessionStorage.setItem('mct_spec_res',JSON.stringify(spec))}catch(e){}if(cargarResultados(res))return}}
  corriendo=false;btn.disabled=false;$('#pi-prog').style.width='0';$('#pi-etapas').innerHTML='';actualizarPI();
  $('#pi-nota-motor').innerHTML='<b class="c-red">No se pudo correr:</b> '+esc(err?err.message:'sin respuesta del motor')}
function mostrarResPI(real,err){
  const fx=[['PF · prueba',nf(OOS.pf,2),qPF(OOS.pf),'TIS ≥ 1,30 · frontera 1,25–1,35'],['Operaciones · prueba',OOS.n,qMin(OOS.n,30),'TIS ≥ 30'],
    ['Peor caída · prueba',pct(-OOS.maxdd,1),qMax(OOS.maxdd,.2),'TIS < 20 %'],['PF sin la mejor',nf(OOS.pf_sin_mejor,2),qMin(OOS.pf_sin_mejor,1),'TIS > 1,00'],
    ['Acierto · prueba',pct(OOS.win_rate,0,false),qAcierto(OOS.win_rate),ST&&ST.payoff?'mínimo con su payoff: '+pct(1/(1+ST.payoff),0,false):'informativo'],
    ['Rentab. anual · prueba',pct(OOS.cagr,1),OOS.cagr>0.005?'q-ok':OOS.cagr>-0.005?'q-fr':'q-ko','positiva = gana'],
    ['Sharpe · prueba',nf(OOS.sharpe,2),'q-neu','informativo'],['Expectancy · op.',usd(CU.expectancy_usd_oos!=null?CU.expectancy_usd_oos:OOS.media_trade*CAP,0,true),(OOS.media_trade||0)>0?'q-ok':'q-ko','cuenta de 100.000 USD']];
  const pasa=!!F1.pasa;
  const n4html=numeros4();
  const av=real?`<div class="pathtxt"><b>Calculado por el motor TIS</b> para tu especificación${D.n_velas?' · '+nf(D.n_velas,0)+' velas':''}. Toda la app muestra ahora <b>tu</b> estrategia.</div>${Array.isArray(D.avisos)&&D.avisos.length?'<ul class="avisos">'+D.avisos.map(a=>'<li>'+esc(a)+'</li>').join('')+'</ul>':''}`:
    `<div class="pathtxt"><b>${err?esc(err.message)+'. ':''}Resultados de la demo (${esc(NOMBRE)}).</b></div>`;
  const esEj=real&&NAS&&NOMBRE===NAS.nombre?`<div class="pathtxt" style="margin-top:.5rem"><b>Ejemplo didáctico, no una estrategia ganadora.</b> Es la regla de la ficha de tu mesa (NAS100, apertura de Nueva York) probada tal cual, con los costes del perfil Darwinex del Nasdaq. Que no apruebe es justo lo útil: el protocolo frena una idea que «tiene lógica» antes de que arriesgues dinero.</div>`:'';
  $('#pi-res').innerHTML=`<section class="panel"><div class="ph"><h3>Resultado · <em>${esc(NOMBRE)}</em></h3></div>${av}${esEj}</section>${n4html}
   <div class="factores">${fx.map(c=>`<section class="panel factor ${c[2]}"><span class="cn">${c[0]}</span><span class="big">${c[1]}</span><small>${c[3]}</small></section>`).join('')}</div>
   <div class="leyq"><span><i style="background:var(--ok)"></i>bueno</span><span><i style="background:var(--warn)"></i>frontera (a menos de un 10 % del umbral)</span><span><i style="background:var(--red)"></i>malo</span><span><i style="background:var(--line2)"></i>sin umbral TIS</span></div>
   <section class="panel pieq"><div class="ph"><h3>Capital · <em>diseño y prueba</em></h3><span class="mono c-dim">${IS.n} + ${OOS.n} op.</span></div>
     <div class="cv" id="cv-pieq"><canvas role="img" aria-label="Curva de capital con el corte entre diseño y prueba"></canvas><div class="tt"></div></div></section>
   <div class="navf"><button type="button" class="btn" id="pi-volver">◀ EDITAR LA PRUEBA</button><button type="button" class="btn gold" data-go2="protocolo">VER EL PROTOCOLO →</button><button type="button" class="btn" data-go2="resumen">VER LA FICHA →</button></div>`;
  $('#pi-form').hidden=true;$('#pi-mesa').hidden=true;$('#pi-res').hidden=false;
  $('#pi-copiar4').onclick=()=>copiarTexto(N4TXT,$('#pi-res .n4'));
  $$('#pi-res [data-go2]').forEach(b=>b.onclick=()=>go(b.dataset.go2));
  $('#pi-volver').onclick=()=>{$('#pi-res').hidden=true;$('#pi-form').hidden=false;$('#pi-mesa').hidden=false;$('#f-nombre').focus()};
  const c=chart('cv-pieq',drawEq);c.compact=true;requestAnimationFrame(()=>c.render());$('#pi-izq').scrollTop=0}
/* fechas de cada vela en una pasada: si la línea empieza por AAAA-MM-DD se corta sin regex; si no, regex sobre los 40 primeros caracteres */
function fechasCSV(txt){const F=[],n=txt.length,RE=/(\d{4})[.\-/](\d{2})[.\-/](\d{2})/;let i=0;
  while(i<n){let j=txt.indexOf('\n',i);if(j<0)j=n;const c=txt.charCodeAt(i);
    if(c>=48&&c<=57&&txt.charCodeAt(i+4)===45&&txt.charCodeAt(i+7)===45)F.push(txt.slice(i,i+10));else if(j-i>6){const m=RE.exec(txt.slice(i,Math.min(j,i+40)));if(m)F.push(m[1]+'-'+m[2]+'-'+m[3])}
    i=j+1}return F}
async function gunzipB64(b64){if(typeof DecompressionStream==='undefined')throw new Error('este navegador no descomprime (usa Chrome, Edge o Firefox recientes)');
  const a=atob(b64),bin=new Uint8Array(a.length);for(let i=0;i<a.length;i++)bin[i]=a.charCodeAt(i);return await new Response(new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip'))).text()}
let NDX_CACHE=null;
async function usarNDX(silencio){const b=$('#pi-ndx');if(typeof CSV_NDX_GZ==='undefined'||!CSV_NDX_GZ){toast('Esta copia no trae los datos del NDX');return}if(b.disabled)return;
  b.disabled=true;$('#pi-csv-n').textContent='Cargando el Nasdaq (NDX diario)…';await new Promise(r=>requestAnimationFrame(()=>setTimeout(r,0)));
  try{if(!NDX_CACHE){const txt=await gunzipB64(CSV_NDX_GZ);NDX_CACHE={txt,F:fechasCSV(txt)}}const{txt,F}=NDX_CACHE;CSV={nombre:'NDX_D1_ejemplo.csv',texto:txt,n:F.length};csvFechas=F;
    if(silencio!==true){SPEC.datos={fuente:'darwinex_mt5',desde:F[0],hasta:F[F.length-1],zona_horaria:'servidor_gmt3_usdst'};if(!['NDX','NAS100'].includes(SPEC.activo.simbolo))SPEC.activo={simbolo:'NDX',clase:'indice'};
      SPEC.temporalidad='D1';SPEC.costes=clone(COSTES_NDX);if(SPEC.corte.tipo!=='auto'){SPEC.corte.tipo='auto'}}
    $('#pi-csv-n').innerHTML='<b class="c-ink">Nasdaq 100 (NDX) diario · Darwinex</b> · '+nf(F.length,0)+' velas · '+fd(F[0])+' → '+fd(F[F.length-1]);$('#pi-csv-x').hidden=false;
    if(silencio===true)actualizarPI(true);else{rellenarForm();toast('Datos del Nasdaq (NDX diario) y costes del perfil NDX puestos; tus reglas no cambian')}}
  catch(e){toast('No se pudieron abrir los datos del NDX: '+e.message)}finally{b.disabled=false}}
let NAS_CACHE=null; /* el CSV descomprimido y sus fechas: la 2.ª carga es inmediata */
async function cargarNAS(soloDatos){const b=$('#pi-nas');if(!NAS||typeof CSV_NAS_GZ==='undefined'||!CSV_NAS_GZ){toast('Esta copia no trae el ejemplo NAS100');return}if(b.disabled)return;
  const T00=performance.now(),bt=b.textContent;b.disabled=true;b.textContent='CARGANDO EJEMPLO…';$('#pi-csv-n').textContent='Cargando el ejemplo NAS100…';
  await new Promise(r=>requestAnimationFrame(()=>setTimeout(r,0))); /* que se pinte «Cargando…» antes de trabajar */
  try{const T0=performance.now();if(!NAS_CACHE){const txt=await gunzipB64(CSV_NAS_GZ);NAS_CACHE={txt,F:fechasCSV(txt)}}const txt=NAS_CACHE.txt,F=NAS_CACHE.F,T2=performance.now();window.MCT_T_NAS={datos:Math.round(T2-T0)};CSV={nombre:'NAS100_M15_ejemplo.csv',texto:txt,n:F.length};csvFechas=F;
    if(soloDatos===true){$('#pi-csv-n').innerHTML='<b class="c-ink">Ejemplo NAS100 · 15 min</b> · '+nf(F.length,0)+' velas · '+fd(F[0])+' → '+fd(F[F.length-1]);$('#pi-csv-x').hidden=false;actualizarPI(true);return}
    const n=clone(NAS);n.datos={fuente:'csv_propio',desde:F[0],hasta:F[F.length-1],zona_horaria:(NAS.datos&&NAS.datos.zona_horaria)||'nueva_york'};n.sesion_on=true;n.corte={tipo:'auto',fecha:DEMO_SPEC.corte.fecha,is_pct:70};
    SPEC=n;piPrev=[];$('#pi-csv-n').innerHTML='<b class="c-ink">Ejemplo NAS100 · 15 min</b> · '+nf(F.length,0)+' velas · '+fd(F[0])+' → '+fd(F[F.length-1]);$('#pi-csv-x').hidden=false;{const T3=performance.now();rellenarForm();window.MCT_T_NAS.form=Math.round(performance.now()-T3)}
    $('#pi-izq').scrollTop=0;toast('Ejemplo NAS100 cargado: la regla de la ficha de tu mesa, tal cual')}
  catch(e){toast('No se pudo abrir el ejemplo NAS100: '+e.message);if(!CSV)$('#pi-csv-n').textContent='Datos de ejemplo del oro (XAUUSD D1)'}finally{b.disabled=false;b.textContent=bt;if(window.MCT_T_NAS&&window.MCT_T_NAS.datos!=null)window.MCT_T_NAS.total=Math.round(performance.now()-T00)}}
function leerCSV(file){const r=new FileReader();r.onload=()=>{const txt=String(r.result||'');
    const F=fechasCSV(txt);
    if(F.length<300){toast('Ese CSV tiene '+F.length+' velas con fecha legible; el motor pide al menos 300.');return}
    CSV={nombre:file.name,texto:txt,n:F.length};csvFechas=F;SPEC.datos.fuente='csv_propio';SPEC.datos.desde=F[0];SPEC.datos.hasta=F[F.length-1];
    $('#pi-csv-n').innerHTML='<b class="c-ink">'+esc(file.name)+'</b> · '+nf(F.length,0)+' velas · '+fd(F[0])+' → '+fd(F[F.length-1]);$('#pi-csv-x').hidden=false;rellenarForm();toast('CSV cargado: '+nf(F.length,0)+' velas')};
  r.onerror=()=>toast('No se pudo leer el fichero');r.readAsText(file)}
function quitarCSV(){CSV=null;csvFechas=null;SPEC.datos=clone(DEMO_SPEC.datos);$('#pi-csv-n').textContent='Datos de ejemplo del oro (XAUUSD D1)';$('#pi-csv-x').hidden=true;rellenarForm()}
function initPI(){try{const g=store.get('mct_spec2');if(g){const o=JSON.parse(g);if(o&&o.version===1&&o.reglas)SPEC=o}}catch(e){}
  if(SPEC.sizing.tipo==='lotes_fijos')SPEC.sizing={tipo:'pct_capital',valor:100};normSpec();if(!['apertura_siguiente','cierre_misma_vela'].includes(SPEC.ejecucion.momento))SPEC.ejecucion.momento='apertura_siguiente';
  const f=$('#pi-form');['input','change'].forEach(t=>f.addEventListener(t,e=>{const x=e.target;if(x.closest('.bloque'))onBloque(e);else if(x.closest('.nivel-f'))onNivel(e);else if(x.closest('.paso-h'))onPaso(e);else if(x.closest('#f-stop-nv'))onStopNv(e);
    else if(x.id==='f-ses-act'){if(e.type==='change'){SPEC.sesion_on=x.checked;actualizarPI()}}else if(x.closest('#f-meseta'))onMeseta(e);else onCampo(e)}));
  f.addEventListener('click',e=>{if(e.target.closest('.bloque .quita')){onBloque(e);return}
    const qn=e.target.closest('[data-quita-nivel]');if(qn){const n=SPEC.niveles.splice(+qn.dataset.quitaNivel,1)[0];renderBloques();cambioReglas();if(n&&n.nombre)toast('Quitado '+n.nombre+': revisa las condiciones que lo usaban');return}
    const qp=e.target.closest('[data-quita-paso]');if(qp){SPEC.reglas.pasos.splice(+qp.dataset.quitaPaso,1);renderCond();cambioReglas();return}
    const ac=e.target.closest('[data-add-cond]');if(ac){const N=nivNombres();SPEC.reglas.pasos[+ac.dataset.addCond].condiciones.push({izq:{tipo:'precio'},op:'>',der:N.length?{tipo:'nivel',nombre:N[0]}:{tipo:'sesion_anterior_max'}});renderCond();cambioReglas()}});
  $('#f-add-nivel').onclick=()=>{const N=nivNombres();let nm='NIVEL',k=2;while(N.includes(nm))nm='NIVEL'+(k++);SPEC.niveles.push({nombre:nm,valor:{tipo:'sesion_anterior_max'}});renderBloques();cambioReglas();const L=$$('#bl-niveles .nivel-f');L.length&&$('input',L[L.length-1]).focus()};
  $('#f-add-paso').onclick=()=>{const P=SPEC.reglas.pasos,N=nivNombres(),i=P.length;P.push({nombre:['RUPTURA','RETESTEO','CONFIRMACIÓN'][i]||'PASO '+(i+1),condiciones:[{izq:{tipo:i?'minimo':'maximo'},op:i?'<=':'>',der:N.length?{tipo:'nivel',nombre:N[0]}:{tipo:'sesion_anterior_max'}}],ventana:i?{tipo:'velas_tras_anterior',velas:8}:{tipo:'primeras_velas_sesion',velas:2}});renderCond();cambioReglas()};
  $$('[data-add]').forEach(b=>b.onclick=()=>{const g=b.dataset.add;SPEC.reglas[g].push(g==='filtros'?{izq:{tipo:'precio'},op:'>',der:{tipo:'sma',periodo:50}}:{izq:{tipo:'rsi',periodo:14},op:g==='entrada'?'<':'>',der:{tipo:'num',valor:g==='entrada'?30:70}});renderBloques();cambioReglas();
    const L=$$('#bl-'+g+' .bloque');L.length&&$('select',L[L.length-1]).focus()});
  $$('[data-fmt]').forEach(b=>b.onclick=()=>{piFmt=b.dataset.fmt;$$('[data-fmt]').forEach(x=>x.setAttribute('aria-pressed',x===b));piPrev=[];actualizarPI(true)});
  $('#pi-nas').onclick=()=>cargarNAS(false);$('#pi-ndx').onclick=()=>usarNDX(false);
  $('#pi-ej-oro').onclick=()=>{quitarCSV();toast('Datos de ejemplo del oro (XAUUSD diario)')};$('#pi-ej-nas').onclick=()=>cargarNAS(true);
  $('#pi-check').addEventListener('click',e=>{if(e.target.closest('[data-ir-fuente]')){const f=$('#pi-fuente');f.scrollIntoView({behavior:RM?'auto':'smooth',block:'center'});f.classList.add('flash');setTimeout(()=>f.classList.remove('flash'),1600)}});
  $('#pi-demo').onclick=()=>{SPEC=clone(DEMO_SPEC);if(CSV)quitarCSV();piPrev=[];rellenarForm();toast('Restaurada la especificación del oro')};
  $('#pi-vaciar').onclick=()=>{SPEC=clone(DEMO_SPEC);SPEC.nombre='';SPEC.activo.simbolo='';SPEC.reglas={filtros:[],entrada:[],salida:[]};SPEC.optimizar=null;SPEC.costes={perfil:'manual',spread_pb:0,comision_pb_lado:0,deslizamiento_pb_lado:0,swap_largo_pct_anual:0,swap_corto_pct_anual:0};piPrev=[];rellenarForm();$('#f-nombre').focus()};
  $('#pi-copiar').onclick=()=>copiarTexto($('#pi-codigo').innerText,$('#pi-codigo'));
  $('#pi-bajar').onclick=()=>{const b=new Blob([JSON.stringify(specLimpio(),null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='spec.json';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)};
  $('#pi-csv-b').onclick=()=>$('#pi-csv').click();$('#pi-csv').onchange=e=>{const x=e.target.files[0];if(x)leerCSV(x);e.target.value=''};$('#pi-csv-x').onclick=quitarCSV;
  const z=$('#pi-csvz');['dragover','dragenter'].forEach(t=>z.addEventListener(t,e=>{e.preventDefault();z.classList.add('sobre')}));['dragleave','drop'].forEach(t=>z.addEventListener(t,()=>z.classList.remove('sobre')));
  z.addEventListener('drop',e=>{e.preventDefault();const x=e.dataTransfer.files[0];if(x)leerCSV(x)});
  $('#pi-correr').onclick=correrPI;
  $('#pi-pegar-b').onclick=()=>{const t=$('#pi-pegar-t').value.trim();if(!t){toast('Pega primero lo que te dio tu agente 04');return}aplicarAgente04(t)};
  $('#pi-pegar-ej').onclick=()=>{$('#pi-pegar-t').value=EJ_04};
  $('#pi-csv-ayuda').onclick=()=>openDlg('csv-dlg');
  rellenarForm();if(NAS&&SPEC.nombre===NAS.nombre&&SPEC.datos.fuente==='csv_propio'&&!CSV)cargarNAS(true);
  else if(!CSV&&['NDX','NAS100'].includes(SPEC.activo.simbolo)&&SPEC.temporalidad==='D1'&&SPEC.datos.fuente==='darwinex_mt5'&&SPEC.datos.desde==='2008-08-06')usarNDX(true)}

/* ---------- PROTOCOLO COMPLETO ---------- */
const PR_ORDEN=['F1','F2','F3','F4','F5','PAR'];let prSel=0;
const ee=b=>b?'pasa':'falla';
function crit(e,t,u,v){return `<li><span class="${e==='pasa'?'y':e==='falla'?'n':'c-gold'}">${e==='pasa'?'✓':e==='falla'?'✗':'…'}</span><span>${t} <span class="c-dim">(${u})</span></span><span class="v">${v}</span></li>`}
function sbarH(l,v,max,lim,col,txt){return `<div class="sbar"><span>${l}</span><span class="tr"><i style="width:${Math.min(100,v/max*100)}%;background:${col}"></i><u style="left:${lim/max*100}%"></u></span><span>${txt}</span></div>`}
function cifraClave(id){const Mc=D.mc||{},W=D.wf_res||{},St=D.stress||{},Me=D.meseta;
  if(id==='F1')return[nf(OOS.pf,2),'PF en la prueba','≥ 1,30','PF mínimo'];
  if(id==='F2')return[nf(W.eficiencia,2),'eficiencia','≥ 0,50','conserva la mitad'];
  if(id==='F3'){if(!Me||!Me.pf)return['—','',''];const c=centro(Me),peor=Math.min(...vecinos(Me));return['−'+nf((1-peor/Me.pf[c][c])*100,0)+' %','peor vecino','< 30 %','anti-precipicio']}
  if(id==='F4')return[pct(Mc.p95dd,1,false),'caída · peor 5 %','< 25 %','de 5.000 caminos'];
  if(id==='F5')return[nf(St.costes_x2&&St.costes_x2.pf,2),'PF con costes ×2','≥ 1,10','y sin 2 mejores años'];
  const ep=estParidad();return[ep==='pend'?'—':ep==='pasa'?'CUADRA':'NO CUADRA','Strategy Tester','± 2 %','mismas operaciones']}
function detalleFase(id){const Mc=D.mc||{},W=D.wf_res||{},St=D.stress||{},Me=D.meseta,f=FASES.find(x=>x.id===id),e=estFase(id);
  let cr='',graf='',sig='',tec='',titG='',auto=false;
  if(id==='F1'){const c=F1.criterios||{};
    cr=crit(ee(c.pf_oos??OOS.pf>=1.3),'Factor de beneficio','≥ 1,30',nf(OOS.pf,2))+crit(ee(c.n_oos??OOS.n>=30),'Operaciones','≥ 30',OOS.n)+crit(ee(c.dd_oos??OOS.maxdd<.2),'Peor caída','< 20 %',pct(-OOS.maxdd,1))+crit(ee(c.pf_sin_mejor??OOS.pf_sin_mejor>1),'PF sin la mejor','> 1,00',nf(OOS.pf_sin_mejor,2));
    titG='Capital con el corte <em>diseño / prueba</em>';graf=`<div class="cv" id="cv-pdet"><canvas role="img" aria-label="Curva de capital con el corte"></canvas><div class="tt"></div></div>`;
    sig=e==='pasa'?`En los años guardados (${yr(SPLIT)}–${yr(D.hasta)}) gana <b>${nf(OOS.pf,2)}</b> por cada 1 que pierde (diseño: ${nf(IS.pf,2)}). No estaba aprendida de memoria.`:'En la parte guardada no cumple los mínimos: la ventaja del diseño no se repite.';
    tec=`Corte ${fd(SPLIT)} · IS ${IS.n} op., PF ${nf(IS.pf,2)} · OOS ${OOS.n} op., PF ${nf(OOS.pf,2)}, MaxDD ${pct(OOS.maxdd,1,false)}, CAGR ${pct(OOS.cagr,1)}. Frontera (PF 1,25–1,35): ${F1.frontera?'sí':'no'}.`}
  if(id==='F2'){const c=W.criterios||{};
    cr=W.eficiencia==null?'':crit(ee(c.eficiencia??W.eficiencia>=.5),'<span class="term" data-t="ef">Eficiencia</span>','≥ 0,50',nf(W.eficiencia,2))+crit(ee(c.pct_positivas??W.pct_positivas>=.6),'Años en positivo','≥ 60 %',Math.round(W.pct_positivas*W.n_ventanas)+' de '+W.n_ventanas)+(W.peor_dd!=null?crit(ee(c.dd_ventanas??W.peor_dd<.2),'Peor caída en un año','< 20 %',pct(-W.peor_dd,1)):'');
    titG='Resultado de cada <em>año de prueba</em>';graf=`<div class="cv" id="cv-pdet"><canvas role="img" aria-label="Resultado de cada ventana walk-forward"></canvas><div class="tt"></div></div>`;
    sig=W.eficiencia==null?'':`Reajustándola cada año conserva el <b>${nf(W.eficiencia*100,0)} %</b> de lo que rinde al ajustar y gana en <b>${Math.round(W.pct_positivas*W.n_ventanas)} de ${W.n_ventanas}</b> años.`;
    tec=W.eficiencia==null?'':`${W.n_ventanas} ventanas (IS 3a / OOS 1a) · rend. anual medio IS ${pct(W.is_ret_anual_medio,1)} vs OOS ${pct(W.oos_ret_anual_medio,1)}.`}
  if(id==='F3'&&Me&&Me.pf){const c=Me.crit||{},ce=centro(Me),nb=vecinos(Me),k=Object.keys(Me.ejes),pc=Me.pf[ce][ce],peor=Math.min(...nb),caida=1-peor/pc;auto=true;
    cr=crit(ee(c['centro_pf>1']),'PF de los números elegidos','> 1',nf(pc,2))+crit(ee(c.vecinos_dentro_20pct),'Vecinos parecidos','± 20 %',nf(Math.min(...nb),2)+'–'+nf(Math.max(...nb),2))+crit(ee(c.anti_cliff_30pct),'Sin precipicios','< 30 %','peor −'+nf(caida*100,0)+' %');
    let ht=`<table class="heat" aria-label="PF por combinación"><tr><th>${esc(k[0])}\\${esc(k[1])}</th>`+Me.ejes[k[1]].map(s=>`<th>${s}</th>`).join('')+'</tr>';
    Me.pf.forEach((row,i)=>{ht+=`<tr><th>${Me.ejes[k[0]][i]}</th>`+row.map((v,j)=>`<td class="${i===ce&&j===ce?'c':''}" style="${heatBg(v)};padding:.5rem .2rem" title="${esc(k[0])} ${Me.ejes[k[0]][i]} · ${esc(k[1])} ${Me.ejes[k[1]][j]}: PF ${nf(v,2)}">${nf(v,2)}</td>`).join('')+'</tr>'});ht+='</table>';
    titG='PF de cada <em>combinación</em>';graf=ht;
    sig=`El recuadro son los números elegidos (${esc(k[0])} ${Me.ejes[k[0]][ce]}, ${esc(k[1])} ${Me.ejes[k[1]][ce]}). ${e==='pasa'?'Sus vecinos rinden parecido: meseta.':`Un paso al lado el PF cae a <b>${nf(peor,2)}</b> (−${nf(caida*100,0)} %): depende de esos números exactos.`}`;
    tec=`PF IS en rejilla ${Me.pf.length}×${Me.pf[0].length}; ${nf((Me.pct||0)*100,0)} % de celdas con PF > 1. Tolerancia 20 %, anti-cliff 30 %.`}
  if(id==='F4'&&Mc.p95dd!=null){cr=crit(ee(Mc.p5>0),'Peor 5 % de retornos','> 0',pct(Mc.p5,1))+crit(ee(Mc.p95dd<.25),'Caída en el peor 5 %','< 25 %',pct(-Mc.p95dd,1))+crit(ee(Mc.ruina<.05),'Prob. de perder la mitad','< 5 %',pct(Mc.ruina,1,false));
    titG='Retorno en <em>miles de caminos</em>';graf=`<div class="cv" id="cv-pdet"><canvas role="img" aria-label="Histograma de retornos simulados"></canvas><div class="tt"></div></div>`;
    sig=`Casi siempre gana (mediana ${pct(Mc.p50,0)}). ${Mc.p95dd<.25?'La caída queda bajo el límite.':`Pero en 1 de cada 20 caminos la caída llega al <b>${pct(Mc.p95dd,1,false)}</b>: más del 25 % que acepta TIS.`}`;
    tec=`${esc(Mc.nota||'5.000 simulaciones')}. p5 ${pct(Mc.p5,1)} · p50 ${pct(Mc.p50,1)} · p95 MaxDD ${pct(Mc.p95dd,1,false)} · ruina ${pct(Mc.ruina,1,false)}.`}
  if(id==='F5'){const sc=[['costes_x2','Costes ×2'],['sin_2_mejores_anios','Sin 2 mejores años'],['regimen_malo','Régimen malo']].filter(x=>St[x[0]]);auto=true;
    cr=sc.map(([k,l])=>crit(ee(St[k].pasa),l,'PF ≥ 1,10','PF '+nf(St[k].pf,2))).join('');const mx=Math.max(2,OOS.pf*1.1);
    titG='PF en cada <em>escenario adverso</em>';graf=`<div>${sbarH('Sin tocar',OOS.pf,mx,1.1,'var(--dim2)',nf(OOS.pf,2))}${sc.map(([k,l])=>sbarH(l,St[k].pf,mx,1.1,St[k].pf>=1.1?'var(--f5)':'var(--red)',nf(St[k].pf,2))).join('')}</div>`;
    sig=St.costes_x2?`Con costes dobles PF ${nf(St.costes_x2.pf,2)}; sin sus 2 mejores años ${nf(St.sin_2_mejores_anios&&St.sin_2_mejores_anios.pf,2)}. ${e==='pasa'?'Sale tocada pero viva.':'Algún escenario la tumba.'}`:'';
    tec=sc.map(([k,l])=>`${l}: PF ${nf(St[k].pf,2)}${St[k].n!=null?', '+St[k].n+' op.':''}`).join(' · ')}
  if(id==='PAR'){const ep=estParidad();auto=true;
    const paso=(n,e2,t,d)=>`<div class="paso"><span class="i">${n}</span><div><h4>${t}</h4><p>${d}</p></div>${chipE(e2)}</div>`;
    cr=crit(P.zona.estado,'Velas en hora del servidor','GMT+3',EST[P.zona.estado][2])+crit(P.costes.estado,'Costes del bróker','spread · comisión · swap',EST[P.costes.estado][2])+crit(ep,'Strategy Tester','± 2 %',RECON?RECON.res:EST[ep][2]);
    titG='Los tres pasos <em>de la paridad</em>';
    graf=`<div>${paso(1,P.zona.estado,'Hora del servidor',esc(P.zona.txt))}${paso(2,P.costes.estado,'Costes del terminal',esc(P.costes.txt))}${paso(3,ep,'Strategy Tester',RECON?RECON.txt:esc(P.reconciliacion.txt||''))}
      <div class="subida" id="p-subida"><b>${RECON?'Sube otro informe':'Sube tu informe del Strategy Tester'}</b><span>HTML o CSV de MT5. Se lee en tu navegador; no se envía a ningún sitio.</span>
      <button type="button" class="btn gold" id="p-subir">⇧ ELEGIR INFORME…</button><input type="file" id="f-st" accept=".htm,.html,.csv,.txt" class="sr" tabindex="-1" aria-hidden="true"></div></div>`;
    sig=ep==='pend'?'Hora y costes ya como en MetaTrader. Falta la prueba final: el Strategy Tester con el robot real debe dar las mismas operaciones.':ep==='pasa'?'El Strategy Tester y el backtest cuadran.':'No cuadran: casi siempre es la zona horaria, los costes o el tipo de orden.';
    tec='Equity y PnL dentro de ±2 % y nº de operaciones exacto. La lectura del informe aquí es orientativa.'}
  if(!graf)graf='<p class="c-dim">Sin datos para esta prueba.</p>';
  return{f,e,cr,graf,sig,tec,titG,auto}}
function renderProtocolo(){const fl=['F1','F2','F3','F4','F5'].filter(k=>!D.fases[k]),ep=estParidad(),todo=!fl.length;
  $('#p-head').innerHTML=todo?'<strong>Supera las 5 pruebas.</strong> Paridad MT5: '+EST[ep][2].toLowerCase()+'.':`<strong>Supera ${nPass} de 5.</strong> Falla ${fl.map(k=>NOMF[k].toLowerCase()).join(' y ')}.`;
  $('#p-global').innerHTML=`${sello(todo,todo?'APROBADA':'NO APROBADA · '+nPass+'/5',true)}<div class="sv"><div class="phases">${chipsFases()}<span class="chip ${EST[ep][0]}">${EST[ep][1]} MT5</span></div>
    <p>${todo?(ep==='pasa'?'Supera las 5 fases y cuadra con MetaTrader.':'Supera las 5 fases; falta reconciliar con el Strategy Tester.'):'<b class="c-ink">No está lista para dinero real.</b> Una sola prueba fallada basta para parar.'}</p></div>`;
  $('#p-lista').innerHTML=PR_ORDEN.map((id,i)=>{const f=FASES.find(x=>x.id===id),e=estFase(id),k=cifraClave(id);return `<button type="button" class="pfb" style="--fc:${PC[id]}" role="tab" id="pt-${id}" aria-selected="${i===prSel}" aria-controls="p-det" tabindex="${i===prSel?0:-1}" data-i="${i}">
    <span class="c">${f.cod}</span><span class="n">${esc(f.nombre)}<small>${esc(f.preg)}</small></span><span class="kf"><b class="${e==='pasa'?'pos':e==='falla'?'neg':'c-gold'}">${k[0]}</b><span>${k[1]}</span></span><span class="um">${k[2]}<span>${k[3]||'umbral TIS'}</span></span><span class="sl ${e}">${EST[e][2]}</span></button>`}).join('');
  $$('#p-lista .pfb').forEach(b=>{b.onclick=()=>selPr(+b.dataset.i);b.onkeydown=e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();e.stopPropagation();const n=(+b.dataset.i+(e.key==='ArrowDown'?1:-1)+PR_ORDEN.length)%PR_ORDEN.length;selPr(n);$('#pt-'+PR_ORDEN[n]).focus()}}});
  renderPrDet()}
function selPr(i){prSel=Math.max(0,i);$$('#p-lista .pfb').forEach((b,k)=>{b.setAttribute('aria-selected',k===prSel);b.tabIndex=k===prSel?0:-1});renderPrDet()}
function renderPrDet(){const id=PR_ORDEN[prSel],x=detalleFase(id),el=$('#p-det');el.setAttribute('aria-labelledby','pt-'+id);el.style.setProperty('--fc',PC[id]);
  el.innerHTML=`<div class="cab"><div><div class="cod">${esc(x.f.cod)}${id.startsWith('F')?' de 5':''}</div><h3>${esc(x.f.nombre)}</h3><p class="fq">${esc(x.f.preg)}</p></div>${chipE(x.e)}</div>
   <div class="prg${x.auto?' auto':''}"><div class="ph"><h3>${x.titG}</h3></div>${x.graf}</div>
   <div><div class="ph"><h3>Criterios TIS</h3></div><ul class="crit">${x.cr||'<li><span></span><span class="c-dim">Sin datos.</span><span></span></li>'}</ul></div>
   ${x.sig?`<div class="${x.e==='falla'?'verd':'pathtxt'}" style="margin:0">${x.sig}</div>`:''}
   <details><summary>Detalle técnico</summary><p>${x.tec||esc(x.f.av)}</p></details>
   <div class="navf"><button type="button" class="btn" data-pr="-1" ${prSel===0?'disabled':''}>◀ ANTERIOR</button><button type="button" class="btn" data-pr="1" ${prSel===PR_ORDEN.length-1?'disabled':''}>SIGUIENTE ▶</button></div>`;
  $$('#p-det [data-pr]').forEach(b=>b.onclick=()=>selPr(Math.max(0,Math.min(PR_ORDEN.length-1,prSel+ +b.dataset.pr))));
  if($('#cv-pdet')){delete charts['cv-pdet'];const c=chart('cv-pdet',id==='F1'?drawEq:id==='F2'?drawWF:drawMC);c.compact=id==='F1';requestAnimationFrame(()=>c.render())}
  if(id==='PAR'){$('#p-subir').onclick=()=>$('#f-st').click();$('#f-st').onchange=e=>{const f=e.target.files[0];if(f)leerInforme(f);e.target.value=''};
    const z=$('#p-subida');['dragover','dragenter'].forEach(t=>z.addEventListener(t,e=>{e.preventDefault();e.stopPropagation();z.classList.add('sobre')}));['dragleave','drop'].forEach(t=>z.addEventListener(t,()=>z.classList.remove('sobre')));
    z.addEventListener('drop',e=>{e.preventDefault();e.stopPropagation();const f=e.dataTransfer.files[0];if(f)leerInforme(f)})}
  wireTerms(el)}
function leerInforme(file){const r=new FileReader();r.onload=()=>{const buf=new Uint8Array(r.result);let txt;
    if((buf[0]===0xFF&&buf[1]===0xFE)||(buf[1]===0&&buf[3]===0))txt=new TextDecoder('utf-16le').decode(buf);else txt=new TextDecoder('utf-8').decode(buf);
    txt=txt.replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ');
    const num=s=>{if(s==null)return null;let t=s.replace(/\s/g,'');if(/,\d{1,2}$/.test(t))t=t.replace(/\./g,'').replace(',','.');else t=t.replace(/,/g,'');const v=parseFloat(t);return isNaN(v)?null:v};
    const pick=re=>{const m=txt.match(re);return m?num(m[1]):null};
    const n=pick(/(?:Total Trades|Total de (?:operaciones|transacciones)|Operaciones totales)\s*:?\s*([\d\s.,]+)/i);
    const net=pick(/(?:Total Net Profit|Beneficio neto total|Beneficio Neto Total)\s*:?\s*(-?[\d\s.,]+)/i);
    const dep=pick(/(?:Initial Deposit|Dep[oó]sito inicial)\s*:?\s*([\d\s.,]+)/i);
    if(n==null){toast('No encuentro el nº de operaciones. ¿Es el informe del Strategy Tester de MT5?');return}
    const retMT=net!=null&&dep?net/dep:null,dif=retMT!=null?Math.abs((1+retMT)-(1+FULL.ret_total))/(1+FULL.ret_total):null;
    const okN=n===FULL.n,okR=dif!=null&&dif<=.02;
    RECON={ok:okN&&okR,res:(okN&&okR?'Cuadra':'No cuadra'),txt:`«${esc(file.name)}»: <b>${n}</b> operaciones en MT5 frente a <b>${FULL.n}</b> (${okN?'iguales':'distintas'})`+
      (retMT!=null?`; resultado ${pct(retMT,1)} frente a ${pct(FULL.ret_total,1)} (diferencia ${nf(dif*100,1)} %, límite 2 %).`:'; sin beneficio neto y depósito para comparar.')};
    renderProtocolo();renderGal();renderFases();pintarHchips();toast(RECON.ok?'Reconciliación: cuadra':'Reconciliación: no cuadra')};
  r.onerror=()=>toast('No se pudo leer el fichero');r.readAsArrayBuffer(file)}

/* ---------- resultados del motor (contrato v3) ---------- */
const REQ=['f1','full','fases','eq','dd','trades','anual','wf','wf_res','mc','meseta','stress','estado','dias_medio','desde','hasta','split'];
function validarRes(j){if(!j||typeof j!=='object')return 'La respuesta del motor no es un objeto.';
  const f=REQ.filter(k=>!(k in j));if(f.length)return 'Faltan campos: '+f.join(', ')+'.';
  if(!j.f1.IS||!j.f1.OOS)return 'f1 debe traer IS y OOS.';
  if(!Array.isArray(j.eq)||!j.eq.length)return 'eq debe ser una lista.';
  if(!Array.isArray(j.trades)||!j.trades.length)return 'Tu regla no ha hecho ninguna operación con estos datos.';return null}
/** cargarResultados(json): pinta TODA la app con un resultado del motor (se guarda en sessionStorage y se recarga). */
function cargarResultados(json){const err=validarRes(json);if(err){toast('No se puede pintar: '+err);return false}
  try{sessionStorage.setItem('mct_res',JSON.stringify(json))}catch(e){toast('El navegador no deja guardar el resultado para pintarlo');return false}
  location.reload();return true}
window.cargarResultados=cargarResultados;

/* ---------- nivel ENTENDER / AVANZADO ---------- */
let nivel='entender';
function setNivel(n){nivel=n;$$('#nivel button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.n===n));
  if(n==='avanzado'){const fr=$('#avz iframe');if(!fr.getAttribute('src'))fr.setAttribute('src','avanzado.html');fijarHdr();hideTip()}
  document.body.classList.toggle('avz',n==='avanzado');
  if(n==='entender')requestAnimationFrame(renderAll)}
function nombresCortos(n){const W=String(n).split(/\s+/).filter(Boolean),out=[W.join(' ')],STOP=/^(Y|E|O|EN|LA|EL|DE|DEL|A|AL|LOS|LAS|CON|POR|PARA|·|-|–)$/;
  for(let k=W.length-1;k>=1;k--){const w=W.slice(0,k);while(w.length>1&&STOP.test(w[w.length-1]))w.pop();const t=w.join(' ');if(!out.includes(t))out.push(t)}return out}
function fitNombre(){const b=$('#ctx-nom');if(!b)return;const full=NOMBRE.toUpperCase();b.title=NOMBRE;if(!b.offsetWidth){b.textContent=full;return}
  const sub=$('#ctx-sub'),cabe=()=>b.scrollWidth<=b.clientWidth+1;document.body.classList.remove('hdr-corto');if(sub)sub.style.display='';b.textContent=full;if(cabe())return;
  /* antes de recortar el nombre: fuera el subtítulo y los textos largos de las fases (F1 IS/OOS → F1) */
  if(sub)sub.style.display='none';document.body.classList.add('hdr-corto');if(cabe())return;
  for(const t of nombresCortos(full)){b.textContent=t;if(cabe())return}}
function fijarHdr(){fitNombre();document.documentElement.style.setProperty('--hdr',Math.round($('.top').getBoundingClientRect().bottom)+'px')}
function avanzar(d){const pres=document.body.classList.contains('pres'),v=VIEWS[cur];
  if(pres&&v==='fases'){const n=galSel+d;if(n>=0&&n<FASES.length){selGal(n);return}}
  if(pres&&v==='protocolo'){const n=prSel+d;if(n>=0&&n<PR_ORDEN.length){selPr(n);return}}
  const n=Math.max(0,Math.min(VIEWS.length-1,cur+d));if(n===cur)return;
  if(pres&&VIEWS[n]==='fases'){galSel=d>0?0:FASES.length-1;renderGal()}if(pres&&VIEWS[n]==='protocolo')selPr(d>0?0:PR_ORDEN.length-1);go(n)}

/* ---------- navegación ---------- */
const VIEWS=['mesa','fases','resumen','estrategia','prueba','backtest','operaciones','validacion','protocolo'];let cur=0;
function go(v){const i=typeof v==='number'?v:VIEWS.indexOf(v);if(i<0||i>=VIEWS.length)return;cur=i;hideTip();if(nivel==='avanzado')setNivel('entender');
  VIEWS.forEach((n,k)=>{$('#v-'+n).classList.toggle('on',k===i);const t=$('#t-'+n);t.setAttribute('aria-selected',k===i);t.tabIndex=k===i?0:-1});
  $$('#prog i').forEach((d,k)=>d.classList.toggle('on',k===i));
  try{history.replaceState(null,'','#'+VIEWS[i])}catch(e){}
  if(VIEWS[i]==='prueba'&&window.MCT_MOTOR&&typeof window.MCT_MOTOR.iniciar==='function'){try{window.MCT_MOTOR.iniciar().then(()=>{if(!corriendo)actualizarPI()},()=>{})}catch(e){}}
  mesaActiva(VIEWS[i]==='mesa');
  requestAnimationFrame(renderAll)}
function setRail(min,ini){document.body.classList.toggle('rail-min',min);const b=$('#b-rail');b.setAttribute('aria-expanded',String(!min));b.title=min?'Desplegar el menú (tecla M)':'Plegar el menú (tecla M)';if(!ini)store.set('rail',min?'1':'0');
  setTimeout(()=>{fijarHdr();renderAll();renderTree();if(VIEWS[cur]==='mesa')mesaResize()},ini?0:260)}
function syncRange(){$$('#b-range button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.r===eqState.range));charts['cv-eq']&&charts['cv-eq'].render()}
function setPres(on){document.body.classList.toggle('pres',on);$('#b-pres').textContent=on?'■ SALIR (Esc)':'▶ PRESENTAR';$('#b-pres').setAttribute('aria-pressed',on);
  document.documentElement.style.setProperty('--fs',on?String(+(store.get('fs')||1)*1.1):(store.get('fs')||1));
  if(on)toast('Modo presentación · ← → para avanzar · Esc para salir');
  setTimeout(()=>{renderAll();renderTree()},60)}
let tto;function toast(m){const t=$('#toast');t.textContent=m;t.style.display='block';clearTimeout(tto);tto=setTimeout(()=>t.style.display='none',2600)}
function openDlg(id){const o=$('#'+id);o.classList.add('on');o._ret=document.activeElement;($('[data-close]',o)||o).focus()}
function closeDlg(){$$('.ovl.on').forEach(o=>{o.classList.remove('on');o._ret&&o._ret.focus&&o._ret.focus()})}

/* ---------- diseño (oscuro / blanco / venta) y letra ---------- */
const TEMAS=['cueva','oscuro','blanco'];
function temaActual(){const t=store.get('theme');return TEMAS.includes(t)?t:(t==='claro'?'blanco':t==='neon'||t==='sobrio'?'oscuro':'cueva')}
/* curvas de nivel de la cueva (fondo del diseño CUEVA), como en la versión topografía */
function contornos(){const st=getComputedStyle(document.documentElement).getPropertyValue('--line').trim()||'#2B353A';let s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">';
  for(let k=0;k<11;k++){const r=60+k*34;let d='';for(let a=0;a<=64;a++){const t=a/64*Math.PI*2,w=1+.18*Math.sin(3*t+k*.5)+.1*Math.sin(5*t-k*.3)+.05*Math.sin(9*t+k);
    const x=430+Math.cos(t)*r*1.35*w,y=300+Math.sin(t)*r*.8*w;d+=(a?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)}s+=`<path d="${d}Z" fill="none" stroke="${st}" stroke-width="1.1"/>`}
  document.documentElement.style.setProperty('--contornos','url("data:image/svg+xml,'+encodeURIComponent(s+'</svg>')+'")')}
function applySettings(){const th=temaActual(),fs=store.get('fs')||'1';document.documentElement.dataset.theme=th;if(th==='cueva')contornos();document.documentElement.style.setProperty('--fs',document.body.classList.contains('pres')?String(+fs*1.1):fs);
  $$('#s-theme button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.th===th));$$('#s-fs button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.fs===fs));
  setTimeout(()=>{fillVal();renderPrDet();renderTree();renderAll()},40)}

/* =====================================================================
   TU MESA · los 4 agentes que se regalan en la Mega Cueva (carpeta mesa-tis)
   Oficina pixel-art original (en el espíritu de Pixel Agents, de Pablo De Lucca, MIT).
   ===================================================================== */
const AGENTES=[
 {id:'dir',cod:'DIRECTOR',nom:'Director',fase:'Jefe de la mesa · fase 02',mision:'Reparte el trabajo y lleva tu ficha.',
  hace:'Recibe tu idea, te dice en qué fase está y quién la trabaja. La fase 02 (AED: ¿hay ventaja en los datos o es ruido?) la hace él, con su skill.',
  pide:'Director, esta es mi idea: compro oro en diario cuando el RSI de 4 baja de 25 y el cierre está sobre la media de 200. Vendo cuando el RSI sube de 55. Pásala por las fases 01 a 03 y guarda la ficha.',
  entrega:['Cada respuesta empieza con «Fase XX · nombre · agente»','Tu ficha, guardada en la carpeta fichas/','Fase 02: ventaja o ruido (pendiente si aún no hay CSV)'],
  look:{pelo:'corto',piel:'#E0AC69',hair:'#2B1D14',shirt:'#36414B',tie:'acc',auric:true}},
 {id:'hip',cod:'01 · HIPÓTESIS',nom:'Hipótesis',fase:'Fase 01 · criterio',mision:'Tu intuición → una hipótesis medible.',
  hace:'Convierte lo que intuyes en una regla completa y comprobable, con su porqué: qué comportamiento explota y quién pierde el dinero que tú ganas.',
  pide:'Hipótesis: creo que el oro rebota cuando cae fuerte varios días seguidos, pero solo si sigue en tendencia alcista.',
  entrega:['La regla en una línea: «Compro ___ cuando ___. Salgo cuando ___. Stop: ___.»','El porqué, en 2 o 3 líneas','Cada campo, medible o ambiguo; lo ambiguo, como supuesto'],
  look:{pelo:'largo',piel:'#8D5524',hair:'#17110C',shirt:'#2D6560',tie:'#245350'}},
 {id:'reg',cod:'03 · REGLAS',nom:'Reglas',fase:'Fase 03 · motor',mision:'Español → pseudocódigo sin ambigüedad.',
  hace:'Precisa la regla hasta que dos personas marquen exactamente las mismas operaciones en el gráfico: hora, cierre o mecha, qué pasa si no se cumple nada.',
  pide:'Reglas: pasa a pseudocódigo la regla de mi ficha del oro y dime los supuestos.',
  entrega:['Pseudocódigo con pasos numerados (datos · cada vela)','La lista de supuestos, todos ya decididos','El veredicto de la fase 03'],
  look:{pelo:'despeinado',piel:'#F1C27D',hair:'#A9502A',shirt:'#5F4570',tie:'#4E385D',gafas:true}},
 {id:'val',cod:'04 · VALIDADOR',nom:'Validador',fase:'Fase 04 · motor',mision:'Prepara regla y CSV para este tester. Da el veredicto X/4.',
  hace:'Deja tu regla en piezas listas para este tester y propone costes prudentes. Cuando le traes los números del tester, da el veredicto con los 4 números fuera de muestra.',
  pide:'Validador: prepara la regla y mi CSV datos/XAUUSD_D1.csv para el MEGA CUEVA TESTER.',
  entrega:['Entrada · salida · stop · horario · dirección · operaciones por día','Costes y reparto 70/30','Con los números del tester: ✓/✕ de los 4 y veredicto X/4'],
  look:{pelo:'calvo',piel:'#C68642',hair:'#2E2118',shirt:'#4F6233',tie:'#43532A',barba:true}}];
const TESTER_AG={id:'tes',cod:'MEGA CUEVA TESTER',nom:'El tester',fase:'Esta herramienta',mision:'Corre tu regla con costes y te da los números.',
  hace:'Backtest con costes, corte 70/30 y las 5 pruebas del protocolo TIS. Los 4 números fuera de muestra vuelven a tu agente 04 para el veredicto.',
  entrega:['Los 4 números fuera de muestra → X/4','Las 5 pruebas del protocolo, una a una']};
const AG_ALL=[...AGENTES,TESTER_AG],agPor=id=>AG_ALL.find(a=>a.id===id);
const PASOS=[{a:'dir',c:'Inicio',t:'recibe tu idea'},{a:'hip',c:'01',t:'hipótesis'},{a:'dir',c:'02',t:'AED · Director'},{a:'reg',c:'03',t:'reglas'},{a:'val',c:'04',t:'validador'},{a:'tes',c:'Tester',t:'X/4'}];
const OW=360,OH=208,YO=38,DY=104,DX={dir:20,hip:88,reg:156,val:224},TX=296;
let mesaSel='dir',mesaRAF=0,mesaFrame=-1,mesaS=2,mesaPaso=-2;
/* ---- sprites (14 × 15) construidos por filas: H pelo · S piel · E ojo · M boca · C camisa · T corbata · G gafas · B barba · P auriculares ---- */
function filasPersona(L,blink){const H={corto:["....HHHHHH....","...HHHHHHHH...","..HHHHHHHHHH..","..HHSSSSSSHH..","..HSSSSSSSSH.."],
   largo:["....HHHHHH....","...HHHHHHHH...","..HHHHHHHHHH..",".HHHSSSSSSHHH.",".HHSSSSSSSSHH."],
   despeinado:["...H.HH.HH....","..HHHHHHHHH...","..HHHHHHHHHH..","..HHSSSSSSHH..","..HSSSSSSSSH.."],
   calvo:["..............","....SSSSSS....","...SSSSSSSS...","..HSSSSSSSSH..","..HSSSSSSSSH.."]}[L.pelo];
  const r=H.slice();let ojos=L.pelo==='largo'?".HSSESSSSESSH.":"..SSESSSSESS..";if(L.gafas)ojos="..SGEGGGGEGS..";if(blink)ojos=ojos.replace(/E/g,L.gafas?'G':'S');r.push(ojos);
  r.push(L.pelo==='largo'?".HSSSSSSSSSSH.":"..SSSSSSSSSS..");
  r.push(L.barba?"..BBSSMMSSBB..":L.pelo==='largo'?".HHSSSMMSSSHH.":"...SSSMMSSS...");
  r.push(L.barba?"...BBBBBBBB...":L.pelo==='largo'?".HH.SSSSSS.HH.":"....SSSSSS....");
  r.push(L.barba?"....BBBBBB....":L.pelo==='largo'?".HH..SSSS..HH.":".....SSSS.....");
  r.push(L.pelo==='largo'?".HCCCCTTCCCCH.":"..CCCCTTCCCC..",".CCCCCTTCCCCC.","CCCCCCTTCCCCCC","CCCCCCCCCCCCCC","CCCCCCCCCCCCCC");
  if(L.auric){r[2]=".P"+r[2].slice(2,12)+"P.";r[4]=".P"+r[4].slice(2,12)+"P.";r[5]=".P"+r[5].slice(2,12)+"P."}
  return r}
function colPersona(L,P){return{H:L.hair,S:L.piel,E:'#1A1410',M:'#8E4436',C:L.shirt,T:L.tie==='acc'?P.acc:L.tie,G:'#15181B',B:L.hair,P:'#24292E'}}
function pintaSprite(px,rows,col,x0,y0,maxRow,out){const n=Math.min(rows.length,maxRow==null?99:maxRow);const on=(r,c)=>r>=0&&r<n&&c>=0&&c<14&&rows[r][c]!=='.';
  if(out)for(let r=-1;r<=n;r++)for(let c=-1;c<=14;c++){if(on(r,c))continue;if(on(r-1,c)||on(r+1,c)||on(r,c-1)||on(r,c+1))px(x0+c,y0+r,1,1,out)}
  for(let r=0;r<n;r++)for(let c=0;c<14;c++){const k=rows[r][c];if(k!=='.')px(x0+c,y0+r,1,1,col[k]||'#f0f')}}
function palOficina(){const th=document.documentElement.dataset.theme;const P=({
  cueva:{wall:'#13181B',wall2:'#192024',roca:'#222A2E',floorA:'#1B2124',floorB:'#171C1F',desk:'#463828',deskTop:'#68523E',deskSh:'#2F261C',chair:'#2B353A',mon:'#0A0D0F',monOff:'#1C2428',tape:'#FFD23F',tape2:'#121212',line:'#46545B',out:'#06080A',paper:'#ECE8DF',cork:'#5A4632',sombra:'rgba(0,0,0,.35)'},
  oscuro:{wall:'#0A1A2E',wall2:'#0D213A',roca:'#11294A',floorA:'#0B1D33',floorB:'#09182B',desk:'#33445A',deskTop:'#4E6480',deskSh:'#223044',chair:'#1A3352',mon:'#040B16',monOff:'#12263E',tape:'#3FD6FF',tape2:'#062033',line:'#2C506F',out:'#02060C',paper:'#E4F1FB',cork:'#2A4058',sombra:'rgba(0,0,0,.35)'},
  blanco:{wall:'#E6E9EE',wall2:'#DCE0E7',roca:'#CDD3DC',floorA:'#F4F5F8',floorB:'#ECEEF2',desk:'#B49A78',deskTop:'#D0B892',deskSh:'#8C7457',chair:'#98A3B3',mon:'#1B2430',monOff:'#3A4656',tape:'#C5CBD4',tape2:'#AEB5C0',line:'#B9C0CB',out:'#3A4250',paper:'#FFFFFF',cork:'#C9B38E',sombra:'rgba(30,40,60,.12)'}})[th]||{};
  P.th=th;P.acc=css('--cy');P.ok=css('--ok');P.red=css('--red');P.dim=css('--dim2');return P}
function estadoMesa(ms){const W=2600,M=900,ciclo=M+PASOS.length*(W+M);let r=ms%ciclo;if(r<M)return{paso:-1,mov:{de:'in',a:0,p:r/M}};
  r-=M;const k=Math.floor(r/(W+M)),q=r-k*(W+M);if(q<W)return{paso:k,work:q/W};return{paso:k,mov:{de:k,a:k+1,p:(q-W)/M}}}
function anclaPaso(i){if(i==='in')return[-8,DY+30];if(i>=PASOS.length)return[DX.val+36,DY-6];const a=PASOS[i].a;if(a==='tes')return[TX+26,82];return[DX[a]+36,DY-6]}
function dibujarOficina(ms){const cv=$('#of-cv');if(!cv||!cv.width)return;const g=cv.getContext('2d'),S=cv.width/OW,P=palOficina();
  const px=(x,y,w,h,c)=>{const X=Math.round(x*S),Y=Math.round((y+YO)*S);g.fillStyle=c;g.fillRect(X,Y,Math.round((x+w)*S)-X,Math.round((y+h+YO)*S)-Y)};
  const st=RM?{paso:3,work:.5}:estadoMesa(ms),act=st.work!=null?PASOS[st.paso].a:null,beat=Math.floor(ms/170)%2,lento=Math.floor(ms/420);
  g.clearRect(0,0,cv.width,cv.height);
  /* pared */
  px(0,-YO,OW,56+YO,P.wall);for(let y=8-YO;y<52;y+=8)for(let x=(y/8)%2?0:12;x<OW;x+=24)px(x,y,22,1,P.wall2);
  if(P.th==='cueva'){[[6,7],[30,4],[47,9],[76,5],[104,8],[205,6],[232,10],[262,4],[284,7],[352,6]].forEach(([x,l])=>{for(let i=0;i<l+6;i++)px(x+Math.floor(i/3),i-YO,Math.max(1,4-Math.floor(i*4/l)),1,P.roca)})}
  /* tablero de fichas, reloj, faroles */
  px(118,10,84,32,P.deskSh);px(120,12,80,28,P.cork);[[126,16],[142,18],[160,15],[178,19]].forEach(([x,y],i)=>{px(x,y,11,14,P.paper);px(x+2,y+4,7,1,P.line);px(x+2,y+7,6,1,P.line);px(x+2,y+10,5,1,P.line);px(x+5,y-1,2,2,i===2?P.acc:P.red)});
  px(248,14,12,12,P.line);px(249,15,10,10,P.paper);px(254,17,1,4,P.out);px(254,20,3,1,P.out);
  if(P.th!=='blanco'){[60,276].forEach(x=>{px(x,-YO,1,14+YO,P.line);g.fillStyle=rgba('--cy-rgb',.10);g.beginPath();g.arc((x+.5)*S,(17+YO)*S,11*S,0,7);g.fill();px(x-2,14,5,5,P.acc)})}
  /* letrero de la mesa */
  {const GL={M:["X...X","XX.XX","X.X.X","X...X","X...X"],E:["XXXX","X...","XXX.","X...","XXXX"],S:[".XXX","X...",".XX.","...X","XXX."],A:[".XX.","X..X","XXXX","X..X","X..X"],T:["XXXXX","..X..","..X..","..X..","..X.."],I:["XXX",".X.",".X.",".X.","XXX"]," ":["..","..","..","..",".."]};
   const txt='MESA TIS',w=[...txt].reduce((a,c)=>a+GL[c][0].length+1,-1)*2,x0=160-w/2,y0=-27;px(x0-7,y0-5,w+14,20,P.out);px(x0-6,y0-4,w+12,18,P.th==='blanco'?'#1B2430':'#0B0F11');
   let x=x0;[...txt].forEach(c=>{GL[c].forEach((row,r)=>[...row].forEach((k,cc)=>{if(k==='X')px(x+cc*2,y0+r*2,2,2,c==='T'||c==='I'||(c==='S'&&x>x0+40)?P.ok:P.acc)}));x+=(GL[c][0].length+1)*2})}
  /* cinta / zócalo */
  for(let x=0;x<OW;x+=2)px(x,52,2,4,((x>>2)%2)?P.tape:P.tape2);
  /* suelo */
  for(let y=56;y<OH-YO;y+=10)for(let x=0;x<OW;x+=10)px(x,y,10,10,((x+y)/10)%2?P.floorA:P.floorB);
  /* camino de la ficha */
  for(let x=40;x<TX+4;x+=5)px(x,150,2,1,P.line);
  Object.values(DX).forEach(dx=>{px(dx+22,148,5,5,P.line);px(dx+23,149,3,3,P.floorB)});
  /* planta */
  px(4,118,10,12,P.deskSh);px(5,119,8,10,P.desk);[[6,104,3,14],[9,100,3,18],[12,106,3,12],[3,108,3,8]].forEach(([x,y,w,h])=>px(x,y,w,h,P.th==='blanco'?'#3E8E5A':'#2F6B45'));
  /* puestos */
  AGENTES.forEach((A,i)=>{const dx=DX[A.id],on=act===A.id,sel=mesaSel===A.id,cx=dx+17,cy=DY-13;
    if(sel){g.fillStyle=rgba('--cy-rgb',P.th==='blanco'?.14:.12);g.fillRect(Math.round((dx-5)*S),Math.round((DY-30+YO)*S),Math.round(58*S),Math.round(66*S));
      const b=(x,y,w,h)=>px(x,y,w,h,rgba('--cy-rgb',.6));b(dx-5,DY-30,58,1);b(dx-5,DY+35,58,1);b(dx-5,DY-30,1,66);b(dx+52,DY-30,1,66)}
    px(dx+2,DY+26,46,3,P.sombra);
    px(dx+13,DY-17,22,17,P.chair);px(dx+14,DY-18,20,1,P.chair);
    const blink=!on&&((lento+i*3)%9===0);pintaSprite(px,filasPersona(A.look,blink),colPersona(A.look,P),cx,cy,13,P.out);
    px(dx,DY,48,5,P.deskTop);px(dx,DY+5,48,14,P.desk);px(dx,DY+5,48,1,P.deskSh);px(dx+30,DY+11,7,1,P.deskSh);px(dx+2,DY+19,3,7,P.deskSh);px(dx+43,DY+19,3,7,P.deskSh);
    /* manos */
    const sk=A.look.piel,up1=on&&beat?1:0,up2=on&&!beat?1:0;px(cx+1,DY-1-up1,3,2,sk);px(cx+10,DY-1-up2,3,2,sk);
    /* monitor */
    px(dx+2,DY-14,15,12,P.out);px(dx+3,DY-13,13,10,on?'#06140C':P.monOff);px(dx+8,DY-2,4,2,P.out);
    for(let k=0;k<4;k++){const w=on?2+((k*5+Math.floor(ms/140))%9):[7,4,9,5][k];px(dx+4,DY-12+k*2,Math.min(11,w),1,on?P.ok:P.line)}
    /* objetos de cada mesa */
    if(A.id==='dir'){px(dx+38,DY-5,5,5,P.paper);px(dx+43,DY-4,1,3,P.paper);if(!on&&!RM){const s=Math.floor(ms/300)%3;px(dx+39+(s%2),DY-8-s,1,2,P.line)}}
    if(A.id==='hip'){px(dx+40,DY-3,6,3,P.deskSh);px(dx+42,DY-10,2,7,P.deskSh);px(dx+40,DY-13,6,4,on?P.acc:P.line);if(on){g.fillStyle=rgba('--cy-rgb',.18);g.beginPath();g.arc((dx+43)*S,(DY-11+YO)*S,7*S,0,7);g.fill()}}
    if(A.id==='reg'){px(dx+35,DY-4,10,4,P.paper);px(dx+36,DY-3,8,1,P.line);px(dx+36,DY-1,6,1,P.line);px(dx+44,DY-6,1,6,P.acc)}
    if(A.id==='val'){px(dx+35,DY-3,9,3,P.paper);px(dx+39,DY-9,3,5,P.deskSh);px(dx+37,DY-4,7,2,on&&beat?P.ok:P.red)}
    /* bocadillo */
    if(on){px(cx+13,cy-7,14,9,P.out);px(cx+14,cy-6,12,7,P.paper);px(cx+13,cy+2,3,2,P.out);px(cx+14,cy+1,2,2,P.paper);
      for(let d=0;d<3;d++)px(cx+16+d*3,cy-3-((Math.floor(ms/200)+d)%3===0?1:0),2,2,d===Math.floor(ms/200)%3?P.acc:P.out)}});
  /* el tester */
  const tOn=act==='tes',tp=tOn?st.work:0;
  if(mesaSel==='tes'){g.fillStyle=rgba('--cy-rgb',.12);g.fillRect(Math.round((TX-6)*S),Math.round((28+YO)*S),Math.round(64*S),Math.round(110*S))}
  px(TX+2,128,52,3,P.sombra);px(TX,34,52,94,P.out);px(TX+1,35,50,92,P.chair);px(TX+2,36,48,7,P.tape);for(let x=TX+2;x<TX+50;x+=6)px(x,36,3,7,P.tape2);
  px(TX+5,47,42,28,P.out);px(TX+6,48,40,26,'#05100A');
  const EQ=D.eq||[];if(EQ.length>2){const n=38,ys=[];for(let k=0;k<n;k++)ys.push(EQ[Math.floor(k*(EQ.length-1)/(n-1))][1]);const lo=Math.min(...ys),hi=Math.max(...ys);const upto=tOn?Math.floor(n*Math.min(1,tp*1.6)):n;
    for(let k=0;k<upto;k++){const y=Math.round(66-(ys[k]-lo)/((hi-lo)||1)*15);px(TX+7+k,y,1,1,P.ok)}}
  const F=['F1','F2','F3','F4','F5'];F.forEach((k,i)=>{const lit=!tOn||tp>.35+i*.1;px(TX+8+i*7,69,5,3,lit?(D.fases&&D.fases[k]?P.ok:P.red):P.monOff)});px(TX+43,69,2,3,P.line);
  px(TX+12,82,28,3,tOn?P.acc:P.out);px(TX+8,92,5,5,P.red);px(TX+16,92,5,5,P.ok);px(TX+24,93,18,3,P.line);px(TX+6,104,40,18,P.desk);px(TX+6,104,40,1,P.deskSh);
  /* la ficha viajando */
  let fx=null,fy=null,res=false;if(!RM){if(st.mov){const[a1,b1]=anclaPaso(st.mov.de),[a2,b2]=anclaPaso(st.mov.a),p=st.mov.p,e=p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2;fx=a1+(a2-a1)*e;fy=b1+(b2-b1)*e-Math.sin(Math.PI*p)*22;res=st.mov.de===PASOS.length-1}
    else if(st.paso>=0&&PASOS[st.paso].a!=='tes'){[fx,fy]=anclaPaso(st.paso)}}
  if(fx!=null){px(fx-1,fy-1,8,10,P.out);px(fx,fy,6,8,res?(D.fases&&Object.values(D.fases).every(Boolean)?P.ok:P.red):P.paper);px(fx+1,fy+2,4,1,P.line);px(fx+1,fy+4,3,1,P.line)}
  return st}
function mesaTags(){$('#of-tags').innerHTML=AG_ALL.map(A=>{const x=A.id==='tes'?TX-4:DX[A.id]-4,w=A.id==='tes'?60:56;
  return `<button type="button" class="of-st" data-ag="${A.id}" style="left:${x/OW*100}%;width:${w/OW*100}%;top:${((A.id==='tes'?4:58)+YO)/OH*100}%;height:${(A.id==='tes'?126:(DY+30-58))/OH*100}%" aria-pressed="${A.id===mesaSel}"><span class="of-tag"><b>${esc(A.id==='tes'?'Tester':A.nom)}</b><small><i></i><span class="of-est">esperando</span></small></span><span class="sr">: ${esc(A.mision)}</span></button>`}).join('');
  $$('#of-tags .of-st').forEach(b=>b.onclick=()=>selAgente(b.dataset.ag))}
function mesaFlujo(){$('#of-flujo').innerHTML=PASOS.map((p,i)=>`<li><button type="button" data-paso="${i}" data-ag="${p.a}"><b>${esc(p.c)}</b><span>${esc(p.t)}</span></button></li>`).join('');
  $$('#of-flujo button').forEach(b=>b.onclick=()=>selAgente(b.dataset.ag))}
function mesaEstado(st){const act=st.work!=null?PASOS[st.paso].a:null;const k=st.work!=null?st.paso:-1;if(k===mesaPaso)return;mesaPaso=k;
  $$('#of-tags .of-st').forEach(b=>{const on=b.dataset.ag===act;b.classList.toggle('trabaja',on);$('.of-est',b).textContent=on?(b.dataset.ag==='tes'?'corriendo':'trabajando'):'esperando'});
  $$('#of-flujo button').forEach(b=>b.classList.toggle('on',+b.dataset.paso===k))}
function retrato(cv,A,esc2,soloCabeza){const P=palOficina(),rows=filasPersona(A.look,false),n=soloCabeza?10:13;cv.width=16*esc2;cv.height=(n+2)*esc2;const g=cv.getContext('2d');g.clearRect(0,0,cv.width,cv.height);
  const px=(x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(x*esc2,y*esc2,w*esc2,h*esc2)};pintaSprite(px,rows,colPersona(A.look,P),1,1,n,P.out)}
function selAgente(id){mesaSel=id;const A=agPor(id),i=AG_ALL.indexOf(A);
  $$('#of-tags .of-st').forEach(b=>b.setAttribute('aria-pressed',b.dataset.ag===id));
  const o=OOS||{},n4=[o.pf>=1.3,o.n>=30,o.maxdd<.2,o.pf_sin_mejor>1].filter(Boolean).length,np=Object.values(D.fases||{}).filter(Boolean).length;
  const extra=id==='tes'?`<div class="ag-b"><h3>En la ${ES_DEMO?'demo del oro':'prueba'}</h3><p class="ag-ver"><b>${n4}/4</b> en los 4 números · <b>${np}/5</b> en el protocolo → <span class="${np===5?'pos':'neg'}">${np===5?'aprueba':'no aprueba'}</span></p></div>`:'';
  $('#ag-det').innerHTML=`<div class="ag-top">${A.look?'<canvas class="ag-ret" aria-hidden="true"></canvas>':'<span class="ag-ret ag-tes" aria-hidden="true"></span>'}<div><p class="eyebrow">${esc(A.fase)}</p><h2>${esc(A.id==='tes'?'Mega Cueva Tester':A.nom)}</h2><p class="ag-mision">${esc(A.mision)}</p></div></div>
    <div class="ag-b"><h3>Qué hace</h3><p>${esc(A.hace)}</p></div>
    ${A.pide?`<div class="ag-b"><h3>Qué le pides</h3><div class="ag-msg"><p id="ag-pide">${esc(A.pide)}</p><button type="button" class="btn" id="ag-copiar"><svg class="ic"><use href="#i-copiar"/></svg> COPIAR</button></div></div>`:''}
    <div class="ag-b"><h3>Qué te entrega</h3><ul class="ag-ent">${A.entrega.map(t=>`<li>${esc(t)}</li>`).join('')}</ul></div>${extra}
    <div class="ag-nav"><button type="button" class="btn" data-agm="-1" aria-label="Agente anterior">◀</button><span class="mono c-dim">${i+1} / ${AG_ALL.length}</span><button type="button" class="btn" data-agm="1" aria-label="Agente siguiente">▶</button>${id==='tes'||id==='val'?'<button type="button" class="btn gold" data-go="prueba">IR A LA PRUEBA →</button>':''}</div>`;
  const rc=$('#ag-det canvas.ag-ret');if(rc)retrato(rc,A,6);
  $$('#ag-det [data-agm]').forEach(b=>b.onclick=()=>selAgente(AG_ALL[(i+ +b.dataset.agm+AG_ALL.length)%AG_ALL.length].id));
  const cb=$('#ag-copiar');if(cb)cb.onclick=()=>copiarTexto(A.pide,$('#ag-pide'));
  if(RM||!mesaRAF)dibujarOficina(performance.now())}
function mesaResize(){const m=$('#of-marco'),e=$('#of-esc'),cv=$('#of-cv');if(!m||!m.clientWidth)return;const s=Math.min(m.clientWidth/OW,m.clientHeight/OH);if(!(s>0))return;mesaS=s;
  const w=Math.floor(OW*s),h=Math.floor(OH*s),dpr=window.devicePixelRatio||1;e.style.width=w+'px';e.style.height=h+'px';cv.style.width=w+'px';cv.style.height=h+'px';cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);
  mesaFrame=-1;mesaEstado(dibujarOficina(performance.now()))}
function mesaLoop(t){mesaRAF=0;if(VIEWS[cur]!=='mesa'||document.hidden)return;const f=Math.floor(t/85);if(f!==mesaFrame){mesaFrame=f;mesaEstado(dibujarOficina(t))}mesaRAF=requestAnimationFrame(mesaLoop)}
function mesaActiva(on){if(on){requestAnimationFrame(()=>{mesaResize();if(!RM&&!mesaRAF)mesaRAF=requestAnimationFrame(mesaLoop)})}else if(mesaRAF){cancelAnimationFrame(mesaRAF);mesaRAF=0}}
function mesaMini(){const el=$('#pi-mesa-mini');if(!el)return;
  el.innerHTML=`<span class="mm-t">Tu mesa</span><ol class="mm-l">${AGENTES.map(A=>`<li><canvas aria-hidden="true" data-mm="${A.id}"></canvas><span>${esc(A.id==='dir'?'Director':A.cod.replace(' · ',' '))}</span></li>`).join('')}<li class="mm-yo"><span>aquí</span></li></ol><button type="button" class="link" data-go="mesa">ver tu mesa →</button>`;
  $$('canvas[data-mm]',el).forEach(c=>retrato(c,agPor(c.dataset.mm),2,true))}
function initMesa(){mesaTags();mesaFlujo();selAgente(mesaSel);mesaMini();
  if('ResizeObserver' in window)new ResizeObserver(()=>{if(VIEWS[cur]==='mesa')mesaResize()}).observe($('#of-marco'));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&VIEWS[cur]==='mesa')mesaActiva(true)})}

/* =====================================================================
   TU IDEA EN LENGUAJE NATURAL → (a) mensaje para el agente 03 · (b) traductor sin IA
   ===================================================================== */
const EJ_IDEA='Compro oro en diario cuando el RSI de 4 baja de 25 y el precio está por encima de la media de 200. Vendo cuando el RSI sube de 55.';
const normIdea=t=>String(t).normalize('NFC').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/(\d),(\d)/g,'$1.$2');
const ACT_NL=[[/\b(oro|xauusd|gold)\b/,'XAUUSD','metal'],[/\b(plata|xagusd|silver)\b/,'XAGUSD','metal'],[/\b(nasdaq|nas100|ndx|us100)\b/,'NAS100','indice'],[/(\bs&p\s*(500)?|\bsp500\b|\bspx(500)?\b|\bus500\b)/,'US500','indice'],
  [/\b(dow\s*jones|us30)\b/,'US30','indice'],[/\b(dax|ger40|de40)\b/,'GER40','indice'],[/\b(bitcoin|btc|btcusd)\b/,'BTCUSD','cripto'],[/\b(ethereum|eth|ethusd)\b/,'ETHUSD','cripto'],
  [/\b(petroleo|crudo|wti|xtiusd)\b/,'XTIUSD','energia'],[/\b(eurusd|euro\s*dolar)\b/,'EURUSD','forex'],[/\b(gbpusd|libra)\b/,'GBPUSD','forex'],[/\b(usdjpy)\b/,'USDJPY','forex']];
const OPS_NL=[
 [/\b(?:cruza|cruzan|corta|cortan)\s+(?:hacia\s+)?(?:arriba|al\s+alza|por\s+encima)(?:\s+(?:de|a|del))?\b/,'cruza_arriba'],
 [/\b(?:cruza|cruzan|corta|cortan)\s+(?:hacia\s+)?(?:abajo|a\s+la\s+baja|por\s+debajo)(?:\s+(?:de|a|del))?\b/,'cruza_abajo'],
 [/>=|≥|\bmayor\s+o\s+igual\s+(?:que|a)\b/,'>='],[/<=|≤|\bmenor\s+o\s+igual\s+(?:que|a)\b/,'<='],
 [/(?:\b(?:esta|estan|cierra|cierran|queda|quedan|sigue|se\s+mantiene)\s+)?(?:por\s+)?encima\s+(?:de|del)\b|\bsobre\b|\bsube(?:n)?\s+(?:de|por\s+encima\s+de|a\s+mas\s+de|sobre)\b|\bsupera(?:n)?\b|\bmayor\s+(?:que|a|de)\b|\bpasa\s+de\b|\bmas\s+de\b|\brompe(?:n)?\b(?=\s+(?:el\s+|la\s+)?(?:maximo|resistencia))|>/,'>'],
 [/(?:\b(?:esta|estan|cierra|cierran|queda|quedan|sigue|se\s+mantiene)\s+)?(?:por\s+)?debajo\s+(?:de|del)\b|\bbaja(?:n)?\s+(?:de|a\s+menos\s+de|por\s+debajo\s+de)\b|\bcae(?:n)?\s+(?:de|a\s+menos\s+de|por\s+debajo\s+de)\b|\bperfora(?:n)?\b|\bmenor\s+(?:que|a|de)\b|\bmenos\s+de\b|\brompe(?:n)?\b(?=\s+(?:el\s+|la\s+)?(?:minimo|soporte))|\bbajo\b|</,'<']];
function opNL(s){s=s.replace(/\b(cuando|si|que|el|la|los|las|lo|su|sus|del|de|al|a|actual|valor|nivel|indicador|esta|estan|ya|un|una|precio\s+de)\b/g,' ').replace(/[()]/g,' ').replace(/\s+/g,' ').trim();let m;
  if((m=s.match(/\brsi\s*(\d+)?/)))return{tipo:'rsi',periodo:m[1]?+m[1]:null};
  if((m=s.match(/\b(?:ema|mme|media\s+(?:movil\s+)?exponencial)\s*(?:ultim[oa]s\s+)?(\d+)?/)))return{tipo:'ema',periodo:m[1]?+m[1]:null};
  if((m=s.match(/\b(?:sma|mm|media(?:\s+movil)?(?:\s+simple)?|promedio)\s*(?:ultim[oa]s\s+)?(\d+)?/)))return{tipo:'sma',periodo:m[1]?+m[1]:null};
  if((m=s.match(/\batr\s*(\d+)?/)))return{tipo:'atr',periodo:m[1]?+m[1]:14};
  if((m=s.match(/\b(?:maximo|maximos|high)\s+(?:ultim[oa]s\s+|anteriores\s+|previos\s+)?(\d+)/)))return{tipo:'max_n',periodo:+m[1]};
  if((m=s.match(/\b(?:minimo|minimos|low)\s+(?:ultim[oa]s\s+|anteriores\s+|previos\s+)?(\d+)/)))return{tipo:'min_n',periodo:+m[1]};
  if((m=s.match(/^(\d+)\s*(?:periodos?|velas?|dias?|sesiones?|barras?)$/)))return{tipo:'num',valor:null,_amb:+m[1]};
  if((m=s.match(/^-?\d+(?:\.\d+)?(?:\s*(?:puntos|pts))?$/)))return{tipo:'num',valor:parseFloat(m[0])};
  if(!s||/^(precio|cierre|cierra|close|vela|cotizacion)\b/.test(s))return{tipo:'precio'};
  if(/^(apertura|abre|open)\b/.test(s))return{tipo:'apertura'};if(/^(maximo|high)\b/.test(s))return{tipo:'maximo'};if(/^(minimo|low)\b/.test(s))return{tipo:'minimo'};
  if(ACT_NL.some(([re])=>re.test(s))&&s.split(' ').length<=2)return{tipo:'precio'};return null}
function condNL(x,ctx){for(const[re,op]of OPS_NL){const m=x.match(re);if(!m)continue;
    let a=opNL(x.slice(0,m.index)),b=opNL(x.slice(m.index+m[0].length));if(!a||!b||(a.tipo==='num'&&b.tipo==='num'))return null;
    if(a._amb!=null)return null;if(b._amb!=null){if(a.tipo!=='rsi')return null;if(a.periodo==null)a.periodo=b._amb;const u=op==='<'||op==='<='?15:85;
      ctx.notas.push(`«${op==='<'||op==='<='?'debajo':'encima'} de ${b._amb} periodos»: entiendo RSI de ${a.periodo} periodos, pero falta el umbral. Pongo ${u} (el de tu EA del NDX es RSI(2) < 15): confírmalo.`);b={tipo:'num',valor:u}}
    let c=a.tipo==='num'?{izq:b,op:INV[op]||op,der:a}:{izq:a,op,der:b};
    [c.izq,c.der].forEach(o=>{if(o.periodo===null){const def={rsi:ctx.rsi||14,sma:ctx.sma||200,ema:ctx.ema||20}[o.tipo];ctx.notas.push(`Sin periodo en ${o.tipo.toUpperCase()}: uso ${def} (supuesto)`);o.periodo=def}
      if(o.tipo==='rsi')ctx.rsi=o.periodo;if(o.tipo==='sma')ctx.sma=o.periodo;if(o.tipo==='ema')ctx.ema=o.periodo});return c}
  return null}
function trozosNL(s,off,re){const out=[];let last=0,m;const R=new RegExp(re.source,'g');while((m=R.exec(s))){if(!m[0].length){R.lastIndex++;continue}out.push([s.slice(last,m.index),off+last]);last=m.index+m[0].length}out.push([s.slice(last),off+last]);
  return out.map(([t,o])=>{const l=t.length-t.trimStart().length;return[t.trim(),o+l]}).filter(x=>x[0]&&!/^(y|e|o|que|tambien|ademas|entonces|pues|vale)$/.test(x[0]))}
const VACIAS=new Set('y e o u en de del el la los las lo que con un una unos mi mis idea es mi esta este esto ademas tambien entonces pues bueno vale yo a al por para se me le'.split(' '));
function traducirIdea(orig){const txt=String(orig).normalize('NFC');let s=normIdea(txt);const it=[],marcas=[],ctx={notas:[]};
  const pon=(e,t)=>it.push({e,t}),marca=(a,b,c)=>marcas.push([a,b,c]),borra=(a,b)=>{s=s.slice(0,a)+' '.repeat(b-a)+s.slice(b)};
  const nuevo=clone(SPEC);nuevo.gestion={stop:{tipo:'ninguno',valor:null},objetivo:{tipo:'ninguno',valor:null},salida_tiempo_velas:null};let m;
  /* activo y temporalidad */
  for(const[re,sym,cl]of ACT_NL){if((m=s.match(re))){if(sym!==nuevo.activo.simbolo&&!CSV)pon('av',`Activo ${sym}: sube su CSV (los datos de ejemplo son del oro)`);else pon('ok','Activo: '+sym);nuevo.activo={simbolo:sym,clase:cl};marca(m.index,m.index+m[0].length,'ok');break}}
  const RTF=/\b(?:en\s+)?(?:grafico\s+)?(?:velas?\s+)?(?:de\s+)?(diario|diarias?|semanal(?:es)?|(?:de\s+)?(?:1|4|15|5)\s*(?:h|horas?|min(?:utos)?)\b|horari[oa]s?|h1|h4|d1|m15|m5|w1)\b/;
  if((m=s.match(RTF))){const tf=TF_DE(m[1]);if(tf){nuevo.temporalidad=tf;pon('ok','Temporalidad: '+TFN[tf]);marca(m.index,m.index+m[0].length,'ok');borra(m.index,m.index+m[0].length)}}
  /* N velas/barras verdes (o rojas) consecutivas → condiciones con desfase (vela verde = cierre > apertura de esa vela) */
  const NUMW={una:1,un:1,dos:2,tres:3,cuatro:4,cinco:5};
  const RV=/\b(?:(salir|salgo|vendo|vender|cerrar|cierro)\s+(?:a\s+|tras\s+|con\s+|despues\s+de\s+|cuando\s+(?:haya|hay)\s+)?)?(?:(?:las|los)\s+)?(\d+|una|un|dos|tres|cuatro|cinco)\s+(?:velas?|barras?|cierres?|sesiones?|dias?)\s+(?:diari[oa]s\s+)?(verdes?|alcistas?|positivas?|rojas?|bajistas?|negativas?)(?:\s+(?:diari[oa]s|consecutiv[oa]s|seguid[oa]s|en\s+fila|de\s+seguido))*\b/g;
  while((m=RV.exec(s))){const N=NUMW[m[2]]||+m[2];if(!(N>=1&&N<=5))continue;const sube=/verd|alcist|positiv/.test(m[3]),cierres=/cierres?\b/.test(m[0]);
    const antes=s.slice(Math.max(0,s.lastIndexOf('.',m.index)),m.index),ie=Math.max(...['compr','entr','abro','abrir'].map(w=>antes.lastIndexOf(w))),is_=Math.max(...['sal','vend','cierr','cerr','recompr'].map(w=>antes.lastIndexOf(w)));
    const sec=m[1]||is_>ie?'salida':'entrada',cs=[];for(let d=0;d<N;d++)cs.push(cierres?{izq:{tipo:'precio',...(d?{desfase:d}:{})},op:sube?'>':'<',der:{tipo:'precio',desfase:d+1}}:{izq:{tipo:'precio',...(d?{desfase:d}:{})},op:sube?'>':'<',der:{tipo:'apertura',...(d?{desfase:d}:{})}});
    ctx.velas=ctx.velas||[];ctx.velas.push({sec,cs});pon('ok',(sec==='salida'?'Salida':'Entrada')+': '+N+(N>1?' velas ':' vela ')+(sube?'verdes':'rojas')+(N>1?' seguidas':'')+' → '+cs.map(condTxt).join(' Y '));
    if(!cierres)ctx.notas.push('«Vela '+(sube?'verde':'roja')+'» = cierre '+(sube?'>':'<')+' apertura de esa vela (como tu EA del NDX). Si querías cierres que '+(sube?'suben':'bajan')+' (cierre '+(sube?'>':'<')+' cierre anterior, como la 006), cámbialo en el formulario.');
    marca(m.index,m.index+m[0].length,'ok');borra(m.index,m.index+m[0].length)}
  /* stop, objetivo y salida por tiempo (en cualquier parte del texto) */
  const UNI='(%|por\\s*ciento|atr|veces\\s+(?:el\\s+)?atr|x\\s*atr)?';
  if((m=s.match(/\bsin\s+stop\b/))){pon('ok','Stop: sin stop');marca(m.index,m.index+m[0].length,'ok');borra(m.index,m.index+m[0].length)}
  else if((m=s.match(new RegExp('\\b(?:con\\s+(?:un\\s+)?)?stop(?:\\s*loss)?\\s*(?:de(?:l)?|en|a|:)?\\s*(?:un\\s+|una\\s+)?(\\d+(?:\\.\\d+)?)\\s*'+UNI)))){const v=+m[1],atr=/atr/.test(m[2]||'');
    nuevo.gestion.stop={tipo:atr?'atr':'pct',valor:v};pon(m[2]?'ok':'av','Stop: '+nf(v,v%1?1:0)+(atr?' × ATR':' %')+(m[2]?'':' (no dijiste la unidad: supongo %)'));marca(m.index,m.index+m[0].length,'ok');borra(m.index,m.index+m[0].length)}
  if((m=s.match(new RegExp('\\b(?:con\\s+(?:un\\s+)?)?(?:objetivo|take\\s*profit|tp|target|recojo\\s+beneficios?)\\s*(?:de(?:l)?|en|a|:)?\\s*(?:un\\s+|una\\s+)?(\\d+(?:\\.\\d+)?)\\s*'+UNI)))){const v=+m[1],atr=/atr/.test(m[2]||'');
    nuevo.gestion.objetivo={tipo:atr?'atr':'pct',valor:v};pon(m[2]?'ok':'av','Objetivo: '+nf(v,v%1?1:0)+(atr?' × ATR':' %')+(m[2]?'':' (supongo %)'));marca(m.index,m.index+m[0].length,'ok');borra(m.index,m.index+m[0].length)}
  if((m=s.match(/\b(?:o\s+)?(?:salgo\s+|cierro\s+|vendo\s+)?(?:a\s+las|a\s+los|tras|despues\s+de|pasad[oa]s|al\s+cabo\s+de|como\s+maximo|maximo|cuando\s+pasen)\s+(\d+)\s+(velas|dias|sesiones|barras)\b(?!\s+(?:diari[oa]s\s+)?(?:verdes?|rojas?|alcistas?|bajistas?|positivas?|negativas?|consecutiv|seguid|que\s+(?:suben|bajan|cierran)))/))){
    nuevo.gestion.salida_tiempo_velas=+m[1];pon('ok','Salida por tiempo: '+m[1]+' velas');marca(m.index,m.index+m[0].length,'ok');borra(m.index,m.index+m[0].length)}
  /* marcadores de entrada y salida */
  const MK=[];let R=/\b(?:compro|comprar|compra|entro|entrar|abro|me\s+pongo|voy|vendo\s+en\s+corto|vendo\s+corto|vender\s+en\s+corto)\b[^.;]*?\b(?:cuando|si)\b/g;
  while((m=R.exec(s))){const corto=/corto|me\s+pongo\s+corto|voy\s+corto/.test(m[0])&&!/largo/.test(m[0]);MK.push({k:'ent',corto,i:m.index,f:m.index+m[0].length})}
  R=/\b(?:vendo|vender|salgo|salir|cierro|cerrar|recompro|cubro|me\s+salgo)\b[^.;]*?\b(?:cuando|si)\b/g;
  while((m=R.exec(s))){const i=m.index;if(MK.some(x=>i>=x.i&&i<x.f))continue;MK.push({k:'sal',i,f:i+m[0].length})}
  MK.sort((a,b)=>a.i-b.i);
  const ent=MK.filter(x=>x.k==='ent'),dirs=new Set(ent.map(x=>x.corto?'corto':'largo'));
  nuevo.direccion=dirs.size===2?'ambos':dirs.has('corto')?'corto':'largo';
  if(ent.length)pon('ok','Dirección: '+{largo:'solo compras',corto:'solo ventas en corto',ambos:'compras y ventas (el corto usa las condiciones espejo)'}[nuevo.direccion]);
  const reglas={filtros:[],entrada:[],salida:[],pasos:[],salida_modo:'cualquiera'};const usados=new Set();
  (ctx.velas||[]).forEach(v=>{reglas[v.sec].push(...v.cs);if(v.sec==='salida'&&v.cs.length>1)reglas.salida_modo='todas'});
  MK.forEach((k,j)=>{if(k.k==='ent'&&nuevo.direccion==='ambos'&&k.corto)return;const fin=j+1<MK.length?MK[j+1].i:s.length;marca(k.i,k.f,'ok');
    const seg=s.slice(k.f,fin);const sep=k.k==='sal'?/[.;,]|\by\b|\be\b|\bo\b|\bademas\b/:/[.;,]|\by\b|\be\b|\bademas\b|\bsiempre\s+que\b|\bmientras\b/;
    trozosNL(seg,k.f,sep).forEach(([t,o])=>{if(usados.has(o))return;usados.add(o);const c=condNL(t,ctx);
      if(!c){pon('no',`No entendí «${txt.slice(o,o+t.length)}»: añádelo a mano en Reglas`);marca(o,o+t.length,'no');return}
      let g=k.k==='sal'?'salida':'entrada';if(g==='entrada'&&['>','<','>=','<='].includes(c.op)&&['precio','apertura','maximo','minimo'].includes(c.izq.tipo)&&['sma','ema'].includes(c.der.tipo))g='filtros';
      reglas[g].push(c);marca(o,o+t.length,'ok');pon('ok',{filtros:'Filtro',entrada:'Entrada',salida:'Salida'}[g]+': '+condTxt(c))})});
  /* lo que queda sin usar */
  const resto=s.replace(/[.;,]/g,' ');let r0=/[a-z0-9%]+(?:\s+[a-z0-9%]+)*/g;
  while((m=r0.exec(resto))){const a=m.index,b=a+m[0].length;if(marcas.some(([x,y])=>a<y&&b>x))continue;
    if(m[0].split(/\s+/).every(w=>VACIAS.has(w)))continue;
    pon('no',`No sé qué hacer con «${txt.slice(a,b)}»`);marca(a,b,'no')}
  ctx.notas.forEach(n=>pon('av',n));
  if(!ent.length)pon('no','No encontré cuándo entras: empieza con «Compro cuando…» o «Vendo en corto cuando…»');
  if(ent.length&&!reglas.entrada.length&&!reglas.filtros.length)pon('no','No entendí ninguna condición de entrada');
  if(!reglas.salida.length&&nuevo.gestion.stop.tipo==='ninguno'&&nuevo.gestion.objetivo.tipo==='ninguno'&&!nuevo.gestion.salida_tiempo_velas)pon('no','Falta cuándo sales: «Vendo cuando…», un stop o un objetivo');
  const okE=reglas.entrada.length||reglas.filtros.length;
  if(okE){if(!reglas.entrada.length&&reglas.filtros.length){reglas.entrada.push(reglas.filtros.pop());}nuevo.reglas=reglas;nuevo.optimizar=null;nuevo.nombre='Mi idea'}
  return{spec:okE?nuevo:null,it,marcas}}
function ecoIdea(txt,marcas){const t=String(txt).normalize('NFC');const M=marcas.slice().sort((a,b)=>a[0]-b[0]);let out='',p=0;
  M.forEach(([a,b,c])=>{if(a<p)return;out+=esc(t.slice(p,a))+`<mark class="${c}">${esc(t.slice(a,b))}</mark>`;p=b});return out+esc(t.slice(p))}
function mensaje03(idea){return `Usa el agente reglas (fase 03) con esta idea mía, contada a mi manera:

«${idea.trim()}»

1. Escríbela en PSEUDOCÓDIGO, sin una sola ambigüedad, con los supuestos numerados.
2. Después pásasela al agente validador (fase 04) para que me deje las piezas del MEGA CUEVA TESTER, una por línea:
ACTIVO:
ENTRADA:
SALIDA:
STOP:
HORARIO:
DIRECCIÓN:
OPERACIONES POR DÍA:
COMISIÓN:
DESLIZAMIENTO:
REPARTO: 70/30
En ENTRADA y SALIDA usa solo cierre, apertura, máximo, mínimo, RSI(n), media de n, EMA(n), ATR(n), máximo o mínimo de n velas y números, unidos con «y», con los comparadores >, <, cruza hacia arriba o cruza hacia abajo.`}
function initIdea(){const ta=$('#pi-idea-t'),out=$('#pi-idea-out');try{const g=store.get('idea');if(g)ta.value=g}catch(e){}
  ta.addEventListener('input',()=>store.set('idea',ta.value));
  $('#pi-idea-ej').onclick=()=>{ta.value=EJ_IDEA;store.set('idea',ta.value);ta.focus()};
  const vacia=()=>{if(ta.value.trim().length<8){toast('Escribe primero tu idea (o pulsa «ver un ejemplo»)');ta.focus();return true}return false};
  $('#pi-a03').onclick=()=>{if(vacia())return;const msg=mensaje03(ta.value);out.hidden=false;out.className='idea-out a03';
    out.innerHTML=`<div class="io-h"><b>Mensaje para tu agente 03 Reglas</b><button type="button" class="btn gold" id="pi-a03-cp"><svg class="ic"><use href="#i-copiar"/></svg> COPIAR</button></div>
      <pre class="codigo io-msg" id="pi-a03-msg" tabindex="0">${esc(msg)}</pre>
      <ol class="io-pasos"><li>Cópialo y pégalo en el chat de tu mesa (VS Code).</li><li>Reglas te da el pseudocódigo; Validador, las piezas.</li><li>Pega las piezas del 04 aquí abajo y se rellena el formulario.</li></ol>`;
    $('#pi-a03-cp').onclick=()=>copiarTexto(msg,$('#pi-a03-msg'));$('#pi-pegar').open=true};
  $('#pi-trad').onclick=()=>{if(vacia())return;const r=traducirIdea(ta.value);out.hidden=false;out.className='idea-out trad';
    const nok=r.it.filter(x=>x.e==='ok').length,nno=r.it.filter(x=>x.e==='no').length;
    out.innerHTML=`<div class="io-h"><b>Lo que entendí</b><span class="mono c-dim">${nok} piezas${nno?' · <span class="c-red">'+nno+' sin entender</span>':''}</span></div>
      <p class="io-eco">${ecoIdea(ta.value,r.marcas)}</p>
      <ul class="res">${r.it.map(o=>`<li class="${o.e}"><span>${o.e==='ok'?'✓':o.e==='no'?'✕':'!'}</span><span>${esc(o.t)}</span></li>`).join('')}</ul>
      <p class="csvhelp">${r.spec?'He rellenado el formulario de abajo: revísalo antes de correr.':'No he tocado el formulario: reescribe la idea o rellénalo a mano.'} Para ideas más complejas, pásasela a tu agente 03.</p>`;
    if(r.spec){SPEC=r.spec;piPrev=[];rellenarForm();toast(nok+' piezas al formulario'+(nno?' · '+nno+' sin entender (en rojo)':''))}else toast('No he podido traducir la entrada')}}

/* =====================================================================
   TU IDEA → IA (DeepSeek, desde el navegador con la clave del alumno)
   La clave NUNCA va en el código: la escribe el alumno y vive solo en su localStorage.
   ===================================================================== */
const IA_LOCAL='http://127.0.0.1:8787';let iaLocal=null; /* IA local (herramientas/ia_local.py): si responde, se usa sin clave */
const IA_URL='https://api.deepseek.com/chat/completions',IA_MODELO='deepseek-chat',IA_MAX_MS=30000,IA_KEY='tis5_deepseek_clave';
const iaClave={get(){try{return localStorage.getItem(IA_KEY)||''}catch(e){return ''}},set(v){try{localStorage.setItem(IA_KEY,v)}catch(e){}},borra(){try{localStorage.removeItem(IA_KEY)}catch(e){}}};
const IA_EJ_ORO={spec:{version:1,nombre:'Oro RSI(4) 25/55',activo:{simbolo:'XAUUSD',clase:'metal'},temporalidad:'D1',direccion:'largo',
  reglas:{filtros:[{izq:{tipo:'precio'},op:'>',der:{tipo:'sma',periodo:200}}],entrada:[{izq:{tipo:'rsi',periodo:4},op:'<',der:{tipo:'num',valor:25}}],salida:[{izq:{tipo:'rsi',periodo:4},op:'>',der:{tipo:'num',valor:55}}]},
  ejecucion:{momento:'apertura_siguiente',orden:'mercado'},gestion:{stop:{tipo:'ninguno',valor:null},objetivo:{tipo:'ninguno',valor:null},salida_tiempo_velas:null},
  sizing:{tipo:'pct_capital',valor:100},costes:null,corte:{tipo:'auto'}},
 pseudocodigo:'DATOS: velas diarias de XAUUSD.\nAL CIERRE DE CADA VELA:\n  SI no estoy dentro\n     Y el cierre > media simple de 200 velas\n     Y RSI(4) < 25\n  → COMPRO a la apertura de la vela siguiente, con el 100 % del capital.\n  SI estoy dentro Y RSI(4) > 55\n  → VENDO a la apertura de la vela siguiente.\nSin stop, sin objetivo, sin salida por tiempo. Una posición como máximo.',
 supuestos:['«Media de 200» = media simple (SMA) de 200 velas diarias sobre el cierre.','«Sobre la media» se mira al cierre de la vela, el mismo día que el RSI.','Las órdenes se ejecutan a la apertura del día siguiente.','Tamaño: 100 % del capital, sin apalancamiento extra.'],
 no_soportado:[]};
const IA_EJ_RSI2={spec:{version:1,nombre:'RSI(2) Nasdaq',activo:{simbolo:'NDX',clase:'indice'},temporalidad:'D1',direccion:'largo',
  reglas:{filtros:[{izq:{tipo:'precio'},op:'>',der:{tipo:'sma',periodo:200}}],entrada:[{izq:{tipo:'rsi',periodo:2},op:'<',der:{tipo:'num',valor:15}}],
    salida:[{izq:{tipo:'precio'},op:'>',der:{tipo:'apertura'}},{izq:{tipo:'precio',desfase:1},op:'>',der:{tipo:'apertura',desfase:1}}],salida_modo:'todas'},
  ejecucion:{momento:'apertura_siguiente',orden:'mercado'},gestion:{stop:{tipo:'ninguno',valor:null},objetivo:{tipo:'ninguno',valor:null},salida_tiempo_velas:null},
  sizing:{tipo:'pct_capital',valor:100},costes:null,corte:{tipo:'auto'}},
 pseudocodigo:'DATOS: velas diarias del Nasdaq 100 (NDX).\nAL CIERRE DE CADA VELA:\n  SI no estoy dentro\n     Y el cierre > media simple de 200 velas\n     Y RSI(2) < 15\n  → COMPRO a la apertura de la vela siguiente.\n  SI estoy dentro\n     Y la vela de hoy es verde (cierre > apertura)\n     Y la de ayer también fue verde\n  → VENDO a la apertura de la vela siguiente.',
 supuestos:['«Vela verde» = cierre > apertura de esa vela (no cierre > cierre anterior).','«2 seguidas» = la vela de la señal y la anterior.','Tamaño: 100 % del capital.'],
 no_soportado:[]};
const IA_EJ_MEDIAS={spec:{version:1,nombre:'Cruce EMA 20/50',activo:{simbolo:'EURUSD',clase:'forex'},temporalidad:'H4',direccion:'ambos',
  reglas:{filtros:[],entrada:[{izq:{tipo:'ema',periodo:20},op:'cruza_arriba',der:{tipo:'ema',periodo:50}}],salida:[{izq:{tipo:'ema',periodo:20},op:'cruza_abajo',der:{tipo:'ema',periodo:50}}]},
  ejecucion:{momento:'apertura_siguiente',orden:'mercado'},gestion:{stop:{tipo:'atr',valor:2},objetivo:{tipo:'ninguno',valor:null},salida_tiempo_velas:null},
  sizing:{tipo:'riesgo_pct',valor:1},costes:null,corte:{tipo:'auto'}},
 pseudocodigo:'DATOS: velas de 4 horas de EURUSD.\nAL CIERRE DE CADA VELA:\n  SI no estoy dentro Y la EMA(20) cruza hacia arriba la EMA(50)\n  → COMPRO a la apertura de la vela siguiente. STOP = 2 × ATR(14) por debajo de la entrada.\n  SI no estoy dentro Y la EMA(20) cruza hacia abajo la EMA(50)\n  → VENDO EN CORTO (condiciones espejo). STOP = 2 × ATR(14) por encima.\n  SI estoy comprado Y la EMA(20) cruza hacia abajo la EMA(50) → CIERRO (y el espejo para el corto).\n  SI toca el STOP → CIERRO.\nTamaño: arriesgo el 1 % del capital hasta el stop.',
 supuestos:['«Medias» = medias exponenciales (EMA), porque el trader dijo «exponencial».','El ATR del stop es de 14 velas (el tester usa ese periodo).','«Me doy la vuelta» = opera en las dos direcciones; el corto usa las condiciones espejo.'],
 no_soportado:['«Solo si el volumen es alto»: el tester no usa el volumen; se omite y la regla se prueba sin ese filtro.']};
const IA_EJ_NAS=NAS?{spec:(()=>{const x=clone(NAS);delete x.datos;delete x.optimizar;x.costes=null;return x})(),
 pseudocodigo:'DATOS: velas de 15 minutos de NAS100, en hora de Nueva York. SESIÓN = 09:30–16:00; vela 1 = la de 09:30.\nNIVEL = el máximo de la sesión anterior.\nCADA SESIÓN:\n  1. RUPTURA: en las 2 primeras velas de la sesión\n     SI el máximo de la vela > NIVEL\n  2. RETESTEO: en las 8 velas siguientes a la RUPTURA\n     SI el mínimo <= NIVEL Y el cierre > NIVEL\n  → COMPRO al cierre de la vela de RETESTEO. STOP = el mínimo de esa vela.\n  SI estoy dentro, en cada vela y en este orden:\n     a. toca el STOP → SALGO en el stop\n     b. el cierre < NIVEL → SALGO al cierre de esa vela\n     c. es la última vela de la sesión → SALGO a su cierre\n  Como máximo, 1 operación al día. Si una ventana caduca, ese día no se opera.',
 supuestos:['«Sesión anterior» = 09:30–16:00 de Nueva York del día hábil anterior, sin horario extendido.','«Rompe» = el máximo de la vela supera NIVEL (basta la mecha).','Las 8 velas del retesteo se cuentan desde la vela siguiente a la de ruptura.','«Pierde el nivel» = una vela cierra por debajo de NIVEL.','Si en la misma vela se toca el STOP y cierra bajo NIVEL, manda el STOP.','Tamaño: 100 % del capital.'],
 no_soportado:[]}:null;
const IA_SISTEMA=`Eres el traductor de reglas del MEGA CUEVA TESTER de Trade It Simple. Un alumno te cuenta una idea de trading en español, a su manera. Tu trabajo es convertirla, SIN AMBIGÜEDAD, en lo que entiende el tester. Respondes SOLO con un objeto JSON (sin texto fuera del JSON, sin markdown) con estas 4 claves:

{"spec": {…}, "pseudocodigo": "…", "supuestos": ["…"], "no_soportado": ["…"]}

(a) "spec": la especificación versión 1 del tester. Esquema EXACTO (no inventes claves ni valores fuera de las listas):
{
  "version": 1,
  "nombre": "nombre corto de la estrategia",
  "activo": {"simbolo": "XAUUSD|XAGUSD|NAS100|US500|US30|GER40|EURUSD|GBPUSD|USDJPY|BTCUSD|ETHUSD|XTIUSD|otro ticker en mayúsculas", "clase": "metal|indice|forex|accion_etf|cripto|energia"},
  "temporalidad": "M5|M15|H1|H4|D1|W1",
  "direccion": "largo|corto|ambos",
  "sesion": null, o SOLO con M5/M15/H1/H4: {"zona_horaria": "America/New_York|Europe/London|Europe/Madrid|Europe/Berlin|Asia/Tokyo|UTC", "inicio": "HH:MM", "fin": "HH:MM", "cerrar_al_final": true|false, "max_operaciones_dia": entero o null},
  "niveles": [{"nombre": "NIVEL", "valor": operando}],
  "reglas": {
    "filtros": [condición, …],
    "pasos": [{"nombre": "RUPTURA", "condiciones": [condición, …], "ventana": null o {"tipo": "primeras_velas_sesion|velas_tras_anterior", "velas": entero ≥ 1}}],
    "entrada": [condición, …],
    "salida":  [condición, …],
    "salida_modo": "cualquiera|todas"
  },
  "ejecucion": {"momento": "apertura_siguiente|cierre_misma_vela", "orden": "mercado"},
  "gestion": {"stop": {"tipo": "ninguno|pct|atr", "valor": número o null} o {"tipo": "nivel", "valor": operando},
              "objetivo": {"tipo": "ninguno|pct|atr", "valor": número o null},
              "salida_tiempo_velas": número entero o null},
  "sizing": {"tipo": "pct_capital|riesgo_pct", "valor": número},
  "costes": null, o {"perfil": "manual", "spread_pb": n, "comision_pb_lado": n, "deslizamiento_pb_lado": n, "swap_largo_pct_anual": n, "swap_corto_pct_anual": n} SOLO si el alumno dio sus costes,
  "corte": {"tipo": "auto"}  o {"tipo": "pct", "is_pct": 50-90}  o {"tipo": "fecha", "fecha": "AAAA-MM-DD"}
}
Una condición es {"izq": operando, "op": comparador, "der": operando}.
Operandos:
- {"tipo": "precio"} (cierre) · {"tipo": "apertura"} · {"tipo": "maximo"} · {"tipo": "minimo"} de la vela actual.
- {"tipo": "sma"|"ema"|"rsi"|"atr"|"max_n"|"min_n", "periodo": entero>0}. "max_n"/"min_n" = máximo/mínimo de las N velas ANTERIORES (sin la actual): sirven para rupturas.
- {"tipo": "num", "valor": número}. "num" nunca va a la izquierda.
- "desfase": entero ≥ 0, opcional en cualquier operando salvo "num", "nivel" y los de sesión = el valor de hace N velas (0 o ausente = la vela actual). Ej.: {"tipo": "precio", "desfase": 1} = cierre de la vela anterior.
- «Vela/barra verde» = cierre > apertura de ESA vela: {"izq": {"tipo": "precio", "desfase": d}, "op": ">", "der": {"tipo": "apertura", "desfase": d}}. «N velas verdes consecutivas» = N condiciones con d = 0…N−1. «N cierres alcistas seguidos» = cierre(d) > cierre(d+1). Si el alumno no aclara cuál, usa «vela verde» y dilo en supuestos.
- De sesión (exigen "sesion"): "sesion_anterior_max|sesion_anterior_min|sesion_anterior_apertura|sesion_anterior_cierre" (la sesión anterior con datos), "sesion_max|sesion_min" (de la sesión actual hasta la vela actual incluida), "sesion_apertura", "vela_sesion_max|vela_sesion_min|vela_sesion_apertura|vela_sesion_cierre" con "k": entero ≥ 1 (la vela k de la sesión; 1 = la primera), "vela_sesion" (nº de la vela actual dentro de la sesión; compárala con "num").
- {"tipo": "nivel", "nombre": "NIVEL"}: un precio con nombre definido en "niveles".
Comparador: ">", "<", ">=", "<=", "cruza_arriba", "cruza_abajo".
Cómo funciona el tester (no puede hacer nada más):
- Todo se evalúa al cierre de cada vela. "apertura_siguiente" = la orden va a mercado en la apertura de la vela siguiente; "cierre_misma_vela" = al cierre de la vela de la señal (úsalo si el alumno dice «compro al cierre de esa vela»). Una sola posición a la vez.
- Sesión: solo cuentan las velas dentro de [inicio, fin) en esa zona (con cambio de hora). Vela 1 = la que empieza a la hora de inicio. "cerrar_al_final": true = sale al cierre de la última vela de la sesión. "max_operaciones_dia" = como mucho N operaciones por sesión.
- Pasos: una secuencia que se cumple EN ORDEN (RUPTURA → RETESTEO…). Cada paso = TODAS sus condiciones en una misma vela, dentro de su ventana: "primeras_velas_sesion" (en las N primeras velas de la sesión) o "velas_tras_anterior" (en las N velas siguientes a la del paso anterior); null = cuando ocurra. Si una ventana caduca, ese día no se opera. La entrada es la vela que completa el último paso (y "entrada", si tiene condiciones, también debe cumplirse en esa vela). Con pasos, "entrada" puede ser [].
- Sin pasos: entrar = TODOS los filtros Y TODAS las condiciones de entrada. Si solo hay una condición, va en "entrada".
- Salir, en cada vela y en este orden: 1) stop/objetivo tocados dentro de la vela (si los dos, el stop); 2) las condiciones de salida, al cierre: con "salida_modo": "cualquiera" basta UNA; con "todas" deben cumplirse TODAS en la misma vela (úsalo para «2 velas verdes seguidas»); 3) salida por tiempo (en velas); 4) fin de sesión si "cerrar_al_final".
- Stop/objetivo: % sobre el precio de entrada, múltiplos de ATR(14), o stop "nivel" = el precio de ese operando EN LA VELA DE LA SEÑAL (p. ej. {"tipo":"minimo"} = mínimo de la vela de entrada).
- "ambos" = también opera en corto con las condiciones espejo (el máximo de ayer pasa a ser el mínimo de ayer…); "corto" = solo ventas en corto con las condiciones tal cual.
- "pct_capital" = % del capital en cada operación (100 si no dice nada); "riesgo_pct" = % del capital arriesgado hasta el stop (exige stop).
- NO puede: filtrar por día de la semana o por fecha; usar varias temporalidades a la vez; volumen; velas japonesas con nombre o patrones gráficos; soportes o líneas dibujadas a mano; noticias; órdenes limitadas o stop de entrada; varias posiciones a la vez o piramidar; trailing stop o break-even; reintentar una secuencia el mismo día si su ventana caduca; sesiones que crucen la medianoche; otros indicadores (MACD, Bollinger, estocástico, VWAP…).
(b) "pseudocodigo": la regla en español, paso a paso, en MAYÚSCULAS las acciones (COMPRO, VENDO, SALGO, SI, Y), sin ninguna ambigüedad, tal como la va a ejecutar el tester con la spec que das (incluye el orden de las salidas). Saltos de línea con \\n.
(c) "supuestos": cada cosa que el alumno NO dijo y has tenido que decidir tú (periodos, tipo de media, unidad del stop, temporalidad, zona horaria, cómo se cuentan las velas de una ventana, dirección, tamaño, ejecución…). Una frase cada uno. Si no dijo la temporalidad, usa D1 y dilo. Si no dijo el activo, usa XAUUSD y dilo.
(d) "no_soportado": cada pieza de la idea que el tester NO puede expresar, con qué hace en su lugar (la omite o la aproxima). Si aproximas algo, debe aparecer aquí Y en supuestos. Nunca aproximes en silencio. Lista vacía si todo cabe.
Cifras ambiguas: si un número no encaja (p. ej. «el RSI de 2 está debajo de 2 periodos»: el 2 es el periodo y falta el umbral), NO lo uses como umbral; pon el valor clásico (RSI(2): 15) y escríbelo en supuestos pidiendo que lo confirme.
«Salir a las 2 barras verdes» NO es una salida por tiempo: son condiciones de velas verdes. "salida_tiempo_velas" solo cuando dice «a las N velas/días» sin más.
PROHIBIDO: inventar resultados, cifras de rendimiento, porcentajes de acierto, beneficios, drawdowns, opiniones sobre si la idea funciona o cualquier dato de mercado. Tú solo traduces; los números los calcula el tester con datos reales. No inventes costes: "costes": null salvo que el alumno los dé.

EJEMPLO 1. Idea: «compro oro cuando el RSI de 4 días baja de 25 y el precio está sobre la media de 200; vendo cuando el RSI pasa de 55»
${JSON.stringify(IA_EJ_ORO)}

EJEMPLO 1b. Idea: «compro el Nasdaq en diario cuando el RSI de 2 baja de 15 y está sobre la media de 200; salgo tras 2 velas verdes seguidas»
${JSON.stringify(IA_EJ_RSI2)}

EJEMPLO 2. Idea: «en el euro-dólar en 4 horas, compro cuando la media exponencial de 20 cruza hacia arriba la de 50 y me doy la vuelta cuando cruza hacia abajo; stop de 2 ATR, arriesgo un 1 %, solo si el volumen es alto»
${JSON.stringify(IA_EJ_MEDIAS)}`+(IA_EJ_NAS?`

EJEMPLO 3. Idea: «Nasdaq en velas de 15 minutos. Si en las 2 primeras velas tras abrir Nueva York (9:30) supera el máximo de la sesión de ayer y en las 8 velas siguientes vuelve a tocar ese nivel y cierra por encima, compro al cierre de esa vela con el stop en su mínimo. Salgo si cierra por debajo del nivel o al cierre de la sesión (16:00). Una operación al día.»
${JSON.stringify(IA_EJ_NAS)}`:'');
const IA_TIPOS=IND.map(x=>x[0]),IA_OPS=CMP.map(x=>x[0]),IA_TF=Object.keys(TFN),IA_CLASES=['metal','indice','forex','accion_etf','cripto','energia'];
function iaParse(txt){let t=String(txt||'').replace(/<\|[^|>]{0,40}\|>/g,'').trim();const f=t.match(/```(?:json)?\s*([\s\S]*?)```/);if(f)t=f[1].trim();
  const a=t.indexOf('{'),b=t.lastIndexOf('}');if(a<0||b<a)throw new Error('la respuesta no trae JSON');return JSON.parse(t.slice(a,b+1))}
function iaCheckOp(o,donde,err,izq,nom){if(!o||typeof o!=='object'){err.push(donde+': falta el operando');return}
  if(!IA_TIPOS.includes(o.tipo)){err.push(donde+': tipo «'+o.tipo+'» no existe');return}
  if(izq&&o.tipo==='num')err.push(donde+': un número no puede ir a la izquierda');
  if(o.desfase!=null&&!(Number.isInteger(+o.desfase)&&+o.desfase>=0))err.push(donde+': «desfase» debe ser un entero ≥ 0');
  else if(!opValido(o,nom||[]))err.push(donde+': '+(o.tipo==='num'?'falta «valor» numérico':o.tipo==='nivel'?'el nivel «'+o.nombre+'» no está en «niveles»':o.tipo.startsWith('vela_sesion_')?'falta «k» entero ≥ 1':'falta «periodo» entero > 0'))}
function iaValidar(r){const err=[];if(!r||typeof r!=='object')return['no es un objeto'];const s=r.spec;
  if(!s||typeof s!=='object')return['falta «spec»'];
  if(s.version!==1)err.push('spec.version debe ser 1');
  if(!s.activo||typeof s.activo.simbolo!=='string'||!s.activo.simbolo.trim())err.push('falta spec.activo.simbolo');
  if(s.activo&&!IA_CLASES.includes(s.activo.clase))err.push('spec.activo.clase no válida');
  if(!IA_TF.includes(s.temporalidad))err.push('spec.temporalidad no válida');
  if(!['largo','corto','ambos'].includes(s.direccion))err.push('spec.direccion no válida');
  if(s.niveles!=null&&!Array.isArray(s.niveles))err.push('spec.niveles debe ser una lista');
  const NV=Array.isArray(s.niveles)?s.niveles:[],nom=NV.map(n=>n&&n.nombre).filter(Boolean);
  NV.forEach((n,i)=>{if(!n||typeof n.nombre!=='string'||!n.nombre.trim())err.push('niveles['+i+'] sin nombre');else iaCheckOp(n.valor,'niveles['+i+'].valor',err,true,nom)});
  const cond=(c,d)=>{if(!c||typeof c!=='object'){err.push(d+' vacía');return}iaCheckOp(c.izq,d+'.izq',err,true,nom);iaCheckOp(c.der,d+'.der',err,false,nom);if(!IA_OPS.includes(c.op))err.push(d+'.op «'+c.op+'» no válido')};
  const R=s.reglas;if(!R||typeof R!=='object')err.push('falta spec.reglas');
  else{['filtros','entrada','salida'].forEach(g=>{if(!Array.isArray(R[g])){err.push('spec.reglas.'+g+' debe ser una lista');return}R[g].forEach((c,i)=>cond(c,g+'['+i+']'))});
    if(R.pasos!=null&&!Array.isArray(R.pasos))err.push('spec.reglas.pasos debe ser una lista');
    (Array.isArray(R.pasos)?R.pasos:[]).forEach((pz,i)=>{const d='pasos['+i+']';if(!pz||typeof pz!=='object'){err.push(d+' vacío');return}
      if(!Array.isArray(pz.condiciones)||!pz.condiciones.length)err.push(d+'.condiciones no puede estar vacía');else pz.condiciones.forEach((c,j)=>cond(c,d+'.condiciones['+j+']'));
      const v=pz.ventana;if(v!=null&&(!['primeras_velas_sesion','velas_tras_anterior'].includes(v.tipo)||!(Number.isInteger(+v.velas)&&+v.velas>=1)))err.push(d+'.ventana no válida')})}
  const nPasos=R&&Array.isArray(R.pasos)?R.pasos.length:0;if(R&&R.salida_modo!=null&&!['cualquiera','todas'].includes(R.salida_modo))err.push('reglas.salida_modo debe ser cualquiera o todas');
  if(R&&Array.isArray(R.entrada)&&!R.entrada.length&&!nPasos)err.push('spec.reglas.entrada no puede estar vacía (sin pasos)');
  const S=s.sesion;if(S!=null){if(typeof S!=='object')err.push('spec.sesion debe ser un objeto o null');else{
    if(!INTRADIA(s.temporalidad))err.push('spec.sesion solo con M5, M15, H1 o H4');
    ['inicio','fin'].forEach(k=>{if(!/^\d{1,2}:\d{2}$/.test(String(S[k]||'')))err.push('sesion.'+k+' debe ser HH:MM')});if(typeof S.zona_horaria!=='string')err.push('falta sesion.zona_horaria')}}
  if(usaSesion(s)&&!S)err.push('usas operandos de sesión: rellena spec.sesion');
  if(s.ejecucion&&s.ejecucion.momento&&!['apertura_siguiente','cierre_misma_vela'].includes(s.ejecucion.momento))err.push('ejecucion.momento no válido');
  const G=s.gestion||{};['stop','objetivo'].forEach(k=>{const x=G[k];if(!x)return;const tipos=k==='stop'?['ninguno','pct','atr','nivel']:['ninguno','pct','atr'];if(!tipos.includes(x.tipo)){err.push('gestion.'+k+'.tipo no válido');return}
    if(x.tipo==='nivel')iaCheckOp(x.valor,'gestion.stop.valor',err,true,nom);else if(x.tipo&&x.tipo!=='ninguno'&&!(+x.valor>0))err.push('gestion.'+k+'.valor debe ser > 0')});
  const sinSalida=R&&Array.isArray(R.salida)&&!R.salida.length&&(!G.stop||G.stop.tipo==='ninguno')&&(!G.objetivo||G.objetivo.tipo==='ninguno')&&!G.salida_tiempo_velas&&!(S&&S.cerrar_al_final);
  if(sinSalida)err.push('no hay forma de salir: añade salida, stop, objetivo o salida_tiempo_velas');
  if(typeof r.pseudocodigo!=='string'||r.pseudocodigo.trim().length<10)err.push('falta «pseudocodigo»');
  if(!Array.isArray(r.supuestos))err.push('«supuestos» debe ser una lista');
  if(!Array.isArray(r.no_soportado))err.push('«no_soportado» debe ser una lista');
  return err}
/* spec de la IA → spec completa del formulario (datos, ejecución y costes de Darwinex los pone el tester, no la IA) */
function iaASpec(s,extra){const n=clone(SPEC);const num=v=>v==null||v===''||!Number.isFinite(+v)?null:+v;
  n.version=1;n.nombre=String(s.nombre||'Mi idea').slice(0,60);n.activo={simbolo:String(s.activo.simbolo).toUpperCase().replace(/[^A-Z0-9._]/g,'').slice(0,16),clase:s.activo.clase};
  n.temporalidad=s.temporalidad;n.direccion=s.direccion;
  const NOMB=x=>String(x||'').toUpperCase().replace(/[^A-Z0-9_ÁÉÍÓÚÑ]/g,'').slice(0,20);
  const op0=o=>{const t=IND.find(x=>x[0]===o.tipo);return t[2]===1?{tipo:o.tipo,periodo:Math.round(+o.periodo)}:t[2]===2?{tipo:'num',valor:+o.valor}:t[2]===3?{tipo:o.tipo,k:Math.round(+o.k)}:t[2]===4?{tipo:'nivel',nombre:NOMB(o.nombre)}:{tipo:o.tipo}};
  const op=o=>{const r=op0(o);if(+o.desfase>0&&DESF_OK(r))r.desfase=Math.round(+o.desfase);return r};
  const cc=c=>({izq:op(c.izq),op:c.op,der:op(c.der)});
  n.reglas={};['filtros','entrada','salida'].forEach(g=>n.reglas[g]=s.reglas[g].map(cc));
  n.reglas.salida_modo=s.reglas.salida_modo==='todas'?'todas':'cualquiera';
  n.reglas.pasos=(Array.isArray(s.reglas.pasos)?s.reglas.pasos:[]).map((pz,i)=>({nombre:String(pz.nombre||'PASO '+(i+1)).toUpperCase().slice(0,24),condiciones:pz.condiciones.map(cc),ventana:pz.ventana&&pz.ventana.tipo?{tipo:pz.ventana.tipo,velas:Math.round(+pz.ventana.velas)}:null}));
  n.niveles=(Array.isArray(s.niveles)?s.niveles:[]).map(x=>({nombre:NOMB(x.nombre),valor:op(x.valor)}));
  const hh=v=>{const m=String(v||'').match(/^(\d{1,2}):(\d{2})/);return m?m[1].padStart(2,'0')+':'+m[2]:null};
  const S=s.sesion;if(S&&typeof S==='object'&&INTRADIA(n.temporalidad)){n.sesion={zona_horaria:ZSES[S.zona_horaria]?S.zona_horaria:'America/New_York',inicio:hh(S.inicio)||'09:30',fin:hh(S.fin)||'16:00',cerrar_al_final:!!S.cerrar_al_final,max_operaciones_dia:num(S.max_operaciones_dia)?Math.round(+S.max_operaciones_dia):null};n.sesion_on=true;
    if(!ZSES[S.zona_horaria])extra.push('Zona de la sesión «'+S.zona_horaria+'» no está en la lista: uso Nueva York.')}else n.sesion_on=false;
  n.ejecucion={momento:s.ejecucion&&s.ejecucion.momento==='cierre_misma_vela'?'cierre_misma_vela':'apertura_siguiente',orden:'mercado'};
  const G=s.gestion||{},gs=x=>x&&x.tipo==='nivel'&&x.valor&&typeof x.valor==='object'?{tipo:'nivel',valor:op(x.valor)}:x&&x.tipo&&x.tipo!=='ninguno'&&x.tipo!=='nivel'?{tipo:x.tipo,valor:num(x.valor)}:{tipo:'ninguno',valor:null};
  n.gestion={stop:gs(G.stop),objetivo:gs(G.objetivo),salida_tiempo_velas:num(G.salida_tiempo_velas)?Math.round(+G.salida_tiempo_velas):null};
  const Z=s.sizing||{};n.sizing=Z.tipo==='riesgo_pct'&&num(Z.valor)&&n.gestion.stop.tipo!=='ninguno'?{tipo:'riesgo_pct',valor:+Z.valor}:{tipo:'pct_capital',valor:num(Z.valor)&&Z.tipo==='pct_capital'?+Z.valor:100};
  if(Z.tipo==='riesgo_pct'&&n.sizing.tipo!=='riesgo_pct')extra.push('Tamaño por riesgo sin stop: el tester usa el 100 % del capital.');
  const C=s.costes;
  if(C&&typeof C==='object'&&['spread_pb','comision_pb_lado','deslizamiento_pb_lado'].some(k=>num(C[k])!=null)){n.costes={perfil:'manual'};['spread_pb','comision_pb_lado','deslizamiento_pb_lado','swap_largo_pct_anual','swap_corto_pct_anual'].forEach(k=>n.costes[k]=num(C[k])??0)}
  else if(PERFILES[n.activo.simbolo])n.costes=Object.assign({perfil:'darwinex_mt5'},clone(PERFILES[n.activo.simbolo].costes));
  else extra.push('Costes: no los dijiste. El formulario mantiene los que ya tenía; revísalos para '+n.activo.simbolo+'.');
  const K=s.corte||{};n.corte=K.tipo==='pct'&&num(K.is_pct)?{tipo:'pct',fecha:SPEC.corte.fecha||DEMO_SPEC.corte.fecha,is_pct:Math.min(90,Math.max(50,+K.is_pct))}:
    K.tipo==='fecha'&&/^\d{4}-\d{2}-\d{2}$/.test(K.fecha||'')?{tipo:'fecha',fecha:K.fecha,is_pct:70}:{tipo:'auto',fecha:DEMO_SPEC.corte.fecha,is_pct:70};
  n.optimizar=null;
  if(CSV&&CSV.nombre==='NAS100_M15_ejemplo.csv'&&(n.activo.simbolo!=='NAS100'||n.temporalidad!=='M15'))extra.push('Tienes cargado el ejemplo NAS100 en 15 min: sube el CSV de '+n.activo.simbolo+' en '+n.temporalidad+' antes de correr.');
  if(!CSV&&(n.activo.simbolo!=='XAUUSD'||n.temporalidad!=='D1'))extra.push('Los datos de ejemplo son del oro en diario: sube el CSV de '+n.activo.simbolo+' en '+n.temporalidad+' antes de correr.');
  return n}
async function iaLlamar(clave,msgs){const ac=new AbortController(),loc=!clave&&iaLocal,to=setTimeout(()=>ac.abort(),loc&&iaLocal.motor==='claude'?180000:IA_MAX_MS);let r;
  const H={'Content-Type':'application/json'};if(!loc)H.Authorization='Bearer '+clave;
  try{r=await fetch(loc?IA_LOCAL+'/v1/chat/completions':IA_URL,{method:'POST',signal:ac.signal,headers:H,
      body:JSON.stringify({model:IA_MODELO,messages:msgs,response_format:{type:'json_object'},temperature:0.1,max_tokens:2500,stream:false})})}
  catch(e){clearTimeout(to);throw new Error(e&&e.name==='AbortError'?'La IA tardó más de 30 segundos. Vuelve a intentarlo o usa las otras dos opciones.':'No hay conexión con DeepSeek. Revisa tu internet (o un bloqueador) y vuelve a intentarlo.')}
  let j=null;try{j=await r.json()}catch(e){}clearTimeout(to);
  if(!r.ok){const M={400:'DeepSeek no aceptó la petición (400).',401:'La clave no es válida (401). Cópiala otra vez desde platform.deepseek.com/api_keys.',402:'Tu cuenta de DeepSeek no tiene saldo (402). Recarga unos céntimos en platform.deepseek.com.',
      422:'DeepSeek no aceptó los parámetros (422).',429:'Demasiadas peticiones seguidas (429). Espera unos segundos y vuelve a intentarlo.'};
    throw new Error(M[r.status]||(r.status>=500?'DeepSeek está saturado o caído ('+r.status+'). Prueba en un minuto.':'Error de DeepSeek ('+r.status+').'))}
  const c=j&&j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content;
  return{txt:c||'',uso:(j&&j.usage)||{}}}
const IA_PRECIO={entrada:0.28/1e6,salida:0.42/1e6}; /* USD por token, tarifa pública de deepseek-chat (aprox.) */
async function iaTraducir(idea,clave){const t0=performance.now();const msgs=[{role:'system',content:IA_SISTEMA},{role:'user',content:'Idea del alumno:\n«'+idea.trim()+'»'}];
  const uso={prompt_tokens:0,completion_tokens:0};let ult=null;
  for(let intento=1;intento<=2;intento++){const{txt,uso:u}=await iaLlamar(clave,msgs);uso.prompt_tokens+=u.prompt_tokens||0;uso.completion_tokens+=u.completion_tokens||0;
    let r=null,err;try{r=iaParse(txt);err=iaValidar(r)}catch(e){err=['JSON no válido: '+e.message]}
    if(!err.length){const seg=(performance.now()-t0)/1000,usd=uso.prompt_tokens*IA_PRECIO.entrada+uso.completion_tokens*IA_PRECIO.salida;return{r,seg,usd,uso,intentos:intento}}
    ult=err;msgs.push({role:'assistant',content:String(txt).slice(0,6000)},{role:'user',content:'Tu respuesta no cumple el esquema: '+err.slice(0,8).join('; ')+'. Devuelve SOLO el objeto JSON corregido, con las 4 claves.'})}
  throw new Error('La IA respondió dos veces con un formato que el tester no entiende ('+ult.slice(0,3).join('; ')+'). Prueba a escribir la idea más concreta, o usa las otras dos opciones.')}
function iaAlternativas(out){$$('[data-ia-alt]',out).forEach(b=>b.onclick=()=>$('#'+b.dataset.iaAlt).click())}
function iaSinClave(out){out.hidden=false;out.className='idea-out ia';
  out.innerHTML=`<div class="io-h"><b>Falta tu clave de DeepSeek</b></div>
    <ol class="io-pasos"><li>Entra en <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener">platform.deepseek.com/api_keys</a>, crea una cuenta y una clave, y recarga 2 USD: cada traducción cuesta céntimos.</li>
    <li>Pégala en «Tu clave de DeepSeek», justo encima. Se guarda solo en este navegador.</li><li>Vuelve a pulsar «Traducir con IA».</li></ol>
    <p class="csvhelp" style="margin:0">Sin clave también puedes <button type="button" class="link" data-ia-alt="pi-a03">pasársela a tu agente 03 Reglas</button> o <button type="button" class="link" data-ia-alt="pi-trad">traducirla aquí sin IA</button>.</p>`;
  iaAlternativas(out);$('#pi-ia-k').focus()}
function iaPintar(out,res,extra){const r=res.r,sup=[...(r.supuestos||[]).map(String),...extra],no=(r.no_soportado||[]).map(String);
  out.className='idea-out ia';
  out.innerHTML=`<div class="io-h"><b>La IA ha traducido tu idea</b><span class="mono c-dim">${nf(res.seg,1)} s · ≈ ${nf(res.usd*100,2)} céntimos de USD${res.intentos>1?' · 2 intentos':''}</span></div>
    <p class="ia-sec">Pseudocódigo</p><pre class="codigo ia-pseudo" tabindex="0">${esc(r.pseudocodigo)}</pre>
    <p class="ia-sec">Supuestos que ha hecho · confírmalos (${sup.length})</p>
    ${sup.length?`<ul class="ia-sup" id="pi-ia-sup">${sup.map((t,i)=>`<li><input type="checkbox" id="ia-s${i}" aria-label="Confirmo este supuesto"><label for="ia-s${i}">${esc(t)}</label></li>`).join('')}</ul>`:'<p class="ia-pie">Ninguno: todo lo dijiste tú.</p>'}
    <p class="ia-sec">Lo que el tester NO puede expresar (${no.length})</p>
    ${no.length?`<ul class="ia-no">${no.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>`:'<p class="ia-pie">Nada: la idea cabe entera en el tester.</p>'}
    <p class="csvhelp" style="margin:0">He rellenado el formulario de abajo. Confirma los supuestos en ámbar antes de correr la prueba: la IA traduce, no calcula resultados.</p>`;
  const L=$('#pi-ia-sup',out);if(L)L.addEventListener('change',e=>{const li=e.target.closest('li');if(li)li.classList.toggle('ok',e.target.checked);
    if($$('input',L).every(x=>x.checked))toast('Supuestos confirmados')})}
async function iaDetectarLocal(){try{const ac=new AbortController(),t=setTimeout(()=>ac.abort(),900);const r=await fetch(IA_LOCAL+'/estado',{signal:ac.signal});clearTimeout(t);if(r.ok){const j=await r.json();iaLocal=j&&j.ok?j:null}}catch(e){iaLocal=null}return iaLocal}
function initIA(){const k=$('#pi-ia-k'),est=$('#pi-ia-k-est'),btn=$('#pi-ia'),ta=$('#pi-idea-t'),out=$('#pi-idea-out');let ocupado=false;
  const pinta=()=>{const v=iaClave.get();est.textContent=v?'Clave guardada.':(iaLocal?'IA local conectada ('+(iaLocal.motor==='claude'?'Claude Code':'DeepSeek')+'): no hace falta clave.':'');$('#pi-ia-borrar').hidden=!v};
  window.MCT_IA_PINTA=pinta;iaDetectarLocal().then(pinta);
  k.value=iaClave.get();pinta();
  k.addEventListener('input',()=>{const v=k.value.trim();if(v)iaClave.set(v);else iaClave.borra();pinta()});
  $('#pi-ia-borrar').onclick=()=>{iaClave.borra();k.value='';pinta();toast('Clave borrada de este navegador')};
  btn.onclick=async()=>{if(ocupado)return;const idea=ta.value.trim();if(idea.length<8){toast('Escribe primero tu idea (o pulsa «ver un ejemplo»)');ta.focus();return}
    const clave=iaClave.get();if(!clave&&!iaLocal)await iaDetectarLocal();if(!clave&&!iaLocal){iaSinClave(out);return}
    ocupado=true;btn.disabled=true;out.hidden=false;out.className='idea-out ia';
    out.innerHTML='<div class="ia-carga" role="status" aria-live="polite"><span class="ia-spin" aria-hidden="true"></span>La IA está leyendo tu idea…</div>';
    try{const res=await iaTraducir(idea,clave);const extra=[];const n=iaASpec(res.r.spec,extra);
      SPEC=n;piPrev=[];rellenarForm();iaPintar(out,res,extra);window.MCT_IA_ULTIMA={seg:res.seg,usd:res.usd,uso:res.uso,intentos:res.intentos,r:res.r,extra};
      toast('Formulario rellenado por la IA · confirma los supuestos')}
    catch(e){out.innerHTML=`<p class="ia-err" role="alert"><b>No se pudo traducir con IA.</b> ${esc(e.message)}</p>
      <p class="csvhelp" style="margin:0">Mientras tanto, <button type="button" class="link" data-ia-alt="pi-a03">pásasela a tu agente 03 Reglas</button> o <button type="button" class="link" data-ia-alt="pi-trad">tradúcela aquí sin IA</button>.</p>`;
      iaAlternativas(out);window.MCT_IA_ULTIMA={error:e.message}}
    finally{ocupado=false;btn.disabled=false}}}

/* ---------- arranque ---------- */
function init(){
  if(!ES_DEMO){$('#ctx-chip').hidden=true;$('#ctx-tuya').hidden=false;$('#b-demo').hidden=false;$('#b-demo').onclick=()=>{try{sessionStorage.removeItem('mct_res');sessionStorage.removeItem('mct_spec_res')}catch(e){}location.reload()}}
  fitNombre();$('#ctx-sub').textContent=(SIMB?SIMB+' · ':'')+yr(D.desde)+'–'+yr(D.hasta)+' · '+T.length+' op.';pintarHchips();
  $('#foot-dat').textContent=(SIMB||'Tus datos')+' '+fd(D.desde)+' → '+fd(D.hasta);
  fillResumen();fillEstrategia();fillBacktest();renderTable();renderDetail();
  const cm=chart('cv-eqmini',drawEq);cm.compact=true;chart('cv-eq',drawEq);chart('cv-anual',drawAnual);const cp=chart('cv-price',drawVelas);cp.src=priceSrc;chart('cv-bars',drawBars);chart('cv-mfe',drawMFE);chart('cv-stat',drawStat);
  fillVal();renderTree();wireTerms();
  $$('.tab').forEach((t,i)=>{t.onclick=()=>go(i);t.onkeydown=e=>{if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();e.stopPropagation();const n=(i+(e.key==='ArrowDown'?1:-1)+VIEWS.length)%VIEWS.length;go(n);$$('.tab')[n].focus()}}});
  document.addEventListener('click',e=>{const b=e.target.closest('[data-go]');if(!b)return;if(b.dataset.go==='estrategia'){estState.mode='hoy';renderTree()}go(b.dataset.go)});
  $('#hoychip').onclick=()=>{estState.mode='hoy';precioUltimas();renderTree();go('estrategia')};
  $('#cv-eqmini').addEventListener('click',()=>go('backtest'));
  $('#e-hoy').onclick=()=>{estState.mode='hoy';precioUltimas();renderTree()};$('#e-op').onclick=()=>zoomOp(estState.op);
  $('#e-prev').onclick=()=>zoomOp(Math.max(0,estState.op-1));$('#e-next').onclick=()=>zoomOp(Math.min(T.length-1,estState.op+1));
  $('#e-mejor').onclick=()=>extremo('mejor');$('#e-peor').onclick=()=>extremo('peor');$('#e-ultimas').onclick=precioUltimas;
  $('#cv-price canvas').addEventListener('click',()=>{const c=charts['cv-price'];if(c.hovT)zoomOp(T.indexOf(c.hovT))});
  $$('#b-range button').forEach(b=>b.onclick=()=>{eqState.range=b.dataset.r;syncRange()});
  $('#b-ops').onclick=()=>{eqState.ops=!eqState.ops;$('#b-ops').setAttribute('aria-pressed',eqState.ops);charts['cv-eq'].render()};
  $('#cv-eq canvas').addEventListener('click',()=>{const c=charts['cv-eq'];if(c.hovT){opState.filter='all';syncFilt();renderTable();selectOp(T.indexOf(c.hovT));go('operaciones')}});
  $('#cv-mfe canvas').addEventListener('click',()=>{const c=charts['cv-mfe'];if(c.hovT)abrirVelas(T.indexOf(c.hovT))});
  $$('#b-stat button').forEach(b=>b.onclick=()=>{statMode=b.dataset.s;$$('#b-stat button').forEach(x=>x.setAttribute('aria-pressed',x===b));charts['cv-stat'].render()});
  $$('#b-cod button').forEach(b=>b.onclick=()=>{codSel=b.dataset.c;pintarCodigo()});
  $('#b-copiar').onclick=()=>{const t=(D.codigo||{})[codSel];if(t)copiarTexto(t,$('#b-codigo'))};
  $('#o-body').addEventListener('click',e=>{const v=e.target.closest('.vbtn');if(v){e.stopPropagation();selectOp(+v.dataset.v,false,false);abrirVelas(+v.dataset.v);return}const r=e.target.closest('tr');if(r)selectOp(+r.dataset.i,true,false)});
  $('#o-body').addEventListener('dblclick',e=>{const r=e.target.closest('tr');if(r)abrirVelas(+r.dataset.i)});
  $('#o-body').addEventListener('keydown',e=>{if(e.key==='Enter'){abrirVelas(opState.sel);return}if(e.key!=='ArrowDown'&&e.key!=='ArrowUp'&&e.key!=='Home'&&e.key!=='End')return;e.preventDefault();e.stopPropagation();
    const L=opList().map(o=>o.i);let p=L.indexOf(opState.sel);p=e.key==='ArrowDown'?p+1:e.key==='ArrowUp'?p-1:e.key==='Home'?0:L.length-1;if(p>=0&&p<L.length)selectOp(L[p],true)});
  $$('#o-filt button').forEach(b=>b.onclick=()=>{opState.filter=b.dataset.f;syncFilt();renderTable();const L=opList();if(!L.some(o=>o.i===opState.sel)&&L.length)selectOp(L[0].i);else selectOp(opState.sel)});
  $$('table.ops th button').forEach(b=>b.onclick=()=>{const s=b.dataset.s;if(opState.sort===s)opState.dir*=-1;else{opState.sort=s;opState.dir=-1}renderTable();selectOp(opState.sel)});
  $('#cv-bars canvas').addEventListener('click',()=>{const c=charts['cv-bars'];if(c.hv>=0){if(!opList().some(o=>o.i===c.hv)){opState.filter='all';syncFilt();renderTable()}selectOp(c.hv)}});
  $('#vd-prev').onclick=()=>abrirVelas(vdState.op-1);$('#vd-next').onclick=()=>abrirVelas(vdState.op+1);
  $('#b-pres').onclick=()=>setPres(!document.body.classList.contains('pres'));
  $('#b-help').onclick=()=>openDlg('help');$('#b-set').onclick=()=>openDlg('sett');
  $$('[data-close]').forEach(b=>b.onclick=closeDlg);$$('.ovl').forEach(o=>o.addEventListener('click',e=>{if(e.target===o)closeDlg()}));
  $$('#s-theme button').forEach(b=>b.onclick=()=>{store.set('theme',b.dataset.th);applySettings()});
  $$('#s-fs button').forEach(b=>b.onclick=()=>{store.set('fs',b.dataset.fs);applySettings()});
  document.addEventListener('click',e=>{if(!e.target.closest('.term'))hideTip()});
  document.addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey)return;const tag=(e.target.tagName||'').toLowerCase();if(tag==='input'||tag==='select'||tag==='textarea')return;
    const dlg=$('.ovl.on');if(e.key==='Escape'){if(dlg){closeDlg();return}if(tip.style.display==='block'){hideTip();return}if(document.body.classList.contains('pres'))setPres(false);return}
    if(dlg){if(dlg.id==='velas-dlg'&&(e.key==='ArrowRight'||e.key==='ArrowLeft')){e.preventDefault();abrirVelas(vdState.op+(e.key==='ArrowRight'?1:-1))}return}
    if(e.key==='ArrowRight'||e.key==='PageDown'||(e.key===' '&&document.body.classList.contains('pres'))){e.preventDefault();avanzar(1)}
    else if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();avanzar(-1)}
    else if(/^[0-8]$/.test(e.key))go(+e.key);
    else if(e.key==='m'||e.key==='M')setRail(!document.body.classList.contains('rail-min'));
    else if(e.key==='p'||e.key==='P')setPres(!document.body.classList.contains('pres'));
    else if(e.key==='?'||e.key==='h'||e.key==='H')openDlg('help');
    else if(e.key==='Home')go(0)});
  $$('#nivel button').forEach(b=>b.onclick=()=>setNivel(b.dataset.n));
  renderFases();initPI();initIdea();initIA();initMesa();renderProtocolo();
  $('#b-rail').onclick=()=>setRail(!document.body.classList.contains('rail-min'));$$('.tab').forEach(t=>{const b=$('b',t);if(b)t.title=b.textContent});setRail(store.get('rail')==='1',true);
  window.addEventListener('resize',fijarHdr);fijarHdr();
  applySettings();
  let tras=null;try{tras=sessionStorage.getItem('mct_tras');sessionStorage.removeItem('mct_tras')}catch(e){}
  const h=(location.hash||'').slice(1);
  if(tras==='prueba'){go('prueba');mostrarResPI(true,null)}else go(VIEWS.includes(h)?h:0);
}
function syncFilt(){$$('#o-filt button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.f===opState.filter))}
(document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(()=>{renderAll();renderTree();fitNombre()});
init();
})();
