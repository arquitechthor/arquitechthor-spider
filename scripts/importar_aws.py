"""Regenera la rama "Amazon Web Services" de data/nodos.json desde aws-cert-study (docs/PLAN.md 5.6).

Uso:
    python scripts/importar_aws.py            # escribe data/nodos.json
    python scripts/importar_aws.py --comprobar  # solo dice si está al día (código 1 si no)

aws-cert-study es la única fuente de los servicios de AWS: aquí cada servicio es un nodo `externo`
(sin guía ni preguntas propias) bajo el bloque `aws`, agrupado en las mismas categorías que usa
aquella web (data/categorias.json). Se ejecuta otra vez cuando aws-cert-study publica un servicio
nuevo o cambia una categoría; el validador (revisar_arbol.py) avisa si falta alguno.

Qué conserva de los nodos que ya existen (para no perder ediciones a mano): nombre, alias,
accesos, relacionados, prioridad y el padre de los que viven fuera de la rama (p. ej. `cdk` vive
en `iac`: se le añade un acceso a su categoría en vez de moverlo). Los ids nunca cambian: los
siete bloques de categoría que ya existían conservan el suyo.
"""
import argparse
import json
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
NODOS = RAIZ / 'data' / 'nodos.json'
AWS = RAIZ.parent / 'aws-cert-study' / 'data'

BLOQUE_AWS = 'aws'
AREA = 'cloud'
URL_SITIO = '../aws-cert-study/'

# Categoría de aws-cert-study -> id del bloque que ya existía (los ids publicados no se renombran).
BLOQUES_EXISTENTES = {
    'computacion': 'aws-compute',
    'almacenamiento': 'aws-storage',
    'base-de-datos': 'aws-databases',
    'redes-entrega-contenido': 'aws-networking',
    'integracion-aplicaciones': 'aws-messaging',
    'seguridad-identidad-cumplimiento': 'aws-security',
    'administracion-gobernanza': 'aws-operations',
}

# Ids de bloque nuevos más cortos que el que sale del nombre en inglés.
IDS_BLOQUE = {
    'iot': 'aws-iot',
    'frontend-web-movil': 'aws-frontend-web-mobile',
}

# Prioridad de los servicios nuevos (los que ya estaban conservan la suya: 1, "lo esencial").
PRIORIDAD_NUEVOS = 3

PALABRA = re.compile(r'[a-z0-9áéíóúüñ]+')


def slug(texto):
    t = texto.lower().replace('&', ' ').replace('+', ' ')
    return re.sub(r'[^a-z0-9]+', '-', t).strip('-')


def palabras(texto):
    return {p for p in PALABRA.findall(texto.lower()) if len(p) >= 4}


def nombre_corto(nombre):
    """"Amazon EC2" -> "EC2", "AWS Lambda" -> "Lambda": en el mapa sobra el prefijo."""
    for prefijo in ('Amazon ', 'AWS '):
        if nombre.startswith(prefijo) and len(nombre) > len(prefijo):
            return nombre[len(prefijo):]
    return nombre


def frase_valida(frase, nombre, nid):
    """Mismas reglas que revisar_arbol.py: 60-90 caracteres y sin palabras del nombre ni el id."""
    return bool(frase) and 60 <= len(frase) <= 90 and not (palabras(frase) & (palabras(nombre) | {nid}))


def url_servicio(s):
    if s.get('estado') == 'publicado':
        return f'{URL_SITIO}servicios/{s["id"]}.html'
    return f'{URL_SITIO}servicio.html?id={s["id"]}'


def ordenar_campos(n):
    orden = ['id', 'nombre', 'nombreEs', 'tipo', 'padre', 'area', 'accesos', 'frase', 'estado', 'evaluable',
             'prioridad', 'alias', 'externo', 'relacionados']
    return {k: n[k] for k in orden if k in n} | {k: v for k, v in n.items() if k not in orden}


