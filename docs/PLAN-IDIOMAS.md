# Plan: Tech Spider en inglés e italiano

Petición del usuario (2026-11-16): que Tech Spider esté también en **inglés** y en **italiano**, con
las guías (fichas) traducidas y con voces en esos idiomas. El **español sigue siendo el idioma por
defecto**: las URL actuales no cambian y son la versión de referencia.

Este documento es el plan de esa línea de trabajo. `docs/PLAN.md` sigue siendo la fuente de verdad
del proyecto y enlaza aquí. Al terminar cada sesión de esta línea, marca aquí las tareas y anota la
sesión en el "Registro de sesiones" de `docs/PLAN.md`.

El plan es paralelo al de aws-cert-study (`../aws-cert-study/PLAN-IDIOMAS.md`): las piezas
compartidas (`lectura.js`, `audio-kopi.js`, `cuenta.js`, `telarana.js`, menú y pie) se cambian igual
en los dos repos.

---

## Estado actual

- **Plan redactado (2026-11-16), sin empezar.** Primer paso: que el usuario resuelva las decisiones
  I1–I7 (sección 2). Después, Fase 1.

---

## 1. Qué hay que traducir (inventario a 2026-11-16)

| Pieza | Volumen | Dónde |
|---|---|---|
| Textos de la interfaz | Todos los mensajes escritos en el JS (mapa, panel, filtros, quiz, lectura, cuenta…) | `assets/*.js` |
| Páginas fijas | Portada, glosario, evaluación, ficha genérica, cuenta, aviso legal | `*.html` de la raíz |
| Árbol | 527 nodos: `nombre`, `nombreCorto`, `frase` (y `alias` cuando haga falta) | `data/nodos.json` |
| Glosario | Siglas (glosa y `leer`) y conceptos (definición) | `data/glosario.json` |
| Fichas | 20 publicadas (`temas/*.html`, unas 23 000 palabras con marcado) y las que vayan saliendo | `temas/` |
| Preguntas | 11 cuestionarios | `data/preguntas/` |
| Rama AWS | 177 servicios generados desde aws-cert-study | `scripts/importar_aws.py` |
| Voces | Lectura con Web Speech API y resúmenes en audio de Kopi | `assets/lectura.js`, `assets/audio-kopi.js` |

`docs/tecnologias.md` y `docs/PLAN.md` son documentos internos y no se traducen.

---

## 2. Decisiones pendientes (las resuelve el usuario)

| # | Pregunta | Propuesta |
|---|---|---|
| I1 | ¿Cómo son las URL de cada idioma? | Carpetas **`/en/`** e **`/it/`** con la misma estructura que la raíz (`/en/temas/llms.html`). El español se queda en la raíz, sin prefijo. Es lo estándar para `hreflang` y para que Google indexe cada idioma por separado. |
| I2 | ¿Se cambia el idioma automáticamente según el navegador? | **No se redirige nunca.** Si el navegador está en inglés o italiano y se entra en una página en español, sale una vez un aviso discreto ("This page is also in English") que se puede cerrar; se recuerda en `localStorage`. |
| I3 | ¿Qué se ve en inglés o italiano de una ficha aún no traducida? | El mapa, el panel y el glosario salen siempre en los tres idiomas. Una ficha sin traducir abre una página "Coming soon in English" con enlace a la versión en español, igual que la "Ficha próximamente" actual. |
| I4 | ¿En qué orden se traduce? | **Inglés e italiano a la vez**, ficha a ficha, para que los dos idiomas no se desfasen. Dentro de eso, primero la interfaz y el árbol completo (el mapa ya es útil), después las fichas publicadas por orden de publicación. |
| I5 | ¿Quién revisa las traducciones? | Las hace Claude desde el español. El usuario revisa el inglés por muestreo. Para el italiano, si el usuario no lo lee con soltura, Claude hace una segunda pasada de revisión (retrotraducción al español y comparación) antes de publicar. |
| I6 | ¿Qué voz se prefiere en cada idioma para "Escuchar"? | Como en español: las de **Google primero** (aunque sean en línea), luego las locales. En inglés, `en-GB` antes que `en-US`; en italiano, `it-IT`. El usuario puede cambiarla en la barra y se recuerda por idioma. |
| I7 | ¿Hay resumen en audio de Kopi en cada idioma? | Sí, uno por idioma, generado por el usuario con NotebookLM a partir de la ficha traducida y subido a Kopi Conocimiento. Si un idioma aún no tiene el suyo, **no se muestra ningún audio** en esa versión (no se ofrece el español). |

