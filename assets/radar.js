/**
 * Radar "Mi telaraña" (window.SpiderRadar, docs/PLAN.md 5.1-C): un eje por área y dos capas, mi nivel
 * (autoevaluación) y mis tests (preguntas acertadas). SVG propio, sin librería. Solo dibuja: los
 * valores (0–1 o null si no hay dato) los calcula quien llama (assets/mapa.js), que decide también
 * qué pasa al pulsar un eje (enfocar esa área en el mapa) con op.urlArea() y op.irArea().
 */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const R = 200; // radio del borde (valor 1) en unidades del viewBox
  const CAPAS = [
    { clave: 'nivel', clase: 'radar-capa-nivel' },
    { clave: 'tests', clase: 'radar-capa-tests' },
  ];

  function el(tag, attrs, padre) {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) if (v !== undefined && v !== null) e.setAttribute(k, v);
    if (padre) padre.appendChild(e);
    return e;
  }

  const polar = (r, ang) => [r * Math.cos(ang), r * Math.sin(ang)];
  const punto = (r, ang) => polar(r, ang).map((v) => v.toFixed(1)).join(',');

  /**
   * ejes: [{ area, etiqueta (texto para lectores de pantalla), nivel, tests }], en el orden del mapa.
   * El primero queda arriba y siguen en el sentido de las agujas del reloj, como en la telaraña.
   */
  function dibujar(svg, ejes, op) {
    svg.replaceChildren();
    const n = ejes.length;
    const ang = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / n;

    // Tela: anillos al 25, 50, 75 y 100 % y un radio por área.
    const tela = el('g', { class: 'radar-tela', 'aria-hidden': 'true' }, svg);
    for (const f of [0.25, 0.5, 0.75, 1]) {
      el('polygon', { points: ejes.map((_, i) => punto(R * f, ang(i))).join(' '), class: f === 1 ? 'radar-borde' : '' }, tela);
    }
    ejes.forEach((_, i) => {
      const [x, y] = polar(R, ang(i));
      el('line', { x1: 0, y1: 0, x2: x.toFixed(1), y2: y.toFixed(1) }, tela);
    });

    // Capas: un área sin dato cuenta como 0 (el polígono se cierra por el centro).
    for (const capa of CAPAS) {
      if (!ejes.some((e) => e[capa.clave] !== null)) continue;
      const g = el('g', { class: `radar-capa ${capa.clase}`, 'aria-hidden': 'true' }, svg);
      el('polygon', { points: ejes.map((e, i) => punto(R * (e[capa.clave] || 0), ang(i))).join(' ') }, g);
      ejes.forEach((e, i) => {
        if (e[capa.clave] === null) return;
        const [x, y] = polar(R * e[capa.clave], ang(i));
        el('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: 4.5 }, g);
      });
    }

    // Ejes: el nombre corto del área es un enlace que la enfoca en el mapa.
    const nombres = el('g', { class: 'radar-ejes' }, svg);
    ejes.forEach((e, i) => {
      const a = ang(i);
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      const [x, y] = polar(R + 16, a);
      // Solo para el ratón (tabindex -1, el SVG va aria-hidden): con teclado y lector de pantalla se usa
      // la lista que acompaña al radar, con los mismos enlaces y los valores en texto.
      const enlace = el('a', { href: op.urlArea(e.area), class: 'radar-eje', tabindex: '-1' }, nombres);
      enlace.style.setProperty('--c', e.area.color);
      enlace.addEventListener('click', (ev) => {
        if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button !== 0) return;
        ev.preventDefault();
        op.irArea(e.area);
      });
      el('title', {}, enlace).textContent = e.etiqueta;
      const anclaje = Math.abs(cos) < 0.2 ? 'middle' : cos > 0 ? 'start' : 'end';
      const dy = sin < -0.8 ? -4 : sin > 0.8 ? 14 : 5;
      el('text', { x: x.toFixed(1), y: (y + dy).toFixed(1), 'text-anchor': anclaje }, enlace).textContent = e.area.nombreCorto || e.area.nombre;
    });

    ajustar(svg);
  }

  /** viewBox ajustado a lo dibujado (las etiquetas de los lados son las que marcan el ancho). */
  function ajustar(svg) {
    let caja;
    try { caja = svg.getBBox(); } catch { caja = null; }
    if (!caja || !caja.width) {
      svg.setAttribute('viewBox', `${-R - 110} ${-R - 30} ${2 * R + 220} ${2 * R + 60}`);
      return;
    }
    const m = 8;
    svg.setAttribute('viewBox', `${(caja.x - m).toFixed(1)} ${(caja.y - m).toFixed(1)} ${(caja.width + 2 * m).toFixed(1)} ${(caja.height + 2 * m).toFixed(1)}`);
  }

  window.SpiderRadar = { dibujar };
})();
