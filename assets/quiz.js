/**
 * Evaluación (basado en assets/quiz.js de aws-cert-study). Dos usos:
 *   <div class="quiz" data-quiz="<id>">  las preguntas de un tema (data/preguntas/<id>.json), al
 *                                        final de su ficha.
 *   <div class="quiz" data-rama="<id>">  "Evaluar esta rama": las de todos los temas publicados y
 *                                        evaluables de la rama (el propio nodo incluido si es tema),
 *                                        agrupadas por tema (evaluacion.html?id=<id>).
 * Cada intento cuenta en el progreso de SU tema (spider.progreso, ver assets/preguntas.js): da
 * igual dónde se responda. Un tema queda "finalizado" cuando se han acertado todas sus preguntas.
 * Las siglas de las preguntas se marcan al pintar (assets/siglas.js); las preguntas no llevan enlaces.
 */
(function () {
  const D = window.SpiderDatos;
  const P = window.SpiderPreguntas;
  const { esc } = D;

  let glosario = null;
  function t(texto) {
    const e = esc(texto);
    return glosario && window.SpiderSiglas ? window.SpiderSiglas.marcar(e, glosario) : e;
  }

  /** Cabecera con el progreso de uno o varios temas: [{ id, nombre, ids }]. */
  function cabecera(grupos) {
    const progs = grupos.map((g) => P.progresoDe(g.id, g.ids));
    const total = progs.reduce((s, p) => s + p.total, 0);
    const aciertos = progs.reduce((s, p) => s + p.aciertos.length, 0);
    const fallos = progs.reduce((s, p) => s + p.fallos.length, 0);
    const pct = total ? Math.round((aciertos / total) * 100) : 0;
    const uno = grupos.length === 1;
    const finalizados = progs.filter((p) => p.finalizado).length;
    let texto;
    if (uno && progs[0].finalizado) {
      texto = `✔ Tema finalizado el ${esc(D.formatoFecha(progs[0].finalizado))}: has acertado las ${total} preguntas.`;
    } else if (!uno && finalizados === grupos.length) {
      texto = `✔ Rama completa: has acertado las ${total} preguntas de sus ${grupos.length} temas.`;
    } else {
      texto = `Acertadas ${aciertos} de ${total}.${uno ? ' Acierta todas para marcar el tema como finalizado.' : ` Temas finalizados: ${finalizados} de ${grupos.length}.`}`;
    }
    if (fallos) texto += ` ${fallos} ${fallos === 1 ? 'fallada pendiente' : 'falladas pendientes'} de repaso.`;
    const completo = uno ? Boolean(progs[0].finalizado) : finalizados === grupos.length;
    return `
      <p class="quiz-progreso-texto${completo ? ' ok' : ''}">${texto}</p>
      <div class="quiz-barra" role="progressbar" aria-label="Preguntas acertadas" aria-valuemin="0"
        aria-valuemax="${total}" aria-valuenow="${aciertos}"><span style="width:${pct}%"></span></div>
      ${aciertos || fallos ? `<div class="quiz-acciones"><button class="btn btn-secondary btn-sm" type="button" data-accion="reiniciar-progreso">Reiniciar progreso${uno ? '' : ' de la rama'}</button></div>` : ''}`;
  }

  function pregunta(p, num, acertada) {
    return `
      <fieldset class="quiz-question${acertada ? ' is-acertada' : ''}${P.esDificil(p) ? ' is-dificil' : ''}" data-id="${esc(p.id)}">
        <legend>
          <span class="quiz-num">Pregunta ${num}</span>
          ${P.enunciado(p, t)}
        </legend>
        <div class="quiz-tags">${P.etiquetas(p)}<span class="chip chip-ok">✔ Ya acertada</span></div>
        ${P.respuestas(p, `q-${p.id}`, t)}
        <button class="btn btn-secondary btn-sm" type="button" data-accion="comprobar">Comprobar</button>
        <div class="quiz-feedback" hidden></div>
      </fieldset>`;
  }

  /** Temas que entran en la evaluación de una rama: publicados y evaluables, en orden del árbol. */
  function temasDeRama(datos, id) {
    const ids = new Set(D.temasDe(datos, id).map((n) => n.id));
    return datos.nodos.filter((n) => ids.has(n.id) && n.estado === 'publicado' && n.evaluable && !n.externo);
  }

  async function iniciar(cont) {
    try {
      const datos = await D.cargar();
      if (window.SpiderSiglas) glosario = await window.SpiderSiglas.cargar().catch(() => null);
      const temas = cont.dataset.rama
        ? temasDeRama(datos, cont.dataset.rama)
        : [datos.porId.get(cont.dataset.quiz)].filter(Boolean);
      const grupos = (await Promise.all(temas.map(async (n) => {
        try {
          const preguntas = await D.json(`data/preguntas/${encodeURIComponent(n.id)}.json`);
          return { id: n.id, nombre: D.nombreTexto(n), preguntas, ids: preguntas.map((p) => p.id) };
        } catch {
          return null;
        }
      }))).filter((g) => g && g.preguntas.length);
      if (!grupos.length) throw new Error('sin preguntas');

      const porId = new Map(grupos.flatMap((g) => g.preguntas.map((p) => [p.id, { p, g }])));
      const enRama = Boolean(cont.dataset.rama);
      let num = 0;
      const cuerpo = grupos.map((g) => {
        const acertadas = new Set(P.progresoDe(g.id, g.ids).aciertos);
        const titulo = enRama
          ? `<h3 class="quiz-grupo"><a href="${esc(D.urlFicha(datos.porId.get(g.id)))}">${esc(g.nombre)}</a> <span class="text-faint">(${g.preguntas.length})</span></h3>`
          : '';
        return titulo + g.preguntas.map((p) => { num += 1; return pregunta(p, num, acertadas.has(p.id)); }).join('');
      }).join('');
      cont.innerHTML = `<div class="quiz-progreso" aria-live="polite">${cabecera(grupos)}</div>${cuerpo}`;
      const zonaProgreso = cont.querySelector('.quiz-progreso');
      P.activar(cont);

      cont.addEventListener('click', (ev) => {
        const btn = ev.target.closest('button[data-accion]');
        if (!btn) return;
        if (btn.dataset.accion === 'reiniciar-progreso') {
          for (const g of grupos) P.guardar(g.id, { aciertos: [], fallos: [], total: g.ids.length, finalizado: null });
          cont.querySelectorAll('.quiz-question.is-acertada').forEach((fs) => fs.classList.remove('is-acertada'));
          zonaProgreso.innerHTML = cabecera(grupos);
          return;
        }
        const fs = btn.closest('.quiz-question');
        const { p, g } = porId.get(fs.dataset.id);
        const fb = fs.querySelector('.quiz-feedback');
        if (btn.dataset.accion === 'reintentar') {
          P.limpiar(fs, p, t);
          fb.hidden = true;
          fb.innerHTML = '';
          btn.dataset.accion = 'comprobar';
          btn.textContent = 'Comprobar';
          return;
        }
        const resp = P.leer(fs, p);
        if (!resp) {
          fb.innerHTML = `<p class="text-faint">${p.tipo === 'ordenar' ? 'Mueve al menos un paso antes de comprobar.' : 'Completa la respuesta antes de comprobar.'}</p>`;
          fb.hidden = false;
          return;
        }
        const acierto = P.evaluar(p, resp);
        P.marcar(fs, p);
        fb.innerHTML = P.correccion(p, acierto, t);
        fb.hidden = false;
        btn.dataset.accion = 'reintentar';
        btn.textContent = 'Reintentar';
        const prog = P.registrar(g.id, g.ids, p.id, acierto);
        fs.classList.toggle('is-acertada', prog.aciertos.includes(p.id));
        zonaProgreso.innerHTML = cabecera(grupos);
      });
    } catch (err) {
      console.error(err);
      cont.innerHTML = '<p class="text-faint">La evaluación todavía no está disponible.</p>';
    }
  }

  document.querySelectorAll('.quiz[data-quiz], .quiz[data-rama]').forEach(iniciar);
})();
