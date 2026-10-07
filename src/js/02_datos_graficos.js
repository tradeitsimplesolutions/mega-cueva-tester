/* ---------- carga y derivados ---------- */
const REQ=['f1','full','fases','eq','dd','trades'];
function validar(j){if(!j||typeof j!=='object')return 'El fichero no es un objeto JSON.';
  const f=REQ.filter(k=>!(k in j));if(f.length)return 'Faltan campos obligatorios: '+f.join(', ')+'.';
  if(!j.f1.IS||!j.f1.OOS)return 'f1 debe traer IS y OOS.';
  if(!Array.isArray(j.eq)||!j.eq.length)return 'eq debe ser una lista [fecha, capital].';
  if(!Array.isArray(j.trades))return 'trades debe ser una lista.';return null}
function preparar(j){
  D=j;T=D.trades.map((t,i)=>Object.assign({},t,{n:t.n!=null?t.n:i+1}));F1=D.f1;IS=F1.IS;OOS=F1.OOS;FULL=D.full;E=D.estado||null;U=T[T.length-1]||null;
  D.split=D.split||F1.fecha_split;splitT=ts(D.split);
  eqT=D.eq.map(p=>ts(p[0]));eqV=D.eq.map(p=>p[1]*100);
  D.dd=D.dd&&D.dd.length===D.eq.length?D.dd:(()=>{let mx=-1e9;return eqV.map(v=>{mx=Math.max(mx,v);return v/mx-1})})();
  D.desde=D.desde||D.eq[0][0];D.hasta=D.hasta||D.eq[D.eq.length-1][0];
  T.forEach(t=>{t.ei=idxAt(ts(t.fo));if(t.oos==null)t.oos=ts(t.fi)>=splitT});
  if(!D.anual){const m={};T.forEach(t=>{const y=+yr(t.fo);m[y]=m[y]||{y,n:0,ret:1};m[y].n++;m[y].ret*=1+t.ret});D.anual=Object.values(m).map(a=>({y:a.y,n:a.n,ret:a.ret-1}))}
  nPass=['F1','F2','F3','F4','F5'].filter(k=>D.fases[k]).length;
  M=D.meta?Object.assign({},D.meta):(ES_DEMO?Object.assign({},DEMO_META):{});
  M.nombre=M.nombre||'Resultados cargados';M.titulo_html=M.titulo_html||esc(M.nombre);M.activo=M.activo||'';M.tf=M.tf||'';
  P=D.paridad||(ES_DEMO?DEMO_PARIDAD:{zona:{estado:'pend',txt:'Sin información de zona horaria en el JSON.'},costes:{estado:'pend',txt:'Sin información de costes en el JSON.'},reconciliacion:{estado:'pend',txt:'Falta la reconciliación con el Strategy Tester.'}});
  RECON=null;
  ranked=[...T].sort((a,b)=>b.ret-a.ret);
}

function idxAt(t){let lo=0,hi=eqT.length-1;while(lo<hi){const m=(lo+hi)>>1;if(eqT[m]<t)lo=m+1;else hi=m}return lo}
let ranked=[];const rank=t=>ranked.indexOf(t)+1;
function estParidad(){if(RECON)return RECON.ok?'pasa':'falla';const r=P.reconciliacion&&P.reconciliacion.estado;return r==='pasa'||r==='falla'?r:'pend'}
function veredictoGlobal(){const par=estParidad();
  if(nPass===5&&par==='pasa')return{e:'pasa',t:'Aprueba'};
  if(nPass===5)return{e:'pend',t:'Falta paridad MT5'};
  return{e:'falla',t:'No aprueba'}}
function fallidas(){return ['F1','F2','F3','F4','F5'].filter(k=>!D.fases[k])}
const NOMF={F1:'IS / OOS',F2:'Walk-forward',F3:'Meseta',F4:'Monte Carlo',F5:'Stress',PAR:'Paridad MT5'};
function pistaHTML(){return ['F1','F2','F3','F4','F5'].map(k=>{const e=D.fases[k]?'pasa':'falla';return `<span class="p ${e}" title="${NOMF[k]}: ${EST[e].t}">${ico(EST[e].i)}${k}</span>`}).join('')+
  (()=>{const e=estParidad();return `<span class="p ${e}" title="Paridad MT5: ${EST[e].t}">${ico(EST[e].i)}MT5</span>`})()}

