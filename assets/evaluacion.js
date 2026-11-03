/**
 * evaluacion.html?id=<nodo>: cabecera de "Evaluar esta rama" (las preguntas las pinta quiz.js con
 * data-rama). Enlaza a la ficha del nodo y dice qué temas entran.
 */
(async function () {
  const D = window.SpiderDatos;
  const cab = document.getElementById('evaluacion-cab');
  if (!cab) return;
  const datos = await D.cargar().catch(() => null);
  const n = datos && datos.porId.get(new URLSearchParams(location.search).get('id'));
  if (!n) {
    cab.innerHTML = `<h1 class="ficha-titulo">Evaluación</h1><p>No se ha indicado qué rama evaluar. <a href="${D.esc(D.url('index.html#mapa'))}">Volver al mapa</a>.</p>`;
    return;
  }
  const temas = D.temasDe(datos, n.id).filter((t) => t.estado === 'publicado' && t.evaluable && !t.externo);
  const area = window.SpiderArbol.area(datos, n);
  document.title = `Evaluar: ${D.nombreTexto(n)} — Tech Spider`;
  cab.innerHTML = `
    <p class="panel-tipo">Evaluar esta rama</p>
    <h1 class="ficha-titulo">${D.iconoArea(area)}<span>${D.nombreHtml(n)}</span></h1>
    <p class="ficha-frase">${temas.length
      ? `Preguntas de ${temas.length === 1 ? 'su tema publicado' : `sus ${temas.length} temas publicados`}: ${temas.map((t) => `<a href="${D.esc(D.urlFicha(t))}">${D.esc(D.nombreTexto(t))}</a>`).join(', ')}.`
      : 'Esta rama todavía no tiene temas con evaluación.'}</p>
    <div class="ficha-acciones"><a class="btn btn-secondary btn-sm" href="${D.esc(D.urlFicha(n))}">Ver la ficha</a></div>`;
})();
