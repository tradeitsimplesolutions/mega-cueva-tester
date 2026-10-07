/* =====================================================================
   E3 · PRUEBA INICIAL — formulario → spec → pseudocódigo
   El objeto `spec` (versión 1) es el contrato con el motor TIS:
   ver README.md · «Contrato de datos · spec».
   ===================================================================== */
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
  costes:{perfil:'darwinex_mt5',spread_pb:1.03,comision_pb_lado:0.01,deslizamiento_pb_lado:3,swap_largo_pct_anual:-5.39,swap_corto_pct_anual:3.07},
  corte:{tipo:'fecha',fecha:'2018-03-08',is_pct:70}
};
const FUENTE_COSTES='Fuente (perfil darwinex_mt5, terminal Darwinex): spread 44 puntos sobre 4.280,42 ≈ 1,03 pb (lectura del 23-09-2026); comisión 0,01 pb/lado y deslizamiento 3 pb/lado = supuestos del perfil; swap −61,5 / +35,0 puntos ≈ −5,39 % / +3,07 % anual (lectura del 06-10-2026).';
const IND=[['precio','Cierre',0],['apertura','Apertura',0],['maximo','Máximo',0],['minimo','Mínimo',0],['sma','SMA',1],['ema','EMA',1],['rsi','RSI',1],['atr','ATR',1],['max_n','Máx. N velas',1],['min_n','Mín. N velas',1],['num','Número',2]];
const CMP=[['>','mayor que'],['<','menor que'],['>=','mayor o igual que'],['<=','menor o igual que'],['cruza_arriba','cruza hacia arriba'],['cruza_abajo','cruza hacia abajo']];
const CMPS={'>':'>','<':'<','>=':'≥','<=':'≤','cruza_arriba':'cruza ↑','cruza_abajo':'cruza ↓'};
const TFN={M5:'vela de 5 minutos',M15:'vela de 15 minutos',H1:'vela horaria',H4:'vela de 4 horas',D1:'vela diaria',W1:'vela semanal'};
const ZN={servidor_gmt3_usdst:'hora servidor GMT+3, DST EE. UU.',utc:'UTC',nueva_york:'hora de Nueva York',madrid:'hora de Madrid'};
let S=JSON.parse(JSON.stringify(DEMO_SPEC)),piFmt='pseudo',piPrev=[];

const getK=(o,k)=>k.split('.').reduce((a,p)=>a==null?a:a[p],o);
function setK(o,k,v){const ps=k.split('.');let a=o;ps.slice(0,-1).forEach(p=>{if(a[p]==null)a[p]={};a=a[p]});a[ps[ps.length-1]]=v}
function opTxt(o){if(!o)return '?';const p=o.periodo;switch(o.tipo){case 'precio':return 'cierre';case 'apertura':return 'apertura';case 'maximo':return 'máximo';case 'minimo':return 'mínimo';
  case 'sma':return `SMA(${p??'?'})`;case 'ema':return `EMA(${p??'?'})`;case 'rsi':return `RSI(${p??'?'})`;case 'atr':return `ATR(${p??'?'})`;case 'max_n':return `máximo de ${p??'?'} velas`;case 'min_n':return `mínimo de ${p??'?'} velas`;
  case 'num':return o.valor==null||o.valor===''?'?':nf(+o.valor,(+o.valor)%1?2:0)}return '?'}
function condTxt(c){return `${opTxt(c.izq)} ${CMPS[c.op]||c.op} ${opTxt(c.der)}`}
function opValido(o){const t=IND.find(x=>x[0]===o.tipo);if(!t)return false;if(t[2]===1)return o.periodo>0&&Number.isFinite(+o.periodo);if(t[2]===2)return o.valor!==''&&o.valor!=null&&Number.isFinite(+o.valor);return true}