/* ---------- curva de capital ---------- */
const eqState={range:'all',ops:true,sel:null};
function eqRange(r){const last=eqT[eqT.length-1];if(r==='is')return[eqT[0],splitT];if(r==='oos')return[splitT,last];if(r==='10')return[last-10*365.25*864e5,last];if(r==='3')return[last-3*365.25*864e5,last];return[eqT[0],last]}
function drawEq(g,W,H,c){
  const o=c.opts||{},compact=!!o.compact,st=compact?{range:'all',ops:false,sel:null}:eqState;
  const f=font(g,.8);const [t0,t1]=eqRange(st.range);let i0=idxAt(t0),i1=idxAt(t1);if(eqT[i1]>t1&&i1>i0)i1--;
  const L=f*4.4,R=f*5.2,Tp=f*1.9,B=f*2;
  const ph=compact?H-Tp-B:(H-Tp-B)*.7,dTop=Tp+ph+f*1.6,dh=compact?0:H-B-dTop;
  let lo=1e9,hi=-1e9;for(let i=i0;i<=i1;i++){lo=Math.min(lo,eqV[i]);hi=Math.max(hi,eqV[i])}const pad=(hi-lo)*.08||5;lo-=pad;hi+=pad;
  const X=t=>L+(t-eqT[i0])/(eqT[i1]-eqT[i0]||1)*(W-L-R),Y=v=>Tp+(hi-v)/(hi-lo)*ph;
  let ddLo=0;for(let i=i0;i<=i1;i++)ddLo=Math.min(ddLo,D.dd[i]);ddLo=Math.min(ddLo*1.12,-.02);const YD=v=>dTop+(v/ddLo)*dh;
  // rejilla Y
  g.textAlign='right';g.textBaseline='middle';
  niceTicks(lo,hi,compact?3:5).forEach(v=>{const y=Y(v);rejillaH(g,L,W-R,y);g.fillStyle=css('--caliza-3');g.fillText(nf(v,0),L-8,y)});
  if(!compact){[0,ddLo/1.12].forEach(v=>{const y=YD(v);rejillaH(g,L,W-R,y);g.fillStyle=css('--caliza-3');g.fillText(pct(v,0,false),L-8,y)});
    g.textAlign='left';g.textBaseline='bottom';g.fillStyle=css('--falla');g.fillText('caída desde el máximo',L+6,dTop-4)}
  // eje X años
  g.textAlign='center';g.textBaseline='top';const y0=new Date(eqT[i0]).getUTCFullYear(),y1=new Date(eqT[i1]).getUTCFullYear(),span=y1-y0,stp=span>20?4:span>8?2:1;
  for(let y=Math.ceil(y0/stp)*stp;y<=y1;y+=stp){const t=Date.UTC(y,0,1);if(t<eqT[i0])continue;const x=X(t);g.fillStyle=css('--caliza-3');g.fillText(String(y),x,H-B+f*.5)}
  // corte diseño / prueba
  if(splitT>eqT[i0]&&splitT<eqT[i1]){const xs=X(splitT);g.fillStyle=rgba('--linea-rgb',.035);g.fillRect(xs,Tp,W-R-xs,(compact?ph:H-B-Tp));
    g.strokeStyle=css('--caliza-3');g.setLineDash([5,5]);g.beginPath();g.moveTo(Math.round(xs)+.5,Tp-f*.6);g.lineTo(Math.round(xs)+.5,compact?Tp+ph:H-B);g.stroke();g.setLineDash([]);
    g.textBaseline='bottom';g.textAlign='left';g.fillStyle=css('--caliza');g.font='700 '+f+'px '+css('--f-num');g.fillText('PRUEBA HONESTA →',xs+6,Tp-2);
    g.textAlign='right';g.fillStyle=css('--caliza-3');g.fillText('← DISEÑO',xs-6,Tp-2);g.font=f+'px '+css('--f-num')}
  // área + línea
  const grd=g.createLinearGradient(0,Tp,0,Tp+ph);grd.addColorStop(0,rgba('--cinta-rgb',.2));grd.addColorStop(1,rgba('--cinta-rgb',0));
  g.beginPath();for(let i=i0;i<=i1;i++){const x=X(eqT[i]),y=Y(eqV[i]);i===i0?g.moveTo(x,y):g.lineTo(x,y)}
  g.lineTo(X(eqT[i1]),Tp+ph);g.lineTo(X(eqT[i0]),Tp+ph);g.closePath();g.fillStyle=grd;g.fill();
  g.beginPath();for(let i=i0;i<=i1;i++){const x=X(eqT[i]),y=Y(eqV[i]);i===i0?g.moveTo(x,y):g.lineTo(x,y)}
  g.strokeStyle=css('--cinta');g.lineWidth=compact?2:2.4;g.stroke();g.lineWidth=1;
  // punto final
  const xe=X(eqT[i1]),ye=Y(eqV[i1]);g.fillStyle=css('--cinta');g.beginPath();g.arc(xe,ye,4.5,0,7);g.fill();
  g.font='700 '+f+'px '+css('--f-num');g.textAlign='left';g.textBaseline='middle';g.fillStyle=css('--caliza');g.fillText(nf(eqV[i1],1),xe+8,ye);g.font=f+'px '+css('--f-num');
  // caídas
  if(!compact){g.beginPath();g.moveTo(X(eqT[i0]),YD(0));for(let i=i0;i<=i1;i++)g.lineTo(X(eqT[i]),YD(D.dd[i]));g.lineTo(X(eqT[i1]),YD(0));g.closePath();
    g.fillStyle=rgba('--falla-rgb',.28);g.fill();g.strokeStyle=css('--falla');g.lineWidth=1.2;g.stroke();g.lineWidth=1}
  // operaciones
  c.pts=[];
  if(st.ops){T.forEach(t=>{if(t.ei<i0||t.ei>i1)return;const x=X(eqT[t.ei]),y=Y(eqV[t.ei]);c.pts.push({t,x,y});g.fillStyle=t.ret>0?css('--pasa'):css('--falla');g.beginPath();g.arc(x,y,3,0,7);g.fill()})}
  const sel=st.sel!=null?T[st.sel]:null;
  if(sel&&sel.ei>=i0&&sel.ei<=i1){const x=X(eqT[sel.ei]),y=Y(eqV[sel.ei]);g.strokeStyle=css('--caliza');g.setLineDash([3,3]);g.beginPath();g.moveTo(x,Tp);g.lineTo(x,H-B);g.stroke();g.setLineDash([]);
    g.lineWidth=2.5;g.beginPath();g.arc(x,y,7,0,7);g.stroke();g.lineWidth=1;g.font='700 '+f+'px '+css('--f-num');g.textAlign=x>W*.7?'right':'left';g.textBaseline='bottom';g.fillStyle=css('--caliza');
    g.fillText('#'+sel.n+' '+pct(sel.ret,2),x+(x>W*.7?-10:10),y-8);g.font=f+'px '+css('--f-num')}
  // hover
  if(c.hover&&c.hover.x>=L&&c.hover.x<=W-R){let best=null,bd=1e9;c.pts.forEach(p=>{const d=Math.hypot(p.x-c.hover.x,p.y-c.hover.y);if(d<bd){bd=d;best=p}});
    if(best&&bd<9){c.cv.style.cursor='pointer';const t=best.t;c.hovT=t;g.strokeStyle=css('--caliza');g.beginPath();g.arc(best.x,best.y,6,0,7);g.stroke();
      showTT(c,'<b>Operación #'+t.n+'</b> · '+(t.oos?'prueba':'diseño')+'<br>'+fd(t.fi)+' → '+fd(t.fo)+'<br>resultado <b class="'+(t.ret>0?'pos':'neg')+'">'+pct(t.ret,2)+'</b> · pulsa para abrir',best.x,best.y);return}
    c.hovT=null;c.cv.style.cursor=compact?'pointer':'crosshair';
    const tm=eqT[i0]+(c.hover.x-L)/(W-L-R)*(eqT[i1]-eqT[i0]);let i=Math.min(i1,Math.max(i0,idxAt(tm)));const x=X(eqT[i]);
    g.strokeStyle=rgba('--linea-rgb',.5);g.beginPath();g.moveTo(x,Tp);g.lineTo(x,compact?Tp+ph:H-B);g.stroke();g.fillStyle=css('--caliza');g.beginPath();g.arc(x,Y(eqV[i]),4,0,7);g.fill();
    showTT(c,'<b>'+fd(D.eq[i][0])+'</b><br>capital <b>'+nf(eqV[i],1)+'</b>'+(compact?'':'<br>caída <b class="neg">'+pct(D.dd[i],1,false)+'</b>'),x,Y(eqV[i]))}
  else c.hovT=null
}

