/* Bhagavad Gītā — edición de estudio. Interacción de lectura.
   Sin dependencias. Funciona abriendo los archivos directamente (file://). */
(() => {
  'use strict';

  const G = window.GITA || {};
  const glos = G.glosario || {};
  const d = document;
  const raiz = d.documentElement;
  // capNum/cap: el capítulo de ESTA página (sólo en capitulo-NN.html). Otras páginas (enseñanzas)
  // cargan los datos de varios capítulos: las vistas de verso del panel llevan su capítulo (c).
  const capNum = d.body.classList.contains('capitulo') ? (Number(Object.keys(G.capitulos || {})[0]) || null) : null;
  const cap = capNum ? G.capitulos[capNum] : null;
  const versoPorN = new Map((cap ? cap.versos : []).map(v => [v.n, v]));
  const indicesCap = new Map();
  /** Datos del verso c.n si su capítulo está cargado en esta página. */
  function versoDe(c, n) {
    const k = (G.capitulos || {})[c];
    if (!k) return null;
    if (!indicesCap.has(c)) indicesCap.set(c, new Map(k.versos.map(v => [v.n, v])));
    return indicesCap.get(c).get(n) || null;
  }
  const capDe = v => Number(v.c) || capNum;
  const paginaCap = c => `capitulo-${String(c).padStart(2, '0')}.html`;
  const hoverFino = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const anchoDock = matchMedia('(min-width: 1100px)');

  const TIPOS = {
    personaje: 'Personaje', divinidad: 'Divinidad', epiteto: 'Epíteto', grupo: 'Linaje o grupo', lugar: 'Lugar',
    objeto: 'Objeto', concepto: 'Concepto', termino: 'Término', texto: 'Texto',
    tradicion: 'Tradición', persona: 'Comentarista o intérprete',
  };
  const GRAM = {
    'nom.': 'nominativo', 'ac.': 'acusativo', 'instr.': 'instrumental', 'dat.': 'dativo',
    'abl.': 'ablativo', 'gen.': 'genitivo', 'loc.': 'locativo', 'voc.': 'vocativo',
    'sg.': 'singular', 'du.': 'dual', 'pl.': 'plural', 'm.': 'masculino', 'f.': 'femenino', 'n.': 'neutro',
    '1': '1.ª persona', '2': '2.ª persona', '3': '3.ª persona',
    'pres.': 'presente', 'impf.': 'imperfecto', 'aor.': 'aoristo', 'pf.': 'perfecto', 'fut.': 'futuro',
    'impv.': 'imperativo', 'opt.': 'optativo', 'act.': 'voz activa', 'med.': 'voz media', 'pas.': 'voz pasiva',
    'abs.': 'absolutivo', 'inf.': 'infinitivo', 'part.': 'participio', 'ppp': 'participio pasado pasivo',
    'ppp.': 'participio pasado pasivo', 'gerundivo': 'gerundivo', 'ind.': 'indeclinable', 'pron.': 'pronombre',
    'adj.': 'adjetivo', 'adv.': 'adverbio', 'interj.': 'interjección', 'partíc.': 'partícula',
    'comp.': 'compuesto', 'caus.': 'causativo', 'desid.': 'desiderativo', 'num.': 'numeral',
  };

  /* ---------------- utilidades ---------------- */
  const $ = (s, c = d) => c.querySelector(s);
  const $$ = (s, c = d) => Array.from(c.querySelectorAll(s));
  const escH = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function el(tag, attrs = {}, html = '') {
    const e = d.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') e.className = v; else e.setAttribute(k, v);
    }
    if (html) e.innerHTML = html;
    return e;
  }
  function posicionar(e, x, y, ancla) {
    // Coloca un elemento fijo junto a un punto (o bajo un rectángulo) sin salirse de la ventana.
    e.style.left = '0px'; e.style.top = '0px';
    const r = e.getBoundingClientRect();
    const m = 12;
    let left = x, top = y;
    if (ancla) { left = ancla.left; top = ancla.bottom + 6; if (top + r.height > innerHeight - m) top = ancla.top - r.height - 6; }
    left = Math.max(m, Math.min(left, innerWidth - r.width - m));
    top = Math.max(m, Math.min(top, innerHeight - r.height - m));
    e.style.left = left + 'px'; e.style.top = top + 'px';
  }
  function aviso(txt) {
    const a = el('div', { class: 'aviso', role: 'status' });
    a.textContent = txt;
    d.body.append(a);
    setTimeout(() => a.remove(), 1600);
  }
  async function copiar(txt) {
    try { await navigator.clipboard.writeText(txt); }
    catch (e) {
      const ta = el('textarea'); ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
      d.body.append(ta); ta.select();
      try { d.execCommand('copy'); } catch (e2) { /* sin portapapeles */ }
      ta.remove();
    }
    aviso('Copiado');
  }
  const nombre = id => (glos[id] ? glos[id].nombre : id);
  const lineaOrig = (l, roja) => (/उवाच\s*।?\s*$|uvāca\s*$/.test(l) ? `<span class="uvaca">${escH(l)}</span>`
    : roja ? `<span class="voz-krsna">${escH(l)}</span>` : escH(l));

  /* ---------------- ajustes ---------------- */
  // Opciones, defectos, validación y almacenamiento viven en ajustes.js.
  const A = window.GitaAjustes;
  let ajustes = A.leer();
  let panelAjustes = null;
  let pestanaAjustes = 'texto';
  const val = k => (ajustes[k] !== undefined ? ajustes[k] : A.DEFECTO[k]);

  function aplicar() {
    A.aplicar(ajustes);
    $$('.niveles button').forEach(b => b.setAttribute('aria-checked', String(b.dataset.nivel === raiz.dataset.nivel)));
    if (panelAjustes) pintarAjustes();
  }
  function fijar(k, v) {
    if (v === A.DEFECTO[k]) delete ajustes[k]; else ajustes[k] = v; // sólo se guarda lo que difiere del defecto
    A.guardar(ajustes);
    aplicar();
  }
  // Si el lector cambia los ajustes en otra pestaña, ésta se sincroniza.
  addEventListener('storage', e => { if (e.key === A.CLAVE || e.key === null) { ajustes = A.leer(); aplicar(); } });

  // Altura real de la barra (cambia al envolver en móvil).
  const barra = $('.barra');
  if (barra) raiz.style.setProperty('--barra-h', barra.offsetHeight + 'px');
  if (barra && 'ResizeObserver' in window) {
    new ResizeObserver(() => raiz.style.setProperty('--barra-h', barra.offsetHeight + 'px')).observe(barra);
  }

  $$('.niveles button').forEach(b => b.addEventListener('click', () => fijar('nivel', b.dataset.nivel)));

  /* Controles del panel de ajustes */
  function seg(k) {
    return `<div class="seg" data-ajuste="${k}">` + Object.entries(A.OPCIONES[k]).map(([v, et]) =>
      `<button type="button" data-valor="${v}" aria-pressed="${v === val(k)}">${Array.isArray(et) ? et[0] : et}</button>`).join('') + '</div>';
  }
  function tamano(k) {
    const lista = A.OPCIONES[k], i = lista.indexOf(val(k)), def = lista.indexOf(A.DEFECTO[k]);
    const rotulo = i === def ? 'Normal' : (i > def ? '+' : '−').repeat(Math.abs(i - def));
    return `<div class="seg" data-ajuste="${k}">
      <button type="button" data-paso="-1" ${i <= 0 ? 'disabled' : ''} aria-label="Reducir">A−</button>
      <button type="button" data-paso="0" title="Volver al tamaño predeterminado">${rotulo}</button>
      <button type="button" data-paso="1" ${i >= lista.length - 1 ? 'disabled' : ''} aria-label="Aumentar">A+</button></div>`;
  }
  function fuentes(k) {
    return `<div class="aj-fuentes" data-ajuste="${k}">` + Object.entries(A.FUENTES).map(([v, f]) =>
      `<button type="button" data-valor="${v}" aria-pressed="${v === val(k)}" style="font-family:${escH(f.pila)}"><span>${f.nombre}</span><small>Kṛṣṇa y Arjuna</small></button>`).join('') + '</div>';
  }
  const PESTANAS = [['texto', 'Texto'], ['panel', 'Panel de ayuda'], ['general', 'General']];

  function pintarAjustes() {
    const pest = PESTANAS.map(([id, t]) =>
      `<button type="button" role="tab" data-pestana="${id}" aria-selected="${id === pestanaAjustes}">${t}</button>`).join('');
    let cuerpoAj = '';
    if (pestanaAjustes === 'texto') {
      cuerpoAj = `
        <h3>Tipografía</h3>${fuentes('fuente')}
        <h3>Tamaño de letra</h3>${tamano('letra')}
        <h3>Interlineado</h3>${seg('interlineado')}
        <h3>Ancho de columna</h3>${seg('columna')}
        <p class="aj-nota">El ancho de columna sólo se nota en pantallas grandes.</p>`;
    } else if (pestanaAjustes === 'panel') {
      cuerpoAj = `
        <p class="aj-nota" style="margin:0 0 .4rem">Se aplica al panel de exploración y a las definiciones emergentes.</p>
        <h3>Tipografía</h3>${fuentes('panelFuente')}
        <h3>Tamaño de letra</h3>${tamano('panelLetra')}
        <h3>Ancho del panel</h3>${seg('panelAncho')}
        <p class="aj-nota">En pantallas estrechas el panel aparece abajo, a todo lo ancho.</p>`;
    } else {
      cuerpoAj = `
        <h3>Tema</h3>${seg('tema')}
        <h3>Original sánscrito</h3>${seg('escritura')}
        <h3>Palabras de Kṛṣṇa en rojo</h3>${seg('rojo')}
        <h3>Fondo en las enseñanzas</h3>${seg('ensenanzas')}
        <p class="aj-nota">El fondo de las enseñanzas no se muestra en el nivel Lectura.</p>
        <h3>Idioma de la traducción</h3>
        <select aria-label="Idioma"><option selected>Español</option><option disabled>Más idiomas próximamente</option></select>
        <h3>Teclado</h3>
        <p style="margin:0;color:var(--tenue);line-height:1.8"><kbd>j</kbd>/<kbd>k</kbd> verso · <kbd>Enter</kbd> explorar · <kbd>o</kbd> original · <kbd>←</kbd>/<kbd>→</kbd> verso en el panel · <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> nivel · <kbd>g</kbd> glosario · <kbd>a</kbd> árbol · <kbd>+</kbd>/<kbd>−</kbd> zoom del árbol · <kbd>Esc</kbd> cerrar</p>
        <h3>Mis ajustes</h3>
        <div class="aj-acciones">
          <button type="button" data-accion="exportar">Exportar</button>
          <label>Importar…<input type="file" accept="application/json,.json"></label>
          <button type="button" data-accion="restablecer" class="peligro">Restablecer</button>
        </div>
        <p class="aj-nota">Se guardan sólo en este navegador. Exporta un archivo para llevarlos a otro.</p>`;
    }
    panelAjustes.innerHTML = `<div class="aj-pestanas" role="tablist">${pest}</div><div role="tabpanel">${cuerpoAj}</div>`;
  }

  function exportarAjustes() {
    const datos = { aplicacion: 'bhagavad-gita-estudio', version: A.VERSION, ajustes };
    const url = URL.createObjectURL(new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' }));
    const a = el('a', { href: url, download: 'gita-ajustes.json' });
    // Dentro del propio panel: un clic en <body> lo interpretaría como «clic fuera» y lo cerraría.
    (panelAjustes || d.body).append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  async function importarAjustes(archivo) {
    if (!archivo) return;
    try {
      const obj = JSON.parse(await archivo.text());
      const nuevos = A.sanear(obj && obj.ajustes ? obj.ajustes : obj);
      if (!Object.keys(nuevos).length && !(obj && obj.ajustes)) { aviso('El archivo no contiene ajustes válidos'); return; }
      ajustes = nuevos; A.guardar(ajustes); aplicar();
      aviso('Ajustes importados');
    } catch (e) { aviso('No se pudo leer el archivo'); }
  }

  function alternarAjustes() {
    if (panelAjustes) { panelAjustes.remove(); panelAjustes = null; return; }
    cerrarFlotantes();
    panelAjustes = el('div', { class: 'ajustes', role: 'dialog', 'aria-label': 'Ajustes de lectura' });
    pintarAjustes();
    panelAjustes.addEventListener('click', e => {
      // Al cambiar un ajuste el panel se repinta y el botón pulsado sale del DOM;
      // sin esto el manejador global creería que el clic fue fuera y lo cerraría.
      e.stopPropagation();
      const pest = e.target.closest('[data-pestana]');
      if (pest) { pestanaAjustes = pest.dataset.pestana; pintarAjustes(); panelAjustes.querySelector(`[data-pestana="${pestanaAjustes}"]`).focus(); return; }
      const acc = e.target.closest('[data-accion]');
      if (acc) {
        if (acc.dataset.accion === 'exportar') exportarAjustes();
        else if (acc.dataset.accion === 'restablecer') {
          if (!acc.dataset.confirmar) {   // confirmación en dos pasos, sin diálogos del navegador
            acc.dataset.confirmar = '1'; acc.textContent = '¿Seguro? Pulsa otra vez';
            setTimeout(() => { if (acc.isConnected) { delete acc.dataset.confirmar; acc.textContent = 'Restablecer'; } }, 3000);
          } else { ajustes = {}; A.guardar(ajustes); aplicar(); aviso('Ajustes restablecidos'); }
        }
        return;
      }
      const b = e.target.closest('[data-ajuste] button');
      if (!b || b.disabled) return;
      const k = b.parentElement.dataset.ajuste;
      let selector;
      if (b.dataset.paso !== undefined) {
        const lista = A.OPCIONES[k], paso = Number(b.dataset.paso), i = lista.indexOf(val(k));
        fijar(k, paso === 0 ? A.DEFECTO[k] : lista[Math.max(0, Math.min(lista.length - 1, i + paso))]);
        selector = `[data-ajuste="${k}"] [data-paso="${b.dataset.paso}"]`;
      } else {
        fijar(k, b.dataset.valor);
        selector = `[data-ajuste="${k}"] [data-valor="${b.dataset.valor}"]`;
      }
      const foco = panelAjustes && panelAjustes.querySelector(selector);   // conservar el foco tras repintar
      if (foco && !foco.disabled) foco.focus();
    });
    panelAjustes.addEventListener('change', e => {
      if (e.target.matches('input[type="file"]')) { importarAjustes(e.target.files[0]); e.target.value = ''; }
    });
    d.body.append(panelAjustes);
  }
  const btnAjustes = $('.btn-ajustes');
  if (btnAjustes) btnAjustes.addEventListener('click', e => { e.stopPropagation(); alternarAjustes(); });
  aplicar();

  /* ---------------- flotantes: emergente y menú ---------------- */
  let pop = null, popId = null, tPop = 0, tOcultar = 0;
  let menu = null;
  function cerrarPop() { clearTimeout(tPop); clearTimeout(tOcultar); if (pop) pop.remove(); pop = null; popId = null; }
  function cerrarMenu() { if (menu) menu.remove(); menu = null; }
  function cerrarFlotantes() {
    cerrarPop(); cerrarMenu();
    if (panelAjustes) { panelAjustes.remove(); panelAjustes = null; }
    $$('.menu-caps[open]').forEach(x => x.removeAttribute('open'));
  }

  function mostrarPop(a) {
    const id = a.dataset.t, g = glos[id];
    if (!g) return;
    cerrarPop();
    popId = id;
    pop = el('div', { class: 'pop', role: 'tooltip' });
    const tipo = g.refiere ? `Epíteto de ${escH(nombre(g.refiere))}` : (TIPOS[g.tipo] || '');
    pop.innerHTML = `<span class="pop-tipo">${tipo}</span><span class="pop-nombre">${escH(g.nombre)}</span>` +
      (g.sa ? `<span class="pop-deva">${escH(g.sa)}</span>` : '') +
      `<div class="pop-breve"><p>${g.breve}</p></div><button type="button" class="pop-mas">Ver ficha completa →</button>`;
    pop.querySelector('.pop-mas').addEventListener('click', () => { cerrarPop(); abrir({ tipo: 'termino', id }); });
    pop.addEventListener('mouseenter', () => clearTimeout(tOcultar));
    pop.addEventListener('mouseleave', () => { tOcultar = setTimeout(cerrarPop, 200); });
    d.body.append(pop);
    posicionar(pop, 0, 0, a.getBoundingClientRect());
  }

  if (hoverFino) {
    d.addEventListener('mouseover', e => {
      const a = e.target.closest('a.t');
      if (!a) return;
      clearTimeout(tOcultar);
      if (popId === a.dataset.t && pop) return;
      clearTimeout(tPop);
      tPop = setTimeout(() => mostrarPop(a), 380);
    });
    d.addEventListener('mouseout', e => {
      const a = e.target.closest('a.t');
      if (!a) return;
      clearTimeout(tPop);
      tOcultar = setTimeout(cerrarPop, 220);
    });
  }

  /* ---------------- menú contextual del verso ---------------- */
  function abrirMenu(verso, x, y, ancla) {
    cerrarFlotantes();
    const n = Number(verso.dataset.v), c = Number(verso.dataset.c) || capNum;
    const v = versoDe(c, n);
    const abierto = verso.classList.contains('orig-abierto');
    const fuera = c !== capNum;   // p. ej., en la página de enseñanzas
    const items = [
      ['explorar', 'Explorar verso', fuera ? '' : 'Enter'],
      ['palabras', 'Palabra por palabra', ''],
      ...(v && v.alt ? [['alt', 'Alternativas de traducción', '']] : []),
      ...(v && (v.nota || v.interp.length) ? [['notas', v.interp.length ? 'Notas e interpretaciones' : 'Notas', '']] : []),
      ...(verso.querySelector('.vorig') ? [['orig', abierto ? 'Ocultar original aquí' : 'Mostrar original aquí', fuera ? '' : 'o']] : []),
      ...(fuera ? [['ir', 'Ir al texto', '']] : []),
      ...(!fuera && v && v.ens ? [['ens', 'Ir a la enseñanza', '']] : []),   // el verso forma parte de una
      ['-'],
      ['copiar', 'Copiar verso', ''],
      ['enlace', 'Copiar enlace al verso', ''],
    ];
    menu = el('div', { class: 'menu-ctx', role: 'menu', 'aria-label': `Verso ${c}.${n}` });
    menu.innerHTML = `<div class="mc-titulo">Verso ${c}.${n}</div>` + items.map(([k, t, kb]) =>
      k === '-' ? '<hr>' : `<button type="button" role="menuitem" data-acc="${k}">${t}${kb ? `<kbd>${kb}</kbd>` : ''}</button>`).join('');
    menu.addEventListener('click', ev => {
      const b = ev.target.closest('button'); if (!b) return;
      cerrarMenu();
      accionVerso(b.dataset.acc, verso);
    });
    menu.addEventListener('keydown', ev => {
      const bs = $$('button', menu), i = bs.indexOf(d.activeElement);
      if (ev.key === 'ArrowDown') { ev.preventDefault(); bs[(i + 1) % bs.length].focus(); }
      if (ev.key === 'ArrowUp') { ev.preventDefault(); bs[(i - 1 + bs.length) % bs.length].focus(); }
    });
    d.body.append(menu);
    posicionar(menu, x, y, ancla);
    menu.querySelector('button').focus({ preventScroll: true });
  }

  function textoVerso(verso) {
    const partes = [];
    $$('.vt > *', verso).forEach(s => {
      partes.push(s.classList.contains('hab-cambio') ? `— ${s.textContent}: ` : s.textContent.trim() + ' ');
    });
    return partes.join('').replace(/\s+/g, ' ').trim();
  }

  function accionVerso(acc, verso) {
    const n = Number(verso.dataset.v), c = Number(verso.dataset.c) || capNum;
    const enlace = new URL(`${paginaCap(c)}#v${n}`, location.href).href;
    if (acc === 'explorar') abrir({ tipo: 'verso', c, n });
    else if (acc === 'palabras') abrir({ tipo: 'verso', c, n, sec: 'pv-pal' });
    else if (acc === 'alt') abrir({ tipo: 'verso', c, n, sec: 'pv-alt' });
    else if (acc === 'notas') abrir({ tipo: 'verso', c, n, sec: 'pv-nota' });
    else if (acc === 'orig') alternarOrig(verso);
    else if (acc === 'ir') location.href = enlace;
    else if (acc === 'ens') { const v = versoDe(c, n); if (v && v.ens) location.href = `ensenanzas.html#${v.ens}`; }
    else if (acc === 'copiar') copiar(`${textoVerso(verso)} (Bhagavad Gītā ${c}.${n})`);
    else if (acc === 'enlace') copiar(enlace);
  }

  // Versos con menú: el texto del capítulo y los versos citados en la página de enseñanzas.
  const lectura = $('#lectura') || $('.ensenanzas-pagina');
  if (lectura) {
    lectura.addEventListener('contextmenu', e => {
      const verso = e.target.closest('.verso');
      if (!verso || e.ctrlKey || e.shiftKey || e.metaKey) return;      // menú nativo a petición
      const sel = getSelection();
      if (sel && !sel.isCollapsed && verso.contains(sel.anchorNode)) return; // hay texto seleccionado
      e.preventDefault();
      fijarCursor(verso, false);
      abrirMenu(verso, e.clientX, e.clientY);
    });
    lectura.addEventListener('click', e => {
      // Distintivo «alt»: directamente a las alternativas de traducción, en el panel.
      const alt = e.target.closest('.v-alt');
      if (alt) {
        e.preventDefault();
        e.stopPropagation();
        const ve = alt.closest('.verso');
        abrir({ tipo: 'verso', c: Number(ve.dataset.c) || capNum, n: Number(ve.dataset.v), sec: 'pv-alt' });
        return;
      }
      const num = e.target.closest('.vnum');
      if (!num) return;
      e.preventDefault();
      e.stopPropagation(); // que el manejador global no cierre el menú recién abierto
      const verso = num.closest('.verso');
      fijarCursor(verso, false);
      abrirMenu(verso, 0, 0, num.getBoundingClientRect());
    });
  }

  /* ---------------- panel de exploración ---------------- */
  let panel = null, cuerpo = null, pila = [];
  let restaurando = false;

  /* Estado de la página (panel abierto, su historial y posición, originales
     abiertos aquí) en sessionStorage: sobrevive a una recarga, y cada pestaña
     conserva el suyo. */
  const CLAVE_ESTADO = 'gita.estado:' + location.pathname;
  function guardarEstado() {
    try {
      const abierto = !!(panel && panel.classList.contains('abierto') && pila.length);
      if (abierto) pila[pila.length - 1].scroll = Math.round(cuerpo.scrollTop);
      const orig = $$('.verso.orig-abierto').map(v => Number(v.dataset.v));
      if (!abierto && !orig.length) sessionStorage.removeItem(CLAVE_ESTADO);
      else sessionStorage.setItem(CLAVE_ESTADO, JSON.stringify({ pila: abierto ? pila : [], orig }));
    } catch (e) { /* almacenamiento no disponible */ }
  }
  function leerEstado() {
    try { return JSON.parse(sessionStorage.getItem(CLAVE_ESTADO) || 'null'); } catch (e) { return null; }
  }
  /** Sólo vistas que existen en esta página, con campos saneados. */
  function vistaValida(v) {
    if (!v || typeof v !== 'object') return null;
    const scroll = Math.max(0, Number(v.scroll) || 0);
    if (v.tipo === 'verso' && versoDe(capDe(v), v.n)) {
      return { tipo: 'verso', c: capDe(v), n: v.n, scroll, ...(/^pv-[a-z]+$/.test(v.sec || '') ? { sec: v.sec } : {}) };
    }
    if (v.tipo === 'termino' && typeof v.id === 'string' && glos[v.id]) return { tipo: 'termino', id: v.id, scroll };
    if (v.tipo === 'arbol' && ARB) {
      const num = (x, a, b) => Math.max(a, Math.min(b, Number(x) || 0));
      return {
        tipo: 'arbol', scroll, ...(enArbol.has(v.foco) ? { foco: v.foco } : {}),
        ...(Number(v.z) > 0 ? { z: num(v.z, Z_MIN, Z_MAX), sx: num(v.sx, 0, 1e5), sy: num(v.sy, 0, 1e5) } : {}),
      };
    }
    if (v.tipo === 'glosario') {
      return { tipo: 'glosario', scroll, q: typeof v.q === 'string' ? v.q.slice(0, 100) : '', filtro: TIPOS[v.filtro] ? v.filtro : '' };
    }
    return null;
  }
  function restaurarEstado() {
    const est = leerEstado();
    if (!est) return;
    (Array.isArray(est.orig) ? est.orig : []).forEach(n => {
      const ve = d.getElementById('v' + Number(n)); if (ve) ve.classList.add('orig-abierto');
    });
    const vistas = (Array.isArray(est.pila) ? est.pila : []).map(vistaValida).filter(Boolean).slice(-30);
    if (!vistas.length) return;
    if (!panel) crearPanel();
    pila = vistas;
    d.body.classList.add('sin-transicion');            // reaparece sin animación
    restaurando = true; pintar(); restaurando = false;
    panel.classList.add('abierto');
    d.body.classList.add('panel-abierto');
    requestAnimationFrame(() => requestAnimationFrame(() => d.body.classList.remove('sin-transicion')));
  }
  function alternarOrig(ve) {
    if (!ve) return;
    ve.classList.toggle('orig-abierto');
    guardarEstado();
  }
  function crearPanel() {
    panel = el('aside', { class: 'panel', 'aria-label': 'Panel de exploración' });
    panel.innerHTML = `<div class="panel-cab">
      <button type="button" data-p="atras" title="Atrás" aria-label="Atrás">←</button>
      <div class="panel-ruta"></div>
      <button type="button" data-p="ant" title="Verso anterior (←)" aria-label="Verso anterior">‹</button>
      <button type="button" data-p="sig" title="Verso siguiente (→)" aria-label="Verso siguiente">›</button>
      <button type="button" data-p="arbol" class="btn-arbol" title="Árbol familiar (a)" aria-label="Abrir el árbol familiar"><svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="5.5" y="1.2" width="5" height="3.6" rx="1"/><rect x="1" y="11.2" width="5" height="3.6" rx="1"/><rect x="10" y="11.2" width="5" height="3.6" rx="1"/><path d="M8 4.8V8M3.5 11.2V8h9v3.2"/></svg></button>
      <button type="button" data-p="glosario" class="btn-az" title="Glosario (g)" aria-label="Abrir el glosario">A–Z</button>
      <button type="button" data-p="cerrar" title="Cerrar (Esc)" aria-label="Cerrar">✕</button>
    </div><div class="panel-cuerpo"></div>`;
    cuerpo = $('.panel-cuerpo', panel);
    panel.querySelector('.panel-cab').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const p = b.dataset.p;
      if (p === 'atras') atras();
      else if (p === 'cerrar') cerrarPanel();
      else if (p === 'ant') moverVerso(-1);
      else if (p === 'sig') moverVerso(1);
      else if (p === 'glosario') abrirGlosario();
      else if (p === 'arbol') abrirArbol();
    });
    cuerpo.addEventListener('click', e => {
      const ir = e.target.closest('.pv-indice a');
      if (ir) {
        e.preventDefault();
        const t = cuerpo.querySelector(ir.getAttribute('href'));
        if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      const pal = e.target.closest('.pal.con-ref');
      if (pal && !e.target.closest('a')) abrir({ tipo: 'termino', id: pal.dataset.t });
      const ba = e.target.closest('button[data-arbol]');
      if (ba) abrirArbol(ba.dataset.arbol);
    });
    cuerpo.addEventListener('click', e => {
      const item = e.target.closest('.pg-item');
      if (item && !(e.ctrlKey || e.metaKey || e.shiftKey)) { e.preventDefault(); abrir({ tipo: 'termino', id: item.dataset.pg }); return; }
      const f = e.target.closest('.pg-filtros button');
      if (f) {
        const v = pila[pila.length - 1];
        v.filtro = f.dataset.filtro;
        $$('.pg-filtros button', cuerpo).forEach(b => b.setAttribute('aria-pressed', String(b === f)));
        llenarGlosario(v); guardarEstado();
      }
    });
    let tBusca = 0;
    cuerpo.addEventListener('input', e => {
      if (!e.target.matches('.pg-buscar')) return;
      const v = pila[pila.length - 1];
      v.q = e.target.value;
      llenarGlosario(v);
      clearTimeout(tBusca); tBusca = setTimeout(guardarEstado, 300);
    });
    cuerpo.addEventListener('keydown', e => {
      // Desde el buscador, ↓ lleva al primer resultado; Enter abre el primero.
      if (e.target.matches('.pg-buscar')) {
        const primero = cuerpo.querySelector('.pg-item');
        if (e.key === 'ArrowDown' && primero) { e.preventDefault(); primero.focus(); }
        if (e.key === 'Enter' && primero) { e.preventDefault(); primero.click(); }
      }
    });
    cuerpo.addEventListener('keydown', e => {
      const pal = e.target.closest('.pal.con-ref');
      if (pal && e.key === 'Enter') abrir({ tipo: 'termino', id: pal.dataset.t });
    });
    let tScroll = 0;
    cuerpo.addEventListener('scroll', () => { clearTimeout(tScroll); tScroll = setTimeout(guardarEstado, 200); }, { passive: true });
    const velo = el('div', { class: 'velo' });
    velo.addEventListener('click', cerrarPanel);
    d.body.append(velo, panel);
  }

  function abrir(vista, reemplazar = false) {
    if (vista.tipo === 'verso' && !vista.c) vista.c = capNum;
    if (!panel) crearPanel();
    cerrarFlotantes();
    if (pila.length && panel.classList.contains('abierto')) pila[pila.length - 1].scroll = Math.round(cuerpo.scrollTop);
    if (reemplazar && pila.length) pila[pila.length - 1] = vista; else pila.push(vista);
    if (pila.length > 30) pila.shift();
    pintar();
    panel.classList.add('abierto');
    d.body.classList.add('panel-abierto');
    guardarEstado();
  }
  function atras() { if (pila.length > 1) { pila.pop(); pintar(); } }
  function cerrarPanel() {
    if (!panel) return;
    panel.classList.remove('abierto');
    d.body.classList.remove('panel-abierto', 'con-arbol');
    pila = [];
    visorPanel = null;
    $$('.verso.activo').forEach(x => x.classList.remove('activo'));
    guardarEstado();
  }
  function moverVerso(delta) {
    const top = pila[pila.length - 1];
    if (!top || top.tipo !== 'verso') return;
    const n = top.n + delta;
    if (versoDe(capDe(top), n)) abrir({ tipo: 'verso', c: capDe(top), n }, true);
  }
  const vistaTitulo = v => v.tipo === 'verso' ? `${capDe(v)}.${v.n}` : v.tipo === 'glosario' ? 'Glosario'
    : v.tipo === 'arbol' ? 'Árbol familiar' : nombre(v.id);

  function pintar() {
    const v = pila[pila.length - 1];
    const cab = $('.panel-cab', panel);
    cab.querySelector('[data-p="atras"]').disabled = pila.length < 2;
    const esVerso = v.tipo === 'verso';
    cab.querySelector('[data-p="ant"]').hidden = !esVerso;
    cab.querySelector('[data-p="sig"]').hidden = !esVerso;
    if (esVerso) {
      cab.querySelector('[data-p="ant"]').disabled = !versoDe(capDe(v), v.n - 1);
      cab.querySelector('[data-p="sig"]').disabled = !versoDe(capDe(v), v.n + 1);
    }
    const ruta = pila.slice(-4).map(vistaTitulo);
    cab.querySelector('[data-p="glosario"]').hidden = v.tipo === 'glosario';
    const esArbol = v.tipo === 'arbol';
    cab.querySelector('[data-p="arbol"]').hidden = esArbol || !ARB;
    panel.classList.toggle('panel-arbol', esArbol);       // el árbol necesita un panel ancho
    d.body.classList.toggle('con-arbol', esArbol);         // en escritorio, vela el texto que queda detrás
    cuerpo.classList.toggle('cuerpo-arbol', esArbol);
    $('.panel-ruta', panel).innerHTML = (pila.length > 4 ? '… › ' : '') +
      ruta.map((t, i) => i === ruta.length - 1 ? `<b>${escH(t)}</b>` : escH(t)).join(' › ');

    cuerpo.innerHTML = esVerso ? htmlVerso(capDe(v), v.n) : v.tipo === 'glosario' ? htmlGlosario(v) : esArbol ? htmlArbol() : htmlTermino(v.id);
    if (v.tipo === 'glosario') llenarGlosario(v);
    visorPanel = esArbol ? montarVisor($('.visor-arbol', cuerpo), v, guardarEstado, !restaurando) : null;
    if (esArbol) { /* el visor guarda y restaura su propio desplazamiento y zoom */ }
    else if (v.scroll !== undefined) cuerpo.scrollTop = v.scroll;   // vista ya visitada: misma posición
    else {
      cuerpo.scrollTop = 0;
      if (esVerso && v.sec) {
        const s = cuerpo.querySelector('#' + v.sec);
        if (s) s.scrollIntoView({ block: 'start' });
      }
    }
    $$('.verso.activo').forEach(x => x.classList.remove('activo'));
    if (esVerso && capDe(v) === capNum) {   // el verso está en el texto de esta página
      const ve = d.getElementById('v' + v.n);
      if (ve) {
        ve.classList.add('activo');
        fijarCursor(ve, false);
        if (!restaurando) asegurarVisible(ve);   // tras recargar, el navegador ya restaura el desplazamiento
      }
    }
    if (!restaurando) guardarEstado();
  }

  function asegurarVisible(ve) {
    const r = ve.getBoundingClientRect();
    const barraH = barra ? barra.offsetHeight : 0;
    const limiteInf = anchoDock.matches ? innerHeight : innerHeight * 0.18 + barraH;
    if (r.top < barraH + 8 || r.bottom > limiteInf) {
      const destino = scrollY + r.top - barraH - 16;
      scrollTo({ top: destino, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
  }

  function gramatica(g) {
    if (!g) return '';
    const expandido = g.split(/\s+/).map(tk => GRAM[tk] || tk).join(' ');
    return `<span class="pal-gram" title="${escH(g)}">${escH(expandido)}</span>`;
  }

  function htmlVerso(c, n) {
    const v = versoDe(c, n);
    if (!v) return '<p class="pv-vacio">Verso no disponible.</p>';
    const cambios = [...v.t.matchAll(/data-h="([^"]+)"/g)].map(m => m[1]);
    const hablantes = [v.hablante, ...cambios].map(nombre).join(' → ');
    const indice = [['pv-trad', 'Traducción'], ...(v.alt ? [['pv-alt', 'Alternativas']] : []), ['pv-orig', 'Original'], ...(v.ens ? [['pv-ens', 'Enseñanza']] : []), ['pv-pal', 'Palabra por palabra']];
    if (v.nota) indice.push(['pv-nota', 'Notas']);
    if (v.interp.length) indice.push(['pv-interp', 'Interpretaciones']);
    const palabras = v.palabras.map(p => {
      const ref = p.ref && glos[p.ref];
      return `<li class="pal${ref ? ' con-ref' : ''}"${ref ? ` data-t="${p.ref}" tabindex="0" title="Abrir la ficha de ${escH(ref.nombre)}"` : ''}>
        <span class="pal-iast" lang="sa">${escH(p.iast)}${p.sa ? `<span class="pal-sa">${escH(p.sa)}</span>` : ''}</span>
        <span class="pal-es">${escH(p.es)}${ref ? `<span class="pal-ir">${escH(ref.nombre)} →</span>` : ''}</span>
        ${gramatica(p.gram)}
        ${p.analisis ? `<span class="pal-anal">${escH(p.analisis)}</span>` : ''}
      </li>`;
    }).join('');
    return `
      <div class="pv-titulo"><h2>Verso ${c}.${n}</h2><span class="pv-hab">${escH(hablantes)}</span></div>
      <nav class="pv-indice">${indice.map(([id, t]) => `<a href="#${id}">${t}</a>`).join('')}</nav>
      <section class="pv-sec" id="pv-trad"><h3>Traducción</h3><div class="pv-trad">${v.t}</div></section>
      ${htmlAlternativas(v)}
      <section class="pv-sec pv-orig" id="pv-orig"><h3>Original</h3>
        <p class="deva" lang="sa">${v.sa.map((l, i) => lineaOrig(l, v.rojas.includes(i))).join("<br>")}</p>
        <p class="iast" lang="sa">${v.iast.map((l, i) => lineaOrig(l, v.rojas.includes(i))).join("<br>")}</p>
        ${v.metro ? `<p class="pv-metro">Metro: ${escH(v.metro)}</p>` : ''}</section>
      ${htmlEnsVerso(v, c)}
      <section class="pv-sec" id="pv-pal"><h3>Palabra por palabra</h3><ul class="pal-lista">${palabras}</ul></section>
      ${v.nota ? `<section class="pv-sec" id="pv-nota"><h3>Notas</h3>${v.nota}</section>` : ''}
      ${v.interp.length ? `<section class="pv-sec" id="pv-interp"><h3>Interpretaciones</h3>${v.interp.map(i =>
        `<div class="interp"><p class="interp-trad">${escH(i.tradNombre || '')}</p><h4>${escH(i.titulo)}</h4>${i.html}</div>`).join('')}</section>` : ''}`;
  }

  /** Otras traducciones posibles del verso, con lo que cambia en cada una. */
  function htmlAlternativas(v) {
    if (!v.alt) return '';
    // En rojo si todo el verso es de Kṛṣṇa (como la traducción principal).
    const roja = v.hablante === 'krsna' && !/data-h="(?!krsna)/.test(v.t);
    return `<section class="pv-sec pv-alt" id="pv-alt"><h3>Alternativas de traducción</h3>${v.alt.map(a =>
      `<div class="alt"><p class="alt-texto${roja ? ' voz-krsna' : ''}">${a.html}</p><div class="alt-nota">${a.nota}</div></div>`).join('')}</section>`;
  }

  /** Sección «Enseñanza» del panel de un verso que forma parte de una. */
  function htmlEnsVerso(v, c) {
    const e = v.ens && ((G.capitulos[c] || {}).ensenanzas || []).find(x => x.id === v.ens);
    if (!e) return '';
    const rango = e.desde === e.hasta ? `${c}.${e.desde}` : `${c}.${e.desde}–${c}.${e.hasta}`;
    return `<section class="pv-sec pv-ens" id="pv-ens"><h3>Enseñanza</h3>
      <p class="ens-meta"><span class="ens-tipo">${escH(e.tipoNombre)}</span> ${rango}</p>
      <h4 class="pv-ens-tit">${escH(e.titulo)}</h4>${e.resumen}
      <p><a href="ensenanzas.html#${e.id}" style="font-family:var(--sans);font-size:.8em">Ver con sus interpretaciones por tradición ↗</a></p></section>`;
  }

  function enlaceVerso(ref) {
    const [c, v] = ref.split('.');
    return `<a class="vref" href="capitulo-${String(c).padStart(2, '0')}.html#v${v}" data-v="${ref}">${ref}</a>`;
  }

  /* ---------------- vista «Glosario» en el panel ---------------- */
  const TIPOS_PLURAL = [
    ['personaje', 'Personajes'], ['divinidad', 'Divinidades'], ['epiteto', 'Epítetos'], ['grupo', 'Linajes y grupos'],
    ['lugar', 'Lugares'], ['objeto', 'Objetos'], ['concepto', 'Conceptos'], ['termino', 'Términos'],
    ['texto', 'Textos'], ['tradicion', 'Tradiciones'], ['persona', 'Comentaristas'],
  ];
  const sinMarcas = s => String(s || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  let indiceGlos = null;
  function indiceGlosario() {
    if (indiceGlos) return indiceGlos;
    const tmp = d.createElement('div');
    indiceGlos = Object.entries(glos).map(([id, g]) => {
      tmp.innerHTML = g.breve;
      const breve = tmp.textContent;
      return { id, g, breve, nombre: sinMarcas(g.nombre), clave: sinMarcas(`${g.nombre} ${g.iast} ${id}`), texto: sinMarcas(breve) };
    }).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    return indiceGlos;
  }
  function htmlGlosario(v) {
    const presentes = new Set(Object.values(glos).map(g => g.tipo));
    const filtros = [['', 'Todo'], ...TIPOS_PLURAL.filter(([t]) => presentes.has(t))].map(([t, r]) =>
      `<button type="button" data-filtro="${t}" aria-pressed="${t === (v.filtro || '')}">${r}</button>`).join('');
    return `<div class="pg-cab">
        <h2 class="pt-nombre">Glosario</h2>
        <input type="search" class="pg-buscar" placeholder="Buscar término…" aria-label="Buscar en el glosario" value="${escH(v.q || '')}" autocomplete="off" spellcheck="false">
        <div class="pg-filtros">${filtros}</div>
        <p class="pg-cuenta" aria-live="polite"></p>
      </div>
      <div class="pg-lista"></div>
      <p><a href="glosario.html" style="font-family:var(--sans);font-size:.8em">Página completa del glosario ↗</a></p>`;
  }
  function llenarGlosario(v) {
    const q = sinMarcas((v.q || '').trim());
    const res = indiceGlosario().filter(e => (!v.filtro || e.g.tipo === v.filtro) && (!q || e.clave.includes(q) || e.texto.includes(q)));
    if (q) res.sort((a, b) => (b.clave.includes(q) - a.clave.includes(q)) || a.nombre.localeCompare(b.nombre, 'es')); // primero, coincidencias en el nombre
    const item = e => `<li><a class="pg-item" href="glosario.html#${e.id}" data-pg="${e.id}">
        <span class="pg-nombre">${escH(e.g.nombre)}</span>${e.g.sa ? `<span class="pg-deva" lang="sa">${escH(e.g.sa)}</span>` : ''}
        <span class="pg-breve">${escH(e.breve)}</span></a></li>`;
    let html = '';
    if (q) html = res.length ? `<ul class="pg-grupo">${res.map(item).join('')}</ul>` : '<p class="pv-vacio">Sin resultados.</p>';
    else {
      for (const [t, rotulo] of TIPOS_PLURAL) {
        const del = res.filter(e => e.g.tipo === t);
        if (del.length) html += `<h3 class="pg-tipo">${rotulo}</h3><ul class="pg-grupo">${del.map(item).join('')}</ul>`;
      }
    }
    $('.pg-lista', cuerpo).innerHTML = html;
    $('.pg-cuenta', cuerpo).textContent = q || v.filtro ? `${res.length} de ${indiceGlos.length} términos` : `${indiceGlos.length} términos`;
  }
  function abrirGlosario(conTeclado = false) {
    const top = pila[pila.length - 1];
    if (!(panel && panel.classList.contains('abierto') && top && top.tipo === 'glosario')) abrir({ tipo: 'glosario', q: '', filtro: '' });
    // Foco en el buscador si hay teclado físico (en táctil abriría el teclado virtual sin pedirlo).
    if (hoverFino || conTeclado) { const b = $('.pg-buscar', cuerpo); if (b) b.focus({ preventScroll: true }); }
  }

  function htmlTermino(id) {
    const g = glos[id];
    if (!g) return '<p class="pv-vacio">Término no encontrado.</p>';
    const rel = g.relacionados.length ? `<section class="pv-sec"><h3>Véase también</h3><div class="chips">${g.relacionados.map(r =>
      `<a class="t" href="glosario.html#${r}" data-t="${r}">${escH(nombre(r))}</a>`).join('')}</div></section>` : '';
    const apar = g.aparece.filter(r => r !== 'intro');
    const aparHtml = apar.length ? `<section class="pv-sec"><h3>Aparece en</h3><div class="chips">${apar.map(enlaceVerso).join('')}</div></section>` : '';
    return `
      <p class="pt-tipo">${TIPOS[g.tipo] || ''}</p>
      <h2 class="pt-nombre">${escH(g.nombre)}</h2>
      ${g.sa ? `<p class="pt-deva" lang="sa">${escH(g.sa)}</p>` : ''}
      ${g.refiere ? `<p class="pt-refiere">Epíteto de <a class="t" href="glosario.html#${g.refiere}" data-t="${g.refiere}">${escH(nombre(g.refiere))}</a></p>` : ''}
      ${g.significado ? `<p class="pt-signif">${g.significado}</p>` : ''}
      <div class="pt-breve"><p>${g.breve}</p></div>
      ${g.texto}
      ${rel}${aparHtml}
      ${enArbol.has(id) ? `<p><button type="button" class="pt-arbol" data-arbol="${id}">Ver en el árbol familiar</button></p>` : ''}
      <p><a href="glosario.html#${id}" style="font-family:var(--sans);font-size:.8rem">Abrir en el glosario ↗</a></p>`;
  }

  /* ---------------- árbol familiar ---------------- */
  // GITA.arbol (datos/arbol.js): el SVG generado por herramientas/arbol.py, la leyenda y las personas con ficha.
  const ARB = G.arbol || null;
  const enArbol = new Set(ARB ? ARB.ids : []);
  const svgPanel = ARB ? ARB.svg.replace(/ id="a-[^"]+"/g, '') : '';   // sin ids: podrían repetirse con la página
  const Z_MIN = 0.1, Z_MAX = 2.5;
  let visorPanel = null, visorPagina = null;

  function htmlArbol() {
    return `<div class="visor-arbol">
      <div class="va-herr">
        <span class="va-zoom"><button type="button" data-z="-1" aria-label="Alejar" title="Alejar (−)">−</button><button type="button" data-z="0" class="va-pct" title="Tamaño real (0)">100 %</button><button type="button" data-z="1" aria-label="Acercar" title="Acercar (+)">+</button><button type="button" data-z="ajustar" title="Ver el árbol entero">Ver todo</button></span>
        <details class="va-ley"${anchoDock.matches ? ' open' : ''}><summary>Cómo leerlo</summary>${ARB.leyenda}</details>
        <a class="va-enlace" href="arbol.html">Página completa ↗</a></div>
      <div class="va-lienzo" tabindex="-1">${svgPanel}</div></div>`;
  }

  /** Zoom, arrastre y resaltado de parientes sobre un .visor-arbol.
      estado: {z, sx, sy, foco} — se actualiza en el sitio; alCambiar() lo persiste. */
  function montarVisor(caja, estado, alCambiar, destellar = true) {
    const lienzo = $('.va-lienzo', caja), svg = $('svg', lienzo), pct = $('.va-pct', caja);
    const W0 = Number(svg.getAttribute('width')), H0 = Number(svg.getAttribute('height'));
    const limitar = x => Math.max(Z_MIN, Math.min(Z_MAX, x));
    let z = 1, tAviso = 0;
    function avisar() {
      estado.z = Math.round(z * 1000) / 1000;
      estado.sx = Math.round(lienzo.scrollLeft); estado.sy = Math.round(lienzo.scrollTop);
      clearTimeout(tAviso); tAviso = setTimeout(alCambiar, 250);
    }
    function aplicarZ() {
      svg.style.width = W0 * z + 'px'; svg.style.height = H0 * z + 'px';
      if (pct) pct.textContent = Math.round(z * 100) + ' %';
    }
    /** Lleva el punto (ux, uy) del dibujo a la posición (px, py) del lienzo. */
    function situar(ux, uy, px, py) {
      const l = lienzo.getBoundingClientRect(), r = svg.getBoundingClientRect();
      lienzo.scrollLeft += r.left + ux * z - (l.left + px);
      lienzo.scrollTop += r.top + uy * z - (l.top + py);
    }
    /** Cambia el zoom manteniendo fijo el punto (px, py) del lienzo (por defecto, el centro). */
    function zoom(nz, px = lienzo.clientWidth / 2, py = lienzo.clientHeight / 2) {
      const l = lienzo.getBoundingClientRect(), r = svg.getBoundingClientRect();
      const ux = (l.left + px - r.left) / z, uy = (l.top + py - r.top) / z;
      z = limitar(nz); aplicarZ();
      situar(ux, uy, px, py);
      avisar();
    }
    function ajustar() {
      z = limitar(Math.min(lienzo.clientWidth / W0, lienzo.clientHeight / H0) * 0.98); aplicarZ();
      lienzo.scrollLeft = 0; lienzo.scrollTop = 0;
      avisar();
    }
    const nodo = id => svg.querySelector(`[data-n="${id}"]`);
    function centro(n) {
      const c = n.querySelector('rect');
      return [c.x.baseVal.value + c.width.baseVal.value / 2, c.y.baseVal.value + c.height.baseVal.value / 2];
    }
    function enfocar(id, conDestello = true) {
      const n = nodo(id);
      if (!n) return;
      $$('.foco', svg).forEach(x => x.classList.remove('foco', 'destello'));
      n.classList.add('foco');
      if (conDestello) { void n.getBoundingClientRect(); n.classList.add('destello'); }
      estado.foco = id;
      const [ux, uy] = centro(n);
      situar(ux, uy, lienzo.clientWidth / 2, lienzo.clientHeight / 2);
      avisar();
    }

    // Estado inicial: el guardado (al volver o recargar), o centrado en la persona pedida o en Pāṇḍu.
    if (estado.z) {
      z = limitar(estado.z); aplicarZ();
      lienzo.scrollLeft = estado.sx || 0; lienzo.scrollTop = estado.sy || 0;
      if (estado.foco && nodo(estado.foco)) nodo(estado.foco).classList.add('foco');
    } else {
      z = lienzo.clientWidth < 700 ? 0.7 : 0.9; aplicarZ();
      if (estado.foco && nodo(estado.foco)) enfocar(estado.foco, destellar);
      else if (nodo('pandu')) { const [ux, uy] = centro(nodo('pandu')); situar(ux, uy + 50, lienzo.clientWidth / 2, lienzo.clientHeight / 2); }
      avisar();
    }

    lienzo.addEventListener('scroll', () => {
      estado.sx = Math.round(lienzo.scrollLeft); estado.sy = Math.round(lienzo.scrollTop);
      clearTimeout(tAviso); tAviso = setTimeout(alCambiar, 250);
    }, { passive: true });

    caja.addEventListener('click', e => {
      const b = e.target.closest('[data-z]');
      if (!b) return;
      const k = b.dataset.z;
      if (k === 'ajustar') ajustar(); else if (k === '0') zoom(1); else zoom(z * (k === '1' ? 1.25 : 0.8));
    });

    // Ctrl + rueda (y el gesto de pellizco del trackpad, que llega así): zoom hacia el cursor.
    lienzo.addEventListener('wheel', e => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const l = lienzo.getBoundingClientRect();
      zoom(z * Math.exp(-e.deltaY * 0.0025), e.clientX - l.left, e.clientY - l.top);
    }, { passive: false });

    // Pellizco con dos dedos en pantallas táctiles (el desplazamiento con un dedo es el nativo).
    let pinza = null;
    const dist = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    lienzo.addEventListener('touchstart', e => { if (e.touches.length === 2) pinza = { d: dist(e.touches), z }; }, { passive: true });
    lienzo.addEventListener('touchmove', e => {
      if (!pinza || e.touches.length !== 2) return;
      e.preventDefault();
      const l = lienzo.getBoundingClientRect(), [a, b] = e.touches;
      zoom(pinza.z * dist(e.touches) / pinza.d, (a.clientX + b.clientX) / 2 - l.left, (a.clientY + b.clientY) / 2 - l.top);
    }, { passive: false });
    lienzo.addEventListener('touchend', e => { if (e.touches.length < 2) pinza = null; });

    // Arrastrar con el ratón para desplazarse; si hubo arrastre, el clic no abre la ficha.
    let arr = null, movido = false;
    lienzo.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      arr = { x: e.clientX, y: e.clientY, sl: lienzo.scrollLeft, st: lienzo.scrollTop, id: e.pointerId };
      movido = false;
    });
    lienzo.addEventListener('pointermove', e => {
      if (!arr) return;
      const dx = e.clientX - arr.x, dy = e.clientY - arr.y;
      if (!movido) {
        if (Math.hypot(dx, dy) < 5) return;
        movido = true;
        lienzo.classList.add('arrastrando');
        try { lienzo.setPointerCapture(arr.id); } catch (err) { /* puntero ya liberado */ }
        cerrarPop(); resaltar(null);
      }
      lienzo.scrollLeft = arr.sl - dx; lienzo.scrollTop = arr.st - dy;
    });
    const soltar = () => { arr = null; lienzo.classList.remove('arrastrando'); };
    lienzo.addEventListener('pointerup', soltar);
    lienzo.addEventListener('pointercancel', soltar);
    lienzo.addEventListener('click', e => {
      if (movido) { e.preventDefault(); e.stopPropagation(); movido = false; }
    }, true);
    lienzo.addEventListener('dragstart', e => e.preventDefault());

    // Al pasar sobre una persona (o enfocarla con Tab), se resaltan sus parientes directos.
    function resaltar(n) {
      $$('.activo, .pariente', svg).forEach(x => x.classList.remove('activo', 'pariente'));
      svg.classList.toggle('resaltando', !!n);
      if (!n) return;
      n.classList.add('activo');
      n.dataset.rel.split(' ').forEach(r => { const o = r && nodo(r); if (o) o.classList.add('pariente'); });
    }
    svg.addEventListener('mouseover', e => { if (!arr || !movido) resaltar(e.target.closest('.an')); });
    svg.addEventListener('mouseleave', () => resaltar(null));
    svg.addEventListener('focusin', e => { if (e.target.matches(':focus-visible')) resaltar(e.target.closest('.an')); });
    svg.addEventListener('focusout', () => resaltar(null));

    return { zoom: f => zoom(f === 0 ? 1 : z * f), ajustar, enfocar, caja };
  }

  /** Abre el árbol (en el panel, o en la propia página del árbol), opcionalmente centrado en una persona. */
  function abrirArbol(foco) {
    if (!ARB) return;
    if (visorPagina) {
      if (foco) {
        if (!anchoDock.matches) cerrarPanel();     // en móvil el panel taparía el árbol
        visorPagina.caja.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        visorPagina.enfocar(foco);
      }
      return;
    }
    const top = pila[pila.length - 1];
    if (panel && panel.classList.contains('abierto') && top && top.tipo === 'arbol') {
      if (foco && visorPanel) visorPanel.enfocar(foco);
      return;
    }
    abrir(foco ? { tipo: 'arbol', foco } : { tipo: 'arbol' });
  }
  function visorVisible() {
    const top = pila[pila.length - 1];
    if (panel && panel.classList.contains('abierto') && top && top.tipo === 'arbol') return visorPanel;
    return visorPagina;
  }

  /* ---------------- clics globales ---------------- */
  d.addEventListener('click', e => {
    if (panelAjustes && !e.target.closest('.ajustes')) { panelAjustes.remove(); panelAjustes = null; }
    if (menu && !e.target.closest('.menu-ctx')) cerrarMenu();
    if (!e.target.closest('.menu-caps')) $$('.menu-caps[open]').forEach(x => x.removeAttribute('open'));

    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return; // abrir en pestaña nueva, etc.
    const a = e.target.closest('a.t');
    if (a && glos[a.dataset.t]) {
      e.preventDefault();
      if (hoverFino || popId === a.dataset.t || a.closest('.panel')) { cerrarPop(); abrir({ tipo: 'termino', id: a.dataset.t }); }
      else mostrarPop(a);   // táctil: primer toque, definición breve
      return;
    }
    const vr = e.target.closest('a.vref[data-v]');
    if (vr) {
      const [c, n] = vr.dataset.v.split('.').map(Number);
      const ficha = !vr.closest('.panel') && vr.closest('.ens-ficha');
      const ensVerso = ficha && ficha.querySelector(`.ens-verso[data-c="${c}"][data-v="${n}"]`);
      if (ensVerso) {
        e.preventDefault();
        abrirMenu(ensVerso, 0, 0, vr.getBoundingClientRect());
        return;
      }
      if (versoDe(c, n) && (vr.closest('.panel') || !vr.closest('#lectura'))) {
        e.preventDefault();
        abrir({ tipo: 'verso', c, n });
      }
    }
    if (pop && !e.target.closest('.pop')) cerrarPop();
  });

  /* ---------------- cursor de teclado ---------------- */
  let cursor = null;
  function fijarCursor(ve, mostrar = true) {
    if (cursor) cursor.classList.remove('cursor');
    cursor = ve;
    if (mostrar && ve) { ve.classList.add('cursor'); asegurarVisible(ve); }
  }
  function primerVisible() {
    const bh = barra ? barra.offsetHeight : 0;
    return $$('.verso').find(v => v.getBoundingClientRect().bottom > bh + 10) || $('.verso');
  }
  function moverCursor(delta) {
    const top = pila[pila.length - 1];
    if (panel && panel.classList.contains('abierto') && top && top.tipo === 'verso') { moverVerso(delta); return; }
    const todos = $$('.verso');
    if (!todos.length) return;
    let i = cursor ? todos.indexOf(cursor) : -1;
    if (i < 0) { fijarCursor(primerVisible()); return; }
    i = Math.max(0, Math.min(todos.length - 1, i + delta));
    fijarCursor(todos[i]);
  }

  const vistaVerso = () => !!(panel && panel.classList.contains('abierto') && pila.length && pila[pila.length - 1].tipo === 'verso');
  d.addEventListener('keydown', e => {
    const t = e.target;
    if (e.key === 'Escape') {
      if (menu || pop || panelAjustes) { cerrarFlotantes(); return; }
      if (panel && panel.classList.contains('abierto')) { cerrarPanel(); return; }
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (t.closest && t.closest('input, textarea, select, [contenteditable]')) return;
    if (menu) return;
    const enCapitulo = !!cap;
    switch (e.key) {
      case 'j': if (enCapitulo) { e.preventDefault(); moverCursor(1); } break;
      case 'k': if (enCapitulo) { e.preventDefault(); moverCursor(-1); } break;
      case 'ArrowRight': if (vistaVerso()) { e.preventDefault(); moverVerso(1); } break;
      case 'ArrowLeft': if (vistaVerso()) { e.preventDefault(); moverVerso(-1); } break;
      case 'Backspace': if (pila.length > 1) { e.preventDefault(); atras(); } break;
      case 'Enter':
        if (enCapitulo && cursor && !t.closest('a, button, .pal')) { e.preventDefault(); abrir({ tipo: 'verso', n: Number(cursor.dataset.v) }); }
        break;
      case 'g': e.preventDefault(); abrirGlosario(true); break;
      case 'a': if (ARB && !visorPagina) { e.preventDefault(); abrirArbol(); } break;
      case '+': case '=': case '-': case '0': {
        const vis = visorVisible();
        if (vis) { e.preventDefault(); vis.zoom(e.key === '0' ? 0 : e.key === '-' ? 0.8 : 1.25); }
        break;
      }
      case 'o': if (enCapitulo) { const ve = cursor || $('.verso.activo') || primerVisible(); alternarOrig(ve); } break;
      case '1': case '2': case '3': if (enCapitulo) fijar('nivel', e.key); break;
      default: break;
    }
  });

  // El enlace «Glosario» de la barra abre el glosario en el panel (Ctrl/⌘/Mayús+clic: la página completa).
  if (!d.body.classList.contains('glosario')) {
    $$('.barra-nav a[href="glosario.html"]').forEach(a => {
      a.title = 'Abrir el glosario en el panel (Ctrl+clic: página completa)';
      a.addEventListener('click', e => {
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault(); e.stopPropagation();
        cerrarFlotantes();
        abrirGlosario();
      });
    });
  }

  // Lo mismo para el árbol familiar (salvo en su propia página).
  if (ARB && !d.body.classList.contains('arbol')) {
    $$('.barra-nav a[href="arbol.html"]').forEach(a => {
      a.title = 'Abrir el árbol familiar en el panel (Ctrl+clic: página completa)';
      a.addEventListener('click', e => {
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault(); e.stopPropagation();
        cerrarFlotantes();
        abrirArbol();
      });
    });
    d.addEventListener('click', e => {
      const a = e.target.closest('.ficha-arbol a[data-arbol]');
      if (!a || e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      abrirArbol(a.dataset.arbol);
    });
  }

  /* ---------------- enlaces a versos (#vN) ---------------- */
  function destellar(e) {
    const m = location.hash.match(/^#v(\d+)$/);
    if (!m) return;
    const ve = d.getElementById('v' + m[1]);
    if (!ve) return;
    // La barra puede ocupar dos filas: recolocar con su altura real.
    // Tras una recarga se respeta la posición que restaura el navegador.
    const nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
    if (e || !nav || nav.type !== 'reload') ve.scrollIntoView({ block: 'start' });
    ve.classList.remove('destello'); void ve.offsetWidth; ve.classList.add('destello');
    fijarCursor(ve, false);
  }
  addEventListener('hashchange', destellar);
  destellar();
  const cajaPagina = $('.arbol-pagina .visor-arbol');
  if (cajaPagina && ARB) {
    const CLAVE_VISOR = 'gita.visor:' + location.pathname;
    let est = null;
    try { est = JSON.parse(sessionStorage.getItem(CLAVE_VISOR) || 'null'); } catch (e) { /* sin almacenamiento */ }
    const nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
    const m = location.hash.match(/^#a-([a-z0-9-]+)$/);
    const conFoco = m && !(nav && nav.type === 'reload');
    if (conFoco) est = { foco: m[1] };     // enlace a una persona: centrar en ella
    // Las anclas #a-<id> sirven sin JavaScript. Con él, el salto lo hace el visor: si no, Firefox
    // desplaza la página y el lienzo por su cuenta (y enfoca la caja) después de centrarla.
    $$('.arbol-svg [id^="a-"]', cajaPagina).forEach(n => n.removeAttribute('id'));
    if (conFoco) cajaPagina.scrollIntoView({ block: 'start' });
    est = vistaValida(Object.assign({}, est, { tipo: 'arbol' }));
    visorPagina = montarVisor(cajaPagina, est, () => {
      try { sessionStorage.setItem(CLAVE_VISOR, JSON.stringify(est)); } catch (e) { /* sin almacenamiento */ }
    });
    addEventListener('hashchange', () => {
      const m2 = location.hash.match(/^#a-([a-z0-9-]+)$/);
      if (m2) visorPagina.enfocar(m2[1]);
    });
  }
  restaurarEstado();
  addEventListener('pagehide', guardarEstado);

  /* ---------------- página de enseñanzas: una cada vez ----------------
     Sin JavaScript (y en el EPUB) se ven todas seguidas. Con él:
     · arriba, filtro por tipo (técnicas / conceptos);
     · dos selectores fijos (capítulo y enseñanza, con su tipo);
     · debajo, filtro de las interpretaciones por tradición;
     · sólo la enseñanza elegida, con «anterior / siguiente» según el filtro de tipo.
     La dirección (#id) identifica la enseñanza: «atrás» y los enlaces desde los capítulos funcionan. */
  const ensPagina = $('.ensenanzas-pagina');
  if (ensPagina) {
    const TIPO_NOMBRE = { tecnica: 'Técnica', concepto: 'Concepto' };
    const secs = $$('.ens-cap', ensPagina);
    const fichas = $$('.ens-ficha', ensPagina);
    const porId = new Map(fichas.map(f => [f.id, f]));
    const trads = (ensPagina.dataset.tradiciones || '').split('|').filter(Boolean).map(x => x.split(':'));
    // Los filtros se recuerdan en la pestaña (al recargar o al volver desde «Ir al texto»).
    const CLAVE_FIL = 'gita.ensenanzas.filtros';
    let guardados = {};
    try { guardados = JSON.parse(sessionStorage.getItem(CLAVE_FIL) || '{}') || {}; } catch (e) { /* sin almacenamiento */ }
    let tipo = ['tecnica', 'concepto'].includes(guardados.tipo) ? guardados.tipo : '';
    let trad = trads.some(([t]) => t === guardados.trad) ? guardados.trad : '';
    let actual = null;
    const recordar = () => { try { sessionStorage.setItem(CLAVE_FIL, JSON.stringify({ tipo, trad })); } catch (e) { /* sin almacenamiento */ } };
    const pasa = f => !tipo || f.dataset.tipo === tipo;

    const chips = (clase, rotulo, clave, opciones) => {
      const div = el('div', { class: `ens-fil ${clase}`, role: 'group', 'aria-label': rotulo });
      const activo = clave === 'tipo' ? tipo : trad;
      div.innerHTML = `<span>${rotulo}</span>` + opciones.map(([v, t]) =>
        `<button type="button" data-${clave}="${v}" aria-pressed="${v === activo}">${escH(t)}</button>`).join('');
      return div;
    };
    const filTipo = chips('ens-fil-tipo', 'Enseñanzas:', 'tipo', [['', 'Todas'], ['tecnica', 'Técnicas'], ['concepto', 'Conceptos']]);
    const combos = el('div', { class: 'ens-selector', role: 'navigation', 'aria-label': 'Elegir enseñanza' });
    combos.innerHTML = `<label><span>Capítulo</span><select data-s="cap"></select></label>
      <label class="ens-sel-ens"><span>Enseñanza</span><select data-s="ens"></select></label>`;
    const filTrad = chips('ens-fil-trad', 'Interpretaciones:', 'trad', [['', 'Todas'], ...trads]);
    // Filtros y selectores, en un bloque que queda fijo bajo la barra superior.
    const bloque = el('div', { class: 'ens-barra' });
    bloque.append(filTipo, combos, filTrad);
    ensPagina.querySelector('.cap-cabecera').after(bloque);
    const selCap = $('[data-s="cap"]', combos), selEns = $('[data-s="ens"]', combos);

    function llenarCaps() {
      selCap.innerHTML = secs.map(s => {
        const pend = s.dataset.estado === 'pendiente', k = $$('.ens-ficha', s).filter(pasa).length;
        return `<option value="${s.dataset.cap}"${pend ? ' disabled' : ''}>${s.dataset.cap}. ${escH(s.dataset.titulo)}${pend ? ' — en preparación' : ` (${k})`}</option>`;
      }).join('');
    }
    function llenarEns(sec) {
      const fs = $$('.ens-ficha', sec).filter(pasa);
      selEns.innerHTML = fs.length
        ? fs.map(f => `<option value="${f.id}">${TIPO_NOMBRE[f.dataset.tipo] || ''} · ${escH(f.dataset.ref)} · ${escH(f.dataset.titulo)}</option>`).join('')
        : `<option value="">(${tipo ? 'ninguna de este tipo' : 'ninguna'} en este capítulo)</option>`;
      selEns.disabled = !fs.length;
    }
    /** Anterior y siguiente según el filtro de tipo (también entre capítulos). */
    function navegacion(f) {
      const i = fichas.indexOf(f);
      const ant = fichas.slice(0, i).reverse().find(pasa), sig = fichas.slice(i + 1).find(pasa);
      const enlace = (x, clase, antes, despues) => x
        ? `<a class="${clase}" href="#${x.id}"><span class="ens-nav-rot">${antes}${escH(x.dataset.ref)}${despues}</span><span class="ens-nav-tit">${escH(x.dataset.titulo)}</span></a>`
        : '<span></span>';
      const html = enlace(ant, 'ens-ant', '← Anterior · ', '') + enlace(sig, 'ens-sig', 'Siguiente · ', ' →');
      $$('.ens-nav', f).forEach(n => { n.innerHTML = html; });
    }
    function aplicarTrad() {
      fichas.forEach(f => {
        $$('.ens-trad', f).forEach(s => { s.hidden = !!trad && s.dataset.trad !== trad; });
        const hay = !trad || f.dataset.trads.split(' ').includes(trad);
        let sin = $('.ens-sin-trad', f);
        if (!hay && !sin) {
          sin = el('p', { class: 'ens-vacio ens-sin-trad' }, 'Todavía sin interpretaciones de esta tradición en esta enseñanza.');
          (f.querySelector('.ens-interp') || f.querySelector('.ens-versos')).after(sin);
        }
        if (sin) sin.hidden = hay;
      });
    }
    /** destino: id de una enseñanza o «cap-N»; sin destino válido, la primera (del tipo elegido). */
    function mostrar(destino, desplazar) {
      let ficha = porId.get(destino), sec;
      if (ficha) sec = ficha.closest('.ens-cap');
      else {
        sec = secs.find(x => x.id === destino) || secs.find(x => $$('.ens-ficha', x).some(pasa)) || secs[0];
        ficha = $$('.ens-ficha', sec).find(pasa) || null;
      }
      actual = ficha;
      secs.forEach(x => { x.hidden = x !== sec; });
      fichas.forEach(f => { f.hidden = f !== ficha; });
      selCap.value = sec.dataset.cap;
      llenarEns(sec);
      if (ficha) { selEns.value = ficha.id; navegacion(ficha); }
      if (desplazar) {
        // Justo debajo de la barra superior y de los selectores fijos.
        const tapa = ($('.barra') ? $('.barra').offsetHeight : 0) + bloque.offsetHeight + 8;
        const y = sec.querySelector('h2').getBoundingClientRect().top + scrollY - tapa;
        scrollTo({ top: Math.max(0, y) });
      }
    }
    const ir = destino => {
      if (location.hash.slice(1) === destino) mostrar(destino, true); else location.hash = destino;
    };
    selCap.addEventListener('change', () => {
      const sec = secs.find(x => x.dataset.cap === selCap.value);
      const f = $$('.ens-ficha', sec).find(pasa);
      ir(f ? f.id : sec.id);
    });
    selEns.addEventListener('change', () => { if (selEns.value) ir(selEns.value); });
    filTipo.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      tipo = b.dataset.tipo; recordar();
      $$('button', filTipo).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      llenarCaps();
      // Si la enseñanza que se ve no es del tipo elegido, la primera que lo sea en el mismo capítulo (o en otro).
      if (actual && !pasa(actual)) {
        const sec = actual.closest('.ens-cap');
        const f = $$('.ens-ficha', sec).find(pasa) || fichas.find(pasa);
        if (f) ir(f.id); else mostrar(sec.id, false);
      } else mostrar(actual ? actual.id : decodeURIComponent(location.hash.slice(1)), false);
    });
    filTrad.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      trad = b.dataset.trad; recordar();
      $$('button', filTrad).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      aplicarTrad();
    });
    addEventListener('hashchange', () => mostrar(decodeURIComponent(location.hash.slice(1)), true));
    ensPagina.classList.add('una-a-una');
    llenarCaps();
    aplicarTrad();
    const inicial = decodeURIComponent(location.hash.slice(1));
    mostrar(inicial, !!inicial);
    // Con las tipografías ya cargadas cambia la altura del texto de arriba: se recoloca.
    if (inicial && d.fonts) d.fonts.ready.then(() => { if (decodeURIComponent(location.hash.slice(1)) === inicial) mostrar(inicial, true); });
  }

  /* ---------------- página del glosario: búsqueda y filtros ---------------- */
  const buscar = $('#glos-buscar');
  if (buscar) {
    const norm = s => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
    let tipoActivo = '';
    const filtrar = () => {
      const q = norm(buscar.value.trim());
      $$('.glos-tipo').forEach(sec => {
        let visibles = 0;
        const tipoOk = !tipoActivo || sec.dataset.tipo === tipoActivo;
        $$('.ficha', sec).forEach(f => {
          const ok = tipoOk && (!q || f.dataset.buscar.includes(q) || norm(f.textContent).includes(q));
          f.hidden = !ok; if (ok) visibles++;
        });
        sec.hidden = !visibles;
      });
    };
    buscar.addEventListener('input', filtrar);
    $$('.glos-filtros button').forEach(b => b.addEventListener('click', () => {
      tipoActivo = b.dataset.tipo;
      $$('.glos-filtros button').forEach(x => x.classList.toggle('activo', x === b));
      filtrar();
    }));
  }
})();