/* ---------- bloques ---------- */
function selInd(o,lado){return `<select data-p="tipo" aria-label="${lado==='izq'?'Qué miras':'Con qué lo comparas'}">${IND.filter(x=>lado==='der'||x[0]!=='num').map(([k,l])=>`<option value="${k}"${o.tipo===k?' selected':''}>${l}</option>`).join('')}</select>`}
function operandoHTML(o,lado){const t=IND.find(x=>x[0]===o.tipo)||IND[0];
  const extra=t[2]===1?`<input type="number" data-p="periodo" min="1" step="1" value="${o.periodo??''}" aria-label="Periodo (velas)" title="Periodo (velas)">`:t[2]===2?`<input type="number" data-p="valor" step="any" value="${o.valor??''}" aria-label="Valor" title="Valor">`:'';
  return `<div class="operando${extra?'':' sinp'}" data-lado="${lado}">${selInd(o,lado)}${extra}</div>`}
function renderBloques(){['filtros','entrada','salida'].forEach(g=>{const L=S.reglas[g];
  $('#bl-'+g).innerHTML=L.length?L.map((c,i)=>`<div class="bloque" data-g="${g}" data-i="${i}"><span class="y">${i?'Y':'SI'}</span>${operandoHTML(c.izq,'izq')}
    <select data-p="op" aria-label="Comparador">${CMP.map(([k,l])=>`<option value="${k}"${c.op===k?' selected':''}>${l}</option>`).join('')}</select>${operandoHTML(c.der,'der')}
    <button type="button" class="quita" aria-label="Quitar este bloque" title="Quitar">${ico('ko')}</button></div>`).join(''):`<div class="vacio" style="min-height:0;padding:.6rem">${g==='filtros'?'Sin filtros: la regla puede entrar en cualquier contexto.':g==='entrada'?'Sin condiciones de entrada: añade al menos una.':'Sin condiciones de salida: usa stop, objetivo o tiempo, o añade una.'}</div>`})}
function onBloque(e){const b=e.target.closest('.bloque');if(!b)return;const c=S.reglas[b.dataset.g][+b.dataset.i];
  if(e.type==='click'){if(e.target.closest('.quita')){S.reglas[b.dataset.g].splice(+b.dataset.i,1);renderBloques();actualizarPI()}return}
  const el=e.target,p=el.dataset.p;if(!p)return;
  if(p==='op'){c.op=el.value}else{const lado=el.closest('.operando').dataset.lado,o=c[lado];
    if(p==='tipo'){const t=IND.find(x=>x[0]===el.value);c[lado]={tipo:el.value};if(t[2]===1)c[lado].periodo=o.periodo||(el.value==='sma'||el.value==='ema'?200:14);if(t[2]===2)c[lado].valor=o.valor??50;renderBloques();
      const nb=$(`#bl-${b.dataset.g} .bloque[data-i="${b.dataset.i}"] .operando[data-lado="${lado}"] select`);nb&&nb.focus()}
    else o[p]=el.value===''?null:+el.value}
  actualizarPI()}

/* ---------- formulario simple ---------- */
function rellenarForm(){$$('#pi-form [data-k]').forEach(el=>{const v=getK(S,el.dataset.k);el.value=v==null?'':v});renderBloques();actualizarPI(true)}
function onCampo(e){const el=e.target;if(!el.dataset||!el.dataset.k)return;let v=el.value;if(el.type==='number')v=v===''?null:+v;setK(S,el.dataset.k,v);
  if(el.dataset.k==='costes.perfil'&&v==='darwinex_mt5'){Object.assign(S.costes,JSON.parse(JSON.stringify(DEMO_SPEC.costes)));rellenarForm();return}
  if(el.dataset.k.startsWith('costes.')&&el.dataset.k!=='costes.perfil'&&S.costes.perfil==='darwinex_mt5'){S.costes.perfil='manual';$('#f-perfil').value='manual'}
  actualizarPI()}

