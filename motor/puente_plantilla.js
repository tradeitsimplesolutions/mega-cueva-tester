/* =====================================================================
   motor_puente.js — MEGA CUEVA TESTER · puente navegador ↔ motor TIS (Python en Pyodide)
   GENERADO por motor/construir_puente.py a partir de motor/puente_plantilla.js + motor/motor_tester.py.
   No editar a mano: edita la plantilla o el motor y vuelve a ejecutar  python motor/construir_puente.py

   Funciona abriendo index.html con doble clic (file://): no lee ningún fichero local. El código Python
   del motor va dentro de este fichero; Pyodide, numpy y pandas se descargan de cdn.jsdelivr.net
   (hace falta internet la primera vez; luego el navegador los guarda en caché).

   API
     window.MCT_MOTOR.iniciar()            → Promise<true>   carga Pyodide + numpy + pandas + motor (idempotente)
     window.MCT_MOTOR.listo                → bool            true cuando ya se puede correr
     window.MCT_MOTOR.correr(spec, csv)    → Promise<objeto> resultados (contrato v3) o {error, tipo}
                                              spec = objeto o JSON (spec v1 del formulario, README); csv = texto o File
     window.MCT_MOTOR.progreso = (etapa, pct) => {}          avisos de progreso legibles ("Cargando motor", "Fase 1 · IS/OOS"…)
     window.MCT_MOTOR.version / .pyodide                     versiones del motor y de Pyodide
   Por compatibilidad, MCT_MOTOR también es una función: MCT_MOTOR(spec, csv) === MCT_MOTOR.correr(spec, csv).

   Precarga perezosa: empieza a cargar sola cuando se ve la pestaña «Prueba inicial» (#v-prueba o cualquier
   elemento con el atributo data-mct-precarga) o cuando el hash de la URL contiene «prueba». También puede
   llamarse a MCT_MOTOR.iniciar() a mano al entrar en esa pestaña.

   El cálculo corre en un Web Worker (la página no se congela). Si el navegador no deja crear el worker,
   corre en la página principal (funciona igual, pero la página no se repinta mientras calcula).
   ===================================================================== */
