/* =====================================================================
   E6 · PROTOCOLO COMPLETO
   ===================================================================== */
const PR_ORDEN=['F1','F2','F3','F4','F5','PAR'];let prSel=0;
function crit(e,t,u,v){return `<li class="${e}">${ico(e==='pasa'?'ok':e==='falla'?'ko':'pend')}<span>${t}<span class="u">${u}</span></span><span class="v">${v}</span></li>`}
const ee=b=>b?'pasa':'falla';
function detalleFase(id){const Mc=D.mc||{},W=D.wf_res||{},S=D.stress||{},Me=D.meseta,f=FASES.find(x=>x.id===id),e=estFase(id);
  let cr='',graf='',sig='',tec='',titG='';
  if(id==='F1'){const c=F1.criterios||{};
    cr=crit(ee(c.pf_oos??OOS.pf>=1.3),'Factor de beneficio en la prueba','TIS pide ≥ 1,30',nf(OOS.pf,2))+crit(ee(c.n_oos??OOS.n>=30),'Operaciones en la prueba','≥ 30',OOS.n)+
      crit(ee(c.dd_oos??OOS.maxdd<.2),'Caída máxima en la prueba','< 20 %',pct(-OOS.maxdd,1))+crit(ee(c.pf_sin_mejor??OOS.pf_sin_mejor>1),'PF sin la mejor operación','> 1,00',nf(OOS.pf_sin_mejor,2));
    titG='Capital con el corte diseño / prueba';graf=`<div class="cv" id="cv-pdet"><canvas role="img" aria-label="Curva de capital con el corte entre diseño y prueba"></canvas><div class="tt"></div></div>`;
    sig=e==='pasa'?`En los años que no se usaron para diseñarla (${yr(D.split)}–${yr(D.hasta)}) gana <b>${nf(OOS.pf,2)}</b> por cada 1 que pierde, incluso algo mejor que en el diseño (${nf(IS.pf,2)}). Buena señal: no estaba aprendida de memoria.`:'En la parte guardada no cumple los mínimos: la ventaja del diseño no se repite con datos nuevos.';
    tec=`Corte ${fd(D.split)} · IS ${IS.n} op., PF ${nf(IS.pf,2)}, MaxDD ${pct(IS.maxdd,1,false)} · OOS ${OOS.n} op., PF ${nf(OOS.pf,2)}, MaxDD ${pct(OOS.maxdd,1,false)}, CAGR ${pct(OOS.cagr,1)}, Sharpe ${nf(OOS.sharpe,2)}. Frontera (PF 1,25–1,35): ${F1.frontera?'sí → decisión de Mariel':'no'}.`}
  if(id==='F2'){const c=W.criterios||{};
    cr=W.eficiencia==null?'':crit(ee(c.eficiencia??W.eficiencia>=.5),'<span class="term" data-t="ef">Eficiencia</span>','≥ 0,50',nf(W.eficiencia,2))+crit(ee(c.pct_positivas??W.pct_positivas>=.6),'Años de prueba en positivo','≥ 60 %',Math.round(W.pct_positivas*W.n_ventanas)+' de '+W.n_ventanas)+
      crit(ee(c.dd_ventanas??W.peor_dd<.2),'Peor caída en un año de prueba','< 20 %',pct(-W.peor_dd,1));
    titG='Resultado de cada año de prueba';graf=D.wf?`<div class="cv" id="cv-pdet"><canvas role="img" aria-label="Resultado de cada ventana walk-forward"></canvas><div class="tt"></div></div>`:'<div class="vacio">Sin ventanas walk-forward en el JSON.</div>';
    sig=W.eficiencia==null?'':`Reajustándola cada año y probándola en el siguiente, conserva el <b>${nf(W.eficiencia*100,0)} %</b> de lo que rinde al ajustar y gana en <b>${Math.round(W.pct_positivas*W.n_ventanas)} de ${W.n_ventanas}</b> años. ${e==='pasa'?'Justo por encima del mínimo: aguanta, sin sobrar.':'No aguanta el uso continuado.'}`;
    tec=W.eficiencia==null?'':`${W.n_ventanas} ventanas (IS 3a / OOS 1a, deslizante) · rend. anual medio IS ${pct(W.is_ret_anual_medio,1)} vs OOS ${pct(W.oos_ret_anual_medio,1)} · peor DD de ventana ${pct(W.peor_dd,1,false)}.`}
  if(id==='F3'&&Me){const c=Me.crit||{},ce=centro(Me),nb=vecinos(Me),k=Object.keys(Me.ejes),pc=Me.pf[ce][ce],peor=Math.min(...nb),caida=1-peor/pc;
    cr=crit(ee(c['centro_pf>1']),'PF de los números elegidos','> 1',nf(pc,2))+crit(ee(c.meseta_3x3_completa),'Rejilla 3 × 3 completa','sin huecos',c.meseta_3x3_completa?'sí':'no')+
      crit(ee(c.vecinos_dentro_20pct),'Vecinos parecidos','dentro de ± 20 %',nf(Math.min(...nb),2)+'–'+nf(Math.max(...nb),2))+crit(ee(c.anti_cliff_30pct),'Sin precipicios','ningún vecino cae > 30 %','peor −'+nf(caida*100,0)+' %');
    const mx=Math.max(...Me.pf.flat()),mn=Math.min(...Me.pf.flat());
    let ht=`<table class="heat" aria-label="Factor de beneficio por combinación de parámetros"><tr><th>${esc(k[0])} ↓ · ${esc(k[1])} →</th>${Me.ejes[k[1]].map(s=>`<th>${s}</th>`).join('')}</tr>`;
    Me.pf.forEach((row,i)=>{ht+=`<tr><th>${Me.ejes[k[0]][i]}</th>`+row.map((v,j)=>{const isC=i===ce&&j===ce,isV=Math.abs(i-ce)<=1&&Math.abs(j-ce)<=1&&!isC;
      const a=(v-1)/(mx-1||1);const bg=v<1.1?`rgba(${css('--falla-rgb')},${(.22+.4*Math.min(1,(1.1-v)/.3)).toFixed(2)})`:`rgba(${css('--pasa-rgb')},${(.1+.55*Math.max(0,a)).toFixed(2)})`;
      return `<td class="${isC?'c':isV?'vec':''}" style="background:${bg}" title="${esc(k[0])} ${Me.ejes[k[0]][i]} · ${esc(k[1])} ${Me.ejes[k[1]][j]}: PF ${nf(v,2)}">${nf(v,2)}</td>`}).join('')+'</tr>'});ht+='</table>';
    titG='PF de cada combinación de números';graf=ht;
    sig=`El recuadro amarillo son los números elegidos (${esc(k[0])} ${Me.ejes[k[0]][ce]}, ${esc(k[1])} ${Me.ejes[k[1]][ce]}). ${e==='pasa'?'Sus vecinos rinden parecido: es una meseta.':`Moviendo un paso, el PF cae hasta <b>${nf(peor,2)}</b> (−${nf(caida*100,0)} %): el resultado depende demasiado de haber elegido esos números exactos.`}`;
    tec=`Métrica: PF ${'IS'} en rejilla ${Me.pf.length}×${Me.pf[0].length}; ${nf((Me.pct||0)*100,0)} % de celdas con PF > 1. Vecinos ±1 paso (borde blanco). Tolerancia 20 %, anti-cliff 30 % [calibrable].`}
  if(id==='F3'&&!Me){graf='<div class="vacio">Sin rejilla de parámetros en el JSON.</div>'}
  if(id==='F4'){if(Mc.p95dd!=null){cr=crit(ee(Mc.p5>0),'Peor 5 % de los retornos','> 0',pct(Mc.p5,1))+crit(ee(Mc.p95dd<.25),'Caída en el peor 5 % de los caminos','< 25 %',pct(-Mc.p95dd,1))+crit(ee(Mc.ruina<.05),'Probabilidad de perder la mitad','< 5 %',pct(Mc.ruina,1,false));
    titG='Retorno total en miles de caminos posibles';graf=`<div class="cv" id="cv-pdet"><canvas role="img" aria-label="Histograma de retornos simulados"></canvas><div class="tt"></div></div>
      <div class="sbar" style="margin-top:1.2rem"><span>Caída · peor 5 %</span><span class="tr"><i style="width:${Math.min(100,Mc.p95dd/.4*100)}%;background:${Mc.p95dd<.25?'var(--pasa)':'var(--falla)'}"></i><u style="left:${.25/.4*100}%"></u><em style="left:${.25/.4*100}%">límite 25 %</em></span><span>${pct(Mc.p95dd,1,false)}</span></div>
      <div class="sbar"><span>Caída · mediana</span><span class="tr"><i style="width:${Math.min(100,(Mc.p50dd||0)/.4*100)}%;background:var(--caliza-3)"></i><u style="left:${.25/.4*100}%"></u></span><span>${pct(Mc.p50dd,1,false)}</span></div>`;
    sig=`Barajando las mismas operaciones, en la mayoría de caminos gana (mediana ${pct(Mc.p50,0)}) y casi nunca pierde dinero. ${Mc.p95dd<.25?'Y la caída se mantiene bajo el límite.':`Pero en 1 de cada 20 caminos la caída llega al <b>${pct(Mc.p95dd,1,false)}</b>: más de lo que TIS acepta (25 %). Al 100 % del capital, habría que aguantar ese agujero.`}`;
    tec=`${esc(Mc.nota||'5.000 simulaciones')}. p5 retorno ${pct(Mc.p5,1)} · p50 ${pct(Mc.p50,1)} · p50 MaxDD ${pct(Mc.p50dd,1,false)} · p95 MaxDD ${pct(Mc.p95dd,1,false)} · P(ruina 50 %) ${pct(Mc.ruina,1,false)}.`}else graf='<div class="vacio">Sin Monte Carlo en el JSON.</div>'}
  if(id==='F5'){const sc=[['costes_x2','Costes ×2'],['sin_2_mejores_anios','Sin los 2 mejores años'],['regimen_malo','Régimen malo']].filter(x=>S[x[0]]);
    cr=sc.map(([k,l])=>crit(ee(S[k].pasa),l,esc(S[k].nota||'PF ≥ 1,10 y caída < 25 %'),'PF '+nf(S[k].pf,2)+' · '+pct(-S[k].dd,1))).join('');
    const mx=Math.max(2,OOS.pf*1.1);
    titG='PF en cada escenario adverso';graf=sc.length?`<div style="align-self:center;padding:1.4rem .2rem 0">${[['Sin tocar (prueba)',{pf:OOS.pf,pasa:true},true],...sc.map(([k,l])=>[l,S[k]])].map(([l,o,base])=>`<div class="sbar"><span>${l}</span><span class="tr"><i style="width:${Math.min(100,o.pf/mx*100)}%;background:${base?'var(--caliza-3)':o.pf>=1.1?'var(--pasa)':'var(--falla)'}"></i><u style="left:${1.1/mx*100}%"></u>${base?`<em style="left:${1.1/mx*100}%">mínimo 1,10</em>`:''}</span><span>${nf(o.pf,2)}</span></div>`).join('')}
      ${S.regimen_malo?`<p class="c-dim2" style="font-size:.9rem;margin:.8rem 0 0">Régimen malo: PF ${nf(S.regimen_malo.pf,2)} con solo ${S.regimen_malo.n} operaciones: ${S.regimen_malo.pasa?'apenas opera en ese tramo y su caída es pequeña, así que cuenta como superado.':'se derrumba.'}</p>`:''}</div>`:'<div class="vacio">Sin escenarios de stress en el JSON.</div>';
    sig=S.costes_x2?`Con costes dobles sigue ganando (PF ${nf(S.costes_x2.pf,2)}), y quitando sus 2 mejores años también (${nf(S.sin_2_mejores_anios&&S.sin_2_mejores_anios.pf,2)}). ${e==='pasa'?'Sale tocada pero viva: la ventaja no es solo de costes ni de un par de años buenos.':'Algún escenario la tumba.'}`:'';
    tec=sc.map(([k,l])=>`${l}: PF ${nf(S[k].pf,2)}, MaxDD ${pct(S[k].dd,1,false)}, ${S[k].n} op.`).join(' · ')}
  if(id==='PAR'){const ep=estParidad();
    const paso=(n,e,t,d)=>`<div class="paso-par"><span class="i ${e}">${n}</span><div><h4>${t}</h4><p>${d}</p></div>${sello(e)}</div>`;
    cr=crit(P.zona.estado,'Velas en hora del servidor','GMT+3 con DST de EE. UU.',EST[P.zona.estado].t)+crit(P.costes.estado,'Costes reales del bróker','spread · comisión · swap',EST[P.costes.estado].t)+crit(ep,'Reconciliación con el Strategy Tester','± 2 % y mismo nº de operaciones',RECON?RECON.res:EST[ep].t);
    titG='Los tres pasos de la paridad';
    graf=`<div>${paso(1,P.zona.estado,'Hora del servidor',esc(P.zona.txt))}${paso(2,P.costes.estado,'Costes del terminal',esc(P.costes.txt))}${paso(3,ep,'Reconciliación con el Strategy Tester',RECON?RECON.txt:esc(P.reconciliacion.txt||''))}
      <div class="subida" id="p-subida" style="margin-top:1rem"><b>${RECON?'Sube otro informe':'Sube tu informe del Strategy Tester'}</b><span class="c-dim" style="font-size:.92rem">Informe de MT5 guardado como HTML (o CSV). Se lee en tu navegador; no se envía a ningún sitio. Comprueba que el periodo y el símbolo son los mismos que en el backtest.</span>
      <button type="button" class="btn" id="p-subir">${ico('subir')}Elegir informe…</button><input type="file" id="f-st" accept=".htm,.html,.csv,.txt" class="sr" tabindex="-1" aria-hidden="true"></div></div>`;
    sig=ep==='pend'?'La hora y los costes ya se modelan como en MetaTrader. Falta la prueba final: correr el mismo periodo en el Strategy Tester de MT5 con el robot real y comprobar que salen las mismas operaciones. Hasta entonces, ninguna estrategia está validada.':ep==='pasa'?'El Strategy Tester y el backtest cuadran: es el mismo sistema.':'El Strategy Tester y el backtest no cuadran: casi siempre es la zona horaria, los costes o el tipo de orden. Hay que investigarlo antes de seguir.';
    tec='Criterio: equity y PnL total dentro de ±2 % [calibrable] y nº de operaciones exacto. La lectura del informe aquí es orientativa: compara nº de operaciones y beneficio neto / depósito inicial con el backtest completo.'}
  return{f,e,cr,graf,sig,tec,titG}}
