# Plan de trabajo: Tech Spider (`arquitechthor-spider`)

Web pública y estática para estudiar el mapa de tecnologías de un *Software Engineer*
(`docs/tecnologias.md`), inspirada en `aws-cert-study`. Se publica con GitHub Pages en
`https://arquitechthor.github.io/arquitechthor-spider/`.

Este fichero sirve para **retomar el trabajo en cualquier momento**: antes de empezar una sesión
lee "Estado actual"; al terminar, marca las tareas hechas, actualiza "Próximo paso" y añade una
línea al "Registro de sesiones".

---

## Estado actual

- **Fase 1 completa (2026-11-02):** `data/nodos.json` generado (355 nodos: 13 áreas, 64 bloques,
  277 temas; 12 accesos; 21 externos a aws-cert-study), iconos de las áreas y validador en verde
  (`python scripts/revisar_arbol.py`). Desde ahora **`data/nodos.json` es la fuente de verdad**.
- El 2026-11-02 el usuario aceptó D2, D3, D5 y D7, decidió que la vista **Telaraña sea la
  predeterminada** y que AWS solo se **enlaza**.
- **Decisiones cerradas (2026-11-02):** nombre **Tech Spider** (D1), cada tema existe una sola vez
  (D4) y área 12 sin test **salvo Scrum**, que será detallado, evaluable y con certificación (D6).
  Licencia cambiada a CC BY-SA 4.0 (tarea 0.3).
- **Pendiente de datos del usuario:** sus propuestas de temáticas para fases posteriores (ver
  "Propuestas del usuario" en la Fase 8).
- **Fase 2 completa (2026-11-02)** salvo el enlace desde las otras tres webs (tarea 2.6, aplazada):
  web publicada en GitHub Pages con portada provisional (las 13 áreas como tarjetas), aviso legal,
  logo y favicons propios, `datos.js` y `CLAUDE.md` del repo.
- **Fase 3 en curso (2026-11-02):** telaraña **publicada** (commit `adf8322`): `arbol.js`,
  `telarana.js` y `mapa.js` con recentrado, migas, URL e historial, teclado, panel de detalle y
  autoevaluación (tareas 3.1–3.4), revisada por el usuario. Portada: cabecera y mapa (Telaraña o
  Cajas); las tarjetas de áreas se retiraron el 2026-11-03.
- **3.5 publicada (2026-11-03):** buscador, "Color por" área/mi nivel y filtros.
- **3.6 publicada (2026-11-03):** vista Cajas y conmutador "Telaraña | Cajas", pendiente de que el
  usuario la pruebe en producción.
- **Piloto de IA (2026-11-03), pendiente de revisión del usuario:** regla "todo nodo tiene ficha",
  fichas publicadas del área IA y de 6 temas (IA, ML, DL, IA generativa, LLMs, agentes) con 71
  preguntas, glosario de siglas y conceptos con tooltip y enlace, evaluación por tema y por rama.
  Ampliado a petición del usuario (para sus pruebas) con parámetros, arquitectura, datos
  estructurados, regresión, sesgo, varianza, NLP y Transformer.
- **Próximo paso:** revisión del piloto con el usuario; después 3.7 (responsive), 3.8 (radar) y
  3.9 (vista general), y la pasada de bloques candidatos a tema (4.5). **Tarea 2.6 casi cerrada (2026-11-03):**
  enlaces publicados en `kopi-web`, `aws-cert-study`, `arquitechthor.github.io` y
  `kopi-chess`; falta `kopi-docs/politicas.md`, que no está versionado y vive en otro ordenador: se
  actualiza cuando se trabaje allí (política "Mismo menú y pie": añadir Tech Spider a la lista).
- **Última actualización:** 2026-11-03 (piloto de fichas y evaluaciones de IA)

---

## 1. Objetivo

1. **Ver el conjunto de un vistazo:** la portada es un **mapa interactivo** del árbol de
   tecnologías (13 áreas → 56 bloques → ~295 temas) en forma de **telaraña** (vista
   predeterminada: anillos concéntricos alrededor del nodo enfocado) y, como alternativa, de
   **cajas dentro de cajas**, con zoom por niveles, búsqueda y el progreso pintado encima. Tiene
   que entenderse sin instrucciones.
2. **Estudiar cada tema:** una guía por tema (apuntes propios en español, enlaces a fuentes).
3. **Evaluarse por tema y por rama:** preguntas originales por tema; se puede evaluar un tema, un
   bloque o un área entera (las preguntas de todos sus descendientes).
4. **Certificaciones temáticas (futuro):** Java OCP, Spring Professional, CKAD, Terraform, etc.,
   como "lentes" sobre el mismo mapa (qué temas entran y con qué peso) y con simulacro propio.
5. **Mismo estilo y reglas que `aws-cert-study`:** HTML/CSS/JS sin build, GitHub Pages, menú y pie
   comunes, todo en español, progreso solo en el navegador.

### Lo que el árbol nos dice (análisis de `docs/tecnologias.md`)

| Dato | Valor |
|---|---|
| Nodos | 364 (tras la ampliación del área 13 del 2026-11-02; antes 322): 1 raíz, 13 áreas, 56 bloques, 227 temas de nivel 3 y 68 subtemas de nivel 4 |
| Hojas | 276 (antes 245) |
| Profundidad | variable: la mayoría termina en el nivel 3, pero hay ramas de 4 (Java, Spring Data, Resilience Patterns, AWS, Domain Knowledge) y una de 2 (TypeScript, sin hijos) |
| Duplicados exactos | `SOLID`, `Code Reviews`, `Spring Security` aparecen en dos sitios |
| Duplicados con otro nombre | `Object-Oriented Programming (OOP)` / `Object-Oriented Programming`; `HTTP Fundamentals` / `HTTP / HTTPS`; `Amazon SQS` / `SQS`; `Amazon EventBridge` / `EventBridge`; `AWS Cognito` / `Cognito`; `AWS CloudFormation` / `CloudFormation`; `DynamoDB (Key-Value / Document)` / `DynamoDB`; `Spring Data JPA` ≈ `Jakarta Persistence (JPA)` (relacionados, no iguales) |
| Solapamiento con `aws-cert-study` | toda la rama "Amazon Web Services" (19 servicios) y los servicios sueltos de otras ramas (SQS, EventBridge, Cognito, CloudFormation, CDK, DynamoDB) ya tienen guía y preguntas allí |
| Nodos no técnicos | área 12 (Comunicación, Liderazgo, Idiomas, Dominios de negocio): se evalúan mal con test; ver D6. **Scrum es la excepción**: detallado, evaluable y con certificación |

Consecuencias para el diseño:
- El modelo de datos tiene que admitir **un tema en varios sitios del mapa** (un nodo, un sitio
  "principal" y "accesos" en los demás) para no duplicar guías, preguntas ni progreso.
- El mapa no puede asumir profundidad fija: la navegación es recursiva.
- Los nodos de AWS son **enlaces** a `aws-cert-study`, no guías nuevas ni preguntas (decisión
  del usuario; ver 5.6).

---

## 2. Decisiones tomadas

