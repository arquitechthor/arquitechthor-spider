"""Valida data/nodos.json, las fichas (temas/), las preguntas (data/preguntas/), el glosario
(data/glosario.json) y que las páginas enlacen la versión actual de sus .js y su .css
(scripts/versionar.py). Sección 4.4 de docs/PLAN.md.

Uso:
    python scripts/revisar_arbol.py

Termina con código 1 si hay errores. Los avisos (temas volátiles sin revisar desde hace más de
seis meses) no hacen fallar. Al final imprime un resumen por área.
"""
import datetime
import json
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
NODOS = RAIZ / 'data' / 'nodos.json'
PREGUNTAS = RAIZ / 'data' / 'preguntas'
GLOSARIO = RAIZ / 'data' / 'glosario.json'
TEMAS = RAIZ / 'temas'
ICONOS = RAIZ / 'assets' / 'iconos' / 'areas'
AWS_SERVICIOS = RAIZ.parent / 'aws-cert-study' / 'data' / 'servicios.json'

TIPOS = {'raiz', 'area', 'bloque', 'tema'}
ID = re.compile(r'^[a-z0-9]+(-[a-z0-9]+)*$')
COLOR = re.compile(r'^#[0-9a-f]{6}$')
FECHA = re.compile(r'^\d{4}-\d{2}-\d{2}$')
PALABRA = re.compile(r'[a-z0-9áéíóúüñ]+')
FRASE_MIN, FRASE_MAX = 60, 90
MIN_PREGUNTAS = 5
MAX_CORTO = 14
MESES_VOLATIL = 6
CAMPOS = {'id', 'nombre', 'nombreEs', 'nombreCorto', 'tipo', 'padre', 'area', 'accesos', 'color', 'frase', 'estado',
          'evaluable', 'prioridad', 'volatil', 'alias', 'relacionados', 'externo', 'revisado',
          'certificaciones'}

errores, avisos = [], []


def error(msg):
    errores.append(msg)


def palabras(texto):
    return {p for p in PALABRA.findall(texto.lower()) if len(p) >= 4}


def revisar_ficha(n, paginas, frase, hoy):
    """Ficha de cualquier nodo (tema, bloque o área): estado, página, frase y fecha de revisión."""
    nid = n['id']
    estado = n.get('estado')
    if n.get('tipo') != 'tema' and estado is None:
        if nid in paginas:
            error(f'{nid}: existe temas/{nid}.html pero no tiene estado "publicado"')
        return
    if estado not in ('pendiente', 'publicado'):
        error(f'{nid}: estado no válido {estado!r}')
    revisado = n.get('revisado')
    if revisado is not None and not FECHA.match(str(revisado)):
        error(f'{nid}: revisado tiene que ser AAAA-MM-DD')
    if estado == 'publicado':
        if nid not in paginas:
            error(f'{nid}: publicado pero falta temas/{nid}.html')
        if not frase:
            error(f'{nid}: publicado sin frase')
        if not revisado:
            error(f'{nid}: publicado sin fecha revisado')
    elif nid in paginas:
        error(f'{nid}: existe temas/{nid}.html pero el estado es {estado!r}')
    if n.get('volatil') and revisado and FECHA.match(str(revisado)):
        fecha = datetime.date.fromisoformat(revisado)
        meses = (hoy.year - fecha.year) * 12 + hoy.month - fecha.month
        if meses > MESES_VOLATIL:
            avisos.append(f'{nid}: ficha volátil revisada hace {meses} meses ({revisado})')


TIPOS_PREGUNTA = {'unica', 'multiple', 'ordenar', 'emparejar'}
CAMPOS_PREGUNTA = {'id', 'tipo', 'nivel', 'dificil', 'certificaciones', 'dominio', 'enunciado', 'opciones',
                   'destinos', 'correctas', 'explicacion', 'codigo', 'fuentes', 'temas'}