/* ---------- pseudocódigo ---------- */
function pseudo(){const s=S,K=t=>`<span class="kw">${t}</span>`,Vv=t=>`<span class="vv">${esc(t)}</span>`,C=t=>`<span class="cm"># ${esc(t)}</span>`,AV=t=>`<span class="av-c"># ¡ojo! ${esc(t)}</span>`;
  const L=[],R=s.reglas,G=s.gestion,dir=s.direccion,ent=dir==='corto'?'VENDER EN CORTO':'COMPRAR',sal=dir==='corto'?'RECOMPRAR (cerrar)':'VENDER (cerrar)';
  const ej=s.ejecucion.momento==='apertura_siguiente'?'en la apertura de la vela siguiente':'al cierre de esa misma vela';
  L.push(C(`${s.nombre||'Mi estrategia'} · ${s.activo.simbolo||'¿activo?'} · ${(TFN[s.temporalidad]||'').replace('vela ','')}`));
  L.push(`${K('PARA CADA')} ${Vv(TFN[s.temporalidad]||'vela')} cerrada  ${C(ZN[s.datos.zona_horaria]||'')}`);
  if(s.datos.zona_horaria!=='servidor_gmt3_usdst')L.push('  '+AV('TIS alinea las velas a la hora del servidor del bróker'));
  L.push('');
  const conds=[...R.filtros.map(c=>[c,'filtro']),...R.entrada.map(c=>[c,''])];
  L.push(`  ${K('SI')} no hay posición`);
  if(!conds.length)L.push('     '+AV('falta al menos una condición de entrada'));
  conds.forEach(([c,t])=>L.push(`     ${K('Y')} ${Vv(condTxt(c))}${t?'   '+C(t):''}`));
  L.push(`  ${K('ENTONCES')} ${K(ent)} ${esc(ej)}`);
  const siz=s.sizing.tipo==='pct_capital'?`${nf(+s.sizing.valor||0,0)} % del capital`:s.sizing.tipo==='riesgo_pct'?`arriesgando ${nf(+s.sizing.valor||0,2)} % hasta el stop`:`${nf(+s.sizing.valor||0,2)} lotes`;
  L.push(`           tamaño: ${Vv(siz)}`);
  if(s.ejecucion.momento!=='apertura_siguiente')L.push('           '+AV('decide con el cierre y entra a ese mismo cierre: mirar el futuro'));
  if(dir==='ambos')L.push('           '+C('y en corto con las condiciones espejo'));
  L.push('');
  const outs=R.salida.map(c=>Vv(condTxt(c)));
  if(G.stop.tipo!=='ninguno')outs.push(Vv(`stop ${G.stop.tipo==='pct'?'−'+nf(+G.stop.valor||0,1)+' %':nf(+G.stop.valor||0,1)+' × ATR'}`));
  if(G.objetivo.tipo!=='ninguno')outs.push(Vv(`objetivo ${G.objetivo.tipo==='pct'?'+'+nf(+G.objetivo.valor||0,1)+' %':nf(+G.objetivo.valor||0,1)+' × ATR'}`));
  if(G.salida_tiempo_velas>0)outs.push(Vv(`han pasado ${G.salida_tiempo_velas} velas`));
  L.push(`  ${K('SI')} hay posición`);
  if(!outs.length)L.push('     '+AV('no hay forma de salir'));
  else if(outs.length===1)L.push(`     ${K('Y')} ${outs[0]}`);
  else{L.push(`     ${K('Y')} ( ${outs[0]}`);outs.slice(1).forEach((o,i)=>L.push(`         ${K('O')} ${o}${i===outs.length-2?' )':''}`))}
  L.push(`  ${K('ENTONCES')} ${K(sal)} ${esc(ej)}`);
  if(G.stop.tipo==='ninguno')L.push('           '+C('sin stop de pérdidas'));
  L.push('');
  const c=s.costes;L.push(`${K('COSTES')}  spread ${Vv(nf(+c.spread_pb||0,2)+' pb')} · comisión ${Vv(nf(+c.comision_pb_lado||0,2)+' pb/lado')} · desliz. ${Vv(nf(+c.deslizamiento_pb_lado||0,1)+' pb/lado')}`);
  L.push(`         swap ${dir==='corto'?'ventas':'compras'} ${Vv(nf(dir==='corto'?+c.swap_corto_pct_anual||0:+c.swap_largo_pct_anual||0,2)+' %/año')}  ${C(c.perfil==='darwinex_mt5'?'perfil darwinex_mt5':'manual')}`);
  const cs=corteFechas();L.push(`${K('PRUEBA')}  diseño ${Vv(fd(s.datos.desde)+' → '+fd(cs.finIS))}`);
  L.push(`         prueba honesta ${Vv(fd(cs.ini)+' → '+fd(s.datos.hasta))}  ${C(cs.pctOOS!=null?nf(cs.pctOOS,0)+' % del histórico':'')}`);
  return L}