(function () {
  'use strict';
  if (window.MCT_MOTOR && window.MCT_MOTOR.__puente) return;

  var PYODIDE_VERSION = '0.29.3';
  var PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v' + PYODIDE_VERSION + '/full/';
  var MOTOR_VERSION = /*__MOTOR_VERSION__*/'';
  var MOTOR_PY = /*__MOTOR_PY__*/'';
  var PY_ARRANQUE = "import sys\nsys.path.insert(0, '.')\nimport motor_tester as mt";
  var PY_CORRER = 'mt.ejecutar_spec_app(MCT_CSV, MCT_SPEC, MCT_PROG)';

  var ERR_RED = 'No se pudo cargar el motor. La primera vez hace falta conexión a internet ' +
    '(se descargan unos 15 MB de cdn.jsdelivr.net: Python, numpy y pandas). Comprueba la conexión y vuelve a intentarlo.';

  /* ---------- código del worker (se serializa con toString) ---------- */
  function workerMain() {
    var py = null;
    function post(m) { self.postMessage(m); }
    self.onmessage = function (ev) {
      var m = ev.data;
      if (m.tipo === 'iniciar') {
        (async function () {
          try {
            post({ tipo: 'progreso', etapa: 'Cargando motor · Python', pct: 5 });
            importScripts(m.url + 'pyodide.js');
            py = await loadPyodide({ indexURL: m.url });
            post({ tipo: 'progreso', etapa: 'Cargando motor · numpy y pandas', pct: 45 });
            await py.loadPackage(['numpy', 'pandas']);
            post({ tipo: 'progreso', etapa: 'Cargando motor · reglas TIS', pct: 90 });
            py.FS.writeFile('motor_tester.py', m.codigo);
            py.runPython(m.arranque);
            post({ tipo: 'listo' });
          } catch (e) {
            post({ tipo: 'error_inicio', error: String((e && e.message) || e) });
          }
        })();
      } else if (m.tipo === 'correr') {
        try {
          py.globals.set('MCT_CSV', m.csv);
          py.globals.set('MCT_SPEC', m.spec);
          py.globals.set('MCT_PROG', function (etapa, pct) { post({ tipo: 'progreso', id: m.id, etapa: etapa, pct: pct }); });
          var out = py.runPython(m.correr);
          post({ tipo: 'resultado', id: m.id, json: out });
        } catch (e) {
          post({ tipo: 'resultado', id: m.id, json: JSON.stringify({ error: 'Error interno del motor: ' + String((e && e.message) || e), tipo: 'ErrorInterno' }) });
        }
      }
    };
  }

  /* ---------- estado ---------- */
  var M = function (spec, csv) { return M.correr(spec, csv); };
  var promesaInicio = null, worker = null, pyMain = null, modo = null, listo = false;
  var pendientes = {}, siguienteId = 1, cola = Promise.resolve();

  function avisar(etapa, pct) {
    try { if (typeof M.progreso === 'function') M.progreso(etapa, Math.round(pct)); } catch (e) { /* la UI no rompe el motor */ }
  }

  function iniciarWorker() {
    return new Promise(function (ok, ko) {
      var url;
      try {
        url = URL.createObjectURL(new Blob(['(' + workerMain.toString() + ')()'], { type: 'text/javascript' }));
        worker = new Worker(url);
      } catch (e) { ko(e); return; }
      var arrancado = false;
      worker.onmessage = function (ev) {
        var m = ev.data;
        if (m.tipo === 'progreso') {
          if (m.id && pendientes[m.id]) pendientes[m.id].prog(m.etapa, m.pct);
          else avisar(m.etapa, m.pct);
        } else if (m.tipo === 'listo') {
          arrancado = true; ok(true);
        } else if (m.tipo === 'error_inicio') {
          ko(new Error(m.error));
        } else if (m.tipo === 'resultado') {
          var p = pendientes[m.id]; delete pendientes[m.id];
          if (p) p.ok(m.json);
        }
      };
      worker.onerror = function (e) {
        if (!arrancado) { e.preventDefault && e.preventDefault(); ko(new Error(e.message || 'worker')); }
      };
      worker.postMessage({ tipo: 'iniciar', url: PYODIDE_URL, codigo: MOTOR_PY, arranque: PY_ARRANQUE });
    });
  }

  function cargarScript(src) {
    return new Promise(function (ok, ko) {
      if (window.loadPyodide) { ok(); return; }
      var s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = function () { ok(); };
      s.onerror = function () { ko(new Error('no se pudo descargar ' + src)); };
      document.head.appendChild(s);
    });
  }

  async function iniciarPrincipal() {
    avisar('Cargando motor · Python', 5);
    await cargarScript(PYODIDE_URL + 'pyodide.js');
    pyMain = await window.loadPyodide({ indexURL: PYODIDE_URL });
    avisar('Cargando motor · numpy y pandas', 45);
    await pyMain.loadPackage(['numpy', 'pandas']);
    avisar('Cargando motor · reglas TIS', 90);
    pyMain.FS.writeFile('motor_tester.py', MOTOR_PY);
    pyMain.runPython(PY_ARRANQUE);
    return true;
  }

  M.iniciar = function () {
    if (promesaInicio) return promesaInicio;
    avisar('Cargando motor', 0);
    promesaInicio = (async function () {
      try {
        try {
          await iniciarWorker(); modo = 'worker';
        } catch (eW) {
          if (worker) { try { worker.terminate(); } catch (e) { /* nada */ } worker = null; }
          // sin worker (o el worker no pudo cargar Pyodide): se intenta en la página principal
          await iniciarPrincipal(); modo = 'principal';
        }
        listo = true;
        avisar('Motor listo', 100);
        return true;
      } catch (e) {
        promesaInicio = null;            // se puede reintentar
        var err = new Error(ERR_RED + ' (detalle: ' + String((e && e.message) || e) + ')');
        avisar('Error al cargar el motor', 0);
        throw err;
      }
    })();
    return promesaInicio;
  };
  M.precargar = function () { M.iniciar().catch(function () { /* se reintenta al correr */ }); };

  function correrUna(specTxt, csvTxt) {
    if (modo === 'worker') {
      return new Promise(function (ok) {
        var id = siguienteId++;
        pendientes[id] = { ok: ok, prog: avisar };
        worker.postMessage({ tipo: 'correr', id: id, csv: csvTxt, spec: specTxt, correr: PY_CORRER });
      });
    }
    return new Promise(function (ok) {
      setTimeout(function () {            // deja repintar «Leyendo datos» antes de bloquear
        try {
          pyMain.globals.set('MCT_CSV', csvTxt);
          pyMain.globals.set('MCT_SPEC', specTxt);
          pyMain.globals.set('MCT_PROG', function (etapa, pct) { avisar(etapa, pct); });
          ok(pyMain.runPython(PY_CORRER));
        } catch (e) {
          ok(JSON.stringify({ error: 'Error interno del motor: ' + String((e && e.message) || e), tipo: 'ErrorInterno' }));
        }
      }, 30);
    });
  }

  M.correr = function (spec, csv) {
    var tarea = cola.then(async function () {
      var t0 = (window.performance || Date).now();
      try {
        if (csv && typeof csv === 'object' && typeof csv.text === 'function') csv = await csv.text();
        if (typeof csv !== 'string' || !csv.trim()) return { error: 'Falta el CSV: sube un fichero con tus velas (fecha, apertura, máximo, mínimo, cierre).', tipo: 'ErrorDatos' };
        if (spec == null || spec === '') return { error: 'Falta la especificación de la estrategia.', tipo: 'ErrorSpec' };
        var specTxt = typeof spec === 'string' ? spec : JSON.stringify(spec);
        if (!listo) {
          try { await M.iniciar(); } catch (e) { return { error: e.message, tipo: 'ErrorCarga' }; }
        }
        var txt = await correrUna(specTxt, csv);
        var res;
        try { res = JSON.parse(txt); } catch (e) { return { error: 'El motor devolvió una respuesta que no se puede leer.', tipo: 'ErrorInterno' }; }
        if (res && !res.error) {
          res.tiempos = res.tiempos || {};
          res.tiempos.total_navegador_s = Math.round(((window.performance || Date).now() - t0)) / 1000;
          res.tiempos.modo = modo;
        }
        return res;
      } catch (e) {
        return { error: 'Error inesperado: ' + String((e && e.message) || e), tipo: 'ErrorInterno' };
      }
    });
    cola = tarea.catch(function () { /* la cola sigue */ });
    return tarea;
  };

  Object.defineProperty(M, 'listo', { get: function () { return listo; }, enumerable: true });
  Object.defineProperty(M, 'modo', { get: function () { return modo; }, enumerable: true });
  M.progreso = null;
  M.version = MOTOR_VERSION;
  M.pyodide = PYODIDE_VERSION;
  M.__puente = true;
  window.MCT_MOTOR = M;

  /* ---------- precarga perezosa ---------- */
  function vigilar() {
    if (/prueba/i.test(location.hash)) { M.precargar(); return; }
    window.addEventListener('hashchange', function () { if (/prueba/i.test(location.hash)) M.precargar(); });
    var objetivos = document.querySelectorAll('#v-prueba, [data-mct-precarga]');
    if (!objetivos.length) return;
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (ents) {
        for (var i = 0; i < ents.length; i++) {
          if (ents[i].isIntersecting) { io.disconnect(); M.precargar(); return; }
        }
      });
      objetivos.forEach(function (el) { io.observe(el); });
    }
    objetivos.forEach(function (el) {
      el.addEventListener('pointerdown', M.precargar, { once: true });
      el.addEventListener('focusin', M.precargar, { once: true });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', vigilar);
  else vigilar();
})();
