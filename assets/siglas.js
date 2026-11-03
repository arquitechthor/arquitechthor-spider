/**
 * Siglas y conceptos con tooltip (window.SpiderSiglas), a partir de data/glosario.json.
 *
 * Igual que en aws-cert-study, cada sigla se escribe tal cual en el texto ("IA", "LLM") y se marca
 * como <abbr class="sigla" data-s data-en data-es tabindex="0">; la primera de la página lleva
 * además su explicación oculta para lectores de pantalla (.sigla-exp). Diferencias:
 *   - Se marca al cargar la página (no hay paso previo en Python): basta con añadir la sigla al
 *     glosario y aparece en todas las fichas y preguntas.
 *   - Si la sigla tiene ficha o concepto ("enlace"), su primera aparición en cada sección (<h2>)
 *     es además un enlace a ella, salvo en su propia ficha.
 *   - Los conceptos se enlazan a mano en la ficha (<a class="concepto" data-concepto="modelo">):
 *     aquí reciben su href al glosario y el mismo tooltip con la definición.
 * El tooltip es un único elemento con posición fija ajustada a la ventana (nunca provoca scroll
 * horizontal); aparece al pasar el ratón, con el foco o al tocar.
 */
(function () {
  const D = window.SpiderDatos;
  let tip = null;
  let actual = null;

  function crearTip() {
    tip = document.createElement('div');
    tip.className = 'sigla-tip';
    tip.setAttribute('role', 'tooltip');
    tip.id = 'sigla-tip';
    tip.hidden = true;
    document.body.appendChild(tip);
  }

  function mostrar(el) {
    if (!tip) crearTip();
    actual = el;
    const { s, en, es } = el.dataset;
    tip.innerHTML = `<strong>${D.esc(s)}</strong>${en ? ` <em>${D.esc(en)}</em>` : ''}${es ? `<span>${D.esc(es)}</span>` : ''}`;
    tip.hidden = false;
    el.setAttribute('aria-describedby', 'sigla-tip');
    const r = el.getBoundingClientRect();
    const margen = 8;
    const ancho = Math.min(tip.offsetWidth, window.innerWidth - margen * 2);
    let x = r.left + r.width / 2 - ancho / 2;
    x = Math.max(margen, Math.min(x, window.innerWidth - ancho - margen));
    let y = r.bottom + 6;
    if (y + tip.offsetHeight > window.innerHeight - margen) y = r.top - tip.offsetHeight - 6;
    tip.style.left = `${x}px`;
    tip.style.top = `${Math.max(margen, y)}px`;
  }

  function ocultar() {
    if (tip) tip.hidden = true;
    if (actual) actual.removeAttribute('aria-describedby');
    actual = null;
  }

  /** Elemento con tooltip bajo el evento: una sigla, un concepto o el enlace que envuelve una sigla. */
  function objetivo(ev) {
    const t = ev.target;
    if (!t || !t.closest) return null;
    const enlace = t.closest('a.sigla-enlace');
    if (enlace) return enlace.querySelector('abbr.sigla');
    return t.closest('abbr.sigla, a.concepto[data-s]');
  }
  document.addEventListener('mouseover', (ev) => { const el = objetivo(ev); if (el) mostrar(el); });
  document.addEventListener('mouseout', (ev) => {
    const el = objetivo(ev);
    if (!el || el !== actual) return;
    const zona = el.closest('a.sigla-enlace') || el; // la sigla enlazada ocupa todo su <a>
    if (!zona.contains(ev.relatedTarget)) ocultar();
  });
  document.addEventListener('focusin', (ev) => { const el = objetivo(ev); if (el) mostrar(el); else ocultar(); });
  document.addEventListener('focusout', (ev) => { if (objetivo(ev) === actual) ocultar(); });
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') ocultar(); });
  window.addEventListener('scroll', ocultar, { passive: true });
  window.addEventListener('resize', ocultar);

  // ── Glosario ──────────────────────────────────────────────────────────────────────────
  let preparado = null;

  /** Glosario con la expresión regular de todas las siglas (las largas primero, plural opcional). */
  function cargar() {
    if (!preparado) {
      preparado = Promise.all([D.cargarGlosario(), D.cargar()]).then(([g, datos]) => {
        const toks = Object.keys(g.siglas).sort((a, b) => b.length - a.length);
        const escRx = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // No dentro de otra palabra ("MLOps" no es ML), plural "LLMs" incluido, y no cuando va
        // seguida de una palabra en mayúscula (es parte de un nombre: "AI Engineering").
        const rx = new RegExp(`(?<![\\w/.-])(${toks.map(escRx).join('|')})(s?)(?![\\w/-])(?! [A-ZÁÉÍÓÚ])`, 'g');
        const conceptos = new Map(g.conceptos.map((c) => [c.id, c]));
        return { ...g, rx, conceptos, datos };
      });
    }
    return preparado;
  }

  /** URL del destino de una sigla: la ficha de un nodo o el concepto en el glosario. */
  function urlDestino(g, destino) {
    if (!destino) return null;
    const nodo = g.datos.porId.get(destino);
    if (nodo) return D.urlFicha(nodo);
    return g.conceptos.has(destino) ? D.url(`glosario.html#${destino}`) : null;
  }

  function atributos(tok, def) {
    return `data-s="${D.esc(tok)}"${def.en ? ` data-en="${D.esc(def.en)}"` : ''}${def.es ? ` data-es="${D.esc(def.es)}"` : ''}`;
  }

  /** Texto plano ya escapado (preguntas del quiz): siglas con tooltip, sin enlaces. */
  function marcar(textoEscapado, g) {
    return textoEscapado.replace(g.rx, (m, tok) => `<abbr class="sigla" ${atributos(tok, g.siglas[tok])} tabindex="0">${m}</abbr>`);
  }

  const SALTAR = 'code, pre, a, abbr, h1, h2, h3, cite, script, style, .quiz, .sigla-exp, [data-sin-siglas]';

  /**
   * Marca las siglas de una ficha. `pagina` es el id del nodo de la página (su propia sigla no se
   * enlaza a sí misma). Los conceptos (<a class="concepto" data-concepto>) reciben href y tooltip.
   */
  function marcarDoc(raiz, g, pagina) {
    for (const a of raiz.querySelectorAll('a.concepto[data-concepto]')) {
      const c = g.conceptos.get(a.dataset.concepto);
      if (!c) continue;
      if (!a.getAttribute('href')) a.href = D.url(`glosario.html#${c.id}`);
      a.dataset.s = c.termino;
      if (c.en) a.dataset.en = c.en;
      a.dataset.es = c.definicion;
    }
    // Recorrido en orden del documento: los <h2> abren sección (se vuelve a enlazar la primera).
    const walker = document.createTreeWalker(raiz, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    const trabajos = [];
    let seccion = 0;
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (n.nodeType === Node.ELEMENT_NODE) {
        if (n.tagName === 'H2') seccion += 1;
        continue;
      }
      if (!n.nodeValue.trim() || n.parentElement.closest(SALTAR)) continue;
      g.rx.lastIndex = 0;
      if (g.rx.test(n.nodeValue)) trabajos.push([n, seccion]);
    }
    const vistas = new Set();
    const enlazadas = new Set();
    for (const [nodo, sec] of trabajos) {
      const texto = nodo.nodeValue;
      const frag = document.createDocumentFragment();
      let ultimo = 0;
      g.rx.lastIndex = 0;
      for (let m = g.rx.exec(texto); m; m = g.rx.exec(texto)) {
        const [todo, tok] = m;
        const def = g.siglas[tok];
        frag.appendChild(document.createTextNode(texto.slice(ultimo, m.index)));
        ultimo = m.index + todo.length;
        const abbr = document.createElement('abbr');
        abbr.className = 'sigla';
        abbr.dataset.s = tok;
        if (def.en) abbr.dataset.en = def.en;
        if (def.es) abbr.dataset.es = def.es;
        abbr.textContent = todo;
        if (!vistas.has(tok)) {
          vistas.add(tok);
          const exp = document.createElement('span');
          exp.className = 'sigla-exp';
          exp.textContent = ` (${[def.en, def.es].filter(Boolean).join(': ')})`;
          abbr.appendChild(exp);
        }
        const url = def.enlace !== pagina ? urlDestino(g, def.enlace) : null;
        const clave = `${sec}:${tok}`;
        if (url && !enlazadas.has(clave)) {
          enlazadas.add(clave);
          const a = document.createElement('a');
          a.className = 'sigla-enlace';
          a.href = url;
          a.appendChild(abbr);
          frag.appendChild(a);
        } else {
          abbr.tabIndex = 0;
          frag.appendChild(abbr);
        }
      }
      frag.appendChild(document.createTextNode(texto.slice(ultimo)));
      nodo.replaceWith(frag);
    }
  }

  window.SpiderSiglas = { cargar, marcar, marcarDoc, urlDestino };
})();
