"""Pone en cada página la versión de sus .js y su .css: `assets/mapa.js?v=<huella>`, donde la huella
son los 8 primeros caracteres del SHA-256 del fichero. Así, al publicar, el navegador pide de nuevo
solo los ficheros que han cambiado, en vez de mezclar un HTML nuevo con un JS antiguo de su caché
(GitHub Pages deja cachear 10 minutos).

Uso:
    python scripts/versionar.py           # actualiza las páginas
    python scripts/versionar.py --revisar # solo lista las referencias desfasadas (código 1 si hay)

Ejecútalo tras cambiar cualquier fichero de assets/*.js o styles.css. scripts/revisar_arbol.py da
error si alguna referencia no lleva la huella actual.
"""
import hashlib
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
# src="assets/x.js", src="../assets/x.js", href="styles.css", href="../styles.css", con o sin ?v=.
REFERENCIA = re.compile(r'(?P<attr>(?:src|href)=")(?P<ruta>(?:\.\./)*(?:assets/[^"?#]+\.js|styles\.css))(?:\?v=[^"]*)?"')


def paginas():
    return sorted([*RAIZ.glob('*.html'), *RAIZ.glob('temas/*.html'), *RAIZ.glob('plantillas/*.html')])


def huella(fichero):
    return hashlib.sha256(fichero.read_bytes()).hexdigest()[:8]


def versionar(texto, carpeta, cache):
    """Devuelve el texto con las huellas puestas y la lista de referencias que estaban desfasadas."""
    desfasadas = []

    def poner(m):
        destino = (carpeta / m['ruta']).resolve()
        if not destino.is_file():
            desfasadas.append(f'{m["ruta"]} (no existe)')
            return m[0]
        if destino not in cache:
            cache[destino] = huella(destino)
        nuevo = f'{m["attr"]}{m["ruta"]}?v={cache[destino]}"'
        if nuevo != m[0]:
            desfasadas.append(m['ruta'])
        return nuevo

    return REFERENCIA.sub(poner, texto), desfasadas


def revisar():
    """{página relativa: [referencias desfasadas]} sin tocar nada."""
    cache, resultado = {}, {}
    for p in paginas():
        _, desfasadas = versionar(p.read_text(encoding='utf-8'), p.parent, cache)
        if desfasadas:
            resultado[p.relative_to(RAIZ).as_posix()] = desfasadas
    return resultado


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    if '--revisar' in sys.argv:
        pendientes = revisar()
        for pagina, refs in pendientes.items():
            print(f'{pagina}: {", ".join(refs)}')
        sys.exit(1 if pendientes else 0)
    cache, cambiadas = {}, 0
    for p in paginas():
        texto = p.read_text(encoding='utf-8')
        nuevo, desfasadas = versionar(texto, p.parent, cache)
        if nuevo != texto:
            p.write_text(nuevo, encoding='utf-8', newline='')
            cambiadas += 1
            print(f'{p.relative_to(RAIZ).as_posix()}: {", ".join(desfasadas)}')
    print(f'{cambiadas} páginas actualizadas.' if cambiadas else 'Todas las páginas están al día.')


if __name__ == '__main__':
    main()
