/**
 * Mi cola de estudio (cola.html): las fichas apuntadas con "Añadir a la cola" (assets/tema.js),
 * guardadas en spider.cola (ver SpiderDatos.leerCola), de la primera que se añadió a la última.
 * Cada una dice cuándo se añadió y si ya está leída; "Quitar" la saca de la cola. Se repinta si la
 * cuenta Kopi trae cambios de otro dispositivo (spider:sincronizado).
 */
(async function () {
  const D = window.SpiderDatos;
  const cont = document.getElementById('cola-contenido');
  if (!cont) return;

  let datos;
  try {
    datos = await D.cargar();
  } catch (e) {
    console.error(e);
    cont.innerHTML = '<p class="callout">No se ha podido cargar el mapa. Prueba a recargar la página.</p>';
    return;
  }

  /** Área de un nodo (subiendo por "padre"), para el icono y el color. */
  function areaDe(nodo) {
    let x = nodo;
    while (x && x.tipo !== 'area') x = datos.porId.get(x.padre);
    return x || null;
  }

  /** "dd/mm/aaaa" en hora local (el ISO guardado va en UTC). */
  function fechaAnadida(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }

  function pintar() {
    const cola = D.leerCola();
    const ids = D.ordenCola(cola);
    if (!ids.length) {
      cont.innerHTML = `<div class="callout cola-vacia">
        <p><strong>Tu cola está vacía.</strong> En la cabecera de cada ficha tienes el botón
          «<span aria-hidden="true">＋</span> Añadir a la cola»: lo que añadas aparece aquí, en el orden en que lo añadiste.</p>
        <p><a class="btn btn-primary btn-sm" href="${D.esc(D.url('index.html#mapa'))}">Ir al mapa</a></p>
      </div>`;
      return;
    }
    const leidas = D.leer('leidas');
    const items = ids.map((id, i) => {
      const n = datos.porId.get(id);
      const quitar = `<button type="button" class="btn btn-secondary btn-sm" data-quitar="${D.esc(id)}">Quitar<span class="visually-hidden"> ${D.esc(n ? D.nombreTexto(n) : id)} de la cola</span></button>`;
      if (!n || !D.tieneFicha(n)) {
        return `<li class="cola-item cola-item-perdida">
          <div class="cola-cuerpo"><p class="cola-nombre">${D.esc(id)}</p>
            <p class="cola-meta">Esta ficha ya no existe o ha cambiado de nombre.</p></div>
          <div class="cola-acciones">${quitar}</div>
        </li>`;
      }
      const area = areaDe(n);
      const l = D.lecturaDe(n, leidas);
      const estado = !l ? ''
        : l.actualizada ? ` · <span class="marca-leida actualizada">↻ actualizada desde que la leíste</span>`
          : ` · <span class="marca-leida">✓ leída el ${D.esc(D.formatoFecha(l.fecha))}</span>`;
      return `<li class="cola-item${i === 0 ? ' cola-siguiente' : ''}" style="--c:${D.esc((area && area.color) || 'var(--cyan)')}">
        <div class="cola-cuerpo">
          ${i === 0 ? '<p class="cola-etiqueta">Siguiente</p>' : ''}
          <p class="cola-nombre">${D.iconoArea(area)}<a href="${D.esc(D.urlFicha(n))}">${D.nombreHtml(n)}</a></p>
          ${n.frase ? `<p class="cola-frase">${D.esc(n.frase)}</p>` : ''}
          <p class="cola-meta">${area && area !== n ? `${D.esc(D.nombreTexto(area))} · ` : ''}Añadida el ${D.esc(fechaAnadida(cola[id]))}${estado}</p>
        </div>
        <div class="cola-acciones">${quitar}</div>
      </li>`;
    });
    cont.innerHTML = `<p class="cola-resumen">${ids.length === 1 ? '1 ficha' : `${ids.length} fichas`} en la cola.</p>
      <ol class="cola-lista">${items.join('')}</ol>`;
  }

  cont.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-quitar]');
    if (!btn) return;
    const items = [...cont.querySelectorAll('[data-quitar]')];
    const i = items.indexOf(btn);
    D.ponerEnCola(btn.dataset.quitar, false);
    pintar();
    // El foco pasa al siguiente "Quitar" (o al anterior si era el último), para no perderlo.
    const resto = [...cont.querySelectorAll('[data-quitar]')];
    (resto[Math.min(i, resto.length - 1)] || cont.querySelector('a, button'))?.focus();
  });

  document.addEventListener('spider:sincronizado', pintar);
  // Otra pestaña con una ficha abierta puede añadir o quitar mientras esta está abierta.
  window.addEventListener('storage', (ev) => { if (ev.key === D.claves.cola || ev.key === D.claves.leidas) pintar(); });
  pintar();
})();