/* ---------- barras (anual, operaciones, walk-forward) ---------- */
function drawBarras(g,W,H,c,A,{val,lab,col,tt,sel,marca,ticks=4,xlab}){const f=font(g,.76);const L=f*4,R=8,Tp=f*1.3,B=f*2;
  if(!A.length)return;let lo=Math.min(0,...A.map(val)),hi=Math.max(0,...A.map(val));const sp=(hi-lo)||1;lo-=sp*.08;hi+=sp*.1;
  const Y=v=>Tp+(hi-v)/(hi-lo)*(H-Tp-B),bw=(W-L-R)/A.length;
  g.textAlign='right';g.textBaseline='middle';niceTicks(lo,hi,ticks).forEach(v=>{rejillaH(g,L,W-R,Y(v),Math.abs(v)<1e-12);g.fillStyle=css('--caliza-3');g.fillText(pct(v,0,false),L-6,Y(v))});
  if(marca!=null&&marca>0&&marca<A.length){const xs=L+marca*bw;g.fillStyle=rgba('--linea-rgb',.035);g.fillRect(xs,Tp,W-R-xs,H-B-Tp);g.strokeStyle=css('--caliza-3');g.setLineDash([5,5]);g.beginPath();g.moveTo(xs,Tp-f*.2);g.lineTo(xs,H-B);g.stroke();g.setLineDash([]);
    g.fillStyle=css('--caliza');g.textAlign='left';g.textBaseline='bottom';g.font='700 '+f+'px '+css('--f-num');g.fillText('PRUEBA →',xs+5,Tp);g.font=f+'px '+css('--f-num')}
  let hv=c.hover?Math.floor((c.hover.x-L)/bw):-1;if(hv<0||hv>=A.length)hv=-1;
  A.forEach((a,i)=>{const v=val(a),x=L+i*bw,y=Y(Math.max(0,v)),h=Math.max(1,Math.abs(Y(v)-Y(0)));g.fillStyle=col(a);g.globalAlpha=(i===hv||i===sel)?1:(sel!=null?.55:.85);
    g.fillRect(x+Math.max(.5,bw*.14),y,Math.max(1,bw*.72),h);g.globalAlpha=1});
  if(sel!=null&&sel>=0){const x=L+sel*bw+bw/2;g.strokeStyle=css('--caliza');g.lineWidth=2;g.beginPath();g.moveTo(x,Tp);g.lineTo(x,H-B);g.stroke();g.lineWidth=1}
  g.fillStyle=css('--caliza-3');g.textBaseline='top';const every=Math.max(1,Math.ceil(A.length/(W/(f*4.5))));
  A.forEach((a,i)=>{if(i%every===0||i===A.length-1){if(i!==A.length-1&&A.length-1-i<every*.85)return;g.textAlign=i===A.length-1?'right':'center';g.fillText(lab(a,i),i===A.length-1?W-R:L+i*bw+bw/2,H-B+f*.4)}});
  c.hv=hv;c.cv.style.cursor=hv>=0&&c.opts.click?'pointer':'default';
  if(hv>=0)showTT(c,tt(A[hv],hv),L+hv*bw+bw/2,Y(Math.max(0,val(A[hv]))));else if(c.tt)c.tt.style.display='none'}
