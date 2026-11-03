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
  `bloque` (grouping only, no guide), `tema` (has its own guide). Each topic exists **once**;
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
  Areas carry `nombreCorto`, used for the 13 areas around the root. Below the map, the area cards
  (`pintarAreas`) link each area and block to the web. `assets/arbol.js` (`SpiderArbol`): tree helpers and
  accent-insensitive search. The "Cajas" view (`cajas.js`) is still to come (task 3.6).
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
python scripts/revisar_arbol.py   # tree validator: run after ANY change to nodos.json, temas/ or data/preguntas/
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
- **No copying documentation.** Summarize in your own words and link the source. Anything literal
  must be short, in `<blockquote>` with `<cite>` and a link.
- **Never real exam questions** (Oracle, Broadcom, Scrum.org, CNCF, HashiCorp… are under NDA); only
  original ones.
- Published topics carry `revisado` (date of the last review against sources); `volatil` topics
  (all of AI Engineering, GDPR, Modern Java, Spring Boot) get a validator warning after 6 months.
