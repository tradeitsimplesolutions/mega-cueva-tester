/* =====================================================================
   E0 · LAS FASES (galería que se estrecha)
   ===================================================================== */
const FASES=[
 {id:'idea',cod:'Punto de partida',nombre:'Idea',corto:'Idea',
  preg:'¿Qué regla exacta quiero probar?',
  que:'Una regla que un ordenador pueda seguir sin interpretar: qué miras, cuándo entras, cuándo sales, con cuánto y con qué costes.',
  umb:[['Reglas sin ambigüedad','todo con números'],['Datos en hora del bróker','servidor MT5'],['Costes reales del símbolo','spread · comisión · swap']],
  falla:'«Compro cuando el oro está barato» no se puede probar. «Compro si el RSI(4) cierra por debajo de 25» sí.',
  av:'Ficha de estrategia con ID, hipótesis y parámetros canónicos antes de mirar resultados. La prueba inicial (E3) genera el spec que consume el motor.'},
 {id:'F1',cod:'Fase 1',nombre:'Dentro / fuera de muestra',corto:'IS / OOS',
  preg:'¿Sigue ganando con datos que no usé para diseñarla?',
  que:'Se parte el histórico en dos. Con la primera parte diseñas; la segunda se guarda bajo llave y solo se abre al final.',
  umb:[['Gana 1,3 por cada 1 que pierde (PF fuera de muestra)','≥ 1,30'],['Operaciones en la parte de prueba','≥ 30'],['Caída máxima en la prueba','< 20 %'],['PF quitando la mejor operación','> 1,00']],
  falla:'La curva del diseño sube preciosa y en la parte guardada se aplana o cae: estaba aprendida de memoria.',
  av:'Split 70/30 por defecto [calibrable]. Los 4 criterios duros se cumplen a la vez sobre el OOS completo; no se bajan sin orden explícita.'},
 {id:'F2',cod:'Fase 2',nombre:'Walk-forward',corto:'Walk-forward',
  preg:'¿Aguanta si la reajusto cada año y la pruebo en el siguiente?',
  que:'En vez de un solo corte, se hacen muchos: ajustar con 3 años, probar en el siguiente, avanzar un año y repetir.',
  umb:[['Conserva al menos la mitad de lo que rinde al ajustar (eficiencia)','≥ 0,50'],['Años de prueba en positivo','≥ 60 %'],['Ningún año de prueba con caída de 20 % o más','< 20 %']],
  falla:'Con el corte elegido funciona, pero al rodar la ventana la mitad de los años pierde: era suerte del corte.',
  av:'IS 3 años / OOS 1 año / paso 1 año, deslizante [calibrable]. Eficiencia = rendimiento medio OOS / rendimiento medio IS.'},
 {id:'F3',cod:'Fase 3',nombre:'Meseta de parámetros',corto:'Meseta',
  preg:'¿Funciona igual si muevo un poco los números?',
  que:'Se prueban los valores vecinos de cada número elegido. Una buena regla está rodeada de buenas reglas: una meseta, no un pico.',
  umb:[['Rejilla mínima alrededor del elegido','3 × 3'],['Los vecinos rinden parecido','± 20 %'],['Ningún vecino se desploma (anti-precipicio)','caída < 30 %']],
  falla:'Con 25 gana y con 30 apenas: es un pico. El mercado no sabe que elegiste 25.',
  av:'Vecinos ±1 paso en cada par de parámetros clave; métrica objetivo dentro del 20 % del óptimo; anti-cliff 30 %. La config final sale del centro de la meseta.'},
 {id:'F4',cod:'Fase 4',nombre:'Monte Carlo',corto:'Monte Carlo',
  preg:'¿Qué podría haber pasado con otra suerte en el orden de las operaciones?',
  que:'Se barajan las mismas operaciones miles de veces. Lo que pasó es solo uno de los caminos posibles; miramos los malos.',
  umb:[['El peor 5 % de los caminos aún gana','> 0'],['Caída en el peor 5 % de los caminos','< 25 %'],['Probabilidad de perder la mitad del capital','< 5 %']],
  falla:'La caída real fue moderada, pero barajando las mismas operaciones 1 de cada 20 veces supera el 25 %.',
  av:'5.000 simulaciones; reordenación + bootstrap con reemplazo [calibrable]. p5 retorno > 0 · p95 MaxDD < 25 % · P(ruina ≥ 50 %) < 5 %.'},
 {id:'F5',cod:'Fase 5',nombre:'Stress',corto:'Stress',
  preg:'¿Sobrevive si empeoro las condiciones a propósito?',
  que:'Costes dobles, quitar los 2 mejores años y meterla en el peor tramo de mercado. Si la ventaja es real, sale tocada pero viva.',
  umb:[['Con costes ×2, PF fuera de muestra','≥ 1,10'],['Sin los 2 mejores años, PF','≥ 1,10'],['En el régimen malo, caída','< 25 %']],
  falla:'Con costes dobles el PF baja de 1: la ventaja era más pequeña que el coste de operar.',
  av:'Escenarios: costes/slippage ×2 sobre el perfil de destino; sin los 2 mejores años; régimen malo aislado. PF OOS ≥ 1,1 y MaxDD < 25 % en cada uno [calibrable].'},
 {id:'PAR',cod:'Paridad',nombre:'Paridad MT5',corto:'Paridad MT5',
  preg:'¿El backtest y el MetaTrader real son el mismo sistema?',
  que:'Las mismas velas en la hora del servidor, los costes reales del bróker y, al final, el Strategy Tester de MT5 debe dar las mismas operaciones.',
  umb:[['Velas en hora del servidor del bróker','GMT+3 · DST EE. UU.'],['Costes leídos del terminal','spread · comisión · swap'],['Strategy Tester vs backtest','± 2 % y mismas operaciones']],
  falla:'El backtest usa velas en UTC y MT5 en hora de servidor: las señales caen en otra vela y la cuenta real no se parece al backtest.',
  av:'Reconciliación obligatoria antes de dar por validada: nº de operaciones exacto, equity y PnL dentro de ±2 % [calibrable]. Evidencia guardada en el reporte.'},
 {id:'real',cod:'Salida',nombre:'Dinero real',corto:'Real',
  preg:'Solo ahora: forward y cuenta real.',
  que:'Se opera con capital pequeño y se vigila que se comporte dentro de lo que predijo el Monte Carlo. Si se sale, se para.',
  umb:[['Seguimiento de salud','verde · ámbar · rojo'],['Caída fuera de lo esperado','se para y se revisa']],
  falla:'Saltarse las fases y llegar aquí con un backtest bonito. Es la forma más cara de aprender.',
  av:'Estados: validada → forward/paper → live con salud verde/ámbar/rojo → retirada. El live se compara con el p95 del Monte Carlo.'}
];
let galSel=1;
function estFase(id){if(id==='PAR')return estParidad();if(/^F\d$/.test(id))return D.fases[id]?'pasa':'falla';return null}
function contornos(){const el=$('#contornos');if(!el||el._h)return;el._h=1;let s='<svg viewBox="0 0 800 600" aria-hidden="true">';
  for(let k=0;k<11;k++){const r=60+k*34;let d='';for(let a=0;a<=64;a++){const t=a/64*Math.PI*2,w=1+.18*Math.sin(3*t+k*.5)+.1*Math.sin(5*t-k*.3)+.05*Math.sin(9*t+k);
    const x=430+Math.cos(t)*r*1.35*w,y=300+Math.sin(t)*r*.8*w;d+=(a?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)}s+=`<path d="${d}Z"/>`}
  el.innerHTML=s+'</svg>'}