def revisar_preguntas(tema, preguntas, por_id):
    """Formato de data/preguntas/<tema>.json (docs/PLAN.md 4.3)."""
    if not isinstance(preguntas, list):
        error(f'preguntas/{tema}.json: tiene que ser una lista')
        return
    vistos = set()
    for i, p in enumerate(preguntas, 1):
        pid = p.get('id', f'#{i}')
        donde = f'preguntas/{tema}.json {pid}'
        if not re.fullmatch(rf'{re.escape(tema)}-\d{{3}}', str(pid)):
            error(f'{donde}: el id tiene que ser {tema}-NNN')
        if pid in vistos:
            error(f'{donde}: id repetido')
        vistos.add(pid)
        extra = set(p) - CAMPOS_PREGUNTA
        if extra:
            error(f'{donde}: campos desconocidos {sorted(extra)}')
        tipo = p.get('tipo')
        if tipo not in TIPOS_PREGUNTA:
            error(f'{donde}: tipo no válido {tipo!r}')
            continue
        if p.get('nivel') not in (1, 2, 3):
            error(f'{donde}: nivel tiene que ser 1, 2 o 3')
        for campo in ('enunciado', 'explicacion'):
            if not str(p.get(campo, '')).strip():
                error(f'{donde}: falta {campo}')
        opciones, correctas = p.get('opciones', []), p.get('correctas', [])
        if len(opciones) < 2 or len(set(opciones)) != len(opciones):
            error(f'{donde}: hacen falta al menos 2 opciones distintas')
        if not correctas or any(not isinstance(c, int) for c in correctas):
            error(f'{donde}: correctas tiene que ser una lista de índices')
            continue
        limite = len(p.get('destinos', [])) if tipo == 'emparejar' else len(opciones)
        if any(c < 0 or c >= limite for c in correctas):
            error(f'{donde}: correctas fuera de rango')
        if tipo == 'unica' and len(correctas) != 1:
            error(f'{donde}: una pregunta "unica" tiene una sola correcta')
        if tipo == 'multiple' and len(correctas) < 2:
            error(f'{donde}: una pregunta "multiple" tiene al menos 2 correctas')
        if tipo in ('ordenar', 'emparejar') and len(correctas) != len(opciones):
            error(f'{donde}: correctas tiene que tener un elemento por opción')
        if tipo == 'ordenar' and sorted(correctas) != list(range(len(opciones))):
            error(f'{donde}: correctas tiene que ser una permutación de las opciones')
        for t in p.get('temas', []):
            if t not in por_id:
                error(f'{donde}: tema inexistente {t!r}')
        for u in p.get('fuentes', []):
            if not str(u).startswith('https://'):
                error(f'{donde}: fuente sin https: {u!r}')


def revisar_glosario(por_id):
    """data/glosario.json: siglas (tooltip y, si hay ficha, enlace) y conceptos (con su tema)."""
    if not GLOSARIO.exists():
        return
    try:
        g = json.loads(GLOSARIO.read_text(encoding='utf-8'))
    except json.JSONDecodeError as e:
        error(f'data/glosario.json: JSON no válido ({e})')
        return
    conceptos = {c.get('id') for c in g.get('conceptos', [])}
    for sigla, d in g.get('siglas', {}).items():
        if not (d.get('en') or d.get('es')):
            error(f'glosario: la sigla {sigla} necesita en o es')
        destino = d.get('enlace')
        if destino and destino not in por_id and destino not in conceptos:
            error(f'glosario: la sigla {sigla} enlaza a {destino!r}, que no es un nodo ni un concepto')
    for c in g.get('conceptos', []):
        cid = c.get('id', '')
        if not ID.match(cid):
            error(f'glosario: id de concepto no válido {cid!r}')
        if cid in por_id:
            error(f'glosario: el concepto {cid} coincide con un nodo; usa otro id')
        for campo in ('termino', 'definicion'):
            if not c.get(campo):
                error(f'glosario: al concepto {cid} le falta {campo}')
        if c.get('tema') and c['tema'] not in por_id:
            error(f'glosario: el concepto {cid} apunta a un tema inexistente {c["tema"]!r}')
        for u in c.get('fuentes', []):
            if not str(u.get('url', '')).startswith('https://'):
                error(f'glosario: fuente sin https en {cid}')


