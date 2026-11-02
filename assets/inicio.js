/**
 * Portada provisional (Fase 2): las 13 áreas del árbol como tarjetas, con su icono, su frase, sus
 * bloques y cuántos temas tienen. En la Fase 3 la portada pasa a ser el mapa (vista Telaraña).
 */
(async function () {
  const D = window.SpiderDatos;
  const cont = document.getElementById('area-grid');
  const resumen = document.getElementById('areas-resumen');
  if (!cont) return;

  try {
    const datos = await D.cargar();
    const todosLosTemas = D.temasDe(datos, datos.raiz.id);
    if (resumen) {
      resumen.textContent = `${datos.areas.length} áreas, ${todosLosTemas.length} temas. `
        + 'Los de AWS enlazan a su guía en Apuntes AWS.';
    }
    cont.innerHTML = datos.areas.map((area) => {
      const bloques = datos.hijos.get(area.id).filter((h) => !h.acceso).map((h) => h.nodo);
      const temas = D.temasDe(datos, area.id);
      const evaluables = temas.filter((t) => t.evaluable).length;
      const cifras = `${temas.length} temas${evaluables < temas.length ? ` · ${evaluables} con evaluación` : ''}`;
      return `<article class="area-card" style="--c:${D.esc(area.color)}">
        <div class="area-card-head">
          ${D.iconoArea(area)}
          <h3>${D.nombreHtml(area)}</h3>
        </div>
        <p>${D.esc(area.frase)}</p>
        <div class="chips">${bloques.map((b) => `<span class="chip" title="${D.esc(b.frase || '')}">${D.esc(D.nombreTexto(b))}</span>`).join('')}</div>
        <p class="area-cifras">${cifras}</p>
      </article>`;
    }).join('');
  } catch (e) {
    console.error(e);
    cont.innerHTML = '<p class="text-faint">No se han podido cargar las áreas. Recarga la página para intentarlo de nuevo.</p>';
  }
})();