function renderGaleria(){const svg=$('#gal-svg');const N=FASES.length,W=860,cy=124;
  const half=x=>88-60*(x/W)+5*Math.sin(x/53)+3*Math.sin(x/23+1);const half2=x=>88-60*(x/W)+4*Math.sin(x/47+2)+3*Math.sin(x/19);
  let top='',bot='';for(let x=0;x<=W;x+=10){top+=(x?'L':'M')+x+' '+(cy-half(x)).toFixed(1);}for(let x=W;x>=0;x-=10){bot+='L'+x+' '+(cy+half2(x)).toFixed(1)}
  let h=`<rect class="g-roca" x="0" y="0" width="${W}" height="262"/>`;
  for(let k=1;k<=3;k++){let a='',b='';for(let x=0;x<=W;x+=10){a+=(x?'L':'M')+x+' '+(cy-half(x)-k*9).toFixed(1);b+=(x?'L':'M')+x+' '+(cy+half2(x)+k*9).toFixed(1)}h+=`<path class="g-curva" d="${a}"/><path class="g-curva" d="${b}"/>`}
  h+=`<path class="g-paso" d="${top}${bot}Z"/><path class="g-borde" d="${top}"/><path class="g-borde" d="M0 ${(cy+half2(0)).toFixed(1)}${bot.replace(/^L[^L]*/,'')}"/>`;
  const xs=FASES.map((f,i)=>58+i*(W-116)/(N-1));
  h+=`<path class="g-visual" d="M${xs[0]} ${cy} L${xs[N-1]} ${cy}"/>`;
  FASES.forEach((f,i)=>{const x=xs[i],e=estFase(f.id),ty=cy-half(x)-14,by=cy+half2(x)+22;const anc=i===N-1?'end':i===0?'start':'middle',dx=i===N-1?18:i===0?-18:0;
    const res=e?`<text class="res" x="${x+dx}" y="${by+16}" text-anchor="${anc}" fill="${css(e==='pasa'?'--pasa':e==='falla'?'--falla':'--pend')}">${EST[e].t.toUpperCase()}</text>`:'';
    h+=`<g class="g-est${i===galSel?' sel':''}" data-i="${i}" tabindex="0" role="button" aria-pressed="${i===galSel}" aria-label="${esc(f.cod+': '+f.nombre+(e?'. En la demo: '+EST[e].t:''))}">
      <rect class="halo" x="${x-50}" y="${ty-24}" width="100" height="${by-ty+44}"/>
      <text x="${x+dx}" y="${ty}" text-anchor="${anc}">${esc(f.corto)}</text>
      <g transform="translate(${x} ${cy})"><circle class="c" r="${i===galSel?13:10}"/><path class="x" d="M-6 0H6M0-6V6"/></g>
      <text class="cod" x="${x+dx}" y="${by}" text-anchor="${anc}">${esc(f.id==='idea'||f.id==='real'?f.cod:f.id==='PAR'?'MT5':f.id)}</text>${res}</g>`});
  svg.innerHTML=h;
  $$('.g-est',svg).forEach(g=>{g.onclick=()=>selGal(+g.dataset.i);g.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selGal(+g.dataset.i)}
    if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();e.stopPropagation();const n=Math.max(0,Math.min(N-1,+g.dataset.i+(e.key==='ArrowRight'?1:-1)));selGal(n);$(`.g-est[data-i="${n}"]`,svg).focus()}}});
  renderFaseDet()}
