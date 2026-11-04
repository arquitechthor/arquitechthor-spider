/**
 * "Escuchar" una ficha en voz alta (window.SpiderLectura) con la Web Speech API del navegador
 * (speechSynthesis): gratis, sin librerías y sin peticiones propias. Las voces son las del sistema
 * o del navegador; las marcadas como no locales ("en línea", p. ej. las de Google en Chrome o las
 * "Natural" de Edge) envían el texto al servicio de quien las ofrece (ver aviso legal, privacidad).
 *
 * Qué se lee: el nombre y "En una frase" de la cabecera y, del texto (.doc), los títulos, párrafos,
 * elementos de lista, citas y filas de tabla, en orden. Se salta el código (<pre>), la evaluación,
 * "Qué contiene", "Relacionados", "Fuentes" y lo marcado con [data-sin-lectura].
 * Siglas: se pronuncia lo indicado en "leer" de data/glosario.json; si no hay, las de solo
 * mayúsculas se deletrean ("LLM" → "L L M") y el resto se lee tal cual.
 *
 * Se lee frase a frase (Chrome corta las locuciones largas) resaltando el bloque actual. Pausar
 * equivale a parar y recordar el bloque (pause/resume falla en varios navegadores): "Seguir" vuelve
 * a empezar ese bloque. Velocidad y voz se recuerdan en spider.lectura.
 */
