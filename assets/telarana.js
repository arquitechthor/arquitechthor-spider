/**
 * Vista "Telaraña" (window.SpiderTelarana): dibuja en un <svg> la telaraña enfocada en un nodo:
 * el nodo en el centro, sus hijos en el primer anillo y sus nietos en el segundo, unidos por hilos
 * radiales sobre una tela de anillos concéntricos (docs/PLAN.md 5.1-A). Solo dibuja: qué pasa al
 * pulsar un nodo lo decide quien llama (assets/mapa.js) con op.destinoDe() y op.navegar().
 *
 * Cada nodo es un <a href> real (se puede abrir en otra pestaña) enfocable con Tab, en orden de las
 * agujas del reloj; las flechas recorren su anillo y Escape sube un nivel.
 */
(function () {
  const NS = 'http://www.w3.org/2000/svg';

  // Medidas en unidades del viewBox (el SVG se escala al ancho disponible).
  const CFG = {
    escritorio: { R1: 270, R2: 460, RC: 78, r1: 17, r2: 9, fCentro: 31, f1: 25, f2: 22, ancho1: 15, max2: 26, etiquetas2: true },
    movil: { R1: 250, R2: 420, RC: 92, r1: 22, r2: 9, fCentro: 40, f1: 32, f2: 0, ancho1: 10, max2: 0, etiquetas2: false },
  };
  const TIPO = { raiz: 'Mapa completo', area: 'Área', bloque: 'Bloque', tema: 'Tema' };

  function el(tag, attrs, padre) {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) if (v !== undefined && v !== null) e.setAttribute(k, v);
    if (padre) padre.appendChild(e);
    return e;
  }

  function polar(r, ang) {
    return [r * Math.cos(ang), r * Math.sin(ang)];
  }

  /** Parte un texto en líneas de unos `ancho` caracteres (como mucho `max`; la última con "…"). */
  function partir(texto, ancho, max = 4) {
    const lineas = [];
    let actual = '';
    for (const palabra of texto.split(/\s+/)) {
      if (actual && (actual + ' ' + palabra).length > ancho) {
        // Una palabra corta ("y", "de") no se queda colgando al final de la línea: baja con la siguiente.
        const m = actual.match(/^(.*\S)\s+(\S{1,2})$/);
        if (m) {
          lineas.push(m[1]);
          actual = `${m[2]} ${palabra}`;
        } else {
          lineas.push(actual);
          actual = palabra;
        }
      } else {
        actual = actual ? `${actual} ${palabra}` : palabra;
      }
    }
    if (actual) lineas.push(actual);
    if (lineas.length > max) {
      lineas.length = max;
      lineas[max - 1] = lineas[max - 1].replace(/\s*\S*$/, '') + '…';
    }
    return lineas;
  }

  function recortar(texto, max) {
    return texto.length > max ? texto.slice(0, max - 1).trimEnd() + '…' : texto;
  }

  /**
   * Reparte el círculo entre los hijos según cuántos nietos tiene cada uno (con un mínimo, para que
   * un hijo sin nietos no quede pegado a sus vecinos) y coloca los nietos dentro del sector de su
   * padre. El primer hijo queda arriba.
   */
  function repartir(datos, focoId) {
    const items = (datos.hijos.get(focoId) || []).map((h) => ({
      ...h,
      nietos: h.acceso ? [] : (datos.hijos.get(h.nodo.id) || []),
    }));
    const pesos = items.map((it) => Math.max(1.6, it.nietos.length));
    const total = pesos.reduce((a, b) => a + b, 0) || 1;
    let a = -Math.PI / 2 - (pesos[0] / total) * Math.PI;
    items.forEach((it, i) => {
      const sector = (pesos[i] / total) * 2 * Math.PI;
      it.ang = a + sector / 2;
      it.nietos = it.nietos.map((nt, j) => ({ ...nt, ang: a + ((j + 0.5) * sector) / it.nietos.length }));
      a += sector;
    });
    return items;
  }

  function dibujar(svg, datos, op) {
    const c = op.movil ? CFG.movil : CFG.escritorio;
    const foco = datos.porId.get(op.foco);
    const items = repartir(datos, op.foco);
    const hayNietos = items.some((it) => it.nietos.length);
    const R1 = hayNietos ? c.R1 : c.R1 + 70;
    const R2 = c.R2;
    const exterior = hayNietos ? R2 : R1;
    let borde;
    if (op.movil) borde = exterior + 60;
    else if (hayNietos) borde = R2 + 18 + c.max2 * c.f2 * 0.52;
    else borde = R1 + 30 + c.ancho1 * c.f1 * 0.6;
    svg.setAttribute('viewBox', `${-borde} ${-borde} ${2 * borde} ${2 * borde}`); // provisional: ver ajustar()
    svg.setAttribute('aria-label', `Telaraña de ${datos.porId.get(op.foco).nombreEs || foco.nombre}`);
    svg.replaceChildren();

    const colorDe = (n) => {
      const area = n.tipo === 'area' ? n : datos.porId.get(n.area);
      return area ? area.color : '#22d3ee';
    };
    const raiz = el('g', { class: op.animar ? 'tela tela-entra' : 'tela' }, svg);

    // Tela: hilos radiales y anillos concéntricos algo cóncavos entre hilo e hilo.
    const angulos = items.length >= 3
      ? items.map((it) => it.ang)
      : Array.from({ length: 12 }, (_, k) => -Math.PI / 2 + (k * Math.PI) / 6);
    const tela = el('g', { class: 'tela-hilos', 'aria-hidden': 'true' }, raiz);
    for (const ang of angulos) {
      const [x, y] = polar(exterior + 26, ang);
      el('line', { x1: 0, y1: 0, x2: x.toFixed(1), y2: y.toFixed(1) }, tela);
    }
    for (const f of [0.38, 0.62, 0.84, 1]) {
      const r = exterior * f;
      let d = '';
      angulos.forEach((ang, k) => {
        const sig = k + 1 < angulos.length ? angulos[k + 1] : angulos[0] + 2 * Math.PI;
        const [x0, y0] = polar(r, ang);
        const [cx, cy] = polar(r * 0.94, (ang + sig) / 2);
        const [x1, y1] = polar(r, sig);
        d += `${k ? '' : `M${x0.toFixed(1)},${y0.toFixed(1)}`}Q${cx.toFixed(1)},${cy.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
      });
      el('path', { d: d + 'Z' }, tela);
    }

    // Enlaces centro → hijos → nietos, del color del área.
    const posiciones = new Map();
    const enlaces = el('g', { class: 'tela-enlaces', 'aria-hidden': 'true' }, raiz);
    for (const it of items) {
      const col = colorDe(it.nodo);
      const [x, y] = polar(R1, it.ang);
      it.x = x; it.y = y;
      if (!it.acceso) posiciones.set(it.nodo.id, [x, y]);
      el('line', { x1: 0, y1: 0, x2: x, y2: y, stroke: col, class: 'enlace', 'data-rama': it.nodo.id }, enlaces);
      for (const nt of it.nietos) {
        const [x2, y2] = polar(R2, nt.ang);
        nt.x = x2; nt.y = y2;
        if (!nt.acceso) posiciones.set(nt.nodo.id, [x2, y2]);
        el('line', { x1: x, y1: y, x2, y2, stroke: col, class: 'enlace enlace-2', 'data-rama': it.nodo.id }, enlaces);
      }
    }

    // Hilos entre temas relacionados que están a la vista (curvos, pasando cerca del centro).
    const relaciones = el('g', { class: 'tela-relaciones', 'aria-hidden': 'true' }, raiz);
    for (const [id, [x1, y1]] of posiciones) {
      for (const rel of datos.porId.get(id).relacionados || []) {
        if (id > rel || !posiciones.has(rel)) continue;
        const [x2, y2] = posiciones.get(rel);
        el('path', { d: `M${x1},${y1}Q${(x1 + x2) * 0.25},${(y1 + y2) * 0.25} ${x2},${y2}`, class: 'relacion', 'data-ids': `${id} ${rel}` }, relaciones);
      }
    }

    // Nodos: centro, y cada hijo seguido de sus nietos (orden de tabulación = agujas del reloj).
    const capa = el('g', { class: 'tela-nodos' }, raiz);
    nodoCentro(capa, foco, c, colorDe(foco), op, datos);
    for (const it of items) {
      nodo(capa, it, { anillo: 1, r: c.r1, rama: it.nodo.id, col: colorDe(it.nodo) }, c, op, datos);
      for (const nt of it.nietos) {
        nodo(capa, nt, { anillo: 2, r: c.r2, rama: it.nodo.id, col: colorDe(nt.nodo) }, c, op, datos);
      }
    }

    ajustar(svg, raiz, op.movil ? 24 : 16);
    activarResaltado(svg);
    if (op.enfocar) {
      const objetivo = svg.querySelector(`a[data-id="${CSS.escape(op.enfocar)}"]`);
      if (objetivo) objetivo.focus({ preventScroll: true });
    }
  }

  function enlaceNodo(padre, nodo, destino, op, clase, etiqueta) {
    const a = el('a', {
      href: op.urlDe(destino), class: clase, 'data-id': nodo.id, 'aria-label': etiqueta,
    }, padre);
    a.addEventListener('click', (ev) => {
      if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button !== 0) return;
      ev.preventDefault();
      op.navegar(destino);
    });
    return a;
  }

  function nodoCentro(capa, foco, c, col, op, datos) {
    const esRaiz = foco.tipo === 'raiz';
    const nombre = foco.nombreEs || foco.nombre;
    const destino = esRaiz ? { n: foco.id } : op.destinoDe(foco, { centro: true });
    const etiqueta = esRaiz ? `${nombre}: centro del mapa` : `${nombre}. Pulsa para subir a ${datos.porId.get(foco.padre).nombreEs || datos.porId.get(foco.padre).nombre}`;
    const a = enlaceNodo(capa, foco, destino, op, `nodo nodo-centro${op.sel ? '' : ' es-sel'}`, etiqueta);
    a.setAttribute('data-anillo', '0');
    a.style.setProperty('--c', col);
    el('title', {}, a).textContent = esRaiz ? nombre : `${nombre} · pulsa para subir`;
    let lineas = partir(nombre, 12, 4);
    // Nombres largos: letra algo menor y líneas más anchas para que quepan en el círculo.
    const f = lineas.length > 2 ? c.fCentro * 0.82 : c.fCentro;
    if (lineas.length > 2) lineas = partir(nombre, 15, 4);
    const lh = f * 1.12;
    const ancho = Math.max(...lineas.map((l) => l.length)) * f * 0.56;
    const radio = Math.max(c.RC, Math.hypot(ancho / 2, (lineas.length * lh) / 2) + 10);
    el('circle', { r: radio, class: 'punto' }, a);
    const t = el('text', { 'text-anchor': 'middle', 'font-size': f, 'font-weight': 700 }, a);
    lineas.forEach((l, i) => {
      el('tspan', { x: 0, y: (i - (lineas.length - 1) / 2) * lh + f * 0.35 }, t).textContent = l;
    });
    if (!esRaiz) {
      el('text', { class: 'subir', 'text-anchor': 'middle', 'font-size': c.fCentro * 0.62, y: -radio - 12 }, a).textContent = '▲ subir';
    }
  }

  function nodo(capa, it, o, c, op, datos) {
    const n = it.nodo;
    const nombre = n.nombreEs || n.nombre;
    const conHijos = (datos.hijos.get(n.id) || []).length > 0;
    const clases = ['nodo', `nodo-anillo-${o.anillo}`];
    if (it.acceso) clases.push('acceso');
    if (n.externo) clases.push('externo');
    if (op.sel === n.id) clases.push('es-sel');
    const destino = op.destinoDe(n, { acceso: it.acceso });
    let etiqueta = `${nombre}. ${TIPO[n.tipo]}`;
    if (it.acceso) etiqueta += `, vive en ${datos.porId.get(n.padre).nombreEs || datos.porId.get(n.padre).nombre}`;
    if (n.externo) etiqueta += ', guía en Apuntes AWS';
    etiqueta += conHijos && !it.acceso ? `. Contiene ${datos.hijos.get(n.id).length}: pulsa para entrar` : '. Pulsa para ver el detalle';
    const a = enlaceNodo(capa, n, destino, op, clases.join(' '), etiqueta);
    a.setAttribute('data-anillo', String(o.anillo));
    a.setAttribute('data-rama', o.rama);
    a.style.setProperty('--c', o.col);
    el('title', {}, a).textContent = nombre + (it.acceso ? ' ↗ (vive en otra rama)' : '');

    if (conHijos) el('circle', { cx: it.x, cy: it.y, r: o.r + 6, class: 'anillo' }, a);
    el('circle', { cx: it.x, cy: it.y, r: o.r, class: 'punto' }, a);

    const marca = (it.acceso ? ' ↗' : '') + (n.externo ? ' ☁' : '');
    const cos = Math.cos(it.ang);
    const sin = Math.sin(it.ang);
    if (o.anillo === 1) {
      // Las áreas (en la raíz) usan su nombre corto: 13 nombres largos se pisan alrededor del centro.
      // El completo sigue en el tooltip, en el panel y en las tarjetas de áreas.
      const lineas = n.nombreCorto ? [n.nombreCorto] : partir(nombre, c.ancho1, 4);
      lineas[lineas.length - 1] += marca;
      const lh = c.f1 * 1.15;
      const sep = o.r + (conHijos ? 14 : 8);
      const t = el('text', { 'font-size': c.f1, 'font-weight': 600 }, a);
      let x = it.x;
      let y0;
      if (Math.abs(cos) > 0.3) {
        t.setAttribute('text-anchor', cos > 0 ? 'start' : 'end');
        x += cos > 0 ? sep : -sep;
        y0 = it.y - ((lineas.length - 1) / 2) * lh + c.f1 * 0.35;
      } else {
        t.setAttribute('text-anchor', 'middle');
        y0 = sin < 0 ? it.y - sep - (lineas.length - 1) * lh : it.y + sep + c.f1 * 0.8;
      }
      lineas.forEach((l, i) => { el('tspan', { x, y: y0 + i * lh }, t).textContent = l; });
    } else if (c.etiquetas2) {
      const grados = (it.ang * 180) / Math.PI;
      const derecha = cos >= 0;
      const sep = o.r + 8;
      const t = el('text', {
        'font-size': c.f2,
        'text-anchor': derecha ? 'start' : 'end',
        'dominant-baseline': 'central',
        x: derecha ? it.x + sep : it.x - sep,
        y: it.y,
        transform: `rotate(${(derecha ? grados : grados + 180).toFixed(2)} ${it.x.toFixed(1)} ${it.y.toFixed(1)})`,
      }, a);
      t.textContent = recortar(nombre, c.max2) + marca;
    }
  }

  /**
   * Ajusta el viewBox a lo dibujado, como un cuadrado centrado en el nodo enfocado (así el centro
   * de la telaraña queda siempre en el centro del lienzo y no sobra margen cuando hay pocos nodos).
   */
  function ajustar(svg, grupo, margen) {
    let caja;
    try { caja = grupo.getBBox(); } catch { return; }
    if (!caja.width) return;
    const mitad = Math.max(-caja.x, -caja.y, caja.x + caja.width, caja.y + caja.height) + margen;
    svg.setAttribute('viewBox', `${-mitad} ${-mitad} ${2 * mitad} ${2 * mitad}`);
  }

  /** Al pasar por un nodo, resalta su rama (el hijo y sus nietos) y atenúa el resto. */
  function activarResaltado(svg) {
    if (svg.dataset.resaltado) return;
    svg.dataset.resaltado = '1';
    const poner = (rama) => {
      svg.classList.toggle('resaltando', Boolean(rama));
      for (const e of svg.querySelectorAll('[data-rama]')) e.classList.toggle('resalta', e.dataset.rama === rama);
    };
    svg.addEventListener('pointerover', (ev) => poner(ev.target.closest('[data-rama]')?.dataset.rama));
    svg.addEventListener('pointerleave', () => poner(null));
    svg.addEventListener('focusin', (ev) => poner(ev.target.closest('[data-rama]')?.dataset.rama));
    svg.addEventListener('focusout', () => poner(null));
  }

  /** Flechas: recorren el anillo del nodo enfocado (en círculo). */
  function moverPorAnillo(svg, ev) {
    const actual = ev.target.closest('a[data-anillo]');
    if (!actual) return false;
    const delta = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[ev.key];
    if (!delta) return false;
    const anillo = [...svg.querySelectorAll(`a[data-anillo="${actual.dataset.anillo}"]`)];
    const i = anillo.indexOf(actual);
    anillo[(i + delta + anillo.length) % anillo.length].focus();
    return true;
  }

  window.SpiderTelarana = { dibujar, moverPorAnillo, partir };
})();