function renderProtocolo(){const V=veredictoGlobal(),fl=fallidas(),ep=estParidad();
  $('#p-head').innerHTML=`<span class="en">Cada prueba intenta romper la estrategia de una forma distinta. ${V.e==='pasa'?'Esta las supera todas.':`Esta supera <b>${nPass} de 5</b>${fl.length?' y falla '+fl.map(k=>NOMF[k].toLowerCase()).join(' y '):''}.`}</span><span class="av">${nPass}/5 fases · ${fl.length?'fallan '+fl.join(', '):'todas superadas'} · paridad MT5 ${EST[ep].t.toLowerCase()}.</span>`;
  $('#p-global').innerHTML=`<div style="display:flex;align-items:flex-end;gap:1rem;flex-wrap:wrap"><span class="cifra ${V.e==='pasa'?'c-pasa':V.e==='pend'?'c-pend':'c-falla'}">${nPass}/5</span>${sello(V.e,V.t,'grande')}</div>
    <p>${V.e==='pasa'?'Supera las 5 fases y cuadra con MetaTrader.':V.e==='pend'?'Supera las 5 fases; falta reconciliar con el Strategy Tester.':`<b>No está lista para dinero real.</b> ${D.verdict?`<span class="av"><br>${esc(D.verdict)}</span>`:''}`}</p><div class="pista">${pistaHTML()}</div>`;
  $('#p-lista').innerHTML=PR_ORDEN.map((id,i)=>{const f=FASES.find(x=>x.id===id),e=estFase(id);return `<button type="button" class="pf ${e}" role="tab" id="pt-${id}" aria-selected="${i===prSel}" aria-controls="p-det" tabindex="${i===prSel?0:-1}" data-i="${i}">
    <span class="c">${id==='PAR'?'MT5':id}</span><span class="n">${esc(f.nombre)}<small>${esc(f.preg)}</small></span>${sello(e)}</button>`}).join('');
  $$('#p-lista .pf').forEach(b=>{b.onclick=()=>selPr(+b.dataset.i);b.onkeydown=e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();e.stopPropagation();const n=(+b.dataset.i+(e.key==='ArrowDown'?1:-1)+PR_ORDEN.length)%PR_ORDEN.length;selPr(n);$('#pt-'+PR_ORDEN[n]).focus()}}});
  renderPrDet()}
