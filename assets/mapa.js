/**
 * Portada: el mapa. Guarda el estado en la URL (?n=<nodo enfocado>&s=<nodo seleccionado>), de modo
 * que el botón atrás y los enlaces compartidos funcionan; pinta la telaraña (assets/telarana.js),
 * las migas de pan y el panel de detalle con la autoevaluación (localStorage spider.autoevaluacion).
 */
(async function () {
  const D = window.SpiderDatos;
  const A = window.SpiderArbol;
  const T = window.SpiderTelarana;
  const svg = document.getElementById('telarana');
  const panel = document.getElementById('panel');
  const migas = document.getElementById('migas');
  if (!svg) return;

  const NIVELES = ['No lo conozco', 'Me suena', 'Lo he usado', 'Lo domino', 'Podría enseñarlo'];
  const TIPO = { raiz: 'Mapa completo', area: 'Área', bloque: 'Bloque', tema: 'Tema' };
  const movil = window.matchMedia('(max-width: 760px)');

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

  function desdeUrl() {
    const q = new URLSearchParams(location.search);
    let n = q.get('n');
    if (!datos.porId.has(n) || !A.tieneHijos(datos, n)) n = raizId;
    let s = q.get('s');
    if (!datos.porId.has(s) || s === n) s = null;
    return { n, s };
  }

  function urlDe({ n, s }) {
    const q = new URLSearchParams();
    if (n && n !== raizId) q.set('n', n);
    if (s) q.set('s', s);
    const texto = q.toString();
    return location.pathname + (texto ? `?${texto}` : '');
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
    T.dibujar(svg, datos, {
      foco: estado.n, sel: estado.s, movil: movil.matches, animar: cambiaFoco,
      enfocar, destinoDe, navegar, urlDe,
    });
    pintarMigas();
    pintarPanel();
    const actual = datos.porId.get(estado.s || estado.n);
    document.title = actual.tipo === 'raiz' ? 'Tech Spider — Mapa de estudio de ingeniería de software' : `${D.nombreTexto(actual)} — Tech Spider`;
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
    const marca = (acceso ? ' ↗' : '') + (n.externo ? ' ☁' : '');
    return `<button type="button" data-ir="${D.esc(n.id)}"${acceso ? ' data-acceso="1"' : ''}>`
      + `<span class="punto-color" style="--c:${D.esc(area ? area.color : 'var(--cyan)')}"></span>`
      + `<span>${D.esc(D.nombreTexto(n))}${marca}</span></button>`;
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
        el centro de la telaraña sube un nivel.</p>`);
    } else {
      partes.push(`<p class="panel-frase">${n.frase ? D.esc(n.frase) : '<span class="text-faint">Sin descripción todavía.</span>'}</p>`);
    }

    if (n.tipo === 'tema') {
      const chips = [];
      if (n.externo) chips.push('<span class="badge badge-externo">☁ Guía en Apuntes AWS</span>');
      else chips.push(n.estado === 'publicado' ? '<span class="badge badge-publicado">Publicado</span>' : '<span class="badge badge-pendiente">Próximamente</span>');
      if (!n.evaluable && !n.externo) chips.push('<span class="badge badge-pendiente">Solo autoevaluación</span>');
      if (n.prioridad === 1) chips.push('<span class="badge badge-esencial">Lo esencial</span>');
      partes.push(`<div class="panel-badges">${chips.join('')}</div>`);

      const nivel = auto[n.id];
      partes.push(`<div class="nivel" role="group" aria-labelledby="nivel-titulo">
        <h3 id="nivel-titulo">Mi nivel</h3>
        <div class="nivel-botones">${NIVELES.map((txt, i) => `<button type="button" data-nivel="${i}" aria-pressed="${nivel === i}" title="${txt}">${i}</button>`).join('')}</div>
        <p class="nivel-texto">${nivel === undefined ? 'Sin marcar. Pulsa un número para indicarlo.' : `${NIVELES[nivel]} <button type="button" class="enlace-boton" data-nivel="borrar">Quitar</button>`}</p>
      </div>`);

      const acciones = [];
      if (n.externo) acciones.push(`<a class="btn btn-primary btn-sm" href="${D.esc(D.url(n.externo.url))}">Ver la guía en Apuntes AWS ↗</a>`);
      else {
        acciones.push(n.estado === 'publicado'
          ? `<a class="btn btn-primary btn-sm" href="${D.esc(D.url(`temas/${n.id}.html`))}">Leer la guía</a>`
          : '<button class="btn btn-secondary btn-sm" type="button" disabled>Guía próximamente</button>');
        if (n.evaluable) acciones.push('<button class="btn btn-secondary btn-sm" type="button" disabled>Evaluación próximamente</button>');
      }
      partes.push(`<div class="panel-acciones">${acciones.join('')}</div>`);
    } else if (n.externo) {
      partes.push(`<div class="panel-acciones"><a class="btn btn-primary btn-sm" href="${D.esc(D.url(n.externo.url))}">Abrir Apuntes AWS ↗</a></div>`);
    }

    if (estado.s && hijos.length) {
      partes.push(`<div class="panel-acciones"><button class="btn btn-secondary btn-sm" type="button" data-ir="${D.esc(n.id)}">Abrir en la telaraña</button></div>`);
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

  window.addEventListener('popstate', () => {
    const antes = estado;
    estado = desdeUrl();
    pintar(antes);
  });
  movil.addEventListener('change', () => pintar(null));

  /** Tarjetas de las áreas, debajo del mapa. El área y sus bloques enlazan a la telaraña. */
  function pintarAreas() {
    const cont = document.getElementById('area-grid');
    if (!cont) return;
    cont.innerHTML = datos.areas.map((area) => {
      const bloques = datos.hijos.get(area.id).filter((h) => !h.acceso).map((h) => h.nodo);
      const temas = D.temasDe(datos, area.id);
      const evaluables = temas.filter((t) => t.evaluable).length;
      const cifras = `${temas.length} temas${evaluables < temas.length ? ` · ${evaluables} con evaluación` : ''}`;
      return `<article class="area-card" style="--c:${D.esc(area.color)}">
        <div class="area-card-head">
          ${D.iconoArea(area)}
          <h3><a href="${D.esc(urlDe({ n: area.id }))}" data-mapa="${D.esc(area.id)}">${D.nombreHtml(area)}</a></h3>
        </div>
        <p>${D.esc(area.frase)}</p>
        <div class="chips">${bloques.map((b) => `<a class="chip" href="${D.esc(urlDe({ n: A.tieneHijos(datos, b.id) ? b.id : area.id, s: A.tieneHijos(datos, b.id) ? null : b.id }))}" data-mapa="${D.esc(b.id)}" title="${D.esc(b.frase || '')}">${D.esc(D.nombreTexto(b))}</a>`).join('')}</div>
        <p class="area-cifras">${cifras}</p>
      </article>`;
    }).join('');
    cont.addEventListener('click', (ev) => {
      const a = ev.target.closest('a[data-mapa]');
      if (!a || ev.metaKey || ev.ctrlKey || ev.shiftKey) return;
      ev.preventDefault();
      irA(a.dataset.mapa);
      document.getElementById('mapa').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    });
  }

  history.replaceState(estado, '', urlDe(estado));
  pintar(null);
  pintarAreas();
})();