---

## 3. Diseño

### 3.1 Páginas y URL

- Cada página tiene su copia en `en/` y en `it/` con la misma ruta relativa: `en/index.html`,
  `en/temas/<id>.html`, `en/glosario.html`, `en/aviso-legal.html`… Las rutas relativas llevan un `../`
  más. `datos.js` ya calcula la raíz del sitio desde su propio `<script src>`, así que sigue
  funcionando a cualquier profundidad.
- `<html lang="en">` / `lang="it"` en cada copia. **El idioma de la página sale siempre de ese
  atributo**: el JS no adivina nada más.
- En el `<head>` de cada página, los `<link rel="alternate" hreflang="es|en|it|x-default">` (con
  `x-default` apuntando al español). `sitemap.xml` incluye las tres versiones con sus alternativas.
- Selector de idioma en el menú: **ES · EN · IT**, que lleva a la misma página en el otro idioma
  conservando la consulta (`?n=…&s=…`). Si la ficha no existe en ese idioma, lleva a la página de I3.
- `scripts/versionar.py` estampa también los `?v=` de las páginas de `en/` e `it/`.

### 3.2 Textos de la interfaz

- Nuevo `assets/textos.js` (`SpiderTextos`): un diccionario `{ es: {…}, en: {…}, it: {…} }` y una
  función `t('clave', {variables})` que usa el idioma de `<html lang>`. Se carga antes que el resto de
  scripts.
- Todos los textos escritos hoy en el JS pasan a ese diccionario (mapa, panel, filtros, Cajas, radar,
  quiz, glosario, lectura, cuenta, aviso de "actualizada desde que la leíste"…). El español se queda
  como está, palabra por palabra.
- Fechas y números con `Intl` y el idioma de la página.
- La búsqueda del mapa busca en el nombre del idioma de la página y, además, en el nombre original
  (inglés de la tecnología) y los alias.

### 3.3 Datos

- `data/nodos.json` sigue siendo la única fuente de la estructura (ids, `padre`, `tipo`, accesos,
  relacionados…). Los textos traducidos van en ficheros aparte por idioma, indexados por id:
  `data/en/nodos.json` y `data/it/nodos.json` con `{ "<id>": { "nombre", "nombreCorto", "frase" } }`.
  `datos.js` los mezcla al cargar según el idioma.