function corteFechas(){const s=S,a=ts(s.datos.desde),b=ts(s.datos.hasta);let ini;
  if(s.corte.tipo==='pct'){const p=Math.max(10,Math.min(95,+s.corte.is_pct||70));ini=new Date(a+(b-a)*p/100).toISOString().slice(0,10)}else ini=s.corte.fecha;
  const it=ts(ini),fin=isNaN(it)?null:new Date(it-864e5).toISOString().slice(0,10);const pctOOS=isNaN(a)||isNaN(b)||isNaN(it)||b<=a?null:(b-it)/(b-a)*100;
  return{ini,finIS:fin,pctOOS}}
function specLimpio(){const s=JSON.parse(JSON.stringify(S));const cs=corteFechas();s.corte.fecha_efectiva=cs.ini;return s}
function jsonHTML(){return esc(JSON.stringify(specLimpio(),null,2)).replace(/(&quot;[a-z_]+&quot;):/g,'<span class="kw">$1</span>:')}

/* ---------- checklist ---------- */
function checklist(){const s=S,R=s.reglas,G=s.gestion,c=s.costes,out=[];const ok=(e,t,d)=>out.push({e,t,d});
  ok(s.activo.simbolo&&s.activo.simbolo.trim()?'pasa':'falla','Activo definido',s.activo.simbolo?esc(s.activo.simbolo)+' · '+(TFN[s.temporalidad]||''):'Escribe el símbolo, p. ej. XAUUSD.');
  const a=ts(s.datos.desde),b=ts(s.datos.hasta),anios=(b-a)/(365.25*864e5);
  ok(isNaN(a)||isNaN(b)||b<=a?'falla':anios<5?'aviso':'pasa','Histórico suficiente',isNaN(anios)||b<=a?'Revisa las fechas de los datos.':nf(anios,1)+' años'+(anios<5?': pocos años, probablemente pocas operaciones (se piden ≥ 30 en la prueba).':'.'));
  ok(s.datos.zona_horaria==='servidor_gmt3_usdst'?'pasa':'aviso','Velas en hora del bróker',s.datos.zona_horaria==='servidor_gmt3_usdst'?'Hora del servidor MT5 (paridad).':'Con otra zona las señales caen en otra vela que en MT5.');
  const todas=[...R.filtros,...R.entrada,...R.salida],malas=todas.filter(x=>!opValido(x.izq)||!opValido(x.der)).length;
  ok(R.entrada.length?'pasa':'falla','Regla de entrada',R.entrada.length?R.entrada.length+' condición(es) + '+R.filtros.length+' filtro(s).':'Añade al menos una condición de entrada.');
  ok(malas?'falla':'pasa','Bloques completos',malas?malas+' bloque(s) sin periodo o valor.':'Todos los bloques tienen sus números.');
  const salidas=R.salida.length+(G.stop.tipo!=='ninguno'?1:0)+(G.objetivo.tipo!=='ninguno'?1:0)+(G.salida_tiempo_velas>0?1:0);
  ok(salidas?'pasa':'falla','Forma de salir',salidas?salidas+' forma(s) de cerrar.':'Sin salida la posición no se cerraría nunca.');
  const stopMal=(G.stop.tipo!=='ninguno'&&!(G.stop.valor>0))||(G.objetivo.tipo!=='ninguno'&&!(G.objetivo.valor>0));
  if(stopMal)ok('falla','Stop / objetivo con valor','Has elegido stop u objetivo pero falta su valor.');
  ok(s.ejecucion.momento==='apertura_siguiente'?'pasa':'aviso','Sin mirar el futuro',s.ejecucion.momento==='apertura_siguiente'?'Orden en la apertura siguiente.':'Decidir con el cierre y entrar a ese cierre infla el backtest.');
  const sizMal=!(s.sizing.valor>0)||(s.sizing.tipo==='riesgo_pct'&&G.stop.tipo==='ninguno');
  ok(sizMal?'falla':s.sizing.tipo==='pct_capital'&&s.sizing.valor>100?'aviso':'pasa','Tamaño de posición',sizMal?(s.sizing.tipo==='riesgo_pct'&&G.stop.tipo==='ninguno'?'Arriesgar un % exige un stop.':'Indica el tamaño.'):s.sizing.valor>100&&s.sizing.tipo==='pct_capital'?'Más del 100 %: estás usando apalancamiento.':'Definido.');
  const ct=(+c.spread_pb||0)+(+c.comision_pb_lado||0)+(+c.deslizamiento_pb_lado||0);
  ok(ct>0?(+c.deslizamiento_pb_lado>0?'pasa':'aviso'):'falla','Costes realistas',ct>0?(+c.deslizamiento_pb_lado>0?'Spread, comisión, deslizamiento y swap.':'Sin deslizamiento: en real casi nunca entras al precio exacto.'):'Con costes 0 el backtest miente a tu favor.');
  const cs=corteFechas(),it=ts(cs.ini);
  ok(isNaN(it)||it<=a||it>=b?'falla':cs.pctOOS<20?'aviso':'pasa','Corte diseño / prueba',isNaN(it)||it<=a||it>=b?'La fecha de corte debe caer dentro de los datos.':nf(cs.pctOOS,0)+' % del histórico para la prueba honesta'+(cs.pctOOS<20?': poco para tener ≥ 30 operaciones.':'.'));
  return out}

