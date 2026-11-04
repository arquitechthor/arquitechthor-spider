/**
 * Fichas: temas/<id>.html (publicadas) y tema.html?id=<id> (genérica, "Próximamente").
 * Todo nodo tiene ficha (docs/PLAN.md 5.2): los temas con su guía y su evaluación; las áreas y los
 * bloques con una presentación y "Evaluar esta rama". Lo que sale del árbol lo pinta este script a
 * partir de data/nodos.json, así la ficha no repite datos que podrían desincronizarse:
 *   #ficha-cab           migas, icono del área, nombre (y el original), "En una frase", revisión y
 *                        botones (mapa, evaluación, evaluar la rama).
 *   #ficha-contiene      sus hijos como cajas (mismo aspecto que la vista Cajas del mapa).
 *   #ficha-relacionados  sus relacionados como chips.
 * Fichas leídas (spider.leidas, ver SpiderDatos.lecturaDe): botón "Marcar como leída" en la cabecera,
 * sugerencia al llegar al final del texto (con el scroll o al terminar "Escuchar") y ✓ en las cajas
 * de "Qué contiene" y en los relacionados.
 * La página indica su nodo con <main data-ficha="<id>">; en tema.html va vacío y se lee ?id=.
 * Después marca las siglas y los conceptos del texto (assets/siglas.js).
 */
