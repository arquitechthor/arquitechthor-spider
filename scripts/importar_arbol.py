"""Importa docs/tecnologias.md a data/nodos.json (Fase 1 de docs/PLAN.md).

Uso:
    python scripts/importar_arbol.py            # no sobrescribe un nodos.json existente
    python scripts/importar_arbol.py --forzar   # lo regenera (se pierden las ediciones a mano)

Tras la importación inicial, data/nodos.json es la fuente de verdad: los cambios se hacen en el
JSON y se anotan en docs/PLAN.md ("Cambios al árbol"). Este script queda como registro de cómo se
normalizó el árbol original (sección 4.2 del plan) y para poder repetir la importación desde cero.
"""
import argparse
import colorsys
import json
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
MD = RAIZ / 'docs' / 'tecnologias.md'
SALIDA = RAIZ / 'data' / 'nodos.json'

# --- Áreas: id, nombre (en inglés), nombre en español, tono HSL del color y frase --------------
AREAS = {
    '1': ('fundamentals', 'Software Engineering Fundamentals', 'Fundamentos de ingeniería de software', 220,
          'Lenguaje, principios de diseño, patrones, algoritmos y herramientas del día a día.'),
    '2': ('testing', 'Testing & Quality Engineering', 'Pruebas y calidad del software', 145,
          'Cómo comprobar que el código funciona y mantenerlo sano: tipos de prueba y métricas.'),
    '3': ('backend', 'Backend Development & Spring Ecosystem', 'Desarrollo backend y ecosistema Spring', 100,
          'Servidores en Java: inyección de dependencias, persistencia y construcción del proyecto.'),
    '4': ('apis', 'APIs & Communication', 'APIs y comunicación', 172,
          'Cómo se diseñan, documentan y conectan los servicios que hablan entre sí por la red.'),
    '5': ('data', 'Data Management', 'Gestión de datos', 45,
          'Bases relacionales y NoSQL, modelado, rendimiento de consultas y migraciones de esquema.'),
    '6': ('architecture', 'Software Architecture & Distributed Systems', 'Arquitectura de software y sistemas distribuidos', 270,
          'Cómo organizar sistemas grandes: estilos, DDD, patrones, resiliencia y mensajería.'),
    '7': ('security', 'Security Engineering', 'Ingeniería de seguridad', 0,
          'Proteger aplicaciones y datos: identidad, cifrado, código seguro y cumplimiento legal.'),
    '8': ('devops', 'DevOps & Infrastructure', 'DevOps e infraestructura', 25,
          'Contenedores, orquestación, infraestructura como código y entrega continua de versiones.'),
    '9': ('cloud', 'Cloud Computing', 'Computación en la nube', 195,
          'Modelos de servicio, alta disponibilidad, servicios de AWS y arquitecturas nativas.'),
    '10': ('observability', 'Observability & Performance Engineering', 'Observabilidad y rendimiento', 75,
           'Ver qué pasa en producción con logs, métricas y trazas, y hacer que todo vaya rápido.'),
    '11': ('frontend', 'Frontend & Full Stack Fundamentals', 'Frontend y fundamentos full stack', 330,
           'La parte que ve el usuario: HTML, CSS, JavaScript, TypeScript, Angular y React.'),
    '12': ('professional', 'Professional & Business Skills', 'Habilidades profesionales y de negocio', 295,
           'Trabajo en equipo, metodologías ágiles, liderazgo técnico y comprensión del negocio.'),
    '13': ('ai', 'AI Engineering', 'Ingeniería de IA', 245,
           'Modelos de lenguaje, agentes, integración en aplicaciones, producción y gobierno de la IA.'),
}

