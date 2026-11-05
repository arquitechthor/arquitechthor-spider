# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository context

`arquitechthor-spider` is one of the independent git repos in the `kopi/` workspace (see
`../CLAUDE.md`). Its public name is **Tech Spider**: a static study site that shows the
technologies of a software engineer as an interactive "spider web" map, with notes and quizzes per
topic and, later, topic certifications (Java OCP, Spring, Scrum…). It has **no runtime dependency**
on the shared Kopi AWS backend. It is published with **GitHub Pages** from `main` / root at
`https://arquitechthor.github.io/arquitechthor-spider/`; every push to `main` redeploys it (no
workflow file; `.nojekyll` makes Pages serve files as-is). Work directly on `main`, no PRs
(policy "Desarrollo directo a main" in `../kopi-docs/politicas.md`).

**Read `docs/PLAN.md` first.** It is the source of truth for phases, decisions, the data model and
the next step ("Estado actual"). Update it (tick tasks, "Estado actual", "Registro de sesiones") at
the end of every work session. Any change to the tree is also logged in its section 4.2.1
("Cambios al árbol").

## Stack and layout

Plain HTML/CSS/JS, **no framework, no build, no package.json** (same approach as `aws-cert-study`,
whose `styles.css`, `nav.js` and page skeleton were copied; the repos stay independent, so copy,
don't link). Third-party libraries, if ever needed, go as local copies in `assets/vendor/` (no CDN,
no third-party requests).