| Tema | Decisión |
|---|---|
| Stack | HTML/CSS/JS puro, sin framework, sin build, sin `package.json`, igual que `aws-cert-study` y `kopi-web`. Las librerías, si hacen falta, en copia local en `assets/vendor/` (sin CDN ni peticiones a terceros), como jsPDF en `aws-cert-study`. |
| Hosting | GitHub Pages desde `main` / raíz, con `.nojekyll`. Sin workflow: cada push a `main` despliega. Sin PRs (política "Desarrollo directo a main"). |
| Rutas | Siempre **relativas** (la web vive bajo `/arquitechthor-spider/`). Un `assets/datos.js` resuelve las rutas desde su propio `<script src>`, como `AwsDatos`. |
| Estilo | Paleta y componentes de `aws-cert-study/styles.css` (que a su vez vienen de `kopi-web`), **copiados**: los repos son independientes. Tema oscuro como el resto de webs. |
| Idioma | Interfaz y apuntes en **español**. Los nombres de tecnologías se quedan como los usa su proyecto (Spring Boot, Kubernetes); los nombres de áreas y bloques llevan traducción con el original como referencia: "Diseño de software (*Software Design Principles*)". |
| Fuente de verdad | `data/nodos.json` (lista plana). `docs/tecnologias.md` queda como origen histórico; tras la importación inicial se edita el JSON, no el `.md`. |
| Progreso | Solo en el navegador (`localStorage`, prefijo `spider.`), sin cuentas ni backend, cubierto en el aviso legal. |
| Preguntas | **Mismo formato y mismo componente** que `aws-cert-study` (`preguntas.js`: `unica`, `multiple`, `ordenar`, `emparejar`, `dificil`), con campos añadidos (ver 4.3). Siempre **originales**: nunca preguntas reales de exámenes (NDA de Oracle, Broadcom, CNCF, HashiCorp…). |
| Contenido | Sin copiar documentación: se resume con palabras propias y se enlaza la fuente. Lo literal, corto y en `<blockquote>` con `<cite>`. |
| Logos | **Sin logos de terceros** (Java, Spring, Docker… son marcas con normas propias). Cada área tiene un color y un icono propio sencillo en SVG; los temas se identifican por nombre. |
| AWS | **Decidido por el usuario (2026-11-02):** los temas de AWS viven en su web dedicada (`aws-cert-study`) y aquí solo se **enlazan**: ni apuntes ni preguntas propias, y no se evalúan en esta web. |
| Vista predeterminada | **Decidido por el usuario (2026-11-02):** la **Telaraña** es la vista por defecto (es la temática del proyecto); las Cajas quedan como vista alternativa. |
| Licencia | **CC BY-SA 4.0** (D2, aceptada el 2026-11-02), igual que `aws-cert-study`; sustituye a la GPL-3.0 inicial. |
| Pie común | Enlace en `.footer-sitios` de las cuatro webs: "Kopi Tools · Apuntes AWS · Tech Spider · Kopi Chess · Prompt Quest · Sobre mí", y actualizar `kopi-docs/politicas.md`, `kopi/CLAUDE.md` (tabla de proyectos) y la web personal (D3, aceptada el 2026-11-02). |
| Contenido inicial | **Java y Spring son los temas fundacionales** del proyecto (D5, aceptada el 2026-11-02): ruta Java → Testing con Java → Spring → JPA/Hibernate, todos con `prioridad: 1`. |
| Nombre | **Tech Spider** (D1, elegido por el usuario el 2026-11-02 entre varias propuestas en inglés con *Spider*). Es el nombre visible (título, marca del menú, pie común); el repo sigue siendo `arquitechthor-spider`. |
| Un tema, un sitio | **Cada tema existe una sola vez** (D4, aceptada el 2026-11-02): los duplicados del árbol, con el mismo nombre o con otro, se fusionan en un nodo con su ubicación principal y "accesos ↗" en las demás (tabla 4.2). |
| Temas no técnicos | Área 12 con apuntes breves y **solo autoevaluación** (`evaluable: false`) (D6, aceptada el 2026-11-02), **excepto Scrum**: guía detallada (roles, eventos, artefactos, compromisos, valores, escalado), preguntas como cualquier tema técnico y **certificación temática** propia (p. ej. Professional Scrum Master I de Scrum.org; por verificar al llegar a la Fase 6). Kanban y Jira quedan con autoevaluación salvo que el usuario diga otra cosa. |
| Ampliación del área 13 | **Aprobada por el usuario (2026-11-02)** con los ajustes propuestos y ya aplicada en `docs/tecnologias.md`: el área pasa a llamarse **AI Engineering** ("Ingeniería de IA") con 5 bloques (Artificial Intelligence, AI-Assisted Software Engineering, AI Integration, AI in Production (LLMOps), AI Security & Governance). Detalle en "Cambios al árbol". |
| Certificaciones | Primero Oracle Java SE 21 Developer Professional (1Z0-830) y la de Spring de Broadcom/VMware; después CKAD y HashiCorp Terraform Associate (D7, aceptada el 2026-11-02). Códigos y temarios **por verificar** con las guías oficiales al llegar a la Fase 6. |

## 3. Decisiones pendientes (las resuelve el usuario)

| # | Pregunta | Propuesta |
|---|---|---|
| — | Ninguna abierta desde el 2026-11-02. Las nuevas se añaden aquí con el siguiente número (D8…). | — |

---

## 4. Modelo de datos

### 4.1 Estructura de ficheros

```
arquitechthor-spider/
├── index.html                # portada = mapa interactivo (telaraña / cajas) + panel de detalle
├── tema.html                 # página genérica de un nodo (?id=): resumen de un bloque o "Próximamente"
├── evaluacion.html           # test de un tema, bloque o área (?id=&n=10) y repaso de falladas (?repaso=1)
├── certificaciones.html      # lista de certificaciones temáticas (Fase 6)
├── simulacro.html            # simulacro de una certificación (?cert=) (Fase 6)
├── progreso.html             # mi progreso: radar por área, temas dominados, falladas (noindex)
├── aviso-legal.html
├── sitemap.xml               # generado con scripts/generar_sitemap.py
├── temas/<id>.html           # una página por tema publicado (copiada de la plantilla)
├── plantillas/tema.html
├── data/
│   ├── nodos.json            # árbol completo, lista plana: ÚNICA fuente de verdad
│   ├── certificaciones.json  # certificaciones temáticas (Fase 6)
│   ├── glosario.json         # siglas (tooltip y enlace a su ficha) y conceptos sin ficha propia
│   └── preguntas/<id>.json   # preguntas por tema
├── assets/
│   ├── datos.js              # cargador común (window.SpiderDatos): rutas, árbol, progreso
│   ├── arbol.js              # utilidades del árbol: hijos, ancestros, hojas, búsqueda, agregados
│   ├── mapa.js               # controlador de la portada: estado en la URL, migas, panel, autoevaluación
│   ├── telarana.js           # vista "Telaraña" (predeterminada): solo dibuja el SVG
│   ├── cajas.js              # vista "Cajas" (alternativa, tarea 3.6)
│   ├── radar.js              # gráfico de radar (progreso por área) en SVG propio
│   ├── preguntas.js          # copiado de aws-cert-study (window.SpiderPreguntas)
│   ├── quiz.js               # test al final de cada guía
│   ├── evaluacion.js         # test por rama y repaso
│   ├── simulacro.js          # Fase 6
│   ├── progreso.js
│   ├── siglas.js             # tooltips de siglas (se copia en la Fase 4, con siglas.json)
│   ├── nav.js                # menú móvil y aria-current (mismo bloque que en las otras webs)
│   ├── logo.svg              # logo propio (+ favicon-32.png y apple-touch-icon.png, generados de él)
│   └── iconos/areas/<id>.svg # iconos propios de las 13 áreas
├── scripts/
│   ├── importar_arbol.py     # tecnologias.md → nodos.json (hecho; solo con --forzar lo rehace)
│   ├── revisar_arbol.py      # validador del árbol (ver 4.4)
│   ├── revisar_preguntas.py  # validador de preguntas
│   ├── revisar_texto.py      # siglas con tooltip y enlaces entre temas (adaptado de aws-cert-study)
│   └── generar_sitemap.py
├── docs/
│   ├── tecnologias.md        # árbol original
│   └── PLAN.md               # este fichero
├── styles.css
├── CLAUDE.md                 # reglas del proyecto y flujo "rellenar un tema"
├── README.md
├── LICENSE
└── .nojekyll
```

### 4.2 `data/nodos.json`

Lista plana en el **orden de presentación**; el árbol se monta en el navegador a partir de
`padre`. Plana porque es más fácil de editar, de validar y de diferenciar en git que un JSON
anidado de 5 niveles.

Ejemplos reales (un área, un tema con acceso y un tema externo):

```json
{ "id": "fundamentals", "nombre": "Software Engineering Fundamentals",
  "nombreEs": "Fundamentos de ingeniería de software", "tipo": "area", "padre": "software-engineer",
  "area": "fundamentals", "color": "#5e8eed",
  "frase": "Lenguaje, principios de diseño, patrones, algoritmos y herramientas del día a día." }

{ "id": "oop", "nombre": "Object-Oriented Programming", "tipo": "tema",
  "padre": "programming-paradigms", "area": "fundamentals", "accesos": ["java"],
  "estado": "pendiente", "evaluable": true, "prioridad": 1, "alias": ["OOP", "POO"] }

{ "id": "sqs", "nombre": "SQS", "tipo": "tema", "padre": "aws-messaging", "area": "cloud",
  "accesos": ["messaging-event-streaming"], "estado": "pendiente", "evaluable": false,
  "prioridad": 2, "alias": ["Amazon SQS"],
  "externo": { "sitio": "aws-cert-study", "id": "sqs", "url": "../aws-cert-study/servicios/sqs.html" } }
```

Los campos opcionales **se omiten** cuando están vacíos o tienen su valor por defecto (`accesos`,
`alias`, `relacionados`, `externo`, `volatil`, `nombreEs`, `frase` en temas sin publicar,
`revisado`, `certificaciones`). El validador rechaza campos desconocidos.