function selPr(i){prSel=i;$$('#p-lista .pf').forEach((b,k)=>{b.setAttribute('aria-selected',k===i);b.tabIndex=k===i?0:-1});renderPrDet()}
function renderPrDet(){const id=PR_ORDEN[prSel],x=detalleFase(id),el=$('#p-det');el.setAttribute('aria-labelledby','pt-'+id);
  el.innerHTML=`<div class="cab"><div><div class="cod">${esc(x.f.cod)}${id.startsWith('F')?' de 5':''} · ${esc(NOMF[id])}</div><h3>${esc(x.f.nombre)}</h3><p class="preg">${esc(x.f.preg)}</p></div>${sello(x.e,null,'grande')}</div>
   <div class="pr-graf"><div class="ph" style="margin:0"><h3 style="font-size:1.15rem">${esc(x.titG)}</h3></div>${x.graf}</div>
   <div class="pr-info"><div><p class="rot">Criterios TIS</p><ul class="crits">${x.cr||'<li><span></span><span class="c-dim2">Sin datos para esta prueba.</span><span></span></li>'}</ul></div>
     ${x.sig?`<div class="en"><p class="rot">Qué significa</p><p class="explica ${x.e}">${x.sig}</p></div>`:''}
     <div class="${x.sig?'av':''}"><p class="rot">Detalle técnico</p><p style="margin:0;font-size:.95rem;color:var(--caliza-2)">${x.tec||esc(x.f.av)}</p></div>
     <div class="av"><p class="rot">Así suele fallar</p><p style="margin:0;font-size:.95rem;color:var(--caliza-2)">${esc(x.f.falla)}</p></div>
     <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:auto"><button type="button" class="btn peq" data-pr="-1" ${prSel===0?'disabled':''}>${ico('fli')}Anterior</button><button type="button" class="btn peq" data-pr="1" ${prSel===PR_ORDEN.length-1?'disabled':''}>Siguiente prueba${ico('fl')}</button></div></div>`;
  $$('#p-det [data-pr]').forEach(b=>b.onclick=()=>selPr(Math.max(0,Math.min(PR_ORDEN.length-1,prSel+ +b.dataset.pr))));
  if($('#cv-pdet')){const fn=id==='F1'?drawEq:id==='F2'?drawWF:drawMC;chart('cv-pdet',fn,id==='F1'?{compact:true}:{})}
  if(id==='PAR'){$('#p-subir').onclick=()=>$('#f-st').click();$('#f-st').onchange=e=>{const f=e.target.files[0];if(f)leerInforme(f);e.target.value=''};
    const z=$('#p-subida');['dragover','dragenter'].forEach(t=>z.addEventListener(t,e=>{e.preventDefault();e.stopPropagation();z.classList.add('sobre-z')}));['dragleave','drop'].forEach(t=>z.addEventListener(t,()=>z.classList.remove('sobre-z')));
    z.addEventListener('drop',e=>{e.preventDefault();e.stopPropagation();const f=e.dataTransfer.files[0];if(f)leerInforme(f)})}
  wireTerms(el)}