function selGal(i){galSel=i;renderGaleria()}
function demoFase(id){const S=D.stress||{},Mc=D.mc||{},W=D.wf_res||{},Me=D.meseta;
  switch(id){
   case 'F1':return `PF fuera de muestra <b>${nf(OOS.pf,2)}</b> con <b>${OOS.n}</b> operaciones y caída máxima <b>${pct(OOS.maxdd,1,false)}</b>.`;
   case 'F2':return W.eficiencia!=null?`Eficiencia <b>${nf(W.eficiencia,2)}</b> y <b>${Math.round(W.pct_positivas*W.n_ventanas)} de ${W.n_ventanas}</b> años de prueba en positivo.`:'Sin datos de walk-forward en el JSON.';
   case 'F3':if(!Me)return 'Sin datos de meseta en el JSON.';{const c=centro(Me);const nb=vecinos(Me);return `En el centro PF <b>${nf(Me.pf[c][c],2)}</b>; sus vecinos van de <b>${nf(Math.min(...nb),2)}</b> a <b>${nf(Math.max(...nb),2)}</b>. ${D.fases.F3?'Es una meseta.':'Es un pico, no una meseta.'}`}
   case 'F4':return Mc.p95dd!=null?`En el peor 5 % de los caminos la caída llega al <b>${pct(Mc.p95dd,1,false)}</b> (límite 25 %). Peor 5 % de retornos: <b>${pct(Mc.p5,1)}</b>.`:'Sin datos de Monte Carlo en el JSON.';
   case 'F5':return S.costes_x2?`Con costes ×2 el PF queda en <b>${nf(S.costes_x2.pf,2)}</b>; sin los 2 mejores años, <b>${nf(S.sin_2_mejores_anios&&S.sin_2_mejores_anios.pf,2)}</b>.`:'Sin datos de stress en el JSON.';
   case 'PAR':return estParidad()==='pend'?'Hora y costes modelados como en MT5. <b>Falta la reconciliación</b> con el Strategy Tester: sube tu informe en E6.':(RECON?RECON.txt:esc(P.reconciliacion.txt||''));
  }return ''}
function renderFaseDet(){const f=FASES[galSel],e=estFase(f.id);
  $('#fase-det').innerHTML=`<div><div class="cod">${esc(f.cod.toUpperCase())}${f.id.startsWith('F')?' DE 5':''}</div><h3>${esc(f.nombre)}</h3></div>
   <p class="preg">${esc(f.preg)}</p>
   <div class="fb en"><h4>Qué se hace</h4><p>${esc(f.que)}</p></div>
   <div class="fb"><h4>${'Umbral TIS'}</h4><ul class="umb">${f.umb.map(u=>`<li><span>${esc(u[0])}</span><span>${esc(u[1])}</span></li>`).join('')}</ul></div>
   <div class="fb av"><h4>Detalle técnico</h4><p>${esc(f.av)}</p></div>
   <div class="fb"><h4>Así falla</h4><p>${esc(f.falla)}</p></div>
   ${e?`<div class="fb"><h4>En ${ES_DEMO?'la demo':'tus resultados'} · ${esc(M.nombre)}</h4><p style="display:flex;gap:.7rem;align-items:baseline;flex-wrap:wrap">${sello(e)}<span>${demoFase(f.id)}</span></p></div>`:''}
   <div class="nav"><button type="button" class="btn peq" data-gal="-1" ${galSel===0?'disabled':''}>${ico('fli')}Anterior</button><button type="button" class="btn peq" data-gal="1" ${galSel===FASES.length-1?'disabled':''}>Siguiente${ico('fl')}</button>
   ${e?`<button type="button" class="btn peq prim" data-pver="${f.id}">Ver la prueba completa${ico('fl')}</button>`:f.id==='idea'?`<button type="button" class="btn peq prim" data-go="prueba">Escribir mi idea${ico('fl')}</button>`:''}</div>`;
  $$('#fase-det [data-gal]').forEach(b=>b.onclick=()=>selGal(Math.max(0,Math.min(FASES.length-1,galSel+ +b.dataset.gal))));
  $$('#fase-det [data-pver]').forEach(b=>b.onclick=()=>{prSel=PR_ORDEN.indexOf(b.dataset.pver);renderProtocolo();go('protocolo')});
  wireGo($('#fase-det'))}
function renderIntro(){contornos();
  const Me=D.meseta;if(Me){const c=centro(Me),ej=Me.ejes,k=Object.keys(ej)[0];const v2=Me.pf[c+1]?Me.pf[c+1][c]:null;
    $('#tr-ej1').innerHTML=`En ${ES_DEMO?'la demo':'tus datos'}: ${esc(k)} <b>${ej[k][c]}</b> → PF <b>${nf(Me.pf[c][c],2)}</b>; ${esc(k)} <b>${ej[k][c+1]}</b> → PF <b>${nf(v2,2)}</b>.`}else $('#tr-ej1').textContent='';
  const S=D.stress;$('#tr-ej3').innerHTML=S&&S.costes_x2?`En ${ES_DEMO?'la demo':'tus datos'}: con costes ×2 el PF de la prueba pasa de <b>${nf(OOS.pf,2)}</b> a <b>${nf(S.costes_x2.pf,2)}</b>.`:'';
  renderGaleria()}
function centro(Me){return Math.floor(Me.pf.length/2)}
function vecinos(Me){const c=centro(Me),v=[];for(let i=c-1;i<=c+1;i++)for(let j=c-1;j<=c+1;j++)if((i!==c||j!==c)&&Me.pf[i]&&Me.pf[i][j]!=null)v.push(Me.pf[i][j]);return v}