# --- Bloques (y otros nodos de agrupación): nombre original -> (id, nombre, nombreEs, frase) -----
BLOQUES = {
    'Programación': ('programming', 'Programming', 'Programación',
                     'Java a fondo y los paradigmas orientado a objetos, funcional y reactivo.'),
    'Software Design Principles': ('software-design-principles', None, 'Principios de diseño de software',
                                   'Reglas para escribir código legible y fácil de cambiar: código limpio, SOLID, DRY…'),
    'Design Patterns': ('design-patterns', None, 'Patrones de diseño',
                        'Soluciones probadas a problemas recurrentes: creacionales, estructurales y más.'),
    'Data Structures & Algorithms': ('data-structures-algorithms', None, 'Estructuras de datos y algoritmos',
                                     'Listas, árboles, grafos y mapas, cómo recorrerlos y cuánto cuesta cada operación.'),
    'Development Environment': ('development-environment', None, 'Entorno de desarrollo',
                                'Herramientas de trabajo diario: Git, Linux, la terminal, el IDE y nociones de redes.'),
    'Testing Fundamentals': ('testing-fundamentals', None, 'Fundamentos de pruebas',
                             'Tipos de prueba según su alcance, de la unidad aislada al sistema completo y la carga.'),
    'Testing Strategies': ('testing-strategies', None, 'Estrategias de pruebas',
                           'TDD, BDD, pirámide de pruebas, dobles de prueba y mutaciones para medir su eficacia.'),
    'Java Testing Ecosystem': ('java-testing-ecosystem', None, 'Ecosistema de pruebas en Java',
                               'JUnit 5, Mockito, AssertJ, Testcontainers, WireMock y REST Assured en la práctica.'),
    'Code Quality': ('code-quality', None, 'Calidad del código',
                     'Análisis estático, cobertura de pruebas, SonarQube y revisiones entre compañeros.'),
    'Java Backend': ('java-backend', None, 'Backend en Java',
                     'HTTP, la API de Servlets, inyección de dependencias y configuración de aplicaciones.'),
    'Spring Framework': ('spring-framework', None, 'Spring Framework',
                         'El marco más usado en servidores: núcleo, Boot, MVC, datos, seguridad, nube y lotes.'),
    'ORM & Persistence': ('orm-persistence', None, 'ORM y persistencia',
                          'Guardar objetos en bases relacionales con JPA, Hibernate, JDBC y transacciones.'),
    'Build & Dependency Management': ('build-dependency-management', None, 'Construcción y dependencias',
                                      'Compilar, empaquetar y gestionar librerías externas con Maven o Gradle.'),
    'API Design': ('api-design', None, 'Diseño de APIs',
                   'REST, GraphQL y gRPC: cuándo usar cada estilo y cómo versionar un contrato público.'),
    'API Documentation': ('api-documentation', None, 'Documentación de APIs',
                          'Describir un contrato con OpenAPI y ofrecerlo navegable y probable con Swagger UI.'),
    'Communication Protocols': ('communication-protocols', None, 'Protocolos de comunicación',
                                'HTTP y HTTPS, WebSockets y TCP/IP: cómo viajan los datos entre dos máquinas.'),
    'Inter-Service Communication': ('inter-service-communication', None, 'Comunicación entre servicios',
                                    'Llamadas síncronas que esperan respuesta frente a mensajes asíncronos con colas.'),
    'Relational Databases (SQL)': ('relational-databases', None, 'Bases de datos relacionales (SQL)',
                                   'PostgreSQL, MySQL, Oracle y SQL Server: tablas, claves y consultas declarativas.'),
    'NoSQL Databases': ('nosql-databases', None, 'Bases de datos NoSQL',
                        'Documentos, clave-valor y cachés: MongoDB, DynamoDB y Redis, y cuándo elegirlos.'),
    'Database Engineering': ('database-engineering', None, 'Ingeniería de bases de datos',
                             'Modelado, normalización, índices, transacciones, aislamiento y cambios de esquema.'),
    'Data Access & Migration Tools': ('data-access-migration-tools', None, 'Herramientas de acceso y migración de datos',
                                      'Versionar el esquema de la base junto al código de la aplicación con Liquibase y Flyway.'),
    'Architectural Principles': ('architectural-principles', None, 'Principios de arquitectura',
                                 'Separar responsabilidades, alta cohesión, bajo acoplamiento y módulos bien definidos.'),
    'Architectural Styles': ('architectural-styles', None, 'Estilos arquitectónicos',
                             'Capas, arquitectura limpia, hexagonal, monolito modular, microservicios y eventos.'),
    'Domain-Driven Design (DDD)': ('ddd', None, 'Diseño guiado por el dominio (DDD)',
                                   'Modelar el software alrededor del negocio con contextos, agregados y lenguaje común.'),
    'Distributed Systems': ('distributed-systems', None, 'Sistemas distribuidos',
                            'Teorema CAP, consistencia, tolerancia a fallos, idempotencia y transacciones repartidas.'),
    'Architectural Patterns': ('architectural-patterns', None, 'Patrones de arquitectura',
                               'CQRS, Event Sourcing, Saga, Outbox, Strangler Fig y pasarela de API entre servicios.'),
    'Messaging & Event Streaming': ('messaging-event-streaming', None, 'Mensajería y flujos de eventos',
                                    'Comunicar servicios de forma asíncrona con Kafka, RabbitMQ, SQS o EventBridge.'),
    'Security Fundamentals': ('security-fundamentals', None, 'Fundamentos de seguridad',
                              'Autenticación, autorización, cifrado, hashing y los diez riesgos web de OWASP.'),
    'Identity & Access Management': ('identity-access-management', None, 'Gestión de identidades y accesos',
                                     'OAuth 2.0, OpenID Connect, JWT y los servidores que emiten y validan los tokens.'),
    'Application Security': ('application-security', None, 'Seguridad de aplicaciones',
                             'Código seguro, secretos fuera del repositorio y vulnerabilidades en dependencias.'),
    'Compliance & Privacy': ('compliance-privacy', None, 'Cumplimiento y privacidad',
                             'Normas legales sobre datos personales que condicionan cómo se diseña un sistema.'),
    'Containers': ('containers', None, 'Contenedores',
                   'Empaquetar una aplicación con todo lo que necesita para ejecutarse usando Docker.'),
    'Container Orchestration': ('container-orchestration', None, 'Orquestación de contenedores',
                                'Desplegar y escalar contenedores en un clúster con Kubernetes, Helm y Kustomize.'),
    'Infrastructure as Code (IaC)': ('iac', None, 'Infraestructura como código (IaC)',
                                     'Describir servidores y redes en ficheros versionados con Terraform, CloudFormation o CDK.'),
    'CI/CD': ('ci-cd', None, 'Integración y entrega continuas (CI/CD)',
              'Compilar, probar y desplegar en cada cambio con GitHub Actions, Jenkins o Azure DevOps.'),
    'Configuration & Deployment': ('configuration-deployment', None, 'Configuración y despliegue',
                                   'Entornos, gestión de ajustes y estrategias para publicar versiones sin cortes.'),
    'Cloud Fundamentals': ('cloud-fundamentals', None, 'Fundamentos de la nube',
                           'IaaS, PaaS y SaaS, escalado elástico y alta disponibilidad: lo básico de la nube.'),
    'Amazon Web Services (AWS)': ('aws', None, 'Amazon Web Services (AWS)',
                                  'Los servicios más usados del proveedor líder; sus guías están en Apuntes AWS.'),
    'Cloud Architecture': ('cloud-architecture', None, 'Arquitectura en la nube',
                           'Sin servidor, nativa de la nube, en varias regiones y con los costes bajo control.'),
    'Observability Fundamentals': ('observability-fundamentals', None, 'Fundamentos de observabilidad',
                                   'Logs, métricas, trazas distribuidas y alertas para saber qué hace un sistema.'),
    'Observability Tools': ('observability-tools', None, 'Herramientas de observabilidad',
                            'Prometheus, Grafana, OpenTelemetry, Jaeger y la pila ELK u OpenSearch en la práctica.'),
    'Performance Engineering': ('performance-engineering', None, 'Ingeniería de rendimiento',
                                'Perfilado de la JVM, pruebas de carga y estrés, cachés y planificación de capacidad.'),
    'Web Fundamentals': ('web-fundamentals', None, 'Fundamentos web',
                         'HTML para la estructura, CSS para el aspecto y JavaScript para el comportamiento.'),
    'TypeScript': ('typescript', None, None,
                   'JavaScript con tipos estáticos: detecta errores al compilar y mejora el autocompletado.'),
    'Frontend Frameworks': ('frontend-frameworks', None, 'Frameworks de frontend',
                            'Angular y React: componentes, estado y enrutado para aplicaciones de una sola página.'),
    'Node.js Ecosystem': ('nodejs-ecosystem', None, 'Ecosistema Node.js',
                          'JavaScript en el servidor y aplicaciones modulares con NestJS sobre el mismo motor.'),
    'Agile & Project Management': ('agile-project-management', None, 'Metodologías ágiles y gestión de proyectos',
                                   'Scrum, Kanban y Jira para planificar, priorizar y entregar trabajo en iteraciones.'),
    'Collaboration': ('collaboration', None, 'Colaboración',
                      'Comunicar bien, documentar, revisar el código de otros y compartir lo aprendido.'),
    'Technical Leadership': ('technical-leadership', None, 'Liderazgo técnico',
                             'Mentorizar, tomar decisiones técnicas, revisar arquitecturas y guiar a un equipo.'),
    'Product & Business Understanding': ('product-business', None, 'Producto y negocio',
                                         'Entender qué necesita el cliente, analizar requisitos y conocer bien el sector.'),
    'Languages': ('languages', None, 'Idiomas',
                  'Español e inglés para trabajar, leer documentación y comunicarse con el equipo.'),
    'Artificial Intelligence': ('artificial-intelligence', None, 'Inteligencia artificial',
                                'IA generativa, modelos de lenguaje, prompts, RAG, ajuste fino y agentes autónomos.'),
    'AI-Assisted Software Engineering': ('ai-assisted-software-engineering', None, 'Ingeniería de software asistida por IA',
                                         'Programar con asistentes y agentes: especificaciones, contexto, pruebas y revisión.'),
    'AI Integration': ('ai-integration', None, 'Integración de IA',
                       'Llamar a modelos desde una aplicación: APIs, embeddings, vectores, MCP y Java.'),
    'AI in Production (LLMOps)': ('llmops', None, 'IA en producción (LLMOps)',
                                  'Evaluar, trazar y vigilar coste y latencia de las funciones con modelos en vivo.'),
    'AI Security & Governance': ('ai-security-governance', None, 'Seguridad y gobierno de la IA',
                                 'Inyección de prompts, fugas de datos, guardarraíles y normativa europea sobre IA.'),
    # Nodos de agrupación de nivel 3 (sin guía propia)
    'Compute': ('aws-compute', None, 'Computación', None),
    'Storage': ('aws-storage', None, 'Almacenamiento', None),
    'Databases': ('aws-databases', None, 'Bases de datos', None),
    'Networking': ('aws-networking', None, 'Redes', None),
    'Messaging & Integration': ('aws-messaging', None, 'Mensajería e integración', None),
    'Security & Identity': ('aws-security', None, 'Seguridad e identidad', None),
    'Operations': ('aws-operations', None, 'Operaciones', None),
    'Java Ecosystem': ('ai-java-ecosystem', None, 'Ecosistema Java', None),
    'Domain Knowledge': ('domain-knowledge', None, 'Conocimiento del dominio', None),
}

