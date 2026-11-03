/**
 * Utilidades del árbol (window.SpiderArbol), sobre los datos de SpiderDatos.cargar():
 * ancestros, ruta, búsqueda y agregados. No toca el DOM.
 */
(function () {
  /** Ancestros desde la raíz hasta el padre (sin incluir el propio nodo). */
  function ancestros(datos, id) {
    const ruta = [];
    let actual = datos.porId.get(id);
    while (actual && actual.padre) {
      actual = datos.porId.get(actual.padre);
      if (actual) ruta.unshift(actual);
    }
    return ruta;
  }

  /** Ruta completa raíz → nodo. */
  function ruta(datos, id) {
    const nodo = datos.porId.get(id);
    return nodo ? [...ancestros(datos, id), nodo] : [];
  }

  /** Área (nivel 1) del nodo, o null para la raíz. */
  function area(datos, nodo) {
    return nodo && nodo.area ? datos.porId.get(nodo.area) : null;
  }

  function tieneHijos(datos, id) {
    return (datos.hijos.get(id) || []).length > 0;
  }

  /** Padres donde el nodo aparece como acceso (además de su padre real). */
  function accesosDe(datos, nodo) {
    return (nodo.accesos || []).map((id) => datos.porId.get(id)).filter(Boolean);
  }

  /** Quita tildes y pasa a minúsculas, para buscar sin que importen. */
  function normalizar(texto) {
    return String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  /**
   * Busca en nombre, nombre en español, alias y frase. Devuelve los nodos ordenados: primero los
   * que coinciden en el nombre o un alias (y, dentro de ellos, los que empiezan por el texto).
   */
  function buscar(datos, texto, limite = Infinity) {
    const q = normalizar(texto).trim();
    if (!q) return [];
    const resultados = [];
    for (const n of datos.nodos) {
      if (n.tipo === 'raiz') continue;
      const nombres = [n.nombre, n.nombreEs, ...(n.alias || [])].map(normalizar);
      let puntos = 0;
      if (nombres.some((x) => x.startsWith(q))) puntos = 3;
      else if (nombres.some((x) => x.includes(q))) puntos = 2;
      else if (normalizar(n.frase).includes(q)) puntos = 1;
      if (puntos) resultados.push({ n, puntos });
    }
    resultados.sort((a, b) => b.puntos - a.puntos);
    return resultados.slice(0, limite).map((r) => r.n);
  }

  /**
   * Autoevaluación de una rama: media de los temas marcados (0–4), cuántos lo están y cuántos hay.
   * `auto` es el objeto de spider.autoevaluacion ({ id: nivel }). Media null si no hay ninguno.
   */
  function nivelMedio(datos, id, auto) {
    const temas = window.SpiderDatos.temasDe(datos, id);
    const marcados = temas.map((t) => auto[t.id]).filter((v) => Number.isInteger(v));
    const media = marcados.length ? marcados.reduce((a, b) => a + b, 0) / marcados.length : null;
    return { media, marcados: marcados.length, total: temas.length };
  }

  window.SpiderArbol = { ancestros, ruta, area, tieneHijos, accesosDe, normalizar, buscar, nivelMedio };
})();