def revisar():
    nodos = json.loads(NODOS.read_text(encoding='utf-8'))
    por_id = {}
    for n in nodos:
        nid = n.get('id', '')
        if not ID.match(nid):
            error(f'id no válido: {nid!r}')
        if nid in por_id:
            error(f'id repetido: {nid}')
        por_id[nid] = n
        extra = set(n) - CAMPOS
        if extra:
            error(f'{nid}: campos desconocidos {sorted(extra)}')
        if n.get('tipo') not in TIPOS:
            error(f'{nid}: tipo no válido {n.get("tipo")!r}')
        if not n.get('nombre'):
            error(f'{nid}: falta nombre')

    raices = [n for n in nodos if n.get('tipo') == 'raiz']
    if len(raices) != 1:
        error(f'tiene que haber exactamente una raíz (hay {len(raices)})')
    raiz_id = raices[0]['id'] if raices else None

    hijos = {}
    for n in nodos:
        if n.get('tipo') == 'raiz':
            if 'padre' in n:
                error(f'{n["id"]}: la raíz no tiene padre')
            continue
        padre = n.get('padre')
        if padre not in por_id:
            error(f'{n["id"]}: padre inexistente {padre!r}')
            continue
        hijos.setdefault(padre, []).append(n['id'])

    # Ciclos y área de cada nodo (la del ancestro de nivel 1)
    for n in nodos:
        visto, actual, area = set(), n, None
        while actual.get('tipo') != 'raiz':
            if actual['id'] in visto or actual.get('padre') not in por_id:
                if actual['id'] in visto:
                    error(f'{n["id"]}: ciclo en la cadena de padres')
                break
            visto.add(actual['id'])
            if actual.get('tipo') == 'area':
                area = actual['id']
            actual = por_id[actual['padre']]
        if n.get('tipo') != 'raiz' and n.get('area') != area:
            error(f'{n["id"]}: area {n.get("area")!r} no coincide con su ancestro de nivel 1 ({area!r})')

    aws_ids = None
    if AWS_SERVICIOS.exists():
        aws_ids = {s['id'] for s in json.loads(AWS_SERVICIOS.read_text(encoding='utf-8'))}

    preguntas_por_tema = {}
    if PREGUNTAS.exists():
        for f in PREGUNTAS.glob('*.json'):
            try:
                lista = json.loads(f.read_text(encoding='utf-8'))
            except json.JSONDecodeError as e:
                error(f'{f.relative_to(RAIZ)}: JSON no válido ({e})')
                continue
            preguntas_por_tema[f.stem] = len(lista)
            revisar_preguntas(f.stem, lista, por_id)
    revisar_glosario(por_id)
    paginas = {f.stem for f in TEMAS.glob('*.html')} if TEMAS.exists() else set()
    hoy = datetime.date.today()

    for n in nodos:
        nid, tipo = n['id'], n.get('tipo')
        nivel_frase = tipo == 'area' or (n.get('padre') in por_id and por_id[n['padre']].get('tipo') == 'area')

        if tipo == 'area':
            if n.get('padre') != raiz_id:
                error(f'{nid}: un área cuelga de la raíz')
            if not COLOR.match(n.get('color', '')):
                error(f'{nid}: color no válido {n.get("color")!r} (formato #rrggbb)')
            if not (ICONOS / f'{nid}.svg').exists():
                error(f'{nid}: falta el icono assets/iconos/areas/{nid}.svg')
        elif 'color' in n:
            error(f'{nid}: solo las áreas llevan color')

        corto = n.get('nombreCorto')
        if tipo == 'area' and not (corto and len(corto) <= MAX_CORTO):
            error(f'{nid}: un área necesita nombreCorto de {MAX_CORTO} caracteres como mucho (se usa en la telaraña en móvil)')
        elif tipo != 'area' and corto:
            error(f'{nid}: nombreCorto solo se usa en áreas')

        if tipo in ('area', 'bloque') and not hijos.get(nid):
            error(f'{nid}: un {tipo} tiene que tener hijos (si no, es un tema)')

        # Frase: obligatoria en áreas y en los nodos de nivel 2; en temas, al publicar
        frase = n.get('frase')
        if nivel_frase and not frase:
            error(f'{nid}: falta frase (obligatoria en áreas y en sus hijos directos)')
        if frase:
            if not FRASE_MIN <= len(frase) <= FRASE_MAX:
                error(f'{nid}: la frase tiene {len(frase)} caracteres (tiene que estar entre {FRASE_MIN} y {FRASE_MAX})')
            repetidas = palabras(frase) & (palabras(n['nombre']) | {nid})
            if repetidas:
                error(f'{nid}: la frase repite palabras del nombre o del id: {sorted(repetidas)}')

        for campo in ('accesos', 'relacionados', 'alias'):
            valor = n.get(campo, [])
            if not isinstance(valor, list) or len(valor) != len(set(valor)):
                error(f'{nid}: {campo} tiene que ser una lista sin repetidos')
        for destino in n.get('accesos', []):
            if destino not in por_id:
                error(f'{nid}: acceso a un nodo inexistente {destino!r}')
            elif destino == n.get('padre') or destino == nid:
                error(f'{nid}: un acceso no puede estar en su propio padre ni en sí mismo')
            elif por_id[destino].get('tipo') == 'tema' and not hijos.get(destino):
                error(f'{nid}: acceso dentro de {destino}, que no tiene hijos')
        for rel in n.get('relacionados', []):
            if rel not in por_id or rel == nid:
                error(f'{nid}: relacionado no válido {rel!r}')
            elif nid not in por_id[rel].get('relacionados', []):
                error(f'{nid}: relacionado {rel} no es recíproco')

        externo = n.get('externo')
        if externo is not None:
            if not isinstance(externo, dict) or not externo.get('url'):
                error(f'{nid}: externo necesita al menos url')
            elif externo.get('sitio') == 'aws-cert-study' and externo.get('id') and aws_ids is not None \
                    and externo['id'] not in aws_ids:
                error(f'{nid}: el servicio {externo["id"]!r} no existe en aws-cert-study')

        if tipo != 'tema':
            # Áreas y bloques también tienen ficha (de presentación) desde el 2026-11-03: pueden
            # llevar estado, revisado y volatil. No tienen preguntas propias (se evalúa su rama).
            for campo in ('evaluable', 'prioridad'):
                if campo in n:
                    error(f'{nid}: {campo} solo aplica a temas')
            if tipo == 'raiz':
                for campo in ('estado', 'volatil', 'revisado'):
                    if campo in n:
                        error(f'{nid}: la raíz no tiene {campo}')
                continue
            if nid in preguntas_por_tema:
                error(f'{nid}: un {tipo} no tiene preguntas propias (se evalúa su rama)')
            revisar_ficha(n, paginas, frase, hoy)
            continue

        estado = n.get('estado')
        if not isinstance(n.get('evaluable'), bool):
            error(f'{nid}: evaluable tiene que ser true o false')
        if n.get('prioridad') not in (1, 2, 3):
            error(f'{nid}: prioridad tiene que ser 1, 2 o 3')
        if externo is not None:
            if n.get('evaluable'):
                error(f'{nid}: un tema externo no se evalúa aquí (evaluable: false)')
            if estado == 'publicado' or nid in paginas or nid in preguntas_por_tema:
                error(f'{nid}: un tema externo no tiene guía ni preguntas en esta web')
            continue

        revisar_ficha(n, paginas, frase, hoy)
        if estado == 'publicado' and n.get('evaluable') and preguntas_por_tema.get(nid, 0) < MIN_PREGUNTAS:
            error(f'{nid}: publicado y evaluable con {preguntas_por_tema.get(nid, 0)} preguntas (mínimo {MIN_PREGUNTAS})')
        if nid in preguntas_por_tema and not n.get('evaluable'):
            error(f'{nid}: tiene preguntas pero evaluable es false')

    # Al revés: cada servicio de aws-cert-study tiene que estar en el mapa (docs/PLAN.md 5.6).
    if aws_ids is not None:
        enlazados = {n['externo'].get('id') for n in nodos if isinstance(n.get('externo'), dict)}
        faltan = sorted(aws_ids - enlazados)
        if faltan:
            error(f'faltan {len(faltan)} servicios de aws-cert-study en el mapa ({", ".join(faltan[:5])}'
                  f'{"…" if len(faltan) > 5 else ""}): ejecuta python scripts/importar_aws.py')

    for pagina in sorted(paginas - set(por_id)):
        error(f'temas/{pagina}.html no corresponde a ningún nodo')
    for tema in sorted(set(preguntas_por_tema) - set(por_id)):
        error(f'data/preguntas/{tema}.json no corresponde a ningún nodo')

    return nodos, preguntas_por_tema