/* =====================================================================
   E1 · RESUMEN
   ===================================================================== */
function renderResumen(){
  $('#r-titulo').innerHTML=M.titulo_html;
  $('#r-lema').innerHTML=M.lema||`${esc(M.activo)} ${esc(M.tf)} · ${fd(D.desde)} → ${fd(D.hasta)}`;
  $('#r-regla').innerHTML=M.regla_html||'Regla: ver E2 · Estrategia';$('#r-regla').hidden=!M.regla_html;
  const V=veredictoGlobal(),fl=fallidas();
  $('#r-veredicto').className='veredicto'+(V.e==='pasa'?' ok':'');
  $('#r-veredicto').innerHTML=`${sello(V.e,V.t,'grande')}<div><p class="en"><b>${nPass} de 5 pruebas superadas.</b> ${V.e==='pasa'?'Lista para pasar a dinero real con seguimiento.':fl.length?'Gana en la prueba honesta, pero '+fl.map(k=>({F1:'no supera la prueba fuera de muestra',F2:'no aguanta el walk-forward',F3:'su resultado depende demasiado de los números elegidos',F4:'su peor caída posible supera el límite',F5:'no aguanta condiciones peores'})[k]).join(' y ')+'. <b>No está lista para dinero real tal cual.</b>':'Falta comprobarla en MetaTrader (paridad MT5).'}</p>
    <p class="av"><b>${nPass}/5 fases</b> · fallan: ${fl.length?fl.map(k=>k+' '+NOMF[k]).join(', '):'ninguna'} · paridad MT5: ${EST[estParidad()].t.toLowerCase()}.</p><div class="pista">${pistaHTML()}</div></div>
    <button type="button" class="lnk" data-go="protocolo">Ver por qué ${ico('fl')}</button>`;
  $('#r-quees').innerHTML=M.origen?M.origen:`Estrategia ${esc(M.activo)} ${esc(M.tf)} con datos de ${yr(D.desde)} a ${yr(D.hasta)}.`;
  $('#r-quees-kv').innerHTML=`<dt>Operaciones</dt><dd>${FULL.n} · ${OOS.n} en prueba</dd>`+(D.dias_medio!=null?`<dt>Duración media</dt><dd>${nf(D.dias_medio,1)} días</dd>`:'')+
    `<dt><span class="term" data-t="expo">Tiempo invertido</span></dt><dd>${nf(FULL.exposicion*100,0)} %</dd><dt class="av">Datos</dt><dd class="av">${yr(D.desde)}–${yr(D.hasta)}</dd>`;
  $('#r-pf').textContent=nf(OOS.pf,2);$('#r-pf').className='cifra '+(OOS.pf>=1.3?'c-pasa':'c-falla');
  $('#r-pf-sub').textContent='en la prueba honesta · '+OOS.n+' op.';
  $('#r-pftxt').innerHTML=`<span class="en">En los años que no se usaron para diseñarla gana <b>${nf(OOS.pf,2)}</b> por cada 1 que pierde y acierta el <b>${nf(OOS.win_rate*100,0)} %</b> de las veces. TIS pide al menos 1,30.</span><span class="av">OOS ${yr(D.split)}–${yr(D.hasta)}: PF ${nf(OOS.pf,2)} (IS ${nf(IS.pf,2)}) · acierto ${nf(OOS.win_rate*100,1)} % · PF sin mejor ${nf(OOS.pf_sin_mejor,2)} · Sharpe ${nf(OOS.sharpe,2)}.</span>`;
  // hoy
  if(E){$('#r-senal').textContent=E.senal||'—';
    const up=E.sma200!=null?E.precio>E.sma200:null;
    $('#r-hoytxt').innerHTML=up==null?`Datos al ${fd(E.fecha)}.`:up?`El precio (<b class="mono">${nf(E.precio,2)}</b>) está <b>por encima</b> de su <span class="term" data-t="sma">media de 200</span> (<b class="mono">${nf(E.sma200,2)}</b>): la regla busca compras.`:
      `Sin posición. El precio (<b class="mono">${nf(E.precio,2)}</b>) está <b>por debajo</b> de su <span class="term" data-t="sma">media de 200 días</span> (<b class="mono">${nf(E.sma200,2)}</b>): tendencia bajista, así que la regla no busca compras.`;
    const O=M.osc;if(O&&E.rsi4!=null){$('#r-regleta-w').innerHTML=`<span class="c-dim" style="font-size:.88rem"><span class="term" data-t="rsi">${esc(O.nombre)}</span> hoy: <b class="mono">${nf(E.rsi4,1)}</b></span>
      <div class="regleta" aria-hidden="true"><b class="z" style="left:0;width:${O.compra}%;background:rgba(var(--cinta-rgb),.55)"></b><b class="z" style="left:${O.venta}%;right:0;background:rgba(var(--linea-rgb),.18)"></b>
      <i style="left:calc(${E.rsi4}% - 1.5px)"></i><span style="left:${O.compra}%">${O.compra} compra</span><span style="left:${O.venta}%">${O.venta} venta</span></div>`}else $('#r-regleta-w').innerHTML='';
  }else{$('#r-senal').textContent='—';$('#r-hoytxt').textContent='El JSON no trae el estado de hoy.';$('#r-regleta-w').innerHTML=''}
  $('#r-ultima').innerHTML=U?`<span class="c-dim">Última operación</span> <b class="mono">#${U.n}</b>: ${fd(U.fi)} → ${fd(U.fo)} · <b class="mono ${U.ret>0?'pos':'neg'}">${pct(U.ret,2)}</b>`:'';
  const Mc=D.mc||{};
  $('#r-money').innerHTML=[
    ['<span class="term" data-t="cagr">Rentabilidad anual</span> <span class="c-dim2">(prueba)</span>',pct(OOS.cagr,1)+' / año','pos'],
    ['<span class="term" data-t="dd">Peor caída</span> <span class="c-dim2">(prueba)</span>',pct(-OOS.maxdd,1),'neg'],
    [`Total ${yr(D.desde)}–${yr(D.hasta)}`,pct(FULL.ret_total,1),FULL.ret_total>0?'pos':'neg'],
    Mc.p95dd!=null?['Peor caída posible <span class="c-dim2">(Monte Carlo, 95 %)</span>',pct(-Mc.p95dd,1),'neg']:null
  ].filter(Boolean).map(([a,b,c])=>`<dt>${a}</dt><dd class="${c}">${b}</dd>`).join('');
  $('#r-sizing').innerHTML=`<span class="c-dim">Tamaño: ${esc(D.sizing||'—')}.</span> <span class="en c-dim">Gana poco al año porque solo está dentro del mercado ${nf(FULL.exposicion*100,0)} % de los días.</span>`;
  $('#r-eqh').innerHTML=`Así habría crecido 100 desde ${yr(D.desde)} <span class="c-cinta mono" style="font-size:1rem;margin-left:.4rem">→ ${nf(eqV[eqV.length-1],1)}</span>`;
  wireTerms($('#v-resumen'));wireGo($('#v-resumen'))}

