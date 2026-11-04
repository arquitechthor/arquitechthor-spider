/**
 * Portada: el mapa. Guarda el estado en la URL (?n=<nodo enfocado>&s=<nodo seleccionado>, más la
 * vista: q=<búsqueda>&color=nivel&estado=<filtro>&esencial=1), de modo que el botón atrás y los
 * enlaces compartidos funcionan; pinta la telaraña (assets/telarana.js) y la decora con el color, los
 * filtros y la búsqueda; pinta las migas de pan y el panel de detalle con la autoevaluación
 * (localStorage spider.autoevaluacion). Las fichas leídas (spider.leidas) llevan ✓ (o ↻ si se
 * actualizaron después), se filtran con Estado y se cuentan por rama en el panel.
 */
(async function () {
  const D = window.SpiderDatos;
  const A = window.SpiderArbol;
  const T = window.SpiderTelarana;
  const C = window.SpiderCajas;
  const svg = document.getElementById('telarana');
  const cajasEl = document.getElementById('cajas');
  const lienzo = document.querySelector('.mapa-lienzo');
  const conmutador = document.querySelector('.conmutador');
  const instrucciones = document.getElementById('mapa-instrucciones');
  const panel = document.getElementById('panel');
  const migas = document.getElementById('migas');
  if (!svg) return;

  const NIVELES = ['No lo conozco', 'Me suena', 'Lo he usado', 'Lo domino', 'Podría enseñarlo'];
  // Del rojo al verde; "sin marcar" en gris. El nivel va también en texto (aria-label y panel).
  const COLOR_NIVEL = ['#f87171', '#fb923c', '#facc15', '#a3e635', '#4ade80'];
  const SIN_MARCAR = '#6b7490';
  const ESTADOS = {
    publicado: 'con guía publicada', pendiente: 'próximamente', aws: 'con guía en Apuntes AWS',
    leida: 'con ficha leída', sinleer: 'con ficha sin leer', actualizada: 'actualizados desde que los leíste',
  };
  const TIPO = { raiz: 'Mapa completo', area: 'Área', bloque: 'Bloque', tema: 'Tema' };
  const movil = window.matchMedia('(max-width: 760px)');
  const buscador = document.getElementById('buscar');
  const lista = document.getElementById('buscar-lista');
  const avisoBusqueda = document.getElementById('buscar-estado');
  const selColor = document.getElementById('color-por');
  const selEstado = document.getElementById('filtro-estado');
  const btnEsencial = document.getElementById('filtro-esencial');
  const btnQuitar = document.getElementById('filtros-quitar');
  const leyendaColor = document.getElementById('leyenda-color');

  let datos;
  try {
    datos = await D.cargar();
  } catch (e) {
    console.error(e);
    panel.innerHTML = '<p class="text-faint">No se ha podido cargar el mapa. Recarga la página para intentarlo de nuevo.</p>';
    return;
  }
  const raizId = datos.raiz.id;
  let estado = desdeUrl();
  let vista = vistaDesdeUrl();

  function desdeUrl() {
    const q = new URLSearchParams(location.search);
    let n = q.get('n');
    if (!datos.porId.has(n) || !A.tieneHijos(datos, n)) n = raizId;
    let s = q.get('s');
    if (!datos.porId.has(s) || s === n) s = null;
    return { n, s };
  }

  /**
   * Vista (telaraña o cajas), búsqueda, color y filtros: viajan en la URL con el nodo, para que un
   * enlace compartido los conserve. Sin v ni color en la URL se usa la última elección del usuario
   * (spider.vista); la Telaraña es la predeterminada.
   */
  function vistaDesdeUrl() {
    const q = new URLSearchParams(location.search);
    const pref = D.leer('vista');
    const v = q.get('v') || pref.v;
    const color = q.get('color') || pref.color;
    return {
      v: v === 'cajas' ? 'cajas' : 'telarana',
      q: (q.get('q') || '').slice(0, 80),
      color: color === 'nivel' ? 'nivel' : 'area',
      estado: Object.hasOwn(ESTADOS, q.get('estado')) ? q.get('estado') : '',
      esencial: q.get('esencial') === '1',
    };
  }

  function urlDe({ n, s }) {
    const q = new URLSearchParams();
    if (n && n !== raizId) q.set('n', n);
    if (s) q.set('s', s);
    if (vista.v === 'cajas') q.set('v', 'cajas');
    if (vista.q.trim()) q.set('q', vista.q.trim());
    if (vista.color !== 'area') q.set('color', vista.color);
    if (vista.estado) q.set('estado', vista.estado);
    if (vista.esencial) q.set('esencial', '1');
    const texto = q.toString();
    return location.pathname + (texto ? `?${texto}` : '');
  }

  /** Cambios de la vista (teclear, filtros): reemplazan la entrada del historial, no añaden otra. */
  function cambiarVista(cambios) {
    const otraVista = cambios.v && cambios.v !== vista.v;
    vista = { ...vista, ...cambios };
    if ('v' in cambios || 'color' in cambios) D.guardar('vista', { v: vista.v, color: vista.color });
    history.replaceState(estado, '', urlDe(estado));
    sincronizarControles();
    pintarLeyendaColor();
    if (otraVista) {
      pintar(null);
    } else {
      decorar();
      actualizarHrefs();
    }
  }

  /** Adónde lleva pulsar un nodo: entrar si tiene hijos, seleccionarlo si no. */
  function destinoDe(nodo, { centro = false, acceso = false } = {}) {
    if (centro) return nodo.padre ? { n: nodo.padre, s: null } : { n: raizId, s: null };
    if (A.tieneHijos(datos, nodo.id)) return { n: nodo.id, s: null };
    if (acceso) return { n: nodo.padre, s: nodo.id };
    return { n: estado.n, s: nodo.id };
  }

  function navegar(destino, { reemplazar = false } = {}) {
    const antes = estado;
    estado = { n: destino.n, s: destino.s || null };
    if (estado.s === estado.n) estado.s = null;
    history[reemplazar ? 'replaceState' : 'pushState'](estado, '', urlDe(estado));
    pintar(antes);
  }

  /** Repinta todo. `antes` (estado anterior) decide la animación y dónde dejar el foco del teclado. */
  function pintar(antes) {
    const cambiaFoco = antes && antes.n !== estado.n;
    let enfocar = null;
    if (antes) {
      if (!cambiaFoco) enfocar = estado.s || estado.n;
      else if (A.ancestros(datos, antes.n).some((x) => x.id === estado.n)) {
        // Al subir, el foco vuelve a la rama de la que venimos.
        enfocar = A.ruta(datos, antes.n).map((x) => x.id).find((id) => datos.porId.get(id).padre === estado.n) || estado.n;
      } else enfocar = estado.n;
    }
    const cajas = vista.v === 'cajas';
    svg.hidden = cajas;
    svg.style.display = cajas ? 'none' : '';
    cajasEl.hidden = !cajas;
    lienzo.dataset.vista = vista.v;
    instrucciones.textContent = cajas
      ? 'Pulsa una caja o un chip para entrar en él; «Subir» vuelve un nivel.'
      : 'Pulsa un nodo para entrar en él y el centro para subir.';
    const op = {
      foco: estado.n, sel: estado.s, movil: movil.matches, animar: cambiaFoco,
      enfocar, destinoDe, navegar, urlDe,
    };
    if (cajas) {
      C.dibujar(cajasEl, datos, op);
      svg.replaceChildren();
    } else {
      T.dibujar(svg, datos, op);
      cajasEl.replaceChildren();
    }
    decorar();
    pintarMigas();
    pintarPanel();
    const actual = datos.porId.get(estado.s || estado.n);
    document.title = actual.tipo === 'raiz' ? 'Tech Spider — Mapa de estudio de ingeniería de software' : `${D.nombreTexto(actual)} — Tech Spider`;
  }

  function colorArea(n) {
    const area = n.tipo === 'area' ? n : datos.porId.get(n.area);
    return area ? area.color : '#22d3ee';
  }

  /** Nivel de un tema, o el medio de una rama: { indice (0–4) o null, texto para lectores de pantalla }. */
  function nivelDe(n, auto) {
    if (n.tipo === 'tema') {
      const v = auto[n.id];
      return Number.isInteger(v) ? { indice: v, texto: `Mi nivel: ${v}, ${NIVELES[v]}` } : { indice: null, texto: 'Mi nivel: sin marcar' };
    }
    const m = A.nivelMedio(datos, n.id, auto);
    if (m.media === null) return { indice: null, texto: 'Mi nivel: ningún tema marcado' };
    return {
      indice: Math.round(m.media),
      texto: `Mi nivel medio: ${m.media.toFixed(1).replace('.', ',')} (${m.marcados} de ${m.total} temas marcados)`,
    };
  }

  function estadoDe(tema) {
    if (tema.externo) return 'aws';
    return tema.estado === 'publicado' ? 'publicado' : 'pendiente';
  }

  /** ¿Cumple el tema el filtro Estado? Los de lectura solo cuentan fichas escritas. */
  function cumpleEstado(tema, filtro, leidas) {
    if (filtro === 'leida' || filtro === 'sinleer' || filtro === 'actualizada') {
      if (!D.tieneFicha(tema)) return false;
      const l = D.lecturaDe(tema, leidas);
      if (filtro === 'leida') return Boolean(l);
      if (filtro === 'sinleer') return !l;
      return Boolean(l && l.actualizada);
    }
    return estadoDe(tema) === filtro;
  }

  /** Fichas escritas de una rama (el propio nodo incluido, sin accesos) y cuántas están leídas. */
  function lecturaRama(id, leidas) {
    const vistos = new Set();
    const pila = [id];
    let total = 0;
    let leidasN = 0;
    let actualizadas = 0;
    while (pila.length) {
      const actual = pila.pop();
      if (vistos.has(actual)) continue;
      vistos.add(actual);
      const nodo = datos.porId.get(actual);
      if (D.tieneFicha(nodo)) {
        total++;
        const l = D.lecturaDe(nodo, leidas);
        if (l) { leidasN++; if (l.actualizada) actualizadas++; }
      }
      for (const h of datos.hijos.get(actual) || []) if (!h.acceso) pila.push(h.nodo.id);
    }
    return { total, leidas: leidasN, actualizadas };
  }

  function hayFiltros() {
    return Boolean(textoBusqueda() || vista.estado || vista.esencial);
  }

  /** Texto de búsqueda efectivo: con menos de 2 letras no se busca (saldría medio mapa). */
  function textoBusqueda() {
    const q = vista.q.trim();
    return A.normalizar(q).length >= 2 ? q : '';
  }

  /**
   * Qué nodos pasan la búsqueda y los filtros. Un tema pasa los filtros si cumple el estado y "Lo
   * esencial"; una rama, si alguno de sus temas los cumple. Con búsqueda, pasa el nodo que coincide
   * y cualquier rama que contenga una coincidencia (para poder llegar a ella).
   */
  function calcularFiltro() {
    const leidas = D.leer('leidas');
    const cumple = (t) => (!vista.esencial || t.prioridad === 1) && (!vista.estado || cumpleEstado(t, vista.estado, leidas));
    const filtrando = vista.esencial || Boolean(vista.estado);
    const cache = new Map();
    const pasaFiltros = (n) => {
      if (!filtrando) return true;
      if (!cache.has(n.id)) cache.set(n.id, n.tipo === 'tema' ? cumple(n) : D.temasDe(datos, n.id).some(cumple));
      return cache.get(n.id);
    };
    const q = textoBusqueda();
    const coinciden = new Set();
    const contienen = new Set();
    if (q) {
      for (const n of A.buscar(datos, q)) {
        if (!pasaFiltros(n)) continue;
        coinciden.add(n.id);
        for (const anc of A.ancestros(datos, n.id)) contienen.add(anc.id);
      }
    }
    return {
      q, coinciden,
      pasa: (n) => pasaFiltros(n) && (!q || coinciden.has(n.id) || contienen.has(n.id)),
    };
  }

  /** Aplica a los nodos ya dibujados el color (área o nivel) y el atenuado de búsqueda y filtros. */
  function decorar() {
    const auto = D.leer('autoevaluacion');
    const leidas = D.leer('leidas');
    const activos = hayFiltros();
    const f = activos ? calcularFiltro() : null;
    // Pares [elemento que se pinta, enlace que se etiqueta]: en la telaraña son el mismo <a>; en
    // Cajas, la caja entera (data-decora) y el enlace de su título, o el propio chip.
    const pares = vista.v === 'cajas'
      ? [...cajasEl.querySelectorAll('[data-decora]')].map((e) => [e, e.matches('a') ? e : e.querySelector('a[data-id]')])
      : [...svg.querySelectorAll('a.nodo[data-id]')].map((a) => [a, a]);
    for (const [e, a] of pares) {
      const n = datos.porId.get(a.dataset.id);
      let extra = '';
      if (vista.color === 'nivel') {
        const nv = nivelDe(n, auto);
        e.style.setProperty('--c', nv.indice === null ? SIN_MARCAR : COLOR_NIVEL[nv.indice]);
        extra += `. ${nv.texto}`;
      } else {
        e.style.setProperty('--c', colorArea(n));
      }
      const coincide = Boolean(f && f.q && f.coinciden.has(n.id));
      const centro = e.classList.contains('nodo-centro');
      e.classList.toggle('coincide', coincide);
      e.classList.toggle('atenua', Boolean(f) && !centro && !f.pasa(n));
      if (coincide) extra += '. Coincide con la búsqueda';
      const l = D.lecturaDe(n, leidas);
      if (l) extra += l.actualizada ? '. Ficha actualizada desde que la leíste' : '. Ficha leída';
      marcarLeida(a, l);
      a.setAttribute('aria-label', a.dataset.etiqueta + extra);
    }
    svg.classList.toggle('filtrando', activos);
    cajasEl.classList.toggle('filtrando', activos);
    cajasEl.dataset.color = vista.color; // con "Mi nivel", los chips grises toman el color en el borde
  }

  /**
   * ✓ (leída) o ↻ (actualizada desde que la leíste) detrás del nombre. En la telaraña es un <tspan>
   * al final de la última línea de la etiqueta (sin etiqueta, como los nietos en móvil, no se marca);
   * en Cajas, un <span> dentro del enlace. aria-hidden: el estado ya va en el aria-label.
   */
  function marcarLeida(a, l) {
    a.querySelectorAll('.marca-leida').forEach((x) => x.remove());
    if (!l) return;
    const simbolo = l.actualizada ? '↻' : '✓';
    const clase = `marca-leida${l.actualizada ? ' actualizada' : ''}`;
    if (a instanceof SVGElement) {
      const texto = [...a.querySelectorAll('text')].find((t) => !t.classList.contains('subir'));
      if (!texto) return;
      const tspans = texto.querySelectorAll('tspan:not(.marca-leida)');
      const destino = tspans.length ? tspans[tspans.length - 1] : texto;
      const ts = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
      ts.setAttribute('class', clase);
      ts.setAttribute('aria-hidden', 'true');
      ts.textContent = ` ${simbolo}`;
      destino.appendChild(ts); // dentro del último tspan, para que siga en su línea
    } else {
      const sp = document.createElement('span');
      sp.className = clase;
      sp.setAttribute('aria-hidden', 'true');
      sp.textContent = ` ${simbolo}`;
      a.appendChild(sp);
    }
  }

  function pintarLeyendaColor() {
    if (vista.color === 'nivel') {
      leyendaColor.innerHTML = '<span class="ley-titulo">Mi nivel:</span>'
        + NIVELES.map((txt, i) => `<span><span class="ley ley-nivel" style="--c:${COLOR_NIVEL[i]}" aria-hidden="true"></span>${i} · ${txt}</span>`).join('')
        + `<span><span class="ley ley-nivel" style="--c:${SIN_MARCAR}" aria-hidden="true"></span>sin marcar</span>`
        + '<span class="ley-nota">En bloques y áreas, la media de sus temas marcados.</span>';
    } else {
      leyendaColor.innerHTML = '<span class="ley-titulo">Color:</span><span>el de cada área</span>';
    }
  }

  /** Tras cambiar la vista, los enlaces ya pintados (nodos, cajas, migas) pasan a llevarla. */
  function actualizarHrefs() {
    for (const a of document.querySelectorAll('#telarana a[href], #cajas a[href], #migas a[href]')) {
      const u = new URL(a.getAttribute('href'), location.href);
      a.setAttribute('href', urlDe({ n: u.searchParams.get('n') || raizId, s: u.searchParams.get('s') }));
    }
  }

  function pintarMigas() {
    const ruta = A.ruta(datos, estado.n);
    migas.innerHTML = `<ol>${ruta.map((n, i) => {
      const actual = i === ruta.length - 1;
      return `<li><a href="${D.esc(urlDe({ n: n.id }))}" data-n="${D.esc(n.id)}"${actual ? ' aria-current="location"' : ''}>${D.esc(D.nombreTexto(n))}</a></li>`;
    }).join('')}</ol>`;
  }

  function botonNodo(n, { acceso = false } = {}) {
    const area = A.area(datos, n);
    const marca = acceso ? ' ↗' : '';
    const nube = n.externo ? '☁ ' : '';
    return `<button type="button" data-ir="${D.esc(n.id)}"${acceso ? ' data-acceso="1"' : ''}>`
      + `<span class="punto-color" style="--c:${D.esc(area ? area.color : 'var(--cyan)')}"></span>`
      + `<span>${nube}${D.esc(D.nombreTexto(n))}${marca}</span></button>`;
  }

  function pintarPanel() {
    const n = datos.porId.get(estado.s || estado.n);
    const area = A.area(datos, n);
    const hijos = datos.hijos.get(n.id) || [];
    const auto = D.leer('autoevaluacion');
    const partes = [];

    partes.push(`<div class="panel-cab">${area ? D.iconoArea(area) : '<img src="assets/logo.svg" alt="" width="28" height="28">'}
      <div><p class="panel-tipo">${TIPO[n.tipo]}${area && n.tipo !== 'area' ? ` · ${D.esc(D.nombreTexto(area))}` : ''}</p>
      <h2>${D.nombreHtml(n)}</h2></div></div>`);

    if (n.tipo === 'raiz') {
      const temas = D.temasDe(datos, raizId);
      partes.push(`<p class="panel-frase">${datos.areas.length} áreas y ${temas.length} temas. Pulsa un área para entrar en ella;
        ${vista.v === 'cajas' ? '«Subir» vuelve' : 'el centro de la telaraña sube'} un nivel.</p>`);
    } else {
      partes.push(`<p class="panel-frase">${n.frase ? D.esc(n.frase) : '<span class="text-faint">Sin descripción todavía.</span>'}</p>`);
    }

    if (n.tipo === 'tema') {
      const chips = [];
      if (n.externo) chips.push('<span class="badge badge-externo">☁ Guía en Apuntes AWS</span>');
      else chips.push(n.estado === 'publicado' ? '<span class="badge badge-publicado">Publicado</span>' : '<span class="badge badge-pendiente">Próximamente</span>');
      if (!n.evaluable && !n.externo) chips.push('<span class="badge badge-pendiente">Solo autoevaluación</span>');
      if (n.prioridad === 1) chips.push('<span class="badge badge-esencial">Lo esencial</span>');
      const l = D.lecturaDe(n);
      if (l) {
        chips.push(l.actualizada
          ? `<span class="badge badge-actualizada" title="Revisada el ${D.esc(D.formatoFecha(n.revisado))}">↻ Actualizada desde que la leíste</span>`
          : `<span class="badge badge-leida">✓ Leída el ${D.esc(D.formatoFecha(l.fecha))}</span>`);
      }
      partes.push(`<div class="panel-badges">${chips.join('')}</div>`);

      const nivel = auto[n.id];
      partes.push(`<div class="nivel" role="group" aria-labelledby="nivel-titulo">
        <h3 id="nivel-titulo">Mi nivel</h3>
        <div class="nivel-botones">${NIVELES.map((txt, i) => `<button type="button" data-nivel="${i}" aria-pressed="${nivel === i}" title="${txt}">${i}</button>`).join('')}</div>
        <p class="nivel-texto">${nivel === undefined ? 'Sin marcar. Pulsa un número para indicarlo.' : `${NIVELES[nivel]} <button type="button" class="enlace-boton" data-nivel="borrar">Quitar</button>`}</p>
      </div>`);

    }

    // Todo nodo tiene ficha (la publicada o la genérica "Próximamente"); los temas publicados y
    // evaluables enlazan a su evaluación, y las ramas con temas evaluables a "Evaluar esta rama".
    if (n.tipo !== 'raiz') {
      const acciones = [];
      if (n.externo) {
        acciones.push(`<a class="btn btn-primary btn-sm" href="${D.esc(D.urlFicha(n))}">Ver la guía en Apuntes AWS ↗</a>`);
      } else {
        const publicada = n.estado === 'publicado';
        acciones.push(`<a class="btn ${publicada ? 'btn-primary' : 'btn-secondary'} btn-sm" href="${D.esc(D.urlFicha(n))}">${publicada ? 'Leer la ficha' : 'Ficha (próximamente)'}</a>`);
        if (n.tipo === 'tema' && n.evaluable) {
          acciones.push(publicada
            ? `<a class="btn btn-secondary btn-sm" href="${D.esc(D.urlFicha(n))}#evaluacion">Evaluarme</a>`
            : '<button class="btn btn-secondary btn-sm" type="button" disabled>Evaluación próximamente</button>');
        }
        const rama = D.temasDe(datos, n.id).filter((x) => x.id !== n.id && x.estado === 'publicado' && x.evaluable && !x.externo);
        if (rama.length) acciones.push(`<a class="btn btn-secondary btn-sm" href="${D.esc(D.url(`evaluacion.html?id=${n.id}`))}">Evaluar esta rama</a>`);
      }
      partes.push(`<div class="panel-acciones">${acciones.join('')}</div>`);
    }

    if (n.tipo !== 'tema') {
      const lr = lecturaRama(n.id, D.leer('leidas'));
      if (lr.total) {
        const pct = Math.round((lr.leidas / lr.total) * 100);
        const propia = D.lecturaDe(n);
        partes.push(`<h3>Fichas leídas</h3>
          <p class="lectura-rama"><span class="barra-lectura" aria-hidden="true"><span style="width:${pct}%"></span></span>
          ${lr.leidas} de ${lr.total}</p>
          ${lr.actualizadas ? `<p class="text-faint lectura-propia">↻ ${lr.actualizadas} ${lr.actualizadas === 1 ? 'actualizada' : 'actualizadas'} desde que las leíste</p>` : ''}
          ${propia ? `<p class="text-faint lectura-propia">${propia.actualizada ? '↻ Su ficha se actualizó desde que la leíste' : `✓ Su ficha: leída el ${D.esc(D.formatoFecha(propia.fecha))}`}</p>` : ''}`);
      }
      const m = A.nivelMedio(datos, n.id, auto);
      if (m.media !== null) {
        const i = Math.round(m.media);
        partes.push(`<h3>Mi nivel medio</h3><p class="nivel-medio"><span class="punto-color" style="--c:${COLOR_NIVEL[i]}"></span>
          ${m.media.toFixed(1).replace('.', ',')} · ${NIVELES[i]} <span class="text-faint">(${m.marcados} de ${m.total} temas marcados)</span></p>`);
      }
    }

    if (estado.s && hijos.length) {
      partes.push(`<div class="panel-acciones"><button class="btn btn-secondary btn-sm" type="button" data-ir="${D.esc(n.id)}">${vista.v === 'cajas' ? 'Abrir en las cajas' : 'Abrir en la telaraña'}</button></div>`);
    }

    if (hijos.length) {
      partes.push(`<h3>Contiene (${hijos.length})</h3><ul class="panel-lista">${hijos.map((h) => `<li>${botonNodo(h.nodo, { acceso: h.acceso })}</li>`).join('')}</ul>`);
    }
    const tambien = A.accesosDe(datos, n);
    if (tambien.length) {
      partes.push(`<h3>Vive en</h3><ul class="panel-lista"><li>${botonNodo(datos.porId.get(n.padre))}</li></ul>`);
      partes.push(`<h3>También aparece en</h3><ul class="panel-lista">${tambien.map((p) => `<li>${botonNodo(p)}</li>`).join('')}</ul>`);
    }
    const relacionados = (n.relacionados || []).map((id) => datos.porId.get(id)).filter(Boolean);
    if (relacionados.length) {
      partes.push(`<h3>Relacionados</h3><ul class="panel-lista">${relacionados.map((r) => `<li>${botonNodo(r)}</li>`).join('')}</ul>`);
    }
    if (estado.s) {
      partes.push(`<p class="panel-cerrar"><button type="button" class="enlace-boton" data-cerrar>← Volver a ${D.esc(D.nombreTexto(datos.porId.get(estado.n)))}</button></p>`);
    }
    panel.innerHTML = partes.join('');
  }

  /** Ir a un nodo desde el panel o las migas: si tiene hijos se entra; si no, se selecciona en su padre. */
  function irA(id) {
    const n = datos.porId.get(id);
    if (!n) return;
    if (A.tieneHijos(datos, id)) navegar({ n: id });
    else navegar({ n: n.padre, s: id });
  }

  panel.addEventListener('click', (ev) => {
    const ir = ev.target.closest('[data-ir]');
    if (ir) { irA(ir.dataset.ir); return; }
    if (ev.target.closest('[data-cerrar]')) { navegar({ n: estado.n }); return; }
    const nivel = ev.target.closest('[data-nivel]');
    if (nivel) {
      const id = estado.s || estado.n;
      const auto = D.leer('autoevaluacion');
      const valor = nivel.dataset.nivel === 'borrar' ? null : Number(nivel.dataset.nivel);
      if (valor === null || auto[id] === valor) delete auto[id];
      else auto[id] = valor;
      D.guardar('autoevaluacion', auto);
      pintarPanel();
      decorar();
      panel.querySelector(`[data-nivel="${valor ?? 0}"]`)?.focus();
    }
  });

  migas.addEventListener('click', (ev) => {
    const a = ev.target.closest('a[data-n]');
    if (!a || ev.metaKey || ev.ctrlKey || ev.shiftKey) return;
    ev.preventDefault();
    navegar({ n: a.dataset.n });
  });

  svg.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && estado.n !== raizId) {
      ev.preventDefault();
      navegar(estado.s ? { n: estado.n } : destinoDe(datos.porId.get(estado.n), { centro: true }));
    } else if (T.moverPorAnillo(svg, ev)) {
      ev.preventDefault();
    }
  });
  cajasEl.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && estado.n !== raizId) {
      ev.preventDefault();
      navegar(estado.s ? { n: estado.n } : destinoDe(datos.porId.get(estado.n), { centro: true }));
    }
  });
  conmutador.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-v]');
    if (b) cambiarVista({ v: b.dataset.v });
  });

  // Al volver de una ficha con el botón atrás (caché del navegador), las marcas pueden haber cambiado.
  window.addEventListener('pageshow', (ev) => {
    if (ev.persisted) { decorar(); pintarPanel(); avisarResultados(); }
  });

  window.addEventListener('popstate', () => {
    const antes = estado;
    estado = desdeUrl();
    vista = vistaDesdeUrl();
    sincronizarControles();
    pintarLeyendaColor();
    pintar(antes);
  });

  /* ── Controles: color, filtros y buscador ─────────────────────────── */

  function sincronizarControles() {
    if (document.activeElement !== buscador) buscador.value = vista.q;
    selColor.value = vista.color;
    for (const b of conmutador.querySelectorAll('[data-v]')) b.setAttribute('aria-pressed', String(b.dataset.v === vista.v));
    selEstado.value = vista.estado;
    btnEsencial.setAttribute('aria-pressed', String(vista.esencial));
    btnQuitar.hidden = !hayFiltros();
    avisarResultados();
  }

  /** Resumen en texto (y para lectores de pantalla) de lo que dejan la búsqueda y los filtros. */
  function avisarResultados() {
    if (!hayFiltros()) { avisoBusqueda.textContent = ''; return; }
    const f = calcularFiltro();
    const partes = [];
    if (f.q) partes.push(f.coinciden.size ? `${f.coinciden.size} ${f.coinciden.size === 1 ? 'coincidencia' : 'coincidencias'} con «${f.q}»` : `Nada coincide con «${f.q}»`);
    if (vista.esencial || vista.estado) {
      const temas = D.temasDe(datos, raizId).filter((t) => f.pasa(t)).length;
      const filtro = [vista.esencial ? 'lo esencial' : '', vista.estado ? ESTADOS[vista.estado] : ''].filter(Boolean).join(', ');
      partes.push(f.q ? `filtro: ${filtro}` : `Filtro «${filtro}»: ${temas} ${temas === 1 ? 'tema' : 'temas'}`);
    }
    avisoBusqueda.textContent = `${partes.join(' · ')}. Lo demás queda atenuado.`;
  }

  selColor.addEventListener('change', () => cambiarVista({ color: selColor.value }));
  selEstado.addEventListener('change', () => cambiarVista({ estado: selEstado.value }));
  btnEsencial.addEventListener('click', () => cambiarVista({ esencial: !vista.esencial }));
  btnQuitar.addEventListener('click', () => {
    buscador.value = '';
    cerrarLista();
    cambiarVista({ q: '', estado: '', esencial: false });
  });

  // Buscador: combobox con lista desplegable (patrón ARIA 1.2). Al elegir, la telaraña se centra en
  // el padre del resultado y lo deja seleccionado; la búsqueda sigue resaltando las coincidencias.
  let resultados = [];
  let activo = -1;

  function rutaCorta(n) {
    return A.ancestros(datos, n.id).filter((x) => x.tipo !== 'raiz').map((x) => D.nombreTexto(x)).join(' › ');
  }

  function pintarLista() {
    const q = textoBusqueda();
    resultados = q ? A.buscar(datos, q, 12) : [];
    activo = -1;
    buscador.removeAttribute('aria-activedescendant');
    if (!q) { cerrarLista(); return; }
    lista.innerHTML = resultados.length
      ? resultados.map((n, i) => {
        const area = A.area(datos, n);
        return `<li role="option" id="res-${i}" data-i="${i}" aria-selected="false">
          <span class="punto-color" style="--c:${D.esc(area ? area.color : 'var(--cyan)')}"></span>
          <span><span class="res-nombre">${n.externo ? '☁ ' : ''}${D.esc(D.nombreTexto(n))}</span>
          <span class="res-ruta">${D.esc(TIPO[n.tipo])}${rutaCorta(n) ? ` · ${D.esc(rutaCorta(n))}` : ''}</span></span></li>`;
      }).join('')
      : '<li class="res-vacio" role="option" aria-disabled="true">Sin resultados</li>';
    lista.hidden = false;
    buscador.setAttribute('aria-expanded', 'true');
  }

  function cerrarLista() {
    lista.hidden = true;
    activo = -1;
    buscador.setAttribute('aria-expanded', 'false');
    buscador.removeAttribute('aria-activedescendant');
  }

  function marcarActivo(i) {
    activo = i;
    for (const li of lista.querySelectorAll('[data-i]')) li.setAttribute('aria-selected', String(Number(li.dataset.i) === i));
    const li = lista.querySelector(`[data-i="${i}"]`);
    if (li) {
      buscador.setAttribute('aria-activedescendant', li.id);
      li.scrollIntoView({ block: 'nearest' });
    }
  }

  function elegir(i) {
    const n = resultados[i];
    if (!n) return;
    cerrarLista();
    navegar({ n: n.padre || raizId, s: n.id });
    // El foco del teclado pasa al nodo elegido, y el lienzo se asoma si había quedado fuera.
    (vista.v === 'cajas' ? cajasEl : svg).querySelector(`a[data-id="${CSS.escape(n.id)}"]`)?.focus({ preventScroll: true });
    const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.querySelector('.mapa-lienzo').scrollIntoView({ block: 'nearest', behavior: reducido ? 'auto' : 'smooth' });
  }

  buscador.addEventListener('input', () => {
    vista = { ...vista, q: buscador.value };
    history.replaceState(estado, '', urlDe(estado));
    pintarLista();
    decorar();
    actualizarHrefs();
    btnQuitar.hidden = !hayFiltros();
    avisarResultados();
  });
  buscador.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      if (lista.hidden) pintarLista();
      if (!resultados.length) return;
      ev.preventDefault();
      const d = ev.key === 'ArrowDown' ? 1 : -1;
      marcarActivo(activo < 0 ? (d > 0 ? 0 : resultados.length - 1) : (activo + d + resultados.length) % resultados.length);
    } else if (ev.key === 'Enter') {
      if (!lista.hidden && resultados.length) {
        ev.preventDefault();
        elegir(activo < 0 ? 0 : activo);
      }
    } else if (ev.key === 'Escape') {
      if (!lista.hidden) { ev.preventDefault(); cerrarLista(); }
    }
  });
  buscador.addEventListener('focus', () => { if (textoBusqueda()) pintarLista(); });
  buscador.addEventListener('blur', () => setTimeout(() => {
    if (!lista.contains(document.activeElement)) cerrarLista();
  }, 150));
  // pointerdown + preventDefault: el clic en la lista no quita el foco al buscador antes de elegir.
  lista.addEventListener('pointerdown', (ev) => ev.preventDefault());
  lista.addEventListener('click', (ev) => {
    const li = ev.target.closest('[data-i]');
    if (li) elegir(Number(li.dataset.i));
  });
  movil.addEventListener('change', () => pintar(null));

  history.replaceState(estado, '', urlDe(estado));
  sincronizarControles();
  pintarLeyendaColor();
  pintar(null);
})();