# --- Ids a mano para temas cuyo slug automático sería feo o ambiguo -----------------------------
IDS = {
    'Object-Oriented Programming': 'oop',
    'HTTP / HTTPS': 'http',
    'Large Language Models (LLMs)': 'llms',
    'Model Context Protocol (MCP)': 'mcp',
    'AWS CDK': 'cdk',
    'JSON Web Token (JWT)': 'jwt',
    'OpenID Connect (OIDC)': 'oidc',
    'OAuth 2.0': 'oauth2',
    'Jakarta Persistence (JPA)': 'jpa',
    'Test-Driven Development (TDD)': 'tdd',
    'Behavior-Driven Development (BDD)': 'bdd',
    'Bash / Shell Scripting': 'bash',
    'ELK / OpenSearch': 'elk-opensearch',
    'Evals & Golden Datasets': 'evals',
    'Tracing & Observability': 'llm-tracing',
    'Cost & Latency': 'llm-cost-latency',
    'OWASP Top 10 for LLM Applications': 'owasp-llm-top-10',
    'Least Privilege for Agents': 'least-privilege-agents',
    'Complexity Analysis (Big O)': 'big-o',
    'Streams & Lambda Expressions': 'streams-lambdas',
    'Concurrency & Multithreading': 'concurrency',
    'JVM & Memory Management': 'jvm-memory',
    'Modern Java (8-21+)': 'modern-java',
    'Java Language Fundamentals': 'java-fundamentals',
    'Apache Kafka': 'kafka',
}