/* =====================================================================
   E2 · ESTRATEGIA (árbol genérico desde D.arbol)
   ===================================================================== */
const estState={mode:'hoy',op:0};
function partir(s,max){const w=String(s).split(' '),out=[];let l='';w.forEach(x=>{if((l+' '+x).trim().length>max&&l){out.push(l);l=x}else l=(l+' '+x).trim()});if(l)out.push(l);return out}
function modeloArbol(){const A=D.arbol||[];const nodes=[{id:'start',k:'act',t:['Cierre del día'],s:'se revisa cada día'}];let enPos=false;const nos=[];
  A.forEach(a=>{if(a.q){nodes.push({id:a.id,k:'q',t:partir(a.q,15)});const [nt,...ns]=String(a.no||'NO').split(' · ');nos.push({id:'no:'+a.id,of:a.id,k:enPos?'act':'stop',t:[nt],s:ns.join(' · ')||(enPos?'se revisa mañana':'mañana se repite'),loop:enPos})}
    else{const p=String(a.a||'').split(' ');nodes.push({id:a.id,k:'act',t:[p[0]],s:p.slice(1).join(' ')});if(!enPos)enPos=true}});
  return{nodes,nos}}
function renderArbol(){const svg=$('#arbol');if(!D.arbol||!D.arbol.length){svg.innerHTML='';$('#e-path').textContent='El JSON no trae árbol de decisión.';return}
  const {nodes,nos}=modeloArbol(),n=nodes.length,W=Math.max(760,n*175),gap=36,w=(W-20-(n-1)*gap)/n,hM=100,yM=24,yN=214,hN=86;
  const pos={};nodes.forEach((d,i)=>pos[d.id]={x:10+i*(w+gap),y:yM,w,h:hM,...d});nos.forEach(d=>{const q=pos[d.of];pos[d.id]={x:q.x,y:yN,w,h:hN,...d}});
  let on=new Set(),sub={},txt='',stop=false;const buyId=(nodes.find(d=>d.k==='act'&&d.id!=='start')||{}).id,sellId=[...nodes].reverse().find(d=>d.k==='act'&&d.id!=='start'&&d.id!==buyId);
  if(estState.mode==='hoy'){
    let ruta=E&&E.ruta;if(!ruta&&E&&E.sma200!=null){const up=E.precio>E.sma200,q1=nodes[1].id;ruta=['start',q1];if(!up)ruta.push('no:'+q1);else{const q2=nodes[2]&&nodes[2].k==='q'?nodes[2].id:null;if(q2){ruta.push(q2);ruta.push(M.osc&&E.rsi4<M.osc.compra?buyId:'no:'+q2)}}
      sub.start=fd(E.fecha);sub[q1]=nf(E.precio,2)+(up?' > ':' < ')+nf(E.sma200,2)+' → '+(up?'SÍ':'NO');
      txt=up?`<b>Hoy (${fd(E.fecha)})</b>: el precio está por encima de su media 200; la regla mira el oscilador (${nf(E.rsi4,1)}).`:
        `<b>Hoy (${fd(E.fecha)})</b>: cerró en <b class="mono">${nf(E.precio,2)}</b>, por debajo de su media de 200 días (<b class="mono">${nf(E.sma200,2)}</b>). La regla se para en el primer paso: <b class="c-cinta">${esc(E.senal||'EN ESPERA')}</b>${E.rsi4!=null?', sin buscar compras aunque el oscilador esté en '+nf(E.rsi4,1):''}.`}
    ruta=ruta||['start'];on=new Set(ruta);stop=ruta.some(r=>r.startsWith('no:')&&pos[r]&&pos[r].k==='stop');if(!txt)txt='Ruta de hoy según el estado del JSON.';
  }else{const t=T[estState.op];nodes.forEach(d=>on.add(d.id));nos.filter(d=>d.loop).forEach(d=>on.add(d.id));
    if(buyId)sub[buyId]=fd(t.fi)+' · '+nf(t.pi,2);if(sellId)sub[sellId.id]=fd(t.fo)+' · '+pct(t.ret,2);nos.filter(d=>d.loop).forEach(d=>sub[d.id]=t.dias+' días');sub.start='antes del '+fd(t.fi);
    txt=`<b>Operación #${t.n}</b> (${t.oos?'prueba':'diseño'}): se cumplieron las condiciones, <b>compró el ${fd(t.fi)}</b> a ${nf(t.pi,2)}, mantuvo ${t.dias} días y <b>vendió el ${fd(t.fo)}</b> a ${nf(t.po,2)}: <b class="${t.ret>0?'pos':'neg'}">${pct(t.ret,2)}</b>.`}
  const edges=[];for(let i=0;i<n-1;i++)edges.push([nodes[i].id,nodes[i+1].id,nodes[i].k==='q'?'SÍ':'']);nos.forEach(d=>{edges.push([d.of,d.id,'NO']);if(d.loop)edges.push([d.id,d.of,'loop'])});
  let h=`<defs>${['a','o','r'].map(k=>`<marker id="m${k}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="${css(k==='a'?'--veta-2':k==='o'?'--cinta':'--falla')}"/></marker>`).join('')}</defs>`;
  edges.forEach(([a,b,l])=>{const A=pos[a],B=pos[b],act=on.has(a)&&on.has(b),st=act&&stop&&pos[b].k==='stop';let d,lx,ly,an='middle';
    if(l==='loop'){d=`M${A.x+A.w} ${A.y+A.h/2} C ${A.x+A.w+40} ${A.y+A.h/2}, ${B.x+B.w+40} ${B.y+B.h-10}, ${B.x+B.w-4} ${B.y+B.h-14}`;lx=A.x+A.w+28;ly=(A.y+B.y+B.h)/2+8;an='middle'}
    else if(A.y===B.y){d=`M${A.x+A.w} ${A.y+A.h/2} L${B.x-5} ${B.y+B.h/2}`;lx=(A.x+A.w+B.x)/2;ly=A.y+A.h/2-9}
    else{const x=A.x+A.w/2;d=`M${x} ${A.y+A.h} L${x} ${B.y-5}`;lx=x+10;ly=(A.y+A.h+B.y)/2+5;an='start'}
    h+=`<path class="ed${act?' on':''}${st?' stop':''}" d="${d}" marker-end="url(#m${act?(st?'r':'o'):'a'})"/>`;
    const lab=l==='loop'?'día sig.':l;if(lab)h+=`<text class="el${act?' on':''}" x="${lx}" y="${ly}" text-anchor="${an}">${lab}</text>`});
  Object.values(pos).forEach(N=>{const a=on.has(N.id),s=sub[N.id]||N.s||'',fsT=N.k==='q'?21:25,lines=N.t,tot=lines.length+(s?1:0),lh=fsT+6,y0=N.y+N.h/2-(tot*lh)/2+fsT*.8;
    h+=`<g class="nd ${N.k}${a?' on':''}"><rect x="${N.x}" y="${N.y}" width="${N.w}" height="${N.h}" rx="${N.k==='q'?30:4}"/>`;
    lines.forEach((ln,i)=>h+=`<text x="${N.x+N.w/2}" y="${y0+i*lh}" text-anchor="middle" font-size="${fsT}">${esc(ln)}</text>`);
    if(s)partir(s,22).slice(0,1).forEach(sl=>h+=`<text class="s" x="${N.x+N.w/2}" y="${y0+lines.length*lh}" text-anchor="middle" font-size="15">${esc(sl)}</text>`);h+='</g>'});
  svg.setAttribute('viewBox',`0 0 ${W} 320`);svg.innerHTML=h;$('#e-path').innerHTML=txt;
  $('#e-mode').innerHTML=estState.mode==='hoy'?'Ruta de hoy <span class="c-dim2 mono" style="font-size:.9rem">'+(E?fd(E.fecha):'')+'</span>':'Ruta de la operación <span class="c-cinta mono">#'+T[estState.op].n+'</span>';
  $('#e-hoy').setAttribute('aria-pressed',estState.mode==='hoy');$('#e-op').setAttribute('aria-pressed',estState.mode==='op');
  $('#e-opn').textContent='#'+(T[estState.op]||{}).n;['#e-prev','#e-next','#e-opn'].forEach(s=>$(s).style.visibility=estState.mode==='op'?'visible':'hidden');
  charts['cv-price']&&charts['cv-price'].render()}