| Campo | Uso |
|---|---|
| `id` | kebab-case, único, estable (es la URL y la clave del progreso; **nunca se renombra** tras publicar). En inglés, derivado del nombre; los de AWS coinciden con los de aws-cert-study. |
| `tipo` | `raiz`, `area`, `bloque` o `tema`. **`bloque`** = nodo que agrupa, con **ficha de presentación** pero sin preguntas propias (se evalúa su rama, ver 5.2): los hijos directos de un área y algunos de nivel 3 (las 7 categorías de AWS, Java Ecosystem de IA y Domain Knowledge); se muestra con `tema.html?id=`. **`tema`** = nodo con guía propia, tenga hijos o no (Java, Spring Data, LLMs…); TypeScript es un tema colgado directamente del área. Solo los temas llevan `evaluable` y `prioridad`; `estado`, `revisado` y `volatil` los llevan los temas y, cuando se publica su ficha, también áreas y bloques. |
| `padre` | ubicación principal en el mapa. |
| `accesos` | otros padres donde el nodo aparece como **acceso** (borde discontinuo y ↗, lleva al nodo real). Resuelve los duplicados sin copiar progreso ni preguntas: `solid` vive en "Principios de diseño" y tiene acceso en "Principios de arquitectura". En el padre del acceso se pinta **después de sus hijos propios**. |
| `area` | área de nivel 1; redundante con `padre` pero ahorra recorridos y el validador la comprueba. |
| `nombreCorto` | solo en áreas, obligatorio, como mucho 14 caracteres (Fundamentos, Testing, Backend, APIs, Datos, Arquitectura, Seguridad, DevOps, Nube, Observabilidad, Frontend, Profesional, IA): lo usa la telaraña en móvil, donde los 13 nombres completos no caben alrededor del centro. |
| `color` | solo en áreas (`#rrggbb`): 13 tonos repartidos por el círculo cromático con la misma luminosidad (HSL, L 65 %, S 80 %), legibles sobre el fondo oscuro. El icono está en `assets/iconos/areas/<id>.svg` (trazo `currentColor`, para usar como máscara CSS o en línea). |
| `frase` | 60–90 caracteres, qué es en una frase, sin repetir palabras de 4 letras o más del `nombre` ni el id (mismo criterio que `revisar_frases.py` de aws-cert-study). **Obligatoria en áreas y en sus hijos directos** (ya escritas); en el resto de temas, al publicarlos. Se ve en el mapa al pasar el ratón y en el panel de detalle. |
| `estado` | `pendiente` (página "Próximamente") o `publicado` (existe `temas/<id>.html`). |
| `evaluable` | `false` para nodos sin test (área 12 salvo Scrum, y los `externo` de AWS): solo autoevaluación. |
| `externo` | `{ "sitio": "aws-cert-study", "id": "s3", "url": "../aws-cert-study/servicios/s3.html" }` para los temas cuya guía vive en otra web (los de AWS). Un nodo `externo` es siempre `evaluable: false` y no tiene `temas/<id>.html` ni preguntas aquí. |
| `relacionados` | enlaces "ver también" en la guía y líneas finas en la vista telaraña. |
| `certificaciones` | atajo de lectura; la verdad está en `certificaciones.json` (el validador comprueba que coinciden). |
| `prioridad` | 1–3, para ordenar la cola de contenido y ofrecer el filtro "Lo esencial". |
| `revisado` | fecha (`AAAA-MM-DD`) de la última revisión de la guía contra sus fuentes; obligatoria al publicar. La guía la muestra como "Revisado el …". |
| `volatil` | `true` en temas que cambian rápido (toda el área 13, EU AI Act, GDPR, versiones de Java/Spring): el validador avisa si `revisado` tiene más de 6 meses. |

**Normalización en la importación (D4, aceptada: cada tema existe una sola vez):**

| Original | Resultado |
|---|---|
| `SOLID` (en Design Principles y en Architectural Principles) | un nodo `solid` bajo Design Principles + acceso en Architectural Principles |
| `Code Reviews` (Code Quality y Collaboration) | `code-reviews` bajo Code Quality + acceso en Collaboration |
| `Spring Security` (Spring Framework e IAM) | `spring-security` bajo Spring Framework + acceso en Identity & Access Management |
| `Object-Oriented Programming (OOP)` (Java) y `Object-Oriented Programming` (Paradigms) | un nodo `oop` bajo Programming Paradigms + acceso en Java |
| `HTTP Fundamentals` (Java Backend) y `HTTP / HTTPS` (Protocols) | `http` bajo Communication Protocols + acceso en Java Backend |
| `Amazon SQS`, `Amazon EventBridge` (Messaging) y `SQS`, `EventBridge` (AWS) | nodo bajo AWS › Messaging, acceso en Messaging & Event Streaming; `externo` a aws-cert-study |
| `AWS Cognito` (IAM), `AWS CloudFormation` (IaC), `DynamoDB (Key-Value / Document)` (NoSQL) | igual: nodo en la rama AWS + accesos |
| `TypeScript` (bloque sin hijos) | `tipo: tema` colgado directamente del área Frontend |
| `Software Engineer` (raíz) | `raiz` (`software-engineer`), es el centro de la telaraña |
| `1. Fundamentos de Ingeniería de Software` y `Programación` (los únicos en español en el `.md`) | `nombre` en inglés como el resto ("Software Engineering Fundamentals", "Programming") y el español en `nombreEs` |
| `AWS CDK` (IaC) | también es `externo` a aws-cert-study (servicio `cdk`) |
| `Amazon Web Services (AWS)` | bloque `aws` con `externo` a la portada de aws-cert-study |
| `Spring AI` (AI Engineering › AI Integration › Java Ecosystem) | vive ahí + acceso en Spring Framework |
| `GDPR` (7. Security › Compliance & Privacy) | vive ahí + acceso en AI Security & Governance (se muestra "GDPR (RGPD)") |

Los nombres de los niveles 1 y 2 reciben traducción (`nombreEs`) y se muestran así:
"Arquitectura y sistemas distribuidos (*Software Architecture & Distributed Systems*)".

### 4.2.1 Cambios al árbol (registro)

Cambios hechos sobre `docs/tecnologias.md` antes de la importación. Tras la Fase 1 los cambios se
hacen en `data/nodos.json` y se anotan aquí igualmente.

**2026-11-02: `nombreCorto` en las 13 áreas** (Fase 3, para la telaraña en móvil), añadido
directamente en `data/nodos.json` (el importador ya no se usa; con `--forzar` se perdería).

**2026-11-02: ampliación del área 13** (propuesta del usuario, ajustada y aprobada):
- "Emerging Technologies" → **AI Engineering**; dos bloques nuevos: **AI in Production (LLMOps)**
  y **AI Security & Governance**.
- La propuesta "LLM Fundamentals" no se crea: sus hijos cuelgan de **Large Language Models (LLMs)**
  (era el mismo tema en dos nodos hermanos).
- Fusiones para que cada nodo dé para una guía: Tokens + Context Window → **Tokens & Context
  Window**; Temperature → **Sampling Parameters (Temperature, Top-p)**; Regression Testing for
  Prompts → dentro de **Evals & Golden Datasets**; Cost per Request + Latency → **Cost & Latency**
  (medir en producción; la elección queda en Model Selection).
- **Comparativas como sección de guía**, no como nodo: "RAG vs Fine-Tuning" (en las guías de RAG y
  de Fine-Tuning) y "Vibe Coding vs Agentic Engineering" (en Agentic Development). "Inference vs
  Training" sí es nodo (concepto base).
- Nuevo nodo **Fine-Tuning** (la comparación con RAG necesitaba que existiera).
- `Code Generation` (original) se integra en **AI Coding Assistants**; Spec-Driven Development,
  Project Context Files y Skills & Subagents cuelgan de **Agentic Development**.
- `MCP › Tools, Resources and Prompts` se integra en la guía de **Model Context Protocol (MCP)**;
  `pgvector` se queda como hijo de Vector Databases (tecnología concreta, deja sitio a otras).
- Nombre neutral: **Project Context Files (CLAUDE.md, AGENTS.md…)**.
- **GDPR** sale de IA: vive en un bloque nuevo del área 7, **Compliance & Privacy** (por ahora
  con un solo hijo; ahí irían otros marcos como ISO 27001 si se añaden), con acceso desde AI
  Security & Governance. **Spring AI** vive en Java Ecosystem con acceso en Spring Framework.
- Relacionados (hilos en la telaraña, no duplicados): Tracing & Observability ↔ OpenTelemetry y
  Distributed Tracing; Rate Limits, Retries & Fallbacks ↔ Resilience Patterns; OWASP Top 10 for LLM
  Applications ↔ OWASP Top 10; pgvector ↔ PostgreSQL; Embeddings ↔ Semantic & Hybrid Search;
  Least Privilege for Agents ↔ Authorization; Prompt Caching ↔ Caching.
