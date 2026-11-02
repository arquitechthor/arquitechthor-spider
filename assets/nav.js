/**
 * Menú de navegación móvil, compartido por todas las páginas (copiado de aws-cert-study, que lo tomó de kopi-web). Alterna la
 * clase .nav-links-open (los estilos del panel desplegable viven en styles.css) y mantiene
 * aria-expanded en sincronía para lectores de pantalla.
 */
(function () {
  const toggle = document.getElementById('navToggle');
  const links = document.querySelector('.nav-links');
  if (!toggle || !links) return;

  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'navLinks');
  links.id = links.id || 'navLinks';

  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('nav-links-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
})();

/**
 * Submenús desplegables del menú (.nav-menu, p. ej. "Juegos"): se abren al pulsar el botón y se
 * cierran con Escape, al pulsar fuera o al sacar el foco. En el panel móvil se despliegan dentro
 * del propio panel. El botón se resalta si el submenú contiene la página actual.
 */
(function () {
  const menus = [...document.querySelectorAll('.nav-menu')];
  menus.forEach((menu, i) => {
    const btn = menu.querySelector('.nav-menu-btn');
    const sub = menu.querySelector('.nav-submenu');
    if (!btn || !sub) return;
    sub.id = sub.id || `navSubmenu${i + 1}`;
    btn.setAttribute('aria-controls', sub.id);
    if (sub.querySelector('[aria-current="page"]')) btn.classList.add('is-actual');

    const abrir = (si) => {
      menu.classList.toggle('is-open', si);
      btn.setAttribute('aria-expanded', String(si));
    };
    btn.addEventListener('click', () => abrir(!menu.classList.contains('is-open')));
    menu.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' && menu.classList.contains('is-open')) {
        abrir(false);
        btn.focus();
      }
    });
    menu.addEventListener('focusout', (ev) => {
      if (ev.relatedTarget && !menu.contains(ev.relatedTarget)) abrir(false);
    });
    document.addEventListener('click', (ev) => {
      if (!menu.contains(ev.target)) abrir(false);
    });
  });
})();

/**
 * Enlace activo del menú (igual en kopi-web, aws-cert-study, arquitechthor.github.io y Tech Spider).
 * Los enlaces a otra página pueden llevar aria-current="page" en el HTML. Los enlaces a una
 * sección de esta misma página (#id) reciben aria-current="location" mientras esa sección
 * está a la vista; styles.css los resalta igual que al pasar el ratón.
 */
(function () {
  const links = document.querySelector('.nav-links');
  if (!links || links.querySelector('[aria-current="page"]')) return;
  const aqui = location.pathname.replace(/index\.html$/, '');
  const pares = [...links.querySelectorAll('a[href*="#"]')]
    .filter((a) => a.hash && a.pathname.replace(/index\.html$/, '') === aqui && a.origin === location.origin)
    .map((a) => [a, document.getElementById(decodeURIComponent(a.hash.slice(1)))])
    .filter(([, sec]) => sec);
  if (!pares.length) return;

  function actualizar() {
    const nav = document.querySelector('.nav');
    const corte = (nav ? nav.offsetHeight : 0) + window.innerHeight * 0.3;
    let activo = null;
    for (const [a, sec] of pares) {
      if (sec.getBoundingClientRect().top <= corte) activo = a;
    }
    // Al final de la página, la última sección aunque sea corta.
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
      activo = pares[pares.length - 1][0];
    }
    for (const [a] of pares) {
      if (a === activo) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    }
  }
  window.addEventListener('scroll', actualizar, { passive: true });
  window.addEventListener('resize', actualizar);
  actualizar();
})();
