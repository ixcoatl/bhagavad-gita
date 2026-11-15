/* Ajustes del lector: se guardan en el navegador (localStorage) y se aplican
   ANTES de pintar la página (este script se carga de forma síncrona en <head>).
   Es la única fuente de verdad de las opciones; gita.js construye el panel de
   ajustes a partir de OPCIONES. */
window.GitaAjustes = (() => {
  'use strict';
  const CLAVE = 'gita.ajustes';
  const VERSION = 1;
  const raiz = document.documentElement;
  raiz.classList.add('js');

  const FUENTES = {
    gentium: { nombre: 'Gentium', pila: '"Gentium Book Plus", "Gentium Plus", "Noto Serif", Georgia, serif' },
    notoserif: { nombre: 'Noto Serif', pila: '"Noto Serif", "Gentium Book Plus", Georgia, serif' },
    palatino: { nombre: 'Palatino', pila: '"Palatino Linotype", Palatino, "Book Antiqua", "URW Palladio L", P052, "Gentium Book Plus", serif' },
    sans: { nombre: 'Sans', pila: '"Noto Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' },
    // Comic Relief (clon libre de Comic Sans) ampliada con las letras IAST: ver herramientas/fuente_comic.py
    comic: { nombre: 'Cómic', pila: '"Comic Relief Gita", "Comic Sans MS", "Comic Neue", "Noto Sans", sans-serif' },
  };

  // valor → [etiqueta, valor CSS]. El primero de cada lista NO es el defecto:
  // los defectos están en DEFECTO.
  const OPCIONES = {
    nivel: { '1': 'Lectura', '2': 'Estudio', '3': 'Original' },
    escritura: { iast: 'IAST', deva: 'Devanāgarī', ambas: 'Ambos' },
    tema: { sistema: 'Sistema', light: 'Claro', sepia: 'Sepia', dark: 'Oscuro' },
    fuente: Object.fromEntries(Object.entries(FUENTES).map(([k, f]) => [k, f.nombre])),
    letra: ['0.98rem', '1.06rem', '1.15rem', '1.25rem', '1.36rem', '1.5rem'],
    interlineado: { compacto: ['Compacto', '1.5'], normal: ['Normal', '1.65'], amplio: ['Amplio', '1.85'] },
    columna: { estrecha: ['Estrecha', '32rem'], normal: ['Normal', '37rem'], ancha: ['Ancha', '45rem'] },
    panelFuente: Object.fromEntries(Object.entries(FUENTES).map(([k, f]) => [k, f.nombre])),
    panelLetra: ['0.86rem', '0.93rem', '1rem', '1.08rem', '1.17rem'],
    panelAncho: { estrecho: ['Estrecho', 'min(26rem, 34vw)'], normal: ['Normal', 'min(31rem, 40vw)'], ancho: ['Ancho', 'min(38rem, 48vw)'] },
    rojo: { si: 'Sí', no: 'No' },          // palabras de Kṛṣṇa en rojo
    ensenanzas: { si: 'Sí', no: 'No' },    // fondo de color en las enseñanzas
  };

  const DEFECTO = {
    nivel: '2', escritura: 'ambas', tema: 'sistema',
    fuente: 'gentium', letra: '1.15rem', interlineado: 'normal', columna: 'normal',
    panelFuente: 'gentium', panelLetra: '1rem', panelAncho: 'normal',
    rojo: 'si', ensenanzas: 'si',
  };

  const valido = (k, v) => {
    const o = OPCIONES[k];
    return Array.isArray(o) ? o.includes(v) : Object.prototype.hasOwnProperty.call(o, v);
  };

  /** Devuelve sólo claves conocidas con valores válidos (migrando formatos antiguos). */
  function sanear(obj) {
    const a = {};
    if (!obj || typeof obj !== 'object') return a;
    const migrar = { claro: 'light', oscuro: 'dark' };
    for (const k of Object.keys(DEFECTO)) {
      let v = obj[k];
      if (k === 'tema' && migrar[v]) v = migrar[v];
      if (typeof v === 'string' && valido(k, v)) a[k] = v;
    }
    return a;
  }

  function leer() {
    try { return sanear(JSON.parse(localStorage.getItem(CLAVE) || '{}')); }
    catch (e) { return {}; }
  }

  /** Guarda los ajustes y la fecha de su último cambio (t, en ms). */
  function guardar(a, t = Date.now()) {
    try {
      if (Object.keys(a).length) localStorage.setItem(CLAVE, JSON.stringify(a));
      else localStorage.removeItem(CLAVE);
      localStorage.setItem(CLAVE + '.t', String(t));
    } catch (e) { /* almacenamiento no disponible (modo privado, etc.) */ }
  }
  /** Fecha del último cambio de ajustes conocida por esta página (0 si nunca). */
  function fecha() {
    try { return Number(localStorage.getItem(CLAVE + '.t')) || 0; } catch (e) { return 0; }
  }

  /** Vuelca los ajustes (completados con los defectos) en atributos y variables CSS. */
  function aplicar(a) {
    const c = Object.assign({}, DEFECTO, a);
    raiz.dataset.nivel = c.nivel;
    raiz.dataset.escritura = c.escritura;
    raiz.dataset.rojo = c.rojo;
    raiz.dataset.ensenanzas = c.ensenanzas;
    if (c.tema === 'sistema') delete raiz.dataset.theme; else raiz.dataset.theme = c.tema;
    // Sólo se escriben en línea los ajustes elegidos por el lector; si no, mandan
    // los valores de estilo.css (que, p. ej., reducen la letra en móvil).
    const vars = {
      fuente: ['--fuente-texto', v => FUENTES[v].pila],
      letra: ['--letra', v => v],
      interlineado: ['--interlineado', v => OPCIONES.interlineado[v][1]],
      columna: ['--columna', v => OPCIONES.columna[v][1]],
      panelFuente: ['--fuente-panel', v => FUENTES[v].pila],
      panelLetra: ['--panel-letra', v => v],
      panelAncho: ['--panel-w', v => OPCIONES.panelAncho[v][1]],
    };
    for (const [k, [prop, css]] of Object.entries(vars)) {
      if (a && a[k] !== undefined) raiz.style.setProperty(prop, css(a[k]));
      else raiz.style.removeProperty(prop);
    }
    return c;
  }

  /* Archivos locales en Firefox: cada archivo abierto con file:// es un origen
     distinto y tiene su propio localStorage, así que los ajustes no pasarían de
     una página a otra. Por eso, en file://, los enlaces internos llevan una copia
     de los ajustes en ?aj=… (lo hace llevarAjustes, abajo); la página de destino
     la adopta aquí, antes de pintar, y la borra de la barra de direcciones. En
     Chrome es redundante pero inocuo; servida por HTTP no se usa. */
  const PARAM = 'aj';
  function adoptarDeURL() {
    try {
      const u = new URL(location.href);
      if (!u.searchParams.has(PARAM)) return;
      const llegada = JSON.parse(u.searchParams.get(PARAM));
      // Sólo se adoptan si son más recientes que los que ya conoce esta página:
      // una página abierta desde un marcador (con ajustes viejos o ninguno) no
      // debe pisar los cambios hechos en otra.
      const t = Number(llegada && llegada.t) || 0;
      if (t > fecha()) guardar(sanear(llegada.a), t);
      u.searchParams.delete(PARAM);
      history.replaceState(history.state, '', u.pathname + u.search + u.hash);
    } catch (e) { /* parámetro ilegible: se ignora */ }
  }
  /** Añade los ajustes actuales a un enlace interno justo antes de seguirlo. */
  function llevarAjustes(e) {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    const u = new URL(a.getAttribute('href'), location.href);
    if (u.protocol !== 'file:' || !/\.html$/.test(u.pathname) || u.pathname === location.pathname) return;
    u.searchParams.set(PARAM, JSON.stringify({ a: leer(), t: fecha() }));
    a.setAttribute('href', u.href);   // setAttribute: en los enlaces SVG (árbol) .href es de sólo lectura
  }
  if (location.protocol === 'file:') {
    adoptarDeURL();
    // Fase de captura: se ejecuta antes que cualquier otro manejador del clic.
    document.addEventListener('click', llevarAjustes, true);
    document.addEventListener('auxclick', llevarAjustes, true);   // clic central: nueva pestaña
  }

  aplicar(leer());
  return { CLAVE, VERSION, FUENTES, OPCIONES, DEFECTO, sanear, leer, guardar, aplicar };
})();