- Resultado: 364 nodos (antes 322), 276 hojas. Ningún nodo pasa de 9 hijos ni ningún área de 6
  bloques, así que la telaraña de dos anillos no cambia.

**2026-11-03: piloto de IA** (pedido por el usuario, con la regla "todo nodo tiene ficha"):
- `artificial-intelligence` pasa de **bloque a tema** (tiene conocimiento propio: qué es la IA y
  cómo encajan IA, ML, DL e IA generativa), con alias IA y AI.
- Nuevos temas **Machine Learning** (`machine-learning`, "Aprendizaje automático") y **Deep
  Learning** (`deep-learning`, "Aprendizaje profundo") como **hermanos** de Generative AI bajo
  Inteligencia artificial, no anidados (IA › ML › DL › IA generativa › LLMs enterraría LLMs cinco
  niveles abajo; la jerarquía la explica la ficha de IA). Criterio aprobado por el usuario.
- `nombreEs` nuevos: Generative AI → "IA generativa", AI Agents → "Agentes de IA".
- Publicadas las fichas del área `ai` (presentación) y de 6 temas (IA, ML, DL, IA generativa, LLMs,
  Agentes de IA), con 57 preguntas. Resultado: 357 nodos (63 bloques, 280 temas).

### 4.3 Preguntas: `data/preguntas/<id>.json`

Formato de `aws-cert-study` sin cambios en lo común, para copiar `preguntas.js` tal cual:

```json
{
  "id": "spring-boot-001",
  "tipo": "unica",
  "nivel": 2,
  "certificaciones": ["spring-professional"],
  "dominio": "Spring Boot",
  "enunciado": "…",
  "opciones": ["…", "…", "…", "…"],
  "correctas": [1],
  "explicacion": "Por qué la correcta lo es y por qué las demás no.",
  "codigo": "@SpringBootApplication\npublic class App { … }",
  "fuentes": ["https://docs.spring.io/…"]
}
```

Diferencias con `aws-cert-study`:
- `certificaciones` y `dominio` son **opcionales** (la mayoría de temas no tiene certificación).
- `nivel` 1–3 (básico, intermedio, avanzado) en lugar de solo `dificil`; `dificil: true` se
  mantiene como alias de `nivel: 3` para la etiqueta ⚠.
- `codigo` (opcional): bloque de código monoespaciado bajo el enunciado, imprescindible en Java,
  SQL, Bash o YAML. Se resalta con CSS mínimo (sin librería), con `white-space: pre` y scroll
  horizontal **dentro** del bloque (nunca de la página en móvil).
- Mínimo **5 preguntas** por tema publicado y evaluable; objetivo 8–15 en los temas con prioridad 1.
- Si una pregunta toca dos temas, va en el fichero del tema principal con `"temas": ["jpa",
  "transaction-management"]` para que cuente en los dos al evaluar ramas.

### 4.4 Validador `scripts/revisar_arbol.py`

Hecho en la Fase 1. Se ejecuta con `python scripts/revisar_arbol.py` tras **cualquier** cambio en
`data/nodos.json`, en `temas/` o en `data/preguntas/`.

Falla (código ≠ 0) si: hay ids repetidos o con mayúsculas/espacios; campos desconocidos; no hay
exactamente una raíz; un `padre` o `acceso` no existe (o el acceso está en su propio padre); hay
ciclos; `area` no coincide con el ancestro de nivel 1; un área no tiene color `#rrggbb` o icono;
un área o bloque no tiene hijos; falta la `frase` de un área o de un hijo directo de un área; una
`frase` sale de 60–90 caracteres o repite palabras del nombre; un relacionado no existe o no es
recíproco; un `externo` apunta a un id que no existe en `aws-cert-study/data/servicios.json` (si el
repo hermano está en `../`), es evaluable o tiene guía o preguntas aquí; un nodo `publicado` no
tiene `temas/<id>.html`, `frase` o `revisado`, o al revés (página sin publicar); un tema evaluable
publicado tiene menos de 5 preguntas; hay páginas o ficheros de preguntas que no corresponden a
ningún nodo. **Avisa** (sin fallar) si un tema `volatil` lleva más de 6 meses sin revisar.
Imprime un resumen por área: bloques, temas, evaluables, publicados y preguntas.

### 4.5 Progreso en `localStorage`

| Clave | Contenido |
|---|---|
| `spider.progreso` | por tema: `{ aciertos: [ids], fallos: [ids], ultimo: "2026-11-02" }` (mismo esquema que `apuntes-aws.progreso`, para reutilizar `preguntas.js`) |
| `spider.autoevaluacion` | por nodo: 0–4 ("no lo conozco", "me suena", "lo he usado", "lo domino", "podría enseñarlo") |
| `spider.evaluaciones` | historial de tests por rama (id, fecha, nota, nº preguntas) |
| `spider.simulacros` | historial de simulacros (Fase 6) |
| `spider.vista` | preferencias: vista (cajas/telaraña), color por (área/progreso/autoevaluación), filtros |

**Estado derivado de un tema** (nunca guardado en JSON): *Sin empezar* → *En curso* (alguna
respondida) → *Superado* (≥ 80 % de sus preguntas acertadas en el último intento de cada una) →
*Dominado* (todas acertadas). En nodos no evaluables cuenta la autoevaluación.
**Agregado de una rama** = media ponderada por número de temas evaluables de sus descendientes
(cada nodo cuenta una vez aunque tenga accesos). Botones "Exportar / Importar mi progreso"
(JSON) en `progreso.html` para no perderlo al cambiar de navegador.

---

## 5. Diseño de la experiencia

### 5.1 Portada: el mapa (pieza central)

Dos vistas del mismo árbol con un conmutador "Telaraña | Cajas". **La Telaraña es la
predeterminada** (decisión del usuario: es la temática del proyecto); si se elige Cajas, se
recuerda en `spider.vista`. Las dos comparten el nodo enfocado, el panel de detalle, el buscador,
los filtros y el color, así que cambiar de vista no pierde el contexto.

**A. Vista "Telaraña" (predeterminada).** Una telaraña **enfocada**: el nodo enfocado en el
centro, sus hijos en el primer anillo y sus nietos en el segundo, unidos por hilos radiales; los
anillos concéntricos de fondo dibujan la tela.

```
                    Spring Cloud      Spring Batch
        Spring Security ↗   \           /    Spring WebFlux
                       \   ·──·────·──·   /
      Spring MVC ───────●      SPRING      ●─────── Spring Data ─── JPA
                       /     FRAMEWORK      \                   \── MongoDB
      Spring Boot ●●●○ ·──·────·──·  Spring Core
                          Spring Context
  Inicio › Backend y Spring › Spring Framework        [buscar…] [Color: área ▾]
```

- **Nivel inicial:** "Software Engineer" en el centro y las 13 áreas como patas de la araña, cada
  una con su color, icono y un arco de progreso; sus 56 bloques en el anillo exterior. De un
  vistazo se ve el conjunto entero.
- **Solo dos anillos a la vez:** nunca hay más de unas decenas de etiquetas en pantalla (las
  áreas tienen como mucho 6 bloques y los bloques como mucho 9 hijos; el caso más denso es la raíz, con 13 áreas y 56 bloques), así que se lee bien
  también en móvil. Los niveles más profundos aparecen al recentrar.
- **Clic en un nodo con hijos = recentrar** en él (giro y acercamiento animados, desactivados con
  `prefers-reduced-motion`). **Clic en el centro o en las migas de pan = subir**; `Esc` sube un
  nivel.
- **Hilos entre ramas:** los `accesos` (↗) y los `relacionados` del nodo enfocado se dibujan como
  hilos finos y curvos hacia su sitio real; al pasar por un hilo se nombra el destino y un clic
  viaja hasta él. Es lo que las cajas no pueden mostrar y lo que justifica la "telaraña".
- **"Vista general" opcional** (pantallas anchas): el árbol radial completo (13 sectores, todos
  los temas en el borde, etiquetas solo al pasar el ratón) como mapa de orientación; un clic
  recentra la telaraña enfocada en ese punto.
- **Etiquetas** (cambiado en el prototipo, 2026-11-02): las del **primer anillo** son
  horizontales, a izquierda o derecha según el lado del círculo (arriba y abajo, centradas),
  partidas en líneas sin dejar "y"/"de" colgando. Las del **segundo anillo** van **radiales**
  (giradas en la dirección del hilo y siempre legibles de izquierda a derecha), recortadas a 26
  caracteres con el nombre completo en `<title>`: con hasta 56 nodos en el anillo exterior (la
  raíz) las horizontales se pisaban arriba y abajo; las radiales caben siempre. El texto del
  centro ajusta el radio del círculo y la letra a su longitud. El `viewBox` se ajusta al
  contenido (cuadrado centrado en el nodo enfocado), así que una rama con pocos nodos no queda
  pequeña.
