# Baut aus dem Hub (index.html + css/hub.css + js/*.js) EINE selbst-enthaltene Datei
# _design/hub-standalone.html — zum einfachen Kopieren in Claude/Artifacts.
# Aendert NICHTS an der Live-Struktur. Einfach laufen lassen: py tools/build-standalone.py
import re, os, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
html = (ROOT / "index.html").read_text(encoding="utf-8")

def read(rel):
    return (ROOT / rel).read_text(encoding="utf-8")

# CSS-Link -> <style> inline
def inline_css(m):
    href = m.group(1).split("?")[0]
    css = read(href)
    return "<style>\n" + css + "\n</style>"
html = re.sub(r'<link rel="stylesheet" href="(css/[^"]+)"\s*/?>', inline_css, html)

# <script src="js/..."> -> <script> inline (Reihenfolge bleibt erhalten)
def inline_js(m):
    src = m.group(1).split("?")[0]
    js = read(src)
    return "<script>\n" + js + "\n</script>"
html = re.sub(r'<script src="(js/[^"]+)"></script>', inline_js, html)

out_dir = ROOT / "_design"
out_dir.mkdir(exist_ok=True)
out = out_dir / "hub-standalone.html"
out.write_text(html, encoding="utf-8")
print("geschrieben:", out)
print("Groesse:", out.stat().st_size, "Bytes")
# kurze Sanity-Checks
print("Externe css/js-Refs uebrig:", len(re.findall(r'href="css/|src="js/', html)), "(soll 0 sein)")