# --- D4: cada tema existe una sola vez. (padre, nombre) de la aparición secundaria -> id real ---
SECUNDARIOS = {
    ('Architectural Principles', 'SOLID'): 'solid',
    ('Collaboration', 'Code Reviews'): 'code-reviews',
    ('Identity & Access Management', 'Spring Security'): 'spring-security',
    ('Java', 'Object-Oriented Programming (OOP)'): 'oop',
    ('Java Backend', 'HTTP Fundamentals'): 'http',
    ('Messaging & Event Streaming', 'Amazon SQS'): 'sqs',
    ('Messaging & Event Streaming', 'Amazon EventBridge'): 'eventbridge',
    ('Identity & Access Management', 'AWS Cognito'): 'cognito',
    ('Infrastructure as Code (IaC)', 'AWS CloudFormation'): 'cloudformation',
    ('NoSQL Databases', 'DynamoDB (Key-Value / Document)'): 'dynamodb',
}
ACCESOS_EXTRA = {
    'spring-ai': ['spring-framework'],
    'gdpr': ['ai-security-governance'],
}
ALIAS_EXTRA = {
    'oop': ['OOP', 'POO'],
    'gdpr': ['RGPD'],
    'eu-ai-act': ['Reglamento europeo de IA'],
    'ci-cd': ['CI', 'CD'],
    'llms': ['LLM'],
}