/* ---------- actualización en vivo ---------- */
function actualizarPI(inicial){const pre=$('#pi-codigo');
  if(piFmt==='pseudo'){const L=pseudo(),txt=L.map(l=>l.replace(/<[^>]+>/g,''));
    pre.innerHTML=L.map((l,i)=>!inicial&&piPrev.length&&piPrev[i]!==txt[i]&&txt[i].trim()?`<span class="nuevo">${l}</span>`:l).join('\n');piPrev=txt;
    if(!RM)setTimeout(()=>$$('.nuevo',pre).forEach(x=>x.classList.add('ya')),700)}
  else pre.innerHTML=jsonHTML();
  const C=checklist(),nok=C.filter(x=>x.e!=='falla').length,mal=C.filter(x=>x.e==='falla').length;
  $('#pi-check').innerHTML=C.map(x=>`<li class="${x.e}">${ico(x.e==='pasa'?'ok':x.e==='falla'?'ko':'aviso')}<span>${esc(x.t)}<small>${x.d}</small></span></li>`).join('');
  $('#pi-cuenta').textContent=nok+' de '+C.length+' listos';
  const btn=$('#pi-correr');btn.disabled=mal>0;btn.title=mal?'Completa lo marcado en rojo':'Corre la Fase 1 (IS/OOS)';
  $('#pi-nota-motor').innerHTML=mal?`Faltan ${mal} punto(s) en rojo para poder correrla.`:typeof window.MCT_MOTOR==='function'?'Motor TIS conectado: se calculará tu especificación.':'Esta versión enseña la Fase 1 de la demo; el motor TIS (Pyodide) calculará tu especificación exacta.';
  const cs=corteFechas();$('#f-corte-vis').innerHTML=cs.pctOOS!=null&&cs.pctOOS>0&&cs.pctOOS<100?`<div class="is" style="width:${100-cs.pctOOS}%">DISEÑO ${yr(S.datos.desde)}–${yr(cs.ini)}</div><div class="oos" style="width:${cs.pctOOS}%">PRUEBA ${nf(cs.pctOOS,0)} %</div>`:'';
  $('#f-corte-f').disabled=S.corte.tipo!=='fecha';$('#f-corte-p').disabled=S.corte.tipo!=='pct';
  $('#f-stop-v').disabled=S.gestion.stop.tipo==='ninguno';$('#f-obj-v').disabled=S.gestion.objetivo.tipo==='ninguno';
  $('#f-costes-fuente').textContent=S.costes.perfil==='darwinex_mt5'?FUENTE_COSTES:'Costes introducidos a mano.';
  store.set('spec',JSON.stringify(S))}