function treeOp(i){estState.mode='op';estState.op=Math.max(0,Math.min(T.length-1,i));renderArbol()}
function renderEstrategia(){
  $('#e-head').innerHTML=E&&E.sma200!=null?`Hoy está <b>${esc(E.senal)}</b> porque el precio está ${E.precio>E.sma200?'por encima':'por debajo'} de su media de 200 días. Cambia a «Una operación» para ver cómo decidió cualquiera de las ${T.length}.`:'El árbol muestra cómo decide la regla. Cambia a «Una operación» para recorrer cualquiera.';
  const pasos=M.pasos||(D.arbol||[]).map(a=>a.q?`${esc(a.q)} Si no: <b>${esc(String(a.no||'').split(' · ')[0])}</b>.`:`<b>${esc(a.a)}</b>.`);
  $('#e-pasos').innerHTML=pasos.map(p=>`<li>${p}</li>`).join('');
  $('#e-glos').innerHTML=(M.glosario||[['Factor de beneficio',GL.pf[1]],['Caída máxima',GL.dd[1]]]).map(([a,b])=>`<div><b>${esc(a)}</b>${esc(b)}</div>`).join('');
  estState.op=T.length-1;
  $('#e-preh').innerHTML=D.velas?`Precio · últimas ${D.velas.length} velas`:'Precio';
  if(D.velas&&D.velas.length){if(!$('#cv-price canvas'))$('#cv-price').innerHTML='<canvas role="img" aria-label="Velas con media, oscilador y operaciones"></canvas><div class="tt"></div>';chart('cv-price',drawPrice);
    $('#cv-price canvas').addEventListener('click',()=>{const c=charts['cv-price'];if(c.hovT)treeOp(T.indexOf(c.hovT))})}else vacioCv('cv-price','El JSON no trae velas recientes.');
  renderArbol();wireTerms($('#v-estrategia'))}