RELACIONADOS = [
    ('spring-data-jpa', 'jpa'), ('llm-tracing', 'opentelemetry'), ('llm-tracing', 'distributed-tracing'),
    ('rate-limits-retries-fallbacks', 'resilience-patterns'), ('owasp-llm-top-10', 'owasp-top-10'),
    ('pgvector', 'postgresql'), ('embeddings', 'semantic-hybrid-search'), ('embeddings', 'vector-databases'),
    ('least-privilege-agents', 'authorization'), ('prompt-caching', 'caching'), ('rag', 'fine-tuning'),
    ('mcp', 'mcp-java-sdk'), ('mcp', 'tool-calling'), ('spring-ai', 'langchain4j'),
    ('hibernate', 'jpa'), ('jdbc', 'jpa'), ('kafka', 'event-driven-architecture'),
    ('circuit-breaker', 'resilience-patterns'), ('dependency-injection', 'spring-core'),
]

# --- Atributos de temas -----------------------------------------------------------------------
PRIORIDAD_1 = {
    # Ruta 1: Java
    'java', 'java-fundamentals', 'oop', 'collections-framework', 'generics', 'streams-lambdas',
    'concurrency', 'jvm-memory', 'garbage-collection', 'modern-java',
    'programming-paradigms', 'functional-programming', 'reactive-programming',
    # Ruta 2: testing en Java
    'unit-testing', 'integration-testing', 'test-doubles', 'test-pyramid', 'tdd',
    'junit-5', 'mockito', 'assertj', 'testcontainers',
    # Ruta 3: Spring y persistencia
    'spring-core', 'spring-context', 'spring-boot', 'spring-mvc', 'spring-data', 'spring-data-jpa',
    'spring-security', 'jpa', 'hibernate', 'transaction-management',
    # Scrum (D6)
    'scrum',
}
VOLATILES_FUERA_DE_IA = {'gdpr', 'modern-java', 'spring-boot'}
EVALUABLES_AREA_12 = {'scrum'}
AWS_ESTUDIO = '../aws-cert-study/'