/* ---------- correr ---------- */
/**
 * Gancho del motor real. Recibe el `spec` (versión 1) y debe devolver
 * (o resolver) un JSON con el MISMO formato que datos/oro_rsi4.json,
 * o null si no hay motor. Para conectarlo basta con definir antes de
 * cargar la página (o en cualquier momento):
 *    window.MCT_MOTOR = async (spec) => { ...Pyodide...; return resultados }
 */
async function correrMotor(spec){if(typeof window.MCT_MOTOR==='function')return await window.MCT_MOTOR(spec);return null}
window.correrMotor=correrMotor;
async function correrPI(){const btn=$('#pi-correr');if(btn.disabled)return;btn.disabled=true;const bar=$('#pi-prog'),pasos=['Cargando velas…','Calculando señales…','Aplicando costes…','Separando diseño y prueba…','Midiendo la Fase 1…'];
  for(let i=0;i<pasos.length;i++){$('#pi-nota-motor').textContent=pasos[i];bar.style.width=((i+1)/pasos.length*100)+'%';if(!RM)await new Promise(r=>setTimeout(r,280))}
  let res=null,err=null;try{res=await correrMotor(specLimpio())}catch(e){err=e}
  if(res){const v=validar(res);if(v)err=new Error(v);else cargarResultados(res,{origen:'motor'})}
  btn.disabled=false;bar.style.width='0';actualizarPI();
  mostrarResPI(!!res&&!err,err)}
function mostrarResPI(real,err){const iguales=JSON.stringify(S.reglas)===JSON.stringify(DEMO_SPEC.reglas)&&JSON.stringify(S.costes)===JSON.stringify(DEMO_SPEC.costes);
  const cr=[['pf_oos',OOS.pf>=1.3,'Factor de beneficio',nf(OOS.pf,2),'≥ 1,30','Gana '+nf(OOS.pf,2)+' por cada 1 que pierde en los años guardados.'],
    ['n_oos',OOS.n>=30,'Operaciones en la prueba',OOS.n,'≥ 30','Hay operaciones suficientes para que no sea casualidad.'],
    ['dd_oos',OOS.maxdd<.2,'Caída máxima',pct(-OOS.maxdd,1),'< 20 %','Lo peor que habría que aguantar en la prueba.'],
    ['pf_sin_mejor',OOS.pf_sin_mejor>1,'PF sin la mejor',nf(OOS.pf_sin_mejor,2),'> 1,00','Sigue ganando aunque quites su mejor golpe.']];
  const crit=F1.criterios||{};cr.forEach(c=>{if(crit[c[0]]!=null)c[1]=!!crit[c[0]]});
  const pasa=cr.every(c=>c[1]);
  const aviso=real?`<p class="explica pasa">Resultados calculados por el motor TIS para tu especificación.</p>`:
    `<p class="explica pend"><b>${err?'El motor devolvió un error: '+esc(err.message)+'. ':''}Estos son los resultados de la demo (${esc(M.nombre)}).</b> ${iguales?'Tu especificación coincide con la de la demo.':'Has cambiado la especificación: cuando el motor TIS esté conectado calculará exactamente la tuya; de momento ves los números de la demo.'}</p>`;
  $('#pi-res').innerHTML=`<div class="ph" style="margin:0"><h3 style="font-size:1.8rem"><small>FASE 1</small>Prueba inicial · diseño vs prueba honesta</h3>${sello(pasa?'pasa':'falla',pasa?'Fase 1 superada':'Fase 1 no superada','grande')}</div>
   ${aviso}
   <div class="crit4">${cr.map(c=>`<div class="crit ${c[1]?'':'falla'}"><span class="cn">${c[2]}</span><span class="cv2 ${c[1]?'c-pasa':'c-falla'}">${c[3]}</span><span class="cu">${ico(c[1]?'ok':'ko')} TIS pide ${c[4]}</span><span class="cq en">${c[5]}</span></div>`).join('')}</div>
   <section class="pan pi-eq"><div class="ph"><h3>Capital: diseño y prueba</h3><span class="nota av">IS ${IS.n} op. · PF ${nf(IS.pf,2)} — OOS ${OOS.n} op. · PF ${nf(OOS.pf,2)}</span></div>
     <div class="cv" id="cv-pieq"><canvas role="img" aria-label="Curva de capital con el corte entre diseño y prueba"></canvas><div class="tt"></div></div></section>
   <p class="explica en">${pasa?'Superar la Fase 1 no es aprobar: es ganarse el derecho a las otras cuatro pruebas. ':'Si falla la Fase 1, se descarta o se replantea la idea: no se sigue. '}El protocolo completo está en E6.</p>
   <div style="display:flex;gap:.6rem;flex-wrap:wrap"><button type="button" class="btn" id="pi-volver">${ico('fli')}Editar la prueba</button><button type="button" class="btn prim" data-go="protocolo">Ver todas las pruebas${ico('fl')}</button><button type="button" class="btn" data-go="backtest">Ver el backtest${ico('fl')}</button></div>`;
  $('#pi-form').hidden=true;$('#pi-res').hidden=false;wireGo($('#pi-res'));
  $('#pi-volver').onclick=()=>{$('#pi-res').hidden=true;$('#pi-form').hidden=false;$('#f-nombre').focus()};
  const c=chart('cv-pieq',drawEq,{compact:true});c&&c.render();$('#v-prueba').scrollTop=0;$('#pi-res h3').setAttribute('tabindex','-1');$('#pi-res h3').focus({preventScroll:true})}