/* ---------- lectura orientativa del informe del Strategy Tester ---------- */
function leerInforme(file){const r=new FileReader();r.onload=()=>{const buf=new Uint8Array(r.result);let txt;
    if((buf[0]===0xFF&&buf[1]===0xFE)||(buf[1]===0&&buf[3]===0))txt=new TextDecoder('utf-16le').decode(buf);else txt=new TextDecoder('utf-8').decode(buf);
    txt=txt.replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ');
    const num=s=>{if(s==null)return null;let t=s.replace(/\s/g,'');if(/,\d{1,2}$/.test(t))t=t.replace(/\./g,'').replace(',','.');else t=t.replace(/,/g,'');const v=parseFloat(t);return isNaN(v)?null:v};
    const pick=re=>{const m=txt.match(re);return m?num(m[1]):null};
    const n=pick(/(?:Total Trades|Total de (?:operaciones|transacciones)|Operaciones totales)\s*:?\s*([\d\s.,]+)/i);
    const net=pick(/(?:Total Net Profit|Beneficio neto total|Beneficio Neto Total)\s*:?\s*(-?[\d\s.,]+)/i);
    const dep=pick(/(?:Initial Deposit|Dep[oó]sito inicial)\s*:?\s*([\d\s.,]+)/i);
    if(n==null){toast('No encuentro el nº de operaciones en ese informe. ¿Es el informe del Strategy Tester de MT5?',1);return}
    const retMT=net!=null&&dep?net/dep:null,dif=retMT!=null?Math.abs((1+retMT)-(1+FULL.ret_total))/(1+FULL.ret_total):null;
    const okN=n===FULL.n,okR=dif!=null&&dif<=.02;
    RECON={ok:okN&&okR,res:(okN&&okR?'Cuadra':'No cuadra'),txt:`Informe «${esc(file.name)}»: <b>${n}</b> operaciones en MT5 frente a <b>${FULL.n}</b> del backtest (${okN?'iguales':'distintas'})`+
      (retMT!=null?`; resultado ${pct(retMT,1)} en MT5 frente a ${pct(FULL.ret_total,1)} (diferencia de capital ${nf(dif*100,1)} %, límite 2 %).`:'; no encuentro beneficio neto y depósito inicial para comparar el resultado.')};
    renderTodoParidad();toast(RECON.ok?'Reconciliación: cuadra':'Reconciliación: no cuadra')};
  r.onerror=()=>toast('No se pudo leer el fichero',1);r.readAsArrayBuffer(file)}
