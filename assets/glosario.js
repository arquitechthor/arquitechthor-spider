/**
 * glosario.html: conceptos (con su definición, el tema que los trata y sus fuentes) y siglas, desde
 * data/glosario.json. Cada concepto tiene ancla (#<id>): ahí apuntan los enlaces y tooltips de las
 * fichas (assets/siglas.js).
 */
(async function () {
  const D = window.SpiderDatos;
  const lista = document.getElementById('glosario-conceptos');
  const siglas = document.getElementById('glosario-siglas');
  if (!lista) return;
  try {
    const [g, datos] = await Promise.all([D.cargarGlosario(), D.cargar()]);
    const enlaceNodo = (id) => {
      const n = datos.porId.get(id);
      return n ? `<a href="${D.esc(D.urlFicha(n))}">${D.esc(D.nombreTexto(n))}</a>` : '';
    };
    const conceptos = [...g.conceptos].sort((a, b) => a.termino.localeCompare(b.termino, 'es'));
    lista.innerHTML = conceptos.map((c) => {
      const rel = (c.relacionados || []).map(enlaceNodo).filter(Boolean);
      const fuentes = (c.fuentes || []).map((f) => `<a href="${D.esc(f.url)}" target="_blank" rel="noopener">${D.esc(f.titulo)}</a>`);
      return `<div class="glosario-item" id="${D.esc(c.id)}">
        <dt>${D.esc(c.termino)}${c.en ? ` <span class="nombre-en">(${D.esc(c.en)})</span>` : ''}</dt>
        <dd>${D.esc(c.definicion)}</dd>
        ${c.tema ? `<dd><strong>A fondo:</strong> ${enlaceNodo(c.tema)}${rel.length ? ` · <strong>Ver también:</strong> ${rel.join(', ')}` : ''}</dd>` : ''}
        ${fuentes.length ? `<dd class="text-faint">Fuente: ${fuentes.join(' · ')}</dd>` : ''}
      </div>`;
    }).join('');

    const toks = Object.keys(g.siglas).sort((a, b) => a.localeCompare(b, 'es'));
    siglas.innerHTML = toks.map((s) => {
      const d = g.siglas[s];
      const nodo = d.enlace && datos.porId.get(d.enlace);
      const texto = `${d.en ? `<em>${D.esc(d.en)}</em>` : ''}${d.en && d.es ? ': ' : ''}${D.esc(d.es || '')}`;
      return `<li><strong>${D.esc(s)}</strong>${texto}${nodo ? ` · <a href="${D.esc(D.urlFicha(nodo))}">ficha</a>` : ''}</li>`;
    }).join('');

    // Al llegar con #<id>, el navegador ya intentó saltar antes de pintar: se repite.
    if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
  } catch (e) {
    console.error(e);
    lista.innerHTML = '<p class="text-faint">No se ha podido cargar el glosario.</p>';
  }
})();
