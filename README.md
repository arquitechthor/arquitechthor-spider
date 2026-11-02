# Tech Spider

Mapa interactivo para estudiar las tecnologías de un *Software Engineer*: una telaraña de áreas,
bloques y temas con apuntes, evaluaciones por tema y, más adelante, certificaciones temáticas
(Java OCP, Spring, Scrum…). Web estática publicada con GitHub Pages en
<https://arquitechthor.github.io/arquitechthor-spider/>.

El plan de diseño y construcción, con el estado actual, está en [`docs/PLAN.md`](docs/PLAN.md).

## Probar en local

HTML, CSS y JavaScript sin dependencias ni compilación. Hace falta un servidor (con `file://` falla
la carga de los JSON):

```bash
python -m http.server 8765        # y abrir http://localhost:8765/
python scripts/revisar_arbol.py   # valida data/nodos.json tras cualquier cambio
```

## Licencia

**[Creative Commons Atribución-CompartirIgual 4.0 Internacional (CC BY-SA 4.0)](https://creativecommons.org/licenses/by-sa/4.0/deed.es)**.
Ver [`LICENSE`](LICENSE).

**Excluido de la licencia:** el logotipo del sitio y sus favicons (`assets/logo.svg`,
`assets/favicon-32.png`, `assets/apple-touch-icon.png`) y las marcas y nombres de tecnologías,
productos y certificaciones de terceros, que pertenecen a sus titulares.