function renderTodoParidad(){renderEstado();renderProtocolo();renderGaleria();renderResumen()}

/* =====================================================================
   NAVEGACIÓN, NIVEL, TEMA, PRESENTACIÓN
   ===================================================================== */
const VIEWS=[['fases','Las fases','E0'],['resumen','Resumen','E1'],['estrategia','Estrategia','E2'],['prueba','Prueba inicial','E3'],['backtest','Backtest','E4'],['operaciones','Operaciones','E5'],['protocolo','Protocolo','E6']];
let cur=0;
function go(v){const i=typeof v==='number'?v:VIEWS.findIndex(x=>x[0]===v);if(i<0||i>=VIEWS.length)return;cur=i;hideTip();
  VIEWS.forEach(([n],k)=>{$('#v-'+n).classList.toggle('on',k===i);const t=$('#t-'+n);t.setAttribute('aria-selected',k===i);t.tabIndex=k===i?0:-1;if(k===i)t.classList.add('visto')});
  $('#pp-pos').textContent=VIEWS[i][2]+' · '+VIEWS[i][1];
  try{history.replaceState(null,'','#'+VIEWS[i][0])}catch(e){}
  $('#v-'+VIEWS[i][0]).scrollTop=0;
  requestAnimationFrame(()=>Object.values(charts).forEach(c=>c.render()))}
