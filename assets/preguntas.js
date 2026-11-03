/**
 * Componente común de preguntas (window.SpiderPreguntas), copiado de aws-cert-study
 * (assets/preguntas.js, window.AwsPreguntas) y adaptado: progreso en spider.progreso por tema,
 * "nivel" 1–3 (el 3 lleva la etiqueta ⚠ como "dificil") y "codigo" (bloque monoespaciado bajo el
 * enunciado). Lo usa quiz.js (evaluación de una ficha o de una rama). Pinta, lee, corrige y registra en el progreso local los cuatro tipos:
 *   - "unica":     radios; "correctas" = [índice].
 *   - "multiple":  checkboxes; hay que marcar exactamente todas las de "correctas".
 *   - "ordenar":   "opciones" son pasos en cualquier orden; "correctas" = índices en el orden
 *                  correcto. Se ordenan con los botones ↑ ↓ (accesibles con teclado).
 *   - "emparejar": cada elemento de "opciones" se empareja con uno de "destinos" (puede haber
 *                  destinos de sobra); "correctas"[i] = índice del destino de "opciones"[i].
 * Campos opcionales: "nivel" (1 básico, 2 intermedio, 3 avanzado), "dificil": true (alias de
 * nivel 3), "codigo", "dominio", "certificaciones" y "fuentes". Formato completo en docs/PLAN.md 4.3.
 */
