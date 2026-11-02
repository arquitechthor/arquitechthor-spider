"""Valida data/nodos.json (sección 4.4 de docs/PLAN.md).

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
                preguntas_por_tema[f.stem] = len(json.loads(f.read_text(encoding='utf-8')))
            except json.JSONDecodeError as e:
                error(f'{f.relative_to(RAIZ)}: JSON no válido ({e})')
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
            for campo in ('estado', 'evaluable', 'prioridad', 'volatil', 'revisado'):
                if campo in n:
                    error(f'{nid}: {campo} solo aplica a temas')
            continue

        estado = n.get('estado')
        if estado not in ('pendiente', 'publicado'):
            error(f'{nid}: estado no válido {estado!r}')
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
            if n.get('evaluable') and preguntas_por_tema.get(nid, 0) < MIN_PREGUNTAS:
                error(f'{nid}: publicado y evaluable con {preguntas_por_tema.get(nid, 0)} preguntas (mínimo {MIN_PREGUNTAS})')
        elif nid in paginas:
            error(f'{nid}: existe temas/{nid}.html pero el estado es {estado!r}')
        if n.get('volatil') and revisado and FECHA.match(str(revisado)):
            fecha = datetime.date.fromisoformat(revisado)
            meses = (hoy.year - fecha.year) * 12 + hoy.month - fecha.month
            if meses > MESES_VOLATIL:
                avisos.append(f'{nid}: tema volátil revisado hace {meses} meses ({revisado})')

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


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    nodos, preguntas = revisar()
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