- **Móvil (≤ 760 px):** la misma telaraña enfocada a todo el ancho, con letra más grande, el
  segundo anillo solo como puntos (sin etiquetas) y el panel con la lista "Contiene" debajo como
  respaldo legible. En la raíz, las áreas usan su `nombreCorto` (Fundamentos, Testing, Backend…).
  Sin scroll horizontal a 375 px.
- **Tras la primera revisión del usuario (2026-11-02):** letra más grande, lienzo sin tope de
  altura (ocupa todo el ancho de su columna; la página hace scroll), las áreas de la raíz con su
  `nombreCorto` también en escritorio (los nombres completos se pisaban) y, **debajo de la
  telaraña, las tarjetas de las 13 áreas** (icono, frase, bloques y número de temas): el área y
  cada bloque enlazan a la telaraña enfocada en ellos y la página sube al mapa.
- **Cabecera de la portada (petición del usuario):** se mantiene el hero de la Fase 2 (etiqueta,
  título, descripción y botones "Explorar la telaraña", "Ver las áreas" y "Apuntes AWS"), algo más
  bajo, encima de la telaraña. Menú: Inicio · Telaraña · Áreas · Sobre mí.
- **Implementación:** SVG generado a mano en `assets/telarana.js` (dos anillos = ángulos
  repartidos según el número de descendientes; no hace falta librería). Para la "Vista general"
  se valora `d3-hierarchy` en copia local (MIT) si el layout a mano se complica.

**B. Vista "Cajas" (alternativa).** Cajas dentro de cajas con zoom semántico:

```
┌ Software Engineer ─────────────────────────────── [buscar…] [Color: área ▾] ┐
│ Inicio › Backend y Spring                                                   │
│ ┌ Java Backend ──────┐ ┌ Spring Framework ──────────────────────────────┐   │
│ │ HTTP  Servlet API  │ │ Core  Context  [Boot ●●●○]  MVC                │   │
│ │ DI    Configuración│ │ ┌ Spring Data ┐  Security↗  Cloud  Batch       │   │
│ └────────────────────┘ │ │ JPA  MongoDB│  WebFlux                       │   │
│ ┌ ORM y persistencia ┐ │ └─────────────┘                                │   │
│ │ JPA Hibernate JDBC │ └────────────────────────────────────────────────┘   │
│ │ Transacciones      │ ┌ Build y dependencias ┐                             │
│ └────────────────────┘ │ Maven Gradle Deps     │                            │
│                        └───────────────────────┘                             │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Siempre dos niveles:** el nodo enfocado y sus hijos, con los nietos como chips dentro de cada
  hijo. Clic en una caja = entrar (View Transitions API si existe).
- **Tamaño de las cajas** proporcional al número de temas de la rama (como un *treemap*), con
  mínimos y máximos; maquetado con CSS Grid (`grid-column: span n`).
- **Móvil:** una columna; los nietos como chips con salto de línea.
- Se mantiene porque es la más cómoda para **leer listas** y para lectores de pantalla (la
  Telaraña enlaza a ella con "Ver como lista").

**Común a las dos vistas:**
- **URL:** el nodo enfocado va en `?n=spring-framework` (el botón atrás y los enlaces compartidos
  funcionan), junto con la vista y los filtros (`?n=&v=cajas&q=&cert=&color=`).
- **Clic en un tema (hoja) = panel de detalle** (lateral en escritorio, hoja inferior en móvil):
  nombre, `frase`, estado, mi autoevaluación (5 puntos clicables), progreso del test,
  certificaciones en las que entra, relacionados y botones **"Leer la guía"** y **"Evaluarme"**.
  En los nodos con hijos, "Evaluar esta rama (N preguntas)"; en los de AWS, solo
  "Guía en Apuntes AWS ↗".
- **Color por** (selector): *área*, *progreso* (4 tonos, de gris "sin empezar" a verde
  "dominado") o *autoevaluación*. Leyenda siempre visible.
- **Marcas:** ● progreso, ↗ acceso (el nodo vive en otra rama), ☁ guía en aws-cert-study,
  "Próximamente" atenuado (sigue siendo clicable).
- **Buscador:** filtra en vivo por nombre, `alias` y `frase`; resalta los resultados y una lista
  desplegable salta al nodo (la Telaraña se recentra en su padre).
- **Filtros:** certificación (resalta solo su temario, ver Fase 6), estado, prioridad ("Lo
  esencial").
- **Accesibilidad:** cada nodo del SVG es un `<a>` enfocable con `aria-label` (nombre, estado,
  progreso); Tab recorre el anillo en el sentido de las agujas del reloj y las flechas giran por
  él; el foco vuelve al nodo de origen al subir; contraste AA y estado también en texto o icono,
  nunca solo en color.

**C. Radar "Mi telaraña".** En la portada (bajo el mapa, si hay progreso) y en `progreso.html`:
gráfico de radar de 13 ejes (uno por área) con dos capas, **resultado en tests** y
**autoevaluación**. Es el resumen de "cómo es mi perfil". Clic en un eje = enfocar esa área en el
mapa. SVG propio en `assets/radar.js`, sin librería.

### 5.2 Fichas (`temas/<id>.html`)

**Todo nodo tiene ficha** (decisión del usuario, 2026-11-03), también los que solo agrupan, para
que se entienda qué son y por qué importan:

| Tipo | Ficha | Evaluación |
|---|---|---|
| **Tema** (con o sin subtemas con ficha) | Guía completa (estructura de abajo) | Propia (mínimo 5, objetivo 8–15) y, si tiene subtemas publicados, "Evaluar esta rama" |
| **Bloque o área** | **Presentación**: qué es, qué significan sus siglas, por qué importa (uso real, peso en el mercado), qué contiene y por dónde empezar | Sin preguntas propias: "Evaluar esta rama" junta las de sus temas |

**Criterio bloque → tema:** un bloque pasa a ser tema cuando tiene **conocimiento propio que no
cubren sus hijos** (ejemplo: "Bases de datos relacionales (SQL)": el modelo relacional, el lenguaje
SQL y su peso en el mercado no caben en las fichas de PostgreSQL o MySQL). Si solo reúne cosas que
se explican por separado (Maven y Gradle), se queda como bloque con su presentación. Pendiente: una
pasada por los 63 bloques con la lista de candidatos para que decida el usuario (tarea 4.5).
**No enterrar temas:** se prefiere la ubicación más plana que siga siendo correcta; la jerarquía
conceptual se explica en la ficha del padre.

Copiada de `plantillas/tema.html`. La cabecera (migas, icono, nombre y original, "En una frase",
fecha de revisión, botones "Evaluarme", "Ver en el mapa" y "Evaluar esta rama"), "Qué contiene"
(hijos como cajas) y "Relacionados" los pinta `assets/tema.js` desde `nodos.json`. Estructura de
un tema:
1. Cabecera: migas de pan (ruta en el árbol, enlazadas al mapa), nombre, "En una frase:",
   certificaciones, prioridad, autoevaluación.
2. **Qué es y para qué sirve.**
3. **Conceptos clave** (lista o tabla).
4. **Cómo se usa** (ejemplo mínimo de código o configuración, con palabras propias).
5. **Errores frecuentes y buenas prácticas.**
6. **Comparativas / cuándo elegirlo** (p. ej. JPA vs JDBC, Kafka vs RabbitMQ) cuando aplique.
7. **Relacionados** (enlaces a otros temas; los pendientes van a `tema.html?id=`).
8. **Fuentes y documentación oficial.**
9. **Evaluación** (`<div class="quiz" data-quiz="<id>">`) con 5–15 preguntas.

Mismas reglas de contenido que aws-cert-study (enlazar la primera mención de otro tema por
sección, nada copiado), con siglas y conceptos así:
- **Siglas:** se escriben tal cual ("IA", "LLM"). `assets/siglas.js` las marca **al cargar** desde
  `data/glosario.json` (no hay `revisar_texto.py`): tooltip con el inglés y una explicación, y si la
  sigla tiene ficha o concepto (`enlace`), su primera aparición en cada sección enlaza a ella
  (salvo en su propia ficha). Una sigla nueva solo necesita su entrada en el glosario. En las
  preguntas se marcan sin enlace.
- **Conceptos** (términos que no merecen nodo: modelo, IA agéntica, herramienta, orquestación):
  viven en `glosario.json` con definición propia, el tema que los trata a fondo, relacionados y
  fuentes; se ven en `glosario.html` (con ancla por concepto) y en las fichas se enlazan a mano con
  `<a class="concepto" data-concepto="<id>">`, que recibe el mismo tooltip. Sus preguntas van en la
  evaluación del tema que los trata.

`tema.html?id=` genérica: para un **bloque o área** muestra su descripción, sus hijos como
tarjetas y "Evaluar esta rama"; para un **tema pendiente** muestra "Próximamente" con su frase,
sus relacionados y un enlace al mapa; para un tema publicado redirige a `temas/<id>.html`; para
uno `externo` enlaza a aws-cert-study.

### 5.3 Evaluación por tema y por rama (`evaluacion.html`)

- **Hecho (2026-11-03):** el test al final de cada ficha (`data-quiz`) y
  `evaluacion.html?id=<nodo>` con **todas** las preguntas de los temas publicados y evaluables de
  la rama, agrupadas por tema (`data-rama`). Cada respuesta cuenta en el progreso de su tema
  (`spider.progreso`), se responda donde se responda. Lo de abajo (muestra al azar, desglose,
  repaso, diagnóstico) sigue pendiente.
- **Tema:** el test al final de cada guía (como aws-cert-study) y también en
  `evaluacion.html?id=<tema>`.
- **Rama:** `evaluacion.html?id=<bloque|area>&n=10|20|40&nivel=1-3` saca preguntas al azar de
  todos los temas evaluables de la rama, **repartidas por tema** (como el simulacro reparte por
  dominio). Muestra el resultado **desglosado por tema** con enlace a cada guía, y pinta el
  resultado en el mapa al volver.
- **Repaso de falladas:** `evaluacion.html?repaso=1[&id=<rama>]`, con la cola `fallos` de
  `spider.progreso`.
- **Modo "Diagnóstico"** (atajo en la portada): 1–2 preguntas de nivel 1 por bloque de un área,
  para colorear el mapa rápido la primera vez.

### 5.4 Certificaciones temáticas (Fase 6, preparadas desde el modelo)

`data/certificaciones.json`:

```json
{
  "codigo": "1Z0-830",
  "id": "java-ocp-21",
  "nombre": "Oracle Certified Professional: Java SE 21 Developer",
  "emisor": "Oracle",
  "estado": "vigente",
  "guia": "https://…",
  "examen": { "preguntas": 50, "minutos": 120, "aprobado": 68 },
  "dominios": [
    { "id": 1, "nombre": "Tipos de datos y operadores", "nombreEn": "…", "peso": 10,
      "temas": ["java-language-fundamentals"] }
  ]
}
```

- Cada dominio enlaza a **temas del mapa** (`temas`). Así una certificación es un **filtro del
  mapa** (resalta su temario y atenúa el resto), una **barra de preparación** (progreso de sus
  temas ponderado por peso) y un **simulacro** con preguntas repartidas por peso de dominio,
  tiempo real y corrección por dominio (se adapta `simulacro.js` de aws-cert-study).
- Las preguntas se etiquetan con `certificaciones` + `dominio` como en aws-cert-study.
- Las certificaciones de AWS **no** se modelan aquí: se enlazan a aws-cert-study.
- Añadir una certificación nueva = una entrada en el JSON + preguntas etiquetadas; nada de código.
- Antes de modelar cada una: verificar código, temario, pesos y duración con la guía oficial
  (cambian con frecuencia) y anotarlo en "Decisiones" con la fecha.

### 5.5 Menú y pie

Menú (política común): marca a la izquierda; enlaces **Inicio** (mapa) · Evaluación ·
Certificaciones (desde la Fase 6) · Mi progreso · **Sobre mí** (último). Pie con aviso legal,
licencia y la línea `.footer-sitios` común (D3).

### 5.6 Integración con aws-cert-study

**Decisión del usuario (2026-11-02):** los temas de AWS van en su web dedicada y aquí solo se
enlazan.
- Cada nodo de AWS tiene `externo` con la URL de su guía; en el mapa lleva la marca ☁ y el panel
  de detalle solo ofrece "Guía en Apuntes AWS ↗" (sin "Evaluarme": se evalúa allí).
- Quedan fuera de los tests por rama y de los agregados de progreso de esta web; en el radar el
  área "Cloud Computing" usa la autoevaluación.
- **Opcional (mejora, Fase 8):** como las dos webs comparten origen (`arquitechthor.github.io`) y,
  por tanto, `localStorage`, el mapa podría leer en solo lectura `apuntes-aws.progreso` para
  pintar como estudiados los servicios ya hechos allí. No se copia ni se evalúa nada.

---

## 6. Fases y tareas

### Fase 0: alcance y decisiones
- [x] 0.1 Analizar `docs/tecnologias.md` y `aws-cert-study`; redactar este plan.
- [x] 0.2 El usuario resuelve D1–D7 (2026-11-02).
- [x] 0.3 Cambiar la licencia a CC BY-SA 4.0 (LICENSE + README), aceptada en D2.

### Fase 1: datos
Completa el 2026-11-02.
- [x] 1.0 Ampliación del área 13 aplicada en `docs/tecnologias.md`.
- [x] 1.1 `scripts/importar_arbol.py`: parsea el árbol del `.md` (profundidad por la posición de
      `├──`/`└──`), genera ids, aplica la tabla de normalización 4.2 y escribe `data/nodos.json`.
      Se niega a sobrescribirlo sin `--forzar`.
- [x] 1.2 Colores de las 13 áreas (en el propio nodo, sin `areas.json` aparte para no duplicar
      nombres) e iconos SVG propios en `assets/iconos/areas/`, revisados en una captura sobre el
      fondo oscuro.
- [x] 1.3 `nombreEs` y `frase` de las 13 áreas y sus 56 hijos directos; `nombreEs` también de los
      bloques de nivel 3.
- [x] 1.4 `externo` (19 servicios de la rama AWS + CDK + el bloque AWS), `evaluable: false` (área 12
      salvo Scrum, y los externos), `prioridad: 1` (33 temas: Java, paradigmas, testing en Java,
      Spring, JPA/Hibernate/transacciones y Scrum; el resto 2), `volatil: true` (área 13, GDPR,
      Modern Java y Spring Boot), alias (siglas y nombres de las apariciones fusionadas) y 19 pares
      de relacionados.
- [x] 1.5 `scripts/revisar_arbol.py` (validaciones de 4.4) en verde.

### Fase 2: esqueleto publicado
- [x] 2.1 `styles.css` (base, menú, botones, hero, tarjetas, chips, siglas, páginas interiores y
      pie de aws-cert-study, sin lo específico de AWS, más las tarjetas de área) y `nav.js` copiados;
      menú ("Inicio · Áreas · Sobre mí" por ahora) y pie con la línea común de cuatro webs.
      `siglas.js` se trae en la Fase 4, cuando haya glosario y páginas que lo usen.
- [x] 2.2 `assets/datos.js` (`SpiderDatos`): carga de `nodos.json` con rutas relativas y caché,
      `hijos` (propios + accesos), `temasDe()`, nombre "español (original)", icono del área como
      máscara CSS y `leer`/`guardar` de las claves `spider.*` con `try/catch`.
- [x] 2.3 `aviso-legal.html` (sin afiliación con los titulares de las tecnologías, marcas, preguntas
      originales, exactitud y temas legales, licencia, `localStorage` `spider.*`, GitHub Pages).
- [x] 2.4 `CLAUDE.md` del repo, `README.md`, `.nojekyll`; logo propio (`assets/logo.svg`) y favicons
      PNG generados de él con Chrome sin interfaz. Portada provisional con las 13 áreas
      (`assets/inicio.js`), probada a escritorio y a 375 px (sin scroll horizontal).
- [x] 2.5 GitHub Pages activado (main / raíz) y URL publicada comprobada.
- [ ] 2.6 Fuera del repo. Hecho: fila de Tech Spider en la tabla de `kopi/CLAUDE.md` (y en el
      párrafo de dominios). **2026-11-03 (publicado):** enlace en el `.footer-sitios`
      de `kopi-web`, `aws-cert-study` (incluida `plantillas/servicio.html`),
      `arquitechthor.github.io` y `kopi-chess` (plantilla Thymeleaf, clave `sites.techSpider` y
      `HomePageTest`); en la web personal, además, sección `#tech-spider`, entrada en "Mis
      proyectos" y botón en `#proyectos`. El pie común ya era "Kopi Tools · Apuntes AWS · Kopi
      Chess · Prompt Quest · Sobre mí"; queda **"Kopi Tools · Apuntes AWS · Tech Spider · Kopi
      Chess · Prompt Quest · Sobre mí"** (también en el pie de Tech Spider). Prompt Quest no
      tiene el pie común. **Falta solo** `kopi-docs/politicas.md` (no versionado, en otro ordenador:
      pendiente hasta trabajar en él).