(function () {
  const { esc, leerProgreso, guardarProgreso } = window.SpiderDatos;
  const LETRAS = 'ABCDEFGH';

  function hoy() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /** Dominio de la pregunta en una certificación concreta. */
  function dominioPara(p, cert) {
    return (cert && p.dominios && p.dominios[cert]) || p.dominio || '';
  }

  /** Tema al que pertenece una pregunta: los id son "<tema>-NNN". */
  function temaDe(idPregunta) {
    return idPregunta.replace(/-\d+$/, '');
  }

  function mezclar(lista) {
    const a = [...lista];
    for (let i = a.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pista(p) {
    if (p.tipo === 'multiple') return `Elige ${p.correctas.length} respuestas.`;
    if (p.tipo === 'ordenar') return 'Ordena los pasos con los botones ↑ y ↓.';
    if (p.tipo === 'emparejar') return 'Elige la pareja de cada elemento.';
    return '';
  }

  const ETIQUETA_DIFICIL = '<span class="chip chip-dificil"><span aria-hidden="true">⚠</span> Pregunta difícil</span>';

  function esDificil(p) {
    return p.dificil || p.nivel === 3;
  }

  /** Chips de certificaciones, dominio y dificultad. `cert` elige el dominio a mostrar. */
  function etiquetas(p, { cert = '', certificaciones = true } = {}) {
    return [
      esDificil(p) ? ETIQUETA_DIFICIL : '',
      ...(certificaciones ? (p.certificaciones || []).map((c) => `<span class="chip chip-cert">${esc(c)}</span>`) : []),
      dominioPara(p, cert) ? `<span class="chip">${esc(dominioPara(p, cert))}</span>` : '',
    ].join('');
  }

  function enunciado(p, t) {
    const h = pista(p);
    const codigo = p.codigo ? `<pre class="quiz-codigo"><code>${esc(p.codigo)}</code></pre>` : '';
    return `<p class="quiz-stem">${t(p.enunciado)}</p>${codigo}${h ? `<p class="quiz-hint">${h}</p>` : ''}`;
  }

  /** Zona de respuesta. `nombre` agrupa los inputs y debe ser único en la página. */
  function respuestas(p, nombre, t) {
    if (p.tipo === 'ordenar') {
      let orden = mezclar(p.opciones.map((_, i) => i));
      if (p.opciones.length > 1) {
        while (orden.every((v, k) => v === p.correctas[k])) orden = mezclar(orden);
      }
      return `<ol class="quiz-orden">${orden.map((i, k) => itemOrden(p, i, k, t)).join('')}</ol>`;
    }
    if (p.tipo === 'emparejar') {
      // Las descripciones van en una lista con letras (se leen enteras y con tooltips de siglas);
      // cada desplegable solo elige la letra, para que no se corten en pantallas estrechas.
      const opts = p.destinos.map((d, j) => `<option value="${j}">${LETRAS[j]}</option>`).join('');
      return `<ol class="quiz-destinos">${p.destinos.map((d, j) =>
        `<li><strong>${LETRAS[j]}.</strong> ${t(d)}</li>`).join('')}</ol>
        <div class="quiz-pares">${p.opciones.map((o, i) => `
        <label class="quiz-par" data-i="${i}">
          <span class="quiz-par-texto">${t(o)}</span>
          <select class="select" name="${esc(nombre)}-${i}"><option value="">Elige…</option>${opts}</select>
        </label>`).join('')}</div>`;
    }
    const tipo = p.tipo === 'multiple' ? 'checkbox' : 'radio';
    return `<div class="quiz-options">${p.opciones.map((o, j) => `
      <label class="quiz-option">
        <input type="${tipo}" name="${esc(nombre)}" value="${j}">
        <span><strong>${LETRAS[j]}.</strong> ${t(o)}</span>
      </label>`).join('')}</div>`;
  }

  function itemOrden(p, i, k, t) {
    const corto = esc(p.opciones[i].slice(0, 40));
    return `
      <li class="quiz-orden-item" data-i="${i}">
        <span class="quiz-orden-pos">${k + 1}</span>
        <span class="quiz-orden-texto">${t(p.opciones[i])}</span>
        <span class="quiz-orden-btns">
          <button class="btn btn-secondary btn-sm" type="button" data-mover="-1" aria-label="Subir: ${corto}">↑</button>
          <button class="btn btn-secondary btn-sm" type="button" data-mover="1" aria-label="Bajar: ${corto}">↓</button>
        </span>
      </li>`;
  }

  function renumerar(ol) {
    [...ol.children].forEach((li, k) => { li.querySelector('.quiz-orden-pos').textContent = k + 1; });
  }

  /** Activa los botones ↑ ↓ de las preguntas de ordenar dentro de `raiz` (una vez por raíz). */
  function activar(raiz, alCambiar) {
    raiz.addEventListener('click', (ev) => {
      const btn = ev.target.closest('button[data-mover]');
      if (!btn || btn.disabled) return;
      const li = btn.closest('.quiz-orden-item');
      const ol = li.parentElement;
      const destino = btn.dataset.mover === '-1' ? li.previousElementSibling : li.nextElementSibling;
      if (!destino) return;
      if (btn.dataset.mover === '-1') ol.insertBefore(li, destino); else ol.insertBefore(destino, li);
      ol.dataset.tocada = '1';
      renumerar(ol);
      btn.focus();
      if (alCambiar) alCambiar(ol);
    });
    raiz.addEventListener('change', (ev) => {
      if (alCambiar && ev.target.matches('input, select')) alCambiar(ev.target);
    });
  }

  /** Respuesta actual, o null si está incompleta (o una de ordenar sin tocar). */
  function leer(raiz, p) {
    if (p.tipo === 'ordenar') {
      const ol = raiz.querySelector('.quiz-orden');
      if (!ol.dataset.tocada) return null;
      return [...ol.children].map((li) => Number(li.dataset.i));
    }
    if (p.tipo === 'emparejar') {
      const v = [...raiz.querySelectorAll('.quiz-par select')].map((s) => s.value);
      return v.every((x) => x !== '') ? v.map(Number) : null;
    }
    const m = [...raiz.querySelectorAll('.quiz-options input')].filter((x) => x.checked).map((x) => Number(x.value));
    return m.length ? m : null;
  }

  /** Vuelve a poner en pantalla una respuesta guardada (el simulacro repinta al navegar). */
  function escribir(raiz, p, resp) {
    if (!resp) return;
    if (p.tipo === 'ordenar') {
      const ol = raiz.querySelector('.quiz-orden');
      const items = new Map([...ol.children].map((li) => [Number(li.dataset.i), li]));
      resp.forEach((i) => ol.appendChild(items.get(i)));
      ol.dataset.tocada = '1';
      renumerar(ol);
    } else if (p.tipo === 'emparejar') {
      raiz.querySelectorAll('.quiz-par select').forEach((s, i) => { s.value = String(resp[i]); });
    } else {
      raiz.querySelectorAll('.quiz-options input').forEach((x) => { x.checked = resp.includes(Number(x.value)); });
    }
  }

  function evaluar(p, resp) {
    if (!resp) return false;
    if (p.tipo === 'unica' || p.tipo === 'multiple') {
      const c = new Set(p.correctas);
      return resp.length === c.size && resp.every((m) => c.has(m));
    }
    return resp.length === p.correctas.length && resp.every((v, k) => v === p.correctas[k]);
  }

  /** Bloquea la pregunta y marca en verde/rojo cada opción, paso o pareja. */
  function marcar(raiz, p) {
    if (p.tipo === 'ordenar') {
      [...raiz.querySelector('.quiz-orden').children].forEach((li, k) => {
        li.classList.add(Number(li.dataset.i) === p.correctas[k] ? 'is-correct' : 'is-wrong');
      });
      raiz.querySelectorAll('[data-mover]').forEach((b) => { b.disabled = true; });
      return;
    }
    if (p.tipo === 'emparejar') {
      raiz.querySelectorAll('.quiz-par').forEach((par) => {
        const s = par.querySelector('select');
        par.classList.add(Number(s.value) === p.correctas[Number(par.dataset.i)] && s.value !== '' ? 'is-correct' : 'is-wrong');
        s.disabled = true;
      });
      return;
    }
    const c = new Set(p.correctas);
    raiz.querySelectorAll('.quiz-options input').forEach((x) => {
      x.disabled = true;
      const j = Number(x.value);
      if (c.has(j)) x.closest('.quiz-option').classList.add('is-correct');
      else if (x.checked) x.closest('.quiz-option').classList.add('is-wrong');
    });
  }

  /** Deja la pregunta como recién pintada (botón "Reintentar"). */
  function limpiar(raiz, p, t) {
    if (p.tipo === 'ordenar') {
      raiz.querySelector('.quiz-orden').outerHTML = respuestas(p, '', t);
      return;
    }
    raiz.querySelectorAll('input, select, [data-mover]').forEach((x) => {
      x.disabled = false;
      if (x.type === 'radio' || x.type === 'checkbox') x.checked = false;
      if (x.tagName === 'SELECT') x.value = '';
    });
    raiz.querySelectorAll('.is-correct, .is-wrong').forEach((o) => o.classList.remove('is-correct', 'is-wrong'));
  }

  /** "Respuesta correcta: …" según el tipo, en HTML. */
  function solucion(p, t) {
    if (p.tipo === 'ordenar') {
      return `Orden correcto:<ol class="quiz-solucion">${p.correctas.map((i) => `<li>${t(p.opciones[i])}</li>`).join('')}</ol>`;
    }
    if (p.tipo === 'emparejar') {
      return `Parejas correctas:<ul class="quiz-solucion">${p.opciones.map((o, i) =>
        `<li>${t(o)} → <strong>${LETRAS[p.correctas[i]]}.</strong> ${t(p.destinos[p.correctas[i]])}</li>`).join('')}</ul>`;
    }
    return `Respuesta correcta: ${p.correctas.map((j) => LETRAS[j]).join(', ')}`;
  }

  function fuentes(p) {
    const li = (p.fuentes || []).map((u) =>
      `<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(u.replace(/^https?:\/\//, ''))}</a></li>`).join('');
    return li ? `<p class="text-faint">Fuentes:</p><ul>${li}</ul>` : '';
  }

  /** Corrección completa (resultado, solución, explicación y fuentes) en HTML. */
  function correccion(p, acierto, t) {
    return `
      <p class="${acierto ? 'ok' : 'ko'}">${acierto ? '✔ Correcto' : '✘ Incorrecto.'}</p>
      ${acierto && (p.tipo === 'unica' || p.tipo === 'multiple') ? '' : `<div class="quiz-solucion-zona">${solucion(p, t)}</div>`}
      <p>${t(p.explicacion)}</p>
      ${fuentes(p)}`;
  }

  // ── Progreso local ─────────────────────────────────────────────────────────────────────
  // { "<tema>": { aciertos: [idPregunta], fallos: [idPregunta], total, finalizado } }.
  // "fallos" son las preguntas cuyo último intento fue incorrecto (salen del repaso al acertarlas).

  /** Progreso de un tema contrastado con sus preguntas actuales (ids). */
  function progresoDe(idTema, ids, todo = leerProgreso()) {
    const g = todo[idTema] || {};
    const validos = new Set(ids);
    const aciertos = [...new Set(g.aciertos || [])].filter((id) => validos.has(id));
    const fallos = [...new Set(g.fallos || [])].filter((id) => validos.has(id));
    const completo = ids.length > 0 && aciertos.length === ids.length;
    return { aciertos, fallos, total: ids.length, finalizado: completo ? (g.finalizado || hoy()) : null };
  }

  function guardar(idTema, prog) {
    const vacio = !prog.aciertos.length && !prog.fallos.length;
    const entrada = { aciertos: prog.aciertos, total: prog.total, finalizado: prog.finalizado };
    if (prog.fallos.length) entrada.fallos = prog.fallos;
    guardarProgreso(idTema, vacio ? null : entrada);
  }

  /** Apunta un intento. `ids` son todas las preguntas del tema. Devuelve el progreso nuevo. */
  function registrar(idTema, ids, idPregunta, acierto) {
    const prog = progresoDe(idTema, ids);
    if (acierto) {
      if (!prog.aciertos.includes(idPregunta)) prog.aciertos.push(idPregunta);
      prog.fallos = prog.fallos.filter((id) => id !== idPregunta);
      if (prog.aciertos.length === prog.total && !prog.finalizado) prog.finalizado = hoy();
    } else if (!prog.fallos.includes(idPregunta)) {
      prog.fallos.push(idPregunta);
    }
    guardar(idTema, prog);
    return prog;
  }

  window.SpiderPreguntas = {
    LETRAS, ETIQUETA_DIFICIL, hoy, dominioPara, temaDe, mezclar, esDificil, etiquetas, enunciado, respuestas, activar, leer,
    escribir, evaluar, marcar, limpiar, solucion, correccion, progresoDe, guardar, registrar,
  };
})();