def resumen(nodos, preguntas_por_tema):
    areas = [n for n in nodos if n.get('tipo') == 'area']
    print(f'\n{"Área":<16}{"bloques":>8}{"temas":>7}{"evaluables":>11}{"publicados":>11}{"preguntas":>10}')
    total = [0, 0, 0, 0, 0]
    for a in areas:
        del_area = [n for n in nodos if n.get('area') == a['id']]
        temas = [n for n in del_area if n.get('tipo') == 'tema']
        fila = [
            sum(1 for n in del_area if n.get('tipo') == 'bloque'),
            len(temas),
            sum(1 for n in temas if n.get('evaluable')),
            sum(1 for n in temas if n.get('estado') == 'publicado'),
            sum(preguntas_por_tema.get(n['id'], 0) for n in temas),
        ]
        total = [x + y for x, y in zip(total, fila)]
        print(f'{a["id"]:<16}' + ''.join(f'{v:>{w}}' for v, w in zip(fila, (8, 7, 11, 11, 10))))
    print(f'{"TOTAL":<16}' + ''.join(f'{v:>{w}}' for v, w in zip(total, (8, 7, 11, 11, 10))))
    accesos = sum(len(n.get('accesos', [])) for n in nodos)
    print(f'{len(nodos)} nodos, {accesos} accesos, {sum(1 for n in nodos if n.get("externo"))} externos')


def revisar_versiones():
    """Cada página enlaza sus .js y su .css con la huella actual (scripts/versionar.py)."""
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    import versionar
    for pagina, refs in versionar.revisar().items():
        error(f'{pagina}: versión desfasada de {", ".join(refs)} (ejecuta python scripts/versionar.py)')


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    nodos, preguntas = revisar()
    revisar_versiones()
    for a in avisos:
        print(f'AVISO  {a}')
    for e in errores:
        print(f'ERROR  {e}')
    resumen(nodos, preguntas)
    if errores:
        print(f'\n{len(errores)} errores')
        sys.exit(1)
    print('\nÁrbol correcto.' + (f' {len(avisos)} avisos.' if avisos else ''))


if __name__ == '__main__':
    main()