function setNivel(n){document.body.dataset.nivel=n;$$('#nivel button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.n===n));store.set('nivel',n);hideTip();requestAnimationFrame(()=>Object.values(charts).forEach(c=>c.render()))}
function setTema(t){document.documentElement.dataset.theme=t;store.set('tema',t);setTimeout(()=>{Object.values(charts).forEach(c=>c.render());renderArbol();if(PR_ORDEN[prSel]==='F3')renderPrDet();renderGaleria()},20)}
function setPres(on){document.body.classList.toggle('pres',on);const b=$('#b-pres');b.innerHTML=on?`${ico('stop')}<span class="tx">Salir (Esc)</span>`:`${ico('play')}<span class="tx">Presentar</span>`;b.setAttribute('aria-pressed',on);
  document.documentElement.style.setProperty('--fs',on?(innerWidth>=1800?'1.14':'1.06'):'1');
  if(on){toast('Modo presentación · → avanza · Esc sale');if(document.documentElement.requestFullscreen&&!document.fullscreenElement&&innerWidth<1900){}}
  setTimeout(()=>{Object.values(charts).forEach(c=>c.render());renderArbol()},60)}
function avanzar(d){const pres=document.body.classList.contains('pres'),v=VIEWS[cur][0];
  if(pres&&v==='fases'){const n=galSel+d;if(n>=0&&n<FASES.length){selGal(n);return}}
  if(pres&&v==='protocolo'){const n=prSel+d;if(n>=0&&n<PR_ORDEN.length){selPr(n);return}}
  const n=Math.max(0,Math.min(VIEWS.length-1,cur+d));if(n===cur)return;
  if(pres&&VIEWS[n][0]==='fases')selGal(d>0?0:FASES.length-1);if(pres&&VIEWS[n][0]==='protocolo')selPr(d>0?0:PR_ORDEN.length-1);go(n)}
let tto;function toast(m,err){const t=$('#toast');t.textContent=m;t.className='toast'+(err?' err':'');t.style.display='block';clearTimeout(tto);tto=setTimeout(()=>t.style.display='none',err?4200:2600)}
function openDlg(id){const o=$('#'+id);o.classList.add('on');o._ret=document.activeElement;($('[data-close]',o)||o).focus()}
function closeDlg(){$$('.ovl.on').forEach(o=>{o.classList.remove('on');o._ret&&o._ret.focus&&o._ret.focus()})}

/* =====================================================================
   CARGA DE RESULTADOS (contrato público)
   ===================================================================== */
function renderEstado(){$('#st-tag').textContent=ES_DEMO?'Demo':'Cargado';$('#st-tag').className='tag'+(ES_DEMO?' demo':'');
  $('#st-nombre').textContent=M.nombre;$('#st-desc').textContent=[M.activo,M.tf,yr(D.desde)+'–'+yr(D.hasta),FULL.n+' operaciones'].filter(Boolean).join(' · ');
  $('#st-pista').innerHTML=pistaHTML()}
function renderTodo(){renderEstado();renderIntro();renderResumen();renderEstrategia();renderBacktest();renderOps();renderProtocolo();
  chart('cv-eqmini',drawEq,{compact:true});chart('cv-eq',drawEq);chart('cv-anual',drawAnual);chart('cv-bars',drawOps,{click:true});
  if(!$('#pi-res').hidden){$('#pi-res').hidden=true;$('#pi-form').hidden=false}
  wireTerms();wireGo(document);requestAnimationFrame(()=>Object.values(charts).forEach(c=>c.render()))}
/**
 * cargarResultados(json[, {demo}]) — punto de entrada único para pintar
 * resultados del motor TIS. Formato: el de datos/oro_rsi4.json
 * (obligatorios: f1, full, fases, eq, dd, trades; el resto opcional).
 * Opcionales extra: meta {nombre, activo, tf, lema, origen, osc{nombre,compra,venta}, media},
 * paridad {zona, costes, reconciliacion: {estado:'pasa'|'falla'|'pend', txt}}.
 */
function cargarResultados(json,opt={}){const err=validar(json);if(err){toast('No se puede cargar: '+err,1);return false}
  ES_DEMO=!!opt.demo;eqState.sel=null;eqState.range='all';opState.filter='all';opState.sort='n';opState.dir=-1;estState.mode='hoy';prSel=0;
  preparar(JSON.parse(JSON.stringify(json)));renderTodo();
  if(!opt.demo)toast('Resultados cargados: '+M.nombre);return true}
window.cargarResultados=cargarResultados;
function leerJSON(file){const r=new FileReader();r.onload=()=>{let j;try{j=JSON.parse(r.result)}catch(e){toast('El fichero no es un JSON válido',1);return}cargarResultados(j)};r.onerror=()=>toast('No se pudo leer el fichero',1);r.readAsText(file)}

/* =====================================================================
   ARRANQUE
   ===================================================================== */
function init(){
  $('#travesia').innerHTML=VIEWS.map(([k,l,c])=>`<button type="button" class="est" role="tab" id="t-${k}" aria-controls="v-${k}" data-v="${k}"><span class="mk"><svg viewBox="-13 -13 26 26" aria-hidden="true"><circle r="10"/><path d="M-6 0H6M0-6V6"/></svg></span><span class="k">${c}</span><span class="n">${l}</span></button>`).join('');
  $$('.est').forEach((t,i)=>{t.onclick=()=>go(i);t.onkeydown=e=>{if(['ArrowDown','ArrowUp','ArrowRight','ArrowLeft'].includes(e.key)){e.preventDefault();e.stopPropagation();const n=(i+(e.key==='ArrowDown'||e.key==='ArrowRight'?1:-1)+VIEWS.length)%VIEWS.length;go(n);$$('.est')[n].focus()}}});
  $$('#nivel button').forEach(b=>b.onclick=()=>setNivel(b.dataset.n));
  $('#b-tema').onclick=()=>setTema(document.documentElement.dataset.theme==='claro'?'oscuro':'claro');
  $('#b-pres').onclick=()=>setPres(!document.body.classList.contains('pres'));
  $('#b-ayuda').onclick=()=>openDlg('ayuda');
  $('#b-cargar').onclick=()=>$('#f-json').click();$('#f-json').onchange=e=>{const f=e.target.files[0];if(f)leerJSON(f);e.target.value=''};
  window.addEventListener('dragover',e=>e.preventDefault());window.addEventListener('drop',e=>{e.preventDefault();const f=e.dataTransfer&&e.dataTransfer.files[0];if(f&&/\.json$/i.test(f.name))leerJSON(f)});
  $$('[data-close]').forEach(b=>b.onclick=closeDlg);$$('.ovl').forEach(o=>o.addEventListener('click',e=>{if(e.target===o)closeDlg()}));
  document.addEventListener('click',e=>{if(!e.target.closest('.term'))hideTip()});
  // estrategia
  $('#e-hoy').onclick=()=>{estState.mode='hoy';renderArbol()};$('#e-op').onclick=()=>treeOp(estState.op);
  $('#e-prev').onclick=()=>treeOp(estState.op-1);$('#e-next').onclick=()=>treeOp(estState.op+1);
  // backtest
  $('#b-ops').onclick=()=>{eqState.ops=!eqState.ops;$('#b-ops').setAttribute('aria-pressed',eqState.ops);charts['cv-eq'].render()};
  $('#cv-eq canvas').addEventListener('click',()=>{const c=charts['cv-eq'];if(c.hovT){opState.filter='all';syncFilt();renderTable();selectOp(T.indexOf(c.hovT));go('operaciones')}});
  $('#cv-eqmini').addEventListener('click',()=>go('backtest'));
  // operaciones
  $('#o-body').addEventListener('click',e=>{const r=e.target.closest('tr');if(r)selectOp(+r.dataset.i,true,false)});
  $('#o-body').addEventListener('keydown',e=>{if(!['ArrowDown','ArrowUp','Home','End'].includes(e.key))return;e.preventDefault();e.stopPropagation();
    const L=opList().map(o=>o.i);let p=L.indexOf(opState.sel);p=e.key==='ArrowDown'?p+1:e.key==='ArrowUp'?p-1:e.key==='Home'?0:L.length-1;if(p>=0&&p<L.length)selectOp(L[p],true)});
  $$('table.ops th button').forEach(b=>b.onclick=()=>{const s=b.dataset.s;if(opState.sort===s)opState.dir*=-1;else{opState.sort=s;opState.dir=-1}renderTable();selectOp(opState.sel)});
  $('#cv-bars canvas').addEventListener('click',()=>{const c=charts['cv-bars'];if(c&&c.hv>=0){if(!opList().some(o=>o.i===c.hv)){opState.filter='all';syncFilt();renderTable()}selectOp(c.hv)}});
  // teclado global
  document.addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey)return;const tag=(e.target.tagName||'').toLowerCase();if(['input','select','textarea'].includes(tag))return;
    const dlg=$('.ovl.on');if(e.key==='Escape'){if(dlg){closeDlg();return}if(tip().style.display==='block'){hideTip();return}if(document.body.classList.contains('pres'))setPres(false);return}
    if(dlg)return;const pres=document.body.classList.contains('pres');
    if(e.key==='ArrowRight'||e.key==='PageDown'||(e.key===' '&&pres&&tag!=='button')){e.preventDefault();avanzar(1)}
    else if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();avanzar(-1)}
    else if(/^[0-6]$/.test(e.key))go(+e.key);
    else if(e.key==='p'||e.key==='P')setPres(!pres);
    else if(e.key==='n'||e.key==='N')setNivel(document.body.dataset.nivel==='entender'?'avanzado':'entender');
    else if(e.key==='?'||e.key==='h'||e.key==='H')openDlg('ayuda');
    else if(e.key==='Home')go(0)});
  const tema=store.get('tema');if(tema)document.documentElement.dataset.theme=tema;
  setNivel(store.get('nivel')||'entender');
  cargarResultados(DEMO_DATOS,{demo:true});
  initPI();wireTerms();
  const h=(location.hash||'').slice(1),i=VIEWS.findIndex(x=>x[0]===h);go(i>=0?i:0);
  (document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(()=>{Object.values(charts).forEach(c=>c.render());renderArbol();renderGaleria()});
}
window.addEventListener('hashchange',()=>{const i=VIEWS.findIndex(x=>x[0]===(location.hash||'').slice(1));if(i>=0&&i!==cur)go(i)});
init();
