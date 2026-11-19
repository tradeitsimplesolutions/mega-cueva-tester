// Cuevi · el robot 3D de TISS (BotMariel de ia-mariel) portado a JavaScript sin React, para la Mega Cueva.
// La misma criatura y el mismo código de escena: cuerpo de tinta verde con caja redondeada, antena con bolita verde, dos ojos-cápsula
// y una boca-arco que emiten luz; flota, parpadea, guiña, sigue el cursor y cambia de gesto (normal / pensando / escribiendo / celebra).
// Se empaqueta con esbuild junto a las piezas de three.js que usa. three.js © los autores de three.js, licencia MIT.
import {
  WebGLRenderer, Scene, PerspectiveCamera, HemisphereLight, DirectionalLight, PointLight, Group, MeshStandardMaterial, Mesh,
  CylinderGeometry, SphereGeometry, CapsuleGeometry, TorusGeometry,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

const VERDE = 0x16b25f;
const TINTA = 0x0e2a1a;
const reducido = () => { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } };

const objetivo = { x: 0, y: 0 };
const puntero = { x: innerWidth / 2, y: innerHeight / 2 };
addEventListener("pointermove", (e) => { puntero.x = e.clientX; puntero.y = e.clientY; }, { passive: true });

/** Crea el robot dentro de `el`. `leer()` devuelve {estado, mira}. Devuelve {dibuja(), cierra()} o null si no hay WebGL. */
function crear(el, leer) {
  let renderer;
  try {
    renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  } catch (e) { return null; }
  if (!renderer || !renderer.domElement || !renderer.getContext()) return null;
  // se pinta al menos al doble de resolución (y se reduce con suavidad): así sale nítido también en pantallas de 1×
  renderer.setPixelRatio(Math.max(2, Math.min(window.devicePixelRatio || 1, 3)));
  renderer.setClearColor(0x000000, 0);
  const lienzo = renderer.domElement;
  lienzo.className = "b-lienzo";
  lienzo.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
  el.appendChild(lienzo);

  const escena = new Scene();
  const camara = new PerspectiveCamera(32, 1, 0.1, 50);
  camara.position.set(0, 0.15, 7);

  escena.add(new HemisphereLight(0xdfe8e2, 0x0b110d, 0.9));
  const clave = new DirectionalLight(0xffffff, 1.6);
  clave.position.set(3, 4, 5);
  escena.add(clave);
  const contorno = new PointLight(VERDE, 6, 12);
  contorno.position.set(-3, 1.5, -2);
  escena.add(contorno);

  const bot = new Group();
  escena.add(bot);

  const cuerpoMat = new MeshStandardMaterial({ color: TINTA, metalness: 0.55, roughness: 0.32 });
  const cuerpo = new Mesh(new RoundedBoxGeometry(2.6, 2.3, 2.0, 6, 0.75), cuerpoMat);
  bot.add(cuerpo);

  const antena = new Mesh(new CylinderGeometry(0.06, 0.06, 0.5, 12), cuerpoMat);
  antena.position.set(0, 1.35, 0);
  bot.add(antena);
  const bolita = new Mesh(new SphereGeometry(0.17, 24, 24), new MeshStandardMaterial({ color: VERDE, emissive: VERDE, emissiveIntensity: 1.1, roughness: 0.4 }));
  bolita.position.set(0, 1.68, 0);
  bot.add(bolita);

  const ojoMat = new MeshStandardMaterial({ color: VERDE, emissive: VERDE, emissiveIntensity: 1.6, roughness: 0.25 });
  const ojoGeo = new CapsuleGeometry(0.22, 0.28, 8, 16);
  const ojoIzq = new Mesh(ojoGeo, ojoMat);
  const ojoDer = new Mesh(ojoGeo, ojoMat);
  ojoIzq.position.set(-0.55, 0.18, 1.02);
  ojoDer.position.set(0.55, 0.18, 1.02);
  bot.add(ojoIzq, ojoDer);

  const boca = new Mesh(new TorusGeometry(0.42, 0.06, 8, 24, Math.PI), ojoMat);
  boca.rotation.z = Math.PI;
  boca.position.set(0, -0.42, 1.02);
  bot.add(boca);

  let proximoParpadeo = 2 + Math.random() * 3;
  let parpadeoDesde = -1;
  let proximoGuino = 6 + Math.random() * 4;
  let guinoDesde = -1;
  const t0 = performance.now();
  let ancho = 0, alto = 0, cerrado = false;

  function ajusta() {
    const w = Math.max(16, Math.round(el.clientWidth || 64)), h = Math.max(16, Math.round(el.clientHeight || 64));
    if (w !== ancho || h !== alto) { ancho = w; alto = h; renderer.setSize(w, h, false); camara.aspect = w / h; camara.updateProjectionMatrix(); }
  }

  function dibuja() {
    if (cerrado) return;
    ajusta();
    const red = reducido();
    const t = (performance.now() - t0) / 1000;
    const { estado: est, mira } = leer();

    // hacia dónde mira: el cursor, o el elemento que Cuevi señala
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (mira && mira.isConnected && mira.offsetParent !== null) {
      const q = mira.getBoundingClientRect();
      objetivo.x = Math.max(-1, Math.min(1, (q.left + q.width / 2 - cx) / (innerWidth / 2)));
      objetivo.y = Math.max(-1, Math.min(1, (q.top + q.height / 2 - cy) / (innerHeight / 2)));
    } else {
      objetivo.x = Math.max(-1, Math.min(1, (puntero.x - cx) / (innerWidth / 2)));
      objetivo.y = Math.max(-1, Math.min(1, (puntero.y - cy) / (innerHeight / 2)));
    }

    const salto = !red && est === "celebra" ? Math.abs(Math.sin(t * 7)) * 0.32 : 0;
    bot.position.y = (red ? 0 : Math.sin(t * 1.6) * 0.08) + salto;
    const miraX = est === "pensando" ? -0.35 : objetivo.x;
    const miraY = est === "pensando" ? 0.25 : objetivo.y;
    bot.rotation.y += ((red ? 0 : miraX * 0.45) - bot.rotation.y) * 0.08;
    bot.rotation.x += ((red ? 0 : -miraY * 0.25) - bot.rotation.x) * 0.08;
    bot.rotation.z += ((est === "pensando" ? 0.12 : est === "celebra" && !red ? Math.sin(t * 7) * 0.08 : 0) - bot.rotation.z) * 0.05;

    if (!red) {
      if (parpadeoDesde < 0 && t > proximoParpadeo) parpadeoDesde = t;
      if (parpadeoDesde >= 0) {
        const fase = (t - parpadeoDesde) / 0.18;
        const escala = fase < 1 ? Math.max(0.08, Math.abs(Math.cos(fase * Math.PI))) : 1;
        ojoIzq.scale.y = escala; ojoDer.scale.y = escala;
        if (fase >= 1) { parpadeoDesde = -1; proximoParpadeo = t + 2.5 + Math.random() * 3.5; }
      }
    }
    if (!red && est === "normal") {
      if (guinoDesde < 0 && t > proximoGuino) guinoDesde = t;
      if (guinoDesde >= 0) {
        const fase = (t - guinoDesde) / 0.5;
        const cerr = fase < 1 ? Math.max(0.08, Math.abs(Math.cos(fase * Math.PI))) : 1;
        ojoDer.scale.y = Math.min(ojoDer.scale.y, cerr);
        boca.scale.x = fase < 1 ? 1.15 : 1;
        if (fase >= 1) { guinoDesde = -1; proximoGuino = t + 7 + Math.random() * 6; }
      }
    }

    const apertura = est === "pensando" ? 0.6 : 1;
    ojoIzq.scale.x += (apertura - ojoIzq.scale.x) * 0.1;
    ojoDer.scale.x += (apertura - ojoDer.scale.x) * 0.1;
    const bocaY = est === "escribiendo" ? 1 + Math.abs(Math.sin(t * 9)) * 0.35 : est === "celebra" ? 1.35 : 1;
    boca.scale.y += (bocaY - boca.scale.y) * 0.3;
    if (est === "celebra") boca.scale.x += (1.25 - boca.scale.x) * 0.2;
    else if (est !== "normal" || guinoDesde < 0) boca.scale.x += (1 - boca.scale.x) * 0.2;
    bolita.material.emissiveIntensity = est === "normal" ? 1.1 : 1.1 + Math.abs(Math.sin(t * (est === "celebra" ? 8 : 4))) * 1.2;

    el.dataset.giro = bot.rotation.y.toFixed(3);   // para las pruebas automáticas (hacia dónde mira)
    renderer.render(escena, camara);
  }

  function cierra() {
    if (cerrado) return;
    cerrado = true;
    try { renderer.dispose(); renderer.forceContextLoss && renderer.forceContextLoss(); } catch (e) { /* nada */ }
    cuerpo.geometry.dispose(); ojoGeo.dispose(); boca.geometry.dispose(); antena.geometry.dispose(); bolita.geometry.dispose();
    if (lienzo.parentNode) lienzo.parentNode.removeChild(lienzo);
  }

  return { dibuja, cierra };
}

window.MCT_BOT3D = { crear };