### Fase 3: el mapa
- [x] 3.1 `arbol.js` (`SpiderArbol`): ancestros, ruta, área, accesos y búsqueda sin tildes
      (nombre, alias y frase). Los hijos con accesos y `temasDe()` ya estaban en `datos.js`. Los
      agregados de progreso se añaden con la 3.5 ("Color por progreso").
- [x] 3.2 Vista **Telaraña** (prototipo, pendiente de revisión): dos anillos con sectores según el
      número de nietos, tela de anillos cóncavos, enlaces del color del área, nodos con anillo
      doble si contienen más, accesos con borde discontinuo y ↗, ☁ para AWS, hilos discontinuos
      entre relacionados a la vista, resaltado de la rama al pasar el ratón o el foco y animación
      de entrada (sin ella con `prefers-reduced-motion`).
- [x] 3.3 Navegación: clic en un nodo con hijos = entrar, en una hoja = seleccionarla, en el
      centro = subir; migas de pan; estado en la URL (`?n=&s=`) con historial (atrás/adelante);
      cada nodo es un `<a href>` real; Tab en el sentido de las agujas del reloj, flechas por el
      anillo, Esc sube (o quita la selección) y el foco vuelve a la rama de la que se viene.
      Comprobado con una prueba automática en Chrome sin interfaz.
- [x] 3.4b Tarjetas de áreas debajo de la telaraña, enlazadas a ella (petición del usuario).
      **Retiradas el 2026-11-03** (decisión del usuario): la vista Cajas en la raíz las sustituye
      con el mismo aspecto. Fuera también el enlace "Áreas" del menú (portada y aviso legal); el
      botón "Ver las áreas" de la cabecera pasa a "Ver como cajas".
- [x] 3.4 Panel de detalle (lateral y pegado en escritorio, debajo en móvil): tipo y área,
      nombre, frase, estado, "Lo esencial", "Mi nivel" (0–4, `spider.autoevaluacion`; pulsar el
      mismo número lo quita), guía y evaluación (desactivadas hasta las fases 4 y 5; AWS enlaza a
      su guía), "Contiene", "Vive en" / "También aparece en" (accesos) y "Relacionados".
- [x] 3.5 (2026-11-03, publicada) Barra sobre la telaraña:
      buscador *combobox* (nombre, alias y frase; lista de 12 con tipo y ruta; flechas, Enter y
      Esc; al elegir, la telaraña se centra en el padre y el foco pasa al nodo), "Color por"
      **Área / Mi nivel** (rojo → verde, gris sin marcar; ramas con la media de sus temas marcados,
      también en el panel como "Mi nivel medio"), filtros **Estado** (publicado, próximamente,
      Apuntes AWS) y **Lo esencial**, "Quitar filtros" y resumen en texto con `aria-live`. Lo que
      no pasa se atenúa (sigue pulsable); las coincidencias llevan halo y lo dicen en su
      `aria-label`. Estado en la URL (`q`, `color=nivel`, `estado`, `esencial=1`) con
      `replaceState`, conservado por todos los enlaces. Leyenda de color siempre visible.
      Comprobado con una prueba automática en Chrome sin interfaz (18 comprobaciones) y a 375 px.
      **Aplazado:** "Color por progreso" a la Fase 5 (aún no hay evaluaciones) y el filtro de
      certificación a la Fase 6.
- [x] 3.6 Vista **Cajas** (`cajas.js`, 2026-11-03): el nodo enfocado como cabecera con "▲ Subir a…",
      sus hijos como cajas (borde y fondo del color, frase) y los nietos como chips ("· N" si
      contienen más; ↗ y borde discontinuo para accesos, ☁ para AWS). Ancho de cada caja con
      `flex-grow` según los temas de su rama (treemap sencillo; cada fila se llena); una columna
      por debajo de 560 px. Conmutador "Telaraña | Cajas" que conserva nodo, selección, búsqueda,
      color y filtros; vista en la URL (`v=cajas`) y recordada en `spider.vista` junto con el
      color (la URL manda). Buscador, filtros, "Color por" y panel funcionan igual en las dos
      vistas (`decorar()` sobre `[data-decora]`); Esc sube; leyenda con lo propio de cada vista.
      Entrada con fundido CSS (`.cajas-entra`, sin él con `prefers-reduced-motion`): la View
      Transitions API se descartó porque su callback asíncrono dejaba el DOM sin actualizar en
      Chrome sin interfaz. Prueba automática (16 comprobaciones) y 375 px sin scroll horizontal.
      La telaraña no tiene un enlace aparte "Ver como lista": el conmutador cumple esa función.
      **Ajuste del usuario (2026-11-03):** aspecto de las antiguas tarjetas de áreas (superficie
      neutra, borde superior del color, icono del área en las cajas de áreas y en la cabecera,
      nombre original debajo del título) y chips grises sin el recuento "· N"; con "Color por:
      Mi nivel" el borde del chip toma el color de su nivel. Ni recuento de temas ni de
      evaluaciones en las cajas.
- [ ] 3.7 Responsive (375 px sin scroll horizontal, telaraña reducida + lista en móvil),
      `prefers-reduced-motion`, revisión con lector de pantalla y teclado.
- [ ] 3.8 Radar "Mi telaraña" (`radar.js`).
- [ ] 3.9 "Vista general" radial completa (pantallas anchas); puede ir después de la Fase 5.

### Fase 4: guías
- [x] 4.1 (2026-11-03) `plantillas/tema.html`, `assets/tema.js` y `tema.html?id=` genérica
      ("Ficha próximamente" con lo que contiene y sus relacionados; redirige si ya está publicada
      o es de AWS). El panel del mapa enlaza siempre a la ficha.
- [x] 4.2 (2026-11-03) Siglas y conceptos **sin** `revisar_texto.py`: `data/glosario.json` +
      `assets/siglas.js` (marcado al cargar, enlace a la ficha) y `glosario.html`. El validador
      comprueba el glosario.
- [ ] 4.3 `scripts/generar_sitemap.py`.
- [x] 4.4 Piloto: en lugar de 3 guías de Java, el usuario pidió el de IA (2026-11-03): ficha de
      presentación del área `ai` y 6 temas con 71 preguntas. **Pendiente de revisión del usuario.**
- [ ] 4.5 Pasada por los 63 bloques con el criterio bloque → tema (5.2): lista de candidatos para
      que decida el usuario.

### Fase 5: evaluación
- [x] 5.1 (2026-11-03) `preguntas.js` y `quiz.js` copiados y adaptados (`codigo`, `nivel`,
      progreso por tema, evaluación de rama); sin la exportación a Noria (es de Kopi Tools).
- [x] 5.2 (2026-11-03) Dentro de `scripts/revisar_arbol.py` (no un script aparte): ids
      `<tema>-NNN`, tipos, campos, `correctas` en rango, permutación en "ordenar", mínimo por tema
      y `temas` existentes. Falta el aviso de reparto de la correcta entre posiciones.
- [ ] 5.3 `evaluacion.html`: test por rama, desglose por tema, repaso de falladas, diagnóstico.
- [x] 5.4 Excluir los temas `externo` (AWS) de los tests por rama (hecho en `quiz.js`); los agregados llegarán con 5.6.
- [ ] 5.5 `progreso.html`: radar, lista por área, falladas, historial, exportar/importar.

### Fase 6: certificaciones temáticas
- [ ] 6.1 Verificar temario oficial de la primera certificación (D7) y escribir su entrada.
- [ ] 6.2 Filtro `?cert=` en el mapa y barra de preparación.
- [ ] 6.3 `certificaciones.html` y `simulacro.html` (adaptado de aws-cert-study).
- [ ] 6.4 Etiquetar preguntas existentes y completar hasta poder hacer un simulacro completo.
- [ ] 6.5 Certificación de Scrum (decisión D6): verificar emisor, temario y formato (p. ej. PSM I
      de Scrum.org) y modelarla como las demás.
- [ ] 6.6 Siguientes certificaciones, una por una (CKAD, Terraform, las propuestas del usuario).

### Fase 7: contenido (iterativa, la más larga)

Cola por prioridad; cada tema sigue el flujo de `CLAUDE.md` (investigar en documentación
oficial → copiar plantilla → apuntes → 5–15 preguntas → `estado: publicado` → validadores →
sitemap → probar en navegador → commit y push a `main`).

