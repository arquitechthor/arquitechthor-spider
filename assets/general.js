/**
 * "Vista general" (window.SpiderGeneral, docs/PLAN.md 5.1-A): el árbol radial completo como mapa de
 * orientación para pantallas anchas. La raíz en el centro, cada área con su sector, los nodos
 * intermedios a la distancia de su nivel y todos los nodos sin hijos en el borde. Los nombres solo
 * aparecen al pasar el ratón (o con el foco) en una línea de información bajo el dibujo; las áreas
 * llevan su nombre corto fijo. Pulsar un punto abre la telaraña enfocada en él (op.abrir).
 *
 * Solo dibuja en el mismo <svg> que la telaraña: mapa.js aplica después el color por nivel, los
 * filtros y la búsqueda sobre los <a class="nodo" data-id>. Los accesos no se repiten: cada nodo
 * aparece una vez, en su sitio real.
 */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const R = 520;           // radio del borde, donde van los nodos sin hijos
  const HUECO = 2;         // huecos (en puestos de hoja) entre un área y la siguiente
  const RADIO = { 0: 22, 1: 11, 2: 7, 3: 5.5, hoja: 4 };
  const TIPO = { raiz: 'Mapa completo', area: 'Área', bloque: 'Bloque', tema: 'Tema' };

  function el(tag, attrs, padre) {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) if (v !== undefined && v !== null) e.setAttribute(k, v);
    if (padre) padre.appendChild(e);
    return e;
  }

  const polar = (r, ang) => [r * Math.cos(ang), r * Math.sin(ang)];
  const f1 = (v) => v.toFixed(1);

  /**
   * Coloca cada nodo: { nodo, prof, ang, r, hoja, padre }. Las hojas se reparten por igual en el
   * borde (en el orden de nodos.json, el primer área arriba y en el sentido de las agujas del
   * reloj); un nodo con hijos queda en el centro del arco de los suyos.
   */
  function colocar(datos) {
    const propios = (id) => (datos.hijos.get(id) || []).filter((h) => !h.acceso).map((h) => h.nodo);
    const hojas = [];
    const recorrer = (nodo, prof, area) => {
      const hijos = propios(nodo.id);
      if (!hijos.length && prof > 0) hojas.push({ nodo, area });
      for (const h of hijos) recorrer(h, prof + 1, prof === 0 ? h.id : area);
    };
    recorrer(datos.raiz, 0, null);

    const areas = [...new Set(hojas.map((h) => h.area))];
    const puestos = hojas.length + areas.length * HUECO;
    const paso = (2 * Math.PI) / puestos;
    const angHoja = new Map();
    let puesto = HUECO / 2;
    let areaAnterior = hojas.length ? hojas[0].area : null;
    for (const h of hojas) {
      if (h.area !== areaAnterior) { puesto += HUECO; areaAnterior = h.area; }
      angHoja.set(h.nodo.id, -Math.PI / 2 + (puesto + 0.5) * paso);
      puesto++;
    }

    const puntos = new Map();
    const situar = (nodo, prof, padre) => {
      const hijos = propios(nodo.id);
      const p = { nodo, prof, padre, hoja: !hijos.length && prof > 0 };
      puntos.set(nodo.id, p);
      const deHijos = hijos.map((h) => situar(h, prof + 1, p));
      if (p.hoja) {
        p.ang = angHoja.get(nodo.id);
        p.r = R;
      } else if (prof === 0) {
        p.ang = 0;
        p.r = 0;
      } else {
        p.ang = (deHijos[0].ang + deHijos[deHijos.length - 1].ang) / 2;
        p.r = (R * prof) / 4;
      }
      return p;
    };
    situar(datos.raiz, 0, null);
    return puntos;
  }

  function dibujar(svg, datos, op) {
    svg.replaceChildren();
    svg.setAttribute('aria-label', 'Vista general del mapa: todas las áreas y sus temas');
    const puntos = colocar(datos);
    const colorDe = (n) => {
      const area = n.tipo === 'area' ? n : datos.porId.get(n.area);
      return area ? area.color : '#22d3ee';
    };
    const raiz = el('g', { class: op.animar ? 'tela tela-entra' : 'tela' }, svg);

    // Anillos de fondo, uno por nivel.
    const tela = el('g', { class: 'tela-hilos', 'aria-hidden': 'true' }, raiz);
    for (const prof of [1, 2, 3, 4]) el('circle', { r: (R * prof) / 4, cx: 0, cy: 0 }, tela);

    // Hilos padre → hijo, curvos como en un árbol radial.
    const enlaces = el('g', { class: 'tela-enlaces', 'aria-hidden': 'true' }, raiz);
    for (const p of puntos.values()) {
      if (!p.padre) continue;
      p.xy = polar(p.r, p.ang);
      const a = p.padre;
      const [x0, y0] = polar(a.r, a.ang);
      const rm = (a.r + p.r) / 2;
      const [c1x, c1y] = polar(rm, a.ang);
      const [c2x, c2y] = polar(rm, p.ang);
      el('path', {
        d: `M${f1(x0)},${f1(y0)}C${f1(c1x)},${f1(c1y)} ${f1(c2x)},${f1(c2y)} ${f1(p.xy[0])},${f1(p.xy[1])}`,
        stroke: colorDe(p.nodo), class: `enlace enlace-general${p.prof > 2 ? ' enlace-2' : ''}`, 'data-hasta': p.nodo.id,
      }, enlaces);
    }

    // Nodos: los de los niveles 0–2 (raíz, áreas y bloques) entran en el orden de tabulación; los
    // demás se pueden pulsar, pero con teclado se llega a ellos desde la telaraña.
    const capa = el('g', { class: 'tela-nodos' }, raiz);
    const actual = op.sel || op.foco;
    const orden = [...puntos.values()].sort((a, b) => a.prof - b.prof);
    for (const p of orden) {
      const n = p.nodo;
      const [x, y] = p.prof === 0 ? [0, 0] : (p.xy || polar(p.r, p.ang));
      const conHijos = !p.hoja && p.prof > 0;
      const destino = n.tipo === 'raiz' || conHijos ? { n: n.id } : { n: n.padre, s: n.id };
      const ruta = rutaTexto(datos, p);
      const etiqueta = `${D().nombreTexto(n)}. ${TIPO[n.tipo]}${ruta ? `, en ${ruta}` : ''}. Pulsa para abrirlo en la telaraña`;
      const clases = ['nodo', 'nodo-general', `nodo-prof-${Math.min(p.prof, 3)}`];
      if (p.prof === 0) clases.push('nodo-centro');
      if (n.externo) clases.push('externo');
      if (n.id === actual) clases.push('es-sel');
      const a = el('a', {
        href: op.urlTelarana(destino), class: clases.join(' '), 'data-id': n.id, 'data-v-destino': 'telarana',
        'aria-label': etiqueta, 'data-etiqueta': etiqueta, tabindex: p.prof <= 2 ? null : '-1',
      }, capa);
      a.style.setProperty('--c', colorDe(n));
      a.addEventListener('click', (ev) => {
        if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button !== 0) return;
        ev.preventDefault();
        op.abrir(destino);
      });
      const r = p.hoja ? RADIO.hoja : RADIO[Math.min(p.prof, 3)];
      el('circle', { cx: f1(x), cy: f1(y), r: r + 3, class: 'zona' }, a); // zona de pulsación algo mayor
      el('circle', { cx: f1(x), cy: f1(y), r, class: 'punto' }, a);
      if (p.prof === 1) {
        // Nombre corto del área, fuera del borde y a la altura de su sector.
        const [lx, ly] = polar(R + 26, p.ang);
        const cos = Math.cos(p.ang);
        const sin = Math.sin(p.ang);
        el('text', {
          x: f1(lx), y: f1(ly + (sin > 0.85 ? 18 : sin < -0.85 ? -6 : 7)), 'font-size': 22, 'font-weight': 700,
          'text-anchor': Math.abs(cos) < 0.25 ? 'middle' : cos > 0 ? 'start' : 'end', class: 'general-area',
        }, a).textContent = n.nombreCorto || D().nombreTexto(n);
      }
    }

    ajustar(svg, raiz);
    activarInfo(svg, datos, puntos, op.info);
    if (op.enfocar) svg.querySelector(`a[data-id="${CSS.escape(op.enfocar)}"]`)?.focus({ preventScroll: true });
  }

  const D = () => window.SpiderDatos;

  /** "Área › Bloque" (los ancestros sin la raíz), para la etiqueta y la línea de información. */
  function rutaTexto(datos, p) {
    const partes = [];
    for (let a = p.padre; a && a.prof > 0; a = a.padre) partes.unshift(D().nombreTexto(a.nodo));
    return partes.join(' › ');
  }

  /** viewBox cuadrado centrado en la raíz y ajustado a lo dibujado (las etiquetas de las áreas). */
  function ajustar(svg, grupo) {
    let caja;
    try { caja = grupo.getBBox(); } catch { caja = null; }
    const mitad = caja && caja.width
      ? Math.max(-caja.x, -caja.y, caja.x + caja.width, caja.y + caja.height) + 12
      : R + 160;
    svg.setAttribute('viewBox', `${-mitad} ${-mitad} ${2 * mitad} ${2 * mitad}`);
  }

  /**
   * Al pasar por un punto (o enfocarlo): su nombre y su ruta en la línea de información, y su camino
   * desde la raíz resaltado. Sin nada debajo, la línea vuelve al texto de ayuda.
   */
  function activarInfo(svg, datos, puntos, info) {
    const ayuda = 'Pasa el ratón por un punto para ver qué es; pulsa para abrirlo en la telaraña.';
    if (info) info.textContent = ayuda;
    const poner = (id) => {
      svg.querySelectorAll('.en-ruta').forEach((e) => e.classList.remove('en-ruta'));
      svg.classList.toggle('con-ruta', Boolean(id));
      const p = id && puntos.get(id);
      if (!p) { if (info) info.textContent = ayuda; return; }
      for (let a = p; a; a = a.padre) {
        svg.querySelector(`a[data-id="${CSS.escape(a.nodo.id)}"]`)?.classList.add('en-ruta');
        svg.querySelector(`[data-hasta="${CSS.escape(a.nodo.id)}"]`)?.classList.add('en-ruta');
      }
      if (info) {
        const ruta = rutaTexto(datos, p);
        const n = p.nodo;
        info.innerHTML = `<strong>${D().esc(D().nombreTexto(n))}${n.externo ? ' ☁' : ''}</strong>`
          + ` <span class="text-faint">· ${D().esc(TIPO[n.tipo])}${ruta ? ` · ${D().esc(ruta)}` : ''}</span>`;
      }
    };
    // Los escuchadores se ponen una vez por <svg>; el dibujo cambia, pero el elemento es el mismo.
    svg._generalPoner = poner;
    if (svg.dataset.generalInfo) return;
    svg.dataset.generalInfo = '1';
    const id = (ev) => ev.target.closest?.('a.nodo-general')?.dataset.id;
    svg.addEventListener('pointerover', (ev) => svg._generalPoner && svg.querySelector('.nodo-general') && svg._generalPoner(id(ev)));
    svg.addEventListener('pointerleave', () => svg._generalPoner && svg.querySelector('.nodo-general') && svg._generalPoner(null));
    svg.addEventListener('focusin', (ev) => svg._generalPoner && svg.querySelector('.nodo-general') && svg._generalPoner(id(ev)));
  }

  window.SpiderGeneral = { dibujar };
})();
