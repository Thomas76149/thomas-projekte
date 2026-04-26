import os
import re
from pathlib import Path


# Repo-Root = zwei Ebenen über diesem Skript (tools/ → Projektroot)
ROOT = Path(__file__).resolve().parent.parent
SPIELE = ROOT / "spiele"

BIG = {
    "towerdefense",
    "jetspiel",
    "breakout",
    "asteroids",
}


def read_text(p: Path) -> str:
    return p.read_text(encoding="utf-8")


def write_text(p: Path, s: str) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(s, encoding="utf-8")


def redirect_stub(target_rel: str, title: str) -> str:
    return f"""<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{title}</title>
  <meta http-equiv="refresh" content="0; url={target_rel}" />
  <link rel="canonical" href="{target_rel}" />
</head>
<body>
  <p>Weiterleitung… Wenn nichts passiert: <a href="{target_rel}">öffnen</a></p>
  <script>location.replace({target_rel!r});</script>
</body>
</html>
"""


def split_big_html(html: str, stem: str) -> tuple[str, str, str]:
    # Grab first <style>...</style> and last <script>...</script> (game is inline)
    m_style = re.search(r"<style>([\s\S]*?)</style>", html, re.IGNORECASE)
    style = m_style.group(1).strip() if m_style else ""

    scripts = re.findall(r"<script[^>]*>([\s\S]*?)</script>", html, re.IGNORECASE)
    js = (scripts[-1] if scripts else "").strip()

    # Remove all inline <style> and <script> blocks
    body = re.sub(r"<style>[\s\S]*?</style>", "", html, flags=re.IGNORECASE)
    body = re.sub(r"<script[^>]*>[\s\S]*?</script>", "", body, flags=re.IGNORECASE)

    # Inject external links before </head>
    head_inject = f'  <link rel="stylesheet" href="style.css" />\n'
    head_inject += f'  <script defer src="game.js"></script>\n'
    body = re.sub(r"</head>", head_inject + "</head>", body, flags=re.IGNORECASE, count=1)

    # Fix "back to index" link depth
    body = body.replace('href="../index.html"', 'href="../../index.html"')

    # Also fix any "./" references to stay stable (no-op mostly)
    return body, style, js


def main() -> None:
    if not SPIELE.exists():
        raise SystemExit(f"Missing spiele dir: {SPIELE}")

    html_files = [p for p in SPIELE.glob("*.html") if p.is_file()]
    if not html_files:
        print("No spiele/*.html files found.")
        return

    # Update root index.html links (we still keep redirects, but nicer to point to folders)
    index_path = ROOT / "index.html"
    index_html = read_text(index_path)
    for p in html_files:
        stem = p.stem
        index_html = index_html.replace(f"spiele/{stem}.html", f"spiele/{stem}/")
    write_text(index_path, index_html)

    for p in html_files:
        stem = p.stem
        folder = SPIELE / stem
        folder.mkdir(parents=True, exist_ok=True)

        html = read_text(p)
        title_m = re.search(r"<title>(.*?)</title>", html, re.IGNORECASE)
        title = title_m.group(1).strip() if title_m else stem

        if stem in BIG:
            new_html, css, js = split_big_html(html, stem)
            write_text(folder / "index.html", new_html)
            write_text(folder / "style.css", css + ("\n" if css and not css.endswith("\n") else ""))
            write_text(folder / "game.js", js + ("\n" if js and not js.endswith("\n") else ""))
        else:
            # Keep as single-file, but inside folder
            moved = html.replace('href="../index.html"', 'href="../../index.html"')
            write_text(folder / "index.html", moved)

        # Replace original with redirect stub
        write_text(p, redirect_stub(f"{stem}/", title))

    print(f"Done. Moved {len(html_files)} games into folders. Split: {sorted(BIG)}")


if __name__ == "__main__":
    main()