| Orden | Ruta | Temas |
|---|---|---|
| 1 | Java | los 9 temas de Java + Programming Paradigms |
| 2 | Testing en Java | Unit/Integration Testing, Test Doubles, Test Pyramid, TDD, JUnit 5, Mockito, AssertJ, Testcontainers |
| 3 | Spring | Spring Core, Context, Boot, MVC, Data JPA, Security; JPA, Hibernate, Transaction Management |
| 4 | Diseño | Clean Code, SOLID, DRY/KISS/YAGNI, patrones GoF |
| 5 | APIs y datos | REST, OpenAPI, HTTP, SQL (PostgreSQL), Data Modeling, Indexing, Transactions & ACID, Isolation Levels, Flyway/Liquibase |
| 6 | Arquitectura | estilos, DDD, patrones distribuidos, resiliencia, Kafka |
| 7 | Scrum | guía detallada y preguntas suficientes para su certificación (puede adelantarse si el usuario lo prioriza) |
| 8 | AI Engineering | primero la rama Java Ecosystem (Spring AI, LangChain4j, MCP Java SDK), que enlaza con Java y Spring; después LLMs, RAG, agentes, LLMOps y seguridad |
| 9 | Resto | seguridad, DevOps, observabilidad, frontend, habilidades |

Meta orientativa: una ruta publicada por bloque de trabajo; el mapa es útil desde el primer día
aunque casi todo esté en "Próximamente", porque la autoevaluación ya funciona.

### Fase 8: extras (en cola, sin compromiso)
- **Propuestas del usuario:** el usuario tiene propuestas de temáticas para pasos posteriores
  (2026-11-02); se recogen aquí cuando las comparta y se decide en qué fase entra cada una.
- Pintar en el mapa, en solo lectura, el progreso de los servicios ya estudiados en
  aws-cert-study (`apuntes-aws.progreso`, mismo origen); ver 5.6.
- Juego **Clasificador**: caen temas y hay que soltarlos en su caja del mapa (refuerza la
  estructura; aprovecha la vista Cajas).
- Juego **Empareja** (tema ↔ frase), adaptado de aws-cert-study.
- **Rutas de aprendizaje** guiadas (secuencias de temas con orden recomendado sobre el mapa).
- Exportar preguntas a Noria (formato de `kopi-docs/importar_temas.md`), como en aws-cert-study.
- Exportar "Mi telaraña" como imagen (SVG → PNG) para compartir.

---

## 7. Consideraciones técnicas

- **Rendimiento:** `nodos.json` ronda 60–80 KB; se carga una vez. Las preguntas se cargan bajo
  demanda (por tema o, para una rama, en paralelo con `Promise.all`). Sin librerías en la vista
  Cajas.
- **Pruebas en local:** `python -m http.server 8765` (con `file://` falla `fetch`). Para probar la
  integración con aws-cert-study, servir desde `kopi/` y abrir `/arquitechthor-spider/`.
- **Verificación de cada cambio:** navegador a escritorio y a 375 px, teclado, modo sin
  `localStorage` (navegación privada: la web debe funcionar sin progreso), y los validadores.
- **SEO:** cada tema publicado tiene su HTML estático (como aws-cert-study) y entra en
  `sitemap.xml`; las páginas de progreso y evaluación llevan `noindex`. `robots.txt` vive en
  `arquitechthor.github.io` (repo de la web personal): añadir este sitemap allí.
- **Compatibilidad:** View Transitions y `:has()` como mejora progresiva; todo funciona sin ellas.
- **Riesgos:** (1) volumen de contenido (~295 temas): mitigado con prioridades y con el mapa útil
  sin contenido; (2) mapa ilegible con muchos nodos: mitigado mostrando solo dos niveles; (3)
  temarios de certificaciones que cambian: fecha de verificación en cada entrada; (4) duplicar a
  aws-cert-study: mitigado con `externo`.

---

## Registro de sesiones

| Fecha | Qué se hizo |
|---|---|
| 2026-11-03 | **Ampliación del piloto de IA** (el usuario va a hacer pruebas con una lista de conceptos): los 10 primeros ya estaban cubiertos; se añaden 8 conceptos al glosario (parámetros e hiperparámetros, arquitectura/estructura del modelo, datos estructurados y no estructurados, regresión, sesgo con sus tres sentidos, varianza, NLP, Transformer) y las siglas PLN y BERT (NLP enlaza a su concepto). Nuevas secciones: "Regresión y clasificación" y "Sesgo y varianza" (ML), arquitectura y "El Transformer por dentro" (DL), "Del NLP a los LLM" (LLMs). 14 preguntas nuevas (71 en total). |
| 2026-11-03 | **Piloto de IA:** todo nodo tiene ficha (temas: guía y evaluación; áreas y bloques: presentación y "Evaluar esta rama"), criterio bloque → tema y "no enterrar temas". `artificial-intelligence` pasa a tema; nuevos Machine Learning y Deep Learning. Fichas del área IA y de 6 temas, 57 preguntas, `glosario.json` con 17 siglas y 4 conceptos, `siglas.js` (tooltip y enlace), `tema.js`, `quiz.js`, `evaluacion.html`, `glosario.html`, `tema.html`. El ☁ de AWS pasa delante del nombre (petición del usuario). |
| 2026-11-03 | Cajas con el aspecto de las tarjetas de áreas (icono, nombre en inglés, chips grises, sin recuentos) y **sección "Áreas" retirada** de la portada (decisión del usuario). |
| 2026-11-03 | **Tarea 3.6 (publicada):** vista Cajas (`assets/cajas.js`) con conmutador, vista en la URL y en `spider.vista`, buscador/filtros/color compartidos, fundido CSS en vez de View Transitions. |
| 2026-11-03 | **Tarea 3.5 (publicada):** buscador con lista y salto, "Color por" área / mi nivel con leyenda, filtros Estado y Lo esencial, atenuado y halo en la telaraña, estado en la URL. `SpiderArbol.nivelMedio()`; `buscar()` sin límite por defecto. Progreso → Fase 5; certificación → Fase 6. |
| 2026-11-03 | **Tarea 2.6:** Tech Spider enlazado en el pie común de `kopi-web`, `aws-cert-study`, `arquitechthor.github.io` y `kopi-chess` (`HomePageTest` en verde), y con sección propia en la web personal. El pie de Tech Spider se pone al día con Kopi Chess y Prompt Quest. Publicado en los cinco repos; pendiente `kopi-docs/politicas.md`. |
| 2026-11-02 | Revisión del usuario: letra mayor, lienzo más alto, tarjetas de áreas debajo de la telaraña, cabecera de la Fase 2 recuperada. **Telaraña publicada** (`adf8322`). |
| 2026-11-02 | **Fase 3 (prototipo, en local):** `arbol.js`, `telarana.js` y `mapa.js`; la portada pasa a ser el mapa (fuera `inicio.js` y las tarjetas). Etiquetas radiales en el segundo anillo, `viewBox` ajustado al contenido, `nombreCorto` de las áreas para móvil. Pendiente de revisión del usuario. |
| 2026-11-02 | **Fase 2:** esqueleto publicado en GitHub Pages (portada provisional con las áreas, aviso legal, logo, `datos.js`, `CLAUDE.md`); 2.6 aplazada salvo `kopi/CLAUDE.md`. |
| 2026-11-02 | **Fase 1 completa:** `scripts/importar_arbol.py` → `data/nodos.json` (355 nodos, 12 accesos, 21 externos), `nombreEs` y frases de áreas y bloques, colores e iconos de las áreas, `scripts/revisar_arbol.py` en verde. Decisiones de detalle: `bloque` = nodo que solo agrupa; color en el nodo de área (sin `areas.json`); campos opcionales omitidos. |
| 2026-11-02 | Ampliación del área 13 → AI Engineering (propuesta del usuario con ajustes: fusiones, Fine-Tuning nuevo, GDPR al área 7 en "Compliance & Privacy"); aplicada en `docs/tecnologias.md` (364 nodos). Campos `revisado` y `volatil`. |
| 2026-11-02 | D1 "Tech Spider", D4 aceptada, D6 aceptada salvo Scrum (detallado y con certificación). Licencia cambiada a CC BY-SA 4.0. |
| 2026-11-02 | El usuario acepta D2 (CC BY-SA 4.0), D3, D5 y D7; decide que AWS solo se enlaza y que la Telaraña es la vista predeterminada (5.1 reescrita, Fase 3 reordenada). D1 pasa a nombre en inglés con *Spider*. |
| 2026-11-02 | Análisis de `docs/tecnologias.md` (322 nodos, duplicados, solapamiento con AWS) y de `aws-cert-study`; redacción de este plan. |