function drawAnual(g,W,H,c){const A=D.anual;const si=A.findIndex(a=>a.y>=+yr(D.split));
  drawBarras(g,W,H,c,A,{val:a=>a.ret,lab:a=>String(a.y),col:a=>a.ret>0?css('--pasa'):css('--falla'),marca:si>0?si:null,
    tt:a=>'<b>'+a.y+'</b> · '+a.n+' op.<br>resultado <b class="'+(a.ret>0?'pos':'neg')+'">'+pct(a.ret,1)+'</b>'+(a.y===+yr(D.hasta)?'<br>(año en curso)':'')})}
function drawOps(g,W,H,c){const si=T.findIndex(t=>t.oos);
  drawBarras(g,W,H,c,T,{val:t=>t.ret,lab:t=>'#'+t.n,col:t=>t.ret>0?css('--pasa'):css('--falla'),sel:opState.sel,marca:si>0?si:null,
    tt:t=>'<b>#'+t.n+'</b> · '+fd(t.fi)+'<br>resultado <b class="'+(t.ret>0?'pos':'neg')+'">'+pct(t.ret,2)+'</b>'})}
function drawWF(g,W,H,c){if(!D.wf)return;drawBarras(g,W,H,c,D.wf,{val:a=>a.r,lab:a=>String(a.o),col:a=>a.r>0?css('--pasa'):css('--falla'),ticks:4,
  tt:a=>'<b>'+a.o+'</b> (año de prueba)<br>resultado <b class="'+(a.r>0?'pos':'neg')+'">'+pct(a.r,1)+'</b> · '+a.n+' op.'})}

