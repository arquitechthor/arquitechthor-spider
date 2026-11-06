/**
 * cuenta.html: vuelta del inicio de sesión de Kopi (cambia el código por los tokens) y gestión de
 * la cuenta (estado, sincronizar, salir, borrar el progreso remoto). La lógica está en
 * assets/cuenta.js (SpiderCuenta); aquí solo se pinta.
 */
(async function () {
  const C = window.SpiderCuenta;
  const $ = (id) => document.getElementById(id);
  const estadoEl = $('cuenta-estado');
  const btn = { entrar: $('btn-entrar'), sincronizar: $('btn-sincronizar'), salir: $('btn-salir'), borrar: $('btn-borrar') };
  let confirmandoBorrado = false;

  const TEXTOS = {
    sincronizando: 'Sincronizando tu progreso…',
    'al-dia': 'Tu progreso está guardado en tu cuenta Kopi y al día.',
  };

  function pintar(i = C.info()) {
    if (!i.activa) {
      estadoEl.textContent = 'La conexión con la cuenta Kopi todavía no está disponible. Tu progreso se guarda en este navegador.';
      for (const b of Object.values(btn)) b.hidden = true;
      return;
    }
    const base = i.conectado
      ? `Has entrado como ${i.email || 'usuario de Kopi'}. ${i.detalle || TEXTOS[i.estado] || ''}`
      : `${i.detalle ? `${i.detalle} ` : ''}No has entrado: tu progreso se guarda solo en este navegador.`;
    estadoEl.textContent = base.trim();
    estadoEl.classList.toggle('callout-warn', i.estado === 'error' || i.estado === 'pendiente');
    btn.entrar.hidden = i.conectado;
    btn.sincronizar.hidden = !i.conectado;
    btn.salir.hidden = !i.conectado;
    btn.borrar.hidden = !i.conectado || i.estado === 'pendiente';
    btn.sincronizar.disabled = i.estado === 'sincronizando';
  }

  if (!C) return;
  C.alCambiar(pintar);
  pintar();

  btn.entrar.addEventListener('click', () => C.entrar(document.referrer && new URL(document.referrer).origin === location.origin ? document.referrer : window.SpiderDatos.url('index.html')));
  btn.sincronizar.addEventListener('click', () => C.sincronizar());
  btn.salir.addEventListener('click', () => C.salir());
  btn.borrar.addEventListener('click', async () => {
    // Dos pasos, sin diálogos del navegador: el primer clic pide confirmación.
    if (!confirmandoBorrado) {
      confirmandoBorrado = true;
      btn.borrar.textContent = 'Pulsa otra vez para borrar tu progreso de Kopi';
      setTimeout(() => { confirmandoBorrado = false; btn.borrar.textContent = 'Borrar mi progreso de Kopi'; }, 6000);
      return;
    }
    confirmandoBorrado = false;
    btn.borrar.textContent = 'Borrar mi progreso de Kopi';
    await C.borrarRemoto();
  });

  const volver = await C.completarEntrada();
  // Login completado: de vuelta a la página desde la que se entró.
  if (volver && C.info().conectado && new URL(volver, location.href).origin === location.origin) {
    location.replace(volver);
    return;
  }
  if (volver) {
    const enlace = $('cuenta-volver');
    enlace.querySelector('a').href = volver;
    enlace.hidden = false;
  } else if (C.info().conectado && C.info().estado === 'fuera') {
    C.sincronizar();
  }
})();
