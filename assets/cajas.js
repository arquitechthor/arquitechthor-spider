/**
 * Vista "Cajas" (window.SpiderCajas), la alternativa a la Telaraña (docs/PLAN.md 5.1-B): el nodo
 * enfocado como cabecera, sus hijos como cajas y los nietos como chips dentro de cada caja. El
 * ancho de cada caja crece con el número de temas de su rama (flex-grow), como un treemap sencillo.
 *
 * Igual que telarana.js, solo dibuja: qué pasa al pulsar lo decide assets/mapa.js con
 * op.destinoDe() y op.navegar(), y el color, los filtros y la búsqueda los aplica mapa.js después
 * (decorar() actúa sobre los elementos con data-decora y su <a data-id>). Todo es HTML normal:
 * se lee de arriba abajo, con Tab, y es la vista cómoda para lectores de pantalla. Al entrar o subir
 * hay un fundido CSS (.cajas-entra), no la View Transitions API: su callback es asíncrono y
 * dejaba el DOM sin actualizar en Chrome sin interfaz.
 */
(function () {
  const TIPO = { raiz: 'Mapa completo', area: 'Área', bloque: 'Bloque', tema: 'Tema' };

  function nombre(n) {
    return n.nombreEs || n.nombre;
  }

  /**
   * Peso de la caja (flex-grow): crece con los temas de la rama, con tope, para que una rama grande
   * ocupe más sin dejar a las pequeñas en una tira. Cada fila se llena entera.
   */
  function peso(datos, it) {
    if (it.acceso) return 1;
    const temas = window.SpiderDatos.temasDe(datos, it.nodo.id).length;
    return (1 + Math.min(temas, 24) / 4).toFixed(2);
  }

  function dibujar(cont, datos, op) {
    const D = window.SpiderDatos;
    const foco = datos.porId.get(op.foco);
    const esRaiz = foco.tipo === 'raiz';
    cont.replaceChildren();

    // Cabecera: el nodo enfocado (equivale al centro de la telaraña) y el botón para subir.
    const cab = document.createElement('div');
    cab.className = 'cajas-cab';
    if (!esRaiz) {
      const padre = datos.porId.get(foco.padre);
      cab.appendChild(enlace(op.destinoDe(foco, { centro: true }), op, 'cajas-subir', null,
        `▲ Subir a ${nombre(padre)}`));
    }
    const titulo = document.createElement('h3');
    titulo.className = 'cajas-titulo';
    titulo.innerHTML = D.iconoArea(esRaiz ? null : datos.porId.get(foco.tipo === 'area' ? foco.id : foco.area))
      + `<span>${D.nombreHtml(foco)}</span>`;
    cab.appendChild(titulo);
    cont.appendChild(cab);

    const items = datos.hijos.get(op.foco) || [];
    const rejilla = document.createElement('div');
    rejilla.className = op.animar ? 'cajas-rejilla cajas-entra' : 'cajas-rejilla';
    rejilla.setAttribute('role', 'list');
    cont.appendChild(rejilla);

    for (const it of items) {
      const n = it.nodo;
      const nietos = it.acceso ? [] : (datos.hijos.get(n.id) || []);
      const caja = document.createElement('section');
      caja.className = `caja${it.acceso ? ' acceso' : ''}${op.sel === n.id ? ' es-sel' : ''}`;
      caja.setAttribute('role', 'listitem');
      caja.dataset.decora = n.id;
      caja.style.setProperty('--c', colorDe(datos, n));
      caja.style.setProperty('--peso', peso(datos, it));

      const conHijos = (datos.hijos.get(n.id) || []).length > 0;
      const destino = op.destinoDe(n, { acceso: it.acceso });
      const marca = (it.acceso ? ' ↗' : '') + (n.externo ? ' ☁' : '');
      let etiqueta = `${nombre(n)}. ${TIPO[n.tipo]}`;
      if (it.acceso) etiqueta += `, vive en ${nombre(datos.porId.get(n.padre))}`;
      if (n.externo) etiqueta += ', guía en Apuntes AWS';
      etiqueta += conHijos && !it.acceso ? `. Contiene ${datos.hijos.get(n.id).length}: pulsa para entrar` : '. Pulsa para ver el detalle';

      // Cabecera como la de las antiguas tarjetas de áreas: icono (solo en las áreas; más abajo
      // todas las cajas son de la misma área y ya lo lleva la cabecera) y el nombre original debajo.
      const cabCaja = document.createElement('div');
      cabCaja.className = 'caja-cab';
      if (n.tipo === 'area') cabCaja.insertAdjacentHTML('beforeend', D.iconoArea(n));
      const h = document.createElement('h4');
      h.className = 'caja-titulo';
      const a = enlace(destino, op, 'caja-enlace', n.id, '', etiqueta);
      a.innerHTML = D.nombreHtml(n).replace(/^([^<]*)/, `$1${D.esc(marca)}`);
      h.appendChild(a);
      cabCaja.appendChild(h);
      caja.appendChild(cabCaja);

      if (n.frase) {
        const p = document.createElement('p');
        p.className = 'caja-frase';
        p.textContent = n.frase;
        caja.appendChild(p);
      }

      if (nietos.length) {
        const chips = document.createElement('ul');
        chips.className = 'caja-chips';
        for (const nt of nietos) {
          const li = document.createElement('li');
          const m = nt.nodo;
          const conNietos = (datos.hijos.get(m.id) || []).length > 0 && !nt.acceso;
          let et = `${nombre(m)}. ${TIPO[m.tipo]}`;
          if (nt.acceso) et += `, vive en ${nombre(datos.porId.get(m.padre))}`;
          if (m.externo) et += ', guía en Apuntes AWS';
          et += conNietos ? `. Contiene ${datos.hijos.get(m.id).length}: pulsa para entrar` : '. Pulsa para ver el detalle';
          const texto = nombre(m) + (nt.acceso ? ' ↗' : '') + (m.externo ? ' ☁' : '');
          const a = enlace(op.destinoDe(m, { acceso: nt.acceso }), op,
            `caja-chip${nt.acceso ? ' acceso' : ''}${op.sel === m.id ? ' es-sel' : ''}`, m.id, texto, et);
          a.dataset.decora = m.id;
          a.style.setProperty('--c', colorDe(datos, m));
          li.appendChild(a);
          chips.appendChild(li);
        }
        caja.appendChild(chips);
      }
      rejilla.appendChild(caja);
    }

    if (!items.length) {
      const p = document.createElement('p');
      p.className = 'text-faint';
      p.textContent = 'Este nodo no contiene nada más.';
      cont.appendChild(p);
    }

    if (op.enfocar) {
      const objetivo = cont.querySelector(`a[data-id="${CSS.escape(op.enfocar)}"]`) || cont.querySelector('a');
      if (objetivo) objetivo.focus({ preventScroll: true });
    }
  }

  function colorDe(datos, n) {
    const area = n.tipo === 'area' ? n : datos.porId.get(n.area);
    return area ? area.color : '#22d3ee';
  }

  function enlace(destino, op, clase, id, texto, etiqueta) {
    const a = document.createElement('a');
    a.href = op.urlDe(destino);
    a.className = clase;
    a.textContent = texto;
    if (id) {
      a.dataset.id = id;
      a.dataset.etiqueta = etiqueta;
      a.setAttribute('aria-label', etiqueta);
    }
    a.addEventListener('click', (ev) => {
      if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button !== 0) return;
      ev.preventDefault();
      op.navegar(destino);
    });
    return a;
  }

  window.SpiderCajas = { dibujar };
})();