/* ---------- Monte Carlo ---------- */
function drawMC(g,W,H,c){const Mc=D.mc;if(!Mc||!Mc.hist)return;const f=font(g,.76);const L=10,R=10,Tp=f*4.6,B=f*2,hb=Mc.hist,bn=Mc.bins,mx=Math.max(...hb);
  const x0=bn[0],x1=bn[bn.length-1],X=v=>L+(v-x0)/(x1-x0)*(W-L-R),Y=v=>Tp+(1-v/mx)*(H-Tp-B);
  rejillaH(g,L,W-R,H-B,true);
  hb.forEach((h,i)=>{const a=X(bn[i]),b=X(bn[i+1]);g.fillStyle=bn[i+1]<=0?css('--falla'):css('--caliza-3');g.globalAlpha=bn[i+1]<=0?.85:.6;g.fillRect(a+.5,Y(h),Math.max(1,b-a-1),H-B-Y(h));g.globalAlpha=1});
  [[0,'0 %',css('--caliza-3'),'right'],[Mc.p5,'peor 5 %: '+pct(Mc.p5,1),css('--cinta'),'left'],[Mc.p50,'mediana: '+pct(Mc.p50,0),css('--caliza'),'left']].forEach(([v,l,col,al],k)=>{if(v==null)return;const x=X(v);g.strokeStyle=col;g.lineWidth=2;g.setLineDash([5,4]);g.beginPath();g.moveTo(x,Tp-4);g.lineTo(x,H-B);g.stroke();g.setLineDash([]);g.lineWidth=1;
    g.fillStyle=col;g.textAlign=al;g.textBaseline='top';g.font=(k?'700 ':'')+f+'px '+css('--f-num');g.fillText(l,x+(al==='right'?-5:5),2+k*f*1.35);g.font=f+'px '+css('--f-num')});
  g.fillStyle=css('--caliza-3');g.textAlign='center';g.textBaseline='top';niceTicks(x0,x1,5).forEach(v=>{if(v>=x0&&v<=x1)g.fillText(pct(v,0,false),X(v),H-B+f*.4)});
  if(c.hover){const v=x0+(c.hover.x-L)/(W-L-R)*(x1-x0),i=Math.max(0,Math.min(hb.length-1,Math.floor((v-x0)/(x1-x0)*hb.length)));
    showTT(c,'retorno total entre <b>'+pct(bn[i],0)+'</b> y <b>'+pct(bn[i+1],0)+'</b><br>'+nf(hb[i],0)+' simulaciones',c.hover.x,c.hover.y)}}