(async function () {
  const D = window.SpiderDatos;
  const A = window.SpiderArbol;
  const main = document.querySelector('main[data-ficha]');
  if (!main) return;
  const TIPO = { area: 'Área', bloque: 'Bloque', tema: 'Tema' };

  let datos;
  try {
    datos = await D.cargar();
  } catch (e) {
    console.error(e);
    return;
  }
  const generica = !main.dataset.ficha;
  const id = main.dataset.ficha || new URLSearchParams(location.search).get('id');
  const n = datos.porId.get(id);
  const cab = document.getElementById('ficha-cab');
  if (!n || n.tipo === 'raiz') {
    cab.innerHTML = `<h1 class="ficha-titulo">No encontrado</h1>
      <p>Este nodo no existe en el mapa. <a href="${D.esc(D.url('index.html#mapa'))}">Volver al mapa</a>.</p>`;
    return;
  }
  // La genérica es para lo que aún no tiene ficha: si ya la tiene (o vive en Apuntes AWS), se va allí.
  if (generica && (n.estado === 'publicado' || n.externo)) {
    location.replace(D.urlFicha(n));
    return;
  }

  const area = A.area(datos, n);
  const leidas = D.leer('leidas');
  /** ✓ (o ↻ si se actualizó después) tras el nombre de un nodo leído. */
  const marcaLeida = (x) => {
    const l = D.lecturaDe(x, leidas);
    if (!l) return '';
    return l.actualizada
      ? ' <span class="marca-leida actualizada" title="Actualizada desde que la leíste">↻<span class="visually-hidden"> (actualizada desde que la leíste)</span></span>'
      : ' <span class="marca-leida" title="Leída">✓<span class="visually-hidden"> (leída)</span></span>';
  };
  const hijos = datos.hijos.get(n.id) || [];
  const urlMapa = (nodo) => D.url(`index.html?${A.tieneHijos(datos, nodo.id) ? `n=${nodo.id}` : `n=${nodo.padre}&s=${nodo.id}`}#mapa`);

  // Temas de la rama que ya se pueden evaluar (sin contar el propio nodo).
  const evaluablesRama = D.temasDe(datos, n.id).filter((t) => t.id !== n.id && t.estado === 'publicado' && t.evaluable && !t.externo);

  const migas = A.ruta(datos, n.id).slice(0, -1).map((x) => x.tipo === 'raiz'
    ? `<li><a href="${D.esc(D.url('index.html#mapa'))}">Mapa</a></li>`
    : `<li><a href="${D.esc(D.urlFicha(x))}">${D.esc(D.nombreTexto(x))}</a></li>`).join('');

  const acciones = [`<a class="btn btn-secondary btn-sm" href="${D.esc(urlMapa(n))}">Ver en el mapa</a>`];
  if (n.tipo === 'tema' && n.evaluable && n.estado === 'publicado' && document.getElementById('evaluacion')) {
    acciones.unshift('<a class="btn btn-primary btn-sm" href="#evaluacion">Evaluarme</a>');
  }
  if (evaluablesRama.length) {
    acciones.push(`<a class="btn btn-secondary btn-sm" href="${D.esc(D.url(`evaluacion.html?id=${n.id}`))}">Evaluar esta rama (${evaluablesRama.length + (n.tipo === 'tema' && n.evaluable && n.estado === 'publicado' ? 1 : 0)} temas)</a>`);
  }

  const tipoTxt = `${TIPO[n.tipo]}${area && n.tipo !== 'area' ? ` · ${D.esc(D.nombreTexto(area))}` : ''}`;
  cab.innerHTML = `
    <nav class="migas ficha-migas" aria-label="Ruta en el mapa"><ol>${migas}</ol></nav>
    <p class="panel-tipo">${tipoTxt}</p>
    <h1 class="ficha-titulo">${D.iconoArea(area)}<span>${D.nombreHtml(n)}</span></h1>
    ${n.frase ? `<p class="ficha-frase"><strong>En una frase:</strong>${D.esc(n.frase)}</p>` : ''}
    ${n.revisado ? `<p class="revisado">Revisado el ${D.esc(D.formatoFecha(n.revisado))}${n.volatil ? ' · tema que cambia rápido: se revisa cada seis meses' : ''}</p>` : ''}
    <div class="ficha-acciones">${acciones.join('')}</div>`;

  if (generica) {
    document.title = `${D.nombreTexto(n)} — Tech Spider`;
    const aviso = document.getElementById('ficha-proximamente');
    if (aviso) aviso.hidden = false;
  }

  const contiene = document.getElementById('ficha-contiene');
  if (contiene && hijos.length) {
    contiene.innerHTML = `<div class="cajas-rejilla ficha-hijos" role="list">${hijos.map(({ nodo: h, acceso }) => {
      const marca = acceso ? ' ↗' : '';
      const nube = h.externo ? '☁ ' : '';
      const pendiente = !h.externo && h.estado !== 'publicado';
      return `<section class="caja${acceso ? ' acceso' : ''}" role="listitem" style="--c:${D.esc((A.area(datos, h) || {}).color || 'var(--cyan)')}">
        <div class="caja-cab"><h3 class="caja-titulo"><a class="caja-enlace" href="${D.esc(D.urlFicha(h))}">${D.esc(nube)}${D.nombreHtml(h).replace(/^([^<]*)/, `$1${marca}`)}</a>${marcaLeida(h)}</h3></div>
        ${h.frase ? `<p class="caja-frase">${D.esc(h.frase)}</p>` : ''}
        ${pendiente ? '<p class="caja-frase text-faint">Ficha próximamente</p>' : ''}
      </section>`;
    }).join('')}</div>`;
  } else if (contiene) {
    contiene.closest('[data-seccion-contiene]')?.remove();
  }

  const rel = document.getElementById('ficha-relacionados');
  const relacionados = (n.relacionados || []).map((r) => datos.porId.get(r)).filter(Boolean);
  if (rel && relacionados.length) {
    rel.innerHTML = `<ul class="ficha-relacionados">${relacionados.map((r) =>
      `<li><a class="chip" href="${D.esc(D.urlFicha(r))}">${D.esc(D.nombreTexto(r))}${marcaLeida(r)}</a></li>`).join('')}</ul>`;
  } else if (rel) {
    rel.closest('[data-seccion-relacionados]')?.remove();
  }

  let siglas = {};
  if (window.SpiderSiglas) {
    try {
      const g = await window.SpiderSiglas.cargar();
      siglas = g.siglas;
      document.querySelectorAll('.doc').forEach((doc) => window.SpiderSiglas.marcarDoc(doc, g, n.id));
    } catch (e) {
      console.error(e);
    }
  }

  if (generica || !D.tieneFicha(n)) return;
  const filaAcciones = cab.querySelector('.ficha-acciones');

  // ── Leída ─────────────────────────────────────────────────────────────────────────────
  const btnLeida = document.createElement('button');
  btnLeida.type = 'button';
  btnLeida.className = 'btn btn-secondary btn-sm btn-leida';
  filaAcciones.appendChild(btnLeida);
  let sugerencia = null;

  function pintarLeida() {
    const l = D.lecturaDe(n);
    btnLeida.classList.toggle('leida', Boolean(l && !l.actualizada));
    btnLeida.classList.toggle('actualizada', Boolean(l && l.actualizada));
    btnLeida.setAttribute('aria-pressed', String(Boolean(l && !l.actualizada)));
    if (!l) {
      btnLeida.innerHTML = '<span aria-hidden="true">☐</span> Marcar como leída';
      btnLeida.title = 'Guarda en este navegador que ya la has leído';
    } else if (l.actualizada) {
      btnLeida.innerHTML = `<span aria-hidden="true">↻</span> Actualizada desde que la leíste (${D.esc(D.formatoFecha(l.fecha))})`;
      btnLeida.title = `Revisada el ${D.formatoFecha(n.revisado)}. Pulsa para marcarla como leída de nuevo`;
    } else {
      btnLeida.innerHTML = `<span aria-hidden="true">✓</span> Leída el ${D.esc(D.formatoFecha(l.fecha))}`;
      btnLeida.title = 'Pulsa para desmarcarla';
    }
  }

  function marcar(leida) {
    D.marcarLeida(n.id, leida);
    pintarLeida();
    if (sugerencia) { sugerencia.remove(); sugerencia = null; }
  }

  btnLeida.addEventListener('click', () => {
    const l = D.lecturaDe(n);
    marcar(!l || l.actualizada); // leída → desmarcar; sin leer o actualizada → marcar hoy
  });
  pintarLeida();

  /**
   * Al llegar al final del texto (lo primero de "Qué contiene", "Evaluación", "Relacionados" o
   * "Fuentes"), o al terminar "Escuchar", se ofrece marcarla. Una vez por visita y nunca sola.
   */
  const finTexto = ['[data-seccion-contiene]', '#evaluacion', '[data-seccion-relacionados]', '#fuentes']
    .map((sel) => document.querySelector(`.doc ${sel}`)).filter(Boolean)
    .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))[0];
  let sugerida = false;

  function sugerir() {
    if (sugerida) return;
    const l = D.lecturaDe(n);
    if (l && !l.actualizada) return;
    sugerida = true;
    sugerencia = document.createElement('div');
    sugerencia.className = 'callout leida-sugerencia';
    sugerencia.setAttribute('role', 'status');
    sugerencia.innerHTML = `<p><strong>¿Has terminado de leerla?</strong> ${l ? 'La ficha se actualizó desde que la leíste.' : 'Márcala para verla con ✓ en el mapa.'}</p>
      <div class="leida-sugerencia-botones">
        <button type="button" class="btn btn-primary btn-sm" data-si>✓ Marcar como leída</button>
        <button type="button" class="btn btn-secondary btn-sm" data-no>Ahora no</button>
      </div>`;
    sugerencia.querySelector('[data-si]').addEventListener('click', () => marcar(true));
    sugerencia.querySelector('[data-no]').addEventListener('click', () => { sugerencia.remove(); sugerencia = null; });
    if (finTexto) finTexto.before(sugerencia);
    else document.querySelector('.doc')?.append(sugerencia);
  }

  if (finTexto) {
    let pendiente = false;
    const comprobar = () => {
      pendiente = false;
      // Solo si se ha desplazado de verdad: en una ficha corta el final se ve nada más cargar.
      if (window.scrollY > 200 && finTexto.getBoundingClientRect().top < window.innerHeight * 0.85) {
        sugerir();
        window.removeEventListener('scroll', alDesplazar);
      }
    };
    const alDesplazar = () => { if (!pendiente) { pendiente = true; requestAnimationFrame(comprobar); } };
    window.addEventListener('scroll', alDesplazar, { passive: true });
  }

  // "Escuchar" (assets/lectura.js), solo en fichas escritas: la genérica no tiene texto propio.
  if (window.SpiderLectura) {
    window.SpiderLectura.montar(filaAcciones, {
      cab, docs: [...document.querySelectorAll('.doc')], siglas, alTerminar: sugerir,
    });
  }
  filaAcciones.appendChild(btnLeida); // "Leída" al final, tras "Escuchar"
})();