- Nombres de áreas y bloques: en inglés, el nombre original sin más ("Data Management"); en italiano,
  igual que en español, el nombre traducido con el original de referencia ("Gestione dei dati
  (*Data Management*)"). Los nombres de tecnologías no se traducen en ningún idioma.
- `data/en/glosario.json` y `data/it/glosario.json`: glosario **completo por idioma**, no una capa
  encima del español, porque las siglas cambian de un idioma a otro (IA → AI en inglés; PLN → NLP;
  OCDE → OECD / OCSE). Mismo formato: expansión en inglés, glosa en el idioma de la página, `leer` y
  `enlace`. Los conceptos llevan su definición traducida y los mismos ids, para que
  `data-concepto="<id>"` funcione igual en las tres versiones.
- `data/en/preguntas/<id>.json` y `data/it/preguntas/<id>.json`: las preguntas traducidas con **los
  mismos ids, el mismo tipo, el mismo número de opciones y la misma respuesta correcta**. Así el
  progreso (`spider.progreso`) es el mismo en los tres idiomas.
- `scripts/importar_aws.py` lee también las traducciones de aws-cert-study (su `data/en/` y
  `data/it/`) para rellenar los nodos de la rama AWS en cada idioma.

### 3.4 Fichas

- `en/temas/<id>.html` e `it/temas/<id>.html`, copiadas de la ficha en español y traducidas. La
  plantilla gana una versión por idioma (`plantillas/en/tema.html`, `plantillas/it/tema.html`).
- Cada traducción lleva en el `<main>` la fecha `revisado` de la ficha española de la que sale:
  `data-traducido-de="AAAA-MM-DD"`. Cuando la ficha española se revisa (sube su `revisado`), el
  validador avisa de que la traducción está **desactualizada**, y el mapa en ese idioma lo indica en
  el panel.
- Los enlaces externos ("Fuentes", documentación oficial) se mantienen; si la fuente tiene versión en
  ese idioma, se enlaza esa.

### 3.5 Lo que no cambia con el idioma

- El progreso, las autoevaluaciones, las fichas leídas y los cuestionarios superados son **los mismos
  en los tres idiomas** (las claves `spider.*` usan ids, no textos). La sincronización con la cuenta
  Kopi no cambia.
- Excepción: si una ficha traducida está desactualizada respecto a cuándo se leyó, se marca con ↻
  igual que en español.

### 3.6 Menú, pie y otras webs

- El menú y el pie se traducen en `en/` e `it/`. El selector de idioma solo existe en Tech Spider y en
  aws-cert-study: hay que anotarlo en la política "Mismo menú y pie" de `../kopi-docs/politicas.md`.
- Los nodos `externo` de la rama AWS enlazan a la guía de aws-cert-study **en el mismo idioma** (o a su
  página "coming soon" si allí no está traducida).

### 3.7 Cuenta Kopi y aviso legal

- `cuenta.html` en los tres idiomas. Comprobar si la página de inicio de sesión gestionada de Cognito
  acepta el parámetro de idioma (`lang=en|it|es`) y pasarlo; si no, se queda en el idioma por defecto
  del grupo de usuarios. La URI de redirección sigue siendo la española (`cuenta.html`), que devuelve
  a la página de origen en su idioma.
- El aviso legal se traduce con una nota: "En caso de duda, prevalece la versión en español". Su
  sección de privacidad cubre las claves nuevas de `localStorage` (aviso de I2, voces por idioma).

---

## 4. Voces

### 4.1 "Escuchar" con la Web Speech API (`assets/lectura.js`)

- El idioma de la lectura sale de `<html lang>`: la lista de voces se filtra por `^en` o `^it`
  además de `^es`, con el orden de I6.
- Preferencias en `spider.lectura`: `{ velocidad, voces: { es, en, it } }`, una voz por idioma.
  Migración una sola vez: la `voz` actual pasa a `voces.es`.
- `leer` (cómo pronunciar una sigla) sale del glosario de cada idioma, porque la pronunciación cambia:
  "yéison" vale para el español, pero en inglés "JSON" se lee bien sin ayuda. La regla de deletrear
  las siglas en mayúsculas ("E C 2") sirve igual en los tres.
- Textos de la barra (anterior, pausar, velocidad, voz…) desde `textos.js`. Si no hay voz del idioma,
  el botón lo dice ("No English voice in this browser") con un enlace de ayuda para instalar voces
  (Windows: Configuración › Hora e idioma › Voz; Android: Speech Services de Google).
- `lectura.js` es una copia en aws-cert-study: el cambio se hace igual en los dos repos.
- Fuera de alcance: cambiar de voz a mitad de frase para los nombres en inglés dentro del texto en
  español o en italiano.

### 4.2 Resúmenes en audio de Kopi (`assets/audio-kopi.js`)

- En `nodos.json`, `"audio": true` pasa a ser la lista de idiomas con audio: `"audio": ["es"]`,
  `["es", "en"]`… El 🎧 del panel y el filtro "Con resumen en audio" miran el idioma de la página.
- Cada ficha traducida lleva su propio `<figure class="audio-recurso" data-kopi="<id>">` con el id del
  recurso de Kopi **en su idioma**. `audio-kopi.js` no cambia salvo sus textos.
- Flujo para añadir un audio en inglés o italiano: el usuario genera el resumen en NotebookLM con la
  ficha traducida como fuente y el idioma de salida puesto, lo sube a un tema de Kopi Conocimiento por
  idioma (p. ej. "Tech Spider (EN)") y da el id. Antes de enlazarlo: `curl` al recurso público,
  `tipo` debe ser `AUDIO` y el título debe coincidir con el tema y el idioma; si no, se para y se
  pregunta.
- El validador comprueba que cada idioma listado en `audio` tiene su bloque y su script en la ficha de
  ese idioma.

---

## 5. Reglas de contenido en inglés e italiano

Las de `CLAUDE.md` valen en los tres idiomas, con estos ajustes:

- `frase`: 60–90 caracteres en cada idioma, sin palabras del `nombre` ni del id (el validador la
  revisa por idioma).
- Siglas sin desarrollar en el texto; la glosa sale del glosario del idioma.
- **Traducir, no reescribir**: misma estructura, mismas secciones y mismo nivel de detalle que la
  ficha española. Si al traducir se encuentra un error, se corrige primero en español.
- Las preguntas traducidas mantienen la regla de la longitud de las opciones (que no delate la
  respuesta) y siguen siendo originales.
- Nada de documentación copiada en ningún idioma: las citas literales, cortas y con `<cite>`.

---

## 6. Fases y tareas

### Fase 0: decisiones
- [ ] **0.1** El usuario resuelve I1–I7.
- [ ] **0.2** Anotar las decisiones en la sección 2 de `docs/PLAN.md` y la nueva regla del selector de
  idioma en `../kopi-docs/politicas.md`.

### Fase 1: infraestructura (sin contenido traducido todavía)
- [ ] **1.1** `assets/textos.js` y paso de todos los textos del JS al diccionario (solo español; la
  web no debe cambiar en nada).
- [ ] **1.2** `datos.js`: idioma desde `<html lang>`, mezcla de `data/<idioma>/nodos.json`, glosario y
  preguntas por idioma, `urlFicha()` con el prefijo del idioma.
- [ ] **1.3** Selector ES · EN · IT en el menú, `hreflang`, aviso de I2.
- [ ] **1.4** `versionar.py`, `revisar_arbol.py` (paridad de ids, preguntas con la misma respuesta
  correcta, traducciones desactualizadas, `frase` por idioma) y `sitemap.xml` con las tres versiones.
- [ ] **1.5** Página "coming soon" por idioma (I3).

### Fase 2: interfaz y mapa en inglés e italiano
- [ ] **2.1** Diccionario `en` e `it` de `textos.js`.
- [ ] **2.2** Páginas fijas en `en/` e `it/`: portada, glosario, evaluación, ficha genérica, cuenta,
  aviso legal.
- [ ] **2.3** `data/en/nodos.json` y `data/it/nodos.json` con los 527 nodos.
- [ ] **2.4** Glosarios completos en inglés e italiano.
- [ ] **2.5** `importar_aws.py` con las traducciones de aws-cert-study (cuando estén; mientras, la
  rama AWS sale con los textos en español).
- [ ] **2.6** Probar a 375 px y en escritorio los tres idiomas; publicar.

### Fase 3: fichas y preguntas
- [ ] **3.1** Plantillas de ficha en `plantillas/en/` y `plantillas/it/`.
- [ ] **3.2** Las 20 fichas publicadas, en inglés e italiano, con sus 11 cuestionarios (por lotes,
  publicando cada lote).
- [ ] **3.3** Desde que acabe la 3.2: cada ficha nueva se publica en los tres idiomas a la vez (paso
  añadido al flujo de la Fase 7 de `docs/PLAN.md`).

### Fase 4: voces
- [ ] **4.1** `lectura.js` multiidioma (4.1), en este repo y en aws-cert-study.
- [ ] **4.2** `"audio"` como lista de idiomas, filtro y 🎧 por idioma (4.2).
- [ ] **4.3** Audios en inglés e italiano de las fichas que ya lo tienen en español, cuando el
  usuario los genere.

### Fase 5: mantenimiento
- [ ] **5.1** Añadir a `CLAUDE.md` las reglas de idiomas (dónde va cada traducción, qué comprueba el
  validador, que una revisión en español deja las traducciones marcadas como desactualizadas).
