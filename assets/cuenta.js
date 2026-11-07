/**
 * Cuenta Kopi (window.SpiderCuenta): guarda el progreso de estudio en la cuenta Kopi del usuario,
 * para tenerlo en cualquier dispositivo. Es opcional: sin sesión (o con el almacenamiento
 * bloqueado) la web funciona igual que siempre, solo con localStorage.
 *
 * Login: página de login gestionada de Cognito con Authorization Code + PKCE (sin librerías: fetch
 * y crypto.subtle). La contraseña nunca pasa por esta web. Vuelta en cuenta.html.
 * App Client "kopi-study-client": sus tokens solo valen en /study/* de la API de Kopi (authorizer
 * propio), no en el resto (notas, contraseñas…). Ver kopi-media-admin,
 * documentation/arquitectura/multi-tenant-y-seguridad.md.
 *
 * Sincronización: se sincronizan las claves de SINCRONIZADAS (no las preferencias del
 * dispositivo, como la vista o la voz). Cada clave lleva la hora de su último cambio
 * (SITIO.claveSync); el servidor guarda por clave la más reciente. La primera vez que se
 * entra con una cuenta en este navegador, lo local y lo remoto se unen (nada se pierde).
 */
(function () {
  // Lo único que cambia entre webs de estudio (este fichero se copia tal cual en aws-cert-study).
  const SITIO = {
    datos: window.SpiderDatos,          // necesita url() y esc()
    site: 'tech-spider',                // {site} de la API (STUDY_SITES en kopi-media-admin)
    claves: {                           // claves sincronizadas -> clave de localStorage
      progreso: 'spider.progreso',
      autoevaluacion: 'spider.autoevaluacion',
      leidas: 'spider.leidas',
      evaluaciones: 'spider.evaluaciones',
      simulacros: 'spider.simulacros',
    },
    unir: {},                           // clave -> fn(remoto, local) para la primera sincronización
    claveSync: 'spider.sincronizacion',
    eventoGuardado: 'spider:guardado',  // lo lanza la web al guardar (detail: clave sincronizada)
    eventoSincronizado: 'spider:sincronizado',
    nombre: 'Tech Spider',
  };
  const D = SITIO.datos;

  // Valores que imprime documentation/scripts/bootstrap-study-progress.ps1 (kopi-media-admin).
  // Mientras estén vacíos, la cuenta Kopi no se ofrece en la web.
  const CONFIG = {
    dominio: 'https://eu-south-2yunp5zgur.auth.eu-south-2.amazoncognito.com',
    clientId: '4fmvo9933fn16s18d0snjqm22q',   // App Client público kopi-study-client (PKCE, sin secreto)
    api: 'https://api.kopitools.link',
  };
  const ACTIVA = Boolean(CONFIG.dominio && CONFIG.clientId);

  // Sesión compartida con las otras webs de estudio de arquitechthor.github.io (mismo origen y
  // mismo App Client): entrar en una vale para las demás.
  const CLAVE_SESION = 'kopi.estudio.sesion';
  const CLAVE_PKCE = 'kopi.estudio.pkce';
  const CLAVE_SYNC = SITIO.claveSync;
  const SINCRONIZADAS = Object.keys(SITIO.claves);

  const VUELTA = D.url('cuenta.html');
  let estado = 'fuera';    // fuera | sincronizando | al-dia | pendiente | error
  let detalle = '';
  let temporizador = null;
  const oyentes = new Set();

  /* ── Almacenamiento (todo en try/catch: puede estar bloqueado) ──── */

  function leerJson(almacen, clave) {
    try { return JSON.parse(almacen.getItem(clave) || 'null'); } catch { return null; }
  }
  function escribirJson(almacen, clave, valor) {
    try {
      if (valor === null || valor === undefined) almacen.removeItem(clave);
      else almacen.setItem(clave, JSON.stringify(valor));
      return true;
    } catch { return false; }
  }
  const sesion = () => leerJson(localStorage, CLAVE_SESION);
  const leerSync = () => leerJson(localStorage, CLAVE_SYNC) || { cuenta: null, t: {} };
  const guardarSync = (s) => escribirJson(localStorage, CLAVE_SYNC, s);

  function cambiarEstado(nuevo, texto = '') {
    estado = nuevo;
    detalle = texto;
    for (const fn of oyentes) { try { fn(info()); } catch { /* un oyente roto no para el resto */ } }
  }

  function info() {
    const s = sesion();
    return { activa: ACTIVA, conectado: Boolean(s), email: s?.email || '', estado, detalle };
  }

  /* ── PKCE y tokens ─────────────────────────────────────────────── */

  function base64url(bytes) {
    let bin = '';
    for (const b of new Uint8Array(bytes)) bin += String.fromCharCode(b);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  const aleatorio = (n) => base64url(crypto.getRandomValues(new Uint8Array(n)));

  function cargaJwt(jwt) {
    try {
      const parte = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(decodeURIComponent(escape(atob(parte))));
    } catch { return {}; }
  }

  async function entrar(volverA = location.href) {
    if (!ACTIVA) return;
    const verificador = aleatorio(48);
    const reto = base64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verificador)));
    const estadoOauth = aleatorio(16);
    if (!escribirJson(sessionStorage, CLAVE_PKCE, { verificador, estado: estadoOauth, volver: volverA })) {
      cambiarEstado('error', 'Tu navegador no deja guardar datos de esta web, así que no se puede iniciar sesión.');
      return;
    }
    const q = new URLSearchParams({
      response_type: 'code',
      client_id: CONFIG.clientId,
      redirect_uri: VUELTA,
      scope: 'openid email',
      state: estadoOauth,
      code_challenge: reto,
      code_challenge_method: 'S256',
      lang: 'es',
    });
    location.assign(`${CONFIG.dominio}/oauth2/authorize?${q}`);
  }

  async function pedirTokens(parametros) {
    const res = await fetch(`${CONFIG.dominio}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: CONFIG.clientId, ...parametros }),
    });
    const cuerpo = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(cuerpo.error || `HTTP ${res.status}`);
      err.codigo = cuerpo.error;
      throw err;
    }
    return cuerpo;
  }

  function guardarTokens(t, anterior = {}) {
    const id = cargaJwt(t.id_token || '');
    const nueva = {
      access: t.access_token,
      refresh: t.refresh_token || anterior.refresh,
      expira: Date.now() + (t.expires_in || 3600) * 1000,
      email: id.email || anterior.email || '',
      sub: id.sub || anterior.sub || cargaJwt(t.access_token).sub,
    };
    escribirJson(localStorage, CLAVE_SESION, nueva);
    return nueva;
  }

  /** En cuenta.html, a la vuelta del login: cambia el código por los tokens. Devuelve la URL a la que volver. */
  async function completarEntrada() {
    const q = new URLSearchParams(location.search);
    if (!q.has('code') && !q.has('error')) return null;
    const pkce = leerJson(sessionStorage, CLAVE_PKCE);
    escribirJson(sessionStorage, CLAVE_PKCE, null);
    history.replaceState(null, '', location.pathname);
    if (q.has('error')) {
      cambiarEstado('error', 'No se completó el inicio de sesión.');
      return pkce?.volver || null;
    }
    if (!pkce || pkce.estado !== q.get('state')) {
      cambiarEstado('error', 'El inicio de sesión no se pudo verificar. Vuelve a intentarlo.');
      return null;
    }
    try {
      guardarTokens(await pedirTokens({
        grant_type: 'authorization_code',
        code: q.get('code'),
        redirect_uri: VUELTA,
        code_verifier: pkce.verificador,
      }));
    } catch {
      cambiarEstado('error', 'No se pudo completar el inicio de sesión. Vuelve a intentarlo.');
      return pkce.volver || null;
    }
    await sincronizar();
    return pkce.volver || null;
  }

  async function tokenValido(forzar = false) {
    const s = sesion();
    if (!s) return null;
    if (!forzar && s.access && s.expira - Date.now() > 60_000) return s.access;
    try {
      return guardarTokens(await pedirTokens({ grant_type: 'refresh_token', refresh_token: s.refresh }), s).access;
    } catch (err) {
      // Sesión caducada o revocada: se sale (el progreso local no se toca).
      if (err.codigo === 'invalid_grant') {
        escribirJson(localStorage, CLAVE_SESION, null);
        cambiarEstado('fuera', 'La sesión ha caducado. Vuelve a entrar.');
      }
      return null;
    }
  }

  async function llamarApi(metodo, cuerpo, { keepalive = false } = {}) {
    for (let intento = 0; intento < 2; intento++) {
      const token = await tokenValido(intento > 0);
      if (!token) return { ok: false, status: 401 };
      let res;
      try {
        res = await fetch(`${CONFIG.api}/study/${SITIO.site}/progress`, {
          method: metodo,
          headers: { Authorization: `Bearer ${token}`, ...(cuerpo ? { 'Content-Type': 'application/json' } : {}) },
          body: cuerpo ? JSON.stringify(cuerpo) : undefined,
          keepalive,
        });
      } catch {
        return { ok: false, status: 0 };   // sin red o bloqueado
      }
      if (res.status === 401 && intento === 0) continue;
      const datos = res.status === 204 ? {} : await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, datos };
    }
    return { ok: false, status: 401 };
  }

  function errorApi(r) {
    if (r.status === 403) cambiarEstado('pendiente', 'Tu cuenta Kopi está pendiente de aprobación. Mientras tanto, el progreso se guarda solo en este navegador.');
    else if (r.status === 401 && !sesion()) cambiarEstado('fuera', detalle);   // la sesión caducó (ya avisado)
    else cambiarEstado('error', 'No se pudo conectar con Kopi. Se reintentará más tarde; tu progreso sigue guardado en este navegador.');
  }

  /* ── Sincronización ────────────────────────────────────────────── */

  const leerLocal = (clave) => leerJson(localStorage, SITIO.claves[clave]);
  const esObjeto = (v) => v && typeof v === 'object' && !Array.isArray(v);

  async function sincronizar() {
    const s = sesion();
    if (!ACTIVA || !s) return;
    cambiarEstado('sincronizando');
    const r = await llamarApi('GET');
    if (!r.ok) return errorApi(r);

    const remoto = r.datos.datos || {};
    const sync = leerSync();
    const primera = sync.cuenta !== s.sub;   // primera vez con esta cuenta en este navegador
    if (primera) sync.t = {};
    const ahora = Date.now();
    const enviar = {};
    let cambios = false;

    for (const clave of SINCRONIZADAS) {
      const R = remoto[clave];
      const L = leerLocal(clave);
      const tl = sync.t[clave] || 0;
      if (primera && R && R.v != null && L != null) {
        // Unión: lo remoto de base y lo local encima (si no son objetos, gana lo local).
        const union = SITIO.unir[clave] ? SITIO.unir[clave](R.v, L)
          : esObjeto(R.v) && esObjeto(L) ? { ...R.v, ...L } : L;
        escribirJson(localStorage, SITIO.claves[clave], union);
        cambios = true;
        sync.t[clave] = ahora;
        enviar[clave] = { v: union, t: ahora };
      } else if (R && R.t > tl) {
        escribirJson(localStorage, SITIO.claves[clave], R.v);
        cambios = true;
        sync.t[clave] = R.t;
      } else if (L != null || tl) {
        const t = tl || ahora;
        sync.t[clave] = t;
        if (!R || t > R.t) enviar[clave] = { v: L, t };
      }
    }
    sync.cuenta = s.sub;
    guardarSync(sync);
    if (cambios) document.dispatchEvent(new CustomEvent(SITIO.eventoSincronizado));

    if (Object.keys(enviar).length) {
      const p = await llamarApi('PUT', { datos: enviar });
      if (!p.ok) return errorApi(p);
    }
    cambiarEstado('al-dia');
  }

  /** Sube los cambios locales (el servidor se queda, clave a clave, con lo más reciente). */
  async function subir({ keepalive = false } = {}) {
    clearTimeout(temporizador);
    temporizador = null;
    const s = sesion();
    if (!ACTIVA || !s) return;
    const sync = leerSync();
    if (sync.cuenta !== s.sub) return sincronizar();
    const enviar = {};
    for (const clave of SINCRONIZADAS) {
      if (sync.t[clave]) enviar[clave] = { v: leerLocal(clave), t: sync.t[clave] };
    }
    if (!Object.keys(enviar).length) return;
    const r = await llamarApi('PUT', { datos: enviar }, { keepalive });
    if (!r.ok) return errorApi(r);
    cambiarEstado('al-dia');
  }

  document.addEventListener(SITIO.eventoGuardado, (ev) => {
    if (!SINCRONIZADAS.includes(ev.detail)) return;
    const sync = leerSync();
    sync.t[ev.detail] = Date.now();
    guardarSync(sync);
    if (!ACTIVA || !sesion()) return;
    clearTimeout(temporizador);
    temporizador = setTimeout(() => subir(), 2000);
  });
  // Si se cierra la página con cambios pendientes, se suben ya.
  window.addEventListener('pagehide', () => { if (temporizador) subir({ keepalive: true }); });
  // Al volver a la pestaña, se trae lo que se haya hecho en otro dispositivo.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && estado !== 'sincronizando') sincronizar();
  });

  /* ── Salir y borrar ────────────────────────────────────────────── */

  async function salir() {
    const s = sesion();
    if (temporizador) await subir();
    escribirJson(localStorage, CLAVE_SESION, null);
    if (s?.refresh) {
      // Revoca el refresh token (best-effort) y cierra la sesión de la página de login de Cognito.
      fetch(`${CONFIG.dominio}/oauth2/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token: s.refresh, client_id: CONFIG.clientId }),
        keepalive: true,
      }).catch(() => {});
    }
    location.assign(`${CONFIG.dominio}/logout?${new URLSearchParams({ client_id: CONFIG.clientId, logout_uri: VUELTA })}`);
  }

  /** Borra el progreso guardado en Kopi para esta web (el de este navegador se queda). */
  async function borrarRemoto() {
    const r = await llamarApi('DELETE');
    if (!r.ok) { errorApi(r); return false; }
    const sync = leerSync();
    sync.cuenta = null;   // si se vuelve a sincronizar, se une de nuevo con lo local
    guardarSync(sync);
    cambiarEstado('al-dia', 'Progreso borrado de tu cuenta Kopi.');
    return true;
  }

  /* ── Aviso en la portada (#cuenta-resumen) ─────────────────────── */

  function pintarResumen() {
    const el = document.getElementById('cuenta-resumen');
    if (!el) return;
    el.hidden = !ACTIVA;
    if (!ACTIVA) return;
    const i = info();
    const enlace = `<a href="${D.esc(VUELTA)}">${i.conectado ? 'Gestionar' : 'Entrar con Kopi'}</a>`;
    el.innerHTML = i.conectado
      ? (i.estado === 'pendiente'
        ? `Tu cuenta Kopi está pendiente de aprobación: de momento el progreso se guarda solo en este navegador. ${enlace}`
        : `Tu progreso se guarda también en tu cuenta Kopi (${D.esc(i.email)}). ${enlace}`)
      : `Tu progreso se guarda en este navegador. Si tienes cuenta Kopi, puedes guardarlo también allí y tenerlo en cualquier dispositivo. ${enlace}`;
  }

  window.SpiderCuenta = {
    activa: ACTIVA, info, entrar, completarEntrada, sincronizar, salir, borrarRemoto,
    alCambiar(fn) { oyentes.add(fn); return () => oyentes.delete(fn); },
  };

  oyentes.add(pintarResumen);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pintarResumen);
  else pintarResumen();
  // En cuenta.html la sincronización la lanza la propia página (tras completar el login).
  if (ACTIVA && sesion() && !document.querySelector('[data-cuenta]')) sincronizar();
})();