/* =====================================================================
   E4 · BACKTEST
   ===================================================================== */
function renderBacktest(){
  $('#b-head').innerHTML=`100 en ${yr(D.desde)} → <b>${nf(eqV[eqV.length-1],1)}</b> en ${yr(D.hasta)} (${pct(FULL.ret_total,1)}). En la parte que no se usó para diseñarla (${yr(D.split)}–${yr(D.hasta)}): <b>${pct(OOS.ret_total,1)}</b> con una caída máxima de <b>${pct(-OOS.maxdd,1)}</b>.`;
  $('#b-range').innerHTML=[['all','Todo'],['is',`Diseño ${yr(D.desde)}–${yr(D.split)}`],['oos',`Prueba ${yr(D.split)}–${yr(D.hasta)}`],['10','10 años'],['3','3 años']].map(([k,l])=>`<button type="button" data-r="${k}" aria-pressed="${eqState.range===k}">${l}</button>`).join('');
  $$('#b-range button').forEach(b=>b.onclick=()=>{eqState.range=b.dataset.r;syncRange()});
  const rows=[['Periodo',`${yr(D.desde)}–${yr(D.split)}`,`${yr(D.split)}–${yr(D.hasta)}`,'Total'],['Operaciones',IS.n,OOS.n,FULL.n],['<span class="term" data-t="pf">Factor de beneficio</span>',nf(IS.pf,2),nf(OOS.pf,2),nf(FULL.pf,2)],
    ['<span class="term" data-t="pfsm">PF sin la mejor op.</span>',nf(IS.pf_sin_mejor,2),nf(OOS.pf_sin_mejor,2),nf(FULL.pf_sin_mejor,2)],['Acierto',pct(IS.win_rate,1,false),pct(OOS.win_rate,1,false),pct(FULL.win_rate,1,false)],
    ['Retorno total',pct(IS.ret_total,1),pct(OOS.ret_total,1),pct(FULL.ret_total,1)],['<span class="term" data-t="cagr">Rentab. anual</span>',pct(IS.cagr,1),pct(OOS.cagr,1),pct(FULL.cagr,1)],
    ['<span class="term" data-t="dd">Peor caída</span>',pct(-IS.maxdd,1),pct(-OOS.maxdd,1),pct(-FULL.maxdd,1)],['<span class="term" data-t="expo">Tiempo invertido</span>',pct(IS.exposicion,0,false),pct(OOS.exposicion,0,false),pct(FULL.exposicion,0,false)],
    ['<span class="av">Sharpe</span><span class="en">Regularidad (Sharpe)</span>',nf(IS.sharpe,2),nf(OOS.sharpe,2),nf(FULL.sharpe,2)]];
  $('#b-cmp').innerHTML='<thead><tr><th></th><th><span class="term" data-t="is">Diseño</span></th><th class="o"><span class="term" data-t="oos">Prueba</span></th><th>Total</th></tr></thead><tbody>'+
    rows.slice(1).map(r=>'<tr>'+r.map((v,j)=>j===0?`<td>${v}</td>`:`<td class="${j===2?'o':''}">${v}</td>`).join('')+'</tr>').join('')+'</tbody>';
  $('#b-cmp thead th:nth-child(2)').insertAdjacentHTML('beforeend',`<br><span style="letter-spacing:0">${rows[0][1]}</span>`);$('#b-cmp thead th:nth-child(3)').insertAdjacentHTML('beforeend',`<br><span style="letter-spacing:0">${rows[0][2]}</span>`);
  const yp=D.anual.filter(a=>a.ret>0).length;$('#b-anios').textContent=yp+' de '+D.anual.length+' años en positivo';
  wireTerms($('#v-backtest'))}