SIGLA = re.compile(r'\(([A-Z][A-Za-z0-9]*)\)')


def slug(texto):
    texto = re.sub(r'\s*\(.*?\)\s*', ' ', texto)
    texto = texto.lower().replace('.', '').replace('&', ' ').replace('/', ' ').replace('+', ' ')
    texto = re.sub(r'[^a-z0-9]+', '-', texto)
    return texto.strip('-')


def color(tono):
    r, g, b = colorsys.hls_to_rgb(tono / 360, 0.65, 0.80)
    return '#{:02x}{:02x}{:02x}'.format(round(r * 255), round(g * 255), round(b * 255))


def leer_arbol():
    filas = []
    lineas = MD.read_text(encoding='utf-8').splitlines()
    raiz = lineas[0].strip()
    for linea in lineas[1:]:
        m = re.search(r'(├── |└── )(.*)$', linea)
        if m:
            filas.append((m.start() // 4, m.group(2).strip()))
    return raiz, filas


def importar():
    raiz_nombre, filas = leer_arbol()
    raiz = {'id': 'software-engineer', 'nombre': raiz_nombre, 'nombreEs': 'Ingeniería de software', 'tipo': 'raiz'}
    nodos = [raiz]
    por_id = {raiz['id']: raiz}
    pila = []  # (profundidad, nombre original, id)
    pendientes_acceso = []  # (id real, id del padre donde aparece)
    alias_secundarios = {}

    for i, (prof, nombre) in enumerate(filas):
        pila = [p for p in pila if p[0] < prof]
        padre_nombre = pila[-1][1] if pila else None
        padre_id = pila[-1][2] if pila else raiz['id']
        tiene_hijos = i + 1 < len(filas) and filas[i + 1][0] > prof

        if (padre_nombre, nombre) in SECUNDARIOS:
            real = SECUNDARIOS[(padre_nombre, nombre)]
            pendientes_acceso.append((real, padre_id))
            limpio = re.sub(r'\s*\(.*?\)', '', nombre).strip()
            alias_secundarios.setdefault(real, []).append(limpio)
            pila.append((prof, nombre, real))
            continue

        if prof == 0:
            num, _, _ = nombre.partition('. ')
            aid, nom, nom_es, tono, frase = AREAS[num]
            nodo = {'id': aid, 'nombre': nom, 'nombreEs': nom_es, 'tipo': 'area', 'padre': raiz['id'],
                    'area': aid, 'color': color(tono), 'frase': frase}
        elif nombre in BLOQUES:
            bid, nom, nom_es, frase = BLOQUES[nombre]
            area = por_id[padre_id]['area']
            es_tema = not tiene_hijos  # TypeScript: nivel de bloque, sin hijos, con guía propia
            nodo = {'id': bid, 'nombre': nom or nombre}
            if nom_es and nom_es != (nom or nombre):
                nodo['nombreEs'] = nom_es
            nodo.update({'tipo': 'tema' if es_tema else 'bloque', 'padre': padre_id, 'area': area})
            if frase:
                nodo['frase'] = frase
            if bid == 'aws':
                nodo['externo'] = {'sitio': 'aws-cert-study', 'id': None, 'url': AWS_ESTUDIO}
        else:
            if tiene_hijos and prof <= 1:
                sys.exit(f'Falta "{nombre}" en BLOQUES (nodo de agrupación de nivel {prof + 1}).')
            tid = IDS.get(nombre) or slug(nombre)
            area = por_id[padre_id]['area']
            nodo = {'id': tid, 'nombre': nombre, 'tipo': 'tema', 'padre': padre_id, 'area': area}

        if nodo['id'] in por_id:
            sys.exit(f'Id repetido: {nodo["id"]} ("{nombre}"). Añade una entrada en IDS o SECUNDARIOS.')
        nodos.append(nodo)
        por_id[nodo['id']] = nodo
        pila.append((prof, nombre, nodo['id']))

    # Accesos (D4) y accesos añadidos a mano
    for real, padre in pendientes_acceso:
        por_id[real].setdefault('accesos', []).append(padre)
    for real, padres in ACCESOS_EXTRA.items():
        por_id[real].setdefault('accesos', []).extend(padres)

    faltan = sorted((PRIORIDAD_1 | VOLATILES_FUERA_DE_IA | EVALUABLES_AREA_12 | set(ACCESOS_EXTRA)) - set(por_id))
    if faltan:
        sys.exit(f'Ids desconocidos en la configuración: {faltan}')

    # Atributos de los temas
    dentro_aws = lambda n: por_id[n['padre']].get('padre') == 'aws' or n['padre'] == 'aws'
    for n in nodos:
        if n['tipo'] != 'tema':
            continue
        n['estado'] = 'pendiente'
        aws = dentro_aws(n)
        if aws:
            n['externo'] = {'sitio': 'aws-cert-study', 'id': n['id'], 'url': f'{AWS_ESTUDIO}servicios/{n["id"]}.html'}
        n['evaluable'] = not aws and not (n['area'] == 'professional' and n['id'] not in EVALUABLES_AREA_12)
        n['prioridad'] = 1 if n['id'] in PRIORIDAD_1 else 2
        if n['area'] == 'ai' or n['id'] in VOLATILES_FUERA_DE_IA:
            n['volatil'] = True

    # La CDK de IaC también es un servicio de AWS con guía en aws-cert-study
    por_id['cdk']['externo'] = {'sitio': 'aws-cert-study', 'id': 'cdk', 'url': f'{AWS_ESTUDIO}servicios/cdk.html'}
    por_id['cdk']['evaluable'] = False

    # Alias: siglas entre paréntesis, nombres de las apariciones fusionadas y alias a mano
    for n in nodos:
        alias = []
        m = SIGLA.search(n['nombre'])
        # Solo siglas (dos o más mayúsculas): (SQL), (IaC), (LLMs); no (Document)
        if m and sum(c.isupper() for c in m.group(1)) >= 2 and m.group(1).lower() != n['id']:
            alias.append(m.group(1))
        alias += [a for a in alias_secundarios.get(n['id'], []) if a != n['nombre']]
        alias += ALIAS_EXTRA.get(n['id'], [])
        alias = list(dict.fromkeys(alias))
        if alias:
            n['alias'] = alias

    # Relacionados (simétricos)
    for a, b in RELACIONADOS:
        for x, y in ((a, b), (b, a)):
            if x not in por_id or y not in por_id:
                sys.exit(f'Relacionado desconocido: {x} -> {y}')
            rel = por_id[x].setdefault('relacionados', [])
            if y not in rel:
                rel.append(y)

    # Orden de campos estable
    orden = ['id', 'nombre', 'nombreEs', 'tipo', 'padre', 'area', 'accesos', 'color', 'frase', 'estado',
             'evaluable', 'prioridad', 'volatil', 'alias', 'relacionados', 'externo']
    return [{k: n[k] for k in orden if k in n} for n in nodos]


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('--forzar', action='store_true', help='sobrescribe data/nodos.json')
    args = ap.parse_args()
    if SALIDA.exists() and not args.forzar:
        sys.exit(f'{SALIDA.relative_to(RAIZ)} ya existe y es la fuente de verdad. Usa --forzar para regenerarlo.')
    nodos = importar()
    SALIDA.parent.mkdir(exist_ok=True)
    SALIDA.write_text(json.dumps(nodos, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    tipos = {}
    for n in nodos:
        tipos[n['tipo']] = tipos.get(n['tipo'], 0) + 1
    print(f'{len(nodos)} nodos escritos en {SALIDA.relative_to(RAIZ)}: {tipos}')


if __name__ == '__main__':
    main()
