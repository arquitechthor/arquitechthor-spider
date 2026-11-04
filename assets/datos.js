/**
 * Carga compartida del árbol (data/nodos.json) y utilidades comunes (window.SpiderDatos).
 * Las rutas se resuelven respecto a la raíz del sitio, calculada a partir de la URL de este mismo
 * script, así que funciona igual desde index.html que desde temas/<id>.html y bajo el subdirectorio
 * de GitHub Pages (/arquitechthor-spider/). Siempre rutas relativas, nunca "/data/...".
 */
(function () {
  const RAIZ = new URL('../', document.currentScript.src);

  let cache = null;

  function url(ruta) {
    return new URL(ruta, RAIZ).href;
  }

  async function json(ruta) {
    const res = await fetch(url(ruta), { cache: 'no-cache' });
    if (!res.ok) throw new Error(`${ruta}: HTTP ${res.status}`);
    return res.json();
  }

  /**
   * Árbol completo. "hijos" de cada nodo: primero los propios (en el orden de nodos.json) y
   * después los accesos (nodos que viven en otra rama y aparecen también aquí, ver PLAN.md 4.2).
   */
  function cargar() {
    if (!cache) {
      cache = json('data/nodos.json').then((nodos) => {
        const porId = new Map(nodos.map((n) => [n.id, n]));
        const propios = new Map();
        const accesos = new Map();
        for (const n of nodos) {
          if (n.padre) agregar(propios, n.padre, n);
          for (const p of n.accesos || []) agregar(accesos, p, n);
        }
        const hijos = new Map(nodos.map((n) => [n.id, [
          ...(propios.get(n.id) || []).map((nodo) => ({ nodo, acceso: false })),
          ...(accesos.get(n.id) || []).map((nodo) => ({ nodo, acceso: true })),
        ]]));
        const raiz = nodos.find((n) => n.tipo === 'raiz');
        const areas = nodos.filter((n) => n.tipo === 'area');
        return { nodos, porId, hijos, raiz, areas };
      });
    }
    return cache;
  }

  function agregar(mapa, clave, valor) {
    if (!mapa.has(clave)) mapa.set(clave, []);
    mapa.get(clave).push(valor);
  }

  /** Temas de una rama (sin repetir los que aparecen como acceso), incluido el propio nodo si es tema. */
  function temasDe(datos, id) {
    const vistos = new Set();
    const pila = [id];
    const temas = [];
    while (pila.length) {
      const actual = pila.pop();
      if (vistos.has(actual)) continue;
      vistos.add(actual);
      const nodo = datos.porId.get(actual);
      if (nodo && nodo.tipo === 'tema') temas.push(nodo);
      for (const h of datos.hijos.get(actual) || []) if (!h.acceso) pila.push(h.nodo.id);
    }
    return temas;
  }

  function esc(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  /** Nombre visible: el español si lo hay, con el original atenuado: "Gestión de datos (Data Management)". */
  function nombreHtml(nodo) {
    if (!nodo.nombreEs || nodo.nombreEs === nodo.nombre) return esc(nodo.nombre);
    return `${esc(nodo.nombreEs)} <span class="nombre-en">(${esc(nodo.nombre)})</span>`;
  }

  function nombreTexto(nodo) {
    return nodo.nombreEs || nodo.nombre;
  }

  /** Icono propio del área, pintado con su color como máscara CSS (decorativo: el nombre va al lado). */
  function iconoArea(area, clase = 'icono-area') {
    if (!area) return '';
    const estilo = `--c:${area.color};--icono:url('${url(`assets/iconos/areas/${area.id}.svg`)}')`;
    return `<span class="${clase}" style="${esc(estilo)}" aria-hidden="true"></span>`;
  }

  /**
   * Almacenamiento local (ver aviso legal, privacidad). Todas las claves empiezan por "spider." y
   * cualquier fallo (navegación privada, almacenamiento bloqueado) se trata como "sin datos": la
   * web funciona igual, solo que no recuerda nada.
   */
  const CLAVES = {
    progreso: 'spider.progreso',
    autoevaluacion: 'spider.autoevaluacion',
    evaluaciones: 'spider.evaluaciones',
    simulacros: 'spider.simulacros',
    vista: 'spider.vista',
    lectura: 'spider.lectura',
    leidas: 'spider.leidas',
  };

  function leer(nombre, porDefecto = {}) {
    try {
      const valor = JSON.parse(localStorage.getItem(CLAVES[nombre]) || 'null');
      return valor ?? porDefecto;
    } catch {
      return porDefecto;
    }
  }

  function guardar(nombre, valor) {
    try {
      if (valor === undefined || valor === null) localStorage.removeItem(CLAVES[nombre]);
      else localStorage.setItem(CLAVES[nombre], JSON.stringify(valor));
      return true;
    } catch {
      return false;
    }
  }

  function formatoFecha(iso) {
    const [a, m, d] = iso.split('-');
    return `${d}/${m}/${a}`;
  }

  /** Progreso de las preguntas: { "<tema>": { aciertos, fallos?, total, finalizado } } (spider.progreso). */
  function leerProgreso() {
    return leer('progreso');
  }

  function guardarProgreso(idTema, entrada) {
    const todo = leerProgreso();
    if (entrada) todo[idTema] = entrada;
    else delete todo[idTema];
    return guardar('progreso', Object.keys(todo).length ? todo : null);
  }

  /**
   * Ficha de un nodo: temas/<id>.html si está publicada; si no, la ficha genérica
   * tema.html?id=<id> ("Próximamente", con su frase, lo que contiene y sus relacionados).
   * Los externos (AWS) van a su guía en Apuntes AWS.
   */
  function urlFicha(nodo) {
    if (nodo.externo) return url(nodo.externo.url);
    if (nodo.tipo === 'raiz') return url('index.html');
    return nodo.estado === 'publicado' ? url(`temas/${nodo.id}.html`) : url(`tema.html?id=${encodeURIComponent(nodo.id)}`);
  }

  /**
   * Fichas leídas (spider.leidas): { "<id>": "AAAA-MM-DD" }, la fecha en que se marcó. Solo cuentan
   * las fichas escritas (publicadas y no externas). Si la ficha se revisó después ("revisado"
   * posterior a esa fecha), queda "actualizada desde que la leíste".
   */
  function tieneFicha(nodo) {
    return Boolean(nodo) && nodo.tipo !== 'raiz' && !nodo.externo && nodo.estado === 'publicado';
  }

  /** null si no está leída; si lo está, { fecha, actualizada }. */
  function lecturaDe(nodo, leidas = leer('leidas')) {
    const fecha = tieneFicha(nodo) ? leidas[nodo.id] : null;
    if (!fecha) return null;
    return { fecha, actualizada: Boolean(nodo.revisado && nodo.revisado > fecha) };
  }

  /** Marca (fecha de hoy) o desmarca una ficha como leída. */
  function marcarLeida(id, leida) {
    const leidas = leer('leidas');
    if (leida) leidas[id] = hoy(); else delete leidas[id];
    return guardar('leidas', Object.keys(leidas).length ? leidas : null);
  }

  /** Fecha local de hoy en AAAA-MM-DD. */
  function hoy() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /** Glosario de siglas y conceptos (data/glosario.json), compartido por siglas.js y glosario.js. */
  let glosario = null;
  function cargarGlosario() {
    if (!glosario) glosario = json('data/glosario.json');
    return glosario;
  }

  window.SpiderDatos = {
    url, json, cargar, temasDe, esc, nombreHtml, nombreTexto, iconoArea, leer, guardar, formatoFecha,
    leerProgreso, guardarProgreso, urlFicha, cargarGlosario, tieneFicha, lecturaDe, marcarLeida, hoy,
  };
})();