function syncRange(){$$('#b-range button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.r===eqState.range));charts['cv-eq']&&charts['cv-eq'].render()}

/* =====================================================================
   E5 · OPERACIONES
   ===================================================================== */
const opState={filter:'all',sort:'n',dir:-1,sel:0};
function opList(){let L=T.map((t,i)=>({t,i}));const f=opState.filter;
  if(f==='is')L=L.filter(o=>!o.t.oos);if(f==='oos')L=L.filter(o=>o.t.oos);if(f==='win')L=L.filter(o=>o.t.ret>0);if(f==='loss')L=L.filter(o=>o.t.ret<=0);
  const k=opState.sort,d=opState.dir;L.sort((a,b)=>(a.t[k]>b.t[k]?1:a.t[k]<b.t[k]?-1:0)*d);return L}
function renderOps(){$('#o-head').innerHTML=`Las <b>${T.length} operaciones</b> del backtest. <span class="en">Pulsa una fila (o usa ↑ ↓) para ver su ficha y su ruta en el árbol.</span><span class="av">Resultado neto de costes, tamaño ${esc(D.sizing||'—')}.</span>`;
  $('#o-filt').innerHTML=[['all','Todas'],['is','Diseño'],['oos','Prueba'],['win','Ganadoras'],['loss','Perdedoras']].map(([k,l])=>`<button type="button" data-f="${k}" aria-pressed="${opState.filter===k}">${l}</button>`).join('');
  $$('#o-filt button').forEach(b=>b.onclick=()=>{opState.filter=b.dataset.f;syncFilt();renderTable();const L=opList();if(!L.some(o=>o.i===opState.sel)&&L.length)selectOp(L[0].i);else selectOp(opState.sel)});
  opState.sel=T.length-1;renderTable();renderDetail()}
function syncFilt(){$$('#o-filt button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.f===opState.filter))}
function renderTable(){const L=opList();$('#o-count').textContent=L.length+' operaciones';
  $('#o-body').innerHTML=L.map(({t,i})=>`<tr tabindex="${i===opState.sel?0:-1}" data-i="${i}" aria-selected="${i===opState.sel}"><td>${t.n}<span class="mt ${t.oos?'oos':''}">${t.oos?'PRUEBA':'DISEÑO'}</span></td><td>${fd(t.fi)}</td><td>${fd(t.fo)}</td><td>${nf(t.pi,2)}</td><td>${t.dias!=null?t.dias:'—'}</td><td class="${t.ret>0?'pos':'neg'}">${pct(t.ret,2)}</td></tr>`).join('');
  $$('table.ops th button').forEach(b=>{const s=b.dataset.s;b.parentElement.setAttribute('aria-sort',s===opState.sort?(opState.dir>0?'ascending':'descending'):'none');b.textContent=b.textContent.replace(/ [▲▼]$/,'')+(s===opState.sort?(opState.dir>0?' ▲':' ▼'):'')})}
function selectOp(i,focus,scroll=true){opState.sel=i;eqState.sel=i;$$('#o-body tr').forEach(r=>{const on=+r.dataset.i===i;r.setAttribute('aria-selected',on);r.tabIndex=on?0:-1;if(on){if(scroll)r.scrollIntoView({block:'nearest'});if(focus)r.focus({preventScroll:!scroll})}});
  renderDetail();charts['cv-bars']&&charts['cv-bars'].render();charts['cv-eq']&&charts['cv-eq'].render()}
function renderDetail(){const t=T[opState.sel];if(!t){$('#o-det').innerHTML='<div class="vacio">Sin operaciones.</div>';return}
  $('#o-det').innerHTML=`<div class="dh"><span class="cifra ${t.ret>0?'c-pasa':'c-falla'}">${pct(t.ret,2)}</span><div><div class="tt2">Operación #${t.n} · ${t.ret>0?'ganadora':'perdedora'}</div>
   <span class="mt ${t.oos?'oos':''}" style="margin:0">${t.oos?'PRUEBA HONESTA (fuera de muestra)':'DISEÑO (dentro de muestra)'}</span></div></div>
   <dl class="kv"><dt>Compra</dt><dd>${fd(t.fi)}</dd><dt>Precio de compra</dt><dd>${nf(t.pi,2)}</dd><dt>Venta</dt><dd>${fd(t.fo)}</dd><dt>Precio de venta</dt><dd>${nf(t.po,2)}</dd></dl>
   <dl class="kv"><dt>Movimiento del precio</dt><dd>${pct(t.mov,2)}</dd><dt>Resultado (con costes)</dt><dd class="${t.ret>0?'pos':'neg'}">${pct(t.ret,2)}</dd><dt>Duración</dt><dd>${t.dias!=null?t.dias+' días':'—'}</dd><dt>Puesto</dt><dd>${rank(t)} de ${T.length}</dd></dl>
   <p class="ruta en">Se cumplieron las condiciones de entrada → <b>compra</b> en la apertura del ${fd(t.fi)} → se cumplió la salida → <b>venta</b> en la apertura del ${fd(t.fo)}.</p>
   <p class="ruta av">Coste implícito ≈ ${nf((t.mov-t.ret)*1e4,1)} pb (movimiento − resultado: spread, comisión, deslizamiento y swap de ${t.dias!=null?t.dias:'—'} días).</p>
   <div class="navops"><button type="button" class="btn peq" data-a="prev">${ico('fli')}Anterior</button><button type="button" class="btn peq" data-a="next">Siguiente${ico('fl')}</button><button type="button" class="btn peq prim" data-a="tree">Ver su ruta en el árbol${ico('fl')}</button><button type="button" class="btn peq" data-a="curve">Ver en la curva${ico('fl')}</button></div>`;
  $$('#o-det [data-a]').forEach(b=>b.onclick=()=>{const a=b.dataset.a;if(a==='prev'||a==='next'){const L=opList().map(o=>o.i),p=L.indexOf(opState.sel),q=a==='prev'?p-1:p+1;if(q>=0&&q<L.length)selectOp(L[q])}
    if(a==='tree'){treeOp(opState.sel);go('estrategia')}if(a==='curve'){eqState.range=T[opState.sel].oos?'oos':'all';syncRange();go('backtest')}})}
function wireGo(root){$$('[data-go]',root).forEach(b=>{if(b._g)return;b._g=1;b.addEventListener('click',()=>{if(b.dataset.go==='estrategia'){estState.mode='hoy';renderArbol()}go(b.dataset.go)})})}