def generar(nodos, servicios, categorias):
    por_id = {n['id']: n for n in nodos}
    en_rama = set()
    pila = [BLOQUE_AWS]
    while pila:
        actual = pila.pop()
        for n in nodos:
            if n.get('padre') == actual and n['id'] not in en_rama:
                en_rama.add(n['id'])
                pila.append(n['id'])

    usadas = {s['categoria'] for s in servicios}
    bloque_de = {}
    nuevos = []
    for c in categorias:
        if c['id'] not in usadas:
            continue
        bid = BLOQUES_EXISTENTES.get(c['id']) or IDS_BLOQUE.get(c['id']) or f'aws-{slug(c["nombreEn"])}'
        bloque_de[c['id']] = bid
        b = {'id': bid, 'nombre': c['nombreEn'], 'nombreEs': c['nombre'], 'tipo': 'bloque', 'padre': BLOQUE_AWS,
             'area': AREA}
        previo = por_id.get(bid)
        if previo:
            for campo in ('frase', 'estado', 'revisado', 'relacionados'):
                if campo in previo:
                    b[campo] = previo[campo]
        nuevos.append(ordenar_campos(b))

    fuera = []  # servicios cuyo nodo vive en otra rama: se actualizan en su sitio
    for c in categorias:
        if c['id'] not in bloque_de:
            continue
        bid = bloque_de[c['id']]
        for s in (x for x in servicios if x['categoria'] == c['id']):
            sid = s['id']
            previo = por_id.get(sid)
            if previo and not previo.get('externo'):
                sys.exit(f'ERROR: el id {sid!r} ya es un nodo propio de Tech Spider; resuélvelo a mano')
            corto = nombre_corto(s['nombre'])
            n = {
                'id': sid,
                'nombre': previo['nombre'] if previo else corto,
                'tipo': 'tema',
                'padre': bid,
                'area': AREA,
                'estado': 'pendiente',
                'evaluable': False,
                'prioridad': previo['prioridad'] if previo else PRIORIDAD_NUEVOS,
                'externo': {'sitio': 'aws-cert-study', 'id': sid, 'url': url_servicio(s)},
            }
            if s.get('audio'):
                n['externo']['audio'] = True  # su guía tiene resumen en audio (🎧 en el panel)
            if frase_valida(s.get('frase'), n['nombre'], sid):
                n['frase'] = s['frase']
            alias = list(previo.get('alias', [])) if previo else []
            if s['nombre'] != n['nombre'] and s['nombre'] not in alias:
                alias.append(s['nombre'])
            if alias:
                n['alias'] = alias
            for campo in ('accesos', 'relacionados'):
                if previo and previo.get(campo):
                    n[campo] = previo[campo]
            if previo and sid not in en_rama:
                # Vive fuera de la rama AWS (cdk en iac): conserva su sitio y gana un acceso a la categoría.
                n['padre'] = previo['padre']
                n['area'] = previo['area']
                accesos = [a for a in n.get('accesos', []) if a not in bloque_de.values()]
                n['accesos'] = accesos + [bid]
                fuera.append(ordenar_campos(n))
                continue
            nuevos.append(ordenar_campos(n))

    ids_aws = {s['id'] for s in servicios}
    sobran = [i for i in en_rama if i not in {n['id'] for n in nuevos}]
    for i in sobran:
        n = por_id[i]
        if n.get('externo') and n['externo'].get('id') not in ids_aws:
            print(f'AVISO: {i} ya no existe en aws-cert-study y se quita del mapa')
        elif n.get('tipo') == 'bloque':
            print(f'AVISO: el bloque {i} ya no corresponde a ninguna categoría y se quita')
        else:
            sys.exit(f'ERROR: {i} está en la rama AWS pero no es un servicio de aws-cert-study; muévelo a mano')

    # Reconstruir la lista: la rama AWS va justo detrás del bloque `aws`, y lo de fuera, en su sitio.
    reemplazo = {n['id']: n for n in fuera}
    salida = []
    for n in nodos:
        if n['id'] in en_rama:
            continue
        salida.append(reemplazo.get(n['id'], n))
        if n['id'] == BLOQUE_AWS:
            salida.extend(nuevos)
    return salida


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    ap = argparse.ArgumentParser()
    ap.add_argument('--comprobar', action='store_true', help='no escribe; código 1 si nodos.json no está al día')
    args = ap.parse_args()
    nodos = json.loads(NODOS.read_text(encoding='utf-8'))
    servicios = json.loads((AWS / 'servicios.json').read_text(encoding='utf-8'))
    categorias = json.loads((AWS / 'categorias.json').read_text(encoding='utf-8'))
    salida = generar(nodos, servicios, categorias)
    if salida == nodos:
        print('La rama AWS ya está al día.')
        return
    if args.comprobar:
        print('La rama AWS no está al día: ejecuta python scripts/importar_aws.py')
        sys.exit(1)
    NODOS.write_text(json.dumps(salida, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    externos = sum(1 for n in salida if n.get('externo') and n['externo'].get('id'))
    print(f'data/nodos.json: {len(nodos)} -> {len(salida)} nodos; {externos} servicios de AWS enlazados.')


if __name__ == '__main__':
    main()