- `data/nodos.json`: **the single source of truth** for the tree (flat list, presentation order,
  `padre` links; schema in `docs/PLAN.md` 4.2). Node types: `raiz`, `area` (13, with `color`),
  `bloque` (groups topics), `tema` (has knowledge of its own). **Every node has a ficha**
  (`docs/PLAN.md` 5.2): a topic gets a full guide plus its own evaluation; an area or block gets a
  presentation page (what it is, its acronyms, why it matters, where to start) and is evaluated as
  a branch. A block becomes a topic when it has knowledge its children don't cover; avoid burying
  topics deep in the tree (siblings + the parent's ficha explains the hierarchy). Each topic exists **once**;
  appearances elsewhere are `accesos`. AWS topics are `externo` links to `aws-cert-study` and are
  never evaluated here. Optional fields are omitted when empty.
- `docs/tecnologias.md`: the original tree, kept as history. `scripts/importar_arbol.py` built
  `nodos.json` from it and refuses to overwrite it without `--forzar` (that would lose manual edits).
- `assets/datos.js` (`window.SpiderDatos`): shared loader. Resolves every path against the site
  root derived from its own `<script src>`, so pages work at any depth and under the
  `/arquitechthor-spider/` subpath. **Always use relative paths**, never `/data/...`. It also builds
  `hijos` (own children first, then accesos), `temasDe()` and wraps `localStorage` (keys `spider.*`,
  every access in try/catch: the site must work with storage blocked).
- `assets/iconos/areas/<id>.svg`: our own stroke icons (`currentColor`), painted with the area color
  as a CSS mask (`SpiderDatos.iconoArea`). **No third-party logos** (Java, Spring, Docker… are
  trademarks).
- `assets/logo.svg` (+ `favicon-32.png`, `apple-touch-icon.png` rendered from it with headless
  Chrome): site logo, excluded from the CC BY-SA license like in aws-cert-study.
- `index.html`: the home page is the map. `assets/mapa.js` is the controller (state in the URL as
  `?n=<focused node>&s=<selected node>` with history, plus the view `q`, `color=nivel`, `estado`,
  `esencial=1` kept with `replaceState`; breadcrumbs, detail panel, self-assessment in
  `spider.autoevaluacion`; toolbar with the search combobox, "Color por" and filters, applied by
  `decorar()` over the drawn `<a data-id>` nodes without redrawing); `assets/telarana.js` (`SpiderTelarana`) only draws the default
  **Telaraña** view as SVG: focused node in the center, children on ring 1 (horizontal labels),
  grandchildren on ring 2 (radial labels; dots only on mobile), viewBox fitted to the content.
  Every node is a real `<a href>`; Tab goes clockwise, arrows move along the ring, Esc goes up.
  Areas carry `nombreCorto`, used for the 13 areas around the root. There is no separate "Áreas"
  section any more (removed 2026-11-03 at the user's request): the Cajas view at the root shows the
  same thing with the same look (area icon, original name, grey chips, no counts). `assets/arbol.js` (`SpiderArbol`): tree helpers and
  accent-insensitive search. `assets/cajas.js` (`SpiderCajas`) draws the alternative **Cajas** view
  (focused node as header, children as boxes sized with `flex-grow` by their topic count,
  grandchildren as chips); the "Telaraña | Cajas" switch keeps the context, goes in the URL as
  `v=cajas` and is remembered with the color in `spider.vista` (the URL wins). Both views only
  draw; `mapa.js` handles navigation and `decorar()` (via `[data-decora]` in Cajas).
- `assets/general.js` (`SpiderGeneral`): third view, **Vista general** (`v=general`, only above 960 px;
  below it the Telaraña is drawn and the choice is kept). The whole tree as a radial dendrogram in the
  same `<svg>` (leaves on the edge, area short names fixed, other names in `#general-info` on hover or
  focus); clicking a point opens the Telaraña focused on it. Only root, areas and blocks are in the Tab
  order. `decorar()` works on it unchanged.
- `assets/radar.js` (`SpiderRadar`): **Mi telaraña** radar under the map (`#mi-telarana`), one axis per
  area, layers "Mi nivel" (self-assessment average /4) and "Mis tests" (share of questions answered
  right, averaged over the area's published evaluable topics). `mapa.js` computes the values and
  paints the accessible list next to it (the SVG is `aria-hidden`). Always shown, with a hint when
  there is no data yet.
- Accessibility: every page starts with a "Saltar al contenido" link to `<main id="contenido"
  tabindex="-1">` (copy it in new pages). In the map, the panel is not a live region: short messages go
  to `#mapa-anuncio`. Motion is disabled globally under `prefers-reduced-motion`.
- Fichas: `temas/<id>.html` (published, copied from `plantillas/tema.html`, `<main
  data-ficha="<id>">`) and `tema.html?id=<id>` (generic "Ficha próximamente"). `assets/tema.js`
  paints from `nodos.json` the header (breadcrumbs, icon, name, frase, revisado, buttons),
  "Qué contiene" (children as Cajas-style boxes) and "Relacionados"; never write those by hand.
  `SpiderDatos.urlFicha(nodo)` gives the right link for any node.
- Evaluation: `data/preguntas/<tema>.json` (format in `docs/PLAN.md` 4.3), `assets/preguntas.js`
  (`SpiderPreguntas`, copied from aws-cert-study) and `assets/quiz.js`: `<div class="quiz"
  data-quiz="<id>">` at the end of a topic, or `data-rama="<id>"` in `evaluacion.html?id=` (all
  published evaluable topics of the branch, grouped). Progress per topic in `spider.progreso`.
- `data/glosario.json`: **acronyms** (`en`, `es`, optional `enlace` to a node or concept) and
  **concepts** without a node of their own (definition, `tema`, `relacionados`, `fuentes`), shown in
  `glosario.html` (`assets/glosario.js`). `assets/siglas.js` (`SpiderSiglas`) marks acronyms at load
  time in `.doc` (tooltip; first mention per `<h2>` section links to its ficha, except on its own
  page) and in quiz questions (tooltip only).
- `assets/lectura.js` (`SpiderLectura`, mounted by `tema.js` on written fichas): "Escuchar" reads the
  ficha aloud with the browser's Web Speech API (no library, no requests of our own). It skips `<pre>`,
  the evaluation, "Qué contiene", "Relacionados", "Fuentes" and `[data-sin-lectura]`. Acronyms are
  spelled out unless their glossary entry has `leer` (how to pronounce it: `"RAG": { "leer": "rag" }`).
  Speed and voice in `spider.lectura`. New fichas must load it before `tema.js` (see the template).
- Read fichas: `spider.leidas` (`{ id: "AAAA-MM-DD" }`), helpers `SpiderDatos.tieneFicha/lecturaDe/
  marcarLeida`. `tema.js` adds "Marcar como leída" and offers it at the end of the text (scroll or
  end of "Escuchar"); `mapa.js` shows ✓ (↻ when `revisado` is later than the read date: "actualizada
  desde que la leíste") in both views via `decorar()`, filters them in Estado ("Mi lectura") and
  counts read fichas per branch in the panel. Bumping `revisado` is what flags a ficha as updated.
- `aviso-legal.html`: legal notice, trademarks, license and privacy. Keep it consistent with any
  new feature (anything stored in `localStorage` must be covered by its privacy section).

Every page shares the same `<nav>` and footer as `kopi-web`, `aws-cert-study` and
`arquitechthor.github.io` (policy "Mismo menú y pie" in `../kopi-docs/politicas.md`): "Inicio"
first, "Sobre mí" last, no call-to-action button, active link via `aria-current`, and the footer
ends with `.footer-sitios` (Kopi Tools · Apuntes AWS · Tech Spider · Kopi Chess · Prompt Quest · Sobre mí). Copy the `<nav>` and
`<footer>` from an existing page when creating a new one.

## Commands

```bash
python -m http.server 8765        # fetch() of the JSON files fails on file://
python scripts/revisar_arbol.py   # validator: run after ANY change to nodos.json, temas/, data/preguntas/ or data/glosario.json
```

No build, lint or test tooling. Verify changes in a browser, including at ~375px width (no
horizontal scroll). Headless Chrome won't render a window narrower than ~500px: to check 375px, load
the page inside a 375px-wide `<iframe>` and compare `scrollWidth` with `clientWidth`.

## Content rules (non-negotiable)

- **Spanish** for all user-facing text. Technology names stay as their projects write them; areas
  and blocks show the Spanish name with the original as reference: "Gestión de datos (*Data
  Management*)".
- `frase`: 60–90 characters, no word (4+ letters) from the node's `nombre` nor its id; required for
  areas and their direct children, and for every topic when it is published.
- **Acronyms** are written bare ("IA", "LLM"), never expanded inline: `siglas.js` adds the tooltip
  from `data/glosario.json`. A new acronym only needs its glossary entry (add `enlace` when it has
  a ficha). **Concepts** are linked by hand in fichas with `<a class="concepto"
  data-concepto="<id>">`; their questions go in the evaluation of the topic that covers them.
- **Every ficha stands on its own**: someone arriving straight from a search must understand every
  technical term it uses. Explain it in a few words where it first appears and/or link it (ficha,
  concept or acronym); never just name it (e.g. "la temperatura" without saying what it is).
- **No copying documentation.** Summarize in your own words and link the source. Anything literal
  must be short, in `<blockquote>` with `<cite>` and a link.
- **Never real exam questions** (Oracle, Broadcom, Scrum.org, CNCF, HashiCorp… are under NDA); only
  original ones.
- **Option length must not give away the answer** (new questions only; existing ones stay as they
  are): options of similar length and detail, distractors as concrete and plausible as the correct
  one, and the longest option is not the correct one in most questions of a topic.
- Published topics carry `revisado` (date of the last review against sources); `volatil` topics
  (all of AI Engineering, GDPR, Modern Java, Spring Boot) get a validator warning after 6 months.