/* ---------- precio + oscilador ---------- */
function drawPrice(g,W,H,c){const V=D.velas;const f=font(g,.76);const L=8,R=f*6.2,Tp=f*1.3,B=f*2,gap=f*1.4,ph=(H-Tp-B-gap)*.68,rTop=Tp+ph+gap,rh=H-B-rTop;
  const vIdx={};V.forEach((v,i)=>vIdx[v.t]=i);const trIn=T.filter(t=>vIdx[t.fi]!=null||vIdx[t.fo]!=null);
  const hasS=V[0].sma!=null,hasR=V[0].rsi!=null;
  let lo=Math.min(...V.map(v=>Math.min(v.l,hasS?v.sma:v.l))),hi=Math.max(...V.map(v=>Math.max(v.h,hasS?v.sma:v.h)));const p=(hi-lo)*.06;lo-=p;hi+=p;
  const n=V.length,bw=(W-L-R)/n,X=i=>L+bw*(i+.5),Y=v=>Tp+(hi-v)/(hi-lo)*ph,YR=v=>rTop+(100-v)/100*rh;
  g.textAlign='left';g.textBaseline='middle';niceTicks(lo,hi,5).forEach(v=>{rejillaH(g,L,W-R,Y(v));g.fillStyle=css('--caliza-3');g.fillText(nf(v,0),W-R+6,Y(v))});
  g.textAlign='center';g.textBaseline='top';let pm='';V.forEach((v,i)=>{const m=v.t.slice(0,7);if(m!==pm){pm=m;g.fillStyle=css('--caliza-3');g.fillText(v.t.slice(5,7)+'/'+v.t.slice(2,4),X(i),H-B+f*.4)}});
  trIn.forEach(t=>{const a=vIdx[t.fi]!=null?vIdx[t.fi]:0,b=vIdx[t.fo]!=null?vIdx[t.fo]:n-1;g.fillStyle=t.ret>0?rgba('--pasa-rgb',.08):rgba('--falla-rgb',.09);g.fillRect(X(a)-bw/2,Tp,X(b)-X(a)+bw,ph)});
  V.forEach((v,i)=>{const up=v.c>=v.o,col=up?css('--caliza-2'):css('--falla');g.strokeStyle=col;g.beginPath();g.moveTo(X(i),Y(v.h));g.lineTo(X(i),Y(v.l));g.stroke();
    const y1=Y(Math.max(v.o,v.c)),y2=Y(Math.min(v.o,v.c)),w=Math.max(1,bw*.62);g.fillStyle=col;g.fillRect(X(i)-w/2,y1,w,Math.max(1,y2-y1))});
  if(hasS){g.beginPath();V.forEach((v,i)=>i?g.lineTo(X(i),Y(v.sma)):g.moveTo(X(i),Y(v.sma)));g.strokeStyle=css('--cinta');g.lineWidth=2.2;g.stroke();g.lineWidth=1;
    g.fillStyle=css('--cinta-t');g.textAlign='right';g.textBaseline='bottom';g.font='700 '+f+'px '+css('--f-num');g.fillText((M.media||'media')+' · '+nf(V[n-1].sma,2),X(n-1),Y(V[n-1].sma)-6);g.font=f+'px '+css('--f-num')}
  const sel=estState.mode==='op'?T[estState.op]:null;c.mk=[];
  trIn.forEach(t=>{[['fi',1],['fo',0]].forEach(([k,isE])=>{const i=vIdx[t[k]];if(i==null)return;const v=V[i],x=X(i),y=isE?Y(v.l)+11:Y(v.h)-11,s=sel&&sel.n===t.n?9:7;
    g.fillStyle=isE?css('--cinta'):(t.ret>0?css('--pasa'):css('--falla'));g.strokeStyle=css('--roca');g.beginPath();if(isE){g.moveTo(x,y-s);g.lineTo(x-s,y+s);g.lineTo(x+s,y+s)}else{g.moveTo(x,y+s);g.lineTo(x-s,y-s);g.lineTo(x+s,y-s)}g.closePath();g.fill();g.stroke();
    c.mk.push({t,x,y});if(sel&&sel.n===t.n){g.strokeStyle=css('--caliza');g.lineWidth=2;g.beginPath();g.arc(x,y,s+5,0,7);g.stroke();g.lineWidth=1}})});
  const lv=V[n-1],yl=Y(lv.c);g.fillStyle=css('--caliza');g.fillRect(W-R+2,yl-f*.8,R-4,f*1.6);g.fillStyle=css('--roca');g.textAlign='left';g.textBaseline='middle';g.font='700 '+f+'px '+css('--f-num');g.fillText(nf(lv.c,0),W-R+5,yl);g.font=f+'px '+css('--f-num');
  if(hasR){const O=M.osc||{};g.strokeStyle=rgba('--veta-rgb',.6);g.strokeRect(L,rTop,W-L-R,rh);
    if(O.compra!=null){g.fillStyle=rgba('--cinta-rgb',.1);g.fillRect(L,YR(O.compra),W-L-R,YR(0)-YR(O.compra))}
    [[O.compra,O.compra+' compra',css('--cinta-t')],[O.venta,O.venta+' venta',css('--caliza-2')]].forEach(([v,l,col])=>{if(v==null)return;g.strokeStyle=col;g.setLineDash([4,4]);g.beginPath();g.moveTo(L,YR(v));g.lineTo(W-L-R+L,YR(v));g.stroke();g.setLineDash([]);g.fillStyle=col;g.textAlign='left';g.textBaseline='middle';g.fillText(l,W-R+6,YR(v))});
    g.beginPath();V.forEach((v,i)=>i?g.lineTo(X(i),YR(v.rsi)):g.moveTo(X(i),YR(v.rsi)));g.strokeStyle=css('--caliza');g.lineWidth=1.6;g.stroke();g.lineWidth=1;
    g.fillStyle=css('--caliza-2');g.textAlign='left';g.textBaseline='top';g.fillText((O.nombre||'oscilador')+' · hoy '+nf(lv.rsi,1),L+6,rTop+5)}
  c.cv.style.cursor='crosshair';
  if(c.hover){let hit=null;c.mk.forEach(m=>{if(Math.hypot(m.x-c.hover.x,m.y-c.hover.y)<13)hit=m});
    if(hit){c.cv.style.cursor='pointer';c.hovT=hit.t;const t=hit.t;showTT(c,'<b>Operación #'+t.n+'</b><br>compra '+fd(t.fi)+' · '+nf(t.pi,2)+'<br>venta '+fd(t.fo)+' · '+nf(t.po,2)+'<br>resultado <b class="'+(t.ret>0?'pos':'neg')+'">'+pct(t.ret,2)+'</b> · pulsa para ver su ruta',hit.x,hit.y);return}
    c.hovT=null;const i=Math.max(0,Math.min(n-1,Math.floor((c.hover.x-L)/bw)));const v=V[i],x=X(i);
    g.strokeStyle=rgba('--linea-rgb',.45);g.beginPath();g.moveTo(x,Tp);g.lineTo(x,H-B);g.stroke();
    showTT(c,'<b>'+fd(v.t)+'</b><br>apertura '+nf(v.o,2)+' · cierre <b>'+nf(v.c,2)+'</b><br>máx '+nf(v.h,2)+' · mín '+nf(v.l,2)+(hasS?'<br>media '+nf(v.sma,2):'')+(hasR?' · osc. <b>'+nf(v.rsi,1)+'</b>':''),x,c.hover.y)}else c.hovT=null}