(function () {
  const D = window.SpiderDatos;
  const voz = window.speechSynthesis;
  if (!voz || !window.SpeechSynthesisUtterance) return;

  const BLOQUES = 'h2, h3, h4, p, li, blockquote, dt, dd, tr, figcaption, .callout';
  const SALTAR = 'pre, .quiz, [data-seccion-contiene], [data-seccion-relacionados], [data-sin-lectura], [hidden], .lectura-barra';
  const SECCIONES_SIN_LECTURA = new Set(['evaluacion', 'fuentes', 'contiene', 'relacionados']);
  const VELOCIDADES = [0.8, 1, 1.25, 1.5, 1.75];

  // ── Voces ─────────────────────────────────────────────────────────────────────────────
  function vocesEs() {
    return voz.getVoices().filter((v) => /^es([-_]|$)/i.test(v.lang))
      .sort((a, b) => (b.localService - a.localService) || (/es[-_]ES/i.test(b.lang) - /es[-_]ES/i.test(a.lang)));
  }

  /** Espera a que el navegador cargue la lista de voces (en Chrome llega después, asíncrona). */
  function esperarVoces() {
    if (voz.getVoices().length) return Promise.resolve();
    return new Promise((ok) => {
      const fin = () => { voz.removeEventListener?.('voiceschanged', fin); ok(); };
      voz.addEventListener?.('voiceschanged', fin);
      setTimeout(fin, 1500);
    });
  }

  // ── Texto ─────────────────────────────────────────────────────────────────────────────
  function pronunciar(sigla, siglas) {
    const base = sigla.replace(/s$/, '');
    const def = siglas[sigla] || siglas[base];
    if (def && def.leer) return def.leer;
    return /^[A-ZÑ]{2,6}$/.test(base) ? base.split('').join(' ') : sigla;
  }

  /** Texto hablado de un bloque, sin sus bloques anidados (se leen aparte). */
  function textoDe(el, siglas) {
    if (el.tagName === 'TR') {
      return [...el.children].map((c) => textoDe(c, siglas)).filter(Boolean).join('. ');
    }
    const copia = el.cloneNode(true);
    copia.querySelectorAll(`${BLOQUES}, pre, .sigla-exp, [data-sin-lectura]`).forEach((x) => x.remove());
    copia.querySelectorAll('abbr.sigla').forEach((a) => {
      a.textContent = pronunciar(a.dataset.s || a.textContent, siglas);
    });
    return copia.textContent.replace(/\s+/g, ' ').trim();
  }

  /** Divide un texto en frases de longitud manejable (Chrome corta a los ~15 s). */
  function trozos(texto) {
    const frases = texto.match(/[^.!?;]+(?:[.!?;]+|$)/g) || [texto];
    const out = [];
    for (let f of frases.map((x) => x.trim()).filter(Boolean)) {
      while (f.length > 220) {
        let corte = f.lastIndexOf(', ', 220);
        if (corte < 80) corte = f.lastIndexOf(' ', 220);
        if (corte < 1) corte = 220;
        out.push(f.slice(0, corte + 1).trim());
        f = f.slice(corte + 1).trim();
      }
      if (f) out.push(f);
    }
    return out;
  }

  function recoger(cab, docs, siglas) {
    const bloques = [];
    const anadir = (el) => {
      const t = textoDe(el, siglas);
      if (t) bloques.push({ el, trozos: trozos(t) });
    };
    const titulo = cab.querySelector('.ficha-titulo');
    if (titulo) anadir(titulo);
    const frase = cab.querySelector('.ficha-frase');
    if (frase) anadir(frase);
    for (const doc of docs) {
      let saltando = false;
      for (const el of doc.querySelectorAll(BLOQUES)) {
        if (el.tagName === 'H2') saltando = SECCIONES_SIN_LECTURA.has(el.id);
        if (saltando || el.closest(SALTAR)) continue;
        if (el.tagName === 'TR' && el.closest('thead')) continue; // la cabecera de tabla, sin más contexto, confunde
        anadir(el);
      }
    }
    return bloques;
  }

  // ── Interfaz ──────────────────────────────────────────────────────────────────────────
  /**
   * Añade "Escuchar" a `acciones` (la fila de botones de la ficha). `cab` es la cabecera, `docs`
   * los .doc de la página y `siglas` el objeto siglas de data/glosario.json (puede ir vacío).
   */
  function montar(acciones, { cab, docs, siglas = {} }) {
    const pref = D.leer('lectura', {});
    let velocidad = VELOCIDADES.includes(pref.velocidad) ? pref.velocidad : 1;
    let bloques = null;
    let indice = 0;
    let trozo = 0;
    let estado = 'parado'; // parado | leyendo | pausado
    let turno = 0; // invalida los eventos de locuciones canceladas
    let barra = null;

    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'btn btn-secondary btn-sm';
    boton.innerHTML = '<span aria-hidden="true">🔊</span> Escuchar';
    acciones.appendChild(boton);

    const guardarPref = (cambios) => D.guardar('lectura', { ...D.leer('lectura', {}), ...cambios });

    function vozElegida() {
      const lista = vocesEs();
      const nombre = barra?.querySelector('[data-voz]')?.value || pref.voz;
      return lista.find((v) => v.voiceURI === nombre) || lista[0] || null;
    }

    function resaltar() {
      document.querySelectorAll('.leyendo').forEach((x) => x.classList.remove('leyendo'));
      const b = bloques?.[indice];
      if (!b || estado === 'parado') return;
      b.el.classList.add('leyendo');
      const r = b.el.getBoundingClientRect();
      const alto = window.innerHeight - (barra?.offsetHeight || 0);
      if (r.top < 70 || r.bottom > alto) {
        const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        b.el.scrollIntoView({ block: 'center', behavior: suave ? 'smooth' : 'auto' });
      }
    }

    function hablar() {
      const mio = ++turno;
      const b = bloques[indice];
      if (!b) return parar();
      const u = new SpeechSynthesisUtterance(b.trozos[trozo]);
      const v = vozElegida();
      if (v) u.voice = v;
      u.lang = v ? v.lang : 'es-ES';
      u.rate = velocidad;
      u.onend = () => {
        if (mio !== turno || estado !== 'leyendo') return;
        if (++trozo >= b.trozos.length) { trozo = 0; indice++; resaltar(); pintar(); }
        if (indice >= bloques.length) parar(); else hablar();
      };
      u.onerror = (e) => {
        if (mio !== turno || e.error === 'interrupted' || e.error === 'canceled') return;
        console.error('Lectura:', e.error);
        parar();
      };
      voz.speak(u);
    }

    function pintar() {
      if (!barra) return;
      const pausa = barra.querySelector('[data-pausa]');
      pausa.innerHTML = estado === 'leyendo'
        ? '<span aria-hidden="true">⏸</span> Pausar'
        : '<span aria-hidden="true">▶</span> Seguir';
      barra.querySelector('[data-pos]').textContent = `${Math.min(indice + 1, bloques.length)} / ${bloques.length}`;
      barra.querySelector('[data-ant]').disabled = indice <= 0;
      barra.querySelector('[data-sig]').disabled = indice >= bloques.length - 1;
    }

    function ir(nuevo) {
      indice = Math.max(0, Math.min(nuevo, bloques.length - 1));
      trozo = 0;
      voz.cancel();
      if (estado === 'pausado') estado = 'leyendo';
      resaltar();
      pintar();
      hablar();
    }

    function pausar() {
      turno++;
      voz.cancel();
      estado = 'pausado';
      trozo = 0;
      pintar();
    }

    function parar() {
      turno++;
      voz.cancel();
      estado = 'parado';
      resaltar();
      if (barra) { barra.remove(); barra = null; }
      document.body.classList.remove('con-lectura');
      boton.hidden = false;
      boton.focus({ preventScroll: true });
    }

    function crearBarra() {
      const voces = vocesEs();
      barra = document.createElement('div');
      barra.className = 'lectura-barra';
      barra.setAttribute('role', 'region');
      barra.setAttribute('aria-label', 'Lectura en voz alta');
      barra.innerHTML = `
        <div class="lectura-botones">
          <button type="button" class="btn btn-secondary btn-sm" data-ant aria-label="Bloque anterior">⏮</button>
          <button type="button" class="btn btn-primary btn-sm" data-pausa></button>
          <button type="button" class="btn btn-secondary btn-sm" data-sig aria-label="Bloque siguiente">⏭</button>
          <button type="button" class="btn btn-secondary btn-sm" data-parar><span aria-hidden="true">■</span> Parar</button>
          <span class="lectura-pos text-faint" data-pos aria-live="off"></span>
        </div>
        <div class="lectura-ajustes">
          <label>Velocidad <select data-vel>${VELOCIDADES.map((x) =>
            `<option value="${x}"${x === velocidad ? ' selected' : ''}>${String(x).replace('.', ',')}×</option>`).join('')}</select></label>
          ${voces.length > 1 ? `<label>Voz <select data-voz>${voces.map((v) =>
            `<option value="${D.esc(v.voiceURI)}"${v === vozElegida() ? ' selected' : ''}>${D.esc(v.name)}${v.localService ? '' : ' (en línea)'}</option>`).join('')}</select></label>` : ''}
        </div>`;
      document.body.appendChild(barra);
      document.body.classList.add('con-lectura');
      barra.querySelector('[data-pausa]').addEventListener('click', () => (estado === 'leyendo' ? pausar() : ir(indice)));
      barra.querySelector('[data-ant]').addEventListener('click', () => ir(indice - 1));
      barra.querySelector('[data-sig]').addEventListener('click', () => ir(indice + 1));
      barra.querySelector('[data-parar]').addEventListener('click', parar);
      barra.querySelector('[data-vel]').addEventListener('change', (e) => {
        velocidad = Number(e.target.value);
        guardarPref({ velocidad });
        if (estado === 'leyendo') ir(indice);
      });
      barra.querySelector('[data-voz]')?.addEventListener('change', (e) => {
        guardarPref({ voz: e.target.value });
        if (estado === 'leyendo') ir(indice);
      });
    }

    boton.addEventListener('click', async () => {
      await esperarVoces();
      if (!vocesEs().length) {
        boton.disabled = true;
        boton.textContent = 'Sin voz en español en este navegador';
        return;
      }
      bloques = recoger(cab, docs, siglas);
      if (!bloques.length) return;
      boton.hidden = true;
      estado = 'leyendo';
      crearBarra();
      ir(0);
      barra?.querySelector('[data-pausa]').focus({ preventScroll: true });
    });

    // Chrome sigue hablando tras salir de la página si no se cancela.
    window.addEventListener('pagehide', () => voz.cancel());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && barra && !e.target.closest('select')) parar();
    });
  }

  window.SpiderLectura = { montar };
})();