function initPI(){try{const g=store.get('spec');if(g){const o=JSON.parse(g);if(o&&o.version===1&&o.reglas)S=o}}catch(e){}
  const f=$('#pi-form');f.addEventListener('input',e=>{if(e.target.closest('.bloque'))onBloque(e);else onCampo(e)});f.addEventListener('change',e=>{if(e.target.closest('.bloque'))onBloque(e);else onCampo(e)});
  f.addEventListener('click',e=>{if(e.target.closest('.bloque .quita'))onBloque(e)});
  $$('[data-add]').forEach(b=>b.onclick=()=>{const g=b.dataset.add;S.reglas[g].push(g==='filtros'?{izq:{tipo:'precio'},op:'>',der:{tipo:'sma',periodo:50}}:{izq:{tipo:'rsi',periodo:14},op:g==='entrada'?'<':'>',der:{tipo:'num',valor:g==='entrada'?30:70}});renderBloques();actualizarPI();
    const L=$$('#bl-'+g+' .bloque');L.length&&$('select',L[L.length-1]).focus()});
  $$('[data-fmt]').forEach(b=>b.onclick=()=>{piFmt=b.dataset.fmt;$$('[data-fmt]').forEach(x=>x.setAttribute('aria-pressed',x===b));piPrev=[];actualizarPI(true)});
  $('#pi-demo').onclick=()=>{S=JSON.parse(JSON.stringify(DEMO_SPEC));piPrev=[];rellenarForm();toast('Restaurada la especificación del oro')};
  $('#pi-vaciar').onclick=()=>{S=JSON.parse(JSON.stringify(DEMO_SPEC));S.nombre='';S.activo.simbolo='';S.reglas={filtros:[],entrada:[],salida:[]};S.costes={perfil:'manual',spread_pb:0,comision_pb_lado:0,deslizamiento_pb_lado:0,swap_largo_pct_anual:0,swap_corto_pct_anual:0};piPrev=[];rellenarForm();$('#f-nombre').focus()};
  $('#pi-copiar').onclick=()=>{const t=$('#pi-codigo').innerText;(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>toast('Copiado'),()=>toast('No se pudo copiar: selecciónalo a mano',1))};
  $('#pi-bajar').onclick=()=>{const b=new Blob([JSON.stringify(specLimpio(),null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='spec_'+(S.activo.simbolo||'estrategia').toLowerCase()+'.json';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)};
  $('#pi-correr').onclick=correrPI;
  rellenarForm()}
