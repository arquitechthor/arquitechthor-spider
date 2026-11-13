/**
 * Resúmenes en audio servidos desde Kopi (copiado de aws-cert-study/assets/audio-kopi.js; los dos
 * deben seguir iguales salvo este comentario). Los audios no van en el repo: son recursos públicos de
 * un tema de Conocimiento de Kopi y se leen de su API pública (CORS ya permite este origen):
 *   GET https://api.kopitools.link/public/knowledge/resources/{id} → { fileUrl, ... }
 * fileUrl es un enlace de S3 que caduca en una hora, así que se pide al pulsar "Escuchar", nunca al
 * cargar la página. Si caduca mientras está en pausa, se pide otro y se sigue por donde iba.
 *
 * Marcado (en la ficha, antes de "Qué es"; el nodo lleva "audio": true en data/nodos.json):
 *   <figure class="audio-recurso" data-kopi="<id del recurso>"> … <button data-kopi-cargar> … </figure>
 */
(function () {
  const API = 'https://api.kopitools.link/public/knowledge/resources/';

  async function urlDe(id) {
    const res = await fetch(API + encodeURIComponent(id), { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const r = await res.json();
    if (!r.fileUrl) throw new Error('sin fileUrl');
    return r.fileUrl;
  }

  function montar(fig) {
    const id = fig.dataset.kopi;
    const btn = fig.querySelector('[data-kopi-cargar]');
    const aviso = fig.querySelector('.audio-aviso');
    if (!id || !btn) return;
    const audio = document.createElement('audio');
    audio.controls = true;
    audio.preload = 'none';
    audio.hidden = true;
    fig.appendChild(audio);

    let renovando = false;
    audio.addEventListener('error', async () => {
      // Enlace caducado (o cortado): uno nuevo y se sigue en el mismo punto.
      if (renovando || !audio.src) return;
      renovando = true;
      const t = audio.currentTime;
      try {
        audio.src = await urlDe(id);
        audio.currentTime = t;
      } catch {
        aviso.textContent = 'El audio no está disponible ahora mismo. Prueba más tarde.';
      } finally {
        renovando = false;
      }
    });

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.textContent = 'Cargando…';
      aviso.textContent = '';
      try {
        audio.src = await urlDe(id);
        audio.hidden = false;
        btn.hidden = true;
        await audio.play().catch(() => { /* sin permiso de reproducción automática: ya están los controles */ });
        audio.focus();
      } catch {
        btn.disabled = false;
        btn.textContent = '▶ Reintentar';
        aviso.textContent = 'No se ha podido cargar el audio desde Kopi. Prueba otra vez en un rato.';
      }
    });
  }

  document.querySelectorAll('.audio-recurso[data-kopi]').forEach(montar);
})();
